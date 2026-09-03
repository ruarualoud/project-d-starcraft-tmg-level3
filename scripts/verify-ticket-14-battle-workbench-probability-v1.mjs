#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { hashStarcraftTmgContract } from "../packages/authoritative-engine/transition-v1.mjs";
import { isStarcraftTmgProbabilityWorkbenchV1 } from "../packages/client-domain/battle-workbench-probability-v1.mjs";
import { projectStarcraftTmgBattleWorkbenchV1 } from "../packages/client-domain/battle-workbench-v1.mjs";
import { createStarcraftTmgSampleState, loadStarcraftTmgData } from "../../scripts/starcraft-tmg-rules-v0.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const OUTPUT = path.join(ROOT, "build/ticket-14-slice-139-probability-v1/report.json");
const GENERATED_AT = "2026-09-03T15:00:00.000Z";
function assert(condition, message) { if (!condition) throw new Error(message); }

async function main() {
  const checks = []; const failures = [];
  async function check(id, operation) {
    try { await operation(); checks.push({ id, passed: true }); }
    catch (error) { const message = error instanceof Error ? error.message : String(error); checks.push({ id, passed: false, error: message }); failures.push(`${id}: ${message}`); }
  }
  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const state = createStarcraftTmgSampleState(data);
  const roomProjection = {
    room: { roomId: "slice-139-room", stateRevision: 9, stateHash: "c".repeat(64) },
    viewer: { seatKey: "player1" }, matchBinding: { bindingHash: "d".repeat(64) }, state,
  };
  const probability = projectStarcraftTmgBattleWorkbenchV1({ roomProjection, includeProbability: true }).probability;

  await check("probability_query_is_hash_revision_and_match_bound", () => {
    assert(isStarcraftTmgProbabilityWorkbenchV1(probability, { roomId: "slice-139-room", stateRevision: 9, stateHash: "c".repeat(64), matchBindingHash: "d".repeat(64) }), "binding invalid");
  });
  await check("one_to_one_one_to_many_many_to_one_and_matrix_modes_are_present", () => {
    assert(["one_to_one", "one_to_many", "many_to_one", "matrix"].every((mode) => probability.modes.includes(mode)), "mode denominator incomplete");
    assert(probability.rows.length > 4 && probability.matrix.length === probability.rows.length, "matrix rows incomplete");
    assert(Object.keys(probability.oneToMany).length === 4 && Object.keys(probability.manyToOne).length === 4, "pair indexes incomplete");
  });
  await check("every_supported_profile_has_an_exact_normalized_finite_d6_distribution", () => {
    assert(probability.rows.every((row) => row.result.mathematicalCoverage === "exact"), "finite profile math not exact");
    for (const row of probability.rows) {
      const total = row.result.outcomes.reduce((sum, entry) => sum + entry.probability, 0);
      assert(Math.abs(total - 1) < 1e-10, `distribution not normalized: ${row.queryId}`);
      assert(row.result.chanceTicket.enumeration === "exact_dynamic_finite_d6_distribution"
        && row.result.chanceTicket.totalDice === (2 * row.result.hit.dice) + 1, "ChanceTicket lineage missing");
    }
  });
  await check("hit_armour_surge_damage_and_single_model_casualty_are_derived", () => {
    const marineVsRoach = probability.rows.find((row) => row.attackerUnitId === "player1-marine-0" && row.targetUnitId === "player2-roach-1");
    assert(marineVsRoach.result.hit.threshold === 3 && marineVsRoach.result.armour.threshold === 3, "threshold parse drifted");
    assert(Math.abs(marineVsRoach.result.expectedDamage - (4 / 9)) < 1e-10, "exact expected damage drifted");
    const singleState = structuredClone(state);
    const roach = singleState.pieces.find((piece) => piece.id === "player2-roach-1");
    roach.currentModels = 1;
    const singleRows = projectStarcraftTmgBattleWorkbenchV1({ roomProjection: { ...roomProjection, state: singleState }, includeProbability: true }).probability.rows;
    const row = singleRows.find((entry) => entry.attackerUnitId === "player1-marine-0" && entry.targetUnitId === roach.id);
    assert(row.result.casualtyThreshold === 4 && typeof row.result.casualtyProbability === "number", "single-model casualty probability missing");
  });
  await check("unresolved_keywords_statuses_and_multi_model_allocation_are_explicit", () => {
    assert(probability.coverage === "partial", "rules coverage overclaimed exact");
    assert(probability.rows.some((row) => row.result.unresolved.includes("multi_model_damage_allocation_and_casualty_choice")), "allocation caveat missing");
    assert(probability.rows.every((row) => row.assumptions.includes("no_unlisted_modifier_is_assumed")), "assumption ledger missing");
  });
  await check("legacy_beta_execution_remains_disabled_and_query_is_non_mutating", () => {
    assert(probability.legacyBetaCalculatorEnabled === false && probability.executionAuthority === false
      && probability.writesAuthority === false && probability.rollsChance === false, "legacy/client execution leaked");
    assert(probability.trainingTruth === false && probability.eligibleForTraining === false, "probability became training truth");
  });
  await check("tamper_and_stale_revision_fail_closed", () => {
    assert(!isStarcraftTmgProbabilityWorkbenchV1({ ...probability, coverage: "exact" }), "tamper accepted");
    assert(!isStarcraftTmgProbabilityWorkbenchV1(probability, { stateRevision: 10 }), "stale result accepted");
  });
  await check("expo_and_battle_lab_expose_contextual_probability_without_a_seventh_panel", async () => {
    const [panel, lab, labHtml] = await Promise.all([
      readFile(path.join(ROOT, "apps/starcraft-tmg-expo/components/battlefield/battle-workbench-read-panels.tsx"), "utf8"),
      readFile(path.join(ROOT, "apps/starcraft-tmg-battle-lab/app.mjs"), "utf8"),
      readFile(path.join(ROOT, "apps/starcraft-tmg-battle-lab/index.html"), "utf8"),
    ]);
    assert(panel.includes("Current-rules probability") && panel.includes("Open matchup probability"), "Expo contextual sheet missing");
    assert(lab.includes("Current-rules matchup probability"), "Battle Lab probability missing");
    assert(!labHtml.includes('data-detail-panel="probability"'), "probability incorrectly became a seventh panel");
  });

  const reportCore = {
    schemaVersion: "starcraft_tmg_ticket_14_slice_139_probability_report_v1", status: failures.length ? "failed" : "passed",
    generatedAt: GENERATED_AT, ticket: 14, slice: 139, ticketProgress: "12/16", projectProgress: "13/22",
    assertionsPassed: checks.filter((entry) => entry.passed).length, assertionsTotal: checks.length, checks, failures,
    evidence: { matrixRows: probability.rows.length, mathematicalExactRows: probability.rows.filter((row) => row.result.mathematicalCoverage === "exact").length, rulesExactRows: probability.rows.filter((row) => row.coverage === "exact").length, rulesPartialRows: probability.rows.filter((row) => row.coverage === "partial").length, probabilityHashShapeVerified: /^[a-f0-9]{64}$/u.test(probability.probabilityHash) },
    harness: { harnessLoopUsed: true, targetGames: ["starcraft-tmg"], promptPackRoutes: [], harnessToolsCalled: ["read_battle_workbench", "inspect_matchup_probability"], uiTraceEvidence: "unit_and_threat_contextual_probability_sheet", agentDecisionEvidence: "none_read_only_probability", memoryTraceEvidence: "none", trainingTraceCandidates: [], rollbackOrDemotionRules: ["hash_or_binding_mismatch_rejects_result", "unresolved_modifier_demotes_rules_coverage"], userVisibleChecks: ["one_one", "one_many", "many_one", "matrix", "assumptions", "chance_ticket", "coverage"] },
    gates: { providerCalled: false, skillGenerated: false, dshRun: false, muzeroDataGenerated: false, selfPlayRun: false, trainingTruth: false },
  };
  const report = { ...reportCore, reportHash: hashStarcraftTmgContract(reportCore) };
  await mkdir(path.dirname(OUTPUT), { recursive: true }); await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) throw new Error(failures.join("\n"));
  process.stdout.write(`Ticket 14 Slice 139 passed ${report.assertionsPassed}/${report.assertionsTotal}\nReport hash: ${report.reportHash}\n`);
}
main().catch((error) => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
