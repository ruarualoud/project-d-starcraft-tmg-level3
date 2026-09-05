import { DatabaseSync } from 'node:sqlite';
import { verifySeal, seal, hash, fail } from '../skill-production/common.mjs';

// Cross-protocol reuse is explicitly a draft import, NOT exact-input replay,
// inherited reviewer acceptance or an unbilled replacement Provider response.
export function readLegacyPacketSeeds({ filename, parentRunId, parentRecipe, plan, catalogue, modelHash, count = 5 }) {
  verifySeal(parentRecipe); verifySeal(plan); verifySeal(catalogue);
  if (parentRecipe.planHash !== plan.hash || parentRecipe.catalogueHash !== catalogue.hash
    || hash(parentRecipe.sourceBinding) !== hash(catalogue.sourceBinding) || parentRecipe.modelHash !== modelHash
    || parentRunId !== 'rules-v2-' + parentRecipe.hash.slice(0, 20)) fail('V3_SEED_SOURCE_OR_MODEL_DRIFT');
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('SELECT recipe FROM runs WHERE id=?').get(parentRunId)?.recipe !== parentRecipe.hash) fail('V3_SEED_RUN_DRIFT');
    if (db.prepare("SELECT count(*) AS n FROM attempts WHERE run=? AND state='intent'").get(parentRunId).n) fail('V3_SEED_AMBIGUOUS_PARENT');
    return plan.packets.slice(0, count).map(packet => {
      let selected;
      for (const suffix of ['candidate', 'schema-editor', 'generator']) {
        const id = packet.id + '.' + suffix;
        const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'").get(parentRunId, id);
        if (!row) continue;
        const envelope = verifySeal(JSON.parse(row.artifact)), artifact = verifySeal(envelope.value);
        const draft = suffix === 'candidate' ? artifact.draft : artifact.output;
        if (!draft?.claims) continue;
        if (suffix === 'candidate' && artifact.packetHash !== packet.hash) fail('V3_SEED_PACKET_DRIFT');
        selected = seal({ schema: 'starcraft_imported_untrusted_packet_seed_v3', packetId: packet.id, packetHash: packet.hash,
          sourceBinding: catalogue.sourceBinding, catalogueHash: catalogue.hash, parentRunId,
          parentRecipeHash: parentRecipe.hash, parentStep: id, parentEnvelopeHash: envelope.hash,
          parentArtifactHash: artifact.hash, draft, draftHash: hash(draft),
          semanticAcceptanceInherited: false, actualSourceReadsInherited: false, newFullContextReviewRequired: true,
          priorCallsRemainInGlobalLedger: true, runtimeAccepted: false, trainingTruth: false });
        break;
      }
      if (!selected) fail('V3_SEED_DRAFT_MISSING', { packetId: packet.id });
      return selected;
    });
  } finally { db.close(); }
}
