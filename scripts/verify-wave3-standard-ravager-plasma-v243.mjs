import assert from 'node:assert/strict';
import path from 'node:path';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1, openWave3EngineeringStoreV1 }
  from './support/wave3-room-boundary-fixture-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE }
  from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = base + '/ravager-plasma-v243', parentDir = base + '/ravager-bile-placement-v243';
const origin = await read(parentDir + '/result.json');
assert.equal(origin.coldExact, true);
const source = openWave3EngineeringStoreV1({ directory: path.join(root,parentDir), filename: 'room.sqlite' });
let initial;
try {
  const { envelope } = await source.loadRoom(origin.roomId);
  assert.equal(envelope.stateHash, origin.stateHash);
  initial = envelope.state;
} finally { source.close(); }

// The parent's split strip is a placement-only scenario. Use the exact signed Standard board
// for the ranged test; every other terrain row must already match the map. Keep the token state.
const geometrySource = (await read(parentDir + '/baseline.json')).scenario;
const mapStore = openWave3EngineeringStoreV1({ directory: path.join(root,base,'ravager-deep-tunnel-v242','movement'),
  filename: 'room.sqlite' });
let originalMap;
try {
  const signed = (await mapStore.loadReplayBundle(geometrySource.sourceRoom)).initialEnvelope;
  assert.equal(signed.stateHash,geometrySource.sourceHash);
  originalMap = signed.state.board.terrain;
} finally { mapStore.close(); }
const scopedId = 'std-ordinary-west';
assert.deepEqual(initial.board.terrain.filter(t=>t.id!==scopedId),originalMap.filter(t=>t.id!==scopedId));
const sourceTile=originalMap.find(t=>t.id===scopedId);
const scopedTile=initial.board.terrain.find(t=>t.id===scopedId);
assert.deepEqual(scopedTile,{...sourceTile,blocksPlacement:true,footprintCells:geometrySource.cells});
initial.board.terrain=originalMap;
const roomId = 'standard-ravager-plasma-signed-map-v243', attacker = initial.pieces.find(p => p.id === 'ravager');
const target = initial.pieces.find(p => p.officialUnitRecordKey === 'army_units:spec_ops_marauder__marauder_');
assert.equal(attacker.sideKey, 'player2');
assert.equal(target.sideKey, 'player1');
const weapon = 'Plasma Discharge', targetId = target.id;
const attackParameters = { targetUnitId: targetId };
// Movement and paying for bile precede this isolated Assault window. Two sides use the actual frozen army.
Object.assign(initial, { stage:'activation_phases', phase:'assault',
  activeSideKey:attacker.sideKey, firstPlayerSideKey:attacker.sideKey });
initial.phaseFirstActorByRound['1:assault'] = { round:1, phase:'assault',
  chosenFirstActorSideKey:attacker.sideKey, markerHolderSideKey:attacker.sideKey };
delete initial.selectedRosterActivationWindow;
Object.assign(target, { isOnField:true, isInReserves:false, deploymentStatus:'deployed',
  xInches:18, yInches:23, leadingModelId:target.models[0].id });
assert.equal(target.models.length, 2, 'frozen small Spec Ops Marauder unit');
const [leader, wing] = target.models;
const separation = (leader.baseWidthInches + wing.baseWidthInches) / 2 + 0.25;
Object.assign(leader, {isOnField:true, xInches:target.xInches, yInches:target.yInches});
Object.assign(wing, {isOnField:true, xInches:target.xInches + separation, yInches:target.yInches});
initial.reserveManifestBySide[target.sideKey].find(row => row.pieceId === targetId).deploymentStatus='deployed';
declareWave3EngineeringCoherencyV1(initial, { planIdPrefix:roomId });
initial.officialRoundSupplyState=refreshOfficialRoundSupplyOccupancyV1({state:initial});
const scenario = { parentRoom:origin.roomId, parentStateHash:origin.stateHash, declaredPhase:'assault',
  terrainSourceRoom:geometrySource.sourceRoom, terrainSourceStateHash:geometrySource.sourceHash,
  targetPlacements:target.models.map(m=>[m.id,m.xInches,m.yInches]), fullRound:false };
const opening = await read(base + '/ravager-deep-tunnel-v242/opening.json');
const bound = await bindWave3StandardActionRoom({ manifestRef:opening.sourceManifest, initial, dir,
  candidateVersion:origin.version, scenario });
