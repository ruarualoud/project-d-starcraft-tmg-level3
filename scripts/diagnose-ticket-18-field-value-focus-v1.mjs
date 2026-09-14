import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';
import { createStructuredFieldCodecV1 } from '../packages/structured-generation/field-codec-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V6 as contract }
  from '../content/skill-generation/ticket-18-faction-review-output-contract-v6.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { prepareFactionFieldValueFamilyV1, materializeFactionFieldValueCompletionV1 }
  from '../packages/skill-production-v3/faction-field-value-runtime-v1.mjs';
import { materializeFactionSlotReviewV1 } from '../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';

// Read-only reproduction from the actual paid input, not a reconstructed model
// answer. No Provider, DSH, journal write, or readiness-report replacement.
const probe = process.argv[2] === '--probe';
assert.equal(process.argv.length, probe ? 3 : 2);
const runId = 'faction-v1-ad241fedbb4116a1fcd4';
const controlId = 'faction-field-control-2fc646fe130e7276c255acd971636bcb';
const attemptId = 'structured-a18df3e2eb3053ed2a76de9ba47ad6cbded2cae35b1da1b3';
const filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
const base = 'build/ticket-18-faction-production-v1/' + runId + '/';
const json = async file => verifySeal(JSON.parse(await readFile(base + file + '.json', 'utf8')));
const [recipe, input] = await Promise.all([json('recipe'), json('zerg_swarm-input')]);
const db = new DatabaseSync(filename, { readOnly: true }), started = performance.now();
const decode = raw => verifySeal(JSON.parse(raw)).value;
const step = (run, id) => {
  const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(run, id);
  assert(row, 'Missing actual evidence: ' + id); return verifySeal(decode(row.artifact));
};
try {
  assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
  assert.equal(db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId).recipe, recipe.hash);
  const choice = step(controlId, 'round.0.choice');
  const paid = db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId);
  const before = hash(paid), paidBody = decode(paid.response), candidate = step(runId, attemptId + '.candidate');
  assert.equal(paid.state, 'received'); assert.equal(paid.request_hash, hash(choice.request));
  assert.equal(choice.request.requestId, attemptId); assert.equal(choice.ownerRunId, runId);
  assert.equal(hash(paidBody.output), hash(candidate.providerValue));
  const blocks = new Map(JSON.parse(choice.request.input).orderedBlocks.map(b => [b.kind, b.value]));
  const { section, completeCurrentDraft: draft } = blocks.get('current_section');
  const { reviewTask, fieldValueTask } = blocks.get('volatile_local_issue');
  const targets = verifySeal(reviewTask.targetContract);
  const originals = db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete' AND id LIKE '%.rejected-candidate'")
    .all(runId).map(r => ({ id: r.id, value: decode(r.artifact) }))
    .filter(r => r.value.hash === fieldValueTask.rejectedCandidateHash);
  assert.equal(originals.length, 1);
  const originalId = originals[0].id.slice(0, -'.rejected-candidate'.length);
  const evidence = readFactionTeachFailureEvidenceV1({ filename, runId, attemptId: originalId });
  const receipt = decode(evidence.attempt.response);
  const capabilities = db.prepare("SELECT response FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?")
    .all(receipt.capabilityReceiptHash).map(r => decode(r.response).capabilityReceipt);
  assert.equal(capabilities.length, 1);
  const transaction = recipe.reviewTransactionBindings.find(b => b.inputHash === input.hash);
  verifySeal(transaction);
  const request = { packet: seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding }),
    roleId: evidence.rejected.roleRef.id + '.source-evidence-v1.' + transaction.hash.slice(0, 20),
    workspace: { inputHash: input.hash, section, draft, reviewIndices: targets.targets.map(t => t.index),
      coverageRequiredSourceRefs: reviewTask.coverageSourceSlots.map(s => s.ref), outputRequestAtEnd: { targetContract: targets } } };
  const policy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false, encryptedRawQuarantineAvailable: false };
  const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy: policy });
  assert.equal(prepared.capsule.hash, fieldValueTask.originalContextHash);
  const { family, task } = prepareFactionFieldValueFamilyV1({ input, prepared,
    originalEvidence: { ...evidence, ownerRecipe: recipe, capability: capabilities[0] } });
  assert.equal(family.hash, choice.familyHash); assert.equal(task.context.hash, choice.contextHash);
  assert.equal(hash(task.context.compiledInput), hash(choice.request.input));
  const codec = createStructuredFieldCodecV1(task.contract);
  const values = codec.complete(codec.inspect(candidate.providerValue));
  const completed = createStructuredFieldCodecV1(contract).complete(task.inspection, values.value);
  const options = { ...prepared.mapping, input, capsule: prepared.capsule, providerOutput: completed.value,
    reviewReasonMaximum: 16384, reviewSourceMaximum: 128 };
  const commonRecovered = materializeFactionSlotReviewV1(options);
  const commonRepeated = materializeFactionSlotReviewV1(options);
  assert.equal(commonRepeated.receipt.hash, commonRecovered.receipt.hash);
  assert.equal(commonRecovered.receipt.version, 'faction_review_explicit_focus_path_materialization_v1');
  assert.equal(commonRecovered.receipt.strictMaterializationFailure, 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH');
  const recovered = materializeFactionFieldValueCompletionV1(options);
  const repeated = materializeFactionFieldValueCompletionV1(options);
  assert.equal(repeated.receipt.hash, recovered.receipt.hash);
  assert.equal(recovered.receipt.version, 'faction_field_value_focus_binding_materialization_v1');
  assert.equal(recovered.receipt.strictMaterializationFailure, 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH');
  assert.equal(recovered.receipt.proseUsedToInferAddress, false);
  assert.deepEqual(recovered.output.verdicts.map(v => ({ verdict: v.verdict, reason: v.reason, sourceRefs: v.sourceRefs })),
    completed.value.verdicts.map(v => ({ verdict: v.verdict, reason: v.reason,
      sourceRefs: v.sourceSlots.map(slot => prepared.capsule.localIssue.reviewTask.sourceCatalogue.find(s => s.slot === slot).ref) })));
  const findings = [];
  if (probe) for (const row of completed.value.verdicts) {
    const target = targets.targets[row.targetSlot];
    for (const focus of row.focus) {
      const field = target.fields.find(f => f.path === focus.path);
      if (field?.text.includes(focus.quote)) continue;
      findings.push({ targetSlot: row.targetSlot, index: target.index, path: focus.path, quote: focus.quote,
        actualField: field?.text, exactOtherFieldMatches: target.fields.filter(f => f.text.includes(focus.quote)).map(f => f.path),
        preservedVerdict: row.verdict });
    }
  }
  assert.equal(hash(db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, attemptId)), before);
  console.log(JSON.stringify({ reproduced: true, repetitions: 2, failure: 'FACTION_REVIEW_TARGET_QUOTE_MISMATCH',
    runId, originalId, attemptId, originalContextHash: prepared.capsule.hash, familyHash: family.hash,
    completedValueHash: hash(completed.value), actualPaidInputAuthenticated: true,
    originalNegativeJudgmentsRetained: completed.value.verdicts.filter(v => v.verdict !== 'supported').length,
    focusBindingRecovered: true, focusBindingReceiptHash: recovered.receipt.fieldBindingRecovery.hash,
    reboundOutputHash: hash(recovered.output), judgmentsChanged: false, proseUsedToInferAddress: false,
    originalAttemptUnchanged: true, providerCalls: 0, dshCalls: 0, artifactWrites: 0,
    elapsedMs: Math.round(performance.now() - started), ...(probe ? { findings } : {}) }));
} finally { db.close(); }
