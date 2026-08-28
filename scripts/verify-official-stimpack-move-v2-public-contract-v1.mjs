import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExistingStimpackMoveV2ContractClosureRuleSliceV1 } from
  "../packages/rule-atoms/official-existing-stimpack-move-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  enumerateOfficialStimpackMoveV1,
  OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
} from
  "../packages/rule-atoms/official-stimpack-move-consumer-executor-v1.mjs";
import {
  applyOfficialStimpackMoveV2,
  enumerateOfficialStimpackMoveV2,
  instantiateOfficialStimpackMoveV2,
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
} from
  "../packages/rule-atoms/official-stimpack-move-consumer-executor-v2.mjs";
import {
  applyOfficialStandardMoveV4,
  enumerateOfficialStandardMoveV4,
  instantiateOfficialStandardMoveV4,
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID,
  OFFICIAL_STANDARD_MOVE_V4_PARAMETER_KIND,
} from
  "../packages/rule-atoms/official-standard-move-executor-v4.mjs";
import {
  applyOfficialReserveDeployV4,
  enumerateOfficialReserveDeployV4,
  instantiateOfficialReserveDeployV4,
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID,
  OFFICIAL_RESERVE_DEPLOY_V4_PARAMETER_KIND,
} from
  "../packages/rule-atoms/official-reserve-deploy-executor-v4.mjs";
import {
  applyOfficialDisengageV4,
  enumerateOfficialDisengageV4,
  instantiateOfficialDisengageV4,
  OFFICIAL_DISENGAGE_V4_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_V4_PARAMETER_KIND,
} from
  "../packages/rule-atoms/official-disengage-executor-v4.mjs";
import {
  applyOfficialPhaseInitiativeV1,
  enumerateOfficialPhaseInitiativeActionsV1,
} from "../packages/rule-atoms/official-phase-initiative-executor-v1.mjs";
import {
  applyOfficialStartOfRoundV4,
  enumerateOfficialStartOfRoundActionsV4,
} from "../packages/rule-atoms/official-start-of-round-executor-v4.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  getOfficialCurrentProductRecord,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMarineStimpackFixtureV1 } from
  "./support/official-marine-stimpack-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const acceptance = [];
const ACTION_SCHEMA_CONTENT = Object.freeze({
  kind: "action-schema",
  schemaVersion: "hybrid_legal_space_v23",
});

function executableAction(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

function credentials(engine, envelope, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `slice-65-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `slice-65-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function applyFinite(engine, envelope, predicate, suffix) {
  const access = credentials(engine, envelope, suffix);
  const legalSpace = engine.legalSpace(envelope, { seatAuthority: access.authority });
  const finite = legalSpace.finiteActions.find((entry) => predicate(entry.action));
  assert.ok(finite, `${suffix}:${JSON.stringify(legalSpace.disabledDiagnostics)}`);
  const preview = engine.preview({
    envelope,
    seatAuthority: access.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmed = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: access.authority,
  });
  assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmed.confirmation,
    seatAuthority: access.authority,
    controlLease: access.lease,
    idempotencyKey: `slice-65-${suffix}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return applied;
}

function registerReplayDependencies(engine, initial, snapshot, dataBundle) {
  for (const [kind, content] of [
    ["sourceSnapshot", snapshot],
    ["dataSnapshot", dataBundle],
    ["rulesArtifact", {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding,
    }],
    ["executorArtifact", {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest,
    }],
    ["geometryArtifact", {
      kind: "geometry-artifact",
      geometryVersion: "fixed_point_round_base_v1",
    }],
    ["actionSchema", ACTION_SCHEMA_CONTENT],
  ]) {
    engine.registerDependency({
      kind,
      artifactId: initial.matchBinding.dependencies[kind].artifactId,
      content,
    });
  }
  engine.registerDependency({
    kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}`
      + "\n\nThis development artifact preserves the rules identity used by the match.",
  });
}

