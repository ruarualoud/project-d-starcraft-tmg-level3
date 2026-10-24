// Versioned storage epoch of the SAME game. No prefix replay, model call,
// roster/map/Plan generation, source writer, or arbitrary geometry repair.
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashStarcraftTmgContract as hash, createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV6,
  projectOfficialSingletonIdentityStateV6 } from
  "../packages/product-composition/official-current-product-match-runtime-v6.mjs";
import { summarizeStarcraftTmgAppliedOutcomeV1 } from
  "../packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs";
import { createTicket20HumanAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { loadPregameResumeDraftV1 } from
  "../packages/roster-planning-workspace/pregame-resume-draft-v1.mjs";
import { OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from
  "../packages/product-composition/official-standard-room-factory-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const liveRoot = path.join(root, "build/ticket-23-slice-248-standard-2000-aa-live-v1");
const forkRoot = path.join(root, "build/ticket-23-slice-248-versioned-charge-room-forks-v1");
const sourceDirectory = path.resolve(process.argv[2] || "");
const targetDirectory = path.resolve(process.argv[3] || "");
const trusted = directory => directory.startsWith(liveRoot + path.sep)
  || directory.startsWith(forkRoot + path.sep);
assert(process.argv[2] && process.argv[3] && trusted(sourceDirectory));
assert(targetDirectory.startsWith(forkRoot + path.sep)
  && targetDirectory !== sourceDirectory);
let credentialDirectory = sourceDirectory;
let expectedRoomId = null;
let sourceCredentials = null;
const seen = new Set();
for (let depth = 0; ; depth += 1) {
  assert(depth < 8 && trusted(credentialDirectory) && !seen.has(credentialDirectory));
  seen.add(credentialDirectory);
  const fork = await readFile(path.join(credentialDirectory, "fork-private.json"), "utf8")
    .then(JSON.parse, error => { if (error.code === "ENOENT") return null; throw error; });
  if (!fork) break;
  assert(!expectedRoomId || fork.targetRoomId === expectedRoomId);
  sourceCredentials ||= fork.resumeCredentials;
  expectedRoomId = fork.sourceRoomId;
  credentialDirectory = path.resolve(fork.sourceDirectory);
}
const sourcePrivate = JSON.parse(await readFile(path.join(credentialDirectory,
  "runner-private.json"), "utf8"));
assert(!expectedRoomId || sourcePrivate.roomId === expectedRoomId);
const roomId = sourcePrivate.roomId;
sourceCredentials ||= sourcePrivate.resumeCredentials;
const runId = path.basename(credentialDirectory);
const codec = createStarcraftTmgPrivatePayloadCodec({
  key: sourcePrivate.storeEncryptionKeyBase64,
  keyId: `ticket23-slice248-room-store-${runId}`, trustLevel: "development_persistent" });
const refereeCrypto = createStarcraftTmgRefereeCrypto({
  privateKey: sourcePrivate.refereePrivateKeyPem,
  publicKey: sourcePrivate.refereePublicKeyPem,
  hmacSecret: sourcePrivate.refereeHmacSecret,
  keyId: `ticket23-slice248-referee-${runId}`, trustLevel: "development_persistent" });
const sourceDb = new DatabaseSync(path.join(sourceDirectory, "room.sqlite"), { readOnly: true });
let sourceAggregate, sourceEnvelope, sourceCipher, boundaryReceipt;
try {
  const row = sourceDb.prepare("SELECT aggregate_cipher,initial_envelope_cipher "
    + "FROM sc_rooms WHERE room_id=?").get(roomId);
  assert(row);
  sourceCipher = row.aggregate_cipher;
  sourceAggregate = codec.decode(row.aggregate_cipher, `room:${roomId}:aggregate`);
  sourceEnvelope = codec.decode(row.initial_envelope_cipher, `room:${roomId}:initial-envelope`);
  for (const row of sourceDb.prepare("SELECT sequence,payload_cipher FROM "
    + "sc_private_journal WHERE room_id=? ORDER BY sequence DESC").all(roomId)) {
    const event = codec.decode(row.payload_cipher, `room:${roomId}:private:${row.sequence}`);
    if (event.type === "accepted_transition") { boundaryReceipt = event.payload.receipt; break; }
  }
} finally { sourceDb.close(); }
assert(sourceAggregate.stateRevision > 0 && boundaryReceipt);
const { journalHash, refereeSignature, audit: ignoredAudit, ...signedBoundary } = boundaryReceipt;
assert(refereeCrypto.verify(signedBoundary, refereeSignature, "accepted_receipt"));
assert.equal(journalHash, hash({ receipt: signedBoundary, refereeSignature }));
assert.equal(boundaryReceipt.postStateRevision, sourceAggregate.stateRevision);
assert.equal(boundaryReceipt.postStateHash, sourceAggregate.envelope.stateHash);
assert.equal(hash(sourceAggregate.envelope.state), boundaryReceipt.postStateHash);
assert.equal(journalHash, sourceAggregate.envelope.journalHeadHash);
assert.equal(boundaryReceipt.matchBindingHash, sourceEnvelope.matchBindingHash);

// No in-flight paid request may be silently replaced by a new Provider session.
const providerStatuses = {};
for (const side of ["player1", "player2"]) {
  const db = new DatabaseSync(path.join(sourceDirectory, "seats", side,
    "provider/provider-attempts.sqlite"), { readOnly: true });
  try {
    const pending = db.prepare("SELECT attempt_id,status FROM sc_provider_attempts "
      + "WHERE status IN ('reserved','dispatched')").all();
    assert.equal(pending.length, 0, "preserve unresolved paid attempts before version continuation");
    providerStatuses[side] = db.prepare("SELECT status,count(*) count FROM "
      + "sc_provider_attempts GROUP BY status").all();
  } finally { db.close(); }
}
let recipe = null;
let selectedRoster = null;
if (sourcePrivate.plannedMode === "agent_selected_teach") {
  const snapshot = JSON.parse(await readFile(path.join(credentialDirectory,
    "agent-selected-pregame-snapshot.json"), "utf8"));
  assert.equal(snapshot.plan.planHash, sourcePrivate.plannedPlanHash);
  selectedRoster = snapshot.selectedCandidateInput;
} else if (sourcePrivate.plannedSessionId) {
  const argument = process.argv.find(value => value.startsWith("--roster-plan-data-directory="));
  assert(argument, "fixed-plan continuation needs its original plan workspace");
  const dataDirectory = path.resolve(argument.slice("--roster-plan-data-directory=".length));
  assert(dataDirectory.startsWith(path.join(root, "build") + path.sep));
  const session = await loadPregameResumeDraftV1({ dataDirectory,
    sessionId: sourcePrivate.plannedSessionId, expectedPlanHash: sourcePrivate.plannedPlanHash });
  selectedRoster = session.candidates.find(entry => entry.candidate.candidateId
    === session.plan.rosterCandidate.candidateId)?.candidateInput;
  assert(selectedRoster);
}
if (selectedRoster) {
  const selected = selectedRoster;
  recipe = { factionRecordKey: selected.factionRecordKey,
    tacticalCardRecordKeys: selected.tacticalCardRecordKeys,
    units: selected.units.map(unit => ({ unitInstanceId: unit.unitInstanceId,
      recordKey: unit.recordKey, compositionKind: unit.compositionKind,
      upgradeNames: unit.upgrades.map(upgrade => upgrade.upgradeName) })) };
}
const sourceReadOnlyStore = {
  async loadRoom(id) { assert.equal(id, roomId); return structuredClone(sourceAggregate); },
  async createRoom() { throw new Error("SOURCE_ROOM_IS_READ_ONLY"); },
  async commit() { throw new Error("SOURCE_ROOM_IS_READ_ONLY"); },
  async readJournal() { throw new Error("SOURCE_SNAPSHOT_JOURNAL_NOT_OPENED"); },
  async loadReplayBundle() { throw new Error("SOURCE_SNAPSHOT_PREFIX_REPLAY_FORBIDDEN"); },
  async health() { return { healthy: true, productionReady: false }; },
};
const sourceReceipt = await readFile(path.join(sourceDirectory, "fork-receipt.json"), "utf8")
  .then(JSON.parse, error => { if (error.code === "ENOENT") return null; throw error; });
const sourceVariant = sourceReceipt?.targetRulesRuntimeVariant
  || sourcePrivate.currentProductRuntimeVariant || "legacy_v1";
assert(["legacy_v1", "base_current_v1"].includes(sourceVariant),
  "this migration wraps only the frozen base runtime, never a Charge branch");
const fixture = await createTicket20HumanAgentDemoFixtureV1({
  root: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }),
  roomId, roomProfile: "standard_2000_live", mapConfiguration: sourcePrivate.mapConfiguration,
  ...(recipe ? { standard2000Recipes: { player1: recipe,
    player2: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2 },
  armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } : {}),
  currentProductRuntimeVariant: sourceVariant, roomStore: sourceReadOnlyStore,
  refereeCrypto, resumeRoom: true, resumeCredentials: sourceCredentials,
  attachBot: false, issueHumanRecovery: false, autoDrive: false,
});
const initialCheck = fixture.authorityEngine.replay({ initialEnvelope: sourceEnvelope, journal: [] });
assert(initialCheck.ok && initialCheck.appliedCount === 0, "source genesis binding must remain valid");
assert.equal(sourceAggregate.envelope.matchBinding.rulesRuntimeBinding.runtimeHash,
  fixture.rulesRuntime.descriptor.runtimeHash);
