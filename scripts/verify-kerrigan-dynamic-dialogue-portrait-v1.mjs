#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1,
  KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1,
  KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1,
} from "../content/characters/kerrigan-dynamic-dialogue-portrait-v1.mjs";
import {
  assertStarcraftTmgDynamicDialoguePortraitManifestV1,
  assertStarcraftTmgDynamicDialoguePortraitStateV1,
  createStarcraftTmgDynamicDialoguePortraitStateV1,
  listStarcraftTmgDialogueVisualCuesV1,
  reduceStarcraftTmgDynamicDialoguePortraitStateV1,
  resolveStarcraftTmgDynamicDialoguePortraitV1,
  validateStarcraftTmgDialogueVisualCueV1,
} from "../packages/character-agent/dynamic-dialogue-portrait-v1.mjs";
import { assertStarcraftTmgVisualGenerationReceiptV1 } from
  "../packages/character-agent/visual-generation-receipt-v1.mjs";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/transition-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = path.join(ROOT, "build/kerrigan-dynamic-dialogue-portrait-v1");
const REPORT_PATH = path.join(BUILD_DIR, "report.json");
const PREVIEW_PATH = path.join(BUILD_DIR, "preview.html");
const OCCURRED_AT = "2026-09-02T23:15:00.000Z";

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

function transition(state, type, visualCue) {
  return reduceStarcraftTmgDynamicDialoguePortraitStateV1(
    KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1,
    state,
    { type, visualCue, occurredAt: OCCURRED_AT },
  );
}

function buildViews() {
  const manifest = KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1;
  const initial = createStarcraftTmgDynamicDialoguePortraitStateV1(manifest, {
    mode: "companion",
    updatedAt: OCCURRED_AT,
  });
  const listening = transition(initial, "user_message_received");
  const thinking = transition(listening, "planning_started");
  const speaking = transition(thinking, "provider_output_accepted", "explain");
  const warningSpeaking = transition(thinking, "provider_output_accepted", "warning");
  const waiting = transition(warningSpeaking, "confirmation_requested");
  const error = transition(thinking, "provider_failed");
  return Object.fromEntries(Object.entries({ idle: initial, listening, thinking, speaking, waiting_confirmation: waiting, error })
    .map(([key, state]) => [key, resolveStarcraftTmgDynamicDialoguePortraitV1(manifest, state, { environment: "development" })]));
}

