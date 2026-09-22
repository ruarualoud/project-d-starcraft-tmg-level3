#!/usr/bin/env node

import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialStandardRoomInitialStateAuthorityV1,
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
} from "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { loadPortableFoundationalStrategyPackV2 } from
  "../packages/strategy-skills/portable-foundational-skill-pack-loader-v2.mjs";
import { STARCRAFT_TMG_TICKET_18_PORTABLE_STRATEGY_PACK_V2 as packManifest } from
  "../content/skill-generation/ticket-18-portable-strategy-pack-v2.mjs";
import {
  createOfficialArmyBuilderQueryPortV1,
} from "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import {
  createPregameSceneLaboratoryV1,
  verifyPregameLabMathReceiptV1,
  verifyPregameLabMutationZeroProofV1,
  verifyPregameLabProbabilityReceiptV1,
  verifyPregameLabSameStateABReceiptV1,
  verifyPregameLabScenarioBranchReceiptV1,
  verifyPregameLabSpatialReceiptV1,
  verifyPregameLabThreatExchangeReceiptV1,
  verifyPregameSceneLaboratoryDescriptorV1,
} from "../packages/roster-strategist/pregame-scene-laboratory-v1.mjs";
import {
  createRosterStrategistRuntimeV1,
  createScriptedRosterDeliberationPortV1,
  ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
  verifyRosterStrategistDescriptorV1,
  verifyRosterStrategistSessionReceiptV1,
} from "../packages/roster-strategist/roster-strategist-runtime-v1.mjs";
import {
  normalizeRosterStrategistPublicOutputV1,
  ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1,
  verifyRosterStrategistOutputAliasRegistryV1,
  verifyRosterStrategistOutputNormalizationReceiptV1,
} from "../packages/roster-strategist/public-output-normalization-v1.mjs";
import {
  ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1,
  rosterStrategistRoundOutputContractV1,
  rosterStrategistRoundOutputContractRefV1,
  verifyRosterStrategistOutputContractSetV1,
} from "../packages/roster-strategist/roster-strategist-output-schemas-v1.mjs";
import {
  assertStarcraftTmgProviderJsonSchemaSubsetV1,
  validateStarcraftTmgProviderJsonSchemaValueV1,
} from "../packages/structured-generation/output-contract-registry-v1.mjs";
import {
  parseRosterPlanV1,
  serializeRosterPlanV1,
  verifyRosterPlanRoundTripV1,
} from "../packages/roster-strategist/roster-plan-contracts-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const HASH_RX = /^[a-f0-9]{64}$/u;
const checks = { slice269: 0, slice270: 0 };
function check(slice, condition, label) {
  assert(condition, label);
  checks[`slice${slice}`] += 1;
}
function expectFailure(slice, thunk, codePrefix, label) {
  return Promise.resolve()
    .then(thunk)
    .then(
      () => check(slice, false, `${label}: must throw`),
      (error) => {
        check(slice, String(error?.message || "").startsWith(`${codePrefix}`),
          `${label}: expected ${codePrefix}, got ${error?.message}`);
      },
    );
}

// ------------------------------------------------------------ infra

const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({
  root: ROOT });
const bundle = createOfficialUnitCompositionUpgradeDataBundleV1({
  dataset: source.dataset });
check(270, Object.isFrozen(bundle), "official data bundle must be deep-frozen");
const bundleHashBefore = bundle.bundleHash;
const port = createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: bundle });
const seatPlan = [
  { label: "player1", seatKey: "player1", roleMode: "supervisor",
    principalType: "human" },
  { label: "player2", seatKey: "player2", roleMode: "supervisor",
    principalType: "human" },
];
const authority = createOfficialStandardRoomInitialStateAuthorityV1({
  dataset: source.dataset, snapshot: source.snapshot,
  serverSeatPlan: seatPlan, roomId: "ticket27-slices-269-270-lab-room" });
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
const missionBinding = {
  missionRecordKey: authority.compositionEvidence.selectedMissionRecordKey,
  deploymentRecordKey: authority.compositionEvidence.selectedDeploymentRecordKey,
  mapTopologyHash,
};
const versionPins = {
  sourceLockHash: bundle.sourceLockHash,
  sourceSnapshotHash: bundle.sourceSnapshotHash,
  normalizedDatasetHash: bundle.normalizedDatasetHash,
  officialRulesVersion: bundle.officialRulesVersion,
  officialUnitsVersion: bundle.officialUnitsVersion,
  officialCardsVersion: bundle.officialCardsVersion,
};
const pack = await loadPortableFoundationalStrategyPackV2({
  root: ROOT, manifest: packManifest });
check(269, pack.foundational.entries.length === 11
  && pack.manifest.buildPathDependencies === false,
  "portable strategy pack must load from committed content only");

function createLab(id) {
  return createPregameSceneLaboratoryV1({
    laboratoryId: id,
    sourceState: authority.state,
    sourceRoomRef: { roomId: "ticket27-slices-269-270-lab-room", stateRevision: 0 },
    rulesRuntime,
    armyBuilderPort: port,
    matchBinding: authority.matchBinding,
  });
}

// ------------------------------------------------------------ Slice 270

const lab = createLab("ticket27-s269-270-lab");
const labDescriptor = lab.labDescriptor();
check(270, verifyPregameSceneLaboratoryDescriptorV1(labDescriptor) === true
  && labDescriptor.mutatesRoomState === false
  && labDescriptor.mutatesBuilderState === false
  && labDescriptor.resultsBoundToSourceState === true
  && labDescriptor.hostPreferenceWeightsApplied === false,
  "laboratory descriptor must prove read-only source-bound operation");
check(270, labDescriptor.sourceStateHash
    === hashStarcraftTmgContract(authority.state)
  && labDescriptor.builderBundleHash === bundle.bundleHash,
  "laboratory must bind the exact source Room state and Builder bundle");

// Unknown-not-zero on the reserve source state.
const spatialUnknown = lab.querySpatial({ queryId: "sq-source", seatKey: "player1" });
check(270, verifyPregameLabSpatialReceiptV1(spatialUnknown) === true
  && spatialUnknown.resultStatus === "unknown"
  && spatialUnknown.unknownReason === "no_active_relationships_in_base_state"
  && spatialUnknown.relationships.length === 0
  && spatialUnknown.baseStateHash === labDescriptor.sourceStateHash,
  "reserve source state must yield unknown spatial result, never zeroed distances");
const probabilityUnknown = lab.queryProbability({
  queryId: "pq-source-unknown", attackerUnitId: "player1-marine-1",
  targetUnitId: "player2-corpser" });
check(270, verifyPregameLabProbabilityReceiptV1(probabilityUnknown) === true
  && probabilityUnknown.resultStatus === "unknown"
  && probabilityUnknown.estimate === null
  && probabilityUnknown.unknownNotZero === true,
  "undeployed attacker must yield unknown probability with no fabricated estimate");
await expectFailure(270, () => lab.querySpatial({
  queryId: "sq-bad-branch", seatKey: "player1",
  base: { kind: "branch", branchStateHash: hashStarcraftTmgContract("absent") } }),
  "PREGAME_LAB_BRANCH_UNKNOWN", "query against an unregistered branch");

// Bounded scenario branches A/B from the same source state.
const branchA = lab.runScenarioBranch({ branchId: "branch-a", spec: {
  kind: "hypothetical_geometry", phase: "assault", activeSideKey: "player1",
  isolateToPlacedPieces: true, clearTerrain: true,
  placements: [
    { pieceId: "player1-marine-1", xInches: 27, yInches: 10 },
    { pieceId: "player2-corpser", xInches: 27, yInches: 16 },
  ] } });
