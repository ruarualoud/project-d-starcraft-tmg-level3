import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFactionReviewTransactionBindingV1 } from '../packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs';
import { validateFactionReviewTransactionMigrationV1 } from '../packages/skill-production-v3/faction-review-transaction-migration-v1.mjs';
import { inspectFactionContinuationV1 } from '../packages/skill-production-v3/faction-continuation-v1.mjs';
import { seal, verifySeal, hash, sha256 } from '../packages/skill-production/common.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = path.join(root, 'build/ticket-18-faction-production-v1');
const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
const json = async n => verifySeal(JSON.parse(await readFile(path.join(base, n + '.json'), 'utf8')));
const reseal = (v, fields) => { const { hash: ignored, ...body } = v; return seal({ ...body, ...fields }); };
const parentRunId = 'faction-v1-182042133d7ba5b21c2a', phaseRun = 'phase-repair-bd58d5270d852324f694';
const parent = await json(parentRunId + '/recipe'), parentReport = await json(parentRunId + '/report');
const inputs = await Promise.all(['terran_armed_forces', 'zerg_swarm'].map(n => json(n + '-input')));
const phaseFieldSeed = { sourceSection: await json(phaseRun + '/source-section'), candidate: await json(phaseRun + '/candidate'),
  evidence: await json(phaseRun + '/verified-evidence'), capture: await json(phaseRun + '/source-capture') };
const bindings = inputs.map((input, index) => createFactionReviewTransactionBindingV1({ input, phaseFieldSeed: index ? null : phaseFieldSeed }));
const readiness = await json('review-transaction-readiness');
const actualEvidence = await json(readiness.actualRecheckRunId + '/verified-evidence');
const newFiles = ['packages/skill-production-v3/faction-review-transaction-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-transaction-migration-v1.mjs',
  'packages/skill-production-v3/faction-source-dependency-context-v1.mjs',
  'packages/skill-production-v3/faction-repair-regression-guard-v1.mjs'];
const sourceCorrectionMigration = await Promise.all(['source-field-repair-v2-readiness', 'source-field-dsh-v2-readiness',
  'source-repair-workflow-v2-readiness', 'command-envelope-readiness'].map(json));
const unitRoleRepairMigration = await Promise.all(['unit-role-field-repair-readiness', 'unit-role-repair-workflow-readiness',
  'unit-role-field-dsh-readiness'].map(json));
const additionalCommandRecoveryMigration = await Promise.all((parent.additionalCommandRecoveryBindings || [])
  .map(b => json(b.parentRunId + '/review-metadata-recovery-readiness')));
const budgetExtensionReadiness = await json('budget-extension-readiness');
const files = [...new Set([...parent.codeHashes.map(c => c.file), ...newFiles])];
const codeHashes = await Promise.all(files.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) })));
const next = reseal(parent, { codeHashes, reviewTransactionBindings: bindings,
  reviewTransactionReadinessHash: readiness.hash, reviewTransactionEvidenceHash: actualEvidence.hash,
  sourceCorrectionReadinessHashes: sourceCorrectionMigration.map(g => g.hash),
  ...(additionalCommandRecoveryMigration.length ? { additionalCommandRecoveryReadinessHashes: additionalCommandRecoveryMigration.map(g => g.hash) } : {}),
  budgetExtensionReadinessHash: budgetExtensionReadiness.hash });
