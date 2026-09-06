import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../packages/skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../packages/skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../packages/skill-production-v3/runtime.mjs';
import { factionRoleWorkspaceV1, createFactionWritingPlanV1, createFactionRepairIssuesV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { mergeFactionKnownSourceIssuesV1 } from '../packages/skill-production-v3/faction-known-rule-findings-v1.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderEgressTransportV1 } from '../packages/secure-provider-runtime/provider-egress-transport-v1.mjs';
import { createStarcraftTmgProviderProfileRegistryV1 } from '../packages/secure-provider-runtime/provider-profile-registry-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from '../content/skill-generation/offline-provider-profile-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const inputs = await Promise.all(['terran_armed_forces', 'zerg_swarm'].map(async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '-input.json'), 'utf8')))));
const correctionGate = verifySeal(JSON.parse(await readFile(path.join(base, 'targeted-corrections-readiness.json'), 'utf8')));
const sampleDraft = correctionGate.knownRuleCorrection.draft;
const samplePolicy = verifySeal(JSON.parse(await readFile(path.join(base, 'terran_armed_forces-known-rule-policy.json'), 'utf8')));
const sampleIssues = mergeFactionKnownSourceIssuesV1({ input: inputs[0], policy: samplePolicy, draft: sampleDraft,
  issues: createFactionRepairIssuesV1(createFactionWritingPlanV1(inputs[0]).sections[0], sampleDraft, []) });
const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue), reader = createEvidenceReader(catalogue);
const dsh = await prepareDshLoop(root), temp = await mkdtemp(path.join(base, 'dsh-context-'));
const registry = createStarcraftTmgProviderProfileRegistryV1({ entries: [{ providerProfile: profile, completionPath: '/chat/completions' }], allowedProviders: ['deepseek-openai-compatible-direct'] });
const { egressBinding } = await registry.resolveEgressBinding({ profileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash } });
const sizes = [], proofs = []; let sends = 0, activeInput;
const transport = createStarcraftTmgProviderEgressTransportV1({ captureResponseOutcome: true,
  resolveAddresses: async () => [{ address: '93.184.216.34', family: 4 }],
  requestImplementation(options, callback) {
    const request = new EventEmitter(); request.destroy = () => {}; request.setTimeout = () => {};
    request.end = body => {
      sends++; sizes.push(Buffer.byteLength(body));
      const encoded = JSON.parse(body).messages[0].content, contract = JSON.parse(encoded.slice(encoded.indexOf('\n') + 1));
      const observed = contract.promptNodes.find(n => n.type === 'actual_agent_conversation').value;
      const content = observed.messages[0].content;
      assert(typeof content === 'string' || Array.isArray(content) && content.every(b => b.type === 'text' && typeof b.text === 'string'));
      const task = typeof content === 'string' ? content : content.map(b => b.text).join('');
      assert(task.startsWith('FROZEN GLOBAL SOURCE CONTEXT\n' + JSON.stringify(context.prompt)));
      const workspace = JSON.parse(task.slice(task.indexOf('\nLOCAL WORKSPACE\n') + 17));
      assert.equal(workspace.inputHash, activeInput.hash); assert.equal(workspace.overallSkill.sections.flatMap(s => s.claims).length, 522);
      assert.equal(workspace.operationalGuide.hash, activeInput.operationalGuide.hash); assert.equal(workspace.factionEvidence.hash, activeInput.factionEvidence.hash);
      assert.equal(workspace.draft.recommendations.length, 8);
      assert.equal(workspace.outputRequestAtEnd.targetContract.targets.length, 2);
      assert(workspace.outputRequestAtEnd.targetContract.focusedSources.length > 0);
      assert.equal(workspace.reviewBindingRepair.targetChoices.length, 2);
      assert(workspace.reviewBindingRepair.preservedJudgments.every(j => j.reason.length === 400));
      const payload = { model: profile.model, choices: [{ message: { content: JSON.stringify({ channels: { skill: { action: 'finish', content: { fixtureOnly: true, fullContextTransported: true } } } }) }, finish_reason: 'stop' }],
        usage: { prompt_tokens: 10, completion_tokens: 2, total_tokens: 12, prompt_cache_hit_tokens: 0, prompt_cache_miss_tokens: 10 } };
      queueMicrotask(() => { const response = new EventEmitter(); response.statusCode = 200;
        response.headers = { 'content-type': 'application/json' }; response.destroy = () => {}; response.resume = () => {};
        callback(response); queueMicrotask(() => { response.emit('data', Buffer.from(JSON.stringify(payload))); response.emit('end'); }); });
    }; return request;
  } });