const branchB = lab.runScenarioBranch({ branchId: "branch-b", spec: {
  kind: "hypothetical_geometry", phase: "assault", activeSideKey: "player1",
  isolateToPlacedPieces: true, clearTerrain: true,
  placements: [
    { pieceId: "player1-marine-1", xInches: 27, yInches: 10 },
    { pieceId: "player2-corpser", xInches: 27, yInches: 30 },
  ] } });
for (const [branch, label] of [[branchA, "A"], [branchB, "B"]]) {
  check(270, verifyPregameLabScenarioBranchReceiptV1(branch) === true
    && branch.parentStateHash === labDescriptor.sourceStateHash
    && branch.baseStateHash === labDescriptor.sourceStateHash
    && branch.advisoryOnly === true
    && branch.authorityClaim
      === "advisory_hypothetical_geometry_not_rules_legality",
    `branch ${label} must be hash-bound to the source state and advisory-typed`);
}
check(270, branchA.branchStateHash !== branchB.branchStateHash
  && branchA.branchStateHash !== labDescriptor.sourceStateHash,
  "A/B branches must diverge from each other and from the source state");

const spatialA = lab.querySpatial({
  queryId: "sq-branch-a", base: { kind: "branch", branchStateHash: branchA.branchStateHash },
  seatKey: "player1", intent: "threat_scan" });
const spatialB = lab.querySpatial({
  queryId: "sq-branch-b", base: { kind: "branch", branchStateHash: branchB.branchStateHash },
  seatKey: "player1", intent: "threat_scan" });
check(270, verifyPregameLabSpatialReceiptV1(spatialA) === true
  && spatialA.resultStatus === "ok" && spatialA.relationshipCount > 0,
  "branch A spatial query must return exact relationships");
const edgeA = spatialA.relationships.find((entry) => (
  entry.fromUnitId === "player1-marine-1"
    && entry.toUnitId === "player2-corpser"));
const edgeB = spatialB.relationships.find((entry) => (
  entry.fromUnitId === "player1-marine-1"
    && entry.toUnitId === "player2-corpser"));
check(270, Number.isFinite(edgeA?.nearestPhysicalEdges?.distanceMilliInches)
  && Number.isFinite(edgeB?.nearestPhysicalEdges?.distanceMilliInches)
  && edgeB.nearestPhysicalEdges.distanceMilliInches
    > edgeA.nearestPhysicalEdges.distanceMilliInches
  && edgeA.nearestPhysicalEdges.precision === "exact_physical_footprints",
  "A/B same-source branches must yield exact divergent geometry");

const probabilityA = lab.queryProbability({
  queryId: "pq-branch-a",
  base: { kind: "branch", branchStateHash: branchA.branchStateHash },
  attackerUnitId: "player1-marine-1", targetUnitId: "player2-corpser",
  sampleBudget: 36 });
check(270, verifyPregameLabProbabilityReceiptV1(probabilityA) === true
  && probabilityA.resultStatus === "ok"
  && HASH_RX.test(probabilityA.estimate.estimateHash)
  && probabilityA.estimate.rulesMechanicsPerOutcome === "exact"
  && Number(probabilityA.estimate.expectedDamage) > 0
  && probabilityA.estimate.chanceCount >= 1,
  "branch A probability must carry a Rules-mechanics estimate receipt");

const threatExchangeA = lab.queryThreatExchange({
  queryId: "tq-branch-a",
  base: { kind: "branch", branchStateHash: branchA.branchStateHash },
  seatKey: "player1", sampleBudget: 36,
  subjectUnitIds: ["player1-marine-1"], targetIds: ["player2-corpser"] });
check(270, verifyPregameLabThreatExchangeReceiptV1(threatExchangeA) === true
  && threatExchangeA.resultStatus === "ok"
  && threatExchangeA.exchange.unknownValuesNeverPromotedToZero === true
  && threatExchangeA.exchange.alternatives.some((entry) => (
    entry.kind === "attack" && entry.status === "current_attack_estimated"
      && entry.mayBeRankedAsKnownValue === true))
  && threatExchangeA.exchange.alternatives.every((entry) => (
    entry.expectedDamageReceived === null)),
  "threat exchange must estimate own attack while keeping return fire unknown");

const mathFit = lab.queryMath({ queryId: "mq-budget", mathKind: "budget_fit",
  inputs: { mineralBudget: 2000, mineralSpent: 1870, vespeneSpent: 115,
    vespeneLimitNumerator: 1, vespeneLimitDenominator: 10 } });
check(270, verifyPregameLabMathReceiptV1(mathFit) === true
  && mathFit.result.mineralRemaining === 130
  && mathFit.result.mineralWithinBudget === true
  && mathFit.result.vespeneWithinLimit === true
  && mathFit.result.exactIntegerArithmetic === true,
  "budget-fit math must be exact integer arithmetic");
const mathVp = lab.queryMath({ queryId: "mq-vp", mathKind: "vp_schedule_delta",
  inputs: { planned: [{ window: "round:2", plannedCumulativeVp: 2 }],
    projected: [] } });
check(270, mathVp.result.deltas[0].projectionStatus === "unknown"
  && mathVp.result.deltas[0].deltaVp === null,
  "missing VP projection must stay unknown, never zero");

// Same-state A/B candidate comparison through the Rules-owned port.
const recipe = OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player1;
const candidateInputFromRecipe = (mutate = null) => {
  const candidate = {
    sideKey: "player1", scaleId: "Standard", mineralBudget: 2000,
    factionRecordKey: recipe.factionRecordKey,
    tacticalCardRecordKeys: [...recipe.tacticalCardRecordKeys],
    units: recipe.units.map((unit) => ({
      unitInstanceId: unit.unitInstanceId, recordKey: unit.recordKey,
      compositionKind: unit.compositionKind,
      upgrades: unit.upgradeNames.map((upgradeName) => ({ upgradeName })),
    })),
  };
  if (mutate) mutate(candidate);
  return candidate;
};
const abReceipt = lab.compareCandidatesSameState({ comparisonId: "ab-preset",
  candidates: [
    { candidateRef: "full", candidateInput: candidateInputFromRecipe() },
    { candidateRef: "lean", candidateInput: candidateInputFromRecipe(
      (candidate) => {
        candidate.units[0].upgrades = candidate.units[0].upgrades.slice(0, 1);
      }) },
  ] });
check(270, verifyPregameLabSameStateABReceiptV1(abReceipt) === true
  && abReceipt.sameSourceStateHash === labDescriptor.sourceStateHash
  && abReceipt.sameBuilderBundleHash === bundle.bundleHash
  && abReceipt.candidates.every((entry) => entry.legalityStatus === "legal")
  && abReceipt.candidates[0].mineralSpent === 2000
  && abReceipt.candidates[1].mineralSpent < 2000
  && abReceipt.ranking === null,
  "same-state A/B comparison must bind both candidates to one source/builder "
    + "state and never rank them");

const mutationProof = lab.proveMutationZero();
check(270, verifyPregameLabMutationZeroProofV1(mutationProof) === true
  && mutationProof.sourceStateMutationCount === 0
  && mutationProof.operationCount === 11
  && mutationProof.receiptLog.length === 11,
  "mutation-zero proof must cover every laboratory operation");
check(270, bundle.bundleHash === bundleHashBefore && Object.isFrozen(bundle)
  && hashStarcraftTmgContract(authority.state)
    === labDescriptor.sourceStateHash,
  "source Room state and Builder bundle must be unchanged after all queries");

// ------------------------------------------------------------ Slice 269

const strategist = createRosterStrategistRuntimeV1({
  armyBuilderPort: port, laboratory: createLab("ticket27-s269-lab-a"),
  strategyPack: pack });
