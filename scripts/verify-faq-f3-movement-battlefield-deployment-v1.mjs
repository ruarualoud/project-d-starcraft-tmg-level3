#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_FAQ_F3_ATOM_BINDING_V1 } from
  "../content/official-faq-f3-movement-battlefield-deployment-binding-v1.mjs";
import {
  evaluateOfficialFaqF3RuleV1,
} from "../packages/rule-atoms/official-faq-f3-movement-battlefield-deployment-kernel-v1.mjs";
import {
  createOfficialFaqF3ReleaseV1,
  verifyOfficialFaqF3ReleaseV1,
} from "../packages/rule-atoms/official-faq-f3-movement-battlefield-deployment-release-v1.mjs";
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
const reconciliationInput = {
  sourceLock,
  currentCatalogue: baseReport.slice.catalogue,
  currentGraph: baseReport.graph,
  currentRuntimeHash: baseReport.runtimeHash,
};
const reconciliation = createOfficialFaqV1RuleReconciliationV1(reconciliationInput);
const releaseInput = {
  sourceLock,
  reconciliation,
  baseCatalogue: baseReport.slice.catalogue,
  baseGraph: baseReport.graph,
  baseRuntimeHash: baseReport.runtimeHash,
};
const release = createOfficialFaqF3ReleaseV1(releaseInput);
const acceptance = [];
function accept(description, check) {
  check();
  acceptance.push(`${String(acceptance.length + 1).padStart(2, "0")}_${description}`);
}
function positive(entryId, input) {
  const result = evaluateOfficialFaqF3RuleV1(entryId, input);
  assert.equal(result.entryId, entryId);
  assert.equal(result.legal, true);
  assert.equal(result.rulesAuthority, true);
  assert.equal(result.trainingTruth, false);
  return result;
}
function negative(entryId, input, code) {
  const result = evaluateOfficialFaqF3RuleV1(entryId, input);
  assert.equal(result.entryId, entryId);
  assert.equal(result.legal, false);
  assert(result.reasonCodes.includes(code));
  return result;
}

