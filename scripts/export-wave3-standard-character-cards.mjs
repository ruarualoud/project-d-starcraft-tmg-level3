import {mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {COMPANION_CATALOGUE_V1} from '../content/characters/companion-catalogue-v1.mjs';
import {KERRIGAN_LORE_KNOWLEDGE_V1} from '../content/characters/kerrigan-lore-knowledge-v1.mjs';
import {readStandardCharacterCardV1} from '../packages/companion-backend-module-v1/standard-roleplay-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'content/characters/standard-cards');
await mkdir(directory,{recursive:true});
const clone=v=>JSON.parse(JSON.stringify(v));
const factRanks={
  'zagara.broodmother-of-char':55,'zagara.kerrigan-tutelage':60,'zagara.swarm-succession':80,'zagara.coop-commander':80,
  'raynor.mar-sara-marshal':10,'raynor.sons-of-korhal-defection':30,'raynor.raiders-founded':30,'raynor.protoss-alliance':70,'raynor.kerrigan-timeline-sensitive':70,
  'nova.ghost-program':45,'nova.dominion-ghost':45,'nova.wol-contact':50,'nova.covert-ops':75,'nova.psionic-concentration':45,
  'artanis.executor-brood-war':40,'artanis.tassadar-successor':50,'artanis.hierarch-daelaam':50,'artanis.aiur-reclamation':70,'artanis.coalition-allies':70,
  'zeratul.nerazim-exile':30,'zeratul.zasz':30,'zeratul.raszagal':40,'zeratul.prophecy':55,'zeratul.final-warning':70,
};
const bookRanks={
  'zagara.wb.swarm_attrition':55,'zagara.wb.char':55,
  'raynor.wb.raiders_doctrine':30,'raynor.wb.koprulu_factions':30,
  'nova.wb.ghost_doctrine':45,'nova.wb.defenders_of_man':75,
  'artanis.wb.daelaam_unity':50,'artanis.wb.aiur_fall_and_return':70,
  'zeratul.wb.nerazim':30,'zeratul.wb.prophecy':55,
};
const greetings={sarah_kerrigan:'{{user}}，我在听。你想先谈些什么？',zagara:'{{user}}，我在听。说出你的目标。',
  jim_raynor:'我在这儿，{{user}}。你想聊些什么？',nova_terra:'通讯正常，{{user}}。说说你的需要。',
  artanis:'我愿听你说，{{user}}。',zeratul:'我在听。说出你的疑问，{{user}}。'};
const identityReplies={zagara:'我是查尔的虫巢之母。我曾率领那里的虫群。',jim_raynor:'我曾在玛·萨拉当治安官。',
  nova_terra:'我是诺娃，一名帝国幽灵特工。',artanis:'我曾任执行官，在萨古拉斯守护艾尔的幸存者。',zeratul:'我是奈拉齐姆的黑暗教长。'};
const topicNames=[['Kerrigan',['凯瑞甘','莎拉']],['Raynor',['雷诺','吉姆']],['Mengsk',['蒙斯克']],['Zagara',['扎加拉']],
  ['Abathur',['阿巴瑟']],['Artanis',['阿塔尼斯']],['Zeratul',['泽拉图']],['Raszagal',['拉莎加尔']],['Char',['查尔']],
  ['Ghost',['幽灵','灵能']],['Aiur',['艾尔']],['Nerazim',['奈拉齐姆']],['Amon',['埃蒙']],['Daelaam',['达拉姆']]];
const translatedKeys=text=>topicNames.filter(([name])=>text.toLowerCase().includes(name.toLowerCase())).flatMap(([,aliases])=>aliases);
const storyKeys=['你的故事','你的经历','你的过去','你的身世','讲讲自己','your story','your past','your background'];
const manifest=[];
for(const entry of COMPANION_CATALOGUE_V1.entries){
  const pack=entry.pack,slug=entry.characterId.split('.')[1],name=pack.identity.displayNameZh||pack.identity.displayName;
  const sources=Object.values(pack.sources),byId=new Map(sources.map(source=>[source.sourceId,source]));
  const sourceObjects=refs=>refs.map(id=>byId.get(id)).filter(Boolean).map(source=>({id:source.sourceId,title:source.title,url:source.url,publisher:source.publisher}));
  const books=[];
  if(slug==='sarah_kerrigan'){
    for(const row of KERRIGAN_LORE_KNOWLEDGE_V1.records){
      books.push({id:row.id,name:row.titleZh,comment:row.summaryZh,keys:row.keywords,secondary_keys:[],
        content:row.roleMemoryZh,enabled:true,insertion_order:books.length*10,use_regex:false,constant:false,
        case_sensitive:false,selective:false,position:'after_char',priority:10,
        extensions:{projectD:{knownFromRank:row.knownFromRank,spoilerRank:row.spoilerRank,
          ...(row.validThroughRank!==undefined?{validThroughRank:row.validThroughRank}:{}),
          sources:row.sourceIds.map(id=>KERRIGAN_LORE_KNOWLEDGE_V1.sources.find(source=>source.id===id)),
          sourceLocator:row.sourceLocator,claimClass:row.claimClass,originalAuditRecord:clone(row)}}});
    }
  }else{
    for(const fact of pack.biography.facts.filter(row=>!row.provenanceClass.includes('platform'))){
      const rank=factRanks[fact.factId]??Math.max(...pack.eras.map(era=>era.knowledgeRank));
      books.push({id:fact.factId,name:fact.factId,comment:'Original source-reviewed fact; original metadata retained.',
        keys:[name,...pack.identity.aliases,...translatedKeys(fact.summary),...fact.factId.split(/[.-]/u).filter(word=>word.length>3)],secondary_keys:[],
        content:fact.summary,enabled:!['raynor.kerrigan-timeline-sensitive','zagara.coop-commander','zeratul.final-warning'].includes(fact.factId),insertion_order:books.length*10,use_regex:false,constant:false,
        case_sensitive:false,selective:false,position:'after_char',priority:10,
        extensions:{projectD:{knownFromRank:rank,spoilerRank:rank,sources:sourceObjects(fact.sourceRefs),originalFact:clone(fact)}}});
    }
    for(const book of pack.worldbookEntries.filter(row=>!row.entryId.endsWith('tmg_context'))){
      const rank=bookRanks[book.entryId]??Math.max(...pack.eras.map(era=>era.knowledgeRank));
      books.push({id:book.entryId,name:book.title,comment:book.canonStatus,keys:[name,book.title,...pack.identity.aliases,...translatedKeys(book.content)],secondary_keys:[],
        content:book.content.replace('; in Project D this is lore context only and never a prediction of match outcomes.','.'),enabled:true,insertion_order:books.length*10,use_regex:false,constant:false,
        case_sensitive:false,selective:false,position:'after_char',priority:5,
        extensions:{projectD:{knownFromRank:rank,spoilerRank:rank,sources:sourceObjects(book.sourceRefs),originalWorldbookEntry:clone(book)}}});
    }
    for(const relation of pack.relationships){
      // Existing labels can span several eras. Preserve complete records, and
      // avoid assigning an earlier knowledge time without source evidence.
      const rank=Math.max(...pack.eras.map(era=>era.knowledgeRank));
      books.push({id:'relation-'+books.length,name:relation.subject+' / '+relation.object,comment:'Era-spanning original relationship label; conservative knowledge ceiling.',
        keys:[relation.object,...translatedKeys(relation.object)],secondary_keys:[],content:relation.subject+' — '+relation.relation+' — '+relation.object,
        enabled:true,insertion_order:books.length*10,use_regex:false,constant:false,case_sensitive:false,selective:false,position:'after_char',priority:3,
        extensions:{projectD:{knownFromRank:rank,spoilerRank:rank,sources:sourceObjects(relation.sourceRefs),originalRelationship:clone(relation)}}});
    }
  }
  for(const era of pack.eras){
    const cardId='starcraft-tmg.standard-card.'+slug+'.'+era.personaState;
    const aliases=pack.identity.aliases.filter(alias=>!(slug==='sarah_kerrigan'&&era.knowledgeRank<20&&alias==='Queen of Blades')
      &&!(slug==='artanis'&&era.knowledgeRank<50&&alias==='Hierarch Artanis')
      &&!(slug==='jim_raynor'&&era.knowledgeRank<20&&alias==='Commander Raynor'));
    const voice=pack.voiceTone;
    const personality=[`${name}说话的节奏：${voice.cadence}。称呼和相处方式：${voice.addressStyle}；${voice.companionWarmth}。`,
      `幽默倾向：${voice.humor}。讨论战术时的风格：${voice.teachingPosture}；${voice.tacticalPattern}。`,
      '日常交谈与讲述往事时自然回应对方，不把每个话题都变成战术训话。保持人物的尊严、立场和时代所知，不贬低提问者。'].join('\n');
    const examples=slug==='sarah_kerrigan'
      ? '<START>\n{{user}}: 从你和吉姆雷诺的相遇开始吧。\n{{char}}: 我在安提加主星执行一次任务时，第一次认识了吉姆。\n<START>\n{{user}}: 你们初遇时说了什么？\n{{char}}: 那段原话，我不能准确复述。'
      : '<START>\n{{user}}: 你是谁？\n{{char}}: '+identityReplies[slug]+'\n<START>\n{{user}}: 我想听你讲自己的经历。\n{{char}}: 你想从哪一段说起？';
    const card={spec:'chara_card_v3',spec_version:'3.0',data:{name,nickname:name,
      description:`{{char}}是星际争霸中的${name}（${pack.identity.displayName}）。别名：${aliases.join('、')}。当前身份与时代：${era.titleZh}。`,
      personality,scenario:`{{char}}与{{user}}正在通讯频道交谈，可以聊往事、人物关系或讨论已公开的当前战局。当前角色时代为${era.titleZh}，不掌握之后时代的事件结局。`,
      first_mes:greetings[slug],mes_example:examples,
      creator_notes:'这是 Project D 作者编写的角色扮演卡。场景、开场白、示例对话和语气配置是原创演绎，不是官方台词或职位。故事事实沿用卡内来源记录；时代是知识上界，不代表当前房间任务进度。原始呈现包、事实、关系、来源与视觉元数据完整保留在 extensions.projectD.originalPresentationPack；作者说明不进入模型提示。',
      system_prompt:'{{original}}\n以{{char}}的第一人称与{{user}}交流。直接讲述已知经历，保留人物性格与关系，不把出处说明、资料校验或系统配置当成角色台词。',
      post_history_instructions:'{{original}}\n写{{char}}接下来这一条回复。用自然中文回应当前话题；不要替{{user}}说话或决定行动。未被问到的细节空白不主动罗列；不要编造未提供的官方场景、原话、日期或他人的私密动机。',
      alternate_greetings:['{{user}}，你想从哪一段开始谈？'],group_only_greetings:['{{user}}，我在听。轮到我时，我会说出自己的看法。'],
      tags:[...pack.tags,'Character Card V3','Project D'],creator:'Project D',character_version:'2.0.0',
      source:sources.map(source=>source.url),assets:[],
        character_book:{name:name+' · 世界书',description:'原资料完整保留；运行时按关键词、预算与时代扩展选择整条内容。',scan_depth:2,token_budget:4096,recursive_scanning:true,extensions:{},entries:books.map(book=>({...clone(book),keys:[...new Set([...book.keys,...storyKeys])]}))},
      extensions:{projectD:{cardId,characterId:entry.characterId,companionPackageId:'starcraft-tmg.companion.'+slug,
        eraId:era.personaState,eraRank:era.knowledgeRank,originalPresentationPack:clone(pack),
        ...(slug==='sarah_kerrigan'?{loreAudit:{libraryId:KERRIGAN_LORE_KNOWLEDGE_V1.libraryId,version:KERRIGAN_LORE_KNOWLEDGE_V1.version,
          sources:clone(KERRIGAN_LORE_KNOWLEDGE_V1.sources),unknownTopics:clone(KERRIGAN_LORE_KNOWLEDGE_V1.unknownTopics)}}:{}),
        rulesAuthority:'external_rules_service',roomMutationAuthority:false,trainingTruth:false}},
    }};
    const snapshot=readStandardCharacterCardV1(card),filename=slug+'--'+era.personaState.replace(/[^a-z0-9_-]/giu,'_')+'.json';
    await writeFile(path.join(directory,filename),snapshot.serialized);
    manifest.push({companionPackageId:'starcraft-tmg.companion.'+slug,eraId:era.personaState,file:filename,cardHash:snapshot.cardHash});
  }
}
await writeFile(path.join(directory,'manifest.json'),JSON.stringify({schemaVersion:'project_d.standard_character_card_manifest.v1',cards:manifest},null,2)+'\n');
console.log(JSON.stringify({standardCards:manifest.length,characters:COMPANION_CATALOGUE_V1.entries.length,format:'chara_card_v3',dataTruncated:false}));
