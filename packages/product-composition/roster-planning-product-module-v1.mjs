// Ticket 27 / Slice 271 — thin product composition entry for the
// roster-planning workspace. Wires the EXISTING frozen/read-only ports into
// the isolated workspace service: the official development-tranche source
// lock, the Rules-owned Army Builder query port (sole legality authority), a
// fresh ISOLATED Standard-2000 initial-state authority as the laboratory's
// frozen source state (never a live Room; the laboratory proves zero source
// mutation), the Slice-269 Roster Strategist runtime, the committed portable
// strategy Skill pack and the workspace draft store. Live deliberation is not
// created here: it arrives only as an injected factory (the manifest's
// authorized verifier attaches the Keychain credential to the isolated Worker
// inside its own process). Without a factory the module honestly reports
// planning as unavailable; catalogue, drafts, manual override evaluation,
// export/import and replay resume still work.

import path from "node:path";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialStandardRoomInitialStateAuthorityV1 } from
  "./official-standard-room-factory-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "./official-current-product-match-runtime-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "../../scripts/support/official-development-tranche-source-lock-fixture-v1.mjs";
import { loadPortableFoundationalStrategyPackV2 } from
  "../strategy-skills/portable-foundational-skill-pack-loader-v2.mjs";
import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 as packManifest } from
  "../../content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs";
import {
  createOfficialArmyBuilderQueryPortV1,
} from "../roster-strategist/army-builder-query-port-v1.mjs";
import {
  createPregameSceneLaboratoryV1,
} from "../roster-strategist/pregame-scene-laboratory-v1.mjs";
import {
  createRosterStrategistRuntimeV1,
} from "../roster-strategist/roster-strategist-runtime-v1.mjs";
import {
  priceStarcraftTmgDeepSeekCurrentUsageV2,
} from "../secure-provider-runtime/provider-pricing-v2.mjs";
import {
  createRosterPlanningDraftStoreV1,
} from "../roster-planning-workspace/roster-planning-draft-store-v1.mjs";
import {
  createRosterPlanningWorkspaceServiceV1,
} from "../roster-planning-workspace/roster-planning-workspace-service-v1.mjs";
import {
  createRosterPlanningWorkspaceHttpAdapterV1,
} from "../roster-planning-workspace/roster-planning-workspace-http-v1.mjs";
import { createStarcraftTmgRosterTurnPlanSeedV1 } from
  "../online-agent-session/roster-plan-turn-plan-bridge-v1.mjs";

export const ROSTER_PLANNING_PRODUCT_MODULE =
  "packages/product-composition/roster-planning-product-module-v1.mjs";
