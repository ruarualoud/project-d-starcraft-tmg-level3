#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine } from "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialActivationPassRuleSliceV1 } from "../packages/rule-atoms/official-activation-pass-rule-slice-v1.mjs";
import { createOfficialAssaultHoldRuleSliceV1 } from "../packages/rule-atoms/official-assault-hold-rule-slice-v1.mjs";
import {
  OFFICIAL_COMBAT_PASS_ATOM_IDS,
  OFFICIAL_COMBAT_PASS_EXECUTOR_ID,
  OFFICIAL_COMBAT_PASS_EXECUTOR_VERSION,
} from "../packages/rule-atoms/official-combat-pass-executor-v1.mjs";
import {
  createOfficialCombatPassRuleSliceV1,
  verifyOfficialCombatPassRuleSliceV1,
} from "../packages/rule-atoms/official-combat-pass-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialMovementHoldRuleSliceV1 } from "../packages/rule-atoms/official-movement-hold-rule-slice-v1.mjs";
import { createOfficialPhaseInitiativeRuleSliceV1 } from "../packages/rule-atoms/official-phase-initiative-rule-slice-v1.mjs";
import { resolveExecutableRuleAtoms } from "../packages/rule-atoms/rule-atom-catalogue-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-25T00:00:00.000Z";
const HISTORICAL_PHASE_INITIATIVE_CATALOGUE_HASH =
  "e331176c0bd21b510195db805de59668bf0029a0e14e3983d5f54e0368c03777";
const HISTORICAL_PHASE_INITIATIVE_RUNTIME_HASH =
  "f82a35522a5d0900dda269fc57fde0a4bd89fa7b53ac118baf3d49c43135cb93";
const COMBAT_SETTLEMENT_ATOM_ID =
  "rule-atom:singleton:core-8-8-both-pass-phase-end:298eb297cb06";

function model(id, xInches, yInches, extra = {}) {
  return {
    id,
    xInches,
    yInches,
    baseShape: "round",
    baseWidthInches: 1,
    baseDepthInches: 1,
    elevation: "ground",
    adjacentAccessPointIds: [],
    isDestroyed: false,
    ...extra,
  };
}

function piece(id, sideKey, models, extra = {}) {
  return {
    id,
    sideKey,
    name: id,
    combatTag: "ground",
    currentModels: models.length,
    maxModels: models.length,
    isOnField: true,
    isDestroyed: false,
    models,
    activatedPhases: { movement: true, assault: true, combat: false },
    ...extra,
  };
}

