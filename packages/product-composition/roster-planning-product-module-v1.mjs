import { normalizeAuthorityState } from '../authoritative-engine/transition-v1.mjs';
import { projectOfficialProductCatalogueV1 } from '../source-data/official-product-catalogue-projection-v1.mjs';
import { loadWave3MatchBoardFactoryV1, wave3HumanMapConfiguration } from './wave3-human-match-v1.mjs';
import { createOfficialRoomRosterDisclosureDataBundleV1 } from '../source-data/official-roster-disclosure-data-bundle-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../roster-strategist/roster-teach-evidence-port-v1.mjs';
import { bindOfficialReleaseRulesRuntimeV2 } from '../source-data/official-release-context-v2.mjs';
import {prepareRosterConditionalExperienceImportV1} from '../roster-planning-workspace/roster-conditional-experience-transfer-v1.mjs';
import {queryRosterConditionalExperienceSnapshotV1} from '../roster-planning-workspace/roster-conditional-experience-reader-v1.mjs';
import {normalizeRosterPlanningEntryV1} from '../roster-strategist/roster-planning-entry-v1.mjs';
import {rosterOpponentIsUnknownV1,rosterOpponentKnowledgeV1,createPublicRosterLaboratoryCarrierV1} from '../roster-strategist/roster-opponent-knowledge-v1.mjs';
import {ROSTER_REFERENCE_ARMY_PARAMETER_SCHEMA_V1} from '../roster-strategist/roster-workflow-operation-contracts-v1.mjs';
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
import {isDeepStrictEqual} from 'node:util';
import {projectRosterParticipantSourceV2} from '../roster-strategist/roster-participant-configuration-v1.mjs';
import { competitiveMapRoomSummaryAdmittedV1 } from
  "../client-domain/competitive-map-admission-contract-v1.mjs";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createOfficialStandardRoomInitialStateAuthorityV1,
  buildOfficialRoomArmyAuditV1,
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
  OFFICIAL_STANDARD_ROOM_FACTORY_VERSION,
  OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_VERSION,
} from "./official-standard-room-factory-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "./official-current-product-match-runtime-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV6 } from "./official-current-product-match-runtime-v6.mjs";
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
  createPresetRosterNoPregamePlanV1,
  createRosterPlanProvenanceV1,
} from "../roster-strategist/roster-plan-contracts-v1.mjs";
import {createRosterDecisionProductJourneyV1} from '../roster-planning-workspace/roster-decision-product-journey-v1.mjs';
import {
  createPregameSceneLaboratoryV1,
  PREGAME_LAB_RECEIPT_METHODS_V1,
} from "../roster-strategist/pregame-scene-laboratory-v1.mjs";
import { createPregameMapEvidencePortV1,
  evaluatePregameMapReadinessV1, projectPregameMapPhysicalFactsV1 } from
  "../roster-strategist/pregame-map-evidence-port-v1.mjs";
import {
  createRosterStrategistRuntimeV1,
} from "../roster-strategist/roster-strategist-runtime-v1.mjs";
import { rosterSelectionUnitRulesV1, rosterSelectionSupportRulesV1 } from
  "../roster-strategist/roster-selection-justification-v1.mjs";
import {
  priceStarcraftTmgDeepSeekCurrentUsageV2,
} from "../secure-provider-runtime/provider-pricing-v2.mjs";
import {
  createRosterPlanningDraftStoreV1,
} from "../roster-planning-workspace/roster-planning-draft-store-v1.mjs";
import { createPlanningLaboratorySourceStoreV1 } from
  '../roster-planning-workspace/planning-laboratory-source-store-v1.mjs';
import {assertRosterDecisionRunScopeV1,createRosterDecisionWorkspaceRunV1} from '../roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import {createRosterDecisionWorkflowStoreV1} from '../roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
import {createRosterWorkflowProviderBoundaryV1} from '../roster-planning-workspace/roster-workflow-provider-boundary-v1.mjs';
import {
  createRosterPlanningWorkspaceServiceV1,
} from "../roster-planning-workspace/roster-planning-workspace-service-v1.mjs";
import { isPresetRosterJourneyAcceptedV1 } from '../roster-planning-workspace/preset-roster-journey-v1.mjs';
import {
  createRosterPlanningWorkspaceHttpAdapterV1,
} from "../roster-planning-workspace/roster-planning-workspace-http-v1.mjs";
import { createStarcraftTmgRosterTurnPlanSeedV1 } from
  "../online-agent-session/roster-plan-turn-plan-bridge-v1.mjs";
import { createIterativeRosterProductPortV1 } from
  "../roster-strategist/iterative-roster-product-port-v1.mjs";
import { createAgentSelectedRosterJourneyV1, hasAcceptedCurrentRosterTeachV1 } from
  "../roster-planning-workspace/agent-selected-roster-journey-v1.mjs";
import { createAgentSelectedTeachPlanBridgeV1,
  createAgentSelectedTeachSessionReceiptV1 } from
  "../roster-strategist/agent-selected-teach-plan-bridge-v1.mjs";
import { AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA,
  verifyAgentScheduledRosterPlanV1 } from
  "../roster-strategist/agent-scheduled-roster-plan-v1.mjs";
import { verifyAgentScheduledRosterPlanRevisionLineageV1 } from
  "../roster-strategist/agent-scheduled-roster-plan-v1.mjs";
import { verifyRosterFinalPlanReviewAdjudicationV1 } from
  "../roster-strategist/roster-final-plan-review-v1.mjs";
import { auditRosterPlanVpReceiptsV1 } from
  "../roster-strategist/roster-plan-source-audit-v1.mjs";
import { collectRosterClaimRepairBacklogV1 } from
  "../roster-strategist/roster-claim-repair-backlog-v1.mjs";

export const ROSTER_PLANNING_PRODUCT_MODULE =
  "packages/product-composition/roster-planning-product-module-v1.mjs";
export const ROSTER_PLANNING_PRODUCT_MODULE_VERSION = "1.0.0";
export const ROSTER_PLANNING_WORKSPACE_LAB_ROOM_ID =
  "ticket27-slice-271-roster-workspace-isolated-lab";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

export function candidateRoomRecipe(candidate) {
  // Old name-only recipes stay byte-identical so saved scene identities remain
  // restorable. Any richer Native addressing must cross intact, not be reduced
  // to names/kinds and silently lose profiles, model IDs or nominations.
  const legacyLossless=candidate.units.every(unit=>typeof unit.compositionKind==='string'
    &&unit.compositionProfileId==null&&unit.startingModelIds===undefined
    &&unit.upgrades.every(upgrade=>typeof upgrade.upgradeName==='string'
      &&upgrade.purchasableUpgradeProfileId==null&&upgrade.upgradeInstanceId===undefined
      &&upgrade.nominatedModelId===undefined));
  if(!legacyLossless)return {
    factionRecordKey:candidate.factionRecordKey,
    tacticalCardRecordKeys:clone(candidate.tacticalCardRecordKeys),
    units:clone(candidate.units),nativeCandidateInput:clone(candidate),
  };
  return {
    factionRecordKey: candidate.factionRecordKey,
    tacticalCardRecordKeys: clone(candidate.tacticalCardRecordKeys),
    units: candidate.units.map((unit) => ({
      unitInstanceId: unit.unitInstanceId,
      recordKey: unit.recordKey,
      compositionKind: unit.compositionKind,
      upgradeNames: unit.upgrades.map((upgrade) => upgrade.upgradeName),
    })),
  };
}

function roomLaunchFail(code) {
  throw Object.assign(new Error(code), { code, httpStatus: 409 });
}

export function roomMapMatchesPlanBinding(roomMap, mapBinding,
  { roomState, mapSummary } = {}) {
  if (!(roomMap?.roomFreezeHash && mapBinding
    && roomMap.seedId === mapBinding.seedId
    && roomMap.compilationHash === mapBinding.compilationHash
    && competitiveMapRoomSummaryAdmittedV1(roomMap)
    && roomMap.mutationAfterRoomCreationAllowed === false
    && roomMap.backgroundRulesAuthority === false)) return false;
  if (roomMap.missionSpatialReachabilityAuditHash
    === mapBinding.rulesReachabilityAuditHash) return true;
  // A valid fresh room can have another search witness without changing its
  // physical map. Do not demand byte-equal advisory audits across instances.
  // Use the plan's original source-bound summary and a verified native Room
  // summary; real geometry/task/source changes still reject the handoff.
  if (!roomState || !mapSummary
    || ["seedId", "compilationHash", "rulesReachabilityAuditHash"]
      .some(key => mapSummary.mapBinding?.[key] !== mapBinding[key])) return false;
  try {
    const current = createPregameMapEvidencePortV1({ sourceState: roomState })
      .summarizeMap({ queryId: "room-plan-physical-identity" });
    if (current.mapBinding.roomFreezeHash !== roomMap.roomFreezeHash) return false;
    const before = projectPregameMapPhysicalFactsV1(mapSummary);
    const after = projectPregameMapPhysicalFactsV1(current);
    return Boolean(before && after && hashStarcraftTmgContract(before)
      === hashStarcraftTmgContract(after));
  } catch {
    return false;
  }
}

export function rosterPlanMatchesSelectedBudgetV1(plan, mineralBudget) {
  return Number.isSafeInteger(mineralBudget) && mineralBudget > 0
    && plan?.rosterCandidate?.mineralBudget === mineralBudget
    && plan?.budgetAcceptance?.mineralSpent === mineralBudget;
}

function reviewedPlanUsesCurrentMissionSource({ plan, review,
  toolReceipts, missionProfile }) {
  if (!plan || !review?.sourceAudit || !missionProfile
    || plan.openingDeploymentSchedule?.missionScoringProfileHash
      !== missionProfile.missionScoringProfileHash) return false;
  const currentAudit = auditRosterPlanVpReceiptsV1({ plan, toolReceipts });
  return review.sourceAudit.auditHash === currentAudit.auditHash;
}

