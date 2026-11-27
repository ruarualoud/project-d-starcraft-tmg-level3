import assert from 'node:assert/strict';
import {KERRIGAN_LORE_KNOWLEDGE_V1 as library} from '../content/characters/kerrigan-lore-knowledge-v1.mjs';
import {sealCompanionLoreLibraryV1, selectCompanionLoreV1, eligibleCompanionLoreV1, companionLoreInstructionsV1} from '../packages/companion-backend-module-v1/lore-knowledge-v1.mjs';
import {liveProviderRequestFromCompanion} from '../packages/secure-provider-runtime/companion-worker-adapter-v1.mjs';
import {mkdir, writeFile} from 'node:fs/promises';
import {createStarcraftTmgCompanionProductModuleV1, companionProductPackageInputFromCatalogueEntryV1} from '../packages/product-composition/companion-product-module-v1.mjs';
import {createInMemoryPersistenceAdapter} from '../packages/companion-backend-module-v1/index.mjs';
import {COMPANION_CATALOGUE_V1} from '../content/characters/companion-catalogue-v1.mjs';

// Real product/session/memory/provider assembly; room authority is a controlled
// read-only fixture. This is no claim of live model quality or gameplay proof.
const requests=[];
let fixtureProviderCalls=0;
const persistence=createInMemoryPersistenceAdapter();
const pkg=companionProductPackageInputFromCatalogueEntryV1(COMPANION_CATALOGUE_V1.entries.find(row=>row.characterId.includes('sarah_kerrigan')));
const roomRuntime={
  async readRoom(){return {ok:true,projection:{room:{roomId:'lore-fixture',stateRevision:0},
    viewer:{seatKey:'player1',roleMode:'player'},matchBinding:{bindingHash:'fixture-binding'}}};},
  async readCharacterPresentation(){return {ok:true,projection:{principalScopeHash:'fixture-principal'}};},
  async readBattleWorkbench(){throw new Error('Lore chat must not read the battlefield');},
};
const provider={portId:'companion_provider_port_v1',adapterId:'offline-lore-verifier',implementsRealProvider:false,network:'none',
  async complete(request){fixtureProviderCalls++;requests.push(request);return {ok:true,response:{content:'OFFLINE_LORE_FIXTURE',rationale:'',uncertainty:'unknown',
    usage:{promptTokens:0,completionTokens:0,reportedCostUnits:0}},receipt:{networkAttempts:0,paidInference:'not_performed',reportedCostUnits:0}};}};
const compose=(libraries=[])=>createStarcraftTmgCompanionProductModuleV1({roomRuntime,persistence,provider,packages:[pkg],knowledgeLibraries:libraries});
// Create a conversation under the previous construction, then cold-compose
// the new library. The persona/package pin and accepted history must survive.
const oldProduct=compose();
const args={roomId:'lore-fixture',seatToken:'offline-fixture'};
const opened=await oldProduct.service.openConversation({...args,packageIds:['starcraft-tmg.companion.sarah_kerrigan']});
assert.equal(opened.ok,true,JSON.stringify(opened));
const oldReply=await oldProduct.service.sendMessage({...args,conversationId:opened.conversationId,content:'你好，记住这是旧会话'});
assert.equal(oldReply.ok,true,JSON.stringify(oldReply));
requests.length=0;
const product=compose([library]);
const restored=await product.service.readConversation({...args,conversationId:opened.conversationId});
assert.equal(restored.ok,true,JSON.stringify(restored));
assert.deepEqual(restored.messages,oldReply.messages);
assert.deepEqual(restored.companions,oldReply.companions);
assert.equal(restored.acceptedHistoryHash,oldReply.acceptedHistoryHash);
assert.equal(requests.length,0,'Construction/read must never consume a model request');
assert.equal(restored.knowledgeLibraries[0].eligibleRecords,24);
const reply=await product.service.sendMessage({...args,conversationId:opened.conversationId,content:'讲讲你和雷诺初遇的故事'});
assert.equal(reply.ok,true,JSON.stringify(reply));
assert(JSON.stringify(requests[0]).includes('安提加主星'),'Source-backed first-meeting fact must reach the actual assembled request');
const storyPacket=JSON.parse(requests[0].messages.find(row=>row.role==='system'&&row.content.includes('"roomContext"')).content);
const storyKnowledge=JSON.stringify(storyPacket.contextAssembly.sections.filter(row=>row.layer==='worldbook'));
assert(!/现有主源|主源没有提供|现有资料|编剧解释/u.test(storyKnowledge),'Role memories must not contain editorial/source-audit prose');
assert(storyKnowledge.includes('character_memory'));assert(!storyKnowledge.includes('canon_summary'));
assert(storyKnowledge.includes('我在安提加主星'));
const evidence=reply.messages.at(-1).knowledge;
assert(evidence.selectedEntryIds.includes('kerrigan_event_antiga_meeting'));
assert(evidence.sources.some(source=>source.url.endsWith('/kerrigan-hero-week')));
assert.equal(evidence.libraryRef.hash,library.integrity.hash);
assert.equal(evidence.responseMode,'lore_story');
const wire=liveProviderRequestFromCompanion(requests[0],96*1024);
assert(wire.userMessage.includes('第一人称'));assert(!wire.userMessage.includes('一到两句'));
assert(wire.userMessage.includes('不主动罗列'));
assert(wire.maxOutputUnits>1000);assert(wire.maxOutputUnits<1536);
assert(!JSON.stringify(requests[0]).includes('Companion author note (sealed package'));
const latest=await compose([library]).service.readConversation({...args,conversationId:opened.conversationId});
assert.deepEqual(latest.messages,reply.messages,'Lore references must survive cold restore');
assert.equal(requests.length,1,'Cold read must not retry a pending/completed turn');
const pending=await oldProduct.service.openConversation({...args,packageIds:[pkg.packageId]});
const next=await oldProduct.backend.sessionRuntime.peekNextTurn(pending.conversationId);
await oldProduct.backend.sessionRuntime.submitTurn(pending.conversationId,{participantId:next.ownerParticipantId,
  expectedTurnSequence:next.turnSequence,content:'这是尚未生成回答的旧消息',mentions:[]});