const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-movement-v3-contract-closure-v1-report.json",
), "utf8"));
const slice = createOfficialExistingStimpackMoveV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const currentManifestIds = new Set(runtime.descriptor.executorManifest.map((entry) => (
  entry.executorId
)));
for (const executorId of [
  "authority.start-of-round-v4",
  "authority.reserve-deploy-v4",
  "authority.standard-move-v4",
  "authority.disengage-v4",
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
]) assert.equal(currentManifestIds.has(executorId), true, executorId);
for (const executorId of [
  "authority.start-of-round-v3",
  "authority.reserve-deploy-v3",
  "authority.standard-move-v3",
  "authority.disengage-v3",
  OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
]) assert.equal(currentManifestIds.has(executorId), false, executorId);
const {
  gameplayDataBundle: historicalGameplayDataBundle,
  battleState,
} = await createOfficialMarineStimpackFixtureV1({
  root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const forgedCurrentState = battleState("player1");
const matchBinding = {
  bindingHash: hashStarcraftTmgContract({
    kind: "ticket-11-slice-65-stimpack-move-v2-public-red",
  }),
  dataSnapshotHash: hashStarcraftTmgContract(historicalGameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};

const legal = runtime.enumerate(forgedCurrentState, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
const leakedLegacyDomains = legal.parameterDomains.filter((entry) => (
  entry.executorId === OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID
));

assert.equal(
  leakedLegacyDomains.length,
  0,
  "current runtime must not expose frozen Stimpack Move v1 without exact Start v4 lineage",
);
assert.ok(
  legal.candidates.some((entry) => (
    entry.executorId === OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID
      && entry.disabledReason === "STIMPACK_MOVE_V2_START_OF_ROUND_HANDOFF_INVALID"
  )),
  "current Stimpack Move must fail closed with an explicit current-lineage diagnostic",
);
acceptance.push("current_runtime_rejects_forged_stimpack_move_without_start_v4_lineage");

const historicalDirect = enumerateOfficialStimpackMoveV1(forgedCurrentState, {
  sideKey: "player1",
  matchBinding,
  throwOnError: true,
});
assert.equal(historicalDirect.parameterDomains.length, 1);
const frozenV1Source = await readFile(path.join(
  ROOT,
  "packages/rule-atoms/official-stimpack-move-consumer-executor-v1.mjs",
));
assert.equal(
  createHash("sha256").update(frozenV1Source).digest("hex"),
  "62ea6efe7b3b6c77df284fc0ede25e8d6e919940bdddf585c4271fa48669a3f6",
);
acceptance.push("frozen_v1_source_and_historical_direct_semantics_remain_exact");

const liveReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-live-source-snapshots-report.json",
), "utf8"));
const firestoreDir = path.join(
  ROOT,
  "build/source-intake/official-rules/command-center/firestore",
);
const firestorePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(firestoreDir, `${collectionId}.json`), "utf8")),
])));
const currentDataset = createOfficialCommandCenterDataset({
  snapshot: liveReport.commandSnapshot,
  firestorePayloads,
});
const currentGameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot: liveReport.commandSnapshot,
  dataset: currentDataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
  reserveDeployData: true,
});
const marineRecord = getOfficialCurrentProductRecord(currentDataset, "army_units:marine");
const cardRecord = getOfficialCurrentProductRecord(
  currentDataset,
  "tactical_cards:terran_armed_forces",
);
function currentMarine(
  id,
  sideKey,
  xInches,
  selectedUpgradeNames = [],
  isOnField = true,
) {
  return {
    id,
    name: marineRecord.payload.name,
    sideKey,
    officialUnitRecordKey: "army_units:marine",
    sourceRecordHash: marineRecord.sourceRecordHash,
    officialPayloadHash: marineRecord.payloadHash,
    currentModels: 1,
    maxModels: 1,
    currentSupply: 0,
    destroyedModelIds: [],
    isOnField,
    isInReserves: !isOnField,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: ["biological", "ground", "light"],
    statuses: [],
    selectedUpgradeNames,
    startOfRoundEffects: [],
    combatEffects: [],
    assaultEffects: [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [{
      id: `${id}-model`,
      xInches,
      yInches: 5,
      baseShape: "round",
      baseWidthInches: 1.26,
      baseDepthInches: 1.26,
      elevation: "ground",
      supportTerrainIds: [],
      adjacentAccessPointIds: [],
      isOnField,
      isDestroyed: false,
    }],
  };
}
const startState = {
  schemaVersion: "starcraft_tmg_state_v0",
  round: 2,
  phase: "start_of_round",
  activeSideKey: null,
  firstPlayerSideKey: "player1",
  firstPassSideByPhase: {},
  phaseFirstActorByRound: {},
  players: {
    player1: { sideKey: "player1", faction: "Terran", passedPhases: {} },
    player2: { sideKey: "player2", faction: "Terran", passedPhases: {} },
  },
  scores: { player1: 0, player2: 1 },
  officialGameplayDataBundle: currentGameplayDataBundle,
  activeAbilityUseHistory: [],
  board: {
    widthInches: 54,
    heightInches: 36,
    missionMarkers: structuredClone(
      currentGameplayDataBundle.reserveDeployDataBundle.deploymentProfile.geometry.missionMarkers,
    ),
    terrain: [],
    accessPoints: [],
    effectMarkers: [],
    tokens: [],
    markers: [],
  },
  cardResources: {
    player1: [{
      id: "p1-taf",
      sideKey: "player1",
      officialCardRecordKey: "tactical_cards:terran_armed_forces",
      cardKind: "faction",
      sourceRecordHash: cardRecord.sourceRecordHash,
      resource: 1,
      resourceType: "CP",
      readiness: "ready",
      face: "up",
      activeEffects: [],
    }],
    player2: [],
  },
  pieces: [
    currentMarine("player1-stimpack-marine", "player1", 2, ["Stimpack"]),
    currentMarine("player2-normal-marine", "player2", 20),
  ],
  startOfRoundHistory: [],
  gameOver: false,
  terminal: false,
  winner: "",
  terminalReason: "",
  log: [],
};
startState.officialMissionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle: currentGameplayDataBundle,
  missionDraftReceiptHash: "1".repeat(64),
  deploymentDraftReceiptHash: "2".repeat(64),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
startState.cleanupRefreshHistory = [{
  schema: "starcraft_tmg_official_cleanup_refresh_history_entry_v5",
  round: 1,
  branch: "empty",
  cleanupResolutionHash: "3".repeat(64),
  preCleanupMaterialHash: "4".repeat(64),
  retainedMaterialHash: "5".repeat(64),
  statusCleanupHash: "6".repeat(64),
  removedStatusEffectHashes: [],
  removedMarkerHashes: [],
  refreshedCardCount: 0,
  resetActivationPieceCount: 0,
  clearedReactionUsageEntryCount: 0,
  clearedAcademyReactionUsageEntryCount: 0,
  damageMarkersRetained: true,
  trainingTruth: false,
}];
startState.determineInitiativeHistory = [{
  schema: "starcraft_tmg_official_determine_initiative_history_entry_v1",
  round: 1,
  nextRound: 2,
  previousFirstPlayerSideKey: "player2",
  nextFirstPlayerSideKey: "player1",
  scores: { player1: 0, player2: 1 },
  initiativeMode: "trailing_player",
  rollOff: null,
  initiativeResolutionHash: "7".repeat(64),
  trainingTruth: false,
}];
const currentMatchBinding = {
  bindingHash: hashStarcraftTmgContract({
    kind: "ticket-11-slice-65-stimpack-move-v2-current",
  }),
  dataSnapshotHash: hashStarcraftTmgContract(currentGameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
const startCandidate = enumerateOfficialStartOfRoundActionsV4(startState, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: currentMatchBinding,
})[0];
assert.equal(startCandidate?.isEnabled, true, JSON.stringify(startCandidate));
const started = applyOfficialStartOfRoundV4(
  startState,
  executableAction(startCandidate),
  { matchBinding: currentMatchBinding },
);
const initiative = enumerateOfficialPhaseInitiativeActionsV1(started.state, {
  sideKey: "player1",
}).find((entry) => entry.chosenFirstActorSideKey === "player1");
assert.ok(initiative);
const movement = applyOfficialPhaseInitiativeV1(
  started.state,
  executableAction(initiative),
).state;
const standardAlongsideStimpack = enumerateOfficialStandardMoveV4(movement, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: currentMatchBinding,
});
assert.ok(standardAlongsideStimpack.parameterDomains.some((entry) => (
  entry.parameterKind === OFFICIAL_STANDARD_MOVE_V4_PARAMETER_KIND
    && entry.executorId === OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID
    && entry.pieceId === "player1-stimpack-marine"
)), JSON.stringify(standardAlongsideStimpack.candidates));
acceptance.push("standard_move_v4_remains_legal_for_an_official_stimpack_loadout");
const standardDomain = standardAlongsideStimpack.parameterDomains.find((entry) => (
  entry.pieceId === "player1-stimpack-marine"
));
const standard = instantiateOfficialStandardMoveV4(movement, standardDomain, {
  leadingModelId: "player1-stimpack-marine-model",
  path: [{ xMilliInches: 5_000, yMilliInches: 5_000 }],
  placements: [],
}, { matchBinding: currentMatchBinding });
const standardApplied = applyOfficialStandardMoveV4(
  movement,
  standard.action,
  { matchBinding: currentMatchBinding },
);
assert.deepEqual(
  standardApplied.state.pieces.find((piece) => (
    piece.id === "player1-stimpack-marine"
  )).selectedUpgradeNames,
  ["Stimpack"],
);
assert.equal(standardApplied.state.log.at(-1).action.executorId,
  OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID);
acceptance.push("standard_move_v4_apply_preserves_the_hash_bound_stimpack_loadout");
const movementFamilyStartState = structuredClone(startState);
movementFamilyStartState.pieces = [
  currentMarine("player1-stimpack-marine", "player1", 2, ["Stimpack"]),
  currentMarine("player1-engaged-marine", "player1", 20),
  currentMarine("player1-reserve-marine", "player1", 0, [], false),
  currentMarine("player2-normal-marine", "player2", 22.26),
];
const movementFamilyStart = enumerateOfficialStartOfRoundActionsV4(
  movementFamilyStartState,
  {
    sideKey: "player1",
    includeDisabled: true,
    matchBinding: currentMatchBinding,
  },
)[0];
assert.equal(movementFamilyStart?.isEnabled, true, JSON.stringify(movementFamilyStart));
const movementFamilyStarted = applyOfficialStartOfRoundV4(
  movementFamilyStartState,
  executableAction(movementFamilyStart),
  { matchBinding: currentMatchBinding },
);
const movementFamilyInitiative = enumerateOfficialPhaseInitiativeActionsV1(
  movementFamilyStarted.state,
  { sideKey: "player1" },
).find((entry) => entry.chosenFirstActorSideKey === "player1");
assert.ok(movementFamilyInitiative);
const movementFamily = applyOfficialPhaseInitiativeV1(
  movementFamilyStarted.state,
  executableAction(movementFamilyInitiative),
).state;
const reserveAlongsideStimpack = enumerateOfficialReserveDeployV4(movementFamily, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: currentMatchBinding,
});
assert.ok(reserveAlongsideStimpack.parameterDomains.some((entry) => (
  entry.parameterKind === OFFICIAL_RESERVE_DEPLOY_V4_PARAMETER_KIND
    && entry.executorId === OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID
    && entry.pieceId === "player1-reserve-marine"
)), JSON.stringify(reserveAlongsideStimpack.candidates));
const disengageAlongsideStimpack = enumerateOfficialDisengageV4(movementFamily, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: currentMatchBinding,
});
assert.ok(disengageAlongsideStimpack.parameterDomains.some((entry) => (
  entry.parameterKind === OFFICIAL_DISENGAGE_V4_PARAMETER_KIND
    && entry.executorId === OFFICIAL_DISENGAGE_V4_EXECUTOR_ID
    && entry.pieceId === "player1-engaged-marine"
)), JSON.stringify(disengageAlongsideStimpack.candidates));
acceptance.push("reserve_and_disengage_v4_share_the_start_v4_loadout_lineage");
const reserveDomain = reserveAlongsideStimpack.parameterDomains.find((entry) => (
  entry.pieceId === "player1-reserve-marine"
));
const reserve = instantiateOfficialReserveDeployV4(movementFamily, reserveDomain, {
  leadingModelId: "player1-reserve-marine-model",
  entryAlongEdgeMilliInches: 10_000,
  path: [{ xMilliInches: 10_000, yMilliInches: 3_000 }],
  placements: [],
}, { matchBinding: currentMatchBinding });
const reserveApplied = applyOfficialReserveDeployV4(
  movementFamily,
  reserve.action,
  { matchBinding: currentMatchBinding },
);
assert.equal(reserveApplied.state.pieces.find((piece) => (
  piece.id === "player1-reserve-marine"
)).isOnField, true);
assert.deepEqual(reserveApplied.state.pieces.find((piece) => (
  piece.id === "player1-stimpack-marine"
)).selectedUpgradeNames, ["Stimpack"]);
assert.equal(reserveApplied.state.log.at(-1).action.executorId,
  OFFICIAL_RESERVE_DEPLOY_V4_EXECUTOR_ID);
