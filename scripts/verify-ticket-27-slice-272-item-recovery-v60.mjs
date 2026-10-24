import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { reconcileRosterFinalPlanReviewV1, effectiveRosterFinalPlanReviewFindingsV1,
  verifyRosterFinalPlanReviewAdjudicationV1 } from '../packages/roster-strategist/roster-final-plan-review-v1.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { rosterSelectionUnitRulesV1 } from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 }
  from './support/official-development-tranche-source-lock-fixture-v1.mjs';
const arg = name => process.argv.find(s => s.startsWith(`--${name}=`))?.slice(name.length + 3);
const raw = JSON.parse(await readFile(arg('input'), 'utf8'));
const original = JSON.stringify(raw), plan = JSON.parse(raw.planSerialized);
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: arg('fixture') });
const paid = raw.publicOutputs.findLast(o => o.roundKind === 'final_review_reconciliation');
const input = { plan, review: raw.planReview.review, sessionId: raw.sessionId,
  toolReceipts: raw.toolReceipts, selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
  selectionJustificationPolicyVersion: raw.agentSelectedStrategySource?.selectionJustificationPolicyVersion,
  selectedCandidateInputHash: hashStarcraftTmgContract(raw.selectedCandidateInput),
  armyAudit: raw.working?.verdict?.audit || raw.lockedRoster?.lock?.verdict?.audit };
let calls = 0, report;
try {
  const qualified = await reconcileRosterFinalPlanReviewV1({ ...input,
    retainedOutputs: raw.publicOutputs,
    deliberation: { deliberate: async () => { calls += 1; return { output: structuredClone(paid.sanitizedOutput) }; } } });
  const effective = effectiveRosterFinalPlanReviewFindingsV1({ plan, review: qualified });
  assert.equal(calls, 0, 'import the context-bound paid candidate without another production-shaped audit');
  assert.deepEqual(qualified.reviewAdjudication.reconciliation.unresolvedJudgments.map(j => j.findingIndex), [17, 20]);
  for (const i of [1, 17, 20]) assert.equal(effective[i].severity, 'high');
  for (const i of [6, 77, 89, 90]) assert.equal(effective[i].severity, 'medium');
  assert.equal(verifyRosterFinalPlanReviewAdjudicationV1({ plan, review: qualified }).unresolvedHighCount, 3);
  const forged = structuredClone(qualified);
  forged.reviewAdjudication.decisions.push({ findingIndex: 17,
    findingHash: hashStarcraftTmgContract(raw.planReview.review.findings[17]),
    effectiveSeverity: 'medium', publicReason: 'unsupported forced dismissal',
    counterEvidence: structuredClone(forged.reviewAdjudication.decisions[0].counterEvidence) });
  const { reviewHash: oldHash, ...forgedBody } = forged;
  forged.reviewHash = hashStarcraftTmgContract(forgedBody);
  assert.throws(() => verifyRosterFinalPlanReviewAdjudicationV1({ plan, review: forged }),
    /ADJUDICATION_INVALID/, 'unresolved evidence cannot dismiss a real High');
  let saved = null;
  await assert.rejects(reconcileRosterFinalPlanReviewV1({ ...input,
    onCheckpoint: async state => { saved = state; },
    deliberation: { deliberate: async () => { throw new Error('CONCRETE_PROVIDER_STOP'); } } }),
    error => error.message === 'CONCRETE_PROVIDER_STOP'
      && Array.isArray(error.reconciliationAttempts) && error.recoveryCheckpoint?.sourceReviewHash === input.review.reviewHash);
  assert.equal(saved?.status, 'interrupted');
  assert.equal(JSON.stringify(raw), original);
  report = { ok: true, paidCandidateImported: true, noNewQualificationCalls: calls === 0,
    perItemProgressPreserved: true, realHighStillBlocks: true, exceptionCheckpointPreserved: true,
    providerCalls: 0, roomWrites: 0, actualModelRepairProven: false };
  console.log('ITEM_RECOVERY_OK');
} catch (error) { report = { ok: false, failure: error.message, calls, providerCalls: 0 }; throw error; }
finally { await writeFile(arg('report'), JSON.stringify(report, null, 2), { mode: 0o600 }); }