const strategistDescriptor = strategist.runtimeDescriptor();
check(269, verifyRosterStrategistDescriptorV1(strategistDescriptor) === true
  && strategistDescriptor.hostPreferenceWeights === false
  && strategistDescriptor.promptPreferenceWeights === false
  && strategistDescriptor.runtimeRanksOrScoresCandidates === false
  && strategistDescriptor.hiddenChainOfThoughtRequested === false,
  "strategist descriptor must prove strategy comes only from Skills and "
    + "Agent deliberation");

// Closed-superset toolRequest wire shape mandated by the strict
// generation-side schema (sub-slice 269.7). Fields a need kind does not
// consume carry the schema-mandated placeholders; the runtime's kind-driven
// canonicalization drops them, so the laboratory sees exactly the minimal
// per-kind request it always saw.
const PLACEHOLDER_MATH_INPUTS = {
  mineralBudget: 0, mineralSpent: 0, vespeneSpent: 0,
  vespeneLimitNumerator: 0, vespeneLimitDenominator: 0,
  planned: [], projected: [], values: [],
};
const PLACEHOLDER_SCENARIO_SPEC = {
  kind: "", lifecycleSteps: 0, phase: "", activeSideKey: "",
  isolateToPlacedPieces: false, clearTerrain: false, placements: [],
};
function toolRequestWire(overrides = {}) {
  return {
    branchIdRef: "", attackerUnitId: "", targetUnitId: "", seatKey: "",
    intent: "", subjectUnitIds: [], targetIds: [], sampleBudget: 0,
    mathKind: "", inputs: { ...PLACEHOLDER_MATH_INPUTS },
    spec: { ...PLACEHOLDER_SCENARIO_SPEC }, followUps: [],
    ...overrides,
  };
}
function followUpWire(overrides = {}) {
  return {
    kind: "", attackerUnitId: "", targetUnitId: "", sampleBudget: 0,
    seatKey: "", intent: "", subjectUnitIds: [], targetIds: [],
    ...overrides,
  };
}

// --------------------------------- strict generation-side output contracts
// Sub-slice 269.7: closes the saved live round-5 blocker (the model omitted
// contracted semantic fields outright; the alias boundary correctly refused
// to invent them). Every deliberation round is now requested through a
// strict Provider JSON schema so the contracted field set is structurally
// unavoidable at generation time; the normalization boundary and full
// schema/Rules validation still run afterwards.
check(269, verifyRosterStrategistOutputContractSetV1(
    ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1) === true
  && ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.version === "1.2.0"
  && ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.invariants
      .bindsOnlyFieldNamesTypesBoundsAndEnums === true
  && ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.invariants
      .neverBindsRosterContentCandidateIdentityOrStrategy === true,
  "the strict output contract set must be explicit, versioned (1.2.0 after "
    + "the 269.9 integer-domain and 269.10 instance-identity repairs) and "
    + "content-free");
check(269, strategistDescriptor.structuredGenerationOutput?.contractSetHash
    === ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contractSetHash
  && strategistDescriptor.structuredGenerationOutput
      ?.normalizationBoundaryStillRunsAfterDecoding === true
  && strategistDescriptor.structuredGenerationOutput
      ?.fullSchemaAndRulesValidationStillRunsAfterDecoding === true,
  "the runtime descriptor must bind the strict output contract set while "
    + "keeping the normalization boundary and full validation in force");
const foundationContract = rosterStrategistRoundOutputContractV1(
  "strategy_foundation");
check(269, foundationContract.schemaName === "roster_strategy_foundation_v1"
  && rosterStrategistRoundOutputContractRefV1("strategy_foundation").hash
    === foundationContract.contractHash,
  "each round kind must resolve one versioned strict output contract");

const route = strategist.selectSkillRoute({
  ownFactionRecordKey: "tactical_cards:terran_armed_forces",
  opponentFactionRecordKey: "tactical_cards:kerrigan_s_swarm" });
check(269, route.skillRefs.map((entry) => entry.role).join(",")
    === "general,faction,matchup"
  && route.skillRefs.every((entry) => HASH_RX.test(entry.skillHash))
  && route.skillRefs[2].skillId
    === "starcraft-tmg.matchup.terran_armed_forces-to-kerrigan_s_swarm"
  && route.projections.general.guidance.length > 0
  && route.projections.faction.guidance.length > 0
  && route.projections.matchup.guidance.length > 0,
  "skill route must bind the exact General, faction and directed matchup Skills");
await expectFailure(269, async () => strategist.selectSkillRoute({
  ownFactionRecordKey: "tactical_cards:terran_armed_forces",
  opponentFactionRecordKey: "tactical_cards:nonexistent" }),
  "ROSTER_STRATEGIST_SKILL_ROUTE_UNAVAILABLE",
  "missing directed matchup Skill must fail closed");

const unitsFrom = (units) => units.map((unit) => ({
  recordKey: unit.recordKey, compositionKind: unit.compositionKind,
  upgrades: unit.upgradeNames.map((upgradeName) => ({ upgradeName })) }));

function foundationOutput() {
  return {
    schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
    roundKind: "strategy_foundation",
    scoreRoute: {
      routeKind: "mission_marker_control",
      routeText: "win central marker windows behind Marine blocks",
      scheduleStatus: "declared",
      targetVpSchedule: [
        { window: "round:2", plannedCumulativeVp: 2 },
        { window: "round:4", plannedCumulativeVp: 5 }],
      fallbackRouteText: "attrition through goliath trades" },
    opponentHypotheses: [{
      hypothesisId: "hyp-zerg-pressure", archetypeLabel: "zerg_early_pressure",
      hypothesisText: "Kerrigan's Swarm races cheap units onto central markers",
      confidence: "medium",
      expectedCounterTexts: ["swarmling marker races", "creep-enabled flanks"],
      ownCounterResponseIds: ["rsp-hold-center"],
      falsificationText: "opponent deploys no cheap runner unit by round 2" }],
    counterResponses: [{
      responseId: "rsp-hold-center",
      triggerText: "early cheap-unit marker pressure",
      responseText: "hold central high ground with Marine blocks and "
        + "Goliath overwatch",
      linkedHypothesisIds: ["hyp-zerg-pressure"] }],
    invalidationTriggers: [{
      triggerId: "trg-vp-deficit", observationKind: "vp_deficit",
      triggerText: "two or more VP behind schedule after round 2",
      revisionRequiredText: "re-route to attrition scoring" }],
    informationNeeds: [
      { needId: "need-budget", kind: "math",
        questionText: "exact budget fit of a 2000-mineral build",
        toolRequest: toolRequestWire({ mathKind: "budget_fit", inputs: {
          ...PLACEHOLDER_MATH_INPUTS,
          mineralBudget: 2000, mineralSpent: 2000, vespeneSpent: 115,
          vespeneLimitNumerator: 1, vespeneLimitDenominator: 10 } }) },
      { needId: "need-central-exchange", kind: "scenario",
        questionText: "Marine block vs Corpser central exchange",
        toolRequest: toolRequestWire({
          spec: { kind: "hypothetical_geometry", lifecycleSteps: 0,
            phase: "assault", activeSideKey: "player1",
            isolateToPlacedPieces: true, clearTerrain: true,
            placements: [
              { pieceId: "player1-marine-1", xInches: 27, yInches: 10 },
              { pieceId: "player2-corpser", xInches: 27, yInches: 16 }] },
          followUps: [
            followUpWire({ kind: "probability",
              attackerUnitId: "player1-marine-1",
              targetUnitId: "player2-corpser", sampleBudget: 36 }),
            followUpWire({ kind: "spatial", seatKey: "player1",
              intent: "threat_scan" })] }) },
    ],
  };
}
function proposalsOutput() {
  return {
    schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
    roundKind: "candidate_proposals",
    proposals: [
      { candidateId: "cand-full",
        tacticalCardRecordKeys: [...recipe.tacticalCardRecordKeys],
        units: unitsFrom(recipe.units),
        rationaleText: "maximum firepower at exactly 2000 minerals" },
      { candidateId: "cand-lean",
        tacticalCardRecordKeys: [...recipe.tacticalCardRecordKeys],
        units: unitsFrom(recipe.units).map((unit, index) => (index === 0
          ? { ...unit, upgrades: unit.upgrades.slice(0, 1) } : unit)),
        rationaleText: "trade one Marine upgrade for mineral headroom" },
      { candidateId: "cand-over",
        tacticalCardRecordKeys: [...recipe.tacticalCardRecordKeys],
        units: [...unitsFrom(recipe.units), {
          recordKey: "army_units:goliath", compositionKind: "small",
          upgrades: [] }],
        rationaleText: "stress candidate expected to fail Rules legality" },
    ],
  };
}
function comparisonOutput() {
  return {
    schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
    roundKind: "comparison_selection",
    comparison: {
      basisTexts: ["Rules legality is mandatory",
        "cand-lean keeps central marker plan with 130-mineral headroom",
        "probability receipt supports Marine block holding the center"],
      tradeoffTexts: ["cand-full has more upgrades but zero headroom",
        "cand-over is Rules-illegal and discarded"],
      selectedCandidateId: "cand-lean" },
    componentPurposes: [
      { componentKind: "faction_card",
        recordKey: "tactical_cards:terran_armed_forces",
        instanceId: "player1-faction",
        publicPurposeText: "faction anchor for the Terran build",
        scoringRole: "support" },
      { componentKind: "unit", recordKey: "army_units:marine",
        instanceId: "agent-unit-1",
        publicPurposeText: "central marker holder",
        scoringRole: "primary_scorer" },
      { componentKind: "upgrade", recordKey: "army_units:marine",
        instanceId: "agent-unit-1-upgrade-1",
        publicPurposeText: "retained Specialist extends anti-air reach",
        scoringRole: "counter" }],
    deploymentConcept: {
      deploymentConceptText: "Marines deploy central, Goliaths flank",
      activationOrderStatus: "declared",
      activationOrder: [
        { ordinal: 1, unitInstanceId: "agent-unit-1", phase: "movement" }],
      reinforcementPolicyText: "reserve units enter round 2 at own edge",
      threatTradeText: "trade Marine models for marker control time",
      objectiveControlText: "hold two central markers through round 4" },
    lossResourceBudget: {
      lossBudgetStatus: "declared",
      plannedLossBudget: [{ resourceKind: "supply", window: "round:2",
        plannedMaximumLoss: 4 }] },
    publicSummaryText:
      "lean central marker-control roster with mineral headroom",
  };
}

