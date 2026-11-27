import {hashStarcraftTmgClientContract as hash} from '../client-domain/portable-contract-hash-v1.mjs';

// Exchange contract: Character Card V2/V3. Raw data is never reconstructed
// from a reduced internal persona. Runtime choices are explicit and receipted.
export const STANDARD_ROLEPLAY_PRESET_V1 = Object.freeze({
  id:'project-d.standard-roleplay.v1', scanDepth:2, worldInfoBudget:4096,
  recursiveScanning:true, caseSensitive:false, preferCharacterPrompt:true,
  preferCharacterPostHistory:true, maxCardBytes:4*1024*1024,
  mainPrompt:'Write the next reply as {{char}} in the fictional conversation with {{user}}. Speak naturally in character and respect {{user}}’s agency.',
  postHistory:'Reply as {{char}} in Chinese. Follow the character’s personality and the conversation. Keep internal metadata and source bookkeeping outside the dialogue.',
});
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const clone=v=>JSON.parse(JSON.stringify(v));
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const fail=(code,details={})=>{throw Object.assign(new Error(code),{code,details});};
const bytes=v=>new TextEncoder().encode(typeof v==='string'?v:JSON.stringify(v)).length;
function check(ok,path){if(!ok)fail('STANDARD_CHARACTER_CARD_INVALID',{path});}
function strings(v,path){check(Array.isArray(v)&&v.every(x=>typeof x==='string'),path);}
const textFields=['name','description','personality','scenario','first_mes','mes_example','creator_notes','system_prompt','post_history_instructions','creator','character_version'];

export function readStandardCharacterCardV1(input) {
  const serialized=typeof input==='string'?input:JSON.stringify(input,null,2)+'\n';
  check(bytes(serialized)<=STANDARD_ROLEPLAY_PRESET_V1.maxCardBytes,'card byte limit (rejected, never truncated)');
  let card;try{card=JSON.parse(serialized);}catch{fail('STANDARD_CHARACTER_CARD_JSON_INVALID');}
  check(object(card)&&object(card.data),'card/data');
  const v3=card.spec==='chara_card_v3';
  check(v3?card.spec_version==='3.0':card.spec==='chara_card_v2'&&card.spec_version==='2.0','spec/spec_version');
  const data=card.data;
  for(const key of textFields)check(typeof data[key]==='string','data.'+key);
  strings(data.alternate_greetings,'data.alternate_greetings');strings(data.tags,'data.tags');
  check(object(data.extensions),'data.extensions');
  if(v3)strings(data.group_only_greetings,'data.group_only_greetings');
  if(v3&&data.nickname!==undefined)check(typeof data.nickname==='string','data.nickname');
  if(v3&&data.source!==undefined)strings(data.source,'data.source');
  if(v3&&data.creator_notes_multilingual!==undefined)check(object(data.creator_notes_multilingual)&&Object.entries(data.creator_notes_multilingual).every(([key,value])=>/^[a-z]{2}$/u.test(key)&&typeof value==='string'),'data.creator_notes_multilingual');
  for(const key of ['creation_date','modification_date'])if(v3&&data[key]!==undefined)check(Number.isFinite(data[key]),'data.'+key);
  if(v3&&data.assets!==undefined){
    check(Array.isArray(data.assets),'data.assets');
    for(const [i,asset] of data.assets.entries()){
      check(object(asset),'data.assets['+i+']');
      for(const key of ['type','uri','name','ext'])check(typeof asset[key]==='string','data.assets['+i+'].'+key);
    }
  }
  if(data.character_book!==undefined){
    const book=data.character_book;check(object(book)&&object(book.extensions)&&Array.isArray(book.entries),'data.character_book');
    for(const key of ['name','description'])if(book[key]!==undefined)check(typeof book[key]==='string','character_book.'+key);
    for(const key of ['scan_depth','token_budget'])if(book[key]!==undefined)check(Number.isFinite(book[key])&&book[key]>=0,'character_book.'+key);
    if(book.recursive_scanning!==undefined)check(typeof book.recursive_scanning==='boolean','character_book.recursive_scanning');
    for(const [i,entry] of book.entries.entries()){
      const path='character_book.entries['+i+']';check(object(entry)&&object(entry.extensions),path);
      strings(entry.keys,path+'.keys');check(typeof entry.content==='string',path+'.content');
      check(typeof entry.enabled==='boolean'&&Number.isFinite(entry.insertion_order),path+'.enabled/insertion_order');
      if(v3)check(typeof entry.use_regex==='boolean',path+'.use_regex');
      for(const key of ['case_sensitive','selective','constant'])if(entry[key]!==undefined)check(typeof entry[key]==='boolean',path+'.'+key);
      for(const key of ['name','comment'])if(entry[key]!==undefined)check(typeof entry[key]==='string',path+'.'+key);
      if(entry.secondary_keys!==undefined)strings(entry.secondary_keys,path+'.secondary_keys');
      if(entry.priority!==undefined)check(Number.isFinite(entry.priority),path+'.priority');
      if(entry.id!==undefined)check(Number.isFinite(entry.id)||(v3&&typeof entry.id==='string'),path+'.id');
      if(entry.position!==undefined)check(['before_char','after_char'].includes(entry.position),path+'.position');
    }
  }
  return freeze({card,serialized,cardHash:hash(card),spec:card.spec,specVersion:card.spec_version});
}

