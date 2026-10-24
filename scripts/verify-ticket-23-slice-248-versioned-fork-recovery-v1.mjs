#!/usr/bin/env node

// A separate process reloads one persisted v2 branch. No model call or action
// is applied; the fork's already-accepted receipt must replay from SQLite.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
} from "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createTicket20HumanAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argument = process.argv.find((entry) => entry.startsWith("--fork-directory="));
assert(argument, "--fork-directory is required");
const forkDirectory = path.resolve(argument.slice("--fork-directory=".length));
const privateFork = JSON.parse(await readFile(path.join(forkDirectory,
  "fork-private.json"), "utf8"));
const sourceDirectory = privateFork.sourceDirectory;
const runId = path.basename(sourceDirectory);
const sourcePrivate = JSON.parse(await readFile(path.join(sourceDirectory,
  "runner-private.json"), "utf8"));
const previousReceipt = JSON.parse(await readFile(path.join(forkDirectory,
  "fork-receipt.json"), "utf8"));
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: privateFork.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${runId}`,
  trustLevel: "development_persistent",
});
const refereeCrypto = createStarcraftTmgRefereeCrypto({
  privateKey: privateFork.refereePrivateKeyPem,
  publicKey: privateFork.refereePublicKeyPem,
  hmacSecret: privateFork.refereeHmacSecret,
  keyId: `ticket23-slice248-referee-${runId}`,
  trustLevel: "development_persistent",
});
const roomStore = createSqliteStarcraftTmgRoomStore({
  filename: path.join(forkDirectory, "room.sqlite"),
  privatePayloadCodec: codec,
});
let plannedRecipe = null;
if (sourcePrivate.plannedMode === "agent_selected_teach") {
  const snapshot = JSON.parse(await readFile(path.join(sourceDirectory,
    "agent-selected-pregame-snapshot.json"), "utf8"));
  const selected = snapshot.selectedCandidateInput;
  assert(selected?.units?.length);
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
const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({ root });
const fixture = await createTicket20HumanAgentDemoFixtureV1({
  root: fixtureRoot,
  roomId: privateFork.targetRoomId,
  setupRoomId: privateFork.sourceRoomId,
  roomProfile: "standard_2000_live",
  currentProductRuntimeVariant: "charge_endpoint_v2",
  mapConfiguration: { seedId: "sc1_lost_temple_v1",
    elementSelections: [], passageSelections: [] },
  ...(plannedRecipe ? {
    standard2000Recipes: { player1: plannedRecipe,
      player2: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2 },
    armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  } : {}),
  roomStore,
  refereeCrypto,
  resumeRoom: true,
  resumeCredentials: privateFork.resumeCredentials,
  attachBot: false,
  issueHumanRecovery: false,
  autoDrive: false,
});
assert.equal(fixture.rulesRuntime.descriptor.runtimeHash,
  previousReceipt.targetRulesRuntimeHash);
const replay = await fixture.roomRuntime.replayRoom({
  roomId: privateFork.targetRoomId,
});
assert.equal(replay.ok, true, replay.reason);
assert.equal(replay.matchesCurrent, true);
assert.equal(replay.receiptCount, 1);
const aggregate = await roomStore.loadRoom(privateFork.targetRoomId);
assert.equal(aggregate.stateRevision, 1);
assert.equal(aggregate.envelope.stateHash, previousReceipt.targetStateHash);
assert.equal(aggregate.envelope.state.officialRulesVersionFork?.sourceStateHash,
  previousReceipt.sourceStateHash);
const sideKey = aggregate.envelope.state.activeSideKey;
const seatToken = privateFork.resumeCredentials[sideKey === "player1"
  ? "human" : "bot"].seatToken;
const legal = await fixture.roomRuntime.legalSpace({
  roomId: privateFork.targetRoomId, seatToken,
});
assert.equal(legal.ok, true, legal.reason);
const enabledFiniteCount = legal.legalSpace.finiteActions.filter((action) =>
  action.isEnabled !== false).length;
const domainCount = legal.legalSpace.parameterDomains.length;
assert(enabledFiniteCount + domainCount > 0,
  "recovered branch must expose its next legal action");
const board = await fixture.roomRuntime.readBattleWorkbench({
  roomId: privateFork.targetRoomId, seatToken,
});
assert.equal(board.ok, true, board.reason);
const report = {
  schema: "ticket23_slice248_versioned_charge_fork_recovery_v1",
  sourceRoomId: privateFork.sourceRoomId,
  targetRoomId: privateFork.targetRoomId,
  recoveredStateRevision: aggregate.stateRevision,
  recoveredStateHash: aggregate.envelope.stateHash,
  targetRulesRuntimeHash: fixture.rulesRuntime.descriptor.runtimeHash,
  replayMatchesCurrent: true,
  nextActiveSideKey: sideKey,
  enabledFiniteCount,
  parameterDomainCount: domainCount,
  battleWorkbenchLoaded: true,
  providerCalls: 0,
  actionsAppliedInRecovery: 0,
  trainingTruth: false,
};
await writeFile(path.join(forkDirectory, "fork-recovery-receipt.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(report)}\n`);
