import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { openProductionStore } from '../packages/skill-production/store.mjs';
import { withProductionExecutionPolicyV1 } from '../packages/skill-production/execution-policy-v1.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { FACTION_CHECKPOINT_INVENTORY_BINDING_V1 as inventoryBinding, readFactionCheckpointInventoryV1,
  withFactionCheckpointInventoryV1, auditFactionCheckpointExecutionRowsV1 } from '../packages/skill-production-v3/faction-checkpoint-inventory-v1.mjs';
import { resolveFactionPromptLineageV1 } from '../packages/skill-production-v3/faction-prompt-lineage-v1.mjs';
import { createFactionStructuredReviewRuntimeV1, deriveFactionLegacyStructuredReviewRoleIdsV1 }
  from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { deriveFactionLegacyPromptRoleIdsV1 } from '../packages/skill-production-v3/faction-structured-local-editor-runtime-v1.mjs';
import { FACTION_PARSED_REVIEW_VALUE_BINDING_V1 as parsedBinding } from '../packages/skill-production-v3/faction-parsed-review-value-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../packages/structured-generation/context-capsule-v1.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { FACTION_RESUME_RELIABILITY_FILES_V1 as files, factionResumeReliabilityRecipeV1,
  validateFactionResumeReliabilityMigrationV1 } from '../packages/skill-production-v3/faction-resume-reliability-v1.mjs';
import { loadFactionParsedValueActualFixtureV1 } from './support/faction-parsed-value-actual-fixture-v1.mjs';
import { createFactionParsedWireRecoveryReaderV2 } from '../packages/skill-production-v3/faction-structural-json-environment-v1.mjs';
import { createFactionStructuralReviewLaneV1 } from '../packages/skill-production-v3/faction-structural-json-lane-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { factionExecutionEgressV1, factionExecutionProfileV1 } from '../packages/skill-production-v3/faction-execution-model-v1.mjs';
import { openFactionProductionReplayV1 } from '../packages/skill-evaluation/faction-production-replay-v1.mjs';
import { loadFactionStructuredReplayDependenciesV1, createFactionReplayRuntimeStackV1 }
  from '../packages/skill-evaluation/faction-replay-runtime-stack-v1.mjs';

assert.equal(process.argv.length, 2); // Actual DSH only; no Provider transport exists in this test.
const root = process.cwd(), base = 'build/ticket-18-faction-production-v1/';
const json = async file => verifySeal(JSON.parse(await readFile(file, 'utf8')));
const readRecipe = id => json(base + id + '/recipe.json');
const reseal = ({ hash: ignored, ...body }, patch) => seal({ ...body, ...patch });
const decode = raw => verifySeal(JSON.parse(raw)).value;
const actual = await loadFactionParsedValueActualFixtureV1(), { input, prepared, request, executionPolicy } = actual;
const component = await json(base + 'checkpoint-inventory-component-v1.json');
const inventoryArgs = { filename: actual.filename, parentRunId: actual.runId, parentRecipe: actual.recipe,
  lanePrefixes: component.actualInventoryProof.lanePrefixes, restorationWindows: component.actualInventoryProof.restorationWindows };
const inventory = readFactionCheckpointInventoryV1(inventoryArgs);
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const deny = () => assert.fail('Provider execution forbidden in actual-output recovery qualification');
const source = new DatabaseSync(actual.filename, { readOnly: true });
const before = hash(source.prepare('SELECT * FROM attempts WHERE run=?').all(actual.runId));
const lineage = await resolveFactionPromptLineageV1({ steps: inventory.steps, parentRunId: actual.runId,
  checkpointInventory: inventory.proof, readRecipe });
eq(lineage.rows.length, inventory.steps.length);
assert(deriveFactionLegacyPromptRoleIdsV1(inventory.steps, lineage).length > 0); checks++;
const routing = deriveFactionLegacyStructuredReviewRoleIdsV1(inventory.steps, inventoryBinding);
eq(new Set(routing).size, routing.length);
assert.throws(() => deriveFactionLegacyStructuredReviewRoleIdsV1(inventory.steps),
  { code: 'FACTION_STRUCTURED_REVIEW_LEGACY_ROLE_DUPLICATE' }); checks++;

