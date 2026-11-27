import assert from 'node:assert/strict';
import {createStarcraftTmgCompanionProductModuleV1,companionProductPackageInputFromCatalogueEntryV1} from '../packages/product-composition/companion-product-module-v1.mjs';
import {createInMemoryPersistenceAdapter} from '../packages/companion-backend-module-v1/index.mjs';
import {COMPANION_CATALOGUE_V1} from '../content/characters/companion-catalogue-v1.mjs';
import {readStandardCharacterCardV1,exportStandardCharacterCardV1,expandStandardCardMacrosV1,standardCardGreetingV1,
  selectStandardWorldInfoV1,assembleStandardRoleplayPromptV1,STANDARD_ROLEPLAY_PRESET_V1} from '../packages/companion-backend-module-v1/standard-roleplay-v1.mjs';
import {exportStandardCharacterCardPngV1,importStandardCharacterCardPngV1} from '../packages/character-agent/standard-character-card-png-v1.mjs';
import {embedStarcraftTmgCharacterCardV2JsonInPng} from '../packages/character-agent/character-card-v2-png-adapter-v2.mjs';
import {liveProviderRequestFromCompanion} from '../packages/secure-provider-runtime/companion-worker-adapter-v1.mjs';
import {createHttpStarcraftTmgCompanionProductTransportV1} from '../packages/client-domain/client-domain-v1.mjs';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createRosterWorkspaceServerV1} from './serve-ticket-27-slice-271-roster-workspace-v1.mjs';
import {companionPortraitPresentationAssetsV1} from '../content/characters/companion-portrait-asset-registry-v1.mjs';

const pkg=companionProductPackageInputFromCatalogueEntryV1(COMPANION_CATALOGUE_V1.entries.find(row=>row.characterId==='starcraft.sarah_kerrigan'));
const card={spec:'chara_card_v3',spec_version:'3.0',data:{name:'莎拉·凯瑞甘',
  description:'完整描述'.repeat(4000)+' DESCRIPTION_END_SENTINEL',personality:'PERSONALITY_SENTINEL',
  scenario:'SCENARIO_SENTINEL {{char}} 与 {{user}} 的虚构对话。',first_mes:'GREETING_SENTINEL',
  mes_example:'<START>\n{{user}}: EXAMPLE_USER_SENTINEL\n{{char}}: EXAMPLE_CHAR_SENTINEL',
  creator_notes:'CREATOR_NOTES_MUST_NOT_ENTER_PROMPT',system_prompt:'{{original}}\nCARD_SYSTEM_SENTINEL',
  post_history_instructions:'POST_HISTORY_SENTINEL 回复 {{user}}。',alternate_greetings:['ALT_GREETING_SENTINEL'],
  tags:['标准角色卡'],creator:'Project D offline verifier',character_version:'1.0.0',extensions:{untouched:{nested:[1,true,'TAIL']}},
  group_only_greetings:['GROUP_GREETING_SENTINEL'],nickname:'莎拉',source:['offline-fixture'],
  creator_notes_multilingual:{zh:'MULTILINGUAL_NOTES_MUST_NOT_ENTER_PROMPT',en:'Creator notes'},
  character_book:{name:'完整世界书',description:'说明',scan_depth:2,token_budget:4096,recursive_scanning:true,extensions:{},entries:[
    {id:1,keys:['雷诺'],content:'BOOK_ENTRY_SENTINEL 安提加主星。',enabled:true,insertion_order:20,extensions:{},use_regex:false,position:'after_char'},
  ]},future_optional_field:{preserve:true}}};
const requests=[];
const provider={portId:'companion_provider_port_v1',adapterId:'offline-standard-roleplay',implementsRealProvider:false,network:'none',
  async complete(request){requests.push(request);return {ok:true,response:{content:'OFFLINE_STANDARD_ROLEPLAY_FIXTURE',rationale:'',uncertainty:'unknown',usage:{promptTokens:0,completionTokens:0,reportedCostUnits:0}},receipt:{networkAttempts:0,paidInference:'not_performed',reportedCostUnits:0}};}};
const roomRuntime={async readRoom(input){return {ok:true,projection:{room:{roomId:'standard-fixture',stateRevision:0},viewer:{seatKey:input.seatToken==='other-seat'?'player2':'player1',roleMode:'player'},matchBinding:{bindingHash:'standard-binding'}}};},
  async readCharacterPresentation(input){return {ok:true,projection:{principalScopeHash:input.seatToken==='other-seat'?'other-principal':'standard-principal'}};},
  async readBattleWorkbench(){throw Error('No battlefield read for character dialogue');}};
