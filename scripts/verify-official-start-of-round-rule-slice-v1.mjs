#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_START_OF_ROUND_ACTION_TYPE,
  OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS,
  OFFICIAL_START_OF_ROUND_EXECUTOR_ID,
} from "../packages/rule-atoms/official-start-of-round-executor-v1.mjs";
import {
  createOfficialStartOfRoundRuleSliceV1,
  verifyOfficialStartOfRoundRuleSliceV1,
} from "../packages/rule-atoms/official-start-of-round-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialCommandCenterDataset } from "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from "../packages/source-data/official-mission-setup-binding-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);
const OCCURRED_AT = "2026-08-25T00:00:00.000Z";
const HASH_A = "a".repeat(64);
const HISTORICAL_RUNTIME_HASH =
  "7edeb5f2b688a4e12e37241469a47b6f3fa1ee13bcaf029631452ef8c962d558";

async function officialData() {
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
  return {
    snapshot: liveReport.commandSnapshot,
    dataset: createOfficialCommandCenterDataset({
      snapshot: liveReport.commandSnapshot,
      firestorePayloads,
    }),
  };
}

function card(profile, sideKey, suffix, readiness = "ready") {
  return {
    id: `${sideKey}-${suffix}`,
    sideKey,
    officialCardRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    cardKind: profile.cardKind,
    readiness,
    face: readiness === "ready" ? "up" : "down",
    activeEffects: [],
    startOfRoundEffects: [],
  };
}

function marine(profile, input) {
  return {
    id: input.id,
    sideKey: input.sideKey,
    officialUnitRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    currentModels: input.currentModels,
    currentSupply: input.currentSupply,
    isOnField: input.isOnField,
    isDestroyed: input.isDestroyed || false,
    statuses: [],
    selectedUpgradeNames: [],
    startOfRoundEffects: [],
    activatedPhases: { movement: false, assault: false, combat: false },
  };
}