export function exportStandardCharacterCardV1(input) {
  // A parsed snapshot retains the original serialized bytes, including unknown
  // fields. No safeString(), field slicing, or lossy V3 -> V2 conversion.
  return readStandardCharacterCardV1(input?.card&&input?.serialized?input.serialized:input).serialized;
}

function regexMatch(key,text,caseSensitive){
  try{
    const delimited=key.match(/^\/([\s\S]*)\/([dgimsuvy]*)$/u);
    return new RegExp(delimited?delimited[1]:key,delimited?delimited[2]:(caseSensitive?'':'i')).test(text);
  }catch{return false;}
}
function keywordMatch(key,text,caseSensitive,useRegex,nativeRegex=false){
  if(!key)return false;
  if(useRegex||(nativeRegex&&/^\/[\s\S]*\/[dgimsuvy]*$/u.test(key)))return regexMatch(key,text,caseSensitive);
  return caseSensitive?text.includes(key):text.toLocaleLowerCase().includes(key.toLocaleLowerCase());
}
function decorators(content){
  const directives=[];const lines=content.split('\n');
  while(lines[0]?.startsWith('@@'))directives.push(lines.shift().trim());
  return {content:lines.join('\n'),directives};
}

export function selectStandardWorldInfoV1({snapshot,history=[],eraRank=Infinity,seed='',authorsNoteEnabled=false,preset=STANDARD_ROLEPLAY_PRESET_V1}) {
  const book=snapshot.card.data.character_book;
  if(!book)return freeze({selected:[],omissions:[],tokensUsed:0,scanDepth:preset.scanDepth,recursiveScanning:preset.recursiveScanning});
  const depth=Math.floor(book.scan_depth??preset.scanDepth),budget=book.token_budget??preset.worldInfoBudget;
  const recursive=book.recursive_scanning??preset.recursiveScanning;
  const initial=depth===0?'':history.slice(-depth).map(row=>row.content).join('\n');
  const eligible=[],omissions=[];
  for(const [index,entry] of book.entries.entries()){
    const id=String(entry.id??index),extension=entry.extensions,scope=extension.projectD||{};
    if(!entry.enabled){omissions.push({id,reason:'disabled'});continue;}
    for(const key of ['knownFromRank','spoilerRank'])if(scope[key]!==undefined&&(!Number.isFinite(Number(scope[key]))||Number(scope[key])<0))
      fail('STANDARD_WORLD_INFO_ERA_RANK_INVALID',{id,field:key});
    if([2,3].includes(extension.position)&&!authorsNoteEnabled){omissions.push({id,reason:'authors_note_disabled'});continue;}
    if(Number(scope.knownFromRank??0)>eraRank||Number(scope.spoilerRank??0)>eraRank){omissions.push({id,reason:'era'});continue;}
    const parsed=decorators(entry.content);
    if(parsed.directives.includes('@@dont_activate')){omissions.push({id,reason:'decorator_dont_activate'});continue;}
    if(parsed.directives.some(value=>!['@@activate','@@dont_activate'].includes(value)))
      fail('STANDARD_WORLD_INFO_DECORATOR_UNSUPPORTED',{id,directives:parsed.directives});
    // These ST application features are not CC core fields. Preserve their
    // data, but reject active unsupported behavior instead of pretending it ran.
    const unsupported=['vectorized','sticky','cooldown','delay','automationId','group','selectiveLogic','scan_depth',
      'matchPersonaDescription','matchCharacterDescription','matchCharacterPersonality','matchCharacterDepthPrompt','matchScenario','matchCreatorNotes']
      .filter(key=>extension[key]);
    if(unsupported.length)fail('STANDARD_WORLD_INFO_EXTENSION_UNSUPPORTED',{id,extensions:unsupported});
    eligible.push({entry,id,index,content:parsed.content,forced:parsed.directives.includes('@@activate')});
  }
  const matched=new Map();let scan=initial;
  for(let pass=0;pass<=eligible.length;pass++){
    const additions=[];
    for(const row of eligible){
      if(matched.has(row.index))continue;
      const {entry}=row,ext=entry.extensions;
      if(pass>0&&ext.exclude_recursion)continue;
      if(pass===0&&ext.delay_until_recursion)continue;
      const sensitive=entry.case_sensitive??preset.caseSensitive;
      const useRegex=snapshot.spec==='chara_card_v3'&&entry.use_regex;
      const primary=entry.keys.some(key=>keywordMatch(key,scan,sensitive,useRegex,snapshot.spec==='chara_card_v2'));
      const secondary=(entry.secondary_keys||[]).some(key=>keywordMatch(key,scan,sensitive,false,snapshot.spec==='chara_card_v2'));
      const active=row.forced||(!useRegex&&entry.constant)||primary&&(useRegex||!entry.selective||secondary);
      if(!active)continue;
      if(ext.useProbability&&Number(ext.probability??100)<100){
        const roll=parseInt(hash({seed,id:row.id,index:row.index}).slice(0,12),16)/0x1000000000000*100;
        if(roll>=Number(ext.probability)){omissions.push({id:row.id,reason:'probability'});continue;}
      }
      matched.set(row.index,{...row,pass});
      if(!ext.prevent_recursion)additions.push(row.content);
    }
    if(!recursive||!additions.length)break;
    scan+='\n'+additions.join('\n');
  }
  const ranked=[...matched.values()].sort((a,b)=>(b.entry.priority??0)-(a.entry.priority??0)||a.entry.insertion_order-b.entry.insertion_order||a.index-b.index);
  const selected=[];let tokensUsed=0;
  for(const row of ranked){
    const estimatedTokens=Math.max(1,Math.ceil([...row.content].length/3));
    if(tokensUsed+estimatedTokens>budget){omissions.push({id:row.id,reason:'world_info_budget',estimatedTokens});continue;}
    tokensUsed+=estimatedTokens;
    const ext=row.entry.extensions;
    const positions={0:'before_char',1:'after_char',2:'author_note_top',3:'author_note_bottom',4:'depth',5:'before_examples',6:'after_examples',7:'outlet'};
    const position=ext.position!==undefined?positions[ext.position]:(row.entry.position||'after_char');
    if(!position)fail('STANDARD_WORLD_INFO_POSITION_UNSUPPORTED',{id:row.id,position:ext.position});
    selected.push({id:row.id,index:row.index,content:row.content,position,depth:Number(ext.depth??4),
      role:position==='depth'?({0:'system',1:'user',2:'assistant'})[ext.role??0]||'system':'system',outletName:String(ext.outletName||''),
      insertionOrder:row.entry.insertion_order,estimatedTokens,pass:row.pass,entry:clone(row.entry)});
  }
  selected.sort((a,b)=>a.insertionOrder-b.insertionOrder||a.index-b.index);
  return freeze({selected,omissions,tokensUsed,scanDepth:depth,recursiveScanning:recursive,budget,budgetUnit:'estimated_text_units_not_invoice_tokens'});
}

