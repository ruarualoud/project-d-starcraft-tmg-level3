import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { seal, verifySeal, sha256, fail } from "./common.mjs";
import { CHAPTERS } from "./evidence.mjs";
import { chapterScope } from "./runtime.mjs";
import { LOOP_LIMITS } from "./loops.mjs";
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from "../../content/skill-generation/offline-provider-profile-v1.mjs";

export const PILOT_LIMITS = Object.freeze({ maxCalls: 300, maxCostMicros: 50_000_000,
  maxTokens: 5_000_000, maxWallMs: 3 * 60 * 60 * 1000, maxSemanticRevisions: 2, maxFormatRepairs: 1 });
export async function verifyProductionReadiness(root, catalogue) {
  const report = verifySeal(JSON.parse(await readFile(path.join(root, "build/ticket-17-production-redesign-v1/readiness.json"), "utf8")));
  if (!report.passed || report.checks.length < 12 || report.catalogueHash !== catalogue.hash || !report.dshProof?.final
    || !report.crossTimeReplayResult?.passed) fail("PRODUCTION_READINESS_MISSING");
  const names = (await readdir(path.join(root, "packages/skill-production"))).filter((f) => f.endsWith(".mjs"));
  if (names.some((name) => !report.codeHashes.some((row) => row.file === "packages/skill-production/" + name))) fail("READINESS_CODE_FILE_MISSING");
  for (const row of report.codeHashes) {
    if (sha256(await readFile(path.join(root, row.file))) !== row.hash) fail("PRODUCTION_READINESS_CODE_DRIFT");
  }
  return report;
}
export function createPilotRecipe(catalogue, readiness) {
  return seal({ version: "production-redesign-pilot-v1", evidenceWireVersion: "host_materialized_source_spans_v1", targetSkill: "starcraft-tmg.how-to-play",
    arms: ["dsh", "direct"], chapters: CHAPTERS.map((c) => chapterScope(catalogue, c)),
    sourceBinding: catalogue.sourceBinding, catalogueHash: catalogue.hash,
    codeHashes: readiness.codeHashes, modelHash: profile.integrity.hash, loopLimits: LOOP_LIMITS,
    limits: PILOT_LIMITS, ordering: "calibration_then_paired_chapters_counterbalanced_arm_order",
    primaryMetrics: ["all_claims_semantic_support", "heldout_mechanics_accuracy", "source_coverage",
      "cost", "physical_calls", "repairs", "completion"],
    statisticalConclusion: "single_paired_package_is_descriptive_not_causal_proof_of_DSH_benefit",
    knownPriorTokensLowerBound: 2864424, knownPriorEstimatedCostMicros: 5052393,
    priorUnknownCallReserveMicros: 28961350, notifyEveryCny: 100, cnyPerUsdFrozen: 8,
    publication: "candidate_quarantine_only", scope: "10_chapter_pilot_not_complete_rule_coverage",
    providerDrift: "stop", ambiguousSend: "stop_no_auto_retry", exhaustedBalance: "stop_all_development",
    trainingTruth: false });
}
