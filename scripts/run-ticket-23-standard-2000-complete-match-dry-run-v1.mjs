import assert from "node:assert/strict";
import { generateKeyPairSync, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgRefereeCrypto,
  hashStarcraftTmgContract,
} from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialStandardRoomInitialStateAuthorityV1 } from
  "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createSqliteStarcraftTmgRoomStore } from
  "../packages/room-store/sqlite-room-store-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, "..");
const outputDirectory = path.join(root,
  "build/ticket-23-slice-246-standard-2000-complete-match-v1");
const databasePath = path.join(outputDirectory, "room.sqlite");
const privateRunStatePath = path.join(outputDirectory, "runner-private.json");
const progressPath = path.join(outputDirectory, "progress.json");
const failurePath = path.join(outputDirectory, "failure.json");
const roomId = "ticket23-slice246-standard-2000-complete-match";
const occurredAt = "2026-09-15T14:00:00.000Z";
const SIDE_KEYS = ["player1", "player2"];
const MAX_ACTIONS = 300;

await mkdir(outputDirectory, { recursive: true });

function failureBody(error) {
  const details = Object.fromEntries(Object.entries(error || {})
    .filter(([key]) => !new Set(["stack", "credentials", "seatToken"]).has(key)));
  return {
    schema: "ticket23_slice246_failure_v1",
    ok: false,
    code: String(error?.code || error?.name || "SLICE246_UNHANDLED_FAILURE"),
    message: String(error?.message || error),
    details,
    providerCalls: 0,
    estimatedCostCny: 0,
    observedAt: new Date().toISOString(),
  };
}

function persistUnhandledFailure(error) {
  try {
    writeFileSync(failurePath, `${JSON.stringify(failureBody(error), null, 2)}\n`,
      { encoding: "utf8", mode: 0o600 });
  } catch {}
  console.error(error);
  process.exit(1);
}

process.once("uncaughtException", persistUnhandledFailure);
process.once("unhandledRejection", persistUnhandledFailure);

