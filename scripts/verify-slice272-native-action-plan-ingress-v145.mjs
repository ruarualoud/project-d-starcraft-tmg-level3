import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { canonicalRosterStrategistToolRequestV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
const actual = JSON.parse(await fs.readFile(process.argv[2] + '/common-v142-native-query-capability.private.json', 'utf8'));
const candidate = actual.receipts[0].receipt.sourceReceipt.queryReceipt.result.formationOptions[0];
const raw = { branchIdRef: 'retained-branch', seatKey: 'player1',
  spec: { kind: 'native_action', lifecycleSteps: 0, phase: '', activeSideKey: '',
    placements: [], clearTerrain: false, isolateToPlacedPieces: false },
  argumentsJson: JSON.stringify({ domainId: candidate.domainId, parameters: candidate.canonicalParameters }),
  followUps: [{ kind: 'spatial', queryKind: 'mission_marker_control', argumentsJson: '{}' }] };
const projected = canonicalRosterStrategistToolRequestV1({ kind: 'scenario', toolRequest: raw });
assert.equal(projected.argumentsJson, raw.argumentsJson, 'Plan-stage scenario projection drops selected Native parameters');
assert.equal(projected.seatKey, raw.seatKey);
assert.equal(projected.branchIdRef, raw.branchIdRef);
assert.deepEqual(projected.spec, { kind: 'native_action' });
assert.deepEqual(projected.followUps, raw.followUps);
assert.equal(JSON.parse(projected.argumentsJson).parameters.placements.length, 8);
console.log(JSON.stringify({ status: 'PASS', nativeParametersPreserved: true,
  phasePlaceholdersRemoved: true, providerCalls: 0, nativeExecutions: 0, roomActions: 0 }));
