import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as framework from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const raw = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const state = (raw.value || raw).teachFramework.state;
const saved = state.replyCorrections.at(-1).correction.previousOutput;
assert.equal(saved.queries.length, 7);
const round = framework.bindInvestigationQueryIds(saved, [], 2, state.sourceHash);
assert.equal(round.output.queries.length, 7);
let good = 0, invalid = 0;
for (const query of round.output.queries) {
  const decoded = framework.decodeRosterTeachInvestigationQueryV1(query);
  if (decoded.error) {
    invalid++;
    assert.equal(decoded.error.code, 'ROSTER_TEACH_INVESTIGATION_QUERY_JSON_INVALID');
    assert.equal(decoded.request.toolRequest.unparsedToolRequestJson, query.toolRequestJson);
    assert.equal(query.queryId, 'q-opportunity-cost-supply-and-cp-builder');
  } else {
    good++;
    assert.deepEqual(decoded.request.toolRequest, JSON.parse(query.toolRequestJson));
  }
}
assert.equal(good, 6); assert.equal(invalid, 1);
assert.deepEqual(round.output, saved);
console.log(JSON.stringify({ pass: true, validSiblingsPreserved: good, isolatedMalformedQuery: invalid,
  originalPaidOutputUnchanged: true, providerCalls: 0, trainingTruth: false }));
