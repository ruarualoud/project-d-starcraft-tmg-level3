import { DatabaseSync } from 'node:sqlite';
import { verifySeal, hash, seal, fail } from '../skill-production/common.mjs';
import { inspectOverallPacketCandidateV3 } from '../skill-evaluation/overall-rules-package-v3.mjs';
import { assertNoKnownExternalClaimFailure } from './external-findings.mjs';

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
    return { packets, manifest: seal({ parentRunId: runId, parentRecipeHash: recipe.hash, parentReportHash: report.hash,
      planHash: plan.hash, contextHash: context.hash, packetHashes: packets.map(p => p.hash),
      verification: 'host_revalidated_full_source_inventory_two_reviews_and_issue_journal',
      repairedPackets: packets.length, remainingPackets: plan.packets.length - packets.length,
      independentContextsNotIndependentModels: true, actualRoomReplayPerformed: false,
      formalSkillsAccepted: 0, runtimeAccepted: false, trainingTruth: false }) };
  } finally { db.close(); }
}