export function expandStandardCardMacrosV1(text,context) {
  const unsupported=[];let output=String(text).replace(/<(char|bot|user)>/giu,(_,name)=>String(context[name.toLowerCase()==='user'?'user':'char']||''));
  for(let pass=0;pass<16;pass++){
  const next=output.replace(/\{\{([^{}]+)\}\}/gu,(raw,name)=>{
    const rawKey=name.trim(),key=rawKey.toLowerCase();
    if(key.startsWith('outlet::')){context.onOutlet?.(rawKey.slice(8));return String(context.outlets?.[rawKey.slice(8)]||'');}
    if(Object.hasOwn(context,key))return String(context[key]??'');
    unsupported.push(key);return raw;
  });
  if(next===output){output=next;break;}
  output=next;
  if(pass===15)fail('STANDARD_CHARACTER_MACRO_RECURSION');
  }
  if(unsupported.length)fail('STANDARD_CHARACTER_MACRO_UNSUPPORTED',{macros:[...new Set(unsupported)]});
  if(/\{\{[^{}]+\}\}/u.test(output))fail('STANDARD_CHARACTER_MACRO_RECURSION');
  return output;
}

export function standardCardGreetingV1(snapshot,{userName='指挥官',group=false,index=null}={}) {
  const data=snapshot.card.data;
  const options=group&&snapshot.spec==='chara_card_v3'&&data.group_only_greetings?.length?data.group_only_greetings:[data.first_mes,...data.alternate_greetings].filter(Boolean);
  if(!options.length)return '';
  if(index!==null&&(!Number.isSafeInteger(index)||index<0||index>=options.length))fail('STANDARD_CHARACTER_GREETING_INDEX_INVALID');
  return expandStandardCardMacrosV1(options[index??0],{char:snapshot.spec==='chara_card_v3'&&data.nickname?data.nickname:data.name,user:userName});
}

