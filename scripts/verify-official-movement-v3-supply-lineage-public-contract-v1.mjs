import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  applyOfficialDisengageV3,
  enumerateOfficialDisengageV3,
  instantiateOfficialDisengageV3,
  OFFICIAL_DISENGAGE_V3_PARAMETER_KIND,
} from "../packages/rule-atoms/official-disengage-executor-v3.mjs";
import { createOfficialExistingMovementV3ContractClosureRuleSliceV1 } from
  "../packages/rule-atoms/official-existing-movement-v3-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  applyOfficialPhaseInitiativeV1,
  enumerateOfficialPhaseInitiativeActionsV1,
} from "../packages/rule-atoms/official-phase-initiative-executor-v1.mjs";
import {
  applyOfficialReserveDeployV3,
  enumerateOfficialReserveDeployV3,
  instantiateOfficialReserveDeployV3,
  OFFICIAL_RESERVE_DEPLOY_V3_PARAMETER_KIND,
} from "../packages/rule-atoms/official-reserve-deploy-executor-v3.mjs";
import {
  enumerateOfficialStandardMoveV3,
  OFFICIAL_STANDARD_MOVE_V3_PARAMETER_KIND,
} from "../packages/rule-atoms/official-standard-move-executor-v3.mjs";
import {
  applyOfficialStartOfRoundV3,
  enumerateOfficialStartOfRoundActionsV3,
} from "../packages/rule-atoms/official-start-of-round-executor-v3.mjs";
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
  "build/source-intake/official-rules/command-center/firestore",
);
const RUNTIME_HASH =
  "b08c2b39dddf12f849ceb731107ed785cde813224dd539053317bccb869a3043";
const ACTION_SCHEMA_CONTENT = Object.freeze({
  kind: "action-schema",
  schemaVersion: "hybrid_legal_space_v22",
});

function executableAction(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}

