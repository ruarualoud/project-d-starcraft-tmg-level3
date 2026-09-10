import { readFile } from "node:fs/promises";
import path from "node:path";

import { clone, fail, freeze, seal, verifySeal } from
  "../skill-production/common.mjs";
import { loadFormalFoundationalStrategyPackV1 } from
  "./formal-foundational-skill-pack-loader-v1.mjs";

function portablePath(value, root) {
  const normalized = String(value || "");
  if (!normalized.startsWith(`${root}/`)
    || normalized.includes("..")
    || normalized.startsWith("/")
    || normalized.startsWith("build/")) {
    fail("PORTABLE_STRATEGY_PATH_INVALID", { path: normalized });
  }
  return normalized;
}

async function artifact(root, ref, contentRoot) {
  const relative = portablePath(ref.path, contentRoot);
  const value = verifySeal(JSON.parse(await readFile(path.join(root, relative), "utf8")));
  if (value.hash !== ref.hash) {
    fail("PORTABLE_STRATEGY_ARTIFACT_HASH_MISMATCH", { path: relative });
  }
  return freeze({ ...clone(ref), artifact: value });
}

export async function loadPortableFoundationalStrategyPackV2(input = {}) {
  const manifest = verifySeal(clone(input.manifest));
  if (!path.isAbsolute(input.root || "")
    || manifest.schema !== "ticket18_portable_strategy_pack_manifest_v2"
    || manifest.gameId !== "starcraft-tmg"
    || manifest.entries?.length !== 5
    || manifest.selectionPolicy
      !== "exact_portable_manifest_only_no_build_path_no_highest_version"
    || manifest.buildPathDependencies !== false
    || manifest.sourceRefreshPerformed !== false
    || manifest.runtimeAccepted !== false
    || manifest.trainingTruth !== false) {
    fail("PORTABLE_STRATEGY_MANIFEST_INVALID");
  }
  for (const entry of manifest.entries) {
    portablePath(entry.skillPath, manifest.contentRoot);
    portablePath(entry.qualificationPath, manifest.contentRoot);
  }
  const v1Bridge = seal({
    schema: "ticket18_foundational_strategy_pack_manifest_v1",
    gameId: manifest.gameId,
    sourceBinding: clone(manifest.sourceBinding),
    entries: clone(manifest.entries),
    selectionPolicy: "exact_manifest_only_no_highest_version_autoselection",
    sourceRefreshPerformed: false,
    runtimeAccepted: false,
    trainingTruth: false,
  });
  const foundational = await loadFormalFoundationalStrategyPackV1({
    root: input.root,
    manifest: v1Bridge,
  });
  const uniqueQualificationRefs = [...new Map(manifest.entries.map((entry) => [
    entry.qualificationHash,
    { path: entry.qualificationPath, hash: entry.qualificationHash },
  ])).values()];
  const qualifications = await Promise.all(uniqueQualificationRefs.map((entry) =>
    artifact(input.root, entry, manifest.contentRoot)));
  const candidates = await Promise.all(manifest.evolution.candidates.map((entry) =>
    artifact(input.root, entry, manifest.contentRoot)));
  const promotionRecordBundle = await artifact(input.root,
    manifest.evolution.promotionRecordBundle, manifest.contentRoot);
  const predecessorEvidence = await Promise.all(
    manifest.evolution.predecessorEvidence.map((entry) =>
      artifact(input.root, entry, manifest.contentRoot)),
  );
  if (candidates.some((entry) =>
    entry.artifact.skillId !== entry.skillId
    || entry.artifact.status !== "skillopt_candidate"
    || entry.artifact.runtimeAccepted !== false)
    || promotionRecordBundle.artifact.records?.length !== candidates.length
    || promotionRecordBundle.artifact.automaticPromotion !== false
    || predecessorEvidence.some((entry) => entry.artifact.status !== "passed")) {
    fail("PORTABLE_STRATEGY_EVOLUTION_EVIDENCE_INVALID");
  }
  return freeze({
    manifest,
    foundational,
    qualifications,
    candidates,
    promotionRecordBundle,
    predecessorEvidence,
    receipt: seal({
      schema: "portable_foundational_strategy_pack_load_receipt_v2",
      manifestHash: manifest.hash,
      foundationalSkillHashes: foundational.entries.map((entry) => entry.skill.hash),
      qualificationHashes: qualifications.map((entry) => entry.artifact.hash),
      candidateSkillHashes: candidates.map((entry) => entry.artifact.hash),
      promotionRecordBundleHash: promotionRecordBundle.artifact.hash,
      predecessorEvidenceHashes: predecessorEvidence.map((entry) =>
        entry.artifact.hash),
      buildPathDependencies: false,
      providerCalls: 0,
      sourceRefreshPerformed: false,
      runtimeAccepted: false,
      trainingTruth: false,
    }),
  });
}
