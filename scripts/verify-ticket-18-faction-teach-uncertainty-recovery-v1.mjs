import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hash, seal, verifySeal, sha256, fail } from '../packages/skill-production/common.mjs';
import { factionRoleWorkspaceV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { produceFactionTeachRecoveryV1 } from '../packages/skill-production-v3/faction-teach-recovery-v1.mjs';
import { applyFactionTeachOutputBudgetV1 } from '../packages/skill-production-v3/faction-teach-output-budget-v1.mjs';
import { prepareFactionStructuredTeachV1 } from '../packages/skill-production-v3/faction-structured-teach-runtime-v1.mjs';
import { materializeMissingTeachUncertaintyV1, runTeachUncertaintyImportV1,
  verifyTeachUncertaintyImportedRoleV1,
  withFactionTeachUncertaintyRecoveryV1,
  FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1, TEACH_UNCERTAINTY_UNKNOWN_MARKER_V1 } from '../packages/skill-production-v3/faction-teach-uncertainty-recovery-v1.mjs';
import { prepareDshLoop } from '../packages/skill-production/loops.mjs';
import { verifyFactionStructuredRoleReplayV1 } from '../packages/skill-evaluation/faction-structured-replay-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), base = path.join(root, 'build/ticket-18-faction-production-v1');
const runId = 'faction-v1-54e27ea11ecf1082df30', attemptId = 'structured-1005a1ab7ea49392272b64d2413c928e8e87468916f20af2';
const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '.json'), 'utf8')));
const input = await json('zerg_swarm-input'), recipe = await json(runId + '/recipe');
const db = new DatabaseSync(path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'), { readOnly: true });
const artifact = id => verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?').get(runId, id).artifact)).value;
let attempt, issue, rejected;
try { attempt = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
  issue = artifact(attemptId + '.issue'); rejected = artifact(attemptId + '.rejected-candidate'); }
finally { db.close(); }
const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
  allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
let prepared, originalRequest, budgetedRequest;
await assert.rejects(produceFactionTeachRecoveryV1({ input,
  recovery: recipe.teachRecoveryBindings.find(r => r.inputHash === input.hash),
  role: async (roleId, instruction, workspace) => {
    originalRequest = { packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash,
      sourceBinding: input.sourceBinding }), roleId, instruction, workspace: { ...factionRoleWorkspaceV1(input), ...workspace }, maxOutput: 4096 };
    const request = budgetedRequest = applyFactionTeachOutputBudgetV1(originalRequest, recipe.teachOutputBudgetBinding);
    prepared = prepareFactionStructuredTeachV1({ input, request, executionPolicy });
    fail('FIXTURE_STOP_AFTER_CAPTURE');
  } }), { code: 'FIXTURE_STOP_AFTER_CAPTURE' });
assert.equal(prepared.contextManifestRef.hash, rejected.contextManifestRef.hash);
const args = { input, prepared, attempt, issue, rejected };
const materialization = materializeMissingTeachUncertaintyV1(args);
assert.deepEqual(materialization.output.lesson, rejected.providerValue.lesson);
assert.equal(materialization.originalLessonHash, hash(rejected.providerValue.lesson));
assert.deepEqual(materialization.output.uncertainties, [TEACH_UNCERTAINTY_UNKNOWN_MARKER_V1]);
assert.equal(materialization.originalUsage.outputUnits, 987);
assert.equal(materialization.providerCalls, 0);
assert.equal(materialization.independentUncertaintyAssessmentCompleted, false);
assert.equal(materialization.fieldProvenance.uncertainties, 'host_unknown_marker_not_model_analysis');
let checks = 8;
const reseal = (v, delta) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...delta }); };
for (const delta of [{ attempt: { ...attempt, state: 'intent' } }, { attempt: { ...attempt, code: 'STRUCTURED_PROVIDER_INCOMPLETE' } },
  { prepared: { ...prepared, contextManifestRef: { ...prepared.contextManifestRef, hash: hash('foreign') } } },
  { issue: reseal(issue, { safeReceiptHash: hash('foreign') }) },
  { rejected: reseal(rejected, { providerValue: { lesson: ['altered'] } }) },
  { rejected: reseal(rejected, { providerValue: { ...rejected.providerValue, uncertainties: [] } }) }]) {
  assert.throws(() => materializeMissingTeachUncertaintyV1({ ...args, ...delta }), { code: 'FACTION_TEACH_UNCERTAINTY_RECOVERY_EVIDENCE_INVALID' }); checks++;
}
const dsh = await prepareDshLoop(root);
const imported = await runTeachUncertaintyImportV1({ prepared, materialization, dsh });
assert.equal(imported.loop.calls, 1); checks++;
assert.deepEqual(imported.output.lesson, rejected.providerValue.lesson); checks++;
assert.equal(imported.providerCalls, 0); checks++;
assert.equal(imported.semanticAcceptance, false); checks++;
assert.equal(imported.loop.runtimeBinding.hash, dsh.binding.hash); checks++;
assert.deepEqual(verifyTeachUncertaintyImportedRoleV1({ value: imported, prepared, evidence: { attempt, issue, rejected },
  input, dshBindingHash: dsh.binding.hash }).providerReceiptHashes, [materialization.originalFailureReceiptHash]); checks++;
