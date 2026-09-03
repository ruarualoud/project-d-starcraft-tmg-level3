#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from "../packages/authoritative-engine/transition-v1.mjs";
import { projectStarcraftTmgBattleWorkbenchV1 } from "../packages/client-domain/battle-workbench-v1.mjs";
import { isStarcraftTmgThreatWorkbenchV1 } from "../packages/client-domain/battle-workbench-threat-v1.mjs";
import { createStarcraftTmgSampleState, loadStarcraftTmgData } from "../../scripts/starcraft-tmg-rules-v0.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const OUTPUT = path.join(ROOT, "build/ticket-14-slice-138-threat-v1/report.json");
const GENERATED_AT = "2026-09-03T14:30:00.000Z";

function assert(condition, message) { if (!condition) throw new Error(message); }

async function main() {
  const checks = [];
  const failures = [];
  async function check(id, operation) {
    try { await operation(); checks.push({ id, passed: true }); }
    catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({ id, passed: false, error: message }); failures.push(`${id}: ${message}`);
    }
  }
  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const state = createStarcraftTmgSampleState(data);
  const roomProjection = {
    room: { roomId: "slice-138-room", stateRevision: 7, stateHash: "a".repeat(64) },
    viewer: { seatKey: "player1" },
    matchBinding: { bindingHash: "b".repeat(64) },
    state,
  };
  const snapshot = projectStarcraftTmgBattleWorkbenchV1({ roomProjection, includeThreat: true });
  const threat = snapshot.threat;

  await check("threat_query_is_hash_and_revision_bound", () => {
    assert(isStarcraftTmgThreatWorkbenchV1(threat, {
      roomId: "slice-138-room", stateRevision: 7, stateHash: "a".repeat(64), matchBindingHash: "b".repeat(64),
    }), "threat binding failed");
  });
  await check("all_required_modes_are_present", () => {
    for (const mode of ["stationary_fire", "move_then_fire", "charge_engagement", "friendly_aggregate", "enemy_aggregate"]) {
      assert(threat.modes.includes(mode), `missing mode ${mode}`);
    }
  });
  await check("each_visible_unit_has_per_weapon_stationary_move_and_charge_regions", () => {
    const active = threat.perUnit.filter((entry) => entry.coverage !== "unknown");
    assert(active.length === 4, `expected four active units, got ${active.length}`);
    assert(active.every((entry) => entry.weapons.length > 0
      && entry.weapons.every((weapon) => weapon.stationaryRegions.length > 0
        && weapon.moveThenAttackRegions.length > 0)
      && entry.charge.regions.length > 0), "mode geometry denominator incomplete");
    assert(threat.perUnit.flatMap((entry) => entry.weapons).some((weapon) => weapon.longRangeChoice), "long-range weapon choice missing");
  });
  await check("current_model_count_selects_split_speed", () => {
    const marine = threat.perUnit.find((entry) => entry.unitId === "player1-marine-0");
    assert(marine.speed.branch === "multi_model" && marine.speed.speedInches === 4, "multi-model split speed wrong");
    const singleState = structuredClone(state);
    const zergling = singleState.pieces.find((piece) => piece.id === "player2-zergling-0");
    zergling.currentModels = 1;
    const single = projectStarcraftTmgBattleWorkbenchV1({ roomProjection: { ...roomProjection, state: singleState }, includeThreat: true })
      .threat.perUnit.find((entry) => entry.unitId === zergling.id);
    assert(single.speed.branch === "single_model" && single.speed.speedInches === 8, "single-model split speed wrong");
  });
  await check("one_to_many_many_to_one_and_side_aggregate_denominators_are_explicit", () => {
    assert(threat.relationships.length === 8, `pair denominator drifted: ${threat.relationships.length}`);
    assert(Object.keys(threat.aggregates.oneToMany).length === 8, "one-to-many index incomplete");
    assert(Object.keys(threat.aggregates.manyToOne).length === 8, "many-to-one index incomplete");
    assert(threat.aggregates.friendly.unitIds.length === 4 && threat.aggregates.enemy.unitIds.length === 4, "side aggregate units incomplete");
    assert(threat.aggregates.friendly.regions.length > 0 && threat.aggregates.enemy.regions.length > 0, "aggregate geometry absent");
  });
  await check("los_terrain_elevation_status_and_upgrade_dependencies_are_visible", () => {
    for (const key of ["lineOfSight", "terrain", "elevation", "statuses", "upgrades", "currentModelCountSpeedBranch"]) {
      assert(threat.dependencies[key], `dependency status missing ${key}`);
    }
    assert(threat.coverage === "partial" && threat.coverageReason.includes("exact legality"), "bounded layer overclaimed exact legality");
  });
  await check("query_neither_rolls_charge_chance_nor_writes_state", () => {
    assert(threat.rollsChance === false && threat.writesAuthority === false, "read query crossed authority boundary");
    assert(threat.perUnit.every((entry) => entry.charge.chance === "d6_charge_distance_not_rolled_by_read_query"), "charge read query rolled chance");
    assert(threat.trainingTruth === false && threat.eligibleForTraining === false, "query became training truth");
  });
  await check("tamper_and_stale_revision_fail_validation", () => {
    assert(!isStarcraftTmgThreatWorkbenchV1({ ...threat, stateRevision: 8 }), "tamper accepted");
    assert(!isStarcraftTmgThreatWorkbenchV1(threat, { stateRevision: 8 }), "stale threat accepted");
  });
  await check("expo_and_battle_lab_mount_real_mode_and_weapon_layer_controls", async () => {
    const [expo, panel, lab, labHtml] = await Promise.all([
      readFile(path.join(ROOT, "apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx"), "utf8"),
      readFile(path.join(ROOT, "apps/starcraft-tmg-expo/components/battlefield/battle-workbench-read-panels.tsx"), "utf8"),
      readFile(path.join(ROOT, "apps/starcraft-tmg-battle-lab/app.mjs"), "utf8"),
      readFile(path.join(ROOT, "apps/starcraft-tmg-battle-lab/index.html"), "utf8"),
    ]);
    for (const source of [expo + panel, lab + labHtml]) {
      for (const marker of ["stationary_fire", "move_then_fire", "charge_engagement", "friendly_aggregate", "enemy_aggregate"]) {
        assert(source.includes(marker), `surface missing threat mode ${marker}`);
      }
    }
    assert(expo.includes("battlefield-authoritative-threat") && lab.includes("data-authoritative-threat-layer"), "map layer rendering absent");
  });

  const reportCore = {
    schemaVersion: "starcraft_tmg_ticket_14_slice_138_threat_report_v1",
    status: failures.length ? "failed" : "passed",
    generatedAt: GENERATED_AT,
    ticket: 14, slice: 138, ticketProgress: "11/16", projectProgress: "13/22",
    assertionsPassed: checks.filter((entry) => entry.passed).length,
    assertionsTotal: checks.length, checks, failures,
    evidence: {
      unitDenominator: threat.perUnit.length,
      activeUnitDenominator: threat.perUnit.filter((entry) => entry.coverage !== "unknown").length,
      relationshipDenominator: threat.relationships.length,
      modes: threat.modes,
      coverage: threat.coverage,
      threatHashShapeVerified: /^[a-f0-9]{64}$/u.test(threat.threatHash),
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"], promptPackRoutes: [],
      harnessToolsCalled: ["read_battle_workbench", "inspect_threat_layers"],
      uiTraceEvidence: "expo_and_battle_lab_mode_weapon_map_layers",
      agentDecisionEvidence: "none_read_only_threat_query", memoryTraceEvidence: "none",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: ["binding_or_hash_mismatch_rejects_layer", "partial_dependencies_never_promote_to_exact"],
      userVisibleChecks: ["stationary", "move_and_fire", "charge", "per_weapon", "one_many", "many_one", "side_aggregates", "coverage"],
    },
    gates: { providerCalled: false, skillGenerated: false, dshRun: false, muzeroDataGenerated: false, selfPlayRun: false, trainingTruth: false },
  };
  const report = { ...reportCore, reportHash: hashStarcraftTmgContract(reportCore) };
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) throw new Error(failures.join("\n"));
  process.stdout.write(`Ticket 14 Slice 138 passed ${report.assertionsPassed}/${report.assertionsTotal}\n`);
  process.stdout.write(`Report hash: ${report.reportHash}\n`);
}

main().catch((error) => { process.stderr.write(`${error.stack || error}\n`); process.exitCode = 1; });
