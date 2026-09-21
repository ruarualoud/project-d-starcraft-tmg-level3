import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

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
import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1 } from
  "../../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs";
import { createStarcraftTmgTurnPlanRuntimeV1 } from
  "../../packages/online-agent-session/turn-plan-runtime-v1.mjs";
import { createStarcraftTmgSpatialPreexecutionSearchV1 } from
  "../../packages/online-agent-session/spatial-preexecution-search-v1.mjs";
import {
  createInMemoryStarcraftTmgHostedBotSeatStoreV1,
  createStarcraftTmgHostedBotSeatRuntimeV1,
} from "../../packages/online-agent-session/hosted-bot-seat-runtime-v1.mjs";
import { createStarcraftTmgHostedOpponentRuntimeV2 } from
  "../../packages/online-agent-session/hosted-opponent-runtime-v2.mjs";
import { createStarcraftTmgAgentAgentExperimentOrchestratorV1 } from
  "../../packages/online-agent-session/agent-agent-experiment-orchestrator-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../../packages/room-runtime/in-memory-room-v1.mjs";
import { createOfficialTicket18CompleteMatchRuntimeV1 } from
  "../../packages/rule-atoms/official-ticket18-complete-match-runtime-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialRoundSupplyStateV1 } from
  "../../packages/rule-atoms/official-round-supply-state-v1.mjs";
import { createOfficialStandardActionRuntimeV1 } from
  "../../packages/product-composition/official-standard-action-runtime-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialStandardRoomInitialStateAuthorityV1 } from
  "../../packages/product-composition/official-standard-room-factory-v1.mjs";
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

