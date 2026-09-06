import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { repairFactionSectionFieldsV1 } from '../packages/skill-production-v3/faction-field-repair-v1.mjs';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderEgressTransportV1 } from '../packages/secure-provider-runtime/provider-egress-transport-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const input = await json('terran_armed_forces-input'), knownRulePolicy = await json('terran_armed_forces-known-rule-policy');
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
let sectionResult;
try { sectionResult = verifySeal(verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get('faction-v1-18f0b5e3b20fc4909d08', 'faction.terran_armed_forces.army_resources.1.result').artifact)).value); }
finally { db.close(); }
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue), dsh = await prepareDshLoop(root);
const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
const { egressBinding } = await registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } });
let sends = 0, wireBytes = 0;
const transport = createStarcraftTmgProviderEgressTransportV1({ captureResponseOutcome: true,
  resolveAddresses: async () => [{ address: '93.184.216.34', family: 4 }],
  requestImplementation(options, callback) {
    const request = new EventEmitter(); request.destroy = () => {}; request.setTimeout = () => {};
    request.end = body => {
      sends++; wireBytes = Buffer.byteLength(body);
      const encoded = JSON.parse(body).messages[0].content, contract = JSON.parse(encoded.slice(encoded.indexOf('\n') + 1));
      const observed = contract.promptNodes.find(n => n.type === 'actual_agent_conversation').value;
      const c = observed.messages[0].content, task = typeof c === 'string' ? c : c.map(b => b.text).join('');
      assert(task.startsWith('FROZEN GLOBAL SOURCE CONTEXT\n' + JSON.stringify(context.prompt)));
      const w = JSON.parse(task.slice(task.indexOf('\nLOCAL WORKSPACE\n') + 17));
      assert.equal(w.inputHash, input.hash); assert.equal(w.overallSkill.sections.flatMap(s => s.claims).length, 522);
      assert.equal(hash(w.draft), hash(sectionResult.draft)); assert.equal(w.repairPlan.sourceEvidence.length, 3);
      const output = { replacements: w.editTargetsAtEnd.map(t => ({ targetId: t.targetId,
        text: '已使用Life Support时不要再叠加Advanced Training；在满足条件的另一次激活中为Medic主动CP能力保留折扣，仍检查Ready状态、每轮使用次数和本次反应额度。' })) };
      const payload = { model: profile.model, choices: [{ message: { content: JSON.stringify({ channels: { skill: { action: 'finish', content: output } } }) }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 10 } };
      queueMicrotask(() => { const response = new EventEmitter(); response.statusCode = 200;
        response.headers = { 'content-type': 'application/json' }; response.destroy = () => {}; response.resume = () => {};
        callback(response); queueMicrotask(() => { response.emit('data', Buffer.from(JSON.stringify(payload))); response.emit('end'); }); });
    }; return request;
  } });
const temp = await mkdtemp(path.join(base, 'field-repair-dsh-'));
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'field-repair-dsh', recipeHash: hash(input.hash), maxCalls: 2 });
let result;
try {
  const model = createAccountedModel({ store, maxInputBytes: 1_000_000, outputRecoveryLimit: 4096,
    complete: request => transport.complete({ egressBinding, credentialBytes: Buffer.from('fixture-not-a-live-credential'), providerRequest: request }) });
  const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context, verifier: {}, model, dsh });
  result = await repairFactionSectionFieldsV1({ input, sectionResult, knownRulePolicy, store, runtime });
  assert.equal(result.patch.changes.length, 1); assert.equal(result.sourceReviewPassed, false);
  assert.equal((await repairFactionSectionFieldsV1({ input, sectionResult, knownRulePolicy, store, runtime })).hash, result.hash);
  assert.equal(sends, 1); assert(wireBytes <= transport.metadata().maxRequestBytes);
} finally { store.close(); }
const files = ['packages/skill-production-v3/faction-field-repair-v1.mjs', 'packages/skill-production-v3/runtime.mjs',
  'packages/skill-production/loops.mjs', 'packages/skill-production/model.mjs', 'scripts/verify-ticket-18-faction-field-repair-dsh-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, codeHashes, inputHash: input.hash, sectionResultHash: sectionResult.hash,
  dshBinding: dsh.binding, actualDshSessions: 1, injectedHttpsResponses: sends, wireBytes, fullSourceDeliveryVerified: true,
  fixtureResultHash: result.hash, providerCalls: 0, actualModelRepairPerformed: false, trainingTruth: false });
await writeFile(path.join(base, 'field-repair-dsh-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, actualDshSessions: 1, providerCalls: 0, wireBytes, hash: report.hash }));
