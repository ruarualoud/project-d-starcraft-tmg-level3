#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_ACTIVATION_PASS_ATOM_IDS,
  officialActivationPassAtomIdsForPhaseV1,
} from "../packages/rule-atoms/official-activation-pass-executor-v1.mjs";
import {
  createOfficialActivationPassRuleSliceV1,
} from "../packages/rule-atoms/official-activation-pass-rule-slice-v1.mjs";
import {
  OFFICIAL_ASSAULT_HOLD_ATOM_IDS,
  OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID,
  OFFICIAL_ASSAULT_HOLD_EXECUTOR_VERSION,
} from "../packages/rule-atoms/official-assault-hold-executor-v1.mjs";
import {
  createOfficialAssaultHoldRuleSliceV1,
  verifyOfficialAssaultHoldRuleSliceV1,
} from "../packages/rule-atoms/official-assault-hold-rule-slice-v1.mjs";
import {
  createOfficialExecutableRuleRuntimeV1,
} from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MOVEMENT_HOLD_ATOM_IDS,
} from "../packages/rule-atoms/official-movement-hold-executor-v1.mjs";
import {
  createOfficialMovementHoldRuleSliceV1,
} from "../packages/rule-atoms/official-movement-hold-rule-slice-v1.mjs";
import { resolveExecutableRuleAtoms } from "../packages/rule-atoms/rule-atom-catalogue-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-25T00:00:00.000Z";

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
    activatedPhases: { movement: true, assault: false, combat: false },
    ...extra,
  };
}

function stateFixture() {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "assault",
    activeSideKey: "player1",
    firstPlayerSideKey: "player2",
    firstPassSideByPhase: {},
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 2, player2: 1 },
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    scoringResolvedThisPhase: { player1: false, player2: false },
    mission: { startingSupply: 20, extraSupply: "2 per round", gameLength: 4 },
    board: { widthInches: 54, heightInches: 36, terrain: [], effectMarkers: [] },
    cardResources: {
      player1: [{ id: "resource-1", currentResource: 2, maxResource: 2 }],
      player2: [],
    },
    pieces: [
      piece("p1-unit-1", "player1"),
      piece("p1-unit-2", "player1"),
      piece("p1-reserve", "player1", { isOnField: false }),
      piece("p2-unit-1", "player2"),
      piece("p2-unit-2", "player2"),
    ],
    log: [],
  };
}