const pendingRead=await compose([library]).service.readConversation({...args,conversationId:pending.conversationId});
assert.equal(pendingRead.messages.length,1);assert.equal(pendingRead.messages[0].content,'这是尚未生成回答的旧消息');
assert.equal(requests.length,1,'Restoring pending history must not generate or continue automatically');
const wb=await product.service.readWorldbook({...args,conversationId:opened.conversationId});
assert.equal(wb.ok,true,JSON.stringify(wb));assert.equal(wb.entryCount,24);
assert(!JSON.stringify(wb.entries).includes('kerrigan_event_xelnaga_ascension'));
const referenceQuestion='你和雷诺初遇的官方出处是什么？';
const referenceReply=await product.service.sendMessage({...args,conversationId:opened.conversationId,content:referenceQuestion});
assert.equal(referenceReply.ok,true,JSON.stringify(referenceReply));
assert.equal(referenceReply.messages.at(-1).knowledge.responseMode,'lore_reference');
const referencePacket=JSON.parse(requests.at(-1).messages.find(row=>row.role==='system'&&row.content.includes('"roomContext"')).content);
const referenceKnowledge=JSON.stringify(referencePacket.contextAssembly.sections.filter(row=>row.layer==='worldbook'));
assert(referenceKnowledge.includes('reference_notes'));assert(referenceKnowledge.includes('主源'));
assert(!referenceKnowledge.includes('character_memory'));
assert(liveProviderRequestFromCompanion(requests.at(-1)).userMessage.includes('查证'));
requests.pop(); // Reference route is counted in fixtureProviderCalls, separate from the story request assertions below.

const era=library.eras.find(row=>row.rank===60).eraId;
for(const question of ['别像资料摘要，讲讲你和雷诺初遇','不要讲官方设定，以凯瑞甘的口吻讲雷诺的故事','按照官方故事讲讲你和雷诺初遇'])
  assert.notEqual(selectCompanionLoreV1(library,era,question).responseMode,'lore_reference',question);