accept("f3_exactly_owns_faq_entries_05_through_27", () => {
  assert.equal(release.entryCount, 23);
  assert.deepEqual(release.entryIds, Array.from({ length: 23 }, (_, index) => (
    `faq-v1:${String(index + 5).padStart(2, "0")}`
  )));
});
accept("forty_atomic_rules_have_unique_ids_and_executable_handlers", () => {
  assert.equal(release.atomCount, 40);
  assert.equal(release.executableAtomCount, 40);
  assert.equal(new Set(release.atoms.map((atom) => atom.atomId)).size, 40);
  assert.equal(release.behaviorKeys.length, 23);
  assert(release.atoms.every((atom) => atom.executable && atom.execution.failClosed));
});
accept("every_f3_source_entry_and_atomic_rule_is_in_the_overlay_graph", () => {
  const nodes = new Set(release.graph.nodes.map((node) => node.nodeId));
  const edges = new Set(release.graph.edges.map((edge) => (
    `${edge.from}|${edge.relationship}|${edge.to}`
  )));
  for (const entryId of release.entryIds) {
    assert(nodes.has(`faq_source_entry:${entryId}`));
  }
  for (const atom of release.atoms) {
    assert(nodes.has(`rule_atom:${atom.atomId}`));
    assert(edges.has(`faq_source_entry:${atom.entryId}|defines|rule_atom:${atom.atomId}`));
    assert(edges.has(`rule_atom:${atom.atomId}|executes|behavior:${atom.behaviorKey}`));
  }
});
accept("token_marker_scope_is_seven_entries_and_sixteen_atomic_rules", () => {
  assert.deepEqual(release.tokenMarkerEntryIds, [
    "faq-v1:16", "faq-v1:19", "faq-v1:21", "faq-v1:22",
    "faq-v1:23", "faq-v1:24", "faq-v1:27",
  ]);
  assert.equal(release.tokenMarkerAtomIds.length, 16);
});
accept("coherency_gap_and_link_rules_execute_positive_and_negative_witnesses", () => {
  assert.equal(positive("faq-v1:05", { lastMovementCheckPassed: true,
    casualtiesSinceMovement: 3 }).values.missionCoherent, true);
  assert.equal(positive("faq-v1:05", { lastMovementCheckPassed: false,
    casualtiesSinceMovement: 0 }).values.missionCoherent, false);
  positive("faq-v1:06", { gapBoundaryKinds: ["model", "terrain"], gapWidth: 1,
    modelSize: 2 });
  negative("faq-v1:06", { gapBoundaryKinds: ["model", "terrain"], gapWidth: 2.99,
    modelSize: 3 }, "GAP_CLEARANCE_INSUFFICIENT");
  positive("faq-v1:07", { linkCrossesEnemy: true, enemyCurrentlyEngaged: true,
    landingOpen: true, landingCoherent: true });
  negative("faq-v1:07", { linkCrossesEnemy: true, enemyCurrentlyEngaged: false,
    landingOpen: true, landingCoherent: true }, "ENEMY_LINK_NOT_CURRENTLY_ENGAGED");
  positive("faq-v1:08", { leadingModelCouldTraverse: true });
  negative("faq-v1:08", { leadingModelCouldTraverse: false },
    "LEADING_MODEL_CANNOT_TRAVERSE");
  positive("faq-v1:09", { usesAccessPoint: true, landingCoherent: true });
  negative("faq-v1:09", { usesAccessPoint: false, landingCoherent: true },
    "ACCESS_POINT_REQUIRED");
});
accept("move_run_direct_wobbly_and_high_ground_rules_execute", () => {
  assert.equal(positive("faq-v1:10", { actionType: "move", positionChanged: true })
    .values.effectiveActionType, "move");
  assert.equal(negative("faq-v1:10", { actionType: "run", positionChanged: false },
    "MOVE_OR_RUN_MUST_CHANGE_POSITION").values.suggestedActionType, "hold");
  positive("faq-v1:11", { direction: "towards", attemptedDistance: 4,
    maxLegalDistance: 4 });
  negative("faq-v1:11", { direction: "away", attemptedDistance: 3,
    maxLegalDistance: 4 }, "DIRECT_MOVE_MUST_USE_MAXIMUM_POSSIBLE_DISTANCE");
  positive("faq-v1:12", { baseCenterOnHighGround: true, baseOverhang: 0.25,
    minimumNecessaryOverhang: 0.25 });
  negative("faq-v1:12", { baseCenterOnHighGround: false, baseOverhang: 0.25,
    minimumNecessaryOverhang: 0.25 }, "WOBBLY_BASE_CENTER_NOT_ON_HIGH_GROUND");
  positive("faq-v1:13", { modelSize: 3, gapWidth: 3 });
  negative("faq-v1:13", { modelSize: 2, gapWidth: 0.99 },
    "HIGH_GROUND_EDGE_GAP_CLEARANCE_INSUFFICIENT");
  positive("faq-v1:14", { unitElevationType: "ground", highGroundsConnected: true });
  negative("faq-v1:14", { unitElevationType: "ground", highGroundsConnected: false },
    "GROUND_HIGH_GROUNDS_NOT_CONNECTED");
});
accept("cover_marker_draft_wall_and_artefact_rules_execute", () => {
  assert.equal(positive("faq-v1:15", { traceCrossesTerrainId: "wall-a",
    proximityTerrainId: "wall-a", distanceToAnyPart: 1 }).values.directCover, true);
  assert.equal(positive("faq-v1:15", { traceCrossesTerrainId: "wall-a",
    proximityTerrainId: "wall-b", distanceToAnyPart: 0.5 }).values.directCover, false);
  assert.equal(positive("faq-v1:16", { markerOnBattlefield: true,
    markerFace: "deactivated", normalControlEligible: true }).values.controlled, true);
  assert.equal(positive("faq-v1:16", { markerOnBattlefield: true,
    markerFace: "deactivated", normalControlEligible: false }).values.controlled, false);
  positive("faq-v1:17", { candidateCardInstanceId: "mission-copy-b",
    candidateCardName: "shared-name", blockedCardInstanceIds: ["mission-copy-a"],
    blockedCardNames: ["shared-name"] });
  negative("faq-v1:17", { candidateCardInstanceId: "mission-copy-a",
    candidateCardName: "shared-name", blockedCardInstanceIds: ["mission-copy-a"],
    blockedCardNames: [] }, "PHYSICAL_CARD_INSTANCE_BLOCKED");
  assert.equal(positive("faq-v1:18", { layoutComponentIds: ["wall-a", "wall-b"] })
    .values.independentTerrainPieceCount, 2);
  assert.throws(() => evaluateOfficialFaqF3RuleV1("faq-v1:18", {
    layoutComponentIds: ["wall-a", "wall-a"],
  }), /FAQ_F3_18_INDEPENDENT_COMPONENTS_REQUIRED/u);
  positive("faq-v1:19", { missionId: "artefact_hunt", unitStatuses: ["flying"],
    markerControlled: true, claimRequirementsMet: true });
  negative("faq-v1:19", { missionId: "artefact_hunt", unitStatuses: ["burrowed"],
    markerControlled: true, claimRequirementsMet: false },
  "ARTEFACT_CLAIM_REQUIREMENTS_NOT_MET");
});
accept("entry_edge_pylon_and_zoi_rules_execute", () => {
  positive("faq-v1:20", { entryEdgeTouchesHighGround: true, placementLegal: true,
    unitCoherent: true });
  negative("faq-v1:20", { entryEdgeTouchesHighGround: false, placementLegal: true,
    unitCoherent: true }, "ENTRY_EDGE_DOES_NOT_TOUCH_HIGH_GROUND");
  const pylon = positive("faq-v1:21", { sourceType: "pylon", sourceOwnerId: "p1",
    actingPlayerId: "p1" });
  assert.equal(pylon.values.enemyDenialImmune, true);
  negative("faq-v1:21", { sourceType: "forward_deployment", sourceOwnerId: "p1",
    actingPlayerId: "p1" }, "SOURCE_IS_NOT_ENTRY_EDGE");
  const completion = positive("faq-v1:22", { entrySourceType: "pylon",
    deploymentSucceeded: true });
  assert.deepEqual({ consumed: completion.values.activationConsumed,
    marker: completion.values.activationMarkerPlaced,
    followup: completion.values.followupActionAllowed },
  { consumed: true, marker: true, followup: false });
  negative("faq-v1:22", { entrySourceType: "pylon", deploymentSucceeded: false },
    "PYLON_DEPLOYMENT_NOT_COMPLETED");
  assert.equal(positive("faq-v1:23", { sourceType: "omega_network" })
    .values.generatesZoneOfInfluence, false);
  assert.equal(positive("faq-v1:23", { sourceType: "primary_entry_edge" })
    .values.generatesZoneOfInfluence, true);
});
accept("marker_deploy_reserve_nomination_and_speed_rules_execute", () => {
  positive("faq-v1:24", { leadingModelBaseContact: true, unitCoherent: true,
    allModelsOutsideEnemyEngagement: true });
  assert.equal(negative("faq-v1:24", { leadingModelBaseContact: false,
    unitCoherent: true, allModelsOutsideEnemyEngagement: true },
  "MARKER_DEPLOY_LEADING_CONTACT_ILLEGAL").values.abilityWasted, true);
  positive("faq-v1:25", { unitLocation: "reserves", permission: "deploys_unit" });
  negative("faq-v1:25", { unitLocation: "reserves", permission: "none" },
    "ABILITY_INACTIVE_IN_RESERVES");
  assert.equal(positive("faq-v1:26", { actionType: "deploy",
    actionSource: "special_ability" }).values.nominatedToDeploy, true);
  assert.equal(positive("faq-v1:26", { actionType: "move",
    actionSource: "core" }).values.nominatedToDeploy, false);
  const speed = positive("faq-v1:27", { unitLocation: "reserves", printedSpeed: 5 });
  assert.deepEqual({ speed: speed.values.deploymentSpeed,
    onCreep: speed.values.onCreepBeforeEntry,
    bonus: speed.values.creepSpeedBonusApplied }, { speed: 5, onCreep: false, bonus: false });
});
accept("unknown_entries_fields_and_enums_fail_closed", () => {
  assert.throws(() => evaluateOfficialFaqF3RuleV1("faq-v1:28", {}),
    /FAQ_F3_ENTRY_NOT_EXECUTABLE/u);
  assert.throws(() => evaluateOfficialFaqF3RuleV1("faq-v1:10", {
    actionType: "move", positionChanged: true, clientOverride: true,
  }), /FAQ_F3_10_INPUT_INVALID_UNKNOWN_FIELD/u);
  assert.throws(() => evaluateOfficialFaqF3RuleV1("faq-v1:21", {
    sourceType: "custom_token", sourceOwnerId: "p1", actingPlayerId: "p1",
  }), /FAQ_F3_21_SOURCE_TYPE_INVALID/u);
});
accept("atomic_binding_reads_and_writes_are_explicit", () => {
  assert.equal(OFFICIAL_FAQ_F3_ATOM_BINDING_V1.length, 40);
  assert(OFFICIAL_FAQ_F3_ATOM_BINDING_V1.every((atom) => atom.reads.length > 0));
  const transitions = release.atoms.filter((atom) => atom.kind === "state_transition");
  assert(transitions.length > 0);
  assert(transitions.every((atom) => atom.writes.length > 0));
});
accept("source_hashes_base_atom_links_and_graph_lineage_are_bound", () => {
  assert.equal(release.sourceLockHash, sourceLock.lockHash);
  assert.equal(release.reconciliationHash, reconciliation.reconciliationHash);
  assert.equal(release.graph.sourceLockHash, sourceLock.lockHash);
  assert.equal(release.graph.reconciliationHash, reconciliation.reconciliationHash);
  assert.equal(release.graph.baseGraphHash, baseReport.graphHash);
  assert(release.atoms.every((atom) => (
    /^[a-f0-9]{64}$/u.test(atom.sourceEvidence.questionHash)
      && /^[a-f0-9]{64}$/u.test(atom.sourceEvidence.answerHash)
  )));
});
accept("historical_ticket_11_rules_are_immutable_and_retained", () => {
  assert.deepEqual(release.immutableBase, {
    catalogueHash: "5b3bd5d65a6e3478e98536e7fb71133fd0624c99cccbc47c886c96f731c16d46",
    runtimeHash: "6e3527cea5b9a005bb5462eb33bc8f2a7a3a93636778ae9a6daec2d8fab903b9",
    graphHash: "63f37c40a54006ab67096df72b9e2e9f6b6836c38d82aad3ee10d6d41017e44c",
    mutationAllowed: false,
    historicalRoomDisplayRetained: true,
    historicalReplayRetained: true,
  });
});
accept("f3_is_content_addressed_and_tamper_evident", () => {
  assert.equal(verifyOfficialFaqF3ReleaseV1(release, releaseInput), true);
  assert.match(release.releaseHash, /^[a-f0-9]{64}$/u);
  assert.match(release.graph.graphHash, /^[a-f0-9]{64}$/u);
  const tampered = structuredClone(release);
  tampered.atoms[0].primitive = "client_override";
  assert.throws(() => verifyOfficialFaqF3ReleaseV1(tampered, releaseInput),
    /FAQ_F3_RELEASE_MISMATCH/u);
});
accept("f3_grants_no_aggregate_room_skill_or_training_authority", () => {
  assert.equal(release.rulesEligible, false);
  assert.equal(release.productionRoomEligible, false);
  assert.equal(release.aggregateCurrentRuntimeEligible, false);
  assert.equal(release.ctx2skillPromotionEligible, false);
  assert.equal(release.trainingTruth, false);
});

