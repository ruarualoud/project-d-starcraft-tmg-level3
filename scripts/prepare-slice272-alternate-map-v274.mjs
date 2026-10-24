// Prepare E from the accepted Daybreak source and exercise today's shared
// planning/battle map query adapters. Never launch a game or buy a model call.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { pathToFileURL } from 'node:url';
import { createOfficialCompetitiveMapSemanticGeometryBindingV1 } from
  '../packages/product-composition/official-competitive-map-semantic-geometry-v1.mjs';
import { SEMANTIC_ROOM_OVERLAY_EXACT_GATE_CELLS_V2 } from
  '../packages/product-composition/official-competitive-map-semantic-room-freeze-v1.mjs';
import { createOfficialStandardRoomInitialStateAuthorityV1 } from
  '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { createPregameMapEvidencePortV1 } from '../packages/roster-strategist/pregame-map-evidence-port-v1.mjs';
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from './support/official-development-tranche-source-lock-fixture-v1.mjs';

const [base, mapTree, mode] = process.argv.slice(2);
if (!base || !mapTree) throw Error('BASE_AND_MAP_WORKTREE_REQUIRED');
assert.ok(!mode || mode === '--resume-query-contract');
const directory = path.join(base, 'roster-plan-matrix-v274');
await fs.mkdir(directory, { recursive: true, mode: 0o700 });
const report = { schema: 'roster_plan_alternate_map_preparation_v274', providerCalls: 0,
  gamesStarted: 0, routeChecks: [], liveActionReplayed: false };
const previous = mode ? JSON.parse(await fs.readFile(path.join(directory,
  'E-map-preparation-report.json'), 'utf8')) : null;
