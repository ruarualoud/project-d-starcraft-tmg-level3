import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { DatabaseSync } from 'node:sqlite';
import { hash, seal, verifySeal, fail } from '../packages/skill-production/common.mjs';
import { createFactionWritingPlanV1, createFactionReviewBatchPlanV1 } from '../packages/skill-production-v3/faction-strategy-workflow-v1.mjs';
import { createFactionReviewTargetsV1 } from '../packages/skill-production-v3/faction-review-targets-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from '../packages/skill-production-v3/faction-slot-review-runtime-v1.mjs';
import { createFactionReviewSchemaRepairContextCapsuleV1 } from '../packages/skill-production-v3/faction-review-context-capsule-v1.mjs';
import { verifyFactionStructuredReviewSchemaRepairScopeV1 } from '../packages/skill-production-v3/faction-structured-review-runtime-v1.mjs';
import { materializeFactionSlotReviewV1 } from '../packages/skill-production-v3/faction-review-slot-namespace-v1.mjs';

// Read the real paid failure and repair. No Provider, DSH, ledger mutation or
// shortened source context. --require-materializable is the red feedback loop.
const args = process.argv.slice(2);
assert(args.length === 0 || args.length === 1 && args[0] === '--require-materializable');
const runId = 'faction-v1-e35baf291d46af687809';
const firstId = 'structured-67644acbf8b1391d43179cf89cae2bd7a23ee30ee2248748';
const repairId = 'structured-6b514c78ccc815d4224adb4add808188556301ad932efdcc';
const base = 'build/ticket-18-faction-production-v1/';
const input = verifySeal(JSON.parse(await readFile(base + runId + '/zerg_swarm-input.json', 'utf8')));
const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
let report;
const started = performance.now();
try {
  if (db.prepare("SELECT count(*) n FROM attempts WHERE code='PROVIDER_PAYMENT_REQUIRED'").get().n)
    fail('API_BALANCE_EXHAUSTED_STOP_ALL_WORK');
  const row = id => db.prepare('SELECT * FROM attempts WHERE run=? AND id=?').get(runId, id);
  const artifact = id => verifySeal(JSON.parse(db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
    .get(runId, id).artifact)).value;
  const first = row(firstId), repair = row(repairId), before = hash([first, repair]);
  assert.equal(first.state, 'failed'); assert.equal(first.code, 'STRUCTURED_PROVIDER_SCHEMA_INVALID');
  assert.equal(repair.state, 'received'); assert.equal(repair.code, null);
  const rejected = artifact(firstId + '.rejected-candidate'), candidate = artifact(repairId + '.candidate');
  const response = verifySeal(JSON.parse(repair.response)).value;
  assert.equal(hash(response.output), hash(candidate.providerValue));
  assert.equal(candidate.providerReceiptHash, response.usageReceipt.receiptHash);
  const section = createFactionWritingPlanV1(input).sections.find(s => s.id === 'faction.zerg_swarm.unit_roles.2');
  const draft = artifact(section.id + '.known-rule-correction').draft;
  const batch = createFactionReviewBatchPlanV1({ section, draft }).batches.find(b => b.first === 4);
  const targets = createFactionReviewTargetsV1({ input, section, draft, indices: batch.reviewIndices });
  const packet = seal({ id: 'faction.zerg_swarm', inputHash: input.hash, sourceBinding: input.sourceBinding });
  const pending = db.prepare("SELECT id FROM steps WHERE run=? AND id LIKE ? AND state='pending'")
    .all(runId, packet.id + '.' + rejected.roleRef.id + '.source-evidence-v1.%');
  assert.equal(pending.length, 1);
  const request = { packet, roleId: pending[0].id.slice(packet.id.length + 1), workspace: {
    inputHash: input.hash, section, draft, reviewIndices: batch.reviewIndices,
    coverageRequiredSourceRefs: batch.requiredSourceRefs, outputRequestAtEnd: { targetContract: targets } } };
  const executionPolicy = { maxOutputUnits: 4096, attemptEstimateMicros: 800000, attemptTokenReserve: 500000,
    allowDefinitelyNotSentRetry: false, allowOneCapacityRetry: false, idempotentRetrySupported: false,
    encryptedRawQuarantineAvailable: false };
  const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
  assert.equal(prepared.capsule.hash, rejected.contextManifestRef.hash);
  const capsule = createFactionReviewSchemaRepairContextCapsuleV1({ capsule: prepared.capsule,
    rejectedCandidate: rejected, roleRef: candidate.roleRef });
  assert.equal(capsule.hash, candidate.contextManifestRef.hash);
  const providerRequest = { schemaVersion: 'starcraft_tmg_structured_provider_request_v1',
    requestId: repairId, roleRef: candidate.roleRef, instructions: capsule.instructions,
    input: capsule.compiledInput, outputContractRef: capsule.outputContractRef, maxOutputUnits: 4096 };
  assert.equal(hash(providerRequest), repair.request_hash);
  const scope = verifyFactionStructuredReviewSchemaRepairScopeV1({ rejectedCandidate: rejected, repairedOutput: candidate.providerValue });
  let materializationError = null;
  try { materializeFactionSlotReviewV1({ ...prepared.mapping, capsule, providerOutput: candidate.providerValue,
    reviewReasonMaximum: 16384, reviewSourceMaximum: 128 }); }
  catch (error) { materializationError = error.code || 'UNCLASSIFIED'; }
  const sourceCatalogue = capsule.localIssue.reviewTask.sourceCatalogue;
  const mentioned = (text, ref) => {
    const at = text.indexOf(ref);
    return at >= 0 && !/[A-Za-z0-9_.:-]/u.test(text[at - 1] || '')
      && !/[A-Za-z0-9_.:-]/u.test(text[at + ref.length] || '');
  };
  const details = candidate.providerValue.verdicts.map(v => ({ targetSlot: v.targetSlot, verdict: v.verdict,
    reasonHash: hash(v.reason), suppliedSlots: v.sourceSlots.map(slot => ({ slot,
      ...(sourceCatalogue.find(s => s.slot === slot) || { missingFromCatalogue: true }) })),
    explicitReasonSources: sourceCatalogue.filter(s => mentioned(v.reason, s.ref)).map(s => ({ ...s,
      slotReturned: v.sourceSlots.includes(s.slot) })) }));
  const invalid = details.flatMap(d => d.suppliedSlots.filter(s => s.missingFromCatalogue
    || s.includedAs === 'not_in_current_faction_scope').map(s => ({ targetSlot: d.targetSlot, ...s })));
  assert.equal(invalid.length, 1);
  const bad = invalid[0];
  assert(!sourceCatalogue.some(s => s.slot === 511));
  const probes = [];
  for (const mode of ['remove_only_excluded_slot', 'empty_source_array', 'replace_with_unknown_slot']) {
    const output = structuredClone(candidate.providerValue);
    const target = output.verdicts.find(v => v.targetSlot === bad.targetSlot);
    target.sourceSlots = mode === 'remove_only_excluded_slot' ? target.sourceSlots.filter(n => n !== bad.slot)
      : mode === 'empty_source_array' ? [] : target.sourceSlots.map(n => n === bad.slot ? 511 : n);
    let code = null;
    try { materializeFactionSlotReviewV1({ ...prepared.mapping, capsule, providerOutput: output,
      reviewReasonMaximum: 16384, reviewSourceMaximum: 128 }); }
    catch (error) { code = error.code || 'UNCLASSIFIED'; }
    probes.push({ mode, code, valueHash: hash(output), changedPath: '$.verdicts[0].sourceSlots',
      diagnosticOnly: true, validProductionRepair: false, paidArtifactChanged: false });
  }
  assert.equal(probes[0].code, null);
  assert.equal(probes[1].code, 'FACTION_REVIEW_SLOT_NAMESPACE_SCHEMA_INVALID');
  assert.equal(probes[2].code, 'FACTION_STRUCTURED_REVIEW_SOURCE_SLOT_INVALID');
  const frozenSource = input.frozenSources.prompt.sources.find(s => s.ref === bad.ref);
  assert(frozenSource); assert.equal(hash(frozenSource), bad.sourceHash);
  assert.equal(hash([row(firstId), row(repairId)]), before);
  report = seal({ version: 'native_source_slot_actual_diagnosis_v1', runId, firstId, repairId,
    originalAttemptsHash: before, originalContextHash: prepared.capsule.hash, repairContextHash: capsule.hash,
    repairedCandidateHash: candidate.hash, repairedOutputHash: hash(candidate.providerValue),
    actualRepairRequestHash: repair.request_hash, schemaRepairScope: scope,
    fullOriginalContextRebuilt: true, materializationError, details, isolatedInvalidSource: bad, probes,
    sourceAvailableInFrozenInput: true,
    sourceBodyDeliveredToOriginalReview: capsule.dependencyGraph.nodes.some(n => n.ref === bad.ref),
    originalAttemptsUnchanged: true, newProviderCalls: 0, actualDshSessions: 0,
    candidateModified: false, productionResumed: false, semanticAcceptance: false, trainingTruth: false });
} finally { db.close(); }
await writeFile(base + 'native-source-slot-diagnosis-v1.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify({ ...report, elapsedMs: Math.round(performance.now() - started) }));
if (args[0] === '--require-materializable') assert.equal(report.materializationError, null, 'ACTUAL_NATIVE_REVIEW_HOST_MAPPING_REJECTED');