function createMock(handlerOverrides = {}, recordedRequests = null) {
  return createScriptedRosterDeliberationPortV1({
    modelVersion: "scripted-mock-deepseek-flash-standin-v1",
    promptVersion: "ticket27.roster_strategist.multi_round.v1",
    handler: (request) => {
      if (recordedRequests) {
        recordedRequests.push(JSON.parse(JSON.stringify(request)));
      }
      if (handlerOverrides[request.roundKind]) {
        return handlerOverrides[request.roundKind](request);
      }
      if (request.roundKind === "strategy_foundation") return foundationOutput();
      if (request.roundKind === "candidate_proposals") return proposalsOutput();
      if (request.roundKind === "comparison_selection") return comparisonOutput();
      throw new Error(`unexpected round ${request.roundKind}`);
    },
  });
}

for (const [roundKind, output] of [
  ["strategy_foundation", foundationOutput()],
  ["candidate_proposals", proposalsOutput()],
  ["comparison_selection", comparisonOutput()],
]) {
  const contract = rosterStrategistRoundOutputContractV1(roundKind);
  const validation = validateStarcraftTmgProviderJsonSchemaValueV1(
    contract.providerSchema, output);
  check(269, validation.ok === true
    && validation.schemaHash.length === 64,
    `the scripted ${roundKind} output must satisfy its strict generation `
      + "schema, proving schema and runtime validator field sets agree");
}

const sessionInput = {
  sessionId: "ticket27-s269-270-deterministic",
  sideKey: "player1",
  factionRecordKey: "tactical_cards:terran_armed_forces",
  opponentFactionRecordKey: "tactical_cards:kerrigan_s_swarm",
  engagementScale: "Standard",
  mineralBudget: 2000,
  missionBinding,
  opponentInformationBoundary: "open_roster",
  versionPins,
};

const labA = createLab("ticket27-s269-lab-run-a");
const strategistA = createRosterStrategistRuntimeV1({
  armyBuilderPort: port, laboratory: labA, strategyPack: pack });
const recordedRequests = [];
const result = await strategistA.planRoster(sessionInput, {
  deliberation: createMock({}, recordedRequests) });
const { plan } = result;

check(269, recordedRequests.map((entry) => entry.roundKind).join(">")
    === "strategy_foundation>candidate_proposals>comparison_selection"
  && recordedRequests.every((entry) => {
    const contract = rosterStrategistRoundOutputContractV1(entry.roundKind);
    return entry.responseFormat?.kind === "provider_strict_json_schema"
      && entry.responseFormat.schemaName === contract.schemaName
      && entry.responseFormat.outputContractRef?.hash
        === contract.contractHash
      && isDeepStrictEqual(entry.responseFormat.schema,
        JSON.parse(JSON.stringify(contract.providerSchema)));
  }),
  "every deliberation round request must carry the round's strict Provider "
    + "JSON schema, schema name and versioned output contract reference");
check(269, result.planningTrace.every((entry) => (
    entry.outputContractRef?.hash === rosterStrategistRoundOutputContractV1(
      entry.roundKind).contractHash))
  && result.sessionReceipt.outputContractSetHash
    === ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contractSetHash
  && result.sessionReceipt.structuredGenerationEnforced === true,
  "round receipts and the session receipt must bind the strict output "
    + "contract set actually requested");

check(269, verifyRosterStrategistSessionReceiptV1(result.sessionReceipt) === true
  && result.sessionReceipt.deliberationCallCount === 3
  && result.sessionReceipt.deliberationKind === "scripted_mock_deterministic"
  && result.sessionReceipt.selectedByAgentDeliberation === true,
  "session receipt must record three mock deliberation rounds");
check(269, verifyRosterPlanRoundTripV1(plan) === true
  && plan.planStatus === "active"
  && isDeepStrictEqual(parseRosterPlanV1(serializeRosterPlanV1(plan)), plan),
  "final RosterPlan must round-trip losslessly");
check(269, plan.rosterCandidate.legalityStatus === "legal"
  && plan.rosterCandidate.candidateId === "cand-lean"
  && result.finalVerdict.summary.mineralSpent === 1870
  && result.finalVerdict.summary.mineralSpent <= 2000
  && result.finalVerdict.summary.scaleId === "Standard",
  "final roster must be a Rules-legal Standard-2000 roster chosen by the Agent");
check(269, result.comparison.candidateHashes.length === 3
  && result.comparison.selectedCandidateHash
    === plan.rosterCandidate.candidateHash
  && result.candidates[0].candidateId === "cand-full"
  && plan.rosterCandidate.candidateId !== result.candidates[0].candidateId,
  "the Agent must select a non-first candidate, proving no host preference");
check(269, plan.provenance.missionBinding.status === "frozen"
  && plan.provenance.missionBinding.missionRecordKey
    === missionBinding.missionRecordKey
  && plan.provenance.missionBinding.mapTopologyHash === mapTopologyHash
  && plan.provenance.opponentInformationBoundary === "open_roster"
  && plan.provenance.skillVersions.length === 3
  && plan.provenance.modelVersion === "scripted-mock-deepseek-flash-standin-v1"
  && plan.provenance.unitCompositionUpgradeDataBundleHash === bundle.bundleHash,
  "provenance must freeze mission, map, boundary and all version pins");