function registerResumedMatchDependencies(authorityEngine, binding,
  initialStateAuthority, rulesRuntime) {
  const supplied = initialStateAuthority.dependencies || {};
  for (const kind of ["sourceSnapshot", "dataSnapshot", "geometryArtifact"]) {
    const expected = binding.dependencies?.[kind];
    ensure(expected && supplied[kind]?.content !== undefined,
      "TICKET20_DEMO_RESUME_DEPENDENCY_UNAVAILABLE", { kind });
    authorityEngine.registerDependency({ kind,
      artifactId: expected.artifactId,
      contentHash: expected.contentHash,
      content: supplied[kind].content });
  }
  const generated = {
    rulesArtifact: { kind: "rules-artifact",
      rulesVersion: rulesRuntime.descriptor.rulesVersion,
      rulesRuntimeBinding: binding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: binding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: binding.rulesRuntimeBinding.catalogueHash,
      executorManifest: rulesRuntime.descriptor.executorManifest },
  };
  for (const [kind, content] of Object.entries(generated)) {
    const expected = binding.dependencies?.[kind];
    ensure(expected, "TICKET20_DEMO_RESUME_DEPENDENCY_UNAVAILABLE", { kind });
    authorityEngine.registerDependency({ kind,
      artifactId: expected.artifactId,
      contentHash: expected.contentHash,
      content });
  }
  const expectedSchema = binding.dependencies?.actionSchema;
  const actionSchema = Array.from({ length: 128 }, (_, index) => ({
    kind: "action-schema",
    schemaVersion: `hybrid_legal_space_v${index + 1}`,
  })).find((content) => hash(content) === expectedSchema?.contentHash);
  ensure(actionSchema, "TICKET20_DEMO_RESUME_ACTION_SCHEMA_UNAVAILABLE");
  authorityEngine.registerDependency({ kind: "actionSchema",
    artifactId: expectedSchema.artifactId,
    contentHash: expectedSchema.contentHash,
    content: actionSchema });
  const display = binding.rulesDisplayBinding;
  const rulesDisplay = `# Historical rules display\n\nFrozen rules version: `
    + `${rulesRuntime.descriptor.rulesVersion}\n\nThis development artifact preserves `
    + "the rules identity used by the match.";
  authorityEngine.registerDependency({ kind: "rulesDisplay",
    artifactId: display.artifactId,
    contentHash: display.artifactHash,
    mediaType: display.mediaType,
    locale: display.locale,
    content: rulesDisplay });
  const verified = authorityEngine.verifyFrozenDependencies(binding);
  ensure(verified.ok, "TICKET20_DEMO_RESUME_DEPENDENCY_QUARANTINED", {
    reason: verified.reason,
    quarantine: verified.quarantine,
  });
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

function chooseParameterizedDeploy(request) {
  const domain = (request.spatialActionSpace.parameterDomains || []).find((entry) => (
    entry.actionType === "deploy"
      && entry.parameterKind === "official_standard_reserve_deploy_path_v1"
      && entry.constraints?.modelProfiles?.length === 1
      && entry.constraints?.entrySegments?.length > 0
  ));
  if (!domain) return null;
  const model = domain.constraints.modelProfiles[0];
  const segment = domain.constraints.entrySegments[0];
  const along = Math.round(((Number(segment.startInches)
    + Number(segment.endInches)) / 2) * 1000);
  const halfWidth = Math.round(Number(model.widthMilliInches) / 2);
  const halfDepth = Math.round(Number(model.depthMilliInches) / 2);
  const width = Number(domain.constraints.battlefieldWidthMilliInches);
  const height = Number(domain.constraints.battlefieldHeightMilliInches);
  const inset = 500;
  const endpoint = segment.side === "left"
    ? { xMilliInches: halfWidth + inset, yMilliInches: along }
    : segment.side === "right"
      ? { xMilliInches: width - halfWidth - inset, yMilliInches: along }
      : segment.side === "bottom"
        ? { xMilliInches: along, yMilliInches: halfDepth + inset }
        : { xMilliInches: along, yMilliInches: height - halfDepth - inset };
  return {
    candidateId: domain.domainId,
    proposal: {
      kind: "parameterized",
      domainId: domain.domainId,
      parameters: {
        leadingModelId: model.modelId,
        entrySegmentId: segment.segmentId,
        entryAlongEdgeMilliInches: along,
        endpoint,
        placements: [],
      },
    },
    action: { actionType: "deploy", sideKey: domain.sideKey,
      pieceId: domain.pieceId },
  };
}

function chooseCurrentAction(request) {
  const deploy = chooseParameterizedDeploy(request);
  if (deploy) return deploy;
  const finite = chooseFinite(request);
  if (finite) return {
    ...finite,
    proposal: finite.proposal || { kind: "finite", actionKey: finite.candidateId },
  };
  return null;
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
  if (actionType === "deploy") {
    return "从规则器给出的己方 Entry Edge 合法域部署单位，并保留完整底座边界与编队约束。";
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
      const selected = chooseCurrentAction(request);
      if (!selected) return { ok: false, reason: "demo_has_no_finite_action" };
      const action = selected.action || {};
      const reason = reasonFor(action.actionType);
      const rejected = [
        ...(request.spatialActionSpace.finiteActions || []),
        ...(request.spatialActionSpace.parameterDomains || []).map((entry) => ({
          candidateId: entry.domainId,
        })),
      ]
        .filter((entry) => entry.candidateId !== selected.candidateId)
        .slice(0, 8)
        .map((entry) => ({ candidateId: entry.candidateId,
          reason: "当前任务结算/阶段顺序优先级低于所选动作。" }));
      return {
        ok: true,
        candidateId: selected.candidateId,
        proposal: selected.proposal,
        selectedReason: reason,
        scoreOrPositionValue:
          "优先保持当前标记接触、合法阶段顺序与可验证的回合得分。",
        risk: action.actionType === "pass"
          ? "先 Pass 可能把阶段节奏交给人类玩家。"
          : "有界开发规则尚不证明更广军表中的进攻最优性。",
        rejectedAlternatives: rejected,
        speech: `${agentLabel}：${reason}`,
        publicDecisionSummary: {
          visibleFacts: [
            `round ${request.roomProjection?.state?.round || "?"}`,
            `phase ${request.roomProjection?.state?.phase || "?"}`,
            `legal candidates ${(request.spatialActionSpace.finiteActions || []).length
              + (request.spatialActionSpace.parameterDomains || []).length}`,
          ],
          plan: "保持任务控制计划，在每次权威状态变化后重新评估。",
          purpose: reason,
          calculations: ["骰池、距离、底座和资源均取自 Rules 输出；Agent 不自算规则结果。"],
          predictedOpponentResponses: ["对手可能争夺任务标记或保留阶段先手。"],
          counterResponse: "下一选择点重新读取空间观察、当前计划和 LegalSpace。",
          risk: action.actionType === "pass"
            ? "Pass 会改变本阶段节奏。"
            : "部署位置可能暴露于对手的后续火力圈。",
        },
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
          inputUnits: 0,
          outputUnits: 0,
          totalUnits: 0,
          matchEstimatedCostCnyMicros: 0,
        },
      };
    },
  });
}