const directory = await mkdtemp(base + 'resume-reliability-'), inventoryFile = directory + '/inventory.sqlite';
const continuation = { steps: inventory.steps, manifest: seal({ parentRunId: actual.runId, parentRecipeHash: actual.recipe.hash,
  checkpointInventory: inventory.proof, reusable: inventory.proof.reusable }) };
const tutorId = 'faction.terran_armed_forces.tutor', tutor = inventory.steps.find(r => r.id === tutorId);
const inventoryStore = openProductionStore(inventoryFile, { runId: 'inventory-fixture', recipeHash: hash(directory) });
// The real stored role input cannot be reversed from a hash. Read it from the
// actual tutor's authenticated transcript task contract via the prior journal
// checkpoint test adapter, preserving acquire's normal exact-hash predicate.
const leaseStore = { ...inventoryStore, acquire(id, q, ttl) {
  return inventoryStore.acquire(id, q, ttl);
} };
const fixtureInput = { inventoryFixtureOnly: true };
const fixtureRow = { ...tutor, inputHash: hash(fixtureInput) };
const fixtureProof = reseal(inventory.proof, { reusable: [{ ...inventory.proof.reusable.find(r => r.id === tutorId), inputHash: hash(fixtureInput) }] });
const wrapperFixture = { steps: [fixtureRow], manifest: reseal(continuation.manifest,
  { checkpointInventory: fixtureProof, reusable: fixtureProof.reusable }) };
const wrapped = withFactionCheckpointInventoryV1(leaseStore, wrapperFixture);
eq(wrapped.acquire(tutorId, fixtureInput).artifact.hash, tutor.artifact.hash);
eq(wrapped.acquire(tutorId, fixtureInput).artifact.hash, tutor.artifact.hash);
eq(inventoryStore.summary().calls, 0); inventoryStore.close();
const readActualRow = (owner, id) => {
  const row = source.prepare("SELECT input_hash,artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(owner, id);
  return row && { inputHash: row.input_hash, artifact: decode(row.artifact) };
};
const auditRecipe = reseal(actual.recipe, { checkpointInventoryBinding: inventoryBinding, continuation: continuation.manifest });
eq(auditFactionCheckpointExecutionRowsV1({ recipe: auditRecipe, rows: inventory.steps,
  readInheritedRow: readActualRow, readInventory: () => readFactionCheckpointInventoryV1(inventoryArgs) }).inheritedRows, inventory.steps.length);
assert.throws(() => auditFactionCheckpointExecutionRowsV1({ recipe: auditRecipe, rows: [tutor],
  readInheritedRow: () => null, readInventory: () => readFactionCheckpointInventoryV1(inventoryArgs) })); checks++;
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) })));
const reportBody = { version: 'faction_resume_reliability_readiness_v1', passed: true,
  inventoryBindingHash: inventoryBinding.hash, parsedValueBindingHash: parsedBinding.hash,
  actualHistoryReused: true, actualParsedProductionAndColdReaderPassed: true, restartNoResendPassed: true,
  restorationWindows: inventory.proof.restorationWindows, actualDshSessions: 1, providerCalls: 0,
  semanticAcceptance: false, trainingTruth: false, codeHashes };
const provisional = seal(reportBody), fields = factionResumeReliabilityRecipeV1(provisional);
const next = reseal(actual.recipe, { ...fields,
  codeHashes: [...actual.recipe.codeHashes.filter(r => !files.includes(r.file)), ...codeHashes] });
eq(validateFactionResumeReliabilityMigrationV1({ parent: actual.recipe, next, readiness: provisional }).accountingReset, false);
const recipe = reseal(next, { structuralJsonReviewOrigins: [actual.origin],
  continuation: seal({ parentRunId: actual.runId, parentRecipeHash: actual.recipe.hash, reusable: [] }),
  injectionTest: { directory, purpose: 'actual paid syntax-only response through production, restart and independent consumer' } });
