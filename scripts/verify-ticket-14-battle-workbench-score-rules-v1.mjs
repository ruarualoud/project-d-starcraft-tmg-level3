#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { projectStarcraftTmgBattleWorkbenchV1 } from
  "../packages/client-domain/battle-workbench-v1.mjs";
import { projectStarcraftTmgWritePaletteV1 } from
  "../packages/client-domain/battle-workbench-write-palette-v1.mjs";
import {
  classifyStarcraftTmgCurrentFaqRoomBindingV1,
  STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1,
} from "../packages/client-domain/official-faq-current-client-contract-v1.mjs";
import {
  isStarcraftTmgRulesQuickViewV1,
  isStarcraftTmgScoreForecastV1,
  projectStarcraftTmgRulesQuickViewV1,
  projectStarcraftTmgScoreForecastV1,
} from "../packages/room-runtime/battle-workbench-score-rules-query-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT = path.join(ROOT,
  "build/ticket-14-slice-141-score-rules-v1/report.json");
const GENERATED_AT = "2026-09-03T18:00:00.000Z";
const CURRENT = STARCRAFT_TMG_OFFICIAL_FAQ_CURRENT_CLIENT_CONTRACT_V1;

function currentBinding(overrides = {}) {
  return {
    schemaVersion: "starcraft_tmg_rules_runtime_binding_v1",
    runtimeId: "official-faq-v1-current",
    runtimeVersion: "0.112.0-official-faq-v1-current",
    ...CURRENT.roomBindings.current,
    legalSpaceComplete: true,
    developmentSubset: false,
    legacyCompatibilityUsed: false,
    productionRoomEligible: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
    ...overrides,
  };
}

function projection(overrides = {}) {
  const rulesRuntimeBinding = overrides.rulesRuntimeBinding || currentBinding();
  return {
    schemaVersion: "starcraft_tmg_viewer_room_projection_v3",
    room: { roomId: "slice-141-room", stateRevision: 21,
      stateHash: "a".repeat(64) },
    viewer: { seatKey: "player1", roleMode: "player" },
    matchBinding: {
      bindingHash: "b".repeat(64),
      rulesVersion: CURRENT.rulesVersion,
      sourceSnapshotHash: CURRENT.sourceLockHash,
      dataSnapshotHash: "c".repeat(64),
      rulesArtifactHash: "d".repeat(64),
      rulesRuntimeBinding,
      rulesDisplayBinding: {
        schemaVersion: "starcraft_tmg_rules_display_binding_v1",
        artifactId: "official-faq-v1-current-display",
        artifactHash: "e".repeat(64),
        mediaType: "text/markdown",
        locale: "en",
        rulesVersion: CURRENT.rulesVersion,
        availability: "required",
      },
    },
    state: {
      round: 3,
      phase: "cleanup",
      players: {
        player1: { name: "Alpha", sideKey: "player1" },
        player2: { name: "Beta", sideKey: "player2" },
      },
      scores: { player1: 4, player2: 3 },
      mission: { id: "hold-position", name: "Hold Position" },
      officialGameplayDataBundle: { missionScoringProfile: {
        recordKey: "hold-position",
        gameLengthRounds: 5,
        neutralOrOwnAffinityMarkerVp: 1,
        opponentAffinityMarkerVp: 2,
        finalTiebreaker: null,
      } },
      officialMissionSetupBinding: { markerAffinityByNumber: {
        1: "player1", 2: "player2", 3: "player1", 4: "player2", 5: null,
      } },
      board: { missionMarkers: [
        { id: "mission-marker-1", number: 1, controlSideKey: "player1" },
        { id: "mission-marker-2", number: 2, controlSideKey: "player1" },
        { id: "mission-marker-3", number: 3, controlSideKey: "player2" },
        { id: "mission-marker-4", number: 4, controlSideKey: null },
        { id: "mission-marker-5", number: 5, controlSideKey: "player2" },
      ] },
      pieces: [{
        id: "ghost-1", unitId: "ghost", name: "Ghost", sideKey: "player1",
        keywords: ["Cloaked"], abilities: [{ name: "Snipe" }],
        models: [{ id: "ghost-1-model-1" }],
      }],
      ...(overrides.state || {}),
    },
  };
}