async function readJsonIfPresent(filename) {
  try {
    return JSON.parse(await readFile(filename, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

async function writeJsonAtomic(filename, value, mode = 0o600) {
  const temporary = `${filename}.next`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
    encoding: "utf8",
    mode,
  });
  await rename(temporary, filename);
}

async function loadOrCreatePrivateRunState() {
  const existing = await readJsonIfPresent(privateRunStatePath);
  if (existing) return existing;
  const keyPair = generateKeyPairSync("ed25519");
  const created = {
    schema: "ticket23_slice246_resumable_private_state_v1",
    refereePrivateKeyPem: keyPair.privateKey.export({
      type: "pkcs8", format: "pem",
    }).toString(),
    refereePublicKeyPem: keyPair.publicKey.export({
      type: "spki", format: "pem",
    }).toString(),
    refereeHmacSecret: randomBytes(32).toString("base64url"),
    storeEncryptionKeyBase64: randomBytes(32).toString("base64"),
    credentials: null,
    observationsByActionIndex: {},
    clockTick: 0,
  };
  await writeJsonAtomic(privateRunStatePath, created);
  return created;
}

async function writeProgress(value) {
  await writeJsonAtomic(progressPath, {
    schema: "ticket23_slice246_progress_v1",
    ticket: 23,
    slice: 246,
    scale: "Standard",
    mineralsBySide: { player1: 2000, player2: 2000 },
    providerCalls: 0,
    estimatedCostCny: 0,
    ...value,
  }, 0o644);
}

function clone(value) { return structuredClone(value); }
function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}
function activeModels(piece) {
  return (piece.models || []).filter((model) => model.isDestroyed !== true);
}
function formationOffsets(profiles, entrySide) {
  // Exact base tangency is legal. Adding a visual gap here can make a legal
  // three-rank deployment exceed the leading model's official Speed.
  const xStep = Math.max(...profiles.map((entry) => entry.baseWidthMilliInches));
  const yStep = Math.max(...profiles.map((entry) => entry.baseDepthMilliInches));
  const points = [{ x: 0, y: 0 }];
  for (let ring = 1; points.length < profiles.length; ring += 1) {
    for (let y = -ring; y <= ring; y += 1) {
      for (let x = -ring; x <= ring; x += 1) {
        if (Math.max(Math.abs(x), Math.abs(y)) !== ring) continue;
        points.push({ x: x * xStep, y: y * yStep });
      }
    }
  }
  const compact = points.sort((left, right) => (
    Math.hypot(left.x, left.y) - Math.hypot(right.x, right.y)
      || left.y - right.y || left.x - right.x
  )).slice(0, profiles.length);
  // When the final ring is only partially occupied, orient that extra rank
  // toward the battlefield instead of forcing the leading model farther in.
  if (entrySide === "bottom") return compact.map(({ x, y }) => ({ x, y: -y }));
  if (entrySide === "left") return compact.map(({ x, y }) => ({ x: -y, y: x }));
  if (entrySide === "right") return compact.map(({ x, y }) => ({ x: y, y: x }));
  return compact;
}
function deployParameters(domain, centerX, centerY) {
  const source = domain.sourceDomain;
  const profiles = source.constraints.modelProfiles;
  const leading = profiles[0];
  const segment = source.constraints.entrySegments[0];
  const offsets = formationOffsets(profiles, segment.side);
  const rows = profiles.map((profile, index) => ({
    modelId: profile.modelId,
    xMilliInches: centerX + offsets[index].x,
    yMilliInches: centerY + offsets[index].y,
    elevation: "ground",
    supportTerrainIds: [],
    rotationDegrees: 0,
  }));
  return {
    leadingModelId: leading.modelId,
    entrySegmentId: segment.segmentId,
    entryAlongEdgeMilliInches: new Set(["top", "bottom"]).has(segment.side)
      ? centerX : centerY,
    path: [rows[0]],
    placements: rows.slice(1),
  };
}
function axisSamples(minimum, maximum, step = 250) {
  if (minimum > maximum) return [];
  const values = [];
  for (let value = Math.ceil(minimum / step) * step;
    value <= maximum; value += step) values.push(value);
  for (const value of [minimum, maximum, Math.round((minimum + maximum) / 2)]) {
    if (value >= minimum && value <= maximum) values.push(value);
  }
  return [...new Set(values)].sort((left, right) => left - right);
}
function deployCentres(domain) {
  const source = domain.sourceDomain;
  const constraints = source.constraints;
  const profiles = constraints.modelProfiles;
  const leading = profiles[0];
  const segment = constraints.entrySegments[0];
  const offsets = formationOffsets(profiles, segment.side);
  const halfWidths = profiles.map((entry) => (
    Math.round(entry.baseWidthMilliInches / 2)));
  const halfDepths = profiles.map((entry) => (
    Math.round(entry.baseDepthMilliInches / 2)));
  let minimumX = Math.max(...offsets.map((entry, index) => (
    halfWidths[index] - entry.x)));
  let maximumX = constraints.battlefieldWidthMilliInches
    - Math.max(...offsets.map((entry, index) => (
      entry.x + halfWidths[index])));
  let minimumY = Math.max(...offsets.map((entry, index) => (
    halfDepths[index] - entry.y)));
  let maximumY = constraints.battlefieldHeightMilliInches
    - Math.max(...offsets.map((entry, index) => (
      entry.y + halfDepths[index])));
  const segmentMinimum = Math.round(Number(segment.startInches) * 1000);
  const segmentMaximum = Math.round(Number(segment.endInches) * 1000);
  const leadingHalfWidth = halfWidths[0];
  const leadingHalfDepth = halfDepths[0];
  const maxDistance = Number(constraints.maxDistanceMilliInches);
  if (new Set(["top", "bottom"]).has(segment.side)) {
    minimumX = Math.max(minimumX, segmentMinimum + leadingHalfWidth);
    maximumX = Math.min(maximumX, segmentMaximum - leadingHalfWidth);
    if (segment.side === "bottom") {
      maximumY = Math.min(maximumY, -leadingHalfDepth + maxDistance);
    } else {
      minimumY = Math.max(minimumY,
        constraints.battlefieldHeightMilliInches + leadingHalfDepth - maxDistance);
    }
  } else {
    minimumY = Math.max(minimumY, segmentMinimum + leadingHalfDepth);
    maximumY = Math.min(maximumY, segmentMaximum - leadingHalfDepth);
    if (segment.side === "left") {
      maximumX = Math.min(maximumX, -leadingHalfWidth + maxDistance);
    } else {
      minimumX = Math.max(minimumX,
        constraints.battlefieldWidthMilliInches + leadingHalfWidth - maxDistance);
    }
  }
  const xs = axisSamples(minimumX, maximumX);
  const ys = axisSamples(minimumY, maximumY);
  const inwardFirstY = segment.side === "top" ? [...ys].reverse() : ys;
  const inwardFirstX = segment.side === "right" ? [...xs].reverse() : xs;
  return new Set(["top", "bottom"]).has(segment.side)
    ? inwardFirstY.flatMap((centerY) => xs.map((centerX) => ({ centerX, centerY })))
    : inwardFirstX.flatMap((centerX) => ys.map((centerY) => ({ centerX, centerY })));
}
function deploymentLaneClearance(state, domain, centre) {
  const side = domain.sourceDomain.constraints.entrySegments[0].side;
  const blockers = state.pieces.filter((piece) => (
    piece.id !== domain.pieceId && piece.isOnField === true
      && piece.isDestroyed !== true
  )).flatMap((piece) => activeModels(piece).filter((model) => (
    model.isOnField !== false
  )));
  if (blockers.length === 0) return Number.MAX_SAFE_INTEGER;
  const along = new Set(["top", "bottom"]).has(side)
    ? centre.centerX : centre.centerY;
  return Math.min(...blockers.map((model) => Math.abs(along
    - Math.round(Number(new Set(["top", "bottom"]).has(side)
      ? model.xInches : model.yInches) * 1000))));
}
function findDeployProposal(rulesRuntime, state, domain, matchBinding) {
  const failures = [];
  // Legality is still decided exclusively by Rules. Trying the emptiest entry
  // lanes first keeps a late-round reserve deployment from spending hundreds
  // of exact geometry attempts walking across already occupied formations.
  const centres = deployCentres(domain).sort((left, right) => (
    deploymentLaneClearance(state, domain, right)
      - deploymentLaneClearance(state, domain, left)
      || left.centerY - right.centerY
      || left.centerX - right.centerX
  ));
  for (const { centerX, centerY } of centres) {
    const parameters = deployParameters(domain, centerX, centerY);
    try {
      rulesRuntime.instantiate(state, domain, parameters, { matchBinding });
      return { kind: "parameterized", domainId: domain.domainId, parameters };
    } catch (error) {
      failures.push(String(error?.message || error).split(":")[0]);
    }
  }
  ensure(false, "SLICE246_NO_LEGAL_DEPLOYMENT_FORMATION", {
    pieceId: domain.pieceId,
    attemptedCentreCount: centres.length,
    failureCodes: [...new Set(failures)].sort(),
  });
}
function selectProposal(rulesRuntime, state, legalSpace, matchBinding) {
  const domains = legalSpace.parameterDomains || [];
  const finish = domains.find((entry) => entry.actionType === "finish_activation");
  if (finish) return {
    selectedType: "finish_activation",
    proposal: { kind: "parameterized", domainId: finish.domainId, parameters: {} },
  };
  const deploy = domains.find((entry) => entry.actionType === "deploy");
  if (deploy) return {
    selectedType: "deploy",
    pieceId: deploy.pieceId,
    proposal: findDeployProposal(rulesRuntime, state, deploy, matchBinding),
  };
  const priority = [
    "resolve_mission_start_of_round",
    "determine_current_product_mission_marker_control",
    "score_mission",
    "check_mission_end_game",
    "resolve_current_product_end_of_round_effects",
    "resolve_current_product_cleanup_refresh",
    "resolve_current_product_next_round_initiative",
    "choose_first_actor",
    "pass",
  ];
  const finite = [...(legalSpace.finiteActions || [])].sort((left, right) => (
    priority.indexOf(left.action.actionType) - priority.indexOf(right.action.actionType)
      || left.actionKey.localeCompare(right.actionKey)
  )).find((entry) => priority.includes(entry.action.actionType));
  ensure(finite, "SLICE246_NO_DETERMINISTIC_PROGRESS_ACTION", {
    round: state.round,
    phase: state.phase,
    finiteActionTypes: (legalSpace.finiteActions || []).map((entry) => (
      entry.action.actionType
    )),
    parameterActionTypes: domains.map((entry) => entry.actionType),
  });
  return {
    selectedType: finite.action.actionType,
    pieceId: finite.action.pieceId || null,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  };
}

function acceptedTransition(entry) {
  const event = entry?.payload;
  return event?.type === "accepted_transition" && event?.payload?.receipt
    ? event.payload : null;
}

function actionRecordFromReceipt(receipt, event, observation, index) {
  const action = receipt.action || receipt.core?.action || {};
  const chanceReveal = receipt.chanceReveal || receipt.core?.chanceReveal || null;
  const observedRound = observation?.round;
  return {
    index,
    round: observedRound !== undefined
      && Number.isSafeInteger(Number(observedRound))
      ? Number(observedRound) : null,
    phase: String(observation?.phase || "unknown"),
    sideKey: String(observation?.sideKey || action.sideKey || ""),
    actionType: String(action.actionType || observation?.actionType || ""),
    pieceId: action.pieceId || observation?.pieceId || null,
    legalSpaceHash: receipt.legalSpaceHash || observation?.legalSpaceHash || null,
    previewId: event.previewId || observation?.previewId || null,
    journalHash: receipt.journalHash,
    postStateHash: receipt.postStateHash,
    chanceReveal,
    rulesAuthority: true,
    agentDecision: false,
    trainingTruth: false,
  };
}

async function recoverAcceptedActions(roomStore, privateRunState) {
  const journal = await roomStore.readJournal(roomId, "private", 0);
  const accepted = (journal || []).map(acceptedTransition).filter(Boolean);
  return accepted.map((event, offset) => {
    const index = offset + 1;
    return actionRecordFromReceipt(
      event.receipt,
      event,
      privateRunState.observationsByActionIndex?.[String(index)],
      index,
    );
  });
}

const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
const serverSeatPlan = SIDE_KEYS.map((sideKey) => ({
  label: `${sideKey}Supervisor`,
  seatKey: sideKey,
  roleMode: "supervisor",
  principalType: "human",
}));
const factory = createOfficialStandardRoomInitialStateAuthorityV1({
  dataset: source.dataset,
  snapshot: source.snapshot,
  serverSeatPlan,
});
const state = clone(factory.state);
const rulesRuntime = createOfficialCurrentProductMatchRuntimeV1({
  dataset: source.dataset,
  state,
});
state.phase = "start_of_round";
state.stage = "mission_start_of_round";
state.activeSideKey = state.firstPlayerSideKey;
state.phaseFirstActorByRound = {};
delete state.officialRoundSupplyState;
const initialStateAuthorityBody = {
  schema: "starcraft_tmg_standard_2000_complete_match_dry_run_authority_v1",
  version: "1.0.0",
  source: "server_factory",
  setupId: factory.setupId,
  parentFactoryReceiptHash: factory.receiptHash,
  state,
  dataVersion: factory.dataVersion,
  dependencies: clone(factory.dependencies),
  compositionEvidence: {
    ...clone(factory.compositionEvidence),
    currentProductMatchRuntimeHash: rulesRuntime.descriptor.runtimeHash,
    dryRunRequested: true,
    completeMatchDryRunPassed: false,
  },
  serverSeatPlan,
  trainingTruth: false,
};
const initialStateAuthority = Object.freeze({
  ...initialStateAuthorityBody,
  receiptHash: hashStarcraftTmgContract(initialStateAuthorityBody),
});

const privateRunState = await loadOrCreatePrivateRunState();
let clockTick = Number(privateRunState.clockTick || 0);
const clockBase = Date.parse(occurredAt);
const now = () => new Date(clockBase + (clockTick++ * 1000)).toISOString();
const refereeCrypto = createStarcraftTmgRefereeCrypto({
  privateKey: privateRunState.refereePrivateKeyPem,
  publicKey: privateRunState.refereePublicKeyPem,
  hmacSecret: privateRunState.refereeHmacSecret,
  keyId: "ticket23-slice246-referee-v1",
  trustLevel: "development_persistent",
});
const authorityEngine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  now,
  refereeCrypto,
});
const privatePayloadCodec = createStarcraftTmgPrivatePayloadCodec({
  key: privateRunState.storeEncryptionKeyBase64,
  keyId: "ticket23-slice246-room-store-v1",
  trustLevel: "development_persistent",
});
const roomStore = createSqliteStarcraftTmgRoomStore({
  filename: databasePath,
  privatePayloadCodec,
  now,
});
const roomRuntime = createStarcraftTmgRoomRuntime({
  authorityEngine,
  roomStore,
  now,
  checkpointInterval: 16,
});
let aggregateAtStart = await roomStore.loadRoom(roomId);
function registerResumeDependencies(binding) {
  const supplied = initialStateAuthority.dependencies;
  for (const kind of ["sourceSnapshot", "dataSnapshot", "geometryArtifact"]) {
    const expected = binding.dependencies[kind];
    authorityEngine.registerDependency({ kind,
      artifactId: expected.artifactId,
      contentHash: expected.contentHash,
      content: supplied[kind].content });
  }
  const generated = {
    rulesArtifact: { kind: "rules-artifact",
      rulesVersion: rulesRuntime.descriptor.rulesVersion,
      rulesRuntimeBinding: binding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: binding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: binding.rulesRuntimeBinding.catalogueHash,
      executorManifest: rulesRuntime.descriptor.executorManifest },
  };
  for (const [kind, content] of Object.entries(generated)) {
    const expected = binding.dependencies[kind];
    authorityEngine.registerDependency({ kind,
      artifactId: expected.artifactId,
      contentHash: expected.contentHash,
      content });
  }
  const actionSchemaExpected = binding.dependencies.actionSchema;
  const actionSchema = Array.from({ length: 64 }, (_, index) => ({
    kind: "action-schema",
    schemaVersion: `hybrid_legal_space_v${index + 1}`,
  })).find((content) => hashStarcraftTmgContract(content)
    === actionSchemaExpected.contentHash);
  ensure(actionSchema, "SLICE246_RESUME_ACTION_SCHEMA_UNAVAILABLE");
  authorityEngine.registerDependency({ kind: "actionSchema",
    artifactId: actionSchemaExpected.artifactId,
    contentHash: actionSchemaExpected.contentHash,
    content: actionSchema });
  const rulesDisplay = `# Historical rules display\n\nFrozen rules version: `
    + `${rulesRuntime.descriptor.rulesVersion}\n\nThis development artifact preserves `
    + "the rules identity used by the match.";
  authorityEngine.registerDependency({ kind: "rulesDisplay",
    artifactId: binding.rulesDisplayBinding.artifactId,
    contentHash: binding.rulesDisplayBinding.artifactHash,
    mediaType: binding.rulesDisplayBinding.mediaType,
    locale: binding.rulesDisplayBinding.locale,
    content: rulesDisplay });
}
let created;
let resumed = false;
if (aggregateAtStart) {
  resumed = true;
  registerResumeDependencies(aggregateAtStart.envelope.matchBinding);
  ensure(privateRunState.credentials, "SLICE246_RESUME_CREDENTIALS_MISSING");
  ensure(aggregateAtStart.envelope.matchBinding.rulesRuntimeBinding.runtimeHash
    === rulesRuntime.descriptor.runtimeHash,
  "SLICE246_RESUME_RUNTIME_MISMATCH");
  const lastAuditTick = Math.ceil(
    (Date.parse(aggregateAtStart.updatedAtAudit) - clockBase) / 1000,
  ) + 1;
  clockTick = Math.max(clockTick, lastAuditTick);
  created = {
    ok: true,
    credentials: privateRunState.credentials,
    matchBinding: aggregateAtStart.envelope.matchBinding,
  };
} else {
  created = await roomRuntime.createRoom({
    roomId,
    title: "Ticket 23 · Slice 246 · Standard 2000 deterministic full match",
    gameId: "starcraft-tmg",
    surfaceMode: "deterministic_product_preflight",
    initialStateAuthority,
    serverSeatPlan,
  });
  ensure(created.ok, "SLICE246_ROOM_CREATE_FAILED", { reason: created.reason });
  privateRunState.credentials = clone(created.credentials);
  privateRunState.clockTick = clockTick;
  await writeJsonAtomic(privateRunStatePath, privateRunState);
  aggregateAtStart = await roomStore.loadRoom(roomId);
}
assert.equal(created.matchBinding.rulesRuntimeBinding.legalSpaceComplete, true);
assert.equal(created.matchBinding.rulesRuntimeBinding.productionRoomEligible, true);
const initialRead = await roomRuntime.readRoom({ roomId });
ensure(initialRead.ok, "SLICE246_INITIAL_ROOM_READ_FAILED");
const controlLeaseBySide = {};
for (const sideKey of SIDE_KEYS) {
  const credential = created.credentials[`${sideKey}Supervisor`];
  const control = await roomRuntime.claimControl({
    roomId,
    seatToken: credential.seatToken,
    sessionId: `${roomId}-${sideKey}-supervisor`,
  });
  ensure(control.ok, "SLICE246_CONTROL_FAILED", { sideKey, reason: control.reason });
  controlLeaseBySide[sideKey] = control.controlLease;
}

