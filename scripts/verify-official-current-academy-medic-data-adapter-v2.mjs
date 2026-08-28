#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialCurrentAcademyMedicFrozenViewV2,
  restoreOfficialCurrentAcademyMedicViewV2,
} from
  "../packages/rule-atoms/official-current-academy-medic-data-adapter-v2.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);
const CURRENT_BUNDLE_HASH =
  "f530568fbb6118bc2921fe13d807dbe8bb095e42efb5faf33d8f3d9806177459";
const FROZEN_BUNDLE_HASH =
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b";

const liveReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-live-source-snapshots-report.json",
), "utf8"));
const firestorePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(
    FIRESTORE_DIR,
    `${collectionId}.json`,
  ), "utf8")),
])));
const dataset = createOfficialCommandCenterDataset({
  snapshot: liveReport.commandSnapshot,
  firestorePayloads,
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot: liveReport.commandSnapshot,
  dataset,
  unitRecordKeys: ["army_units:marine", "army_units:medic"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
  reserveDeployData: true,
});
assert.equal(gameplayDataBundle.gameplayDataBundleHash, CURRENT_BUNDLE_HASH);

const currentMissionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: "1".repeat(64),
  deploymentDraftReceiptHash: "2".repeat(64),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const currentMatchBinding = {
  bindingHash: hashStarcraftTmgContract({
    kind: "ticket-11-slice-68-current-academy-medic-data-adapter-v2",
  }),
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: "3".repeat(64) },
};
const currentState = {
  officialGameplayDataBundle: gameplayDataBundle,
  officialMissionSetupBinding: currentMissionSetupBinding,
  log: [],
};

const adapted = createOfficialCurrentAcademyMedicFrozenViewV2(currentState, {
  matchBinding: currentMatchBinding,
});
assert.equal(
  adapted.frozenState.officialGameplayDataBundle.gameplayDataBundleHash,
  FROZEN_BUNDLE_HASH,
);
assert.equal(
  adapted.frozenState.officialGameplayDataBundle.reserveDeployDataBundle,
  undefined,
);
assert.equal(
  adapted.frozenMatchBinding.dataSnapshotHash,
  hashStarcraftTmgContract(adapted.frozenState.officialGameplayDataBundle),
);
assert.equal(adapted.receipt.currentGameplayDataBundleHash, CURRENT_BUNDLE_HASH);
assert.equal(adapted.receipt.frozenGameplayDataBundleHash, FROZEN_BUNDLE_HASH);
assert.equal(adapted.receipt.trainingTruth, false);

const frozenAfter = structuredClone(adapted.frozenState);
frozenAfter.log.push({ type: "synthetic-semantic-kernel-write" });
const restored = restoreOfficialCurrentAcademyMedicViewV2(
  currentState,
  frozenAfter,
  adapted.receipt,
);
assert.deepEqual(restored.officialGameplayDataBundle, gameplayDataBundle);
assert.deepEqual(restored.officialMissionSetupBinding, currentMissionSetupBinding);
assert.deepEqual(restored.log, [{ type: "synthetic-semantic-kernel-write" }]);

const narrowBundle = createOfficialGameplayDataBundleV1({
  snapshot: liveReport.commandSnapshot,
  dataset,
  unitRecordKeys: ["army_units:marine", "army_units:medic"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
});
assert.throws(() => createOfficialCurrentAcademyMedicFrozenViewV2({
  ...currentState,
  officialGameplayDataBundle: narrowBundle,
}, {
  matchBinding: {
    ...currentMatchBinding,
    dataSnapshotHash: hashStarcraftTmgContract(narrowBundle),
  },
}), /ACADEMY_MEDIC_DATA_ADAPTER_V2_LATEST_UNIFIED_BUNDLE_REQUIRED/u);

assert.throws(() => restoreOfficialCurrentAcademyMedicViewV2(
  currentState,
  frozenAfter,
  { ...adapted.receipt, adapterReceiptHash: "4".repeat(64) },
), /ACADEMY_MEDIC_DATA_ADAPTER_V2_RECEIPT_INVALID/u);

console.log(JSON.stringify({
  schema: "starcraft_tmg_current_academy_medic_data_adapter_v2_verification",
  acceptancePassed: 8,
  acceptanceTotal: 8,
  currentGameplayDataBundleHash: CURRENT_BUNDLE_HASH,
  frozenGameplayDataBundleHash: FROZEN_BUNDLE_HASH,
  adapterReceiptHash: adapted.receipt.adapterReceiptHash,
  repositoryFallbackUsed: false,
  trainingTruth: false,
}, null, 2));
