import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { createOfficialTerrainPieceV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { evaluateOfficialElevatedLineOfSightV1, evaluateOfficialEffectiveSizeV1 }
  from '../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { projectOfficialRangedTerrainForLosV1 } from '../packages/product-composition/official-ranged-terrain-projection-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const saved = await read(base + '/standard-bombard-v246/before-shot.json');
const state = structuredClone((await read(base + '/standard-bombard-v247/opening.json')).state);
state.pieces = saved.state.pieces;
const cells = (await read(base + '/ravager-bile-placement-v243/baseline.json')).scenario.cells;
const ramp = state.board.terrain.find(t => t.id === 'std-ordinary-west');
Object.assign(ramp, createOfficialTerrainPieceV1({ id:ramp.id, terrainKind:'ramp', size:1,
  standableHorizontalSurface:true, footprint:ramp.footprint, footprintCells:cells }));
const attacker = state.pieces.find(p => p.id === 'nova_stealth_mode');
const target = state.pieces.find(p => p.id === 'spec_ops_marauder__marauder_');
for (const unit of [attacker,target]) {
  unit.isOnField = true;
  for (const model of unit.models) Object.assign(model,{isOnField:true,elevation:'ground',supportTerrainIds:[]});
}
const projected = projectOfficialRangedTerrainForLosV1(state).projected;
const query = {state:projected, attacker,target, attackerModelId:attacker.models[0].id,
  targetModelId:target.models[0].id,dataBundle:state.officialTerrainLosDataBundle};
function line(x1,y1,x2,y2) {
  Object.assign(attacker.models[0],{xInches:x1,yInches:y1});
  Object.assign(target.models[0],{xInches:x2,yInches:y2});
  return evaluateOfficialElevatedLineOfSightV1(query).assessments.find(a => a.terrainId === ramp.id);
}
const legacy = { ...saved.state, board:state.board };
const old = projectOfficialRangedTerrainForLosV1(legacy).projected;
assert.throws(() => evaluateOfficialElevatedLineOfSightV1({...query,state:old}),/ELEVATION_TERRAIN_INVALID/);
const gap = line(15,14,15,20), cross = line(12,17,18,17);
assert.equal(gap.cellTraces.length, 2);
assert.equal(gap.blockingTerrainTrace,false);
assert.equal(cross.blockingTerrainTrace,true);
const support = () => evaluateOfficialEffectiveSizeV1({state:projected,dataBundle:query.dataBundle,
  subjectKind:'model',unitId:attacker.id,modelId:attacker.models[0].id}).subject;
Object.assign(attacker.models[0],{xInches:14.1,yInches:17,supportTerrainIds:[ramp.id],elevation:'mid'});
const supported = support();
assert.equal(supported.supportTerrainId,ramp.id);
assert.equal(supported.supportingTerrainEffectiveSize,1);
attacker.models[0].xInches = 15;
assert.throws(support,/ELEVATION_MODEL_SUPPORT_INVALID/);
const privateRamp = projected.board.terrain.find(t=>t.id===ramp.id);
privateRamp.footprintCells[0].maxXMilliInches++;
assert.throws(support,/TERRAIN_LOS_TERRAIN_INVALID/);
assert.deepEqual(ramp.footprintCells,cells);
await save(base + '/standard-bombard-v247/sight-support.json', {
  sourceStateHash:saved.stateHash, rampId:ramp.id,rampHash:ramp.terrainHash,
  gap:{ trace:gap.blockingTerrainTrace, cells:gap.cellTraces },cross:{trace:cross.blockingTerrainTrace,cells:cross.cellTraces},
  supportTerrainId:supported.supportTerrainId,supportSize:supported.supportingTerrainEffectiveSize,
  gapSupportRejected:true,changedCellHashRejected:true,legacyGateRetained:true,modelCalls:0 });
