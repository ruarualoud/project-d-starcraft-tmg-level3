import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1 }
  from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { authenticateFactionStructuralReviewV1 }
  from '../packages/skill-production-v3/faction-structural-json-environment-v1.mjs';
import { inspectFactionWireKeyHelperV2 }
  from '../packages/skill-production-v3/faction-wire-recovery-environment-v2.mjs';
import { AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 as parsedRecoveryBinding }
  from '../packages/structured-generation/authenticated-structural-json-recovery-v2.mjs';

assert.deepEqual(process.argv.slice(2), []);

const base = 'build/ticket-18-faction-production-v1/';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const runId = 'faction-v1-ad241fedbb4116a1fcd4';
const attemptId = 'structured-dc21495bc2f5471d2ab0127b5b32431e1aa5c949c37a31f5';
const db = new DatabaseSync(filename, { readOnly: true });
const ledgerHash = () => hash(db.prepare('SELECT * FROM attempts ORDER BY run,id').all());
const decode = raw => verifySeal(JSON.parse(raw)).value;
const artifact = id => decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
  .get(runId, id).artifact);
const json = async suffix => verifySeal(JSON.parse(await readFile(base + runId + '/' + suffix + '.json', 'utf8')));

try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  const before = ledgerHash();
  const ownerRecipe = await json('recipe');
  const input = await json('zerg_swarm-input');
  const issue = artifact(attemptId + '.wire-issue-v2');
  const origin = { runId, attemptId, issueHash: issue.hash };
  const draft = artifact('faction.zerg_swarm.phase_tempo.1.known-rule-correction').draft;
  const section = createFactionWritingPlanV1(input).sections.find(value => value.id === 'faction.zerg_swarm.phase_tempo.1');
  const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(value => value.first === 4);
  const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
  const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding });
  const request = { packet,
    roleId: issue.invocation.roleRef.id + '.source-evidence-v1.3cd990702ff2ba8b4acc',
    task: 'Reconstruct the exact complete original failed role, without any Provider send.',
    workspace: { inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
      coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
  const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false,
    idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
  const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
  assert.equal(prepared.capsule.hash, issue.invocation.contextManifestRef.hash);
  const helperRef = await inspectFactionWireKeyHelperV2();
  const authenticated = await authenticateFactionStructuralReviewV1({ filename, origin, ownerRecipe, prepared,
    executionPolicy, helperRef, parsedRecoveryBinding, recoveryTrust: null });
  assert.equal(ledgerHash(), before);
  console.log(JSON.stringify({ passed: true, runId, attemptId, issueHash: issue.hash,
    contextHash: prepared.capsule.hash, proofBindingHash: authenticated.proof.bindingHash,
    proofHash: authenticated.proof.hash, validationOk: authenticated.proof.validation.ok,
    validationIssueCodes: authenticated.proof.validation.issues.map(value => value.code),
    normalizationEditCount: authenticated.proof.normalization.edits.length,
    rawExpiresAt: issue.quarantineReceiptRef.expiresAt, accessReceiptIssued: Boolean(authenticated.accessReceiptHash),
    originalLedgerUnchanged: true, providerCalls: 0, rawBodyPrinted: false }));
} catch (error) {
  console.log(JSON.stringify({ passed: false, code: error.code || error.name,
    message: String(error.message || error).slice(0, 240), providerCalls: 0, rawBodyPrinted: false }));
  process.exitCode = 1;
} finally {
  db.close();
}