function playerCredentials(engine, envelope, sideKey) {
  const authority = engine.issueSeatAuthority({
    grantId: `assault-hold-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `assault-hold-${sideKey}-session`,
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
const passSlice = createOfficialActivationPassRuleSliceV1({
  denominator,
  previousSlice: movementHoldSlice,
});
const slice = createOfficialAssaultHoldRuleSliceV1({
  denominator,
  movementHoldSlice,
  previousSlice: passSlice,
});
const audit = verifyOfficialAssaultHoldRuleSliceV1({
  denominator,
  movementHoldSlice,
  previousSlice: passSlice,
  slice,
});
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

await check("three_assault_hold_atoms_extend_the_cumulative_catalogue_only", () => {
  assert.equal(audit.counts.executableRuleAtoms, 17);
  assert.equal(audit.counts.reviewRequiredRuleAtoms, 895);
  assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
  assert.equal(audit.counts.changedNonTargetAtoms, 0);
  assert.deepEqual(audit.newlyExecutableRuleAtomIds, [...OFFICIAL_ASSAULT_HOLD_ATOM_IDS]);
  assert.deepEqual(audit.executableRuleAtomIds, [
    ...OFFICIAL_ACTIVATION_PASS_ATOM_IDS,
    ...OFFICIAL_ASSAULT_HOLD_ATOM_IDS,
    ...OFFICIAL_MOVEMENT_HOLD_ATOM_IDS,
  ].sort());
});

await check("official_assault_legal_space_contains_only_promoted_hold_and_pass", () => {
  const envelope = engine.createEnvelope({
    roomId: "official-assault-hold-legal-space-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-assault-hold-fixture",
    state: stateFixture(),
  });
  const player1 = playerCredentials(engine, envelope, "player1");
  const legal = engine.legalSpace(envelope, { seatAuthority: player1.authority });
  assert.deepEqual(
    [...new Set(legal.finiteActions.map((row) => row.action.actionType))].sort(),
    ["hold", "pass"],
  );
  assert.equal(legal.parameterDomains.length, 0);
  assert.equal(legal.searchSuggestions.length, 0);
  assert.equal(legal.finiteActions.filter((row) => row.action.actionType === "hold").length, 2);
  assert(legal.finiteActions.filter((row) => row.action.actionType === "hold").every((row) => (
    row.action.phase === "assault"
      && row.action.executorId === OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID
      && row.action.executorVersion === OFFICIAL_ASSAULT_HOLD_EXECUTOR_VERSION
      && row.action.ruleAtomIds.every((atomId) => OFFICIAL_ASSAULT_HOLD_ATOM_IDS.includes(atomId))
  )));
  assert.equal(legal.finiteActions.some((row) => row.action.pieceId === "p1-reserve"), false);
});

await check("hold_marks_only_assault_activation_and_preserves_gameplay_payload", () => {
  const before = stateFixture();
  const initial = engine.createEnvelope({
    roomId: "official-assault-hold-mutation-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-assault-hold-fixture",
    state: before,
  });
  const player1 = playerCredentials(engine, initial, "player1");
  const transition = applyFinite(
    engine,
    initial,
    player1,
    (action) => action.actionType === "hold" && action.pieceId === "p1-unit-1",
    "assault-hold-p1-1",
  );
  const after = transition.applied.envelope.state;
  assert.equal(after.pieces.find((row) => row.id === "p1-unit-1").activatedPhases.assault, true);
  assert.equal(after.pieces.find((row) => row.id === "p1-unit-1").activatedPhases.movement, true);
  assert.deepEqual(after.board, initial.state.board);
  assert.deepEqual(after.cardResources, initial.state.cardResources);
  assert.deepEqual(after.scores, initial.state.scores);
  assert.deepEqual(after.pieces.map(({ activatedPhases: _ignored, ...row }) => row),
    initial.state.pieces.map(({ activatedPhases: _ignored, ...row }) => row));
  assert.equal(after.activeSideKey, "player2");
});

await check("wrong_phase_inactive_passed_destroyed_reserve_and_repeat_units_receive_no_hold_authority", () => {
  const wrongPhaseState = stateFixture();
  wrongPhaseState.phase = "movement";
  const wrongPhaseEnvelope = engine.createEnvelope({
    roomId: "official-assault-hold-wrong-phase-room",
    state: wrongPhaseState,
  });
  const wrongPhaseCredentials = playerCredentials(engine, wrongPhaseEnvelope, "player1");
  const wrongPhaseLegal = engine.legalSpace(wrongPhaseEnvelope, {
    seatAuthority: wrongPhaseCredentials.authority,
  });
  assert.equal(wrongPhaseLegal.finiteActions.some((row) => (
    row.action.executorId === OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID
  )), false);

  const state = stateFixture();
  state.pieces.find((row) => row.id === "p1-unit-1").activatedPhases.assault = true;
  state.pieces.find((row) => row.id === "p1-unit-2").isDestroyed = true;
  const envelope = engine.createEnvelope({ roomId: "official-assault-hold-rejection-room", state });
  const player1 = playerCredentials(engine, envelope, "player1");
  const player2 = playerCredentials(engine, envelope, "player2");
  const ownLegal = engine.legalSpace(envelope, { seatAuthority: player1.authority });
  assert.equal(ownLegal.finiteActions.some((row) => (
    row.action.executorId === OFFICIAL_ASSAULT_HOLD_EXECUTOR_ID
  )), false);
  const inactiveLegal = engine.legalSpace(envelope, { seatAuthority: player2.authority });
  assert.equal(inactiveLegal.finiteActions.some((row) => row.action.actionType === "hold"), false);

  const passedState = stateFixture();
  passedState.players.player1.passedPhases.assault = true;
  const passedEnvelope = engine.createEnvelope({ roomId: "official-assault-hold-passed-room", state: passedState });
  const passedCredentials = playerCredentials(engine, passedEnvelope, "player1");
  const passedLegal = engine.legalSpace(passedEnvelope, { seatAuthority: passedCredentials.authority });
  assert.equal(passedLegal.finiteActions.some((row) => row.action.actionType === "hold"), false);
});

await check("passed_opponent_receives_consecutive_assault_holds_then_combat_begins", () => {
  const initial = engine.createEnvelope({
    roomId: "official-assault-hold-phase-completion-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-assault-hold-fixture",
    state: stateFixture(),
  });
  const player1 = playerCredentials(engine, initial, "player1");
  const player2 = playerCredentials(engine, initial, "player2");
  const firstPass = applyFinite(
    engine,
    initial,
    player1,
    (action) => action.actionType === "pass",
    "assault-pass-p1-1",
  );
  const firstHold = applyFinite(
    engine,
    firstPass.applied.envelope,
    player2,
    (action) => action.actionType === "hold" && action.pieceId === "p2-unit-1",
    "assault-hold-p2-1",
  );
  assert.equal(firstHold.applied.envelope.state.phase, "assault");
  assert.equal(firstHold.applied.envelope.state.activeSideKey, "player2");
  const secondHold = applyFinite(
    engine,
    firstHold.applied.envelope,
    player2,
    (action) => action.actionType === "hold" && action.pieceId === "p2-unit-2",
    "assault-hold-p2-2",
  );
  assert.equal(secondHold.applied.envelope.state.phase, "combat");
  assert.equal(secondHold.applied.envelope.state.activeSideKey, "player1");
  assert(secondHold.applied.envelope.state.pieces.filter((row) => row.isOnField)
    .every((row) => row.activatedPhases.assault === true));
  assert(secondHold.applied.receipt.events.some((event) => (
    event.type === "phase_advanced" && event.fromPhase === "assault" && event.phase === "combat"
  )));
  assert(officialActivationPassAtomIdsForPhaseV1("assault").every((atomId) => (
    secondHold.applied.receipt.action.ruleAtomIds.includes(atomId)
  )));
});

await check("preview_receipt_and_replay_preserve_assault_hold_lineage", () => {
  const initial = engine.createEnvelope({
    roomId: "official-assault-hold-replay-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-assault-hold-fixture",
    state: stateFixture(),
  });
  const player1 = playerCredentials(engine, initial, "player1");
  const transition = applyFinite(
    engine,
    initial,
    player1,
    (action) => action.actionType === "hold" && action.pieceId === "p1-unit-1",
    "assault-hold-replay-1",
  );
  assert.deepEqual(transition.finite.action.ruleAtomIds, [...OFFICIAL_ASSAULT_HOLD_ATOM_IDS].sort());
  assert.deepEqual(transition.previewed.preview.core.action.ruleAtomIds,
    transition.finite.action.ruleAtomIds);
  assert.deepEqual(transition.applied.receipt.action.ruleAtomIds,
    transition.finite.action.ruleAtomIds);
  const replayed = engine.replay({ initialEnvelope: initial, journal: [transition.applied.receipt] });
  assert.equal(replayed.ok, true);
  assert.equal(replayed.envelope.stateHash, transition.applied.envelope.stateHash);
});

await check("exact_frozen_dependencies_resolve_all_seventeen_atoms", () => {
  const resolved = resolveExecutableRuleAtoms(slice.catalogue, {
    rulesVersion: slice.catalogue.rulesVersion,
    sourceSnapshotHashes: Object.fromEntries(slice.catalogue.sourceSnapshots.map((row) => [
      row.sourceSnapshotId,
      row.contentHash,
    ])),
    executorVersions: Object.fromEntries(slice.catalogue.executorManifest.map((row) => [
      row.executorId,
      row.executorVersion,
    ])),
  });
  assert.equal(resolved.atomIds.length, 17);
  assert.equal(rulesRuntime.descriptor.executableRuleAtomCount, 17);
  assert.equal(rulesRuntime.descriptor.nonExecutableRuleAtomCount, 1009);
  assert.equal(rulesRuntime.descriptor.productionRoomEligible, false);
});

await check("ctx2skill_harness_and_training_lanes_remain_non_promoting", () => {
  assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
  assert.deepEqual(slice.ctx2skill.promotions, []);
  assert.equal(slice.harness.harnessLoopUsed, true);
  assert.deepEqual(slice.harness.trainingTraceCandidates, []);
  assert.equal(slice.ctx2skill.remainingRuleGaps, 1009);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_assault_hold_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  slice,
  audit,
  runtimeDescriptor: rulesRuntime.descriptor,
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length ? "failed" : "assault_hold_receipt_replay_passed",
    promotions: [],
    blocks: ["remaining_1009_rule_atoms_not_executable"],
    remainingRuleGaps: 1009,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["referee_prompt", "opponent_prompt", "rule_skill_builder_prompt"],
    harnessToolsCalled: ["list_legal_actions", "preview_action", "apply_action", "replay_room"],
    uiTraceEvidence: "contract_only_device_ui_pending",
    agentDecisionEvidence: "assault_hold_is_catalogue_bound_and_phase_scoped",
    memoryTraceEvidence: "no_memory_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "catalogue_or_executor_drift_demotes_assault_hold",
      "receipt_replay_or_phase_handoff_failure_quarantines_assault_hold",
    ],
    userVisibleChecks: [
      "assault_hold_is_visible_only_for_eligible_on_table_units",
      "final_hold_advances_to_combat_with_pass_lineage",
    ],
  },
  rulesTruth: "movement_hold_assault_hold_and_movement_assault_pass",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-assault-hold-rule-slice-v1-report.json"),
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
  counts: audit.counts,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
