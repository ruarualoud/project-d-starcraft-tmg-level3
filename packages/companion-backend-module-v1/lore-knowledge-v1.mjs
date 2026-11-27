import {hashStarcraftTmgClientContract as hash} from '../client-domain/portable-contract-hash-v1.mjs';

const fail=code=>{throw Object.assign(new Error(code),{code});};
const copy=value=>JSON.parse(JSON.stringify(value));
const freeze=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};
const normalized=value=>String(value||'').toLowerCase().replace(/[’‘']/gu,'').replace(/\s+/gu,' ').trim();
function containsTerm(text,term) {
  if(!term)return false;
  for(let index=text.indexOf(term);index>=0;index=text.indexOf(term,index+1)) {
    const ascii=character=>/[a-z0-9]/u.test(character||'');
    if((!ascii(term[0])||!ascii(text[index-1]))&&(!ascii(term.at(-1))||!ascii(text[index+term.length])))return true;
  }
  return false;
}

// Independently versioned source material: never rewrites a sealed persona or
// grants game authority. Pin verification happens before product construction.
export function sealCompanionLoreLibraryV1(input) {
  const {integrity,...body}=copy(input);
  if(!body.libraryId||!body.version||!body.companionPackageId||!body.coverageNote
    ||!Array.isArray(body.eras)||!body.eras.length||!Array.isArray(body.records)||!Array.isArray(body.sources)) fail('COMPANION_LORE_LIBRARY_INVALID');
  const ranks=new Set(body.eras.map(era=>era.rank));
  if(body.eras.some(era=>!era.eraId||!Number.isSafeInteger(era.rank))
    ||new Set(body.eras.map(era=>era.eraId)).size!==body.eras.length) fail('COMPANION_LORE_ERAS_INVALID');
  const sources=new Map();
  for(const source of body.sources){
    let url;try{url=new URL(source.url);}catch{fail('COMPANION_LORE_SOURCE_INVALID');}
    if(!source.id||!source.title||sources.has(source.id)||url.protocol!=='https:'
      ||url.hostname!=='news.blizzard.com'||url.username||url.password) fail('COMPANION_LORE_SOURCE_INVALID');
    sources.set(source.id,source);
  }
  const ids=new Set();
  for(const row of body.records){
    if(!row.id||ids.has(row.id)||!['event','relationship'].includes(row.kind)||!row.titleZh||!row.summaryZh
      ||!ranks.has(row.knownFromRank)||!ranks.has(row.spoilerRank)||!Array.isArray(row.keywords)||!row.keywords.length
      ||row.keywords.some(word=>typeof word!=='string'||!word.trim())
      ||!Array.isArray(row.sourceIds)||!row.sourceIds.length||row.sourceIds.some(id=>!sources.has(id))
      ||!row.sourceLocator||!['canon_summary','creator_commentary'].includes(row.claimClass)
      ||(row.validThroughRank!==undefined&&(!ranks.has(row.validThroughRank)||row.validThroughRank<row.knownFromRank))) fail('COMPANION_LORE_RECORD_INVALID');
    ids.add(row.id);
  }
  const digest=hash(body);
  if(integrity&&integrity.hash!==digest) fail('COMPANION_LORE_HASH_MISMATCH');
  return freeze({...body,integrity:{algorithm:'sha256',hash:digest}});
}

export function companionLoreEraV1(library,eraId) {
  const era=library.eras.find(row=>row.eraId===eraId);
  if(!era) fail('COMPANION_LORE_ERA_UNSUPPORTED');
  return era;
}
export function eligibleCompanionLoreV1(library,eraId) {
  const era=companionLoreEraV1(library,eraId);
  return library.records.filter(row=>row.knownFromRank<=era.rank&&row.spoilerRank<=era.rank);
}
export function companionLoreAvailabilityV1(library,eraId) {
  const era=companionLoreEraV1(library,eraId),eligible=eligibleCompanionLoreV1(library,eraId);
  return {libraryRef:{id:library.libraryId,version:library.version,hash:library.integrity.hash},
    eraId,eraLabel:era.labelZh,knowledgeRank:era.rank,eligibleRecords:eligible.length,
    eventCount:eligible.filter(row=>row.kind==='event').length,relationshipCount:eligible.filter(row=>row.kind==='relationship').length,
    totalRecords:library.records.length,coverageNote:library.coverageNote};
}

export function selectCompanionLoreV1(library,eraId,question) {
  const eligible=eligibleCompanionLoreV1(library,eraId),q=normalized(question);
  const story=/故事|经历|往事|生平|背景|初遇|初识|相遇|遇见|相识|第一次见|怎么认识|怎么相识|如何认识|当初|过去|讲讲|介绍.*自己|tell me about|story|biograph|first met|first meet|how.+met/iu.test(q);
  const relationship=/关系|爱情|爱过|相爱|喜欢|仇恨|效忠|忠诚|控制|relationship|love|loyal|control/iu.test(q);
  const battle=/作战|战局|军表|射程|棋盘|怎么打|战术|battle|roster|tactic/iu.test(q);
  const generic=/介绍.*自己|^(请)?(讲讲|说说|讲个|讲一个)?(你|凯瑞甘|莎拉)?的?(生平|经历|故事|背景)(吧|吗|。|？)?$|your (life|story)|biograph/iu.test(q);
  const firstMeeting=/初遇|初识|相遇|相识|初次相见|第一次见|怎么认识|怎么相识|如何认识|first met|first meet/iu.test(q);
  const topicAliases=[['雷诺','吉姆','raynor'],['蒙斯克','mengsk'],['主宰','overmind'],['泽鲁斯','zerus'],
    ['扎加拉','zagara'],['阿巴瑟','abathur'],['塔桑尼斯','tarsonis'],['安提加','antiga'],['神器','artifact'],
    ['母巢之战','brood war'],['查尔','char']];
  const topics=topicAliases.filter(aliases=>aliases.some(alias=>containsTerm(q,alias)));
  const hasTopic=(row,aliases)=>row.keywords.some(word=>aliases.some(alias=>normalized(word).includes(alias)));
  const exactTopics=topics.length?eligible.filter(row=>topics.every(aliases=>hasTopic(row,aliases))):eligible;
  const candidates=exactTopics.length?exactTopics:eligible.filter(row=>topics.some(aliases=>hasTopic(row,aliases)));
  const matches=candidates.map(row=>{
    let score=row.keywords.reduce((sum,word)=>sum+(containsTerm(q,normalized(word))?Math.min(8,normalized(word).length):0),0);
    // A direct event intent beats broad character/name matches. Relationship
    // history stays available after validThroughRank; it is labelled historical.
    if(firstMeeting&&row.id.includes('antiga_meeting'))score+=100;
    if(firstMeeting&&row.id.includes('raynor_early'))score+=70;
    if(firstMeeting&&row.kind==='relationship'&&row.validThroughRank>=companionLoreEraV1(library,eraId).rank)score+=30;
    if(relationship&&row.kind==='relationship')score+=score?12:0;
    if(relationship&&row.validThroughRank>=companionLoreEraV1(library,eraId).rank)score+=score?4:0;
    return {row,score};
  }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.row.id.localeCompare(b.row.id));
  // A greeting mentioning the companion's own name must not load a biography.
  const factual=story||relationship||/谁|什么|为何|为什么|哪里|何时|怎么|如何|讲讲|说说|是否|是不是|主宰|overmind|泽鲁斯|zerus|塔桑尼斯|tarsonis|雷诺|raynor|蒙斯克|mengsk|扎加拉|zagara|阿巴瑟|abathur|神器|artifact|萨尔|xel|埃蒙|amon/iu.test(q);
  let records=factual?matches.slice(0,firstMeeting?3:5).map(item=>item.row):[];
  if(generic){
    const milestones=['ghost_conditioning','tarsonis_abandonment','overmind_death','zerus_primal','mengsk_defeat'];
    records=eligible.filter(row=>milestones.some(id=>row.id.endsWith(id))).slice(0,5);
  }
  const eligibleAliases=new Set(eligible.flatMap(row=>row.keywords.map(normalized)));
  const eraLimited=library.records.filter(row=>row.knownFromRank>companionLoreEraV1(library,eraId).rank
    ||row.spoilerRank>companionLoreEraV1(library,eraId).rank)
    .some(row=>row.keywords.some(word=>!eligibleAliases.has(normalized(word))&&containsTerm(q,normalized(word))));
  if(eraLimited)records=[];
  const responseMode=story?'lore_story':relationship?'lore_relationship':records.length&&!battle?'lore_answer':'conversation';
  const sourceIds=new Set(records.flatMap(row=>row.sourceIds));
  const sources=library.sources.filter(row=>sourceIds.has(row.id)).map(({id,title,url,publisher})=>({id,title,url,publisher}));
  return freeze({responseMode,eraLimited,records:copy(records),sources,availability:companionLoreAvailabilityV1(library,eraId)});
}

export function companionLoreInstructionsV1(selection) {
  const extended=['lore_story','lore_relationship'].includes(selection.responseMode);
  return [
    `Verified lore library ${selection.availability.libraryRef.id} v${selection.availability.libraryRef.version}. Era: ${selection.availability.eraLabel}.`,
    'This era is a coarse historical knowledge upper bound, not the current room campaign mission. Never import later-era knowledge from prior dialogue, the player question or general model knowledge.',
    'Answer the actual question first. These source-backed summaries are factual constraints; character voice and connective phrasing are original roleplay, not official dialogue. Do not invent scenes, quotes, feelings or private motives. Creator commentary must be attributed in third person, never presented as personal memories or mind reading.',
    'A relationship record with validThroughRank describes that historical phase; it does not erase the ability to recall it later. Clearly distinguish then from now. Omitted/unsupported details are unknown: say so briefly instead of replacing an answer with a tactical slogan.',
    selection.eraLimited?'This question names material outside the selected era. Briefly explain the era limit; do not reveal its events, outcomes or hints.':selection.records.length?'Use the selected facts below; do not fill their gaps from general model knowledge.':'No verified lore facts were selected for this question. For a lore/detail question, acknowledge that this detail is unverified instead of inventing an answer. Ordinary greetings may be answered naturally.',
    extended?'For a story or relationship question, use two or three short Chinese paragraphs with concrete supplied events, then a brief personal perspective only if supported. Do not force tactical advice into a personal-history answer. Be engaged and willing to recount the supplied history; avoid hostility or evasive aphorisms.':'Use a natural concise Chinese response. Do not introduce biography into ordinary small talk.',
    'Citations below the response are supplied by the application. Do not invent source titles, links or official quotations. Lore never overrides Rules or grants room actions.',
  ].join('\n');
}
