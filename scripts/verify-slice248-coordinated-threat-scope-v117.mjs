import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectStarcraftTmgFormationThreatClaimsV1 } from '../packages/online-agent-session/live-flash-decision-port-v1.mjs';
const fixture = JSON.parse(readFileSync(process.argv[2], 'utf8'));
assert.equal(fixture.authority.stateRevision, 11);
const before = JSON.stringify(fixture);
const inspect = raw => inspectStarcraftTmgFormationThreatClaimsV1({ raw,
  selection: raw.selection, option: fixture.selectedOption,
  queryReceipts: fixture.queryReceipts, spatialObservation: fixture.spatialObservation });
const actual = inspect(fixture.raw);
assert.equal(actual.contradicted, false,
  'actual paid speech acknowledges Goliath future threat and denies only Marine; it must not deny Goliath');
const statements = [
  ["The Marine has no fire band against this position.", false],
  ["The Goliath has no fire band against this position.", true],
  ["The Goliath and Marine have no fire bands against this position.", true],
  ["The Marine has no fire band, and all enemy fire bands are absent.", true],
  ["The Marine is present, but there are no enemy fire bands against this position.", true],
];
for (const [speech, contradicted] of statements) {
  assert.equal(inspect({ speech }).contradicted, contradicted, speech);
}
assert.equal(JSON.stringify(fixture), before, 'do not rewrite paid output or threat evidence');
console.log(JSON.stringify({ status: 'PASS', originalPaidReplyAcceptedByThreatChecker: true,
  namedAttackerAndCoordinatedClauseScope: true, actualThreatDenialsStillBlocked: true,
  fullDecisionOrMarkerClaimsProven: false, providerCalls: 0, roomActions: 0 }));
