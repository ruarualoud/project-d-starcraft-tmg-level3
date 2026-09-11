import { readFile } from "node:fs/promises";
import path from "node:path";

import { clone, fail, freeze, hash, seal, verifySeal } from
  "../skill-production/common.mjs";
import { loadPortableFoundationalStrategyPackV2 } from
  "./portable-foundational-skill-pack-loader-v2.mjs";

function portablePath(value) {
  const normalized = String(value || "");
  if (!normalized.startsWith("content/strategy-skills/")
    || normalized.includes("..") || normalized.startsWith("/")
    || normalized.startsWith("build/")) {
    fail("PORTABLE_STRATEGY_V3_PATH_INVALID", { path: normalized });
  }
  return normalized;
}

async function artifact(root, ref) {
  const relative = portablePath(ref.path);
  const value = verifySeal(JSON.parse(await readFile(path.join(root, relative), "utf8")));
  if (value.hash !== ref.hash) {
    fail("PORTABLE_STRATEGY_V3_ARTIFACT_HASH_MISMATCH", { path: relative });
  }
  return freeze({ ...clone(ref), artifact: value });
}

export async function loadPortableFoundationalStrategyPackV3(input = {}) {
  const manifest = verifySeal(clone(input.manifest));
  const predecessorManifest = verifySeal(clone(input.predecessorManifest));
  if (!path.isAbsolute(input.root || "")
    || manifest.schema !== "ticket18_portable_strategy_pack_manifest_v3"
    || manifest.gameId !== "starcraft-tmg"
    || manifest.predecessorManifest?.hash !== predecessorManifest.hash
    || manifest.predecessorManifest?.strictlyFrozen !== true
    || hash(manifest.sourceBinding) !== hash(predecessorManifest.sourceBinding)
    || manifest.selectionPolicy
      !== "exact_v2_foundational_parents_plus_exact_v3_fullmatch_candidates_no_highest_version"
    || manifest.automaticPromotion !== false
    || manifest.buildPathDependencies !== false
    || manifest.sourceRefreshPerformed !== false
    || manifest.runtimeAccepted !== false
    || manifest.eligibleForTraining !== false
    || manifest.trainingTruth !== false) {
    fail("PORTABLE_STRATEGY_V3_MANIFEST_INVALID");
  }
  const predecessor = await loadPortableFoundationalStrategyPackV2({
    root: input.root,
    manifest: predecessorManifest,
  });
  const fullMatch = manifest.fullMatchEvolution;
  const [episodes, reflection, positionEvaluations, promotionRecords,
    finalEvidence] = await Promise.all([
    artifact(input.root, fullMatch.episodes),
    artifact(input.root, fullMatch.reflection),
    artifact(input.root, fullMatch.positionEvaluations),
    artifact(input.root, fullMatch.promotionRecords),
    artifact(input.root, fullMatch.finalEvidence),
  ]);
  const candidates = await Promise.all(fullMatch.candidates.map((entry) =>
    artifact(input.root, entry)));
  if (episodes.artifact.episodes?.length !== 2
    || episodes.artifact.episodes.some((entry) =>
      entry.fullGameEvidence !== true
      || entry.hindsightBoundary?.outcomeAvailableToOriginalDecision !== false)
    || reflection.artifact.patches?.length !== 2
    || reflection.artifact.originalDecisionInputsRewritten !== false
    || positionEvaluations.artifact.evaluations?.length !== 2
    || positionEvaluations.artifact.evaluations.some((entry) =>
      entry.completeMatchCasesPassed !== entry.completeMatchCases
      || entry.independentHeldoutCasesPassed !== entry.independentHeldoutCases
      || entry.negativeControlHeldoutFailures < 1)
    || candidates.length !== 2
    || candidates.some((entry) => entry.artifact.skillId !== entry.skillId
      || !entry.artifact.version.endsWith("+skillopt.fullmatch.1")
      || entry.artifact.status !== "skillopt_candidate"
      || entry.artifact.skillOptAdvisories?.at(-1)?.decisionProtocol?.kind
        !== "position_aware_hold_v1"
      || entry.artifact.runtimeAccepted !== false)
    || promotionRecords.artifact.records?.length !== 2
    || promotionRecords.artifact.automaticPromotion !== false
    || promotionRecords.artifact.currentlyLive !== false
    || finalEvidence.artifact.status !== "passed"
    || finalEvidence.artifact.ticket18AcceptancePassed !== true
    || finalEvidence.artifact.fullGameStrategyEffectivenessProven !== false
    || hash(finalEvidence.artifact.candidateSkillHashes)
      !== hash(candidates.map((entry) => entry.artifact.hash))) {
    fail("PORTABLE_STRATEGY_V3_EVOLUTION_INVALID");
  }
  return freeze({
    manifest,
    predecessor,
    episodes,
    reflection,
    positionEvaluations,
    candidates,
    promotionRecords,
    finalEvidence,
    receipt: seal({
      schema: "portable_foundational_strategy_pack_load_receipt_v3",
      manifestHash: manifest.hash,
      predecessorManifestHash: predecessorManifest.hash,
      foundationalSkillHashes: predecessor.foundational.entries.map((entry) =>
        entry.skill.hash),
      fullMatchCandidateHashes: candidates.map((entry) => entry.artifact.hash),
      fullMatchEpisodeBundleHash: episodes.artifact.hash,
      positionEvaluationBundleHash: positionEvaluations.artifact.hash,
      finalEvidenceHash: finalEvidence.artifact.hash,
      buildPathDependencies: false,
      automaticPromotion: false,
      providerCalls: 0,
      sourceRefreshPerformed: false,
      runtimeAccepted: false,
      eligibleForTraining: false,
      trainingTruth: false,
    }),
  });
}
