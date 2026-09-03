#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_BATTLEFIELD_MEDIA_PROVENANCE_V1 as provenance } from
  "../content/client/battlefield-media-provenance-v1.mjs";
import {
  resolveStarcraftTmgBattlefieldUnitMediaV1,
  STARCRAFT_TMG_BATTLEFIELD_MEDIA_POLICY_V1 as policy,
} from "../packages/client-domain/battlefield-media-catalog-v1.mjs";
import {
  isBattlefieldBaseWithinBoardV1,
  projectRotatedBaseBoundsV1,
} from "../packages/client-domain/battlefield-presentation-v1.mjs";
import { projectStarcraftTmgValidatedReceiptCuesV1 } from
  "../packages/client-domain/presentation-cues-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ASSET_ROOT = path.join(ROOT, provenance.inventory.root);
const UNIT_KEYS = [
  "marine", "marauder", "medic", "goliath",
  "zergling", "roach", "hydralisk", "queen",
];
const INTERNAL_UNIT_KEYS = [
  "marine", "medic", "goliath", "zergling", "hydralisk", "queen",
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function filesUnder(root) {
  const output = [];
  async function visit(directory) {
    for (const name of (await readdir(directory)).sort()) {
      const target = path.join(directory, name);
      const details = await stat(target);
      if (details.isDirectory()) await visit(target);
      else if (details.isFile()) output.push(target);
    }
  }
  await visit(root);
  return output.sort();
}

function repositoryPath(target) {
  return path.relative(ROOT, target).split(path.sep).join("/");
}

const assets = await filesUnder(ASSET_ROOT);
const descriptors = await Promise.all(assets.map(async (target) => {
  const body = await readFile(target);
  return { target, path: repositoryPath(target), body, size: body.byteLength, hash: sha256(body) };
}));
const inventoryText = `${descriptors.map((entry) => (
  `${entry.hash}  ${entry.path}`
)).join("\n")}\n`;
assert(descriptors.length === provenance.inventory.fileCount, "BATTLEFIELD_MEDIA_FILE_COUNT_DRIFT");
assert(descriptors.reduce((total, entry) => total + entry.size, 0)
  === provenance.inventory.byteLength, "BATTLEFIELD_MEDIA_BYTE_LENGTH_DRIFT");
assert(sha256(inventoryText) === provenance.inventory.sortedSha256InventoryHash,
  "BATTLEFIELD_MEDIA_INVENTORY_HASH_DRIFT");

for (const unitKey of UNIT_KEYS) {
  const publicMedia = resolveStarcraftTmgBattlefieldUnitMediaV1(unitKey, {
    releaseChannel: "public",
  });
  assert(publicMedia?.releaseChannel === "public", `PUBLIC_MEDIA_MISSING:${unitKey}`);
  assert(publicMedia.voice === null, `PUBLIC_VOICE_MUST_NOT_BUNDLE:${unitKey}`);
  assert(publicMedia.rightsGatePassedForPublicDistribution === true,
    `PUBLIC_RIGHTS_GATE_INVALID:${unitKey}`);
  for (const mediaPath of [publicMedia.neutralPortraitPath, publicMedia.activePortraitPath]) {
    const descriptor = descriptors.find((entry) => entry.path === mediaPath.replace(/^\//u, ""));
    assert(descriptor?.body.subarray(0, 4).toString("ascii") === "RIFF",
      `PUBLIC_WEBP_INVALID:${mediaPath}`);
  }
}

for (const unitKey of INTERNAL_UNIT_KEYS) {
  const internal = resolveStarcraftTmgBattlefieldUnitMediaV1(unitKey, {
    releaseChannel: "development_internal",
  });
  assert(internal?.rightsGatePassedForPublicDistribution === false,
    `INTERNAL_RIGHTS_GATE_MISSING:${unitKey}`);
  assert(internal?.portraitAnimated === true, `INTERNAL_PORTRAIT_NOT_ANIMATED:${unitKey}`);
  const portrait = descriptors.find((entry) => (
    entry.path === internal.neutralPortraitPath.replace(/^\//u, "")
  ));
  assert(portrait?.body.includes(Buffer.from("ANIM")),
    `INTERNAL_WEBP_ANIMATION_CHUNK_MISSING:${unitKey}`);
  assert(internal.voice?.selected.length === 2
    && internal.voice.confirm.length === 2
    && internal.voice.damaged.length === 2
    && internal.voice.destroyed.length === 1,
  `INTERNAL_VOICE_CUE_DENOMINATOR_INVALID:${unitKey}`);
  for (const mediaPath of Object.values(internal.voice).flat()) {
    const descriptor = descriptors.find((entry) => entry.path === mediaPath.replace(/^\//u, ""));
    assert(descriptor?.body.subarray(0, 4).toString("ascii") === "OggS",
      `INTERNAL_OGG_INVALID:${mediaPath}`);
  }
}

assert(policy.bundledClassicBgm === false
  && policy.bgmInput === "user_selected_local_audio"
  && policy.mediaAffectsAuthority === false
  && policy.mediaAffectsTraining === false,
"BATTLEFIELD_MEDIA_AUTHORITY_BOUNDARY_DRIFT");

const hash = "a".repeat(64);
const cueBatch = projectStarcraftTmgValidatedReceiptCuesV1({
  journalHash: hash,
  eventsHash: "b".repeat(64),
  events: [
    { type: "unit_standard_moved", pieceId: "marine", path: [{ secret: true }] },
    {
      type: "ranged_attack",
      pieceId: "marine",
      targetId: "roach",
      attackerModelId: "marine-1",
      targetModelId: "roach-1",
      damagePool: { totalDamage: 2, rolls: [6, 6] },
      targetDestroyed: false,
    },
    {
      type: "close_combat_attack",
      pieceId: "queen",
      targetId: "medic",
      casualtyModelIds: ["medic-1"],
      targetDestroyed: true,
    },
  ],
});
assert(cueBatch.receiptJournalHash === hash
  && cueBatch.authoritativeEffect === false
  && cueBatch.eligibleForTraining === false,
"PRESENTATION_CUE_RECEIPT_BINDING_INVALID");
assert(cueBatch.cues.map((cue) => cue.kind).join(",")
  === "operation_confirmed,attack_confirmed,target_damaged,attack_confirmed,model_destroyed",
"PRESENTATION_CUE_CLASSIFICATION_DRIFT");
const serializedCues = JSON.stringify(cueBatch);
assert(!serializedCues.includes("damagePool")
  && !serializedCues.includes("rolls")
  && !serializedCues.includes("secret"),
"PRESENTATION_CUE_LEAKED_RAW_EVENT_DATA");

const rotated = projectRotatedBaseBoundsV1({
  xMilliInches: 2_000,
  yMilliInches: 2_000,
  baseShape: "rectangle",
  baseWidthMilliInches: 4_000,
  baseDepthMilliInches: 2_000,
  baseRotationDegrees: 45,
});
assert(rotated && rotated.extentXMilliInches > 2_121
  && rotated.extentYMilliInches > 2_121,
"ROTATED_BASE_EDGE_EXTENTS_INVALID");
assert(isBattlefieldBaseWithinBoardV1({
  xMilliInches: 2_000,
  yMilliInches: 2_000,
  baseShape: "rectangle",
  baseWidthMilliInches: 4_000,
  baseDepthMilliInches: 2_000,
  baseRotationDegrees: 45,
  boardWidthMilliInches: 54_000,
  boardHeightMilliInches: 36_000,
}) === false, "BASE_CENTER_WAS_INCORRECTLY_USED_AS_LEGALITY_BOUNDARY");

const [serverSource, workspaceSource, clientSource, appPackage] = await Promise.all([
  readFile(path.join(ROOT, "scripts/serve-ticket-14-web-acceptance-v1.mjs"), "utf8"),
  readFile(path.join(ROOT,
    "apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx"), "utf8"),
  readFile(path.join(ROOT, "packages/client-domain/client-domain-v1.mjs"), "utf8"),
  readFile(path.join(ROOT, "apps/starcraft-tmg-expo/package.json"), "utf8"),
]);
assert(!serverSource.includes("state.board.terrain = []")
  && serverSource.includes("projectRotatedBaseBoundsV1")
  && serverSource.includes("baseEdgeSafetyMargin = 0.6")
  && serverSource.includes("fixture model bases overlap"),
"ACCEPTANCE_FIXTURE_BASE_EDGE_OR_MAP_DRIFT");
assert(workspaceSource.includes("showThreatReference")
  && workspaceSource.includes("STARCRAFT_TMG_BATTLEFIELD_MAP_SOURCE")
  && workspaceSource.includes("presentationCueBatch")
  && workspaceSource.includes("xMidYMid slice")
  && workspaceSource.includes("battlefield-portrait-clip-")
  && !workspaceSource.includes("view.lastReceipt?.events")
  && !workspaceSource.includes("Math.random"),
"EXPO_BATTLEFIELD_MEDIA_AUTHORITY_BOUNDARY_DRIFT");
assert(clientSource.includes("projectStarcraftTmgValidatedReceiptCuesV1(receipt)"),
  "VALIDATED_RECEIPT_CUE_PROJECTION_NOT_MOUNTED");
const dependencies = JSON.parse(appPackage).dependencies;
assert(dependencies["expo-audio"] === "~1.1.1"
  && dependencies["expo-document-picker"] === "~14.0.8",
"EXPO_MEDIA_DEPENDENCY_VERSION_DRIFT");

console.log(JSON.stringify({
  ok: true,
  schemaVersion: "ticket_14_slice_136_battlefield_media_verification_v1",
  assetFiles: descriptors.length,
  assetBytes: descriptors.reduce((total, entry) => total + entry.size, 0),
  internalAnimatedPortraits: INTERNAL_UNIT_KEYS.length,
  publicFallbackPortraitFrames: UNIT_KEYS.length * 2,
  developmentInternalVoiceClips: descriptors.filter((entry) => entry.path.endsWith(".ogg")).length,
  receiptPresentationCues: cueBatch.cues.length,
  threatDefaultVisible: false,
  mapTerrainPreserved: true,
  baseLegality: "rotated_base_edge",
  trainingTruth: false,
}, null, 2));
