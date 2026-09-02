#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1 } from
  "../content/characters/kerrigan-dynamic-dialogue-portrait-v1.mjs";
import { KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1 } from
  "../content/characters/kerrigan-worldbook-catalog-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import { KERRIGAN_PERSONA_VISUAL_BINDINGS_V1 } from
  "../content/characters/kerrigan-persona-visual-bindings-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  STARCRAFT_TMG_CHARACTER_PRESENTATION_CSS_V1,
  STARCRAFT_TMG_CHARACTER_PRESENTATION_WEB_RUNTIME_V1,
  createStarcraftTmgCharacterPresentationViewModelV1,
  renderStarcraftTmgCharacterPresentationHtmlV1,
  renderStarcraftTmgCharacterPresentationNativeTreeV1,
} from "../packages/character-agent/character-presentation-v1.mjs";
import { createStarcraftTmgCharacterPersonaSelectorV1 } from
  "../packages/character-agent/character-persona-selector-v1.mjs";
import {
  createStarcraftTmgDynamicDialoguePortraitStateV1,
  reduceStarcraftTmgDynamicDialoguePortraitStateV1,
  resolveStarcraftTmgDynamicDialoguePortraitV1,
} from "../packages/character-agent/dynamic-dialogue-portrait-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = path.join(ROOT, "build/character-presentation-v1");
const REPORT_PATH = path.join(BUILD_DIR, "report.json");
const PREVIEW_PATH = path.join(BUILD_DIR, "preview.html");
const NATIVE_PATH = path.join(BUILD_DIR, "app-native-tree.json");
const T0 = "2026-09-03T01:00:00.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectCode(fn, code, message) {
  let rejected = false;
  try { fn(); } catch (error) { rejected = error?.code === code; }
  assert(rejected, message);
}

const bundle = createKerriganPrimalProductBundleV1();
const selector = createStarcraftTmgCharacterPersonaSelectorV1({
  characterPackage: bundle.characterPackage,
  worldbooks: KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1,
  personaVisualBindingSet: KERRIGAN_PERSONA_VISUAL_BINDINGS_V1,
});
const created = selector.createState({ updatedAt: T0 });
assert(created.ok, "default selector state failed");
const defaultState = created.state;
const defaultSelectorView = selector.readView(defaultState);
const portraitCreated = createStarcraftTmgDynamicDialoguePortraitStateV1(
  KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1,
  { mode: "tutor", updatedAt: T0 },
);
const portraitSpeaking = reduceStarcraftTmgDynamicDialoguePortraitStateV1(
  KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1,
  portraitCreated,
  { type: "provider_output_accepted", visualCue: "explain", occurredAt: "2026-09-03T01:00:01.000Z" },
);
const dialoguePortraitView = resolveStarcraftTmgDynamicDialoguePortraitV1(
  KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1,
  portraitSpeaking,
  { environment: "development" },
);

const baseInput = {
  characterPackage: bundle.characterPackage,
  selectorView: defaultSelectorView,
  dialoguePortraitView,
  environment: "development",
  locale: "zh-CN",
  localeFallbacks: ["en-US"],
  viewportWidth: 1280,
};

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

let web;
let app;
let html;
let nativeTree;
let ghostModel;
let publicModel;
let offlineModel;
let reducedModel;

await check("web_and_app_share_hash_identical_character_persona_portrait_content", () => {
  web = createStarcraftTmgCharacterPresentationViewModelV1({ ...baseInput, surface: "web" });
  app = createStarcraftTmgCharacterPresentationViewModelV1({ ...baseInput, surface: "app" });
  assert(web.sharedContentHash === app.sharedContentHash, "Web/App semantic content diverged");
  assert(web.viewModelHash !== app.viewModelHash, "surface-specific view models were not identified");
  assert(web.content.character.hash === bundle.characterPackage.integrity.hash, "CharacterPackage hash missing");
  assert(web.content.selector.viewHash === defaultSelectorView.viewHash, "selector view hash missing");
  assert(web.content.selector.personaOptions.length === 8, "persona denominator mismatch");
  assert(web.content.selector.personaOptions.filter((entry) => entry.available).every((entry) => entry.thumbnail), "available era thumbnail missing");
  assert(web.content.selector.personaOptions.filter((entry) => !entry.available).every((entry) => entry.thumbnail === null), "locked later-era thumbnail leaked through ceiling");
});

