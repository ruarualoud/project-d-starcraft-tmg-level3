import { readFile } from "node:fs/promises";
import path from "node:path";

import { STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1 } from
  "../../content/skill-generation/ticket-18-foundational-strategy-pack-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgMatchDecisionContinuityV1,
} from "../../packages/online-agent-session/match-decision-continuity-v1.mjs";
import { createStarcraftTmgPlayerSpatialObservationV1 } from
  "../../packages/online-agent-session/player-spatial-observation-v1.mjs";
import { createStarcraftTmgSpatialActionQueryRuntimeV1 } from
  "../../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";
import { createStarcraftTmgTurnPlanRuntimeV1 } from
  "../../packages/online-agent-session/turn-plan-runtime-v1.mjs";
import {
  createInMemoryStarcraftTmgHostedBotSeatStoreV1,
  createStarcraftTmgHostedBotSeatRuntimeV1,
} from "../../packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs";
import { createStarcraftTmgAgentAgentExperimentOrchestratorV1 } from
  "../../packages/online-agent-session/agent-agent-experiment-orchestrator-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../../packages/room-runtime/in-memory-room-v1.mjs";
import { createOfficialTicket18CompleteMatchRuntimeV1 } from
  "../../packages/rule-atoms/official-ticket18-complete-match-runtime-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../../packages/source-data/official-command-center-adapter-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../../packages/source-data/official-gameplay-data-bundle-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../../packages/source-data/official-mission-setup-binding-v1.mjs";
import { createOfficialModelBaseGeometryDataBundleV1 } from
  "../../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs";
import { loadFormalFoundationalStrategyPackV1 } from
  "../../packages/strategy-skills/formal-foundational-skill-pack-loader-v1.mjs";
import { hash } from "../../packages/skill-production/common.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./official-development-tranche-source-lock-fixture-v1.mjs";

const TERRAN = "tactical_cards:terran_armed_forces";
const ZERG = "tactical_cards:zerg_swarm";

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}

function exactSupply(profile, currentModels) {
  const tier = profile.squadProfile.find((row) => row.minimumModels !== null
    && currentModels >= row.minimumModels && currentModels <= row.maximumModels);
  ensure(tier, "TICKET20_DEMO_SUPPLY_TIER_MISSING", {
    recordKey: profile.recordKey,
  });
  return tier.supply;
}

