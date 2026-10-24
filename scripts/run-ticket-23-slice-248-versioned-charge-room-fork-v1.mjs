#!/usr/bin/env node

// Explicit, persistent development branch of a frozen post-roll Charge Room.
// The source SQLite file and its match binding are never overwritten.
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV2,
  OFFICIAL_CHARGE_ENDPOINT_FAILURE_PARAMETER_KIND,
  OFFICIAL_CHARGE_ENDPOINT_FAILURE_PROOF_KIND } from
  "../packages/product-composition/official-current-product-match-runtime-v2.mjs";
import { createOfficialCurrentProductMatchRuntimeV3,
  OFFICIAL_CHARGE_ACCESS_FAILURE_PARAMETER_KIND,
  OFFICIAL_CHARGE_ACCESS_FAILURE_PROOF_KIND } from
  "../packages/product-composition/official-current-product-match-runtime-v3.mjs";
import { createOfficialCurrentProductMatchRuntimeV4,
  OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PARAMETER_KIND,
  OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PROOF_KIND } from
  "../packages/product-composition/official-current-product-match-runtime-v4.mjs";
import { createOfficialCurrentProductMatchRuntimeV5,
  OFFICIAL_CHARGE_ROUND_PATH_FAILURE_PARAMETER_KIND,
  OFFICIAL_CHARGE_ROUND_PATH_FAILURE_PROOF_KIND } from
  "../packages/product-composition/official-current-product-match-runtime-v5.mjs";
import {
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
} from "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import { forkOfficialChargeRulesRoomV1 } from
  "../packages/room-runtime/official-rules-version-fork-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createTicket20HumanAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = process.argv.find((entry) => entry.startsWith("--run-directory="));
assert(argument, "--run-directory is required");
const sourceDirectory = path.resolve(argument.slice("--run-directory=".length));
const roundPathV5 = process.argv.includes("--target-round-path-v5");
const runId = path.basename(sourceDirectory);
const sourceForkChain = [];
let credentialDirectory = sourceDirectory;
let expectedSourceRoomId = null;
while (true) {
  const ancestor = await readFile(path.join(credentialDirectory,
    "fork-private.json"), "utf8").then(JSON.parse, (error) => {
      if (error?.code === "ENOENT") return null;
      throw error;
    });
  if (!ancestor) break;
  assert(!expectedSourceRoomId
    || ancestor.targetRoomId === expectedSourceRoomId,
  "nested source Room ancestry must match");
  sourceForkChain.push(ancestor);
  assert(sourceForkChain.length <= 2,
    "only the frozen v1 -> v2 -> v3 lineage may be forked here");
  expectedSourceRoomId = ancestor.sourceRoomId;
  credentialDirectory = path.resolve(ancestor.sourceDirectory || "");
}
const sourceForkPrivate = sourceForkChain[0] || null;
assert(!roundPathV5 || sourceForkChain.length === 1,
  "round-path v5 requires an explicit frozen v2 source Room");
const privateState = JSON.parse(await readFile(path.join(credentialDirectory,
  "runner-private.json"), "utf8"));
const sourceRoomId = sourceForkPrivate?.targetRoomId || privateState.roomId;
const sourceCredentials = sourceForkPrivate?.resumeCredentials
  || privateState.resumeCredentials;
