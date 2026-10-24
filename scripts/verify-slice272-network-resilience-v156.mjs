// Actual A ENOTFOUND stopped before egress; B lost a long-idle sent request.
// Real transports, fake DNS/socket only. No keys, network, Native or Room.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFile, writeFile } from 'node:fs/promises';
import { createProviderProfile } from '../packages/character-agent/contracts-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgStructuredProviderEgressTransportV1 } from '../packages/secure-provider-runtime/structured-provider-egress-transport-v1.mjs';
import { createStarcraftTmgProviderEgressTransportV1 } from '../packages/secure-provider-runtime/provider-egress-transport-v1.mjs';
import { assertStarcraftTmgProviderWorkerSuccessV1 } from '../packages/secure-provider-runtime/provider-worker-success-classifier-v1.mjs';
const [reportPath, previousReportPath] = process.argv.slice(2);
const workerContractOnly = previousReportPath === '--worker-contract-only';
const previous = previousReportPath && !workerContractOnly ? JSON.parse(await readFile(previousReportPath, 'utf8')) : null;
const checks = [];
const ref = p => ({ id: p.providerProfileId, version: p.version, hash: p.integrity.hash });
const structuredBinding = (await createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: [profile.provider],
}).resolveEgressBinding({ profileRef: ref(profile) })).egressBinding;
const ordinaryProfile = createProviderProfile({ providerProfileId: 'network-v156', version: '1.0.0',
  provider: 'openai-compatible-direct', baseUrl: 'https://example.com/v1', model: 'fake',
  contextBudget: 4096, outputBudget: 256, timeoutMs: 10000,
  retryPolicy: { maxAttempts: 1, owner: 'session_supervisor', internalRetry: false } });
const ordinaryBinding = (await createStarcraftTmgProviderProfileRegistryV1({
  entries: [{ providerProfile: ordinaryProfile, completionPath: '/chat/completions' }],
}).resolveEgressBinding({ profileRef: ref(ordinaryProfile) })).egressBinding;