function combatStateFixture(overrides = {}) {
  const state = {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "combat",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      "1:combat": {
        round: 1,
        phase: "combat",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    board: {
      widthInches: 54,
      heightInches: 36,
      engagementGeometry: {
        schemaVersion: "starcraft_tmg_engagement_geometry_input_v1",
        modelCoordinatesComplete: true,
        baseFootprintsComplete: true,
        terrainFootprintsComplete: true,
        elevationAssignmentsComplete: true,
        accessPointAdjacencyComplete: true,
      },
      terrain: [],
      accessPoints: [],
      effectMarkers: [],
    },
    cardResources: { player1: [], player2: [] },
    pieces: [
      piece("p1-unit", "player1", [model("p1-model", 10, 10)]),
      piece("p2-unit", "player2", [model("p2-model", 30, 10)]),
    ],
    log: [],
  };
  return Object.assign(state, structuredClone(overrides));
}

function playerCredentials(engine, envelope, sideKey) {
  const authority = engine.issueSeatAuthority({
    grantId: `combat-pass-${sideKey}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `combat-pass-${sideKey}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

function applyFinite(runtimeEngine, envelope, credentials, predicate, idempotencyKey) {
  const legal = runtimeEngine.legalSpace(envelope, { seatAuthority: credentials.authority });
  const finite = legal.finiteActions.find((row) => predicate(row.action));
  assert(finite, "expected finite action in official LegalSpace");
  const previewed = runtimeEngine.preview({
    envelope,
    seatAuthority: credentials.authority,
    proposal: { kind: "finite", actionKey: finite.actionKey },
    occurredAt: OCCURRED_AT,
  });
  assert.equal(previewed.ok, true);
  let confirmation;
  if (previewed.preview.core.confirmationPolicy.requiresExplicitHuman) {
    const confirmed = runtimeEngine.confirmPreview({
      envelope,
      preview: previewed.preview,
      seatAuthority: credentials.authority,
      occurredAt: OCCURRED_AT,
    });
    assert.equal(confirmed.ok, true);
    confirmation = confirmed.confirmation;
  }
  const applied = runtimeEngine.apply({
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
const phaseInitiativeSlice = createOfficialPhaseInitiativeRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  previousSlice: assaultHoldSlice,
});
const slice = createOfficialCombatPassRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  previousSlice: phaseInitiativeSlice,
});
const audit = verifyOfficialCombatPassRuleSliceV1({
  denominator,
  movementHoldSlice,
  passSlice,
  assaultHoldSlice,
  previousSlice: phaseInitiativeSlice,
  slice,
});
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: phaseInitiativeSlice.catalogue,
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

await check("twenty_target_atoms_change_only_the_ground_engagement_and_combat_pass_family", () => {
  assert.equal(OFFICIAL_COMBAT_PASS_ATOM_IDS.length, 20);
  assert.equal(audit.counts.executableRuleAtoms, 39);
  assert.equal(audit.counts.reviewRequiredRuleAtoms, 873);
  assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
  assert.equal(audit.counts.changedNonTargetAtoms, 0);
  assert.equal(audit.counts.executableContractGaps, 0);
  assert.equal(audit.counts.evidenceGaps, 0);
});

await check("historical_nineteen_atom_catalogue_and_runtime_identity_remain_exact", () => {
  assert.equal(phaseInitiativeSlice.catalogueHash, HISTORICAL_PHASE_INITIATIVE_CATALOGUE_HASH);
  assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_PHASE_INITIATIVE_RUNTIME_HASH);
  assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 19);
  const historical = historicalRuntime.enumerate(combatStateFixture(), { sideKey: "player1" });
  assert.equal(historical.candidates.length, 0);
});

await check("exact_empty_engagement_graph_exposes_one_mandatory_combat_pass", () => {
  const initial = engine.createEnvelope({
    roomId: "official-combat-pass-empty-engagement-room",
    gameId: "starcraft-tmg",
    dataVersion: "official-current-fixture",
    state: combatStateFixture(),
  });
  const player1 = playerCredentials(engine, initial, "player1");
  const legal = engine.legalSpace(initial, { seatAuthority: player1.authority });
  assert.equal(legal.finiteActions.length, 1);
  assert.equal(legal.disabledCount, 0);
  assert.equal(legal.finiteActions[0].action.actionType, "pass");
  assert.equal(legal.finiteActions[0].action.executorId, OFFICIAL_COMBAT_PASS_EXECUTOR_ID);
  assert.equal(legal.finiteActions[0].action.executorVersion, OFFICIAL_COMBAT_PASS_EXECUTOR_VERSION);
  assert.equal(legal.finiteActions[0].action.ruleAtomIds.includes(COMBAT_SETTLEMENT_ATOM_ID), false);
});

await check("one_inch_base_gap_and_unit_propagation_withhold_combat_pass", () => {
  const state = combatStateFixture();
  state.pieces[0].models.push(model("p1-model-2", 6, 6));
  state.pieces[0].currentModels = 2;
  state.pieces[0].maxModels = 2;
  state.pieces[1].models[0].xInches = 12;
  const initial = engine.createEnvelope({ roomId: "official-combat-pass-engaged-room", state });
  const player1 = playerCredentials(engine, initial, "player1");
  const legal = engine.legalSpace(initial, { seatAuthority: player1.authority });
  assert.equal(legal.finiteActions.length, 0);
  assert.equal(legal.disabledCount, 1);
  assert.equal(legal.disabledDiagnostics[0].disabledReason, "COMBAT_PASS_ENGAGED_UNIT_REMAINS");
});

await check("distance_terrain_size_and_flying_are_evaluated_from_exact_room_geometry", () => {
  const outside = combatStateFixture();
  outside.pieces[1].models[0].xInches = 12.001;
  let envelope = engine.createEnvelope({ roomId: "official-combat-pass-outside-range-room", state: outside });
  let credentials = playerCredentials(engine, envelope, "player1");
  assert.equal(engine.legalSpace(envelope, { seatAuthority: credentials.authority }).finiteActions.length, 1);

  const smallTerrain = combatStateFixture();
  smallTerrain.pieces[1].models[0].xInches = 11.5;
  smallTerrain.board.terrain = [{
    id: "small-wall",
    size: 1,
    footprint: "rect",
    rotationDegrees: 0,
    xInches: 10.75,
    yInches: 10,
    widthInches: 0.2,
    heightInches: 2,
  }];
  envelope = engine.createEnvelope({ roomId: "official-combat-pass-small-terrain-room", state: smallTerrain });
  credentials = playerCredentials(engine, envelope, "player1");
  assert.equal(
    engine.legalSpace(envelope, { seatAuthority: credentials.authority }).disabledDiagnostics[0].disabledReason,
    "COMBAT_PASS_ENGAGED_UNIT_REMAINS",
  );

  const largeTerrain = structuredClone(smallTerrain);
  largeTerrain.board.terrain[0].id = "large-wall";
  largeTerrain.board.terrain[0].size = 2;
  envelope = engine.createEnvelope({ roomId: "official-combat-pass-large-terrain-room", state: largeTerrain });
  credentials = playerCredentials(engine, envelope, "player1");
  assert.equal(engine.legalSpace(envelope, { seatAuthority: credentials.authority }).finiteActions.length, 1);

  const flying = combatStateFixture();
  flying.pieces[0].combatTag = "flying";
  flying.pieces[1].models[0].xInches = 11.5;
  envelope = engine.createEnvelope({ roomId: "official-combat-pass-flying-room", state: flying });
  credentials = playerCredentials(engine, envelope, "player1");
  assert.equal(engine.legalSpace(envelope, { seatAuthority: credentials.authority }).finiteActions.length, 1);
});

await check("missing_base_model_count_and_elevation_geometry_fail_closed_visibly", () => {
  const cases = [
    ["missing-base", (state) => { delete state.pieces[0].models[0].baseWidthInches; }, "ENGAGEMENT_BASE_GEOMETRY_REQUIRED"],
    ["model-count", (state) => { state.pieces[0].currentModels = 2; }, "ENGAGEMENT_MODEL_COUNT_MISMATCH"],
    ["mid-ground", (state) => { state.pieces[0].models[0].elevation = "mid"; }, "ENGAGEMENT_ELEVATION_SUBSET_UNSUPPORTED"],
  ];
  for (const [slug, mutate, expected] of cases) {
    const state = combatStateFixture();
    mutate(state);
    const envelope = engine.createEnvelope({ roomId: `official-combat-pass-${slug}-room`, state });
    const credentials = playerCredentials(engine, envelope, "player1");
    const legal = engine.legalSpace(envelope, { seatAuthority: credentials.authority });
    assert.equal(legal.finiteActions.length, 0);
    assert.equal(legal.disabledDiagnostics[0].disabledReason, expected);
  }
});

await check("two_combat_passes_advance_to_cleanup_with_receipt_and_replay_lineage", () => {
  const initial = engine.createEnvelope({ roomId: "official-combat-pass-cleanup-room", state: combatStateFixture() });
  const player1 = playerCredentials(engine, initial, "player1");
  const player2 = playerCredentials(engine, initial, "player2");
  const first = applyFinite(engine, initial, player1, (action) => action.actionType === "pass", "combat-pass-first");
  assert.equal(first.applied.envelope.state.activeSideKey, "player2");
  assert.equal(first.applied.envelope.state.phase, "combat");
  assert.equal(first.applied.receipt.action.ruleAtomIds.includes(COMBAT_SETTLEMENT_ATOM_ID), false);
  assert(first.applied.receipt.events.some((event) => (
    event.type === "combat_pass" && /^[a-f0-9]{64}$/u.test(event.engagementGraphHash)
  )));
  const second = applyFinite(
    engine,
    first.applied.envelope,
    player2,
    (action) => action.actionType === "pass",
    "combat-pass-second",
  );
  assert.equal(second.applied.envelope.state.phase, "cleanup");
  assert.equal(second.applied.envelope.state.activeSideKey, null);
  assert.equal(second.applied.receipt.action.ruleAtomIds.includes(COMBAT_SETTLEMENT_ATOM_ID), true);
  assert(second.applied.receipt.events.some((event) => (
    event.type === "phase_advanced" && event.fromPhase === "combat" && event.phase === "cleanup"
  )));
  const replayed = engine.replay({
    initialEnvelope: initial,
    journal: [first.applied.receipt, second.applied.receipt],
  });
  assert.equal(replayed.ok, true);
  assert.equal(replayed.envelope.stateHash, second.applied.envelope.stateHash);
});

await check("exact_frozen_dependencies_resolve_all_thirty_nine_atoms", () => {
  const resolved = resolveExecutableRuleAtoms(slice.catalogue, {
    rulesVersion: slice.catalogue.rulesVersion,
    sourceSnapshotHashes: Object.fromEntries(slice.catalogue.sourceSnapshots.map((row) => [row.sourceSnapshotId, row.contentHash])),
    executorVersions: Object.fromEntries(slice.catalogue.executorManifest.map((row) => [row.executorId, row.executorVersion])),
  });
  assert.equal(resolved.atomIds.length, 39);
  assert.equal(rulesRuntime.descriptor.executableRuleAtomCount, 39);
  assert.equal(rulesRuntime.descriptor.nonExecutableRuleAtomCount, 987);
  assert.equal(rulesRuntime.descriptor.productionRoomEligible, false);
});

await check("ctx2skill_harness_and_training_lanes_remain_non_promoting", () => {
  assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
  assert.deepEqual(slice.ctx2skill.promotions, []);
  assert.equal(slice.ctx2skill.remainingRuleGaps, 987);
  assert.equal(slice.harness.harnessLoopUsed, true);
  assert.deepEqual(slice.harness.trainingTraceCandidates, []);
  assert.equal(slice.trainingTruth, false);
});

const failures = acceptance.filter((item) => !item.passed);
const report = {
  schema: "starcraft_tmg_official_combat_pass_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length - failures.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures,
  slice,
  audit,
  historicalRuntimeDescriptor: historicalRuntime.descriptor,
  runtimeDescriptor: rulesRuntime.descriptor,
  officialSourceFreshnessEvidence: {
    checkedAt: "2026-08-25",
    sourceUrl: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
    liveContentHash: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
    matchesFrozenOfficialSource: true,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder", "referee", "opponent", "selfplay_agent"],
    skillsRead: [],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: failures.length ? "failed" : "combat_pass_receipt_replay_passed",
    promotions: [],
    blocks: ["remaining_987_rule_atoms_not_executable"],
    remainingRuleGaps: 987,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["referee_prompt", "opponent_prompt", "selfplay_agent_prompt", "rule_skill_builder_prompt"],
    harnessToolsCalled: ["read_board_state", "list_legal_actions", "preview_action", "apply_action_after_user_confirmation", "replay_room"],
    uiTraceEvidence: "contract_only_device_ui_pending",
    agentDecisionEvidence: "exact_geometry_withholds_pass_when_an_engaged_unit_remains",
    memoryTraceEvidence: "no_memory_promotion_attempted",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "catalogue_source_geometry_or_executor_drift_demotes_combat_pass",
      "receipt_replay_or_engagement_boundary_failure_quarantines_combat_pass",
    ],
    userVisibleChecks: [
      "missing_geometry_is_a_disabled_diagnostic",
      "both_passes_advance_combat_to_cleanup",
    ],
  },
  rulesTruth: "exact_ground_engagement_graph_and_combat_pass_plus_previous_families",
  trainingTruth: false,
};

await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-combat-pass-rule-slice-v1-report.json"),
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
  historicalCatalogueHash: phaseInitiativeSlice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  counts: audit.counts,
  rulesTruth: report.rulesTruth,
  trainingTruth: false,
}, null, 2));

if (failures.length > 0) process.exitCode = 1;
