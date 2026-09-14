import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, sha256 } from '../packages/skill-production/common.mjs';
import { createFactionFieldRepairTaskV1 } from '../packages/skill-production-v3/faction-field-repair-task-v1.mjs';
import { createStructuredFieldCodecV1 } from '../packages/structured-generation/field-codec-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract } from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { verifyStarcraftTmgContextCapsuleV1 } from '../packages/structured-generation/context-capsule-v1.mjs';

const base = 'build/ticket-18-faction-production-v1/';
const proof = verifySeal(JSON.parse(await readFile(base + 'field-recovery-runtime-v1.json', 'utf8')));
assert.equal(proof.passed, true); assert.equal(proof.actualDshSessions, 1); assert.equal(proof.dshInjectionUsed, false);
for (const row of proof.codeHashes) assert.equal(sha256(await readFile(row.file)), row.hash);
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let checks = 0;
const eq = (a, b) => { assert.deepEqual(a, b); checks++; };
const rejects = (fn, code) => { assert.throws(fn, code ? { code } : undefined); checks++; };
const reseal = (v, patch) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...patch }); };
try {
  const snapshot = () => hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all()), before = snapshot();
  eq(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  const read = ref => {
    const row = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(ref.ownerRunId, ref.attemptId);
    eq(hash(row), ref.originalRowHash);
    const candidate = verifySeal(verifySeal(JSON.parse(db.prepare('SELECT artifact FROM steps WHERE run=? AND id=?')
      .get(ref.ownerRunId, ref.attemptId + '.rejected-candidate').artifact)).value);
    eq(candidate.hash, ref.rejectedCandidateHash); return candidate;
  };
  const original = read(proof.originalPaidEvidenceRefs[0]), paidRepair = read(proof.originalPaidEvidenceRefs[1]);
  const capsule = proof.prepared.capsule;
  verifyStarcraftTmgContextCapsuleV1(capsule);
  const task = createFactionFieldRepairTaskV1({ capsule, rejectedCandidate: original, contract });
  eq(task.inspection.jobs.map(job => job.pointer), ['/coverage']);
  eq(Object.keys(task.contract.providerSchema.properties), ['field0']);
  eq(task.context.kind, 'local_proof_capsule');
  eq(task.context.section, capsule.section); eq(task.context.dependencyGraph, capsule.dependencyGraph);
  eq(task.context.immutableBase, capsule.immutableBase); eq(task.context.omittedDomains, capsule.omittedDomains);
  eq(task.context.sourceIndexRef, capsule.sourceIndexRef); eq(task.context.expansionToolRef, capsule.expansionToolRef);
  eq(task.context.protectedFields.slice(0, capsule.protectedFields.length), capsule.protectedFields);
  eq(task.context.localIssue.fieldValueTask.originalValue, original.providerValue);
  eq(task.context.instructions.includes('Select at most eight'), false);
  eq(task.context.instructions.includes(task.compilation.instructions), true);
  eq(task.retryAuthorizationGranted, false); eq(task.capabilityRequiredBeforeSend, true);
  eq(task.semanticAcceptance, false); eq(task.context.fullContextFormatRetryAllowed, false);
  verifyStarcraftTmgContextCapsuleV1(task.context); checks++;
  const codec = createStructuredFieldCodecV1(contract);
  const prior = codec.complete(codec.inspect(paidRepair.providerValue));
  const replacements = { field0: prior.value.coverage };
  const merged = codec.complete(task.inspection, replacements);
  eq(merged.value, prior.value); eq(merged.value.verdicts, original.providerValue.verdicts);
  eq(merged.newModelValuesUsed, true); eq(merged.semanticAcceptance, false);
  eq(codec.verify({ originalValue: original.providerValue, completion: merged, replacements }).hash, merged.hash);
  rejects(() => codec.complete(task.inspection, { ...replacements, verdicts: [] }), 'FIELD_CODEC_REPLACEMENTS_INVALID');
  rejects(() => codec.complete(task.inspection, { field0: 'pretend complete' }), 'FIELD_CODEC_REPLACEMENTS_INVALID');
  rejects(() => createFactionFieldRepairTaskV1({ capsule, contract,
    rejectedCandidate: reseal(original, { contextManifestRef: { ...original.contextManifestRef, hash: hash('wrong') } }) }),
    'FACTION_FIELD_REPAIR_TASK_ORIGIN_DRIFT');
  rejects(() => createFactionFieldRepairTaskV1({ capsule, contract,
    rejectedCandidate: reseal(original, { validation: { ...original.validation, issues: [] } }) }),
    'FACTION_FIELD_REPAIR_TASK_ISSUE_DRIFT');
  eq(snapshot(), before);
  const files = ['packages/structured-generation/field-codec-v1.mjs',
    'packages/skill-production-v3/faction-field-repair-task-v1.mjs', 'scripts/verify-ticket-18-field-repair-task-v1.mjs'];
  const report = seal({ version: 'faction_field_repair_task_proof_v1', passed: true, checks,
    actualOriginalHash: original.hash, actualPaidRepairHash: paidRepair.hash,
    originalContextHash: capsule.hash, originalInputBytes: capsule.compiledInputBytes,
    repairContextHash: task.context.hash, repairInputBytes: task.context.compiledInputBytes,
    originalVerdictsPreserved: true, completeChapterAndSourcesPreserved: true,
    typedRepairContractHash: task.contract.contractHash, taskHash: task.hash,
    fullContextResentByThisTest: false, existingPaidValuesUsedNotNewGeneration: true,
    originalLedgerUnchanged: true, providerCalls: 0, semanticAcceptance: false,
    runtimeAccepted: false, trainingTruth: false, productionMainWired: false,
    codeHashes: await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(file)) }))) });
  await writeFile(base + 'field-repair-task-v1.json', JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report));
} finally { db.close(); }
