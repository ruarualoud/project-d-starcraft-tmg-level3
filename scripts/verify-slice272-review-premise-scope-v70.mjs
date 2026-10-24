// Concrete D-v4 failure: unrelated surrounding numeric/boolean checks veto
// a correctly bound literal allegation. Replay the saved paid wire response.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { rosterReviewPremiseIssuesV1 } from '../packages/roster-strategist/roster-review-premises-v1.mjs';

const draft = JSON.parse(await fs.readFile(process.argv[2], 'utf8'));
const review = draft.planReview.review;
const saved = review.reviewAdjudication.reconciliation;
const attempt = saved.attempts.find(a => a.providerAttempt && a.wireOutputHash);
const paid = draft.publicOutputs.find(o => o.contextHash === attempt.contextHash
  && hash(o.sanitizedOutput) === attempt.wireOutputHash);
assert(paid, 'exact retained paid output is required');
const facts = saved.premiseFacts;
const catalogue = new Map(facts.texts.map(f => [`fact:${hash(f).slice(0, 24)}`, f]));
const output = structuredClone(paid.sanitizedOutput);
for (const judgment of output.judgments) judgment.sourceEvidence = judgment.sourceEvidence.map(e => {
  const fact = catalogue.get(e.evidenceId);
  assert(fact, 'the actual delivered evidence ID must resolve');
  return { sourcePath: fact.sourcePath, sourceQuote: fact.text };
});
const targets = output.judgments.map(j => ({ ...review.findings[j.findingIndex],
  findingIndex: j.findingIndex, claimText: saved.unresolvedJudgments.find(u => u.findingIndex === j.findingIndex)
    ?.bindingIssues.find(issue => issue.availableClaimText)?.availableClaimText }));
const issues = rosterReviewPremiseIssuesV1({ output, targets, facts });
assert.deepEqual(issues, [], 'the two literal 3-VP assertions have actual bound facts; context-only checks must not veto them');

// The same scoped seam must still reject a contradictory source and an
// unbound number IN the allegation. No new broad test suite is involved.
const contradictedFacts = structuredClone(facts);
contradictedFacts.numbers.find(f => f.factId === 'missionMarkerScoringByActor.markers.1.relativeVpSwingOnControlTransfer').value = 4;
assert(rosterReviewPremiseIssuesV1({ output, targets, facts: contradictedFacts })
  .some(i => i.code === 'FACT_ASSESSMENT_CONFLICT'));
const missingFacts = structuredClone(facts);
missingFacts.numbers = missingFacts.numbers.filter(f => f.factId !== 'missionMarkerScoringByActor.markers.1.relativeVpSwingOnControlTransfer');
assert(rosterReviewPremiseIssuesV1({ output, targets, facts: missingFacts })
  .some(i => i.code === 'FACT_PREMISE_NOT_BOUND'));
console.log(JSON.stringify({ status: 'PASS', actualPaidJudgmentsRecovered: output.judgments.length,
  contradictorySourceStillRejected: true, missingClaimFactStillRejected: true, providerCalls: 0 }));
