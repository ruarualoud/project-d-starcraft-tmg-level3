#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_MOVEMENT_HOLD_ATOM_IDS,
  OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID,
  OFFICIAL_MOVEMENT_HOLD_EXECUTOR_VERSION,
  applyOfficialMovementHoldV1,
  enumerateOfficialMovementHoldActionsV1,
} from "../packages/rule-atoms/official-movement-hold-executor-v1.mjs";
import {
  createOfficialMovementHoldRuleSliceV1,
  verifyOfficialMovementHoldRuleSliceV1,
} from "../packages/rule-atoms/official-movement-hold-rule-slice-v1.mjs";
import { resolveExecutableRuleAtoms } from "../packages/rule-atoms/rule-atom-catalogue-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-25T00:00:00.000Z";

function clone(value) {
  return structuredClone(value);
}

function stateFixture() {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "movement",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    supplyDestroyedThisRound: { player1: 0, player2: 0 },
    scoringResolvedThisPhase: { player1: false, player2: false },
    board: { widthInches: 54, heightInches: 36, terrain: [], effectMarkers: [] },
    cardResources: {
      player1: [{ id: "p1-card", currentResource: 2, maxResource: 2 }],
      player2: [],
    },
    pieces: [
      {
        id: "p1-roach",
        sideKey: "player1",
        name: "Roaches",
        xInches: 10,
        yInches: 12,
        currentModels: 3,
        isOnField: true,
        isDestroyed: false,
        statuses: ["BURROWED"],
        damageMarker: 1,
        activatedPhases: { movement: false, assault: false, combat: false },
      },
      {
        id: "p2-marine",
        sideKey: "player2",
        name: "Marines",
        xInches: 30,
        yInches: 12,
        currentModels: 5,
        isOnField: true,
        isDestroyed: false,
        statuses: [],
        activatedPhases: { movement: false, assault: false, combat: false },
      },
    ],
    log: [],
  };
}

const denominatorReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-canonical-rule-atom-denominator-v1-report.json"),
  "utf8",
));
const denominator = denominatorReport.denominator;
const slice = createOfficialMovementHoldRuleSliceV1({ denominator });
const audit = verifyOfficialMovementHoldRuleSliceV1({ denominator, slice });
const acceptance = [];

function check(id, fn) {
  try {
    fn();
    acceptance.push({ id, passed: true });
  } catch (error) {
    acceptance.push({ id, passed: false, error: String(error?.stack || error) });
  }
}

check("three_official_hold_atoms_are_promoted_without_reclassifying_other_rules", () => {
  assert.equal(audit.counts.executableRuleAtoms, 3);
  assert.equal(audit.counts.reviewRequiredRuleAtoms, 909);
  assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
  assert.deepEqual(audit.executableRuleAtomIds, [...OFFICIAL_MOVEMENT_HOLD_ATOM_IDS].sort());
  assert.equal(audit.counts.changedNonTargetAtoms, 0);
});

check("exact_frozen_dependencies_resolve_only_the_hold_slice", () => {
  const sourceSnapshotHashes = Object.fromEntries(slice.catalogue.sourceSnapshots.map((row) => (
    [row.sourceSnapshotId, row.contentHash]
  )));
  const resolved = resolveExecutableRuleAtoms(slice.catalogue, {
    rulesVersion: slice.catalogue.rulesVersion,
    sourceSnapshotHashes,
    executorVersions: { [OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID]: OFFICIAL_MOVEMENT_HOLD_EXECUTOR_VERSION },
  });
  assert.deepEqual(resolved.atomIds, [...OFFICIAL_MOVEMENT_HOLD_ATOM_IDS].sort());
  assert.equal(resolved.trainingTruth, false);
});

check("legal_space_exposes_hold_only_for_the_active_unactivated_on_table_unit", () => {
  const state = stateFixture();
  const legal = enumerateOfficialMovementHoldActionsV1(state, { sideKey: "player1", includeDisabled: true });
  assert.equal(legal.filter((row) => row.isEnabled).length, 1);
  assert.equal(legal[0].pieceId, "p1-roach");
  assert.deepEqual(legal[0].ruleAtomIds, [...OFFICIAL_MOVEMENT_HOLD_ATOM_IDS].sort());
  assert.equal(legal[0].executorId, OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID);
  assert.equal(enumerateOfficialMovementHoldActionsV1(state, { sideKey: "player2" }).length, 0);
});

