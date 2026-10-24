// Correct an accepted illegal named-Active suffix without editing the source
// Room, paying for its prefix again, or regenerating roster/plan/map setup.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashStarcraftTmgContract as hash, createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import { createTicket20HumanAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from
  "../packages/product-composition/official-standard-room-factory-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.resolve(process.argv[2] || "");
const targetDirectory = path.resolve(process.argv[3] || "");
const throughRevision = Number(process.argv[4]);
assert(process.argv[2] && process.argv[3] && Number.isSafeInteger(throughRevision));
assert(sourceDirectory.startsWith(path.join(root,
  "build/ticket-23-slice-248-standard-2000-aa-live-v1") + path.sep));
assert(targetDirectory.startsWith(path.join(root,
  "build/ticket-23-slice-248-versioned-charge-room-forks-v1") + path.sep));
const creating = process.argv.includes("--create-branch");
const verifiedArgument = process.argv.find(arg => arg.startsWith("--verified-prefix-directory="));
const verifiedDirectory = verifiedArgument
  ? path.resolve(verifiedArgument.slice("--verified-prefix-directory=".length)) : null;
assert(!verifiedDirectory || (verifiedDirectory !== targetDirectory
  && verifiedDirectory.startsWith(path.join(root,
    "build/ticket-23-slice-248-versioned-charge-room-forks-v1") + path.sep)));
const sourcePrivate = JSON.parse(await readFile(path.join(sourceDirectory,
  "runner-private.json"), "utf8"));