const persistence=createInMemoryPersistenceAdapter();
const portrait=await readFile('assets/characters/kerrigan-primal-adjutant/kerrigan-sc1-dialogue-neutral-v1.png');
const bindings=[{companionPackageId:pkg.packageId,eraId:pkg.defaultEraId,card,portraitPngBase64:portrait.toString('base64')}];
const compose=(cards=bindings)=>createStarcraftTmgCompanionProductModuleV1({roomRuntime,provider,persistence,packages:[pkg],standardRoleplayCards:cards});
const product=compose();
const args={roomId:'standard-fixture',seatToken:'offline-fixture'};
const opened=await product.service.openConversation({...args,packageIds:[pkg.packageId]});
assert.equal(opened.ok,true,JSON.stringify(opened));
assert.equal(requests.length,0,'Opening a standard card makes zero model calls');
assert.equal(opened.messages.length,1);assert.equal(opened.messages[0].source.origin,'character_card');
assert.equal(opened.messages[0].content,'GREETING_SENTINEL');assert.equal(opened.nextTurn.ownerParticipantId,opened.userParticipantId);
const result=await product.service.sendMessage({...args,conversationId:opened.conversationId,content:'从你和雷诺的相遇开始吧'});
assert.equal(result.ok,true,JSON.stringify(result));
const assembled=JSON.stringify(requests[0]);
for(const field of ['DESCRIPTION_END_SENTINEL','PERSONALITY_SENTINEL','SCENARIO_SENTINEL','EXAMPLE_USER_SENTINEL','EXAMPLE_CHAR_SENTINEL','CARD_SYSTEM_SENTINEL','POST_HISTORY_SENTINEL','BOOK_ENTRY_SENTINEL'])
  assert(assembled.includes(field),'Standard field must reach the actual request: '+field);
assert(!assembled.includes('CREATOR_NOTES_MUST_NOT_ENTER_PROMPT'));
assert(!assembled.includes('MULTILINGUAL_NOTES_MUST_NOT_ENTER_PROMPT'));
assert.equal(opened.standardCards[0].creatorNotes,'MULTILINGUAL_NOTES_MUST_NOT_ENTER_PROMPT');
const invalidNotes=structuredClone(card);invalidNotes.data.creator_notes_multilingual={zh:42};
assert.throws(()=>readStandardCharacterCardV1(invalidNotes),error=>error.details.path==='data.creator_notes_multilingual');
assert(!assembled.includes('{{char}}'));assert(!assembled.includes('{{user}}'));assert(!assembled.includes('{{original}}'));
assert(!liveProviderRequestFromCompanion(requests[0]).userMessage.includes('一到两句'));
assert.equal(result.messages.at(-1).knowledge.responseMode,'standard_roleplay');

const snapshot=readStandardCharacterCardV1(card),exact='  '+JSON.stringify(card)+'\n\n';
assert.equal(exportStandardCharacterCardV1(readStandardCharacterCardV1(exact)),exact);
assert.deepEqual(readStandardCharacterCardV1(exact).card,card);
const v2=structuredClone(card);v2.spec='chara_card_v2';v2.spec_version='2.0';v2.data.nickname={unknownV2Field:'retained'};v2.data.source={unknown:'retained'};
assert.deepEqual(readStandardCharacterCardV1(exportStandardCharacterCardV1(v2)).card,v2);
assert.equal(standardCardGreetingV1(readStandardCharacterCardV1(v2)),'GREETING_SENTINEL');
const missing=structuredClone(card);delete missing.data.creator_notes;
assert.throws(()=>readStandardCharacterCardV1(missing),/STANDARD_CHARACTER_CARD_INVALID/);
assert.equal(expandStandardCardMacrosV1('{{CHAR}} <BOT> <char> {{USER}} <USER>',{char:'K',user:'U'}),'K K K U U');
assert.throws(()=>expandStandardCardMacrosV1('{{getvar::unknown}}',{char:'K',user:'U'}),/MACRO_UNSUPPORTED/);
assert.throws(()=>expandStandardCardMacrosV1('{{description}}',{description:'{{description}}'}),/MACRO_RECURSION/);
const noGreeting=structuredClone(card);noGreeting.data.first_mes='';noGreeting.data.alternate_greetings=[];noGreeting.data.group_only_greetings=[];
assert.equal(standardCardGreetingV1(readStandardCharacterCardV1(noGreeting)),'');
noGreeting.data.alternate_greetings=['<BOT> → <USER>'];
assert.equal(standardCardGreetingV1(readStandardCharacterCardV1(noGreeting),{userName:'U'}),'莎拉 → U');
assert.equal(standardCardGreetingV1(snapshot,{group:true}),'GROUP_GREETING_SENTINEL');

