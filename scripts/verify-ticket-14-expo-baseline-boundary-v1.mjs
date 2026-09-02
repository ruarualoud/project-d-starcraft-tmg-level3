#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_SHARED_WEB_APP_BOUNDARY_V1 } from
  "../content/client/shared-web-app-boundary-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_ROOT = path.join(ROOT, "vendor/sc-tmg-expo-baseline-f07b3cb");
const BUILD_DIR = path.join(ROOT, "build/ticket-14-slice-128-expo-baseline-boundary-v1");
const REPORT_PATH = path.join(BUILD_DIR, "report.json");
const PREVIEW_PATH = path.join(BUILD_DIR, "preview.html");
const T0 = "2026-09-03T05:10:00.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.includes(key)));
}

async function baselineFiles() {
  const names = (await readdir(BASELINE_ROOT, { recursive: true })).sort();
  const files = [];
  for (const name of names) {
    const absolute = path.join(BASELINE_ROOT, name);
    const metadata = await stat(absolute);
    if (!metadata.isFile()) continue;
    const bytes = await readFile(absolute);
    files.push({
      path: name.replaceAll("\\", "/"),
      byteLength: bytes.length,
      sha256: sha256(bytes),
      executable: Boolean(metadata.mode & 0o111),
    });
  }
  return files;
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

const boundary = STARCRAFT_TMG_SHARED_WEB_APP_BOUNDARY_V1;
const files = await baselineFiles();
const fileManifestHash = hashStarcraftTmgContract(files);
const textFiles = files.filter((entry) => /(?:^|\/)(?:[^/]+\.(?:ts|tsx|js|mjs|json|md|sql|css)|\.npmrc|\.gitignore)$/u.test(entry.path));

await check("boundary_is_hash_sealed_and_bound_to_the_exact_recovered_source_identity", () => {
  assert(boundary.boundaryHash === hashStarcraftTmgContract(without(boundary, ["boundaryHash"])),
    "shared boundary hash mismatch");
  assert(boundary.sourceBaseline.commit === "f07b3cb78ce6bf119bdc529cde41dbe91e00a61d",
    "baseline commit drift");
  assert(boundary.sourceBaseline.gitTree === "4b8d248626ddb1b4dfb2faf4776731bdb3ee896e",
    "baseline tree drift");
  assert(boundary.sourceBaseline.authority === false, "baseline gained authority");
});

await check("tracked_baseline_contains_exactly_116_files_2650442_bytes_and_the_sealed_manifest", () => {
  assert(files.length === 116, `baseline file count drift: ${files.length}`);
  assert(files.reduce((sum, entry) => sum + entry.byteLength, 0) === 2650442, "baseline byte denominator drift");
  assert(fileManifestHash === "b5761d2fa1f1cb155696f1a145888ffbf1718c38113b38c439e9d9a8974a55ca",
    "baseline extracted-file manifest drift");
  assert(fileManifestHash === boundary.sourceBaseline.extractedFileManifestHash,
    "boundary does not bind extracted baseline bytes");
});

await check("expo_baseline_preserves_the_five_product_tabs_and_web_android_ios_identity", async () => {
  const requiredPaths = [
    "app/(tabs)/index.tsx",
    "app/(tabs)/army.tsx",
    "app/(tabs)/tools.tsx",
    "app/(tabs)/match.tsx",
    "app/(tabs)/settings.tsx",
    "app/_layout.tsx",
    "app.config.ts",
    "package.json",
    "pnpm-lock.yaml",
  ];
  const paths = new Set(files.map((entry) => entry.path));
  assert(requiredPaths.every((entry) => paths.has(entry)), "required Expo product file missing");
  const packageJson = JSON.parse(await readFile(path.join(BASELINE_ROOT, "package.json"), "utf8"));
  assert(packageJson.dependencies.expo === "~54.0.29"
    && packageJson.dependencies["react-native"] === "0.81.5"
    && packageJson.dependencies.react === "19.1.0", "Expo/RN/React source lock drift");
  const appConfig = await readFile(path.join(BASELINE_ROOT, "app.config.ts"), "utf8");
  assert(appConfig.includes('output: "static"') && appConfig.includes('androidPackage: bundleId')
    && appConfig.includes("supportsTablet: true"), "Web/App product identity drift");
});

await check("baseline_is_credential_free_and_contains_no_private_key_material", async () => {
  const secretPattern = /\bsk-[A-Za-z0-9]{8,}|Bearer\s+[A-Za-z0-9]{16,}|BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY|(?:password|secret|api[_-]?key)\s*[:=]\s*["'][^"']{8,}["']/iu;
  for (const entry of textFiles) {
    const text = await readFile(path.join(BASELINE_ROOT, entry.path), "utf8");
    assert(!secretPattern.test(text), `credential-like material found in ${entry.path}`);
  }
  assert(!files.some((entry) => /(?:\.jks|\.p8|\.p12|\.key|\.pem)$/iu.test(entry.path)),
    "credential file entered baseline");
});

await check("legacy_client_state_and_firestore_paths_are_preserved_only_as_explicit_migration_debt", async () => {
  const match = await readFile(path.join(BASELINE_ROOT, "app/(tabs)/match.tsx"), "utf8");
  const storage = await readFile(path.join(BASELINE_ROOT, "lib/storage.ts"), "utf8");
  const firestore = await readFile(path.join(BASELINE_ROOT, "lib/firebase-fetch.ts"), "utf8");
  assert(match.includes("useState<MatchRecord | null>") && match.includes("saveMatchRecord"),
    "historical client-owned match behavior was silently rewritten");
  assert(storage.includes("AsyncStorage") && firestore.includes("firestore.googleapis.com"),
    "historical storage/source behavior was silently rewritten");
  assert(boundary.compatibility.asyncStorage.matchRecords
    === "read_only_legacy_timeline_import_never_room_state_restore", "match migration debt not bounded");
  assert(boundary.compatibility.asyncStorage.bundledOrFirestoreData
    === "display_only_import_never_source_authority", "legacy data path was granted source authority");
});

await check("expo_and_battle_lab_have_distinct_surface_roles_but_neither_owns_rules_or_room_state", () => {
  assert(boundary.productSurfaces.expo.role === "canonical_player_product_shell_for_web_android_and_ios",
    "Expo product role drift");
  assert(boundary.productSurfaces.battleLab.role === "developer_referee_agent_observability_surface",
    "Battle Lab role drift");
  assert(boundary.productSurfaces.expo.cannotOwn.includes("rules_legality")
    && boundary.productSurfaces.battleLab.cannotOwn.includes("whole_state_replace"),
  "client surface authority widened");
});

await check("capacitor_is_rejected_instead_of_creating_a_third_client_lifecycle", () => {
  assert(boundary.productSurfaces.capacitor.role === "none"
    && boundary.productSurfaces.capacitor.decision.includes("expo_already_targets_web_android_and_ios"),
  "Capacitor decision is missing or ambiguous");
  assert(!JSON.stringify(boundary.sharedModule).toLowerCase().includes("capacitor"),
    "Capacitor leaked into shared module");
});

await check("client_domain_module_has_one_small_external_interface_and_real_internal_seams", () => {
  const module = boundary.sharedModule;
  assert(module.interface.methods.join("/")
    === "bootstrap(route_and_principal_context)/read()/dispatch(typed_client_intent)/subscribe(listener)",
  "Client Domain Module interface drift");
  assert(module.internalPorts.length === 3
    && module.internalPorts.every((port) => port.implementations.length >= 2),
  "internal seam lacks two concrete Adapters");
  assert(module.interface.neverAccepts.includes("whole_game_state")
    && module.interface.neverAccepts.includes("confirmed_boolean"),
  "shallow client mutation interface leaked through seam");
});

await check("ownership_keeps_only_ephemeral_ui_and_preferences_on_the_client", () => {
  assert(boundary.ownership.authoritativeRulesAndState === "server_referee_only"
    && boundary.ownership.authoritativeJournal === "server_room_store_only", "server ownership drift");
  assert(boundary.ownership.uiSelectionFocusAndPanelLayout === "surface_local_ephemeral"
    && boundary.ownership.cachedRoomData === "viewer_scoped_client_projection_only", "client projection ownership drift");
  assert(boundary.ownership.armyAndSetupDrafts.includes("until_server_validation"),
    "client draft was treated as authoritative");
});

await check("platform_adapters_keep_native_capabilities_without_game_authority", () => {
  assert(boundary.platformAdapters.app.includes("expo_router_deep_links")
    && boundary.platformAdapters.app.includes("app_state_lifecycle"), "native Adapter capabilities missing");
  assert(boundary.platformAdapters.web.includes("browser_visibility")
    && boundary.platformAdapters.battleLab.includes("referee_and_agent_trace_renderer"),
  "Web or Battle Lab Adapter capabilities missing");
  assert(boundary.platformAdapters.restrictions.includes("adapters_do_not_evaluate_legality")
    && boundary.platformAdapters.restrictions.includes("adapters_do_not_advance_state_revision"),
  "Adapter authority restrictions missing");
});

await check("async_storage_room_urls_and_generated_artifacts_require_labeled_compatibility_imports", () => {
  assert(boundary.compatibility.asyncStorage.silentUpgrade === false, "AsyncStorage may silently upgrade");
  assert(boundary.compatibility.roomUrls.behavior.includes("exchange_for_current_server_issued_capability"),
    "legacy room URL could create authority");
  assert(boundary.compatibility.roomUrls.ignoredClaims.includes("side")
    && boundary.compatibility.roomUrls.ignoredClaims.includes("confirmation"),
  "legacy URL claims not ignored");
  assert(boundary.compatibility.generatedArtifacts.runtimeAuthority === false
    && boundary.compatibility.generatedArtifacts.historicalApk.includes("never_edit_source"),
  "generated artifact or APK gained authority");
});

await check("ticket_14_has_eleven_ordered_slices_with_browser_native_and_aggregate_gates", () => {
  assert(boundary.ticket14Slices.length === 11, "Ticket14 slice denominator mismatch");
  assert(boundary.ticket14Slices.map((entry) => entry.slice).join("/")
    === "128/129/130/131/132/133/134/135/136/137/138", "Ticket14 slices are not contiguous");
  assert(boundary.ticket14Slices.find((entry) => entry.slice === 136)?.scope.includes("web_static_build_browser"),
    "browser evidence slice missing");
  assert(boundary.ticket14Slices.find((entry) => entry.slice === 137)?.scope.includes("real_device"),
    "native real-device slice missing");
  assert(boundary.ticket14Slices.at(-1).scope.includes("aggregate"), "Ticket14 closure slice missing");
});

await check("slice_128_does_not_claim_a_product_mount_build_device_or_authoritative_action", () => {
  assert(Object.values(boundary.delivery).every((value) => value === false), "delivery evidence was overclaimed");
  assert(boundary.authority.canOverrideRules === false
    && boundary.authority.canMutateRoomWithoutRefereeReceipt === false
    && boundary.authority.canCreateSourceTruth === false
    && boundary.authority.canCreateTrainingTruth === false, "authority widened");
  assert(boundary.authority.canRunProvider === false
    && boundary.authority.canGenerateSkill === false
    && boundary.authority.canRunDsh === false, "later-ticket execution was triggered");
});

const preview = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Ticket 14 共享端边界</title><style>
body{margin:0;background:#07110f;color:#e8f2e8;font:15px/1.55 Inter,"Noto Sans SC",sans-serif}main{max-width:1120px;margin:auto;padding:28px}h1{margin:0 0 8px}.note{color:#a9bcae}.flow{display:grid;grid-template-columns:1fr 1.3fr 1fr;gap:16px;align-items:stretch;margin:28px 0}.box{border:1px solid #4a6656;border-radius:12px;padding:18px;background:#0c1914}.core{border-color:#d1a34b;box-shadow:0 0 32px #d1a34b22}.arrow{text-align:center;color:#d8b05a;font-weight:700;margin:10px 0}.server{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.bad{color:#db9b88}.good{color:#9bd3aa}code{color:#f0ca78}@media(max-width:760px){.flow,.server{grid-template-columns:1fr}}
</style></head><body><main><h1>Ticket 14 · Web/App 共享域 seam</h1><p class="note">Slice 128：冻结基线和所有权；尚未冒充已经挂载、构建或真机运行。</p><div class="flow"><section class="box"><h2>Expo Web/App</h2><p>玩家产品壳</p><p class="good">导航、军表、原生能力、双语 UX</p><p class="bad">不拥有 Rules / room state</p></section><section class="box core"><h2>Client Domain Module</h2><p><code>bootstrap · read · dispatch · subscribe</code></p><p>隐藏 transport、cache、revision、reconnect、receipt。</p><p class="bad">拒绝 whole state、caller side、confirmed boolean、client RNG。</p></section><section class="box"><h2>Battle Lab</h2><p>开发 / Referee / Agent 可观测面</p><p class="good">诊断、回执、轨迹、回放</p><p class="bad">不再 whole-state replace 或 drag mutation</p></section></div><div class="arrow">↓ HTTP / in-memory Adapters（共享合同） ↓</div><div class="server"><section class="box"><h3>Rules / Referee / Room</h3><p>唯一状态与日志权威</p></section><section class="box"><h3>Source / Localization</h3><p>官方事实与 provenance</p></section><section class="box"><h3>Character / Agent</h3><p>persona、模式、可见性与 Harness</p></section></div><p class="note">平台差异留在 Platform capability Adapters；Capacitor 不进入架构。旧 AsyncStorage、URL、APK 只做带标签的 compatibility import/evidence。</p></main></body></html>`;

await mkdir(BUILD_DIR, { recursive: true });
await writeFile(PREVIEW_PATH, preview, "utf8");

const reportUnsigned = {
  schema: "starcraft_tmg_ticket_14_expo_baseline_boundary_verification_v1",
  generatedAt: T0,
  ticket: 14,
  slice: 128,
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  boundaryHash: boundary.boundaryHash,
  baseline: {
    commit: boundary.sourceBaseline.commit,
    gitTree: boundary.sourceBaseline.gitTree,
    fileCount: files.length,
    byteLength: files.reduce((sum, entry) => sum + entry.byteLength, 0),
    fileManifestHash,
  },
  ticketStatus: {
    plannedSlices: 11,
    completeSlices: failures.length === 0 ? 1 : 0,
    remainingSlices: failures.length === 0 ? 10 : 11,
    nextSlice: 129,
  },
  outputs: {
    previewPath: path.relative(ROOT, PREVIEW_PATH),
    reportPath: path.relative(ROOT, REPORT_PATH),
  },
  productMountReady: false,
  browserEvidenceVerified: false,
  nativeDeviceEvidenceVerified: false,
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
      "inventory_expo_surface",
      "inventory_battle_lab_surface",
      "inspect_client_authority_debt",
      "define_client_domain_interface",
    ],
    uiTraceEvidence: ["shared_client_boundary_preview_only_no_runtime_mount"],
    agentDecisionEvidence: "surface_and_seam_decision_no_agent_inference",
    memoryTraceEvidence: [],
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "baseline_file_or_tree_hash_drift_quarantines_the_import",
      "whole_state_input_or_client_legality_demotes_the_client_domain_module",
      "platform_adapter_state_authority_rejects_the_mount",
      "unlabeled_legacy_record_or_url_import_is_quarantined",
    ],
    userVisibleChecks: [
      "expo_remains_player_product_shell",
      "battle_lab_remains_observability_surface",
      "one_shared_client_domain_module",
      "platform_specific_native_capabilities_are_preserved",
    ],
  },
};

const report = { ...reportUnsigned, reportHash: hashStarcraftTmgContract(reportUnsigned) };
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
