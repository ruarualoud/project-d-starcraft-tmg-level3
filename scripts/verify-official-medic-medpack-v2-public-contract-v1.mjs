import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1 } from
  "../packages/rule-atoms/official-existing-medic-medpack-v2-contract-closure-rule-slice-v1.mjs";
import {
  applyOfficialStartOfRoundV5,
  enumerateOfficialStartOfRoundActionsV5,
} from
  "../packages/rule-atoms/official-start-of-round-executor-v5.mjs";
import {
  applyOfficialPhaseInitiativeV1,
  enumerateOfficialPhaseInitiativeActionsV1,
} from "../packages/rule-atoms/official-phase-initiative-executor-v1.mjs";
import {
  applyOfficialMedicMedpackActiveV2,
  enumerateOfficialMedicMedpackActiveV2,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID,
} from "../packages/rule-atoms/official-medic-medpack-active-executor-v2.mjs";
import {
  enumerateOfficialStandardMoveV5,
  OFFICIAL_STANDARD_MOVE_V5_PARAMETER_KIND,
} from "../packages/rule-atoms/official-standard-move-executor-v5.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";
import {
  createOfficialCommandCenterDataset,
  getOfficialCurrentProductRecord,
} from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-stimpack-move-v2-contract-closure-v1-report.json",
), "utf8"));
const currentSlice = createOfficialExistingMedicMedpackV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
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
const runtime = createOfficialExecutableRuleRuntimeV1({
  catalogue: currentSlice.catalogue,
});
const ACTION_SCHEMA_CONTENT = Object.freeze({
  kind: "action-schema",
  schemaVersion: "hybrid_legal_space_v24",
});