const entry=(id,keys,content,overrides={})=>({id,keys,content,enabled:true,insertion_order:10,extensions:{},use_regex:false,...overrides});
function withBook(entries,changes={}){const next=structuredClone(card);next.data.description='角色';next.data.character_book={entries,extensions:{},scan_depth:2,token_budget:4096,recursive_scanning:true,...changes};return readStandardCharacterCardV1(next);}
const world=withBook([
  entry('constant',[],'恒定',{constant:true,insertion_order:1}),entry('a',['雷诺'],'递归钥匙'),
  entry('b',['递归钥匙'],'连锁内容'),entry('selective',['雷诺'],'双钥匙',{selective:true,secondary_keys:['安提加']}),
  entry('regex',['^雷诺.*安提加$'],'正则内容',{use_regex:true,constant:true,secondary_keys:['不存在'],selective:true}),
  entry('invalid',['('],'不能出现',{use_regex:true,constant:true}),entry('disabled',['雷诺'],'不能出现',{enabled:false}),
  entry('future',['雷诺'],'FUTURE_CANARY',{extensions:{projectD:{knownFromRank:80,spoilerRank:80}}}),
  entry('duplicate',['雷诺'],'同号第一条'),entry('duplicate',['雷诺'],'同号第二条'),
]);
const selected=selectStandardWorldInfoV1({snapshot:world,history:[{content:'雷诺与安提加'}],eraRank:60});
for(const id of ['constant','a','b','selective','regex'])assert(selected.selected.some(row=>row.id===id),id);
assert.equal(selected.selected.filter(row=>row.id==='duplicate').length,2);
assert(!selected.selected.some(row=>['invalid','disabled','future'].includes(row.id)));
assert(!selectStandardWorldInfoV1({snapshot:world,history:[{content:'雷诺'}],eraRank:60}).selected.some(row=>row.id==='selective'));
const tiny=withBook([entry('low',['x'],'low'.repeat(20),{priority:1}),entry('high',['x'],'HIGH',{priority:100})],{token_budget:3});
const tinyResult=selectStandardWorldInfoV1({snapshot:tiny,history:[{content:'x'}]});
assert.deepEqual(tinyResult.selected.map(row=>row.id),['high']);assert(tinyResult.omissions.some(row=>row.reason==='world_info_budget'));
const special=withBook([
  entry('forced',[],'@@activate\nFORCED'),entry('off',['x'],'@@dont_activate\nOFF'),
  entry('out',['x'],'OUTLET_CONTENT',{extensions:{position:7,outletName:'Plot'}}),
  entry('note',['x'],'NOTE_TOP',{extensions:{position:2}}),
  entry('depth',['x'],'DEPTH_CONTENT',{extensions:{position:4,depth:0,role:1}}),
  entry('example',['x'],'<START>\n{{user}}: WI_EXAMPLE_USER\n{{char}}: WI_EXAMPLE_CHAR',{extensions:{position:5}}),
]);
const specialCard=structuredClone(special.card);specialCard.data.post_history_instructions='{{original}}\n{{outlet::Plot}}';
const prompt=assembleStandardRoleplayPromptV1({snapshot:readStandardCharacterCardV1(specialCard),history:[{role:'user',content:'x'}],authorsNote:{content:'AUTHOR_NOTE',depth:0}});
assert(prompt.messages.some(row=>row.content.includes('OUTLET_CONTENT')));
assert(prompt.messages.some(row=>row.role==='user'&&row.content==='DEPTH_CONTENT'));
assert(prompt.messages.some(row=>row.role==='assistant'&&row.content==='WI_EXAMPLE_CHAR'));
assert(prompt.messages.some(row=>row.content==='NOTE_TOP\nAUTHOR_NOTE'));
assert(!JSON.stringify(prompt.messages).includes('@@activate'));
for(const layer of prompt.receipt.layers)assert.equal(prompt.messages[layer.messageIndex].role,layer.role);
assert(prompt.messages.at(-1).content.includes('Reply as 莎拉'));
const noNote=assembleStandardRoleplayPromptV1({snapshot:special,history:[{role:'user',content:'x'}]});
assert(!JSON.stringify(noNote.messages).includes('NOTE_TOP'));
assert(!noNote.worldInfo.selected.some(row=>row.id==='out'));
const unsupported=withBook([entry('vector',['x'],'vector',{extensions:{vectorized:true}})]);
assert.throws(()=>selectStandardWorldInfoV1({snapshot:unsupported,history:[{content:'x'}]}),/EXTENSION_UNSUPPORTED/);
assert.equal(readStandardCharacterCardV1(exportStandardCharacterCardV1(unsupported)).card.data.character_book.entries[0].extensions.vectorized,true);