const runId = 'faction-v1-' + recipe.hash.slice(0, 20), filename = directory + '/parsed.sqlite';
await mkdir(base + runId);
await writeFile(base + runId + '/recipe.json', JSON.stringify(recipe, null, 2), { flag: 'wx' });
const options = { runId, recipeHash: recipe.hash, maxCalls: 1 };
let journal = openProductionStore(filename, options), store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
const ancestors = []; let p = actual.recipe;
while (p) { ancestors.push(p); p = p.continuation ? await readRecipe(p.continuation.parentRunId) : null; }
const fixture = new DatabaseSync(filename);
for (const parent of ancestors) {
  const row = source.prepare('SELECT * FROM runs WHERE id=?').get('faction-v1-' + parent.hash.slice(0, 20));
  if (row) fixture.prepare('INSERT INTO runs VALUES(?,?,?,?,?)').run(row.id, row.recipe, row.cap, row.calls, row.token_cap);
}
const originAttempt = source.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(actual.runId, actual.origin.attemptId);
const capabilityHash = actual.authenticated.proof.invocation.capabilityReceiptHash;
const copyAttempt = row => fixture.prepare('INSERT INTO attempts VALUES(?,?,?,?,?,?,?,?,?,?)').run(row.run, row.id, row.request_hash,
  row.state, row.reserve, row.settled, row.usage, row.response, row.code, row.token_reserve);
copyAttempt(originAttempt);
const capabilityRows = source.prepare("SELECT * FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?").all(capabilityHash);
eq(capabilityRows.length, 1); copyAttempt(capabilityRows[0]);
const capability = decode(capabilityRows[0].response).capabilityReceipt;
for (const row of source.prepare("SELECT * FROM steps WHERE run=? AND state='complete' AND id LIKE ?").all(actual.runId, actual.origin.attemptId + '.%'))
  fixture.prepare('INSERT INTO steps VALUES(?,?,?,?,?,?,?,?)').run(row.run, row.id, row.input_hash, row.generation, row.owner, row.expires, row.state, row.artifact);
fixture.close();
const native = await prepareDshLoop(root, { sessionPolicy: 'phased-v1' });
let sessions = 0;
const dsh = { ...native, async run(q) { sessions++; return native.run(q); } };
const egressBinding = factionExecutionEgressV1(factionExecutionProfileV1({ binding: recipe.executionModelBinding }));
const reader = await createFactionParsedWireRecoveryReaderV2({ root, filename, runId, recipe });
const factory = () => createFactionStructuralReviewLaneV1({ root, filename, runId, recipe, input, store, dsh, executionPolicy,
  runtime: createFactionStructuredReviewRuntimeV1({ input, store, dsh, executionPolicy,
    providerAdapter: { complete: deny }, egressBinding, priceUsage: deny, runtime: { role: deny },
    capabilityReceipt: capability, outputContract: contract, includeSharedScenarioSources: true,
    reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding, reviewSourceExpansionBinding: recipe.reviewSourceExpansionBinding,
    parsedWireSchemaBridgeBinding: recipe.parsedWireSchemaBridgeBinding, parsedReviewValueBinding: recipe.parsedReviewValueBinding,
    readParsedWireRecovery: reader }) });