function marker(number) {
  return {
    id: `mission-marker-${number}`,
    number,
    xInches: 7 + ((number - 1) * 10),
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
    name: profile.unitName,
    unitName: profile.unitName,
    unitId: profile.recordKey,
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
    officialModelBaseGeometryDataBundle: input.modelBaseGeometryDataBundle,
    officialMissionSetupBinding: input.missionSetupBinding,
    selectedMission: {
      id: "faction_cards:mission_hold_position",
      name: "Hold Position",
    },
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
      scenarioMapId: "ticket20-hold-position-demo",
      scenarioMapName: "Hold Position development battlefield",
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
      piece(input.marineProfile, "player1", 7),
      piece(input.zerglingProfile, "player2", 17),
    ],
    activeAbilityUseHistory: [],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

function chooseFinite(request) {
  const candidates = request.spatialActionSpace.finiteActions || [];
  const sideKey = request.scope.seatKey;
  const actionOf = (entry) => entry.action || {};
  const find = (predicate) => candidates.find((entry) => predicate(actionOf(entry)));
  return find((action) => action.actionType === "choose_first_actor"
      && action.chosenFirstActorSideKey === sideKey)
    || find((action) => action.runtimeAdapter)
    || find((action) => action.actionType === "determine_mission_marker_control")
    || find((action) => action.actionType === "score_victory_points")
    || find((action) => action.actionType === "check_end_game_conditions")
    || find((action) => action.actionType === "hold")
    || find((action) => action.actionType === "pass")
    || candidates[0]
    || null;
}

function reasonFor(actionType) {
  if (actionType === "hold") {
    return "保持当前任务标记接触位置，避免用无位移 Move 伪装 Hold。";
  }
  if (actionType === "pass") {
    return "当前有界动作空间没有更高收益的已验证单位动作，保存资源并结束本次机会。";
  }
  if (actionType === "choose_first_actor") {
    return "保留本阶段先行动权，防止计划在交替激活前失去节奏。";
  }
  if (actionType === "determine_mission_marker_control") {
    return "让规则器按底座边缘、有效补给与标记位置结算控制。";
  }
  if (actionType === "score_victory_points") {
    return "控制状态已由规则器固定，执行可重放的本轮计分。";
  }
  return "执行当前 LegalSpace 中优先级最高的规则生命周期动作。";
}

export function createTicket20DeterministicSkillGuidedDecisionPortV1(
  skillRefs,
  profile = {},
) {
  const agentLabel = String(profile.agentLabel || "凯瑞甘");
  const ownFaction = String(profile.ownFaction || "Zerg");
  const ownUnitName = String(profile.ownUnitName || "Zergling");
  const opponentFaction = String(profile.opponentFaction || "Terran");
  const opponentUnitName = String(profile.opponentUnitName || "Marine");
  return Object.freeze({
    async decide(request) {
      const selected = chooseFinite(request);
      if (!selected) return { ok: false, reason: "demo_has_no_finite_action" };
      const action = selected.action || {};
      const reason = reasonFor(action.actionType);
      const rejected = (request.spatialActionSpace.finiteActions || [])
        .filter((entry) => entry.candidateId !== selected.candidateId)
        .slice(0, 8)
        .map((entry) => ({ candidateId: entry.candidateId,
          reason: "当前任务结算/阶段顺序优先级低于所选动作。" }));
      return {
        ok: true,
        candidateId: selected.candidateId,
        selectedReason: reason,
        scoreOrPositionValue:
          "优先保持当前标记接触、合法阶段顺序与可验证的回合得分。",
        risk: action.actionType === "pass"
          ? "先 Pass 可能把阶段节奏交给人类玩家。"
          : "有界开发规则尚不证明更广军表中的进攻最优性。",
        rejectedAlternatives: rejected,
        speech: `${agentLabel}：${reason}`,
        plan: request.planState?.plan ? null : {
          objective: `在 Hold Position 中最大化任务分并保持 ${ownUnitName} 存活。`,
          currentGoal: "维持最近任务标记的控制并保留下一阶段节奏。",
          strategicApproach: ["先读底座与标记位置", "比较本轮分数后再决定 Pass"],
          successSignals: ["控制标记不减少", "回放与当前状态一致"],
          activationPriorities: ["规则强制步骤", "保持标记接触", "阶段 Pass"],
          resourcePolicy: ["有界局不虚构未开放的能力或资源支出"],
          initiativePolicy: ["记录 First Player 与首次 Pass，阶段变化后重评"],
          reservePolicy: ["当前固定军表没有预备队"],
          reviseIf: ["lost_marker_control", "first_player_marker_changed"],
          assumptions: ["只使用当前 LegalSpace 与已接受策略 Skill"],
          opponentModel: [
            `${opponentFaction} 会优先保持 ${opponentUnitName} 的任务标记控制`,
          ],
          contingencies: ["若动作空间不完整则停止并报告，不臆造动作"],
        },
        assessment: {
          verdict: "continue",
          health: "sound",
          continuitySummary: "总体目标仍是以标记控制换取稳定得分。",
          currentGoal: "完成当前权威阶段动作并保持下一决策的计划连续性。",
          evidenceFor: [
            `state:${request.roomProjection.room.stateHash}`,
            `spatial:${request.spatialObservation?.observationHash || "unknown"}`,
          ],
          evidenceAgainst: [],
          changedAssumptions: [],
          opponentModelUpdates: [],
          unresolvedRisks: ["有界 Marine/Zergling 开发覆盖不是全军表策略证明"],
          nextDecisionFocus: "重新读取当前行动方、标记控制与分数变化。",
        },
        intent: {
          currentGoal: "合法推进当前阶段并保持任务得分。",
          purpose: reason,
          decisionSummary: `${action.actionType || "rules action"} 优先于 ${rejected.length} 个备选。`,
          planContinuity: "延续标记控制计划；状态改变后重新反思。",
          expectedOwnOutcome: "权威状态推进一格且回放一致。",
          expectedEffects: ["阶段/激活状态按规则推进"],
          predictedOpponentResponses: [{
            responseId: "human-preserves-marker",
            opponentAction: "人类下一次激活保持或争夺任务标记。",
            basis: ["当前 Hold Position 目标"],
            counterResponse: "下次激活重新比较标记距离、控制和 Pass 节奏。",
            counterPurpose: "避免旧计划跨状态机械延续。",
            replanIf: "lost_marker_control",
          }],
          tradeoffs: [{
            benefit: "动作由当前规则器完整确认并可重放。",
            cost: "可能放弃尚未开放的进攻机会。",
            acceptanceReason: "不可用动作不能由策略文本补造。",
          }],
          risks: ["有界局面不能证明通用胜率"],
          fallbacks: ["若 Preview 失败，停在同状态等待人工检查"],
          stopOrReplanTriggers: ["LegalSpace changed", "marker control changed"],
          nextDecisionFocus: "任务分、标记控制、行动顺序",
          unitIds: action.pieceId ? [action.pieceId]
            : [`${request.scope.seatKey}-${ownFaction.toLowerCase()}-unit`],
          skillsUsed: skillRefs.map((entry) => `${entry.id}@${entry.hash}`),
          abilitiesIntended: [],
          resourcesIntended: [],
          rejectedAlternatives: rejected,
          queryReceipts: [],
        },
        providerTrace: {
          agentVersion: "ticket20_deterministic_skill_guided_demo_v1",
          providerCalls: 0,
          paidProviderUsed: false,
        },
      };
    },
  });
}

export async function createTicket20HumanAgentDemoFixtureV1(options = {}) {
  const root = path.resolve(options.root);
  const roomId = String(options.roomId || "ticket20-human-agent-demo");
  const occurredAt = String(options.occurredAt
    || "2026-09-11T16:00:00.000Z");
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const loaded = await loadFormalFoundationalStrategyPackV1({
    root,
    manifest: STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1,
  });
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root });
  ensure(source.dataset.datasetHash === loaded.manifest.sourceBinding.dataset,
    "TICKET20_DEMO_DATASET_DRIFT");
  const report11 = JSON.parse(await readFile(path.join(root,
    "build/ticket-11-rule-atoms-v1/official-dispute-resolution-rules-rule-slice-v1-report.json"),
  "utf8"));
  const get = (recordKey) => getOfficialCurrentProductRecord(source.dataset,
    recordKey);
  const terranCard = get(TERRAN);
  const zergCard = get(ZERG);
  const rulesRuntime = createOfficialTicket18CompleteMatchRuntimeV1({
    catalogue: report11.slice.catalogue,
    sourceBinding: loaded.manifest.sourceBinding,
    factionRecords: [terranCard, zergCard],
    sources: loaded.entries[0].skill.sourcePacket?.sources
      || JSON.parse(await readFile(path.join(root,
        "build/ticket-18-faction-production-v1/terran_armed_forces-input.json"),
      "utf8")).frozenSources.prompt.sources,
  });
  const gameplayDataBundle = createOfficialGameplayDataBundleV1({
    ...source,
    unitRecordKeys: ["army_units:marine", "army_units:zergling"],
    missionRecordKey: "faction_cards:mission_hold_position",
    cleanupCardRecordKeys: ["tactical_cards:academy", TERRAN],
    reserveDeployData: true,
  });
  const modelBaseGeometryDataBundle =
    createOfficialModelBaseGeometryDataBundleV1({ dataset: source.dataset });
  const missionSetupBinding = createOfficialMissionSetupBindingV1({
    gameplayDataBundle,
    missionDraftReceiptHash: hash({ kind: "mission-draft",
      recordKey: "faction_cards:mission_hold_position" }),
    deploymentDraftReceiptHash: hash({ kind: "deployment-draft",
      recordKey: "faction_cards:deployment_no_mans_land" }),
    seatColorAssignment: { player1: "red", player2: "blue" },
  });
  const profileByKey = gameplayDataBundle.combatProfileBundle.profilesByRecordKey;
  const state = initialState({
    gameplayDataBundle,
    modelBaseGeometryDataBundle,
    missionSetupBinding,
    marineProfile: profileByKey["army_units:marine"],
    zerglingProfile: profileByKey["army_units:zergling"],
    terranCard,
    zergCard,
  });
  const authorityEngine = createStarcraftTmgAuthoritativeEngine({
    rulesRuntime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now,
  });
  const roomRuntime = createStarcraftTmgRoomRuntime({
    authorityEngine,
    now,
    checkpointInterval: 8,
    characterReleaseChannel: "development_internal",
  });
  const serverSeatPlan = [{
    label: "human",
    seatKey: "player1",
    roleMode: "supervisor",
    principalType: "human",
  }, {
    label: "bot",
    seatKey: "player2",
    // The credential belongs to the host supervisor, never to the model. The
    // model-facing DecisionPort receives no SeatGrant and has no Confirm/Apply
    // authority; current-match human consent authorizes this host to operate
    // the bot seat through the ordinary authoritative lifecycle.
    roleMode: "supervisor",
    principalType: "human",
  }];
  const createdRoom = await roomRuntime.createRoom({
    roomId,
    title: String(options.title
      || "Ticket 20 · Human vs Kerrigan Bot · Hold Position"),
    gameId: "starcraft-tmg",
    surfaceMode: String(options.surfaceMode || "human_agent_development"),
    initialStateAuthority: {
      source: "server_factory",
      state,
      dataVersion: loaded.manifest.sourceBinding.dataset,
      dependencies: {
        sourceSnapshot: {
          artifactId: "ticket18-foundational-strategy-source-binding-v1",
          content: loaded.manifest.sourceBinding,
        },
        dataSnapshot: {
          artifactId: "ticket20-current-official-human-agent-demo-v1",
          content: gameplayDataBundle,
        },
      },
      receiptHash: hash({ roomId, state,
        source: "ticket20-human-agent-demo-server-factory" }),
    },
    serverSeatPlan,
  });
  ensure(createdRoom.ok, "TICKET20_DEMO_ROOM_CREATE_FAILED", {
    reason: createdRoom.reason,
  });
  const botScope = {
    gameId: "starcraft-tmg",
    roomId,
    matchBindingHash: createdRoom.matchBinding.bindingHash,
    seatKey: "player2",
  };
  const continuity = createStarcraftTmgMatchDecisionContinuityV1({ now });
  const spatialRuntime = createStarcraftTmgSpatialActionQueryRuntimeV1();
  const turnPlanRuntime = createStarcraftTmgTurnPlanRuntimeV1({
    decisionContinuity: continuity,
    now,
  });
  const botStore = options.botStore
    || createInMemoryStarcraftTmgHostedBotSeatStoreV1();
  const botRuntime = createStarcraftTmgHostedBotSeatRuntimeV1({
    roomPort: roomRuntime,
    decisionPort: options.botDecisionPort
      || createTicket20DeterministicSkillGuidedDecisionPortV1(
        options.botSkillRefs || loaded.entries.map((entry) => ({
          id: entry.skill.skillId,
          hash: entry.skill.hash,
        })),
        options.botDecisionProfile,
      ),
    store: botStore,
    decisionContinuity: continuity,
    spatialObservationProjector: createStarcraftTmgPlayerSpatialObservationV1,
    spatialActionQueryRuntime: spatialRuntime,
    turnPlanRuntime,
    matchMode: options.matchMode || "user_vs_agent",
    now,
    autoDriveIntervalMs: options.autoDriveIntervalMs || 500,
  });
  if (options.attachBot !== false) {
    await botRuntime.attach({
      scope: botScope,
      seatToken: createdRoom.credentials.bot.seatToken,
      automationConsent: {
        approved: true,
        approvedBy: "human",
        scope: "current_match_bot_seat",
        approvedAt: occurredAt,
      },
      autoDrive: options.autoDrive !== false,
    });
  }
  const humanRecovery = await roomRuntime.issueSeatRecovery({
    roomId,
    seatToken: createdRoom.credentials.human.seatToken,
  });
  ensure(humanRecovery.ok, "TICKET20_DEMO_HUMAN_RECOVERY_ISSUE_FAILED", {
    reason: humanRecovery.reason,
  });
  return Object.freeze({
    roomId,
    authorityEngine,
    roomRuntime,
    rulesRuntime,
    createdRoom,
    botRuntime,
    botScope,
    continuity,
    spatialRuntime,
    turnPlanRuntime,
    humanRecoveryToken: humanRecovery.recovery.recoveryToken,
    sourceBinding: loaded.manifest.sourceBinding,
    strategySkillRefs: loaded.entries.map((entry) => ({
      id: entry.skill.skillId,
      version: entry.skill.version,
      hash: entry.skill.hash,
    })),
    strategySkills: loaded.entries.map((entry) => entry.skill),
    coverage: Object.freeze({
      mode: "current_official_bounded_complete_match_development",
      unitRecordKeys: ["army_units:marine", "army_units:zergling"],
      missionRecordKey: "faction_cards:mission_hold_position",
      legalSpaceComplete: false,
      productionRoomEligible: false,
      arbitraryArmyBuilderSupported: false,
      interactiveDeploymentSupported: false,
      fullMatchLifecycleSupported: true,
      trainingTruth: false,
    }),
  });
}