const actions = await recoverAcceptedActions(roomStore, privateRunState);
ensure(actions.length === Number((await roomStore.loadRoom(roomId))
  ?.acceptedReceiptCount || 0), "SLICE246_RESUME_ACTION_LEDGER_MISMATCH");
const resumedFromActionCount = actions.length;
const deploymentRoundByPiece = Object.fromEntries(actions
  .filter((entry) => entry.actionType === "deploy" && entry.pieceId)
  .map((entry) => [entry.pieceId, entry.round]));
const chanceReveals = actions.map((entry) => entry.chanceReveal).filter(Boolean);
const legalSpaceHashes = actions.map((entry) => entry.legalSpaceHash).filter(Boolean);
let lastEnvelope = actions.length ? (await roomStore.loadRoom(roomId)).envelope : null;
await writeProgress({
  status: resumed ? "resumed" : "started",
  acceptedActionCount: actions.length,
  stateRevision: aggregateAtStart?.stateRevision || 0,
  round: aggregateAtStart?.envelope?.state?.round || 1,
  phase: aggregateAtStart?.envelope?.state?.phase || "start_of_round",
});
for (let actionIndex = actions.length;
  actionIndex < MAX_ACTIONS; actionIndex += 1) {
  const aggregate = await roomStore.loadRoom(roomId);
  ensure(aggregate, "SLICE246_AUTHORITY_AGGREGATE_MISSING");
  const current = aggregate.envelope.state;
  if (current.terminal === true || current.gameOver === true) break;
  const sideKey = current.activeSideKey || current.firstPlayerSideKey;
  const credential = created.credentials[`${sideKey}Supervisor`];
  ensure(credential, "SLICE246_ACTIVE_CREDENTIAL_MISSING", {
    round: current.round, phase: current.phase, sideKey,
  });
  const legal = await roomRuntime.legalSpace({
    roomId,
    seatToken: credential.seatToken,
  });
  ensure(legal.ok, "SLICE246_LEGAL_SPACE_FAILED", {
    round: current.round, phase: current.phase, sideKey,
    reason: legal.reason, message: legal.message,
  });
  ensure(Number(legal.legalSpace.unsupportedCount || 0) === 0,
    "SLICE246_UNSUPPORTED_LEGAL_SPACE");
  legalSpaceHashes.push(legal.legalSpace.legalSpaceHash);
  const selected = selectProposal(
    rulesRuntime,
    current,
    legal.legalSpace,
    created.matchBinding,
  );
  const observation = {
    round: Number(current.round),
    phase: current.phase,
    sideKey,
    actionType: selected.selectedType,
    pieceId: selected.pieceId || null,
    legalSpaceHash: legal.legalSpace.legalSpaceHash,
  };
  privateRunState.observationsByActionIndex[String(actionIndex + 1)] = observation;
  privateRunState.clockTick = clockTick;
  await writeJsonAtomic(privateRunStatePath, privateRunState);
  const preview = await roomRuntime.previewAction({
    roomId,
    seatToken: credential.seatToken,
    proposal: selected.proposal,
    expectedMatchBindingHash: created.matchBinding.bindingHash,
    expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash,
    expectedStateRevision: legal.legalSpace.stateRevision,
    expectedStateHash: legal.legalSpace.stateHash,
    occurredAt,
  });
  ensure(preview.ok, "SLICE246_PREVIEW_FAILED", {
    selectedType: selected.selectedType,
    pieceId: selected.pieceId,
    round: current.round,
    phase: current.phase,
    reason: preview.reason,
    message: preview.message,
  });
  let confirmationId;
  if (preview.confirmationRequired) {
    const confirmed = await roomRuntime.confirmPreview({
      roomId,
      seatToken: credential.seatToken,
      previewId: preview.preview.previewId,
      previewToken: preview.preview.previewToken,
      previewContentHash: preview.preview.previewSeal.contentHash,
      occurredAt,
    });
    ensure(confirmed.ok, "SLICE246_CONFIRM_FAILED", { reason: confirmed.reason });
    confirmationId = confirmed.confirmation.confirmationId;
  }
  const controlLease = controlLeaseBySide[sideKey];
  ensure(controlLease, "SLICE246_CONTROL_LEASE_MISSING", { sideKey });
  const applied = await roomRuntime.applyAction({
    roomId,
    seatToken: credential.seatToken,
    previewId: preview.preview.previewId,
    confirmationId,
    leaseId: controlLease.leaseId,
    leaseFence: controlLease.leaseFence,
    expectedStateRevision: legal.legalSpace.stateRevision,
    idempotencyKey: `${roomId}-action-${actionIndex + 1}`,
    occurredAt,
  });
  ensure(applied.ok, "SLICE246_APPLY_FAILED", {
    selectedType: selected.selectedType,
    pieceId: selected.pieceId,
    round: current.round,
    phase: current.phase,
    reason: applied.reason,
    message: applied.message,
  });
  lastEnvelope = applied.envelope;
  if (selected.selectedType === "deploy" && selected.pieceId) {
    deploymentRoundByPiece[selected.pieceId] = Number(current.round);
  }
  const revealed = applied.receipt?.core?.chanceReveal
    || applied.receipt?.chanceReveal || null;
  if (revealed) chanceReveals.push(clone(revealed));
  observation.previewId = preview.preview.previewId;
  const actionRecord = actionRecordFromReceipt(
    applied.receipt,
    { previewId: preview.preview.previewId },
    observation,
    actionIndex + 1,
  );
  actions.push(actionRecord);
  privateRunState.observationsByActionIndex[String(actionIndex + 1)] = {
    ...observation,
    journalHash: actionRecord.journalHash,
    postStateHash: actionRecord.postStateHash,
  };
  privateRunState.clockTick = clockTick;
  await writeJsonAtomic(privateRunStatePath, privateRunState);
  await writeProgress({
    status: applied.envelope.state.terminal === true ? "terminal" : "running",
    acceptedActionCount: actions.length,
    stateRevision: applied.envelope.stateRevision,
    round: applied.envelope.state.round,
    phase: applied.envelope.state.phase,
    lastActionType: actionRecord.actionType,
    lastPieceId: actionRecord.pieceId,
    lastStateHash: actionRecord.postStateHash,
  });
}

