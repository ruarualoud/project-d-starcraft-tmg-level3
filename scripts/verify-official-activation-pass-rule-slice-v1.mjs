#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_ACTIVATION_PASS_ATOM_IDS,
  OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID,
  OFFICIAL_ACTIVATION_PASS_EXECUTOR_VERSION,
  applyOfficialActivationPassV1,
  enumerateOfficialActivationPassActionsV1,
  officialActivationPassAtomIdsForPhaseV1,
} from "../packages/rule-atoms/official-activation-pass-executor-v1.mjs";
import {
  createOfficialActivationPassRuleSliceV1,
  verifyOfficialActivationPassRuleSliceV1,
} from "../packages/rule-atoms/official-activation-pass-rule-slice-v1.mjs";
import {
  createOfficialMovementHoldRuleSliceV1,
} from "../packages/rule-atoms/official-movement-hold-rule-slice-v1.mjs";
import {
  OFFICIAL_MOVEMENT_HOLD_ATOM_IDS,
} from "../packages/rule-atoms/official-movement-hold-executor-v1.mjs";
import { resolveExecutableRuleAtoms } from "../packages/rule-atoms/rule-atom-catalogue-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-25T00:00:00.000Z";

function clone(value) {
  return structuredClone(value);
}

function piece(id, sideKey, activated = false) {
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
    activatedPhases: { movement: activated, assault: false, combat: false },
  };
}

