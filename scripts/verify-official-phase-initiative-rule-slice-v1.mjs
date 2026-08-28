#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import { OFFICIAL_ACTIVATION_PASS_ATOM_IDS } from "../packages/rule-atoms/official-activation-pass-executor-v1.mjs";
import { createOfficialActivationPassRuleSliceV1 } from "../packages/rule-atoms/official-activation-pass-rule-slice-v1.mjs";
import { createOfficialAssaultHoldRuleSliceV1 } from "../packages/rule-atoms/official-assault-hold-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialMovementHoldRuleSliceV1 } from "../packages/rule-atoms/official-movement-hold-rule-slice-v1.mjs";
import {
  OFFICIAL_PHASE_INITIATIVE_ATOM_IDS,
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID,
  OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION,
} from "../packages/rule-atoms/official-phase-initiative-executor-v1.mjs";
import {
  createOfficialPhaseInitiativeRuleSliceV1,
  verifyOfficialPhaseInitiativeRuleSliceV1,
} from "../packages/rule-atoms/official-phase-initiative-rule-slice-v1.mjs";
import { resolveExecutableRuleAtoms } from "../packages/rule-atoms/rule-atom-catalogue-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-25T00:00:00.000Z";
const HISTORICAL_ASSAULT_CATALOGUE_HASH =
  "ad80d7955ec8f3f03f8c425c8612e308da00e1467b21cbfa713ae39a2032985f";
const HISTORICAL_ASSAULT_RUNTIME_HASH =
  "0050ee45a4db07b8f79708e9a2df61c67a6c33aeecf2f9977588335960bde781";
const GENERAL_PHASE_PRIORITY_ATOM_ID = "rule-atom:general-first-player-phase-priority";

function piece(id, sideKey, extra = {}) {
  return {
    id,
    sideKey,
    name: id,
    xInches: sideKey === "player1" ? 10 : 30,
    yInches: id.endsWith("2") ? 18 : 12,
    currentModels: 3,
    maxModels: 3,
    isOnField: true,
    isDestroyed: false,
    statuses: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    ...extra,
  };
}

function stateFixture({ phase = "assault", firstPlayerSideKey = "player1", chosen = false } = {}) {
  const key = `1:${phase}`;
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase,
    activeSideKey: firstPlayerSideKey,
    firstPlayerSideKey,
    firstPassSideByPhase: {},
    phaseFirstActorByRound: chosen ? {
      [key]: {
        round: 1,
        phase,
        markerHolderSideKey: firstPlayerSideKey,
        chosenFirstActorSideKey: firstPlayerSideKey,
      },
    } : {},
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    board: { widthInches: 54, heightInches: 36, terrain: [], effectMarkers: [] },
    cardResources: { player1: [], player2: [] },
    pieces: [
      piece("p1-unit-1", "player1"),
      piece("p1-unit-2", "player1"),
      piece("p2-unit-1", "player2"),
      piece("p2-unit-2", "player2"),
    ],
    log: [],
  };
}

function playerCredentials(engine, envelope, sideKey) {
  const authority = engine.issueSeatAuthority({
    grantId: `phase-initiative-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `phase-initiative-${sideKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function applyFinite(engine, envelope, credentials, predicate, idempotencyKey) {
  const legal = engine.legalSpace(envelope, { seatAuthority: credentials.authority });
  const finite = legal.finiteActions.find((row) => predicate(row.action));
  assert(finite, "expected finite action in official LegalSpace");
  const previewed = engine.preview({
    envelope,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
    occurredAt: OCCURRED_AT,
  });
  assert.equal(previewed.ok, true);
  let confirmation;
  if (previewed.preview.core.confirmationPolicy.requiresExplicitHuman) {
    const confirmed = engine.confirmPreview({
      envelope,
      preview: previewed.preview,
      seatAuthority: credentials.authority,
      occurredAt: OCCURRED_AT,
    });
    assert.equal(confirmed.ok, true);
    confirmation = confirmed.confirmation;
  }
  const applied = engine.apply({
    envelope,
    preview: previewed.preview,
    confirmation,
    expectedStateRevision: envelope.stateRevision,
    seatAuthority: credentials.authority,
    controlLease: credentials.lease,
    idempotencyKey,
    occurredAt: OCCURRED_AT,
  });
  assert.equal(applied.ok, true);
  return { legal, finite, previewed, applied };
}

const denominatorReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-canonical-rule-atom-denominator-v1-report.json"),
  "utf8",
));
const denominator = denominatorReport.denominator;
const movementHoldSlice = createOfficialMovementHoldRuleSliceV1({ denominator });
const passSlice = createOfficialActivationPassRuleSliceV1({ denominator, previousSlice: movementHoldSlice });
const assaultHoldSlice = createOfficialAssaultHoldRuleSliceV1({
  denominator,
  movementHoldSlice,
  previousSlice: passSlice,
});
const slice = createOfficialPhaseInitiativeRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  previousSlice: assaultHoldSlice,
});
const audit = verifyOfficialPhaseInitiativeRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  previousSlice: assaultHoldSlice,
  slice,
});
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: assaultHoldSlice.catalogue });
const rulesRuntime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const engine = createStarcraftTmgAuthoritativeEngine({
  rulesRuntime,
  allowIncompleteRuleRuntimeForDevelopment: true,
  now: () => OCCURRED_AT,
});
const acceptance = [];