await check("selected_primal_persona_renders_the_server_owned_dynamic_schedule", () => {
  assert(web.content.portrait.kind === "dynamic" && web.content.portrait.dynamic, "primal portrait is not dynamic");
  assert(web.content.portrait.animation.mode === "tutor" && web.content.portrait.animation.phase === "speaking", "server mode/phase lost");
  assert(web.content.portrait.animation.visualCue === "explain", "validated visual cue lost");
  assert(web.content.portrait.animation.frameSchedule.length === 4, "speaking frame schedule mismatch");
  assert(web.content.portrait.animation.manifestHash === KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.manifestHash, "dynamic manifest binding lost");
  assert(web.content.portrait.animation.frameSchedule.every((entry) => entry.outputPath.startsWith("assets/characters/")), "unsafe dynamic asset path");
});

await check("static_only_era_uses_its_own_anchor_and_rejects_a_foreign_dynamic_view", () => {
  const selected = selector.dispatch(defaultState, {
    type: "select_persona",
    expectedRevision: 0,
    personaWorldbookId: "sc1.terran_ghost.pre_tarsonis",
    occurredAt: "2026-09-03T01:00:02.000Z",
  });
  assert(selected.ok, "Ghost selection failed");
  const ghostSelectorView = selector.readView(selected.state);
  ghostModel = createStarcraftTmgCharacterPresentationViewModelV1({
    ...baseInput,
    surface: "web",
    selectorView: ghostSelectorView,
    dialoguePortraitView: null,
  });
  assert(ghostModel.content.portrait.kind === "static" && ghostModel.content.portrait.dynamic === false, "Ghost era claimed dynamic capability");
  assert(ghostModel.content.portrait.asset.id === "kerrigan.era.sc1-terran-ghost.v1", "Ghost portrait cross-era mismatch");
  assert(ghostModel.content.portrait.reason === "persona_has_static_era_anchor_only", "static capability reason missing");
  expectCode(() => createStarcraftTmgCharacterPresentationViewModelV1({
    ...baseInput,
    surface: "web",
    selectorView: ghostSelectorView,
  }), "CHARACTER_PRESENTATION_UNBOUND_DYNAMIC_VIEW", "foreign dynamic view was accepted for Ghost");
});

await check("public_environment_hides_all_rights_gated_derived_paths_and_uses_first_party_fallback", () => {
  publicModel = createStarcraftTmgCharacterPresentationViewModelV1({
    ...baseInput,
    surface: "web",
    environment: "public",
    dialoguePortraitView: null,
  });
  const publicHtml = renderStarcraftTmgCharacterPresentationHtmlV1(publicModel);
  const publicNative = renderStarcraftTmgCharacterPresentationNativeTreeV1(
    createStarcraftTmgCharacterPresentationViewModelV1({
      ...baseInput,
      surface: "app",
      environment: "public",
      dialoguePortraitView: null,
    }),
  );
  assert(publicModel.content.portrait.kind === "first_party_fallback", "public fallback missing");
  assert(publicModel.content.portrait.characterId === "project-d.original.tactical-adjutant", "wrong public fallback identity");
  assert(publicModel.content.selector.personaOptions.every((entry) => entry.thumbnail === null), "public selector leaked derived thumbnails");
  assert(!publicHtml.includes("assets/characters/") && !JSON.stringify(publicNative).includes("assets/characters/"), "public render leaked derived paths");
});