function executableAction(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

function credentials(engine, envelope, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `slice-66-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `slice-66-${suffix}-session`,
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
  const result = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmed.confirmation,
    seatAuthority: access.authority,
    controlLease: access.lease,
    idempotencyKey: `slice-66-${suffix}`,
  });
  assert.equal(result.ok, true, JSON.stringify(result));
  return result;
}

function model(id, xInches, yInches) {
  return {
    id,
    xInches,
    yInches,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    elevation: "ground",
    supportTerrainIds: [],
    adjacentAccessPointIds: [],
    isOnField: true,
    isDestroyed: false,
  };
}

function unit({ id, recordKey, modelCount, selectedUpgradeNames, xInches }) {
  const record = getOfficialCurrentProductRecord(dataset, recordKey);
  const profile = record.payload.squadProfile.find((row) => {
    const [minimumText, maximumText] = String(row.modelCount).split("-");
    const minimum = Number(minimumText.trim());
    const maximum = Number(maximumText.trim());
    return modelCount >= minimum && modelCount <= maximum;
  });
  assert.ok(profile, `${recordKey}:${modelCount}`);
  return {
    id,
    name: record.payload.name,
    sideKey: "player1",
    officialUnitRecordKey: recordKey,
    sourceRecordHash: record.sourceRecordHash,
    officialPayloadHash: record.payloadHash,
    currentModels: modelCount,
    maxModels: modelCount,
    currentSupply: profile.supply,
    destroyedModelIds: [],
    isOnField: true,
    isInReserves: false,
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
    models: Array.from({ length: modelCount }, (_, index) => (
      model(`${id}-model-${index + 1}`, xInches + (index * 2), 5)
    )),
  };
}

const resourceRecord = getOfficialCurrentProductRecord(
  dataset,
  "tactical_cards:terran_armed_forces",
);
const state = {
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
  officialGameplayDataBundle: gameplayDataBundle,
  activeAbilityUseHistory: [],
  board: {
    widthInches: 54,
    heightInches: 36,
    missionMarkers: structuredClone(
      gameplayDataBundle.reserveDeployDataBundle.deploymentProfile.geometry.missionMarkers,
    ),
    terrain: [],
    accessPoints: [],
    effectMarkers: [],
    tokens: [],
    markers: [],
  },
  cardResources: {
    player1: [{
      id: "player1-terran-armed-forces",
      sideKey: "player1",
      officialCardRecordKey: "tactical_cards:terran_armed_forces",
      cardKind: "faction",
      sourceRecordHash: resourceRecord.sourceRecordHash,
      resource: 1,
      resourceType: "CP",
      readiness: "ready",
      face: "up",
      activeEffects: [],
    }],
    player2: [],
  },
  pieces: [
    unit({
      id: "player1-medic",
      recordKey: "army_units:medic",
      modelCount: 3,
      selectedUpgradeNames: ["Medpack"],
      xInches: 2,
    }),
    unit({
      id: "player1-marine",
      recordKey: "army_units:marine",
      modelCount: 2,
      selectedUpgradeNames: [],
      xInches: 8,
    }),
  ],
  startOfRoundHistory: [],
  gameOver: false,
  terminal: false,
  winner: "",
  terminalReason: "",
  log: [],
};
state.officialMissionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: "1".repeat(64),
  deploymentDraftReceiptHash: "2".repeat(64),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
state.cleanupRefreshHistory = [{
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
state.determineInitiativeHistory = [{
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
state.pieces.find((piece) => piece.id === "player1-marine").damageMarker = 1;

const matchBinding = {
  bindingHash: hashStarcraftTmgContract({
    kind: "ticket-11-slice-66-medic-medpack-v2-public-contract",
  }),
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
const startCandidates = enumerateOfficialStartOfRoundActionsV5(state, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
const enabledStart = startCandidates.find((candidate) => (
  candidate.actionType === "resolve_start_of_round" && candidate.isEnabled === true
));
assert.ok(
  enabledStart,
  `latest official Medic Medpack loadout must be reachable from current Start LegalSpace:`
    + JSON.stringify(startCandidates.filter((candidate) => (
      candidate.actionType === "resolve_start_of_round"
    ))),
);
const started = applyOfficialStartOfRoundV5(
  state,
  executableAction(enabledStart),
  { matchBinding },
);
assert.equal(started.state.officialRoundSupplyState.onTableSupplyBySide.player1, 1);
assert.deepEqual(
  started.state.pieces.map((piece) => piece.statuses),
  [["stationary"], ["stationary"]],
);
const phaseChoice = enumerateOfficialPhaseInitiativeActionsV1(started.state, {
  sideKey: "player1",
}).find((candidate) => candidate.chosenFirstActorSideKey === "player1");
assert.ok(phaseChoice);
const movement = applyOfficialPhaseInitiativeV1(
  started.state,
  executableAction(phaseChoice),
).state;
const standardMove = enumerateOfficialStandardMoveV5(movement, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.ok(
  standardMove.parameterDomains.some((domain) => (
    domain.parameterKind === OFFICIAL_STANDARD_MOVE_V5_PARAMETER_KIND
      && domain.pieceId === "player1-marine"
  )),
  `current Standard Move must remain reachable beside Medic Medpack:`
    + JSON.stringify(standardMove.candidates),
);
const medpackCandidates = enumerateOfficialMedicMedpackActiveV2(movement, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(medpackCandidates.length, 2, JSON.stringify(medpackCandidates));
assert.deepEqual(
  medpackCandidates.map((candidate) => candidate.abilityWindow),
  ["after_action", "before_action"],
);
assert.ok(medpackCandidates.every((candidate) => (
  candidate.executorId === OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID
    && candidate.amount === 2
    && candidate.authorityLineageHash
)));
const beforeAction = medpackCandidates.find((candidate) => (
  candidate.abilityWindow === "before_action"
));
const protectedSupplyHash = hashStarcraftTmgContract({
  officialRoundSupplyState: movement.officialRoundSupplyState,
  supplyLossLedger: movement.supplyLossLedger,
});
const applied = applyOfficialMedicMedpackActiveV2(
  movement,
  executableAction(beforeAction),
  { matchBinding },
);
assert.equal(
  applied.state.pieces.find((piece) => piece.id === "player1-marine").damageMarker,
  0,
);
assert.equal(
  applied.state.pieces.find((piece) => piece.id === "player1-medic")
    .activatedPhases.movement,
  true,
);
assert.equal(applied.state.cardResources.player1[0].readiness, "exhausted");
assert.equal(hashStarcraftTmgContract({
  officialRoundSupplyState: applied.state.officialRoundSupplyState,
  supplyLossLedger: applied.state.supplyLossLedger,
}), protectedSupplyHash);

const runtimeLegal = runtime.enumerate(movement, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.ok(runtimeLegal.parameterDomains.some((domain) => (
  domain.parameterKind === OFFICIAL_STANDARD_MOVE_V5_PARAMETER_KIND
    && domain.pieceId === "player1-marine"
)));
const runtimeMedpack = runtimeLegal.candidates.filter((candidate) => (
  candidate.executorId === OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID
));
assert.equal(runtimeMedpack.length, 2, JSON.stringify(runtimeMedpack));
const runtimeApplied = runtime.apply(
  movement,
  executableAction(runtimeMedpack.find((candidate) => (
    candidate.abilityWindow === "before_action"
  ))),
  { matchBinding },
);
assert.equal(
  runtimeApplied.state.pieces.find((piece) => piece.id === "player1-marine").damageMarker,
  0,
);
assert.equal(runtimeApplied.state.cardResources.player1[0].readiness, "exhausted");
assert.equal(hashStarcraftTmgContract({
  officialRoundSupplyState: runtimeApplied.state.officialRoundSupplyState,
  supplyLossLedger: runtimeApplied.state.supplyLossLedger,
}), protectedSupplyHash);

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-29T00:05:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-slice-66-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function registerReplayDependencies(engine, initial) {
  for (const [kind, content] of [
    ["sourceSnapshot", liveReport.commandSnapshot],
    ["dataSnapshot", gameplayDataBundle],
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

const engine = authoritativeEngine("ticket-11-slice-66-short-seal-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-slice-66-medpack-room",
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
      content: gameplayDataBundle,
    },
  },
  state: structuredClone(state),
});
assert.equal(
  initialEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract(ACTION_SCHEMA_CONTENT),
);
const authorityStart = applyFinite(
  engine,
  initialEnvelope,
  (action) => action.actionType === "resolve_start_of_round"
    && action.executorId === "authority.start-of-round-v5",
  "start-v5",
);
const authorityPhase = applyFinite(
  engine,
  authorityStart.envelope,
  (action) => action.actionType === "choose_first_actor"
    && action.chosenFirstActorSideKey === "player1",
  "movement-initiative",
);
const authorityMedpack = applyFinite(
  engine,
  authorityPhase.envelope,
  (action) => action.executorId === OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID
    && action.abilityWindow === "before_action",
  "medpack-v2",
);
assert.equal(authorityMedpack.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.equal(
  authorityMedpack.receipt.action.executorId,
  OFFICIAL_MEDIC_MEDPACK_ACTIVE_V2_EXECUTOR_ID,
);
assert.equal(
  authorityMedpack.envelope.state.pieces
    .find((piece) => piece.id === "player1-marine").damageMarker,
  0,
);
const replayEngine = authoritativeEngine("ticket-11-slice-66-rotated-seal-v2");
registerReplayDependencies(replayEngine, initialEnvelope);
const journal = [authorityStart.receipt, authorityPhase.receipt, authorityMedpack.receipt];
const replayed = replayEngine.replay({ initialEnvelope, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, authorityMedpack.envelope.stateHash);
const tamperedJournal = structuredClone(journal);
tamperedJournal[2].events.push({ type: "forged_slice_66_event" });
const tamperedReplay = replayEngine.replay({ initialEnvelope, journal: tamperedJournal });
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");

export {
  currentSlice,
  dataset,
  gameplayDataBundle,
  liveReport,
  matchBinding,
  model,
  resourceRecord,
  runtime,
  state,
  unit,
};