const sourceRunId = path.basename(sourceDirectory);
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: sourcePrivate.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${sourceRunId}`,
  trustLevel: "development_persistent",
});
const db = new DatabaseSync(path.join(sourceDirectory, "room.sqlite"), { readOnly: true });
let sourceAggregate, initialEnvelope, checkpoint, receipts, sourceCipher;
try {
  const row = db.prepare("SELECT aggregate_cipher,initial_envelope_cipher FROM "
    + "sc_rooms WHERE room_id=?").get(sourcePrivate.roomId);
  assert(row);
  sourceCipher = row.aggregate_cipher;
  sourceAggregate = codec.decode(row.aggregate_cipher,
    `room:${sourcePrivate.roomId}:aggregate`);
  initialEnvelope = codec.decode(row.initial_envelope_cipher,
    `room:${sourcePrivate.roomId}:initial-envelope`);
  const cp = db.prepare("SELECT state_revision,private_sequence,checkpoint_cipher "
    + "FROM sc_checkpoints WHERE room_id=? AND state_revision<=? "
    + "ORDER BY state_revision DESC LIMIT 1").get(sourcePrivate.roomId, throughRevision);
  assert(cp, "signed source checkpoint required");
  checkpoint = codec.decode(cp.checkpoint_cipher,
    `room:${sourcePrivate.roomId}:checkpoint:${cp.state_revision}`);
  receipts = db.prepare("SELECT sequence,payload_cipher FROM sc_private_journal "
    + "WHERE room_id=? AND sequence>? ORDER BY sequence ASC")
    .all(sourcePrivate.roomId, cp.private_sequence)
    .map(row => codec.decode(row.payload_cipher,
      `room:${sourcePrivate.roomId}:private:${row.sequence}`))
    .filter(event => event.type === "accepted_transition")
    .map(event => event.payload.receipt);
} finally { db.close(); }
assert(throughRevision < sourceAggregate.stateRevision);
const prefix = receipts.filter(receipt => receipt.postStateRevision <= throughRevision);
assert.equal(prefix.length, throughRevision - checkpoint.stateRevision);
const boundaryReceipt = prefix.at(-1);
assert.equal(boundaryReceipt.postStateRevision, throughRevision);
const invalid = receipts.find(receipt => receipt.preStateRevision === throughRevision);
assert(invalid, "exact excluded first action required");
const firstAction = boundaryReceipt.action.sourceAction || boundaryReceipt.action;
const repeatedAction = invalid.action.sourceAction || invalid.action;
assert.equal(firstAction.actionType, "resolve_unit_lifecycle_ability");
assert.equal(firstAction.effectKind, "spawn_creep_tumor");
assert.equal(repeatedAction.actionType, firstAction.actionType);
assert.equal(repeatedAction.definitionId, firstAction.definitionId);
assert.equal(repeatedAction.pieceId, firstAction.pieceId);
assert.equal(repeatedAction.phase, firstAction.phase);
assert.notDeepEqual(repeatedAction.unitLifecyclePlan.canonicalParameters.coordinate,
  firstAction.unitLifecyclePlan.canonicalParameters.coordinate);

const snapshot = JSON.parse(await readFile(path.join(sourceDirectory,
  "agent-selected-pregame-snapshot.json"), "utf8"));
assert.equal(snapshot.plan.planHash, sourcePrivate.plannedPlanHash);
const selected = snapshot.selectedCandidateInput;
const recipe = { factionRecordKey: selected.factionRecordKey,
  tacticalCardRecordKeys: selected.tacticalCardRecordKeys,
  units: selected.units.map(unit => ({ unitInstanceId: unit.unitInstanceId,
    recordKey: unit.recordKey, compositionKind: unit.compositionKind,
    upgradeNames: unit.upgrades.map(upgrade => upgrade.upgradeName) })) };
const sourceReadOnlyStore = {
  async loadRoom(roomId) { assert.equal(roomId, sourcePrivate.roomId);
    return structuredClone(sourceAggregate); },
  async createRoom() { throw new Error("SOURCE_ROOM_IS_READ_ONLY"); },
  async commit() { throw new Error("SOURCE_ROOM_IS_READ_ONLY"); },
  async readJournal() { throw new Error("SOURCE_ROOM_IS_READ_ONLY"); },
  async loadReplayBundle() { throw new Error("SOURCE_ROOM_IS_READ_ONLY"); },
  async health() { return { healthy: true, productionReady: false,
    adapter: "captured_read_only_source" }; },
};
const refereeCrypto = createStarcraftTmgRefereeCrypto({
  privateKey: sourcePrivate.refereePrivateKeyPem,
  publicKey: sourcePrivate.refereePublicKeyPem,
  hmacSecret: sourcePrivate.refereeHmacSecret,
  keyId: `ticket23-slice248-referee-${sourceRunId}`,
  trustLevel: "development_persistent",
});
const fixture = await createTicket20HumanAgentDemoFixtureV1({
  root: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }),
  roomId: sourcePrivate.roomId, roomProfile: "standard_2000_live",
  mapConfiguration: sourcePrivate.mapConfiguration,
  standard2000Recipes: { player1: recipe,
    player2: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2 },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  currentProductRuntimeVariant: sourcePrivate.currentProductRuntimeVariant || null,
  roomStore: sourceReadOnlyStore, refereeCrypto, resumeRoom: true,
  resumeCredentials: sourcePrivate.resumeCredentials,
  attachBot: false, issueHumanRecovery: false, autoDrive: false,
});
let state, illegalReplayReason;
if (verifiedDirectory) {
  const priorPrivate = JSON.parse(await readFile(path.join(verifiedDirectory,
    "fork-private.json"), "utf8"));
  const prior = JSON.parse(await readFile(path.join(verifiedDirectory,
    "fork-receipt.json"), "utf8"));
  assert.equal(path.resolve(priorPrivate.sourceDirectory), sourceDirectory);
  assert.equal(prior.sourceStateRevision, throughRevision);
  assert.equal(prior.sourceJournalHeadHash, boundaryReceipt.journalHash);
  assert.equal(prior.sourceStateHash, boundaryReceipt.postStateHash);
  assert.equal(prior.sourceCurrentStateHash, sourceAggregate.envelope.stateHash);
  const { journalHash, refereeSignature, audit: _audit, ...signedBoundary } = boundaryReceipt;
  assert(refereeCrypto.verify(signedBoundary, refereeSignature, "accepted_receipt"),
    "reused state must match the original signed legal-boundary receipt");
  assert.equal(journalHash, hash({ receipt: signedBoundary, refereeSignature }));
  assert.equal(boundaryReceipt.matchBindingHash, initialEnvelope.matchBindingHash);
  assert.equal(prior.sourceMatchBindingHash, initialEnvelope.matchBindingHash);
  const priorDb = new DatabaseSync(path.join(verifiedDirectory, "room.sqlite"), { readOnly: true });
  try {
    const row = priorDb.prepare("SELECT initial_envelope_cipher,state_revision FROM "
      + "sc_rooms WHERE room_id=?").get(sourcePrivate.roomId);
    assert.equal(row.state_revision, 0, "only the untouched verified recovery base is reusable");
    const priorEnvelope = codec.decode(row.initial_envelope_cipher,
      `room:${sourcePrivate.roomId}:initial-envelope`);
    // Native genesis has an initial Envelope, not a signed checkpoint0.
    // Validate that actual frozen Envelope without replaying the paid prefix;
    // its board is authenticated separately by the original r69 receipt.
    const verified = fixture.authorityEngine.replay({
      initialEnvelope: priorEnvelope, journal: [] });
    assert(verified.ok, JSON.stringify(verified));
    assert.equal(verified.appliedCount, 0);
    assert.equal(priorEnvelope.stateRevision, 0);
    assert.equal(priorEnvelope.roomId, sourcePrivate.roomId);
    assert.equal(priorEnvelope.matchBindingHash, prior.targetMatchBindingHash);
    assert.equal(priorEnvelope.stateHash, prior.targetStateHash);
    const { officialRulesVersionFork, ...sourceState } = priorEnvelope.state;
    assert.equal(officialRulesVersionFork.sourceJournalHeadHash, boundaryReceipt.journalHash);
    assert.equal(officialRulesVersionFork.sourceStateRevision, throughRevision);
    assert.equal(officialRulesVersionFork.sourceStateHash, boundaryReceipt.postStateHash);
    assert.equal(hash(sourceState), boundaryReceipt.postStateHash);
    state = sourceState;
    illegalReplayReason = prior.illegalReplayReason;
    assert.equal(illegalReplayReason, "LEGAL_SPACE_STALE");
  } finally { priorDb.close(); }
} else {
  const replay = fixture.authorityEngine.replay({ initialEnvelope, checkpoint, journal: prefix });
  assert(replay.ok, JSON.stringify(replay));
  assert.equal(replay.envelope.stateRevision, throughRevision);
  assert.equal(replay.envelope.stateHash, boundaryReceipt.postStateHash);
  assert.equal(replay.envelope.journalHeadHash, boundaryReceipt.journalHash);
  const illegalReplay = fixture.authorityEngine.replay({ initialEnvelope, checkpoint,
    journal: [...prefix, invalid] });
  assert.equal(illegalReplay.ok, false, "new Rules must reject the actual excluded repeat");
  state = replay.envelope.state;
  illegalReplayReason = illegalReplay.reason;
}
const route = state.officialUnitLifecycleFamilySourceBundle.routes.find(route =>
  route.definitionId === firstAction.definitionId);
assert.equal(route.actionKind, "active_ability");
assert(!/\bREPEATABLE\b/iu.test(`${route.activationText} ${route.sourceText}`));
assert.equal(state.unitLifecycleUseHistory.filter(entry => entry.round === state.round
  && entry.pieceId === firstAction.pieceId && entry.definitionId === route.definitionId).length, 1);
const proof = { schemaVersion: "ticket23_slice248_legal_prefix_recovery_v1",
  recoveryKind: "named_active_once_per_round_v8",
  sourceRoomId: sourcePrivate.roomId, sourceCurrentStateRevision: sourceAggregate.stateRevision,
  sourceCurrentStateHash: sourceAggregate.envelope.stateHash,
  sourceStateRevision: throughRevision, sourceStateHash: boundaryReceipt.postStateHash,
  sourceJournalHeadHash: boundaryReceipt.journalHash,
  sourceApplyingSeatKey: boundaryReceipt.applyingSeatKey,
  sourceMatchBindingHash: initialEnvelope.matchBindingHash,
  sourceCheckpointRevision: checkpoint.stateRevision,
  replayedReceiptCount: verifiedDirectory ? 0 : prefix.length,
  reusedVerifiedPrefix: Boolean(verifiedDirectory),
  verifiedPrefixDirectory: verifiedDirectory,
  excludedReceiptHashes: receipts.filter(receipt => receipt.postStateRevision > throughRevision)
    .map(receipt => receipt.journalHash),
  excludedFirstStateRevision: invalid.postStateRevision,
  excludedFirstAction: { pieceId: repeatedAction.pieceId,
    abilityName: route.abilityName, round: state.round, reason: "named_active_once_per_round" },
  illegalReplayReason,
  oldJournalCopied: false, oldHistoryEdited: false,
  sameLogicalRoomId: true, rosterRegenerated: false, planRegenerated: false,
  mapRegenerated: false, providerCalls: 0, trainingTruth: false };
if (creating) {
  await mkdir(path.dirname(targetDirectory), { recursive: true });
  await mkdir(targetDirectory, { mode: 0o700 });
  const targetStore = createSqliteStarcraftTmgRoomStore({
    filename: path.join(targetDirectory, "room.sqlite"), privatePayloadCodec: codec });
  try {
    const recoveredState = structuredClone(state);
    recoveredState.officialRulesVersionFork = proof;
    const body = { ...fixture.initialStateAuthority, state: recoveredState,
      setupId: `${fixture.initialStateAuthority.setupId}:legal-prefix-r${throughRevision}`,
      compositionEvidence: { legalPrefixRecovery: proof }, trainingTruth: false };
    delete body.receiptHash;
    const targetRuntime = createStarcraftTmgRoomRuntime({
      authorityEngine: fixture.authorityEngine, roomStore: targetStore, checkpointInterval: 8,
      characterReleaseChannel: "development_internal" });
    const created = await targetRuntime.createRoom({ roomId: sourcePrivate.roomId,
      title: "StarCraft TMG · same-room legal-prefix correction",
      gameId: "starcraft-tmg", productionRoom: false,
      surfaceMode: "agent_agent_live_evidence",
      serverSeatPlan: body.serverSeatPlan,
      initialStateAuthority: { ...body, receiptHash: hash(body) } });
    assert(created.ok, JSON.stringify(created));
    assert(created.credentials.human?.seatToken && created.credentials.bot?.seatToken,
      "recovery must create both original seats, not the default lone host");
    assert.equal(created.credentials.human.seatKey, "player1");
    assert.equal(created.credentials.bot.seatKey, "player2");
    const aggregate = await targetStore.loadRoom(sourcePrivate.roomId);
    const targetReplay = await targetRuntime.replayRoom({ roomId: sourcePrivate.roomId });
    assert(targetReplay.ok && targetReplay.matchesCurrent);
    assert.equal(aggregate.stateRevision, 0);
    const { officialRulesVersionFork, ...targetBoardState } = aggregate.envelope.state;
    assert.deepEqual(targetBoardState, state, "all actual geometry, dice and resource state kept");
    const progress = JSON.parse(await readFile(path.join(sourceDirectory, "progress.json"), "utf8"));
    const report = { ...proof, targetRoomId: sourcePrivate.roomId,
      targetMatchBindingHash: aggregate.envelope.matchBindingHash,
      targetStateRevision: 0, targetStateHash: aggregate.envelope.stateHash,
      targetRulesRuntimeHash: fixture.rulesRuntime.descriptor.runtimeHash,
      targetRulesRuntimeVariant: sourcePrivate.currentProductRuntimeVariant || "base_current_v1",
      targetReplayMatchesCurrent: true,
      frozenSourceEstimatedCostCny: progress.estimatedCostCny,
      productionRoomEligible: false };
    const privateRecord = { sourceDirectory, sourceRoomId: sourcePrivate.roomId,
      targetRoomId: sourcePrivate.roomId, recoveryKind: proof.recoveryKind,
      resumeCredentials: created.credentials,
      storeEncryptionKeyBase64: sourcePrivate.storeEncryptionKeyBase64,
      refereePrivateKeyPem: sourcePrivate.refereePrivateKeyPem,
      refereePublicKeyPem: sourcePrivate.refereePublicKeyPem,
      refereeHmacSecret: sourcePrivate.refereeHmacSecret };
    await writeFile(path.join(targetDirectory, "fork-private.json"),
      JSON.stringify(privateRecord) + "\n", { mode: 0o600, flag: "wx" });
    await writeFile(path.join(targetDirectory, "fork-receipt.json"),
      JSON.stringify(report, null, 2) + "\n", { mode: 0o600, flag: "wx" });
    console.log(JSON.stringify({ ...report, targetDirectory }));
  } finally { targetStore.close(); }
} else console.log(JSON.stringify({ ...proof, targetCreated: false }));
const unchangedDb = new DatabaseSync(path.join(sourceDirectory, "room.sqlite"), { readOnly: true });
try {
  assert.equal(unchangedDb.prepare("SELECT aggregate_cipher FROM sc_rooms WHERE room_id=?")
    .get(sourcePrivate.roomId).aggregate_cipher, sourceCipher, "original authority never edited");
} finally { unchangedDb.close(); }
