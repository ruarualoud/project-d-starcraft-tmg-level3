#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1 } from
  "../content/characters/kerrigan-worldbook-catalog-v1.mjs";
import { createKerriganPrimalProductBundleV1 } from
  "../content/characters/kerrigan-primal-v1.mjs";
import { KERRIGAN_PERSONA_VISUAL_BINDINGS_V1 } from
  "../content/characters/kerrigan-persona-visual-bindings-v1.mjs";
import {
  KERRIGAN_ERA_VISUAL_PLAN_V1,
  KERRIGAN_GENERATED_ERA_RECEIPTS_V1,
} from "../content/characters/kerrigan-era-visuals-v1.mjs";
import { createStarcraftTmgCharacterPersonaSelectorV1 } from
  "../packages/character-agent/character-persona-selector-v1.mjs";
import {
  createCharacterPackage,
  createWorldbook,
} from "../packages/character-agent/contracts-v1.mjs";
import { createStarcraftTmgConfiguredCharacterSessionFactory } from
  "../packages/product-composition/character-session-factory-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { assertStarcraftTmgVisualGenerationReceiptV1 } from
  "../packages/character-agent/visual-generation-receipt-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_DIR = path.join(ROOT, "build/character-persona-selector-v1");
const REPORT_PATH = path.join(BUILD_DIR, "report.json");
const PREVIEW_PATH = path.join(BUILD_DIR, "preview.json");
const COMPARISON_PATH = path.join(BUILD_DIR, "era-comparison.html");
const OCCURRED_AT = "2026-09-03T00:15:00.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
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

function expectRejected(result, reason, message) {
  assert(result?.ok === false && result.reason === reason, `${message}: ${result?.reason || "no rejection"}`);
}

function characterInput(characterPackage) {
  const { schemaVersion: _schemaVersion, contractType: _contractType, integrity: _integrity, ...input } = clone(characterPackage);
  return input;
}