const needKinds = plan.toolReceiptReferences.map((entry) => entry.receiptKind)
  .sort().join(",");
check(269, needKinds === "math,probability,simulation,spatial"
  && plan.toolReceiptReferences.every((entry) => entry.status === "attached"
    && HASH_RX.test(entry.receiptHash) && entry.unknownNotZero === true),
  "plan must attach probability, spatial, math and simulation tool receipts");
const labAProof = labA.proveMutationZero();
check(269, plan.toolReceiptReferences.every((entry) => (
  labAProof.receiptLog.includes(entry.receiptHash)))
  && labAProof.sourceStateMutationCount === 0,
  "every plan tool receipt must exist in the laboratory receipt log with "
    + "mutation-zero source state");
check(269, plan.opponentHypotheses.length === 1
  && plan.counterResponses.length === 1
  && plan.invalidationTriggers.length === 1
  && plan.opponentHypotheses[0].ownCounterResponseIds[0]
    === plan.counterResponses[0].responseId
  && plan.counterResponses[0].linkedHypothesisIds[0]
    === plan.opponentHypotheses[0].hypothesisId,
  "public hypotheses, predicted counters and counter-responses must link");
check(269, plan.componentPurposes.length === 3
  && plan.deploymentConcept.activationOrder[0].unitInstanceId === "agent-unit-1"
  && plan.lossResourceBudget.mineralSpendIntent.plannedMineralSpend === 1870,
  "component purposes, deployment concept and loss budget must bind the "
    + "selected roster");
check(269, result.rejections.length === 1
  && result.rejections[0].silentRepairAttempted === false
  && result.rejections[0].fallbackApplied === false
  && result.candidates[2].legalityStatus === "illegal"
  && result.candidates[2].legalityReceipt.rulesErrorCode
    === "ARMY_SLOT_CAPACITY_EXCEEDED",
  "the over-capacity candidate must carry a typed Rules rejection, never "
    + "silent repair");
check(269, result.planningTrace.map((entry) => entry.roundKind).join(">")
    === "strategy_foundation>candidate_proposals>comparison_selection"
  && result.planningTrace.every((entry) => (
    entry.hiddenChainOfThoughtRequested === false
      && entry.hostPreferenceWeightsApplied === false))
  && result.planningTrace[0].informationNeedOutcomes.every((outcome) => (
    outcome.status === "answered")),
  "planning trace must record typed rounds and answered information needs");
const serializedEvidence = JSON.stringify(plan) + JSON.stringify(result.planningTrace);
check(269, !/"chain_of_thought"|"scratchpad"|"reasoning"|"internal_monologue"/iu
  .test(serializedEvidence)
  && plan.hiddenChainOfThoughtIncluded === false
  && plan.planFabricated === false,
  "no hidden chain-of-thought may be requested or persisted");

// Determinism: an identical scripted session must reproduce the plan hash.
// A fresh laboratory instance with the same identity and source state must
// produce byte-identical receipts.
const strategistB = createRosterStrategistRuntimeV1({
  armyBuilderPort: port, laboratory: createLab("ticket27-s269-lab-run-a"),
  strategyPack: pack });
const resultB = await strategistB.planRoster(sessionInput, {
  deliberation: createMock() });
check(269, resultB.plan.planHash === plan.planHash
  && resultB.sessionReceipt.receiptHash === result.sessionReceipt.receiptHash,
  "the deterministic mocked session must reproduce identical plan and "
    + "session hashes");

// Revision chain.
function revisionOutput() {
  return {
    schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
    roundKind: "revision",
    publicSummaryText: "revised toward attrition after VP deficit",
    revisedScoreRoute: {
      routeKind: "hybrid",
      routeText: "blend marker control with Goliath attrition trades",
      scheduleStatus: "declared",
      targetVpSchedule: [{ window: "round:4", plannedCumulativeVp: 4 }],
      fallbackRouteText: "pure attrition" },
    // The strict schema has no null type; the runtime applies only the
    // sections named by the declared revision triggers, so this complete
    // object is emitted but unused for a scoreRoute-only revision.
    revisedDeploymentConcept: {
      deploymentConceptText: "central Marine deployment unchanged",
      activationOrderStatus: "unknown",
      activationOrder: [],
      reinforcementPolicyText: "reserve policy unchanged",
      threatTradeText: "threat trades unchanged",
      objectiveControlText: "central marker plan unchanged" },
  };
}
const revisionRequests = [];
const revised = await strategistA.reviseRosterPlan({
  plan,
  reasonText: "declared VP schedule missed at round 2",
  triggerIds: ["trg-vp-deficit"],
  revisedSectionKeys: ["scoreRoute"],
}, {
  deliberation: createMock({ revision: () => revisionOutput() },
    revisionRequests),
});
check(269, verifyRosterPlanRoundTripV1(revised.plan) === true
  && revised.plan.planStatus === "revised"
  && revised.plan.planVersion === 2
  && revised.plan.revisions.length === 1
  && revised.plan.revisions[0].previousPlanHash === plan.planHash
  && revised.plan.scoreRoute.routeKind === "hybrid"
  && revised.plan.rosterCandidate.candidateHash
    === plan.rosterCandidate.candidateHash,
  "revision must hash-bind the previous plan version and keep the legal roster");
check(269, revisionRequests.length === 1
  && revisionRequests[0].roundKind === "revision"
  && revisionRequests[0].responseFormat?.schemaName
    === "roster_strategy_revision_v1"
  && revisionRequests[0].responseFormat?.outputContractRef?.hash
    === rosterStrategistRoundOutputContractV1("revision").contractHash
  && validateStarcraftTmgProviderJsonSchemaValueV1(
    rosterStrategistRoundOutputContractV1("revision").providerSchema,
    revisionOutput()).ok === true,
  "the revision round must also carry and satisfy its strict output schema");

// Cheap math-only foundation for negative gates: the gate under test never
// depends on scenario tool execution, so these sessions skip it.
function cheapFoundationOutput() {
  return {
    ...foundationOutput(),
    informationNeeds: [foundationOutput().informationNeeds[0]],
  };
}

// Negative gates.
await expectFailure(269, () => strategistA.planRoster(sessionInput, {
  deliberation: createMock({
    strategy_foundation: () => ({
      ...cheapFoundationOutput(),
      chain_of_thought: "hidden reasoning must be rejected",
    }),
  }),
}), "ROSTER_STRATEGIST_HIDDEN_COT_REJECTED",
  "hidden chain-of-thought output field");
await expectFailure(269, () => strategistA.planRoster(sessionInput, {
  deliberation: createMock({
    strategy_foundation: () => cheapFoundationOutput(),
    comparison_selection: () => ({
      ...comparisonOutput(),
      comparison: { ...comparisonOutput().comparison,
        selectedCandidateId: "cand-over" },
    }),
  }),
}), "ROSTER_STRATEGIST_SELECTION_NOT_RULES_LEGAL",
  "selecting a Rules-illegal candidate");
await expectFailure(269, () => strategistA.planRoster(sessionInput, {
  deliberation: createMock({
    strategy_foundation: () => cheapFoundationOutput(),
    comparison_selection: () => ({
      ...comparisonOutput(),
      comparison: { ...comparisonOutput().comparison,
        selectedCandidateId: "cand-nonexistent" },
    }),
  }),
}), "ROSTER_STRATEGIST_SELECTION_UNKNOWN",
  "selecting an unevaluated candidate");
await expectFailure(269, () => strategistA.planRoster(sessionInput, {
  deliberation: createMock({
    strategy_foundation: () => cheapFoundationOutput(),
    candidate_proposals: () => ({
      schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA,
      roundKind: "candidate_proposals",
      proposals: [
        { candidateId: "bad-1", tacticalCardRecordKeys: [],
          units: [{ recordKey: "army_units:not_in_menu",
            compositionKind: "small", upgrades: [] }],
          rationaleText: "off-menu unit" },
        { candidateId: "bad-2", tacticalCardRecordKeys: [],
          units: [{ recordKey: "army_units:also_not_in_menu",
            compositionKind: "small", upgrades: [] }],
          rationaleText: "off-menu unit" },
      ],
    }),
  }),
}), "ROSTER_STRATEGIST_PROPOSALS_INVALID",
  "proposals must use only enumerated legal choices");

