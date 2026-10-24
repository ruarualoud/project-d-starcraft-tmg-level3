import { access, readFile } from "node:fs/promises";
import path from "node:path";

import { verifyOfficialDevelopmentTrancheSourceLockV1 } from
  "../../packages/source-data/official-development-tranche-source-lock-v1.mjs";

const LOCK_PATH =
  "content/official-development-tranche-s75-111-source-lock-v1.json";

// A linked worktree keeps the same committed lock but not gitignored source
// bytes. Reuse the main checkout only when its lock is byte-identical and
// every frozen cache path exists; the loader below still verifies the bytes.
export async function resolveOfficialDevelopmentTrancheFixtureRootV1({ root,
  overrideRoot = null } = {}) {
  const localRoot = path.resolve(String(root || ""));
  const localLockBytes = await readFile(path.join(localRoot, LOCK_PATH));
  const lock = JSON.parse(localLockBytes.toString("utf8"));
  const records = [
    ...Object.values(lock.firestore || {}),
    ...Object.values(lock.binaries || {}),
    ...Object.values(lock.texts || {}),
  ];
  const parent = path.dirname(localRoot);
  const candidates = overrideRoot ? [path.resolve(overrideRoot)]
    : [localRoot, ...(path.basename(parent) === ".worktrees"
      ? [path.dirname(parent)] : [])];
  for (const candidate of candidates) {
    let candidateLockBytes;
    try { candidateLockBytes = await readFile(path.join(candidate, LOCK_PATH)); }
    catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
    if (!candidateLockBytes.equals(localLockBytes)) continue;
    try {
      await Promise.all(records.map((record) =>
        access(path.join(candidate, record.cachePath))));
      return candidate;
    } catch (error) {
      if (error?.code === "ENOENT") continue;
      throw error;
    }
  }
  throw Object.assign(new Error("OFFICIAL_SOURCE_FIXTURE_ROOT_INCOMPLETE"), {
    code: "OFFICIAL_SOURCE_FIXTURE_ROOT_INCOMPLETE",
  });
}

export async function loadOfficialDevelopmentTrancheSourceLockFixtureV1(input = {}) {
  const root = path.resolve(String(input.root || ""));
  const lock = JSON.parse(await readFile(path.join(
    root,
    LOCK_PATH,
  ), "utf8"));
  const records = [
    ...Object.values(lock.firestore || {}),
    ...Object.values(lock.binaries || {}),
    ...Object.values(lock.texts || {}),
  ];
  const sourceBytes = Object.fromEntries(await Promise.all(records.map(async (record) => [
    record.sourceId,
    await readFile(path.join(root, record.cachePath)),
  ])));
  return verifyOfficialDevelopmentTrancheSourceLockV1({ lock, sourceBytes });
}