ensure(actions.length < MAX_ACTIONS, "SLICE246_ACTION_LIMIT_REACHED");
const finalRead = await roomRuntime.readRoom({
  roomId,
  includeJournal: true,
  seatToken: created.credentials.player1Supervisor.seatToken,
});
ensure(finalRead.ok, "SLICE246_FINAL_READ_FAILED");
const finalAggregate = await roomStore.loadRoom(roomId);
ensure(finalAggregate, "SLICE246_FINAL_AUTHORITY_AGGREGATE_MISSING");
const finalState = finalAggregate.envelope.state;
ensure(finalState.terminal === true && finalState.gameOver === true,
  "SLICE246_MATCH_NOT_TERMINAL", {
    round: finalState.round,
    phase: finalState.phase,
    actionCount: actions.length,
  });
const finalReplay = await roomRuntime.replayRoom({
  roomId,
  seatToken: created.credentials.player1Supervisor.seatToken,
});
ensure(finalReplay.ok && finalReplay.matchesCurrent
  && finalReplay.replay.silentCompatibilityUsed === false,
"SLICE246_FINAL_REPLAY_FAILED", { reason: finalReplay.reason });

const missionState = finalState.officialMissionRuntimeState;
const actionCounts = Object.fromEntries([...new Set(actions.map((entry) => (
  entry.actionType
)))].sort().map((actionType) => [actionType, actions.filter((entry) => (
  entry.actionType === actionType
)).length]));
const deployedPieces = finalState.pieces.filter((piece) => (
  piece.isOnField === true || piece.isDestroyed === true
));
const reportBody = {
  schema: "ticket23_slice246_standard_2000_complete_match_report_v1",
  ok: true,
  ticket: 23,
  slice: 246,
  roomId,
  acceptance: {
    engagementScale: finalState.engagementScale,
    battlefield: { widthInches: finalState.board.widthInches,
      heightInches: finalState.board.heightInches },
    mineralSpentBySide: clone(factory.compositionEvidence.mineralSpentBySide),
    vespeneSpentBySide: clone(factory.compositionEvidence.vespeneSpentBySide),
    unitCount: finalState.pieces.length,
    deployedOrDestroyedUnitCount: deployedPieces.length,
    terrainPieceCount: finalState.board.terrain.length,
    currentProductAbilityCoverage: {
      exact: finalState.officialCurrentProductAbilityDenominator.summary.executableExact,
      pending: finalState.officialCurrentProductAbilityDenominator.summary
        .pendingFamilyAdapter,
      unsupported: 0,
    },
    runtimeLegalSpaceComplete:
      created.matchBinding.rulesRuntimeBinding.legalSpaceComplete,
    runtimeProductionRoomEligible:
      created.matchBinding.rulesRuntimeBinding.productionRoomEligible,
    fullMatchDryRunPassed: true,
    terminal: finalState.terminal,
    terminalRound: finalState.round,
    winner: finalState.winner,
    terminalReason: finalState.terminalReason,
    finalScores: clone(finalState.scores),
    missionStartRounds: missionState.startRoundHistory.length,
    missionScoringRounds: missionState.scoringHistory.length,
    missionEndGameChecks: missionState.endGameHistory.length,
    acceptedActionCount: actions.length,
    actionCounts,
    uniqueLegalSpaceCount: new Set(legalSpaceHashes).size,
    deploymentRoundByPiece,
    authoritativeChanceBundleCount: chanceReveals.length,
    finalReplayMatchesCurrent: finalReplay.matchesCurrent,
    finalReplayTotalAppliedCount: finalReplay.replay.checkpointStateRevision
      + finalReplay.replay.appliedCount,
    finalReplayTailAppliedCount: finalReplay.replay.appliedCount,
    finalStateHash: finalAggregate.envelope.stateHash,
    replayStateHash: finalReplay.replay.envelope.stateHash,
  },
  authorityBoundaries: {
    rulesOwnLegalSpace: true,
    rulesOwnResourceAndBaseGeometry: true,
    rulesOwnDicePoolCountsModifiersAndOutcomes: true,
    authorityOwnsChanceTicketsAndReceipts: true,
    deterministicDriverOnlySelectsLegalActions: true,
    providerCalls: 0,
    providerInputTokens: 0,
    providerOutputTokens: 0,
    estimatedCostCny: 0,
  },
  sourceAndTraining: {
    sourceRefreshPerformed: false,
    frozenGameplayVersions: { units: 71, cards: 69, rules: 48 },
    eligibleForTraining: false,
    trainingTruth: false,
  },
  executionDurability: {
    roomStore: "sqlite_wal",
    actionObservationCheckpoint: "atomic_json_sidecar",
    resumable: true,
    resumed,
    resumedFromActionCount,
  },
  actions,
  finalReplay: {
    appliedCount: finalReplay.replay.appliedCount,
    checkpointStateRevision: finalReplay.replay.checkpointStateRevision,
    matchesCurrent: finalReplay.matchesCurrent,
    silentCompatibilityUsed: finalReplay.replay.silentCompatibilityUsed,
  },
};
const report = { ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody) };