// ------------------------------------------------ round-4 alias drift
// Focused regression for the saved live round-4 blocker
// (repair-round-4-report.json,
// ROSTER_STRATEGIST_FOUNDATION_INVALID:hypothesis,implication,observable).
check(269, verifyRosterStrategistOutputAliasRegistryV1(
    ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1) === true
  && ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1.version === "1.0.0"
  && strategistDescriptor.publicOutputNormalization?.aliasRegistryHash
    === ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1.registryHash
  && strategistDescriptor.publicOutputNormalization
      .neverFillsMissingSemanticContent === true,
  "the alias registry must be explicit, versioned and bound by the descriptor");
const identityNormalization = normalizeRosterStrategistPublicOutputV1({
  output: foundationOutput(),
  request: { roundKind: "strategy_foundation",
    schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA } });
check(269, verifyRosterStrategistOutputNormalizationReceiptV1(
    identityNormalization.receipt) === true
  && identityNormalization.receipt.changed === false
  && identityNormalization.receipt.operations.length === 0
  && isDeepStrictEqual(identityNormalization.output, foundationOutput()),
  "an already-contracted answer must normalize as an identity with a "
    + "provenance receipt");
function capturedRound4HypothesisOutput() {
  return {
    ...cheapFoundationOutput(),
    opponentHypotheses: [{
      hypothesis: "Kerrigan's Swarm races cheap units onto central markers",
      implication: "central marker pressure forces early Marine commitment",
      observable: "opponent deploys no cheap runner unit by round 2" }],
  };
}
const capturedNormalization = normalizeRosterStrategistPublicOutputV1({
  output: capturedRound4HypothesisOutput(),
  request: { roundKind: "strategy_foundation",
    schemaVersion: ROSTER_STRATEGIST_DELIBERATION_SCHEMA } });
check(269, verifyRosterStrategistOutputNormalizationReceiptV1(
    capturedNormalization.receipt) === true
  && capturedNormalization.receipt.operations.filter((operation) => (
    operation.kind === "admitted_alias_rename")).length === 2
  && capturedNormalization.output.opponentHypotheses[0].hypothesisText
    === "Kerrigan's Swarm races cheap units onto central markers"
  && capturedNormalization.output.opponentHypotheses[0].falsificationText
    === "opponent deploys no cheap runner unit by round 2"
  && capturedNormalization.output.opponentHypotheses[0].implication
    !== undefined
  && capturedNormalization.output.opponentHypotheses[0].hypothesisId
    === undefined,
  "the boundary renames only admitted aliases and never invents the "
    + "still-missing contracted content");
await expectFailure(269, () => strategistA.planRoster(sessionInput, {
  deliberation: createMock({
    strategy_foundation: () => capturedRound4HypothesisOutput() }),
}), "ROSTER_STRATEGIST_FOUNDATION_INVALID",
  "the captured under-specified round-4 shape must still fail closed after "
    + "normalization: missing semantic content is never filled");

// ---------------------------------------------- round-5 omitted fields
// Offline replay of the exact saved live round-5 failure
// (repair-round-5-report.json, failureDetail
// "ROSTER_STRATEGIST_FOUNDATION_INVALID:evidence,hypothesisText,implication"):
// the model answered hypothesis entries with only
// evidence/hypothesisText/implication, omitting the contracted strategy
// semantics, and the alias boundary correctly refused to invent them.
// 0 Provider calls.
function capturedRound5HypothesisOutput() {
  return {
    ...cheapFoundationOutput(),
    opponentHypotheses: [{
      evidence: "open roster shows cheap fast units and creep-spread cards",
      hypothesisText: "Kerrigan's Swarm races cheap units onto central markers",
      implication: "central marker pressure forces early Marine commitment" }],
  };
}
const round5SchemaValidation = validateStarcraftTmgProviderJsonSchemaValueV1(
  foundationContract.providerSchema, capturedRound5HypothesisOutput());
check(269, round5SchemaValidation.ok === false
  && round5SchemaValidation.issues.some((issue) => (
    issue.path === "$.opponentHypotheses[0].hypothesisId"
      && issue.code === "required_field_missing"))
  && round5SchemaValidation.issues.some((issue) => (
    issue.path === "$.opponentHypotheses[0].confidence"
      && issue.code === "required_field_missing"))
  && round5SchemaValidation.issues.some((issue) => (
    issue.path === "$.opponentHypotheses[0].evidence"
      && issue.code === "additional_property_forbidden"))
  && round5SchemaValidation.issues.some((issue) => (
    issue.path === "$.opponentHypotheses[0].implication"
      && issue.code === "additional_property_forbidden")),
  "the captured round-5 omitted-field shape must be a wire-level rejection "
    + "under the strict generation schema: omitted contracted fields and "
    + "unadmitted keys are both structurally excluded at generation time");
let round5ReplayError = null;
try {
  await strategistA.planRoster(sessionInput, {
    deliberation: createMock({
      strategy_foundation: () => capturedRound5HypothesisOutput() }) });
} catch (error) {
  round5ReplayError = error;
}
check(269, String(round5ReplayError?.message || "")
    === "ROSTER_STRATEGIST_FOUNDATION_INVALID:evidence,hypothesisText,"
      + "implication",
  "offline replay must reproduce the exact saved round-5 failure "
    + "byte-identically (OFFLINE_REPLAY_MATCHES_SAVED_ROUND5_FAILURE)");
function aliasedEnvelopeFoundationOutput() {
  const base = cheapFoundationOutput();
  return { channels: { roster_strategy: {
    scoreRoute: base.scoreRoute,
    opponentHypotheses: [{
      id: "hyp-zerg-pressure",
      archetype: "zerg_early_pressure",
      hypothesis: "Kerrigan's Swarm races cheap units onto central markers",
      confidence: "medium",
      expectedCounters: ["swarmling marker races", "creep-enabled flanks"],
      counterResponseIds: ["rsp-hold-center"],
      observable: "opponent deploys no cheap runner unit by round 2" }],
    counterResponses: [{
      id: "rsp-hold-center",
      trigger: "early cheap-unit marker pressure",
      response: "hold central high ground with Marine blocks and "
        + "Goliath overwatch",
      hypothesisIds: ["hyp-zerg-pressure"] }],
    invalidationTriggers: [{
      id: "trg-vp-deficit",
      observationKind: "vp_deficit",
      trigger: "two or more VP behind schedule after round 2",
      revisionRequired: "re-route to attrition scoring" }],
    informationNeeds: base.informationNeeds,
  } } };
}
const aliasSession = await strategistA.planRoster(sessionInput, {
  deliberation: createMock({
    strategy_foundation: () => aliasedEnvelopeFoundationOutput() }) });
check(269, verifyRosterPlanRoundTripV1(aliasSession.plan) === true
  && aliasSession.plan.rosterCandidate.legalityStatus === "legal"
  && aliasSession.plan.opponentHypotheses[0].hypothesisId
    === "hyp-zerg-pressure"
  && aliasSession.plan.opponentHypotheses[0].ownCounterResponseIds[0]
    === aliasSession.plan.counterResponses[0].responseId
  && aliasSession.plan.counterResponses[0].linkedHypothesisIds[0]
    === aliasSession.plan.opponentHypotheses[0].hypothesisId
  && verifyRosterStrategistSessionReceiptV1(aliasSession.sessionReceipt)
    === true,
  "a fully alias-drifted but content-complete foundation inside the admitted "
    + "transport envelope must validate and plan normally after normalization");