const disengageDomain = disengageAlongsideStimpack.parameterDomains.find((entry) => (
  entry.pieceId === "player1-engaged-marine"
));
const disengage = instantiateOfficialDisengageV4(movementFamily, disengageDomain, {
  leadingModelId: "player1-engaged-marine-model",
  leadingOutcome: "placed",
  path: [{ xMilliInches: 18_000, yMilliInches: 5_000 }],
  placements: [],
}, { matchBinding: currentMatchBinding });
const disengageApplied = applyOfficialDisengageV4(
  movementFamily,
  disengage.action,
  { matchBinding: currentMatchBinding },
);
assert.equal(disengageApplied.state.log.at(-1).action.executorId,
  OFFICIAL_DISENGAGE_V4_EXECUTOR_ID);
assert.deepEqual(disengageApplied.state.pieces.find((piece) => (
  piece.id === "player1-stimpack-marine"
)).selectedUpgradeNames, ["Stimpack"]);
assert.ok(enumerateOfficialStandardMoveV4(disengageApplied.state, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: currentMatchBinding,
}).parameterDomains.some((entry) => entry.pieceId === "player1-stimpack-marine"));
acceptance.push("reserve_and_disengage_v4_apply_preserve_loadout_and_supply_lineage");
const current = enumerateOfficialStimpackMoveV2(movement, {
  sideKey: "player1",
  includeDisabled: true,
  throwOnError: true,
  matchBinding: currentMatchBinding,
});
assert.equal(current.parameterDomains.length, 1, JSON.stringify(current.candidates));
const domain = current.parameterDomains[0];
assert.equal(domain.executorId, OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID);
assert.match(domain.constraints.currentAuthorityLineageHash, /^[a-f0-9]{64}$/u);
const runtimeCurrent = runtime.enumerate(movement, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: currentMatchBinding,
});
assert.ok(runtimeCurrent.parameterDomains.some((entry) => (
  entry.executorId === OFFICIAL_STANDARD_MOVE_V4_EXECUTOR_ID
)));
assert.ok(runtimeCurrent.parameterDomains.some((entry) => (
  entry.executorId === OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID
)));
assert.equal(runtimeCurrent.parameterDomains.some((entry) => (
  ["authority.standard-move-v3", OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID]
    .includes(entry.executorId)
)), false);
acceptance.push("runtime_exposes_only_start_v4_movement_v4_and_stimpack_move_v2_identities");

