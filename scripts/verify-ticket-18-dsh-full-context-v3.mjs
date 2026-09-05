import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, seal, sha256 } from '../packages/skill-production/common.mjs';
import { createGlobalProductionContext, compileGlobalTask } from '../packages/skill-production-v3/context.mjs';
import { createGlobalTools } from '../packages/skill-production-v3/runtime.mjs';
import { createStarcraftTmgProviderEgressTransportV1 } from '../packages/secure-provider-runtime/provider-egress-transport-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'build/ticket-18-production-v3'); await mkdir(OUT, { recursive: true });
const temp = await mkdtemp(path.join(OUT, 'capacity-'));
const catalogue = await loadFrozenSkillEvidence(ROOT), reader = createEvidenceReader(catalogue);
const context = createGlobalProductionContext(catalogue);
const task = compileGlobalTask(context, 'Injected capacity check. Read FAQ then finish. No actual model evaluation.', { fixtureOnly: true });
const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }],
  allowedProviders: ['deepseek-openai-compatible-direct'] });
const { egressBinding } = await registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId,
  version: profile.version, hash: profile.integrity.hash } });
let sends = 0; const bodySizes = [], requests = [];
const transport = createStarcraftTmgProviderEgressTransportV1({ captureResponseOutcome: true,
  resolveAddresses: async () => [{ address: '93.184.216.34', family: 4 }],
  requestImplementation(_options, callback) {
    const request = new EventEmitter(); request.destroy = () => {}; request.setTimeout = () => {};
    request.end = body => {
      sends++; bodySizes.push(Buffer.byteLength(body));
      const encoded = JSON.parse(body).messages[0].content;
      const contract = JSON.parse(encoded.slice(encoded.indexOf('\n') + 1));
      const conversation = contract.promptNodes.find(n => n.type === 'actual_agent_conversation').value;
      assert(JSON.stringify(conversation).includes(JSON.stringify(task).slice(1, -1)));
      const command = sends === 1 ? { action: 'read', args: { refs: ['faq-v1:06'] } }
        : { action: 'finish', content: { fixtureOnly: true, fullContextTransported: true } };
      const payload = { model: profile.model, choices: [{ message: { content: JSON.stringify({ channels: { skill: command } }) }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 10 } };
      queueMicrotask(() => {
        const response = new EventEmitter(); response.statusCode = 200;
        response.headers = { 'content-type': 'application/json' }; response.destroy = () => {}; response.resume = () => {};
        callback(response); queueMicrotask(() => { response.emit('data', Buffer.from(JSON.stringify(payload))); response.emit('end'); });
      });
    };
    return request;
  } });
const store = openProductionStore(path.join(temp, 'capacity.sqlite'), { runId: 'full-context-fixture', recipeHash: hash({ task }), maxCalls: 4 });
const model = createAccountedModel({ store, maxInputBytes: 786432, complete: request => {
  requests.push(Buffer.byteLength(JSON.stringify(request)) + 4096);
  return transport.complete({ egressBinding, credentialBytes: Buffer.from('fixture-capacity-not-live'), providerRequest: request });
} });
const dsh = await prepareDshLoop(ROOT), results = [];
for (let restart = 0; restart < 2; restart++) {
  const tools = createGlobalTools({ context, reader, verifier: {} });
  assert((await tools.execute('probe', { id: 'heldout.movement.1' })).error);
  const cleanTools = createGlobalTools({ context, reader, verifier: {} });
  const result = await dsh.run({ task, toolPort: cleanTools,
    callModel: request => model({ ...request, stageId: 'full-source-stable' }) });
  assert(result.final.fullContextTransported); assert.equal(result.calls, 2);
  assert.equal(result.sandboxReceipt.execution.cleanupVerified, true);
  assert.deepEqual(cleanTools.readRefs(), ['faq-v1:06']); results.push(result);
}
assert.equal(sends, 2); assert.equal(store.summary().calls, 2);
assert(bodySizes.every(n => n < transport.metadata().maxRequestBytes));
const files = ['packages/skill-production/model.mjs', 'packages/skill-production/loops.mjs', 'packages/skill-production/dsh-worker.mjs',
  'packages/skill-production-v3/context.mjs', 'packages/skill-production-v3/runtime.mjs',
  'packages/secure-provider-runtime/provider-egress-transport-v1.mjs', 'scripts/verify-ticket-18-dsh-full-context-v3.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(ROOT, file))) })));
const report = seal({ passed: true, contextHash: context.hash, codeHashes, modelInputLimitBytes: 786432,
  requestsBytesWithAllowance: requests, wireBodyBytes: bodySizes, dshBinding: dsh.binding, actualDshSessions: results.length,
  actualProviderCalls: 0, injectedHttpsResponses: sends, successfulRequestReuse: true,
  actualModelContextCapacityProven: false, proofs: results.map(r => r.hash), trainingTruth: false });
await writeFile(path.join(OUT, 'dsh-context-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, actualDshSessions: 2, actualProviderCalls: 0,
  requestsBytesWithAllowance: requests, wireBodyBytes: bodySizes, hash: report.hash }));
store.close();