const targetRulesRuntime = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime: fixture.rulesRuntime });
const projected = projectOfficialSingletonIdentityStateV6(sourceAggregate.envelope.state);
const live = state => state.pieces.filter(piece => piece.isOnField === true
  && piece.isDestroyed !== true && Number(piece.currentModels || 0) > 0);
assert.deepEqual(live(projected.state), live(sourceAggregate.envelope.state));
const boundaryOutcome = summarizeStarcraftTmgAppliedOutcomeV1({ receipt: boundaryReceipt,
  candidateId: boundaryReceipt.proposal?.domainId || null });
const proof = {
  schemaVersion: "ticket23_slice248_singleton_identity_recovery_v1",
  recoveryKind: "singleton_summon_identity_v6", sourceRoomId: roomId,
  sourceCurrentStateRevision: sourceAggregate.stateRevision,
  sourceStateRevision: sourceAggregate.stateRevision,
  sourceStateHash: sourceAggregate.envelope.stateHash,
  sourceJournalHeadHash: journalHash, sourceMatchBindingHash: sourceEnvelope.matchBindingHash,
  sourceApplyingSeatKey: boundaryReceipt.applyingSeatKey,
  sourceBoundaryOutcome: { resultSummary: boundaryOutcome.resultSummary,
    observedSignals: boundaryOutcome.observedSignals,
    unitIntentResults: boundaryOutcome.unitIntentResults },
  sourceAcceptedReceiptCount: sourceAggregate.stateRevision,
  oldRulesRuntimeHash: fixture.rulesRuntime.descriptor.runtimeHash,
  newRulesRuntimeHash: targetRulesRuntime.descriptor.runtimeHash,
  singletonIdentityRepairs: projected.repairs,
  sourceLivePiecesHash: hash(live(sourceAggregate.envelope.state)),
  targetLivePiecesHash: hash(live(projected.state)), physicalLiveBoardUnchanged: true,
  projectedStateHash: hash(projected.state), originalAcceptedHistoryPreserved: true,
  ...(sourceAggregate.envelope.state.officialRulesVersionFork ? {
    sourceForkProvenance: sourceAggregate.envelope.state.officialRulesVersionFork } : {}),
  sameLogicalRoomId: true, oldJournalCopied: false, oldHistoryEdited: false,
  replayedReceiptCount: 0, providerCalls: 0,
  rosterRegenerated: false, planRegenerated: false, mapRegenerated: false, trainingTruth: false,
};
const state = { ...projected.state, officialRulesVersionFork: proof };
const authorityBody = { ...fixture.initialStateAuthority, state,
  setupId: `${fixture.initialStateAuthority.setupId}:singleton-identity-v6`,
  compositionEvidence: { singletonIdentityContinuation: proof }, trainingTruth: false };