const png=exportStandardCharacterCardPngV1(portrait,readStandardCharacterCardV1(exact));
const extracted=importStandardCharacterCardPngV1(png.png);
assert.equal(extracted.snapshot.serialized,exact);assert.deepEqual(extracted.carrierPng,portrait);
const both=embedStarcraftTmgCharacterCardV2JsonInPng(png.png,v2).png;
assert.equal(importStandardCharacterCardPngV1(both).snapshot.spec,'chara_card_v3','ccv3 wins over V2 backfill');
const pngV2=exportStandardCharacterCardPngV1(portrait,v2);
assert.deepEqual(importStandardCharacterCardPngV1(pngV2.png).snapshot.card,v2);

const scoped={...args,conversationId:opened.conversationId,packageId:pkg.packageId};
const beforeImport=await product.service.readConversation(scoped),callsBeforeImport=requests.length;
const imported=await product.service.importStandardRoleplayCard({...scoped,card:exact});
assert.equal(imported.ok,true,JSON.stringify(imported));assert.deepEqual(imported.messages,beforeImport.messages);
const exported=await compose().service.exportStandardRoleplayCard(scoped);
assert.equal(exported.serialized,exact,'Cold restore retains complete original card bytes');
assert.equal(requests.length,callsBeforeImport);
const denied=await product.service.exportStandardRoleplayCard({...scoped,seatToken:'other-seat'});
assert.equal(denied.ok,false);assert.equal(denied.reason,'COMPANION_CONVERSATION_SCOPE_MISMATCH');
const bad=structuredClone(card);bad.data.system_prompt='{{getvar::unsupported}}';
const rejected=await product.service.importStandardRoleplayCard({...scoped,card:bad});
assert.equal(rejected.ok,false);assert.equal(rejected.reason,'STANDARD_CHARACTER_MACRO_UNSUPPORTED');
assert.equal((await product.service.exportStandardRoleplayCard(scoped)).serialized,exact);
const book=await product.service.exportStandardRoleplayBook(scoped);assert.deepEqual(book.book,card.data.character_book);
assert.deepEqual(JSON.parse(book.serialized),{spec:'lorebook_v3',data:card.data.character_book});
const editedBook=structuredClone(book.book);editedBook.extensions.futureBookField={preserved:true};
const appliedBook=await product.service.importStandardRoleplayBook({...scoped,book:JSON.stringify({spec:'lorebook_v3',data:editedBook})});
assert.equal(appliedBook.ok,true,JSON.stringify(appliedBook));
assert.deepEqual((await product.service.exportStandardRoleplayBook(scoped)).book.extensions.futureBookField,{preserved:true});

const http=createHttpStarcraftTmgCompanionProductTransportV1({baseUrl:'http://127.0.0.1',fetchImpl:async(url,init)=>{
  const parsed=new URL(url);const response=await product.handle({method:init.method,pathname:parsed.pathname,
    query:Object.fromEntries(parsed.searchParams),headers:init.headers,body:init.body?JSON.parse(init.body):{}});
  return {status:response.status,text:async()=>JSON.stringify(response.response)};
}});
const httpRequest=operation=>({...args,conversationId:opened.conversationId,operation,payload:{packageId:pkg.packageId}});
assert.equal((await http.execute(httpRequest('standard_card_export'))).ok,true);
const httpPng=await http.execute({...httpRequest('standard_card_export'),payload:{packageId:pkg.packageId,format:'png'}});
assert.equal(httpPng.ok,true,JSON.stringify({reason:httpPng.reason}));
assert.equal(importStandardCharacterCardPngV1(Buffer.from(httpPng.pngBase64,'base64')).snapshot.cardHash,httpPng.cardHash);
const httpImport=await http.execute({...httpRequest('standard_card_import'),payload:{packageId:pkg.packageId,pngBase64:png.png.toString('base64')}});
assert.equal(httpImport.ok,true,JSON.stringify(httpImport));assert.equal(requests.length,callsBeforeImport);
assert.equal((await http.execute(httpRequest('standard_book_export'))).ok,true);
// Exercise the real outer HTTP body reader, not only the product's handler.
// The committed PNG exceeds the old global 2 MiB request ceiling after base64.
const loopback=await createRosterWorkspaceServerV1({port:0,lazyWorkspace:true,
  dataDirectory:'build/playtest-web/standard-roleplay/http-fixture',webRoot:'build/playtest-web/web',
  productHandler:request=>product.handle({...request,query:Object.fromEntries(request.query)})});
