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
  if(!body.libraryId||!body.version||!body.companionPackageId||!body.coverageNote||body.narrationPolicy!=='character_memory_v1'
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
      ||typeof row.roleMemoryZh!=='string'||!row.roleMemoryZh.trim()||/公开资料|现有资料|主源|编剧|参考文献/u.test(row.roleMemoryZh)
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
  // Saying "别像资料摘要" requests roleplay, not a switch to source commentary.
  const reference=q.split(/[，,。；;！!？?\n]/u).some(clause=>{
    const explicit=/出处|来源|参考文献|查证|考据|原作原文|官方设定|官方说法|跳出角色|\bcanon\b|\bsource\b|\breference\b|\booc\b/iu;
    const declined=/(?:不要|不用|不必|别|避免).{0,10}(?:出处|来源|文献|查证|考据|原文|官方设定|官方说法|跳出角色)/u;
    return explicit.test(clause)&&!declined.test(clause);
  });
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
  const responseMode=reference?'lore_reference':story?'lore_story':relationship?'lore_relationship':records.length&&!battle?'lore_answer':'conversation';
  const sourceIds=new Set(records.flatMap(row=>row.sourceIds));
  const sources=library.sources.filter(row=>sourceIds.has(row.id)).map(({id,title,url,publisher})=>({id,title,url,publisher}));
  return freeze({responseMode,eraLimited,records:copy(records),sources,availability:companionLoreAvailabilityV1(library,eraId)});
}

export function companionLoreInstructionsV1(selection) {
  const extended=['lore_story','lore_relationship'].includes(selection.responseMode);
  const reference=selection.responseMode==='lore_reference';
  return [
    `当前角色时代：${selection.availability.eraLabel}。这是时代知识上界，不代表当前战局的具体任务进度；不得叙述之后时代的事件。`,
    reference
      ? '用户本次明确请求设定或出处查证。可以暂用事实说明口吻，区分故事事实与作者评论；作者评论使用第三人称，不伪装成亲历或读心。'
      : '你正在扮演凯瑞甘，直接以第一人称与指挥官交谈。角色记忆是你可讲述的经历；不要站到角色外面替读者整理传记。语气冷静、坚定，愿意交流，不贬低指挥官。',
    '记忆条目限定可叙述的事件与关系。可以自然组织措辞，不能添加未给出的场景、对白、日期、感觉或他人的私密动机。历史关系写清当时与后来，不等于删除旧记忆。',
    reference ? '查证时可以说明证据边界；来源链接由界面附在回复下方，不编造链接或官方引文。'
      : '考据说明和来源属于界面层，不是凯瑞甘的自我认知。角色正文不要说“公开资料”“现有资料”“官方只说明”“编剧认为”，也不要朗读字段、版本、引用或校验过程。',
    '旧助手消息可能有出戏的资料摘要口吻；历史用于理解对话，不作为人物口吻或新增事实的依据。不要沿袭这些错误。',
    selection.eraLimited ? (reference?'本次话题超出所选时代，简短说明时代边界，不透露未来事件。':'本次话题超出当前角色所知时代，以角色视角简短表明不知，不透露未来事件或解释资料系统。')
      : selection.records.length?'从所给记忆中直接回应问题，先讲具体发生过的事。'
      : (reference?'本次没有选中可核实的事实，不补造。':'本次没有可用的相关记忆。普通闲聊自然回应；若被问到具体未知细节，用简短的角色口吻承认不能确定，不借模型常识补造。'),
    extended?'故事与关系回答按内容多少写一到三小段，不凑长度。未被问到的空白不主动罗列，不在结尾机械追加“其他未知”。不要转成战术口号或用空泛的代价、伤口替代事情经过。':'用自然、简短的中文回答；普通闲聊不主动加载传记。',
    '不确定的精确细节只在被问到时说明。例如被问原话而没有依据，可以说“那段原话，我不能准确复述”，不要虚构对白或把缺失改写成失忆。角色措辞是原创演绎，不能冒充官方台词；规则与房间动作始终服从外部权威。',
  ].join('\n');
}
