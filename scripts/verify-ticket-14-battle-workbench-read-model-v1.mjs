#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgAuthoritativeEngine, hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createInMemoryStarcraftTmgAuthoritativeTransportAdapter } from
  "../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import { projectStarcraftTmgBattleLabObservabilityV1 } from
  "../packages/client-domain/battle-lab-observability-v1.mjs";
import { isStarcraftTmgBattleWorkbenchSnapshotV1 } from
  "../packages/client-domain/battle-workbench-v1.mjs";
import { createStarcraftTmgClientDomain } from
  "../packages/client-domain/client-domain-v1.mjs";
import { createInMemoryStarcraftTmgLifecycleAdapter } from
  "../packages/client-domain/lifecycle-adapters-v1.mjs";
import { createInMemoryStarcraftTmgProjectionStoreAdapter } from
  "../packages/client-domain/projection-store-adapters-v1.mjs";
import { resolveStarcraftTmgBattlefieldUnitMediaV1 } from
  "../packages/client-domain/battlefield-media-catalog-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import { createStarcraftTmgSampleState, loadStarcraftTmgData } from
  "../../scripts/starcraft-tmg-rules-v0.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const OUTPUT = path.join(ROOT, "build/ticket-14-slice-137-battle-workbench-v1/report.json");
const OCCURRED_AT = "2026-09-03T14:00:00.000Z";
const ROOM_ID = "ticket-14-slice-137-room";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function idFactory() {
  let sequence = 0;
  return (kind) => `${kind}-slice137-${++sequence}`;
}