function startState(input) {
  const round = Number(input.round || 3);
  const firstPlayerSideKey = input.firstPlayerSideKey || "player2";
  const unitProfile = input.gameplayDataBundle.combatProfileBundle.profiles[0];
  const [academy, armedForces] = input.gameplayDataBundle.cleanupCardBundle.profiles;
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round,
    phase: "start_of_round",
    activeSideKey: null,
    firstPlayerSideKey,
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      [`${round - 1}:movement`]: {
        round: round - 1,
        phase: "movement",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 5, player2: 3 },
    officialGameplayDataBundle: input.gameplayDataBundle,
    officialMissionSetupBinding: input.missionSetupBinding,
    determineInitiativeHistory: [{
      schema: "starcraft_tmg_official_determine_initiative_history_entry_v1",
      round: round - 1,
      nextRound: round,
      previousFirstPlayerSideKey: "player1",
      nextFirstPlayerSideKey: firstPlayerSideKey,
      scores: { player1: 5, player2: 3 },
      initiativeMode: "trailing_player",
      rollOff: null,
      initiativeResolutionHash: HASH_A,
      trainingTruth: false,
    }],
    board: {
      widthInches: 54,
      heightInches: 36,
      missionMarkers: [],
      effectMarkers: [],
      tokens: [],
      markers: [],
      terrain: [],
      accessPoints: [],
    },
    cardResources: {
      player1: [card(academy, "player1", "academy", "exhausted")],
      player2: [card(armedForces, "player2", "armed-forces")],
    },
    pieces: input.pieces || [
      marine(unitProfile, {
        id: "p1-live-marine",
        sideKey: "player1",
        currentModels: 6,
        currentSupply: 1,
        isOnField: true,
      }),
      marine(unitProfile, {
        id: "p1-reserve-marine",
        sideKey: "player1",
        currentModels: 9,
        currentSupply: 2,
        isOnField: false,
      }),
      marine(unitProfile, {
        id: "p2-live-marine",
        sideKey: "player2",
        currentModels: 9,
        currentSupply: 2,
        isOnField: true,
      }),
    ],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

function credentials(engine, envelope, sideKey, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `start-of-round-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `start-of-round-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function envelopeForState(engine, roomId, snapshot, gameplayDataBundle, state) {
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

function applyStart(engine, envelope, sideKey, suffix) {
  const access = credentials(engine, envelope, sideKey, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  const finite = legal.finiteActions.find((entry) => (
    entry.action.actionType === OFFICIAL_START_OF_ROUND_ACTION_TYPE
  ));
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
    idempotencyKey: `start-of-round-${suffix}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { access, legal, finite, preview, confirmed, applied };
}

function assertDisabled(engine, envelope, sideKey, expectedReason, suffix) {
  const access = credentials(engine, envelope, sideKey, suffix);
  const legal = engine.legalSpace(envelope, { seatAuthority: access.authority });
  assert.equal(legal.finiteActions.some((entry) => (
    entry.action.actionType === OFFICIAL_START_OF_ROUND_ACTION_TYPE
  )), false);
  assert.ok(legal.disabledDiagnostics.some((entry) => (
    entry.action?.actionType === OFFICIAL_START_OF_ROUND_ACTION_TYPE
      && entry.disabledReason === expectedReason
  )), `${suffix}:${expectedReason}:${JSON.stringify(legal.disabledDiagnostics)}`);
}

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-determine-initiative-rule-slice-v1-report.json"),
  "utf8",
));
const acceptance = [];
const slice = createOfficialStartOfRoundRuleSliceV1({ previousSlice: previousReport.slice });
const audit = verifyOfficialStartOfRoundRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 189);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 13);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 723);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
acceptance.push("catalogue_promotes_only_thirteen_start_of_round_atoms");

const { snapshot, dataset } = await officialData();
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: [
    "tactical_cards:academy",
    "tactical_cards:terran_armed_forces",
  ],
});
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: hashStarcraftTmgContract({ kind: "mission-draft-receipt" }),
  deploymentDraftReceiptHash: hashStarcraftTmgContract({ kind: "deployment-draft-receipt" }),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
assert.equal(gameplayDataBundle.missionScoringProfile.startingSupply, 6);
assert.equal(gameplayDataBundle.missionScoringProfile.extraSupplyPerRound, 2);
acceptance.push("latest_official_hold_position_marine_and_card_data_is_hash_bound");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-start-of-round-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

const engine = authoritativeEngine("ticket-11-start-of-round-seal-v1");
const initialState = startState({ gameplayDataBundle, missionSetupBinding });
const initial = envelopeForState(
  engine,
  "official-start-of-round-finite-room",
  snapshot,
  gameplayDataBundle,
  initialState,
);
const step = applyStart(engine, initial, "player2", "finite-round-three");
assert.equal(step.finite.action.executorId, OFFICIAL_START_OF_ROUND_EXECUTOR_ID);
assert.deepEqual(step.finite.action.ruleAtomIds, [...OFFICIAL_START_OF_ROUND_EXECUTOR_ATOM_IDS]);
assert.equal(step.preview.preview.core.chanceTicket, null);
assert.equal(step.applied.envelope.state.phase, "movement");
assert.equal(step.applied.envelope.state.activeSideKey, "player2");
assert.deepEqual(step.applied.envelope.state.officialRoundSupplyState.supplyPoolBySide, {
  player1: 10,
  player2: 10,
});
assert.deepEqual(step.applied.envelope.state.officialRoundSupplyState.onTableSupplyBySide, {
  player1: 1,
  player2: 2,
});
assert.deepEqual(step.applied.envelope.state.officialRoundSupplyState.reserveSupplyBySide, {
  player1: 2,
  player2: 0,
});
assert.deepEqual(step.applied.envelope.state.officialRoundSupplyState.availableSupplyBySide, {
  player1: 9,
  player2: 8,
});
assert.ok(step.applied.envelope.state.pieces
  .filter((piece) => !piece.isDestroyed)
  .every((piece) => piece.statuses.includes("stationary")));
assert.equal(step.applied.envelope.state.cardResources.player1[0].readiness, "ready");
assert.equal(step.applied.envelope.state.cardResources.player1[0].face, "up");
assert.equal(step.applied.envelope.state.startOfRoundHistory.at(-1).trainingTruth, false);
acceptance.push("round_three_supply_stationary_ready_and_history_apply_atomically");

const movementAccess = credentials(engine, step.applied.envelope, "player2", "movement-choice");
const movementLegal = engine.legalSpace(step.applied.envelope, {
  seatAuthority: movementAccess.authority,
});
assert.equal(movementLegal.finiteActions.filter((entry) => (
  entry.action.actionType === "choose_first_actor"
)).length, 2);
acceptance.push("movement_phase_choice_opens_only_after_start_window_receipt");

const beforeLegal = engine.legalSpace(initial, { seatAuthority: step.access.authority });
assert.equal(beforeLegal.finiteActions.some((entry) => (
  entry.action.actionType === "choose_first_actor"
)), false);
acceptance.push("movement_operations_are_not_exposed_before_start_window_resolution");

const unknownEffectState = structuredClone(initialState);
unknownEffectState.pieces[0].startOfRoundEffects.push({ id: "unsupported-trigger" });
assertDisabled(
  engine,
  envelopeForState(engine, "official-start-of-round-unknown-effect-room", snapshot,
    gameplayDataBundle, unknownEffectState),
  "player2",
  "START_OF_ROUND_EFFECT_SCOPE_UNRESOLVED",
  "unknown-effect",
);
const burrowedState = structuredClone(initialState);
burrowedState.pieces[0].statuses.push("burrowed");
assertDisabled(
  engine,
  envelopeForState(engine, "official-start-of-round-burrowed-room", snapshot,
    gameplayDataBundle, burrowedState),
  "player2",
  "START_OF_ROUND_EFFECT_SCOPE_UNRESOLVED",
  "burrowed",
);
acceptance.push("unknown_and_burrowed_start_effects_fail_closed");

const profile = gameplayDataBundle.combatProfileBundle.profiles[0];
const overCapState = startState({
  gameplayDataBundle,
  missionSetupBinding,
  pieces: Array.from({ length: 6 }, (_, index) => marine(profile, {
    id: `over-cap-${index}`,
    sideKey: "player1",
    currentModels: 9,
    currentSupply: 2,
    isOnField: true,
  })),
});
assertDisabled(
  engine,
  envelopeForState(engine, "official-start-of-round-over-cap-room", snapshot,
    gameplayDataBundle, overCapState),
  "player2",
  "START_OF_ROUND_SUPPLY_CAP_EXCEEDED",
  "over-cap",
);
acceptance.push("finite_round_on_table_supply_over_cap_fails_closed");

const wrongSupplyState = structuredClone(initialState);
wrongSupplyState.pieces[0].currentSupply = 2;
assertDisabled(
  engine,
  envelopeForState(engine, "official-start-of-round-wrong-supply-room", snapshot,
    gameplayDataBundle, wrongSupplyState),
  "player2",
  "START_OF_ROUND_CURRENT_SUPPLY_MISMATCH",
  "wrong-supply",
);
acceptance.push("current_supply_must_match_current_official_squad_profile");

const finalState = startState({
  gameplayDataBundle,
  missionSetupBinding,
  round: 5,
  firstPlayerSideKey: "player1",
  pieces: Array.from({ length: 8 }, (_, index) => marine(profile, {
    id: `final-round-${index}`,
    sideKey: index < 6 ? "player1" : "player2",
    currentModels: 9,
    currentSupply: 2,
    isOnField: true,
  })),
});
const finalEnvelope = envelopeForState(engine, "official-start-of-round-final-room", snapshot,
  gameplayDataBundle, finalState);
const finalStep = applyStart(engine, finalEnvelope, "player1", "final-round");
assert.equal(finalStep.applied.envelope.state.officialRoundSupplyState.mode, "unlimited");
assert.deepEqual(finalStep.applied.envelope.state.officialRoundSupplyState.supplyPoolBySide, {
  player1: null,
  player2: null,
});
assert.deepEqual(finalStep.applied.envelope.state.officialRoundSupplyState.availableSupplyBySide, {
  player1: null,
  player2: null,
});
acceptance.push("final_round_supply_is_unlimited_without_erasing_observed_supply");

const staleState = structuredClone(initialState);
const runtimeCandidate = runtime.enumerate(staleState, {
  sideKey: "player2",
  matchBinding: initial.matchBinding,
}).candidates.find((candidate) => (
  candidate.actionType === OFFICIAL_START_OF_ROUND_ACTION_TYPE
));
assert.ok(runtimeCandidate);
const {
  details: _details,
  isEnabled: _isEnabled,
  disabledReason: _disabled,
  score: _score,
  ...staleAction
} = runtimeCandidate;
staleState.cardResources.player1[0].readiness = "ready";
staleState.cardResources.player1[0].face = "up";
assert.throws(
  () => runtime.apply(staleState, staleAction, {
    postRevision: 1,
    matchBinding: initial.matchBinding,
  }),
  /START_OF_ROUND_RESOLUTION_STALE/u,
);
acceptance.push("previewed_start_resolution_rejects_stale_card_material");

const replayEngine = authoritativeEngine("ticket-11-start-of-round-rotated-seal-v2");
for (const [kind, content] of [
  ["sourceSnapshot", snapshot],
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
  ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v1" }],
]) {
  replayEngine.registerDependency({
    kind,
    artifactId: initial.matchBinding.dependencies[kind].artifactId,
    content,
  });
}
replayEngine.registerDependency({
  kind: "rulesDisplay",
  artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
  mediaType: "text/markdown",
  locale: "en",
  content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
});
const replayed = replayEngine.replay({
  initialEnvelope: initial,
  journal: [step.applied.receipt],
});
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, step.applied.envelope.stateHash);
const tamperedJournal = [structuredClone(step.applied.receipt)];
tamperedJournal[0].events.push({ type: "forged_start_of_round" });
const tamperedReplay = replayEngine.replay({ initialEnvelope: initial, journal: tamperedJournal });
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_RUNTIME_HASH);
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 176);
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
acceptance.push("historical_slice16_runtime_and_rules_display_remain_frozen");

assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_official_start_of_round_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  dataVersions: dataset.dataVersions,
  liveOfficialRevalidation: previousReport.liveOfficialRevalidation,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  slice,
  audit,
  runtime: runtime.descriptor,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_hold_position_start_of_round_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-start-of-round-rule-slice-v1-report.json"),
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
  trainingTruth: report.trainingTruth,
}, null, 2));