function fixture(kind, dns, { abortAfterLookup = false, failAfterSend = false } = {}) {
  const binding = kind === 'structured' ? structuredBinding : ordinaryBinding;
  const calls = { dns: 0, send: 0, keepalive: [], bodies: [] };
  const controller = new AbortController();
  const adapters = { resolveAddresses: async () => {
    calls.dns++;
    const result = await dns(calls.dns);
    if (abortAfterLookup) controller.abort();
    return result;
  }, requestImplementation: (_options, onResponse) => {
    calls.send++;
    const out = new EventEmitter(); out.destroy = () => {}; out.setTimeout = () => {};
    out.end = body => { calls.bodies.push(body); queueMicrotask(() => {
      const socket = new EventEmitter(); socket.remoteAddress = '93.184.216.34';
      socket.setKeepAlive = (...args) => { calls.keepalive.push(args); };
      out.emit('socket', socket); socket.emit('connect'); socket.emit('secureConnect'); out.emit('finish');
      if (failAfterSend) { out.emit('error', Object.assign(new Error('reset'), { code: 'ECONNRESET' })); return; }
      const res = new EventEmitter(); res.statusCode = 200;
      res.headers = { 'content-type': 'application/json' }; res.destroy = () => {};
      onResponse(res);
      const payload = kind === 'structured' ? { status: 'completed', output: [] }
        : { choices: [{ message: { content: '{"ok":true}' }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 2, completion_tokens: 1, total_tokens: 3 } };
      res.emit('data', Buffer.from(JSON.stringify(payload))); res.emit('end');
    }); }; return out;
  } };
  const common = { egressBinding: binding, credentialBytes: Buffer.from('fake-credential'), signal: controller.signal };
  const transport = kind === 'structured' ? createStarcraftTmgStructuredProviderEgressTransportV1(adapters)
    : createStarcraftTmgProviderEgressTransportV1(adapters);
  return { calls, send: () => kind === 'structured' ? transport.send({ ...common,
    sendRequest: { requestId: 'network-v156-probe', endpoint: binding.endpoint,
      outputContractRef: { id: 'network.probe', version: '1.0.0', hash: 'a'.repeat(64) },
      body: { model: binding.model, instructions: 'Return JSON.', input: 'Network fixture.',
        reasoning: { effort: 'none' }, temperature: binding.temperature, top_p: binding.topP,
        max_output_tokens: 256, stream: false,
        text: { format: { type: 'json_schema', name: 'network', schema: { type: 'object' } } } } } })
    : transport.complete({ ...common, providerRequest: {
      schemaVersion: 'starcraft_tmg_direct_provider_request_v1', requestId: 'network-v156-probe',
      intent: 'chat', promptPack: 'network_probe', promptNodes: [], userMessage: 'Network fixture.',
      responseContract: { allowedChannels: ['assistant'], decisionCandidateSource: 'none' }, maxOutputUnits: 256 } }) };
}
const address = () => [{ address: '93.184.216.34', family: 4 }];
const dnsError = () => Object.assign(new Error('local DNS failed'), { code: 'ENOTFOUND' });
async function check(id, fn) {
  if (previous?.checks.some(c => c.id === id && c.ok)) return;
  try { await fn(); checks.push({ id, ok: true }); }
  catch (error) { checks.push({ id, ok: false, error: error.message }); }
}
for (const kind of workerContractOnly ? [] : ['structured', 'ordinary']) {
  await check(kind + '_transient_dns_same_single_request', async () => {
    const f = fixture(kind, n => { if (n < 3) throw dnsError(); return address(); });
    const result = await f.send();
    assert.equal(f.calls.dns, 3); assert.equal(f.calls.send, 1);
    const receipt = result.transportReceipt || result.usageReceipt;
    assert.equal(receipt.dnsRecovery.attempts, 3); assert.equal(receipt.dnsRecovery.recovered, true);
    assert.equal(receipt.automaticRetries, 0); // Never a hidden paid POST retry.
  });
  await check(kind + '_cancelled_dns_cannot_send', async () => {
    const f = fixture(kind, address, { abortAfterLookup: true });
    await assert.rejects(f.send(), { code: 'PROVIDER_ABORTED' }); assert.equal(f.calls.send, 0);
  });
  await check(kind + '_idle_keepalive_without_hidden_paid_retry', async () => {
    const f = fixture(kind, address, { failAfterSend: true });
    await assert.rejects(f.send(), { code: 'PROVIDER_TRANSPORT_FAILED' });
    assert.deepEqual(f.calls.keepalive, [[true, 15000]]); assert.equal(f.calls.send, 1);
  });
}
if (!workerContractOnly) await check('dns_outage_bounded_and_still_proven_not_sent', async () => {
  const f = fixture('structured', () => { throw dnsError(); });
  let receipt;
  try { await f.send(); } catch (e) { receipt = e.safeReceipt; }
  assert.equal(f.calls.dns, 3); assert.equal(f.calls.send, 0);
  assert.equal(receipt.requestDefinitelyNotSent, true); assert.equal(receipt.requestMayHaveBeenSent, false);
  assert.equal(receipt.dnsRecovery.attempts, 3); assert.equal(receipt.dnsRecovery.recovered, false);
});
if (workerContractOnly) await check('new_dns_receipt_accepted_by_actual_worker_classifier', async () => {
  const result = await fixture('ordinary', address).send();
  assert.equal(assertStarcraftTmgProviderWorkerSuccessV1(result, {
    egressBinding: ordinaryBinding, providerRequestId: 'network-v156-probe' }), true);
});
const report = { ok: checks.every(c => c.ok), checks, previousPassedChecksNotRerun: previous?.checks.filter(c => c.ok).map(c => c.id) || [],
  realNetworkCalls: 0, providerCalls: 0, roomActions: 0 };
await writeFile(reportPath, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report)); if (!report.ok) process.exitCode = 1;
