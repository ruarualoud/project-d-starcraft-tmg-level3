#!/usr/bin/env node

import { copyFile, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_RUN = path.join(ROOT,
  "build/ticket-23-slice-248-standard-2000-aa-live-v1/20260916223306152");
const CASUALTY_KIND =
  "official_selected_roster_ranged_casualty_selection_v1";

function ensure(condition, code) {
  if (!condition) throw new Error(code);
}

async function main() {
  const runDirectory = path.resolve(process.argv[2] || DEFAULT_RUN);
  const privateState = JSON.parse(await readFile(path.join(
    runDirectory, "runner-private.json"), "utf8"));
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: `ticket23-slice248-room-store-${path.basename(runDirectory)}`,
    trustLevel: "development_persistent",
  });
  const liveStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(runDirectory, "room.sqlite"),
    privatePayloadCodec: codec,
  });
  const liveBefore = await liveStore.loadRoom(privateState.roomId);
  ensure(liveBefore?.envelope?.state
    ?.pendingCurrentProductRangedCasualtyChoice,
  "DIAGNOSIS_PENDING_CASUALTY_REQUIRED");

  const temporaryDirectory = await mkdtemp(path.join(
    os.tmpdir(), "starcraft-tmg-slice248-casualty-lock-"));
  const clonedRoomFilename = path.join(temporaryDirectory, "room.sqlite");
  await copyFile(path.join(runDirectory, "room.sqlite"), clonedRoomFilename);
  const clonedStore = createSqliteStarcraftTmgRoomStore({
    filename: clonedRoomFilename,
    privatePayloadCodec: codec,
  });
  const refereeCrypto = createStarcraftTmgRefereeCrypto({
    privateKey: privateState.refereePrivateKeyPem,
    publicKey: privateState.refereePublicKeyPem,
    hmacSecret: privateState.refereeHmacSecret,
    keyId: `ticket23-slice248-referee-${path.basename(runDirectory)}`,
    trustLevel: "development_persistent",
  });
  const inertDecisionPort = Object.freeze({
    async decide() { throw new Error("DIAGNOSIS_MUST_NOT_CALL_PROVIDER"); },
  });
  const fixture = await createTicket20AgentAgentDemoFixtureV1({
    root: ROOT,
    roomId: privateState.roomId,
    roomProfile: "standard_2000_live",
    mapConfiguration: {
      seedId: "sc1_lost_temple_v1",
      elementSelections: [],
      passageSelections: [],
    },
    maxAppliedActions: 180,
    enableSpatialPreexecution: false,
    autoDrive: false,
    attachBot: false,
    roomStore: clonedStore,
    refereeCrypto,
    resumeRoom: true,
    resumeCredentials: privateState.resumeCredentials,
    botDecisionPort: inertDecisionPort,
    player1DecisionPort: inertDecisionPort,
  });
  const aggregate = await clonedStore.loadRoom(privateState.roomId);
  const defenderSideKey = aggregate.envelope.state
    .pendingCurrentProductRangedCasualtyChoice.defenderSideKey;
  const grant = Object.values(aggregate.grants || {}).find((entry) => (
    entry.seatKey === defenderSideKey && entry.revoked !== true
  ));
  ensure(grant?.authority, "DIAGNOSIS_DEFENDER_AUTHORITY_MISSING");
  const legalSpace = fixture.authorityEngine.legalSpace(
    aggregate.envelope, { seatAuthority: grant.authority },
  );
  const casualtyDomains = legalSpace.parameterDomains.filter((entry) => (
    entry.parameterKind === CASUALTY_KIND
  ));
  const leakedDomains = legalSpace.parameterDomains.filter((entry) => (
    entry.parameterKind !== CASUALTY_KIND
  ));
  const liveAfter = await liveStore.loadRoom(privateState.roomId);
  process.stdout.write(`${JSON.stringify({
    schemaVersion: "ticket23_slice248_pending_casualty_lock_diagnosis_v1",
    stateRevision: aggregate.envelope.stateRevision,
    defenderSideKey,
    pendingCasualty: true,
    casualtyDomainCount: casualtyDomains.length,
    leakedFiniteActionTypes: legalSpace.finiteActions.map((entry) => (
      entry.action?.actionType || entry.actionType
    )),
    leakedParameterizedActionTypes: leakedDomains.map((entry) => (
      entry.actionType
    )),
    lockPassed: casualtyDomains.length === 1
      && legalSpace.finiteActions.length === 0 && leakedDomains.length === 0,
    liveRoomMutationCount:
      Number(liveAfter.roomRevision) - Number(liveBefore.roomRevision),
    providerCalls: 0,
    trainingTruth: false,
  }, null, 2)}\n`);

  await fixture.player1Runtime.close();
  await fixture.botRuntime.close();
  clonedStore.close?.();
  liveStore.close?.();
  await rm(temporaryDirectory, { recursive: true, force: true });
}

main().catch((error) => {
  process.stderr.write(`${JSON.stringify({
    code: String(error?.code || error?.message || error),
    message: String(error?.message || error),
  })}\n`);
  process.exitCode = 1;
});
