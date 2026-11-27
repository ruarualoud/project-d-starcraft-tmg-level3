import assert from 'node:assert/strict';
import path from 'node:path';
import {readdir} from 'node:fs/promises';
import {read, save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {bindWave3StandardActionRoom, resolveWave3StandardContext} from './support/wave3-standard-action-room-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {createStarcraftTmgSnapshotSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';

const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const shotDir=base+'/cocoon-ravager-attack-v243', chargeDir=base+'/cocoon-ravager-charge-v243';
const destination='build/ticket-28-wave3-ravager-query-apply';
const shot=await read(shotDir+'/result.json'), charge=await read(chargeDir+'/result.json');
const manifestRef=base+'/wave3-artefact-cocoon-v223-v1/morph/manifest.json';
const archive=openWave3EngineeringStoreV1({directory:path.resolve(chargeDir),filename:'room.sqlite',readOnly:true});
let bundle;
try {bundle=await archive.loadReplayBundle(charge.roomId);}finally{archive.close();}
const original=bundle.initialEnvelope;
const state=original.state;
assert.equal(original.stateHash,charge.parentStateHash);
assert.equal(original.stateHash,(await read(shotDir+'/firing-window.json')).stateHash);
const context=await resolveWave3StandardContext(await read(manifestRef),'area_ability_inputs');
const roster=(await read(base+'/wave3-artefact-cocoon-v223-v1/factory-preflight.public.json')).find(row=>row.status==='compiled');
const opening=prepareOfficialStandardReleaseOpeningV2({releaseContext:context,dataset:context.dataset,snapshot:context.snapshot,
  releaseMatchVersion:charge.version,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,recipes:roster.recipes,
  missionRecordKey:state.officialMissionRuntimeState.missionRecordKey,deploymentRecordKey:state.officialDeploymentGeometryBinding.deploymentRecordKey});
const scenario={fromRoom:shot.roomId,fromRevision:7,fromStateHash:original.stateHash};
const bound=await bindWave3StandardActionRoom({manifestRef,initial:opening.state,dir:chargeDir,
  candidateVersion:charge.version,scenario,frozenRuntimeRef:shotDir+'/runtime.json'});
async function savedAction(dir, revision) {
  for(const file of (await readdir(dir)).filter(f=>f.startsWith('operation-'))){
    const {core}=(await read(dir+'/'+file)).preview;
    if(core.expectedStateRevision===revision)return core;
  }
  throw Error('Original action unavailable at '+revision);
}
function nativePlan(action,key) {
  for (let row=action;row;row=row.sourceAction) if(row[key])return row[key];
  throw Error('Native plan missing: '+key);
}
const source=bound.open({readOnly:true});
let stage='signed shot';
try {
  await source.restoreDependencies(charge.roomId,bound.authorityFor(state,scenario));
  async function compare(envelope, op, kind) {
    assert.equal(envelope.stateHash,op.preStateHash);
    const service=createStarcraftTmgSnapshotSceneQueryServiceV1({state:envelope.state,seatKey:op.seatKey,
      rulesRuntime:bound.rulesRuntime, matchBinding:envelope.matchBinding,
      sceneScope:{kind:'pregame_reference',sourceStateHash:envelope.stateHash,baseStateHash:envelope.stateHash}});
    const result=await service.query({queryKind:kind,arguments:{domainId:op.proposal.domainId,parameters:op.proposal.parameters}});
    if(!['exact','advisory_estimate'].includes(result.status))throw Error(JSON.stringify({kind,status:result.status,reason:result.reason,details:result.details}));
    return result;
  }
  let fire;
  if (process.argv.includes('--route-only')) {
    fire = await read(destination+'/shot.public.json');
    assert.equal(fire.sourceStateHash,original.stateHash);
  } else {
  const shotAction=await savedAction(shotDir,7);
  const prediction=await compare(original,shotAction,'attack_probability');
  const predicted=prediction.result;
  assert.equal(predicted.attackPlanHash,nativePlan(shotAction.action,'rangedPlan').attackPlanHash);
  assert.equal(predicted.attackerUnitId,shot.generatedId);assert.equal(predicted.targetUnitId,shot.targetId);
  assert.equal(predicted.weaponName,shot.weapon);
  fire={planHash:predicted.attackPlanHash,queryReceipt:prediction.queryReceiptHash,sourceStateHash:original.stateHash,
    units:predicted.contributingModelIds,weapon:predicted.weaponName,distribution:predicted.outcomes.distribution,
    expectedCasualties:predicted.outcomes.expectedCasualties,observedCasualties:shot.casualties.length};
  await save(destination+'/shot.public.json',fire);
  }
  stage='signed charge route';
  const receipts=bundle.privateJournal.filter(e=>e.payload.type==='accepted_transition').map(e=>e.payload.payload.receipt);
  const next=source.engine.replay({initialEnvelope:original,journal:receipts.slice(0,1)});
  assert(next.ok,next.reason);
  const resolution=await savedAction(chargeDir,1);
  const route=await compare(next.envelope,resolution,'legal_full_path_movement');
  const signed=nativePlan(resolution.action,'chargeResolutionPlan');
  assert.equal(route.result.pathQualification.nativePlanHash,signed.chargeResolutionPlanHash);
  assert.deepEqual(route.result.canonicalParameters.path,signed.canonicalParameters.path);
  assert.equal(route.result.pathQualification.completeNativePathChecked,true);
  async function verifyRejected(envelope,op,parameters) {
    const service=createStarcraftTmgSnapshotSceneQueryServiceV1({state:envelope.state,seatKey:op.seatKey,
      rulesRuntime:bound.rulesRuntime,matchBinding:envelope.matchBinding,
      sceneScope:{kind:'pregame_reference',sourceStateHash:envelope.stateHash,baseStateHash:envelope.stateHash}});
    const result=await service.query({queryKind:'legal_full_path_movement',arguments:{domainId:op.proposal.domainId,parameters}});
    assert.equal(result.status,'unknown'); assert(!result.result?.proposalAccepted);
    return result.reason;
  }
  const declaration = await savedAction(chargeDir,0);
  const declarationOnly = await verifyRejected(original,declaration,declaration.proposal.parameters);
  const overlong = structuredClone(resolution.proposal.parameters);
  overlong.path = [{...overlong.path[0], xMilliInches: 3000}, ...overlong.path];
  const illegal = await verifyRejected(next.envelope,resolution,overlong);
  await save(destination+'/result.public.json',{fire,charge:{queryReceipt:route.queryReceiptHash,
    stateHash:next.envelope.stateHash,planHash:signed.chargeResolutionPlanHash,roll:signed.chargeRoll,
    availableMilliInches:signed.maxDistanceMilliInches,path:signed.canonicalParameters.path},
    controls:{declarationOnly,overlong:illegal},archivedShotColdExact:shot.coldExact,archivedChargeColdExact:charge.coldExact,providerCalls:0});
} catch (error) {
  await save(destination+'/stop-'+Date.now()+'.public.json',{stage,reason:error.message.slice(0,1000)});
  throw error;
} finally {source.close();}