const store = openProductionStore(path.join(temp, 'fixture.sqlite'), { runId: 'faction-dsh-context', recipeHash: hash(inputs.map(i => i.hash)), maxCalls: 4 });
try {
  const model = createAccountedModel({ store, maxInputBytes: 1_000_000, outputRecoveryLimit: 4096,
    complete: request => transport.complete({ egressBinding, credentialBytes: Buffer.from('fixture-not-a-live-credential'), providerRequest: request }) });
  const runtime = createProductionRuntimeV3({ store, reader, context, verifier: {}, model, dsh });
  for (const input of inputs) {
    activeInput = input;
    const packet = seal({ id: 'faction-context.' + input.factionRecordKey.split(':')[1], sourceBinding: input.sourceBinding });
    const section = createFactionWritingPlanV1(input).sections[0];
    // Stress both complete inputs with the largest pair from the actual saved
    // eight-item draft. Terran prose in the Zerg probe is capacity-only, not a
    // Zerg production answer or quality evidence.
    const pairs = [0, 2, 4, 6].map(first => createFactionReviewTargetsV1({ input, section, draft: sampleDraft, indices: [first, first + 1] }));
    const targetContract = pairs.sort((a, b) => Buffer.byteLength(JSON.stringify(b)) - Buffer.byteLength(JSON.stringify(a)))[0];
    const workspace = { ...factionRoleWorkspaceV1(input), section, draft: sampleDraft,
      reviewIndices: targetContract.targets.map(t => t.index), coverageRequiredSourceRefs: section.requiredSourceRefs,
      repairEvidenceCapacityProbe: sampleIssues,
      reviewBindingRepair: { planHash: hash('capacity-only'), targetChoices: targetContract.targets.map(t => ({
        targetId: t.targetId, title: t.title, fieldPaths: t.fields.map(f => f.path) })),
      preservedJudgments: targetContract.targets.map(t => ({ targetId: t.targetId, title: t.title,
        verdict: 'unsupported', reason: '容量测试'.repeat(100), sourceRefs: input.frozenSources.prompt.sources.slice(0, 8).map(s => s.ref) })) },
      instructionCapacityProbe: '完整来源审查容量占位。'.repeat(150),
      outputRequestAtEnd: { targetContract, coverageOnlySourceRefs: section.requiredSourceRefs } };
    const result = await runtime.role({ packet, roleId: 'delivery', instruction: 'Injected full faction context delivery test. Finish with the fixture receipt only.',
      workspace });
    assert(result.output.fullContextTransported); assert(result.loop.sandboxReceipt.execution.cleanupVerified); proofs.push(result.hash);
    assert.equal((await runtime.role({ packet, roleId: 'delivery', instruction: 'Injected full faction context delivery test. Finish with the fixture receipt only.',
      workspace })).hash, result.hash);
  }
  assert.equal(sends, 2); assert(sizes.every(n => n < transport.metadata().maxRequestBytes));
} finally { store.close(); }
const files = ['packages/skill-production-v3/faction-strategy-workflow-v1.mjs', 'packages/skill-production-v3/runtime.mjs',
  'packages/skill-production-v3/faction-review-targets-v1.mjs',
  'packages/skill-production-v3/faction-known-rule-findings-v1.mjs',
  'packages/skill-production/loops.mjs', 'packages/skill-production/model.mjs', 'packages/skill-production/dsh-worker.mjs',
  'packages/secure-provider-runtime/provider-egress-transport-v1.mjs', 'scripts/verify-ticket-18-faction-dsh-context-v1.mjs'];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const report = seal({ passed: true, inputHashes: inputs.map(i => i.hash), contextHash: context.hash, dshBinding: dsh.binding, codeHashes,
  actualDshSessions: 2, injectedHttpsResponses: sends, wireBodyBytes: sizes, fullSourceAndOverallDeliveryVerified: true,
  actualDraftAndLargestTargetPairTransported: true, actualDraftHash: hash(sampleDraft),
  knownSourceRepairEvidenceTransported: true, repairEvidenceHash: sampleIssues.hash,
  reviewFieldBindingRepairCapacityTransported: true,
  actualProviderCalls: 0, actualStrategyQualityProven: false, proofs, trainingTruth: false });
await writeFile(path.join(base, 'dsh-context-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, actualDshSessions: 2, providerCalls: 0, wireBodyBytes: sizes, hash: report.hash }));