assert.equal(bound.runtime.descriptor.runtimeHash, origin.runtimeHash);
const native = bound.open();
try {
  const seats = await native.create(roomId, bound.authority);
  for (;;) {
    const { stateRevision, envelope } = await native.store.loadRoom(roomId);
    assert(stateRevision < 24, 'unexpected length of single shot sequence');
    const state=envelope.state, side=state.activeSideKey;
    const menu=await native.room.legalSpace({roomId, seatToken:seats[side].seatToken});
    assert(menu.ok, menu.message || menu.reason);
    const { parameterDomains:domains, finiteActions:finite } = menu.legalSpace;
    const shot=state.log.flatMap(row=>row.events || []).find(e=>e.type==='ranged_attack'
      && e.pieceId===attacker.id && e.targetId===targetId && e.weaponName===weapon);
    const trigger=state.pendingOfficialReactionWindow?.triggerKind;
    await save(dir+'/menu-r'+stateRevision+'.json', { revision:stateRevision, stateHash:envelope.stateHash,
      side, trigger, domains:domains.map(d=>({ piece:d.pieceId, type:d.actionType, weapon:d.weaponName, fields:d.parameterSchema?.required })),
      finite:finite.map(row=>({piece:row.action.pieceId,type:row.action.actionType})) });
    if (shot && side===target.sideKey && !trigger && !state.pendingCurrentProductRangedCasualtyChoice
      && !state.pendingCurrentProductRangedDamageReaction && !state.pendingOfficialRangedPrecisionChoice) {
      assert(domains.length || finite.length, 'opponent must have a legal successor');
      assert.equal(shot.stages.hit.dice, 4);
      assert.deepEqual(shot.stages.hit.thresholdByDieIndex,[3,3,3,3]);
      assert.equal(shot.stages.damage.damagePerDie,1);
      assert.equal(shot.stages.effects.surgeMatched,false);
      assert.equal(shot.stages.effects.bypassedArmourHits,0);
      assert.equal(shot.stages.damage.totalDamage,shot.stages.hit.hits-shot.stages.armour.saves-shot.stages.evade.saves);
      const cold=bound.open();
      try {
        await cold.restoreDependencies(roomId,bound.authority);
        const replay=await cold.store.loadReplayBundle(roomId);
        const receipts=replay.privateJournal.filter(row=>row.payload.type==='accepted_transition').map(row=>row.payload.payload.receipt);
        const rebuilt=cold.engine.replay({initialEnvelope:replay.initialEnvelope,journal:receipts});
        assert(rebuilt.ok,rebuilt.reason);assert.deepEqual(rebuilt.envelope,envelope);
        await save(dir+'/result.json',{ roomId,version:origin.version,source:origin.stateHash,revision:stateRevision,
          stateHash:envelope.stateHash,weapon,target:targetId,dice:shot.stages.hit.dice,hits:shot.stages.hit.hits,
          armourSaves:shot.stages.armour.saves,evadeSaves:shot.stages.evade.saves,damage:shot.stages.damage.totalDamage,
          bypass:shot.stages.effects.bypassedArmourHits,casualties:shot.casualtyModelIds,successorSide:side,
          receipts:receipts.length,coldExact:true,modelCalls:0 });
      } finally { cold.close(); }
      break;
    }
    let domain, parameters, candidate;
    if (stateRevision===0) {
      domain=domains.find(d=>d.pieceId===attacker.id && d.actionType==='ranged_attack' && d.weaponName===weapon);
      assert(domain,'frozen Plasma Discharge absent from Standard Room');
      parameters=attackParameters;
    } else if (trigger) {
      domain=domains.find(d=>d.actionType==='pass_reaction_family_window');
      assert(domain,'optional reaction requires a legal pass');
      parameters={};
    } else if (shot && !state.pendingCurrentProductRangedCasualtyChoice && !state.pendingOfficialRangedPrecisionChoice
      && !state.pendingCurrentProductRangedDamageReaction) {
      const finishTypes=[OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE,'finish_activation'];
      domain=domains.find(d=>d.pieceId===attacker.id && finishTypes.includes(d.actionType));
      candidate=finite.find(r=>r.action.pieceId===attacker.id && finishTypes.includes(r.action.actionType));
      assert(domain || candidate,'attack resolved without an activation successor');
      parameters={};
    } else if (domains.length===1) {
      [domain]=domains;
      parameters=poolParameters(domain);
    } else {
      assert.equal(domains.length,0);
      assert.equal(finite.length,1);
      [candidate]=finite;
    }
    const choice=domain ? {select:d=>d.domainId===domain.domainId,parameters:()=>parameters}
      : {kind:'finite',select:r=>r.actionKey===candidate.actionKey};
    await native.commit({roomId,credential:seats[side],operationKey:'plasma-r'+stateRevision,...choice});
  }
} catch (error) {
  await save(dir+'/stop-'+Date.now()+'.json',{roomId,reason:error.message});
  throw error;
} finally { native.close(); }
