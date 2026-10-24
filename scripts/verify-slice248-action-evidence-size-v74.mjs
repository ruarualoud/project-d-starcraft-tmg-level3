// Reproduce A r129's saved oversized Action request. No room or Provider call.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { compactQueryReceiptForPrompt } from '../packages/online-agent-session/live-flash-decision-port-v1.mjs';
import * as projection from '../packages/online-agent-session/spatial-query-prompt-projection-v1.mjs';
import { decodeStarcraftTmgGeometryColumnReuseV2 } from '../packages/online-agent-session/exact-geometry-column-reuse-v2.mjs';

const fixture = JSON.parse(gunzipSync(await readFile(process.argv[2])).toString());
const before = JSON.stringify(fixture.queryReceipts);
const projected = projection.deduplicateStarcraftTmgSpatialPromptReceiptsV1(
  fixture.queryReceipts.map(compactQueryReceiptForPrompt));
const bytes = Buffer.byteLength(JSON.stringify(projected));
assert.ok(bytes <= fixture.baselineQueryBytes * 0.6,
  `Saved Action evidence still oversized: ${bytes}/${fixture.baselineQueryBytes} bytes`);

function restore(value) {
  if (!value || typeof value !== 'object') return value;
  if (value.encoding === 'exact_evidence_record_rows_v1') {
    return restore(projection.restoreStarcraftTmgIncomingFireRecordsForPromptV1(value));
  }
  if (['exact_geometry_columns_v1', 'exact_geometry_column_reuse_v2'].includes(value.encoding)) {
    return restore(decodeStarcraftTmgGeometryColumnReuseV2(value));
  }
  return Array.isArray(value) ? value.map(restore)
    : Object.fromEntries(Object.entries(value).map(([key, child]) => [key, restore(child)]));
}

let checked = 0;
for (const original of fixture.queryReceipts.filter(r => r.result?.formationOptions)) {
  const view = projected.find(r => r.queryReceiptHash === original.queryReceiptHash);
  const options = projection.restoreStarcraftTmgFormationFireFactsForPromptV1(
    view.result.formationOptions, view.result.sharedIncomingFireFacts);
  assert.deepEqual(options.map(o => o.formationOptionId),
    original.result.formationOptions.map(o => o.formationOptionId));
  for (let i = 0; i < options.length; i++) {
    for (const field of ['incomingStationaryFireEstimate', 'incomingMoveThenFireEstimate']) {
      assert.deepEqual(restore(options[i].relationshipComparison[field]),
        original.result.formationOptions[i].relationshipComparison[field]);
      checked++;
    }
  }
}
assert.equal(JSON.stringify(fixture.queryReceipts), before);
console.log(JSON.stringify({ok:true,sourceRevision:fixture.sourceRevision,
  baselineQueryBytes:fixture.baselineQueryBytes,queryBytes:bytes,
  byteReduction:1-bytes/fixture.baselineQueryBytes,exactFireTreesChecked:checked,
  originalReceiptsUnchanged:true,providerCalls:0,roomActions:0}));
