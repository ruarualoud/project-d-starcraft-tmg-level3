#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID,
  OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION,
  OFFICIAL_DISENGAGE_CASUALTY_NEW_ATOM_IDS,
  OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND,
} from "../packages/rule-atoms/official-disengage-casualty-executor-v1.mjs";
import {
  createOfficialDisengageCasualtyRuleSliceV1,
  verifyOfficialDisengageCasualtyRuleSliceV1,
} from "../packages/rule-atoms/official-disengage-casualty-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from "../packages/rule-atoms/official-round-supply-state-v1.mjs";
import { createOfficialSupplyLossLedgerV1 } from "../packages/rule-atoms/official-supply-loss-ledger-v1.mjs";
import { createOfficialCommandCenterDataset } from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from "../packages/source-data/official-mission-setup-binding-v1.mjs";

assert.equal(OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID, "authority.disengage-v2");
assert.equal(OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_VERSION, "2.0.0");
assert.equal(OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND, "official_disengage_path_v2");
assert.equal(OFFICIAL_DISENGAGE_CASUALTY_NEW_ATOM_IDS.length, 2);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-disengage-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialDisengageCasualtyRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialDisengageCasualtyRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 239);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 2);
assert.equal(audit.counts.versionReassignedRuleAtoms, 8);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 673);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 239);
assert.ok(runtime.descriptor.parameterDomainKinds.includes(
  OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND,
));

const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);
const liveReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-live-source-snapshots-report.json"),
  "utf8",
));
const firestorePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const snapshot = liveReport.commandSnapshot;
const dataset = createOfficialCommandCenterDataset({ snapshot, firestorePayloads });
const officialCorePdf = await readFile(path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "StarCraft-TMG_EN.pdf",
));
const officialCorePdfHash = createHash("sha256").update(officialCorePdf).digest("hex");
assert.equal(
  officialCorePdfHash,
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
);
assert.deepEqual(dataset.dataVersions, {
  cardsVersion: "69",
  rulesVersion: "48",
  unitsVersion: "71",
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: ["tactical_cards:academy", "tactical_cards:terran_armed_forces"],
  reserveDeployData: true,
});
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: hashStarcraftTmgContract({ kind: "disengage-casualty-mission" }),
  deploymentDraftReceiptHash: hashStarcraftTmgContract({ kind: "disengage-casualty-deployment" }),
  seatColorAssignment: { player1: "red", player2: "blue" },
});

function marineModel(id, input = {}) {
  return {
    id,
    baseShape: "round",
    baseWidthInches: 1.26,
    baseDepthInches: 1.26,
    xInches: Number(input.xInches || 0),
    yInches: Number(input.yInches || 0),
    isOnField: true,
    isDestroyed: false,
  };
}

function supplyFor(currentModels) {
  return currentModels <= 3 ? 0 : currentModels <= 6 ? 1 : 2;
}

function marinePiece(input) {
  const profile = gameplayDataBundle.reserveDeployDataBundle.unitMovementProfile;
  const positions = input.positions || [];
  const currentModels = Number(input.currentModels || positions.length || 1);
  return {
    id: input.id,
    name: "Marine",
    sideKey: input.sideKey,
    officialUnitRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels,
    currentSupply: Number(input.currentSupply ?? supplyFor(currentModels)),
    isOnField: true,
    isDestroyed: false,
    statuses: input.statuses || [],
    selectedUpgradeNames: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: positions.map((position, index) => marineModel(
      `${input.id}-m${index + 1}`,
      position,
    )),
  };
}

function movementState(input = {}) {
  const round = 3;
  const state = {
    schemaVersion: "starcraft_tmg_state_v0",
    round,
    phase: "movement",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      "3:movement": {
        round,
        phase: "movement",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    officialGameplayDataBundle: gameplayDataBundle,
    officialMissionSetupBinding: missionSetupBinding,
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
    pieces: input.pieces,
    startOfRoundHistory: [],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
  state.supplyLossLedger = createOfficialSupplyLossLedgerV1({
    round,
    rulesRuntimeHash: runtime.descriptor.runtimeHash,
  });
  state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
    state,
    gameplayDataBundle,
    rulesRuntimeHash: runtime.descriptor.runtimeHash,
  });
  state.startOfRoundHistory.push({
    round,
    roundSupplyStateHash: state.officialRoundSupplyState.roundSupplyStateHash,
    trainingTruth: false,
  });
  return state;
}