assert.equal(selectCompanionLoreV1(library,era,'不要胡编，告诉我你和雷诺初遇的出处').responseMode,'lore_reference');
const cases=[
  ['讲讲你和雷诺初遇的故事','kerrigan_event_antiga_meeting'],
  ['从你和吉姆雷诺的相遇开始吧','kerrigan_event_antiga_meeting'],
  ['How did you first meet Jim Raynor?','kerrigan_event_antiga_meeting'],
  ['主宰控制过你吗，后来怎么独立的？','kerrigan_relation_overmind_control'],
  ['讲讲塔桑尼斯的背叛','kerrigan_event_tarsonis_abandonment'],
  ['你在泽鲁斯怎么转变的？','kerrigan_event_zerus_primal'],
  ['你和雷诺现在是什么关系？','kerrigan_relation_raynor_primal'],
  ['你如何教扎加拉？','kerrigan_relation_zagara_student'],
  ['阿巴瑟和你什么关系？','kerrigan_relation_abathur_command'],
  ['介绍一下你自己','kerrigan_event_tarsonis_abandonment'],
];
const selections=[];
for(const [question,expected] of cases){
  const selected=selectCompanionLoreV1(library,era,question);
  assert(selected.records.some(row=>row.id===expected),question+': '+selected.records.map(row=>row.id));
  assert(selected.records.length<=5);
  if(question.startsWith('阿巴瑟')) assert(!selected.records.some(row=>row.id.includes('raynor')));
  assert(selected.records.every(row=>row.knownFromRank<=60&&row.spoilerRank<=60));
  selections.push({question,ids:selected.records.map(row=>row.id),mode:selected.responseMode});
}
for(const greeting of ['你好，凯瑞甘','今天心情怎么样','谢谢你'])
  assert.equal(selectCompanionLoreV1(library,era,greeting).records.length,0);
const unknown=selectCompanionLoreV1(library,era,'你最喜欢哪一种冰淇淋？');
assert.equal(unknown.records.length,0);assert(companionLoreInstructionsV1(unknown).includes('不能确定'));
for(const eraRow of library.eras){
  const eligible=eligibleCompanionLoreV1(library,eraRow.eraId);
  assert(eligible.every(row=>row.knownFromRank<=eraRow.rank&&row.spoilerRank<=eraRow.rank));
  const futuristic=selectCompanionLoreV1(library,eraRow.eraId,'讲讲升华成萨尔那加的经历');
  if(eraRow.rank<80){assert.equal(futuristic.eraLimited,true);assert.equal(futuristic.records.length,0);}
  else assert(futuristic.records.some(row=>row.id==='kerrigan_event_xelnaga_ascension'));
}
assert(eligibleCompanionLoreV1(library,era).some(row=>row.id==='kerrigan_relation_overmind_control'),'Historical relationship is still recallable');
const early=library.eras.find(row=>row.rank===20).eraId;
const earlyFacts=eligibleCompanionLoreV1(library,early);
assert(!earlyFacts.some(row=>row.id==='kerrigan_event_overmind_death'));
assert(!JSON.stringify(earlyFacts.map(row=>row.summaryZh)).includes('主宰死后'));
const tampered=structuredClone(library);tampered.records[0].summaryZh+='changed';
assert.throws(()=>compose([tampered]),/HASH_MISMATCH/);
const badSource=structuredClone(library);delete badSource.integrity;badSource.sources[0].url='https://example.com/fake';
assert.throws(()=>sealCompanionLoreLibraryV1(badSource),/SOURCE_INVALID/);
const badKeyword=structuredClone(library);delete badKeyword.integrity;badKeyword.records[0].keywords=[''];
assert.throws(()=>sealCompanionLoreLibraryV1(badKeyword),/RECORD_INVALID/);
const badMemory=structuredClone(library);delete badMemory.integrity;badMemory.records[0].roleMemoryZh='公开资料只说明她是幽灵特工';
assert.throws(()=>sealCompanionLoreLibraryV1(badMemory),/RECORD_INVALID/);
assert.throws(()=>selectCompanionLoreV1(library,'unknown-era','你好'),/ERA_UNSUPPORTED/);
const invalid=await product.service.openConversation({...args,packageIds:[pkg.packageId],eraIds:{[pkg.packageId]:'unknown-era'}});
assert.equal(invalid.ok,false);assert.equal(invalid.reason,'COMPANION_LORE_ERA_UNSUPPORTED');
assert.equal(requests.length,1);
const casual=await product.service.sendMessage({...args,conversationId:opened.conversationId,content:'你好，凯瑞甘'});
assert.equal(casual.ok,true,JSON.stringify(casual));assert.equal(casual.messages.at(-1).knowledge.selectedEntryIds.length,0);
assert(liveProviderRequestFromCompanion(requests.at(-1)).userMessage.includes('一到两句'));
assert.equal(requests.at(-1).metadata.roomMutationAuthority,false);
for(const eraRow of library.eras){
  const eraProduct=createStarcraftTmgCompanionProductModuleV1({roomRuntime,persistence:createInMemoryPersistenceAdapter(),provider,packages:[pkg],knowledgeLibraries:[library]});
  const openedEra=await eraProduct.service.openOrResumeConversation({...args,packageIds:[pkg.packageId],eraIds:{[pkg.packageId]:eraRow.eraId}});
  assert.equal(openedEra.ok,true,JSON.stringify(openedEra));assert.equal(openedEra.companions[0].eraId,eraRow.eraId);
  const eraReply=await eraProduct.service.sendMessage({...args,conversationId:openedEra.conversationId,content:'讲讲主宰和你的经历'});
  assert.equal(eraReply.ok,true,JSON.stringify(eraReply));
  const packet=JSON.parse(requests.at(-1).messages.find(row=>row.role==='system'&&row.content.includes('"roomContext"')).content);
  const facts=JSON.stringify(packet.contextAssembly.sections);
  if(eraRow.rank<=20){assert(!facts.includes('主宰死后'));assert(!facts.includes('kerrigan_event_overmind_death'));}
  assert(eraReply.messages.at(-1).knowledge.selectedEntryIds.every(id=>library.records.find(row=>row.id===id).knownFromRank<=eraRow.rank));
  const changedEra=await eraProduct.service.openOrResumeConversation({...args,packageIds:[pkg.packageId],eraIds:{[pkg.packageId]:eraRow.rank===80?era:library.eras.at(-1).eraId}});
  assert.notEqual(changedEra.conversationId,openedEra.conversationId,'An explicit era change must not silently reuse the old era');
}