function scoringResolution() {
  const body = {
    schema: "starcraft_tmg_official_victory_point_scoring_resolution_v1",
    round: 3,
    simultaneousBeforeScores: { player1: 4, player2: 3 },
    breakdowns: {
      player1: { destroyedEnemySupplyVp: 0, markerVp: 3, roundVp: 3,
        controlledMarkerVp: [] },
      player2: { destroyedEnemySupplyVp: 0, markerVp: 2, roundVp: 2,
        controlledMarkerVp: [] },
    },
    scoringSemantics: "both_players_from_one_before_state_then_atomic_commit",
    rulesTruth: "fixture_exact_legal_scoring_resolution",
    trainingTruth: false,
  };
  return { ...body, scoringResolutionHash: hashStarcraftTmgContract(body) };
}

function legalSpace(runtimeBinding = currentBinding(), options = {}) {
  const resolution = scoringResolution();
  const scoreAction = {
    actionType: "score_victory_points",
    sideKey: "player1",
    scoringResolutionHash: resolution.scoringResolutionHash,
    scoringResolution: resolution,
    executorId: "authority.victory-point-scoring-v2",
    executorVersion: "2.0.0",
    ruleAtomIds: ["rule-atom:singleton:core-12-6-score-victory-points-step:a7e217d2085f"],
  };
  const actions = options.includeScore === false ? [] : [{
    actionKey: "score-action-key", confirmationClass: "explicit_human",
    action: options.scoreAction || scoreAction,
  }];
  actions.push({
    actionKey: "snipe-action-key", confirmationClass: "explicit_human",
    action: {
      actionType: "use_ability", sideKey: "player1", pieceId: "ghost-1",
      abilityName: "Snipe", targetId: "enemy-1",
      executorId: "authority.ghost-snipe-v1", executorVersion: "1.0.0",
      ruleAtomIds: ["rule-atom:faq-v1:ghost-snipe-explicit"],
    },
  });
  return {
    roomId: "slice-141-room",
    matchBindingHash: "b".repeat(64),
    stateRevision: 21,
    stateHash: "a".repeat(64),
    legalSpaceHash: "f".repeat(64),
    rulesRuntimeBinding: runtimeBinding,
    finiteActions: actions,
    parameterDomains: [],
  };
}

