import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { reconcileRosterFinalPlanReviewV1, effectiveRosterFinalPlanReviewFindingsV1 }
  from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { rosterSelectionUnitRulesV1 } from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 }
  from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
const raw = JSON.parse(await readFile(arg('input'), 'utf8'));
const original = JSON.stringify(raw), plan = JSON.parse(raw.planSerialized);
const paid = raw.publicOutputs.findLast(o => o.roundKind === 'final_review_reconciliation').sanitizedOutput;
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: arg('fixture') });
let calls = 0, report;
try {
  const qualified = await reconcileRosterFinalPlanReviewV1({ plan, review: raw.planReview.review,
    sessionId: raw.sessionId, toolReceipts: raw.toolReceipts,
    selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
    selectionJustificationPolicyVersion: raw.agentSelectedStrategySource?.selectionJustificationPolicyVersion,
    selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput),
    armyAudit: raw.working?.verdict?.audit || raw.lockedRoster?.lock?.verdict?.audit,
    deliberation: { deliberate: async request => {
      calls += 1;
      const output = structuredClone(paid);
      if (calls > 1) {
        const feedback = request.promptNodes.find(n => n.kind === 'reconciliation-binding-feedback');
        assert(feedback.issues.some(i => i.code === 'SCORING_LITERAL_NOT_CHECKED'),
          'a group sum cannot be supported by quoting a marker ID or a different numeric assertion');
        assert(!feedback.issues.some(i => i.code === 'SOURCE_EVIDENCE_NOT_BOUND'),
          'same-receipt projection alias should recover locally without model editing');
        for (const index of [17, 20]) {
          const judgment = output.judgments.find(j => j.findingIndex === index);
          judgment.claimAssessment = 'source_contradicted';
          judgment.factChecks = [{ factId: 'marker-group:player2:player2:2,4',
            claimedValue: '1', claimValueQuote: '1 VP/round' }];
        }
      }
      return { output };
    } } });
  const effective = effectiveRosterFinalPlanReviewFindingsV1({ plan, review: qualified });
  for (const i of [1, 17, 20]) assert.equal(effective[i].severity, 'high');
  assert.equal(effective[6].severity, 'medium');
  assert.equal(calls, 2);
  const recovery = qualified.reviewAdjudication.reconciliation.attempts[0].evidenceReferenceRecoveries;
  assert(recovery.some(r => r.from === 'citedReadOnlyQueryEvidence.1.projectionIsNotObservedScore'
    && r.to.startsWith('citedMathReceipts.') && r.receiptHash));
  assert.equal(JSON.stringify(raw), original);
  report = { ok: true, sameReceiptAliasRecovered: true, originalPaidOutputPreserved: true,
    wrongAggregateStillBlocks: true, qualificationCalls: calls, providerCalls: 0, roomWrites: 0 };
  console.log('PAID_EVIDENCE_RECOVERY_OK');
} catch (error) { report = { ok: false, failure: error.message, calls, providerCalls: 0 }; throw error; }
finally { await writeFile(arg('report'), JSON.stringify(report, null, 2), { mode: 0o600 }); }