function exampleMessages(text,context) {
  if(!text.trim())return [];
  const expanded=expandStandardCardMacrosV1(text,context),blocks=expanded.split(/<START>/gu).filter(value=>value.trim());
  const result=[];
  for(const block of blocks){
    const lines=block.trim().split('\n');let current=null;
    for(const line of lines){
      const char=line.startsWith(context.char+':'),user=line.startsWith(context.user+':');
      if(char||user){
        current={role:char?'assistant':'user',content:line.slice((char?context.char:context.user).length+1).trimStart()};result.push(current);
      }else if(current)current.content+='\n'+line;
      else {current={role:'system',content:line};result.push(current);}
    }
  }
  return result;
}

export function assembleStandardRoleplayPromptV1({snapshot,userName='指挥官',persona='',history=[],eraRank=Infinity,
  seed='',platformInstructions='',memoryContext='',roomContext='',authorsNote=null,preset=STANDARD_ROLEPLAY_PRESET_V1}) {
  const data=snapshot.card.data;
  const worldInfo=selectStandardWorldInfoV1({snapshot,history,eraRank,seed,authorsNoteEnabled:Boolean(authorsNote?.content),preset});
  const outlets={};for(const row of worldInfo.selected.filter(row=>row.position==='outlet'))outlets[row.outletName]=(outlets[row.outletName]||'')+row.content+'\n';
  const usedOutlets=new Set();
  const base={char:snapshot.spec==='chara_card_v3'&&data.nickname?data.nickname:data.name,user:userName,description:data.description,personality:data.personality,scenario:data.scenario,
    persona,first_mes:data.first_mes,mes_example:data.mes_example,outlets,onOutlet:name=>usedOutlets.add(name)};
  const expand=text=>expandStandardCardMacrosV1(text,base);
  const cardPrompt=preset.preferCharacterPrompt&&data.system_prompt?data.system_prompt:preset.mainPrompt;
  const cardPost=preset.preferCharacterPostHistory&&data.post_history_instructions?data.post_history_instructions:preset.postHistory;
  const main=expandStandardCardMacrosV1(cardPrompt,{...base,original:expand(preset.mainPrompt)});
  const post=expandStandardCardMacrosV1(cardPost,{...base,original:expand(preset.postHistory)});
  const messages=[],layers=[];
  const add=(layer,role,content)=>{if(!content)return;messages.push({role,content});layers.push({layer,role,messageIndex:messages.length-1,bytes:bytes(content)});};
  const addInfo=position=>{for(const row of worldInfo.selected.filter(row=>row.position===position)){
    if(['before_examples','after_examples'].includes(position)){
      for(const message of exampleMessages(row.content,base))add('world_info.'+position,message.role,message.content);
    }else add('world_info.'+position,row.role,expand(row.content));
  }};
  add('platform_authority','system',platformInstructions);
  add('main_prompt','system',main);addInfo('before_char');add('persona','system',expand(persona));
  add('description','system',expand(data.description));add('personality','system',expand(data.personality));add('scenario','system',expand(data.scenario));
  addInfo('after_char');add('session_memory','system',memoryContext);add('requested_room_context','system',roomContext);
  addInfo('before_examples');
  for(const message of exampleMessages(data.mes_example,base))add('chat_examples',message.role,message.content);
  addInfo('after_examples');
  for(const message of history)add('chat_history',message.role,message.content);
  const insert=(index,message,layer)=>{
    for(const item of layers)if(item.messageIndex>=index)item.messageIndex+=1;
    messages.splice(index,0,message);layers.push({layer,role:message.role,messageIndex:index,bytes:bytes(message.content)});
  };
  if(authorsNote?.content){
    const top=worldInfo.selected.filter(row=>row.position==='author_note_top').map(row=>expand(row.content));
    const bottom=worldInfo.selected.filter(row=>row.position==='author_note_bottom').map(row=>expand(row.content));
    const index=Math.max(0,messages.length-Number(authorsNote.depth||0));
    const content=[...top,expand(authorsNote.content),...bottom].join('\n');insert(index,{role:'system',content},'authors_note');
  }
  for(const row of worldInfo.selected.filter(row=>row.position==='depth')){
    const index=Math.max(0,messages.length-row.depth);insert(index,{role:row.role,content:expand(row.content)},'world_info.depth');
  }
  add('post_history_instructions','system',post);
  const injected=worldInfo.selected.filter(row=>row.position!=='outlet'||usedOutlets.has(row.outletName));
  const emittedWorldInfo={...worldInfo,activated:worldInfo.selected,selected:injected,
    omissions:[...worldInfo.omissions,...worldInfo.selected.filter(row=>row.position==='outlet'&&!usedOutlets.has(row.outletName)).map(row=>({id:row.id,reason:'outlet_not_referenced'}))]};
  return freeze({messages,worldInfo:emittedWorldInfo,receipt:{cardRef:{id:data.extensions.projectD?.cardId||'card-'+snapshot.cardHash.slice(0,24),version:data.character_version,hash:snapshot.cardHash,spec:snapshot.spec},
    presetId:preset.id,layers,creatorNotesInPrompt:false,unknownFieldsPreserved:true,cardFieldsTruncated:false,
    estimatedWorldInfoUnits:worldInfo.tokensUsed,roomMutationAuthority:false,trainingTruth:false}});
}
