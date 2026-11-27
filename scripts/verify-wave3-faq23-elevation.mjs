import assert from 'node:assert/strict';
import path from 'node:path';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from '../packages/product-composition/official-ranged-terrain-projection-v1.mjs';
import { evaluateOfficialElevatedLineOfSightV1 } from '../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';

const dir = 'build/ticket-28-wave3-human-lobby-v1/high-ground-286';
const signed = await read(dir + '/result.public.json');
const db = openWave3EngineeringStoreV1({directory:path.resolve(dir), filename:'room.sqlite', readOnly:true});
let head;
try { head = (await db.loadRoom('wave3-formal-high-ground-286')).envelope; } finally { db.close(); }
assert.equal(head.stateHash,signed.stateHash);
const platform = 'std-centre-large';
function position(model,x,y,high) {
  Object.assign(model,{isOnField:true,xInches:x,yInches:y,elevation:high?'high':'ground',supportTerrainIds:high?[platform]:[]});
}
function inspect(lower, mixed) {
  const state = structuredClone(head.state);
  const attacker = state.pieces.find(p=>p.id==='twilight_templar__high_templar_');
  const target = state.pieces.find(p=>p.id==='player1-marine-1');
  assert(state.officialAttackProfileCatalogueV2.profiles.some(p=>p.profileKey===attacker.officialUnitRecordKey+'::assault::Psi Blast'));
  assert.equal(target.models.length,6);
  Object.assign(attacker,{isOnField:true,isInReserves:false,deploymentStatus:'deployed'});
  for(const [i,model] of attacker.models.entries()) position(model,lower?28-i*1.4:25.4+i*1.4,lower?10.5:15.7,!lower);
  if(mixed) position(target.models.at(-1),30.9,18.5,false);
  const result=evaluateOfficialElevatedLineOfSightV1({state:projectOfficialRangedTerrainForLosV1(state).projected,
    attacker,target,attackerModelId:attacker.models[0].id,targetModelId:target.models[0].id,dataBundle:state.officialTerrainLosDataBundle});
  assert.equal(result.targetAllHighGround,!mixed);
  assert.equal(result.attackOriginatesFromLowerElevation,lower);
  assert.equal(result.highGroundEvadeEligible,lower&&!mixed);
  return {defendersOnPlatform:target.models.filter(m=>m.supportTerrainIds.includes(platform)).length,
    lowerAttacker:lower,evadeEligible:result.highGroundEvadeEligible,visible:result.visible};
}
const comparisons=[inspect(true,false),inspect(true,true),inspect(false,false)];
await save('build/ticket-28-wave3-faq23-elevation/result.public.json',{
  sourceRevision:head.stateRevision,sourceStateHash:head.stateHash,sourceRef:dir+'/result.public.json',
  scope:'Actual signed Wave3 defending formation; attacker positions and the alternative defender are declared read-only scenarios. Measures the firing geometry predicate; no shot or dice.',
  comparisons,providerCalls:0});
