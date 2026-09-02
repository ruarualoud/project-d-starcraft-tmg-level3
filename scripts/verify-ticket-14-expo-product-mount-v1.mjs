#!/usr/bin/env node

import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

import { STARCRAFT_TMG_SHARED_WEB_APP_BOUNDARY_V1 as boundary } from
  "../content/client/shared-web-app-boundary-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BASELINE_ROOT = path.join(ROOT, "vendor/sc-tmg-expo-baseline-f07b3cb");
const EXPO_ROOT = path.join(ROOT, "apps/starcraft-tmg-expo");
const MIGRATION_PATH = path.join(ROOT, "content/client/expo-product-migration-v1.mjs");
const BUILD_ROOT = path.join(ROOT, "build/ticket-14-slice-130-expo-product-mount-v1");
const REPORT_PATH = path.join(BUILD_ROOT, "report.json");
const OCCURRED_AT = "2026-09-03T07:00:00.000Z";
const SLICE_130_COMMIT = "ba00c7205803cea1741775f5bee94b6c2338d3f7";
const EXPECTED_TABS = ["index", "army", "tools", "match", "settings"];
const CODE_EXTENSIONS = ["", ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".css"];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value || {}).filter(([key]) => !keys.includes(key)));
}

function normalizeRelative(absolute) {
  return path.relative(ROOT, absolute).replaceAll("\\", "/");
}

function isHash(value) {
  return typeof value === "string" && /^[0-9a-f]{64}$/u.test(value);
}

async function fileExists(absolute) {
  try {
    await access(absolute);
    return true;
  } catch {
    return false;
  }
}

