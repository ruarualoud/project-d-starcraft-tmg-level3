#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 } from
  "../content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs";
import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V3 } from
  "../content/skill-generation/ticket-18-portable-strategy-pack-v3.mjs";
import { loadPortableFoundationalStrategyPackV3 } from
  "../packages/strategy-skills/portable-foundational-skill-pack-loader-v3.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const loaded = await loadPortableFoundationalStrategyPackV3({
  root: ROOT,
  manifest: STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V3,
  predecessorManifest: STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2,
});

console.log(JSON.stringify({
  ok: true,
  manifestHash: loaded.manifest.hash,
  predecessorManifestHash: loaded.predecessor.manifest.hash,
  foundationalSkills: loaded.receipt.foundationalSkillHashes.length,
  fullMatchCandidates: loaded.receipt.fullMatchCandidateHashes.length,
  completeMatchEpisodes: loaded.episodes.artifact.episodes.length,
  independentPositionEvaluations:
    loaded.positionEvaluations.artifact.evaluations.length,
  ticket18AcceptancePassed:
    loaded.finalEvidence.artifact.ticket18AcceptancePassed,
  activeCandidateVersions: 0,
  automaticPromotion: loaded.receipt.automaticPromotion,
  buildPathDependencies: loaded.receipt.buildPathDependencies,
  providerCalls: loaded.receipt.providerCalls,
}, null, 2));
