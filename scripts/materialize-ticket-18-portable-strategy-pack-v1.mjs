#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1 } from
  "../content/skill-generation/ticket-18-foundational-strategy-pack-v1.mjs";
import { seal, verifySeal } from "../packages/skill-production/common.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DESTINATION = "content/strategy-skills/ticket-18-foundational-v1";
const EVOLUTION = "build/ticket-18-skillopt-upgrade-regression-v1";

const copies = [
  ...STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1.entries.flatMap(
    (entry) => {
      const slug = entry.skillId.replace(/^starcraft-tmg\./u, "")
        .replaceAll(".", "-");
      return [
        {
          source: entry.skillPath,
          target: `${DESTINATION}/skills/${slug}.json`,
          expectedHash: entry.skillHash,
        },
        {
          source: entry.qualificationPath,
          target: `${DESTINATION}/qualifications/${entry.role === "matchup"
            ? "directed-matchups" : slug}.json`,
          expectedHash: entry.qualificationHash,
        },
      ];
    },
  ),
  {
    source: `${EVOLUTION}/candidates/starcraft-tmg.matchup.terran_armed_forces-to-zerg_swarm.1.0.0-offline-bounded-evaluation+skillopt.1.json`,
    target: `${DESTINATION}/evolution/skillopt-terran-to-zerg.json`,
    expectedHash: "449d4281de792f106de9d7e2b979cb89c9c0c33775422713c1ef6db870b5be27",
  },
  {
    source: `${EVOLUTION}/candidates/starcraft-tmg.matchup.zerg_swarm-to-terran_armed_forces.1.0.0-offline-bounded-evaluation+skillopt.1.json`,
    target: `${DESTINATION}/evolution/skillopt-zerg-to-terran.json`,
    expectedHash: "a9d81b552db20d812639b41e764260808a543831c1ddb0ba572bc32f15b8e00d",
  },
  {
    source: "build/ticket-18-online-strategy-arena-v1/report.json",
    target: `${DESTINATION}/evidence/slice-176-online-arena-report.json`,
    expectedHash: "9e1498bbd9ff88649270dde724fa60df4b4bd07395ab72a1bec32ec68868eca8",
  },
  {
    source: "build/ticket-18-postgame-skillopt-v1/report.json",
    target: `${DESTINATION}/evidence/slice-177-postgame-skillopt-report.json`,
    expectedHash: "dfc4ef065595db46dbfbf5aa2bd4fca1b7c54b46556cfa306cf5fc81de60c5eb",
  },
  {
    source: `${EVOLUTION}/report.json`,
    target: `${DESTINATION}/evidence/slice-178-skillopt-regression-report.json`,
    expectedHash: "33792bc949313e9e45fefbd6773b22fab77ed01afbf39ea20e25eb3c21430daa",
  },
];

const uniqueTargets = new Map();
for (const entry of copies) {
  const existing = uniqueTargets.get(entry.target);
  if (existing && (existing.source !== entry.source
    || existing.expectedHash !== entry.expectedHash)) {
    throw new Error(`PORTABLE_STRATEGY_TARGET_CONFLICT:${entry.target}`);
  }
  uniqueTargets.set(entry.target, entry);
}

for (const entry of uniqueTargets.values()) {
  const source = path.join(ROOT, entry.source);
  const target = path.join(ROOT, entry.target);
  const artifact = verifySeal(JSON.parse(await readFile(source, "utf8")));
  if (artifact.hash !== entry.expectedHash) {
    throw new Error(`PORTABLE_STRATEGY_HASH_MISMATCH:${entry.source}`);
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, `${JSON.stringify(artifact, null, 2)}\n`, { mode: 0o644 });
}

const rawPromotionRecords = JSON.parse(await readFile(path.join(ROOT,
  `${EVOLUTION}/promotion-records.json`), "utf8"));
const promotionRecords = rawPromotionRecords.map((record) => verifySeal(record));
const expectedPromotionHashes = [
  "eb61d11a8c650faba8d861002319187f7b90993c130b1cb497aaf3c572406c9d",
  "fe467c8ab1a88df618a7057f7c9c758354f02801688dc4727be2081196f2829e",
];
if (JSON.stringify(promotionRecords.map((record) => record.hash))
  !== JSON.stringify(expectedPromotionHashes)) {
  throw new Error("PORTABLE_STRATEGY_PROMOTION_RECORD_DRIFT");
}
const promotionBundle = seal({
  schema: "ticket18_skillopt_promotion_record_bundle_v1",
  records: promotionRecords,
  automaticPromotion: false,
  runtimeAccepted: false,
  trainingTruth: false,
});
const promotionTarget = path.join(ROOT,
  `${DESTINATION}/evolution/promotion-records.json`);
await mkdir(path.dirname(promotionTarget), { recursive: true });
await writeFile(promotionTarget, `${JSON.stringify(promotionBundle, null, 2)}\n`, {
  mode: 0o644,
});

console.log(JSON.stringify({
  ok: true,
  artifacts: uniqueTargets.size + 1,
  promotionBundleHash: promotionBundle.hash,
  destination: DESTINATION,
  sourceRefreshPerformed: false,
  providerCalls: 0,
}, null, 2));