check("hold_is_a_no_op_except_for_movement_activation_and_turn_handoff", () => {
  const before = stateFixture();
  const protectedBefore = clone({
    board: before.board,
    scores: before.scores,
    cardResources: before.cardResources,
    position: [before.pieces[0].xInches, before.pieces[0].yInches],
    statuses: before.pieces[0].statuses,
    damageMarker: before.pieces[0].damageMarker,
  });
  const result = applyOfficialMovementHoldV1(before, {
    actionType: "hold",
    sideKey: "player1",
    pieceId: "p1-roach",
  }, { sideHasAvailableActivation: (sideKey) => sideKey === "player2", postRevision: 1 });
  assert.equal(result.state.pieces[0].activatedPhases.movement, true);
  assert.equal(result.state.activeSideKey, "player2");
  assert.deepEqual(result.events, [{ type: "hold", pieceId: "p1-roach", phase: "movement" }]);
  assert.deepEqual({
    board: result.state.board,
    scores: result.state.scores,
    cardResources: result.state.cardResources,
    position: [result.state.pieces[0].xInches, result.state.pieces[0].yInches],
    statuses: result.state.pieces[0].statuses,
    damageMarker: result.state.pieces[0].damageMarker,
  }, protectedBefore);
  assert.equal(before.pieces[0].activatedPhases.movement, false);
});

check("wrong_phase_inactive_side_reserve_destroyed_and_repeat_hold_fail_closed", () => {
  const wrongPhase = stateFixture();
  wrongPhase.phase = "assault";
  assert.throws(() => applyOfficialMovementHoldV1(wrongPhase, {
    actionType: "hold", sideKey: "player1", pieceId: "p1-roach",
  }), /HOLD_WRONG_PHASE/u);
  const inactive = stateFixture();
  assert.throws(() => applyOfficialMovementHoldV1(inactive, {
    actionType: "hold", sideKey: "player2", pieceId: "p2-marine",
  }), /HOLD_NOT_ACTIVE_SIDE/u);
  for (const mutation of [
    (state) => { state.pieces[0].isOnField = false; },
    (state) => { state.pieces[0].isDestroyed = true; },
    (state) => { state.pieces[0].activatedPhases.movement = true; },
  ]) {
    const state = stateFixture();
    mutation(state);
    assert.throws(() => applyOfficialMovementHoldV1(state, {
      actionType: "hold", sideKey: "player1", pieceId: "p1-roach",
    }), /HOLD_UNIT_NOT_ON_BATTLEFIELD|HOLD_ALREADY_ACTIVATED/u);
  }
});

check("authority_legal_space_receipt_and_replay_expose_the_same_rule_atom_lineage", () => {
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const envelope = engine.createEnvelope({
    roomId: "official-hold-slice-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-hold-fixture",
    state: stateFixture(),
  });
  const authority = engine.issueSeatAuthority({
    grantId: "hold-player1-grant",
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: "hold-verifier-session",
    leaseFence: 1,
    issuedAtRoomRevision: 0,
  });
  const legal = engine.legalSpace(envelope, { seatAuthority: authority });
  const hold = legal.finiteActions.find((row) => row.action.actionType === "hold");
  assert(hold);
  assert.deepEqual(hold.action.ruleAtomIds, [...OFFICIAL_MOVEMENT_HOLD_ATOM_IDS].sort());
  assert.equal(hold.action.executorId, OFFICIAL_MOVEMENT_HOLD_EXECUTOR_ID);
  const previewResult = engine.preview({
    envelope,
    seatAuthority: authority,
    proposal: { kind: "finite", actionKey: hold.actionKey },
    occurredAt: OCCURRED_AT,
  });
  assert.equal(previewResult.ok, true);
  assert.deepEqual(previewResult.preview.core.action.ruleAtomIds, hold.action.ruleAtomIds);
  const applied = engine.apply({
    envelope,
    preview: previewResult.preview,
    expectedStateRevision: 0,
    seatAuthority: authority,
    controlLease: lease,
    idempotencyKey: "hold-apply-1",
    occurredAt: OCCURRED_AT,
  });
  assert.equal(applied.ok, true);
  assert.deepEqual(applied.receipt.action.ruleAtomIds, hold.action.ruleAtomIds);
  assert.equal(applied.receipt.action.executorVersion, OFFICIAL_MOVEMENT_HOLD_EXECUTOR_VERSION);
  const replayed = engine.replay({ initialEnvelope: envelope, journal: [applied.receipt] });
  assert.equal(replayed.ok, true);
  assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
});

check("ctx2skill_and_harness_receipts_remain_non_promoting", () => {
  assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
  assert.deepEqual(slice.ctx2skill.promotions, []);
  assert.equal(slice.ctx2skill.judgeTestsRun, 6);
  assert.equal(slice.ctx2skill.crossTimeReplayResult, "movement_hold_receipt_replay_passed");
  assert.equal(slice.harness.harnessLoopUsed, true);
  assert.deepEqual(slice.harness.trainingTraceCandidates, []);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_movement_hold_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  slice,
  audit,
  rulesTruth: "movement_hold_only",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-movement-hold-rule-slice-v1-report.json"),
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
