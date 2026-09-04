#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createOfficialFaqF3ReleaseV1 } from
  "../packages/rule-atoms/official-faq-f3-movement-battlefield-deployment-release-v1.mjs";
import { createOfficialFaqF4ReleaseV1 } from
  "../packages/rule-atoms/official-faq-f4-ability-tactical-keyword-release-v1.mjs";
import { createOfficialFaqF5AggregateReleaseV1 } from
  "../packages/rule-atoms/official-faq-f5-aggregate-release-v1.mjs";
import { createOfficialFaqV1RuleReconciliationV1 } from
  "../packages/rule-atoms/official-faq-v1-rule-reconciliation-v1.mjs";
import { createOfficialFaqV1SourceLockV1 } from
  "../packages/source-data/official-faq-v1-source-lock-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createCurrentOfficialSkillCurriculumV1,
  createCurrentOfficialSkillEvidenceCatalogueV1,
  createCurrentOfficialSkillQuestionTreeV1,
  createCurrentOfficialSkillStagedInputV1,
  verifyCurrentOfficialSkillCurriculumV1,
  verifyCurrentOfficialSkillEvidenceCatalogueV1,
  verifyCurrentOfficialSkillQuestionTreeV1,
  verifyCurrentOfficialSkillStagedInputV1,
} from "../packages/skill-generation-runtime/current-official-evidence-v1.mjs";
import { loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAQ_SOURCE_DIR = path.join(
  ROOT,
  "build/source-intake/official-rules/faq-v1-2026-09-03",
);
const OUTPUT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-164-report.json",
);

async function loadCurrentInputs() {
  const [sourceArtifacts, pdfBytes, rawText, downloadsHtml, baseReportBytes] =
    await Promise.all([
      loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: ROOT }),
      readFile(path.join(FAQ_SOURCE_DIR, "StarCraft-TMG-FAQ_EN.pdf")),
      readFile(path.join(FAQ_SOURCE_DIR, "StarCraft-TMG-FAQ_EN.raw.txt")),
      readFile(path.join(FAQ_SOURCE_DIR, "downloads.html")),
      readFile(path.join(
        ROOT,
        "build/ticket-11-rule-atoms-v1/official-dispute-resolution-rules-rule-slice-v1-report.json",
      )),
    ]);
  const baseReport = JSON.parse(baseReportBytes);
  const sourceLock = createOfficialFaqV1SourceLockV1({ pdfBytes, rawText, downloadsHtml });
  const shared = {
    sourceLock,
    baseCatalogue: baseReport.slice.catalogue,
    baseGraph: baseReport.graph,
    baseRuntimeHash: baseReport.runtimeHash,
  };
  const reconciliation = createOfficialFaqV1RuleReconciliationV1({
    sourceLock,
    currentCatalogue: shared.baseCatalogue,
    currentGraph: shared.baseGraph,
    currentRuntimeHash: shared.baseRuntimeHash,
  });
  const releaseInput = { ...shared, reconciliation };
  const f3Release = createOfficialFaqF3ReleaseV1(releaseInput);
  const f4Release = createOfficialFaqF4ReleaseV1({ ...releaseInput, f3Release });
  const f5 = createOfficialFaqF5AggregateReleaseV1({
    ...releaseInput,
    f3Release,
    f4Release,
  });
  return {
    dataset: sourceArtifacts.dataset,
    baseCatalogue: shared.baseCatalogue,
    currentRulesAggregate: f5.aggregate,
    faqAtoms: [...f3Release.atoms, ...f4Release.atoms, ...f5.f5Release.atoms],
  };
}

const inputs = await loadCurrentInputs();
const catalogue = createCurrentOfficialSkillEvidenceCatalogueV1(inputs);
const curriculum = createCurrentOfficialSkillCurriculumV1({ evidenceCatalogue: catalogue });
const tree = createCurrentOfficialSkillQuestionTreeV1({
  evidenceCatalogue: catalogue,
  curriculum,
});
const checks = [];
async function check(id, callback) {
  try {
    await callback();
    checks.push({ id, passed: true });
  } catch (error) {
    checks.push({ id, passed: false, error: error instanceof Error ? error.message : String(error) });
  }
}