function stateFixture() {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "movement",
    activeSideKey: "player1",
    firstPlayerSideKey: "player2",
    firstPassSideByPhase: {},
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    scoringResolvedThisPhase: { player1: false, player2: false },
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

function issuePlayerAuthority(engine, envelope, sideKey) {
  const authority = engine.issueSeatAuthority({
    grantId: `pass-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `pass-${sideKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function applyFinite(engine, envelope, credentials, actionType, idempotencyKey) {
  const legal = engine.legalSpace(envelope, { seatAuthority: credentials.authority });
  const finite = legal.finiteActions.find((row) => row.action.actionType === actionType);
  assert(finite, `${actionType} must be present in LegalSpace`);
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
const previousSlice = createOfficialMovementHoldRuleSliceV1({ denominator });
const slice = createOfficialActivationPassRuleSliceV1({ denominator, previousSlice });
const audit = verifyOfficialActivationPassRuleSliceV1({ denominator, previousSlice, slice });
const acceptance = [];

function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("eleven_pass_atoms_extend_the_three_hold_atoms_without_reclassifying_other_rules", () => {
  assert.equal(audit.counts.executableRuleAtoms, 14);
  assert.equal(audit.counts.reviewRequiredRuleAtoms, 898);
  assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
  assert.equal(audit.counts.changedNonTargetAtoms, 0);
  assert.deepEqual(
    audit.executableRuleAtomIds,
    [...OFFICIAL_ACTIVATION_PASS_ATOM_IDS, ...OFFICIAL_MOVEMENT_HOLD_ATOM_IDS].sort(),
  );
});

check("pass_is_optional_with_eligible_units_and_mandatory_without_them", () => {
  const optionalState = stateFixture();
  const optional = enumerateOfficialActivationPassActionsV1(optionalState, { sideKey: "player1" });
  assert.equal(optional.length, 1);
  assert.equal(optional[0].isEnabled, true);
  assert.equal(optional[0].details.passKind, "optional");
  assert.deepEqual(optional[0].ruleAtomIds, officialActivationPassAtomIdsForPhaseV1("movement"));
  const mandatoryState = stateFixture();
  for (const row of mandatoryState.pieces.filter((entry) => entry.sideKey === "player1")) {
    row.activatedPhases.movement = true;
  }
  const mandatory = enumerateOfficialActivationPassActionsV1(mandatoryState, { sideKey: "player1" });
  assert.equal(mandatory[0].details.passKind, "mandatory");
  const reserveState = clone(mandatoryState);
  reserveState.pieces.push({
    ...piece("p1-reserve", "player1"),
    isOnField: false,
    activatedPhases: { movement: false, assault: false, combat: false },
  });
  const reserveActivationAvailable = (sideKey, state, phase) => state.pieces.some((row) => (
    row.sideKey === sideKey && row.isOnField === false && row.activatedPhases?.[phase] !== true
  ));
  const reservePass = enumerateOfficialActivationPassActionsV1(reserveState, {
    sideKey: "player1",
    sideHasAvailableActivation: reserveActivationAvailable,
  });
  assert.equal(reservePass[0].details.passKind, "optional");
  const reserveApplied = applyOfficialActivationPassV1(reserveState, {
    actionType: "pass", sideKey: "player1", phase: "movement",
  }, { sideHasAvailableActivation: reserveActivationAvailable });
  assert.equal(reserveApplied.events[0].passKind, "optional");
});

check("first_pass_locks_the_side_marks_unactivated_units_and_transfers_next_phase_priority", () => {
  const before = stateFixture();
  const result = applyOfficialActivationPassV1(before, {
    actionType: "pass",
    sideKey: "player1",
    phase: "movement",
  });
  assert.equal(result.state.phase, "movement");
  assert.equal(result.state.activeSideKey, "player2");
  assert.equal(result.state.players.player1.passedPhases.movement, true);
  assert.equal(result.state.firstPassSideByPhase.movement, "player1");
  assert.equal(result.state.firstPlayerSideKey, "player1");
  assert(result.state.pieces.filter((row) => row.sideKey === "player1")
    .every((row) => row.activatedPhases.movement === true));
  assert.equal(before.players.player1.passedPhases.movement, undefined);
});

check("wrong_phase_inactive_side_and_repeat_pass_fail_closed", () => {
  const wrongPhase = stateFixture();
  wrongPhase.phase = "combat";
  assert.throws(() => applyOfficialActivationPassV1(wrongPhase, {
    actionType: "pass", sideKey: "player1", phase: "combat",
  }), /PASS_WRONG_PHASE/u);
  const inactive = stateFixture();
  assert.throws(() => applyOfficialActivationPassV1(inactive, {
    actionType: "pass", sideKey: "player2", phase: "movement",
  }), /PASS_NOT_ACTIVE_SIDE/u);
  const repeated = applyOfficialActivationPassV1(stateFixture(), {
    actionType: "pass", sideKey: "player1", phase: "movement",
  }).state;
  repeated.activeSideKey = "player1";
  assert.throws(() => applyOfficialActivationPassV1(repeated, {
    actionType: "pass", sideKey: "player1", phase: "movement",
  }), /PASS_ALREADY_PASSED/u);
});

check("passed_opponent_receives_consecutive_holds_then_phase_advances_automatically", () => {
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  let envelope = engine.createEnvelope({
    roomId: "official-pass-completion-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-pass-fixture",
    state: stateFixture(),
  });
  const player1 = issuePlayerAuthority(engine, envelope, "player1");
  const player2 = issuePlayerAuthority(engine, envelope, "player2");
  const firstPass = applyFinite(engine, envelope, player1, "pass", "pass-p1-1");
  envelope = firstPass.applied.envelope;
  assert.equal(envelope.state.activeSideKey, "player2");
  assert.equal(firstPass.legal.finiteActions.some((row) => row.action.actionType === "advance_phase"), false);
  const passedSideLegal = engine.legalSpace(envelope, { seatAuthority: player1.authority });
  assert.equal(passedSideLegal.finiteActions.length, 0);
  assert.equal(passedSideLegal.parameterDomains.length, 0);
  const firstHold = applyFinite(engine, envelope, player2, "hold", "hold-p2-1");
  envelope = firstHold.applied.envelope;
  assert.equal(envelope.state.phase, "movement");
  assert.equal(envelope.state.activeSideKey, "player2");
  const secondHold = applyFinite(engine, envelope, player2, "hold", "hold-p2-2");
  envelope = secondHold.applied.envelope;
  assert.equal(envelope.state.phase, "assault");
  assert.equal(envelope.state.activeSideKey, "player1");
  assert(envelope.state.pieces.every((row) => row.activatedPhases.movement === true));
  assert(secondHold.applied.receipt.events.some((event) => event.type === "phase_advanced"));
  const assaultLegal = engine.legalSpace(envelope, { seatAuthority: player1.authority });
  assert.equal(assaultLegal.finiteActions.some((row) => row.action.actionType === "advance_phase"), false);
  assert(officialActivationPassAtomIdsForPhaseV1("movement")
    .every((atomId) => secondHold.applied.receipt.action.ruleAtomIds.includes(atomId)));
});

check("assault_passes_mark_assault_state_and_enter_combat_under_first_passer_priority", () => {
  let state = stateFixture();
  state.phase = "assault";
  state.firstPlayerSideKey = "player2";
  state.pieces.forEach((row) => {
    row.activatedPhases.movement = true;
    row.activatedPhases.assault = true;
  });
  state = applyOfficialActivationPassV1(state, {
    actionType: "pass", sideKey: "player1", phase: "assault",
  }).state;
  assert.equal(state.activeSideKey, "player2");
  const completed = applyOfficialActivationPassV1(state, {
    actionType: "pass", sideKey: "player2", phase: "assault",
  });
  assert.equal(completed.state.phase, "combat");
  assert.equal(completed.state.activeSideKey, "player1");
  assert(completed.state.pieces.every((row) => row.activatedPhases.assault === true));
  assert(completed.state.pieces.every((row) => row.activatedPhases.combat === false));
});

check("authority_pass_preview_receipt_and_replay_preserve_phase_specific_rule_lineage", () => {
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const initial = engine.createEnvelope({
    roomId: "official-pass-replay-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-pass-fixture",
    state: stateFixture(),
  });
  const player1 = issuePlayerAuthority(engine, initial, "player1");
  const transition = applyFinite(engine, initial, player1, "pass", "pass-replay-1");
  const expectedAtomIds = officialActivationPassAtomIdsForPhaseV1("movement");
  assert.deepEqual(transition.finite.action.ruleAtomIds, expectedAtomIds);
  assert.equal(transition.finite.action.executorId, OFFICIAL_ACTIVATION_PASS_EXECUTOR_ID);
  assert.equal(transition.finite.action.executorVersion, OFFICIAL_ACTIVATION_PASS_EXECUTOR_VERSION);
  assert.deepEqual(transition.previewed.preview.core.action.ruleAtomIds, expectedAtomIds);
  assert.deepEqual(transition.applied.receipt.action.ruleAtomIds, expectedAtomIds);
  const replayed = engine.replay({ initialEnvelope: initial, journal: [transition.applied.receipt] });
  assert.equal(replayed.ok, true);
  assert.equal(replayed.envelope.stateHash, transition.applied.envelope.stateHash);
});

check("exact_frozen_dependencies_resolve_the_cumulative_hold_and_pass_catalogue", () => {
  const sourceSnapshotHashes = Object.fromEntries(slice.catalogue.sourceSnapshots.map((row) => (
    [row.sourceSnapshotId, row.contentHash]
  )));
  const resolved = resolveExecutableRuleAtoms(slice.catalogue, {
    rulesVersion: slice.catalogue.rulesVersion,
    sourceSnapshotHashes,
    executorVersions: Object.fromEntries(slice.catalogue.executorManifest.map((row) => (
      [row.executorId, row.executorVersion]
    ))),
  });
  assert.equal(resolved.atomIds.length, 14);
  assert.equal(resolved.trainingTruth, false);
});

check("ctx2skill_and_harness_evidence_remain_non_promoting", () => {
  assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
  assert.deepEqual(slice.ctx2skill.promotions, []);
  assert.equal(slice.ctx2skill.crossTimeReplayResult, "movement_assault_pass_receipt_replay_passed");
  assert.equal(slice.harness.harnessLoopUsed, true);
  assert.deepEqual(slice.harness.trainingTraceCandidates, []);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_activation_pass_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  slice,
  audit,
  rulesTruth: "movement_hold_and_movement_assault_pass",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-activation-pass-rule-slice-v1-report.json"),
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
  counts: audit.counts,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
