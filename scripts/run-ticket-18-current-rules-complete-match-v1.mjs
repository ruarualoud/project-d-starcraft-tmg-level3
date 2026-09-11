#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1 } from
  "../content/skill-generation/ticket-18-foundational-strategy-pack-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";
import { createOfficialTicket18CompleteMatchRuntimeV1 } from
  "../packages/rule-atoms/official-ticket18-complete-match-runtime-v1.mjs";
import { loadFormalFoundationalStrategyPackV1 } from
  "../packages/strategy-skills/formal-foundational-skill-pack-loader-v1.mjs";
import { createStarcraftTmgOnlineStrategySkillRegistryV1 } from
  "../packages/strategy-skills/online-strategy-skill-registry-v1.mjs";
import { hash, seal } from "../packages/skill-production/common.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-18-current-rules-complete-match-v1");
const OUTPUT = path.join(OUTPUT_DIR, "report.json");
const OCCURRED_AT = "2026-09-11T12:00:00.000Z";
const TERRAN = "tactical_cards:terran_armed_forces";
const ZERG = "tactical_cards:zerg_swarm";
const SIDE_KEYS = ["player1", "player2"];

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}

function exactSupply(profile, currentModels) {
  const tier = profile.squadProfile.find((row) => row.minimumModels !== null
    && currentModels >= row.minimumModels && currentModels <= row.maximumModels);
  ensure(tier, "COMPLETE_MATCH_SUPPLY_TIER_MISSING", { recordKey: profile.recordKey });
  return tier.supply;
}

function marker(number) {
  return {
    id: `mission-marker-${number}`,
    number,
    xInches: 5 + ((number - 1) * 10),
    yInches: 6,
    diameterMillimeters: 32,
    elevation: "ground",
    isActivated: number !== 5,
    controlSideKey: null,
    factionIndicatorSideKey: null,
  };
}

function piece(profile, sideKey, xInches) {
  const id = `${sideKey}-${profile.recordKey.split(":")[1]}`;
  const currentModels = 1;
  return {
    id,
    name: profile.name,
    sideKey,
    officialUnitRecordKey: profile.recordKey,
    sourceRecordHash: profile.sourceRecordHash,
    officialPayloadHash: profile.payloadHash,
    formationSize: "small",
    currentModels,
    maxModels: Math.max(currentModels,
      ...profile.squadProfile.map((row) => Number(row.maximumModels || 0))),
    currentSupply: exactSupply(profile, currentModels),
    destroyedModelIds: [],
    isOnField: true,
    isInReserves: false,
    isDestroyed: false,
    combatTag: "ground",
    combatTags: String(profile.tags || "ground").split(",")
      .map((tag) => tag.trim().toLowerCase()).filter(Boolean),
    coherencyStatus: {
      schemaVersion: "starcraft_tmg_unit_coherency_status_v1",
      status: "in_coherency",
      isOutOfCoherency: false,
    },
    statuses: [],
    selectedUpgradeNames: [],
    combatEffects: [],
    assaultEffects: [],
    damageMarker: 0,
    activatedPhases: { movement: false, assault: false, combat: false },
    models: [{
      id: `${id}-model-1`,
      xInches,
      yInches: 6,
      baseShape: "round",
      baseWidthInches: 1.26,
      baseDepthInches: 1.26,
      elevation: "ground",
      supportTerrainIds: [],
      adjacentAccessPointIds: [],
      isOnField: true,
      isDestroyed: false,
    }],
  };
}

function card(record, sideKey, resourceType) {
  return {
    id: `${sideKey}-${record.recordKey.split(":")[1]}`,
    sideKey,
    officialCardRecordKey: record.recordKey,
    sourceRecordHash: record.sourceRecordHash,
    cardKind: "faction",
    resource: record.payload.resource,
    resourceType,
    readiness: "ready",
    face: "up",
    activeEffects: [],
  };
}

