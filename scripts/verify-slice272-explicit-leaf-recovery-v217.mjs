// Actual A503 retry leaf and B interrupted revision. Stop at the real product
// factory boundary: no Provider, Native, source-draft writes or paid replay.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import * as profiles from '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
const [base, label] = process.argv.slice(2);
const reportPath = base + '/common-v217-explicit-recovery-' + label + '.private.json';
await (await fs.open(reportPath, 'wx', 0o600)).close();
const report = { checks: [], failures: [], providerCalls: 0, nativeCalls: 0, sourceWrites: 0 };
const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
for (const arm of ['A', 'B']) {
  try {
    const row = cfg.rows.find(r => r.arm === arm);
    const source = JSON.parse(await fs.readFile(row.dataDirectory + '/drafts/' + row.sessionId + '.json', 'utf8'));
    const plan = JSON.parse(source.planSerialized), failed = source.providerDispatches.at(-1);
    assert.equal(failed.status, arm === 'A' ? 'response_rejected' : 'ambiguous');
    const context = source.teachFramework.context;
    function workspace(consumed = false) {
      const d = { ...source, providerDispatches: structuredClone(source.providerDispatches.slice(-2)),
        dispatchRetryAuthorizations: structuredClone(source.dispatchRetryAuthorizations || []),
        publicOutputs: [], toolReceipts: source.toolReceipts, budgetBranchReceipts: [],
        planVersionHistory: [], planReviewHistory: [], claimRepairHistory: [],
        failedProviderOutputs: [], dispatchReconciliations: [],
        teachFramework: structuredClone(source.teachFramework),
        progress: { ...source.progress, rounds: [] }, usage: structuredClone(source.usage) };
      if (consumed) d.dispatchRetryAuthorizations.push({ requestId: failed.requestId, status: 'consumed' });
      let captured;
      const never = () => assert.fail('No Native operation permitted');
      const service = createRosterPlanningWorkspaceServiceV1({
        armyBuilderPort: { evaluateRosterCandidate: never, enumerateArmyBuildingChoices: () => ({ unitCandidates: [], vespeneLimitForBudget: { numerator: 0, denominator: 1 } }), listFactionChoices: never, listEngagementScales: never },
        laboratoryCore: { labDescriptor: () => ({}), proveMutationZero: never,
          missionScoringAuthority: () => ({ resultStatus: 'derivable', missionScoringProfile: { missionScoringProfileHash: plan.openingDeploymentSchedule.missionScoringProfileHash } }) },
        strategyPack: { foundational: { entries: [] }, receipt: { hash: 'a'.repeat(64) } },
        selectionUnitRules: context.sourceFacts.selectionUnitRules, fixture: context.fixture,
        draftStore: { loadAll: async () => ({ sessions: [d], quarantined: [] }), save: async () => {} },
        createRunLaboratory: () => ({}),
        createStrategist: () => ({ selectSkillRoute: () => ({ projections: context.skillGuidance, skillRefs: context.skillRefs }) }),
        deliberationFactory: { createForRun: async input => { captured = input; throw Error('PROBE_STOP_BEFORE_PROVIDER'); } },
      });
      return { d, service, captured: () => captured };
    }
    const request = { ...(arm === 'B' ? JSON.parse(await fs.readFile(base + '/B/v210-plan-revision-request.private.json', 'utf8')) : {}),
      expectedPlanHash: plan.planHash, expectedRequestId: failed.requestId,
      authorizeOneAdditionalDispatchRetry: true, automaticNetworkRecovery: false };
    const run = w => arm === 'A' ? w.service.teachPlanFramework(w.d.sessionId, request) : w.service.revisePlan(w.d.sessionId, request);
    const w = workspace(); await w.service.loadPersisted(); await run(w);
    for (let i = 0; !w.captured() && i < 100; i++) await new Promise(r => setTimeout(r, 5));
    assert.equal(w.captured()?.retryDispatch?.requestId, failed.requestId, arm + ' must forward the latest failed leaf, not its consumed ancestor or a new unbound request');
    assert.equal(w.captured().retryDispatch.explicitSingleRetry, true);
    assert.equal(w.captured().retryDispatch.contextHash, failed.contextHash);
    assert.equal(w.captured().retryDispatch.requestBodyHash, failed.requestBodyHash);
    assert.equal(w.captured().recoverNetworkDispatch, null);
    assert.equal(w.d.providerDispatches.length, 2);
    assert.deepEqual(w.d.providerDispatches, source.providerDispatches.slice(-2));
    assert.deepEqual(w.d.usage, source.usage); assert.equal(w.d.planSerialized, source.planSerialized);
    assert.equal(w.d.dispatchRetryAuthorizations.at(-1).maximumPhysicalRetries, 1);
    assert.equal(w.d.dispatchRetryAuthorizations.at(-1).status, 'authorized');
    const denied = workspace(true); await denied.service.loadPersisted(); await assert.rejects(run(denied));
    assert.equal(denied.captured(), undefined);
    report.checks.push(arm + '_exact_leaf_recovery_no_auto_retry_history_preserved_consumed_denied');
  } catch (error) { report.failures.push({ arm, message: error.message }); }
}
try {
  const v2 = profiles.STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V2;
  const v3 = profiles.STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V3;
  assert.equal(v2.timeoutMs, 240000); assert.equal(v3?.timeoutMs, 600000);
  for (const key of ['model', 'temperature', 'topP', 'contextBudget', 'outputBudget', 'retryPolicy']) assert.deepEqual(v3[key], v2[key]);
  const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{ providerProfile: v3, responsePath: '/responses' }] });
  const result = await registry.resolveEgressBinding({ profileRef: { id: v3.providerProfileId, version: v3.version, hash: v3.integrity.hash } });
  assert.equal(result.ok, true); assert.equal(result.egressBinding.timeoutMs, 600000);
  report.checks.push('opt_in_600s_reaches_binding_default_240s_and_model_unchanged');
} catch (error) { report.failures.push({ arm: 'profile', message: error.message }); }
report.ok = report.failures.length === 0;
await fs.writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report)); if (!report.ok) process.exitCode = 1;
