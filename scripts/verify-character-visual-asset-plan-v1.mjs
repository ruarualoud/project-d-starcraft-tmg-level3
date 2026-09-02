#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  KERRIGAN_VISUAL_ASSET_PLAN_V1,
  KERRIGAN_VISUAL_STYLE_PROFILE_V1,
} from "../content/characters/kerrigan-visual-asset-plan-v1.mjs";
import {
  assertStarcraftTmgCharacterVisualAssetManifestV1,
  createStarcraftTmgCharacterVisualAssetManifestV1,
  selectStarcraftTmgCharacterVisualAssetV1,
} from "../packages/character-agent/visual-asset-manifest-v1.mjs";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/transition-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT, "build/character-visual-asset-plan-v1/report.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const checks = [];
const failures = [];
async function check(id, fn) {
  try {
    await fn();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

await check("manifest_is_content_sealed_and_character_scoped", () => {
  assertStarcraftTmgCharacterVisualAssetManifestV1(KERRIGAN_VISUAL_ASSET_PLAN_V1);
  assert(KERRIGAN_VISUAL_ASSET_PLAN_V1.characterId === "starcraft.sarah_kerrigan", "character mismatch");
  assert(KERRIGAN_VISUAL_ASSET_PLAN_V1.sources.length === 2, "source denominator mismatch");
  assert(KERRIGAN_VISUAL_ASSET_PLAN_V1.assets.length === 3, "asset denominator mismatch");
});

await check("user_authority_is_explicit_and_skill_scale_still_requires_confirmation", () => {
  const directive = KERRIGAN_VISUAL_ASSET_PLAN_V1.directive;
  assert(directive.allowsNetworkImageAcquisition === true, "network image acquisition not authorized");
  assert(directive.allowsAiTransformation === true, "AI transformation not authorized");
  assert(directive.acquisitionScope === "development_workspace_with_provenance", "acquisition scope widened");
  assert(directive.bulkSkillProductionRequiresSeparateConfirmation === true, "bulk Skill confirmation gate missing");
});

await check("official_references_are_https_content_free_and_not_publicly_released", () => {
  for (const source of KERRIGAN_VISUAL_ASSET_PLAN_V1.sources) {
    assert(source.url.startsWith("https://"), `${source.sourceId} is not HTTPS`);
    assert(source.publisher === "Blizzard Entertainment", `${source.sourceId} publisher drift`);
    assert(source.captureStatus === "planned" && source.byteHash === null, `${source.sourceId} falsely claims capture`);
    assert(source.publicReleaseAllowed === false, `${source.sourceId} falsely claims public rights`);
  }
});

await check("style_direction_is_originalized_and_excludes_cross_franchise_copying", () => {
  assert(KERRIGAN_VISUAL_STYLE_PROFILE_V1.normalizedDirection.length === 5, "style direction denominator mismatch");
  assert(KERRIGAN_VISUAL_STYLE_PROFILE_V1.avoid.some((entry) => entry.includes("Final Fantasy")), "cross-franchise exclusion missing");
  assert(KERRIGAN_VISUAL_STYLE_PROFILE_V1.avoid.some((entry) => entry.includes("Blizzard")), "key-art copy exclusion missing");
});

await check("planned_assets_use_fixed_roles_paths_and_no_fabricated_file_evidence", () => {
  assert(new Set(KERRIGAN_VISUAL_ASSET_PLAN_V1.assets.map((asset) => asset.role)).size === 3, "visual roles overlap");
  for (const asset of KERRIGAN_VISUAL_ASSET_PLAN_V1.assets) {
    assert(asset.outputPath.startsWith("assets/characters/kerrigan-primal-adjutant/"), `${asset.assetId} path escaped`);
    assert(asset.status === "planned", `${asset.assetId} status drift`);
    assert(asset.fileHash === null && asset.promptHash === null && asset.byteLength === null, `${asset.assetId} fabricated evidence`);
    assert(asset.publicReleaseAllowed === false, `${asset.assetId} public claim widened`);
  }
});

await check("development_selection_reports_not_realized_and_explicit_fallback", () => {
  const result = selectStarcraftTmgCharacterVisualAssetV1(KERRIGAN_VISUAL_ASSET_PLAN_V1, {
    role: "avatar_square",
    environment: "development",
  });
  assert(result.ok === false && result.reason === "asset_not_realized", "planned asset did not fail closed");
  assert(result.fallback.placeholderPolicy === "explicit_art_pending_rights_badge", "placeholder policy missing");
});

await check("realized_development_derivative_never_leaks_into_public_selection", () => {
  const realized = clone(KERRIGAN_VISUAL_ASSET_PLAN_V1);
  delete realized.manifestHash;
  realized.sources[1].captureStatus = "captured";
  realized.sources[1].byteHash = "1".repeat(64);
  realized.sources[1].byteLength = 4096;
  realized.sources[1].acquiredAt = "2026-09-02T21:05:00.000Z";
  realized.assets[0] = {
    ...realized.assets[0],
    status: "realized",
    fileHash: "2".repeat(64),
    promptHash: "3".repeat(64),
    generationReceiptHash: "4".repeat(64),
    byteLength: 8192,
    width: 1024,
    height: 1024,
  };
  const sealed = createStarcraftTmgCharacterVisualAssetManifestV1(realized);
  assert(selectStarcraftTmgCharacterVisualAssetV1(sealed, { role: "avatar_square", environment: "development" }).ok, "development asset unavailable");
  const publicResult = selectStarcraftTmgCharacterVisualAssetV1(sealed, { role: "avatar_square", environment: "public" });
  assert(publicResult.ok === false && publicResult.reason === "asset_not_releasable_in_environment", "public rights gate bypassed");
  assert(publicResult.fallback.fallbackCharacterId === "project-d.original.tactical-adjutant", "public fallback mismatch");
});

await check("public_asset_cannot_depend_on_non_public_official_reference", () => {
  const invalid = clone(KERRIGAN_VISUAL_ASSET_PLAN_V1);
  delete invalid.manifestHash;
  invalid.assets[0].publicReleaseAllowed = true;
  invalid.assets[0].releaseClass = "project_d_owned";
  let rejected = false;
  try {
    createStarcraftTmgCharacterVisualAssetManifestV1(invalid);
  } catch (error) {
    rejected = /depends on non-public source/.test(String(error));
  }
  assert(rejected, "non-public source entered a public asset");
});

await check("manifest_tamper_is_rejected", () => {
  const tampered = clone(KERRIGAN_VISUAL_ASSET_PLAN_V1);
  tampered.styleProfile.normalizedDirection.push("silent drift");
  let rejected = false;
  try {
    assertStarcraftTmgCharacterVisualAssetManifestV1(tampered);
  } catch (error) {
    rejected = /integrity mismatch/.test(String(error));
  }
  assert(rejected, "manifest tamper accepted");
});

await check("visual_plane_cannot_mutate_rules_room_or_training_truth", () => {
  assert(KERRIGAN_VISUAL_ASSET_PLAN_V1.authority.visualAssetsCanOverrideRules === false, "visual asset gained Rules authority");
  assert(KERRIGAN_VISUAL_ASSET_PLAN_V1.authority.visualAssetsCanOverrideRoomState === false, "visual asset gained room authority");
  assert(KERRIGAN_VISUAL_ASSET_PLAN_V1.authority.visualAssetsCanCreateTrainingTruth === false, "visual asset gained training authority");
  assert(KERRIGAN_VISUAL_ASSET_PLAN_V1.authority.skillGenerationTriggered === false, "Skill generation ran");
  assert(KERRIGAN_VISUAL_ASSET_PLAN_V1.authority.dshTriggered === false, "DSH ran");
});

const report = {
  schema: "starcraft_tmg_character_visual_asset_plan_verification_v1",
  generatedAt: "2026-09-02T21:10:00.000Z",
  ticket: 13,
  slice: 119,
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  manifestHash: KERRIGAN_VISUAL_ASSET_PLAN_V1.manifestHash,
  sourceDenominator: KERRIGAN_VISUAL_ASSET_PLAN_V1.sources.length,
  plannedAssetDenominator: KERRIGAN_VISUAL_ASSET_PLAN_V1.assets.length,
  sourceRefreshPerformed: false,
  imageAcquisitionPerformed: false,
  imageGenerationPerformed: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingPromotion: false,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["fact_probe_prompt"],
    harnessToolsCalled: ["read_character_visual_manifest", "select_character_visual_asset"],
    uiTraceEvidence: ["planned_asset_returns_explicit_art_pending_rights_fallback"],
    agentDecisionEvidence: ["environment_scoped_asset_selection_is_hash_and_rights_bound"],
    memoryTraceEvidence: [],
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "source_hash_or_rights_drift_quarantines_the_asset",
      "public_selection_falls_back_to_project_d_original_character",
    ],
    userVisibleChecks: ["missing_art_is_labeled_instead_of_silently_replaced"],
  },
};
report.reportHash = hashStarcraftTmgContract(report);

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
