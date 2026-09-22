#!/usr/bin/env node

import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import {
  buildOfficialRoomArmyAuditV1,
  OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,
} from "../packages/product-composition/official-standard-room-factory-v1.mjs";
import {
  ARMY_BUILDER_CHOICE_ENUMERATION_RECEIPT_SCHEMA,
  ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA,
  ARMY_BUILDER_ROSTER_VERDICT_SCHEMA,
  classifyArmyBuilderRulesErrorV1,
  createOfficialArmyBuilderQueryPortV1,
  verifyArmyBuilderRejectionReceiptV1,
  verifyArmyBuilderRosterVerdictV1,
  verifyOfficialArmyBuilderQueryPortDescriptorV1,
} from "../packages/roster-strategist/army-builder-query-port-v1.mjs";
import {
  createOpponentArchetypeHypothesisV1,
  createPresetRosterNoPregamePlanV1,
  createRosterCandidateComparisonV1,
  createRosterCandidateV1,
  createRosterComponentPurposeV1,
  createRosterCounterResponseV1,
  createRosterDeploymentConceptV1,
  createRosterInvalidationTriggerV1,
  createRosterLossResourceBudgetV1,
  createRosterPlanProvenanceV1,
  createRosterPlanRevisionEventV1,
  createRosterPlanV1,
  createRosterScoreRouteV1,
  createRosterToolReceiptReferenceV1,
  parseRosterPlanV1,
  serializeRosterPlanV1,
  verifyRosterPlanRoundTripV1,
  verifyRosterPlanV1,
} from "../packages/roster-strategist/roster-plan-contracts-v1.mjs";
import { createOfficialUnitCompositionUpgradeDataBundleV1 } from
  "../packages/source-data/official-unit-composition-upgrade-data-bundle-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SIDE_KEYS = ["player1", "player2"];
const checks = { slice267: 0, slice268: 0 };
function check(slice, condition, label) {
  assert(condition, label);
  checks[`slice${slice}`] += 1;
}
function expectContractFailure(slice, thunk, codePrefix, label) {
  let caught = null;
  try {
    thunk();
  } catch (error) {
    caught = error;
  }
  check(slice, Boolean(caught), `${label}: must throw`);
  check(slice, String(caught?.message || "").startsWith(`${codePrefix}`),
    `${label}: expected ${codePrefix}, got ${caught?.message}`);
}

const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: ROOT });
const bundle = createOfficialUnitCompositionUpgradeDataBundleV1({
  dataset: source.dataset });
const armyBundle = bundle.armyResourceBudgetDataBundle;
const factionBundle = armyBundle.factionArmyEligibilityDataBundle;
const bundleHashBefore = bundle.bundleHash;
check(268, Object.isFrozen(bundle), "official data bundle must be deep-frozen");

// ---------------------------------------------------------------- Slice 267
const rosterHashBySide = {};
const auditResultHashBySide = {};
for (const sideKey of SIDE_KEYS) {
  const audit = buildOfficialRoomArmyAuditV1(bundle, sideKey,
    OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1[sideKey]);
  auditResultHashBySide[sideKey] = audit.resultHash;
  rosterHashBySide[sideKey] = hashStarcraftTmgContract({
    sideKey, recipe: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1[sideKey] });
}

