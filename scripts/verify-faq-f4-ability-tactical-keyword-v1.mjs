#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_FAQ_F4_ATOM_BINDING_V1 } from
  "../content/official-faq-f4-ability-tactical-keyword-binding-v1.mjs";
import { evaluateOfficialFaqF4RuleV1 } from
  "../packages/rule-atoms/official-faq-f4-ability-tactical-keyword-kernel-v1.mjs";
import {
  createOfficialFaqF4ReleaseV1,
  verifyOfficialFaqF4ReleaseV1,
} from "../packages/rule-atoms/official-faq-f4-ability-tactical-keyword-release-v1.mjs";
import { createOfficialFaqF3ReleaseV1 } from
  "../packages/rule-atoms/official-faq-f3-movement-battlefield-deployment-release-v1.mjs";
import { createOfficialFaqV1RuleReconciliationV1 } from
  "../packages/rule-atoms/official-faq-v1-rule-reconciliation-v1.mjs";
import { createOfficialFaqV1SourceLockV1 } from
  "../packages/source-data/official-faq-v1-source-lock-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIR = path.join(ROOT, "build/source-intake/official-rules/faq-v1-2026-09-03");
const OUTPUT_DIR = path.join(ROOT, "build/faq-v1-rules-refresh");
const [pdfBytes, rawText, downloadsHtml, baseReportBytes] = await Promise.all([
  readFile(path.join(SOURCE_DIR, "StarCraft-TMG-FAQ_EN.pdf")),
  readFile(path.join(SOURCE_DIR, "StarCraft-TMG-FAQ_EN.raw.txt")),
  readFile(path.join(SOURCE_DIR, "downloads.html")),
  readFile(path.join(ROOT,
    "build/ticket-11-rule-atoms-v1/official-dispute-resolution-rules-rule-slice-v1-report.json")),
]);
const sourceLock = createOfficialFaqV1SourceLockV1({ pdfBytes, rawText, downloadsHtml });
const baseReport = JSON.parse(baseReportBytes);
const reconciliation = createOfficialFaqV1RuleReconciliationV1({
  sourceLock,
  currentCatalogue: baseReport.slice.catalogue,
  currentGraph: baseReport.graph,
  currentRuntimeHash: baseReport.runtimeHash,
});
const sharedInput = {
  sourceLock,
  reconciliation,
  baseCatalogue: baseReport.slice.catalogue,
  baseGraph: baseReport.graph,
  baseRuntimeHash: baseReport.runtimeHash,
};
const f3Release = createOfficialFaqF3ReleaseV1(sharedInput);
const releaseInput = { ...sharedInput, f3Release };
const release = createOfficialFaqF4ReleaseV1(releaseInput);
const acceptance = [];
function accept(description, check) {
  check();
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${description}`);
}
function positive(entryId, input) {
  const result = evaluateOfficialFaqF4RuleV1(entryId, input);
  assert.equal(result.entryId, entryId);
  assert.equal(result.legal, true);
  assert.equal(result.rulesAuthority, true);
  assert.equal(result.trainingTruth, false);
  return result;
}
function negative(entryId, input, code) {
  const result = evaluateOfficialFaqF4RuleV1(entryId, input);
  assert.equal(result.entryId, entryId);
  assert.equal(result.legal, false);
  assert(result.reasonCodes.includes(code));
  return result;
}

accept("f4_exactly_owns_27_reconciled_entries", () => {
  assert.deepEqual(release.entryIds, [
    ...Array.from({ length: 26 }, (_, index) => `faq-v1:${String(index + 34).padStart(2, "0")}`),
    "faq-v1:64",
  ]);
  assert.equal(release.entryCount, 27);
});
accept("f4_has_57_atomic_rules_and_cumulative_f3_f4_denominator_97", () => {
  assert.equal(release.atomCount, 57);
  assert.equal(release.executableAtomCount, 57);
  assert.equal(release.cumulativeFaqEntryCount, 50);
  assert.equal(release.cumulativeFaqAtomCount, 97);
  assert.equal(new Set(release.atoms.map((atom) => atom.atomId)).size, 57);
  assert.equal(release.behaviorKeys.length, 27);
});
accept("f4_graph_covers_every_entry_atom_behavior_and_state_contract", () => {
  assert.equal(release.graph.nodes.length, 233);
  assert.equal(release.graph.edges.length, 367);
  const edges = new Set(release.graph.edges.map((edge) => (
    `${edge.from}|${edge.relationship}|${edge.to}`
  )));
  for (const atom of release.atoms) {
    const atomNode = `rule_atom:${atom.atomId}`;
    assert(edges.has(`faq_source_entry:${atom.entryId}|defines|${atomNode}`));
    assert(edges.has(`${atomNode}|executes|behavior:${atom.behaviorKey}`));
    assert(atom.reads.every((field) => edges.has(`${atomNode}|reads|state_field:${field}`)));
    assert(atom.writes.every((field) => edges.has(`${atomNode}|writes|state_field:${field}`)));
  }
});
accept("five_token_marker_entries_expand_to_eleven_atomic_rules", () => {
  assert.deepEqual(release.tokenMarkerEntryIds, [
    "faq-v1:41", "faq-v1:47", "faq-v1:52", "faq-v1:54", "faq-v1:57",
  ]);
  assert.equal(release.tokenMarkerAtomIds.length, 11);
});
accept("resource_self_range_and_tactical_active_rules_execute", () => {
  const payment = positive("faq-v1:34", { requiredResourceType: "cp", requiredAmount: 1,
    cards: [{ cardId: "academy", resourceType: "cp", value: 2, ready: true }],
    selectedCardIds: ["academy"] });
  assert.deepEqual({ paid: payment.values.paid, excess: payment.values.excessLost,
    cards: payment.values.exhaustedCardIds }, { paid: 1, excess: 1, cards: ["academy"] });
  negative("faq-v1:34", { requiredResourceType: "cp", requiredAmount: 1,
    cards: [{ cardId: "academy", resourceType: "cp", value: 2, ready: false }],
    selectedCardIds: ["academy"] }, "ABILITY_PAYMENT_CARD_NOT_READY_OR_WRONG_TYPE");
  assert.equal(positive("faq-v1:35", { sourceUnitId: "marine", subjectUnitId: "marine",
    explicitSelfExclusion: false }).values.withinRange, true);
  assert.equal(positive("faq-v1:35", { sourceUnitId: "marine", subjectUnitId: "marine",
    explicitSelfExclusion: true }).values.withinRange, false);
  positive("faq-v1:36", { abilityType: "tactical_card_active",
    activeUnitOnBattlefield: true, cardAffectsActiveUnit: false });
  negative("faq-v1:36", { abilityType: "tactical_card_active",
    activeUnitOnBattlefield: false, cardAffectsActiveUnit: false },
  "TACTICAL_ACTIVE_REQUIRES_ACTIVE_BATTLEFIELD_UNIT");
});
accept("ability_frequency_los_and_modifier_stacking_rules_execute", () => {
  positive("faq-v1:37", { abilityType: "active", costPaid: true,
    nameUsedByUnitThisRound: false, repeatable: false, reactionsResolvedThisActivation: 0 });
  negative("faq-v1:37", { abilityType: "reaction", costPaid: true,
    nameUsedByUnitThisRound: false, repeatable: true, reactionsResolvedThisActivation: 1 },
  "REACTION_LIMIT_REACHED");
  positive("faq-v1:38", { lineOfSightToFriendlyChargedUnit: true,
    lineOfSightToEnemyCharger: false });
  negative("faq-v1:38", { lineOfSightToFriendlyChargedUnit: false,
    lineOfSightToEnemyCharger: true }, "CONCUSSIVE_SHELLS_FRIENDLY_UNIT_NOT_VISIBLE");
  assert.equal(positive("faq-v1:39", { modifierSources: [
    { name: "malignant_creep", value: 1, kind: "numeric" },
    { name: "evolution_chamber", value: 1, kind: "numeric" },
    { name: "adrenal_overload", value: 1, kind: "numeric" },
  ] }).values.totalImpactModifier, 3);
  assert.equal(positive("faq-v1:40", { speedModifiers: [
    { name: "accelerating_creep", value: 1, kind: "flat" },
    { name: "queen_creep_speed", value: 1, kind: "flat" },
    { name: "wild_mutation", value: 2, kind: "buff_speed" },
    { name: "glial_reconstitution", value: 1, kind: "buff_speed" },
  ] }).values.totalSpeedModifier, 4);
});
accept("indicator_phase_prism_damage_and_force_field_rules_execute", () => {
  const blocked = positive("faq-v1:41", { opponentOccupiesIndicator: true,
    timing: "end_round" });
  assert.deepEqual({ removed: blocked.values.indicatorRemoved,
    deployed: blocked.values.deploymentCompleted, wasted: blocked.values.abilityWasted },
  { removed: true, deployed: false, wasted: true });
  positive("faq-v1:42", { placeDistance: 0, artanisBaseContactSelectedModel: true });
  negative("faq-v1:42", { placeDistance: 0, artanisBaseContactSelectedModel: false },
    "ARTANIS_NOT_IN_CONTACT_WITH_SELECTED_MODEL");
  assert.equal(positive("faq-v1:43", { existingDamage: 3, newDamage: 2,
    damageRemoval: 2 }).values.finalTotalDamage, 3);
  positive("faq-v1:44", { usesTunnellingClaws: true, crossesForceField: false });
  negative("faq-v1:44", { usesTunnellingClaws: true, crossesForceField: true },
    "TUNNELLING_CLAWS_FORCE_FIELD_BLOCKED");
  assert.equal(positive("faq-v1:45", { actionType: "place", modelSize: 3,
    overlapsForceField: true }).values.forceFieldRemoved, false);
  positive("faq-v1:46", { unitIsRaptor: true, modelSize: 2, crossesForceField: true });
  negative("faq-v1:46", { unitIsRaptor: true, modelSize: 3, crossesForceField: true },
    "RAPTOR_FORCE_FIELD_SIZE_RESTRICTION");
});
accept("creep_academy_and_outside_reaction_rules_execute", () => {
  assert.equal(positive("faq-v1:47", { startedOnCreep: true, endedOnCreep: false })
    .values.creepSpeedBonusAppliedForWholeMove, true);
  assert.equal(positive("faq-v1:47", { startedOnCreep: false, endedOnCreep: true })
    .values.creepSpeedBonusAppliedForWholeMove, false);
  negative("faq-v1:48", { academyReady: false, cleanupRefreshCompleted: false },
    "ACADEMY_EXHAUSTED_UNTIL_CLEANUP");
  positive("faq-v1:48", { academyReady: false, cleanupRefreshCompleted: true });
  assert.equal(positive("faq-v1:49", { timing: "outside_activation", usesForTrigger: 0,
    simultaneous: true, seatIsFirstPlayer: true }).values.priority, 0);
  negative("faq-v1:49", { timing: "outside_activation", usesForTrigger: 1,
    simultaneous: false, seatIsFirstPlayer: false }, "REACTION_ALREADY_USED_FOR_TRIGGER");
});
accept("targeting_synonym_artefact_pinpoint_and_creep_removal_rules_execute", () => {
  positive("faq-v1:50", { targetType: "structure", effectTargetScope: "unit",
    explicitlyExcludesStructure: false });
  negative("faq-v1:50", { targetType: "structure", effectTargetScope: "area",
    explicitlyExcludesStructure: true }, "STRUCTURE_EXPLICITLY_EXCLUDED");
  assert.equal(positive("faq-v1:51", { verb: "select", explicitlyDistinguished: false })
    .values.normalizedVerb, "target");
  positive("faq-v1:52", { unitIsAdept: true, carryingClaimedArtefact: false,
    usesPsionicTransfer: true });
  negative("faq-v1:52", { unitIsAdept: true, carryingClaimedArtefact: true,
    usesPsionicTransfer: true }, "PSIONIC_TRANSFER_FORBIDDEN_WHILE_CARRYING_ARTEFACT");
  positive("faq-v1:53", { attackerEngaged: false, targetEngaged: true,
    weaponHasPinpoint: true });
  negative("faq-v1:53", { attackerEngaged: true, targetEngaged: false,
    weaponHasPinpoint: true }, "PINPOINT_DOES_NOT_ALLOW_SHOOTING_OUT_OF_COMBAT");
  const place = positive("faq-v1:54", { actionType: "place", endsWithinOneOfCreep: true });
  assert.deepEqual({ removed: place.values.creepRemoved,
    preserved: place.values.placePreservesCreep }, { removed: false, preserved: true });
});
accept("locked_in_indirect_detection_timing_repeatable_and_specialist_rules_execute", () => {
  assert.equal(positive("faq-v1:55", { weaponHasLockedIn: true, targetStationary: true })
    .values.lockedInRateBonusApplies, true);
  const indirect = positive("faq-v1:56", { weaponHasIndirectFire: true,
    visibleModelCount: 1, totalModelCount: 3 });
  assert.deepEqual({ evade: indirect.values.evadeAllowed,
    casualties: indirect.values.unseenModelsMayBeCasualties,
    inLos: indirect.values.unitInLineOfSight },
  { evade: false, casualties: true, inLos: true });
  assert.equal(positive("faq-v1:56", { weaponHasIndirectFire: true,
    visibleModelCount: 0, totalModelCount: 3 }).values.evadeAllowed, true);
  const detection = positive("faq-v1:57", { abilityIsDetection: true,
    selectionKind: "location", locationLegal: true });
  assert.deepEqual({ placed: detection.values.factionIndicatorPlaced,
    hiddenRange: detection.values.hiddenTargetRangeCheckRequired },
  { placed: true, hiddenRange: false });
  negative("faq-v1:57", { abilityIsDetection: true, selectionKind: "unit",
    locationLegal: true }, "DETECTION_REQUIRES_LOCATION_SELECTION");
  assert.deepEqual(positive("faq-v1:58", { withinAtStart: true, withinAtEnd: false })
    .values.checkpoints, ["action_or_ability_start", "action_or_ability_end"]);
  positive("faq-v1:59", { timing: "inside_activation", repeatable: true,
    reactionsResolvedThisActivation: 0, usesForTrigger: 0 });
  negative("faq-v1:59", { timing: "outside_activation", repeatable: true,
    reactionsResolvedThisActivation: 0, usesForTrigger: 1 },
  "REACTION_ALREADY_USED_FOR_TRIGGER");
  const specialist = positive("faq-v1:64", { specialistCarrierRemoved: true,
    specialistWeaponPresent: true });
  assert.deepEqual({ weapon: specialist.values.specialistWeaponPresentAfterResolution,
    transfer: specialist.values.transferAllowed }, { weapon: false, transfer: false });
});
accept("faq56_refines_partial_visibility_without_superseding_fully_unseen_evade", () => {
  assert.deepEqual(release.supersededBaseBehaviorEntryIds, []);
  const refinedAtoms = release.atoms.filter((atom) => atom.entryId === "faq-v1:56");
  assert.equal(refinedAtoms.length, 3);
  assert(refinedAtoms.every((atom) => atom.disposition === "refine"));
  assert(refinedAtoms.every((atom) => atom.baseAtomIds.includes(
    "rule-atom:singleton:core-11-indirect-fire-off-los-evade:8de63a970f7f")));
  assert.equal(release.graph.edges.some((edge) => edge.relationship === "supersedes"), false);
});
accept("unknown_entry_field_and_carrier_values_fail_closed", () => {
  assert.throws(() => evaluateOfficialFaqF4RuleV1("faq-v1:60", {}),
    /FAQ_F4_ENTRY_NOT_EXECUTABLE/u);
  assert.throws(() => evaluateOfficialFaqF4RuleV1("faq-v1:56", {
    weaponHasIndirectFire: true, visibleModelCount: 1, totalModelCount: 3,
    clientEvadeOverride: true,
  }), /FAQ_F4_56_INPUT_INVALID_UNKNOWN_FIELD/u);
  assert.throws(() => evaluateOfficialFaqF4RuleV1("faq-v1:34", {
    requiredResourceType: "minerals", requiredAmount: 1, cards: [], selectedCardIds: [],
  }), /FAQ_F4_34_RESOURCE_TYPE_INVALID/u);
});
accept("f4_binds_f3_source_reconciliation_and_immutable_base", () => {
  assert.deepEqual(release.previousOverlay, {
    releaseHash: f3Release.releaseHash,
    graphHash: f3Release.graph.graphHash,
    entryCount: 23,
    atomCount: 40,
    mutationAllowed: false,
  });
  assert.equal(release.sourceLockHash, sourceLock.lockHash);
  assert.equal(release.reconciliationHash, reconciliation.reconciliationHash);
  assert.equal(release.graph.previousOverlayGraphHash, f3Release.graph.graphHash);
  assert.equal(release.immutableBase.mutationAllowed, false);
});
accept("atomic_binding_is_complete_and_state_transitions_declare_writes", () => {
  assert.equal(OFFICIAL_FAQ_F4_ATOM_BINDING_V1.length, 57);
  assert(OFFICIAL_FAQ_F4_ATOM_BINDING_V1.every((atom) => atom.reads.length > 0));
  assert(release.atoms.filter((atom) => atom.kind === "state_transition")
    .every((atom) => atom.writes.length > 0));
});
accept("f4_release_is_content_addressed_and_tamper_evident", () => {
  assert.equal(verifyOfficialFaqF4ReleaseV1(release, releaseInput), true);
  assert.match(release.releaseHash, /^[a-f0-9]{64}$/u);
  assert.match(release.graph.graphHash, /^[a-f0-9]{64}$/u);
  const tampered = structuredClone(release);
  tampered.atoms.find((atom) => atom.entryId === "faq-v1:56").primitive =
    "client_visibility_override";
  assert.throws(() => verifyOfficialFaqF4ReleaseV1(tampered, releaseInput),
    /FAQ_F4_RELEASE_MISMATCH/u);
});
accept("f4_does_not_promote_aggregate_room_skill_or_training_authority", () => {
  assert.equal(release.rulesEligible, false);
  assert.equal(release.productionRoomEligible, false);
  assert.equal(release.aggregateCurrentRuntimeEligible, false);
  assert.equal(release.ctx2skillPromotionEligible, false);
  assert.equal(release.trainingTruth, false);
});

const report = {
  schema: "starcraft_tmg_faq_f4_ability_tactical_keyword_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  release,
  behaviorWitnesses: { positive: 27, negativeOrBoundary: 21, interactionGroups: 6 },
  ctx2skillLoopUsed: true,
  targetGames: ["starcraft-tmg"],
  roleRoutes: ["rule_skill_builder"],
  skillsRead: ["research", "ctx2skill-rule-skill-loop"],
  skillsGenerated: [],
  judgeTestsRun: 48,
  crossTimeReplayResult: "pre_faq_fully_unseen_evade_retained_partial_visibility_refined_f5_pending",
  promotions: [],
  blocks: release.blocks,
  remainingRuleGaps: 18,
  harnessLoopUsed: true,
  promptPackRoutes: ["rule_skill_builder_prompt"],
  harnessToolsCalled: ["evaluate_faq_rule", "rule_atom_graph_lookup"],
  uiTraceEvidence: "not_run_rules_overlay_only_ticket_14_slice_140_paused",
  agentDecisionEvidence: "27_f4_behaviors_executable_including_source_versioned_indirect_fire",
  memoryTraceEvidence: { refs: [], promotionAttempted: false },
  trainingTraceCandidates: [],
  rollbackOrDemotionRules: [
    "faq_source_reconciliation_or_f3_drift_invalidates_f4",
    "f5_or_aggregate_failure_keeps_pre_faq_runtime_current",
  ],
  userVisibleChecks: [
    "indicator_creep_artefact_and_detection_marker_behaviors_are_explainable",
    "faq56_partial_visibility_refinement_preserves_fully_unseen_indirect_evade",
  ],
  sourceRefreshPerformed: false,
  repositoryFallbackUsed: false,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "faq-f4-ability-tactical-keyword-report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  releaseHash: release.releaseHash,
  overlayGraphHash: release.graph.graphHash,
  entries: release.entryCount,
  atoms: release.atomCount,
  cumulativeFaqAtoms: release.cumulativeFaqAtomCount,
  tokenMarkerEntries: release.tokenMarkerEntryIds.length,
  tokenMarkerAtoms: release.tokenMarkerAtomIds.length,
  supersededEntries: release.supersededBaseBehaviorEntryIds,
  behaviorWitnesses: report.behaviorWitnesses,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
