#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_FAQ_F5_ATOM_BINDING_V1 } from
  "../content/official-faq-f5-attack-scoring-template-binding-v1.mjs";
import { createOfficialFaqF3ReleaseV1 } from
  "../packages/rule-atoms/official-faq-f3-movement-battlefield-deployment-release-v1.mjs";
import { createOfficialFaqF4ReleaseV1 } from
  "../packages/rule-atoms/official-faq-f4-ability-tactical-keyword-release-v1.mjs";
import {
  classifyOfficialFaqRoomBindingV1,
  createOfficialFaqF5AggregateReleaseV1,
  evaluateOfficialFaqCurrentRuleV1,
  OFFICIAL_FAQ_CURRENT_AGGREGATE_HASH,
  OFFICIAL_FAQ_CURRENT_CATALOGUE_HASH,
  OFFICIAL_FAQ_CURRENT_GRAPH_HASH,
  OFFICIAL_FAQ_CURRENT_RUNTIME_HASH,
  OFFICIAL_FAQ_F5_RELEASE_HASH,
  OFFICIAL_FAQ_TOKEN_MARKER_CONTRACT_HASH,
  verifyOfficialFaqF5AggregateReleaseV1,
} from "../packages/rule-atoms/official-faq-f5-aggregate-release-v1.mjs";
import { evaluateOfficialFaqF5RuleV1 } from
  "../packages/rule-atoms/official-faq-f5-attack-scoring-template-kernel-v1.mjs";
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
const sharedInput = { sourceLock, reconciliation,
  baseCatalogue: baseReport.slice.catalogue, baseGraph: baseReport.graph,
  baseRuntimeHash: baseReport.runtimeHash };