export const ROSTER_PLANNING_PRODUCT_MODULE_VERSION = "1.0.0";
export const ROSTER_PLANNING_WORKSPACE_LAB_ROOM_ID =
  "ticket27-slice-271-roster-workspace-isolated-lab";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export async function createRosterPlanningProductModuleV1(input = {}) {
  const root = path.resolve(String(input.root || ""));
  if (!root) {
    throw Object.assign(new Error("ROSTER_PLANNING_PRODUCT_ROOT_REQUIRED"),
      { code: "ROSTER_PLANNING_PRODUCT_ROOT_REQUIRED" });
  }
  const dataDirectory = path.resolve(String(input.dataDirectory || ""));
  if (!dataDirectory) {
    throw Object.assign(
      new Error("ROSTER_PLANNING_PRODUCT_DATA_DIRECTORY_REQUIRED"),
      { code: "ROSTER_PLANNING_PRODUCT_DATA_DIRECTORY_REQUIRED" });
  }
  const deliberationFactory = input.deliberationFactory || null;
  // Explicit fixture root (brief isolation rule): the hash-locked source
  // bytes are read-only frozen artifacts; in an isolated worktree the
  // gitignored source-intake cache lives in the integration checkout, so the
  // caller passes that root explicitly. All new outputs stay in this
  // worktree's build directory.
  const fixtureRoot = path.resolve(String(input.fixtureRoot || root));

  // ---- frozen Rules/source/Skill infrastructure (read-only, 0 Provider cost)
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
    root: fixtureRoot });
  const bundle = createOfficialUnitCompositionUpgradeDataBundleV1({
    dataset: source.dataset });
  const builderPort = createOfficialArmyBuilderQueryPortV1({
    unitCompositionUpgradeDataBundle: bundle });
  const seatPlan = [
    { label: "player1", seatKey: "player1", roleMode: "supervisor",
      principalType: "human" },
    { label: "player2", seatKey: "player2", roleMode: "supervisor",
      principalType: "human" },
  ];
  const authority = createOfficialStandardRoomInitialStateAuthorityV1({
    dataset: source.dataset, snapshot: source.snapshot,
    serverSeatPlan: seatPlan,
    roomId: ROSTER_PLANNING_WORKSPACE_LAB_ROOM_ID });
  const rulesRuntime = createOfficialCurrentProductMatchRuntimeV1({
    dataset: source.dataset, state: structuredClone(authority.state) });
  const mapTopologyHash = hashStarcraftTmgContract({
    widthInches: authority.state.board.widthInches,
    heightInches: authority.state.board.heightInches,
    terrain: authority.state.board.terrain,
    accessPoints: authority.state.board.accessPoints,
    battlefieldMapManifestHash:
      authority.compositionEvidence.battlefieldMapManifestHash,
  });
  const laboratoryCore = createPregameSceneLaboratoryV1({
    laboratoryId: "ticket27-s271-roster-workspace-lab",
    sourceState: authority.state,
    sourceRoomRef: { roomId: ROSTER_PLANNING_WORKSPACE_LAB_ROOM_ID,
      stateRevision: 0 },
    rulesRuntime,
    armyBuilderPort: builderPort,
    matchBinding: authority.matchBinding,
  });
  const pack = await loadPortableFoundationalStrategyPackV2({
    root, manifest: packManifest });

  // Per-run laboratory facade: identical to the Slice 269-270 live-runner
  // discipline — receipts of every tool query are collected into the running
  // session's sink so query/simulation evidence is attributable per plan.
  function createRunLaboratory(sink) {
    const names = ["querySpatial", "queryProbability", "queryThreatExchange",
      "queryMath", "runScenarioBranch", "compareCandidatesSameState",
      "missionScoringAuthority"];
    return Object.freeze({
      labDescriptor: laboratoryCore.labDescriptor,
      proveMutationZero: laboratoryCore.proveMutationZero,
      ...Object.fromEntries(names.map((name) => [name, (...args) => {
        const receipt = laboratoryCore[name](...args);
        sink.toolReceipts.push(clone(receipt));
        return receipt;
      }])),
    });
  }
  function createStrategist({ laboratory }) {
    return createRosterStrategistRuntimeV1({
      armyBuilderPort: builderPort, laboratory, strategyPack: pack });
  }

  // Conservative cost estimate over accumulated redacted usage: cache
  // breakdown is filled as all-miss when the provider omitted it.
  function estimateCost(usage) {
    try {
      const receipt = priceStarcraftTmgDeepSeekCurrentUsageV2({
        providerId: "deepseek-openai-compatible-direct",
        requestedModel: usage.modelVersion || "deepseek-flash",
        reportedModel: usage.modelVersion || "deepseek-flash",
        startedAt: new Date().toISOString(),
        usage: {
          inputUnits: Number(usage.inputUnits || 0),
          outputUnits: Number(usage.outputUnits || 0),
          totalUnits: Number(usage.totalUnits || 0),
          inputCacheHitUnits: 0,
          inputCacheMissUnits: Number(usage.inputUnits || 0),
          reasoningOutputUnits: 0,
        },
      });
      return {
        calculatedCostNanoUsd: receipt.calculatedCostNanoUsd ?? null,
        calculatedCostCnyMicros: receipt.calculatedCostCnyMicros
          ?? Math.ceil(Number(receipt.calculatedCostNanoUsd || 0) * 8 / 1_000),
        pricingSnapshotHash: receipt.snapshotHash
          ?? receipt.receiptHash ?? null,
        cacheAssumption: "all_miss_conservative",
        estimated: true,
      };
    } catch {
      return null;
    }
  }

  const draftStore = createRosterPlanningDraftStoreV1({
    directory: dataDirectory });
  const service = createRosterPlanningWorkspaceServiceV1({
    serviceId: input.serviceId || "roster-planning-workspace-v1",
    armyBuilderPort: builderPort,
    laboratoryCore,
    createRunLaboratory,
    createStrategist,
    strategyPack: pack,
    fixture: {
      sourceLockHash: bundle.sourceLockHash,
      sourceSnapshotHash: bundle.sourceSnapshotHash,
      normalizedDatasetHash: bundle.normalizedDatasetHash,
      officialRulesVersion: bundle.officialRulesVersion,
      officialUnitsVersion: bundle.officialUnitsVersion,
      officialCardsVersion: bundle.officialCardsVersion,
      missionRecordKey: authority.compositionEvidence.selectedMissionRecordKey,
      deploymentRecordKey:
        authority.compositionEvidence.selectedDeploymentRecordKey,
      mapTopologyHash,
      laboratoryRoomId: ROSTER_PLANNING_WORKSPACE_LAB_ROOM_ID,
      laboratorySourceStateHash:
        laboratoryCore.labDescriptor().sourceStateHash,
    },
    draftStore,
    deliberationFactory,
    estimateCost,
    now: input.now,
    createSessionId: input.createSessionId,
  });
  const http = createRosterPlanningWorkspaceHttpAdapterV1({ service });
  const loaded = await service.loadPersisted();

  const descriptorBody = {
    schema: "starcraft_tmg_roster_planning_product_module_descriptor_v1",
    module: ROSTER_PLANNING_PRODUCT_MODULE,
    version: ROSTER_PLANNING_PRODUCT_MODULE_VERSION,
    laboratoryRoomId: ROSTER_PLANNING_WORKSPACE_LAB_ROOM_ID,
    isolatedLaboratorySourceState: true,
    fixtureRoot,
    fixtureRootReadOnly: true,
    liveRoomTouched: false,
    builderPortDescriptorHash: builderPort.portDescriptor().descriptorHash,
    laboratoryDescriptorHash: laboratoryCore.labDescriptor().descriptorHash,
    strategyPackReceiptHash: pack.receipt.hash,
    draftStoreLoadedSessions: loaded.loaded,
    draftStoreQuarantined: loaded.quarantined,
    liveDeliberationAttached: Boolean(deliberationFactory),
    trainingTruth: false,
  };

  // Server-only handoff. Never accept a caller-supplied projection as proof
  // of the current Room: read the exact seat from the RoomRuntime immediately
  // before preparing the bundle that HostedBotSeat.attach will recheck.
  async function preparePregamePlanForRoom(input = {}) {
    const { sessionId, roomRuntime, roomId, seatToken, scope } = input;
    if (typeof roomRuntime?.readRoom !== "function"
      || typeof sessionId !== "string" || !sessionId
      || typeof roomId !== "string" || !roomId
      || typeof seatToken !== "string" || !seatToken
      || scope?.gameId !== "starcraft-tmg"
      || scope?.roomId !== roomId || !scope?.matchBindingHash
      || !scope?.seatKey) {
      throw new TypeError("ROSTER_PLAN_ROOM_HANDOFF_INPUT_INVALID");
    }
    const session = service.readSession(sessionId);
    if (session.status !== "planned" || session.planEvidenceStale
      || !session.plan || !session.evidence?.sessionReceipt
      || session.working?.verdictSummary?.status !== "legal") {
      throw new TypeError("ROSTER_PLAN_ROOM_HANDOFF_PLAN_UNAVAILABLE");
    }
    const roomRead = await roomRuntime.readRoom({ roomId, seatToken });
    if (roomRead?.ok !== true || !roomRead.projection) {
      throw new TypeError("ROSTER_PLAN_ROOM_HANDOFF_ROOM_READ_FAILED");
    }
    const seed = createStarcraftTmgRosterTurnPlanSeedV1({
      rosterPlan: session.plan,
      sessionReceipt: session.evidence.sessionReceipt,
      roomProjection: roomRead.projection,
      scope,
    });
    return Object.freeze({
      plan: clone(session.plan),
      sessionReceipt: clone(session.evidence.sessionReceipt),
      originHash: seed.origin.originHash,
      roomStateRevision: seed.origin.openedAtStateRevision,
      trainingTruth: false,
    });
  }

  return Object.freeze({
    descriptor: () => Object.freeze({ ...descriptorBody,
      descriptorHash: hashStarcraftTmgContract(descriptorBody) }),
    service,
    preparePregamePlanForRoom,
    handle: (request) => http.handle(request),
    httpDescriptor: http.httpDescriptor,
  });
}