const presetPlans = Object.fromEntries(SIDE_KEYS.map((sideKey) => [
  sideKey,
  createPresetRosterNoPregamePlanV1({
    planId: `preset-standard-2000-${sideKey}-v1`, sideKey,
    presetBinding: { rosterHash: rosterHashBySide[sideKey],
      armyAuditResultHash: auditResultHashBySide[sideKey],
      presetSource: "fixed_standard_2000_recipe" },
  }),
]));
for (const sideKey of SIDE_KEYS) {
  const plan = presetPlans[sideKey];
  check(267, plan.planStatus === "no_pregame_plan" && plan.presetRoster === true
    && plan.planFabricated === false && plan.hiddenChainOfThoughtIncluded === false,
    "preset plan must be explicitly no_pregame_plan without fabrication");
  check(267, plan.scoreRoute === null && plan.lossResourceBudget === null
    && plan.deploymentConcept === null && plan.rosterCandidate === null
    && plan.componentPurposes.length === 0 && plan.opponentHypotheses.length === 0
    && plan.counterResponses.length === 0 && plan.invalidationTriggers.length === 0
    && plan.revisions.length === 0 && plan.comparisons.length === 0
    && plan.toolReceiptReferences.length === 0 && plan.publicSummaryText === null,
    "preset plan must carry no fabricated strategy content");
  check(267, verifyRosterPlanRoundTripV1(plan) === true,
    "preset plan JSON round-trip must be lossless and hash-stable");
  const tampered = JSON.parse(serializeRosterPlanV1(plan));
  tampered.publicSummaryText = "a fabricated strategy summary";
  expectContractFailure(267, () => verifyRosterPlanV1(tampered),
    "ROSTER_PLAN_INVALID", "tampered preset plan");
}
expectContractFailure(267, () => createRosterPlanV1({
  planId: "fabricated-preset", planVersion: 1, planStatus: "no_pregame_plan",
  sideKey: "player1",
  presetBinding: { rosterHash: rosterHashBySide.player1,
    presetSource: "fixed_standard_2000_recipe" },
  scoreRoute: createRosterScoreRouteV1({ routeKind: "unknown",
    routeText: "invented", scheduleStatus: "unknown" }),
}), "ROSTER_PLAN_PRESET_CONTENT_FORBIDDEN",
  "preset roster with fabricated score route");
expectContractFailure(267, () => createPresetRosterNoPregamePlanV1({
  planId: "hidden-cot", sideKey: "player1",
  presetBinding: { rosterHash: rosterHashBySide.player1,
    presetSource: "fixed_standard_2000_recipe" },
  hiddenChainOfThoughtIncluded: true,
}), "ROSTER_PLAN_FABRICATION_FORBIDDEN", "hidden chain-of-thought flag");

const provenance = createRosterPlanProvenanceV1({
  sourceLockHash: bundle.sourceLockHash,
  sourceSnapshotHash: bundle.sourceSnapshotHash,
  normalizedDatasetHash: bundle.normalizedDatasetHash,
  officialRulesVersion: bundle.officialRulesVersion,
  officialUnitsVersion: bundle.officialUnitsVersion,
  officialCardsVersion: bundle.officialCardsVersion,
  unitCompositionUpgradeDataBundleHash: bundle.bundleHash,
  armyResourceBudgetDataBundleHash: armyBundle.bundleHash,
  factionArmyEligibilityDataBundleHash: factionBundle.bundleHash,
  engagementScale: "Standard",
  missionBinding: { status: "frozen",
    missionRecordKey: "faction_cards:mission_hold_position",
    deploymentRecordKey: "faction_cards:2NdngLtIeZAprsWr25hM",
    mapTopologyHash: hashStarcraftTmgContract("standard-2000-balanced-terrain-v1") },
  opponentInformationBoundary: "open_roster",
  skillVersions: [], modelVersion: "unknown", promptVersion: "unknown",
});
check(267, provenance.modelVersion === "unknown"
  && provenance.promptVersion === "unknown",
  "provenance must preserve unknown model/prompt versions");