const basicState = movementState({
  pieces: [
    marinePiece({
      id: "p1-live",
      sideKey: "player1",
      positions: [
        { xInches: 10, yInches: 10 },
        { xInches: 8, yInches: 10 },
        { xInches: 10, yInches: 8 },
        { xInches: 8, yInches: 8 },
      ],
      statuses: ["stationary"],
    }),
    marinePiece({
      id: "p2-live",
      sideKey: "player2",
      positions: [{ xInches: 12, yInches: 10 }],
    }),
  ],
});
const matchBinding = {
  bindingHash: hashStarcraftTmgContract({ kind: "disengage-casualty-binding" }),
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
const legal = runtime.enumerate(basicState, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
const domain = legal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND
));
assert.ok(domain, JSON.stringify(legal.candidates));
assert.equal(domain.executorId, OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID);
assert.deepEqual(domain.parameterSchema.leadingOutcome, ["placed", "casualty"]);
assert.deepEqual(domain.parameterSchema.placementOutcome, ["placed", "casualty"]);
const allPlacedParameters = {
  leadingModelId: "p1-live-m1",
  leadingOutcome: "placed",
  path: [{ xMilliInches: 6_000, yMilliInches: 10_000 }],
  placements: [
    { modelId: "p1-live-m2", outcome: "placed", xMilliInches: 8_000, yMilliInches: 10_000 },
    { modelId: "p1-live-m3", outcome: "placed", xMilliInches: 6_000, yMilliInches: 12_000 },
    { modelId: "p1-live-m4", outcome: "placed", xMilliInches: 4_000, yMilliInches: 10_000 },
  ],
};
const allPlaced = runtime.instantiate(basicState, domain, allPlacedParameters, { matchBinding });
assert.equal(allPlaced.action.executorId, OFFICIAL_DISENGAGE_CASUALTY_EXECUTOR_ID);
assert.equal(allPlaced.action.disengagePlan.outcome, "success");
assert.deepEqual(allPlaced.action.disengagePlan.casualtyModelIds, []);
assert.throws(
  () => runtime.instantiate(basicState, domain, {
    ...allPlacedParameters,
    placements: [
      { modelId: "p1-live-m2", outcome: "casualty" },
      ...allPlacedParameters.placements.slice(1),
    ],
  }, { matchBinding }),
  /DISENGAGE_CASUALTY_NOT_REQUIRED/u,
);

const surroundedCenter = { xInches: 20, yInches: 20 };
const surroundingEnemies = Array.from({ length: 12 }, (_unused, index) => {
  const angle = (Math.PI * 2 * index) / 12;
  return marinePiece({
    id: `p2-ring-${index + 1}`,
    sideKey: "player2",
    positions: [{
      xInches: Number((surroundedCenter.xInches + (2.5 * Math.cos(angle))).toFixed(3)),
      yInches: Number((surroundedCenter.yInches + (2.5 * Math.sin(angle))).toFixed(3)),
    }],
  });
});
const ordinaryCasualtyState = movementState({
  pieces: [
    marinePiece({
      id: "p1-trapped-followers",
      sideKey: "player1",
      positions: [
        { xInches: 19.9, yInches: 20 },
        { xInches: 21.217, yInches: 20.326 },
      ],
      statuses: ["stationary"],
    }),
    ...surroundingEnemies,
  ],
});
const ordinaryLegal = runtime.enumerate(ordinaryCasualtyState, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
const ordinaryDomain = ordinaryLegal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND
));
assert.ok(ordinaryDomain, JSON.stringify(ordinaryLegal.candidates));
const ordinaryCasualty = runtime.instantiate(ordinaryCasualtyState, ordinaryDomain, {
  leadingModelId: "p1-trapped-followers-m1",
  leadingOutcome: "placed",
  path: [{ xMilliInches: 20_000, yMilliInches: 20_000 }],
  placements: [{ modelId: "p1-trapped-followers-m2", outcome: "casualty" }],
}, { matchBinding });
assert.equal(ordinaryCasualty.action.disengagePlan.outcome, "ordinary_model_casualties");
assert.deepEqual(
  ordinaryCasualty.action.disengagePlan.casualtyModelIds,
  ["p1-trapped-followers-m2"],
);
assert.equal(
  ordinaryCasualty.action.disengagePlan.endpointFeasibilityReceipts[0]
    .physicalEndpointExists,
  false,
);
assert.equal(ordinaryCasualty.action.disengagePlan.currentModelsAfter, 1);
assert.equal(ordinaryCasualty.action.disengagePlan.supplyDelta, 0);