async function main() {
  const checks = [];
  const failures = [];
  async function check(id, operation) {
    try {
      await operation();
      checks.push({ id, passed: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({ id, passed: false, error: message });
      failures.push(`${id}: ${message}`);
    }
  }

  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const state = createStarcraftTmgSampleState(data);
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const roomRuntime = createStarcraftTmgRoomRuntime({ authorityEngine: engine, now: () => OCCURRED_AT });
  const created = await roomRuntime.createRoom({
    roomId: ROOM_ID,
    gameId: "starcraft-tmg",
    surfaceMode: "classic",
    initialStateAuthority: {
      source: "server_factory",
      state,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({ source: "slice137", state }),
    },
    serverSeatPlan: [{ label: "host", seatKey: "player1", roleMode: "player", principalType: "human" }],
  });
  assert(created.ok, "fixture room creation failed");
  const seatToken = created.credentials.host.seatToken;
  const baseTransport = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime });
  const operations = [];
  const client = createStarcraftTmgClientDomain({
    transport: { execute: async (request) => {
      operations.push(request.operation);
      return baseTransport.execute(request);
    } },
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
    now: () => OCCURRED_AT,
    createId: idFactory(),
  });
  await client.bootstrap({ route: { roomId: ROOM_ID }, principal: { seatToken }, surface: "expo_web", locale: "zh-CN" });
  const loaded = await client.dispatch({ type: "load_battle_workbench" });
  const snapshot = client.read().battleWorkbench;

  await check("snapshot_is_hash_revision_room_state_and_match_binding_bound", () => {
    assert(loaded.ok, `workbench load failed: ${loaded.rejection?.code || "unknown"}`);
    assert(isStarcraftTmgBattleWorkbenchSnapshotV1(snapshot, {
      roomId: ROOM_ID,
      stateRevision: client.read().roomProjection.room.stateRevision,
      stateHash: client.read().roomProjection.room.stateHash,
      matchBindingHash: client.read().roomProjection.matchBinding.bindingHash,
    }), "snapshot binding validation failed");
  });

  await check("all_eight_units_expose_live_inspection_without_catalogue_fallback", () => {
    assert(snapshot.units.length === 8, `expected 8 units, found ${snapshot.units.length}`);
    assert(snapshot.units.every((unit) => Array.isArray(unit.models)
      && Array.isArray(unit.weapons) && Array.isArray(unit.upgrades)
      && Array.isArray(unit.statuses)), "unit inspection section is incomplete");
    assert(snapshot.units.some((unit) => unit.selectedUpgrades.length > 0), "installed upgrade projection missing");
    assert(snapshot.generatedFrom === "viewer_scoped_authoritative_projection", "snapshot used a catalogue fallback");
  });

  await check("scenario_deployment_reserve_and_current_score_are_one_read_model", () => {
    assert(snapshot.scenario.mission?.name === state.mission.name, "scenario mission missing");
    assert(snapshot.scenario.map.widthInches === 54 && snapshot.scenario.map.heightInches === 36, "map size missing");
    assert(snapshot.deployment.battlefield.length === 4, "battlefield unit denominator drifted");
    assert(snapshot.deployment.undeployed.length === 4, "undeployed unit denominator drifted");
    assert(snapshot.scoreboard.length === 2 && snapshot.scoreboard.every((entry) => entry.score === 0), "scoreboard drifted");
  });

  await check("future_sections_fail_visible_as_not_loaded_instead_of_guessing", () => {
    for (const key of ["probability", "tokenMarkerActions", "scoreForecast", "rulesQuickView"]) {
      assert(snapshot[key]?.coverage === "not_loaded", `${key} did not fail visibly`);
    }
  });

  await check("public_observer_gets_viewer_scoped_snapshot_without_legal_space", async () => {
    const result = await roomRuntime.readBattleWorkbench({ roomId: ROOM_ID });
    assert(result.ok && result.snapshot.viewerSideKey === null, "public observer scope was not preserved");
    assert(result.snapshot.authority.legalSpaceHash === null, "private LegalSpace leaked to public observer");
    assert(JSON.stringify(result.snapshot).includes(seatToken) === false, "SeatGrant leaked into snapshot");
  });

  await check("tampered_snapshot_is_rejected_before_client_publication", async () => {
    const hostile = createStarcraftTmgClientDomain({
      transport: { execute: async (request) => {
        const result = await baseTransport.execute(request);
        if (request.operation !== "read_battle_workbench") return result;
        return { ...result, snapshot: { ...result.snapshot, stateHash: "0".repeat(64) } };
      } },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
      now: () => OCCURRED_AT,
      createId: idFactory(),
    });
    await hostile.bootstrap({ route: { roomId: ROOM_ID }, principal: { seatToken }, surface: "battle_lab", locale: "en" });
    const result = await hostile.dispatch({ type: "load_battle_workbench" });
    assert(!result.ok && result.rejection.code === "BATTLE_WORKBENCH_RESPONSE_INVALID", "tampered snapshot published");
    assert(hostile.read().battleWorkbench === null, "tampered workbench reached view");
  });

  await check("battle_lab_and_expo_share_the_same_snapshot_inside_four_operation_domain", () => {
    const lab = projectStarcraftTmgBattleLabObservabilityV1({ clientView: client.read() });
    assert(lab.workbench.snapshotHash === snapshot.snapshotHash, "Battle Lab workbench diverged");
    assert(operations.includes("read_battle_workbench"), "workbench bypassed authoritative transport");
  });

  await check("six_panel_shell_and_authoritative_write_boundary_are_visible", async () => {
    const [expo, panels, labHtml] = await Promise.all([
      readFile(path.join(ROOT, "apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx"), "utf8"),
      readFile(path.join(ROOT, "apps/starcraft-tmg-expo/components/battlefield/battle-workbench-read-panels.tsx"), "utf8"),
      readFile(path.join(ROOT, "apps/starcraft-tmg-battle-lab/index.html"), "utf8"),
    ]);
    for (const label of ["Unit", "Actions", "Threat", "Battle status", "Markers", "Referee"]) {
      assert(`${expo}\n${panels}`.includes(label) && labHtml.includes(label), `six-panel parity missing ${label}`);
    }
    assert(panels.includes("never estimates or mutates rules on the client"), "read/write authority boundary missing");
  });

  await check("user_authorized_public_media_channel_preserves_provenance_caveat", async () => {
    const media = resolveStarcraftTmgBattlefieldUnitMediaV1("marine", { releaseChannel: "public_user_authorized" });
    const provenance = await readFile(path.join(ROOT, "content/client/battlefield-media-provenance-v1.mjs"), "utf8");
    assert(media.releaseChannel === "public_user_authorized" && media.portraitAnimated && media.voice, "authorized public media unavailable");
    assert(media.authorizationBasis === "user_authorized_project_publication_2026-09-03", "authorization basis missing");
    assert(media.independentThirdPartyRightsReviewCompleted === false
      && provenance.includes("legalLicenseDeterminationMadeByProject: false"), "rights caveat was overclaimed");
  });

  await check("workbench_is_read_only_and_never_training_truth", () => {
    assert(snapshot.authority.readOnly && !snapshot.authority.clientMutationAllowed, "client mutation authority leaked");
    assert(!snapshot.trainingTruth && !snapshot.eligibleForTraining, "workbench became training truth");
  });

  const reportCore = {
    schemaVersion: "starcraft_tmg_ticket_14_slice_137_report_v1",
    status: failures.length ? "failed" : "passed",
    generatedAt: OCCURRED_AT,
    ticket: 14,
    slice: 137,
    ticketProgress: "10/16",
    projectProgress: "13/22",
    assertionsPassed: checks.filter((entry) => entry.passed).length,
    assertionsTotal: checks.length,
    checks,
    failures,
    evidence: {
      unitCount: snapshot.units.length,
      battlefieldUnitCount: snapshot.deployment.battlefield.length,
      reserveUnitCount: snapshot.deployment.reserve.length,
      undeployedUnitCount: snapshot.deployment.undeployed.length,
      snapshotHashShapeVerified: /^[a-f0-9]{64}$/u.test(snapshot.snapshotHash),
      releaseChannel: "public_user_authorized",
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: [],
      harnessToolsCalled: ["read_room", "read_battle_workbench"],
      uiTraceEvidence: "expo_and_battle_lab_six_panel_snapshot_projection",
      agentDecisionEvidence: "none_ticket_14_read_model_only",
      memoryTraceEvidence: "none",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: ["hash_or_revision_mismatch_rejects_snapshot", "unknown_sections_remain_not_loaded"],
      userVisibleChecks: ["six_panel_shell", "unit_inspector", "scenario_deployment_score", "coverage_labels"],
    },
    gates: {
      providerCalled: false, skillGenerated: false, dshRun: false,
      muzeroDataGenerated: false, selfPlayRun: false, trainingTruth: false,
    },
  };
  const report = { ...reportCore, reportHash: hashStarcraftTmgContract(reportCore) };
  await mkdir(path.dirname(OUTPUT), { recursive: true });
  await writeFile(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) throw new Error(failures.join("\n"));
  process.stdout.write(`Ticket 14 Slice 137 passed ${report.assertionsPassed}/${report.assertionsTotal}\n`);
  process.stdout.write(`Snapshot hash: ${snapshot.snapshotHash}\n`);
  process.stdout.write(`Report hash: ${report.reportHash}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