async function check(id, fn) {
  try {
    await fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

await check("two_new_atoms_and_one_versioned_reassignment_change_only_the_target_family", () => {
  assert.equal(audit.counts.executableRuleAtoms, 19);
  assert.equal(audit.counts.reviewRequiredRuleAtoms, 893);
  assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
  assert.equal(audit.counts.changedNonTargetAtoms, 0);
  assert.equal(audit.counts.executableContractGaps, 0);
  assert.equal(audit.counts.evidenceGaps, 0);
  assert.deepEqual(audit.newlyExecutableRuleAtomIds, [
    "rule-atom:combat-first-player-priority",
    "rule-atom:singleton:core-11-first-player-phase-activation-choice:3919d6d8e24b",
  ]);
  assert.deepEqual(audit.reassignedExecutableRuleAtomIds, [GENERAL_PHASE_PRIORITY_ATOM_ID]);
  const reassigned = slice.catalogue.atoms.find((atom) => atom.atomId === GENERAL_PHASE_PRIORITY_ATOM_ID);
  assert.equal(reassigned.atomVersion, "2.0.0");
  assert.equal(reassigned.effect.executorId, OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID);
  assert.equal(reassigned.legalSpace.actionType, "choose_first_actor");
});

await check("historical_seventeen_atom_catalogue_and_runtime_identity_remain_exact", () => {
  assert.equal(assaultHoldSlice.catalogueHash, HISTORICAL_ASSAULT_CATALOGUE_HASH);
  assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_ASSAULT_RUNTIME_HASH);
  assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 17);
  const historical = historicalRuntime.enumerate(stateFixture(), { sideKey: "player1" });
  assert.equal(historical.candidates.some((row) => row.actionType === "choose_first_actor"), false);
  assert.deepEqual([...new Set(historical.candidates.map((row) => row.actionType))].sort(), ["hold", "pass"]);
});

await check("pending_phase_exposes_only_two_marker_holder_choices", () => {
  const envelope = engine.createEnvelope({
    roomId: "official-phase-initiative-legal-space-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-phase-initiative-fixture",
    state: stateFixture(),
  });
  const markerHolder = playerCredentials(engine, envelope, "player1");
  const otherSeat = playerCredentials(engine, envelope, "player2");
  const holderLegal = engine.legalSpace(envelope, { seatAuthority: markerHolder.authority });
  const otherLegal = engine.legalSpace(envelope, { seatAuthority: otherSeat.authority });
  assert.deepEqual(holderLegal.finiteActions.map((row) => row.action.actionType), ["choose_first_actor", "choose_first_actor"]);
  assert.deepEqual(
    holderLegal.finiteActions.map((row) => row.action.chosenFirstActorSideKey).sort(),
    ["player1", "player2"],
  );
  assert(holderLegal.finiteActions.every((row) => (
    row.action.executorId === OFFICIAL_PHASE_INITIATIVE_EXECUTOR_ID
      && row.action.executorVersion === OFFICIAL_PHASE_INITIATIVE_EXECUTOR_VERSION
      && row.action.ruleAtomIds.length === OFFICIAL_PHASE_INITIATIVE_ATOM_IDS.length
  )));
  assert.equal(holderLegal.finiteActions.some((row) => ["hold", "pass"].includes(row.action.actionType)), false);
  assert.equal(otherLegal.finiteActions.length, 0);
});

