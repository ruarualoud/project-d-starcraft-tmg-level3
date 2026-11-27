import assert from 'node:assert/strict';
import path from 'node:path';
import {mkdtemp} from 'node:fs/promises';
import {root, read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {bindWave3StandardActionRoom} from './support/wave3-standard-action-room-v1.mjs';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {createStarcraftTmgSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {createStarcraftTmgTurnPlanRuntimeV1} from '../packages/online-agent-session/turn-plan-runtime-v1.mjs';
import {projectStarcraftTmgTurnPlanReflectionInputV1} from '../packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs';
import {createStarcraftTmgMatchDecisionContinuityV1} from '../packages/online-agent-session/match-decision-continuity-v1.mjs';
import {createSqliteStarcraftTmgMatchDecisionJournalV1} from '../packages/online-agent-session/sqlite-match-decision-journal-v1.mjs';

const roomId = 'photon-reserve-on-human-map-299';
const dir = 'build/ticket-28-wave3-human-lobby-v1/remaining-six/' + roomId;
const resume = process.argv[2];
if(resume && !/^build\/ticket-28-wave3-replan-release-[A-Za-z0-9]+$/.test(resume))throw Error('invalid checkpoint');
const out = resume ?? path.relative(root,await mkdtemp(path.join(root,'build/ticket-28-wave3-replan-release-')));
const setup = (await read('content/wave3-human-match-setups-v1.json')).find(x => x.scale === 'Standard');
const opening = await read(dir + '/opening.json');
const store = openWave3EngineeringStoreV1({directory:dir,filename:'room.sqlite',readOnly:true});
let initial;
try {initial = (await store.loadInitialEnvelope(roomId)).state;} finally {store.close();}
const bound = await bindWave3StandardActionRoom({manifestRef:setup.releaseRef,initial,dir,
  candidateVersion:opening.version,scenario:opening.scene,frozenRuntimeRef:dir+'/runtime.json'});
const native = bound.open({readOnly:true});
const openJournal = () => createSqliteStarcraftTmgMatchDecisionJournalV1({filename:path.join(root,out,'memory.sqlite')});
const runtime = journal => createStarcraftTmgTurnPlanRuntimeV1({
  decisionContinuity:createStarcraftTmgMatchDecisionContinuityV1({journal})});
let journal;
try {
  await native.restoreDependencies(roomId,bound.authority);
  const head = await native.store.loadRoom(roomId);
  const side = head.envelope.state.activeSideKey;
  const seats = await read(dir+'/'+roomId+'.seats.private.json');
  const credential = {roomId,seatToken:seats[side].seatToken};
  const {projection} = await native.room.readRoom(credential);
  const {legalSpace} = await native.room.legalSpace(credential);
  const input = {roomProjection:projection,legalSpace};
  const scope = {gameId:'starcraft-tmg',roomId,seatKey:side,matchBindingHash:projection.matchBinding.bindingHash};
  const service = createStarcraftTmgSceneQueryServiceV1({roomStore:native.store,rulesRuntime:bound.rulesRuntime,seatKey:side});
  const base = {...input,scope,spatialActionSpace:await service.actionSpace(input)};
  const receipt = await service.query({...input,request:{queryKind:'mission_marker_control',arguments:{}}});
  assert.equal(receipt.status,'exact');
  journal = openJournal();
  const plans = runtime(journal);
  const initialPlan = resume ? await plans.hydrate({scope})
    : await plans.dispatch({...base,command:'open_plan',plan:{objective:'观察当前的争点状态'}});
  const decision = {assessment:{verdict:'revise',health:'sound',continuitySummary:'已读取房间占点查询',
    nextDecisionFocus:'核对下一次占点机会',revisionReason:'工程输入验证事实回执的传递'},
    planRevision:{currentGoal:'核对下一次占点机会'},intent:{queryReceipts:[receipt]}};
  const reflect = (decisionInput,context=base) => plans.dispatch({...context,command:'reflect_plan',
    ...projectStarcraftTmgTurnPlanReflectionInputV1(decisionInput)});
  if(!resume)for(const [field,value,reason] of [
    ['releaseBinding',{...receipt.authority.releaseBinding,manifestHash:'0'.repeat(64)},'authority_releaseBinding'],
    ['seatKey',side==='player1'?'player2':'player1','authority_seatKey'],
    ['stateRevision',head.stateRevision-1,'authority_stateRevision'],
  ]) {
    const other = {...receipt,authority:{...receipt.authority,[field]:value}};
    await assert.rejects(()=>reflect({...decision,intent:{queryReceipts:[other]}}),new RegExp(reason));
  }
  const hypothetical = {...receipt,authority:{...receipt.authority,sceneScope:{kind:'pregame_reference'}}};
  await assert.rejects(()=>reflect({...decision,intent:{queryReceipts:[hypothetical]}}),/live room query receipt/);
  if(resume){
    const prefix=await read(out+'/result.public.json');
    assert.equal(prefix.stateHash,head.envelope.stateHash);
    assert.equal(initialPlan.plan.version,prefix.planVersions.at(-1));
    assert.equal(plans.read({scope}).plan.planHash,initialPlan.plan.planHash);
    await save(out+'/scene-scope.public.json',{revision:head.stateRevision,
      currentRelease:receipt.authority.releaseBinding,receiptHash:receipt.queryReceiptHash,
      hypotheticalReceiptRejected:true,restoredPlanHash:initialPlan.plan.planHash,paidModelCalls:0});
  }else{
  const actionSpace = base.spatialActionSpace;
  await assert.rejects(()=>reflect(decision,{...base,spatialActionSpace:{...actionSpace,
    authority:{...actionSpace.authority,releaseBinding:null}}}),/OFFICIAL_RELEASE_QUERY_BINDING_MISMATCH/);
  assert.equal(plans.read({scope}).plan.planHash,initialPlan.plan.planHash);
  const revised = await reflect(decision);
  assert.equal(revised.plan.version,2);
  assert.equal(revised.result.assessment.queryRefs[0].queryReceiptHash,receipt.queryReceiptHash);
  journal.close(); journal=openJournal();
  const continuity = createStarcraftTmgMatchDecisionContinuityV1({journal});
  const cold = await createStarcraftTmgTurnPlanRuntimeV1({decisionContinuity:continuity}).hydrate({scope});
  assert.equal(cold.plan.version,2);
  assert.equal(cold.plan.currentGoal,decision.planRevision.currentGoal);
  assert.deepEqual(cold.plan.lastValidatedAuthority.releaseBinding,receipt.authority.releaseBinding);
  const history = await continuity.query({scope,query:{kinds:['plan_reflection']}});
  assert.equal(history.records.at(-1).payload.queryRefs[0].queryReceiptHash,receipt.queryReceiptHash);
  assert.equal((await native.store.loadRoom(roomId)).envelope.stateHash,head.envelope.stateHash);
  await save(out+'/result.public.json',{roomId,revision:head.stateRevision,stateHash:head.envelope.stateHash,
    version:opening.version,releaseBinding:receipt.authority.releaseBinding,queryReceiptHash:receipt.queryReceiptHash,
    planVersions:[initialPlan.plan.version,cold.plan.version],rejected:['wrong release','wrong seat','wrong revision','hypothetical scene','unbound menu'],
    coldReflectionRetrieved:true,providerCalls:0,roomMutations:0});
  }
  console.log(out);
} catch(error){await save(out+'/failure.public.json',{message:error.message,stack:error.stack});throw error;}
finally {journal?.close();native.close();}