assert.equal(report.acceptance.engagementScale, "Standard");
assert.deepEqual(report.acceptance.battlefield, { widthInches: 54, heightInches: 36 });
assert.deepEqual(report.acceptance.mineralSpentBySide,
  { player1: 2000, player2: 2000 });
assert.ok(report.acceptance.vespeneSpentBySide.player1 <= 200);
assert.ok(report.acceptance.vespeneSpentBySide.player2 <= 200);
assert.equal(report.acceptance.unitCount, 15);
assert.equal(report.acceptance.deployedOrDestroyedUnitCount, 15);
assert.equal(report.acceptance.terrainPieceCount, 9);
assert.deepEqual(report.acceptance.currentProductAbilityCoverage,
  { exact: 252, pending: 0, unsupported: 0 });
assert.equal(report.acceptance.terminalRound, 5);
assert.equal(report.acceptance.missionStartRounds, 5);
assert.equal(report.acceptance.missionScoringRounds, 5);
assert.equal(report.acceptance.missionEndGameChecks, 5);
assert.equal(report.acceptance.finalReplayMatchesCurrent, true);
assert.equal(report.acceptance.finalReplayTotalAppliedCount, actions.length);
assert.equal(report.acceptance.finalStateHash, report.acceptance.replayStateHash);
assert.equal(lastEnvelope.stateHash, report.acceptance.finalStateHash);