const legalCandidate = createRosterCandidateV1({
  candidateId: "player1-fixed-roster", sideKey: "player1",
  factionRecordKey: "tactical_cards:terran_armed_forces", scaleId: "Standard",
  mineralBudget: 2000,
  tacticalCardRecordKeys:
    [...OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player1.tacticalCardRecordKeys],
  units: OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player1.units.map((unit) => ({
    unitInstanceId: unit.unitInstanceId, recordKey: unit.recordKey,
    compositionKind: unit.compositionKind,
    upgradeSelections: unit.upgradeNames.map((upgradeName) => ({ upgradeName })),
  })),
  legalityStatus: "legal",
  legalityReceipt: { auditResultHash: auditResultHashBySide.player1 },
});
const illegalCandidate = createRosterCandidateV1({
  candidateId: "player1-overbudget-alternative", sideKey: "player1",
  factionRecordKey: "tactical_cards:terran_armed_forces", scaleId: "Standard",
  mineralBudget: 2000,
  tacticalCardRecordKeys: [],
  units: [{ unitInstanceId: "alt-marine", recordKey: "army_units:marine",
    compositionKind: "large", upgradeSelections: [] }],
  legalityStatus: "illegal",
  legalityReceipt: { rejectionReceiptHash: hashStarcraftTmgContract("rejection-1"),
    rulesErrorCode: "ARMY_MINERAL_BUDGET_EXCEEDED", rejectionKind: "resource_budget" },
});
const unknownCandidate = createRosterCandidateV1({
  candidateId: "player1-unevaluated-alternative", sideKey: "player1",
  factionRecordKey: "tactical_cards:terran_armed_forces", scaleId: "Standard",
  mineralBudget: 2000, tacticalCardRecordKeys: [],
  units: [{ unitInstanceId: "alt-goliath", recordKey: "army_units:goliath",
    compositionKind: "small", upgradeSelections: [] }],
  legalityStatus: "unknown",
});
check(267, unknownCandidate.legalityReceipt === null,
  "unknown legality must not carry a fabricated receipt");
expectContractFailure(267, () => createRosterCandidateV1({
  candidateId: "bad", sideKey: "player1",
  factionRecordKey: "tactical_cards:terran_armed_forces", scaleId: "Standard",
  mineralBudget: 2000, tacticalCardRecordKeys: [],
  units: [{ unitInstanceId: "alt", recordKey: "army_units:marine",
    compositionKind: "small", upgradeSelections: [] }],
  legalityStatus: "unknown",
  legalityReceipt: { auditResultHash: hashStarcraftTmgContract("fake") },
}), "ROSTER_CANDIDATE_LEGALITY_INVALID", "unknown legality with receipt");

const toolReceipts = [
  createRosterToolReceiptReferenceV1({ referenceId: "receipt-probability-1",
    receiptKind: "probability", status: "attached",
    receiptHash: hashStarcraftTmgContract("marine-vs-zergling-hit-estimate"),
    toolId: "combat-estimation-runtime-v1",
    querySummaryText: "Marine stationary fire into Swarmling hit probability" }),
  createRosterToolReceiptReferenceV1({ referenceId: "receipt-simulation-1",
    receiptKind: "simulation", status: "unknown" }),
];
check(267, toolReceipts[1].receiptHash === null
  && toolReceipts[1].unknownNotZero === true,
  "unknown simulation receipt must stay unknown, not zeroed");
expectContractFailure(267, () => createRosterToolReceiptReferenceV1({
  referenceId: "bad-receipt", receiptKind: "spatial", status: "unknown",
  receiptHash: hashStarcraftTmgContract("fabricated"),
}), "ROSTER_PLAN_TOOL_RECEIPT_REFERENCE_INVALID",
  "unknown receipt carrying a hash");