// Called only after the complete Plan revision lineage has been verified.
// Narrative route/fallback repairs are model-owned; route type and VP target
// schedule remain fixed in this text-only revision lane. Check the event
// which actually changed the route, not just the very first revision.
export function agentSelectedScoreRouteRevisionsAllowedV1(initialPlan,
  intermediatePlans, finalPlan) {
  const chain = [initialPlan, ...intermediatePlans, finalPlan];
  const fixedFields = route => ({ routeKind: route.routeKind,
    scheduleStatus: route.scheduleStatus, targetVpSchedule: route.targetVpSchedule });
  const initialFacts = hashStarcraftTmgContract(fixedFields(initialPlan.scoreRoute));
  return chain.every((plan, index) => (
    hashStarcraftTmgContract(fixedFields(plan.scoreRoute)) === initialFacts
      && (index === 0
        || plan.scoreRoute.scoreRouteHash === chain[index - 1].scoreRoute.scoreRouteHash
        || plan.revisions.at(-1)?.revisedSectionKeys.includes("scoreRoute"))));
}

export function assertRosterPlanningSkillSourceV1(release) {
  const expected = release.manifest.source.datasetHash;
  const actual = release.resources.strategySkills?.sourceBinding?.dataset;
  if (!actual || actual !== expected || expected !== release.dataset.datasetHash) {
    throw Object.assign(Error('ROSTER_PLANNING_SKILL_SOURCE_MISMATCH'), {
      code: 'ROSTER_PLANNING_SKILL_SOURCE_MISMATCH', expected, actual: actual ?? null,
    });
  }
}

export function createRosterPlanningBoardLaboratoryV1(input) {
  const { rulesRuntime, armyBuilderPort, matchBinding } = input;
  const rules = rulesRuntime.releaseBinding;
  const builder = armyBuilderPort.portDescriptor().releaseBinding;
  const room = matchBinding?.releaseBinding;
  if (rules || builder || room) {
    const keys = ['manifestHash', 'releaseId', 'sourceSnapshotHash', 'normalizedDatasetHash'];
    if (!rules || !builder || keys.some(key => !rules[key] || builder[key] !== rules[key])
      || rules.runtimeHash !== rulesRuntime.descriptor.runtimeHash
      || room && (keys.some(key => room[key] !== rules[key]) || room.runtimeHash !== rules.runtimeHash)) {
      throw Object.assign(Error('ROSTER_PLANNING_BOARD_RELEASE_MISMATCH'), { code: 'ROSTER_PLANNING_BOARD_RELEASE_MISMATCH' });
    }
  }
  return createPregameSceneLaboratoryV1(input);
}

// Board evidence is available before strategy-pack qualification and never opens a provider.
async function openWave3PlanningBoard(input) {
  const setup = input.wave3MatchSetup;
  const roomId = input.roomId || ROSTER_PLANNING_WORKSPACE_LAB_ROOM_ID;
  const factory = await loadWave3MatchBoardFactoryV1({root: input.root, setup});
  const opening = factory.prepare({roomId, recipes: input.referenceArmyRecipes,
    mapConfiguration: input.mapConfiguration ?? wave3HumanMapConfiguration(setup)});
  const {releaseContext, rulesRuntime} = factory.bind(opening.state);
  const {unitCompositionUpgradeDataBundle} = createOfficialRoomRosterDisclosureDataBundleV1({
    releaseContext, dataset: releaseContext.dataset, snapshot: releaseContext.snapshot});
  const armyBuilderPort = createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle, releaseContext});
  const sourceState = normalizeAuthorityState(opening.state, 0);
  const laboratory = createRosterPlanningBoardLaboratoryV1({rulesRuntime, armyBuilderPort,
    sourceRoomRef: {roomId, stateRevision: 0}, sourceState});
  return Object.freeze({releaseBinding: rulesRuntime.releaseBinding, armyBuilderPort, laboratory,
    readBuilderCatalogue: () => projectOfficialProductCatalogueV1({dataset:releaseContext.dataset,
      snapshot:releaseContext.snapshot,sourceBinding:{releaseSourceHash:setup.sourceHash},queryAbilityTiming:rulesRuntime.queryAbilityTiming}),
    mapEvidencePort: createPregameMapEvidencePortV1({sourceState, releaseBinding: rulesRuntime.releaseBinding}),
    teachEvidencePort: createRosterTeachEvidencePortV1(laboratory)});
}

export function createRosterDecisionDraftScopeV1({candidateInput, planHash, descriptor, mapTopologyHash}) {
  return {
    army: candidateInput ? hashStarcraftTmgContract(candidateInput) : 'public-reference-armies',
    plan: planHash, rules: descriptor.rulesRuntimeHash, map: mapTopologyHash, source: descriptor.sourceStateHash,
    ...(descriptor.releaseBinding ? {releaseManifest: descriptor.releaseBinding.manifestHash} : {}),
  };
}

