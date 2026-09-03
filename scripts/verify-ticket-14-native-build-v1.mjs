#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { access, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const run = promisify(execFile);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPO_ROOT = path.join(ROOT, "apps/starcraft-tmg-expo");
const APK = path.join(
  EXPO_ROOT,
  "android/app/build/outputs/apk/debug/app-debug.apk",
);
const PREVIEW_APK = path.join(
  EXPO_ROOT,
  "android/app/build/outputs/apk/release/app-release.apk",
);
const METRO_OUTPUT = path.join(
  ROOT,
  "build/ticket-14-slice-142-native-v1/android-metro-export",
);
const OUTPUT = path.join(
  ROOT,
  "build/ticket-14-slice-142-native-v1/android-build-receipt.json",
);
const EXPECTED = Object.freeze({
  lockHash: "6a60cdbb9639a8ba9de3f0660e7151e1fc1c7cd4cf7eb5a0768c69071b919458",
  packageHash: "048c4a6df855f4bcf6a0ac8d6e99f6c9309c4b083745fb3d5225c6ff26d5dd2c",
  configHash: "9ee7e0a3fad76682f359920a3b610983a32dd448629c8ce78116b6a4b057d104",
  metroConfigHash: "2268a909979225b740f3477b67661f149540011fcb5a2b267bd666f6b7d3ac73",
  packageName: "app.projectd.starcrafttmg",
  versionCode: "1",
  versionName: "1.0.0",
  minSdk: "24",
  targetSdk: "36",
  compileSdk: "36",
  nativeCode: ["arm64-v8a", "armeabi-v7a"],
  dependencies: {
    expo: "~54.0.37",
    react: "19.1.0",
    reactNative: "0.81.5",
    expoAsset: "~12.0.13",
    expoAudio: "~1.1.1",
    expoRouter: "~6.0.24",
  },
  metroBundleHash: "0a72a1c879d5a6b1e5388e7100a4cb6f1d028abd3918504656b7caa9b1efb882",
  metroBundleByteLength: 11_132_078,
});
const FORBIDDEN_PERMISSIONS = Object.freeze([
  "android.permission.RECORD_AUDIO",
  "android.permission.READ_EXTERNAL_STORAGE",
  "android.permission.WRITE_EXTERNAL_STORAGE",
]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function exists(candidate) {
  try {
    await access(candidate);
    return true;
  } catch {
    return false;
  }
}

async function firstDirectory(candidates, requiredRelative) {
  for (const candidate of candidates.filter(Boolean)) {
    if (await exists(path.join(candidate, requiredRelative))) return candidate;
  }
  return null;
}

async function capture(command, args = [], options = {}) {
  try {
    const result = await run(command, args, {
      encoding: "utf8",
      maxBuffer: 32 * 1024 * 1024,
      ...options,
    });
    return {
      ok: true,
      stdout: String(result.stdout || ""),
      stderr: String(result.stderr || ""),
    };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error?.stdout || ""),
      stderr: String(error?.stderr || error?.message || error),
    };
  }
}

function field(text, expression, name) {
  const match = text.match(expression);
  assert(match, `${name} missing from APK metadata`);
  return match[1];
}

function uniqueMatches(text, expression) {
  return [...new Set([...text.matchAll(expression)].map((match) => match[1]))];
}

function adbRows(output) {
  return output.split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("List of devices"))
    .map((line) => {
      const [serial, state = "unknown", ...details] = line.split(/\s+/u);
      const emulator = serial.startsWith("emulator-")
        || details.some((entry) => /(?:^|:)sdk(?:_|$)/iu.test(entry));
      return { serial, state, emulator, details };
    });
}