await check("marker_holder_can_choose_the_opponent_then_only_that_seat_activates", () => {
  const initial = engine.createEnvelope({ roomId: "official-phase-initiative-opponent-first-room", state: stateFixture() });
  const player1 = playerCredentials(engine, initial, "player1");
  const player2 = playerCredentials(engine, initial, "player2");
  const chosen = applyFinite(
    engine,
    initial,
    player1,
    (action) => action.actionType === "choose_first_actor" && action.chosenFirstActorSideKey === "player2",
    "phase-initiative-opponent-first",
  );
  const after = chosen.applied.envelope.state;
  assert.equal(after.activeSideKey, "player2");
  assert.deepEqual(after.phaseFirstActorByRound["1:assault"], {
    round: 1,
    phase: "assault",
    markerHolderSideKey: "player1",
    chosenFirstActorSideKey: "player2",
  });
  assert(chosen.applied.receipt.events.some((event) => (
    event.type === "phase_first_actor_chosen" && event.chosenFirstActorSideKey === "player2"
  )));
  const player2Legal = engine.legalSpace(chosen.applied.envelope, { seatAuthority: player2.authority });
  const player1Legal = engine.legalSpace(chosen.applied.envelope, { seatAuthority: player1.authority });
  assert.deepEqual([...new Set(player2Legal.finiteActions.map((row) => row.action.actionType))].sort(), ["hold", "pass"]);
  assert.equal(player1Legal.finiteActions.length, 0);
});

await check("preview_receipt_and_replay_preserve_phase_choice_lineage", () => {
  const initial = engine.createEnvelope({ roomId: "official-phase-initiative-replay-room", state: stateFixture() });
  const player1 = playerCredentials(engine, initial, "player1");
  const transition = applyFinite(
    engine,
    initial,
    player1,
    (action) => action.actionType === "choose_first_actor" && action.chosenFirstActorSideKey === "player1",
    "phase-initiative-replay",
  );
  assert.deepEqual(transition.finite.action.ruleAtomIds, [...OFFICIAL_PHASE_INITIATIVE_ATOM_IDS].sort());
  assert.deepEqual(transition.previewed.preview.core.action.ruleAtomIds, transition.finite.action.ruleAtomIds);
  assert.deepEqual(transition.applied.receipt.action.ruleAtomIds, transition.finite.action.ruleAtomIds);
  assert.equal(transition.previewed.preview.core.confirmationPolicy.requiresExplicitHuman, true);
  const replayed = engine.replay({ initialEnvelope: initial, journal: [transition.applied.receipt] });
  assert.equal(replayed.ok, true);
  assert.equal(replayed.envelope.stateHash, transition.applied.envelope.stateHash);
});

await check("movement_both_pass_handoff_requires_a_fresh_assault_choice", () => {
  const initial = engine.createEnvelope({
    roomId: "official-phase-initiative-movement-handoff-room",
    state: stateFixture({ phase: "movement", chosen: true }),
  });
  const player1 = playerCredentials(engine, initial, "player1");
  const player2 = playerCredentials(engine, initial, "player2");
  const firstPass = applyFinite(engine, initial, player1, (action) => action.actionType === "pass", "initiative-move-pass-1");
  const secondPass = applyFinite(engine, firstPass.applied.envelope, player2, (action) => action.actionType === "pass", "initiative-move-pass-2");
  assert.equal(secondPass.applied.envelope.state.phase, "assault");
  assert.equal(secondPass.applied.envelope.state.phaseFirstActorByRound["1:assault"], undefined);
  const event = secondPass.applied.receipt.events.find((row) => row.type === "phase_advanced");
  assert.equal(event.phaseInitiativePending, true);
  assert.equal(event.initiativeChooserSideKey, "player1");
  const chooserLegal = engine.legalSpace(secondPass.applied.envelope, { seatAuthority: player1.authority });
  assert.deepEqual(chooserLegal.finiteActions.map((row) => row.action.actionType), ["choose_first_actor", "choose_first_actor"]);
});

