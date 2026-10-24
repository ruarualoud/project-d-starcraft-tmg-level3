// B v212/A v209 retain only headers+timeout, losing whether body data arrived.
// Exercise the real transport with fake sockets and a virtual deadline, no API.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mock } from 'node:test';
import fs from 'node:fs/promises';
import { STARCRAFT_TMG_TICKET_27_ROSTER_TEACH_FLASH_PROFILE_V2 as profile }
  from '../content/provider/ticket-27-roster-teach-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 }
  from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { assertStarcraftTmgProviderTransportProgressV1 as checkProgress }
  from '../packages/secure-provider-runtime/provider-egress-contract-v1.mjs';
import { createStarcraftTmgStructuredProviderEgressTransportV1 as createTransport }
  from '../packages/secure-provider-runtime/structured-provider-egress-transport-v1.mjs';
const [base, label] = process.argv.slice(2);
const dest = base + '/common-v216-response-body-progress-' + label + '.private.json';
const reservation = await fs.open(dest, 'wx', 0o600); await reservation.close();
const report = { providerCalls: 0, realNetworkCalls: 0, automaticRetries: 0, checks: [] };
const registry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: '/responses' }], allowedProviders: [profile.provider] });
const binding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId,
  version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const secret = 'fixture-secret-not-a-real-credential';
const request = { requestId: 'v216-body-progress-reproduction', endpoint: binding.endpoint,
  body: { model: binding.model, instructions: 'Return JSON.', input: 'Local transport fixture.',
    reasoning: { effort: 'none' }, temperature: binding.temperature, top_p: binding.topP,
    max_output_tokens: 256, stream: false,
    text: { format: { type: 'json_schema', name: 'progress', schema: { type: 'object' } } } },
  outputContractRef: { id: 'body.progress.repro', version: '1.0.0', hash: 'a'.repeat(64) } };
async function fixture(chunks, stop) {
  let ready, socketTimeout;
  const started = new Promise(resolve => { ready = resolve; });
  let attempts = 0;
  mock.timers.enable({ apis: ['setTimeout'] });
  try {
    const transport = createTransport({ resolveAddresses: async () => [{ address: '93.184.216.34', family: 4 }],
      requestImplementation(_options, onResponse) {
        attempts++;
        const outbound = new EventEmitter();
        outbound.setTimeout = (_ms, callback) => { socketTimeout = callback; };
        outbound.destroy = () => {};
        outbound.end = () => queueMicrotask(() => {
          const socket = new EventEmitter(); socket.remoteAddress = '93.184.216.34';
          outbound.emit('socket', socket); socket.emit('connect'); socket.emit('secureConnect'); outbound.emit('finish');
          const response = new EventEmitter(); response.statusCode = 200;
          response.headers = { 'content-type': 'application/json' }; response.destroy = () => {};
          onResponse(response); chunks.forEach(chunk => response.emit('data', Buffer.from(chunk)));
          if (stop === 'end') response.emit('end');
          ready();
        });
        return outbound;
      } });
    const result = transport.send({ egressBinding: binding, credentialBytes: Buffer.from(secret), sendRequest: request })
      .then(value => ({ receipt: value.transportReceipt, payload: value.payload }), error => ({ receipt: error.safeReceipt }));
    await started;
    if (stop === 'deadline') mock.timers.tick(binding.timeoutMs);
    if (stop === 'idle') socketTimeout();
    const value = await result;
    assert.equal(attempts, 1);
    assert.equal(JSON.stringify(value.receipt).includes(secret), false);
    checkProgress(value.receipt.transportProgress);
    return value;
  } finally { mock.timers.reset(); }
}
try {
  const actual = JSON.parse(await fs.readFile(base + '/common-v212-B-plan-revision-progress.private.json', 'utf8'));
  assert.match(actual.failure, /PROVIDER_TRANSPORT_TIMEOUT/);
  const partial = await fixture([' \n', '{"private":"' + secret], 'deadline');
  assert.equal(partial.receipt.transportProgress.responseBody?.receivedBytes,
    Buffer.byteLength(' \n{"private":"' + secret),
    'A real response-body timeout must expose whether any body bytes arrived, without exposing the content');
  assert.equal(partial.receipt.transportProgress.timeoutCause, 'total_deadline');
  assert.equal(partial.receipt.transportProgress.responseBody.nonWhitespaceBytes,
    Buffer.byteLength('{"private":"' + secret));
  assert.equal(partial.receipt.transportProgress.responseBody.chunkCount, 2);
  assert.equal(partial.receipt.requestMayHaveBeenSent, true);
  report.checks.push('partial_body_total_deadline_distinguishable_without_leaking_body_or_credentials');
  const empty = await fixture([], 'idle');
  assert.equal(empty.receipt.transportProgress.timeoutCause, 'socket_inactivity');
  assert.deepEqual(empty.receipt.transportProgress.responseBody, { receivedBytes: 0, nonWhitespaceBytes: 0,
    chunkCount: 0, firstByteMs: null, lastByteMs: null, lastNonWhitespaceByteMs: null });
  const heartbeat = await fixture([' \n', '\r\t'], 'deadline');
  assert.equal(heartbeat.receipt.transportProgress.responseBody.receivedBytes, 4);
  assert.equal(heartbeat.receipt.transportProgress.responseBody.nonWhitespaceBytes, 0);
  assert.equal(heartbeat.receipt.transportProgress.responseBody.lastNonWhitespaceByteMs, null);
  report.checks.push('no_body_and_whitespace_only_observations_distinct_not_model_success');
  const done = await fixture(['{"ok":', 'true}'], 'end');
  assert.deepEqual(done.payload, { ok: true });
  assert.equal(done.receipt.transportProgress.responseBody.receivedBytes, 11);
  assert(!Object.hasOwn(done.receipt.transportProgress, 'timeoutCause'));
  const old = { ...done.receipt.transportProgress }; delete old.responseBody;
  assert.deepEqual(checkProgress(old), old, 'old progress receipts remain accepted unchanged');
  assert.throws(() => checkProgress({ ...done.receipt.transportProgress,
    responseBody: { ...done.receipt.transportProgress.responseBody, rawBody: secret } }), /forbidden/);
  report.checks.push('completed_payload_unchanged_old_receipts_supported_no_raw_body_field_allowed');
  report.ok = true;
} catch (error) { report.ok = false; report.failure = error.message.slice(0, 1500); process.exitCode = 1; }
await fs.writeFile(dest, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