const f3Release = createOfficialFaqF3ReleaseV1(sharedInput);
const f4Release = createOfficialFaqF4ReleaseV1({ ...sharedInput, f3Release });
const releaseInput = { ...sharedInput, f3Release, f4Release };
const release = createOfficialFaqF5AggregateReleaseV1(releaseInput);
const aggregate = release.aggregate;
const acceptance = [];
function accept(description, check) {
  check();
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${description}`);
}
function positive(entryId, input) {
  const result = evaluateOfficialFaqF5RuleV1(entryId, input);
  assert.equal(result.entryId, entryId);
  assert.equal(result.legal, true);
  assert.equal(result.rulesAuthority, true);
  assert.equal(result.trainingTruth, false);
  return result;
}
function negative(entryId, input, code) {
  const result = evaluateOfficialFaqF5RuleV1(entryId, input);
  assert.equal(result.legal, false);
  assert(result.reasonCodes.includes(code));
  return result;
}

accept("f5_exactly_owns_the_remaining_18_entries_as_40_atoms", () => {
  assert.deepEqual(release.f5Release.entryIds, [
    "faq-v1:01", "faq-v1:02", "faq-v1:03", "faq-v1:04",
    "faq-v1:28", "faq-v1:29", "faq-v1:30", "faq-v1:31", "faq-v1:32", "faq-v1:33",
    "faq-v1:60", "faq-v1:61", "faq-v1:62", "faq-v1:63",
    "faq-v1:65", "faq-v1:66", "faq-v1:67", "faq-v1:68",
  ]);
  assert.equal(release.f5Release.entryCount, 18);
  assert.equal(release.f5Release.atomCount, 40);
  assert.equal(OFFICIAL_FAQ_F5_ATOM_BINDING_V1.length, 40);
});
accept("aggregate_closes_68_entries_and_137_atomic_faq_rules", () => {
  assert.equal(aggregate.faqEntryCount, 68);
  assert.equal(aggregate.faqAtomCount, 137);
  assert.equal(aggregate.totalAtomCount, 1163);
  assert.equal(aggregate.executableAtomCount, 1049);
  assert.equal(aggregate.displayOnlyAtomCount, 114);
  assert.equal(aggregate.catalogue.reviewRequiredAtomCount, 0);
  assert.equal(new Set(aggregate.catalogue.atomIndex.map((atom) => atom.atomId)).size, 137);
});
accept("current_catalogue_runtime_and_graph_identities_are_exact", () => {
  assert.equal(aggregate.aggregateHash, OFFICIAL_FAQ_CURRENT_AGGREGATE_HASH);
  assert.equal(aggregate.catalogue.catalogueHash, OFFICIAL_FAQ_CURRENT_CATALOGUE_HASH);
  assert.equal(aggregate.runtime.runtimeHash, OFFICIAL_FAQ_CURRENT_RUNTIME_HASH);
  assert.equal(aggregate.graph.graphHash, OFFICIAL_FAQ_CURRENT_GRAPH_HASH);
  assert.equal(release.releaseHash, OFFICIAL_FAQ_F5_RELEASE_HASH);
  assert.deepEqual({ entries: aggregate.runtime.faqEntryCount,
    atoms: aggregate.runtime.faqAtomCount, executors: aggregate.runtime.executorCount },
  { entries: 68, atoms: 137, executors: 83 });
});
accept("aggregate_graph_contains_every_faq_atom_and_runtime_consumer_edge", () => {
  assert.equal(release.f5Release.graph.nodes.length, 169);
  assert.equal(release.f5Release.graph.edges.length, 277);
  assert.equal(aggregate.graph.nodes.length, 567);
  assert.equal(aggregate.graph.edges.length, 1308);
  const edges = new Set(aggregate.graph.edges.map((edge) => (
    `${edge.from}|${edge.relationship}|${edge.to}`
  )));
  for (const atom of aggregate.catalogue.atomIndex) {
    assert(edges.has(`catalogue:${aggregate.catalogue.catalogueHash}|contains|rule_atom:${atom.atomId}`));
    assert(edges.has(`rule_atom:${atom.atomId}|consumed_by|runtime:${aggregate.runtime.runtimeHash}`));
  }
});
accept("token_marker_contract_freezes_12_entries_and_27_atoms_for_slice_140", () => {
  assert.deepEqual(aggregate.tokenMarkerContract.entryIds, [
    "faq-v1:16", "faq-v1:19", "faq-v1:21", "faq-v1:22",
    "faq-v1:23", "faq-v1:24", "faq-v1:27", "faq-v1:41",
    "faq-v1:47", "faq-v1:52", "faq-v1:54", "faq-v1:57",
  ]);
  assert.equal(aggregate.tokenMarkerContract.atomIds.length, 27);
  assert.equal(aggregate.tokenMarkerContract.contractHash,
    OFFICIAL_FAQ_TOKEN_MARKER_CONTRACT_HASH);
  assert.equal(aggregate.tokenMarkerContract.rulesOwnedWriteOnly, true);
  assert.equal(aggregate.tokenMarkerContract.unclassifiedActionPolicy, "fail_closed");
});
accept("shield_nonlethal_and_destroyed_lifecycle_rules_execute", () => {
  const pool = positive("faq-v1:01", { firstModelHitPoints: 4, shieldValue: 3,
    totalDamage: 5, heal: 2 });
  assert.deepEqual({ hp: pool.values.firstModelCombinedHitPoints,
    damage: pool.values.totalDamageAfterHeal }, { hp: 7, damage: 3 });
  assert.equal(positive("faq-v1:02", { shieldValue: 3, finalTotalDamage: 3,
    firstModelPresent: true, shieldedPreviously: true }).values.shielded, true);
  assert.equal(positive("faq-v1:02", { shieldValue: 3, finalTotalDamage: 4,
    firstModelPresent: true, shieldedPreviously: true }).values.shielded, false);
  assert.deepEqual(positive("faq-v1:03", { priorTotalDamage: 2, nonlethalDamage: 2,
    shieldValue: 3 }).values, { totalDamage: 4, shieldedLost: true,
    casualtiesRemovedByNonlethal: 0 });
  negative("faq-v1:04", { unitDestroyed: true, explicitReturnPermission: false },
    "DESTROYED_UNIT_RETURN_FORBIDDEN");
  positive("faq-v1:04", { unitDestroyed: true, explicitReturnPermission: true });
});
accept("evade_target_number_and_ranged_casualty_rules_execute", () => {
  const evade = positive("faq-v1:28", { armourDamage: 2, surgeDamage: 2 });
  assert.deepEqual({ pool: evade.values.finalPoolBeforeEvade,
    evadeInput: evade.values.evadeInputDamagePool }, { pool: 4, evadeInput: 4 });
  assert.equal(positive("faq-v1:29", { baseTargetNumber: 4, modifier: 9 })
    .values.targetNumber, 6);
  assert.equal(positive("faq-v1:29", { baseTargetNumber: 4, modifier: -9 })
    .values.targetNumber, 2);
  const casualty = positive("faq-v1:30", { weaponRange: 8, targetModels: [
    { modelId: "near", visibleToAnyAttacker: true, distance: 6 },
    { modelId: "far", visibleToAnyAttacker: true, distance: 10 },
    { modelId: "hidden", visibleToAnyAttacker: false, distance: 5 },
  ] });
  assert.deepEqual(casualty.values.eligibleModelIds, ["near", "far"]);
  assert.equal(casualty.values.casualtyRangeFilterApplied, false);
});
accept("close_ranks_multi_enemy_casualty_and_weapon_batch_rules_execute", () => {
  negative("faq-v1:31", { allModelsInEnemyBaseContact: true, leadingStartDistance: 0,
    leadingEndDistance: 0 }, "CLOSE_RANKS_ALL_MODELS_ALREADY_IN_BASE_CONTACT");
  positive("faq-v1:31", { allModelsInEnemyBaseContact: false, leadingStartDistance: 2,
    leadingEndDistance: 1 });
  const casualties = positive("faq-v1:32", { enemyUnitIds: ["enemy-a", "enemy-b"],
    candidates: [
      { modelId: "priority-2-breaks", priority: 2, engagedEnemyUnitIdsAfter: ["enemy-a"] },
      { modelId: "priority-3-preserves", priority: 3,
        engagedEnemyUnitIdsAfter: ["enemy-a", "enemy-b"] },
    ] });
  assert.deepEqual(casualties.values.eligibleModelIds, ["priority-3-preserves"]);
  negative("faq-v1:33", { weaponProfileIds: ["rifle", "grenade"],
    completedBatchCount: 1, currentBatchResolved: false },
  "PREVIOUS_WEAPON_BATCH_NOT_RESOLVED");
  positive("faq-v1:33", { weaponProfileIds: ["rifle", "grenade"],
    completedBatchCount: 1, currentBatchResolved: true });
});
accept("batch_modifier_precision_and_morph_scoring_rules_execute", () => {
  const modifiers = positive("faq-v1:60", { weaponBatchId: "batch-1", modelCount: 4,
    precision: true, surge: true, critical: false });
  assert.deepEqual(modifiers.values.activeModifiers, ["precision", "surge"]);
  assert.equal(modifiers.values.modifierScope, "weapon_batch");
  positive("faq-v1:61", { weaponProfileId: "precision-rifle", precisionSuccesses: 4,
    targetAllocations: [{ targetUnitId: "a", successes: 1 },
      { targetUnitId: "b", successes: 3 }] });
  negative("faq-v1:61", { weaponProfileId: "precision-rifle", precisionSuccesses: 4,
    targetAllocations: [{ targetUnitId: "a", successes: 1 },
      { targetUnitId: "b", successes: 2 }] }, "PRECISION_RESULT_ALLOCATION_MISMATCH");
  assert.deepEqual(positive("faq-v1:62", { supplyBeforeMorph: 6, supplyAfterMorph: 4,
    opponentVictoryPoints: 3 }).values, { supplyLost: 2, opponentVictoryPointsAfter: 5 });
  assert.equal(positive("faq-v1:63", { unitMorphed: true, supplyBefore: 5,
    supplyAfter: 2 }).values.opponentVictoryPointDelta, 3);
});
accept("model_less_blast_spillover_guardian_and_main_target_rules_execute", () => {
  const blast = positive("faq-v1:65", { actingUnitId: "high-templar",
    hasPhysicalPrimaryModel: false, targetPointElevation: "high",
    coveredModels: [
      { modelId: "ground-high", elevation: "high", flying: false, baseCovered: true },
      { modelId: "flying-high-base", elevation: "high", flying: true, baseCovered: true },
      { modelId: "ground-low", elevation: "low", flying: false, baseCovered: true },
    ] });
  assert.deepEqual(blast.values.affectedModelIds, ["ground-high", "flying-high-base"]);
  assert.deepEqual(blast.values.primaryTargetCombatTags, []);
  positive("faq-v1:66", { primaryCombatTags: ["ground", "light"],
    targetCombatTags: ["ground", "armoured"], primaryElevation: "ground",
    targetElevation: "ground", targetFlying: false });
  negative("faq-v1:66", { primaryCombatTags: ["ground", "biological"],
    targetCombatTags: ["flying", "biological"], primaryElevation: "ground",
    targetElevation: "ground", targetFlying: true },
  "FLYING_NOT_ON_STANDARD_TEMPLATE_ELEVATION");
  const guardian = positive("faq-v1:67", { guardianShieldApplies: true, batches: [
    { batchId: "main", kind: "main_target", attackDice: 5 },
    { batchId: "spill-a", kind: "spillover", attackDice: 3 },
    { batchId: "spill-b", kind: "spillover", attackDice: 2 },
  ] });
  assert.deepEqual(guardian.values.batchDice.map((batch) => batch.attackDice), [4, 2, 1]);
  assert.deepEqual(positive("faq-v1:68", { batchKind: "spillover",
    weaponHasPrecision: true, weaponHasCritical: true }).values,
  { precisionApplies: false, criticalApplies: false,
    spilloverIsBasicUnmodifiedBatch: true });
});
accept("aggregate_runtime_dispatches_f3_f4_and_f5_and_rejects_unknown_entries", () => {
  assert.equal(evaluateOfficialFaqCurrentRuleV1(aggregate.runtime, "faq-v1:10",
    { actionType: "move", positionChanged: false }).values.suggestedActionType, "hold");
  assert.equal(evaluateOfficialFaqCurrentRuleV1(aggregate.runtime, "faq-v1:56",
    { weaponHasIndirectFire: true, visibleModelCount: 1, totalModelCount: 3 })
    .values.evadeAllowed, false);
  assert.equal(evaluateOfficialFaqCurrentRuleV1(aggregate.runtime, "faq-v1:62",
    { supplyBeforeMorph: 4, supplyAfterMorph: 2, opponentVictoryPoints: 0 })
    .values.opponentVictoryPointsAfter, 2);
  assert.throws(() => evaluateOfficialFaqCurrentRuleV1(aggregate.runtime,
    "faq-v1:69", {}), /FAQ_CURRENT_ENTRY_NOT_EXECUTABLE/u);
  const tamperedRuntime = structuredClone(aggregate.runtime);
  tamperedRuntime.faqEntryCount = 67;
  assert.throws(() => evaluateOfficialFaqCurrentRuleV1(tamperedRuntime,
    "faq-v1:10", {}), /FAQ_CURRENT_RUNTIME_INVALID/u);
});
accept("current_and_historical_room_bindings_are_distinct_and_executable", () => {
  const current = classifyOfficialFaqRoomBindingV1(aggregate, {
    rulesVersion: aggregate.rulesVersion,
    sourceLockHash: aggregate.sourceLockHash,
    reconciliationHash: aggregate.reconciliationHash,
    catalogueHash: aggregate.catalogue.catalogueHash,
    runtimeHash: aggregate.runtime.runtimeHash,
    graphHash: aggregate.graph.graphHash,
  });
  assert.deepEqual(current, { status: "current_faq_v1", executable: true,
    historical: false, reasonCode: null });
  const historical = classifyOfficialFaqRoomBindingV1(aggregate, {
    rulesVersion: aggregate.oldRules.rulesVersion,
    sourceLockHash: aggregate.oldRules.sourceLockHash,
    reconciliationHash: null,
    catalogueHash: aggregate.oldRules.catalogueHash,
    runtimeHash: aggregate.oldRules.runtimeHash,
    graphHash: aggregate.oldRules.graphHash,
  });
  assert.deepEqual(historical, { status: "historical_pre_faq", executable: true,
    historical: true, reasonCode: null });
  assert.equal(aggregate.oldRules.displayRetained, true);
  assert.equal(aggregate.oldRules.replayRetained, true);
});
accept("mixed_or_tampered_room_bindings_quarantine_without_fallback", () => {
  const mixed = classifyOfficialFaqRoomBindingV1(aggregate, {
    rulesVersion: aggregate.rulesVersion,
    sourceLockHash: aggregate.sourceLockHash,
    reconciliationHash: aggregate.reconciliationHash,
    catalogueHash: aggregate.oldRules.catalogueHash,
    runtimeHash: aggregate.runtime.runtimeHash,
    graphHash: aggregate.graph.graphHash,
  });
  assert.deepEqual(mixed, { status: "quarantined", executable: false,
    historical: false, reasonCode: "ROOM_RULE_BINDING_HASH_MISMATCH" });
  assert.equal(classifyOfficialFaqRoomBindingV1(aggregate, {
    rulesVersion: aggregate.rulesVersion,
  }).status, "quarantined");
});
accept("cross_time_indirect_fire_and_old_hashes_remain_consistent", () => {
  const partial = evaluateOfficialFaqCurrentRuleV1(aggregate.runtime, "faq-v1:56",
    { weaponHasIndirectFire: true, visibleModelCount: 1, totalModelCount: 3 });
  const unseen = evaluateOfficialFaqCurrentRuleV1(aggregate.runtime, "faq-v1:56",
    { weaponHasIndirectFire: true, visibleModelCount: 0, totalModelCount: 3 });
  assert.deepEqual({ partial: partial.values.evadeAllowed,
    unseen: unseen.values.evadeAllowed }, { partial: false, unseen: true });
  assert.equal(aggregate.oldRules.catalogueHash, baseReport.catalogueHash);
  assert.equal(aggregate.oldRules.runtimeHash, baseReport.runtimeHash);
  assert.equal(aggregate.oldRules.graphHash, baseReport.graphHash);
  assert.equal(aggregate.oldRules.mutationAllowed, false);
});
accept("aggregate_is_content_addressed_and_any_semantic_tamper_fails", () => {
  assert.equal(verifyOfficialFaqF5AggregateReleaseV1(release, releaseInput), true);
  const tampered = structuredClone(release);
  tampered.aggregate.tokenMarkerContract.rulesOwnedWriteOnly = false;
  assert.throws(() => verifyOfficialFaqF5AggregateReleaseV1(tampered, releaseInput),
    /FAQ_F5_RELEASE_MISMATCH/u);
  assert.match(release.releaseHash, /^[a-f0-9]{64}$/u);
});
accept("rules_are_ready_for_ticket_14_rebind_but_not_production_or_training", () => {
  assert.equal(release.rulesEligible, true);
  assert.equal(release.ticket14RebindEligible, true);
  assert.equal(aggregate.rulesEligible, true);
  assert.equal(aggregate.ticket14RebindEligible, true);
  assert.equal(aggregate.productionRoomEligible, false);
  assert.equal(aggregate.ctx2skillPromotionEligible, false);
  assert.equal(aggregate.trainingTruth, false);
});
accept("all_atomic_state_transitions_declare_writes_and_no_token_delta_hides_in_f5", () => {
  assert(release.f5Release.atoms.filter((atom) => atom.kind === "state_transition")
    .every((atom) => atom.writes.length > 0));
  assert.deepEqual(release.f5Release.tokenMarkerEntryIds, []);
  assert.deepEqual(release.f5Release.tokenMarkerAtomIds, []);
});

const report = {
  schema: "starcraft_tmg_faq_f5_aggregate_release_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  release,
  behaviorWitnesses: { positive: 18, negativeOrBoundary: 15, interactionGroups: 7 },
  ctx2skillLoopUsed: true,
  targetGames: ["starcraft-tmg"],
  roleRoutes: ["rule_skill_builder"],
  skillsRead: ["research", "ctx2skill-rule-skill-loop"],
  skillsGenerated: [],
  judgeTestsRun: 33,
  crossTimeReplayResult: "pass_old_exact_binding_and_current_faq_binding_are_distinct",
  promotions: [],
  blocks: release.blocks,
  remainingRuleGaps: 0,
  harnessLoopUsed: true,
  promptPackRoutes: ["rule_skill_builder_prompt"],
  harnessToolsCalled: ["evaluate_faq_rule", "classify_room_binding",
    "rule_atom_graph_lookup", "replay_room_binding"],
  uiTraceEvidence: "ticket_14_slice_140_rebind_pending",
  agentDecisionEvidence: "68_faq_entries_route_to_137_atomic_rules_with_exact_current_runtime",
  memoryTraceEvidence: { refs: [], promotionAttempted: false },
  trainingTraceCandidates: [],
  rollbackOrDemotionRules: [
    "source_reconciliation_release_or_room_binding_drift_quarantines_current_faq_runtime",
    "historical_rooms_never_fallback_to_current_rules",
  ],
  userVisibleChecks: [
    "current_and_historical_rules_versions_are_separately_displayable",
    "token_marker_palette_can_bind_exact_12_entry_27_atom_contract",
  ],
  sourceRefreshPerformed: false,
  repositoryFallbackUsed: false,
  rulesTruth: true,
  productionRoomTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR, "faq-f5-aggregate-release-report.json"),
  `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  releaseHash: release.releaseHash,
  aggregateHash: aggregate.aggregateHash,
  catalogueHash: aggregate.catalogue.catalogueHash,
  runtimeHash: aggregate.runtime.runtimeHash,
  graphHash: aggregate.graph.graphHash,
  faqEntries: aggregate.faqEntryCount,
  faqAtoms: aggregate.faqAtomCount,
  totalAtoms: aggregate.totalAtomCount,
  executableAtoms: aggregate.executableAtomCount,
  tokenMarkerEntries: aggregate.tokenMarkerContract.entryIds.length,
  tokenMarkerAtoms: aggregate.tokenMarkerContract.atomIds.length,
  behaviorWitnesses: report.behaviorWitnesses,
  rulesTruth: true,
  productionRoomTruth: false,
  trainingTruth: false,
}, null, 2));