const instantiated = instantiateOfficialStimpackMoveV2(movement, domain, {
  leadingModelId: "player1-stimpack-marine-model",
  path: [{ xMilliInches: 12_000, yMilliInches: 5_000 }],
  placements: [],
}, { matchBinding: currentMatchBinding });
assert.equal(instantiated.action.movePlan.speedAllowanceInches, 10);
const supplyHashBefore = movement.officialRoundSupplyState.roundSupplyStateHash;
const ledgerHashBefore = movement.supplyLossLedger.supplyLossLedgerHash;
const applied = applyOfficialStimpackMoveV2(
  movement,
  instantiated.action,
  { matchBinding: currentMatchBinding },
);
const moved = applied.state.pieces.find((piece) => piece.id === "player1-stimpack-marine");
assert.equal(moved.models[0].xInches, 12);
assert.equal(moved.damageMarker, 2);
assert.equal(moved.activatedPhases.movement, true);
assert.equal(applied.state.cardResources.player1[0].readiness, "exhausted");
assert.equal(applied.state.officialRoundSupplyState.roundSupplyStateHash, supplyHashBefore);
assert.equal(applied.state.supplyLossLedger.supplyLossLedgerHash, ledgerHashBefore);
assert.equal(applied.state.log.at(-1).action.executorId, OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID);
acceptance.push("stimpack_payment_damage_status_and_ten_inch_move_apply_atomically");