const hypothesis = createOpponentArchetypeHypothesisV1({
  hypothesisId: "hyp-zerg-rush", archetypeLabel: "zerg_early_pressure",
  hypothesisText: "Kerrigan's Swarm pressures markers with cheap Zergling units",
  confidence: "medium",
  expectedCounterTexts: ["early Swarmling/Raptor marker races"],
  ownCounterResponseIds: ["rsp-hold-center"],
  falsificationText: "opponent opens with zero Zergling units",
});
const counterResponse = createRosterCounterResponseV1({
  responseId: "rsp-hold-center", triggerText: "early Zergling marker pressure",
  responseText: "hold large Marine units on central high ground",
  linkedHypothesisIds: ["hyp-zerg-rush"],
});
const invalidationTrigger = createRosterInvalidationTriggerV1({
  triggerId: "trg-vp-deficit", observationKind: "vp_deficit",
  triggerText: "two or more VP behind the declared schedule after round 2",
  revisionRequiredText: "re-route to attrition scoring",
});
const comparison = createRosterCandidateComparisonV1({
  comparisonId: "cmp-fixed-vs-overbudget",
  candidateHashes: [legalCandidate.candidateHash, illegalCandidate.candidateHash],
  basisTexts: ["Rules legality", "projected central marker control"],
  tradeoffTexts: ["the over-budget alternative is Rules-illegal and discarded"],
  selectionStatus: "selected", selectedCandidateHash: legalCandidate.candidateHash,
  receiptReferenceIds: ["receipt-probability-1"],
});
const planV1 = createRosterPlanV1({
  planId: "agent-plan-player1", planVersion: 1, planStatus: "active",
  sideKey: "player1", provenance, rosterCandidate: legalCandidate,
  scoreRoute: createRosterScoreRouteV1({
    routeKind: "mission_marker_control",
    routeText: "win marker control windows with Marine blocks",
    scheduleStatus: "declared",
    targetVpSchedule: [{ window: "round:2", plannedCumulativeVp: 2 },
      { window: "round:4", plannedCumulativeVp: 5 }],
  }),
  lossResourceBudget: createRosterLossResourceBudgetV1({
    lossBudgetStatus: "unknown",
    mineralSpendIntent: { status: "declared", mineralBudget: 2000,
      plannedMineralSpend: 2000 },
  }),
  componentPurposes: [
    createRosterComponentPurposeV1({ componentKind: "unit",
      recordKey: "army_units:marine", instanceId: "player1-marine-1",
      publicPurposeText: "central marker holder", scoringRole: "primary_scorer" }),
    createRosterComponentPurposeV1({ componentKind: "upgrade",
      recordKey: "army_units:marine", instanceId: "player1-marine-1-upgrade-1",
      publicPurposeText: "AGG-12 Specialist extends anti-air reach",
      scoringRole: "counter" }),
  ],
  deploymentConcept: createRosterDeploymentConceptV1({
    deploymentConceptText: "Marines deploy central, Goliaths flank",
    activationOrderStatus: "declared",
    activationOrder: [
      { ordinal: 1, unitInstanceId: "player1-marine-1", phase: "movement" },
      { ordinal: 2, unitInstanceId: "player1-goliath-1", phase: "assault" },
    ],
    reinforcementPolicyText: "reserve Goliath enters round 2 at own edge",
  }),
  opponentHypotheses: [hypothesis], counterResponses: [counterResponse],
  invalidationTriggers: [invalidationTrigger], comparisons: [comparison],
  toolReceiptReferences: toolReceipts,
  publicSummaryText: "central marker-control plan for the fixed Terran roster",
});
check(267, verifyRosterPlanRoundTripV1(planV1) === true,
  "full RosterPlan v1 round-trip must be lossless and hash-stable");
const restoredV1 = parseRosterPlanV1(serializeRosterPlanV1(planV1));
check(267, isDeepStrictEqual(restoredV1, planV1),
  "serialized/parsed RosterPlan must deep-equal the original");

const revision = createRosterPlanRevisionEventV1({
  revisionId: "rev-1", planId: planV1.planId, fromPlanVersion: 1, toPlanVersion: 2,
  previousPlanHash: planV1.planHash, reasonText: "declared VP schedule missed",
  triggerIds: ["trg-vp-deficit"], revisedSectionKeys: ["scoreRoute"],
});
const planV2 = createRosterPlanV1({
  planId: planV1.planId, planVersion: 2, planStatus: "revised",
  sideKey: "player1", provenance, rosterCandidate: legalCandidate,
  scoreRoute: planV1.scoreRoute, invalidationTriggers: [invalidationTrigger],
  revisions: [revision], publicSummaryText: "revised after VP deficit",
});
check(267, verifyRosterPlanRoundTripV1(planV2) === true
  && planV2.revisions[0].previousPlanHash === planV1.planHash,
  "revision event must hash-bind the previous plan version");
