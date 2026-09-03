#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { STARCRAFT_TMG_WEB_STATIC_BROWSER_ACCEPTANCE_V1 as binding } from
  "../content/client/web-static-browser-acceptance-v1.mjs";
import { STARCRAFT_TMG_WEB_STATIC_BROWSER_ACCEPTANCE_AMENDMENT_V1 as amendment } from
  "../content/client/web-static-browser-acceptance-amendment-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BUILD_ROOT = path.join(ROOT, "build/ticket-14-slice-136-web-static-v1");
const REPORT_ROOT = path.join(ROOT, "build/ticket-14-slice-136-web-static-contract-v1");
const REPORT_PATH = path.join(REPORT_ROOT, "report.json");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => (
      `${JSON.stringify(key)}:${stableJson(value[key])}`
    )).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function jsonFile(filename) {
  return JSON.parse(await readFile(filename, "utf8"));
}

async function main() {
  const checks = [];
  const failures = [];
  async function check(id, operation) {
    try {
      await operation();
      checks.push({ id, passed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({ id, passed: false, error: message });
      failures.push(`${id}: ${message}`);
    }
  }

  const [production, acceptance, reproducibility, browser] = await Promise.all([
    jsonFile(path.join(BUILD_ROOT, "production-build-receipt.json")),
    jsonFile(path.join(BUILD_ROOT, "acceptance-build-receipt.json")),
    jsonFile(path.join(BUILD_ROOT, "production-reproducibility-report.json")),
    jsonFile(path.join(BUILD_ROOT, "browser-acceptance-report.json")),
  ]);
  const sourcePaths = {
    htmlBootstrap: "apps/starcraft-tmg-expo/app/+html.tsx",
    provider: "apps/starcraft-tmg-expo/lib/level3/client-domain-provider.tsx",
    battlefield: "apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx",
    battleLabCss: "apps/starcraft-tmg-battle-lab/styles.css",
    themeProvider: "apps/starcraft-tmg-expo/lib/theme-provider.tsx",
    metroConfig: "apps/starcraft-tmg-expo/metro.config.js",
    builder: "scripts/build-ticket-14-web-static-v1.mjs",
    server: "scripts/serve-ticket-14-web-acceptance-v1.mjs",
    browserVerifier: "scripts/verify-ticket-14-web-browser-v1.py",
    mediaAssets: "apps/starcraft-tmg-expo/lib/level3/battlefield-media-assets-v1.ts",
    mediaCatalog: "packages/client-domain/battlefield-media-catalog-v1.mjs",
    presentationCues: "packages/client-domain/presentation-cues-v1.mjs",
    mediaProvenance: "content/client/battlefield-media-provenance-v1.mjs",
  };
  const sources = Object.fromEntries(await Promise.all(Object.entries(sourcePaths).map(
    async ([key, filename]) => [key, await readFile(path.join(ROOT, filename), "utf8")],
  )));

  await check("binding_is_hash_sealed_and_keeps_future_lanes_closed", () => {
    const { bindingHash, ...unsigned } = binding;
    assert(bindingHash === hashStarcraftTmgContract(unsigned), "binding hash drifted");
    assert(Object.values(binding.promotion).every((value) => value === false), "future promotion lane widened");
    const { amendmentHash, ...amendmentBody } = amendment;
    assert(amendmentHash === hashStarcraftTmgContract(amendmentBody), "amendment hash drifted");
    assert(amendment.previousBindingHash === binding.bindingHash,
      "amendment is not bound to the frozen Slice 136 contract");
    assert(amendment.dependencyLockTransition.fromLockHash === binding.build.lockHash
      && amendment.dependencyLockTransition.oldBuildEvidenceRetained === true
      && amendment.dependencyLockTransition.silentCompatibilityUsed === false,
    "dependency lock transition did not preserve strict history");
  });

  await check("production_and_acceptance_receipts_are_hash_sealed", () => {
    for (const receipt of [production, acceptance]) {
      const { receiptHash, ...core } = receipt;
      assert(receiptHash === hashStarcraftTmgContract(core), `${receipt.mode} receipt hash drifted`);
      assert(receipt.lockHash === amendment.dependencyLockTransition.toLockHash,
        `${receipt.mode} lock hash drifted`);
      assert(receipt.offlineDependencyResolution === true, `${receipt.mode} dependency resolution is not offline`);
      assert(receipt.staticWebCssPrecompiledBeforeMetro === true,
        `${receipt.mode} static CSS precompile missing`);
      assert(receipt.staticWebCssHash === binding.build.staticWebCssHash,
        `${receipt.mode} static CSS hash drifted`);
      assert(receipt.deterministicMetroWorkerCount === binding.build.deterministicMetroWorkerCount,
        `${receipt.mode} Metro worker count drifted`);
    }
  });

  await check("production_build_uses_pinned_https_origin_and_required_routes", () => {
    assert(production.mode === "production", "production mode drifted");
    assert(production.productionOrigin === binding.build.productionOrigin, "production App Link origin drifted");
    assert(production.outputFileCount === 54 && production.outputByteLength > 4_000_000, "production output denominator drifted");
    assert(binding.build.modes.every((mode) => [production.mode, acceptance.mode].includes(mode)), "build mode missing");
    for (const route of binding.build.modes.length ? [
      "index.html", "army.html", "match.html", "settings.html", "tools.html", "room/[roomId].html",
    ] : []) assert(production.requiredRoutes.includes(route), `production route missing: ${route}`);
  });

  await check("production_bundles_only_generated_public_battlefield_media", () => {
    const outputPaths = production.outputFiles.map((entry) => entry.path);
    assert(outputPaths.filter((entry) => (
      entry.includes("/assets/client/battlefield/") || entry.includes("/__assets/client/battlefield/")
    )).length === 17, "public battlefield media denominator drifted");
    assert(outputPaths.some((entry) => entry.includes("alien-temple-map-v1")), "public map missing");
    assert(outputPaths.filter((entry) => entry.includes("public-fallback")).length === 16,
      "public portrait fallback denominator drifted");
    assert(!outputPaths.some((entry) => entry.includes("development-internal")
      || entry.endsWith(".ogg") || entry.includes("-animated")),
    "development-internal original game media leaked into production output");
    assert(binding.media.classicBgmBundled === false
      && binding.media.bgmInput === "user_selected_local_audio",
    "public BGM boundary drifted");
  });

  await check("clean_build_reproducibility_matches_full_production_manifest", () => {
    const { reportHash, ...core } = reproducibility;
    assert(reportHash === hashStarcraftTmgContract(core), "reproducibility report hash drifted");
    assert(reproducibility.buildsCompared === 2, "two clean builds were not compared");
    assert(Object.values(reproducibility.checks).every(Boolean), "reproducibility comparison failed");
    assert(reproducibility.outputTreeHash === production.outputTreeHash, "reproducibility tree is stale");
    assert(reproducibility.buildReceiptHash === production.receiptHash, "reproducibility receipt is stale");
  });

  await check("browser_report_hash_and_fixed_denominator_are_exact", () => {
    assert(browser.reportHash === sha256(stableJson(browser.reportHashScope)), "browser report hash drifted");
    assert(browser.passed === true && browser.checks.length === binding.browserDenominator.namedChecks,
      "browser named-check denominator drifted");
    for (const [key, expected] of Object.entries(binding.browserDenominator)) {
      if (key === "namedChecks") continue;
      assert(browser.denominator[key] === expected, `browser denominator drifted: ${key}`);
    }
  });

  await check("production_public_observer_cannot_gain_seat_or_mutation", () => {
    const observed = browser.checks.find((entry) => entry.id === "production_public_observer_deep_link");
    assert(observed?.passed && observed.authorityClaimsIgnored === 2, "production observer evidence missing");
    assert(observed.mutationsEnabled === false && observed.consoleOrPageErrors === 0, "production observer widened authority");
  });

  await check("authenticated_room_ingress_scrubs_and_deletes_every_capability_copy", () => {
    for (const name of ["desktop", "tablet", "mobile"]) {
      const observed = browser.checks.find((entry) => entry.id === `expo_${name}_responsive_accessibility`);
      assert(observed?.roomAccess?.fragmentScrubbedBeforeEvidence === true, `${name} fragment not scrubbed`);
      assert(observed.roomAccess.bootstrapCaptureDeleted === true, `${name} bootstrap capture retained`);
      assert(observed.roomAccess.credentialPersisted === false, `${name} credential persisted`);
      assert(observed.unexpectedConsoleOrPageErrors === 0, `${name} unexpected browser errors`);
      assert(observed.expectedStaticDevHmrErrors <= 2, `${name} static dev errors widened`);
    }
  });

  await check("all_expo_viewports_preserve_physical_board_scale_and_targets", () => {
    for (const [name, viewport] of Object.entries(binding.viewports)) {
      const observed = browser.checks.find((entry) => entry.id === `expo_${name}_responsive_accessibility`);
      assert(stableJson(observed.viewport) === stableJson(viewport), `${name} viewport drifted`);
      assert(observed.battlefield.viewBox === binding.battlefield.authoritativeViewBox, `${name} viewBox drifted`);
      assert(observed.battlefield.preserveAspectRatio === binding.battlefield.preserveAspectRatio, `${name} aspect policy drifted`);
      assert(observed.battlefield.physicalScaleUniform === true && observed.battlefield.scaleDelta <= 0.000001,
        `${name} physical scale distorted`);
      assert(observed.battlefield.renderedBaseShapeCount >= 30, `${name} model-base denominator missing`);
      assert(observed.battlefield.modelTokenCount >= 30
        && observed.battlefield.invalidBaseEdgeCount === 0,
      `${name} base-edge legality drifted`);
      assert(observed.battlefield.modelPortraitCount === observed.battlefield.modelTokenCount,
        `${name} portrait denominator drifted`);
      assert(observed.battlefield.displayMapCount === 1
        && observed.battlefield.terrainCount === binding.battlefield.authoritativeTerrainCount,
      `${name} map or terrain missing`);
      assert(observed.battlefield.threatReferenceCount === 0,
        `${name} threat reference did not default off`);
      assert(stableJson(observed.verifiedSurfaces)
        === stableJson(["battlefield", "adjutant", "room_and_rules"]),
      `${name} top-level workspace navigation drifted`);
      assert(observed.battlefield.pageScrollWidth <= observed.battlefield.viewportWidth + 1, `${name} horizontally overflowed`);
      assert(observed.battlefield.criticalTouchTarget.heightPixels >= 43.5, `${name} touch target is too small`);
    }
  });

  await check("keyboard_apply_replay_and_offline_reconnect_are_authoritative", () => {
    const observed = browser.checks.find(
      (entry) => entry.id === "expo_authoritative_keyboard_apply_replay_offline_reconnect",
    );
    assert(observed?.keyboardActivation === "Enter", "keyboard activation evidence missing");
    assert(observed.stateRevisionAfter === observed.stateRevisionBefore + 1, "state did not advance exactly once");
    assert(observed.offlineWriteQueued === false && observed.reconnectedToAuthority === true,
      "offline/reconnect contract drifted");
  });

  await check("battle_lab_desktop_and_mobile_share_geometry_and_client_domain", () => {
    for (const name of ["desktop", "mobile"]) {
      const observed = browser.checks.find((entry) => entry.id === `battle_lab_${name}_shared_domain_mount`);
      assert(observed?.credentialInputCleared === true, `${name} Battle Lab credential input retained`);
      assert(observed.agentRuntimeMounted === false, `${name} mounted Ticket 15 early`);
      assert(observed.battlefield.viewBox === binding.battlefield.authoritativeViewBox, `${name} Battle Lab viewBox drifted`);
      assert(observed.battlefield.pageScrollWidth <= observed.battlefield.viewportWidth + 1, `${name} Battle Lab overflowed`);
      assert(observed.battlefield.minimumButtonHeight >= 43.5
        && observed.battlefield.minimumButtonWidth >= 43.5, `${name} Battle Lab target is too small`);
      assert(observed.battlefield.invalidBaseEdgeCount === 0,
        `${name} Battle Lab base crossed board edge`);
      assert(observed.battlefield.displayMapCount === 1
        && observed.battlefield.terrainCount === binding.battlefield.authoritativeTerrainCount,
      `${name} Battle Lab map or terrain missing`);
      assert(observed.battlefield.unitPortraitCount === observed.battlefield.modelBaseCount,
        `${name} Battle Lab portrait denominator drifted`);
      assert(observed.battlefield.shapeClippedCoverPortraitCount
        === observed.battlefield.modelBaseCount
        && observed.battlefield.portraitClipPathCount
          === observed.battlefield.modelBaseCount,
      `${name} Battle Lab portrait clipping policy drifted`);
      assert(observed.battlefield.overlappingBasePairs.length === 0,
        `${name} Battle Lab model formations overlap`);
      assert(observed.battlefield.detailTabCount === amendment.battleLabEvolution.detailPanels.length
        && stableJson(observed.battlefield.detailTabNames)
          === stableJson([...amendment.battleLabEvolution.detailPanels].sort())
        && observed.battlefield.visibleDetailPanelCount === 1,
      `${name} Battle Lab detail workspace stacking drifted`);
      assert(observed.battlefield.threatReferenceCount === 0,
        `${name} Battle Lab evidence did not restore default-hidden threat`);
    }
    const desktop = browser.checks.find((entry) => entry.id === "battle_lab_desktop_shared_domain_mount");
    assert(desktop.mediaPlayback.voice === "playing"
      && desktop.mediaPlayback.bgm === "playing"
      && desktop.mediaPlayback.threatOptInRendered === true,
    "Battle Lab opt-in media playback evidence missing");
  });

  await check("media_randomness_and_receipt_cues_are_non_authoritative", () => {
    assert(sources.mediaAssets.includes("randomStarcraftTmgPresentationMediaEntryV1")
      && sources.mediaAssets.includes("never enters a")
      && !sources.battlefield.includes("Math.random"),
    "presentation RNG crossed into battlefield authority surface");
    assert(sources.presentationCues.includes('authority: "validated_apply_receipt"')
      && sources.presentationCues.includes("eligibleForTraining: false")
      && sources.battlefield.includes("presentationCueBatch"),
    "validated Apply cue boundary missing");
    assert(sources.mediaCatalog.includes("bundledClassicBgm: false")
      && sources.mediaCatalog.includes('options.releaseChannel === "development_internal"')
      && sources.mediaCatalog.includes('options.releaseChannel === "public_user_authorized"')
      && sources.mediaCatalog.includes('? "development_internal" : userAuthorizedPublic ? "public_user_authorized" : "public"')
      && sources.mediaProvenance.includes("publicDistributionAllowed: false")
      && sources.mediaProvenance.includes('releaseChannel: "public_user_authorized"')
      && sources.mediaProvenance.includes("independentThirdPartyRightsReviewCompleted: false")
      && sources.mediaProvenance.includes("legalLicenseDeterminationMadeByProject: false"),
    "media release-channel boundary drifted");
  });

  await check("all_browser_artifacts_are_indexed_hash_bound_and_secret_scanned", async () => {
    assert(browser.artifacts.length === binding.browserDenominator.credentialLeakScans, "artifact denominator drifted");
    for (const artifact of browser.artifacts) {
      const filename = path.join(ROOT, artifact.path);
      const descriptor = await stat(filename);
      const body = await readFile(filename);
      assert(descriptor.isFile() && descriptor.size === artifact.byteLength, `artifact size drifted: ${artifact.path}`);
      assert(sha256(body) === artifact.sha256, `artifact hash drifted: ${artifact.path}`);
    }
    assert(browser.security.artifactCapabilityScanPassed === true, "artifact capability scan failed");
    assert(browser.security.authenticatedTraceCaptured === false, "authenticated trace captured secrets");
  });

  await check("static_html_capture_is_memory_only_and_provider_deletes_it", () => {
    assert(sources.htmlBootstrap.includes("Object.defineProperty(window, \"__PROJECT_D_INITIAL_ROOM_URL__\"")
      && sources.htmlBootstrap.includes("enumerable: false"), "pre-router capture missing");
    assert(sources.provider.includes("delete webWindow.__PROJECT_D_INITIAL_ROOM_URL__")
      && sources.provider.includes("initialWebRoomUrlRef.current = null"), "capture deletion missing");
    assert(!/localStorage|sessionStorage/u.test(sources.htmlBootstrap), "bootstrap persists capability");
  });

  await check("battlefield_uses_svg_transform_without_invalid_web_dom_attributes", () => {
    assert(sources.battlefield.includes("transform={`rotate("), "SVG transform missing");
    assert(!sources.battlefield.includes("origin={`${"), "invalid SVG origin prop remains");
    assert(!sources.battlefield.includes("accessible={false}"), "invalid SVG accessible prop remains");
    assert(!sources.themeProvider.includes("console.log("), "theme provider logs build state");
  });

  await check("builder_and_fixture_are_bounded_offline_and_loopback_only", () => {
    assert(sources.builder.includes('EXPO_OFFLINE: "1"')
      && sources.builder.includes('"--clear"')
      && sources.builder.includes('PROJECT_D_STATIC_WEB_CSS_INPUT')
      && sources.builder.includes('"--max-workers",\n    "2"'), "build boundary drifted");
    assert(sources.metroConfig.includes("PROJECT_D_STATIC_WEB_CSS_INPUT")
      && sources.metroConfig.includes("PROJECT_D_STATIC_WEB_CSS_OUTSIDE_WORKSPACE")
      && sources.metroConfig.includes("filePath: compiledCss"),
    "Metro static CSS read-only resolver missing");
    assert(sources.server.includes('server.listen(0, "127.0.0.1"'), "fixture is not loopback-only");
    assert(sources.server.includes("createStarcraftTmgLevel3HttpAdapter")
      && sources.server.includes("createStarcraftTmgRoomRuntime"), "fixture uses mock authority");
    for (const moduleName of amendment.battleLabEvolution.publicBrowserContentModules) {
      assert(sources.server.includes(`"${moduleName}"`),
        `public browser content module is not allowlisted: ${moduleName}`);
    }
    assert(sources.server.includes("PUBLIC_BROWSER_CONTENT_MODULES.has(relativePath)"),
      "fixture broadly exposes the content directory");
  });

  await check("browser_verifier_never_records_authenticated_network_trace", () => {
    assert(sources.browserVerifier.includes("context.tracing.start")
      && sources.browserVerifier.indexOf("context.tracing.start")
        < sources.browserVerifier.indexOf("def run_expo_viewport"), "trace scope widened into authenticated Expo flow");
    assert(browser.security.roomCapabilitiesPersistedInReport === false, "report persisted room capability");
    assert(browser.boundaries.mockTransportUsed === false
      && browser.boundaries.httpAdapterUsed === true, "browser used mock transport");
  });

  await check("harness_observability_fields_and_rollback_rules_are_complete", () => {
    for (const key of [
      "harnessLoopUsed", "targetGames", "promptPackRoutes", "harnessToolsCalled",
      "uiTraceEvidence", "agentDecisionEvidence", "memoryTraceEvidence",
      "trainingTraceCandidates", "rollbackOrDemotionRules", "userVisibleChecks",
    ]) assert(Object.prototype.hasOwnProperty.call(binding.harness, key), `harness field missing: ${key}`);
    assert(binding.harness.harnessLoopUsed === true
      && binding.harness.targetGames.join("/") === "starcraft-tmg", "harness scope drifted");
    assert(binding.harness.trainingTraceCandidates.length === 0, "training candidate emitted");
  });

  const reportCore = {
    schemaVersion: "starcraft_tmg_ticket_14_slice_136_web_static_contract_report_v1",
    generatedAt: "2026-09-03T16:00:00.000Z",
    ticket: 14,
    slice: 136,
    ticketProgress: "9/16",
    projectProgress: "13/22",
    assertionsPassed: checks.filter((entry) => entry.passed).length,
    assertionsTotal: checks.length,
    checks,
    failures,
    evidence: {
      bindingHash: binding.bindingHash,
      productionBuildReceiptHash: production.receiptHash,
      productionOutputTreeHash: production.outputTreeHash,
      acceptanceBuildReceiptHash: acceptance.receiptHash,
      acceptanceOutputTreeHash: acceptance.outputTreeHash,
      reproducibilityReportHash: reproducibility.reportHash,
      browserAcceptanceReportHash: browser.reportHash,
      browserArtifactCount: browser.artifacts.length,
      sourceHashes: Object.fromEntries(Object.entries(sources).map(
        ([key, source]) => [key, sha256(source)],
      )),
    },
    sourceRefreshed: false,
    providerCalled: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    trainingTruth: false,
    productionReady: false,
  };
  const report = { ...reportCore, reportHash: hashStarcraftTmgContract(reportCore) };
  await mkdir(REPORT_ROOT, { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(
    `Ticket 14 Slice 136 static/browser contract: ${report.assertionsPassed}/${report.assertionsTotal}; ${report.reportHash}\n`,
  );
  if (failures.length) throw new Error(`TICKET_14_SLICE_136_FAILED\n${failures.join("\n")}`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