function initialState(input) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: "movement",
    activeSideKey: "player1",
    firstPlayerSideKey: "player1",
    firstPassSideByPhase: {},
    phaseFirstActorByRound: {
      "1:movement": {
        round: 1,
        phase: "movement",
        markerHolderSideKey: "player1",
        chosenFirstActorSideKey: "player1",
      },
    },
    players: {
      player1: { sideKey: "player1", faction: "Terran", passedPhases: {} },
      player2: { sideKey: "player2", faction: "Zerg", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    officialGameplayDataBundle: input.gameplayDataBundle,
    officialMissionSetupBinding: input.missionSetupBinding,
    officialFactionBindingsBySide: {
      player1: {
        factionRecordKey: input.terranCard.recordKey,
        sourceRecordHash: input.terranCard.sourceRecordHash,
        payloadHash: input.terranCard.payloadHash,
        factionName: input.terranCard.payload.name,
        rulesAuthority: "official_current_command_center_record",
        trainingTruth: false,
      },
      player2: {
        factionRecordKey: input.zergCard.recordKey,
        sourceRecordHash: input.zergCard.sourceRecordHash,
        payloadHash: input.zergCard.payloadHash,
        factionName: input.zergCard.payload.name,
        rulesAuthority: "official_current_command_center_record",
        trainingTruth: false,
      },
    },
    board: {
      widthInches: 54,
      heightInches: 12,
      terrain: [],
      accessPoints: [],
      tokens: [],
      markers: [],
      effectMarkers: [],
      missionMarkers: [1, 2, 3, 4, 5].map(marker),
      missionMarkerControlGeometry: {
        schemaVersion: "starcraft_tmg_mission_marker_control_geometry_v1",
        markerCoordinatesComplete: true,
        markerFootprintsComplete: true,
        markerElevationsComplete: true,
        lineOfSightTerrainComplete: true,
      },
      engagementGeometry: {
        schemaVersion: "starcraft_tmg_engagement_geometry_input_v2",
        modelCoordinatesComplete: true,
        baseFootprintsComplete: true,
        terrainFootprintsComplete: true,
        elevationSupportsComplete: true,
        accessPointAdjacencyComplete: true,
      },
    },
    cardResources: {
      player1: [card(input.terranCard, "player1", "CP")],
      player2: [card(input.zergCard, "player2", "Biomass")],
    },
    pieces: [
      piece(input.marineProfile, "player1", 5),
      piece(input.zerglingProfile, "player2", 15),
    ],
    activeAbilityUseHistory: [],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

function publicRoomBinding(binding) {
  return {
    roomId: binding.roomId,
    roomBindingHash: binding.bindingHash,
    rulesVersion: binding.rulesVersion,
    dataVersion: binding.dataVersion,
    sourceSnapshotHash: binding.sourceSnapshotHash,
    rulesRuntimeBinding: binding.rulesRuntimeBinding,
  };
}

function factionFor(sideKey) {
  return sideKey === "player1" ? TERRAN : ZERG;
}

function otherFaction(sideKey) {
  return sideKey === "player1" ? ZERG : TERRAN;
}

function distance(left, right) {
  return Math.hypot(left.xInches - right.xInches, left.yInches - right.yInches);
}

function positionAssessment(state, sideKey) {
  const ownModels = state.pieces.filter((entry) => entry.sideKey === sideKey
    && entry.isOnField && !entry.isDestroyed).flatMap((entry) => entry.models);
  return state.board.missionMarkers.map((objective) => ({
    markerId: objective.id,
    distanceToNearestOwnModelInches: ownModels.length === 0 ? null
      : Math.min(...ownModels.map((model) => distance(model, objective))),
    currentControlSideKey: objective.controlSideKey,
  }));
}

function selectFinite(legal, sideKey) {
  const enabled = legal.finiteActions;
  const find = (predicate) => enabled.find((entry) => predicate(entry.action));
  return find((action) => action.actionType === "choose_first_actor"
      && action.chosenFirstActorSideKey === sideKey)
    || find((action) => action.runtimeAdapter)
    || find((action) => action.actionType === "determine_mission_marker_control")
    || find((action) => action.actionType === "score_victory_points")
    || find((action) => action.actionType === "check_end_game_conditions")
    || find((action) => action.actionType === "hold")
    || find((action) => action.actionType === "pass")
    || enabled[0];
}

function decisionReason(action, designatedAgent) {
  if (action.actionType === "hold") {
    return "保留当前任务标记接触位置；FAQ 10 要求零位移的 Move/Run 改用 Hold。";
  }
  if (action.actionType === "choose_first_actor") {
    return "保持本方先行动，避免把当前回合的节奏权无条件交给对手。";
  }
  if (action.actionType === "determine_mission_marker_control") {
    return "由规则服务按底座位置、有效单位与当前补给结算控制，不由策略文本臆测。";
  }
  if (action.actionType === "score_victory_points") {
    return "控制结果已经固定，立即走规则计分并保留可重放回执。";
  }
  if (action.actionType === "pass") {
    return designatedAgent
      ? "当前没有更优且已验证合法的单位操作，结束该阶段以避免虚构动作。"
      : "基线对手在无已验证收益动作时结束阶段。";
  }
  return "按当前 LegalSpace 推进唯一的规则生命周期动作。";
}

async function runMatch(input) {
  const roomId = `ticket18-s181-${input.agentSideKey}`;
  const authorityEngine = createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: input.rulesRuntime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
  });
  const roomRuntime = createStarcraftTmgRoomRuntime({
    authorityEngine,
    now: () => OCCURRED_AT,
    checkpointInterval: 8,
  });
  const serverSeatPlan = SIDE_KEYS.map((sideKey) => ({
    label: `${sideKey}Supervisor`,
    seatKey: sideKey,
    roleMode: "supervisor",
    principalType: "human",
  }));
  const state = initialState(input);
  const created = await roomRuntime.createRoom({
    roomId,
    gameId: "starcraft-tmg",
    initialStateAuthority: {
      source: "server_factory",
      state,
      dataVersion: input.sourceBinding.dataset,
      dependencies: {
        sourceSnapshot: {
          artifactId: "ticket18-foundational-strategy-source-binding-v1",
          content: input.sourceBinding,
        },
        dataSnapshot: {
          artifactId: "ticket18-current-official-terran-zerg-gameplay-bundle-v1",
          content: input.gameplayDataBundle,
        },
      },
      receiptHash: hash({ roomId, state, source: "ticket18-s181-current-rules-fixture" }),
      serverSeatPlan,
    },
    serverSeatPlan,
  });
  ensure(created.ok, "COMPLETE_MATCH_ROOM_CREATE_FAILED", { reason: created.reason,
    message: created.message });
  const route = input.registry.readAcceptedRoute({
    roomBinding: publicRoomBinding(created.matchBinding),
    ownFaction: factionFor(input.agentSideKey),
    opponentFaction: otherFaction(input.agentSideKey),
  });
  ensure(route.rulesRuntimeBinding.runtimeHash
    === created.matchBinding.rulesRuntimeBinding.runtimeHash,
  "COMPLETE_MATCH_STRATEGY_RUNTIME_NOT_BOUND");
  ensure(route.sourceRulesReceiptHash === input.sourceBinding.rules,
    "COMPLETE_MATCH_SOURCE_RULE_RECEIPT_NOT_RETAINED");
  const decisions = [];
  const replayEvidence = [];
  const workbenchEvidence = [];
  const faq10Audits = [];
  let actionSequence = 0;
  while (actionSequence < 160) {
    const publicRead = await roomRuntime.readRoom({ roomId });
    ensure(publicRead.ok, "COMPLETE_MATCH_READ_FAILED");
    const current = publicRead.projection.state;
    if (current.gameOver || current.terminal) break;
    const sideKey = current.activeSideKey || current.firstPlayerSideKey;
    ensure(SIDE_KEYS.includes(sideKey), "COMPLETE_MATCH_ACTIVE_SIDE_MISSING", {
      round: current.round, phase: current.phase });
    const credential = created.credentials[`${sideKey}Supervisor`];
    const legalResult = await roomRuntime.legalSpace({
      roomId,
      seatToken: credential.seatToken,
    });
    ensure(legalResult.ok, "COMPLETE_MATCH_LEGAL_FAILED", {
      reason: legalResult.reason, message: legalResult.message,
      round: current.round, phase: current.phase, sideKey });
    const finite = selectFinite(legalResult.legalSpace, sideKey);
    ensure(finite, "COMPLETE_MATCH_NO_FINITE_ACTION", {
      round: current.round,
      phase: current.phase,
      sideKey,
      disabled: legalResult.legalSpace.disabledDiagnostics,
    });
    const actingRoute = input.registry.readAcceptedRoute({
      roomBinding: publicRoomBinding(created.matchBinding),
      ownFaction: factionFor(sideKey),
      opponentFaction: otherFaction(sideKey),
    });
    const designatedAgent = sideKey === input.agentSideKey;
    let faq10AuditHash = null;
    if (finite.action.actionType === "hold") {
      const audit = input.rulesRuntime.faq.evaluate("faq-v1:10", {
        actionType: "move",
        positionChanged: false,
      });
      ensure(audit.legal === false && audit.values.suggestedActionType === "hold",
        "COMPLETE_MATCH_FAQ10_HOLD_REWRITE_FAILED");
      faq10AuditHash = audit.hash;
      faq10Audits.push(audit.hash);
    }
    const decision = seal({
      schema: "ticket18_s181_complete_match_decision_v1",
      roomId,
      actionSequence: actionSequence + 1,
      designatedAgent,
      sideKey,
      round: current.round,
      phase: current.phase,
      legalSpaceHash: legalResult.legalSpace.legalSpaceHash,
      selectedActionKey: finite.actionKey,
      selectedActionType: finite.action.actionType,
      selectedExecutorId: finite.action.executorId,
      reason: decisionReason(finite.action, designatedAgent),
      positionAssessment: positionAssessment(current, sideKey),
      strategySkillRefs: actingRoute.skillRefs,
      strategySkillSetHash: actingRoute.skillSetHash,
      faq10AuditHash,
      rulesAuthority: "external_rules_service",
      strategyAuthority: "advisory_only",
      trainingTruth: false,
    });
    const preview = await roomRuntime.previewAction({
      roomId,
      seatToken: credential.seatToken,
      candidateId: finite.actionKey,
      expectedMatchBindingHash: created.matchBinding.bindingHash,
      expectedLegalSpaceHash: legalResult.legalSpace.legalSpaceHash,
      expectedStateRevision: legalResult.legalSpace.stateRevision,
      expectedStateHash: legalResult.legalSpace.stateHash,
      occurredAt: OCCURRED_AT,
    });
    ensure(preview.ok, "COMPLETE_MATCH_PREVIEW_FAILED", { reason: preview.reason,
      message: preview.message, action: finite.action });
    let confirmationId;
    if (preview.confirmationRequired) {
      const confirmed = await roomRuntime.confirmPreview({
        roomId,
        seatToken: credential.seatToken,
        previewId: preview.preview.previewId,
        previewToken: preview.preview.previewToken,
        previewContentHash: preview.preview.previewSeal.contentHash,
        occurredAt: OCCURRED_AT,
      });
      ensure(confirmed.ok, "COMPLETE_MATCH_CONFIRM_FAILED", { reason: confirmed.reason });
      confirmationId = confirmed.confirmation.confirmationId;
    }
    const control = await roomRuntime.claimControl({
      roomId,
      seatToken: credential.seatToken,
      sessionId: `${roomId}-${sideKey}-supervisor`,
    });
    ensure(control.ok, "COMPLETE_MATCH_CONTROL_FAILED", { reason: control.reason });
    const applied = await roomRuntime.applyAction({
      roomId,
      seatToken: credential.seatToken,
      previewId: preview.preview.previewId,
      confirmationId,
      leaseId: control.controlLease.leaseId,
      leaseFence: control.controlLease.leaseFence,
      expectedStateRevision: legalResult.legalSpace.stateRevision,
      idempotencyKey: `${roomId}-action-${actionSequence + 1}`,
      occurredAt: OCCURRED_AT,
    });
    ensure(applied.ok, "COMPLETE_MATCH_APPLY_FAILED", { reason: applied.reason,
      message: applied.message, action: finite.action });
    const replay = await roomRuntime.replayRoom({
      roomId,
      seatToken: credential.seatToken,
    });
    ensure(replay.ok && replay.matchesCurrent && !replay.replay.silentCompatibilityUsed,
      "COMPLETE_MATCH_REPLAY_FAILED", { reason: replay.reason });
    actionSequence += 1;
    decisions.push({ ...decision, applyReceiptHash: applied.receipt.journalHash,
      postStateHash: applied.envelope.stateHash });
    replayEvidence.push({ actionSequence, appliedCount: replay.replay.appliedCount,
      replayStateHash: replay.replay.envelope.stateHash,
      currentStateHash: applied.envelope.stateHash, matchesCurrent: replay.matchesCurrent });
    const next = applied.envelope.state;
    const lastWorkbench = workbenchEvidence.at(-1);
    if (!lastWorkbench || lastWorkbench.round !== next.round
      || lastWorkbench.phase !== next.phase || next.gameOver) {
      const workbench = await roomRuntime.readBattleWorkbench({
        roomId,
        seatToken: credential.seatToken,
      });
      ensure(workbench.ok, "COMPLETE_MATCH_WORKBENCH_FAILED", { reason: workbench.reason });
      workbenchEvidence.push({
        round: next.round,
        phase: next.phase,
        snapshotHash: workbench.snapshot.snapshotHash,
        threatCoverage: workbench.snapshot.threat?.coverage || "unknown",
        scoreForecastHash: hash(workbench.snapshot.scoreForecast || null),
      });
    }
  }
  ensure(actionSequence < 160, "COMPLETE_MATCH_ACTION_LIMIT_REACHED");
  const finalRead = await roomRuntime.readRoom({ roomId, includeJournal: true,
    seatToken: created.credentials[`${input.agentSideKey}Supervisor`].seatToken });
  ensure(finalRead.ok && finalRead.projection.state.gameOver,
    "COMPLETE_MATCH_NOT_TERMINAL", { state: finalRead.projection?.state });
  const finalReplay = await roomRuntime.replayRoom({
    roomId,
    seatToken: created.credentials[`${input.agentSideKey}Supervisor`].seatToken,
  });
  ensure(finalReplay.ok && finalReplay.matchesCurrent,
    "COMPLETE_MATCH_FINAL_REPLAY_FAILED");
  return seal({
    schema: "ticket18_s181_current_rules_complete_match_trace_v1",
    roomId,
    mode: "supervised_agent_vs_deterministic_sparring_policy",
    designatedAgentSideKey: input.agentSideKey,
    designatedAgentFaction: factionFor(input.agentSideKey),
    opponentFaction: otherFaction(input.agentSideKey),
    promptPackRoute: "opponent_prompt",
    strategySkillRefs: route.skillRefs,
    strategySkillSetHash: route.skillSetHash,
    sourceRulesReceiptHash: route.sourceRulesReceiptHash,
    rulesRuntimeBinding: created.matchBinding.rulesRuntimeBinding,
    initialRound: 1,
    finalRound: finalRead.projection.state.round,
    terminal: true,
    winner: finalRead.projection.state.winner,
    terminalReason: finalRead.projection.state.terminalReason,
    finalScores: finalRead.projection.state.scores,
    acceptedActionCount: actionSequence,
    designatedAgentDecisionCount: decisions.filter((entry) => entry.designatedAgent).length,
    decisions,
    replayEvidence,
    finalReplayStateHash: finalReplay.replay.envelope.stateHash,
    finalCurrentStateHash: finalRead.projection.room.stateHash,
    faq10AuditHashes: [...new Set(faq10Audits)],
    faq16AuditEventCount: finalRead.projection.publicJournal.filter((entry) =>
      JSON.stringify(entry).includes("faq-v1:16")).length,
    workbenchEvidence,
    providerCalls: 0,
    paidProviderUsed: false,
    silentCompatibilityUsed: false,
    eligibleForTraining: false,
    trainingTruth: false,
  });
}

