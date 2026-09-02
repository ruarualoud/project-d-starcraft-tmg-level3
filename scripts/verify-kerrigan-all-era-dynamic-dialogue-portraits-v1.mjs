#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  KERRIGAN_ALL_ERA_DYNAMIC_GENERATION_AUDIT_V1,
  KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1,
  KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1,
  KERRIGAN_ALL_ERA_DYNAMIC_TRIGGER_POLICY_V1,
  KERRIGAN_ALL_ERA_NEW_DYNAMIC_GENERATION_RECEIPTS_V1,
} from "../content/characters/kerrigan-all-era-dynamic-portraits-v1.mjs";
import { KERRIGAN_PERSONA_VISUAL_BINDINGS_V2 } from
  "../content/characters/kerrigan-persona-visual-bindings-v2.mjs";
import { KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1 } from
  "../content/characters/kerrigan-worldbook-catalog-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgCharacterPresentationViewModelV1,
  renderStarcraftTmgCharacterPresentationHtmlV1,
  renderStarcraftTmgCharacterPresentationNativeTreeV1,
} from "../packages/character-agent/character-presentation-v1.mjs";
import { createStarcraftTmgCharacterPersonaSelectorV1 } from
  "../packages/character-agent/character-persona-selector-v1.mjs";
import {
  STARCRAFT_TMG_DIALOGUE_PORTRAIT_MODES,
  STARCRAFT_TMG_DIALOGUE_PORTRAIT_PHASES,
  assertStarcraftTmgDynamicDialoguePortraitManifestV1,
  createStarcraftTmgDynamicDialoguePortraitStateV1,
  reduceStarcraftTmgDynamicDialoguePortraitStateV1,
  resolveStarcraftTmgDynamicDialoguePortraitV1,
} from "../packages/character-agent/dynamic-dialogue-portrait-v1.mjs";
import { assertStarcraftTmgVisualGenerationReceiptV1 } from
  "../packages/character-agent/visual-generation-receipt-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = path.join(ROOT, "build/kerrigan-all-era-dynamic-dialogue-portraits-v1");