expectContractFailure(267, () => createRosterPlanV1({
  planId: planV1.planId, planVersion: 2, planStatus: "revised",
  sideKey: "player1", provenance, rosterCandidate: legalCandidate,
  publicSummaryText: "revised without an event",
}), "ROSTER_PLAN_REVISION_INVALID", "revised status without revision event");
expectContractFailure(267, () => createRosterPlanV1({
  planId: "illegal-active", planVersion: 1, planStatus: "active",
  sideKey: "player1", provenance, rosterCandidate: illegalCandidate,
  publicSummaryText: "illegal roster activated",
}), "ROSTER_PLAN_LEGALITY_REQUIRED", "active plan over illegal candidate");
expectContractFailure(267, () => createRosterScoreRouteV1({
  routeKind: "unknown", routeText: "unknown route", scheduleStatus: "unknown",
  targetVpSchedule: [{ window: "round:1", plannedCumulativeVp: 0 }],
}), "ROSTER_PLAN_SCORE_ROUTE_SCHEDULE_INVALID",
  "unknown VP schedule carrying declared entries");
expectContractFailure(267, () => createRosterCounterResponseV1({
  responseId: "rsp-orphan", triggerText: "t", responseText: "r",
  linkedHypothesisIds: ["hyp-missing"],
}) && createRosterPlanV1({
  planId: "orphan-link", planVersion: 1, planStatus: "active",
  sideKey: "player1", provenance, rosterCandidate: legalCandidate,
  counterResponses: [createRosterCounterResponseV1({
    responseId: "rsp-orphan", triggerText: "t", responseText: "r",
    linkedHypothesisIds: ["hyp-missing"] })],
  publicSummaryText: "orphan link",
}), "ROSTER_PLAN_COUNTER_RESPONSE_LINK_UNKNOWN",
  "counter-response linked to an unknown hypothesis");

// ---------------------------------------------------------------- Slice 268
const port = createOfficialArmyBuilderQueryPortV1({
  unitCompositionUpgradeDataBundle: bundle });
const descriptor = port.portDescriptor();
check(268, verifyOfficialArmyBuilderQueryPortDescriptorV1(descriptor) === true
  && descriptor.readOnly === true && descriptor.reimplementsRules === false
  && descriptor.providerCalls === 0,
  "port descriptor must prove read-only Rules delegation");
check(268, descriptor.unitCompositionUpgradeDataBundleHash === bundle.bundleHash
  && descriptor.armyResourceBudgetDataBundleHash === armyBundle.bundleHash
  && descriptor.factionArmyEligibilityDataBundleHash === factionBundle.bundleHash,
  "port descriptor must be hash-bound to the official bundles");
check(268, typeof port.applyRosterCandidate === "undefined"
  && typeof port.mutate === "undefined" && typeof port.preview === "undefined",
  "port must expose no mutation surface");

const scaleCatalogue = port.listEngagementScales();
check(268, scaleCatalogue.schema
  === "starcraft_tmg_army_builder_scale_catalogue_receipt_v1"
  && scaleCatalogue.scaleCount === 3
  && scaleCatalogue.scales.find((entry) => entry.scaleId === "Standard")
    ?.mineralLimit.maximumInclusive === 2000,
  "scale catalogue must mirror the official engagement scales");
const factionCatalogue = port.listFactionChoices();
check(268, factionCatalogue.factionCount === 6
  && factionCatalogue.factions.some((entry) => (
    entry.recordKey === "tactical_cards:terran_armed_forces"))
  && factionCatalogue.factions.some((entry) => (
    entry.recordKey === "tactical_cards:kerrigan_s_swarm")),
  "faction catalogue must mirror the six official factions");