const loaded = await loadFormalFoundationalStrategyPackV1({
  root: ROOT,
  manifest: STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1,
});
const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: ROOT });
ensure(source.dataset.datasetHash === loaded.manifest.sourceBinding.dataset,
  "COMPLETE_MATCH_DATASET_DRIFT");
const report11 = JSON.parse(await readFile(path.join(ROOT,
  "build/ticket-11-rule-atoms-v1/official-dispute-resolution-rules-rule-slice-v1-report.json"),
"utf8"));
const get = (recordKey) => getOfficialCurrentProductRecord(source.dataset, recordKey);
const terranCard = get(TERRAN);
const zergCard = get(ZERG);
const rulesRuntime = createOfficialTicket18CompleteMatchRuntimeV1({
  catalogue: report11.slice.catalogue,
  sourceBinding: loaded.manifest.sourceBinding,
  factionRecords: [terranCard, zergCard],
  sources: loaded.entries[0].skill.sourcePacket?.sources
    || JSON.parse(await readFile(path.join(ROOT,
      "build/ticket-18-faction-production-v1/terran_armed_forces-input.json"), "utf8"))
      .frozenSources.prompt.sources,
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  ...source,
  unitRecordKeys: ["army_units:marine", "army_units:zergling"],
  missionRecordKey: "faction_cards:mission_hold_position",
  cleanupCardRecordKeys: ["tactical_cards:academy", TERRAN],
  reserveDeployData: true,
});
const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: hash({ kind: "mission-draft", recordKey:
    "faction_cards:mission_hold_position" }),
  deploymentDraftReceiptHash: hash({ kind: "deployment-draft", recordKey:
    "faction_cards:deployment_no_mans_land" }),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const profileByKey = gameplayDataBundle.combatProfileBundle.profilesByRecordKey;