export async function createTicket20HumanAgentDemoFixtureV1(options = {}) {
  const root = path.resolve(options.root || path.join(
    path.dirname(fileURLToPath(import.meta.url)), "../.."));
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
  const formalStandard2000 = options.roomProfile === "standard_2000_live";
  const standard2000 = formalStandard2000
    || options.roomProfile === "standard_2000";
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
  let rulesRuntime;
  let state;
  let initialStateAuthority;
  let coverage;
  if (standard2000) {
    const standardAuthority = createOfficialStandardRoomInitialStateAuthorityV1({
      dataset: source.dataset,
      snapshot: source.snapshot,
      serverSeatPlan,
      roomId,
      ...(options.mapConfiguration
        ? { mapConfiguration: structuredClone(options.mapConfiguration) }
        : {}),
    });
    state = structuredClone(standardAuthority.state);
    if (formalStandard2000) {
      rulesRuntime = createOfficialCurrentProductMatchRuntimeV1({
        dataset: source.dataset,
        state,
      });
      state.phase = "start_of_round";
      state.stage = "mission_start_of_round";
      state.phaseFirstActorByRound = {};
      delete state.officialRoundSupplyState;
    } else {
      const baseRuntime = createOfficialExecutableRuleRuntimeV1({
        catalogue: report11.slice.catalogue,
      });
      rulesRuntime = createOfficialStandardActionRuntimeV1({
        baseRuntime,
        actionRouteCatalogue: standardAuthority.state.officialActionRouteCatalogue,
      });
      state.phase = "movement";
      state.stage = "round_one_reserve_deployment";
    }
    state.activeSideKey = state.firstPlayerSideKey;
    if (!formalStandard2000) {
      state.phaseFirstActorByRound = {
        ...state.phaseFirstActorByRound,
        "1:movement": {
          round: 1,
          phase: "movement",
          markerHolderSideKey: state.firstPlayerSideKey,
          chosenFirstActorSideKey: state.firstPlayerSideKey,
        },
      };
      state.officialRoundSupplyState = createOfficialRoundSupplyStateV1({
        state,
        gameplayDataBundle: state.officialGameplayDataBundle,
        rulesRuntimeHash: rulesRuntime.descriptor.runtimeHash,
      });
    }
    const authorityBody = {
      schema: formalStandard2000
        ? "starcraft_tmg_standard_2000_live_web_authority_v1"
        : "starcraft_tmg_standard_2000_web_dry_run_authority_v1",
      version: formalStandard2000 ? "2.0.0" : "1.0.0",
      source: "server_factory",
      setupId: standardAuthority.setupId,
      parentFactoryReceiptHash: standardAuthority.receiptHash,
      state,
      dataVersion: standardAuthority.dataVersion,
      dependencies: {
        ...structuredClone(standardAuthority.dependencies),
        dataSnapshot: {
          artifactId: "official-standard-2000-web-gameplay-data-v1",
          content: state.officialGameplayDataBundle,
        },
      },
      compositionEvidence: {
        ...structuredClone(standardAuthority.compositionEvidence),
        webDryRunPrepared: !formalStandard2000,
        webDryRunPhase: formalStandard2000 ? null : "movement",
        currentProductMatchRuntimeHash: formalStandard2000
          ? rulesRuntime.descriptor.runtimeHash : null,
        completeMatchDryRunPassed: formalStandard2000,
      },
      serverSeatPlan,
      trainingTruth: false,
    };
    initialStateAuthority = Object.freeze({
      ...authorityBody,
      receiptHash: hash(authorityBody),
    });
    coverage = Object.freeze({
      mode: formalStandard2000
        ? "standard_2000_current_product_live_web"
        : "standard_2000_current_product_web_exploration",
      engagementScale: "Standard",
      battlefieldInches: { width: 54, height: 36 },
      mineralSpentBySide: { player1: 2000, player2: 2000 },
      vespeneSpentBySide: { player1: 115, player2: 140 },
      selectedUnitCount: 15,
      terrainPieceCount: 9,
      rosterHashBySide: structuredClone(
        standardAuthority.compositionEvidence.rosterHashBySide,
      ),
      missionRecordKey:
        standardAuthority.compositionEvidence.selectedMissionRecordKey,
      deploymentRecordKey:
        standardAuthority.compositionEvidence.selectedDeploymentRecordKey,
      mapSeedId: state.board?.battlefieldMapManifest?.mapSeedId || null,
      currentProductAbilityExactCount: 252,
      currentProductAbilityPendingCount: 0,
      legalSpaceComplete: formalStandard2000,
      productionRoomEligible: formalStandard2000,
      arbitraryArmyBuilderSupported: true,
      interactiveDeploymentSupported: true,
      fullMatchLifecycleSupported: formalStandard2000,
      parentFactoryReceiptHash: standardAuthority.receiptHash,
      trainingTruth: false,
    });
  } else {
    rulesRuntime = createOfficialTicket18CompleteMatchRuntimeV1({
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
    state = initialState({
      gameplayDataBundle,
      modelBaseGeometryDataBundle,
      missionSetupBinding,
      marineProfile: profileByKey["army_units:marine"],
      zerglingProfile: profileByKey["army_units:zergling"],
      terranCard,
      zergCard,
    });
    initialStateAuthority = {
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
    };
    coverage = Object.freeze({
      mode: "current_official_bounded_complete_match_development",
      unitRecordKeys: ["army_units:marine", "army_units:zergling"],
      missionRecordKey: "faction_cards:mission_hold_position",
      legalSpaceComplete: false,
      productionRoomEligible: false,
      arbitraryArmyBuilderSupported: false,
      interactiveDeploymentSupported: false,
      fullMatchLifecycleSupported: true,
      trainingTruth: false,
    });
  }
  const authorityEngine = createStarcraftTmgAuthoritativeEngine({
    rulesRuntime,
    allowIncompleteRuleRuntimeForDevelopment: !formalStandard2000,
    ...(options.refereeCrypto ? { refereeCrypto: options.refereeCrypto } : {}),
    now,
  });
  const roomRuntime = createStarcraftTmgRoomRuntime({
    authorityEngine,
    ...(options.roomStore ? { roomStore: options.roomStore } : {}),
    now,
    checkpointInterval: 8,
    characterReleaseChannel: "development_internal",
  });
  let createdRoom;
  if (options.resumeRoom === true) {
    const aggregate = await roomRuntime.roomStore.loadRoom(roomId);
    const resumeCredentials = options.resumeCredentials;
    ensure(aggregate?.envelope?.matchBinding?.bindingHash
      && resumeCredentials?.human?.seatToken
      && resumeCredentials?.bot?.seatToken,
    "TICKET20_DEMO_RESUME_AUTHORITY_MISSING");
    registerResumedMatchDependencies(authorityEngine,
      aggregate.envelope.matchBinding, initialStateAuthority, rulesRuntime);
    createdRoom = Object.freeze({
      ok: true,
      resumed: true,
      roomId,
      matchBinding: structuredClone(aggregate.envelope.matchBinding),
      credentials: structuredClone(resumeCredentials),
    });
  } else {
    createdRoom = await roomRuntime.createRoom({
      roomId,
      title: String(options.title
        || (standard2000
          ? "Ticket 23 · Standard 2000 Human vs Kerrigan Bot"
          : "Ticket 20 · Human vs Kerrigan Bot · Hold Position")),
      gameId: "starcraft-tmg",
      surfaceMode: String(options.surfaceMode || "human_agent_development"),
      initialStateAuthority,
      serverSeatPlan,
    });
  }
  ensure(createdRoom.ok, "TICKET20_DEMO_ROOM_CREATE_FAILED", {
    reason: createdRoom.reason,
  });
  const botScope = {
    gameId: "starcraft-tmg",
    roomId,
    matchBindingHash: createdRoom.matchBinding.bindingHash,
    seatKey: "player2",
  };
  const previewBotFiniteSuccessor = async (request = {}) => {
    const authority = request.authority || {};
    const aggregate = await roomRuntime.roomStore.loadRoom(authority.roomId);
    if (!aggregate
      || aggregate.envelope?.matchBindingHash !== authority.matchBindingHash
      || aggregate.stateRevision !== authority.stateRevision
      || aggregate.envelope?.stateHash !== authority.stateHash) {
      return { ok: false, reason: "PREEXECUTION_AUTHORITY_STALE",
        rulesAuthority: false };
    }
    if (!request.action
      || !new Set(["pass", "choose_first_actor"])
        .has(request.action.actionType)) {
      return { ok: false, reason: "PREEXECUTION_FINITE_PHASE_CONTROL_REQUIRED",
        rulesAuthority: false };
    }
    const applied = rulesRuntime.apply(aggregate.envelope.state,
      request.action, {
        postRevision: aggregate.stateRevision + 1,
        matchBinding: aggregate.envelope.matchBinding,
      });
    const nextState = applied.state;
    const controlledSeatActsNext = nextState.activeSideKey === botScope.seatKey;
    const next = controlledSeatActsNext
      ? rulesRuntime.enumerate(nextState, {
        sideKey: botScope.seatKey,
        includeDisabled: false,
      }) : { candidates: [], parameterDomains: [] };
    return {
      ok: true,
      preStateHash: authority.stateHash,
      nextStateRevision: aggregate.stateRevision + 1,
      nextStateHash: hash(nextState),
      nextRound: Number(nextState.round || 0),
      nextPhase: String(nextState.phase || "unknown"),
      nextActiveSideKey: nextState.activeSideKey || null,
      controlledSeatActsNext,
      controlledSeatNextFiniteActionTypes: [...new Set(
        (next.candidates || []).map((entry) => entry.actionType)
          .filter(Boolean))].sort(),
      controlledSeatNextParameterizedActionTypes: [...new Set(
        (next.parameterDomains || []).map((entry) => entry.actionType)
          .filter(Boolean))].sort(),
      rulesAuthority: true,
      mutationAuthority: false,
      liveRoomMutationCalls: 0,
      trainingTruth: false,
    };
  };
  const continuity = createStarcraftTmgMatchDecisionContinuityV1({
    now,
    ...(options.matchDecisionJournal ? {
      journal: options.matchDecisionJournal,
    } : {}),
    ...(options.enableSpatialPreexecution === true ? {
      preExecute: createStarcraftTmgSpatialPreexecutionSearchV1({
        previewSuccessor: previewBotFiniteSuccessor,
      }),
    } : {}),
  });
  const spatialRulesQuery =
    createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
      roomStore: roomRuntime.roomStore,
      rulesRuntime,
      seatKey: "player2",
    });
  const humanSpatialRulesQuery =
    createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
      roomStore: roomRuntime.roomStore,
      rulesRuntime,
      seatKey: "player1",
    });
  const spatialRuntime = createStarcraftTmgSpatialActionQueryRuntimeV1({
    rulesQuery: spatialRulesQuery.query,
  });
  const turnPlanRuntime = createStarcraftTmgTurnPlanRuntimeV1({
    decisionContinuity: continuity,
    now,
  });
  const botStore = options.botStore
    || createInMemoryStarcraftTmgHostedBotSeatStoreV1();
  const notifications = [];
  const botRuntimeOptions = {
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
    deferForPreexecution: options.enableSpatialPreexecution === true,
    ...(options.physicalAgentPort ? {
      physicalAgentPort: options.physicalAgentPort,
    } : {}),
  };
  const botRuntime = standard2000
    ? createStarcraftTmgHostedOpponentRuntimeV2({
      ...botRuntimeOptions,
      notificationPort: {
        async notify(event) {
          notifications.push(structuredClone(event));
          return { ok: true, notificationId: event.notificationId };
        },
      },
    })
    : createStarcraftTmgHostedBotSeatRuntimeV1(botRuntimeOptions);
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
  const humanRecovery = options.issueHumanRecovery === false ? null
    : await roomRuntime.issueSeatRecovery({
      roomId,
      seatToken: createdRoom.credentials.human.seatToken,
    });
  ensure(options.issueHumanRecovery === false || humanRecovery?.ok,
    "TICKET20_DEMO_HUMAN_RECOVERY_ISSUE_FAILED", {
      reason: humanRecovery?.reason,
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
    spatialRulesQuery,
    humanSpatialRulesQuery,
    turnPlanRuntime,
    notifications,
    roomProfile: formalStandard2000 ? "standard_2000_live"
      : standard2000 ? "standard_2000" : "bounded_ticket20",
    humanRecoveryToken: humanRecovery?.recovery?.recoveryToken || null,
    sourceBinding: loaded.manifest.sourceBinding,
    strategySkillRefs: loaded.entries.map((entry) => ({
      id: entry.skill.skillId,
      version: entry.skill.version,
      hash: entry.skill.hash,
    })),
    strategySkillEntries: loaded.entries,
    strategySkills: loaded.entries.map((entry) => entry.skill),
    coverage,
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
  const requestedExperiment = options.agentAgentExperiment || {};
  const base = await createTicket20HumanAgentDemoFixtureV1({
    ...options,
    occurredAt,
    now,
    autoDrive: false,
    attachBot: false,
    matchMode: "agent_vs_agent",
    title: options.title || "Ticket 20 · Agent vs Agent · Hold Position",
    surfaceMode: options.surfaceMode || "agent_agent_development",
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
  const previewPlayer1FiniteSuccessor = async (request = {}) => {
    const authority = request.authority || {};
    const aggregate = await base.roomRuntime.roomStore.loadRoom(
      authority.roomId,
    );
    if (!aggregate
      || aggregate.envelope?.matchBindingHash !== authority.matchBindingHash
      || aggregate.stateRevision !== authority.stateRevision
      || aggregate.envelope?.stateHash !== authority.stateHash) {
      return { ok: false, reason: "PREEXECUTION_AUTHORITY_STALE",
        rulesAuthority: false };
    }
    if (!request.action
      || !new Set(["pass", "choose_first_actor"])
        .has(request.action.actionType)) {
      return { ok: false, reason: "PREEXECUTION_FINITE_PHASE_CONTROL_REQUIRED",
        rulesAuthority: false };
    }
    const applied = base.rulesRuntime.apply(aggregate.envelope.state,
      request.action, {
        postRevision: aggregate.stateRevision + 1,
        matchBinding: aggregate.envelope.matchBinding,
      });
    const nextState = applied.state;
    const controlledSeatActsNext = nextState.activeSideKey === "player1";
    const next = controlledSeatActsNext
      ? base.rulesRuntime.enumerate(nextState, {
        sideKey: "player1",
        includeDisabled: false,
      }) : { candidates: [], parameterDomains: [] };
    return {
      ok: true,
      preStateHash: authority.stateHash,
      nextStateRevision: aggregate.stateRevision + 1,
      nextStateHash: hash(nextState),
      nextRound: Number(nextState.round || 0),
      nextPhase: String(nextState.phase || "unknown"),
      nextActiveSideKey: nextState.activeSideKey || null,
      controlledSeatActsNext,
      controlledSeatNextFiniteActionTypes: [...new Set(
        (next.candidates || []).map((entry) => entry.actionType)
          .filter(Boolean))].sort(),
      controlledSeatNextParameterizedActionTypes: [...new Set(
        (next.parameterDomains || []).map((entry) => entry.actionType)
          .filter(Boolean))].sort(),
      rulesAuthority: true,
      mutationAuthority: false,
      liveRoomMutationCalls: 0,
      trainingTruth: false,
    };
  };
  const player1Continuity = createStarcraftTmgMatchDecisionContinuityV1({
    now,
    ...(options.player1MatchDecisionJournal ? {
      journal: options.player1MatchDecisionJournal,
    } : {}),
    ...(options.enableSpatialPreexecution === true ? {
      preExecute: createStarcraftTmgSpatialPreexecutionSearchV1({
        previewSuccessor: previewPlayer1FiniteSuccessor,
      }),
    } : {}),
  });
  const player1SpatialRuntime = createStarcraftTmgSpatialActionQueryRuntimeV1({
    rulesQuery: base.humanSpatialRulesQuery.query,
  });
  const player1TurnPlanRuntime = createStarcraftTmgTurnPlanRuntimeV1({
    decisionContinuity: player1Continuity,
    now,
  });
  const player1RuntimeOptions = {
    roomPort: base.roomRuntime,
    decisionPort: options.player1DecisionPort
      || createTicket20DeterministicSkillGuidedDecisionPortV1(terranRefs, {
        agentLabel: "Terran 指挥官",
        ownFaction: "Terran",
        ownUnitName: "Marine",
        opponentFaction: "Zerg",
        opponentUnitName: "Zergling",
      }),
    store: options.player1BotStore
      || createInMemoryStarcraftTmgHostedBotSeatStoreV1(),
    decisionContinuity: player1Continuity,
    spatialObservationProjector: createStarcraftTmgPlayerSpatialObservationV1,
    spatialActionQueryRuntime: player1SpatialRuntime,
    turnPlanRuntime: player1TurnPlanRuntime,
    matchMode: "agent_vs_agent",
    now,
    autoDriveIntervalMs: options.autoDriveIntervalMs || 500,
    deferForPreexecution: options.enableSpatialPreexecution === true,
    ...(options.player1PhysicalAgentPort ? {
      physicalAgentPort: options.player1PhysicalAgentPort,
    } : {}),
  };
  const player1Notifications = [];
  const player1Runtime = base.roomProfile === "standard_2000_live"
    ? createStarcraftTmgHostedOpponentRuntimeV2({
      ...player1RuntimeOptions,
      notificationPort: {
        async notify(event) {
          player1Notifications.push(structuredClone(event));
          return { ok: true, notificationId: event.notificationId };
        },
      },
    })
    : createStarcraftTmgHostedBotSeatRuntimeV1(player1RuntimeOptions);
  const consent = {
    approved: true,
    approvedBy: "human",
    scope: "current_match_bot_seat",
    approvedAt: occurredAt,
  };
  const formalStandard2000 = base.roomProfile === "standard_2000_live";
  const rosterIdsBySeat = formalStandard2000
    ? base.coverage.rosterHashBySide
    : {
      player1: "bounded:army_units:marine@1",
      player2: "bounded:army_units:zergling@1",
    };
  const orchestrator = createStarcraftTmgAgentAgentExperimentOrchestratorV1({
    roomPort: base.roomRuntime,
    now,
    experimentCell: {
      experimentId: String(requestedExperiment.experimentId
        || (formalStandard2000
          ? "ticket23-standard-2000-agent-agent-live-v1"
          : "ticket20-agent-agent-closure-v1")),
      cellId: String(requestedExperiment.cellId
        || (formalStandard2000
          ? "lost-temple-terran-vs-kerrigan-swarm-001"
          : "hold-position-terran-vs-zerg-001")),
      denominator: requestedExperiment.denominator || { index: 1, total: 1 },
      roomId: base.roomId,
      matchBindingHash: base.createdRoom.matchBinding.bindingHash,
      versions: {
        source: `official-current:${base.sourceBinding.dataset}`,
        rules: `ticket11:${base.sourceBinding.rules}`,
        strategy: `ticket18-foundational:${hash(manifestRefs)}`,
      },
      scenario: {
        mapId: String(requestedExperiment.mapId
          || base.coverage.mapSeedId || "ticket20-hold-position-demo"),
        missionId: String(requestedExperiment.missionId
          || base.coverage.missionRecordKey
          || "faction_cards:mission_hold_position"),
        scalePoints: Number(requestedExperiment.scalePoints
          || (formalStandard2000 ? 2_000 : 500)),
        rosterIdsBySeat: requestedExperiment.rosterIdsBySeat
          || rosterIdsBySeat,
      },
      rng: {
        scheme: "authoritative_room_recorded_v1",
        seed: String(requestedExperiment.rngSeed
          || (formalStandard2000
            ? `room-authority:${base.createdRoom.matchBinding.bindingHash}`
            : "ticket20-hold-position-fixed-v1")),
      },
      budgets: {
        maxAppliedActions: Number(options.maxAppliedActions || 160),
        maxRecoverableFailuresPerState: 3,
      },
      seats: {
        player1: {
          agentId: String(requestedExperiment.player1AgentId
            || (formalStandard2000
              ? "ticket23-terran-selfplay-agent-v1"
              : "ticket20-terran-command-agent-v1")),
          factionRecordKey: TERRAN,
          providerId: String(requestedExperiment.player1ProviderId
            || (formalStandard2000
              ? "deepseek-live-opponent-provider-stack-v1"
              : "deterministic-skill-guided-development-v1")),
          skillRefs: terranRefs,
        },
        player2: {
          agentId: String(requestedExperiment.player2AgentId
            || (formalStandard2000
              ? "ticket23-kerrigan-swarm-selfplay-agent-v1"
              : "ticket20-kerrigan-swarm-agent-v1")),
          factionRecordKey: ZERG,
          providerId: String(requestedExperiment.player2ProviderId
            || (formalStandard2000
              ? "deepseek-live-opponent-provider-stack-v1"
              : "deterministic-skill-guided-development-v1")),
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
    player1Runtime,
    player1Scope,
    player1Continuity,
    player1SpatialRuntime,
    player1TurnPlanRuntime,
    player1Notifications,
    routedSkillRefsBySeat: Object.freeze({
      player1: terranRefs,
      player2: zergRefs,
    }),
    agentAgentCoverage: Object.freeze({
      denominator: formalStandard2000
        ? "1/1 Standard-2000 current-official live experiment cell"
        : "1/1 bounded current-official experiment cell",
      providerEvidence: formalStandard2000
        ? "independent_live_provider_per_seat"
        : "deterministic_skill_guided_no_model_call",
      strategyStrengthProven: false,
      fullMatchLifecycleSupported: true,
      pauseResumeRecoverySupported: true,
      automaticPromotion: false,
      trainingTruth: false,
    }),
  });
}