await check("offline_sealed_selector_snapshot_is_visible_but_every_persona_control_is_read_only", () => {
  const offline = selector.dispatch(defaultState, {
    type: "set_connectivity",
    expectedRevision: 0,
    connectivity: "offline",
    occurredAt: "2026-09-03T01:00:03.000Z",
  });
  assert(offline.ok, "offline transition failed");
  offlineModel = createStarcraftTmgCharacterPresentationViewModelV1({
    ...baseInput,
    surface: "app",
    selectorView: selector.readView(offline.state),
  });
  const tree = renderStarcraftTmgCharacterPresentationNativeTreeV1(offlineModel);
  const radios = tree.children.find((entry) => entry.type === "RadioGroup").children;
  assert(offlineModel.content.selector.readOnly, "offline model not marked read-only");
  assert(offlineModel.content.selector.personaOptions.every((entry) => entry.selectEnabled === false), "offline persona remained selectable");
  assert(radios.every((entry) => entry.enabled === false && entry.expectedRevision === 1), "native offline controls not disabled/CAS-bound");
});

await check("desktop_tablet_mobile_layouts_keep_square_portrait_touch_targets_and_board_geometry_isolated", () => {
  const models = [
    createStarcraftTmgCharacterPresentationViewModelV1({ ...baseInput, surface: "web", viewportWidth: 1280 }),
    createStarcraftTmgCharacterPresentationViewModelV1({ ...baseInput, surface: "web", viewportWidth: 800 }),
    createStarcraftTmgCharacterPresentationViewModelV1({ ...baseInput, surface: "app", viewportWidth: 390 }),
  ];
  assert(models.map((entry) => entry.layout.className).join("/") === "desktop/tablet/mobile", "responsive breakpoints mismatch");
  assert(models.every((entry) => entry.layout.portraitAspectRatio === 1 && entry.layout.portraitObjectFit === "cover"), "portrait scale contract drift");
  assert(models.every((entry) => entry.layout.minimumTouchTargetCssPx === 44 && entry.layout.responsiveWithoutHorizontalOverflow), "touch/overflow contract drift");
  assert(models.every((entry) => Object.values(entry.layout.boardGeometryIsolation).every((value) => value === false)), "character UI changed battlefield geometry");
  assert(models.every((entry) => entry.sharedContentHash === web.sharedContentHash), "viewport changed semantic content");
});

await check("reduced_motion_collapses_dynamic_schedule_to_one_server_selected_frame", () => {
  reducedModel = createStarcraftTmgCharacterPresentationViewModelV1({
    ...baseInput,
    surface: "web",
    reducedMotion: true,
  });
  assert(reducedModel.content.portrait.dynamic, "reduced motion removed dynamic capability metadata");
  assert(reducedModel.content.portrait.animation.reducedMotion, "reduced motion flag missing");
  assert(reducedModel.content.portrait.animation.frameSchedule.length === 1
    && reducedModel.content.portrait.animation.frameSchedule[0].durationMs === 0,
  "reduced motion did not collapse to one frame");
});

await check("web_html_css_and_runtime_are_accessible_responsive_and_schedule_bound", () => {
  html = renderStarcraftTmgCharacterPresentationHtmlV1(web);
  assert(html.includes('role="region"') && html.includes('role="radiogroup"'), "Web landmark/radiogroup missing");
  assert((html.match(/role="radio"/gu) || []).length === 8, "Web persona radio denominator mismatch");
  assert(html.includes('aria-live="polite"') && html.includes('data-dynamic="true"'), "portrait live/dynamic semantics missing");
  assert(html.includes(web.content.portrait.animation.scheduleHash), "Web schedule hash missing");
  assert(STARCRAFT_TMG_CHARACTER_PRESENTATION_CSS_V1.includes("min-block-size:44px")
    && STARCRAFT_TMG_CHARACTER_PRESENTATION_CSS_V1.includes("aspect-ratio:1")
    && STARCRAFT_TMG_CHARACTER_PRESENTATION_CSS_V1.includes("image-rendering:auto"), "Web CSS scale/touch contract missing");
  assert(STARCRAFT_TMG_CHARACTER_PRESENTATION_WEB_RUNTIME_V1.includes("prefers-reduced-motion")
    && STARCRAFT_TMG_CHARACTER_PRESENTATION_WEB_RUNTIME_V1.includes("frame.outputPath"), "Web animation runtime missing reduced-motion/path schedule");
});