const cryptoRunId = path.basename(credentialDirectory);
assert(!sourceForkPrivate || expectedSourceRoomId
  === privateState.roomId, "nested source Room ancestry must match");
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateState.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${cryptoRunId}`,
  trustLevel: "development_persistent",
});
const refereeCrypto = createStarcraftTmgRefereeCrypto({
  privateKey: privateState.refereePrivateKeyPem,
  publicKey: privateState.refereePublicKeyPem,
  hmacSecret: privateState.refereeHmacSecret,
  keyId: `ticket23-slice248-referee-${cryptoRunId}`,
  trustLevel: "development_persistent",
});
const sourceRoomStore = createSqliteStarcraftTmgRoomStore({
  filename: path.join(sourceDirectory, "room.sqlite"),
  privatePayloadCodec: codec,
});
let plannedRecipe = null;
if (privateState.plannedMode === "agent_selected_teach") {
  const snapshot = JSON.parse(await readFile(path.join(credentialDirectory,
    "agent-selected-pregame-snapshot.json"), "utf8"));
  const selected = snapshot.selectedCandidateInput;
  assert(selected?.units?.length && snapshot.plan?.planStatus === "revised");
  plannedRecipe = {
    factionRecordKey: selected.factionRecordKey,
    tacticalCardRecordKeys: selected.tacticalCardRecordKeys,
    units: selected.units.map((unit) => ({
      unitInstanceId: unit.unitInstanceId,
      recordKey: unit.recordKey,
      compositionKind: unit.compositionKind,
      upgradeNames: unit.upgrades.map((upgrade) => upgrade.upgradeName),
    })),
  };
}
const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({
  root,
});
const sourceFixture = await createTicket20HumanAgentDemoFixtureV1({
  root: fixtureRoot,
  roomId: sourceRoomId,
  ...(sourceForkPrivate ? {
    setupRoomId: privateState.roomId,
    currentProductRuntimeVariant: sourceForkChain.length === 2
      ? "charge_access_v3" : "charge_endpoint_v2",
  } : {}),
  roomProfile: "standard_2000_live",
  mapConfiguration: { seedId: "sc1_lost_temple_v1",
    elementSelections: [], passageSelections: [] },
  ...(plannedRecipe ? {
    standard2000Recipes: { player1: plannedRecipe,
      player2: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2 },
    armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  } : {}),
  roomStore: sourceRoomStore,
  refereeCrypto,
  resumeRoom: true,
  resumeCredentials: sourceCredentials,
  attachBot: false,
  issueHumanRecovery: false,
  autoDrive: false,
});
const targetRulesRuntime = roundPathV5
  ? createOfficialCurrentProductMatchRuntimeV5({
    legacyRuntime: sourceFixture.rulesRuntime,
  }) : sourceForkChain.length === 2
  ? createOfficialCurrentProductMatchRuntimeV4({
    legacyRuntime: sourceFixture.rulesRuntime,
  }) : sourceForkChain.length === 1
    ? createOfficialCurrentProductMatchRuntimeV3({
      legacyRuntime: sourceFixture.rulesRuntime,
    }) : createOfficialCurrentProductMatchRuntimeV2({
      legacyRuntime: sourceFixture.rulesRuntime,
    });
const failureParameterKind = roundPathV5
  ? OFFICIAL_CHARGE_ROUND_PATH_FAILURE_PARAMETER_KIND
  : sourceForkChain.length === 2
  ? OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PARAMETER_KIND
  : sourceForkChain.length === 1
    ? OFFICIAL_CHARGE_ACCESS_FAILURE_PARAMETER_KIND
    : OFFICIAL_CHARGE_ENDPOINT_FAILURE_PARAMETER_KIND;
const failureProofKind = roundPathV5
  ? OFFICIAL_CHARGE_ROUND_PATH_FAILURE_PROOF_KIND
  : sourceForkChain.length === 2
  ? OFFICIAL_CHARGE_CROSS_SECTION_FAILURE_PROOF_KIND
  : sourceForkChain.length === 1
    ? OFFICIAL_CHARGE_ACCESS_FAILURE_PROOF_KIND
    : OFFICIAL_CHARGE_ENDPOINT_FAILURE_PROOF_KIND;
const targetRuntimeVariant = roundPathV5
  ? "charge_round_path_v5" : sourceForkChain.length === 2
  ? "charge_cross_section_v4" : sourceForkChain.length === 1
    ? "charge_access_v3" : "charge_endpoint_v2";
const targetAuthorityEngine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime: targetRulesRuntime,
  refereeCrypto,
});
const outputParent = path.join(root,
  "build/ticket-23-slice-248-versioned-charge-room-forks-v1");
await mkdir(outputParent, { recursive: true });
const targetDirectory = await mkdtemp(path.join(outputParent,
  `${runId}-`));
const targetRoomId = sourceRoomId
  + (roundPathV5 ? "-charge-v5-fork"
    : sourceForkChain.length === 2 ? "-charge-v4-fork"
    : sourceForkChain.length === 1 ? "-charge-v3-fork"
      : "-charge-v2-fork");
const targetRoomStore = createSqliteStarcraftTmgRoomStore({
  filename: path.join(targetDirectory, "room.sqlite"),
  privatePayloadCodec: codec,
});
const targetRoomRuntime = createStarcraftTmgRoomRuntime({
  authorityEngine: targetAuthorityEngine,
  roomStore: targetRoomStore,
  checkpointInterval: 8,
  characterReleaseChannel: "development_internal",
});
const fork = await forkOfficialChargeRulesRoomV1({
  sourceRoomStore,
  sourceAuthorityEngine: sourceFixture.authorityEngine,
  sourceRoomId,
  sourceInitialStateAuthority: sourceFixture.initialStateAuthority,
  targetRoomRuntime,
  targetRulesRuntime,
  targetRoomId,
  ...(sourceForkPrivate ? {
    requiredFailureParameterKind: failureParameterKind,
  } : {}),
});
const activeSideKey = (await targetRoomStore.loadRoom(targetRoomId))
  .envelope.state.activeSideKey;
const seatToken = fork.credentials[activeSideKey === "player1"
  ? "human" : "bot"].seatToken;
const space = await targetRoomRuntime.legalSpace({
  roomId: targetRoomId, seatToken,
});
assert.equal(space.ok, true, space.reason);
const domain = space.legalSpace.parameterDomains.find((item) =>
  item.parameterKind === failureParameterKind);
assert(domain, "persisted fork must expose the exact failure domain");
const preview = await targetRoomRuntime.previewAction({
  roomId: targetRoomId,
  seatToken,
  proposal: { kind: "parameterized", domainId: domain.domainId,
    parameters: { outcome: "failure",
      failureProof: { kind: failureProofKind } } },
});
assert.equal(preview.ok, true, preview.reason);
const confirmed = await targetRoomRuntime.confirmPreview({
  roomId: targetRoomId, seatToken,
  previewId: preview.preview.previewId,
  previewToken: preview.preview.previewToken,
  previewContentHash: preview.preview.previewSeal.contentHash,
});
assert.equal(confirmed.ok, true, confirmed.reason);
const control = await targetRoomRuntime.claimControl({
  roomId: targetRoomId, seatToken,
  sessionId: "versioned-charge-fork-settlement-v1",
});
assert.equal(control.ok, true, control.reason);
const applied = await targetRoomRuntime.applyAction({
  roomId: targetRoomId, seatToken,
  previewId: preview.preview.previewId,
  confirmationId: confirmed.confirmation.confirmationId,
  leaseId: control.controlLease.leaseId,
  leaseFence: control.controlLease.leaseFence,
  expectedStateRevision: 0,
  idempotencyKey: "initial-versioned-charge-failure",
});
assert.equal(applied.ok, true, applied.reason);
const replay = await targetRoomRuntime.replayRoom({ roomId: targetRoomId });
assert.equal(replay.ok, true, replay.reason);
assert.equal(replay.matchesCurrent, true);
assert.equal(replay.receiptCount, 1);
const after = await targetRoomStore.loadRoom(targetRoomId);
assert.equal(after.stateRevision, 1);
assert.equal(after.envelope.state.pendingAction, undefined);
const privateRecord = {
  sourceDirectory,
  sourceRoomId,
  targetRoomId,
  activeSideKey,
  resumeCredentials: fork.credentials,
  storeEncryptionKeyBase64: privateState.storeEncryptionKeyBase64,
  refereePrivateKeyPem: privateState.refereePrivateKeyPem,
  refereePublicKeyPem: privateState.refereePublicKeyPem,
  refereeHmacSecret: privateState.refereeHmacSecret,
};
await writeFile(path.join(targetDirectory, "fork-private.json"),
  `${JSON.stringify(privateRecord)}\n`, { encoding: "utf8", mode: 0o600 });
const report = {
  schema: "ticket23_slice248_versioned_charge_room_fork_receipt_v1",
  sourceRoomId,
  sourceStateRevision: fork.provenance.sourceStateRevision,
  sourceStateHash: fork.provenance.sourceStateHash,
  sourceMatchBindingHash: fork.provenance.sourceMatchBindingHash,
  sourceAcceptedReceiptCount: fork.provenance.sourceAcceptedReceiptCount,
  targetRoomId,
  targetMatchBindingHash: fork.targetMatchBindingHash,
  targetRulesRuntimeHash: targetRulesRuntime.descriptor.runtimeHash,
  targetRulesRuntimeVariant: targetRuntimeVariant,
  targetStateRevision: after.stateRevision,
  targetStateHash: after.envelope.stateHash,
  chargeFailed: applied.receipt.events.some((event) =>
    event.type === "charge_failed"),
  originalRoomUnchanged: true,
  targetReplayMatchesCurrent: replay.matchesCurrent,
  productionRoomEligible: false,
  trainingTruth: false,
};
await writeFile(path.join(targetDirectory, "fork-receipt.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify({
  ...report, targetDirectory,
})}\n`);