const REPORT_PATH = path.join(BUILD_DIR, "report.json");
const PREVIEW_PATH = path.join(BUILD_DIR, "preview.html");
const T0 = "2026-09-03T04:00:00.000Z";
const FRAME_ROLES = ["neutral", "blink", "speaking", "warning", "reflect"];
const PHASE_EVENTS = Object.freeze({
  idle: null,
  listening: { type: "user_message_received" },
  thinking: { type: "planning_started" },
  speaking: { type: "provider_output_accepted", visualCue: "explain" },
  waiting_confirmation: { type: "confirmation_requested" },
  error: { type: "provider_failed" },
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function portraitView(manifest, phase, mode = "tutor") {
  let state = createStarcraftTmgDynamicDialoguePortraitStateV1(manifest, { mode, updatedAt: T0 });
  const event = PHASE_EVENTS[phase];
  if (event) {
    state = reduceStarcraftTmgDynamicDialoguePortraitStateV1(manifest, state, {
      ...event,
      occurredAt: "2026-09-03T04:00:01.000Z",
    });
  }
  return resolveStarcraftTmgDynamicDialoguePortraitV1(manifest, state, { environment: "development" });
}

function selectorView(selector, personaWorldbookId, connectivity = "online") {
  const created = selector.createState({
    personaWorldbookId,
    spoilerCeilingRank: 80,
    knowledgeCeilingRank: 80,
    connectivity,
    updatedAt: T0,
  });
  assert(created.ok, `selector state failed for ${personaWorldbookId}`);
  return selector.readView(created.state);
}

function expectThrow(fn, message) {
  let threw = false;
  try { fn(); } catch { threw = true; }
  assert(threw, message);
}

const bundle = createKerriganPrimalProductBundleV1();
const selector = createStarcraftTmgCharacterPersonaSelectorV1({
  characterPackage: bundle.characterPackage,
  worldbooks: KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1,
  personaVisualBindingSet: KERRIGAN_PERSONA_VISUAL_BINDINGS_V2,
});
const titleByWorldbookId = new Map(KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1
  .map((entry) => [entry.worldbookId, entry.title]));
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

await check("one_shared_engine_owns_eight_manifests_five_roles_and_forty_frames", () => {
  assert(KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1.length === 8, "persona manifest denominator mismatch");
  assert(KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1.denominator.totalFrames === 40, "frame denominator mismatch");
  assert(KERRIGAN_ALL_ERA_DYNAMIC_TRIGGER_POLICY_V1.engineCount === 1, "state-machine denominator mismatch");
  assert(KERRIGAN_ALL_ERA_DYNAMIC_TRIGGER_POLICY_V1.semanticFrameRoleCountPerPersona === 5, "semantic role denominator mismatch");
  assert(KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1.planHash
    === hashStarcraftTmgContract(Object.fromEntries(Object.entries(KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1)
      .filter(([key]) => key !== "planHash"))), "plan hash mismatch");
});

await check("twenty_eight_new_generation_receipts_preserve_exact_prompt_and_builtin_tool_provenance", () => {
  assert(KERRIGAN_ALL_ERA_NEW_DYNAMIC_GENERATION_RECEIPTS_V1.length === 28, "new receipt denominator mismatch");
  for (const receipt of KERRIGAN_ALL_ERA_NEW_DYNAMIC_GENERATION_RECEIPTS_V1) {
    assertStarcraftTmgVisualGenerationReceiptV1(receipt);
    assert(receipt.generator.provider === "openai_builtin_imagegen"
      && receipt.generator.externalCredentialUsed === false, `${receipt.assetId} generator provenance drift`);
    assert(receipt.prompt.includes("identity-preserve") && receipt.prompt.length > 500, `${receipt.assetId} prompt incomplete`);
    assert(receipt.manualVisualReview.status === "passed_development", `${receipt.assetId} visual review missing`);
  }
});

await check("twenty_eight_new_pngs_match_sealed_hash_bytes_and_1254_square_dimensions", async () => {
  for (const receipt of KERRIGAN_ALL_ERA_NEW_DYNAMIC_GENERATION_RECEIPTS_V1) {
    const bytes = await readFile(path.join(ROOT, receipt.output.path));
    assert(sha256(bytes) === receipt.output.contentHash, `${receipt.assetId} content hash mismatch`);
    assert(bytes.length === receipt.output.byteLength, `${receipt.assetId} byte length mismatch`);
    assert(bytes.subarray(1, 4).toString("ascii") === "PNG", `${receipt.assetId} is not PNG`);
    assert(bytes.readUInt32BE(16) === 1254 && bytes.readUInt32BE(20) === 1254,
      `${receipt.assetId} dimensions mismatch`);
  }
});

await check("generation_audit_binds_all_accepted_outputs_and_quarantines_rejected_drafts", () => {
  const audit = KERRIGAN_ALL_ERA_DYNAMIC_GENERATION_AUDIT_V1;
  const { auditHash, ...unsigned } = audit;
  assert(auditHash === hashStarcraftTmgContract(unsigned), "generation audit hash mismatch");
  assert(audit.acceptedOutputs.length === 28 && audit.rejectedIgnoredLocalDrafts.length === 4,
    "accepted/rejected generation denominator mismatch");
  assert(new Set(audit.acceptedOutputs.map((entry) => entry.contentHash)).size === 28,
    "generated outputs unexpectedly reused bytes");
  assert(audit.originalGeneratorOutputsRemainOutsideRepository && !audit.runtimeGeneration,
    "generator output/runtime boundary drift");
});

await check("every_persona_manifest_has_exactly_one_distinct_frame_for_each_semantic_role", () => {
  const allPaths = [];
  const allHashes = [];
  for (const entry of KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1) {
    assertStarcraftTmgDynamicDialoguePortraitManifestV1(entry.manifest);
    assert(entry.manifest.frames.length === 5, `${entry.slug} frame denominator mismatch`);
    assert(entry.manifest.frames.map((frame) => frame.role).sort().join("/")
      === [...FRAME_ROLES].sort().join("/"), `${entry.slug} frame roles mismatch`);
    assert(entry.manifest.frames.find((frame) => frame.role === "neutral").contentHash
      === entry.neutralReceipt.output.contentHash, `${entry.slug} neutral anchor drift`);
    allPaths.push(...entry.manifest.frames.map((frame) => frame.outputPath));
    allHashes.push(...entry.manifest.frames.map((frame) => frame.contentHash));
  }
  assert(new Set(allPaths).size === 40 && new Set(allHashes).size === 40,
    "cross-era frame path or byte reuse detected");
});

await check("v2_visual_bindings_attach_the_matching_dynamic_manifest_to_all_eight_personas", () => {
  assert(KERRIGAN_PERSONA_VISUAL_BINDINGS_V2.bindings.length === 8, "binding denominator mismatch");
  assert(KERRIGAN_PERSONA_VISUAL_BINDINGS_V2.bindings.every((entry) => entry.staticPortraitRef
    && entry.dialoguePortraitManifestRef), "static or dynamic binding missing");
  assert(new Set(KERRIGAN_PERSONA_VISUAL_BINDINGS_V2.bindings
    .map((entry) => entry.dialoguePortraitManifestRef.hash)).size === 8, "manifest reused across eras");
  assert(selector.catalogue.dynamicPersonaVisualCount === 8
    && selector.catalogue.staticPersonaVisualCount === 8, "selector dynamic/static counts mismatch");
});

await check("selector_resolves_each_era_to_its_own_static_anchor_and_dynamic_manifest", () => {
  for (const entry of KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1) {
    const view = selectorView(selector, entry.personaWorldbookId);
    assert(view.selectedVisual.staticPortraitRef.hash === entry.neutralReceipt.output.contentHash,
      `${entry.slug} selected static anchor mismatch`);
    assert(view.selectedVisual.dialoguePortraitManifestRef.hash === entry.manifest.manifestHash,
      `${entry.slug} selected dynamic manifest mismatch`);
  }
});

await check("all_six_server_owned_phases_resolve_for_every_persona_without_cross_era_assets", () => {
  for (const entry of KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1) {
    const ownPaths = new Set(entry.manifest.frames.map((frame) => frame.outputPath));
    for (const phase of STARCRAFT_TMG_DIALOGUE_PORTRAIT_PHASES) {
      const view = portraitView(entry.manifest, phase);
      assert(view.ok && view.phase === phase, `${entry.slug}/${phase} did not resolve`);
      assert(view.frameSchedule.every((frame) => ownPaths.has(frame.outputPath)),
        `${entry.slug}/${phase} crossed era assets`);
      if (phase === "thinking") assert(view.frameSequence.includes("reflect"), `${entry.slug} thinking lacks reflect`);
      if (phase === "speaking") assert(view.frameSequence.includes("speaking"), `${entry.slug} speaking lacks phoneme frame`);
      if (["waiting_confirmation", "error"].includes(phase)) {
        assert(view.frameSequence.includes("warning"), `${entry.slug}/${phase} lacks warning`);
      }
    }
  }
});

await check("all_four_role_modes_share_the_engine_but_keep_mode_allowlisted_cues", () => {
  for (const entry of KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1) {
    for (const mode of STARCRAFT_TMG_DIALOGUE_PORTRAIT_MODES) {
      const view = portraitView(entry.manifest, "idle", mode);
      assert(view.mode === mode && view.animation.loop, `${entry.slug}/${mode} mode projection mismatch`);
    }
  }
});

await check("provider_cannot_change_mode_phase_timing_or_asset_path", () => {
  const manifest = KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1[0].manifest;
  const state = createStarcraftTmgDynamicDialoguePortraitStateV1(manifest, { mode: "opponent", updatedAt: T0 });
  expectThrow(() => reduceStarcraftTmgDynamicDialoguePortraitStateV1(manifest, state, {
    type: "provider_output_accepted",
    visualCue: "explain",
    occurredAt: T0,
  }), "opponent accepted forbidden tutor cue");
  expectThrow(() => reduceStarcraftTmgDynamicDialoguePortraitStateV1(manifest, state, {
    type: "provider_output_accepted",
    visualCue: "challenge",
    mode: "tutor",
    outputPath: "assets/characters/forged.png",
    occurredAt: T0,
  }), "provider changed server-owned mode");
  assert(manifest.authority.modelMaySelectAssetPath === false
    && manifest.authority.modelMaySelectPhase === false, "manifest authority widened");
});

await check("web_and_app_present_each_selected_era_with_hash_identical_semantic_content", () => {
  for (const entry of KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1) {
    const selected = selectorView(selector, entry.personaWorldbookId);
    const dialogue = portraitView(entry.manifest, "speaking");
    const input = {
      characterPackage: bundle.characterPackage,
      selectorView: selected,
      dialoguePortraitView: dialogue,
      environment: "development",
      locale: "zh-CN",
      viewportWidth: 1280,
    };
    const web = createStarcraftTmgCharacterPresentationViewModelV1({ ...input, surface: "web" });
    const app = createStarcraftTmgCharacterPresentationViewModelV1({ ...input, surface: "app" });
    assert(web.sharedContentHash === app.sharedContentHash, `${entry.slug} Web/App content drift`);
    assert(web.content.portrait.kind === "dynamic"
      && web.content.portrait.animation.manifestHash === entry.manifest.manifestHash,
    `${entry.slug} dynamic presentation missing`);
    assert(renderStarcraftTmgCharacterPresentationHtmlV1(web).includes("data-dynamic=\"true\""),
      `${entry.slug} Web dynamic markup missing`);
    assert(renderStarcraftTmgCharacterPresentationNativeTreeV1(app).children
      .some((child) => child.type === "AnimatedImage"), `${entry.slug} App dynamic tree missing`);
  }
});

await check("reduced_motion_collapses_each_era_to_one_server_selected_static_frame", () => {
  for (const entry of KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1) {
    const model = createStarcraftTmgCharacterPresentationViewModelV1({
      characterPackage: bundle.characterPackage,
      selectorView: selectorView(selector, entry.personaWorldbookId),
      dialoguePortraitView: portraitView(entry.manifest, "thinking"),
      environment: "development",
      locale: "en-US",
      viewportWidth: 390,
      surface: "app",
      reducedMotion: true,
    });
    assert(model.content.portrait.animation.frameSchedule.length === 1
      && model.content.portrait.animation.frameSchedule[0].durationMs === 0,
    `${entry.slug} reduced motion did not collapse`);
  }
});

await check("offline_selection_is_read_only_and_does_not_trigger_generation_or_cross_era_loading", () => {
  for (const entry of KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1) {
    const selected = selectorView(selector, entry.personaWorldbookId, "offline");
    const model = createStarcraftTmgCharacterPresentationViewModelV1({
      characterPackage: bundle.characterPackage,
      selectorView: selected,
      dialoguePortraitView: null,
      environment: "development",
      locale: "zh-CN",
      viewportWidth: 800,
      surface: "web",
    });
    assert(model.content.selector.readOnly
      && model.content.selector.personaOptions.every((option) => option.selectEnabled === false),
    `${entry.slug} offline selector remained mutable`);
    assert(model.content.portrait.asset.hash === entry.neutralReceipt.output.contentHash,
      `${entry.slug} offline neutral fallback drift`);
  }
  assert(KERRIGAN_ALL_ERA_DYNAMIC_TRIGGER_POLICY_V1.activation.runtimeImageGeneration === false,
    "offline path could generate images");
});

await check("public_rights_gate_removes_every_kerrigan_path_and_uses_first_party_fallback", () => {
  for (const entry of KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1) {
    const selected = selectorView(selector, entry.personaWorldbookId);
    const state = createStarcraftTmgDynamicDialoguePortraitStateV1(entry.manifest, { mode: "tutor", updatedAt: T0 });
    const publicPortrait = resolveStarcraftTmgDynamicDialoguePortraitV1(entry.manifest, state, { environment: "public" });
    assert(publicPortrait.ok === false && !JSON.stringify(publicPortrait).includes("assets/characters/"),
      `${entry.slug} public dynamic view leaked asset path`);
    const model = createStarcraftTmgCharacterPresentationViewModelV1({
      characterPackage: bundle.characterPackage,
      selectorView: selected,
      dialoguePortraitView: null,
      environment: "public",
      locale: "en-US",
      viewportWidth: 1280,
      surface: "web",
    });
    const html = renderStarcraftTmgCharacterPresentationHtmlV1(model);
    assert(model.content.portrait.kind === "first_party_fallback"
      && model.content.portrait.characterId === "project-d.original.tactical-adjutant",
    `${entry.slug} public fallback mismatch`);
    assert(!html.includes("assets/characters/"), `${entry.slug} public HTML leaked derived path`);
  }
});

await check("slice_keeps_rules_room_provider_skill_dsh_muzero_and_training_authority_closed", () => {
  const policy = KERRIGAN_ALL_ERA_DYNAMIC_TRIGGER_POLICY_V1;
  assert(policy.authority.canOverrideRules === false && policy.authority.canMutateRoom === false,
    "Rules or room authority widened");
  assert(policy.authority.skillGenerationTriggered === false && policy.authority.dshTriggered === false,
    "Skill or DSH was triggered");
  assert(KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1.every((entry) => entry.manifest.frames
    .every((frame) => frame.publicReleaseAllowed === false)), "public rights widened");
});

const previewData = KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_CATALOG_V1.map((entry) => ({
  id: entry.personaWorldbookId,
  title: titleByWorldbookId.get(entry.personaWorldbookId) || entry.era,
  era: entry.era,
  frames: Object.fromEntries(entry.manifest.frames.map((frame) => [frame.role, `../../${frame.outputPath}`])),
  phases: Object.fromEntries(STARCRAFT_TMG_DIALOGUE_PORTRAIT_PHASES
    .map((phase) => [phase, portraitView(entry.manifest, phase).frameSchedule.map((frame) => ({
      role: frame.role,
      durationMs: frame.durationMs,
    }))])),
}));

const previewHtml = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>凯瑞甘八时代动态通讯头像</title><style>
:root{color-scheme:dark;font-family:Inter,"Noto Sans SC",sans-serif;background:#07110f;color:#e8f2e8}*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(circle at 35% 20%,#243929 0,#0b1613 34%,#050907 78%)}
main{width:min(1160px,100%);margin:auto;padding:24px;display:grid;grid-template-columns:minmax(300px,640px) minmax(280px,1fr);gap:24px}
.screen{position:relative;aspect-ratio:1;overflow:hidden;border:1px solid #73836b;border-radius:12px;background:#020403;box-shadow:0 0 60px #9a6b2440,inset 0 0 48px #000}
.screen:after{content:"";position:absolute;inset:0;pointer-events:none;background:repeating-linear-gradient(0deg,#0000 0 3px,#08130c55 4px);mix-blend-mode:multiply}
img{width:100%;height:100%;object-fit:cover;image-rendering:auto}.panel{padding:18px;border:1px solid #32453a;border-radius:12px;background:#0b1512dd}
h1{font-size:clamp(22px,3vw,34px);margin:0 0 8px}p{color:#afc1b4;line-height:1.6}label{display:block;margin:18px 0 6px;color:#c7d7ca}
select,button{font:inherit;color:#e8f2e8;background:#12241d;border:1px solid #526a58;border-radius:7px;padding:10px 12px;min-height:44px}select{width:100%}.phases{display:grid;grid-template-columns:repeat(2,1fr);gap:8px}.phases button[aria-pressed="true"]{background:#825d24;border-color:#dfb65b}
.status{margin-top:16px;padding:12px;border-left:3px solid #d2a850;background:#111c16}.legend{font-size:13px;color:#9eafa3}.rights{color:#d4bd89;font-size:13px}
@media(max-width:820px){main{grid-template-columns:1fr;padding:14px}.panel{order:-1}}
@media(prefers-reduced-motion:reduce){.status:after{content:" · 系统减少动态：单帧"}}
</style></head><body><main>
<section><div class="screen" role="region" aria-label="动态通讯头像"><img id="portrait" alt=""></div></section>
<section class="panel"><h1>凯瑞甘 · 八时代动态通讯头像</h1><p>同一套服务器状态机，八套互不串用的时代画面。只有当前选中的头像会播放；切后台、离屏、离线缺缓存或系统减少动态时停为单帧。</p>
<label for="era">角色时代</label><select id="era">${previewData.map((entry, index) => `<option value="${index}">${escapeHtml(entry.title)}</option>`).join("")}</select>
<label>会话阶段</label><div class="phases">${STARCRAFT_TMG_DIALOGUE_PORTRAIT_PHASES.map((phase) => `<button type="button" data-phase="${phase}">${phase}</button>`).join("")}</div>
<div class="status"><strong id="eraTitle"></strong><br><span id="phaseText"></span></div>
<p class="legend">idle/listening：neutral + blink；thinking：reflect；speaking：接受 Provider 输出后才进入发音循环；waiting_confirmation/error：warning。</p>
<p class="rights">开发预览：凯瑞甘衍生视觉未通过独立公开发布权审核，公开环境必须回退 Project D 原创副官。</p>
</section></main><script>
const eras=${JSON.stringify(previewData).replaceAll("</", "<\\/")};const img=document.querySelector("#portrait"),era=document.querySelector("#era"),title=document.querySelector("#eraTitle"),phaseText=document.querySelector("#phaseText");let phase="idle",timer=0,token=0;
function render(){clearTimeout(timer);const run=++token,e=eras[Number(era.value)],schedule=e.phases[phase];title.textContent=e.title;phaseText.textContent=phase+" · "+schedule.map(x=>x.role).join(" → ");document.querySelectorAll("[data-phase]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.phase===phase)));let i=0;const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches;function step(){if(run!==token)return;const f=schedule[i%schedule.length];img.src=e.frames[f.role];img.alt=e.title+" · "+f.role;if(!reduced){i++;timer=setTimeout(step,Math.max(80,f.durationMs));}}step();}
era.addEventListener("change",render);document.querySelectorAll("[data-phase]").forEach(b=>b.addEventListener("click",()=>{phase=b.dataset.phase;render();}));document.addEventListener("visibilitychange",()=>{if(document.hidden){clearTimeout(timer);token++;}else render();});render();
</script></body></html>`;

await mkdir(BUILD_DIR, { recursive: true });
await writeFile(PREVIEW_PATH, previewHtml, "utf8");

const reportUnsigned = {
  schema: "starcraft_tmg_kerrigan_all_era_dynamic_dialogue_portraits_verification_v1",
  generatedAt: T0,
  ticket: 13,
  slice: 127,
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  planHash: KERRIGAN_ALL_ERA_DYNAMIC_PORTRAIT_PLAN_V1.planHash,
  bindingHash: KERRIGAN_PERSONA_VISUAL_BINDINGS_V2.bindingHash,
  generationAuditHash: KERRIGAN_ALL_ERA_DYNAMIC_GENERATION_AUDIT_V1.auditHash,
  denominator: {
    personaManifests: 8,
    sharedStateMachines: 1,
    semanticRolesPerPersona: 5,
    totalFrames: 40,
    newGeneratedFrames: 28,
    phases: 6,
    modes: 4,
    phasePersonaViews: 48,
    modePersonaViews: 32,
  },
  outputs: {
    previewPath: path.relative(ROOT, PREVIEW_PATH),
    reportPath: path.relative(ROOT, REPORT_PATH),
  },
  publicReleaseReady: false,
  productionReady: false,
  sourceRefreshPerformed: false,
  providerCalled: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingPromotion: false,
  trainingTruth: false,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: [
      "select_character_persona",
      "reduce_dialogue_portrait_phase",
      "resolve_dialogue_portrait_schedule",
      "render_character_presentation",
    ],
    uiTraceEvidence: [
      "eight_era_selector_preview",
      "six_phase_schedule_per_era",
      "shared_web_app_semantic_content",
      "reduced_motion_single_frame",
      "offline_static_read_only",
      "public_first_party_fallback",
    ],
    agentDecisionEvidence: "deterministic_visual_state_machine_no_live_provider",
    memoryTraceEvidence: [],
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "asset_receipt_or_manifest_hash_drift_rejects_before_render",
      "missing_frame_never_reuses_another_era",
      "public_rights_failure_demotes_to_project_d_original_adjutant",
      "reduced_motion_or_offline_demotes_to_one_static_frame",
    ],
    userVisibleChecks: [
      "eight_distinct_era_visual_sets",
      "idle_listening_thinking_speaking_confirmation_and_error_states",
      "one_visible_selected_persona_animates",
      "no_cross_era_anatomy_costume_or_spoiler_reuse",
    ],
  },
};

const report = { ...reportUnsigned, reportHash: hashStarcraftTmgContract(reportUnsigned) };
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