const enumerationReceipts = {};
for (const [sideKey, factionRecordKey] of [
  ["player1", "tactical_cards:terran_armed_forces"],
  ["player2", "tactical_cards:kerrigan_s_swarm"],
]) {
  const receipt = port.enumerateArmyBuildingChoices({
    factionRecordKey, scaleId: "Standard", mineralBudget: 2000 });
  check(268, receipt.schema === ARMY_BUILDER_CHOICE_ENUMERATION_RECEIPT_SCHEMA
    && receipt.bounds.truncated === false && receipt.providerCalls === 0,
    `enumeration receipt must be bounded and typed for ${sideKey}`);
  const eligibleRows = factionBundle.eligibilityMatrix.filter((entry) => (
    entry.factionRecordKey === factionRecordKey && entry.eligible));
  check(268, receipt.denominators.eligibleTacticalCount
    + receipt.denominators.eligibleUnitCount === eligibleRows.length,
    `enumeration denominator must match the official eligibility matrix for ${sideKey}`);
  check(268, receipt.vespeneLimitForBudget.numerator === 2000
    && receipt.vespeneLimitForBudget.denominator === 10,
    `Standard-2000 vespene limit must be the exact official rational for ${sideKey}`);
  enumerationReceipts[sideKey] = receipt;
}
check(268, enumerationReceipts.player1.denominators.specialistUpgradeCount === 2
  && enumerationReceipts.player1.unitCandidates
    .find((entry) => entry.recordKey === "army_units:marine")
    ?.purchasableUpgrades.filter((entry) => entry.specialistAssignmentRequired)
    .length === 2,
  "both official Specialist upgrades must surface on Marine");

function candidateFromRecipe(sideKey, recipe) {
  return { candidateId: `${sideKey}-fixed-standard-2000`, sideKey,
    scaleId: "Standard", mineralBudget: 2000,
    factionRecordKey: recipe.factionRecordKey,
    tacticalCardRecordKeys: [...recipe.tacticalCardRecordKeys],
    units: recipe.units.map((unit) => ({
      unitInstanceId: unit.unitInstanceId, recordKey: unit.recordKey,
      compositionKind: unit.compositionKind,
      upgrades: unit.upgradeNames.map((upgradeName) => ({ upgradeName })),
    })) };
}

const parityVerdictHashes = {};
for (const sideKey of SIDE_KEYS) {
  const recipe = OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1[sideKey];
  const reference = buildOfficialRoomArmyAuditV1(bundle, sideKey, recipe);
  const candidate = candidateFromRecipe(sideKey, recipe);
  const candidateSnapshot = structuredClone(candidate);
  const verdict = port.evaluateRosterCandidate(candidate);
  check(268, verdict.schema === ARMY_BUILDER_ROSTER_VERDICT_SCHEMA
    && verdict.status === "legal"
    && verifyArmyBuilderRosterVerdictV1(verdict) === true,
    `fixed ${sideKey} roster must be Rules-legal through the port`);
  check(268, verdict.auditResultHash === reference.resultHash
    && isDeepStrictEqual(verdict.audit, reference),
    `port audit must be exactly parity-equal to the room-factory audit for ${sideKey}`);
  check(268, verdict.summary.mineralSpent === 2000
    && verdict.summary.vespeneSpent <= 200,
    `fixed ${sideKey} roster spends exactly 2000 minerals within vespene ratio`);
  check(268, isDeepStrictEqual(candidate, candidateSnapshot),
    `evaluation must not mutate the candidate for ${sideKey}`);
  parityVerdictHashes[sideKey] = verdict.verdictHash;
}

const goliathSmallProfileId = bundle.unitCompositionProfiles
  .find((entry) => entry.recordKey === "army_units:goliath")
  .compositionOptions.find((entry) => entry.compositionKind === "small")
  .compositionProfileId;
const hydraliskUpgradeProfileId = bundle.purchasableUpgradeProfiles
  .find((entry) => entry.recordKey === "army_units:hydralisk")
  .purchasableUpgradeProfileId;