let localHttpRequests=0;
try{
  const transport=createHttpStarcraftTmgCompanionProductTransportV1({baseUrl:loopback.origin,fetchImpl:async(...input)=>{localHttpRequests++;return fetch(...input);}});
  const networkImport=await transport.execute({...httpRequest('standard_card_import'),payload:{packageId:pkg.packageId,pngBase64:png.png.toString('base64')}});
  assert.equal(networkImport.ok,true,JSON.stringify(networkImport));
}finally{loopback.server.closeAllConnections();await loopback.close();}

const clean=await product.service.openOrResumeConversation({...args,packageIds:[pkg.packageId],forceNew:true,copyStandardCardsFromConversationId:opened.conversationId});
assert.equal(clean.ok,true,JSON.stringify(clean));assert.notEqual(clean.conversationId,opened.conversationId);
assert.equal(clean.messages.length,1);assert.equal(clean.messages[0].source.origin,'character_card');assert.equal(requests.length,callsBeforeImport);
for(let i=0;i<20;i++){
  const next=await product.backend.sessionRuntime.peekNextTurn(clean.conversationId);
  await product.backend.sessionRuntime.submitTurn(clean.conversationId,{participantId:next.ownerParticipantId,expectedTurnSequence:next.turnSequence,content:'旧消息 '+i,mentions:[]});
}
const afterLong=await product.service.sendMessage({...args,conversationId:clean.conversationId,content:'雷诺是谁？'});
assert.equal(afterLong.ok,true,JSON.stringify(afterLong));
assert(!JSON.stringify(requests.at(-1).messages).includes('GREETING_SENTINEL'),'Greeting is ordinary history, not permanently re-injected');
assert.equal(afterLong.messages[0].content,'GREETING_SENTINEL','Saved greeting remains intact');

const legacy=compose([]),old=await legacy.service.openConversation({...args,packageIds:[pkg.packageId]});
const oldRead=await legacy.service.readConversation({...args,conversationId:old.conversationId});
const withStandard=await compose().service.readConversation({...args,conversationId:old.conversationId});
assert.equal(withStandard.messages.length,0,'Adding a standard card must not retro-insert greetings');
assert.equal(withStandard.acceptedHistoryHash,oldRead.acceptedHistoryHash);