await assert.rejects(runTeachUncertaintyImportV1({ prepared: { ...prepared, roleInput: { changed: true } }, materialization, dsh }),
  { code: 'FACTION_TEACH_UNCERTAINTY_IMPORT_DRIFT' }); checks++;
const loaded = readFactionTeachFailureEvidenceV1({ filename: path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite'),
  runId, fullRoleId: prepared.fullRoleId, failureReceiptHash: materialization.originalFailureReceiptHash });
assert.equal(loaded.rejected.hash, rejected.hash); checks++;
let stored = null, delegated = 0, importsRun = 0;
const store = { acquire(id, value) { assert.equal(id, prepared.fullRoleId); assert.equal(hash(value), hash(prepared.roleInput));
  return stored ? { cached: true, artifact: stored } : { cached: false }; },
finish(_lease, value) { stored = value; return value; }, release() {} };
const cachedDsh = { async run(args) { importsRun++; const returned = await args.callModel();
  assert.equal(returned.receiptHash, materialization.hash); return imported.loop; } };
const wrapped = withFactionTeachUncertaintyRecoveryV1({ input, store, executionPolicy, dsh: cachedDsh,
  importedEvidence: [loaded], runtime: { role() { delegated++; throw new Error('must not regenerate'); } } });
assert.equal((await wrapped.role(budgetedRequest)).hostMaterialization.hash, materialization.hash); checks++;
assert.equal((await wrapped.role(budgetedRequest)).hash, stored.hash); checks++;
assert.equal(importsRun, 1); assert.equal(delegated, 0); checks += 2;
const proof = verifyFactionStructuredRoleReplayV1({ value: stored, roleInput: prepared.roleInput, request: originalRequest, input,
  recipe: { ...recipe, teachUncertaintyRecoveryBinding: FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1 },
  resolveTeachFailureEvidence: () => loaded });
assert.deepEqual(proof.providerReceiptHashes, [materialization.originalFailureReceiptHash]); checks++;
stored = null;
const liveFailure = withFactionTeachUncertaintyRecoveryV1({ input, store, executionPolicy, dsh: cachedDsh,
  runtime: { role() { throw Object.assign(new Error('schema'), { code: 'STRUCTURED_PROVIDER_SCHEMA_INVALID',
    safeReceipt: { receiptHash: materialization.originalFailureReceiptHash } }); } },
  readCurrentFailure: ({ failureReceiptHash }) => { assert.equal(failureReceiptHash, materialization.originalFailureReceiptHash); return loaded; } });
assert.equal((await liveFailure.role(budgetedRequest)).hostMaterialization.hash, materialization.hash); checks++;
for (const code of ['PROVIDER_PAYMENT_REQUIRED', 'STRUCTURED_PROVIDER_INCOMPLETE', 'AMBIGUOUS_EGRESS_NO_RETRY']) {
  const blocked = withFactionTeachUncertaintyRecoveryV1({ input, store, executionPolicy,
    runtime: { role() { throw Object.assign(new Error(code), { code }); } },
    readCurrentFailure: () => { throw new Error('must not recover'); } });
  await assert.rejects(blocked.role(budgetedRequest), { code }); checks++;
}
const dry = withFactionTeachUncertaintyRecoveryV1({ input, executionPolicy, dry: true,
  runtime: { role: r => r }, importedEvidence: [loaded] });
assert.equal(await dry.role(budgetedRequest), budgetedRequest); checks++;
const other = { roleId: 'not-teach' };
assert.equal(await dry.role(other), other); checks++;
const files = ['packages/skill-production-v3/faction-teach-uncertainty-recovery-v1.mjs',
  'packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'scripts/verify-ticket-18-faction-teach-uncertainty-recovery-v1.mjs'];
const report = seal({ passed: true, checks, binding: FACTION_TEACH_UNCERTAINTY_RECOVERY_BINDING_V1,
  originRunId: runId, originAttemptId: attemptId, inputHash: input.hash, materialization, imported,
  actualDshSessions: 1, providerCalls: 0, originalLessonCount: rejected.providerValue.lesson.length,
  actualRequestContextRebuilt: true, originalBillingPreserved: true,
  actualStructuredConsumerReplayPassed: true, productionWrapperTested: true,
  sourceOrUncertaintyAnalysisAccepted: false, productionWiringChanged: false,
  sourceRefreshPerformed: false, trainingTruth: false,
  codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
await writeFile(path.join(base, 'teach-uncertainty-recovery-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, actualDshSessions: 1, providerCalls: 0,
  materializationHash: materialization.hash, originalLessonCount: report.originalLessonCount, hash: report.hash }));
