import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { reconcileRosterFinalPlanReviewV1, effectiveRosterFinalPlanReviewFindingsV1 }
  from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
const raw = JSON.parse(await readFile(arg('input'), 'utf8'));
const original = JSON.stringify(raw), plan = JSON.parse(raw.planSerialized);
const paid = raw.publicOutputs.findLast(o => o.roundKind === 'final_review_reconciliation').sanitizedOutput;
let calls = 0, report;
try {
  const qualified = await reconcileRosterFinalPlanReviewV1({ plan, review: raw.planReview.review,
    sessionId: raw.sessionId, toolReceipts: raw.toolReceipts,
    selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput),
    armyAudit: raw.working?.verdict?.audit || raw.lockedRoster?.lock?.verdict?.audit,
    deliberation: { deliberate: async request => {
      calls += 1;
      const output = structuredClone(paid);
      if (calls > 1) {
        const feedback = request.promptNodes.find(n => n.kind === 'reconciliation-binding-feedback');
        assert(!feedback.issues.some(i => i.code === 'SOURCE_EVIDENCE_NOT_BOUND'),
          'canonical boolean/numeric Rules premises are valid evidence, not invented quotations');
        output.judgments.find(j => j.findingIndex === 28).factChecks.splice(1, 1);
        output.judgments.find(j => j.findingIndex === 31).claimAssessment = 'source_contradicted';
        output.judgments.find(j => j.findingIndex === 31).evidenceScope = 'settled_fact';
      }
      return { output };
    } } });
  const effective = effectiveRosterFinalPlanReviewFindingsV1({ plan, review: qualified });
  for (const i of [27, 28, 31]) assert.equal(effective[i].severity, 'high', 'real wrong scoring stays blocking');
  assert.equal(effective[0].severity, 'medium', 'UNKNOWN formation is not a proof of impossibility');
  assert.equal(calls, 2);
  assert.equal(JSON.stringify(raw), original);
  report = { ok: true, scalarSourceEvidenceRecovered: true, wrongScoringInConditionalBranchStillBlocks: true,
    qualificationCalls: calls, providerCalls: 0, originalWrites: 0 };
  console.log('SCALAR_EVIDENCE_RECOVERY_OK');
} catch (error) { report = { ok: false, failure: error.message, calls, providerCalls: 0 }; throw error; }
finally { await writeFile(arg('report'), JSON.stringify(report, null, 2), { mode: 0o600 }); }
