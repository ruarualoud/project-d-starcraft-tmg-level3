import { readFile } from "node:fs/promises";
import path from "node:path";

import { verifyOfficialDevelopmentTrancheSourceLockV1 } from
  "../../packages/source-data/official-development-tranche-source-lock-v1.mjs";

export async function loadOfficialDevelopmentTrancheSourceLockFixtureV1(input = {}) {
  const root = path.resolve(String(input.root || ""));
  const lock = JSON.parse(await readFile(path.join(
    root,
    "content/official-development-tranche-s75-111-source-lock-v1.json",
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
