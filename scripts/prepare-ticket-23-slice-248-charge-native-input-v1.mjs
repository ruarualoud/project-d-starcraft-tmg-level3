// Compile C107/B110 through the existing native seat/view/action/memory ports.
// Read-only analysis: never create/reset/fork a room, reuse an old paid choice,
// dispatch a provider request, or apply an accepted historical action.
import { DatabaseSync } from "node:sqlite";
import { gunzipSync, gzipSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createStarcraftTmgRefereeCrypto, hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgPlayerSpatialObservationV1 } from
  "../packages/online-agent-session/player-spatial-observation-v1.mjs";
import { STARCRAFT_TMG_HOSTED_BOT_SEAT_RUNTIME_VERSION } from
  "../packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs";
import { OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from
  "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createTicket20AgentAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const decode = async name => JSON.parse(gunzipSync(await readFile(name)));
const json = async name => JSON.parse(await readFile(name, "utf8"));

// Kept separate from CLI output so the eventual fresh provider uses these
// SAME query ports instead of rebuilding a second rules/memory implementation.
export async function createChargeComparisonNativeContextV1({ root, capsulePath }) {
  const capsule = await decode(capsulePath);
  const source = capsule.sourceContext;
  const originalDirectory = capsule.evaluationOnly.originalDirectory;
  const saved = await decode(capsule.stateSource.stateCapturePath);
  if (hash(saved.state) !== capsule.stateSource.stateHash
    || saved.stateRevision !== capsule.revision) {
    throw new Error("Original pre-declaration state does not match the capsule");
  }
  const privateState = await json(path.join(originalDirectory, "runner-private.json"));
  const db = new DatabaseSync(path.join(originalDirectory, "room.sqlite"), { readOnly: true });
  let row;
  try {
    row = db.prepare("SELECT aggregate_cipher,initial_envelope_cipher FROM sc_rooms WHERE room_id=?")
      .get(privateState.roomId);
  } finally { db.close(); }
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: privateState.storeEncryptionKeyBase64,
    keyId: JSON.parse(row.aggregate_cipher).keyId,
  });
  const original = codec.decode(row.aggregate_cipher, `room:${privateState.roomId}:aggregate`);
  const initial = codec.decode(row.initial_envelope_cipher,
    `room:${privateState.roomId}:initial-envelope`);
  if (original.envelope.matchBindingHash !== source.scope.matchBindingHash
    || original.roomId !== source.scope.roomId) {
    throw new Error("Original room identity does not match the saved decision scope");
  }
  const forkReceipt = await json(path.join(originalDirectory, "fork-receipt.json"));
  let activeAggregate = original;
  let attemptedOriginalWrites = 0;
  const forbidWrite = async () => {
    attemptedOriginalWrites++;
    throw new Error("CHARGE_COMPARISON_ORIGINAL_ROOM_WRITE_FORBIDDEN");
  };
  const roomStore = Object.freeze({
    loadRoom: async roomId => roomId === original.roomId ? activeAggregate : null,
    createRoom: forbidWrite, commit: forbidWrite,
    readJournal: async () => { throw new Error("Historical room journal is not model input"); },
    loadReplayBundle: async () => { throw new Error("Accepted historical actions must not be reapplied"); },
    health: async () => ({ ok: true, durability: "readonly_original_analysis" }),
  });
  // The journal only accepts writes to this transient analysis owner. The
  // original SQLite journal remains readonly and later old-choice records
  // cannot enter either the compact memory or on-demand recall query.
  const memoryRows = structuredClone(source.memoryJournalPrefix);
  const journal = Object.freeze({
    async read(scope) {
      return memoryRows.filter(entry => entry.scopeKey === scope.scopeKey)
        .map(entry => structuredClone(entry));
    },
    async append(scope, entry) {
      if (scope.scopeKey !== source.scope.scopeKey) {
        throw new Error("Comparison memory scope mismatch");
      }
      memoryRows.push(structuredClone(entry));
      return { ok: true, record: structuredClone(entry) };
    },
  });
  const now = () => source.originalDecisionStartedAt;
  const refereeCrypto = createStarcraftTmgRefereeCrypto({
    privateKey: privateState.refereePrivateKeyPem,
    publicKey: privateState.refereePublicKeyPem,
    hmacSecret: privateState.refereeHmacSecret,
    keyId: original.envelope.matchBinding.refereeKeyId,
    trustLevel: "development_persistent",
  });
  const noProvider = { async decide() { throw new Error("Preparation never calls a model"); } };
  const fixture = await createTicket20AgentAgentDemoFixtureV1({
    root: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }),
    roomId: original.roomId, roomProfile: "standard_2000_live",
    mapConfiguration: privateState.mapConfiguration,
    standard2000Recipes: initial.state.armyBuildingConfigurationBySide,
    ...(privateState.plannedSessionId
      ? { armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } : {}),
    currentProductRuntimeVariant: forkReceipt.targetRulesRuntimeVariant
      || privateState.currentProductRuntimeVariant,
    resumeRoom: true, resumeCredentials: privateState.resumeCredentials,
    roomStore, refereeCrypto, attachBot: false, autoDrive: false,
    issueHumanRecovery: false, enableSpatialPreexecution: false,
    botDecisionPort: noProvider, player1DecisionPort: noProvider,
    ...(capsule.seatKey === "player1"
      ? { player1MatchDecisionJournal: journal } : { matchDecisionJournal: journal }),
    now,
  });
  if (fixture.rulesRuntime.descriptor.runtimeHash
    !== original.envelope.matchBinding.rulesRuntimeBinding.runtimeHash) {
    throw new Error("Original roster-specific Rules runtime does not match");
  }
  const envelope = fixture.authorityEngine.createEnvelope({
    roomId: original.roomId, matchBinding: original.envelope.matchBinding,
    state: saved.state, stateRevision: saved.stateRevision,
  });
  if (envelope.stateHash !== saved.stateHash) {
    throw new Error("Native envelope changed the captured pre-declaration state");
  }
  // This owner is a LOCAL analysis frame only. Administrative room counters
  // are inherited, not claimed to be byte-exact historical room metadata.
  activeAggregate = { ...original, stateRevision: saved.stateRevision, envelope };
  const seatToken = privateState.resumeCredentials[
    capsule.seatKey === "player1" ? "human" : "bot"].seatToken;
  const view = await fixture.roomRuntime.readRoom({ roomId: original.roomId, seatToken });
  const legal = await fixture.roomRuntime.legalSpace({ roomId: original.roomId, seatToken });
  if (!view.ok || !legal.ok) {
    throw new Error(`Native comparison authority unavailable: ${view.reason || legal.reason}`);
  }
  const roomProjection = view.projection;
  const legalSpace = legal.legalSpace;
  const spatialObservation = createStarcraftTmgPlayerSpatialObservationV1({ roomProjection, legalSpace });
  const spatialRuntime = capsule.seatKey === "player1"
    ? fixture.player1SpatialRuntime : fixture.spatialRuntime;
  const continuity = capsule.seatKey === "player1"
    ? fixture.player1Continuity : fixture.continuity;
  const turnPlan = capsule.seatKey === "player1"
    ? fixture.player1TurnPlanRuntime : fixture.turnPlanRuntime;
  const spatialActionSpace = await spatialRuntime.actionSpace({
    roomProjection, legalSpace, spatialObservation,
  });
  const observed = await continuity.observe({
    scope: source.scope, roomProjection, legalSpace, spatialObservation, spatialActionSpace,
    strategySkillSetHash: source.strategySkillSnapshot.skillSetHash,
  });
  await turnPlan.hydrate({ scope: source.scope });
  const { projectionHash: ignoredProjectionHash, ...nativePlanProjection } =
    turnPlan.read({ scope: source.scope });
  // hydrate restores journal metadata and reseals the Plan. Do not replace
  // the actual Plan that was visible to the original paid decision with that
  // newly restored Plan or a subsequent same-revision reflection.
  const retainedPlanProjection = {
    ...nativePlanProjection, plan: structuredClone(source.retainedPlan),
  };
  const planState = { ...retainedPlanProjection, projectionHash: hash(retainedPlanProjection) };
  const request = {
    schemaVersion: `${STARCRAFT_TMG_HOSTED_BOT_SEAT_RUNTIME_VERSION}.decision-request`,
    scope: source.scope, roomProjection, legalSpace, spatialObservation, spatialActionSpace,
    matchMemory: observed.matchMemory, preexecutionSearch: observed.preexecutionSearch,
    planState, matchMode: "agent_vs_agent", promptPack: "selfplay_agent_prompt",
    retryApproved: false, rulesAuthority: "external_rules_service",
    credentialMaterialIncluded: false, confirmationAuthority: false,
    applyAuthority: false, trainingTruth: false,
  };
  return { capsule, request, spatialRuntime, continuity, fixture,
    metadata: {
      schemaVersion: "ticket23_charge_native_input_preparation_v1",
      caseId: capsule.caseId, stateRevision: saved.stateRevision, stateHash: saved.stateHash,
      seatKey: capsule.seatKey, nativeScopePreserved: true,
      retainedPlanHash: source.retainedPlan?.planHash ?? null,
      retainedSkillRefs: source.strategySkillSnapshot.skillRefs,
      sourceMemoryRecordCount: source.memoryJournalPrefix.length,
      ephemeralObservedRecordCount: memoryRows.length - source.memoryJournalPrefix.length,
      legalSpaceHash: legalSpace.legalSpaceHash,
      spatialObservationHash: spatialObservation.observationHash,
      spatialActionSpaceHash: spatialActionSpace.actionSpaceHash,
      finiteActionCount: legalSpace.finiteActions.length,
      parameterDomainCount: legalSpace.parameterDomains.length,
      originalAdministrativeRoomMetadataRetained: true,
      planWrapperRecompiledFromPrefix: true,
      historicalWholePromptByteEqualityClaimed: false,
      originalAcceptedActionsApplied: 0, attemptedOriginalWrites,
      providerCalls: 0, newModelDecisionExecuted: false,
      originalB111RecoveryGateStillRequired: true, trainingTruth: false,
    } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [root, capsulePath, outputDirectory] = process.argv.slice(2);
  if (!root || !capsulePath || !outputDirectory) {
    throw new Error("Usage: root source-context.private.json.gz NEW-outputDirectory");
  }
  const context = await createChargeComparisonNativeContextV1({ root, capsulePath });
  const destination = path.resolve(outputDirectory);
  const original = context.capsule.evaluationOnly.originalDirectory;
  if (destination === original || destination.startsWith(original + path.sep)) {
    throw new Error("Comparison output must be outside the original room directory");
  }
  await mkdir(destination, { recursive: false, mode: 0o700 });
  await writeFile(path.join(destination, "native-decision-input.private.json.gz"),
    gzipSync(Buffer.from(JSON.stringify(context.request)), { level: 1 }),
    { flag: "wx", mode: 0o600 });
  await writeFile(path.join(destination, "preparation.private.json"),
    JSON.stringify(context.metadata, null, 2), { flag: "wx", mode: 0o600 });
  console.log(JSON.stringify(context.metadata));
}
