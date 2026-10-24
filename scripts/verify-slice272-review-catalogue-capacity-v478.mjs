import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import * as review from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { encodeRosterProviderInputV1 } from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';

const request = JSON.parse(gunzipSync(await fs.readFile(process.argv[2])));
const index = request.promptNodes.findIndex(n => n.kind === 'shared-rules-fact-catalogue');
assert.ok(index >= 0);
const original = request.promptNodes[index];
const transport = review.compileRosterReviewCatalogueV1?.(original);
const projected = structuredClone(request);
projected.promptNodes[index] = transport?.node || original;
const before = encodeRosterProviderInputV1(request).afterCharacters;
const after = encodeRosterProviderInputV1(projected).afterCharacters;
assert.ok(after < before / 2, `Actual rejected catalogue remains oversized: ${after}/${before}`);
assert.deepEqual(transport.restore(), original, 'Every original fact/path/value/scope must round-trip');
const ids = transport.entries;
assert.equal(new Set(ids.map(r => r.alias)).size, original.texts.length + original.numbers.length);
const wire = { judgments: [{ sourceEvidence: ids.filter(r => r.kind === 'text').map(r => ({evidenceId:r.alias})),
  counterEvidence: [{evidenceId:'claim:untouched'}],
  factChecks: ids.filter(r => r.kind === 'number').map(r => ({factId:r.alias,
    calculation:{operation:'identity',factIds:[r.alias]},claimedValue:String(r.original.value)})) }] };
const decoded = transport.decodeOutput(wire);
assert.deepEqual(decoded.judgments[0].sourceEvidence, original.texts.map(r => ({evidenceId:r.evidenceId})));
assert.deepEqual(decoded.judgments[0].factChecks.map(r => r.factId), original.numbers.map(r => r.factId));
assert.deepEqual(decoded.judgments[0].factChecks.map(r => r.calculation.factIds[0]), original.numbers.map(r => r.factId));
assert.deepEqual(decoded.judgments[0].counterEvidence, wire.judgments[0].counterEvidence);
assert.equal(wire.judgments[0].sourceEvidence[0].evidenceId, ids.find(r => r.kind==='text').alias);
const invalid = {judgments:[{sourceEvidence:[{evidenceId:'e99999999'}],factChecks:[{factId:'n99999999'}]}]};
assert.deepEqual(transport.decodeOutput(invalid),invalid,'Unknown aliases must remain invalid, not guessed');
assert.deepEqual(transport.decodeOutput(decoded), decoded, 'Canonical historical IDs remain usable');
console.log(JSON.stringify({pass:true,beforeCharacters:before,afterCharacters:after,
  reduction:1-after/before,textFacts:original.texts.length,numericFacts:original.numbers.length,
  providerCalls:0,originalWrites:0,semanticsChanged:false}));