export async function createRosterPlanningProductModuleV1(input = {}) {
  if (input.wave3MatchSetup && (!input.referenceArmyRecipes?.player1 || !input.referenceArmyRecipes.player2))
    throw Error('WAVE3_PLANNING_REFERENCE_RECIPES_REQUIRED');
  if (input.operation === 'board_queries') {
    if (!input.wave3MatchSetup || input.releaseResolver || input.releaseId) throw Error('WAVE3_PLANNING_BOARD_SOURCE_REQUIRED');
    return openWave3PlanningBoard(input);
  }
  if (input.wave3MatchSetup && !(input.releaseResolver && input.releaseId)) {
    throw Error('WAVE3_PLANNING_QUALIFIED_STRATEGY_RELEASE_REQUIRED');
  }
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
  const frozenMapConfiguration = input.mapConfiguration
    ? clone(input.mapConfiguration) : input.wave3MatchSetup ? wave3HumanMapConfiguration(input.wave3MatchSetup) : null;
  // Server-owned scenario input, validated by the same native army/room
  // constructor as the default. A matchup label alone cannot change a foe.
  const referenceArmyRecipes = clone(input.referenceArmyRecipes
    || OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1);
  // Explicit fixture root (brief isolation rule): the hash-locked source
  // bytes are read-only frozen artifacts; in an isolated worktree the
  // gitignored source-intake cache lives in the integration checkout, so the
  // caller passes that root explicitly. All new outputs stay in this
  // worktree's build directory.
  const fixtureRoot = path.resolve(String(input.fixtureRoot || root));

  // ---- frozen Rules/source/Skill infrastructure (read-only, 0 Provider cost)
  const release = input.releaseResolver
    ? await input.releaseResolver.resolve({ releaseId: input.releaseId, purpose: 'planning' })
    : null;
  if (input.releaseId && !input.releaseResolver) {
    throw Object.assign(Error('ROSTER_RELEASE_RESOLVER_REQUIRED'), { code: 'ROSTER_RELEASE_RESOLVER_REQUIRED' });
  }
  if (input.wave3MatchSetup && !release) throw Error('WAVE3_PLANNING_QUALIFIED_STRATEGY_RELEASE_REQUIRED');
  if (release) assertRosterPlanningSkillSourceV1(release);
  const boardFactory = input.wave3MatchSetup ? await loadWave3MatchBoardFactoryV1({root,setup:input.wave3MatchSetup}) : null;
  if (boardFactory && (release.manifest.source.datasetHash !== boardFactory.datasetHash || release.manifest.source.snapshotHash !== boardFactory.snapshotHash)) {
    throw Error('WAVE3_PLANNING_RELEASE_SOURCE_MISMATCH');
  }
  const source = release ? {
    dataset: release.dataset, snapshot: release.snapshot,
  } : await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: fixtureRoot });
  const bundle = release ? release.resources.armyBuilder
    : createOfficialUnitCompositionUpgradeDataBundleV1({ dataset: source.dataset });
  if (release && (typeof release.resources.roomFactory?.create !== 'function'
    || typeof release.resources.rulesRuntime?.create !== 'function')) {
    throw Object.assign(Error('ROSTER_RELEASE_FACTORY_MISSING'), { code: 'ROSTER_RELEASE_FACTORY_MISSING' });
  }
  const createRoomAuthority = release
    ? options => release.resources.roomFactory.create({ ...options, releaseContext: release })
    : createOfficialStandardRoomInitialStateAuthorityV1;
  const builderPort = createOfficialArmyBuilderQueryPortV1({
    unitCompositionUpgradeDataBundle: bundle,
    ...(release ? { releaseContext: release } : {}) });
  const seatPlan = [
    { label: "player1", seatKey: "player1", roleMode: "supervisor",
      principalType: "human" },
    { label: "player2", seatKey: "player2", roleMode: "supervisor",
      principalType: "human" },
  ];
  const laboratorySources = createPlanningLaboratorySourceStoreV1({
    directory: path.join(dataDirectory, 'laboratory-sources'),
  });
  function pinnedAuthority(options) {
    const construction = {
      serverSeatPlan: seatPlan,
      roomId: ROSTER_PLANNING_WORKSPACE_LAB_ROOM_ID,
      ...options,
    };
    return laboratorySources.get({
      scope: {
        version: '1.0.0',
        factoryVersion: construction.armySpendPolicy === OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY
          ? OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_VERSION : OFFICIAL_STANDARD_ROOM_FACTORY_VERSION,
        sourceLockHash: source.lock?.lockHash || null,
        ...(release ? { releaseManifestHash: release.manifest.manifestHash } : {}),
        ...(boardFactory ? {wave3Setup:input.wave3MatchSetup} : {}),
        snapshotHash: source.snapshot.snapshotHash,
        datasetHash: source.dataset.datasetHash,
        construction,
      },
      create: () => {
        const qualified = createRoomAuthority({dataset: source.dataset, snapshot: source.snapshot, ...construction});
        if (boardFactory) {
          const match = boardFactory.prepare(construction);
          const signed = normalizeAuthorityState(match.state,0);
          if (hashStarcraftTmgContract(signed) !== hashStarcraftTmgContract(normalizeAuthorityState(qualified.state,0))) {
            throw Error('WAVE3_PLANNING_QUALIFIED_ROOM_DIFFERS_FROM_MATCH');
          }
          return {...qualified,state:signed};
        }
        return qualified;
      },
    });
  }
  const authority = pinnedAuthority({
    recipes: referenceArmyRecipes,
    ...(frozenMapConfiguration
      ? { mapConfiguration: frozenMapConfiguration } : {}),
  });
  const planningReferenceArmies = Object.fromEntries(['player1', 'player2'].map(side => [side, {
    factionRecordKey: authority.state.armyBuildingConfigurationBySide[side].factionRecordKey,
    recipeHash: hashStarcraftTmgContract(authority.state.armyBuildingConfigurationBySide[side]),
    mineralSpent: authority.state.armyResourceBudgetsBySide[side].mineralSpent,
    role: 'public_reference_not_observed_enemy_roster',
  }]));
  const createPlanningRules = state => release
    ? bindOfficialReleaseRulesRuntimeV2({ context: release,
      runtime: release.resources.rulesRuntime.create({ dataset: source.dataset, state: clone(state),
        releaseManifest: release.manifest, releaseContext: release }) })
    : createOfficialCurrentProductMatchRuntimeV6({
      legacyRuntime: createOfficialCurrentProductMatchRuntimeV1({ dataset: source.dataset, state: clone(state) }) });
  function rulesForBoard(state) {
    const runtime=createPlanningRules(state);
    if (boardFactory && runtime.releaseBinding.runtimeHash!==boardFactory.bind(state).rulesRuntime.releaseBinding.runtimeHash) {
      throw Error('WAVE3_PLANNING_QUALIFIED_RULES_DIFFER_FROM_MATCH');
    }
    return runtime;
  }
  const rulesRuntime = rulesForBoard(authority.state);
  const mapEvidencePort = createPregameMapEvidencePortV1({sourceState: authority.state, releaseBinding: rulesRuntime.releaseBinding});
  const mapTopologyHash = hashStarcraftTmgContract({
    widthInches: authority.state.board.widthInches,
    heightInches: authority.state.board.heightInches,
    terrain: authority.state.board.terrain,
    accessPoints: authority.state.board.accessPoints,
    battlefieldMapManifestHash:
      authority.compositionEvidence.battlefieldMapManifestHash,
  });
  const createLaboratoryCore = (runAuthority = authority) =>
    createRosterPlanningBoardLaboratoryV1({
    laboratoryId: "ticket27-s271-roster-workspace-lab",
    sourceState: runAuthority.state,
    sourceRoomRef: { roomId: ROSTER_PLANNING_WORKSPACE_LAB_ROOM_ID,
      stateRevision: 0 },
    rulesRuntime: runAuthority === authority ? rulesRuntime
      : rulesForBoard(runAuthority.state),
    armyBuilderPort: builderPort,
    matchBinding: runAuthority.matchBinding,
    // Diagnostics stay outside model inputs, receipts and Rules authority.
    observeQueryBatchDiagnostic: input.observeQueryBatchDiagnostic,
  });
  const laboratoryCore = createLaboratoryCore();
  const pack = await loadPortableFoundationalStrategyPackV2({
    root, manifest: release ? release.resources.strategySkills : packManifest });

  // Per-run laboratory facade: identical to the Slice 269-270 live-runner
  // discipline — receipts of every tool query are collected into the running
  // session's sink so query/simulation evidence is attributable per plan.
  const publicCarriers=new Map();
  function publicCarrier(setup,sideKey,factionRecordKey){
    const key=JSON.stringify([sideKey,factionRecordKey,setup.engagementScale,setup.mineralBudget]);
    if(!publicCarriers.has(key))publicCarriers.set(key,createPublicRosterLaboratoryCarrierV1({builderPort,dataset:source.dataset,sideKey,factionRecordKey,scaleId:setup.engagementScale,mineralBudget:setup.mineralBudget}));
    return clone(publicCarriers.get(key));
  }
  function createRunLaboratory(sink, context = {}) {
    // Proof receipts include operationCount and receiptLog. Sharing the core
    // across runs would make an identical retained paid Teach reply acquire a
    // different context hash after a replay or another session's queries.
    // Once a roster is locked/selected, its actual instance IDs, compositions
    // and upgrades own the isolated scenario source. Keep the opposing recipe
    // as the frozen reference army, not an assertion about a hidden live foe.
    const selected = context.candidateInput;
    const ownSide = selected?.sideKey || context.setup?.sideKey || 'player1';
    const opponentSide = ownSide === 'player1' ? 'player2' : 'player1';
    const requestedOpponent = context.setup?.opponentFactionRecordKey;
    const unknown=rosterOpponentIsUnknownV1(context.setup);
    if(context.opponentCandidateInput&&!unknown)throw Object.assign(Error('ROSTER_KNOWN_OPPONENT_HYPOTHESIS_NOT_AUTHORIZED'),{code:'ROSTER_KNOWN_OPPONENT_HYPOTHESIS_NOT_AUTHORIZED'});
    const knowledge=unknown?rosterOpponentKnowledgeV1(context.setup,{explicitHypothesis:!!context.opponentCandidateInput}):null;
    const recipes=unknown?{
      [ownSide]:candidateRoomRecipe(selected??publicCarrier(context.setup,ownSide,context.setup.factionRecordKey)),
      [opponentSide]:candidateRoomRecipe(context.opponentCandidateInput??publicCarrier(context.setup,opponentSide,requestedOpponent)),
    }:referenceArmyRecipes;
    if(context.opponentCandidateInput){
      const enemy=context.opponentCandidateInput;
      if(enemy.sideKey!==opponentSide||enemy.factionRecordKey!==requestedOpponent
        ||enemy.scaleId!==context.setup.engagementScale||enemy.mineralBudget!==context.setup.mineralBudget)
        throw Object.assign(Error('ROSTER_OPPONENT_HYPOTHESIS_SCOPE_MISMATCH'),{code:'ROSTER_OPPONENT_HYPOTHESIS_SCOPE_MISMATCH'});
      const verdict=builderPort.evaluateRosterCandidate(enemy);
      if(verdict.status!=='legal')throw Object.assign(Error('ROSTER_OPPONENT_HYPOTHESIS_ILLEGAL'),{code:'ROSTER_OPPONENT_HYPOTHESIS_ILLEGAL',detail:verdict});
    }
    if (requestedOpponent && requestedOpponent !== recipes[opponentSide].factionRecordKey) {
      throw Object.assign(new Error('ROSTER_PLANNING_REFERENCE_OPPONENT_MISMATCH'), {
        code: 'ROSTER_PLANNING_REFERENCE_OPPONENT_MISMATCH',
        detail: 'Configure a Rules-legal reference army for the declared opponent before querying this scene.',
      });
    }
    const runAuthority = selected||unknown
      ? pinnedAuthority({
        recipes: { ...clone(recipes),
          ...(selected?{[selected.sideKey]: candidateRoomRecipe(selected)}:{}) },
        armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
        ...(context.setup?.missionBinding ? {
          missionRecordKey: context.setup.missionBinding.missionRecordKey,
          deploymentRecordKey: context.setup.missionBinding.deploymentRecordKey,
        } : {}),
        ...(frozenMapConfiguration
          ? { mapConfiguration: clone(frozenMapConfiguration) } : {}),
      }) : authority;
    const runCore = createLaboratoryCore(runAuthority);
    // Map geometry is unchanged, but its source-state binding includes the
    // army. Every map and scenario query must refer to this same run source.
    const runMapEvidencePort = runAuthority === authority ? mapEvidencePort
      : createPregameMapEvidencePortV1({sourceState: runAuthority.state, releaseBinding: runCore.labDescriptor().releaseBinding});
    const names = PREGAME_LAB_RECEIPT_METHODS_V1;
    const readParticipantConfigurations=({base}={})=>{
      const value=projectRosterParticipantSourceV2({candidateInput:selected,referenceArmyRecipes:recipes,ownSide,
        upgradeProfiles:bundle.purchasableUpgradeProfiles,snapshot:runCore.captureComparisonSnapshot({base})});
      if(!knowledge)return value;
      return {...value,opponentKnowledge:clone(knowledge),units:value.units.map(u=>({...u,
        sourceKind:u.sideKey===ownSide&&selected?'selected_draft':u.sideKey===opponentSide&&context.opponentCandidateInput?'model_selected_hypothesis':'public_laboratory_carrier'})),
        instruction:knowledge.instruction};
    };
    return Object.freeze({
      labDescriptor: runCore.labDescriptor,
      opponentKnowledge:()=>clone(knowledge),
      describeComparisonInterventions: runCore.describeComparisonInterventions,
      proveMutationZero: runCore.proveMutationZero,
      // The real Teach/query contract needs named units from this same
      // immutable source/branch, not just a list of callable query methods.
      describeQueryContext(query={}) {
        const context=runCore.describeQueryContext(query);
        return {...context,participantSource:readParticipantConfigurations({base:{kind:'branch',branchStateHash:context.baseStateHash}})};
      },
      readParticipantConfigurations,
      describeMapQueries: runMapEvidencePort.describeMapQueries,
      readReferenceArmies(query={}) {
        if(!query.queryId||query.sideKey&&!ROSTER_REFERENCE_ARMY_PARAMETER_SCHEMA_V1.properties.sideKey.enum.includes(query.sideKey))
          throw new TypeError('ROSTER_REFERENCE_QUERY_ID_OR_SIDE_INVALID');
        const armies=['player1','player2'].filter(side=>!query.sideKey||query.sideKey===side).map(sideKey=>({
          sideKey,sourceKind:sideKey===ownSide&&selected?'selected_draft':unknown?'hypothetical_laboratory_recipe':'frozen_reference_recipe',
          recipe:clone(sideKey===ownSide&&selected?candidateRoomRecipe(selected):recipes[sideKey]),
        }));
        const receipt={schema:'roster_frozen_reference_inputs_v1',queryId:query.queryId,
          sourceStateHash:runCore.labDescriptor().sourceStateHash,resultStatus:'observed_frozen_inputs',
          ownSide,opponentSide,armies,participantSource:readParticipantConfigurations(),mutatesRoomState:false,trainingTruth:false,
          ...(knowledge?{opponentKnowledge:clone(knowledge)}:{}),
          evidenceScope:knowledge?knowledge.instruction:'Exact inputs of this private Rules source, including chosen compositions, upgrades and cards. Opponent is a frozen experimental reference, not observed hidden live-enemy truth; no strategic ranking or win prediction.'};
        sink.toolReceipts.push(clone(receipt));return receipt;
      },
      restoreNativeActionBranch: runCore.restoreNativeActionBranch,
      restoreHypotheticalBranch: runCore.restoreHypotheticalBranch,
      restoreFormationSelectionBranch: runCore.restoreFormationSelectionBranch,
      // Internal layout reads are not new observations; projected branches are
      // recorded by the same receipt wrapper as other Native branch operations.
      captureSceneLayout: runCore.captureSceneLayout,
      captureComparisonSnapshot: runCore.captureComparisonSnapshot,
      restoreProjectedScenarioBranch: runCore.restoreProjectedScenarioBranch,
      inspectScenarioInput: runCore.inspectScenarioInput,
      inspectQueryPrerequisites: runCore.inspectQueryPrerequisites,
      ...Object.fromEntries(names.map((name) => [name, (...args) => {
        const receipt = runCore[name](...args);
        if (receipt && typeof receipt.then === "function") return receipt.then(value => {
          sink.toolReceipts.push(clone(value));
          return value;
        });
        sink.toolReceipts.push(clone(receipt));
        return receipt;
      }])),
      summarizeMap(query) {
        const receipt = runMapEvidencePort.summarizeMap(query);
        sink.toolReceipts.push(clone(receipt));
        return receipt;
      },
      deploymentGeometry(query) {
        const receipt = runMapEvidencePort.deploymentGeometry(query);
        sink.toolReceipts.push(clone(receipt));
        return receipt;
      },
      routeToObjective(query) {
        const receipt = runMapEvidencePort.routeToObjective(query);
        sink.toolReceipts.push(clone(receipt));
        return receipt;
      },
      compareObjectiveAccess(query) {
        const receipt = runMapEvidencePort.compareObjectiveAccess(query);
        sink.toolReceipts.push(clone(receipt));
        return receipt;
      },
      evaluateRosterRoute(query) {
        const receipt = runMapEvidencePort.evaluateRosterRoute(query);
        sink.toolReceipts.push(clone(receipt));
        return receipt;
      },
    });
  }
  function createStrategist({ laboratory }) {
    return createRosterStrategistRuntimeV1({
      armyBuilderPort: builderPort, laboratory, strategyPack: pack,
      selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
      selectionSupportRules: rosterSelectionSupportRulesV1(source.dataset) });
  }

  // New P0-P6 workflow uses the same frozen source/Builder/Rules ports. It has
  // its own explicitly named Run and cannot resume or overwrite a legacy one.
  function decisionDraftContext(draft,{setup={},candidateInput,planHash='unplanned'}={}){
    const selected=draft?.candidateInput??candidateInput;
    const laboratory=createRunLaboratory({toolReceipts:[]},{setup,candidateInput:selected?.units?.length?selected:undefined});
    const descriptor=laboratory.labDescriptor();
    return {laboratory,scope:createRosterDecisionDraftScopeV1({candidateInput:selected,
      planHash:draft?.plan?.planHash??planHash, descriptor, mapTopologyHash})};
  }
  async function openDecisionWorkflow({runId,setup={},candidateInput,planHash='unplanned',onEvent,onRequest,onReply,onTool,networkRecoveryPolicy,shouldStopReadQuery}={}) {
    if(!/^[A-Za-z0-9_-]{1,80}$/u.test(runId||''))throw Error('ROSTER_DECISION_RUN_ID_INVALID');
    const directory=path.join(dataDirectory,'decision-workflows',runId);
    const store=createRosterDecisionWorkflowStoreV1({directory}),retained=await store.load();
    const savedDraft=retained?.draftRef?await store.get(retained.draftRef):null;
    const createDraftContext=draft=>decisionDraftContext(draft,{setup,candidateInput,planHash});
    const {laboratory,scope}=createDraftContext(savedDraft);
    if(retained)assertRosterDecisionRunScopeV1(retained.scope,scope);
    const port=deliberationFactory?.createForRun
      ?await createRosterWorkflowProviderBoundaryV1({factory:deliberationFactory,sessionId:runId,runKind:'teach-framework',planHash,onEvent,networkRecoveryPolicy,
        dispatchJournalFile:path.join(directory,'provider-dispatches.jsonl')})
      :{deliberate:async()=>{throw Error('ROSTER_DECISION_PROVIDER_UNAVAILABLE');}};
    const resources={
      strategyRoute:query=>createStrategist({laboratory}).selectSkillRoute(query),
      unitRules:rosterSelectionUnitRulesV1(source.dataset),supportRules:rosterSelectionSupportRulesV1(source.dataset),
    };
    const createCandidateLaboratory=(selected,{opponentCandidateInput}={})=>createRunLaboratory({toolReceipts:[]},{setup,candidateInput:selected,opponentCandidateInput});
    return createRosterDecisionWorkspaceRunV1({directory,builderPort,createDraftContext,createCandidateLaboratory,resources,
      laboratory,deliberation:port,sessionId:runId,scope,onRequest,onReply,onTool,onEvent,shouldStopReadQuery,
      loadRetainedOfflineReply:deliberationFactory?.loadRetainedOfflineReply?.bind(deliberationFactory),
      blindOpponent:rosterOpponentIsUnknownV1(setup)});
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
  // Immutable Slice-272 preset comparison arm (explicitly no_pregame_plan),
  // computed once from the frozen Rules-owned bundle/recipe — read-only,
  // zero Provider cost. Every completed Agent plan is recorded against this
  // arm identity in the session's immutable presetComparison record.
  const presetAudit = buildOfficialRoomArmyAuditV1(bundle, "player1",
    referenceArmyRecipes.player1,
    { dataset: source.dataset });
  const presetPlan = createPresetRosterNoPregamePlanV1({
    planId: "preset-standard-2000-player1-s272-comparison",
    sideKey: "player1",
    presetBinding: {
      rosterHash: hashStarcraftTmgContract({
        sideKey: "player1",
        recipe: referenceArmyRecipes.player1 }),
      armyAuditResultHash: presetAudit.resultHash,
      presetSource: "fixed_standard_2000_recipe",
    },
  });
  const presetArm = {
    planStatus: presetPlan.planStatus,
    presetRoster: true,
    planFabricated: false,
    planHash: presetPlan.planHash,
    armyAuditResultHash: presetAudit.resultHash,
    mineralSpent: presetAudit.armyResourceBudgetResult.mineralSpent,
    vespeneSpent: presetAudit.armyResourceBudgetResult.vespeneSpent,
    presetSource: "fixed_standard_2000_recipe",
  };
  const service = createRosterPlanningWorkspaceServiceV1({
    serviceId: input.serviceId || "roster-planning-workspace-v1",
    armyBuilderPort: builderPort,
    laboratoryCore,
    createRunLaboratory,
    createStrategist,
    selectionUnitRules: rosterSelectionUnitRulesV1(source.dataset),
    selectionSupportRules: rosterSelectionSupportRulesV1(source.dataset),
    strategyPack: pack,
    fixture: {
      planningReferenceArmies: clone(planningReferenceArmies),
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
      mapEvidenceStatus: mapEvidencePort.mapBinding.roomFreezeHash
        ? "certified_map_bound" : "abstract_fixture_unknown",
      mapEvidenceBinding: clone(mapEvidencePort.mapBinding),
      laboratoryRoomId: ROSTER_PLANNING_WORKSPACE_LAB_ROOM_ID,
      laboratorySourceStateHash:
        laboratoryCore.labDescriptor().sourceStateHash,
    },
    draftStore,
    deliberationFactory,
    contextualSupplyRoutes:
      clone(authority.state.officialContextualSupplyModifierRoutes || []),
    estimateCost,
    presetArm,
    now: input.now,
    createSessionId: input.createSessionId,
  });
  const loaded = await service.loadPersisted();
  const iterativeDraft = input.enableIterativeDraft === true
    ? createIterativeRosterProductPortV1({
      directory: path.join(dataDirectory, "iterative-draft"),
      deliberationFactory, armyBuilderPort: builderPort,
      mapEvidencePort,
      createSceneLaboratory: context => createRunLaboratory({ toolReceipts: [] }, context),
      strategist: createStrategist({ laboratory: laboratoryCore }),
      missionScoringAuthority: laboratoryCore.missionScoringAuthority(),
      contextualSupplyRoutes:
        clone(authority.state.officialContextualSupplyModifierRoutes || []),
    }) : null;
  const iterativeJourney = iterativeDraft
    ? createAgentSelectedRosterJourneyV1({ iterativeDraft,
      workspaceService: service,
      promoteTeachPlan: (iterativeSessionId, teachSessionId) =>
        promoteAgentSelectedTeachForReview(iterativeSessionId,
          teachSessionId) }) : null;
  const decisionJourney=await createRosterDecisionProductJourneyV1({
    directory:path.join(dataDirectory,'decision-product-journeys'),openWorkflow:openDecisionWorkflow,
    async readLaunchDraft({runId,seed}){
      const opponentSide=seed.setup.sideKey==='player1'?'player2':'player1';
      if(referenceArmyRecipes[opponentSide]?.factionRecordKey!==seed.setup.opponentFactionRecordKey)
        roomLaunchFail('ROSTER_DECISION_ROOM_OPPONENT_MISMATCH');
      // Acceptance binds a durable revision. Reopening a Run here would
      // restore older tool branches and can reconcile unfinished Teach work.
      const store=createRosterDecisionWorkflowStoreV1({
        directory:path.join(dataDirectory,'decision-workflows',runId),
      });
      const state=await store.load();
      if(state?.schema!=='roster_decision_workflow_v1'||!state.draftRef)
        roomLaunchFail('ROSTER_DECISION_ACCEPTANCE_STALE_REVISION');
      const draft=await store.get(state.draftRef);
      const {scope}=decisionDraftContext(draft,seed);
      assertRosterDecisionRunScopeV1(state.scope,scope);
      return {state,draft};
    },
    readConditionalExperiences:async({runId,query,blindOpponent})=>{
      const store=createRosterDecisionWorkflowStoreV1({directory:path.join(dataDirectory,'decision-workflows',runId)});
      return queryRosterConditionalExperienceSnapshotV1({state:await store.load(),store,query,blindOpponent});
    },
    prepareConditionalExperienceImport:async({sourceWorkflowId,evidenceId})=>{
      const store=createRosterDecisionWorkflowStoreV1({directory:path.join(dataDirectory,'decision-workflows',sourceWorkflowId)});
      return prepareRosterConditionalExperienceImportV1({sourceWorkflowId,evidenceId,state:await store.load(),store});
    },
    liveAvailable:()=>typeof deliberationFactory?.createForRun==='function',
    // Server-owned recovery of a previously created Run, never a client Plan
    // import. Normal creation and all later scheduling/acceptance are unchanged.
    prepareExisting:async({runId,setup:rawSetup,expectedRevision,expectedDraftRef})=>{
      const store=createRosterDecisionWorkflowStoreV1({directory:path.join(dataDirectory,'decision-workflows',runId)});
      const state=await store.load();
      if(!state?.draftRef)roomLaunchFail('ROSTER_DECISION_REGISTRATION_RUN_NOT_FOUND');
      if(state.draftRevision!==expectedRevision||state.draftRef!==expectedDraftRef)
        roomLaunchFail('ROSTER_DECISION_REGISTRATION_STALE');
      if(state.work.some(work=>!['superseded','returned_to_owner'].includes(work.status)
        &&(work.status==='running'||work.operationState?.pending
          ||work.failure?.dispatchOutcome==='unknown'||work.failure?.code==='DISPATCH_OUTCOME_UNKNOWN')))
        roomLaunchFail('ROSTER_DECISION_REGISTRATION_WRITER_BUSY');
      const draft=await store.get(state.draftRef),setup=service.validateSetup(rawSetup??{}),candidateInput=draft.candidateInput;
      if(draft.revision!==expectedRevision||!['fixed','editable'].includes(draft.mode)
        ||candidateInput.sideKey!==setup.sideKey||candidateInput.factionRecordKey!==setup.factionRecordKey
        ||candidateInput.scaleId!==setup.engagementScale||candidateInput.mineralBudget!==setup.mineralBudget)
        roomLaunchFail('ROSTER_DECISION_REGISTRATION_SETUP_MISMATCH');
      const {scope}=decisionDraftContext(draft,{setup});
      if(!isDeepStrictEqual(scope,state.scope))roomLaunchFail('ROSTER_DECISION_REGISTRATION_SOURCE_MISMATCH');
      return {seed:{setup,candidateInput:clone(candidateInput),mode:draft.mode,provenance:clone(draft.provenance)},
        origin:{kind:'existing_revision',sourceDraftRef:state.draftRef,sourceRevision:state.draftRevision,
          freshGeneration:false,originalHistoryPreserved:true}};
    },
    prepareSeed:async body=>{
      const setup=service.validateSetup(body.setup??{}),mode=body.mode??(body.candidateInput?'fixed':'editable');
      if(!['fixed','editable'].includes(mode))roomLaunchFail('ROSTER_DECISION_MODE_INVALID');
      const candidateInput=body.candidateInput?clone(body.candidateInput):{
        sideKey:setup.sideKey,factionRecordKey:setup.factionRecordKey,scaleId:setup.engagementScale,
        mineralBudget:setup.mineralBudget,tacticalCardRecordKeys:[],units:[]};
      if(candidateInput.sideKey!==setup.sideKey||candidateInput.factionRecordKey!==setup.factionRecordKey
        ||candidateInput.scaleId!==setup.engagementScale||candidateInput.mineralBudget!==setup.mineralBudget)
        roomLaunchFail('ROSTER_DECISION_CANDIDATE_SETUP_MISMATCH');
      if(mode==='fixed'||candidateInput.units.length){
        const verdict=builderPort.evaluateRosterCandidate(candidateInput);
        if(verdict.status!=='legal')roomLaunchFail('ROSTER_DECISION_INITIAL_ARMY_ILLEGAL');
        if(mode==='fixed'&&verdict.summary.mineralSpent!==candidateInput.mineralBudget)
          roomLaunchFail('ROSTER_DECISION_FIXED_ARMY_TARGET_UNMET');
      }
      const route=createStrategist({laboratory:laboratoryCore}).selectSkillRoute({
        ownFactionRecordKey:setup.factionRecordKey,opponentFactionRecordKey:setup.opponentFactionRecordKey});
      const ports=builderPort.portDescriptor();
      const provenance=createRosterPlanProvenanceV1({
        sourceLockHash:bundle.sourceLockHash,sourceSnapshotHash:bundle.sourceSnapshotHash,
        normalizedDatasetHash:bundle.normalizedDatasetHash,officialRulesVersion:bundle.officialRulesVersion,
        officialUnitsVersion:bundle.officialUnitsVersion,officialCardsVersion:bundle.officialCardsVersion,
        unitCompositionUpgradeDataBundleHash:ports.unitCompositionUpgradeDataBundleHash,
        armyResourceBudgetDataBundleHash:ports.armyResourceBudgetDataBundleHash,
        factionArmyEligibilityDataBundleHash:ports.factionArmyEligibilityDataBundleHash,
        engagementScale:setup.engagementScale,missionBinding:{status:'frozen',...setup.missionBinding},
        opponentInformationBoundary:setup.opponentInformationBoundary,
        skillVersions:route.skillRefs.map(ref=>({skillId:ref.skillId,version:ref.version,promoted:ref.runtimeAccepted})),
        modelVersion:'provider_reported_per_request',promptVersion:'roster_scoped_workflow_v1'});
      return {setup,candidateInput,mode,provenance,planningEntry:normalizeRosterPlanningEntryV1(body.planningEntry)};
    },
  });
  const http = createRosterPlanningWorkspaceHttpAdapterV1({ service,
    decisionJourney,
    iterativeJourney,
    ...(typeof input.roomLaunchPort?.launch === "function"
      ? { launchRoom: launchAgentSelectedRoom, launchPresetRoom, launchDecisionWorkflowRoom } : {}),
  });

  async function prepareAgentSelectedTeachPromotion(iterativeSessionId,
    teachSessionId, preparedHandoff = null) {
    if (!iterativeDraft) {
      throw new TypeError("AGENT_SELECTED_TEACH_ITERATIVE_PORT_REQUIRED");
    }
    const handoff = preparedHandoff
      || await iterativeDraft.prepareTeachHandoff(iterativeSessionId);
    const taught = service.readSession(teachSessionId);
    if (taught.status !== "planned"
      || taught.agentSelectionHandoffHash !== handoff.handoffHash
      || taught.agentSelectedCandidateHash
        !== handoff.iterativeCandidateHash
      || !taught.plan) {
      throw new TypeError("AGENT_SELECTED_TEACH_SESSION_NOT_REVIEWABLE");
    }
    const promoted = taught.plan.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA;
    const lockedTeachPlan = promoted
      ? taught.lockedTeachSourcePlan : taught.plan;
    const lockedTeachReceipt = promoted
      ? taught.lockedTeachSourceSessionReceipt
      : taught.evidence.sessionReceipt;
    if (!lockedTeachPlan || !lockedTeachReceipt
      || lockedTeachReceipt.planHash !== lockedTeachPlan.planHash
      || (promoted && taught.sourcePlanHash
        !== lockedTeachPlan.planHash)) {
      throw new TypeError("AGENT_SELECTED_TEACH_SOURCE_UNAVAILABLE");
    }
    const bridge = createAgentSelectedTeachPlanBridgeV1({
      handoff, taughtLockedPlan: lockedTeachPlan,
      armyBuilderPort: builderPort,
      armyAudit: handoff.lockedRoster.lock.verdict.audit,
      missionProfile: laboratoryCore.missionScoringAuthority()
        .missionScoringProfile,
    });
    return Object.freeze({ ...bridge,
      sessionReceipt: createAgentSelectedTeachSessionReceiptV1({
        bridge, handoff,
        taughtSessionReceipt: lockedTeachReceipt,
        armyBuilderPort: builderPort,
        missionProfile: laboratoryCore.missionScoringAuthority()
          .missionScoringProfile,
      }),
    });
  }

  async function promoteAgentSelectedTeachForReview(iterativeSessionId,
    teachSessionId) {
    const bridge = await prepareAgentSelectedTeachPromotion(
      iterativeSessionId, teachSessionId);
    return service.promoteAgentSelectedTeachPlan(teachSessionId, bridge);
  }

  async function reviseAgentSelectedTeachPlan({ iterativeSessionId,
    teachSessionId, plan, review, targetedClaimPaths,
    deliberation } = {}) {
    const bridge = await prepareAgentSelectedTeachPromotion(
      iterativeSessionId, teachSessionId);
    const teachSession = service.readSession(teachSessionId);
    const current = plan || bridge.plan;
    if (typeof deliberation?.deliberate !== "function"
      || current.planId !== bridge.plan.planId
      || current.rosterCandidate?.candidateHash
        !== bridge.plan.rosterCandidate.candidateHash
      || current.openingDeploymentSchedule?.scheduleHash
        !== bridge.plan.openingDeploymentSchedule.scheduleHash
      || current.provenance?.provenanceHash
        !== bridge.plan.provenance.provenanceHash
      || review?.planHash !== current.planHash) {
      throw new TypeError("AGENT_SELECTED_TEACH_REVISION_SOURCE_DRIFT");
    }
    return createStrategist({ laboratory: laboratoryCore })
      .reviseRosterPlan({
        plan: current, reasonText:
          "Correct cited public arrival and map claims before Room use",
        selectionJustificationPolicyVersion: teachSession.agentSelectedStrategySource
          ?.selectionJustificationPolicyVersion || null,
        triggerIds: [],
        revisedSectionKeys: ["deploymentConcept",
          ...(targetedClaimPaths.some((path) =>
            path.startsWith("scoreRoute.")) ? ["scoreRoute"] : []),
          ...(targetedClaimPaths.some((path) =>
            path.startsWith("componentPurposes."))
            ? ["componentPurposes"] : []),
          ...(targetedClaimPaths.includes("publicSummaryText")
            ? ["publicSummaryText"] : [])],
        targetedClaimPaths,
        toolReceipts: teachSession.evidence.toolReceipts,
        selectedCandidateInputHash: hashStarcraftTmgContract(
          teachSession.selectedCandidateInput),
        finalPlanReview: { status: "completed",
          planHash: current.planHash, review },
        armyAudit: (await iterativeDraft.prepareTeachHandoff(
          iterativeSessionId)).lockedRoster.lock.verdict.audit,
        missionProfile: laboratoryCore.missionScoringAuthority()
          .missionScoringProfile,
      }, { deliberation });
  }

  async function requireReviewedTeachAcceptance(iterativeSessionId, teach) {
    const state = await iterativeDraft.read(iterativeSessionId);
    if (state.teachFeedbackPolicy === "skill_teach_roster_coevolution_v1"
      && !hasAcceptedCurrentRosterTeachV1(state, teach)) {
      roomLaunchFail("AGENT_SELECTED_ROOM_LAUNCH_REVIEWED_TEACH_FEEDBACK_REQUIRED");
    }
  }

  async function prepareAgentSelectedTeachPlanForRoom(input = {}) {
    const { iterativeSessionId, teachSessionId, plan, finalReview,
      roomRuntime, roomId, seatToken, scope } = input;
    if (typeof roomRuntime?.readRoom !== "function"
      || !roomId || !seatToken || scope?.gameId !== "starcraft-tmg"
      || scope.roomId !== roomId || !scope.matchBindingHash
      || !scope.seatKey) {
      throw new TypeError("AGENT_SELECTED_TEACH_ROOM_INPUT_INVALID");
    }
    const handoff = input.handoff
      || await iterativeDraft.prepareTeachHandoff(iterativeSessionId);
    const bridge = await prepareAgentSelectedTeachPromotion(
      iterativeSessionId, teachSessionId, handoff);
    const taught = service.readSession(teachSessionId);
    verifyAgentScheduledRosterPlanV1(plan);
    await requireReviewedTeachAcceptance(iterativeSessionId, { ...taught, plan });
    const intermediatePlans = input.priorPlans || [];
    verifyAgentScheduledRosterPlanRevisionLineageV1({
      initialPlanHash: bridge.plan.planHash,
      initialPlanVersion: bridge.plan.planVersion,
      intermediatePlans, finalPlan: plan,
    });
    const pendingClaims = collectRosterClaimRepairBacklogV1({ ...taught,
      plan, planVersionHistory: [bridge.plan, ...intermediatePlans],
      planReview: { status: "completed", planHash: plan.planHash, review: finalReview },
      planReviewHistory: [...(taught.planReviewHistory || []), taught.planReview],
    });
    if (pendingClaims.length > 0) {
      throw new TypeError("AGENT_SELECTED_TEACH_ROOM_UNRESOLVED_CLAIM_BACKLOG");
    }
    let reviewResolution;
    try {
      reviewResolution = verifyRosterFinalPlanReviewAdjudicationV1({
        plan, review: finalReview,
      });
    } catch {
      throw new TypeError("AGENT_SELECTED_TEACH_ROOM_REVIEW_OR_SOURCE_INVALID");
    }
    const unchangedInitialPlan = plan.revisions.length === 0
      && plan.planHash === bridge.plan.planHash
      && plan.planVersion === bridge.plan.planVersion
      && plan.planStatus === bridge.plan.planStatus;
    const revisedPlan = plan.revisions.length > 0
      && plan.planStatus === "revised"
      && plan.planVersion
        === bridge.plan.planVersion + plan.revisions.length
      && plan.revisions[0].previousPlanHash === bridge.plan.planHash;
    if (!(unchangedInitialPlan || revisedPlan)
      || plan.sideKey !== scope.seatKey
      || plan.planId !== bridge.plan.planId
      || plan.rosterCandidate.candidateHash
        !== bridge.plan.rosterCandidate.candidateHash
      || plan.openingDeploymentSchedule.scheduleHash
        !== bridge.plan.openingDeploymentSchedule.scheduleHash
      || !agentSelectedScoreRouteRevisionsAllowedV1(bridge.plan,
        intermediatePlans, plan)
      || finalReview?.planHash !== plan.planHash
      || !reviewedPlanUsesCurrentMissionSource({ plan,
        review: finalReview, toolReceipts: taught.evidence.toolReceipts,
        missionProfile: laboratoryCore.missionScoringAuthority()
          .missionScoringProfile })
      || hashStarcraftTmgContract(Object.fromEntries(
        Object.entries(finalReview).filter(([key]) => key !== "reviewHash")))
        !== finalReview.reviewHash
      || reviewResolution.criticalCount > 0
      || reviewResolution.unresolvedHighCount > 0) {
      throw new TypeError("AGENT_SELECTED_TEACH_ROOM_REVIEW_OR_SOURCE_INVALID");
    }
    const mapBinding = handoff.selectedMapRouteReceipt.mapBinding;
    const roomRead = await roomRuntime.readRoom({ roomId, seatToken });
    if (roomRead?.ok !== true || !roomRead.projection) {
      throw new TypeError("AGENT_SELECTED_TEACH_ROOM_READ_FAILED");
    }
    const roomMap = roomRead.projection.state?.board
      ?.competitiveMapRoomFreezeSummary;
    const taughtMapSummary = taught.evidence.toolReceipts.find(entry =>
      entry.queryKind === "summarize_map"
        && entry.mapBinding?.rulesReachabilityAuditHash
          === mapBinding.rulesReachabilityAuditHash);
    if (!roomMapMatchesPlanBinding(roomMap, mapBinding, {
      roomState: roomRead.projection.state, mapSummary: taughtMapSummary,
    })) {
      throw new TypeError("AGENT_SELECTED_TEACH_ROOM_MAP_MISMATCH");
    }
    const priorPlans = [bridge.plan, ...intermediatePlans];
    const seed = createStarcraftTmgRosterTurnPlanSeedV1({
      rosterPlan: plan, sessionReceipt: bridge.sessionReceipt,
      priorPlans, roomProjection: roomRead.projection, scope,
    });
    return Object.freeze({
      plan: clone(plan),
      sessionReceipt: clone(bridge.sessionReceipt),
      priorPlans: clone(priorPlans),
      selectedCandidateInput: clone(
        handoff.lockedRoster.lock.candidateInput),
      finalReviewHash: finalReview.reviewHash,
      agentSelectionHandoffHash: handoff.handoffHash,
      originHash: seed.origin.originHash,
      roomStateRevision: seed.origin.openedAtStateRevision,
      trainingTruth: false,
    });
  }

  // Server-owned preflight for a Web-created Agent roster. Read the current
  // persisted Teach session and its linked iterative draft; a browser may
  // identify the journey, but may not supply a replacement plan, review or
  // army recipe. The resulting bundle is still not Room admission: the host
  // must create a fresh authoritative Room with this exact recipe and call
  // prepareAgentSelectedTeachPlanForRoom against that Room before attaching
  // a Bot seat or exposing a join URL.
  async function prepareAgentSelectedTeachRoomLaunch(input = {}) {
    const { iterativeSessionId, teachSessionId } = input;
    if (!iterativeDraft || !iterativeSessionId || !teachSessionId) {
      roomLaunchFail("AGENT_SELECTED_ROOM_LAUNCH_SOURCE_REQUIRED");
    }
    const session = service.readSession(teachSessionId);
    await requireReviewedTeachAcceptance(iterativeSessionId, session);
    const plan = session.plan;
    const review = session.planReview;
    if ((session.claimRepairBacklog || []).length > 0) {
      roomLaunchFail("AGENT_SELECTED_ROOM_LAUNCH_UNRESOLVED_CLAIM_BACKLOG");
    }
    if (session.status !== "planned"
      || session.planningMode !== "locked_roster_teach_v1"
      || session.planEvidenceStale
      || plan?.schema !== AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA
      || !(plan.planStatus === "active"
        && plan.revisions.length === 0
        || plan.planStatus === "revised"
          && plan.revisions.length > 0)
      || !rosterPlanMatchesSelectedBudgetV1(plan, session.setup.mineralBudget)
      || review?.status !== "completed"
      || review.stale === true
      || review.planHash !== plan.planHash
      || !review.review
      || !reviewedPlanUsesCurrentMissionSource({ plan,
        review: review.review,
        toolReceipts: session.evidence.toolReceipts,
        missionProfile: laboratoryCore.missionScoringAuthority()
          .missionScoringProfile })) {
      roomLaunchFail("AGENT_SELECTED_ROOM_LAUNCH_NOT_REVIEWED");
    }
    const handoff = await iterativeDraft.prepareTeachHandoff(
      iterativeSessionId);
    if (!frozenMapConfiguration?.seedId
      || frozenMapConfiguration.seedId
        !== handoff.selectedMapRouteReceipt?.mapBinding?.seedId) {
      roomLaunchFail("AGENT_SELECTED_ROOM_LAUNCH_MAP_DRIFT");
    }
    const bridge = await prepareAgentSelectedTeachPromotion(
      iterativeSessionId, teachSessionId, handoff);
    const history = session.planVersionHistory || [];
    // An unrevised, first-pass plan has no history entry. Its identity is
    // checked by the revision-lineage verifier below against the promoted
    // initial plan; only revised plans have a historical first version.
    if (history.length > 0
      && history[0]?.planHash !== bridge.plan.planHash
      || session.agentSelectionHandoffHash !== handoff.handoffHash
      || !session.selectedCandidateInput
      || hashStarcraftTmgContract(session.selectedCandidateInput)
        !== hashStarcraftTmgContract(
          handoff.lockedRoster.lock.candidateInput)) {
      roomLaunchFail("AGENT_SELECTED_ROOM_LAUNCH_SOURCE_DRIFT");
    }
    const priorPlans = history.slice(1);
    verifyAgentScheduledRosterPlanRevisionLineageV1({
      initialPlanHash: bridge.plan.planHash,
      initialPlanVersion: bridge.plan.planVersion,
      intermediatePlans: priorPlans, finalPlan: plan,
    });
    const resolution = verifyRosterFinalPlanReviewAdjudicationV1({
      plan, review: review.review,
    });
    if (resolution.criticalCount > 0
      || resolution.unresolvedHighCount > 0) {
      roomLaunchFail("AGENT_SELECTED_ROOM_LAUNCH_BLOCKING_REVIEW");
    }
    const selected = handoff.lockedRoster.lock.candidateInput;
    const recipe = candidateRoomRecipe(selected);
    return Object.freeze({
      iterativeSessionId, teachSessionId,
      plan: clone(plan), finalReview: clone(review.review),
      priorPlans: clone(priorPlans), handoff: clone(handoff),
      recipe: clone(recipe),
      mapConfiguration: clone(frozenMapConfiguration),
      planHash: plan.planHash,
      reviewHash: review.review.reviewHash,
      agentSelectionHandoffHash: handoff.handoffHash,
      trainingTruth: false,
    });
  }

  async function prepareDecisionWorkflowRoomLaunch(workflowId, { expectedRevision } = {}) {
    const accepted = await decisionJourney.readAccepted(workflowId);
    if (expectedRevision !== undefined && expectedRevision !== accepted.draftRevision)
      roomLaunchFail('ROSTER_DECISION_ROOM_REVISION_MISMATCH');
    if (!frozenMapConfiguration?.seedId || accepted.plan.sideKey !== 'player1'
      || accepted.plan.provenance.missionBinding.mapTopologyHash !== mapTopologyHash)
      roomLaunchFail('ROSTER_DECISION_ROOM_MAP_OR_SEAT_MISMATCH');
    return Object.freeze({ ...clone(accepted), recipe: candidateRoomRecipe(accepted.candidateInput),
      referenceArmyRecipes: clone(referenceArmyRecipes), mapConfiguration: clone(frozenMapConfiguration) });
  }

  async function prepareDecisionWorkflowPlanForRoom({ workflowId, expectedRevision,
    roomRuntime, roomId, seatToken, scope } = {}) {
    const bundle = await prepareDecisionWorkflowRoomLaunch(workflowId, { expectedRevision });
    return prepareAcceptedDecisionWorkflowPlanForRoom({ bundle, workflowId,
      expectedRevision: expectedRevision ?? bundle.draftRevision,
      roomRuntime, roomId, seatToken, scope });
  }

  // Host-only archive binding for a new versioned Room. A previously admitted
  // snapshot is not a request to reopen (or mutate) its old Teach scheduler.
  // No HTTP/LLM input selects this path; the replay Host verifies the snapshot
  // against the source Room metadata before passing it here. The normal live
  // launch still goes through readAccepted/current-draft admission above.
  async function prepareAcceptedDecisionWorkflowPlanForRoom({ bundle, workflowId, expectedRevision,
    roomRuntime, roomId, seatToken, scope } = {}) {
    if (typeof roomRuntime?.readRoom !== 'function' || !roomId || !seatToken
      || scope?.roomId !== roomId || scope?.seatKey !== 'player1')
      roomLaunchFail('ROSTER_DECISION_ROOM_HANDOFF_INPUT_INVALID');
    if (!bundle || bundle.workflowId !== workflowId
      || bundle.draftRevision !== expectedRevision
      || !frozenMapConfiguration?.seedId || bundle.plan?.sideKey !== 'player1'
      || bundle.plan?.provenance?.missionBinding?.mapTopologyHash !== mapTopologyHash)
      roomLaunchFail('ROSTER_DECISION_ROOM_SNAPSHOT_BINDING_MISMATCH');
    const read = await roomRuntime.readRoom({ roomId, seatToken });
    if (!read?.ok || !read.projection) roomLaunchFail('ROSTER_DECISION_ROOM_READ_FAILED');
    const mapSummary = mapEvidencePort.summarizeMap({ queryId: 'accepted-workflow-room-binding' });
    if (!roomMapMatchesPlanBinding(read.projection.state?.board?.competitiveMapRoomFreezeSummary,
      mapSummary.mapBinding, { roomState: read.projection.state, mapSummary }))
      roomLaunchFail('ROSTER_DECISION_ROOM_MAP_BINDING_MISMATCH');
    const seed = createStarcraftTmgRosterTurnPlanSeedV1({ rosterPlan: bundle.plan,
      sessionReceipt: bundle.sessionReceipt, roomProjection: read.projection, scope });
    return Object.freeze({ plan: clone(bundle.plan), sessionReceipt: clone(bundle.sessionReceipt),
      priorPlans: [], originHash: seed.origin.originHash,
      roomStateRevision: seed.origin.openedAtStateRevision, trainingTruth: false });
  }

  const roomLaunchBinding = input.wave3MatchSetup ? {
    setupId: input.wave3MatchSetup.id,
    setupVersion: input.wave3MatchSetup.version,
    setupSourceHash: input.wave3MatchSetup.sourceHash,
  } : {};
  function launchProductRoom(request) {
    if (!boardFactory) return input.roomLaunchPort.launch(request);
    return input.roomLaunchPort.launch({...request, ...roomLaunchBinding,
      referenceArmyRecipes: request.referenceArmyRecipes ?? clone(referenceArmyRecipes),
      async preparePregameRosterPlans(room) {
        const opening = await room.roomRuntime.roomStore.loadInitialEnvelope(room.roomId);
        const expected = boardFactory.bind(opening.state).rulesRuntime.releaseBinding;
        const actual = opening.matchBinding.releaseBinding;
        if (actual?.manifestHash !== expected.manifestHash || actual.runtimeHash !== expected.runtimeHash)
          roomLaunchFail('ROSTER_PLAN_LAUNCH_RELEASE_MISMATCH');
        return request.preparePregameRosterPlans(room);
      }});
  }
  async function launchDecisionWorkflowRoom(workflowId, options = {}) {
    const matchMode = options.matchMode || "agent_vs_agent";
    if (!["agent_vs_agent", "user_vs_agent", "human_vs_human"].includes(matchMode))
      roomLaunchFail("ROSTER_ROOM_MATCH_MODE_INVALID");
    if (typeof input.roomLaunchPort?.launch !== 'function')
      roomLaunchFail('ROSTER_WORKSPACE_ROOM_LAUNCH_UNAVAILABLE');
    const bundle = await prepareDecisionWorkflowRoomLaunch(workflowId, options);
    const player1Provider = options.player1Provider || 'deepseek';
    if (!['deepseek','kimi_code'].includes(player1Provider)) roomLaunchFail('ROSTER_ROOM_PROVIDER_INVALID');
    const launchKey = hashStarcraftTmgContract({ ...roomLaunchBinding, planningSource: 'decision_workflow', workflowId,
      draftRevision: bundle.draftRevision, planHash: bundle.plan.planHash,
      mapConfiguration: bundle.mapConfiguration, referenceArmyRecipes: bundle.referenceArmyRecipes,
      player1Provider, matchMode });
    const launched = await launchProductRoom({ launchKey, player1Provider, planningSource: 'decision_workflow',
      decisionWorkflowId: workflowId, draftRevision: bundle.draftRevision,
      iterativeSessionId: null, teachSessionId: null, planHash: bundle.plan.planHash,
      recipe: clone(bundle.recipe), referenceArmyRecipes: clone(bundle.referenceArmyRecipes),
      mapConfiguration: clone(bundle.mapConfiguration), matchMode,
      async preparePregameRosterPlans({ roomRuntime, roomId, seats }) {
        return { player1: await prepareDecisionWorkflowPlanForRoom({ workflowId,
          expectedRevision: bundle.draftRevision, roomRuntime, roomId,
          seatToken: seats.player1.seatToken, scope: seats.player1.scope }) };
      } });
    if (!launched?.roomId || !launched?.joinUrl) roomLaunchFail('ROSTER_DECISION_ROOM_HOST_INVALID');
    return Object.freeze({ roomId: launched.roomId, joinUrl: launched.joinUrl,
      matchMode, workflowId, draftRevision: bundle.draftRevision,
      planHash: bundle.plan.planHash, player1Provider, launchKey, trainingTruth: false });
  }

  async function launchAgentSelectedRoom(iterativeSessionId, options = {}) {
    const matchMode = options.matchMode || "agent_vs_agent";
    if (!["agent_vs_agent", "user_vs_agent", "human_vs_human"].includes(matchMode))
      roomLaunchFail("ROSTER_ROOM_MATCH_MODE_INVALID");
    if (typeof input.roomLaunchPort?.launch !== "function"
      || !iterativeJourney) {
      throw Object.assign(new Error("ROSTER_WORKSPACE_ROOM_LAUNCH_UNAVAILABLE"),
        { code: "ROSTER_WORKSPACE_ROOM_LAUNCH_UNAVAILABLE" });
    }
    const journey = await iterativeJourney.read(iterativeSessionId);
    if (!journey.teachSessionId) {
      throw Object.assign(new Error("AGENT_SELECTED_ROOM_LAUNCH_TEACH_MISSING"),
        { code: "AGENT_SELECTED_ROOM_LAUNCH_TEACH_MISSING" });
    }
    const bundle = await prepareAgentSelectedTeachRoomLaunch({
      iterativeSessionId, teachSessionId: journey.teachSessionId,
    });
    // The host owns idempotent Room creation, private credential storage,
    // Provider attachment and the user-facing recovery URL. A repeated POST
    // with the same key must return its existing Room, not create a second
    // paid match. The browser never receives the pregame plan or seat token.
    const launchKey = hashStarcraftTmgContract({ ...roomLaunchBinding,
      iterativeSessionId,
      teachSessionId: bundle.teachSessionId,
      planHash: bundle.planHash,
      reviewHash: bundle.reviewHash,
      matchMode,
    });
    const launched = await launchProductRoom({
      launchKey,
      iterativeSessionId,
      teachSessionId: bundle.teachSessionId,
      matchMode,
      recipe: clone(bundle.recipe),
      mapConfiguration: clone(bundle.mapConfiguration),
      planHash: bundle.planHash,
      async preparePregameRosterPlans({ roomRuntime, roomId, seats }) {
        return { player1: await prepareAgentSelectedTeachPlanForRoom({
          iterativeSessionId,
          teachSessionId: bundle.teachSessionId,
          plan: bundle.plan,
          finalReview: bundle.finalReview,
          priorPlans: bundle.priorPlans,
          handoff: bundle.handoff,
          roomRuntime, roomId,
          seatToken: seats.player1.seatToken,
          scope: seats.player1.scope,
        }) };
      },
    });
    if (typeof launched?.roomId !== "string" || !launched.roomId
      || typeof launched.joinUrl !== "string" || !launched.joinUrl) {
      throw new TypeError("AGENT_SELECTED_ROOM_LAUNCH_HOST_INVALID");
    }
    return Object.freeze({ roomId: launched.roomId,
      joinUrl: launched.joinUrl, matchMode,
      planHash: bundle.planHash, launchKey, trainingTruth: false });
  }

  async function launchPresetRoom(sessionId, options = {}) {
    const matchMode = options.matchMode || "agent_vs_agent";
    if (!["agent_vs_agent", "user_vs_agent", "human_vs_human"].includes(matchMode))
      roomLaunchFail("ROSTER_ROOM_MATCH_MODE_INVALID");
    if (typeof input.roomLaunchPort?.launch !== 'function') roomLaunchFail('ROSTER_WORKSPACE_ROOM_LAUNCH_UNAVAILABLE');
    const session = service.readSession(sessionId);
    if (session.agentSelectionHandoffHash || !session.lockedRoster
      || !isPresetRosterJourneyAcceptedV1(session)
      || session.working?.verdictSummary?.status !== 'legal'
      || !rosterPlanMatchesSelectedBudgetV1(session.plan, session.setup.mineralBudget)
      || !frozenMapConfiguration?.seedId) roomLaunchFail('PRESET_ROOM_LAUNCH_CURRENT_PLAN_REQUIRED');
    const candidate = session.selectedCandidateInput || session.candidates.find(row =>
      row.candidate.candidateId === session.plan.rosterCandidate.candidateId)?.candidateInput;
    if (!candidate) roomLaunchFail('PRESET_ROOM_LAUNCH_CANDIDATE_MISSING');
    const planHash = session.plan.planHash;
    const launchKey = hashStarcraftTmgContract({ ...roomLaunchBinding, planningSource: 'fixed_roster', sessionId,
      planHash, mapConfiguration: frozenMapConfiguration, matchMode });
    const launched = await launchProductRoom({ launchKey,
      planningSource: 'fixed_roster', iterativeSessionId: null, teachSessionId: sessionId,
      planHash, recipe: candidateRoomRecipe(candidate), mapConfiguration: clone(frozenMapConfiguration),
      matchMode,
      async preparePregameRosterPlans({ roomRuntime, roomId, seats }) {
        return { player1: await preparePregamePlanForRoom({ sessionId, roomRuntime, roomId,
          seatToken: seats.player1.seatToken, scope: seats.player1.scope }) };
      },
    });
    if (typeof launched?.roomId !== 'string' || !launched.roomId
      || typeof launched.joinUrl !== 'string' || !launched.joinUrl) roomLaunchFail('PRESET_ROOM_LAUNCH_HOST_INVALID');
    return Object.freeze({ roomId: launched.roomId, joinUrl: launched.joinUrl,
      matchMode, planHash, launchKey, trainingTruth: false });
  }

  const descriptorBody = {
    schema: "starcraft_tmg_roster_planning_product_module_descriptor_v1",
    module: ROSTER_PLANNING_PRODUCT_MODULE,
    version: ROSTER_PLANNING_PRODUCT_MODULE_VERSION,
    ...(release ? { releaseId: release.manifest.releaseId, releaseManifestHash: release.manifest.manifestHash } : {}),
    laboratoryRoomId: ROSTER_PLANNING_WORKSPACE_LAB_ROOM_ID,
    isolatedLaboratorySourceState: true,
    fixtureRoot,
    fixtureRootReadOnly: true,
    planningReferenceArmies: clone(planningReferenceArmies),
    liveRoomTouched: false,
    builderPortDescriptorHash: builderPort.portDescriptor().descriptorHash,
    laboratoryDescriptorHash: laboratoryCore.labDescriptor().descriptorHash,
    mapEvidenceBinding: clone(mapEvidencePort.mapBinding),
    mapEvidenceStatus: mapEvidencePort.mapBinding.roomFreezeHash
      ? "certified_map_bound" : "abstract_fixture_unknown",
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
    // An Agent-selected roster has a separate promotion contract that binds
    // the original iterative Builder choice, Teach revision lineage and the
    // final source/mission review. It must never enter through the legacy
    // generic-plan bridge, even if its Builder verdict and map are legal.
    if (session.agentSelectionHandoffHash) {
      throw new TypeError(
        "ROSTER_PLAN_ROOM_HANDOFF_AGENT_SELECTED_REQUIRES_PROMOTION");
    }
    if (session.lockedRoster && !isPresetRosterJourneyAcceptedV1(session)) {
      throw new TypeError('ROSTER_PLAN_ROOM_HANDOFF_PRESET_JOURNEY_INCOMPLETE');
    }
    if (session.status !== "planned" || session.planEvidenceStale
      || session.planReviewBlockingHighFindings === true
      || session.planReviewRequiredForHandoff === true
      // A reviewed public correction produces a `revised` plan. The bridge
      // below verifies its complete revision lineage against the original
      // session receipt; rejecting it here strands every corrected plan.
      || !session.plan
      || !["active", "revised"].includes(session.plan.planStatus)
      || !session.evidence?.sessionReceipt
      || session.working?.verdictSummary?.status !== "legal") {
      throw new TypeError("ROSTER_PLAN_ROOM_HANDOFF_PLAN_UNAVAILABLE");
    }
    const referencedHashes = new Set((session.plan.toolReceiptReferences || [])
      .filter((entry) => entry.toolId === "pregame-map-evidence-port-v1")
      .map((entry) => entry.receiptHash));
    const mapReceipts = (session.evidence.toolReceipts || []).filter((entry) =>
      referencedHashes.has(entry.receiptHash));
    const mapSummary = mapReceipts.find((entry) =>
      entry.queryKind === "summarize_map") || null;
    const selectedInput = session.candidates.find((entry) =>
      entry.candidate.candidateId
        === session.plan.rosterCandidate.candidateId)?.candidateInput;
    const selectedInputHash = selectedInput
      ? hashStarcraftTmgContract(selectedInput) : null;
    const selectedRoute = mapReceipts.find((entry) =>
      entry.queryKind === "evaluate_roster_route"
        && entry.candidateInputHash === selectedInputHash) || null;
    const mapReadiness = evaluatePregameMapReadinessV1({
      mapSummary,
      candidateMapAccess: [{
        candidateId: session.plan.rosterCandidate.candidateId,
        receipt: selectedRoute,
      }],
      selectedCandidateId: session.plan.rosterCandidate.candidateId,
    });
    if (mapReadiness.status !== "certified_route_evidence"
      || mapReadiness.roomFreezeHash
        !== mapEvidencePort.mapBinding.roomFreezeHash
      || session.plan.provenance.missionBinding.mapTopologyHash
        !== mapTopologyHash) {
      throw new TypeError("ROSTER_PLAN_ROOM_HANDOFF_MAP_EVIDENCE_UNAVAILABLE");
    }
    const roomRead = await roomRuntime.readRoom({ roomId, seatToken });
    if (roomRead?.ok !== true || !roomRead.projection) {
      throw new TypeError("ROSTER_PLAN_ROOM_HANDOFF_ROOM_READ_FAILED");
    }
    // roomFreezeHash includes roomId, so the isolated planning laboratory
    // and a newly created match must have different instance hashes. Bind
    // the same compiled rules geometry and mission reachability instead;
    // each room's own freeze is already verified by its signed Room state.
    const roomMap = roomRead.projection.state?.board
      ?.competitiveMapRoomFreezeSummary;
    if (!roomMapMatchesPlanBinding(roomMap, mapSummary.mapBinding, {
      roomState: roomRead.projection.state, mapSummary,
    })) {
      throw new TypeError("ROSTER_PLAN_ROOM_HANDOFF_MAP_BINDING_MISMATCH");
    }
    // The Room verifies its own reachability/admission. The handoff binds the
    // same physical map, task and source facts, not an approximate witness.
    // Selected-roster readiness was independently verified above.
    const seed = createStarcraftTmgRosterTurnPlanSeedV1({
      rosterPlan: session.plan,
      sessionReceipt: session.evidence.sessionReceipt,
      priorPlans: session.planVersionHistory,
      roomProjection: roomRead.projection,
      scope,
    });
    return Object.freeze({
      plan: clone(session.plan),
      sessionReceipt: clone(session.evidence.sessionReceipt),
      priorPlans: clone(session.planVersionHistory),
      originHash: seed.origin.originHash,
      roomStateRevision: seed.origin.openedAtStateRevision,
      trainingTruth: false,
    });
  }

  return Object.freeze({
    descriptor: () => Object.freeze({ ...descriptorBody,
      descriptorHash: hashStarcraftTmgContract(descriptorBody) }),
    service,
    officialMissionScoringProfile: () => clone(
      authority.state.officialGameplayDataBundle.missionScoringProfile),
    mapEvidencePort,
    openDecisionWorkflow,
    registerExistingDecisionWorkflow:input=>decisionJourney.registerExisting(input),
    decisionJourney,
    closeDecisionWorkflows:decisionJourney.close,
    iterativeDraft,
    iterativeJourney,
    prepareAgentSelectedTeachPromotion,
    promoteAgentSelectedTeachForReview,
    reviseAgentSelectedTeachPlan,
    preparePregamePlanForRoom,
    prepareAgentSelectedTeachPlanForRoom,
    prepareAgentSelectedTeachRoomLaunch,
    launchAgentSelectedRoom,
    launchPresetRoom,
    prepareDecisionWorkflowRoomLaunch,
    prepareDecisionWorkflowPlanForRoom,
    prepareAcceptedDecisionWorkflowPlanForRoom,
    launchDecisionWorkflowRoom,
    handle: (request) => http.handle(request),
    httpDescriptor: http.httpDescriptor,
  });
}
