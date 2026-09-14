import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { DatabaseSync, backup } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withProductionExecutionPolicyV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { FACTION_REVIEW_CONTRACT_PROJECTION_BINDING_V1 as binding } from '../packages/skill-production-v3/faction-review-contract-projection-v1.mjs';
import { FACTION_CONTRACT_PROJECTION_FILES_V1 as files, factionContractProjectionRecipeV1,
  validateFactionContractProjectionMigrationV1, createFactionContractProjectionResolverV1,
  createFactionContractProjectionLaneV1, withFactionContractProjectionCompleterV1 }
  from '../packages/skill-production-v3/faction-review-contract-projection-integration-v1.mjs';
import { createFactionFieldRecoveryLaneV1 } from '../packages/skill-production-v3/faction-field-recovery-lane-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 } from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';
import { loadFactionContractProjectionActualFixturesV1 } from './support/faction-contract-projection-actual-fixture-v1.mjs';
import { verifyFactionBudgetEpochV1 } from '../packages/skill-production-v3/faction-budget-epoch-v1.mjs';

assert.equal(process.argv.length, 2);
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const fixtures = await loadFactionContractProjectionActualFixturesV1();
const source = new DatabaseSync(fixtures[0].filename, { readOnly: true });
const before = hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const directory = await mkdtemp(base + 'contract-projection-wiring-'), filename = directory + '/journal.sqlite';
// Consistent read-only snapshot, including real inventories and paid ancestor
// rows. Original journal is never mutated; no fabricated ancestry shortcuts.
await backup(source, filename);
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const body = { version: 'faction_contract_projection_wiring_readiness_v1', passed: true, bindingHash: binding.hash,
  actualZeroObligationRequestReconstructed: true, actualAdministrativeExtensionReconstructed: true,
  fullColdConsumerPassed: true, freshFailureCallbackPassed: true, restartNoResendPassed: true,
  actualDshSessions: 2, providerCalls: 0, semanticAcceptance: false, trainingTruth: false, codeHashes };
const provisional = seal(body), fields = factionContractProjectionRecipeV1(provisional);
const reseal = (v, patch) => { const { hash: ignored, ...rest } = v; return seal({ ...rest, ...patch }); };
const parent = fixtures[0].recipe, parentRunId = fixtures[0].runId;
const epoch = verifySeal(JSON.parse(await readFile(base + 'budget-epoch-2026-09-09-reset-v1.json', 'utf8')));
const origins = [...parent.fieldRecoveryOrigins, ...fixtures.map(f => ({ runId: f.runId,
  attemptId: f.originalEvidence.attempt.id, rejectedCandidateHash: f.originalEvidence.rejected.hash }))]
  .sort((a, b) => (a.runId + '/' + a.attemptId).localeCompare(b.runId + '/' + b.attemptId));
const next = reseal(parent, { ...fields, budgetExtension: epoch, limits: epoch.nextLimits, fieldRecoveryOrigins: origins,
  codeHashes: [...parent.codeHashes.filter(r => !files.includes(r.file)), ...codeHashes] });
let checks = 0, sessions = 0; const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
eq(verifyFactionBudgetEpochV1({ parent, next }).authorization, 'user_budget_epoch_v4');
eq(validateFactionContractProjectionMigrationV1({ parent, next, readiness: provisional }).accountingReset, false);
const ancestors = []; let p = parent;
while (p) { ancestors.push(p); p = p.continuation ? verifySeal(JSON.parse(await readFile(base + p.continuation.parentRunId + '/recipe.json', 'utf8'))) : null; }
const native = await prepareDshLoop(root, { sessionPolicy: 'phased-v1' });
const dsh = { ...native, async run(q) { sessions++; return native.run(q); } };
const deny = () => assert.fail('No Provider or legacy fallback is authorized in this recovery fixture');
const outputs = [];
for (const f of fixtures) {
  const recipe = reseal(next, { continuation: seal({ parentRunId, parentRecipeHash: parent.hash, reusable: [] }),
    injectionTest: { directory, name: f.name, purpose: 'actual paid failure through new production lane and complete cold stack' } });
  const runId = 'faction-v1-' + recipe.hash.slice(0, 20);
  await mkdir(base + runId); await writeFile(base + runId + '/recipe.json', JSON.stringify(recipe, null, 2), { flag: 'wx' });
  const options = { runId, recipeHash: recipe.hash, maxCalls: 1 };
  let journal = openProductionStore(filename, options), store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
  const resolver = () => createFactionContractProjectionResolverV1({ filename, recipe, ancestors, runId,
    input: f.input, store, dsh });
  const factory = (dry = false) => createFactionContractProjectionLaneV1({ recipe, input: f.input, store,
    resolver: createFactionContractProjectionResolverV1({ filename, recipe, ancestors, runId, input: f.input, store, dsh, dry }),
    runtime: createFactionFieldRecoveryLaneV1({ filename, recipe, ancestors, runId, input: f.input, runtime: { role: deny },
      store, dsh, executionPolicy: f.executionPolicy, dry }), executionPolicy: f.executionPolicy, dry });
  let value;
  try {
    await assert.rejects(factory(true).role(f.request), { code: 'FACTION_PREFLIGHT_FIELD_RECOVERY_REQUIRED' }); checks++;
    value = await factory().role(f.request); eq(journal.summary().calls, 0);
    // Same resolver is used at the real structured-runtime fresh-failure
    // callback seam. Original actual failure is already in this snapshot;
    // this assertion does not claim a newly injected transport request.
    const count = sessions;
    const callback = withFactionContractProjectionCompleterV1({ resolver: resolver(), baseCompleter: deny });
    eq((await callback(f.prepared)).hash, value.hash); eq(sessions, count);
  } finally { journal.close(); }
  const count = sessions;
  journal = openProductionStore(filename, options); store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
  try { eq((await factory().role(f.request)).hash, value.hash); eq(sessions, count); eq(journal.summary().calls, 0); }
  finally { journal.close(); }
  const replay = openFactionProductionReplayV1({ filename, runId, recipe, ancestors, input: f.input });
  try {
    const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
    const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input: f.input, replay, runtime: { role: deny }, dependencies });
    eq((await stack.runtime.role(f.request)).hash, value.hash);
    eq(replay.evidence().actualProviderReceiptHashes, [value.materialization.originalProof.providerReceiptHash]);
    eq(replay.evidence().newProviderCalls, 0);
  } finally { replay.close(); }
  outputs.push({ name: f.name, runId, roleHash: value.hash });
}
eq(sessions, 2); eq(hash(source.prepare('SELECT * FROM attempts ORDER BY run,id').all()), before); source.close();
const main = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
assert(main.includes('const completeFieldValues = withFactionContractProjectionCompleterV1'));
assert(main.includes('fieldValueBinding: recipe.fieldValueBinding, completeFieldValues')); checks += 2;
const report = seal({ ...body, checks, outputs, directory, actualDshSessions: sessions,
  userResetBudgetEpochComposed: true, budgetEpochHash: epoch.hash,
  freshTransportFaultInjected: false, actualPaidResponsesReplayed: 2, originalJournalUnchanged: true,
  currentEntryStillRequiresRegressionAndFormalPreflight: true });
await writeFile(base + 'contract-projection-readiness-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, directory, hash: report.hash, actualDshSessions: sessions, providerCalls: 0 }));