let value;
try { value = await factory().role(request); eq(sessions, 1); eq(journal.summary().calls, 0);
  eq(value.parsedReviewValues.length, 1); eq(value.structuredCandidateRef, undefined);
  eq(value.parsedReviewValues[0].authenticatedProof.hash, actual.authenticated.proof.hash);
} finally { journal.close(); }
journal = openProductionStore(filename, options); store = withProductionExecutionPolicyV1(journal, recipe.executionPolicyBinding);
try { eq((await factory().role(request)).hash, value.hash); eq(sessions, 1); eq(journal.summary().calls, 0); }
finally { journal.close(); }
const replay = openFactionProductionReplayV1({ filename, runId, recipe, ancestors, input }); let evidence;
try {
  const dependencies = await loadFactionStructuredReplayDependenciesV1({ root, recipe });
  const stack = await createFactionReplayRuntimeStackV1({ root, runId, recipe, input, replay, runtime: { role: deny }, dependencies });
  eq((await stack.runtime.role(request)).hash, value.hash);
  evidence = replay.evidence(); eq(evidence.actualProviderReceiptHashes, [actual.authenticated.proof.originalProviderReceiptHash]);
  eq(evidence.newProviderCalls, 0);
} finally { replay.close(); }
// Fault-injected composition test, NOT an actual paid origin: malformed JSON
// leaves a schema error, then the bounded schema correction itself needs
// syntax-only recovery. Both full contexts and independent scope checks stay.
const combinedFile = directory + '/combined-injected.sqlite';
const combinedJournal = openProductionStore(combinedFile, { runId, recipeHash: recipe.hash, maxCalls: 1 });
const proofs = new Map();
const injectedReader = async q => {
  if (!proofs.has(q.capsule.hash)) {
    const isInitial = q.capsule.hash === prepared.capsule.hash;
    const output = { ...actual.authenticated.proof.providerValue, ...(isInitial ? { Note: 'injected forbidden field' } : {}) };
    const validation = validate(contract.providerSchema, output), contextManifestRef = contextManifestRefStarcraftTmgV1(q.capsule);
    const proof = reseal(actual.authenticated.proof, { providerValue: output, validation, contextManifestRef,
      originAttemptId: 'structured-' + hash(q.capsule.hash).slice(0, 48), originalProviderReceiptHash: hash('injected receipt ' + q.capsule.hash),
      invocation: { ...actual.authenticated.proof.invocation, roleRef: q.capsule.roleRef, contextManifestRef },
      normalization: reseal(actual.authenticated.proof.normalization, { outputHash: hash(output),
        schemaPassed: validation.ok, localSchemaValidationHash: hash(validation) }) });
    proofs.set(q.capsule.hash, proof);
  }
  return { proof: proofs.get(q.capsule.hash) };
};
const combined = createFactionStructuredReviewRuntimeV1({ input, store: combinedJournal, dsh, executionPolicy,
  providerAdapter: { complete: deny }, egressBinding, priceUsage: deny, runtime: { role: deny },
  capabilityReceipt: capability, outputContract: contract, includeSharedScenarioSources: true,
  reviewSlotNamespaceBinding: recipe.reviewSlotNamespaceBinding,
  parsedWireSchemaBridgeBinding: recipe.parsedWireSchemaBridgeBinding, parsedReviewValueBinding: recipe.parsedReviewValueBinding,
  readParsedWireRecovery: injectedReader });
let composed;
try {
  composed = await combined.role(request);
  eq(composed.parsedWireRecoveries.length, 1); eq(composed.parsedReviewValues.length, 1);
  eq(composed.parsedWireRecoveries[0].correctedParsedReviewValueRef.hash, composed.parsedReviewValueRef.hash);
  eq((await combined.role(request)).hash, composed.hash); eq(combinedJournal.summary().calls, 0);
  const result = verifyFactionStructuredRoleReplayV1({ value: composed, roleInput: prepared.roleInput, request, input, recipe,
    resolveArtifact: deny, resolveResponse: deny,
    resolveParsedWireRecoveryAuthentication: (_value, contextHash) => proofs.get(contextHash) });
  eq(result.providerReceiptHashes.length, 2);
  for (const patch of [{ semanticAcceptance: true }, { parsedReviewValueRef: { hash: hash('unrelated') } },
    { structuredCandidateRef: { hash: hash('invented_native_success') } }, { runtimeAccepted: true }]) {
    assert.throws(() => verifyFactionStructuredRoleReplayV1({ value: reseal(composed, patch), roleInput: prepared.roleInput,
      request, input, recipe, resolveArtifact: deny, resolveResponse: deny,
      resolveParsedWireRecoveryAuthentication: (_value, contextHash) => proofs.get(contextHash) })); checks++;
  }
} finally { combinedJournal.close(); }
eq(hash(source.prepare('SELECT * FROM attempts WHERE run=?').all(actual.runId)), before); source.close();
const main = await readFile('scripts/run-ticket-18-faction-strategy-production-v1.mjs', 'utf8');
for (const text of ['...resumeRecipe', 'resumeReliability: resumeReadiness', 'withFactionCheckpointInventoryV1 as withCheckpointContinuation',
  'checkpointInventory: continuation.manifest.checkpointInventory', 'parsedReviewValueBinding: recipe.parsedReviewValueBinding']) {
  assert(main.includes(text)); checks++;
}
const report = seal({ ...reportBody, checks, directory, actualDshSessions: sessions, actualInventoryProofHash: inventory.proof.hash,
  actualRoleHash: value.hash, evidence, productionPreflightPassed: false, wrapperInputFixtureUsed: true,
  combinedSyntaxSchemaFaultInjectionPassed: true, injectedCompositionRoleHash: composed.hash });
await writeFile(base + 'resume-reliability-readiness-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, hash: report.hash, actualDshSessions: sessions, providerCalls: 0,
  actualHistoricalRoles: inventory.steps.length, actualParsedRoleHash: value.hash, productionPreflightPassed: false }));