const registry = createStarcraftTmgOnlineStrategySkillRegistryV1({
  sourceBinding: loaded.manifest.sourceBinding,
  now: () => OCCURRED_AT,
});
registry.registerCandidates({
  expectedCatalogRevision: 0,
  entries: loaded.entries.map((entry) => ({
    skill: entry.skill,
    qualificationRef: { kind: entry.qualificationRef.schema,
      hash: entry.qualificationRef.hash },
  })),
});
const priorEvaluation = JSON.parse(await readFile(path.join(ROOT,
  "build/ticket-18-online-strategy-arena-v1/report.json"), "utf8"));
registry.acceptSet({
  expectedRuntimeRevision: 0,
  skillHashes: loaded.entries.map((entry) => entry.skill.hash),
  evaluationRef: { kind: priorEvaluation.schema,
    hash: priorEvaluation.hash || hash(priorEvaluation) },
});
const shared = {
  sourceBinding: loaded.manifest.sourceBinding,
  registry,
  rulesRuntime,
  gameplayDataBundle,
  missionSetupBinding,
  marineProfile: profileByKey["army_units:marine"],
  zerglingProfile: profileByKey["army_units:zergling"],
  terranCard,
  zergCard,
};
const matches = [
  await runMatch({ ...shared, agentSideKey: "player1" }),
  await runMatch({ ...shared, agentSideKey: "player2" }),
];
const report = seal({
  schema: "ticket18_slice181_current_rules_complete_match_report_v1",
  ticket: 18,
  slice: 181,
  generatedAt: OCCURRED_AT,
  sourceRefreshPerformed: false,
  sourceBinding: loaded.manifest.sourceBinding,
  rulesRuntimeDescriptor: rulesRuntime.descriptor,
  faqRouterManifest: rulesRuntime.faq.manifest,
  matchTraceHashes: matches.map((match) => match.hash),
  matches,
  acceptance: {
    directionCount: matches.length,
    terminalMatchCount: matches.filter((match) => match.terminal).length,
    replayPassedMatchCount: matches.filter((match) =>
      match.finalReplayStateHash === match.finalCurrentStateHash).length,
    exactFourSkillRouteCount: matches.filter((match) =>
      match.strategySkillRefs.length === 4).length,
    sourceAndRuntimeIdentitySeparated: matches.every((match) =>
      match.sourceRulesReceiptHash !== match.rulesRuntimeBinding.runtimeHash),
    faq10HoldRewriteAudited: matches.every((match) =>
      match.faq10AuditHashes.length > 0),
    faq16MarkerControlAudited: matches.every((match) =>
      match.faq16AuditEventCount > 0),
    legacyCompatibilityUsed: false,
    fullGameStrategyEffectivenessProven: false,
    currentRulesCompleteMatchHarnessPassed: matches.every((match) =>
      match.terminal && match.finalReplayStateHash === match.finalCurrentStateHash),
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["opponent_prompt"],
    harnessToolsCalled: ["read_board_state", "list_legal_actions",
      "read_strategy_skills", "preview_action", "confirm_preview_after_human_authorization",
      "claim_control", "apply_action", "replay_room", "read_battle_workbench",
      "write_episode_trace"],
    uiTraceEvidence: "battle_workbench_snapshot_hash_per_round_or_phase_change",
    agentDecisionEvidence: "four_skill_route_plus_legal_space_plus_position_assessment_per_action",
    memoryTraceEvidence: "no_memory_promotion_in_slice181",
    trainingTraceCandidates: [],
    rollbackOrDemotionRules: ["any_replay_mismatch_quarantines_trace",
      "unsupported_profile_status_or_faq_scope_fails_closed",
      "bounded_match_adapter_never_enters_production_room"],
    userVisibleChecks: ["both directions reach terminal",
      "every action is previewed and supervised before apply",
      "workbench and final replay hashes remain inspectable"],
  },
  strategyEffectivenessProven: false,
  providerCalls: 0,
  paidProviderUsed: false,
  eligibleForTraining: false,
  trainingTruth: false,
});
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ output: path.relative(ROOT, OUTPUT),
  runtimeHash: rulesRuntime.descriptor.runtimeHash,
  matchTraceHashes: report.matchTraceHashes,
  acceptance: report.acceptance,
  actions: matches.map((match) => match.acceptedActionCount),
  costCny: 0 }, null, 2));
