import { DatabaseSync } from 'node:sqlite';
import { verifySeal, hash, seal, fail } from '../skill-production/common.mjs';
import { inspectOverallPacketCandidateV3 } from '../skill-evaluation/overall-rules-package-v3.mjs';
import { assertNoKnownExternalClaimFailure } from './external-findings.mjs';
import { createEvidenceReader } from '../skill-production/evidence.mjs';
import { createSourceAuditProbesV3, inspectSourceAuditProbeResultV3 } from '../skill-evaluation/source-audit-probes-v3.mjs';

// The next production phase may reuse reviewed packet content, not a bare
// boolean/report. Read the actual job journal and revalidate every artifact.
export function inspectCompletedRepair({ filename, recipe, report, plan, catalogue, context }) {
  [recipe, report, plan, catalogue, context].forEach(verifySeal);
  const runId = 'rules-v3-' + recipe.hash.slice(0, 20);
  if (report.runId !== runId || report.recipeHash !== recipe.hash || report.failure
    || recipe.planHash !== plan.hash || recipe.contextHash !== context.hash
    || report.planHash !== plan.hash || report.contextHash !== context.hash
    || report.processedPackets !== 5 || report.semanticallyPassedPackets !== 5
    || recipe.targetedPacketIds.join('|') !== plan.packets.slice(0, 5).map(p => p.id).join('|')) fail('V3_REPAIR_NOT_COMPLETE');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(runId)?.recipe !== recipe.hash) fail('V3_REPAIR_RECIPE_DRIFT');
    if (db.prepare("SELECT count(*) AS n FROM attempts WHERE run=? AND state='intent'").get(runId).n) fail('AMBIGUOUS_EGRESS_NO_RETRY');
    if (db.prepare("SELECT count(*) AS n FROM steps WHERE run=? AND state='running'").get(runId).n) fail('V3_REPAIR_STILL_RUNNING');
    const packets = plan.packets.slice(0, 5).map((packet, index) => {
      const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, packet.id + '.candidate');
      if (!row) fail('V3_REPAIR_PACKET_MISSING');
      const result = verifySeal(verifySeal(JSON.parse(row.artifact)).value);
      if (result.hash !== report.resultHashes[index]) fail('V3_REPAIR_REPORT_DRIFT');
      assertNoKnownExternalClaimFailure(db, result);
      inspectOverallPacketCandidateV3({ catalogue, packet, result, context });
      return result;
    });
    let externalAudit = null;
    if (recipe.version === 'v3-external-source-repair') {
      const probes = createSourceAuditProbesV3({ catalogue, reader: createEvidenceReader(catalogue) });
      if (recipe.probesHash !== probes.hash || !report.calibrationPassed || !report.externalProbePassed) fail('V3_EXTERNAL_PROBE_REQUIRED');
      const receipts = db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(runId)
        .map(row => verifySeal(JSON.parse(row.response)).value);
      const results = ['before', 'after'].map(label => {
        const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, 'external-audit-probes.' + label);
        if (!row) fail('V3_EXTERNAL_PROBE_MISSING');
        const result = inspectSourceAuditProbeResultV3(verifySeal(JSON.parse(row.artifact)).value, {
          probes, packetHashes: label === 'before' ? recipe.parentPacketHashes : packets.map(p => p.hash), label });
        if (result.hash !== report[label + 'ProbeHash']) fail('V3_EXTERNAL_PROBE_REPORT_DRIFT');
        let receipt = receipts.find(r => r.usageReceipt.receiptHash === result.receiptHash);
        // Exact-input before controls can be inherited without another paid
        // call. Resolve the original receipt, never manufacture a new attempt.
        if (!receipt && label === 'before' && recipe.continuation) {
          const continuation = verifySeal(recipe.continuation), id = 'external-audit-probes.before';
          const permit = continuation.reusable.find(p => p.id === id);
          const inherited = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(runId, 'inherited.' + id);
          const parentRow = db.prepare("SELECT artifact,input_hash FROM steps WHERE run=? AND id=? AND state='complete'").get(continuation.parentRunId, id);
          if (!permit || !inherited || !parentRow || parentRow.input_hash !== permit.inputHash
            || hash(verifySeal(JSON.parse(parentRow.artifact)).value) !== permit.artifactHash
            || permit.artifactHash !== hash(result)
            || db.prepare('SELECT recipe FROM runs WHERE id=?').get(continuation.parentRunId)?.recipe !== continuation.parentRecipeHash) fail('V3_EXTERNAL_PROBE_INHERITANCE_INVALID');
          const inheritedValue = verifySeal(JSON.parse(inherited.artifact)).value;
          if (inheritedValue.parentRecipeHash !== continuation.parentRecipeHash || inheritedValue.artifactHash !== permit.artifactHash) fail('V3_EXTERNAL_PROBE_INHERITANCE_INVALID');
          receipt = db.prepare("SELECT response FROM attempts WHERE run=? AND state='received'").all(continuation.parentRunId)
            .map(r => verifySeal(JSON.parse(r.response)).value).find(r => r.usageReceipt.receiptHash === result.receiptHash);
        }
        if (!receipt || hash(receipt.output.channels.skill.content) !== hash({ answers: result.answers.map(({ id, answer }) => ({ id, answer })) })) fail('V3_EXTERNAL_PROBE_RECEIPT_MISSING');
        return result;
      });
      externalAudit = { probesHash: probes.hash, beforeHash: results[0].hash, afterHash: results[1].hash,
        detectedKnownDefects: probes.negativeControlIds.length, passedAfterCases: results[1].correct };
    }
    return { packets, manifest: seal({ parentRunId: runId, parentRecipeHash: recipe.hash, parentReportHash: report.hash,
      planHash: plan.hash, contextHash: context.hash, packetHashes: packets.map(p => p.hash),
      verification: 'host_revalidated_full_source_inventory_two_reviews_and_issue_journal',
      repairedPackets: packets.length, remainingPackets: plan.packets.length - packets.length, externalAudit,
      independentContextsNotIndependentModels: true, actualRoomReplayPerformed: false,
      formalSkillsAccepted: 0, runtimeAccepted: false, trainingTruth: false }) };
  } finally { db.close(); }
}
