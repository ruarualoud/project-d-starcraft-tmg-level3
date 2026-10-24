// Actual B: a terminated response-header timeout needed an operator restart.
// Capture the real service recovery callback, exercise real secure factory and
// persistent dispatch barriers with a fake Worker. No original draft writes.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createRosterPlanningWorkspaceServiceV1 } from '../packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs';
import { createRosterPlanningSecureDeliberationFactoryV1 } from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
const [base, reportPath] = process.argv.slice(2);
const cfg = JSON.parse(await fs.readFile(base + '/common-v79-plan-recovery-config.private.json', 'utf8'));
const row = cfg.rows.find(r => r.arm === 'B');
const source = JSON.parse(await fs.readFile(row.dataDirectory + '/drafts/' + row.sessionId + '.json', 'utf8'));
const plan = JSON.parse(source.planSerialized), context = source.teachFramework.context;
const checks = []; let secure, captured, saved;
const d = { ...source, publicOutputs: [], providerDispatches: [], dispatchRetryAuthorizations: [],
  toolReceipts: [], failedProviderOutputs: [], budgetBranchReceipts: [], planVersionHistory: [],
  planReviewHistory: [], teachFrameworkHistory: [], claimRepairHistory: [], revisionTeachEvidenceHistory: [],
  autoPlanRepairHistory: [], dispatchReconciliations: [],
  teachFramework: { ...source.teachFramework, status: 'failed', state: {} },
  progress: { ...source.progress, rounds: [] }, usage: structuredClone(source.usage) };
const never = () => assert.fail('No Native/Provider allowed at service capture');
const service = createRosterPlanningWorkspaceServiceV1({
  armyBuilderPort: { evaluateRosterCandidate: never, listFactionChoices: never, listEngagementScales: never,
    enumerateArmyBuildingChoices: () => ({ unitCandidates: [], vespeneLimitForBudget: { numerator: 0, denominator: 1 } }) },
  laboratoryCore: { labDescriptor: () => ({}), proveMutationZero: never, missionScoringAuthority: never },
  strategyPack: { foundational: { entries: [] }, receipt: { hash: 'a'.repeat(64) } },
  selectionUnitRules: context.sourceFacts.selectionUnitRules, fixture: context.fixture,
  draftStore: { loadAll: async () => ({ sessions: [d], quarantined: [] }), save: async value => {
    saved = { dispatches: structuredClone(value.providerDispatches || []),
      authorizations: structuredClone(value.dispatchRetryAuthorizations || []) };
  } },
  createRunLaboratory: () => ({}),
  createStrategist: () => ({ selectSkillRoute: () => ({ projections: context.skillGuidance, skillRefs: context.skillRefs }) }),
  deliberationFactory: { createForRun: async input => { captured = input; throw Error('CAPTURE_ONLY_NO_TEACH_CALL'); } },
});
try {
  await service.loadPersisted();
  await service.teachPlanFramework(d.sessionId, { expectedPlanHash: plan.planHash, automaticNetworkRecovery: true });
  for (let i = 0; !captured && i < 100; i++) await new Promise(r => setTimeout(r, 5));
  assert.equal(typeof captured?.recoverNetworkDispatch, 'function', 'real product service must wire automatic network recovery');
  const sends = []; let failures = 1, failureCode = 'PROVIDER_TRANSPORT_FAILED';
  secure = await createRosterPlanningSecureDeliberationFactoryV1({
    profile: { providerProfileId: 'network-probe', version: '1', integrity: { hash: 'a'.repeat(64) }, provider: 'fake', model: 'fake' },
    readCredential: async () => ({ credentialBytes: Buffer.from('fake-only') }),
    createRegistry: () => ({ resolveEgressBinding: async () => ({ ok: true, egressBinding: {
      endpoint: { url: 'https://example.invalid/responses' }, model: 'fake', temperature: 0, topP: 1, maxOutputUnits: 1024 } }) }),
    createWorker: () => ({ attachCredential: async () => ({ ok: true, workerRef: 'fake' }), close: async () => {},
      async send(input) {
        const durable = saved.dispatches.find(x => x.requestId === input.requestId);
        assert.equal(durable?.status, 'sending', 'request durable BEFORE physical send');
        if (durable.retryOfRequestId) assert.equal(saved.authorizations.find(x =>
          x.authorizationId === durable.retryAuthorizationId)?.status, 'consumed');
        sends.push(input);
        if (failures-- > 0) throw Object.assign(new Error('fake timeout'), { safeReceipt: {
          code: failureCode, networkErrorCode: 'ETIMEDOUT', status: null,
          requestMayHaveBeenSent: true, requestDefinitelyNotSent: false, physicalAttempts: 1 } });
        return { status: 200, transportReceipt: { receiptHash: 'b'.repeat(64) }, payload: {
          status: 'completed', model: 'fake', usage: { input_tokens: 2, output_tokens: 1, total_tokens: 3 },
          output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: '{"ok":true}' }] }] } };
      } }),
  });
  const request = { roundKind: 'teach_framework_query_recovery', roundIndex: 1, contextHash: 'c'.repeat(64),
    promptPack: 'network-probe', promptNodes: [], userMessage: 'Same strategic question', responseContract: {},
    responseFormat: { kind: 'provider_strict_json_schema', schemaName: 'network_probe',
      outputContractRef: { id: 'probe', version: '1', hash: 'd'.repeat(64) },
      schema: { type: 'object', additionalProperties: false,
        properties: { ok: { type: 'boolean' } }, required: ['ok'] } } };
  const port = await secure.factory.createForRun(captured);
  await port.deliberate(request);
  assert.equal(sends.length, 2); assert.deepEqual(sends[0].body, sends[1].body);
  const original = d.providerDispatches[0], retry = d.providerDispatches[1];
  assert.equal(original.status, 'ambiguous'); assert.equal(original.costStatus, 'unknown');
  assert.equal(retry.retryOfRequestId, original.requestId); assert.equal(retry.status, 'completed');
  assert.equal(retry.contextHash, original.contextHash); assert.equal(retry.requestBodyHash, original.requestBodyHash);
  assert.equal(d.planSerialized, source.planSerialized);
  checks.push('same_product_request_recovers_without_scene_restart_unknown_fee_retained_authorization_consumed_before_send');
  failures = 2;
  await assert.rejects(port.deliberate({ ...request, contextHash: 'e'.repeat(64), userMessage: 'Second question' }),
    { code: 'ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP' });
  assert.equal(sends.length, 4); // No infinite retry ladder.
  checks.push('second_transport_failure_stops_after_one_authorized_unknown_cost_retry');
  failures = 1; failureCode = 'PROVIDER_RESPONSE_CONTRACT_REJECTED';
  await assert.rejects(port.deliberate({ ...request, contextHash: 'f'.repeat(64), userMessage: 'Schema issue not network' }));
  assert.equal(sends.length, 5);
  checks.push('format_failure_never_misclassified_as_network_retry');
  await fs.writeFile(reportPath, JSON.stringify({ ok: true, checks, simulatedSends: sends.length,
    providerCalls: 0, nativeCalls: 0, roomActions: 0, originalWorkspaceWrites: 0 }, null, 2), { mode: 0o600 });
  console.log('NETWORK_AUTORESUME_V156_PASS', JSON.stringify(checks));
} catch (error) {
  await fs.writeFile(reportPath, JSON.stringify({ ok: false, checks, error: error.message,
    providerCalls: 0, nativeCalls: 0, roomActions: 0, originalWorkspaceWrites: 0 }, null, 2), { mode: 0o600 }); throw error;
} finally { await secure?.close(); }