function credentials(engine, envelope, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `movement-v3-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `movement-v3-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function applyFinite(engine, envelope, predicate, suffix) {
  const access = credentials(engine, envelope, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  const finite = legal.finiteActions.find((entry) => predicate(entry.action));
  assert.ok(finite, `${suffix}:${JSON.stringify(legal.disabledDiagnostics)}`);
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
    idempotencyKey: `movement-v3-${suffix}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return applied;
}

function registerReplayDependencies(engine, initial, snapshot, dataBundle, runtime) {
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
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
  });
}

function model(id, input) {
  return {
    id,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    xInches: Number(input.xInches || 0),
    yInches: Number(input.yInches || 0),
    isOnField: input.isOnField !== false,
    isDestroyed: false,
  };
}

function supplyFor(currentModels) {
  return currentModels <= 3 ? 0 : currentModels <= 6 ? 1 : 2;
}

function marine(profile, input) {
  const positions = input.positions || [];
  const currentModels = Number(input.currentModels || positions.length || 1);
  const isOnField = input.isOnField !== false;
  const modelPositions = positions.length > 0
    ? positions
    : Array.from({ length: currentModels }, () => ({ xInches: 0, yInches: 0 }));
  return {
    id: input.id,
    sideKey: input.sideKey,
    officialUnitRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels,
    currentSupply: Number(input.currentSupply ?? supplyFor(currentModels)),
    isOnField,
    isDestroyed: false,
    statuses: input.statuses || [],
    selectedUpgradeNames: [],
    startOfRoundEffects: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: modelPositions.map((position, index) => model(
      `${input.id}-m${index + 1}`,
      { ...position, isOnField },
    )),
  };
}

const liveReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"),
  "utf8",
));
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-standard-move-contract-closure-v1-report.json",
), "utf8"));
const firestorePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const dataset = createOfficialCommandCenterDataset({
  snapshot: liveReport.commandSnapshot,
  firestorePayloads,
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot: liveReport.commandSnapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
  reserveDeployData: true,
});
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: "1".repeat(64),
  deploymentDraftReceiptHash: "2".repeat(64),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const profile = gameplayDataBundle.combatProfileBundle.profiles[0];
const center = { xInches: 20, yInches: 20 };
const followerAngles = [15, 135, 255];
const trappedPositions = [
  { xInches: 19.9, yInches: 20 },
  ...followerAngles.map((degrees) => ({
    xInches: Number((20 + (1.3 * Math.cos((Math.PI * degrees) / 180))).toFixed(3)),
    yInches: Number((20 + (1.3 * Math.sin((Math.PI * degrees) / 180))).toFixed(3)),
  })),
];
const surroundingEnemies = Array.from({ length: 12 }, (_unused, index) => {
  const angle = (Math.PI * 2 * index) / 12;
  return marine(profile, {
    id: `p2-ring-${index + 1}`,
    sideKey: "player2",
    positions: [{
      xInches: Number((center.xInches + (2.5 * Math.cos(angle))).toFixed(3)),
      yInches: Number((center.yInches + (2.5 * Math.sin(angle))).toFixed(3)),
    }],
  });
});
const startState = {
  schemaVersion: "starcraft_tmg_state_v0",
  round: 3,
  phase: "start_of_round",
  activeSideKey: null,
  firstPlayerSideKey: "player1",
  firstPassSideByPhase: {},
  phaseFirstActorByRound: {},
  players: {
    player1: { sideKey: "player1", passedPhases: {} },
    player2: { sideKey: "player2", passedPhases: {} },
  },
  scores: { player1: 3, player2: 4 },
  officialGameplayDataBundle: gameplayDataBundle,
  officialMissionSetupBinding: missionSetupBinding,
  cleanupRefreshHistory: [{
    schema: "starcraft_tmg_official_cleanup_refresh_history_entry_v5",
    round: 2,
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
  }],
  determineInitiativeHistory: [{
    schema: "starcraft_tmg_official_determine_initiative_history_entry_v1",
    round: 2,
    nextRound: 3,
    previousFirstPlayerSideKey: "player2",
    nextFirstPlayerSideKey: "player1",
    scores: { player1: 3, player2: 4 },
    initiativeMode: "trailing_player",
    rollOff: null,
    initiativeResolutionHash: "7".repeat(64),
    trainingTruth: false,
  }],
  board: {
    widthInches: 54,
    heightInches: 36,
    missionMarkers: structuredClone(
      gameplayDataBundle.reserveDeployDataBundle.deploymentProfile.geometry.missionMarkers,
    ),
    effectMarkers: [],
    tokens: [],
    markers: [],
    terrain: [],
    accessPoints: [],
  },
  cardResources: { player1: [], player2: [] },
  pieces: [
    marine(profile, {
      id: "p1-trapped",
      sideKey: "player1",
      positions: trappedPositions,
    }),
    marine(profile, {
      id: "p1-mover",
      sideKey: "player1",
      positions: [{ xInches: 35, yInches: 10 }],
    }),
    marine(profile, {
      id: "p1-reserve",
      sideKey: "player1",
      currentModels: 4,
      currentSupply: 1,
      isOnField: false,
    }),
    ...surroundingEnemies,
  ],
  startOfRoundHistory: [],
  gameOver: false,
  terminal: false,
  winner: "",
  terminalReason: "",
  log: [],
};
const matchBinding = {
  bindingHash: hashStarcraftTmgContract({ kind: "movement-v3-supply-lineage-public" }),
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: RUNTIME_HASH },
};
const startCandidates = enumerateOfficialStartOfRoundActionsV3(startState, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(startCandidates.length, 1);
assert.equal(startCandidates[0].isEnabled, true, JSON.stringify(startCandidates[0]));
const started = applyOfficialStartOfRoundV3(
  startState,
  executableAction(startCandidates[0]),
  { matchBinding },
);
const initiative = enumerateOfficialPhaseInitiativeActionsV1(started.state, {
  sideKey: "player1",
}).find((entry) => entry.chosenFirstActorSideKey === "player1");
const movement = applyOfficialPhaseInitiativeV1(
  started.state,
  executableAction(initiative),
).state;
const acceptance = [];

const disengageDomain = enumerateOfficialDisengageV3(movement, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
}).parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_DISENGAGE_V3_PARAMETER_KIND
    && entry.pieceId === "p1-trapped"
));
assert.ok(disengageDomain);
const disengage = instantiateOfficialDisengageV3(movement, disengageDomain, {
  leadingModelId: "p1-trapped-m1",
  leadingOutcome: "placed",
  path: [{ xMilliInches: 20_000, yMilliInches: 20_000 }],
  placements: [
    { modelId: "p1-trapped-m2", outcome: "casualty" },
    { modelId: "p1-trapped-m3", outcome: "casualty" },
    { modelId: "p1-trapped-m4", outcome: "casualty" },
  ],
}, { matchBinding });
const afterDisengage = applyOfficialDisengageV3(
  movement,
  disengage.action,
  { matchBinding },
).state;
assert.equal(afterDisengage.pieces.find((piece) => piece.id === "p1-trapped").currentModels, 1);
assert.equal(afterDisengage.pieces.find((piece) => piece.id === "p1-trapped").currentSupply, 0);
assert.equal(afterDisengage.supplyLossLedger.entries.length, 1);
assert.equal(
  afterDisengage.supplyLossLedger.entries[0].causalActionHash,
  hashStarcraftTmgContract(disengage.action),
);
assert.equal(afterDisengage.log.at(-1).action.executorId, "authority.disengage-v3");
acceptance.push("real_disengage_v3_supply_loss_is_ledgered_against_the_v3_action");

const standardAfterDisengage = enumerateOfficialStandardMoveV3(afterDisengage, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
const standardDomains = standardAfterDisengage.parameterDomains;
assert.ok(standardDomains.some((entry) => (
  entry.parameterKind === OFFICIAL_STANDARD_MOVE_V3_PARAMETER_KIND
    && entry.pieceId === "p1-mover"
)), JSON.stringify(standardAfterDisengage.candidates));
const reserveDomains = enumerateOfficialReserveDeployV3(afterDisengage, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
}).parameterDomains;
const reserveDomain = reserveDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_RESERVE_DEPLOY_V3_PARAMETER_KIND
    && entry.pieceId === "p1-reserve"
));
assert.ok(reserveDomain);
acceptance.push("standard_move_and_reserve_deploy_v3_consume_disengage_v3_supply_lineage");

const reserve = instantiateOfficialReserveDeployV3(afterDisengage, reserveDomain, {
  leadingModelId: "p1-reserve-m1",
  entryAlongEdgeMilliInches: 10_000,
  path: [{ xMilliInches: 10_000, yMilliInches: 3_000 }],
  placements: [
    { modelId: "p1-reserve-m2", xMilliInches: 8_000, yMilliInches: 3_000 },
    { modelId: "p1-reserve-m3", xMilliInches: 10_000, yMilliInches: 5_000 },
    { modelId: "p1-reserve-m4", xMilliInches: 12_000, yMilliInches: 3_000 },
  ],
}, { matchBinding });
const afterReserve = applyOfficialReserveDeployV3(
  afterDisengage,
  reserve.action,
  { matchBinding },
).state;
assert.equal(afterReserve.log.at(-1).action.executorId, "authority.reserve-deploy-v3");
assert.ok(enumerateOfficialStandardMoveV3(afterReserve, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
}).parameterDomains.some((entry) => entry.pieceId === "p1-mover"));
acceptance.push("standard_move_v3_consumes_disengage_and_reserve_v3_supply_mutations_in_order");

const tampered = structuredClone(afterDisengage);
tampered.supplyLossLedger.entries[0].causalActionHash = "f".repeat(64);
const tamperedMove = enumerateOfficialStandardMoveV3(tampered, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.equal(tamperedMove.parameterDomains.length, 0);
assert.equal(tamperedMove.candidates[0].disabledReason,
  "STANDARD_MOVE_V3_START_OF_ROUND_HANDOFF_INVALID");
acceptance.push("tampered_supply_loss_ledger_fails_closed_before_a_later_move");

const currentSlice = createOfficialExistingMovementV3ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: currentSlice.catalogue });
assert.equal(runtime.descriptor.runtimeHash, RUNTIME_HASH);
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-28T23:55:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-movement-v3-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}
const engine = authoritativeEngine("ticket-11-movement-v3-seal-v1");
const initial = engine.createEnvelope({
  roomId: "official-movement-v3-room",
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
  state: structuredClone(startState),
});
assert.equal(initial.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract(ACTION_SCHEMA_CONTENT));
const authorityStart = applyFinite(
  engine,
  initial,
  (action) => action.actionType === "resolve_start_of_round"
    && action.executorId === "authority.start-of-round-v3",
  "start",
);
const authorityPhase = applyFinite(
  engine,
  authorityStart.envelope,
  (action) => action.actionType === "choose_first_actor"
    && action.chosenFirstActorSideKey === "player1",
  "phase",
);
const authorityAccess = credentials(engine, authorityPhase.envelope, "disengage");
const authorityLegal = engine.legalSpace(authorityPhase.envelope, {
  seatAuthority: authorityAccess.authority,
});
const authorityDomain = authorityLegal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_DISENGAGE_V3_PARAMETER_KIND
    && entry.pieceId === "p1-trapped"
));
assert.ok(authorityDomain, JSON.stringify(authorityLegal.disabledDiagnostics));
const authorityPreview = engine.preview({
  envelope: authorityPhase.envelope,
  seatAuthority: authorityAccess.authority,
  proposal: {
    kind: "parameterized",
    domainId: authorityDomain.domainId,
    parameters: {
      leadingModelId: "p1-trapped-m1",
      leadingOutcome: "placed",
      path: [{ xMilliInches: 20_000, yMilliInches: 20_000 }],
      placements: [
        { modelId: "p1-trapped-m2", outcome: "casualty" },
        { modelId: "p1-trapped-m3", outcome: "casualty" },
        { modelId: "p1-trapped-m4", outcome: "casualty" },
      ],
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
const authorityDisengage = engine.apply({
  envelope: authorityPhase.envelope,
  expectedStateRevision: authorityPhase.envelope.stateRevision,
  preview: authorityPreview.preview,
  confirmation: authorityConfirmed.confirmation,
  seatAuthority: authorityAccess.authority,
  controlLease: authorityAccess.lease,
  idempotencyKey: "movement-v3-disengage",
});
assert.equal(authorityDisengage.ok, true, JSON.stringify(authorityDisengage));
assert.equal(authorityDisengage.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.equal(authorityDisengage.envelope.state.supplyLossLedger.entries.length, 1);
const replayEngine = authoritativeEngine("ticket-11-movement-v3-rotated-seal-v2");
registerReplayDependencies(
  replayEngine,
  initial,
  liveReport.commandSnapshot,
  gameplayDataBundle,
  runtime,
);
const journal = [
  authorityStart.receipt,
  authorityPhase.receipt,
  authorityDisengage.receipt,
];
const replayed = replayEngine.replay({ initialEnvelope: initial, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, authorityDisengage.envelope.stateHash);
const tamperedJournal = structuredClone(journal);
tamperedJournal[2].events.push({ type: "forged_movement_v3_event" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("authority_v3_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

console.log(JSON.stringify({
  schema: "starcraft_tmg_movement_v3_supply_lineage_public_contract_verification_v1",
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  supplyLossEntries: afterDisengage.supplyLossLedger.entries.length,
  trainingTruth: false,
}, null, 2));