function previewHtml(views) {
  const frameEntries = KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.frames.map((frame) => ({
    ...frame,
    previewPath: `../../${frame.outputPath}`,
  }));
  const data = JSON.stringify({ frames: frameEntries, views }).replaceAll("<", "\\u003c");
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Kerrigan SC1-style dynamic dialogue portrait</title>
  <style>
    :root{color-scheme:dark;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;background:#080a08;color:#d7d7c3}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(circle at 50% 35%,#1b1e13,#050605 70%)}
    main{width:min(94vw,720px);display:grid;gap:16px}.portrait{position:relative;overflow:hidden;aspect-ratio:1;border:2px solid #737451;background:#080a08;box-shadow:0 0 0 4px #15170f,0 24px 80px #000}
    .portrait::before{content:"";position:absolute;inset:0;z-index:20;pointer-events:none;background:repeating-linear-gradient(180deg,rgba(0,0,0,.03) 0 1px,rgba(255,236,142,.025) 1px 2px,rgba(0,0,0,.09) 2px 4px);mix-blend-mode:overlay}
    .portrait::after{content:"";position:absolute;inset:-15% 0;z-index:21;pointer-events:none;background:linear-gradient(180deg,transparent 0 42%,rgba(255,220,120,.08) 48%,transparent 56%);animation:luma 5.8s linear infinite}
    img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 70ms linear;transform:scale(1.004);filter:saturate(.86) contrast(1.04)}img.active{opacity:1}
    .portrait.breathe img{animation:breathe 4.6s ease-in-out infinite alternate}.status{position:absolute;z-index:30;left:12px;right:12px;bottom:10px;display:flex;justify-content:space-between;padding:6px 8px;background:rgba(4,7,4,.72);border:1px solid rgba(193,181,102,.45);font-size:12px;color:#d9ce8b;text-transform:uppercase}
    .controls{display:flex;flex-wrap:wrap;gap:8px}button{min-height:44px;padding:8px 12px;border:1px solid #68694a;background:#14160f;color:#dedebd;font:inherit;cursor:pointer}button[aria-pressed="true"]{background:#4e512d;color:#fff;border-color:#b8b66e}
    p{margin:0;color:#9b9c7c;font-size:13px;line-height:1.55}
    @keyframes breathe{from{transform:scale(1.002) translateY(0)}to{transform:scale(1.008) translateY(-.25%)}}@keyframes luma{to{transform:translateY(115%)}}
    @media(prefers-reduced-motion:reduce){.portrait::after,.portrait.breathe img{animation:none}img{transition:none}}
  </style>
</head>
<body><main>
  <section class="portrait breathe" aria-label="凯瑞甘动态通讯头像" aria-live="polite">
    ${frameEntries.map((frame) => `<img data-frame="${frame.frameId}" src="${frame.previewPath}" alt="">`).join("\n    ")}
    <div class="status"><span id="phase">idle</span><span id="cue">neutral</span></div>
  </section>
  <nav class="controls" aria-label="头像状态">
    ${Object.keys(views).map((key, index) => `<button type="button" data-view="${key}" aria-pressed="${index === 0}">${key}</button>`).join("\n    ")}
  </nav>
  <p>Ticket 13 / Slice 121 development preview. Five sealed 2D keyframes; the server owns mode and phase, while a validated model output may suggest only an allowlisted visual cue.</p>
</main><script>
const data=${data};let timer=null;let current="idle";const images=[...document.querySelectorAll("img[data-frame]")];
function showFrame(frameId){for(const image of images)image.classList.toggle("active",image.dataset.frame===frameId)}
function runSchedule(view,index=0){const step=view.frameSchedule[index%view.frameSchedule.length];showFrame(step.frameId);timer=setTimeout(()=>runSchedule(view,index+1),step.durationMs)}
function selectView(key){clearTimeout(timer);current=key;const view=data.views[key];document.querySelector("#phase").textContent=view.phase;document.querySelector("#cue").textContent=view.visualCue;for(const button of document.querySelectorAll("button[data-view]"))button.setAttribute("aria-pressed",String(button.dataset.view===key));if(matchMedia("(prefers-reduced-motion: reduce)").matches){showFrame(view.primaryFrame.frameId);return}runSchedule(view)}
for(const button of document.querySelectorAll("button[data-view]"))button.addEventListener("click",()=>selectView(button.dataset.view));selectView(current);
</script></body></html>\n`;
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

await check("plan_binds_sc2_model_sc1_comms_and_official_upper_body_evidence_without_shipping_raw_sources", async () => {
  assert(KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1.sources.length === 3, "source denominator mismatch");
  assert(KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1.planHash === hashStarcraftTmgContract(
    Object.fromEntries(Object.entries(KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1).filter(([key]) => key !== "planHash")),
  ), "plan hash mismatch");
  assert(KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1.sources.every((source) => source.publicReleaseAllowed === false && source.rawSourceStoredInGit === false), "raw source release widened");
  for (const source of KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1.sources) {
    const localPath = path.join(ROOT, source.localEvidencePath);
    if (!(await exists(localPath))) continue;
    const bytes = await readFile(localPath);
    assert(sha256(bytes) === source.contentHash, `${source.sourceId} local hash mismatch`);
    assert(bytes.length === source.byteLength, `${source.sourceId} local byte length mismatch`);
  }
});

await check("five_keyframe_generation_receipts_are_sealed_prompt_bound_and_identity_ordered", () => {
  assert(KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1.length === 5, "keyframe receipt denominator mismatch");
  const [neutral, ...adjacent] = KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1;
  for (const receipt of KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1) {
    assertStarcraftTmgVisualGenerationReceiptV1(receipt);
    assert(receipt.planManifestHash === KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1.planHash, `${receipt.assetId} plan mismatch`);
    assert(receipt.generator.externalCredentialUsed === false, `${receipt.assetId} credential claim drift`);
  }
  assert(neutral.inputArtifacts.length === 3, "neutral frame lost three-source model/style/anatomy lineage");
  for (const receipt of adjacent) {
    assert(receipt.inputArtifacts.length === 1 && receipt.inputArtifacts[0].contentHash === neutral.output.contentHash, `${receipt.assetId} did not derive from neutral identity anchor`);
  }
});

await check("workspace_keyframes_match_exact_hash_byte_and_high_resolution_square_dimensions", async () => {
  for (const receipt of KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1) {
    const bytes = await readFile(path.join(ROOT, receipt.output.path));
    const dimensions = pngDimensions(bytes);
    assert(sha256(bytes) === receipt.output.contentHash, `${receipt.assetId} file hash mismatch`);
    assert(bytes.length === receipt.output.byteLength, `${receipt.assetId} byte length mismatch`);
    assert(dimensions.width === 1254 && dimensions.height === 1254, `${receipt.assetId} dimensions mismatch`);
  }
});

await check("manual_visual_review_rejects_anime_horror_pixelation_and_off_model_fantasy_armor", () => {
  const neutralChecks = KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1[0].manualVisualReview.checks;
  assert(neutralChecks.includes("natural_shoulder_width_and_visible_deltoid_continuity"), "shoulder review missing");
  assert(neutralChecks.includes("low_profile_living_carapace_without_metal_bustier_or_gothic_pauldrons"), "chest model review missing");
  assert(neutralChecks.includes("high_resolution_2d_non_anime_non_horror"), "style review missing");
  assert(KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1.every((receipt) => receipt.manualVisualReview.status === "passed_development"), "manual review status missing");
});

await check("manifest_is_sealed_high_resolution_and_contains_exactly_five_non_public_frames", () => {
  assertStarcraftTmgDynamicDialoguePortraitManifestV1(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1);
  assert(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.frames.length === 5, "manifest frame denominator mismatch");
  assert(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.rendering.logicalResolution === 640, "high-resolution logical canvas drift");
  assert(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.rendering.forbiddenOverlays.includes("pixel_block_upscale"), "pixel-block rejection missing");
  assert(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.frames.every((frame) => frame.developmentDisplayAllowed && !frame.publicReleaseAllowed), "frame release boundary drift");
});

await check("mode_specific_visual_cues_are_finite_and_invalid_cross_mode_cues_fail_closed", () => {
  assert(listStarcraftTmgDialogueVisualCuesV1("opponent").join("/") === "neutral/challenge/warning/approve", "opponent cue allowlist drift");
  assert(validateStarcraftTmgDialogueVisualCueV1("tutor", "explain") === "explain", "tutor explain cue rejected");
  let crossModeRejected = false;
  try { validateStarcraftTmgDialogueVisualCueV1("tutor", "challenge"); } catch { crossModeRejected = true; }
  assert(crossModeRejected, "tutor accepted opponent-only challenge cue");
  let unknownRejected = false;
  try { validateStarcraftTmgDialogueVisualCueV1("companion", "asset://override"); } catch { unknownRejected = true; }
  assert(unknownRejected, "unknown asset-like cue was accepted");
});

await check("server_owned_state_reducer_covers_all_phases_and_rejects_mode_or_state_tamper", () => {
  let state = createStarcraftTmgDynamicDialoguePortraitStateV1(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1, { mode: "opponent", updatedAt: OCCURRED_AT });
  state = transition(state, "user_message_received");
  assert(state.phase === "listening", "listening phase missing");
  state = transition(state, "planning_started");
  assert(state.phase === "thinking", "thinking phase missing");
  state = transition(state, "provider_output_accepted", "challenge");
  assert(state.phase === "speaking" && state.visualCue === "challenge", "validated provider cue not applied");
  state = transition(state, "confirmation_requested");
  assert(state.phase === "waiting_confirmation" && state.authority.modeOwner === "server_session_binding", "confirmation phase authority drift");
  let modeChangeRejected = false;
  try {
    reduceStarcraftTmgDynamicDialoguePortraitStateV1(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1, state, { type: "reset", mode: "tutor", occurredAt: OCCURRED_AT });
  } catch { modeChangeRejected = true; }
  assert(modeChangeRejected, "event changed server-owned mode");
  let tamperRejected = false;
  try { assertStarcraftTmgDynamicDialoguePortraitStateV1({ ...state, phase: "idle" }); } catch { tamperRejected = true; }
  assert(tamperRejected, "state tamper was accepted");
});

const views = buildViews();
await check("phase_views_produce_timed_blink_speech_reflect_warning_and_error_sequences", () => {
  assert(views.idle.frameSequence.filter((role) => role === "blink").length === 2, "idle double blink missing");
  assert(views.speaking.frameSequence.includes("speaking"), "speaking phoneme frame missing");
  assert(views.thinking.frameSequence.includes("reflect"), "thinking gaze frame missing");
  assert(views.waiting_confirmation.frameSequence[0] === "warning", "waiting confirmation warning hold missing");
  assert(views.error.frameSequence.join("/") === "warning/neutral/warning", "error sync-loss sequence drift");
  assert(Object.values(views).every((view) => view.frameSchedule.every((entry) => entry.durationMs >= 80)), "unsafe frame duration found");
});

await check("public_environment_fails_closed_to_first_party_fallback", () => {
  const state = createStarcraftTmgDynamicDialoguePortraitStateV1(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1, { mode: "companion", updatedAt: OCCURRED_AT });
  const publicView = resolveStarcraftTmgDynamicDialoguePortraitV1(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1, state, { environment: "public" });
  assert(publicView.ok === false && publicView.reason === "portrait_not_releasable_in_environment", "non-public derivative leaked");
  assert(publicView.fallback.publicBehavior === "use_project_d_original_adjutant", "public fallback drift");
});

const html = previewHtml(views);
await check("self_contained_dynamic_preview_has_controls_accessibility_and_reduced_motion", () => {
  assert(html.includes("natural_double_blink"), "idle double-blink animation token missing from serialized view");
  assert(html.includes("prefers-reduced-motion:reduce"), "reduced-motion CSS missing");
  assert(html.includes("aria-live=\"polite\"") && html.includes("min-height:44px"), "accessibility semantics missing");
  assert(html.includes("frameSchedule") && html.includes("setTimeout"), "timed animation runner missing");
  assert(!/https?:\/\//.test(html), "preview depends on network assets");
});

await check("portrait_plane_grants_no_rules_room_skill_dsh_memory_or_training_authority", () => {
  assert(Object.values(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.authority).filter((value) => value === true).length === 1, "portrait authority widened");
  assert(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.authority.modelMaySuggestVisualCueOnly === true, "bounded model cue authority missing");
  assert(KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1.authority.skillGenerationTriggered === false, "Skill generation ran");
  assert(KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1.authority.dshTriggered === false, "DSH ran");
  assert(KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.frames.every((frame) => frame.publicReleaseAllowed === false), "rights boundary widened");
});

await mkdir(BUILD_DIR, { recursive: true });
await writeFile(PREVIEW_PATH, html, "utf8");

const report = {
  schema: "starcraft_tmg_kerrigan_dynamic_dialogue_portrait_verification_v1",
  generatedAt: OCCURRED_AT,
  ticket: 13,
  slice: 121,
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  planHash: KERRIGAN_SC1_DIALOGUE_PORTRAIT_PLAN_V1.planHash,
  manifestHash: KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.manifestHash,
  generationReceiptHashes: KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1.map((entry) => entry.receiptHash),
  outputAssetHashes: KERRIGAN_SC1_DIALOGUE_GENERATION_RECEIPTS_V1.map((entry) => entry.output.contentHash),
  keyframeCount: 5,
  previewPath: path.relative(ROOT, PREVIEW_PATH),
  previewHash: sha256(Buffer.from(html, "utf8")),
  rejectedDraftsStoredInGit: false,
  runtimeImageGeneration: false,
  publicReleaseReady: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingPromotion: false,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["novice_teacher_prompt", "opponent_prompt", "referee_prompt", "sparring_coach_prompt"],
    harnessToolsCalled: ["read_dialogue_portrait_state", "resolve_dialogue_portrait_view"],
    uiTraceEvidence: ["interactive_local_dynamic_preview_with_six_phase_controls", "five_hash_bound_high_resolution_2d_keyframes"],
    agentDecisionEvidence: ["model_can_suggest_only_mode_allowlisted_visual_cue", "server_owns_mode_phase_asset_path_and_frame_timing"],
    memoryTraceEvidence: [],
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "source_prompt_output_receipt_or_manifest_hash_drift_quarantines_the_portrait_set",
      "shoulder_chest_official_model_drift_demotes_the_base_and_all_derived_frames",
      "invalid_cross_mode_visual_cue_rejects_provider_output",
      "public_environment_uses_project_d_original_adjutant_until_rights_review_passes",
    ],
    userVisibleChecks: [
      "natural_shoulders_and_integrated_living_chest_carapace",
      "high_resolution_sc1_style_2d_non_anime_portrait",
      "idle_blink_thinking_speaking_waiting_and_error_animation",
      "reduced_motion_single_frame_fallback",
    ],
  },
};
report.reportHash = hashStarcraftTmgContract(report);
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