function routedSkillRefs(allRefs, ownFaction, opponentFaction) {
  const byId = new Map(allRefs.map((entry) => [entry.id, entry]));
  return STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1.entries
    .filter((entry) => entry.role === "general"
      || (entry.role === "faction"
        && entry.factionRecordKey === ownFaction)
      || (entry.role === "matchup"
        && entry.ownFaction === ownFaction
        && entry.opponentFaction === opponentFaction))
    .map((entry) => byId.get(entry.skillId))
    .filter(Boolean);
}

export async function createTicket20AgentAgentDemoFixtureV1(options = {}) {
  const occurredAt = String(options.occurredAt
    || "2026-09-14T10:00:00.000Z");
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const manifestRefs = STARCRAFT_TMG_TICKET_18_FOUNDATIONAL_STRATEGY_PACK_V1
    .entries.map((entry) => ({
      id: entry.skillId,
      version: "ticket18-accepted-v1",
      hash: entry.skillHash,
    }));
  const terranRefs = routedSkillRefs(manifestRefs, TERRAN, ZERG);
  const zergRefs = routedSkillRefs(manifestRefs, ZERG, TERRAN);
  const base = await createTicket20HumanAgentDemoFixtureV1({
    ...options,
    occurredAt,
    now,
    autoDrive: false,
    attachBot: false,
    matchMode: "agent_vs_agent",
    title: "Ticket 20 · Agent vs Agent · Hold Position",
    surfaceMode: "agent_agent_development",
    botSkillRefs: zergRefs,
    botDecisionProfile: {
      agentLabel: "凯瑞甘",
      ownFaction: "Zerg",
      ownUnitName: "Zergling",
      opponentFaction: "Terran",
      opponentUnitName: "Marine",
    },
  });
  const player1Scope = {
    gameId: "starcraft-tmg",
    roomId: base.roomId,
    matchBindingHash: base.createdRoom.matchBinding.bindingHash,
    seatKey: "player1",
  };
  const player1Continuity = createStarcraftTmgMatchDecisionContinuityV1({ now });
  const player1SpatialRuntime = createStarcraftTmgSpatialActionQueryRuntimeV1();
  const player1TurnPlanRuntime = createStarcraftTmgTurnPlanRuntimeV1({
    decisionContinuity: player1Continuity,
    now,
  });
  const player1Runtime = createStarcraftTmgHostedBotSeatRuntimeV1({
    roomPort: base.roomRuntime,
    decisionPort: createTicket20DeterministicSkillGuidedDecisionPortV1(
      terranRefs,
      {
        agentLabel: "Terran 指挥官",
        ownFaction: "Terran",
        ownUnitName: "Marine",
        opponentFaction: "Zerg",
        opponentUnitName: "Zergling",
      },
    ),
    store: createInMemoryStarcraftTmgHostedBotSeatStoreV1(),
    decisionContinuity: player1Continuity,
    spatialObservationProjector: createStarcraftTmgPlayerSpatialObservationV1,
    spatialActionQueryRuntime: player1SpatialRuntime,
    turnPlanRuntime: player1TurnPlanRuntime,
    matchMode: "agent_vs_agent",
    now,
  });
  const consent = {
    approved: true,
    approvedBy: "human",
    scope: "current_match_bot_seat",
    approvedAt: occurredAt,
  };
  const orchestrator = createStarcraftTmgAgentAgentExperimentOrchestratorV1({
    roomPort: base.roomRuntime,
    now,
    experimentCell: {
      experimentId: "ticket20-agent-agent-closure-v1",
      cellId: "hold-position-terran-vs-zerg-001",
      denominator: { index: 1, total: 1 },
      roomId: base.roomId,
      matchBindingHash: base.createdRoom.matchBinding.bindingHash,
      versions: {
        source: `official-current:${base.sourceBinding.dataset}`,
        rules: `ticket11:${base.sourceBinding.rules}`,
        strategy: `ticket18-foundational:${hash(manifestRefs)}`,
      },
      scenario: {
        mapId: "ticket20-hold-position-demo",
        missionId: "faction_cards:mission_hold_position",
        rosterIdsBySeat: {
          player1: "bounded:army_units:marine@1",
          player2: "bounded:army_units:zergling@1",
        },
      },
      rng: {
        scheme: "authoritative_room_recorded_v1",
        seed: "ticket20-hold-position-fixed-v1",
      },
      budgets: {
        maxAppliedActions: Number(options.maxAppliedActions || 160),
        maxRecoverableFailuresPerState: 3,
      },
      seats: {
        player1: {
          agentId: "ticket20-terran-command-agent-v1",
          factionRecordKey: TERRAN,
          providerId: "deterministic-skill-guided-development-v1",
          skillRefs: terranRefs,
        },
        player2: {
          agentId: "ticket20-kerrigan-swarm-agent-v1",
          factionRecordKey: ZERG,
          providerId: "deterministic-skill-guided-development-v1",
          skillRefs: zergRefs,
        },
      },
    },
    seats: [{
      seatKey: "player1",
      runtime: player1Runtime,
      scope: player1Scope,
      seatToken: base.createdRoom.credentials.human.seatToken,
      automationConsent: consent,
      strategySkillSetHash: hash(terranRefs),
    }, {
      seatKey: "player2",
      runtime: base.botRuntime,
      scope: base.botScope,
      seatToken: base.createdRoom.credentials.bot.seatToken,
      automationConsent: consent,
      strategySkillSetHash: hash(zergRefs),
    }],
  });
  return Object.freeze({
    ...base,
    orchestrator,
    routedSkillRefsBySeat: Object.freeze({
      player1: terranRefs,
      player2: zergRefs,
    }),
    agentAgentCoverage: Object.freeze({
      denominator: "1/1 bounded current-official experiment cell",
      providerEvidence: "deterministic_skill_guided_no_model_call",
      strategyStrengthProven: false,
      fullMatchLifecycleSupported: true,
      pauseResumeRecoverySupported: true,
      automaticPromotion: false,
      trainingTruth: false,
    }),
  });
}
