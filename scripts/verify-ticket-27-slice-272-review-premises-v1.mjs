import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { reconcileRosterFinalPlanReviewV1, effectiveRosterFinalPlanReviewFindingsV1 }
  from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { rosterSelectionUnitRulesV1 } from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 }
  from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import { rosterReviewPremiseIssuesV1 }
  from '../packages/roster-strategist/roster-review-premises-v1.mjs';
const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
const raw = JSON.parse(await readFile(arg('input'), 'utf8'));
const original = JSON.stringify(raw);
const plan = JSON.parse(raw.planSerialized);
const paid = raw.publicOutputs.findLast(o => o.roundKind === 'final_review_reconciliation').sanitizedOutput;
assert.match(paid.judgments.find(j => j.findingIndex === 18).publicReason, /pair is 1 VP/);
const { reviewHash, reviewAdjudication, ...body } = raw.planReview.review;
// Minimise to the two real failures, preserving their indices and literal text.
body.findings = body.findings.map((f, i) => [18, 89].includes(i) ? f : { ...f, severity: 'medium' });
const review = { ...body, reviewHash: hashStarcraftTmgContract(body) };
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: arg('fixture') });
let calls = 0, report;
try {
  const qualified = await reconcileRosterFinalPlanReviewV1({ plan, review,
    sessionId: raw.sessionId, toolReceipts: raw.toolReceipts,
    selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput),
    selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
    selectionJustificationPolicyVersion: raw.agentSelectedStrategySource.selectionJustificationPolicyVersion,
    armyAudit: raw.working.verdict.audit,
    deliberation: { deliberate: async request => {
      if (request.roundKind === 'final_review_reconciliation_consistency') return {
        output: { schemaVersion: 'starcraft_tmg_roster_review_consistency_v1', roundKind: request.roundKind,
          checks: [18, 89].map(findingIndex => ({ findingIndex, consistent: true,
            suggestedClaimAssessment: 'source_contradicted', publicReason: 'Same erroneous premise.' })) } };
      calls += 1;
      const output = structuredClone(paid);
      output.judgments = output.judgments.filter(j => [18, 89].includes(j.findingIndex));
      if (request.responseFormat.schema.properties.judgments.items.properties.factChecks) {
        for (const j of output.judgments) Object.assign(j, { factChecks: [], sourceEvidence: [],
          evidenceScope: 'conditional_forecast' });
        const numeric = output.judgments.find(j => j.findingIndex === 18);
        numeric.evidenceScope = 'settled_fact';
        numeric.factChecks = [{ factId: 'marker-group:player2:player2:2,4',
          claimedValue: '2', claimValueQuote: '2 VP/round' }];
        if (calls > 1) {
          const feedback = request.promptNodes.find(n => n.kind === 'reconciliation-binding-feedback');
          assert(feedback.issues.some(i => i.code === 'FACT_ASSESSMENT_CONFLICT' && i.findingIndex === 18));
          assert(feedback.issues.some(i => i.code === 'EXACT_GEOMETRY_PROOF_REQUIRED' && i.findingIndex === 89));
          numeric.claimAssessment = 'source_supported';
          numeric.publicReason = 'Rules marker pair total is 2 VP; the literal value agrees.';
          output.judgments.find(j => j.findingIndex === 89).claimAssessment = 'conditional_or_uncertain';
          output.judgments.find(j => j.findingIndex === 89).publicReason = 'No exact centre firing position was queried.';
        }
      }
      return { output };
    } } });
  const effective = effectiveRosterFinalPlanReviewFindingsV1({ plan, review: qualified });
  assert.equal(effective[18].severity, 'medium', 'correct 1+1=2 must not become a corrective High');
  assert.equal(effective[89].severity, 'medium', 'entry-edge distance cannot disprove a centre hypothesis');
  assert.equal(calls, 2, 'one typed feedback turn, no additional free-text judge');
  assert.equal(JSON.stringify(raw), original);
  assert.deepEqual(qualified.findings, review.findings);
  // The paid v6 correction introduced a REAL 1VP assertion. It must still
  // produce a contradiction; recovery is not an unconditional High downgrade.
  const badLiteral = { findingIndex: 18, category: 'scoring', claimQuote: 'farm of 1 VP/round' };
  const actualWrongValue = { findingIndex: 18, claimAssessment: 'source_supported',
    evidenceScope: 'settled_fact', sourceEvidence: [], factChecks: [{
      factId: 'marker-group:player2:player2:2,4', claimedValue: '1', claimValueQuote: '1 VP/round' }] };
  const facts = qualified.reviewAdjudication.reconciliation.premiseFacts;
  assert(rosterReviewPremiseIssuesV1({ output: { judgments: [actualWrongValue] },
    targets: [badLiteral], facts }).some(i => i.code === 'FACT_ASSESSMENT_CONFLICT'
      && i.suggestedClaimAssessment === 'source_contradicted'));
  actualWrongValue.claimAssessment = 'source_contradicted';
  assert.deepEqual(rosterReviewPremiseIssuesV1({ output: { judgments: [actualWrongValue] },
    targets: [badLiteral], facts }), []);
  const forged = structuredClone(qualified);
  forged.reviewAdjudication.reconciliation.judgments.find(j => j.findingIndex === 18).claimAssessment = 'source_contradicted';
  const { reviewHash: _, ...forgedBody } = forged;
  forged.reviewHash = hashStarcraftTmgContract(forgedBody);
  assert.throws(() => effectiveRosterFinalPlanReviewFindingsV1({ plan, review: forged }),
    /ROSTER_FINAL_REVIEW_ADJUDICATION_INVALID/);
  report = { ok: true, actualArithmeticAndGeometryFailuresRecovered: true,
    realWrongValueRemainsBlocking: true, admissionUsesSamePremiseChecks: true,
    qualificationCalls: calls, extraModelJudgeCalls: 0, realProviderCalls: 0,
    originalWrites: 0, paidDraftUnchanged: true };
  console.log('REVIEW_PREMISE_RECOVERY_OK');
} catch (error) {
  report = { ok: false, failure: error.message, calls, realProviderCalls: 0, originalWrites: 0 };
  throw error;
} finally { await writeFile(arg('report'), JSON.stringify(report, null, 2), { mode: 0o600 }); }
