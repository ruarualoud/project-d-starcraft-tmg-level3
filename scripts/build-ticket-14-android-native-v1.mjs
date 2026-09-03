#!/usr/bin/env node

import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPO_ROOT = path.join(ROOT, "apps/starcraft-tmg-expo");
const ANDROID_ROOT = path.join(EXPO_ROOT, "android");
const METRO_OUTPUT = path.join(
  ROOT,
  "build/ticket-14-slice-142-native-v1/android-metro-export",
);
const LOCK_HASH = "6a60cdbb9639a8ba9de3f0660e7151e1fc1c7cd4cf7eb5a0768c69071b919458";

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

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", ...options });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(
        `ANDROID_NATIVE_BUILD_FAILED:${command}:${code ?? signal ?? "unknown"}`,
      ));
    });
  });
}

async function main() {
  const observedLockHash = sha256(await readFile(
    path.join(EXPO_ROOT, "pnpm-lock.yaml"),
  ));
  if (observedLockHash !== LOCK_HASH) {
    throw new Error(`ANDROID_NATIVE_LOCK_DRIFT:${observedLockHash}`);
  }

  const javaHome = await firstDirectory([
    process.env.JAVA_HOME,
    "/usr/local/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home",
    "/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home",
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
  ], "bin/java");
  if (!javaHome) throw new Error("ANDROID_NATIVE_JDK_MISSING");

  const androidSdk = await firstDirectory([
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
    path.join(os.homedir(), "Library/Android/sdk"),
    "/usr/local/share/android-commandlinetools",
    "/opt/homebrew/share/android-commandlinetools",
  ], "platforms/android-36/android.jar");
  if (!androidSdk) throw new Error("ANDROID_NATIVE_SDK_36_MISSING");

  const commonEnv = {
    ...process.env,
    JAVA_HOME: javaHome,
    ANDROID_HOME: androidSdk,
    ANDROID_SDK_ROOT: androidSdk,
    CI: "1",
    EXPO_OFFLINE: "1",
    NODE_ENV: "development",
    EXPO_PUBLIC_STARCRAFT_TMG_MEDIA_RELEASE_CHANNEL: "development_internal",
  };

  await run("corepack", [
    "pnpm@9.12.0",
    "--dir",
    EXPO_ROOT,
    "exec",
    "expo",
    "prebuild",
    "--platform",
    "android",
    "--no-install",
  ], { cwd: ROOT, env: commonEnv });

  await run("corepack", [
    "pnpm@9.12.0",
    "--dir",
    EXPO_ROOT,
    "exec",
    "expo",
    "export",
    "--platform",
    "android",
    "--output-dir",
    METRO_OUTPUT,
    "--dev",
    "--clear",
    "--max-workers",
    "2",
  ], { cwd: ROOT, env: commonEnv });

  await run(path.join(ANDROID_ROOT, "gradlew"), [
    "assembleDebug",
    "--no-daemon",
  ], { cwd: ANDROID_ROOT, env: commonEnv });

  await run(path.join(ANDROID_ROOT, "gradlew"), [
    "assembleRelease",
    "--no-daemon",
  ], {
    cwd: ANDROID_ROOT,
    env: {
      ...commonEnv,
      NODE_ENV: "production",
      // Reserved .invalid origin: this is an installable internal preview, not
      // a production App/Universal Link or store-distribution configuration.
      EXPO_PUBLIC_STARCRAFT_TMG_WEB_ORIGIN:
        "https://starcraft-tmg-preview.invalid",
    },
  });

  await run(process.execPath, [
    path.join(ROOT, "scripts/verify-ticket-14-native-build-v1.mjs"),
  ], { cwd: ROOT, env: commonEnv });
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