const acceptance = [];
function accept(name, operation) {
  operation();
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${name}`);
}

async function main() {
  const packageBody = await readFile(path.join(EXPO_ROOT, "package.json"));
  const lockBody = await readFile(path.join(EXPO_ROOT, "pnpm-lock.yaml"));
  const configBody = await readFile(path.join(EXPO_ROOT, "app.config.ts"));
  const metroConfigBody = await readFile(path.join(EXPO_ROOT, "metro.config.js"));
  const packageJson = JSON.parse(packageBody);

  accept("pnpm_lock_and_client_manifests_are_pinned", () => {
    assert.equal(sha256(lockBody), EXPECTED.lockHash);
    assert.equal(sha256(packageBody), EXPECTED.packageHash);
    assert.equal(sha256(configBody), EXPECTED.configHash);
    assert.equal(sha256(metroConfigBody), EXPECTED.metroConfigHash);
    assert.equal(packageJson.packageManager, "pnpm@9.12.0");
  });
  accept("expo_react_native_and_native_module_versions_are_explicit", () => {
    assert.equal(packageJson.dependencies.expo, EXPECTED.dependencies.expo);
    assert.equal(packageJson.dependencies.react, EXPECTED.dependencies.react);
    assert.equal(packageJson.dependencies["react-native"], EXPECTED.dependencies.reactNative);
    assert.equal(packageJson.dependencies["expo-asset"], EXPECTED.dependencies.expoAsset);
    assert.equal(packageJson.dependencies["expo-audio"], EXPECTED.dependencies.expoAudio);
    assert.equal(packageJson.dependencies["expo-router"], EXPECTED.dependencies.expoRouter);
  });
  const configText = configBody.toString("utf8");
  accept("audio_playback_does_not_request_microphone_or_legacy_storage", () => {
    assert.match(configText, /recordAudioAndroid:\s*false/u);
    assert.match(configText, /microphonePermission:\s*false/u);
    for (const permission of FORBIDDEN_PERMISSIONS) {
      assert(configText.includes(`\"${permission}\"`));
    }
  });
  accept("production_links_require_an_explicit_public_https_origin", () => {
    assert.match(configText, /EXPO_PUBLIC_STARCRAFT_TMG_WEB_ORIGIN is required/u);
    assert.match(configText, /parsed\.protocol !== "https:"/u);
  });

  const sdkRoot = await firstDirectory([
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    path.join(os.homedir(), "Library/Android/sdk"),
    "/usr/local/share/android-commandlinetools",
    "/opt/homebrew/share/android-commandlinetools",
  ], "platforms/android-36/android.jar");
  assert(sdkRoot, "Android SDK 36 is required");
  const buildTools = await firstDirectory([
    path.join(sdkRoot, "build-tools/36.0.0"),
    path.join(sdkRoot, "build-tools/35.0.0"),
  ], "aapt");
  assert(buildTools, "Android build-tools 35+ are required");
  assert(await exists(APK), "Debug APK is missing; run build:ticket-14-android-native");
  assert(await exists(PREVIEW_APK),
    "Standalone preview APK is missing; run build:ticket-14-android-native");
  const metroMetadataPath = path.join(METRO_OUTPUT, "metadata.json");
  assert(await exists(metroMetadataPath),
    "Android Metro export is missing; run build:ticket-14-android-native");
  const metroMetadata = JSON.parse(await readFile(metroMetadataPath, "utf8"));
  const metroBundleRelative = metroMetadata?.fileMetadata?.android?.bundle;
  assert.equal(typeof metroBundleRelative, "string");
  const metroBundlePath = path.join(METRO_OUTPUT, metroBundleRelative);
  assert(await exists(metroBundlePath), "Android Metro bundle is missing");
  const metroBundleBody = await readFile(metroBundlePath);
  const metroAssets = metroMetadata?.fileMetadata?.android?.assets;

  accept("android_metro_bundle_resolves_the_shared_workspace_graph", () => {
    assert.equal(sha256(metroBundleBody), EXPECTED.metroBundleHash);
    assert.equal(metroBundleBody.byteLength, EXPECTED.metroBundleByteLength);
    assert(Array.isArray(metroAssets));
    assert(metroAssets.length >= 40);
  });

  const [
    apkStat,
    badging,
    signature,
    archive,
    previewApkStat,
    previewBadging,
    previewSignature,
    previewArchive,
    adb,
    xcodeSelect,
    xcodeBuild,
  ] = await Promise.all([
    stat(APK),
    capture(path.join(buildTools, "aapt"), ["dump", "badging", APK]),
    capture(path.join(buildTools, "apksigner"), ["verify", "--verbose", "--print-certs", APK]),
    capture("unzip", ["-l", APK]),
    stat(PREVIEW_APK),
    capture(path.join(buildTools, "aapt"), ["dump", "badging", PREVIEW_APK]),
    capture(path.join(buildTools, "apksigner"), ["verify", "--verbose", "--print-certs", PREVIEW_APK]),
    capture("unzip", ["-l", PREVIEW_APK]),
    capture(path.join(sdkRoot, "platform-tools/adb"), ["devices", "-l"]),
    capture("xcode-select", ["-p"]),
    capture("xcodebuild", ["-version"]),
  ]);
  assert(badging.ok, badging.stderr);
  assert(signature.ok, signature.stderr);
  assert(archive.ok, archive.stderr);
  assert(previewBadging.ok, previewBadging.stderr);
  assert(previewSignature.ok, previewSignature.stderr);
  assert(previewArchive.ok, previewArchive.stderr);

  const packageName = field(badging.stdout, /package: name='([^']+)'/u, "package name");
  const versionCode = field(badging.stdout, /versionCode='([^']+)'/u, "version code");
  const versionName = field(badging.stdout, /versionName='([^']+)'/u, "version name");
  const minSdk = field(badging.stdout, /sdkVersion:'([^']+)'/u, "min SDK");
  const targetSdk = field(badging.stdout, /targetSdkVersion:'([^']+)'/u, "target SDK");
  const compileSdk = field(badging.stdout, /compileSdkVersion='([^']+)'/u, "compile SDK");
  const nativeCode = uniqueMatches(badging.stdout, /native-code:([^\n]+)/gu)
    .flatMap((line) => [...line.matchAll(/'([^']+)'/gu)].map((match) => match[1]));
  const permissions = uniqueMatches(
    badging.stdout,
    /uses-permission: name='([^']+)'/gu,
  ).sort();
  const previewPackageName = field(
    previewBadging.stdout,
    /package: name='([^']+)'/u,
    "preview package name",
  );
  const previewPermissions = uniqueMatches(
    previewBadging.stdout,
    /uses-permission: name='([^']+)'/gu,
  ).sort();

  accept("apk_identity_and_sdk_contract_match_the_product_baseline", () => {
    assert.equal(packageName, EXPECTED.packageName);
    assert.equal(versionCode, EXPECTED.versionCode);
    assert.equal(versionName, EXPECTED.versionName);
    assert.equal(minSdk, EXPECTED.minSdk);
    assert.equal(targetSdk, EXPECTED.targetSdk);
    assert.equal(compileSdk, EXPECTED.compileSdk);
  });
  accept("apk_contains_only_the_two_pinned_android_abis", () => {
    assert.deepEqual(nativeCode.sort(), [...EXPECTED.nativeCode].sort());
  });
  accept("final_merged_apk_excludes_microphone_and_legacy_storage_permissions", () => {
    for (const permission of FORBIDDEN_PERMISSIONS) {
      assert(!permissions.includes(permission), `${permission} leaked into APK`);
    }
  });
  accept("apk_has_a_valid_v2_signature_and_is_explicitly_debug_only", () => {
    assert.match(signature.stdout, /Verifies/u);
    assert.match(signature.stdout, /Verified using v2 scheme .*: true/u);
    assert.match(signature.stdout, /CN=Android Debug/u);
    assert.match(badging.stdout, /application-debuggable/u);
  });
  accept("apk_contains_native_modules_but_no_embedded_release_bundle", () => {
    assert.match(archive.stdout, /lib\/arm64-v8a\/libappmodules\.so/u);
    assert.match(archive.stdout, /lib\/armeabi-v7a\/libappmodules\.so/u);
    assert.doesNotMatch(archive.stdout, /assets\/index\.android\.bundle/u);
  });
  accept("apk_is_nonempty_and_content_addressed", () => {
    assert(apkStat.size > 50_000_000);
  });
  accept("standalone_preview_has_the_same_identity_and_no_debug_flag", () => {
    assert.equal(previewPackageName, EXPECTED.packageName);
    assert.doesNotMatch(previewBadging.stdout, /application-debuggable/u);
    assert(previewApkStat.size > 50_000_000);
  });
  accept("standalone_preview_embeds_javascript_and_needs_no_metro", () => {
    assert.match(previewArchive.stdout, /assets\/index\.android\.bundle/u);
  });
  accept("standalone_preview_permissions_and_internal_signature_are_explicit", () => {
    for (const permission of FORBIDDEN_PERMISSIONS) {
      assert(!previewPermissions.includes(permission), `${permission} leaked into preview APK`);
    }
    assert.match(previewSignature.stdout, /Verifies/u);
    assert.match(previewSignature.stdout, /Verified using v2 scheme .*: true/u);
    assert.match(previewSignature.stdout, /CN=Android Debug/u);
  });

  const devices = adb.ok ? adbRows(adb.stdout) : [];
  const physicalDevices = devices.filter((device) => (
    device.state === "device" && !device.emulator
  ));
  const realDeviceReceiptPresent = await exists(path.join(
    ROOT,
    "build/ticket-14-slice-142-native-v1/android-device-receipt.json",
  ));
  const iosBuildEnvironmentAvailable = xcodeBuild.ok;
  accept("ios_environment_limit_is_observed_not_silently_ignored", () => {
    assert(xcodeSelect.ok || !xcodeBuild.ok);
  });
  accept("native_build_does_not_claim_provider_skill_or_training_authority", () => {
    assert.equal(packageJson.dependencies["@deepseek-ai/dsh"], undefined);
  });

  const core = {
    schemaVersion: "starcraft_tmg_ticket_14_slice_142_android_build_receipt_v1",
    ticket: 14,
    slice: 142,
    artifactClass: "development_debug_apk_requires_metro_not_distribution",
    apk: {
      relativePath: path.relative(ROOT, APK).split(path.sep).join("/"),
      byteLength: apkStat.size,
      sha256: sha256(await readFile(APK)),
      packageName,
      versionCode,
      versionName,
      minSdk,
      targetSdk,
      compileSdk,
      nativeCode: nativeCode.sort(),
      permissions,
      signing: "android_debug_v2",
      embeddedReleaseBundle: false,
    },
    standalonePreviewApk: {
      relativePath: path.relative(ROOT, PREVIEW_APK).split(path.sep).join("/"),
      byteLength: previewApkStat.size,
      sha256: sha256(await readFile(PREVIEW_APK)),
      packageName: previewPackageName,
      permissions: previewPermissions,
      signing: "internal_preview_android_debug_key_not_distribution",
      embeddedReleaseBundle: true,
      requiresMetro: false,
      appLinkOriginClass: "reserved_invalid_internal_preview",
      distributionReady: false,
    },
    metroBundle: {
      relativePath: path.relative(ROOT, metroBundlePath).split(path.sep).join("/"),
      byteLength: metroBundleBody.byteLength,
      sha256: sha256(metroBundleBody),
      assetReferenceCount: metroAssets.length,
      developmentBundleForDebugApk: true,
    },
    buildInputs: {
      packageManager: packageJson.packageManager,
      lockHash: sha256(lockBody),
      packageHash: sha256(packageBody),
      configHash: sha256(configBody),
      metroConfigHash: sha256(metroConfigBody),
      sdkRootClass: sdkRoot.includes(os.homedir()) ? "user_android_sdk" : "system_android_sdk",
      androidPlatform: 36,
      androidBuildTools: path.basename(buildTools),
      androidNdk: "27.1.12297006",
      cmake: "3.22.1",
      requiredJdkMajor: 17,
    },
    deviceEvidence: {
      adbAvailable: adb.ok,
      connectedDeviceCount: devices.length,
      authorizedPhysicalDeviceCount: physicalDevices.length,
      realDeviceReceiptPresent,
      satisfied: physicalDevices.length > 0 && realDeviceReceiptPresent,
    },
    iosEnvironment: {
      xcodeSelectPath: xcodeSelect.ok ? xcodeSelect.stdout.trim() : null,
      fullXcodeAvailable: iosBuildEnvironmentAvailable,
      buildAttempted: false,
      reason: iosBuildEnvironmentAvailable ? "not_attempted" : "full_xcode_unavailable",
    },
    authority: {
      sourceRefreshPerformed: false,
      providerCalled: false,
      byokCredentialEmbedded: false,
      skillGenerated: false,
      dshRun: false,
      muzeroDataGenerated: false,
      selfPlayRun: false,
      trainingTruth: false,
      distributionReady: false,
    },
    acceptance,
  };
  const receipt = {
    ...core,
    receiptHash: hashStarcraftTmgContract(core),
  };
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  process.stdout.write(`Ticket 14 Slice 142 native build ${acceptance.length}/${acceptance.length}\n`);
  process.stdout.write(`APK ${receipt.apk.byteLength} bytes ${receipt.apk.sha256}\n`);
  process.stdout.write(`Standalone preview APK ${receipt.standalonePreviewApk.byteLength} bytes ${receipt.standalonePreviewApk.sha256}\n`);
  process.stdout.write(`Physical device evidence ${receipt.deviceEvidence.satisfied ? "complete" : "pending"}\n`);
  process.stdout.write(`iOS full Xcode ${iosBuildEnvironmentAvailable ? "available" : "unavailable"}\n`);
  process.stdout.write(`Receipt ${receipt.receiptHash}\n`);

  if (process.argv.includes("--require-device") && !receipt.deviceEvidence.satisfied) {
    throw new Error("ANDROID_PHYSICAL_DEVICE_EVIDENCE_REQUIRED");
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
