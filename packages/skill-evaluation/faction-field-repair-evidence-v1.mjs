import { DatabaseSync } from 'node:sqlite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { loadFrozenSkillEvidence, createEvidenceReader } from '../skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../skill-production-v3/context.mjs';
import { createProductionRuntimeV3 } from '../skill-production-v3/runtime.mjs';
import { repairFactionSectionFieldsV1 } from '../skill-production-v3/faction-field-repair-v1.mjs';
import { prepareDshLoop } from '../skill-production/loops.mjs';
import { openReadOnlyProductionReplayV1 } from './read-only-production-replay-v1.mjs';
import { seal, verifySeal, hash, sha256, fail } from '../skill-production/common.mjs';

export function compareFactionFieldReplayLoopsV1(original, replayed, delivery) {
  [original, replayed, delivery].forEach(verifySeal);
  const sessionLocalEvents = new Set(['agent/inbox/spliced', 'user/message', 'assistant/message']);
  const stable = loop => {
    const { hash: ignored, sandboxReceipt, transcript, events, ...body } = loop;
    return { ...body, transcript: transcript.map(({ observedHash, ...row }) => row),
      events: events.map(event => sessionLocalEvents.has(event.type)
        ? { ...event, dataHash: 'session_local_message_identity_not_replayed' } : event) };
  };
  if (!delivery.completeRequestsMatchedByHash || !delivery.rawResponsesMatchedByFingerprint
    || hash(original.transcript.map(t => t.receiptHash)) !== hash(delivery.receiptHashes)
    || hash(stable(original)) !== hash(stable(replayed))) fail('FACTION_FIELD_EVIDENCE_LOOP_DRIFT');
  return seal({ originalLoopHash: original.hash, exactProviderRequestHashesMatched: true,
    finalCommandsReceiptsToolsEventsAndRuntimeMatched: true,
    sessionLocalObservationHashesNotCompared: true, sessionLocalEventDataTypes: [...sessionLocalEvents],
    originalSandboxReceiptRetained: true, newProviderCalls: 0, trainingTruth: false });
}

// Rebuild the real request with the same pinned DSH and compare its exact hash
// to the paid attempt. No credentials, HTTP completion or writable DB exist.
export async function inspectFactionFieldRepairEvidenceV1({ root, runId }) {
  if (!/^field-repair-[a-f0-9]{20}$/.test(runId || '')) fail('FACTION_FIELD_EVIDENCE_ARGUMENTS');
  const base = path.join(root, 'build/ticket-18-faction-production-v1');
  const json = async name => verifySeal(JSON.parse(await readFile(path.join(base, name + '.json'), 'utf8')));
  const [recipe, report, candidate, sourceSection, input, knownRulePolicy] = await Promise.all([
    json(runId + '/recipe'), json(runId + '/report'), json(runId + '/candidate'), json(runId + '/source-section'),
    json('terran_armed_forces-input'), json('terran_armed_forces-known-rule-policy')]);
  if (recipe.version !== 'faction_field_repair_run_v1' || runId !== 'field-repair-' + recipe.hash.slice(0, 20)
    || report.runId !== runId || report.recipeHash !== recipe.hash || report.failure || !report.actualPatchProduced
    || report.candidateHash !== candidate.hash || recipe.inputHash !== input.hash
    || recipe.knownRulePolicyHash !== knownRulePolicy.hash || recipe.sectionResultHash !== sourceSection.hash
    || candidate.parentSectionResultHash !== sourceSection.hash || candidate.sourceReviewPassed
    || candidate.independentEvaluationPassed || candidate.runtimeAccepted || candidate.trainingTruth) fail('FACTION_FIELD_EVIDENCE_BINDING_DRIFT');
  const producerFile = 'packages/skill-production-v3/faction-field-repair-v1.mjs';
  if (recipe.codeHashes.find(c => c.file === producerFile)?.hash !== sha256(await readFile(path.join(root, producerFile))))
    fail('FACTION_FIELD_EVIDENCE_PRODUCER_DRIFT');
  const filename = path.join(root, 'build/ticket-17-production-redesign-v1/production.sqlite');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(recipe.sourceRunId)?.recipe !== recipe.sourceRecipeHash)
      fail('FACTION_FIELD_EVIDENCE_PARENT_DRIFT');
    const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
      .get(recipe.sourceRunId, sourceSection.section.id + '.result');
    if (!row || verifySeal(verifySeal(JSON.parse(row.artifact)).value).hash !== sourceSection.hash)
      fail('FACTION_FIELD_EVIDENCE_PARENT_DRIFT');
  } finally { db.close(); }
  const catalogue = await loadFrozenSkillEvidence(root), context = createGlobalProductionContext(catalogue);
  if (catalogue.hash !== recipe.catalogueHash || context.hash !== recipe.contextHash) fail('FACTION_FIELD_EVIDENCE_CONTEXT_DRIFT');
  const replay = openReadOnlyProductionReplayV1({ filename, runId, recipe, commandPolicy: 'production_tools' });
  let rebuilt, delivery, loopComparison, replayedRoles = 0;
  try {
    const dsh = await prepareDshLoop(root);
    if (dsh.binding.hash !== recipe.dshBindingHash) fail('FACTION_FIELD_EVIDENCE_DSH_DRIFT');
    const store = { ...replay.store, finish(lease, value) {
      if (value.roleId) {
        loopComparison = compareFactionFieldReplayLoopsV1(lease.saved.loop, value.loop, replay.evidence());
        // A new zero-egress sandbox has its own job ID/time receipt. Preserve
        // the original only after all request/command/tool/runtime fields match.
        const { hash: ignored, ...body } = value;
        value = seal({ ...body, loop: lease.saved.loop }); replayedRoles++;
      }
      return replay.store.finish(lease, value);
    } };
    const runtime = createProductionRuntimeV3({ store, reader: createEvidenceReader(catalogue), context,
      verifier: {}, model: replay.model, dsh });
    rebuilt = await repairFactionSectionFieldsV1({ input, sectionResult: sourceSection, knownRulePolicy, runtime, store });
    if (rebuilt.hash !== candidate.hash || rebuilt.plan.hash !== recipe.planHash) fail('FACTION_FIELD_EVIDENCE_RESULT_DRIFT');
    delivery = replay.evidence();
    if (replayedRoles !== 1 || !delivery.receiptHashes.length || delivery.matchedStepIds.length !== 2)
      fail('FACTION_FIELD_EVIDENCE_DENOMINATOR');
  } finally { replay.close(); }
  const evidence = seal({ version: 'actual_faction_field_repair_evidence_v1', runId, recipeHash: recipe.hash,
    sourceRunId: recipe.sourceRunId, sourceRecipeHash: recipe.sourceRecipeHash, sourceSectionHash: sourceSection.hash,
    inputHash: input.hash, knownRulePolicyHash: knownRulePolicy.hash, candidateHash: candidate.hash,
    planHash: candidate.plan.hash, parentDraftHash: candidate.patch.parentDraftHash, repairedDraftHash: candidate.patch.draftHash,
    delivery, loopComparison, actualProviderRequestsReplayed: true, actualProviderOutputReapplied: true,
    changedFields: candidate.patch.changes, unchangedRecommendationIndices: candidate.patch.unchangedRecommendationIndices,
    independentSourceReviewPassed: false, actualRoomReplayPerformed: false, runtimeAccepted: false,
    newProviderCalls: 0, trainingTruth: false });
  return { input, knownRulePolicy, sourceSection, candidate, evidence };
}
