import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext, bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const dir = base + '/standard-defiler-bite-v248';
const version = '2.48.0', paid = 'defiler', unpaid = 'ally', targetId = 'spec_ops_marauder__marauder_';
const bite = 'Cancerous Bite', claws = 'Claws';
const stop = process.argv.includes('--stop-after-first');
const roomId = 'standard-defiler-bite-v248-' + (stop ? 'stop' : 'both');
const output = dir + '/' + (stop ? 'stop' : 'both');
const manifestRef = (await read(base + '/ravager-deep-tunnel-v242/opening.json')).sourceManifest;
async function opening() {
  try { return await read(dir + '/opening.json'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
  const context = await resolveWave3StandardContext(await read(manifestRef), 'area_ability_inputs');
  const scenario = await read(base + '/zagara-standard-admission-v239/admission.json');
  const recipes = await read(base + '/zagara-standard-admission-v239/recipes.json');
  const carrier = recipes.player2.units.find(u => u.unitInstanceId === paid);
  recipes.player2.units.push({ ...carrier, unitInstanceId:unpaid, upgradeNames:[] });
  carrier.upgradeNames = [bite];
  recipes.player2.tacticalCardRecordKeys.push('tactical_cards:hatchery'); // Grants the second Support slot.
  const { state } = prepareOfficialStandardReleaseOpeningV2({ releaseMatchVersion:version, releaseContext:context,
    dataset:context.dataset, snapshot:context.snapshot, recipes, armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey:scenario.mission, deploymentRecordKey:scenario.deployment });
  assert.equal(state.phase,'start_of_round');
  assert(state.officialMeleeSidearmPolicy);
  const audit = state.armyCompositionUpgradeAuditsBySide.player2.units;
  assert.equal(audit.find(u=>u.unitInstanceId===paid).mineralCost,20);
  assert.equal(audit.find(u=>u.unitInstanceId===unpaid).mineralCost,0);
  const source = { recipes, mission:scenario.mission, deployment:scenario.deployment, manifestRef, version, state };
  await save(dir + '/opening.json',source);
  return source;
}
const source = await opening();
const coords = { [paid]:[[19,8]], [unpaid]:[[22.25,11.25]], [targetId]:[[22.25,8],[24.35,8]] };
let scenario = { declaredStartingPositions:coords, phaseAtOpening:source.state.phase, twoHumanSeats:true, fullMatch:false };
const bound = await bindWave3StandardActionRoom({manifestRef,initial:source.state,dir,candidateVersion:version,scenario,
  ...(stop ? { frozenRuntimeRef:dir+'/runtime.json' } : {})});
let initial;
if (stop) {
  const checkpoint = await read(dir+'/after-first.json');
  assert.equal(hashStarcraftTmgContract(checkpoint.state),checkpoint.hash);
  initial = checkpoint.state;
  scenario = {sourceRoom:'standard-defiler-bite-v248-both',sourceRevision:checkpoint.revision,sourceHash:checkpoint.hash};
} else {
  initial = structuredClone(source.state);
  for (const [id,locations] of Object.entries(coords)) {
    const unit = initial.pieces.find(p=>p.id===id);
    assert.equal(unit.models.length,locations.length);
    Object.assign(unit,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',
      leadingModelId:unit.models[0].id,xInches:locations[0][0],yInches:locations[0][1]});
    locations.forEach(([xInches,yInches],i)=>Object.assign(unit.models[i],{isOnField:true,xInches,yInches}));
    initial.reserveManifestBySide[unit.sideKey].find(r=>r.pieceId===id).deploymentStatus='deployed';
  }
  declareWave3EngineeringCoherencyV1(initial,{planIdPrefix:roomId});
  initial.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({state:initial});
}
const authority = bound.authorityFor(initial,scenario);
const native = bound.open();
let revision;
try {
  const seats = await native.create(roomId,authority);
  for (;;) {
    const { envelope, stateRevision } = await native.store.loadRoom(roomId);
    revision = stateRevision;
    assert(revision < 40,'unexpected number of choices in two melee batches');
    const state = envelope.state, side = state.activeSideKey ?? state.firstPlayerSideKey;
    const menu = await native.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(menu.ok,menu.message || menu.reason);
    const domains = menu.legalSpace.parameterDomains, finite = menu.legalSpace.finiteActions;
    const events = state.log.flatMap(r=>r.events ?? []);
    const attacks = events.filter(e=>e.type==='close_combat_attack' && e.pieceId===paid);
    const seq = state.pendingOfficialMeleeSidearmSequence;
    const fights = domains.filter(d=>d.actionType==='fight');
    await save(output+'/menu-r'+revision+'.json',{revision,phase:state.phase,side,stateHash:envelope.stateHash,
      domains:domains.map(d=>({type:d.actionType,actor:d.pieceId,weapon:d.weaponName})),finite:finite.map(c=>c.action.actionType)});
    const finished = !seq && side === 'player1' && state.phase === 'combat' && attacks.length === (stop?1:2)
      && !state.pendingAction && !state.pendingOfficialReactionWindow && (fights.length || finite.some(a=>a.action.actionType==='pass'));
    if (finished) {
      assert.deepEqual(attacks.map(e=>e.weaponName),stop?[bite]:[bite,claws]);
      assert.deepEqual(attacks.map(e=>e.stages.hitRolls.length),stop?[2]:[2,4]);
      assert(state.pieces.find(p=>p.id===paid).activatedPhases.combat);
      if (stop) assert(events.some(e=>e.type==='melee_sidearm_sequence_finished'&&e.pieceId===paid));
      const cold = bound.open();
      try {
        await cold.restoreDependencies(roomId,authority);
        const journal=await cold.store.loadReplayBundle(roomId);
        const receipts=journal.privateJournal.filter(e=>e.payload.type==='accepted_transition').map(e=>e.payload.payload.receipt);
        const replay=cold.engine.replay({initialEnvelope:journal.initialEnvelope,journal:receipts});
        assert(replay.ok,replay.reason);assert.deepEqual(replay.envelope,envelope);assert.equal(receipts.length,revision);
        await save(output+'/result.json',{roomId,scenario,round:state.round,revision,stateHash:envelope.stateHash,
          attacks:attacks.map(e=>({weapon:e.weaponName,dice:e.stages.hitRolls.length,target:e.targetId,damage:e.stages.totalDamage})),
          successorSide:side,receipts:receipts.length,coldExact:true,modelCalls:0});
      } finally { cold.close(); }
      break;
    }
    let domain,candidate,parameters={},query;
    if (fights.some(d=>d.pieceId===paid) && side==='player2' && !attacks.length) {
      assert(fights.some(d=>d.pieceId===unpaid&&d.weaponName===claws));
      assert(!fights.some(d=>d.pieceId===unpaid&&d.weaponName===bite));
      assert.throws(()=>bound.runtime.queryFight(state,unpaid,bite,{}),/DOMAIN_UNAVAILABLE/);
      assert.throws(()=>bound.runtime.queryFight(state,paid,undefined,{}),/WEAPON_REQUIRED/);
      domain=fights.find(d=>d.pieceId===paid&&d.weaponName===bite);
      assert(domain);
    } else if (fights.some(d=>d.pieceId===paid) && seq && attacks.length===1) {
      assert.equal(seq.completedBatches.length,1);
      assert(fights.every(d=>d.pieceId===paid && d.weaponName===claws));
      const finish=finite.find(c=>c.action.actionType==='finish_melee_attack_sequence');
      assert(finish); assert(!finite.some(c=>c.action.actionType==='pass'));
      if (!stop) await save(dir+'/after-first.json',{state:state,revision,hash:envelope.stateHash});
      if (stop) candidate=finish; else domain=fights.find(d=>d.pieceId===paid&&d.weaponName===claws);
    } else {
      for (const type of ['pass_reaction_family_window','finish_activation','choose_first_actor','pass']) {
        domain=domains.find(d=>d.actionType===type);
        candidate=finite.find(c=>c.action.actionType===type && (type!=='choose_first_actor'
          || (c.action.chosenFirstActorSideKey??c.action.sourceAction?.chosenFirstActorSideKey)==='player2'));
        if (domain || candidate) break;
      }
      if (!domain && !candidate && domains.length+finite.length===1) { [domain]=domains;[candidate]=finite; }
      assert(domain || candidate,'unexpected product menu at '+state.phase+'/r'+revision);
      if (domain) parameters=poolParameters(domain);
    }
    if (domain?.actionType==='fight') {
      assert(domain.constraints.targetUnitIds.includes(targetId));
      parameters={closeRanksMode:'decline',allocations:[{targetUnitId:targetId,dice:domain.constraints.declineCloseRanksAttackDice}],
        surgeTargetUnitId:null,criticalTargetUnitId:domain.weaponName===bite?targetId:null};
      query=bound.runtime.queryFight(state,paid,domain.weaponName,parameters);
    }
    const action=domain?{select:d=>d.domainId===domain.domainId,parameters:()=>parameters}:
      {kind:'finite',select:c=>c.actionKey===candidate.actionKey};
    const committed=await native.commit({roomId,credential:seats[side],operationKey:'defiler-bite-r'+revision,...action});
    if (query) assert.deepEqual(committed.preview.core.action.sourceAction,query.result.action);
  }
} catch (e) {
  await save(output+'/stop-'+Date.now()+'.json',{revision,message:e.message,frame:e.stack?.split('\n')[1]});throw e;
} finally { native.close(); }
