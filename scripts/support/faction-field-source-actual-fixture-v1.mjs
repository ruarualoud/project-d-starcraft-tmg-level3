import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal } from '../../packages/skill-production/common.mjs';
import { createFactionReviewTargetsV1 } from '../../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { FACTION_FIELD_VALUE_BINDING_V1 } from '../../packages/skill-production-v3/faction-field-value-runtime-v1.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';

// Rebuild the actual source-gap request from its durable full input, then match
// the original caller's exact lease/capsule. No fixture rewrites the paid DB.
export async function loadFactionFieldSourceActualFixtureV1() {
  const base = 'build/ticket-18-faction-production-v1/', filename = 'build/ticket-17-production-redesign-v1/production.sqlite';
  const runId = 'faction-v1-83c82df7434ebe9494d3';
  const json = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
  const recipe = await json(runId + '/recipe'), input = await json(runId + '/zerg_swarm-input');
  const db = new DatabaseSync(filename, { readOnly: true }), decode = raw => verifySeal(JSON.parse(raw)).value;
  try {
    assert.equal(db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n, 0);
    const records = [0, 1].map(round => verifySeal(decode(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
      .get('faction-field-control-ec5ad7ee544ab4b7f34a6c0f81e05057', 'round.' + round + '.record').artifact)));
    const providerInput = JSON.parse(records[0].choice.request.input);
    const block = name => providerInput.orderedBlocks.find(b => b.kind === name).value;
    const local = block('volatile_local_issue'), { section, completeCurrentDraft: draft } = block('current_section');
    const rejectedRows = db.prepare("SELECT id,artifact FROM steps WHERE run=? AND state='complete' AND id LIKE '%.rejected-candidate' AND json_extract(artifact,'$.value.contextManifestRef.hash')=?")
      .all(runId, local.fieldValueTask.originalContextHash);
    assert.equal(rejectedRows.length, 1);
    const rejected = decode(rejectedRows[0].artifact), attemptId = rejectedRows[0].id.replace(/\.rejected-candidate$/u, '');
    const reviewIndices = local.reviewTask.targetSlots.map(t => {
      const matches = draft.recommendations.flatMap((r, i) => hash(r) === t.recommendationHash ? [i] : []);
      assert.equal(matches.length, 1); return matches[0];
    });
    const requiredSourceRefs = local.reviewTask.coverageSourceSlots.map(row => row.ref);
    const targets = createFactionReviewTargetsV1({ input, section, draft, indices: reviewIndices });
    const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding });
    const roleRows = db.prepare('SELECT id,input_hash FROM steps WHERE run=? AND id LIKE ?')
      .all(runId, packet.id + '.' + rejected.roleRef.id + '.source-evidence-v1.%').filter(r => !r.id.endsWith('.field-values-v1'));
    assert.equal(roleRows.length, 1);
    const request = { packet, roleId: roleRows[0].id.slice(packet.id.length + 1),
      workspace: { inputHash: input.hash, section, draft, reviewIndices, coverageRequiredSourceRefs: requiredSourceRefs,
        outputRequestAtEnd: { targetContract: targets } } };
    const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy: FACTION_FIELD_VALUE_BINDING_V1.executionPolicy });
    assert.equal(prepared.capsule.hash, rejected.contextManifestRef.hash);
    assert.equal(hash(prepared.roleInput), roleRows[0].input_hash);
    const evidence = readFactionTeachFailureEvidenceV1({ filename, runId, attemptId });
    const receipt = decode(evidence.attempt.response);
    const caps = db.prepare("SELECT response FROM attempts WHERE state='received' AND json_extract(response,'$.value.capabilityReceipt.receiptHash')=?")
      .all(receipt.capabilityReceiptHash);
    assert.equal(caps.length, 1);
    const originalEvidence = { ...evidence, ownerRecipe: recipe, capability: decode(caps[0].response).capabilityReceipt };
    const ancestors = []; let current = recipe;
    while (current) { ancestors.push(current); current = current.continuation ? await json(current.continuation.parentRunId + '/recipe') : null; }
    return { filename, runId, recipe, input, request, prepared, originalEvidence, records, ancestors,
      allowedRunIds: ancestors.map(r => 'faction-v1-' + r.hash.slice(0, 20)), dshBindingHash: recipe.dshBindingHash };
  } finally { db.close(); }
}