const aliasRoundReceipt =
  aliasSession.planningTrace[0].outputNormalizationReceipt;
check(269, verifyRosterStrategistOutputNormalizationReceiptV1(
    aliasRoundReceipt) === true
  && aliasRoundReceipt.changed === true
  && aliasRoundReceipt.semanticContentModified === false
  && aliasRoundReceipt.missingSemanticContentFilled === false
  && aliasRoundReceipt.operations.some((operation) => (
    operation.kind === "transport_envelope_unwrap"
      && operation.path === "channels.roster_strategy"))
  && aliasRoundReceipt.operations.filter((operation) => (
    operation.kind === "request_owned_constant_stamp")).length === 2
  && aliasRoundReceipt.operations.filter((operation) => (
    operation.kind === "admitted_alias_rename")).length === 13
  && aliasSession.planningTrace.every((entry) => (
    verifyRosterStrategistOutputNormalizationReceiptV1(
      entry.outputNormalizationReceipt) === true))
  && aliasSession.sessionReceipt.outputNormalizationAliasRegistryVersion
    === "1.0.0",
  "the provenance receipt must record the unwrap, both constant stamps and "
    + "every admitted rename for the alias-drifted round");
await expectFailure(269, () => strategistA.planRoster(sessionInput, {
  deliberation: createMock({
    strategy_foundation: () => ({
      ...cheapFoundationOutput(),
      opponentHypotheses: [{
        hypothesisId: "hyp-zerg-pressure",
        archetypeLabel: "zerg_early_pressure",
        hypothesis: "alias naming must never merge or drop keys",
        hypothesisText: "canonical value already present",
        confidence: "medium",
        expectedCounterTexts: ["swarmling marker races"],
        ownCounterResponseIds: ["rsp-hold-center"],
        falsificationText: "opponent deploys no cheap runner unit by round 2" }],
    }) }),
}), "ROSTER_STRATEGIST_FOUNDATION_INVALID",
  "an alias conflicting with a present canonical field must fail closed; "
    + "the boundary never merges or drops keys");

// --------------------------------------- round-6 schema integer bound
// Offline replay of the exact saved live round-6 failure (live-report.json
// repairRound 6, failureDetail
// "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:$.informationNeeds[2]
// .toolRequest.inputs.vespeneLimitNumerator:integer_too_large"): the strict
// foundation schema's host-authored vespeneLimitNumerator cap of 1,000 was
// tighter than the laboratory domain (any safe integer), so a domain-legal
// value was rejected at the wire. The exact value the model wrote was never
// persisted (rawResponsePersisted: false; the failure detail carries
// path:code only), so the replay uses the smallest representative over-bound
// value consistent with the saved path: 2000, the session's own mineral
// budget. 0 Provider calls.
const ROUND6_SAVED_FAILURE_DETAIL =
  "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:$.informationNeeds[2]"
    + ".toolRequest.inputs.vespeneLimitNumerator:integer_too_large";
function capturedRound6FoundationOutput() {
  const base = foundationOutput();
  return {
    ...base,
    informationNeeds: [
      ...base.informationNeeds,
      { needId: "need-vespene-ratio", kind: "math",
        questionText: "vespene ceiling ratio against the full mineral budget",
        toolRequest: toolRequestWire({ mathKind: "budget_fit", inputs: {
          ...PLACEHOLDER_MATH_INPUTS,
          mineralBudget: 2000, mineralSpent: 1870, vespeneSpent: 115,
          vespeneLimitNumerator: 2000, vespeneLimitDenominator: 10 } }) },
    ],
  };
}
// Reproduce the saved failure byte-identically against the preserved round-6
// (contract set v1.0.0) bound: restoring the documented maximum of 1,000 on
// exactly the implicated field must yield exactly the saved issue at the
// saved path, formatted exactly as the runner records it.
const round6SavedBoundSchema = JSON.parse(JSON.stringify(
  foundationContract.providerSchema));
round6SavedBoundSchema.properties.informationNeeds.items.properties
  .toolRequest.properties.inputs.properties.vespeneLimitNumerator = {
  type: "integer", minimum: 0, maximum: 1_000 };
const round6SavedValidation = validateStarcraftTmgProviderJsonSchemaValueV1(
  round6SavedBoundSchema, capturedRound6FoundationOutput());
const round6SavedDetail = "ROSTER_STRATEGIST_STRUCTURED_OUTPUT_SCHEMA_INVALID:"
  + round6SavedValidation.issues.slice(0, 8)
    .map((issue) => `${issue.path}:${issue.code}`).join(",");
check(269, round6SavedValidation.ok === false
  && round6SavedValidation.issues.length === 1
  && round6SavedDetail === ROUND6_SAVED_FAILURE_DETAIL,
  "offline replay must reproduce the exact saved round-6 schema-bound "
    + "failure byte-identically "
    + "(OFFLINE_REPLAY_MATCHES_SAVED_ROUND6_FAILURE)");
// Post-repair acceptance (fail-first under the v1.0.0 bound): the identical
// captured shape must satisfy the repaired strict schema, and every superset
// math integer bound must be the domain-owned safe-integer rule clipped to
// the strict-subset ceiling — never a re-authored value-specific cap.
const round6RepairedValidation = validateStarcraftTmgProviderJsonSchemaValueV1(
  foundationContract.providerSchema, capturedRound6FoundationOutput());
const round6MathInputs = foundationContract.providerSchema.properties
  .informationNeeds.items.properties.toolRequest.properties.inputs.properties;
check(269, round6RepairedValidation.ok === true
  && ["mineralBudget", "mineralSpent", "vespeneSpent",
    "vespeneLimitNumerator", "vespeneLimitDenominator"].every((key) => (
    round6MathInputs[key].minimum === 0
      && round6MathInputs[key].maximum === 1_000_000_000))
  && round6MathInputs.planned.items.properties.plannedCumulativeVp.minimum === 0
  && round6MathInputs.planned.items.properties.plannedCumulativeVp.maximum
    === 1_000_000_000
  && round6MathInputs.projected.items.properties.cumulativeVp.minimum === 0
  && round6MathInputs.projected.items.properties.cumulativeVp.maximum
    === 1_000_000_000
  && round6MathInputs.values.items.minimum === -1_000_000_000
  && round6MathInputs.values.items.maximum === 1_000_000_000,
  "the captured round-6 shape must pass the repaired schema, whose superset "
    + "integer bounds are the domain safe-integer rules clipped to the "
    + "strict-subset ceiling (no value-specific cap)");
// The subset ceiling is the widest domain-faithful bound: the registry
// rejects any schema declaring a wider integer range, while the domain rules
// the bounds derive from accept any (non-negative/positive) safe integer.
let round6SubsetCeilingError = null;
try {
  assertStarcraftTmgProviderJsonSchemaSubsetV1({
    type: "object", additionalProperties: false,
    properties: { probe: { type: "integer", minimum: 0,
      maximum: 1_000_000_001 } },
    required: ["probe"] });
} catch (error) {
  round6SubsetCeilingError = error;
}
check(269, round6SubsetCeilingError !== null,
  "1,000,000,000 must be the strict subset's widest expressible integer "
    + "bound, so the repaired schema sits exactly on the domain ceiling");
// The domain computes the value the v1.0.0 schema rejected: the laboratory
// accepts the captured numerator directly with exact integer arithmetic.
const round6Lab = createLab("ticket27-s269-270-lab-round6");
const round6DomainMath = round6Lab.queryMath({ queryId: "mq-round6-vespene",
  mathKind: "budget_fit",
  inputs: { mineralBudget: 2000, mineralSpent: 1870, vespeneSpent: 115,
    vespeneLimitNumerator: 2000, vespeneLimitDenominator: 10 } });