const manifest=JSON.parse(await readFile('content/characters/standard-cards/manifest.json','utf8'));
assert.equal(manifest.cards.length,31);
const builtinCounts={},pngChecked=new Set(),defaultBindings=[];
await mkdir('build/playtest-web/standard-roleplay',{recursive:true});
for(const binding of manifest.cards){
  const builtin=readStandardCharacterCardV1(await readFile('content/characters/standard-cards/'+binding.file,'utf8'));
  assert.equal(builtin.cardHash,binding.cardHash);
  const original=COMPANION_CATALOGUE_V1.entries.find(row=>row.characterId===builtin.card.data.extensions.projectD.characterId).pack;
  assert.deepEqual(builtin.card.data.extensions.projectD.originalPresentationPack,original,'No original pack fields destroyed');
  const eraRank=builtin.card.data.extensions.projectD.eraRank;
  const broadStory=selectStandardWorldInfoV1({snapshot:builtin,eraRank,history:[{role:'user',content:'给我讲讲你的故事'}]});
  const eligible=builtin.card.data.character_book.entries.filter(row=>row.enabled
    &&Number(row.extensions.projectD?.knownFromRank??0)<=eraRank&&Number(row.extensions.projectD?.spoilerRank??0)<=eraRank);
  assert.deepEqual(broadStory.selected.map(row=>row.id),eligible.map(row=>String(row.id)),
    'A broad story question supplies the complete era-eligible built-in memories without requiring a character name');
  const built=assembleStandardRoleplayPromptV1({snapshot:builtin,eraRank,history:[{role:'user',content:'讲讲你和雷诺的故事'}]});
  assert(built.worldInfo.selected.every(row=>Number(row.entry.extensions.projectD?.knownFromRank??0)<=eraRank));
  assert(!built.messages.some(row=>row.content.includes('originalPresentationPack')));
  if(binding.companionPackageId.endsWith('sarah_kerrigan')&&eraRank<=20){
    const body=JSON.stringify(built.messages);
    assert(!/before abandonment on Tarsonis|Overmind destruction|主宰死后|kerrigan_event_overmind_death/u.test(body),'Scenario and identity must not leak future era endpoints');
    if(eraRank<20)assert(!body.includes('Queen of Blades'));
  }
  builtinCounts[binding.companionPackageId]=(builtinCounts[binding.companionPackageId]||0)+1;
  if(!pngChecked.has(binding.companionPackageId)){
    const image=await readFile(companionPortraitPresentationAssetsV1(original.characterId).idle.assetId);
    const roundtrip=exportStandardCharacterCardPngV1(image,builtin);
    assert.equal(importStandardCharacterCardPngV1(roundtrip.png).snapshot.cardHash,builtin.cardHash);
    pngChecked.add(binding.companionPackageId);
  }
  const defaultEra=original.eras.find(row=>row.defaultSelected)?.personaState||original.eras[0].personaState;
  if(binding.eraId===defaultEra)defaultBindings.push({...binding,card:builtin.card});
  if(binding.companionPackageId===pkg.packageId&&binding.eraId===pkg.defaultEraId){
    const reusable=exportStandardCharacterCardPngV1(portrait,builtin);
    await writeFile('build/playtest-web/standard-roleplay/kerrigan-standard-card.png',reusable.png);
  }
}
const groupPackages=COMPANION_CATALOGUE_V1.entries.filter(row=>['starcraft.sarah_kerrigan','starcraft.jim_raynor'].includes(row.characterId)).map(row=>companionProductPackageInputFromCatalogueEntryV1(row));
const groupProduct=createStarcraftTmgCompanionProductModuleV1({roomRuntime,provider,persistence:createInMemoryPersistenceAdapter(),packages:groupPackages,standardRoleplayCards:defaultBindings});
const groupOpened=await groupProduct.service.openConversation({...args,packageIds:groupPackages.map(row=>row.packageId)});
assert.equal(groupOpened.ok,true,JSON.stringify(groupOpened));assert.equal(groupOpened.messages.length,2);
assert(groupOpened.messages.every(row=>row.source.origin==='character_card'));
assert.equal(groupOpened.nextTurn.ownerParticipantId,groupOpened.userParticipantId);
const groupStart=requests.length;
const groupReply=await groupProduct.service.sendMessage({...args,conversationId:groupOpened.conversationId,content:'你们分别介绍一下自己。'});
assert.equal(groupReply.ok,true,JSON.stringify(groupReply));assert.equal(requests.length-groupStart,2);
assert.notEqual(requests[groupStart].metadata.standardCardRef.hash,requests[groupStart+1].metadata.standardCardRef.hash);
const report={passed:true,harnessLoopUsed:true,realProviderCalls:0,providerNetworkAttempts:0,localHttpRequests,fixtureProviderCalls:requests.length,gameMutationCalls:0,
  standardCards:31,characters:6,allSixPngs:true,distinctGroupCards:true,fullRawRoundtrip:true,jsonAndPng:true,ccv3Preferred:true,firstGreetingOnce:true,
  normativeMacros:true,completePromptFields:true,creatorNotesExcluded:true,coreWorldInfoSemantics:true,broadStoryRetrieval:true,
  originalPresentationDataRetained:true,coldRestore:true,seatIsolation:true,legacyHistoryUnchanged:true,
  unsupportedApplicationExtensions:'explicit_rejection_without_data_rewriting',builtinCounts,
  firstRequestBytes:Buffer.byteLength(JSON.stringify(liveProviderRequestFromCompanion(requests[0],96*1024))),
  limitation:'Offline controlled room and Provider. Full standard-data preservation and specified runtime profile, not the entire SillyTavern application or live model-quality proof.'};
await writeFile('build/playtest-web/standard-roleplay/report.public.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