await check("current_official_source_and_rules_inputs_are_hash_verified_without_refresh", () => {
  assert.equal(verifyCurrentOfficialSkillEvidenceCatalogueV1(catalogue), true);
  assert.deepEqual(catalogue.sourceBinding.dataVersions, {
    units: "71", cards: "69", rules: "48",
  });
  assert.equal(catalogue.sourceBinding.sourceRefreshPerformed, false);
});

await check("staged_source_denominator_is_exact_and_excludes_community_and_review_prose", () => {
  assert.deepEqual(catalogue.counts.sourceByType, {
    deployment: 10,
    mission: 10,
    tactical_card: 37,
    unit: 26,
  });
  assert.equal(catalogue.counts.sourceEvidence, 83);
  assert.equal(catalogue.counts.excludedCommunityDisplayOnly, 173);
  assert.equal(catalogue.counts.excludedReviewRequiredRuleProse, 15);
  assert(catalogue.sourceEvidence.every((row) => (
    row.authorityDisposition === "official_current_product_candidate"
  )));
});

await check("current_rules_denominator_contains_1026_base_plus_137_faq_atoms", () => {
  assert.equal(catalogue.counts.ruleEvidence, 1163);
  assert.deepEqual(catalogue.counts.ruleByDisposition, {
    display_only: 114,
    executable: 1049,
  });
  assert.equal(catalogue.ruleEvidence.filter((row) => (
    row.ruleLayer === "base_in_current_faq_composite"
  )).length, 1026);
  assert.equal(catalogue.ruleEvidence.filter((row) => (
    row.ruleLayer === "faq_v1_current_overlay"
  )).length, 137);
});

await check("every_evidence_content_and_locator_is_independently_hash_bound", () => {
  for (const row of [...catalogue.sourceEvidence, ...catalogue.ruleEvidence]) {
    assert.match(row.contentHash, /^[a-f0-9]{64}$/u);
    assert.match(row.locator.locatorHash, /^[a-f0-9]{64}$/u);
    if (row.kind === "current_rule_atom") {
      assert.match(row.rulesReceipt.receiptHash, /^[a-f0-9]{64}$/u);
    }
  }
});

await check("historical_rules_are_display_replay_only_and_base_atoms_use_the_current_receipt", () => {
  assert.equal(catalogue.historicalRulesBoundary.displayRetained, true);
  assert.equal(catalogue.historicalRulesBoundary.replayRetained, true);
  assert.equal(catalogue.historicalRulesBoundary.standaloneCandidateInputAllowed, false);
  assert.equal(catalogue.historicalRulesBoundary.baseAtomsAcceptedOnlyUnderCurrentCompositeReceipt,
    true);
  const base = catalogue.ruleEvidence.find((row) => (
    row.ruleLayer === "base_in_current_faq_composite"
  ));
  assert.equal(base.rulesReceipt.catalogueHash, catalogue.rulesBinding.catalogueHash);
  assert.notEqual(base.rulesReceipt.catalogueHash,
    catalogue.historicalRulesBoundary.catalogueHash);
});

await check("four_family_curriculum_is_registry_driven_and_not_hand_capped", () => {
  assert.equal(verifyCurrentOfficialSkillCurriculumV1(curriculum, catalogue), true);
  assert.deepEqual(curriculum.counts.byFamily, {
    how_to_play: 1163,
    mission: 10,
    faction: 6,
    matchup: 36,
  });
  assert.equal(curriculum.counts.tasks, 1215);
  assert.equal(curriculum.counts.generationEligible, 1101);
  assert.equal(curriculum.counts.blocked, 114);
  assert.equal(curriculum.generationPolicy.fixedSmallLimit, null);
});

await check("six_current_faction_archetypes_expand_to_all_directed_matchups_including_mirrors", () => {
  const factions = curriculum.tasks.filter((task) => task.family === "faction");
  assert.deepEqual(factions.map((task) => task.label).sort(), [
    "Daelaam",
    "Kerrigan's Swarm",
    "Khalai",
    "Raynor's Raiders",
    "Terran Armed Forces",
    "Zerg Swarm",
  ]);
  const matchups = curriculum.tasks.filter((task) => task.family === "matchup");
  assert.equal(matchups.length, factions.length ** 2);
  assert.equal(matchups.filter((task) => task.mirror).length, factions.length);
});