const specialistProfiles = bundle.purchasableUpgradeProfiles
  .filter((entry) => entry.specialistAssignmentRequired);
assert.equal(specialistProfiles.length, 2, "exactly two Specialist upgrades");

function recipeMutation(sideKey, mutate) {
  const candidate = candidateFromRecipe(sideKey,
    OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1[sideKey]);
  mutate(candidate);
  return candidate;
}

const counterexamples = [
  { name: "wrong_faction",
    candidate: recipeMutation("player1", (candidate) => {
      candidate.factionRecordKey = "tactical_cards:kerrigan_s_swarm";
    }),
    status: "illegal", rejectionKind: "faction_eligibility",
    rulesErrorCode: "FACTION_TAG_MISMATCH" },
  { name: "over_budget_minerals",
    candidate: recipeMutation("player1", (candidate) => {
      candidate.mineralBudget = 1900;
    }),
    status: "illegal", rejectionKind: "resource_budget",
    rulesErrorCode: "ARMY_MINERAL_BUDGET_EXCEEDED" },
  { name: "budget_exceeds_scale",
    candidate: recipeMutation("player1", (candidate) => {
      candidate.scaleId = "Skirmish";
    }),
    status: "illegal", rejectionKind: "resource_budget",
    rulesErrorCode: "ARMY_MINERAL_BUDGET_EXCEEDS_SCALE" },
  { name: "foreign_composition_profile",
    candidate: recipeMutation("player1", (candidate) => {
      const marine = candidate.units[0];
      delete marine.compositionKind;
      marine.compositionProfileId = goliathSmallProfileId;
      marine.startingModelIds = [`${marine.unitInstanceId}-model-1`];
      marine.upgrades = [];
    }),
    status: "illegal", rejectionKind: "unit_composition",
    rulesErrorCode: "UNIT_COMPOSITION_SOURCE_PROFILE_INVALID" },
  { name: "unlisted_model_count",
    candidate: recipeMutation("player1", (candidate) => {
      candidate.units[0].startingModelIds = ["player1-marine-1-model-1"];
      candidate.units[0].upgrades = [];
    }),
    status: "illegal", rejectionKind: "unit_composition",
    rulesErrorCode: "UNIT_COMPOSITION_STARTING_MODEL_SET_INVALID" },
  { name: "unknown_upgrade_profile",
    candidate: recipeMutation("player1", (candidate) => {
      candidate.units[0].upgrades = [
        { purchasableUpgradeProfileId: "army_units:marine:purchasable:99" }];
    }),
    status: "illegal", rejectionKind: "unit_upgrade",
    rulesErrorCode: "PURCHASABLE_UPGRADE_PROFILE_REQUIRED" },
  { name: "cross_unit_upgrade_profile",
    candidate: recipeMutation("player1", (candidate) => {
      candidate.units[0].upgrades = [
        { purchasableUpgradeProfileId: hydraliskUpgradeProfileId }];
    }),
    status: "illegal", rejectionKind: "unit_upgrade",
    rulesErrorCode: "UNIT_PURCHASABLE_UPGRADE_SOURCE_PROFILE_INVALID" },
  { name: "specialist_nomination_missing",
    candidate: recipeMutation("player1", (candidate) => {
      candidate.units[0].upgrades = [
        { upgradeName: specialistProfiles[0].upgradeName, nominatedModelId: null }];
    }),
    status: "illegal", rejectionKind: "specialist_assignment",
    rulesErrorCode: "UNIT_SPECIALIST_MODEL_REQUIRED" },
  { name: "specialist_foreign_model",
    candidate: recipeMutation("player1", (candidate) => {
      candidate.units[0].upgrades = [
        { upgradeName: specialistProfiles[0].upgradeName,
          nominatedModelId: "player1-goliath-1-model-1" }];
    }),
    status: "illegal", rejectionKind: "specialist_assignment",
    rulesErrorCode: "UNIT_SPECIALIST_MODEL_NOT_IN_UNIT" },
  { name: "specialist_model_reused",
    candidate: recipeMutation("player1", (candidate) => {
      candidate.units[0].upgrades = specialistProfiles.map((profile) => ({
        upgradeName: profile.upgradeName,
        nominatedModelId: "player1-marine-1-model-1",
      }));
    }),
    status: "illegal", rejectionKind: "specialist_assignment",
    rulesErrorCode: "UNIT_SPECIALIST_MODEL_REUSED" },
  { name: "unknown_unit_addressing",
    candidate: recipeMutation("player1", (candidate) => {
      candidate.units[0].recordKey = "army_units:does_not_exist";
    }),
    status: "invalid_candidate", rejectionKind: "candidate_addressing",
    rulesErrorCode: null, portErrorCode: "ARMY_BUILDER_CANDIDATE_UNIT_UNKNOWN" },
];