const acceptance = [];
function accept(name, operation) {
  operation();
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${name}`);
}

const currentProjection = projection();
const currentLegal = legalSpace();
const exact = projectStarcraftTmgScoreForecastV1({
  roomProjection: currentProjection, legalSpace: currentLegal,
});
const quick = projectStarcraftTmgRulesQuickViewV1({
  roomProjection: currentProjection, legalSpace: currentLegal,
});

accept("current_faq_binding_is_shared_by_rules_queries_and_write_palette", () => {
  const classified = classifyStarcraftTmgCurrentFaqRoomBindingV1(currentBinding());
  assert.equal(classified.status, "current_faq_v1");
  assert.equal(classified.mutationAllowed, true);
  assert.equal(projectStarcraftTmgWritePaletteV1({ legalSpace: currentLegal })
    .ruleGraphIndex.binding.status, "current_faq_v1");
});
accept("hash_valid_current_legal_scoring_action_produces_exact_forecast", () => {
  assert.equal(exact.coverage, "exact");
  assert.equal(exact.forecastMode, "exact");
  assert.deepEqual(exact.deterministicDelta, { player1: 3, player2: 2 });
  assert.deepEqual(exact.projectedScores, { player1: 7, player2: 5 });
  assert.equal(exact.branches[0].classification, "exact");
});
accept("score_write_entry_uses_only_authoritative_preview_confirm_apply_route", () => {
  assert.equal(exact.scoreWriteEntry.actionKey, "score-action-key");
  assert.equal(exact.scoreWriteEntry.enabledForProposal, true);
  assert.equal(exact.scoreWriteEntry.proposalRoute, "preview_finite");
  assert.equal(exact.scoreWriteEntry.writeRoute,
    "legal_space_preview_human_confirm_apply_receipt_replay");
  assert.equal(exact.authority.directScoreEditAllowed, false);
});
accept("tampered_legal_scoring_resolution_is_quarantined", () => {
  const forged = scoringResolution();
  forged.breakdowns.player1.roundVp = 999;
  const result = projectStarcraftTmgScoreForecastV1({
    roomProjection: currentProjection,
    legalSpace: legalSpace(currentBinding(), { scoreAction: {
      actionType: "score_victory_points", sideKey: "player1",
      scoringResolutionHash: forged.scoringResolutionHash,
      scoringResolution: forged,
    } }),
  });
  assert.equal(result.coverage, "quarantined");
  assert.deepEqual(result.unresolved, ["LEGAL_SCORING_RESOLUTION_INTEGRITY_INVALID"]);
});
accept("pre_scoring_window_exposes_conditional_marker_snapshot_not_fake_exactness", () => {
  const result = projectStarcraftTmgScoreForecastV1({
    roomProjection: projection({ state: { phase: "combat" } }),
    legalSpace: legalSpace(currentBinding(), { includeScore: false }),
  });
  assert.equal(result.coverage, "partial");
  assert.equal(result.forecastMode, "conditional");
  assert.deepEqual(result.deterministicDelta, { player1: 3, player2: 3 });
  assert(result.unresolved.includes("future_actions_before_scoring"));
  assert.equal(result.branches[0].classification, "conditional");
});
accept("incomplete_objective_inputs_produce_unknown_branch", () => {
  const result = projectStarcraftTmgScoreForecastV1({
    roomProjection: projection({ state: {
      phase: "movement", officialGameplayDataBundle: null,
      officialMissionSetupBinding: null, board: {},
    } }),
    legalSpace: legalSpace(currentBinding(), { includeScore: false }),
  });
  assert.equal(result.coverage, "unknown");
  assert.equal(result.forecastMode, "unknown");
  assert.equal(result.branches[0].classification, "unknown");
});
accept("terminal_match_is_exact_zero_delta_without_new_action", () => {
  const result = projectStarcraftTmgScoreForecastV1({
    roomProjection: projection({ state: { terminal: true, gameOver: true } }),
    legalSpace: legalSpace(currentBinding(), { includeScore: false }),
  });
  assert.equal(result.forecastMode, "exact");
  assert.deepEqual(result.deterministicDelta, { player1: 0, player2: 0 });
  assert.equal(result.scoreWriteEntry, null);
});
accept("historical_pre_faq_room_retains_read_only_exact_history_without_current_write", () => {
  const historicalRuntime = currentBinding({
    runtimeId: "official-executable-rule-runtime-v1",
    ...CURRENT.roomBindings.historicalPreFaq,
    legacyCompatibilityUsed: true,
  });
  const result = projectStarcraftTmgScoreForecastV1({
    roomProjection: projection({ rulesRuntimeBinding: historicalRuntime }),
    legalSpace: legalSpace(historicalRuntime),
  });
  assert.equal(result.binding.status, "historical_pre_faq");
  assert.equal(result.coverage, "partial");
  assert.equal(result.forecastMode, "exact");
  assert.equal(result.scoreWriteEntry.enabledForProposal, false);
});
accept("mixed_projection_and_legal_space_versions_are_quarantined", () => {
  const historicalRuntime = currentBinding({
    ...CURRENT.roomBindings.historicalPreFaq, legacyCompatibilityUsed: true,
  });
  const result = projectStarcraftTmgScoreForecastV1({
    roomProjection: currentProjection, legalSpace: legalSpace(historicalRuntime),
  });
  assert.equal(result.coverage, "quarantined");
  assert(result.binding.mismatches.includes("rules_runtime_binding"));
  assert.equal(result.scoreWriteEntry.enabledForProposal, false);
});
accept("rules_quick_view_binds_exact_room_display_and_runtime_identities", () => {
  assert.equal(quick.coverage, "partial");
  assert.equal(quick.rulesIdentity.runtimeHash, CURRENT.runtimeHash);
  assert.equal(quick.rulesIdentity.catalogueHash, CURRENT.catalogueHash);
  assert.equal(quick.rulesIdentity.rulesDisplayRef.artifactHash, "e".repeat(64));
  assert.equal(quick.rulesIdentity.rulesDisplayRef.route, "read_historical_rules");
  assert.equal(quick.authority.silentCompatibilityFallbackAllowed, false);
});
accept("selected_unit_links_only_explicit_legal_action_and_rule_atom_lineage", () => {
  const ghost = quick.unitContexts.find((entry) => entry.pieceId === "ghost-1");
  assert.equal(ghost.actionRefs.length, 1);
  assert.equal(ghost.actionRefs[0].actionKey, "snipe-action-key");
  assert.deepEqual(ghost.actionRefs[0].ruleAtomIds,
    ["rule-atom:faq-v1:ghost-snipe-explicit"]);
  assert.equal(ghost.keywords.find((entry) => entry.name === "Snipe").coverage, "exact");
});
accept("unlinked_keyword_remains_unknown_without_fuzzy_compatibility", () => {
  const cloaked = quick.unitContexts[0].keywords.find((entry) => entry.name === "Cloaked");
  assert.equal(cloaked.coverage, "unknown");
  assert.equal(cloaked.actionRefs.length, 0);
  assert.equal(cloaked.unresolvedReason, "no_explicit_legal_space_lineage_at_revision");
});
accept("public_viewer_keeps_room_pinned_rules_but_receives_no_private_action_lineage", () => {
  const result = projectStarcraftTmgRulesQuickViewV1({ roomProjection: currentProjection });
  assert.equal(result.coverage, "partial");
  assert.equal(result.actionContexts.length, 0);
  assert.equal(result.rulesIdentity.rulesDisplayRef.artifactHash, "e".repeat(64));
});
accept("score_and_rules_queries_reject_hash_tampering_or_stale_expectation", () => {
  assert(isStarcraftTmgScoreForecastV1(exact, { roomId: "slice-141-room",
    legalSpaceHash: "f".repeat(64) }));
  assert(isStarcraftTmgRulesQuickViewV1(quick, { stateRevision: 21 }));
  assert.equal(isStarcraftTmgScoreForecastV1({ ...exact, forecastMode: "unknown" }), false);
  assert.equal(isStarcraftTmgRulesQuickViewV1(quick, { stateRevision: 20 }), false);
});
accept("battle_workbench_embeds_server_owned_queries_under_same_snapshot", () => {
  const workbench = projectStarcraftTmgBattleWorkbenchV1({
    roomProjection: currentProjection, legalSpace: currentLegal,
    includeWritePalette: true, scoreForecast: exact, rulesQuickView: quick,
  });
  assert.equal(workbench.scoreForecast.forecastHash, exact.forecastHash);
  assert.equal(workbench.rulesQuickView.quickViewHash, quick.quickViewHash);
  assert.equal(workbench.writeSheet.fields.score.currentLegalActionCount, 1);
  assert.equal(workbench.authority.legalSpaceHash, currentLegal.legalSpaceHash);
});
const [expoPanels, expoWorkspace, matchScreen, battleLab] = await Promise.all([
  readFile(path.join(ROOT,
    "apps/starcraft-tmg-expo/components/battlefield/battle-workbench-read-panels.tsx"),
  "utf8"),
  readFile(path.join(ROOT,
    "apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx"),
  "utf8"),
  readFile(path.join(ROOT, "apps/starcraft-tmg-expo/app/(tabs)/match.tsx"), "utf8"),
  readFile(path.join(ROOT, "apps/starcraft-tmg-battle-lab/app.mjs"), "utf8"),
]);
accept("expo_mounts_forecast_score_preview_and_room_pinned_rules_navigation", () => {
  assert(expoPanels.includes("ScoreForecastCard")
    && expoPanels.includes("onPreviewFinite?.(entry.actionKey)")
    && expoPanels.includes("RulesQuickViewCard"));
  assert(expoWorkspace.includes("onOpenRules={onOpenRoomRules}"));
  assert(matchScreen.includes("onOpenRoomRules={() => setSurface(\"room\")}"));
});
accept("battle_lab_mounts_same_forecast_rules_and_authoritative_score_route", () => {
  assert(battleLab.includes("scoreForecastCard")
    && battleLab.includes("rulesQuickViewCard")
    && battleLab.includes("preview_finite")
    && battleLab.includes("no compatibility fallback"));
});
accept("slice_is_observable_non_mutating_and_outside_training", () => {
  assert.equal(exact.authority.serverOwnedQuery, true);
  assert.equal(exact.authority.nonMutating, true);
  assert.equal(exact.authority.rollsChance, false);
  assert.equal(exact.authority.advancesPhase, false);
  assert.equal(exact.trainingTruth, false);
  assert.equal(quick.trainingTruth, false);
});

assert.equal(acceptance.length, 18);
const reportCore = {
  schemaVersion: "starcraft_tmg_ticket_14_slice_141_score_rules_report_v1",
  status: "passed",
  generatedAt: GENERATED_AT,
  ticket: 14,
  slice: 141,
  ticketProgress: "14/16",
  projectProgress: "13/22",
  assertionsPassed: acceptance.length,
  assertionsTotal: acceptance.length,
  acceptance,
  evidence: {
    forecastHash: exact.forecastHash,
    quickViewHash: quick.quickViewHash,
    currentFaqClientContractHash: CURRENT.clientContractHash,
    exactProjectedScores: exact.projectedScores,
    conditionalProjectionVerified: true,
    unknownProjectionVerified: true,
    directScoreEditAllowed: false,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder"],
    skillsRead: ["ctx2skill-rule-skill-loop"],
    skillsGenerated: [],
    judgeTestsRun: acceptance.length,
    crossTimeReplayResult: "historical_pre_faq_rules_are_visible_read_only",
    promotions: [],
    blocks: ["ticket_14_slices_142_143_pending", "skill_generation_not_authorized_here"],
    remainingRuleGaps: 0,
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: [],
    harnessToolsCalled: ["read_battle_workbench", "list_legal_actions",
      "preview_action", "read_historical_rules"],
    uiTraceEvidence: "expo_and_battle_lab_score_forecast_rules_quick_view",
    agentDecisionEvidence: "none_read_only_client_projection",
    memoryTraceEvidence: "none",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: [
      "invalid_scoring_resolution_hash_quarantines_forecast",
      "mixed_rule_bindings_disable_score_proposal",
      "unlinked_keywords_remain_unknown",
    ],
    userVisibleChecks: ["exact_conditional_unknown_forecast",
      "authoritative_score_preview_route", "contextual_rule_atom_links",
      "historical_rules_read_only"],
  },
  gates: {
    sourceRefreshPerformed: false,
    providerCalled: false,
    skillGenerated: false,
    dshRun: false,
    muzeroDataGenerated: false,
    selfPlayRun: false,
    productionRoomTruth: false,
    trainingTruth: false,
  },
};
const report = { ...reportCore, reportHash: hashStarcraftTmgContract(reportCore) };
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
process.stdout.write(`Ticket 14 Slice 141 passed ${acceptance.length}/${acceptance.length}\n`);
process.stdout.write(`Forecast hash: ${exact.forecastHash}\n`);
process.stdout.write(`Quick view hash: ${quick.quickViewHash}\n`);
process.stdout.write(`Report hash: ${report.reportHash}\n`);