await check("question_tree_accounts_for_every_family_and_task_node", () => {
  assert.equal(verifyCurrentOfficialSkillQuestionTreeV1(tree, curriculum, catalogue), true);
  assert.deepEqual(tree.counts, {
    roots: 1,
    familyNodes: 4,
    taskNodes: 1215,
    totalNodes: 1220,
    generationEligibleTaskNodes: 1101,
    blockedTaskNodes: 114,
  });
});

await check("how_to_play_materialization_stages_one_exact_rule_atom_only", () => {
  const task = curriculum.tasks.find((row) => (
    row.family === "how_to_play" && row.generationEligible
  ));
  const staged = createCurrentOfficialSkillStagedInputV1({
    evidenceCatalogue: catalogue,
    curriculum,
    taskId: task.taskId,
  });
  assert.equal(verifyCurrentOfficialSkillStagedInputV1(staged), true);
  assert.equal(staged.evidence.length, 1);
  assert.equal(staged.evidence[0].kind, "current_rule_atom");
});

await check("mission_materialization_includes_exact_mission_compatible_maps_and_rules", () => {
  const taskId = "mission:faction_cards:mission_hold_position";
  const staged = createCurrentOfficialSkillStagedInputV1({
    evidenceCatalogue: catalogue,
    curriculum,
    taskId,
  });
  assert.equal(verifyCurrentOfficialSkillStagedInputV1(staged), true);
  assert.equal(staged.evidence.filter((row) => row.recordType === "mission").length, 1);
  const maps = staged.evidence.filter((row) => row.recordType === "deployment");
  assert.equal(maps.length, 5);
  assert(maps.every((row) => row.content.gameSize === "Standard"));
  assert(staged.evidence.some((row) => row.kind === "current_rule_atom"));
});

await check("faction_materialization_uses_archetype_parent_roster_cards_and_current_rules", () => {
  const staged = createCurrentOfficialSkillStagedInputV1({
    evidenceCatalogue: catalogue,
    curriculum,
    taskId: "faction:tactical_cards:kerrigan_s_swarm",
  });
  assert.equal(verifyCurrentOfficialSkillStagedInputV1(staged), true);
  assert(staged.evidence.some((row) => row.locator.recordKey === "army_units:kerrigan"));
  assert(staged.evidence.some((row) => row.locator.recordKey === "tactical_cards:malignant_creep"));
  assert(staged.evidence.some((row) => row.kind === "current_rule_atom"));
});

await check("matchup_materialization_is_directed_and_contains_both_archetypes", () => {
  const staged = createCurrentOfficialSkillStagedInputV1({
    evidenceCatalogue: catalogue,
    curriculum,
    taskId: "matchup:tactical_cards:raynor_s_raiders->tactical_cards:kerrigan_s_swarm",
  });
  assert.equal(verifyCurrentOfficialSkillStagedInputV1(staged), true);
  assert(staged.evidence.some((row) => row.locator.recordKey === "tactical_cards:raynor_s_raiders"));
  assert(staged.evidence.some((row) => row.locator.recordKey === "tactical_cards:kerrigan_s_swarm"));
});

await check("display_only_rule_tasks_are_visible_but_cannot_be_materialized", () => {
  const blocked = curriculum.tasks.find((row) => row.blockReason === "rule_atom_display_only");
  assert(blocked);
  assert.throws(() => createCurrentOfficialSkillStagedInputV1({
    evidenceCatalogue: catalogue,
    curriculum,
    taskId: blocked.taskId,
  }), /CURRENT_OFFICIAL_SKILL_TASK_NOT_GENERATION_ELIGIBLE/u);
});