const rejectionReceiptHashes = {};
for (const example of counterexamples) {
  const receipt = port.evaluateRosterCandidate(example.candidate);
  check(268, receipt.schema === ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA
    && verifyArmyBuilderRejectionReceiptV1(receipt) === true
    && Object.isFrozen(receipt),
    `${example.name}: rejection receipt must be typed, immutable and hash-bound`);
  check(268, receipt.status === example.status
    && receipt.rejectionKind === example.rejectionKind
    && receipt.rulesErrorCode === example.rulesErrorCode
    && (example.portErrorCode === undefined
      || receipt.portErrorCode === example.portErrorCode),
    `${example.name}: expected ${example.rulesErrorCode || example.portErrorCode}, `
      + `got ${receipt.rulesErrorCode || receipt.portErrorCode}`);
  check(268, receipt.silentRepairAttempted === false
    && receipt.fallbackApplied === false
    && receipt.sourceRefreshPerformed === false && receipt.providerCalls === 0,
    `${example.name}: no silent repair, fallback, refresh or Provider call`);
  rejectionReceiptHashes[example.name] = receipt.receiptHash;
}

const unknownClassification = classifyArmyBuilderRulesErrorV1(
  "FUTURE_UNRECOGNIZED_RULES_CODE");
check(268, unknownClassification.status === "unknown"
  && unknownClassification.rejectionKind === "unknown_rules_outcome",
  "unrecognized Rules outcomes must stay unknown, never guessed");

check(268, bundle.bundleHash === bundleHashBefore && Object.isFrozen(bundle),
  "official data bundle must be unchanged after all port operations");

process.stdout.write(`${JSON.stringify({
  schema: "ticket27_slices_267_268_roster_foundation_report_v1",
  ok: true,
  slice267: {
    contractChecks: checks.slice267,
    presetPlanStatus: "no_pregame_plan",
    presetPlanHashBySide: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
      sideKey, presetPlans[sideKey].planHash])),
    examplePlanV1Hash: planV1.planHash,
    examplePlanV2Hash: planV2.planHash,
    roundTripLossless: true,
    hiddenChainOfThoughtIncluded: false,
  },
  slice268: {
    portChecks: checks.slice268,
    portDescriptorHash: descriptor.descriptorHash,
    unitCompositionUpgradeDataBundleHash: bundle.bundleHash,
    paritySides: SIDE_KEYS,
    parityAuditResultHashBySide: auditResultHashBySide,
    parityVerdictHashBySide: parityVerdictHashes,
    enumerationDenominators: Object.fromEntries(SIDE_KEYS.map((sideKey) => [
      sideKey, enumerationReceipts[sideKey].denominators])),
    counterexampleCount: counterexamples.length,
    counterexamples: counterexamples.map((entry) => entry.name),
    rejectionReceiptHashes,
    unknownStaysUnknown: true,
    silentRepairOrFallback: false,
  },
  providerCalls: 0,
  paidCostCny: 0,
  trainingTruth: false,
}, null, 2)}\n`);
