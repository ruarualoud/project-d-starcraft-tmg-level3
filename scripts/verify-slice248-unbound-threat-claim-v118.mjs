import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { inspectStarcraftTmgFormationThreatClaimsV1 } from '../packages/online-agent-session/live-flash-decision-port-v1.mjs';

const fixture = JSON.parse(readFileSync(process.argv[2], 'utf8'));
assert.equal(fixture.authority.stateRevision, 157);
const before = JSON.stringify(fixture);
const inspect = raw => inspectStarcraftTmgFormationThreatClaimsV1({ raw,
  queryReceipts: fixture.queryReceipts,
  spatialObservation: fixture.spatialObservation });
const actual = inspect(fixture.raw);
assert.equal(actual.contradicted, false,
  'the actual paid Marine decision acknowledges Goliath danger; an unbound calculation must not assert whole-army safety');
assert.ok(actual.advisoryFindings.some(x =>
  x.reasonCode === 'threat_claim_target_scope_unresolved'
  && x.text.startsWith('Combat Shield:') && x.blocksApply === false));
const statements = [
  ['player1-goliath-1 is outside current-round threat bands.', true],
  ['All friendly units are outside current-round threat bands.', true],
  ['player1-marine-2 is outside current-round stationary fire bands.', false],
];
for (const [text, expected] of statements) {
  assert.equal(inspect({ publicPlanSummary: { calculations: [text] } })
    .contradicted, expected, text);
}
const unknown = inspect({ publicPlanSummary: {
  calculations: ['Outside current-round threat bands.'] } });
assert.equal(unknown.contradicted, false);
assert.ok(unknown.advisoryFindings.some(x =>
  x.reasonCode === 'threat_claim_target_scope_unresolved'));
assert.equal(JSON.stringify(fixture), before);
console.log(JSON.stringify({ status: 'PASS', exactPaidReplyThreatCheck: true,
  unboundClaimNotCertified: true, namedAndWholeSideContradictionsStillBlock: true,
  providerCalls: 0, roomActions: 0, fullDecisionOrStrategyProven: false }));
