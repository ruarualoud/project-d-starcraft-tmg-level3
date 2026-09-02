#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { KERRIGAN_VISUAL_ASSET_CATALOG_V2 } from
  "../content/characters/kerrigan-visual-asset-catalog-v2.mjs";
import { KERRIGAN_VISUAL_ASSET_PLAN_V1 } from
  "../content/characters/kerrigan-visual-asset-plan-v1.mjs";
import { KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1 } from
  "../content/characters/kerrigan-visual-generation-receipts-v1.mjs";
import {
  assertStarcraftTmgCharacterVisualAssetManifestV1,
  selectStarcraftTmgCharacterVisualAssetV1,
} from "../packages/character-agent/visual-asset-manifest-v1.mjs";
import { assertStarcraftTmgVisualGenerationReceiptV1 } from
  "../packages/character-agent/visual-generation-receipt-v1.mjs";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/transition-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT, "build/character-visual-assets-v2/report.json");
const RAW_PATH = path.join(ROOT, "build/character-visual-assets-v1/raw/kerrigan-hero-week-official.png");
const LOCAL_FULL_BODY_REFERENCE_PATH = path.join(
  ROOT,
  "build/character-visual-assets-v2/design-reference/kerrigan-primal-full-body-reference-v1.png",
);
const LOCAL_FULL_BODY_REFERENCE_HASH = "c1032b1e8885eff1360c3d4c3fed1b9d07d17725e6e340354f79a767a2cfa973";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function pngDimensions(bytes) {
  assert(bytes.length >= 24 && bytes.toString("ascii", 1, 4) === "PNG", "not a PNG file");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
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

const localRawCaptureAvailable = await exists(RAW_PATH);
const localFullBodyReferenceAvailable = await exists(LOCAL_FULL_BODY_REFERENCE_PATH);

await check("planned_manifest_remains_immutable_and_realized_catalogue_is_separately_sealed", () => {
  assertStarcraftTmgCharacterVisualAssetManifestV1(KERRIGAN_VISUAL_ASSET_PLAN_V1);
  assertStarcraftTmgCharacterVisualAssetManifestV1(KERRIGAN_VISUAL_ASSET_CATALOG_V2);
  assert(KERRIGAN_VISUAL_ASSET_PLAN_V1.assets.every((asset) => asset.status === "planned"), "v1 plan was rewritten");
  assert(KERRIGAN_VISUAL_ASSET_CATALOG_V2.assets.filter((asset) => asset.status === "realized").length === 2, "runtime visual denominator mismatch");
  const fullBody = KERRIGAN_VISUAL_ASSET_CATALOG_V2.assets.find((asset) => asset.role === "full_body_reference");
  assert(fullBody?.status === "quarantined" && fullBody.developmentDisplayAllowed === false, "full-body plan was not quarantined");
});

await check("local_official_capture_matches_catalogue_when_present_but_is_not_required_for_redistribution", async () => {
  if (!localRawCaptureAvailable) return;
  const bytes = await readFile(RAW_PATH);
  const source = KERRIGAN_VISUAL_ASSET_CATALOG_V2.sources.find((entry) => entry.sourceKind === "official_publisher_image");
  assert(sha256(bytes) === source.byteHash, "official reference byte hash mismatch");
  assert(bytes.length === source.byteLength, "official reference byte length mismatch");
  const dimensions = pngDimensions(bytes);
  assert(dimensions.width === 779 && dimensions.height === 274, "official reference dimensions drift");
});

await check("both_runtime_generation_receipts_are_sealed_and_prompt_bound", () => {
  assert(KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1.length === 2, "generation receipt denominator mismatch");
  for (const receipt of KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1) {
    assertStarcraftTmgVisualGenerationReceiptV1(receipt);
    assert(receipt.planManifestHash === KERRIGAN_VISUAL_ASSET_PLAN_V1.manifestHash, `${receipt.assetId} plan mismatch`);
    assert(receipt.promptHash === hashStarcraftTmgContract(receipt.prompt), `${receipt.assetId} prompt mismatch`);
    assert(receipt.generator.externalCredentialUsed === false, `${receipt.assetId} credential claim drift`);
  }
});

await check("workspace_assets_match_exact_file_hash_byte_and_png_dimensions", async () => {
  for (const receipt of KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1) {
    const filePath = path.join(ROOT, receipt.output.path);
    const bytes = await readFile(filePath);
    const dimensions = pngDimensions(bytes);
    assert(sha256(bytes) === receipt.output.contentHash, `${receipt.assetId} file hash mismatch`);
    assert(bytes.length === receipt.output.byteLength, `${receipt.assetId} byte length mismatch`);
    assert(dimensions.width === receipt.output.width && dimensions.height === receipt.output.height, `${receipt.assetId} dimensions mismatch`);
  }
});

await check("avatar_and_card_have_fixed_product_aspect_contracts", () => {
  const [avatar, card] = KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1;
  assert(avatar.output.width === avatar.output.height, "avatar is not square");
  assert(card.output.width * 3 === card.output.height * 2, "card is not exact 2:3");
});

await check("manual_visual_review_covers_identity_readability_composition_and_clean_output", () => {
  for (const receipt of KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1) {
    assert(receipt.manualVisualReview.status === "passed_development", `${receipt.assetId} visual review missing`);
    assert(receipt.manualVisualReview.checks.some((entry) => entry.includes("no_text_logo_or_watermark")), `${receipt.assetId} clean-output check missing`);
  }
});

await check("generation_lineage_is_ordered_from_official_reference_to_avatar_and_card", () => {
  const [avatar, card] = KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1;
  assert(card.inputArtifacts.some((entry) => entry.contentHash === avatar.output.contentHash), "card lacks avatar identity anchor");
});

await check("development_resolves_dialogue_and_card_assets_while_public_and_full_body_fail_closed", () => {
  for (const role of ["avatar_square", "character_card_portrait"]) {
    const development = selectStarcraftTmgCharacterVisualAssetV1(KERRIGAN_VISUAL_ASSET_CATALOG_V2, { role, environment: "development" });
    assert(development.ok === true, `${role} unavailable in development`);
    const publicResult = selectStarcraftTmgCharacterVisualAssetV1(KERRIGAN_VISUAL_ASSET_CATALOG_V2, { role, environment: "public" });
    assert(publicResult.ok === false && publicResult.reason === "asset_not_releasable_in_environment", `${role} leaked into public selection`);
  }
  const fullBody = selectStarcraftTmgCharacterVisualAssetV1(
    KERRIGAN_VISUAL_ASSET_CATALOG_V2,
    { role: "full_body_reference", environment: "development" },
  );
  assert(fullBody.ok === false && fullBody.reason === "asset_not_realized", "full-body product asset remained selectable");
});

await check("catalogue_cross_binds_every_asset_to_its_generation_receipt", () => {
  for (const asset of KERRIGAN_VISUAL_ASSET_CATALOG_V2.assets.filter((entry) => entry.status === "realized")) {
    const receipt = KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1.find((entry) => entry.assetId === asset.assetId);
    assert(receipt, `${asset.assetId} receipt missing`);
    assert(asset.fileHash === receipt.output.contentHash, `${asset.assetId} output mismatch`);
    assert(asset.promptHash === receipt.promptHash, `${asset.assetId} prompt mismatch`);
    assert(asset.generationReceiptHash === receipt.receiptHash, `${asset.assetId} receipt hash mismatch`);
  }
});

await check("discarded_full_body_output_is_local_only_and_hash_bound_when_present", async () => {
  const trackedFullBody = path.join(ROOT, "assets/characters/kerrigan-primal-adjutant/kerrigan-primal-full-body-reference-v1.png");
  assert(await exists(trackedFullBody) === false, "full-body output remained in product asset path");
  if (!localFullBodyReferenceAvailable) return;
  const bytes = await readFile(LOCAL_FULL_BODY_REFERENCE_PATH);
  assert(sha256(bytes) === LOCAL_FULL_BODY_REFERENCE_HASH, "local full-body design reference hash mismatch");
});

await check("visual_generation_grants_no_character_fact_rules_room_skill_or_training_authority", () => {
  for (const receipt of KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1) {
    assert(Object.values(receipt.authority).every((value) => value === false), `${receipt.assetId} authority widened`);
    assert(receipt.publicReleaseAllowed === false, `${receipt.assetId} release claim widened`);
  }
  assert(KERRIGAN_VISUAL_ASSET_CATALOG_V2.authority.skillGenerationTriggered === false, "Skill generation ran");
  assert(KERRIGAN_VISUAL_ASSET_CATALOG_V2.authority.dshTriggered === false, "DSH ran");
});

const report = {
  schema: "starcraft_tmg_character_visual_assets_verification_v2",
  generatedAt: "2026-09-02T21:40:00.000Z",
  ticket: 13,
  slice: 120,
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  planManifestHash: KERRIGAN_VISUAL_ASSET_PLAN_V1.manifestHash,
  visualCatalogueHash: KERRIGAN_VISUAL_ASSET_CATALOG_V2.manifestHash,
  generationReceiptHashes: KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1.map((entry) => entry.receiptHash),
  outputAssetHashes: KERRIGAN_VISUAL_GENERATION_RECEIPTS_V1.map((entry) => entry.output.contentHash),
  localRawCaptureAvailable,
  localFullBodyReferenceAvailable,
  localFullBodyReferenceHash: LOCAL_FULL_BODY_REFERENCE_HASH,
  fullBodyProductStatus: "demoted_to_ignored_local_design_reference",
  rawOfficialSourceStoredInGit: false,
  imageAcquisitionPerformed: true,
  imageGenerationPerformed: true,
  imageAssetsRealized: 2,
  publicReleaseReady: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingPromotion: false,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["fact_probe_prompt"],
    harnessToolsCalled: ["read_visual_state", "read_character_visual_manifest", "select_character_visual_asset"],
    uiTraceEvidence: ["two_runtime_workspace_assets_visually_inspected_and_hash_bound"],
    agentDecisionEvidence: ["identity_anchor_precedes_card_generation", "full_body_demoted_after_user_runtime_scope_decision"],
    memoryTraceEvidence: [],
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "source_output_prompt_or_receipt_hash_drift_quarantines_the_asset",
      "public_environment_uses_project_d_original_fallback_until_rights_pass",
    ],
    userVisibleChecks: ["avatar_face_readable", "card_two_to_three", "full_body_not_product_selectable", "no_embedded_text_logo_or_watermark"],
  },
};
report.reportHash = hashStarcraftTmgContract(report);

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