check(270, verifyPregameLabMathReceiptV1(round6DomainMath) === true
  && round6DomainMath.result.vespeneLimit.numerator === 4_000_000
  && round6DomainMath.result.vespeneWithinLimit === true
  && round6DomainMath.result.exactIntegerArithmetic === true,
  "the laboratory domain must compute the value the v1.0.0 schema rejected");
// End-to-end: the captured round-6 foundation plans normally through the
// runtime — canonicalization forwards the domain-legal integer unchanged and
// the laboratory answers, proving only the generation schema was too tight.
const round6Session = await strategistA.planRoster(sessionInput, {
  deliberation: createMock({
    strategy_foundation: () => capturedRound6FoundationOutput() }) });
const round6NeedOutcome = round6Session.planningTrace[0]
  .informationNeedOutcomes.find((entry) => (
    entry.needId === "need-vespene-ratio"));
check(269, verifyRosterPlanRoundTripV1(round6Session.plan) === true
  && round6Session.plan.rosterCandidate.legalityStatus === "legal"
  && round6Session.planningTrace[0].informationNeedOutcomes.length === 3
  && round6NeedOutcome?.status === "answered",
  "the captured round-6 foundation must plan end-to-end: canonicalization "
    + "forwards the domain-legal integer and the laboratory answers");

// ------------------------------------- round-7 component identity drift
// Offline replay of the exact saved live round-7 failure
// (repair-round-7-report.json, failureDetail
// "ROSTER_STRATEGIST_COMPARISON_INVALID:faction_card_instance:mission_hold
// _position" — recorded without the line break): the model invented a
// semantic instanceId for the faction-card purpose instead of the
// runtime-owned deterministic identity. The strict subset cannot express
// per-value patterns, so the generation schema must publish the
// deterministic instance-identity convention in its field descriptions; the
// runtime's binding rule stays strict either way. 0 Provider calls.
function capturedRound7ComparisonOutput() {
  const base = comparisonOutput();
  return {
    ...base,
    componentPurposes: base.componentPurposes.map((purpose, index) => (
      index === 0 ? { ...purpose, instanceId: "mission_hold_position" }
        : purpose)),
  };
}
// The captured shape satisfies the wire schema (the subset cannot express
// the convention) and still fails closed at the runtime's strict binding,
// byte-identically to the saved report.
const comparisonContract = rosterStrategistRoundOutputContractV1(
  "comparison_selection");
const round7SchemaValidation = validateStarcraftTmgProviderJsonSchemaValueV1(
  comparisonContract.providerSchema, capturedRound7ComparisonOutput());
check(269, round7SchemaValidation.ok === true,
  "the captured round-7 drifted-instance shape is well-formed at the wire; "
    + "only the runtime's deterministic binding rule rejects it");
let round7ReplayError = null;
try {
  await strategistA.planRoster(sessionInput, {
    deliberation: createMock({
      comparison_selection: () => capturedRound7ComparisonOutput() }) });
} catch (error) {
  round7ReplayError = error;
}
check(269, String(round7ReplayError?.message || "")
    === "ROSTER_STRATEGIST_COMPARISON_INVALID:faction_card_instance:"
      + "mission_hold_position",
  "offline replay must reproduce the exact saved round-7 failure "
    + "byte-identically (OFFLINE_REPLAY_MATCHES_SAVED_ROUND7_FAILURE); the "
    + "runtime binding rule stays strict after the generation-side repair");
// Fail-first under the pre-repair schema: the comparison schema must publish
// the runtime-owned deterministic instance-identity convention for every
// component kind and for the activation order, so the wire contract itself
// documents the formats the subset cannot pattern-enforce.
const round7PurposeProps = comparisonContract.providerSchema.properties
  .componentPurposes.items.properties;
const round7ActivationProps = comparisonContract.providerSchema.properties
  .deploymentConcept.properties.activationOrder.items.properties;
check(269, String(round7PurposeProps.instanceId.description || "")
    .includes("<sideKey>-faction")
  && String(round7PurposeProps.instanceId.description || "")
    .includes("<sideKey>-tactical-<n>")
  && String(round7PurposeProps.instanceId.description || "")
    .includes("agent-unit-<n>")
  && String(round7PurposeProps.instanceId.description || "")
    .includes("-composition")
  && String(round7PurposeProps.instanceId.description || "")
    .includes("-upgrade-<n>")
  && String(round7ActivationProps.unitInstanceId.description || "")
    .includes("agent-unit-<n>"),
  "the comparison schema must publish the runtime-owned deterministic "
    + "instance-identity convention for every component kind and the "
    + "activation order (fail-first before the contract repair)");

check(269, bundle.bundleHash === bundleHashBefore
  && hashStarcraftTmgContract(authority.state)
    === labDescriptor.sourceStateHash,
  "source Room state and Builder bundle must be unchanged after planning");

const report = {
  schema: "ticket27_slices_269_270_roster_strategy_report_v1",
  ok: true,
  slice269: {
    strategistChecks: checks.slice269,
    runtimeDescriptorHash: strategistDescriptor.descriptorHash,
    skillRouteReceiptHash: route.receipt.receiptHash,
    skillRefs: route.skillRefs.map((entry) => ({
      role: entry.role, skillId: entry.skillId, version: entry.version,
      skillHash: entry.skillHash })),
    planHash: plan.planHash,
    revisedPlanHash: revised.plan.planHash,
    sessionReceiptHash: result.sessionReceipt.receiptHash,
    finalAuditResultHash: result.finalVerdict.auditResultHash,
    selectedCandidateId: plan.rosterCandidate.candidateId,
    mineralSpent: result.finalVerdict.summary.mineralSpent,
    vespeneSpent: result.finalVerdict.summary.vespeneSpent,
    deliberationRounds: result.planningTrace.map((entry) => entry.roundKind),
    toolReceiptKinds: plan.toolReceiptReferences.map((entry) => entry.receiptKind),
    rejectionRulesErrorCodes: result.rejections.map((entry) => (
      entry.rulesErrorCode || entry.portErrorCode)),
    determinismIdenticalPlanHash: resultB.plan.planHash === plan.planHash,
    outputNormalizationAliasRegistryVersion:
      ROSTER_STRATEGIST_OUTPUT_ALIAS_REGISTRY_V1.version,
    outputContractSetHash:
      ROSTER_STRATEGIST_OUTPUT_CONTRACT_SET_V1.contractSetHash,
    structuredGenerationEnforced: true,
    round5OfflineReplayFailureDetail: String(round5ReplayError?.message || ""),
    round6OfflineReplayFailureDetail: round6SavedDetail,
    round7OfflineReplayFailureDetail: String(round7ReplayError?.message || ""),
    hiddenChainOfThoughtIncluded: false,
    hostPreferenceWeights: false,
  },
  slice270: {
    laboratoryChecks: checks.slice270,
    laboratoryDescriptorHash: labDescriptor.descriptorHash,
    sourceStateHash: labDescriptor.sourceStateHash,
    builderBundleHash: bundle.bundleHash,
    branchAStateHash: branchA.branchStateHash,
    branchBStateHash: branchB.branchStateHash,
    spatialDistanceMilliInchesAB: [
      edgeA.nearestPhysicalEdges.distanceMilliInches,
      edgeB.nearestPhysicalEdges.distanceMilliInches],
    probabilityEstimateHash: probabilityA.estimate.estimateHash,
    threatExchangeEstimateHash: threatExchangeA.exchange.estimateHash,
    sameStateABReceiptHash: abReceipt.receiptHash,
    mutationZeroProofHash: mutationProof.receiptHash,
    sourceStateMutationCount: mutationProof.sourceStateMutationCount,
    unknownNotZero: true,
  },
  providerCalls: 0,
  paidCostCny: 0,
  trainingTruth: false,
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