const tampered = structuredClone(instantiated.action);
tampered.movePlan.speedAllowanceInches = 99;
assert.throws(
  () => applyOfficialStimpackMoveV2(
    movement,
    tampered,
    { matchBinding: currentMatchBinding },
  ),
  /STIMPACK_MOVE_V2_ACTION_MISMATCH/u,
);
acceptance.push("exact_current_action_tamper_is_rejected_before_apply");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-28T23:58:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-slice-65-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}
const engine = authoritativeEngine("ticket-11-slice-65-short-seal-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-slice-65-stimpack-room",
  dataVersion:
    `${liveReport.commandSnapshot.dataVersions.unitsVersion}`
    + `/${liveReport.commandSnapshot.dataVersions.cardsVersion}`
    + `/${liveReport.commandSnapshot.dataVersions.rulesVersion}`,
  dependencies: {
    sourceSnapshot: {
      artifactId: "official-command-center-snapshot",
      content: liveReport.commandSnapshot,
    },
    dataSnapshot: {
      artifactId: "official-gameplay-data-bundle",
      content: currentGameplayDataBundle,
    },
  },
  state: structuredClone(startState),
});
assert.equal(
  initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract(ACTION_SCHEMA_CONTENT),
);
const authorityStart = applyFinite(
  engine,
  initialEnvelope,
  (action) => action.actionType === "resolve_start_of_round"
    && action.executorId === "authority.start-of-round-v4",
  "start-v4",
);
const authorityPhase = applyFinite(
  engine,
  authorityStart.envelope,
  (action) => action.actionType === "choose_first_actor"
    && action.chosenFirstActorSideKey === "player1",
  "movement-initiative",
);
const authorityAccess = credentials(engine, authorityPhase.envelope, "stimpack-move-v2");
const authorityLegal = engine.legalSpace(authorityPhase.envelope, {
  seatAuthority: authorityAccess.authority,
});
const authorityDomain = authorityLegal.parameterDomains.find((entry) => (
  entry.parameterKind === domain.parameterKind
    && entry.executorId === OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID
    && entry.pieceId === "player1-stimpack-marine"
));
assert.ok(authorityDomain, JSON.stringify(authorityLegal.disabledDiagnostics));
const authorityPreview = engine.preview({
  envelope: authorityPhase.envelope,
  seatAuthority: authorityAccess.authority,
  proposal: {
    kind: "parameterized",
    domainId: authorityDomain.domainId,
    parameters: {
      leadingModelId: "player1-stimpack-marine-model",
      path: [{ xMilliInches: 12_000, yMilliInches: 5_000 }],
      placements: [],
    },
  },
});
assert.equal(authorityPreview.ok, true, JSON.stringify(authorityPreview));
const authorityConfirmed = engine.confirmPreview({
  envelope: authorityPhase.envelope,
  preview: authorityPreview.preview,
  seatAuthority: authorityAccess.authority,
});
assert.equal(authorityConfirmed.ok, true, JSON.stringify(authorityConfirmed));
const authorityApplied = engine.apply({
  envelope: authorityPhase.envelope,
  expectedStateRevision: authorityPhase.envelope.stateRevision,
  preview: authorityPreview.preview,
  confirmation: authorityConfirmed.confirmation,
  seatAuthority: authorityAccess.authority,
  controlLease: authorityAccess.lease,
  idempotencyKey: "slice-65-stimpack-move-v2",
});
assert.equal(authorityApplied.ok, true, JSON.stringify(authorityApplied));
assert.equal(authorityApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.equal(authorityApplied.receipt.action.executorId,
  OFFICIAL_STIMPACK_MOVE_V2_EXECUTOR_ID);
const replayEngine = authoritativeEngine("ticket-11-slice-65-rotated-seal-v2");
registerReplayDependencies(
  replayEngine,
  initialEnvelope,
  liveReport.commandSnapshot,
  currentGameplayDataBundle,
);
const journal = [authorityStart.receipt, authorityPhase.receipt, authorityApplied.receipt];
const replayed = replayEngine.replay({ initialEnvelope, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, authorityApplied.envelope.stateHash);
const tamperedJournal = structuredClone(journal);
tamperedJournal[2].events.push({ type: "forged_slice_65_event" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("authority_v23_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

console.log(JSON.stringify({
  schema: "starcraft_tmg_stimpack_move_v2_public_contract_verification_v1",
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  trainingTruth: false,
}, null, 2));