await check("app_native_tree_preserves_the_same_semantics_accessibility_and_animation_schedule", () => {
  nativeTree = renderStarcraftTmgCharacterPresentationNativeTreeV1(app);
  const image = nativeTree.children.find((entry) => entry.type === "AnimatedImage");
  const radioGroup = nativeTree.children.find((entry) => entry.type === "RadioGroup");
  assert(nativeTree.semanticContentHash === app.sharedContentHash, "native semantic content hash missing");
  assert(image.animation.scheduleHash === web.content.portrait.animation.scheduleHash && image.resizeMode === "cover", "native animation/scale drift");
  assert(radioGroup.selectionMode === "exactly_one" && radioGroup.children.length === 8, "native persona semantics drift");
  assert(radioGroup.children.every((entry) => entry.accessibilityLabel && entry.minTouchTarget === 44), "native accessible touch target missing");
  assert(Object.values(nativeTree.boardGeometryIsolation).every((value) => value === false), "native tree changed board geometry");
});

await check("locale_fallback_is_deterministic_without_changing_selector_or_portrait_identity", () => {
  const zh = createStarcraftTmgCharacterPresentationViewModelV1({ ...baseInput, surface: "web", locale: "zh-Hans" });
  const en = createStarcraftTmgCharacterPresentationViewModelV1({ ...baseInput, surface: "app", locale: "fr-FR", localeFallbacks: ["en-US"] });
  assert(zh.locale === "zh-CN" && zh.localeFallbackUsed, "Chinese locale fallback mismatch");
  assert(en.locale === "en-US" && en.localeFallbackUsed, "English locale fallback mismatch");
  assert(zh.content.selector.viewHash === en.content.selector.viewHash, "locale changed selector identity");
  assert(zh.content.portrait.asset.hash === en.content.portrait.asset.hash, "locale changed portrait identity");
});

await check("selector_dynamic_and_asset_tamper_fail_before_rendering", () => {
  const selectorTamper = clone(defaultSelectorView);
  selectorTamper.personaOptions[5].title = "tampered";
  expectCode(() => createStarcraftTmgCharacterPresentationViewModelV1({
    ...baseInput,
    surface: "web",
    selectorView: selectorTamper,
  }), "CHARACTER_PRESENTATION_SELECTOR_VIEW_INVALID", "tampered selector rendered");
  const dynamicTamper = clone(dialoguePortraitView);
  dynamicTamper.frameSchedule[0].outputPath = "../../escape.png";
  expectCode(() => createStarcraftTmgCharacterPresentationViewModelV1({
    ...baseInput,
    surface: "web",
    dialoguePortraitView: dynamicTamper,
  }), "CHARACTER_PRESENTATION_DYNAMIC_VIEW_INVALID", "tampered dynamic view rendered");
  const visualTamper = clone(defaultSelectorView);
  visualTamper.selectedVisual.staticPortraitRef.path = "assets/characters/../../escape.png";
  visualTamper.personaOptions[5].visual.staticPortraitRef.path = "assets/characters/../../escape.png";
  visualTamper.viewHash = hashStarcraftTmgContract(Object.fromEntries(Object.entries(visualTamper).filter(([key]) => key !== "viewHash")));
  expectCode(() => createStarcraftTmgCharacterPresentationViewModelV1({
    ...baseInput,
    surface: "web",
    selectorView: visualTamper,
    dialoguePortraitView: null,
  }), "CHARACTER_PRESENTATION_STATIC_PATH_INVALID", "unsafe sealed asset path rendered");
});