let exitCode = 0;
try {
  const priorDirectory = path.join(mapTree, 'build/ticket-24-daybreak-forward-inner-stairs-signed-room-v6-9');
  const prior = JSON.parse(await fs.readFile(path.join(priorDirectory, 'acceptance-report.json'), 'utf8'));
  const ramp = JSON.parse(await fs.readFile(path.join(priorDirectory, 'same-room-ramp-resume-evidence.json'), 'utf8'));
  const sourceFile = path.resolve(mapTree, prior.sourceBindingModule);
  assert.ok(sourceFile.startsWith(path.resolve(mapTree) + path.sep));
  const raw = (await import(pathToFileURL(sourceFile).href)).DAYBREAK_TASK_SEMANTIC_GEOMETRY_V9;
  const binding = createOfficialCompetitiveMapSemanticGeometryBindingV1(raw);
  assert.equal(binding.bindingHash, prior.maps[0].bindingHash);
  assert.equal(ramp.bindingHash, binding.bindingHash);
  assert.equal(ramp.replayMatchesCurrent, true);
  report.priorNativeRampEvidence = { file: path.join(priorDirectory, 'same-room-ramp-resume-evidence.json'),
    bindingHash: ramp.bindingHash, stateRevision: ramp.stateRevision,
    replayMatchesCurrent: true, newActionsApplied: ramp.newActionsApplied };
  const mapConfiguration = { seedId: binding.seedId, semanticTerrain: {
    binding: raw, bindingHash: binding.bindingHash,
    overlayCompilerVersion: SEMANTIC_ROOM_OVERLAY_EXACT_GATE_CELLS_V2 } };
  const cfg = JSON.parse(await fs.readFile(path.join(base, 'common-v79-plan-recovery-config.private.json'), 'utf8'));
  const baseline = JSON.parse(await fs.readFile(cfg.mapConfigurationFile, 'utf8'));
  const classes = map => map.semanticTerrain.binding.regions.reduce((counts, region) => {
    counts[region.semanticClass] = (counts[region.semanticClass] || 0) + 1; return counts;
  }, {});
  assert.notEqual(mapConfiguration.seedId, baseline.seedId);
  assert.notDeepEqual(classes(mapConfiguration), classes(baseline));
  report.topologyDifference = { baseline: classes(baseline), alternate: classes(mapConfiguration) };
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: cfg.fixtureRoot });
  const roomId = 's272-matrix-E-read-only-map-source';
  const factory = createOfficialStandardRoomInitialStateAuthorityV1({
    dataset: source.dataset, snapshot: source.snapshot, mapConfiguration, roomId,
    serverSeatPlan: ['player1', 'player2'].map(seatKey => ({ label: seatKey, seatKey,
      roleMode: 'supervisor', principalType: 'human' })),
  });
  const state = factory.state;
  const stateHash = hash(state);
  const port = createPregameMapEvidencePortV1({ sourceState: state });
  const summary = port.summarizeMap({ queryId: 'matrix-E-source' });
  assert.equal(summary.resultStatus, 'certified_map_summary');
  report.mapBinding = summary.mapBinding;
  if (previous) {
    assert.deepEqual(report.mapBinding, previous.mapBinding,
      'Retained route results may only be reused for the identical frozen source');
    report.routeChecks = previous.routeChecks;
    report.retainedPreviouslyPassedRouteChecks = previous.routeChecks.length;
    report.previousFailure = previous.error;
  }
  const authority = { roomId, matchBindingHash: 'a'.repeat(64), stateRevision: 0,
    stateHash, legalSpaceHash: 'b'.repeat(64), seatKey: 'player1' };
  const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
    seatKey: 'player1', roomStore: { async loadRoom() { return { stateRevision: 0,
      envelope: { matchBindingHash: authority.matchBindingHash, stateHash, state } }; } },
    rulesRuntime: { instantiate() { throw Error('NO_ACTION_EXECUTION_AUTHORIZED'); } },
  });
  const audit = state.officialCompetitiveMapRoomFreeze.missionSpatialReachabilityAudit;
  for (const sideId of audit.sideIds) for (const baseId of audit.baseProfileIds) {
    for (const targetId of audit.targetIds) {
      if (report.routeChecks.some(row => row.sideId === sideId
        && row.baseId === baseId && row.targetId === targetId)) continue;
      const request = { sideId, baseId, targetId };
      const planning = port.routeToObjective({ ...request, queryId: 'matrix-E-route' });
      const battle = await adapter.query({ authority, queryKind: 'map.route_access', arguments: request });
      const certified = planning.resultStatus === 'certified_reachability_audit';
      // ok means the request was handled, not that its route was proved.
      // Native's explicit precision/result fields carry the evidence status.
      assert.equal(battle.ok, true, `${sideId}/${baseId}/${targetId}`);
      assert.equal(battle.precision !== 'unknown', certified, `${sideId}/${baseId}/${targetId}`);
      if (certified) {
        assert.equal(battle.result.mapBinding.compilationHash, planning.mapBinding.compilationHash);
        assert.deepEqual(battle.result.witness, planning.witness);
        assert.equal(battle.result.exactMoveOrDeploymentLegality, false);
      } else assert.equal(battle.reason, planning.unknownReason);
      report.routeChecks.push({ ...request, certified, reason: planning.unknownReason,
        reachable: planning.reachable, unreachabilityProven: planning.unreachabilityProven,
        witness: planning.witness, exactMoveOrDeploymentLegality: false });
    }
  }
  assert.equal(hash(state), stateHash);
  report.status = 'current_native_planning_and_battle_map_queries_aligned';
  report.limit = 'Frozen base route witnesses are not current formation/move/arrival/control proofs; missing witnesses remain explicit.';
  await fs.writeFile(path.join(directory, 'E-map-configuration.json'), JSON.stringify(mapConfiguration), { flag: 'wx', mode: 0o600 });
} catch (error) { report.status = 'blocked'; report.error = String(error.stack || error); exitCode = 1; }
await fs.writeFile(path.join(directory, mode ? 'E-map-preparation-report-v2.json'
  : 'E-map-preparation-report.json'), JSON.stringify(report, null, 2), { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify({ status: report.status, routeChecks: report.routeChecks.length,
  error: report.error?.slice(0,1600), providerCalls: 0, gamesStarted: 0 }));
setImmediate(() => process.exit(exitCode));