const args = { parent, next, readiness, actualEvidence };
let checks = 0;
function check(fn) { fn(); checks++; }
function rejects(fields, code) { check(() => assert.throws(() => validateFactionReviewTransactionMigrationV1({ ...args, ...fields }), { code })); }
const invalid = 'FACTION_REVIEW_TRANSACTION_MIGRATION_PROOF_INVALID';
check(() => assert.equal(validateFactionReviewTransactionMigrationV1({ parent, next: parent }), null));
const proof = validateFactionReviewTransactionMigrationV1(args);
check(() => assert.deepEqual(proof.bindingHashes, bindings.map(b => b.hash)));
rejects({ readiness: null }, 'FACTION_REVIEW_TRANSACTION_PROOF_MISSING');
rejects({ actualEvidence: null }, 'FACTION_REVIEW_TRANSACTION_PROOF_MISSING');
rejects({ parent: next, next: parent }, 'FACTION_REVIEW_TRANSACTION_BINDINGS_CHANGED');
for (const fields of [{ passed: false }, { fullOldWorkflowReplayed: false }, { oldRequestsUnchangedBeforeIntervention: false },
  { newReviewNamespaces: false }, { badEditBlockedBeforeApplicationAndBeforeNextReview: false },
  { blockedRawEditAndReceiptPersisted: false }, { modelReviewAcceptanceNotInherited: false },
  { originalRevisionBudgetPreserved: false }, { newProviderCalls: 1 }, { inputHashes: [hash('foreign')] },
  { bindingHashes: [hash('foreign')] }]) {
  const changed = reseal(readiness, fields);
  rejects({ readiness: changed, next: reseal(next, { reviewTransactionReadinessHash: changed.hash }) }, invalid);
}
for (const fields of [{ actualProviderRequestsMatched: false }, { partialReviewNotSectionAcceptance: false },
  { loops: [] }, { newProviderCalls: 1 }, { trainingTruth: true }, { inputHash: hash('foreign') },
  { delivery: { ...actualEvidence.delivery, completeRequestsMatchedByHash: false } },
  { delivery: { ...actualEvidence.delivery, rawResponsesMatchedByFingerprint: false } }]) {
  const changed = reseal(actualEvidence, fields);
  const gate = reseal(readiness, { actualRecheckEvidenceHash: changed.hash });
  rejects({ actualEvidence: changed, readiness: gate, next: reseal(next, {
    reviewTransactionEvidenceHash: changed.hash, reviewTransactionReadinessHash: gate.hash }) }, invalid);
}
for (const fields of [{ guardBeforePatchApplication: false }, { revisionBudgetReset: true },
  { modelNegativeJudgmentWaived: true }, { contextHash: hash('foreign') }]) {
  const changed = bindings.map((b, n) => n ? b : reseal(b, fields));
  const gate = reseal(readiness, { bindingHashes: changed.map(b => b.hash) });
  rejects({ readiness: gate, next: reseal(next, { reviewTransactionBindings: changed, reviewTransactionReadinessHash: gate.hash }) }, invalid);
}
rejects({ next: reseal(next, { codeHashes: codeHashes.map(c => c.file === newFiles[0] ? { ...c, hash: hash('foreign') } : c) }) }, invalid);
// Real terminal parent, read-only journal: all older migrations are still
// checked. This proof never copies attempts or alters the original start.
const continuationArgs = { filename, parentRunId, parent, parentReport, next,
  correctionMigration: await json('targeted-corrections-readiness'),
  fieldRepairMigration: { binding: parent.fieldRepairBinding, readiness: await json('field-seed-readiness') },
  phaseSeedMigration: { binding: parent.phaseFieldBinding, readiness: await json('phase-field-seed-readiness') },
  unitRoleRepairMigration, sourceCorrectionMigration, additionalCommandRecoveryMigration,
  budgetExtensionReadiness, reviewTransactionMigration: { readiness, actualEvidence } };
const continuation = inspectFactionContinuationV1(continuationArgs);
const db = new DatabaseSync(filename, { readOnly: true });
let attempts, began;
try {
  attempts = db.prepare('SELECT usage,settled,reserve,state,token_reserve FROM attempts WHERE run=?').all(parentRunId);
  began = verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id='production-start'").get(parentRunId).artifact)).value.began;
} finally { db.close(); }
const inherited = parent.continuation.accounting;
const expected = { calls: inherited.calls + attempts.length,
  costMicros: inherited.costMicros + attempts.reduce((n, a) => n + (a.settled ?? a.reserve), 0),
  tokens: inherited.tokens + attempts.reduce((n, a) => n + (a.usage ? verifySeal(JSON.parse(a.usage)).value.totalUnits
    : a.state === 'not_sent' ? 0 : a.token_reserve), 0) };
check(() => assert.deepEqual(continuation.manifest.accounting, expected));
check(() => assert.equal(continuation.manifest.parentStart, began));
check(() => assert.equal(began, parent.continuation.parentStart));
check(() => assert.equal(continuation.manifest.parentRunId, parentRunId));
check(() => assert(continuation.manifest.reusable.length > 0));
check(() => assert(continuation.steps.every(s => s.artifact.roleId === s.id && s.artifact.loop.transcript)));
for (const fields of [{ modelHash: hash('foreign') }, { contextHash: hash('foreign') },
  { sourceBinding: { foreign: true } }, { inputHashes: [hash('foreign')] }])
  check(() => assert.throws(() => inspectFactionContinuationV1({ ...continuationArgs, next: reseal(next, fields) }),
    { code: 'FACTION_CONTINUATION_CONTRACT_DRIFT' }));
check(() => assert.throws(() => inspectFactionContinuationV1({ ...continuationArgs,
  next: reseal(next, { limits: { ...next.limits, maxRevisions: 4 } }) }), { code: 'FACTION_BUDGET_EXTENSION_LIMIT_DRIFT' }));
check(() => assert.throws(() => inspectFactionContinuationV1({ ...continuationArgs, next: reseal(next, {
  codeHashes: [...next.codeHashes, { file: 'unrelated-model-change.mjs', hash: hash('foreign') }] }) }),
  { code: 'FACTION_CONTINUATION_DEPENDENCY_DRIFT' }));
const reportFiles = [...newFiles, 'packages/skill-production-v3/faction-continuation-v1.mjs',
  'scripts/verify-ticket-18-faction-review-transaction-migration-v1.mjs'];
const report = seal({ passed: true, checks, parentRunId, proof, parentStart: began,
  inheritedAccounting: expected, reusableRoles: continuation.manifest.reusable.length,
  originalStartAndAllAncestorCostsPreserved: true, unrelatedChangesRejected: true,
  productionJournalMutated: false, newProviderCalls: 0, trainingTruth: false,
  codeHashes: await Promise.all(reportFiles.map(async file => ({ file, hash: sha256(await readFile(path.join(root, file))) }))) });
await writeFile(path.join(base, 'review-transaction-migration-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks, parentRunId, parentStart: began,
  inheritedAccounting: expected, reusableRoles: report.reusableRoles, newProviderCalls: 0, hash: report.hash }));