await check("presentation_emits_only_selector_intent_and_no_lore_rules_room_or_training_authority", () => {
  const serialized = JSON.stringify(web);
  assert(!serialized.includes("During the Heart of the Swarm") && !serialized.includes("promptFragments"), "presentation leaked worldbook fact/prompt bodies");
  assert(web.content.actions.emitsSelectorIntentOnly && web.content.actions.requiresExpectedRevision, "selector-intent boundary missing");
  assert(web.content.actions.canApplyRoomAction === false && web.content.actions.canChangeRules === false, "presentation gained mutation authority");
  assert(web.rulesAuthority === "external_rules_service" && web.roomMutationAuthority === false && web.trainingTruth === false, "presentation authority widened");
});

await mkdir(BUILD_DIR, { recursive: true });
await writeFile(PREVIEW_PATH, `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="../../"><title>StarCraft TMG character presentation</title><style>body{margin:0;padding:20px;background:#050706;font-family:system-ui}${STARCRAFT_TMG_CHARACTER_PRESENTATION_CSS_V1}</style></head><body>${html}<script>${STARCRAFT_TMG_CHARACTER_PRESENTATION_WEB_RUNTIME_V1}</script></body></html>\n`, "utf8");
await writeFile(NATIVE_PATH, `${JSON.stringify(nativeTree, null, 2)}\n`, "utf8");

const reportUnsigned = {
  schema: "starcraft_tmg_character_presentation_verification_v1",
  generatedAt: T0,
  ticket: 13,
  slice: 124,
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  characterPackageHash: bundle.characterPackage.integrity.hash,
  selectorCatalogueHash: defaultSelectorView.catalogueHash,
  selectorViewHash: defaultSelectorView.viewHash,
  dynamicManifestHash: KERRIGAN_DYNAMIC_DIALOGUE_PORTRAIT_V1.manifestHash,
  webViewModelHash: web?.viewModelHash || null,
  appViewModelHash: app?.viewModelHash || null,
  sharedContentHash: web?.sharedContentHash || null,
  staticGhostViewModelHash: ghostModel?.viewModelHash || null,
  publicFallbackViewModelHash: publicModel?.viewModelHash || null,
  offlineViewModelHash: offlineModel?.viewModelHash || null,
  reducedMotionViewModelHash: reducedModel?.viewModelHash || null,
  personaCount: web?.content.selector.personaOptions.length || 0,
  responsiveLayoutCount: 3,
  minimumTouchTargetCssPx: 44,
  previewPath: path.relative(ROOT, PREVIEW_PATH),
  nativeTreePath: path.relative(ROOT, NATIVE_PATH),
  frameworkMounted: false,
  productionReady: false,
  sourceRefreshPerformed: false,
  providerCalled: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingPromotion: false,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: [
      "read_character_persona_selector_view",
      "emit_select_persona_intent",
      "read_dialogue_portrait_view",
      "render_character_presentation",
    ],
    uiTraceEvidence: [
      "web_semantic_html_and_dynamic_frame_schedule",
      "app_native_accessibility_tree_with_same_content_hash",
      "desktop_tablet_mobile_layout_contracts",
      "offline_read_only_and_public_rights_fallback_states",
    ],
    agentDecisionEvidence: [],
    memoryTraceEvidence: [],
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "selector_character_dynamic_or_asset_hash_drift_rejects_before_render",
      "static_only_persona_rejects_foreign_dynamic_manifest",
      "public_environment_removes_all_rights_gated_derived_paths",
      "offline_snapshot_disables_every_persona_selection_intent",
    ],
    userVisibleChecks: [
      "eight_persona_radio_controls_with_era_thumbnails",
      "square_cover_portrait_without_pixelated_scaling",
      "dynamic_speaking_schedule_and_reduced_motion_single_frame",
      "44px_web_and_app_controls",
      "no_character_panel_backflow_into_board_geometry",
    ],
  },
};
const report = { ...reportUnsigned, reportHash: hashStarcraftTmgContract(reportUnsigned) };
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (failures.length) throw new Error(failures.join("\n"));
console.log(JSON.stringify(report, null, 2));
