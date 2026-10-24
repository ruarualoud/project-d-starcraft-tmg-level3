// v150 lost all phase/error details on actual PROVIDER_TRANSPORT_FAILED.
// Exercise the real structured transport with fake sockets, never a network.
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { writeFile } from 'node:fs/promises';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgStructuredProviderEgressTransportV1 } from '../packages/secure-provider-runtime/structured-provider-egress-transport-v1.mjs';
const [reportPath] = process.argv.slice(2);
const registry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'],
});
const binding = registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId,
  version: profile.version, hash: profile.integrity.hash } }).egressBinding;
const secret = 'test-credential-do-not-log-this-value';
const request = { requestId: 'v151-transport-progress-reproduction', endpoint: binding.endpoint,
  body: { model: binding.model, instructions: 'Return a JSON object.', input: 'Diagnostic fixture.',
    reasoning: { effort: 'none' }, temperature: binding.temperature, top_p: binding.topP,
    max_output_tokens: 256, stream: false,
    text: { format: { type: 'json_schema', name: 'progress', schema: { type: 'object' } } } },
  outputContractRef: { id: 'progress.reproduction', version: '1.0.0', hash: 'a'.repeat(64) } };
const checks = [];
let physicalAttempts = 0;
async function failureAt(stage, networkErrorCode, timeout = false) {
  const transport = createStarcraftTmgStructuredProviderEgressTransportV1({
    resolveAddresses: async () => [{ address: '93.184.216.34', family: 4 }],
    requestImplementation: () => {
      physicalAttempts++;
      const outbound = new EventEmitter(); let onTimeout;
      outbound.setTimeout = (_ms, callback) => { onTimeout = callback; };
      outbound.destroy = () => { if (timeout) outbound.emit('error', Object.assign(new Error(secret), { code: 'ECONNRESET' })); };
      outbound.end = () => queueMicrotask(() => {
        const socket = new EventEmitter(); socket.remoteAddress = '93.184.216.34';
        outbound.emit('socket', socket);
        if (stage !== 'tcp_connect') socket.emit('connect');
        if (stage === 'waiting_response_headers') { socket.emit('secureConnect'); outbound.emit('finish'); }
        if (timeout) onTimeout();
        else outbound.emit('error', Object.assign(new Error(secret), { code: networkErrorCode }));
      });
      return outbound;
    },
  });
  try { await transport.send({ egressBinding: binding, credentialBytes: Buffer.from(secret), sendRequest: request }); }
  catch (error) { return error.safeReceipt; }
  assert.fail('fixture must return a transport failure');
}
try {
  const sent = await failureAt('waiting_response_headers', 'ECONNRESET');
  assert.equal(sent.transportProgress?.phase, 'waiting_response_headers', 'actual structured error must retain send/response progress');
  assert.equal(sent.networkErrorCode, 'ECONNRESET');
  assert.equal(sent.requestMayHaveBeenSent, true);
  assert.equal(sent.requestDefinitelyNotSent, false);
  assert.equal(sent.transportProgress.milestonesMs.responseHeaders, null);
  assert.ok(sent.transportProgress.milestonesMs.requestWritten >= 0);
  assert.equal(JSON.stringify(sent).includes(secret), false);
  checks.push('after_write_reset_retains_phase_and_allowlisted_error_without_credential_or_false_free_retry');
  const connecting = await failureAt('tcp_connect', 'ENETUNREACH');
  assert.equal(connecting.transportProgress.phase, 'tcp_connect');
  assert.equal(connecting.networkErrorCode, 'ENETUNREACH');
  const arbitrary = await failureAt('tls_handshake', secret);
  assert.equal(arbitrary.networkErrorCode, 'UNCLASSIFIED_NETWORK_ERROR');
  assert.equal(JSON.stringify(arbitrary).includes(secret), false);
  checks.push('connect_and_tls_failures_are_distinguishable_and_arbitrary_error_text_never_crosses_boundary');
  const timeout = await failureAt('waiting_response_headers', 'ECONNRESET', true);
  assert.equal(timeout.code, 'PROVIDER_TRANSPORT_TIMEOUT', 'destroy error must not mask the originating timeout');
  assert.equal(timeout.transportProgress.phase, 'waiting_response_headers');
  checks.push('timeout_remains_timeout_even_when_destroy_emits_error');
  assert.equal(physicalAttempts, 4);
  await writeFile(reportPath, JSON.stringify({ ok: true, checks, simulatedPhysicalAttempts: physicalAttempts,
    realNetworkCalls: 0, providerCalls: 0, automaticRetries: 0 }, null, 2), { mode: 0o600 });
  console.log('STRUCTURED_TRANSPORT_PROGRESS_V151_PASS', JSON.stringify(checks));
} catch (error) {
  await writeFile(reportPath, JSON.stringify({ ok: false, checks, failure: error.message,
    realNetworkCalls: 0, providerCalls: 0 }, null, 2), { mode: 0o600 }); throw error;
}