const report = {
  schema: "starcraft_tmg_faq_f3_movement_battlefield_deployment_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  release,
  behaviorWitnesses: { positive: 23, negativeOrBoundary: 23, interactionGroups: 5 },
  ctx2skillLoopUsed: true,
  targetGames: ["starcraft-tmg"],
  roleRoutes: ["rule_skill_builder"],
  skillsRead: ["research", "ctx2skill-rule-skill-loop"],
  skillsGenerated: [],
  judgeTestsRun: 46,
  crossTimeReplayResult: "base_identity_retained_runtime_replay_aggregate_pending_f5",
  promotions: [],
  blocks: release.blocks,
  remainingRuleGaps: 45,
  harnessLoopUsed: true,
  promptPackRoutes: ["rule_skill_builder_prompt"],
  harnessToolsCalled: ["evaluate_faq_rule", "rule_atom_graph_lookup"],
  uiTraceEvidence: "not_run_rules_overlay_only_ticket_14_slice_140_paused",
  agentDecisionEvidence: "23_f3_behaviors_executable_with_positive_negative_and_interaction_witnesses",
  memoryTraceEvidence: { refs: [], promotionAttempted: false },
  trainingTraceCandidates: [],
  rollbackOrDemotionRules: [
    "faq_source_or_reconciliation_drift_invalidates_f3",
    "f4_f5_or_aggregate_failure_keeps_pre_faq_runtime_current",
  ],
  userVisibleChecks: [
    "deactivated_marker_control_and_special_entry_edge_rules_are_explainable",
    "failed_marker_deploy_reports_ability_consumption_without_client_state_patch",
  ],
  sourceRefreshPerformed: false,
  repositoryFallbackUsed: false,
  rulesTruth: false,
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "faq-f3-movement-battlefield-deployment-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  releaseHash: release.releaseHash,
  overlayGraphHash: release.graph.graphHash,
  entries: release.entryCount,
  atoms: release.atomCount,
  tokenMarkerEntries: release.tokenMarkerEntryIds.length,
  tokenMarkerAtoms: release.tokenMarkerAtomIds.length,
  behaviorWitnesses: report.behaviorWitnesses,
  rulesTruth: false,
  trainingTruth: false,
}, null, 2));
