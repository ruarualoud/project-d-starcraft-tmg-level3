import assert from 'node:assert/strict';
import { createOfficialTerrainPieceV1 } from '../packages/rule-atoms/official-terrain-los-rules-kernel-v1.mjs';
import { createOfficialSpecialTerrainAgreementV1 } from '../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { resolveWave3StandardContext, bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { refreshOfficialRoundSupplyOccupancyV1 } from '../packages/rule-atoms/official-round-supply-state-v1.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const geometryCase = process.argv.includes('--geometry');
const dir = base + (geometryCase ? '/standard-bombard-v247' : '/standard-bombard-v246');
const version = geometryCase ? '2.47.0' : '2.46.0';
const bombardId = 'unit:bile_launcher/bombard-movement-phase@1';
const roomId = 'standard-bombard-v' + version.split('.').slice(0,2).join('');
const manifestRef = (await read(base + '/ravager-deep-tunnel-v242/opening.json')).sourceManifest;
const openingRef = dir + '/opening.json';
async function prepare() {
  try { return await read(openingRef); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  const context = await resolveWave3StandardContext(await read(manifestRef), 'area_ability_inputs');
  const scenario = await read(base + '/zagara-standard-admission-v239/admission.json');
  const recipes = await read(base + '/zagara-standard-admission-v239/recipes.json');
  const support = recipes.player2.units.find(unit => unit.unitInstanceId === 'defiler');
  assert(support);
  Object.assign(support, { unitInstanceId: 'launcher', recordKey: 'army_units:bile_launcher' });
  const input = { releaseContext: context, dataset: context.dataset, snapshot: context.snapshot, recipes,
    armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY, missionRecordKey: scenario.mission,
    deploymentRecordKey: scenario.deployment };
  if (!geometryCase) assert.throws(() => prepareOfficialStandardReleaseOpeningV2({ ...input, releaseMatchVersion: '2.45.0' }),
    e => e.code === 'OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING'
      && e.detail.pendingSelectedDefinitionIds.length === 1 && e.detail.pendingSelectedDefinitionIds[0] === bombardId);
  const opening = prepareOfficialStandardReleaseOpeningV2({ ...input, releaseMatchVersion: version });
  assert.equal(opening.state.phase, 'start_of_round');
  assert(opening.state.officialBombardRemovalLifecyclePolicy);
  const result = { version, manifestRef, mission: scenario.mission, deployment: scenario.deployment, recipes, state: opening.state };
  await save(openingRef, result);
  return result;
}

const opening = await prepare();

const forkUnused = process.argv.includes('--unused');
const cleanupBranch = forkUnused || geometryCase;
const branchName = geometryCase ? 'unused-agreed' : cleanupBranch ? 'unused' : 'shot';
const caseDir = dir + '/' + branchName;
const caseId = roomId + '-' + branchName;
const actor = 'launcher', enemy = 'spec_ops_marauder__marauder_';
const paidRef = dir + '/before-shot.json';
const coordinates = geometryCase ? { xMilliInches:15000, yMilliInches:16550 } : { xMilliInches:28000, yMilliInches:8000 };
const sourceScenario = { declaredStartingPositions: { [actor]: [[8,8]], [enemy]: [[30,8],[32.25,8]] },
  printedRangeInches: 12, targetOutsideOrdinaryRange: true, untouchedTerrain: !geometryCase, fullMatch: false };
const bound = await bindWave3StandardActionRoom({ manifestRef, initial: opening.state, dir,
  candidateVersion: version, scenario: sourceScenario, ...(forkUnused ? { frozenRuntimeRef: dir + '/runtime.json' } : {}) });
let initial, scenario;
if (forkUnused) {
  const saved = await read(paidRef);
  initial = saved.state;
  assert.equal(hashStarcraftTmgContract(initial), saved.stateHash);
  scenario = { sourceRoom: roomId + '-shot', sourceRevision: saved.revision, sourceStateHash: saved.stateHash, declineShot: true };
} else {
  initial = structuredClone(opening.state);
  for (const [id, coords] of Object.entries(sourceScenario.declaredStartingPositions)) {
    const piece = initial.pieces.find(p => p.id === id);
    assert.equal(piece.models.length, coords.length);
    Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'deployed',
      xInches: coords[0][0], yInches: coords[0][1], leadingModelId: piece.models[0].id });
    coords.forEach(([xInches,yInches], i) => Object.assign(piece.models[i], { isOnField: true, xInches, yInches }));
    initial.reserveManifestBySide[piece.sideKey].find(row => row.pieceId === id).deploymentStatus = 'deployed';
  }
  declareWave3EngineeringCoherencyV1(initial, { planIdPrefix: caseId });
  initial.officialRoundSupplyState = refreshOfficialRoundSupplyOccupancyV1({ state: initial });
  scenario = sourceScenario;
}
if (geometryCase) {
  const oldRoom = bound.open();
  try {
    const old = await oldRoom.store.loadRoom(roomId + '-unused');
    if (old) {
      assert.equal(old.stateRevision, 7);
      assert(old.envelope.state.board.tokens.some(t => t.tokenKind === 'bile_bomb'));
      initial = structuredClone(old.envelope.state);
      scenario = { ...scenario, sourceRoom:roomId+'-unused', sourceRevision:old.stateRevision, sourceStateHash:old.envelope.stateHash };
    }
  } finally { oldRoom.close(); }
  const cells = (await read(base + '/ravager-bile-placement-v243/baseline.json')).scenario.cells;
  const terrain = initial.board.terrain.find(t => t.id === 'std-ordinary-west');
  const ramp = createOfficialTerrainPieceV1({ id:terrain.id, terrainKind:'ramp', size:1, footprint:terrain.footprint,
    footprintCells:cells, standableHorizontalSurface:true });
  const access = [['base',['ground','mid']], ['top',['mid','high']]].map(([role,connects],i) =>
    ({ accessPointId:terrain.id+'-'+role, role, connects, footprint:cells[i] }));
  Object.assign(terrain, ramp, { blocksPlacement:true, accessPoints:access });
  initial.board.specialTerrainAgreement = createOfficialSpecialTerrainAgreementV1({
    terrainEntries:initial.board.specialTerrainAgreement.terrainEntries.map(entry => entry.terrainId === terrain.id
      ? { terrainId:terrain.id, terrainKind:'ramp', accessPoints:access, adjacentElevationPairs:access.map(a=>a.connects) } : entry) });
  scenario.declaredTerrain = { id:terrain.id, cells, terrainHash:ramp.terrainHash,
    setupHash:initial.board.specialTerrainAgreement.agreementHash, blocksPlacement:true };
}
const authority = bound.authorityFor(initial, scenario);
const native = bound.open();
let revision, phase;
try {
  const seats = await native.create(caseId, authority);
  for (;;) {
    const head = await native.store.loadRoom(caseId);
    revision = head.stateRevision;
    assert(revision < 38, 'unexpected number of choices before Bombard successor');
    const state = head.envelope.state;
    phase = state.phase;
    const side = state.activeSideKey ?? state.firstPlayerSideKey;
    const menu = await native.room.legalSpace({ roomId: caseId, seatToken: seats[side].seatToken });
    assert(menu.ok, menu.message || menu.reason);
    const { parameterDomains: domains, finiteActions: finite } = menu.legalSpace;
    const events = state.log.flatMap(row => row.events ?? []);
    const set = events.find(e => e.type === 'bile_bomb_token_set');
    const shot = events.find(e => e.type === 'ranged_attack' && e.weaponName === 'Bile Bomb' && e.pieceId === actor);
    const replacement = state.officialBombardReplacementHistory?.find(row => row.pieceId === actor);
    await save(caseDir + '/menu-r' + revision + '.json', { revision, stateHash: head.envelope.stateHash, phase,
      lifecycle: state.currentProductMatchLifecycle?.step, side,
      domains: domains.map(d => ({ type:d.actionType, actor:d.pieceId, weapon:d.weaponName, mode:d.attackMode })),
      finite: finite.map(c => c.action.actionType) });
    const finished = cleanupBranch ? replacement && Number(state.round) === 2
      : replacement && side === 'player1' && !state.pendingOfficialBombardReplacement && phase === 'assault';
    if (finished) {
      assert.equal(replacement.removedTokenId, set.tokenId);
      assert.equal(replacement.removalCause, cleanupBranch ? 'cleanup' : 'attack');
      assert(!state.board.tokens.some(t => t.tokenId === set.tokenId));
      assert(state.board.tokens.some(t => t.tokenId === replacement.replacementTokenId && t.tokenKind === 'creep_tumor'));
      assert.equal(Boolean(shot), !cleanupBranch);
      if (shot) assert.equal(shot.attackMode, 'bombard');
      assert(finite.length || domains.length, 'next actor has no legal follow-up');
      const cold = bound.open();
      try {
        await cold.restoreDependencies(caseId, authority);
        const bundle = await cold.store.loadReplayBundle(caseId);
        const receipts = bundle.privateJournal.filter(e => e.payload.type === 'accepted_transition').map(e => e.payload.payload.receipt);
        const replay = cold.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
        assert(replay.ok, replay.reason);
        assert.deepEqual(replay.envelope, head.envelope);
        assert.equal(receipts.length, revision);
        await save(caseDir + '/result.json', { roomId:caseId, version, phase, round:state.round, side, receipts:receipts.length,
          stateHash:head.envelope.stateHash, modelCalls:0, coldExact:true, scenario, payment:set.resourceCost,
          sourceToken:set.tokenId, replacement, target:shot?.targetId, shotMode:shot?.attackMode,
          hits:shot?.stages.hit.hits, damage:shot?.stages.damage.totalDamage, successor:[...finite.map(c=>c.action.actionType),...domains.map(d=>d.actionType)] });
      } finally { cold.close(); }
      break;
    }
    let domain, candidate, parameters = {}, preview;
    const place = domains.find(d => d.actionType === 'set_bile_bomb' && d.pieceId === actor);
    const replace = domains.find(d => d.actionType === 'replace_bile_bomb_with_creep');
    const specialShot = domains.find(d => d.actionType === 'ranged_attack' && d.pieceId === actor && d.attackMode === 'bombard');
    if (replace) {
      assert.equal(domains.length + finite.length, 1);
      const original = state.board.tokens.find(t => t.tokenId === set.tokenId);
      const diameter = replace.constraints.physicalTokenProfile.baseDiameterMm;
      const spacing = Math.round((original.baseDiameterMm + diameter) * 500 / 25.4);
      parameters = { coordinate: { xMilliInches: coordinates.xMilliInches, yMilliInches: coordinates.yMilliInches + spacing } };
      assert.throws(() => bound.runtime.queryBombardReplacement(state, { coordinate:coordinates }), /BASE_TO_BASE_REQUIRED/);
      if (geometryCase) assert.throws(() => bound.runtime.queryBombardReplacement(state, {
        coordinate:{xMilliInches:coordinates.xMilliInches-spacing, yMilliInches:coordinates.yMilliInches} }), /OVERLAPS_TERRAIN/);
      domain = replace;
      preview = bound.runtime.queryBombardReplacement(state, parameters);
    } else if (place && !set) {
      domain = place;
      parameters = { coordinate:coordinates, paymentCardInstanceIds:place.parameterSchema.paymentCardInstanceIds.choices[0] };
      assert.throws(() => bound.runtime.queryBombardPlacement(state, actor, { ...parameters, coordinate:{xMilliInches:44000,yMilliInches:8000} }), /RANGE_EXCEEDED/);
      if (geometryCase) assert.throws(() => bound.runtime.queryBombardPlacement(state, actor, {
        ...parameters, coordinate:{xMilliInches:14300,yMilliInches:16550} }), /OVERLAPS_TERRAIN/);
      preview = bound.runtime.queryBombardPlacement(state, actor, parameters);
    } else if (specialShot && !shot && !cleanupBranch) {
      assert.equal(set.resourceCost,1);
      assert.equal(set.resourceType,'BM');
      assert(!domains.some(d=>d.actionType === 'ranged_attack' && d.pieceId === actor && !d.attackMode && d.constraints?.targetUnitIds?.includes(enemy)));
      await save(paidRef, { revision, stateHash:head.envelope.stateHash, state });
      domain = specialShot;
      parameters = { targetUnitId:enemy, attackMode:'bombard' };
    } else {
      for (const type of ['pass_reaction_family_window', OFFICIAL_SELECTED_ROSTER_RANGED_FINISH_ACTION_TYPE, 'finish_activation', 'choose_first_actor', 'pass']) {
        domain = domains.find(d=>d.actionType === type);
        candidate = finite.find(c=>c.action.actionType === type && (type !== 'choose_first_actor'
          || (c.action.chosenFirstActorSideKey ?? c.action.sourceAction?.chosenFirstActorSideKey) === 'player2'));
        if (domain || candidate) break;
      }
      if (!domain && !candidate && domains.length + finite.length === 1) {
        [domain] = domains; [candidate] = finite;
      }
      assert(domain || candidate, 'unexpected product menu at ' + phase + '/r' + revision);
      if (domain) parameters = poolParameters(domain);
    }
    const action = domain ? { select:d=>d.domainId === domain.domainId, parameters:()=>parameters }
      : { kind:'finite', select:c=>c.actionKey === candidate.actionKey };
    const commit = await native.commit({ roomId:caseId, credential:seats[side], operationKey:'bombard-r'+revision, ...action });
    if (preview) assert.deepEqual(commit.preview.core.action.sourceAction, preview.result.action);
  }
} catch (error) {
  await save(caseDir + '/stop-' + Date.now() + '.json', { revision, phase, message:error.message, frame:error.stack?.split('\n')[1] });
  throw error;
} finally { native.close(); }
