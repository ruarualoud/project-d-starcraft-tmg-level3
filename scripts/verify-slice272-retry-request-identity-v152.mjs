// Actual v151 A/B: a successful network retry blocked the NEXT distinct Teach
// request because both investigations used roundIndex=1. Real factory, fake
// credential/Worker only; no network, Native action, or workspace mutation.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { createRosterPlanningSecureDeliberationFactoryV1 } from
  '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';

const [reportPath] = process.argv.slice(2);
const events = [], sends = [], checks = [];
let interrupt = true;
const started = performance.now();
const secure = await createRosterPlanningSecureDeliberationFactoryV1({
  profile: { providerProfileId: 'identity-probe', version: '1',
    integrity: { hash: 'a'.repeat(64) }, provider: 'fake', model: 'fake' },
  readCredential: async () => ({ credentialBytes: Buffer.from('fake-only') }),
  createRegistry: () => ({ resolveEgressBinding: async () => ({ ok: true,
    egressBinding: { endpoint: { url: 'https://example.invalid/responses' },
      model: 'fake', temperature: 0, topP: 1, maxOutputUnits: 1024 } }) }),
  createWorker: () => ({
    attachCredential: async () => ({ ok: true, workerRef: 'fake' }),
    async send(input) {
      sends.push(input);
      if (interrupt) { interrupt = false; throw Object.assign(new Error('fake reset'),
        { safeReceipt: { code: 'PROVIDER_EGRESS_NETWORK_ERROR',
          requestMayHaveBeenSent: true } }); }
      return { status: 200, transportReceipt: { receiptHash: 'b'.repeat(64) },
        payload: { status: 'completed', model: 'fake',
          usage: { input_tokens: 2, output_tokens: 1, total_tokens: 3 },
          output: [{ type: 'message', role: 'assistant', status: 'completed',
            content: [{ type: 'output_text', text: '{"ok":true}' }] }] } };
    },
    close: async () => {},
  }),
});
const request = { roundKind: 'teach_framework_investigate', roundIndex: 1,
  contextHash: 'c'.repeat(64), promptPack: 'identity-probe', promptNodes: [],
  userMessage: 'Investigate initial evidence', responseContract: {},
  responseFormat: { kind: 'provider_strict_json_schema', schemaName: 'identity_probe',
    outputContractRef: { id: 'probe', version: '1', hash: 'd'.repeat(64) },
    schema: { type: 'object', additionalProperties: false,
      properties: { ok: { type: 'boolean' } }, required: ['ok'] } } };
const config = { sessionId: 'identity-probe-session', runKind: 'teach-framework',
  planHash: 'e'.repeat(64), onEvent: event => events.push(event) };
try {
  const first = await secure.factory.createForRun(config);
  await assert.rejects(first.deliberate(request),
    { code: 'ROSTER_WORKSPACE_AMBIGUOUS_DISPATCH_STOP' });
  const original = structuredClone(events.filter(e => e.type === 'provider_dispatch').at(-1).dispatch);
  const resumed = await secure.factory.createForRun({ ...config,
    retryDispatch: { ...original, retryAuthorizationId: 'authorized-once',
      standingNetworkResumeConsent: true } });
  await resumed.deliberate(request);
  const retried = events.filter(e => e.type === 'provider_dispatch').at(-1).dispatch;
  assert.equal(retried.retryOfRequestId, original.requestId);
  assert.equal(retried.requestBodyHash, original.requestBodyHash);
  assert.equal(retried.contextHash, original.contextHash);
  checks.push('exact_interrupted_request_resumes_once');
  await assert.rejects(resumed.deliberate(request),
    { code: 'ROSTER_WORKSPACE_RETRY_AUTHORIZATION_CONSUMED' });
  assert.equal(sends.length, 2);
  checks.push('same_consumed_request_still_blocked_before_send');
  await resumed.deliberate({ ...request, contextHash: 'f'.repeat(64),
    userMessage: 'Investigate newly returned evidence and its remaining unknown' });
  const next = events.filter(e => e.type === 'provider_dispatch').at(-1).dispatch;
  assert.equal(sends.length, 3);
  assert.notEqual(next.contextHash, original.contextHash);
  assert.notEqual(next.requestBodyHash, original.requestBodyHash);
  assert.equal(next.retryOfRequestId, undefined);
  assert.equal(next.retryAuthorizationId, undefined);
  assert.equal(next.status, 'completed');
  assert.equal(original.status, 'ambiguous');
  assert.equal(original.costStatus, 'unknown');
  checks.push('next_distinct_same_kind_index_request_is_new_dispatch_not_retry');
  await writeFile(reportPath, JSON.stringify({ ok: true, checks,
    elapsedMs: performance.now() - started, fakeWorkerCalls: sends.length,
    providerCalls: 0, roomActions: 0, originalWorkspaceWrites: 0 }, null, 2), { mode: 0o600 });
  console.log('RETRY_REQUEST_IDENTITY_V152_PASS', JSON.stringify(checks));
} catch (error) {
  await writeFile(reportPath, JSON.stringify({ ok: false, checks, failure: error.message,
    elapsedMs: performance.now() - started, fakeWorkerCalls: sends.length,
    providerCalls: 0, roomActions: 0 }, null, 2), { mode: 0o600 });
  throw error;
} finally { await secure.close(); }