await check("unknown_task_and_hash_tampering_fail_closed", () => {
  assert.throws(() => createCurrentOfficialSkillStagedInputV1({
    evidenceCatalogue: catalogue,
    curriculum,
    taskId: "mission:not_registered",
  }), /CURRENT_OFFICIAL_SKILL_TASK_NOT_FOUND/u);
  const tampered = structuredClone(catalogue);
  tampered.sourceEvidence[0].content.name = "tampered";
  assert.throws(() => verifyCurrentOfficialSkillEvidenceCatalogueV1(tampered),
    /CURRENT_OFFICIAL_SKILL_EVIDENCE_HASH_INVALID/u);
});

await check("staged_worker_capabilities_are_read_only_candidate_only_and_offline", () => {
  const task = curriculum.tasks.find((row) => row.family === "mission");
  const staged = createCurrentOfficialSkillStagedInputV1({
    evidenceCatalogue: catalogue,
    curriculum,
    taskId: task.taskId,
  });
  assert.deepEqual(staged.capabilities, {
    readStagedEvidence: true,
    emitCandidateSkillMaximum: 1,
    network: false,
    sourceRegistry: false,
    mutableRulesRuntime: false,
    room: false,
    onlineAgent: false,
    memoryWrite: false,
    skillPublish: false,
    trainingWrite: false,
  });
  assert.equal("recordsByKey" in staged, false);
  assert.equal(staged.candidateAuthority, "unreviewed_only");
  assert.equal(staged.trainingTruth, false);
});

const failures = checks.filter((row) => !row.passed);
const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_164_current_official_skill_evidence_report_v1",
  generatedAt: "2026-09-04T13:00:00.000Z",
  ticket: 17,
  slice: 164,
  ok: failures.length === 0,
  checks,
  failures,
  evidence: {
    catalogueHash: catalogue.catalogueHash,
    curriculumHash: curriculum.curriculumHash,
    questionTreeHash: tree.treeHash,
    sourceEvidence: catalogue.counts.sourceEvidence,
    ruleEvidence: catalogue.counts.ruleEvidence,
    taskCount: curriculum.counts.tasks,
    generationEligibleTasks: curriculum.counts.generationEligible,
    blockedTasks: curriculum.counts.blocked,
    questionTreeNodes: tree.counts.totalNodes,
    providerCalls: 0,
    dshInstalled: false,
    dshRuns: 0,
    candidates: 0,
    promotions: 0,
    sourceRefreshPerformed: false,
    trainingTruth: false,
  },
  offlineSkillEvolution: {
    sourceBoundary: "command_center_71_69_48_plus_current_official_faq_v1_rules_chain",
    teachArtifactsGenerated: 0,
    questionTreeNodes: tree.counts.totalNodes,
    candidateBundles: 0,
    mementoCandidates: 0,
    skillOptPatches: 0,
    heldOutScenariosRun: 0,
    completeGameAbRuns: 0,
    humanReviews: 0,
  },
  ctx2skill: {
    ctx2skillLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    roleRoutes: ["rule_skill_builder"],
    skillsRead: 0,
    skillsGenerated: 0,
    judgeTestsRun: checks.length,
    crossTimeReplayResult: "not_run_curriculum_only",
    promotions: 0,
    blocks: [
      "teach_ctx2skill_role_graph_not_implemented_until_slice_165",
      "os_isolation_not_proven_until_slice_166",
      "dsh_not_installed_until_slice_167",
      "paired_generation_not_authorized_until_slice_170",
    ],
    remainingRuleGaps: [],
  },
  harness: {
    harnessLoopUsed: true,
    targetGames: ["starcraft-tmg"],
    promptPackRoutes: ["rule_skill_builder_prompt"],
    harnessToolsCalled: [],
    uiTraceEvidence: null,
    agentDecisionEvidence: null,
    memoryTraceEvidence: { refs: [], writes: 0 },
    trainingTraceCandidates: 0,
    rollbackOrDemotionRules: [
      "source_rules_or_locator_hash_drift_invalidates_the_staged_input",
      "display_only_atoms_cannot_seed_generation",
      "community_or_review_required_prose_cannot_enter_current_evidence",
      "large_scale_production_remains_unapproved",
    ],
    userVisibleChecks: [],
  },
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exitCode = 1;
