// Actual paid A147: a Marine-only clearance clause also accepts Goliath fire.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { gunzipSync } from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { inspectStarcraftTmgFormationThreatClaimsV1 } from '../packages/online-agent-session/live-flash-decision-port-v1.mjs';

const [directory, reportPath] = process.argv.slice(2);
assert(directory && reportPath);
assert(!path.resolve(reportPath).startsWith(path.resolve(directory) + path.sep));
const report = { schemaVersion: 'ticket23_A147_formation_contrast_scope_regression_v1',
  providerCalls: 0, roomWrites: 0, rulesApply: 0, geometryQueries: 0 };
try {
  const db = new DatabaseSync(path.join(directory, 'seats/player2/provider/live-decisions.sqlite'), { readOnly: true });
  let wrapper;
  try { wrapper = JSON.parse(db.prepare('SELECT record_json FROM sc_live_decision_records').get().record_json); }
  finally { db.close(); }
  const bytes = Buffer.from(wrapper.payload, 'base64'), header = bytes.subarray(0, 10), offsets = [];
  for (let i = bytes.indexOf(header); i >= 0; i = bytes.indexOf(header, i + 1)) offsets.push(i);
  const choice = Object.values(JSON.parse('{' + gunzipSync(
    bytes.subarray(offsets.at(-2), offsets.at(-1)), { maxOutputLength: 32 * 1024 * 1024 }).toString('utf8') + '}'))[0];
  assert.equal(choice.authority.stateRevision, 147);
  const raw = choice.attempts[choice.attemptKeys.at(-1)].safeOutput;
  const receipt = choice.queryReceipts.find(q => q.queryKind === 'space.solve_formation');
  assert.equal(receipt.authority.stateHash, choice.authority.stateHash);
  const option = receipt.result.formationOptions.find(o => o.formationOptionId === raw.selection.optionId);
  assert(option);
  const identities = choice.queryReceipts.find(q => q.queryKind === 'space.inspect_relationships'
    && q.result?.nodes?.units?.length);
  assert.equal(identities.authority.stateHash, choice.authority.stateHash);
  const spatialObservation = { units: identities.result.nodes.units.map(u =>
    ({ unitId: u.nodeId, unitName: u.unitName, sideRelation: u.sideRelation, sideKey: u.sideKey })) };
  const input = { raw, selection: raw.selection, option, spatialObservation,
    queryReceipts: choice.queryReceipts,
    plannerSelectedAction: { actionType: option.actionType, pieceId: option.pieceId } };
  const before = JSON.stringify(input);
  const original = inspectStarcraftTmgFormationThreatClaimsV1(input);
  Object.assign(report, { roomId: choice.authority.roomId, revision: 147,
    stateHash: choice.authority.stateHash, formationReceiptHash: receipt.queryReceiptHash,
    formationOptionId: option.formationOptionId, originalText: raw.selection.publicReason,
    fullOriginalInspection: original });
  assert.equal(original.contradictions.filter(c => c.field === 'formationSelection.publicReason').length, 0,
    'a Marine-only denial must not be contradicted by separately accepted Goliath fire');
  const isolated = reason => inspectStarcraftTmgFormationThreatClaimsV1({
    option, spatialObservation, raw: {}, selection: { publicReason: reason },
  });
  assert.equal(isolated('Outside every current-round Marine stationary fire band.').contradicted, false);
  assert.equal(isolated('Outside every current-round Marine stationary fire band, while accepting current-round Goliath stationary fire bands.').contradicted, false);
  assert.equal(isolated('Outside every current-round Goliath stationary fire band, while accepting Marine fire.').contradicted, true);
  assert.equal(isolated('Outside all current-round enemy stationary fire bands, including Marine.').contradicted, true);
  assert.equal(isolated('Outside every current-round Goliath stationary fire band.').contradicted, true);
  assert.equal(JSON.stringify(input), before);
  Object.assign(report, { ok: true, inputUnchanged: true,
    unrelatedOriginalFindingCount: original.contradictions.length,
    universalAndGoliathDenialsRemainRejected: true });
} catch (error) {
  Object.assign(report, { ok: false, error: { name: error.name, message: error.message } });
  process.exitCode = 1;
}
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
console.log(JSON.stringify(report));