function syntheticPersona(index, characterId) {
  const rank = 90 + index;
  return createWorldbook({
    worldbookId: `selector.scale_probe.persona_${String(index).padStart(2, "0")}`,
    characterId,
    version: "selector-scale-probe-v1",
    title: `Scale probe persona ${index}`,
    worldbookKind: "persona_edition",
    personaState: `selector.scale_probe.state_${index}`,
    canonStatus: "platform_framing",
    timeline: { start: `synthetic-${index}`, end: `synthetic-${index}` },
    knowledgeCutoff: `synthetic_${index}`,
    knowledgeRank: rank,
    spoilerLevel: "verifier_only",
    spoilerRank: rank,
    visualIdentity: { state: "verifier_only", assetPolicy: "none" },
    affiliations: [],
    relationshipEdges: [],
    controlState: {},
    facts: [],
    entries: [],
    activation: { always: true, modes: ["tutor", "opponent", "commentator", "companion"] },
    sourceRefs: [],
    unresolvedContradictions: [],
    rulesAuthority: "external_rules_service",
    matchStateSource: "room_tools_only",
    extensions: { verifierOnly: true, officialDataClaim: false },
  });
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

const bundle = createKerriganPrimalProductBundleV1();
const selector = createStarcraftTmgCharacterPersonaSelectorV1({
  characterPackage: bundle.characterPackage,
  worldbooks: KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1,
  personaVisualBindingSet: KERRIGAN_PERSONA_VISUAL_BINDINGS_V1,
});
let defaultState = null;
let defaultView = null;
let epilogueState = null;
let lowCeilingState = null;
let offlineSnapshot = null;
let extendedSelector = null;

await check("current_catalogue_projects_all_eight_personas_visuals_plus_independent_tmg_context", () => {
  assert(selector.catalogue.personaItems.length === 8, "current persona data denominator mismatch");
  assert(selector.catalogue.contextItems.length === 1, "current context denominator mismatch");
  assert(selector.catalogue.contextItems[0].worldbookId === "tmg.kerrigans_swarm.rules_context", "TMG context missing");
  assert(selector.catalogue.capacityPolicy === "unbounded_versioned_catalogue_no_fixed_persona_denominator", "persona capacity was fixed at eight");
  assert(selector.catalogue.availablePersonaVisualCount === 8, "all current personas must have an era-specific visual");
  assert(selector.catalogue.staticPersonaVisualCount === 8, "static era-anchor denominator mismatch");
  assert(selector.catalogue.dynamicPersonaVisualCount === 1, "only the accepted primal era may claim the five-frame dynamic manifest");
  assert(selector.catalogue.personaVisualBindings.every((entry) => entry.staticPortraitRef), "a persona is missing its static era anchor");
  assert(selector.catalogue.personaVisualBindings.filter((entry) => entry.dialoguePortraitManifestRef).map((entry) => entry.personaWorldbookId).join("") === "hots.primal_queen.post_zerus", "dynamic portrait was bound to the wrong persona");
  assert(selector.catalogue.personaItems.map((entry) => entry.spoilerRank).join("/") === "10/20/30/40/50/60/70/80", "persona ordering is not deterministic");
});

await check("seven_new_era_portrait_receipts_match_exact_tracked_png_bytes_and_dimensions", async () => {
  assert(KERRIGAN_GENERATED_ERA_RECEIPTS_V1.length === 7, "generated era receipt denominator mismatch");
  for (const receipt of KERRIGAN_GENERATED_ERA_RECEIPTS_V1) {
    assertStarcraftTmgVisualGenerationReceiptV1(receipt);
    const bytes = await readFile(path.join(ROOT, receipt.output.path));
    assert(sha256(bytes) === receipt.output.contentHash, `${receipt.assetId} content hash mismatch`);
    assert(bytes.length === receipt.output.byteLength, `${receipt.assetId} byte length mismatch`);
    assert(bytes.subarray(1, 4).toString("ascii") === "PNG", `${receipt.assetId} is not PNG`);
    assert(bytes.readUInt32BE(16) === receipt.output.width && bytes.readUInt32BE(20) === receipt.output.height, `${receipt.assetId} dimensions mismatch`);
    assert(receipt.generator.provider === "openai_builtin_imagegen" && receipt.generator.externalCredentialUsed === false, `${receipt.assetId} generator provenance drift`);
    assert(receipt.publicReleaseAllowed === false && receipt.authority.canCreateTrainingTruth === false, `${receipt.assetId} release/authority widened`);
  }
});

await check("default_state_selects_exactly_one_primal_persona_and_tmg_context", () => {
  const created = selector.createState({ updatedAt: OCCURRED_AT });
  assert(created.ok, `default selector failed: ${created.reason || "unknown"}`);
  defaultState = created.state;
  defaultView = selector.readView(defaultState);
  assert(defaultState.personaState === "hots.primal.post_zerus.pre_lotv", "default persona state drift");
  assert(defaultView.personaOptions.filter((entry) => entry.selected).length === 1, "selector did not enforce exactly one persona");
  assert(defaultView.contextOptions.filter((entry) => entry.selected).length === 1, "default TMG context missing");
  assert(defaultView.sessionSelectionInput.worldbookIds.join("/") === "hots.primal_queen.post_zerus/tmg.kerrigans_swarm.rules_context", "session selection input drift");
  assert(defaultView.selectedVisual.visualStatus === "available_development" && defaultView.selectedVisual.dialoguePortraitManifestRef, "default primal portrait binding missing");
});

await check("catalogue_accepts_arbitrary_versioned_persona_additions_without_an_eight_item_branch", () => {
  const additions = Array.from({ length: 16 }, (_, index) => syntheticPersona(index + 1, bundle.characterPackage.characterId));
  const input = characterInput(bundle.characterPackage);
  const extendedPackage = createCharacterPackage({
    ...input,
    version: "selector-scale-probe-v1",
    worldbookIds: [...input.worldbookIds, ...additions.map((entry) => entry.worldbookId)],
  });
  extendedSelector = createStarcraftTmgCharacterPersonaSelectorV1({
    characterPackage: extendedPackage,
    worldbooks: [...KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1, ...additions],
    personaVisualBindingSet: KERRIGAN_PERSONA_VISUAL_BINDINGS_V1,
  });
  const created = extendedSelector.createState({ updatedAt: OCCURRED_AT });
  assert(created.ok, "extended selector failed");
  const view = extendedSelector.readView(created.state);
  assert(view.personaCount === 24 && view.personaOptions.length === 24, "extended persona catalogue was truncated");
  assert(view.personaSelectionMode === "exactly_one" && view.personaOptions.filter((entry) => entry.selected).length === 1, "extended catalogue broke mutual exclusion");
});

await check("spoiler_and_knowledge_ceilings_independently_disable_later_personas", () => {
  const created = selector.createState({
    personaWorldbookId: "lotv.xelnaga_epilogue",
    spoilerCeilingRank: 80,
    knowledgeCeilingRank: 60,
    updatedAt: OCCURRED_AT,
  });
  assert(created.ok && created.state.personaWorldbookId === "hots.primal_queen.post_zerus", "knowledge fallback did not retain highest configured safe default");
  assert(created.state.fallbackReason === "requested_persona_exceeds_ceiling_or_policy", "knowledge fallback was not disclosed");
  const view = selector.readView(created.state);
  assert(view.personaOptions.find((entry) => entry.worldbookId === "lotv.coalition_pre_ascension").disabledReason === "knowledge_ceiling", "knowledge ceiling reason missing");
  assert(view.personaOptions.find((entry) => entry.worldbookId === "lotv.xelnaga_epilogue").disabledReason === "knowledge_ceiling", "epilogue knowledge ceiling reason missing");
});

await check("explicit_epilogue_selection_requires_rank_eighty_opt_in_and_uses_only_its_static_era_anchor", () => {
  const created = selector.createState({ spoilerCeilingRank: 80, knowledgeCeilingRank: 80, updatedAt: OCCURRED_AT });
  assert(created.ok, "rank-80 selector failed");
  const selected = selector.dispatch(created.state, {
    type: "select_persona",
    expectedRevision: 0,
    personaWorldbookId: "lotv.xelnaga_epilogue",
    occurredAt: OCCURRED_AT,
  });
  assert(selected.ok && selected.state.personaState === "lotv.xelnaga.epilogue", "explicit epilogue selection failed");
  epilogueState = selected.state;
  const epilogueView = selector.readView(epilogueState);
  assert(epilogueView.selectedVisual.visualStatus === "available_development", "epilogue visual is not available");
  assert(epilogueView.selectedVisual.staticPortraitRef.id === "kerrigan.era.lotv-xelnaga.v1", "epilogue static portrait binding drift");
  assert(epilogueView.selectedVisual.dialoguePortraitManifestRef === null, "epilogue incorrectly reused the primal dynamic portrait");
  const deniedAtSixty = selector.dispatch(defaultState, {
    type: "select_persona",
    expectedRevision: 0,
    personaWorldbookId: "lotv.xelnaga_epilogue",
    occurredAt: OCCURRED_AT,
  });
  expectRejected(deniedAtSixty, "persona_exceeds_ceiling_or_policy", "rank-60 state selected epilogue");
});

await check("lowering_ceilings_deterministically_falls_back_to_latest_safe_persona", () => {
  const lowered = selector.dispatch(epilogueState, {
    type: "set_ceilings",
    expectedRevision: epilogueState.revision,
    spoilerCeilingRank: 25,
    knowledgeCeilingRank: 25,
    occurredAt: OCCURRED_AT,
  });
  assert(lowered.ok, `ceiling reduction failed: ${lowered.reason || "unknown"}`);
  lowCeilingState = lowered.state;
  assert(lowCeilingState.personaWorldbookId === "sc1.infested.overmind_char", "fallback was not the latest safe rank-20 persona");
  assert(lowCeilingState.fallbackReason === "active_persona_exceeded_new_ceiling", "ceiling fallback was not disclosed");
  const repeated = selector.createState({
    personaWorldbookId: "missing.future.persona",
    spoilerCeilingRank: 25,
    knowledgeCeilingRank: 25,
    updatedAt: OCCURRED_AT,
  });
  assert(repeated.ok && repeated.state.personaWorldbookId === lowCeilingState.personaWorldbookId, "initial fallback is not deterministic");
});

await check("context_selection_is_independent_but_cannot_smuggle_a_second_persona", () => {
  const none = selector.dispatch(defaultState, {
    type: "select_contexts",
    expectedRevision: 0,
    contextWorldbookIds: [],
    occurredAt: OCCURRED_AT,
  });
  assert(none.ok && none.state.contextWorldbookIds.length === 0 && none.state.personaWorldbookId === defaultState.personaWorldbookId, "context toggle changed persona");
  const secondPersona = selector.dispatch(defaultState, {
    type: "select_contexts",
    expectedRevision: 0,
    contextWorldbookIds: ["sc1.terran_ghost.pre_tarsonis"],
    occurredAt: OCCURRED_AT,
  });
  expectRejected(secondPersona, "invalid_context_selection", "persona entered context list");
});

await check("revision_cas_and_state_hash_reject_stale_events_and_tamper", () => {
  const advanced = selector.dispatch(defaultState, {
    type: "set_connectivity",
    expectedRevision: 0,
    connectivity: "offline",
    occurredAt: OCCURRED_AT,
  });
  assert(advanced.ok && advanced.state.revision === 1, "selector revision did not advance");
  const stale = selector.dispatch(advanced.state, {
    type: "set_connectivity",
    expectedRevision: 0,
    connectivity: "online",
    occurredAt: OCCURRED_AT,
  });
  expectRejected(stale, "stale_selector_revision", "stale selector event was accepted");
  const tampered = clone(defaultState);
  tampered.personaWorldbookId = "lotv.xelnaga_epilogue";
  const rejected = selector.dispatch(tampered, {
    type: "set_connectivity",
    expectedRevision: 0,
    connectivity: "offline",
    occurredAt: OCCURRED_AT,
  });
  expectRejected(rejected, "invalid_selector_event", "tampered selector state was accepted");
});

await check("offline_snapshot_is_self_contained_read_only_and_integrity_bound", () => {
  const offline = selector.dispatch(defaultState, {
    type: "set_connectivity",
    expectedRevision: 0,
    connectivity: "offline",
    occurredAt: OCCURRED_AT,
  });
  assert(offline.ok, "offline transition failed");
  offlineSnapshot = selector.exportOfflineSnapshot(offline.state);
  const restored = selector.restoreOfflineSnapshot(offlineSnapshot);
  assert(restored.ok && restored.readOnly && restored.view.viewHash === offlineSnapshot.view.viewHash, "offline snapshot restore failed");
  const offlineMutation = selector.dispatch(restored.state, {
    type: "select_persona",
    expectedRevision: restored.state.revision,
    personaWorldbookId: "sc1.terran_ghost.pre_tarsonis",
    occurredAt: OCCURRED_AT,
  });
  expectRejected(offlineMutation, "offline_selector_read_only", "offline snapshot allowed a selection mutation");
  assert(!JSON.stringify(offlineSnapshot).includes("During the Heart of the Swarm"), "offline snapshot retained worldbook facts/prompts");
  const tampered = clone(offlineSnapshot);
  tampered.view.personaCount = 999;
  expectRejected(selector.restoreOfflineSnapshot(tampered), "invalid_offline_snapshot", "tampered offline snapshot was accepted");
  expectRejected(extendedSelector.restoreOfflineSnapshot(offlineSnapshot), "invalid_offline_snapshot", "snapshot crossed a catalogue version");
});

await check("selector_output_feeds_existing_session_factory_without_contract_translation", () => {
  const resolved = selector.resolveForSession(defaultState);
  assert(resolved.ok && resolved.receipt.selectionHash === defaultState.selectionHash, "selector/session selection hashes diverged");
  const factory = createStarcraftTmgConfiguredCharacterSessionFactory({
    allowRightsGatedDemo: true,
    now: () => OCCURRED_AT,
  });
  const sessionInput = factory.sessionInputFactory({
    sessionId: "selector-factory-proof",
    mode: "tutor",
    roomId: "selector-proof-room",
    seatId: "player1",
    ...resolved.sessionInput,
    createdAt: OCCURRED_AT,
  });
  assert(sessionInput.worldbooks.length === 2, "factory lost persona/context selection");
  assert(sessionInput.worldbooks.filter((entry) => entry.worldbookKind === "persona_edition").length === 1, "factory received multiple personas");
  assert(sessionInput.spoilerCeilingRank === defaultState.spoilerCeilingRank, "factory ceiling mismatch");
});

await check("catalogue_or_worldbook_drift_fails_before_selector_state_creation", () => {
  const missing = KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1.slice(0, -1);
  let missingRejected = false;
  try {
    createStarcraftTmgCharacterPersonaSelectorV1({ characterPackage: bundle.characterPackage, worldbooks: missing });
  } catch {
    missingRejected = true;
  }
  assert(missingRejected, "incomplete catalogue was accepted");
  const changed = clone(KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1[0]);
  changed.title = "tampered";
  let tamperRejected = false;
  try {
    createStarcraftTmgCharacterPersonaSelectorV1({
      characterPackage: bundle.characterPackage,
      worldbooks: [changed, ...KERRIGAN_COMPLETE_WORLDBOOK_CATALOG_V1.slice(1)],
    });
  } catch {
    tamperRejected = true;
  }
  assert(tamperRejected, "tampered worldbook was accepted");
});

await check("selector_grants_no_lore_rules_room_skill_dsh_memory_or_training_authority", () => {
  for (const value of [selector.catalogue, defaultState, defaultView, offlineSnapshot]) {
    assert(value.rulesAuthority === "external_rules_service" || value.authority?.rulesAuthority === false, "selector widened Rules authority");
    assert(value.roomMutationAuthority === false || value.authority?.roomMutationAuthority === false, "selector widened room authority");
    assert(value.trainingTruth === false || value.authority?.trainingTruth === false, "selector created training truth");
  }
  assert(defaultView.sessionSelectionInput.allowFanon === false, "selector silently enabled fanon");
  assert(defaultView.personaOptions.every((entry) => !Object.hasOwn(entry, "facts") && !Object.hasOwn(entry, "entries")), "selector view leaked prompt/fact bodies");
});

await mkdir(BUILD_DIR, { recursive: true });
await writeFile(PREVIEW_PATH, `${JSON.stringify({
  schema: "starcraft_tmg_character_persona_selector_preview_v1",
  catalogue: selector.catalogue,
  state: defaultState,
  view: defaultView,
  offlineSnapshot,
}, null, 2)}\n`, "utf8");

const eraCards = defaultView.personaOptions.map((persona, index) => `
  <article>
    <img src="../../${escapeHtml(persona.visual.staticPortraitRef.path)}" alt="${escapeHtml(persona.title)}">
    <div class="copy">
      <span class="rank">ERA ${String(index + 1).padStart(2, "0")} · rank ${persona.spoilerRank}</span>
      <h2>${escapeHtml(persona.title)}</h2>
      <p>${escapeHtml(persona.personaState)}</p>
      <span class="mode">${persona.visual.dialoguePortraitManifestRef ? "五帧动态" : "静态时代基准"}</span>
    </div>
  </article>`).join("");
await writeFile(COMPARISON_PATH, `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>凯瑞甘八时代视觉对比</title><style>
*{box-sizing:border-box}body{margin:0;background:#080a09;color:#e8e1cf;font:14px/1.5 ui-sans-serif,system-ui;padding:28px}header{max-width:1480px;margin:0 auto 22px}h1{font-size:clamp(26px,4vw,52px);margin:0}.lead{color:#9ea89d;max-width:800px}.grid{max-width:1480px;margin:auto;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px}article{background:#111612;border:1px solid #273128;overflow:hidden;box-shadow:0 12px 34px #0008}img{display:block;width:100%;aspect-ratio:1;object-fit:cover}.copy{padding:13px 14px 16px}.rank,.mode{font:11px/1.2 ui-monospace,monospace;letter-spacing:.08em;color:#cba95f}.mode{display:inline-block;margin-top:6px;border:1px solid #4a543e;padding:5px 7px;color:#aebb97}h2{font-size:17px;margin:6px 0 2px}p{margin:0;color:#89938a;font:12px ui-monospace,monospace}@media(max-width:980px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:540px){body{padding:14px}.grid{grid-template-columns:1fr}}
</style></head><body><header><h1>凯瑞甘 · 八时代视觉对比</h1><p class="lead">同一角色身份、同一通讯头像构图，按人格世界书的时间线展示。当前全部可用于开发预览；只有泽鲁斯后的原始刀锋女王已有五帧动态，其余为静态时代基准。</p></header><main class="grid">${eraCards}</main></body></html>\n`, "utf8");

const reportUnsigned = {
  schema: "starcraft_tmg_character_persona_selector_verification_v1",
  generatedAt: OCCURRED_AT,
  ticket: 13,
  slice: 123,
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  characterPackageHash: bundle.characterPackage.integrity.hash,
  catalogueHash: selector.catalogue.catalogueHash,
  personaVisualBindingHash: KERRIGAN_PERSONA_VISUAL_BINDINGS_V1.bindingHash,
  eraVisualPlanHash: KERRIGAN_ERA_VISUAL_PLAN_V1.planHash,
  eraVisualReceiptHashes: KERRIGAN_GENERATED_ERA_RECEIPTS_V1.map((entry) => entry.receiptHash),
  currentPersonaCount: selector.catalogue.personaItems.length,
  currentContextCount: selector.catalogue.contextItems.length,
  currentProducedPersonaVisualCount: selector.catalogue.availablePersonaVisualCount,
  currentStaticPersonaVisualCount: selector.catalogue.staticPersonaVisualCount,
  currentDynamicPersonaVisualCount: selector.catalogue.dynamicPersonaVisualCount,
  scaleProbePersonaCount: extendedSelector?.catalogue.personaItems.length || null,
  defaultStateHash: defaultState?.stateHash || null,
  defaultViewHash: defaultView?.viewHash || null,
  lowCeilingStateHash: lowCeilingState?.stateHash || null,
  offlineSnapshotHash: offlineSnapshot?.snapshotHash || null,
  previewPath: path.relative(ROOT, PREVIEW_PATH),
  comparisonPreviewPath: path.relative(ROOT, COMPARISON_PATH),
  sourceRefreshPerformed: false,
  publicReleaseReady: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingPromotion: false,
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: ["list_character_personas", "select_character_persona", "set_spoiler_knowledge_ceiling", "resolve_worldbooks_for_session"],
    uiTraceEvidence: ["shared_selector_view_with_current_eight_plus_context", "self_contained_content_free_offline_snapshot"],
    agentDecisionEvidence: [],
    memoryTraceEvidence: [],
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "missing_tampered_or_cross_catalogue_worldbooks_reject_before_selection",
      "lowered_ceiling_deterministically_falls_back_to_latest_safe_persona",
      "stale_revision_or_state_snapshot_hash_rejects",
      "offline_snapshot_is_read_only_until_reconnected",
    ],
    userVisibleChecks: [
      "exactly_one_persona_with_independent_tmg_context",
      "later_personas_show_spoiler_or_knowledge_disabled_reason",
      "fallback_reason_is_visible",
      "catalogue_accepts_more_than_eight_personas",
      "all_eight_personas_use_distinct_static_era_anchors",
      "only_primal_persona_advertises_the_current_five_frame_dynamic_manifest",
    ],
  },
};
const report = { ...reportUnsigned, reportHash: hashStarcraftTmgContract(reportUnsigned) };
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (failures.length) throw new Error(failures.join("\n"));
console.log(JSON.stringify(report, null, 2));