delete authorityBody.receiptHash;
await mkdir(path.dirname(targetDirectory), { recursive: true });
await mkdir(targetDirectory, { mode: 0o700 });
const targetStore = createSqliteStarcraftTmgRoomStore({ filename: path.join(targetDirectory,
  "room.sqlite"), privatePayloadCodec: codec });
try {
  const targetRoomRuntime = createStarcraftTmgRoomRuntime({
    authorityEngine: createStarcraftTmgAuthoritativeEngine({ rulesRuntime: targetRulesRuntime,
      refereeCrypto }), roomStore: targetStore, checkpointInterval: 8,
    characterReleaseChannel: "development_internal" });
  const created = await targetRoomRuntime.createRoom({ roomId,
    title: "StarCraft TMG · same-game singleton identity continuation",
    gameId: "starcraft-tmg", productionRoom: false,
    surfaceMode: "agent_agent_live_evidence", serverSeatPlan: authorityBody.serverSeatPlan,
    initialStateAuthority: { ...authorityBody, receiptHash: hash(authorityBody) } });
  assert(created.ok && created.credentials.human?.seatToken && created.credentials.bot?.seatToken);
  // Save partial credentials before any following admission failure. Never
  // manufacture another game or erase this target just to retry a consumer.
  const privateRecord = { sourceDirectory, sourceRoomId: roomId, targetRoomId: roomId,
    recoveryKind: proof.recoveryKind, resumeCredentials: created.credentials,
    storeEncryptionKeyBase64: sourcePrivate.storeEncryptionKeyBase64,
    refereePrivateKeyPem: sourcePrivate.refereePrivateKeyPem,
    refereePublicKeyPem: sourcePrivate.refereePublicKeyPem,
    refereeHmacSecret: sourcePrivate.refereeHmacSecret };
  await writeFile(path.join(targetDirectory, "fork-private.json"), JSON.stringify(privateRecord),
    { mode: 0o600, flag: "wx" });
  await writeFile(path.join(targetDirectory, "source-boundary-receipt.private.json"),
    JSON.stringify(boundaryReceipt), { mode: 0o600, flag: "wx" });
  await writeFile(path.join(targetDirectory, "source-boundary-state.private.json"),
    JSON.stringify(sourceAggregate.envelope.state), { mode: 0o600, flag: "wx" });
  const aggregate = await targetStore.loadRoom(roomId);
  assert.equal(aggregate.stateRevision, 0);
  assert.deepEqual(aggregate.envelope.state, state, "only the exact identity projection is admissible");
  const replay = await targetRoomRuntime.replayRoom({ roomId });
  assert(replay.ok && replay.matchesCurrent);
  const token = created.credentials[state.activeSideKey === "player1" ? "human" : "bot"].seatToken;
  const legal = await targetRoomRuntime.legalSpace({ roomId, seatToken: token });
  assert(legal.ok, legal.reason);
  const candidate = legal.legalSpace.finiteActions[0];
  let previewed = false;
  if (candidate) {
    const preview = await targetRoomRuntime.previewAction({ roomId, seatToken: token,
      candidateId: candidate.actionKey, expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash });
    assert(preview.ok, preview.reason);
    previewed = true;
  }
  const progress = JSON.parse(await readFile(path.join(sourceDirectory, "progress.json"), "utf8"));
  const report = { ...proof, targetRoomId: roomId, targetStateRevision: 0,
    targetStateHash: aggregate.envelope.stateHash,
    targetMatchBindingHash: aggregate.envelope.matchBindingHash,
    targetRulesRuntimeHash: targetRulesRuntime.descriptor.runtimeHash,
    targetRulesRuntimeVariant: "singleton_identity_v6", targetReplayMatchesCurrent: true,
    finiteCandidateCount: legal.legalSpace.finiteActions.length,
    parameterDomainCount: legal.legalSpace.parameterDomains.length,
    previewedWithoutApply: previewed, targetGameActionsApplied: 0,
    frozenSourceEstimatedCostCny: progress.estimatedCostCny,
    providerStatuses, productionRoomEligible: false,
    memoryAndHostAdmissionPending: true };
  await writeFile(path.join(targetDirectory, "fork-receipt.json"), JSON.stringify(report, null, 2),
    { mode: 0o600, flag: "wx" });
  console.log(JSON.stringify({ ...report, targetDirectory }));
} finally { targetStore.close(); }
const unchanged = new DatabaseSync(path.join(sourceDirectory, "room.sqlite"), { readOnly: true });
try { assert.equal(unchanged.prepare("SELECT aggregate_cipher FROM sc_rooms WHERE room_id=?")
  .get(roomId).aggregate_cipher, sourceCipher, "original accepted Room must not change"); }
finally { unchanged.close(); }