await mkdir(outputDirectory, { recursive: true });
await writeFile(path.join(outputDirectory, "report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeProgress({
  status: "complete",
  acceptedActionCount: actions.length,
  stateRevision: finalAggregate.stateRevision,
  round: finalState.round,
  phase: finalState.phase,
  finalStateHash: finalAggregate.envelope.stateHash,
  reportHash: report.reportHash,
});
roomStore.close();
console.log(JSON.stringify({
  ok: report.ok,
  scale: report.acceptance.engagementScale,
  minerals: report.acceptance.mineralSpentBySide,
  vespene: report.acceptance.vespeneSpentBySide,
  battlefield: report.acceptance.battlefield,
  units: `${report.acceptance.deployedOrDestroyedUnitCount}/${report.acceptance.unitCount}`,
  abilityCoverage: report.acceptance.currentProductAbilityCoverage,
  terminalRound: report.acceptance.terminalRound,
  finalScores: report.acceptance.finalScores,
  acceptedActionCount: report.acceptance.acceptedActionCount,
  actionCounts: report.acceptance.actionCounts,
  authoritativeChanceBundleCount:
    report.acceptance.authoritativeChanceBundleCount,
  finalReplayMatchesCurrent: report.acceptance.finalReplayMatchesCurrent,
  providerCalls: report.authorityBoundaries.providerCalls,
  costCny: report.authorityBoundaries.estimatedCostCny,
  reportPath: path.relative(root, path.join(outputDirectory, "report.json")),
}, null, 2));