// The five unmodified personas keep their original worldbook/prompt behavior.
const branchProduct=createStarcraftTmgCompanionProductModuleV1({roomRuntime,persistence:createInMemoryPersistenceAdapter(),provider,packages:[pkg],knowledgeLibraries:[library]});
const branchConversation=await branchProduct.service.openConversation({...args,packageIds:[pkg.packageId]});
const branchArgs={...args,conversationId:branchConversation.conversationId};
const branchBase=await branchProduct.service.sendMessage({...branchArgs,content:'讲讲你和雷诺初遇的故事'});
assert.equal(branchBase.ok,true,JSON.stringify(branchBase));
const branch=await branchProduct.service.openConversationBranch({...branchArgs,kind:'regenerate',baseTurnSequence:2});
assert.equal(branch.ok,true,JSON.stringify(branch));
const alternative=await branchProduct.service.rerollConversationBranch({...branchArgs,branchId:branch.branch.branchId});
assert.equal(alternative.ok,true,JSON.stringify(alternative));
assert(alternative.entry.receipts.some(receipt=>receipt.kind==='companion_lore_evidence_v1'));
const accepted=await branchProduct.service.acceptConversationBranch({...branchArgs,branchId:branch.branch.branchId,entryId:alternative.entry.entryId});
assert.equal(accepted.ok,true,JSON.stringify(accepted));
assert(accepted.messages.at(-1).knowledge.sources.length>0,'An accepted reroll retains source evidence');
assert.deepEqual(accepted.messages.slice(0,2),branchBase.messages,'Reroll acceptance must preserve prior history');
for(const entry of COMPANION_CATALOGUE_V1.entries.filter(row=>!row.characterId.includes('sarah_kerrigan'))){
  const other=companionProductPackageInputFromCatalogueEntryV1(entry);
  const module=createStarcraftTmgCompanionProductModuleV1({roomRuntime,persistence:createInMemoryPersistenceAdapter(),provider,packages:[other],knowledgeLibraries:[library]});
  const openedOther=await module.service.openConversation({...args,packageIds:[other.packageId]});
  const replyOther=await module.service.sendMessage({...args,conversationId:openedOther.conversationId,content:'你好'});
  assert.equal(replyOther.ok,true,JSON.stringify(replyOther));
  assert.equal(replyOther.messages.at(-1).knowledge,null);assert.equal(requests.at(-1).metadata.responseMode,undefined);
}
const report={passed:true,harnessLoopUsed:true,realProviderCalls:0,networkAttempts:0,fixtureProviderCalls,
  gameMutationCalls:0,records:library.records.length,events:18,relationships:8,defaultEraRecords:24,
  preservedOldConversation:true,persistedSourceEvidence:true,allEightEraGates:true,otherFivePersonasUnchanged:true,
  narrationPolicy:library.narrationPolicy,roleMemorySeparatedFromAudit:true,explicitReferenceRoute:true,
  sourceHash:library.integrity.hash,firstStoryWireBytes:Buffer.byteLength(JSON.stringify(wire)),selections,
  limitation:'Controlled read-only room fixture and offline Provider; no live model quality or gameplay-effect claim.'};
await mkdir('build/playtest-web/kerrigan-lore',{recursive:true});
await writeFile('build/playtest-web/kerrigan-lore/regression.public.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
