import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createStarcraftTmgSnapshotSceneQueryServiceV1 } from '../packages/online-agent-session/scene-query-service-v1.mjs';
import { createStarcraftTmgNativeSpatialQueryToolV1 } from '../packages/online-agent-session/spatial-action-query-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base, output] = process.argv.slice(2);
const report = { checks: [], providerCalls: 0, nativeActions: 0, sourceDraftWrites: 0 };
try {
  const d = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json', 'utf8'));
  const op = d.teachFramework.state.queryRecovery.operations.find(o => o.originalQueryId === 'query-r3-5af92593ef8720ed363eaabc');
  const args = JSON.parse(op.request.toolRequest.followUps.find(q => q.queryKind === 'mission_marker_control').argumentsJson);
  assert(args.subjectUnitIds?.length && args.targetIds?.length);
  const state = JSON.parse(await fs.readFile(base + '/query-contract-audit-v30/native-movement-fixture.private.json', 'utf8')).state;
  const before = hash(state);
  const service = createStarcraftTmgSnapshotSceneQueryServiceV1({ state, seatKey: 'player1',
    sceneScope: { kind: 'pregame_reference', sourceStateHash: before, baseStateHash: before },
    rulesRuntime: { enumerate: () => ({ candidates: [], parameterDomains: [], searchSuggestions: [] }),
      instantiate: () => { throw Error('NO_NATIVE_ACTION'); } } });
  const query = (id, value) => service.query({ requestId: id, queryKind: 'mission_marker_control', arguments: value });
  const bad = await query('captured-wrong-selectors', args);
  assert.equal(bad.status, 'unknown', 'Wrong control selector names must not silently execute a broad exact control query');
  assert.equal(bad.reason, 'MARKER_CONTROL_QUERY_ARGUMENTS_INVALID');
  assert.equal(bad.mayRepairSameChoice, true);
  assert.deepEqual([...bad.repairContext.unrecognizedFields].sort(), ['intent', 'subjectUnitIds', 'targetIds']);
  assert.equal(bad.repairContext.suggestionExecuted, false);
  assert.equal(bad.result, null);
  report.checks.push('actual_B_wrong_selector_request_returns_correctable_unknown_no_broad_answer');
  const marker = state.board.missionMarkers[0].id, unit = state.pieces[0].id;
  const correct = await query('native-filtered', { markerIds: [marker], unitIds: [unit] });
  assert.equal(correct.status, 'exact');
  assert.deepEqual(correct.result.markerResults.map(r => r.markerId), [marker]);
  assert.deepEqual(correct.result.focusedUnitIds, [unit]);
  assert.equal(correct.result.allCompetingUnitsIncluded, true);
  const all = await query('native-current-all', {});
  assert.equal(all.status, 'exact');
  assert.equal(all.result.markerResults.length, state.board.missionMarkers.length);
  assert.equal((await query('invalid-ref', { unitIds: ['not-a-unit'] })).status, 'unknown');
  assert.equal((await query('typo', { markerId: marker })).status, 'unknown');
  assert.equal(hash(state), before);
  const tool = createStarcraftTmgNativeSpatialQueryToolV1({ name: 'native', queryKinds: ['mission_marker_control'] });
  assert(tool.function.parameters.properties.argumentsJson.description.includes('unrecognized'));
  report.checks.push('native_filtered_and_all_control_remain_exact_competitors_retained_invalid_references_denied_shared_descriptor');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message; process.exitCode = 1; }
await fs.writeFile(output, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