const leadingFailureFriendlyPositions = [
  { xInches: 20, yInches: 20 },
  { xInches: 21.26, yInches: 20 },
  { xInches: 20, yInches: 21.26 },
  { xInches: 18.74, yInches: 20 },
];
const leadingFailureEnemies = [];
for (let xIndex = -5; xIndex <= 5; xIndex += 1) {
  for (let yIndex = -5; yIndex <= 5; yIndex += 1) {
    const position = {
      xInches: Number((20 + (xIndex * 1.3)).toFixed(3)),
      yInches: Number((20 + (yIndex * 1.3)).toFixed(3)),
    };
    const overlapsFriendly = leadingFailureFriendlyPositions.some((friendly) => (
      Math.hypot(position.xInches - friendly.xInches, position.yInches - friendly.yInches)
        < 1.26
    ));
    if (overlapsFriendly) continue;
    leadingFailureEnemies.push(marinePiece({
      id: `p2-grid-${xIndex + 5}-${yIndex + 5}`,
      sideKey: "player2",
      positions: [position],
    }));
  }
}
const leadingFailureState = movementState({
  pieces: [
    marinePiece({
      id: "p1-leading-trapped",
      sideKey: "player1",
      positions: leadingFailureFriendlyPositions,
      statuses: ["stationary"],
    }),
    ...leadingFailureEnemies,
  ],
});
const leadingFailureLegal = runtime.enumerate(leadingFailureState, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
const leadingFailureDomain = leadingFailureLegal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND
));
assert.ok(leadingFailureDomain, JSON.stringify(leadingFailureLegal.candidates));
const leadingFailure = runtime.instantiate(leadingFailureState, leadingFailureDomain, {
  leadingModelId: "p1-leading-trapped-m1",
  leadingOutcome: "casualty",
  path: [],
  placements: [],
}, { matchBinding });
assert.equal(leadingFailure.action.disengagePlan.outcome, "leading_model_failure");
assert.equal(leadingFailure.action.disengagePlan.unitMoved, false);
assert.deepEqual(
  leadingFailure.action.disengagePlan.casualtyModelIds,
  ["p1-leading-trapped-m1"],
);
assert.equal(
  leadingFailure.action.disengagePlan.endpointFeasibilityReceipts[0]
    .physicalEndpointExists,
  false,
);
assert.equal(leadingFailure.action.disengagePlan.currentModelsAfter, 3);
assert.equal(leadingFailure.action.disengagePlan.supplyDelta, 1);

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-25T00:00:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-disengage-casualty-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function envelopeForState(engine, roomId, state) {
  return engine.createEnvelope({
    roomId,
    dataVersion: `${snapshot.dataVersions.unitsVersion}/${snapshot.dataVersions.cardsVersion}/${snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-command-center-snapshot", content: snapshot },
      dataSnapshot: { artifactId: "official-gameplay-data-bundle", content: gameplayDataBundle },
    },
    state,
  });
}

function credentials(engine, envelope, sideKey, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `disengage-casualty-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `disengage-casualty-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

const engine = authoritativeEngine("ticket-11-disengage-casualty-seal-v1");
const initialEnvelope = envelopeForState(
  engine,
  "official-disengage-leading-failure-room",
  leadingFailureState,
);
const access = credentials(engine, initialEnvelope, "player1", "leading-failure");
const engineLegal = engine.legalSpace(initialEnvelope, { seatAuthority: access.authority });
const engineDomain = engineLegal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_DISENGAGE_CASUALTY_PARAMETER_KIND
));
assert.ok(engineDomain, JSON.stringify(engineLegal.disabledDiagnostics));
const preview = engine.preview({
  envelope: initialEnvelope,
  seatAuthority: access.authority,
  proposal: {
    kind: "parameterized",
    domainId: engineDomain.domainId,
    parameters: {
      leadingModelId: "p1-leading-trapped-m1",
      leadingOutcome: "casualty",
      path: [],
      placements: [],
    },
  },
});
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = engine.confirmPreview({
  envelope: initialEnvelope,
  preview: preview.preview,
  seatAuthority: access.authority,
});
assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
const applied = engine.apply({
  envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision,
  preview: preview.preview,
  confirmation: confirmation.confirmation,
  seatAuthority: access.authority,
  controlLease: access.lease,
  idempotencyKey: "disengage-leading-failure-v1",
});
assert.equal(applied.ok, true, JSON.stringify(applied));
const failedUnit = applied.envelope.state.pieces.find((piece) => (
  piece.id === "p1-leading-trapped"
));
assert.equal(failedUnit.currentModels, 3);
assert.equal(failedUnit.currentSupply, 0);
assert.equal(failedUnit.models.some((model) => model.id === "p1-leading-trapped-m1"), false);
assert.equal(failedUnit.activatedPhases.movement, true);
assert.equal(failedUnit.statuses.includes("stationary"), false);
assert.deepEqual(
  failedUnit.models.map((model) => [model.id, model.xInches, model.yInches]),
  leadingFailureFriendlyPositions.slice(1).map((position, index) => [
    `p1-leading-trapped-m${index + 2}`,
    position.xInches,
    position.yInches,
  ]),
);
assert.equal(applied.envelope.state.activeSideKey, "player2");
assert.equal(applied.envelope.state.supplyLossLedger.entries.length, 1);
assert.equal(applied.envelope.state.supplyLossLedger.entries[0].causeKind, "disengage_removal");
assert.equal(applied.envelope.state.supplyLossLedger.entries[0].scoreable, false);
assert.equal(applied.envelope.state.supplyLossLedger.entries[0].supplyDelta, 1);
assert.equal(applied.envelope.state.officialRoundSupplyState.onTableSupplyBySide.player1, 0);
assert.equal(applied.envelope.state.officialRoundSupplyState.availableSupplyBySide.player1, 10);
assert.ok(applied.receipt.events.some((event) => event.type === "disengage_casualty"));
assert.ok(applied.receipt.events.some((event) => event.type === "supply_loss_recorded"));
assert.equal(applied.receipt.trainingTruth, false);

const allPlacedApplied = runtime.apply(basicState, allPlaced.action, {
  postRevision: 1,
  matchBinding,
});
assert.equal(allPlacedApplied.ok, true);
assert.equal(allPlacedApplied.state.activeSideKey, "player2");
assert.equal(allPlacedApplied.state.supplyLossLedger.entries.length, 0);
assert.equal(
  allPlacedApplied.state.officialRoundSupplyState.roundSupplyStateHash,
  basicState.officialRoundSupplyState.roundSupplyStateHash,
);
const ordinaryApplied = runtime.apply(ordinaryCasualtyState, ordinaryCasualty.action, {
  postRevision: 1,
  matchBinding,
});
assert.equal(ordinaryApplied.ok, true);
const ordinaryUnit = ordinaryApplied.state.pieces.find((piece) => (
  piece.id === "p1-trapped-followers"
));
assert.equal(ordinaryUnit.currentModels, 1);
assert.deepEqual(ordinaryUnit.models.map((model) => model.id), ["p1-trapped-followers-m1"]);
assert.equal(ordinaryApplied.state.supplyLossLedger.entries.length, 0);
assert.ok(ordinaryApplied.events.some((event) => (
  event.type === "disengage_casualty"
    && event.outcome === "ordinary_model_casualties"
)));
assert.throws(
  () => runtime.instantiate(basicState, domain, {
    leadingModelId: "p1-live-m1",
    leadingOutcome: "casualty",
    path: [],
    placements: [],
  }, { matchBinding }),
  /DISENGAGE_LEADING_FAILURE_NOT_PROVED/u,
);

const replayEngine = authoritativeEngine("ticket-11-disengage-casualty-rotated-seal-v2");
for (const [kind, content] of [
  ["sourceSnapshot", snapshot],
  ["dataSnapshot", gameplayDataBundle],
  ["rulesArtifact", {
    kind: "rules-artifact",
    rulesVersion: runtime.descriptor.rulesVersion,
    rulesRuntimeBinding: initialEnvelope.matchBinding.rulesRuntimeBinding,
  }],
  ["executorArtifact", {
    kind: "executor-artifact",
    authorityVersion: "starcraft_tmg_authority_v2",
    rulesRuntimeHash: initialEnvelope.matchBinding.rulesRuntimeBinding.runtimeHash,
    catalogueHash: initialEnvelope.matchBinding.rulesRuntimeBinding.catalogueHash,
    executorManifest: runtime.descriptor.executorManifest,
  }],
  ["geometryArtifact", {
    kind: "geometry-artifact",
    geometryVersion: "fixed_point_round_base_v1",
  }],
  ["actionSchema", {
    kind: "action-schema",
    schemaVersion: "hybrid_legal_space_v1",
  }],
]) {
  replayEngine.registerDependency({
    kind,
    artifactId: initialEnvelope.matchBinding.dependencies[kind].artifactId,
    content,
  });
}
replayEngine.registerDependency({
  kind: "rulesDisplay",
  artifactId: initialEnvelope.matchBinding.rulesDisplayBinding.artifactId,
  mediaType: "text/markdown",
  locale: "en",
  content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
});
const replayed = replayEngine.replay({
  initialEnvelope,
  journal: [applied.receipt],
});
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
const tamperedJournal = [structuredClone(applied.receipt)];
tamperedJournal[0].events.push({ type: "forged_disengage_casualty" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");

assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);

const acceptance = [
  "catalogue_reassigns_eight_disengage_atoms_and_promotes_only_two_casualty_atoms",
  "current_official_core_command_center_and_p2p_binding_remains_exact",
  "runtime_registers_only_versioned_disengage_v2_parameter_domain",
  "legal_space_requires_explicit_leading_and_remaining_model_outcomes",
  "all_models_placed_path_remains_exact_under_v2_plan_hash",
  "unnecessary_ordinary_casualty_is_rejected_by_rules_owned_proof",
  "ordinary_model_with_no_physical_endpoint_is_removed_while_leading_model_remains",
  "leading_failure_requires_complete_reachable_endpoint_superset_exhaustion",
  "authority_apply_updates_model_supply_round_supply_ledger_and_alternation_atomically",
  "all_placed_and_zero_supply_delta_paths_do_not_create_false_loss_entries",
  "unproved_leading_failure_parameter_source_and_ledger_drift_fail_closed",
  "ed25519_replay_survives_hmac_rotation_and_rejects_tamper",
  "no_skill_dsh_muzero_memory_or_training_promotion_occurs",
];

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(
  historicalRuntime.descriptor.runtimeHash,
  "92b5d5f6c7d56e03ffdf3728712ddd98cfb1a956256e31e76ce32c6dc4a0dbe5",
);
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 237);

const report = {
  schema: "starcraft_tmg_official_disengage_casualty_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  officialCorePdfHash,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  slice,
  audit,
  runtime: runtime.descriptor,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth:
    "official_gauntlet_marine_disengage_ordinary_and_leading_casualty_exact_bounded_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-disengage-casualty-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.slice.catalogueHash,
  runtimeHash: report.runtime.runtimeHash,
  executableRuleAtoms: report.audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: report.audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: report.audit.counts.displayOnlyRuleAtoms,
  forecastRemainingSlices: report.slice.sliceForecast.forecastRemainingSlicesAfterThisSlice,
  trainingTruth: report.trainingTruth,
}, null, 2));