await check("assault_final_hold_handoff_requires_a_fresh_combat_choice", () => {
  const state = stateFixture({ phase: "assault", chosen: true });
  state.pieces.find((row) => row.id === "p1-unit-2").activatedPhases.assault = true;
  const initial = engine.createEnvelope({ roomId: "official-phase-initiative-combat-handoff-room", state });
  const player1 = playerCredentials(engine, initial, "player1");
  const player2 = playerCredentials(engine, initial, "player2");
  const firstPass = applyFinite(engine, initial, player1, (action) => action.actionType === "pass", "initiative-assault-pass");
  const firstHold = applyFinite(
    engine,
    firstPass.applied.envelope,
    player2,
    (action) => action.actionType === "hold" && action.pieceId === "p2-unit-1",
    "initiative-assault-hold-1",
  );
  const secondHold = applyFinite(
    engine,
    firstHold.applied.envelope,
    player2,
    (action) => action.actionType === "hold" && action.pieceId === "p2-unit-2",
    "initiative-assault-hold-2",
  );
  assert.equal(secondHold.applied.envelope.state.phase, "combat");
  const chooserLegal = engine.legalSpace(secondHold.applied.envelope, { seatAuthority: player1.authority });
  assert.deepEqual(
    chooserLegal.finiteActions.map((row) => row.action.chosenFirstActorSideKey).sort(),
    ["player1", "player2"],
  );
  const combatChoice = applyFinite(
    engine,
    secondHold.applied.envelope,
    player1,
    (action) => action.actionType === "choose_first_actor" && action.chosenFirstActorSideKey === "player2",
    "initiative-combat-choice",
  );
  assert.equal(combatChoice.applied.envelope.state.activeSideKey, "player2");
  assert.equal(
    combatChoice.applied.envelope.state.phaseFirstActorByRound["1:combat"].chosenFirstActorSideKey,
    "player2",
  );
});

await check("current_pass_lineage_excludes_the_reassigned_priority_atom", () => {
  const state = stateFixture({ phase: "assault", chosen: true });
  const pass = rulesRuntime.enumerate(state, { sideKey: "player1" }).candidates
    .find((row) => row.actionType === "pass");
  assert(pass);
  assert.equal(pass.ruleAtomIds.includes(GENERAL_PHASE_PRIORITY_ATOM_ID), false);
  assert(pass.ruleAtomIds.every((atomId) => OFFICIAL_ACTIVATION_PASS_ATOM_IDS.includes(atomId)));
  const historicalPass = historicalRuntime.enumerate(state, { sideKey: "player1" }).candidates
    .find((row) => row.actionType === "pass");
  assert.equal(historicalPass.ruleAtomIds.includes(GENERAL_PHASE_PRIORITY_ATOM_ID), true);
});

await check("exact_frozen_dependencies_resolve_all_nineteen_atoms", () => {
  const resolved = resolveExecutableRuleAtoms(slice.catalogue, {
    rulesVersion: slice.catalogue.rulesVersion,
    sourceSnapshotHashes: Object.fromEntries(slice.catalogue.sourceSnapshots.map((row) => [row.sourceSnapshotId, row.contentHash])),
    executorVersions: Object.fromEntries(slice.catalogue.executorManifest.map((row) => [row.executorId, row.executorVersion])),
  });
  assert.equal(resolved.atomIds.length, 19);
  assert.equal(rulesRuntime.descriptor.executableRuleAtomCount, 19);
  assert.equal(rulesRuntime.descriptor.nonExecutableRuleAtomCount, 1007);
  assert.equal(rulesRuntime.descriptor.productionRoomEligible, false);
});

await check("ctx2skill_harness_and_training_lanes_remain_non_promoting", () => {
  assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
  assert.deepEqual(slice.ctx2skill.promotions, []);
  assert.equal(slice.ctx2skill.remainingRuleGaps, 1007);
  assert.equal(slice.harness.harnessLoopUsed, true);
  assert.deepEqual(slice.harness.trainingTraceCandidates, []);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_phase_initiative_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  slice,
  audit,
  historicalRuntimeDescriptor: historicalRuntime.descriptor,
  runtimeDescriptor: rulesRuntime.descriptor,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length ? "failed" : "phase_initiative_receipt_replay_passed",
    promotions: [],
    blocks: ["remaining_1007_rule_atoms_not_executable"],
    remainingRuleGaps: 1007,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["referee_prompt", "opponent_prompt", "rule_skill_builder_prompt"],
    harnessToolsCalled: ["list_legal_actions", "preview_action", "apply_action", "replay_room"],
    uiTraceEvidence: "contract_only_device_ui_pending",
    agentDecisionEvidence: "marker_holder_choice_is_legal_space_not_runtime_default",
    memoryTraceEvidence: "no_memory_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "catalogue_or_executor_drift_demotes_phase_initiative",
      "receipt_replay_or_phase_handoff_failure_quarantines_phase_initiative",
    ],
    userVisibleChecks: [
      "marker_holder_can_choose_either_seat",
      "movement_and_assault_handoffs_require_fresh_choice",
    ],
  },
  rulesTruth: "phase_first_actor_choice_plus_previous_hold_and_pass",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-phase-initiative-rule-slice-v1-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  failures,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: rulesRuntime.descriptor.runtimeHash,
  historicalCatalogueHash: assaultHoldSlice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  counts: audit.counts,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