async function fileManifest(root) {
  const names = (await readdir(root, { recursive: true })).sort();
  const files = [];
  for (const name of names) {
    const absolute = path.join(root, name);
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

function gitFileManifest(commit, prefix) {
  const listing = execFileSync(
    "git",
    ["ls-tree", "-r", "-z", "--full-tree", commit, "--", prefix],
    { cwd: ROOT, maxBuffer: 16 * 1024 * 1024 },
  ).toString("utf8");
  return listing.split("\0").filter(Boolean).map((line) => {
    const match = /^(\d+)\s+blob\s+[0-9a-f]+\t(.+)$/u.exec(line);
    assert(match, `unexpected git tree entry: ${line}`);
    const [, mode, repoPath] = match;
    const bytes = execFileSync("git", ["show", `${commit}:${repoPath}`], {
      cwd: ROOT,
      maxBuffer: 16 * 1024 * 1024,
    });
    return {
      path: repoPath.slice(`${prefix}/`.length),
      byteLength: bytes.length,
      sha256: sha256(bytes),
      executable: mode === "100755",
    };
  }).sort((left, right) => left.path < right.path ? -1 : left.path > right.path ? 1 : 0);
}

function readGitFile(commit, repoPath) {
  return execFileSync("git", ["show", `${commit}:${repoPath}`], {
    cwd: ROOT,
    maxBuffer: 16 * 1024 * 1024,
  });
}

function manifestDelta(sourceFiles, targetFiles) {
  const source = new Map(sourceFiles.map((entry) => [entry.path, entry]));
  const target = new Map(targetFiles.map((entry) => [entry.path, entry]));
  const paths = [...new Set([...source.keys(), ...target.keys()])].sort();
  const unchangedPaths = [];
  const changedPaths = [];
  const addedPaths = [];
  const removedPaths = [];
  for (const name of paths) {
    const before = source.get(name);
    const after = target.get(name);
    if (!before) addedPaths.push(name);
    else if (!after) removedPaths.push(name);
    else if (before.sha256 === after.sha256 && before.executable === after.executable) unchangedPaths.push(name);
    else changedPaths.push(name);
  }
  return { unchangedPaths, changedPaths, addedPaths, removedPaths };
}

function parseModuleSpecifiers(source) {
  const specifiers = new Set();
  const patterns = [
    /(?:import|export)\s+(?:[\s\S]*?\s+from\s+)?["']([^"']+)["']/gu,
    /(?:import|require)\s*\(\s*["']([^"']+)["']\s*\)/gu,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.add(match[1]);
  }
  return [...specifiers];
}

async function resolveLocalModule(fromFile, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = path.join(EXPO_ROOT, specifier.slice(2));
  else if (specifier.startsWith(".")) base = path.resolve(path.dirname(fromFile), specifier);
  else return null;

  for (const extension of CODE_EXTENSIONS) {
    const candidate = `${base}${extension}`;
    if (await fileExists(candidate) && (await stat(candidate)).isFile()) return candidate;
  }
  for (const extension of CODE_EXTENSIONS.slice(1)) {
    const candidate = path.join(base, `index${extension}`);
    if (await fileExists(candidate) && (await stat(candidate)).isFile()) return candidate;
  }
  return undefined;
}

async function mountedImportGraph() {
  const entrypoints = [
    "app/_layout.tsx",
    "app/(tabs)/_layout.tsx",
    ...EXPECTED_TABS.map((tab) => `app/(tabs)/${tab}.tsx`),
  ].map((entry) => path.join(EXPO_ROOT, entry));
  const queue = [...entrypoints];
  const files = new Set();
  const edges = [];
  const unresolved = [];
  while (queue.length > 0) {
    const absolute = queue.shift();
    if (files.has(absolute)) continue;
    assert(await fileExists(absolute), `mounted entrypoint is missing: ${normalizeRelative(absolute)}`);
    files.add(absolute);
    if (!/\.(?:[cm]?[jt]sx?|json|css)$/u.test(absolute)) continue;
    const source = await readFile(absolute, "utf8");
    for (const specifier of parseModuleSpecifiers(source)) {
      const resolved = await resolveLocalModule(absolute, specifier);
      if (resolved === undefined) {
        unresolved.push({ from: normalizeRelative(absolute), specifier });
        continue;
      }
      if (resolved === null) continue;
      edges.push({ from: normalizeRelative(absolute), specifier, to: normalizeRelative(resolved) });
      if (!files.has(resolved)) queue.push(resolved);
    }
  }
  return { entrypoints, files: [...files].sort(), edges, unresolved };
}

async function importMigration() {
  assert(await fileExists(MIGRATION_PATH),
    "missing explicit migration receipt: content/client/expo-product-migration-v1.mjs");
  const module = await import(`${pathToFileURL(MIGRATION_PATH).href}?slice130=${Date.now()}`);
  const migration = module.STARCRAFT_TMG_EXPO_PRODUCT_MIGRATION_V1;
  assert(migration && typeof migration === "object",
    "migration receipt must export STARCRAFT_TMG_EXPO_PRODUCT_MIGRATION_V1");
  return migration;
}

function semanticStatusWithoutSurface(value) {
  if (Array.isArray(value)) return value.map(semanticStatusWithoutSurface);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !["surface", "platform", "platformCapabilities"].includes(key))
    .map(([key, nested]) => [key, semanticStatusWithoutSurface(nested)]));
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

let sourceFiles = [];
let targetFiles = [];
let sourceManifestHash = null;
let targetManifestHash = null;
let delta = null;
let migration = null;
let graph = null;
let semanticEvidence = null;

await check("frozen_source_baseline_retains_the_exact_commit_tree_and_byte_manifest_identity", async () => {
  sourceFiles = await fileManifest(BASELINE_ROOT);
  sourceManifestHash = hashStarcraftTmgContract(sourceFiles);
  assert(boundary.sourceBaseline.commit === "f07b3cb78ce6bf119bdc529cde41dbe91e00a61d",
    "frozen source commit drift");
  assert(boundary.sourceBaseline.gitTree === "4b8d248626ddb1b4dfb2faf4776731bdb3ee896e",
    "frozen source tree drift");
  assert(sourceFiles.length === 116, `source file denominator drift: ${sourceFiles.length}`);
  assert(sourceFiles.reduce((sum, entry) => sum + entry.byteLength, 0) === 2650442,
    "source byte denominator drift");
  assert(sourceManifestHash === "b5761d2fa1f1cb155696f1a145888ffbf1718c38113b38c439e9d9a8974a55ca",
    "source manifest drift");
  assert(boundary.sourceBaseline.authority === false, "frozen source gained authority");
});

await check("derived_expo_product_candidate_exists_outside_the_read_only_vendor_baseline", async () => {
  const required = [
    "package.json", "app.config.ts", "metro.config.js", "app/_layout.tsx", "app/(tabs)/_layout.tsx",
    ...EXPECTED_TABS.map((tab) => `app/(tabs)/${tab}.tsx`),
  ];
  assert(path.resolve(EXPO_ROOT) !== path.resolve(BASELINE_ROOT), "derived product aliases the frozen baseline");
  // Slice receipts are immutable evidence. Later slices may extend the tracked
  // Expo product, so the Slice 130 denominator must be read from its commit.
  targetFiles = gitFileManifest(SLICE_130_COMMIT, "apps/starcraft-tmg-expo");
  targetManifestHash = hashStarcraftTmgContract(targetFiles);
  delta = manifestDelta(sourceFiles, targetFiles);
  for (const name of required) assert(await fileExists(path.join(EXPO_ROOT, name)), `derived product missing ${name}`);
  const packageJson = JSON.parse(await readFile(path.join(EXPO_ROOT, "package.json"), "utf8"));
  assert(packageJson.private === true && packageJson.main === "expo-router/entry", "derived Expo package identity is incomplete");
  assert(targetFiles.length >= sourceFiles.length, "derived product unexpectedly lost baseline files");
});

await check("migration_receipt_is_hash_sealed_and_matches_the_actual_source_target_file_delta", async () => {
  migration = await importMigration();
  assert(migration.migrationHash === hashStarcraftTmgContract(without(migration, ["migrationHash"])),
    "migration receipt hash mismatch");
  assert(migration.sourceBaseline?.path === "vendor/sc-tmg-expo-baseline-f07b3cb"
    && migration.sourceBaseline.commit === boundary.sourceBaseline.commit
    && migration.sourceBaseline.gitTree === boundary.sourceBaseline.gitTree,
  "migration receipt source identity drift");
  assert(migration.sourceBaseline.fileCount === 116
    && migration.sourceBaseline.byteLength === 2650442
    && migration.sourceBaseline.fileManifestHash === sourceManifestHash,
  "migration receipt source denominator drift");
  assert(migration.sourceBaseline.authority === false, "migration granted source baseline authority");
  assert(migration.target?.path === "apps/starcraft-tmg-expo"
    && migration.target.trackedProductCandidate === true
    && migration.target.authority === false,
  "migration target is not the tracked Expo product candidate");
  const actual = {
    sourceFileCount: sourceFiles.length,
    targetFileCount: targetFiles.length,
    sourceByteLength: sourceFiles.reduce((sum, entry) => sum + entry.byteLength, 0),
    targetByteLength: targetFiles.reduce((sum, entry) => sum + entry.byteLength, 0),
    sourceManifestHash,
    targetManifestHash,
    unchangedCount: delta.unchangedPaths.length,
    changedPaths: delta.changedPaths,
    addedPaths: delta.addedPaths,
    removedPaths: delta.removedPaths,
  };
  assert(JSON.stringify(migration.fileDelta) === JSON.stringify(actual),
    `migration file delta does not match derived bytes; expected ${JSON.stringify(actual)}`);
});

await check("the_exact_five_tab_product_navigation_is_preserved", async () => {
  const tabLayout = await readFile(path.join(EXPO_ROOT, "app/(tabs)/_layout.tsx"), "utf8");
  const tabs = [...tabLayout.matchAll(/<Tabs\.Screen\s+[\s\S]*?name=["']([^"']+)["']/gu)]
    .map((match) => match[1]);
  assert(JSON.stringify(tabs) === JSON.stringify(EXPECTED_TABS),
    `expected five ordered tabs ${EXPECTED_TABS.join("/")}, received ${tabs.join("/")}`);
  for (const tab of EXPECTED_TABS) {
    assert(await fileExists(path.join(EXPO_ROOT, `app/(tabs)/${tab}.tsx`)), `tab route missing: ${tab}`);
  }
});

await check("root_routing_mounts_the_real_level3_provider_and_all_local_imports_resolve", async () => {
  graph = await mountedImportGraph();
  assert(graph.unresolved.length === 0,
    `unresolved mounted imports: ${JSON.stringify(graph.unresolved)}`);
  const rootLayout = await readFile(path.join(EXPO_ROOT, "app/_layout.tsx"), "utf8");
  assert(rootLayout.includes("Level3ClientDomainProvider"), "root layout does not mount Level3ClientDomainProvider");
  assert(/<Level3ClientDomainProvider(?:\s|>)/u.test(rootLayout)
    && /<\/Level3ClientDomainProvider>/u.test(rootLayout), "provider is imported but not wrapped around routing");
  assert(graph.edges.some((edge) => edge.from.endsWith("app/_layout.tsx")
    && edge.to.includes("apps/starcraft-tmg-expo/lib/level3/client-domain-provider")),
  "root provider import does not resolve to the Level-3 integration module");
});

await check("mounted_route_graph_contains_no_firestore_or_client_owned_match_authority", async () => {
  assert(graph, "mounted graph unavailable");
  assert(migration, "migration receipt unavailable");
  const forbidden = [
    {
      pattern: /firestore\.googleapis\.com|firebase-fetch|FIREBASE_PROJECT_ID|from\s+["'](?:@[^/]+\/)?firebase(?:\/|["'])/iu,
      reason: "direct Firestore source path",
    },
    { pattern: /saveMatchRecord|deleteMatchRecord|loadMatchRecords|useState\s*<\s*MatchRecord/iu, reason: "legacy MatchRecord authority" },
    { pattern: /STORAGE_KEYS\s*\.\s*MATCHES|['"]matches['"]\s*:\s*['"]@?starcraft/iu, reason: "local match persistence" },
  ];
  for (const absolute of graph.files) {
    if (!/\.(?:[cm]?[jt]sx?)$/u.test(absolute)) continue;
    const source = await readFile(absolute, "utf8");
    for (const rule of forbidden) {
      assert(!rule.pattern.test(source), `${rule.reason} is reachable at ${normalizeRelative(absolute)}`);
    }
    if (normalizeRelative(absolute).includes("app/(tabs)/match.tsx")
      || normalizeRelative(absolute).includes("apps/starcraft-tmg-expo/lib/level3/")) {
      assert(!/Math\.random\s*\(/u.test(source),
        `client-generated room authority or RNG is reachable at ${normalizeRelative(absolute)}`);
    }
  }
  assert(migration.authority?.directFirestoreOnMountedPaths === false
    && migration.authority?.authoritativeMatchWriteOnMountedPaths === false,
  "migration receipt does not fail closed over mounted authority");
  assert(migration.authority?.legacyMatchRecords === "isolated_display_only_compatibility_import",
    "legacy match records are not explicitly isolated");
});

await check("expo_mount_consumes_packages_client_domain_without_copying_the_authority_module", async () => {
  assert(graph, "mounted graph unavailable");
  assert(migration, "migration receipt unavailable");
  const sharedCore = "packages/client-domain/client-domain-v1.mjs";
  assert(graph.files.some((absolute) => normalizeRelative(absolute) === sharedCore),
    "mounted graph does not consume packages/client-domain/client-domain-v1.mjs");
  assert(graph.files.some((absolute) => normalizeRelative(absolute)
    === "packages/client-domain/authoritative-transport-adapters-v1.mjs"),
  "mounted graph does not consume the shared authoritative transport Adapter");
  const copiedAuthorityPaths = targetFiles.map((entry) => entry.path).filter((name) =>
    /(?:^|\/)packages\/client-domain\/|(?:^|\/)client-domain-v1\.mjs$/u.test(name));
  assert(copiedAuthorityPaths.length === 0,
    `shared Client Domain Module was copied into Expo: ${copiedAuthorityPaths.join(", ")}`);
  assert(migration.mount?.sharedClientDomainPath === sharedCore,
    "migration receipt does not bind the shared module path");
});

await check("node_semantic_smoke_proves_web_and_native_mount_status_parity", async () => {
  assert(migration, "migration receipt unavailable");
  const helperRelative = migration.mount?.runtimeHelper;
  assert(typeof helperRelative === "string" && helperRelative.startsWith("apps/starcraft-tmg-expo/lib/level3/"),
    "migration receipt has no bounded Node-importable runtime helper");
  const helperPath = path.join(ROOT, helperRelative);
  const helperModule = await import(`${pathToFileURL(helperPath).href}?slice130=${Date.now()}`);
  assert(typeof helperModule.projectStarcraftTmgExpoMountStatus === "function",
    "runtime helper must export projectStarcraftTmgExpoMountStatus");
  const baseInput = { route: {}, lifecycle: { online: true, visibility: "active" } };
  const web = helperModule.projectStarcraftTmgExpoMountStatus({ ...baseInput, surface: "expo_web" });
  const native = helperModule.projectStarcraftTmgExpoMountStatus({ ...baseInput, surface: "expo_native" });
  assert(web?.surface === "expo_web" && native?.surface === "expo_native", "semantic views lost surface identity");
  assert(JSON.stringify(semanticStatusWithoutSurface(web)) === JSON.stringify(semanticStatusWithoutSurface(native)),
    "Web/App mount status semantics drifted outside platform capability fields");
  const normalized = semanticStatusWithoutSurface(web);
  assert(normalized.routeRequired === true && normalized.connection?.status === "room_required",
    "unbound shell must visibly request a room route");
  assert(normalized.clientDomainInterface?.join("/") === "bootstrap/read/dispatch/subscribe",
    "semantic mount status does not bind the Client Domain interface");
  assert(normalized.authority?.clientOwnsRoomState === false
    && normalized.authority?.clientOwnsRules === false,
    "semantic mount status grants client authority");

  assert(typeof helperModule.createStarcraftTmgExpoClientRuntime === "function",
    "runtime helper must compose the actual Client Domain and platform ports");
  const stores = [];
  const createStorage = () => {
    const records = new Map();
    stores.push(records);
    return {
      async getItem(key) { return records.get(key) ?? null; },
      async setItem(key, value) { records.set(key, value); },
      async removeItem(key) { records.delete(key); },
    };
  };
  const roomId = "slice-130-semantic-room";
  const seatToken = "slice-130-seat-token-must-not-persist";
  const projection = {
    room: { roomId, stateRevision: 0, stateHash: "a".repeat(64) },
    viewer: { capabilities: ["read_room"] },
    state: {},
    training: { trainingTruth: false },
  };
  let requestCount = 0;
  const fetchImpl = async () => {
    requestCount += 1;
    return {
      text: async () => JSON.stringify({
        schemaVersion: "starcraft_tmg_level3_http_v2",
        result: { ok: true, projection },
      }),
    };
  };
  const runtimeResults = [];
  for (const platform of ["web", "native"]) {
    const runtime = helperModule.createStarcraftTmgExpoClientRuntime({
      platform,
      asyncStorage: createStorage(),
      baseUrl: "https://level3.invalid",
      fetchImpl,
      allowHeadlessFallback: true,
      now: () => OCCURRED_AT,
    });
    assert(runtime.clientDomain.read().phase === "unbound", `${platform} runtime fabricated a room before bootstrap`);
    const result = await runtime.clientDomain.bootstrap({
      route: { roomId },
      principal: { seatToken },
      surface: runtime.surface,
      locale: "en",
    });
    assert(result.ok === true && runtime.clientDomain.read().phase === "ready",
      `${platform} runtime did not reach the shared ready projection`);
    runtimeResults.push({
      platform,
      surface: runtime.surface,
      phase: runtime.clientDomain.read().phase,
      projectionStoreKind: runtime.projectionStoreKind,
      trainingTruth: runtime.trainingTruth,
    });
  }
  assert(requestCount === 2, "Web/App semantic bootstrap did not make exactly one authoritative read each");
  assert(!stores.some((records) => [...records.values()].join("").includes(seatToken)),
    "Expo projection cache persisted raw SeatGrant material");
  semanticEvidence = {
    web,
    native,
    normalizedHash: hashStarcraftTmgContract(normalized),
    runtimeResults,
    authoritativeReadCount: requestCount,
    rawSeatTokenPersisted: false,
  };
});

await check("slice_130_claims_only_a_tracked_mount_not_browser_or_native_build_evidence", () => {
  assert(migration, "migration receipt unavailable");
  const delivery = migration.delivery;
  assert(delivery?.trackedExpoProductMounted === true, "tracked Expo mount is not recorded");
  for (const key of [
    "webStaticBuildVerified", "browserEvidenceVerified", "nativeBuildVerified", "nativeDeviceEvidenceVerified",
  ]) assert(delivery[key] === false, `${key} is reserved for Slice 136/137`);
  assert(delivery.firstAuthoritativeClientActionVerified === false,
    "Slice130 cannot claim the later authoritative battlefield flow");
  assert(migration.promotion?.providerCalled === false
    && migration.promotion.skillGenerated === false
    && migration.promotion.dshRun === false
    && migration.promotion.muzeroDataGenerated === false
    && migration.promotion.selfPlayRun === false
    && migration.promotion.trainingPromotion === false
    && migration.promotion.trainingTruth === false,
  "later-ticket or training execution was overclaimed");
});

await check("migration_harness_record_contains_hash_evidence_gaps_and_demotion_status", async () => {
  assert(migration, "migration receipt unavailable");
  const harness = migration.harness;
  assert(harness?.harnessLoopUsed === true
    && JSON.stringify(harness.targetGames) === JSON.stringify(["starcraft-tmg"]),
  "Harness loop identity missing");
  for (const key of [
    "promptPackRoutes", "harnessToolsCalled", "uiTraceEvidence", "memoryTraceEvidence",
    "trainingTraceCandidates", "rollbackOrDemotionRules", "userVisibleChecks", "knownGaps",
  ]) assert(Array.isArray(harness[key]), `Harness field ${key} must be an array`);
  assert(harness.harnessToolsCalled.length > 0 && harness.uiTraceEvidence.length > 0
    && harness.rollbackOrDemotionRules.length > 0 && harness.userVisibleChecks.length > 0,
  "Harness evidence is structurally empty");
  assert(Array.isArray(harness.evidenceHashes) && harness.evidenceHashes.length > 0
    && harness.evidenceHashes.every(isHash), "Harness evidence hashes missing or malformed");
  assert(Array.isArray(harness.artifactHashes) && harness.artifactHashes.length > 0
    && harness.artifactHashes.every(isHash), "Harness artifact hashes missing or malformed");
  assert(harness.evidenceHashes.includes(sourceManifestHash)
    && harness.evidenceHashes.includes(targetManifestHash),
  "Harness evidence hashes do not bind both frozen source and derived target manifests");
  const mountedArtifactHashes = await Promise.all([
    "app/_layout.tsx",
    "lib/level3/client-domain-provider.tsx",
    "lib/level3/client-domain-mount-runtime.mjs",
  ].map(async (name) => sha256(readGitFile(
    SLICE_130_COMMIT,
    `apps/starcraft-tmg-expo/${name}`,
  ))));
  assert(mountedArtifactHashes.every((hash) => harness.artifactHashes.includes(hash)),
    "Harness artifact hashes do not bind root layout, Provider, and mount runtime bytes");
  assert(harness.knownGaps.includes("real_browser_build_and_acceptance_reserved_for_slice_136")
    && harness.knownGaps.includes("native_build_and_real_device_reserved_for_slice_137"),
  "future browser/native evidence gaps are hidden");
  assert(harness.promotionStatus === "mount_only_not_runtime_or_training_promotion",
    "Harness promotion status is ambiguous");
});

await mkdir(BUILD_ROOT, { recursive: true });
const reportUnsigned = {
  schema: "starcraft_tmg_ticket_14_expo_product_mount_verification_v1",
  generatedAt: OCCURRED_AT,
  ticket: 14,
  slice: 130,
  status: failures.length === 0 ? "passed" : "failed",
  assertionsPassed: checks.filter((entry) => entry.passed).length,
  assertionsTotal: checks.length,
  checks,
  failures,
  sourceBaseline: {
    commit: boundary.sourceBaseline.commit,
    gitTree: boundary.sourceBaseline.gitTree,
    fileCount: sourceFiles.length,
    byteLength: sourceFiles.reduce((sum, entry) => sum + entry.byteLength, 0),
    fileManifestHash: sourceManifestHash,
  },
  targetProduct: {
    path: "apps/starcraft-tmg-expo",
    snapshotCommit: SLICE_130_COMMIT,
    fileCount: targetFiles.length,
    byteLength: targetFiles.reduce((sum, entry) => sum + entry.byteLength, 0),
    fileManifestHash: targetManifestHash,
    fileDelta: delta,
  },
  migrationHash: migration?.migrationHash || null,
  mountedGraph: graph ? {
    entrypointCount: graph.entrypoints.length,
    fileCount: graph.files.length,
    edgeCount: graph.edges.length,
    graphHash: hashStarcraftTmgContract({
      files: graph.files.map(normalizeRelative),
      edges: graph.edges,
    }),
  } : null,
  semanticEvidence,
  ticketStatus: {
    plannedSlices: 11,
    completeSlices: failures.length === 0 ? 3 : 2,
    remainingSlices: failures.length === 0 ? 8 : 9,
    nextSlice: failures.length === 0 ? 131 : 130,
  },
  productMountVerified: failures.length === 0,
  webStaticBuildVerified: false,
  browserEvidenceVerified: false,
  nativeBuildVerified: false,
  nativeDeviceEvidenceVerified: false,
  firstAuthoritativeClientActionVerified: false,
  sourceRefreshPerformed: false,
  providerCalled: false,
  skillGenerated: false,
  dshRun: false,
  muzeroDataGenerated: false,
  selfPlayRun: false,
  trainingPromotion: false,
  trainingTruth: false,
  harness: migration?.harness || {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: ["verify_expo_product_mount"],
    uiTraceEvidence: [],
    agentDecisionEvidence: "verifier_failed_before_complete_mount_evidence",
    memoryTraceEvidence: [],
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: ["any_failed_gate_keeps_slice_130_open"],
    userVisibleChecks: [],
    evidenceHashes: [],
    artifactHashes: [],
    knownGaps: [
      "real_browser_build_and_acceptance_reserved_for_slice_136",
      "native_build_and_real_device_reserved_for_slice_137",
    ],
    promotionStatus: "mount_only_not_runtime_or_training_promotion",
  },
};
const report = { ...reportUnsigned, reportHash: hashStarcraftTmgContract(reportUnsigned) };
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
