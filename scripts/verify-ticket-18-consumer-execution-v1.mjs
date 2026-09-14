import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { seal, hash, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { createAccountedModel } from '../packages/skill-production/model.mjs';
import { selectFactionConsumerExecutionV1, factionConsumerExecutionOptionsV1, openFactionConsumerExecutionReplayV1 }
  from '../packages/skill-evaluation/faction-consumer-execution-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as legacy } from '../content/skill-generation/offline-provider-profile-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const directory = await mkdtemp(base + 'consumer-execution-'), filename = directory + '/journal.sqlite';
const reseal = ({ hash: ignored, ...body }, delta) => seal({ ...body, ...delta });
let checks = 0, injectedCalls = 0; const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const before = '2026-09-09T12:00:00.000Z', after = '2026-09-09T17:00:00.000Z';
eq(selectFactionConsumerExecutionV1({ now: before }).binding.hash,
  selectFactionConsumerExecutionV1({ now: '2026-09-09T12:59:00.000Z' }).binding.hash);
const output = { channels: { skill: { action: 'finish', content: { decision: 'fixture_only' } } } };
for (const [label, when, bound] of [['legacy', before, false], ['beta', before, true], ['fallback', after, true]]) {
  const selected = selectFactionConsumerExecutionV1({ now: when });
  const recipe = seal({ version: 'faction_consumer_execution_test_v1', label,
    ...(bound ? { consumerExecutionBinding: selected.binding } : {}), modelHash: bound ? selected.profile.integrity.hash : legacy.integrity.hash,
    limits: { maxInputBytes: 1_000_000 }, isolatedInjectedProvider: true });
  const options = factionConsumerExecutionOptionsV1(recipe), profile = options.profile;
  const body = { schemaVersion: 'starcraft_tmg_provider_egress_transport_v1.success', status: 200,
    requestedModel: profile.model, reportedModel: profile.model,
    providerProfileRef: { id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash },
    startedAt: when, physicalAttempts: 1, automaticRetries: 0, responseFingerprint: sha256(JSON.stringify(output)),
    usage: { inputUnits: 10, outputUnits: 5, totalUnits: 15 } };
  const usageReceipt = { ...body, receiptHash: hash(body) };
  const runId = 'faction-consumer-' + recipe.hash.slice(0, 20);
  const store = openProductionStore(filename, { runId, recipeHash: recipe.hash, maxCalls: 2,
    maxCostMicros: 1_000_000, maxTokens: 100_000 });
  const complete = async () => { injectedCalls++; return { output, usageReceipt }; };
  const model = createAccountedModel({ store, complete, commandPolicy: 'finish_only', maxInputBytes: recipe.limits.maxInputBytes,
    outputRecoveryLimit: 4096, ...options.modelOptions });
  const task = async ports => {
    const lease = ports.store.acquire('consumer-fixture', { label, suppliedOnly: true });
    const value = seal(await ports.model({ stageId: 'consumer-fixture', call: 0,
      observed: { system: 'Injected model test, not a Skill evaluation.', messages: [], tools: [] } }));
    return ports.store.finish(lease, value);
  };
  let actual;
  try { actual = await task({ store, model }); eq(store.summary().calls, 1); }
  finally { store.close(); }
  const n = injectedCalls, replay = openFactionConsumerExecutionReplayV1({ filename, runId, recipe });
  try {
    eq((await task(replay)).hash, actual.hash); eq(replay.evidence().receiptHashes, [usageReceipt.receiptHash]);
    eq(replay.evidence().newProviderCalls, 0); eq(injectedCalls, n);
  } finally { replay.close(); }
  if (bound) {
    options.modelOptions.validateModelReceipt(usageReceipt); checks++;
    const bad = { ...body, reportedModel: 'unrelated-model' };
    assert.throws(() => options.modelOptions.validateModelReceipt({ ...bad, receiptHash: hash(bad) })); checks++;
    assert.throws(() => factionConsumerExecutionOptionsV1(reseal(recipe, { modelHash: legacy.integrity.hash === recipe.modelHash ? hash('wrong') : legacy.integrity.hash }))); checks++;
    if (label === 'beta') {
      assert.throws(() => options.beforeNewSend(after), { code: 'FACTION_CONSUMER_EXECUTION_BETA_WINDOW' }); checks++;
      const late = { ...body, startedAt: after };
      assert.throws(() => options.modelOptions.validateModelReceipt({ ...late, receiptHash: hash(late) })); checks++;
    }
  }
}
eq(injectedCalls, 3);
const files = ['packages/skill-evaluation/faction-consumer-execution-v1.mjs', 'scripts/verify-ticket-18-consumer-execution-v1.mjs'];
const report = seal({ passed: true, checks, providerCalls: 0, injectedProviderResponses: injectedCalls,
  completeRequestReplayPassed: true, betaAndStableAndLegacyTested: true, recipeStableWithinModelWindow: true,
  productionMainWired: false, providerRetirementTransitionWired: false, directory,
  semanticAcceptance: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
await writeFile(base + 'consumer-execution-component-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, providerCalls: 0, injectedProviderResponses: injectedCalls }));
