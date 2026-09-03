#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createStarcraftTmgBattleLabRuntime } from
  "../apps/starcraft-tmg-battle-lab/battle-lab-runtime-v1.mjs";
import { STARCRAFT_TMG_BATTLE_LAB_MIGRATION_V1 as binding } from
  "../content/client/battle-lab-migration-v1.mjs";
import {
  projectStarcraftTmgBattlefieldPresentationV1,
} from "../packages/client-domain/battlefield-presentation-v1.mjs";
import {
  projectStarcraftTmgBattleLabObservabilityV1,
  projectStarcraftTmgSharedOperationalViewV1,
} from "../packages/client-domain/battle-lab-observability-v1.mjs";
import {
  createInMemoryStarcraftTmgAuthoritativeTransportAdapter,
} from "../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import {
  createStarcraftTmgClientDomain,
  STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE,
} from "../packages/client-domain/client-domain-v1.mjs";
import {
  createInMemoryStarcraftTmgLifecycleAdapter,
} from "../packages/client-domain/lifecycle-adapters-v1.mjs";
import {
  createInMemoryStarcraftTmgProjectionStoreAdapter,
} from "../packages/client-domain/projection-store-adapters-v1.mjs";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgRoomRuntime } from
  "../packages/room-runtime/in-memory-room-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(ROOT, "..");
const BUILD_ROOT = path.join(
  ROOT,
  "build/ticket-14-slice-135-battle-lab-migration-v1",
);
const REPORT_PATH = path.join(BUILD_ROOT, "report.json");
const PREVIEW_PATH = path.join(BUILD_ROOT, "preview.html");
const OCCURRED_AT = "2026-09-03T12:00:00.000Z";
const ROOM_ID = "ticket-14-slice-135-room";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function deterministicIds(scope) {
  let sequence = 0;
  return (kind) => `${kind}-${scope}-${String(sequence += 1).padStart(4, "0")}`;
}

function safeAgentTraceProjection(roomId) {
  return {
    schemaVersion: "starcraft_tmg_agent_trace_projection_v1",
    roomId,
    status: "available",
    generatedAt: OCCURRED_AT,
    traces: [{
      traceId: "trace-slice-135-1",
      gameId: "starcraft-tmg",
      roomId,
      roleMode: "opponent",
      mode: "user_vs_agent",
      promptPack: "opponent_prompt",
      harnessVersion: "starcraft_tmg_character_session_v1",
      agentVersion: "injected-verifier-no-provider",
      providerStatus: "not_called",
      harnessToolsCalled: ["read_board_state", "list_legal_actions", "preview_action"],
      ruleSkillRefHashes: ["a".repeat(64)],
      memoryRefHashes: ["b".repeat(64)],
      decision: {
        candidateId: "candidate-hold",
        actionType: "hold",
        legalSpaceHash: "c".repeat(64),
        previewId: "preview-redacted-reference",
        selectedReasonCodes: ["legal", "position_preserved"],
        alternativeCount: 3,
      },
      confirmationRequired: true,
      occurredAt: OCCURRED_AT,
      eligibleForTraining: false,
      reviewStatus: "raw",
      trainingTruth: false,
    }],
    trainingTruth: false,
  };
}

function previewHtml(report) {
  const rows = report.checks.map((entry) => (
    `<li><b>${entry.passed ? "PASS" : "FAIL"}</b><span>${entry.id}</span></li>`
  )).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ticket 14 Slice 135</title><style>
:root{color-scheme:dark;font-family:ui-sans-serif,system-ui;background:#050a10;color:#dbeafe}body{margin:0;padding:32px;background:radial-gradient(circle at 12% 0,#12374b,#050a10 48%)}main{max-width:1180px;margin:auto}.status{color:#67e8f9;letter-spacing:.12em;text-transform:uppercase}.flow{display:grid;grid-template-columns:1fr auto 1.2fr auto 1fr;gap:12px;align-items:center;margin:28px 0}.box{min-height:132px;padding:18px;border:1px solid #28566a;border-radius:12px;background:#0b1823}.shared{border-color:#67e8f9;box-shadow:0 0 28px #22d3ee22}.arrow{font-size:24px;color:#67e8f9}code{color:#a5f3fc;overflow-wrap:anywhere}ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(310px,1fr));gap:8px;padding:0}li{list-style:none;display:flex;gap:10px;padding:10px;border:1px solid #25485a;border-radius:8px;background:#0b1823}li b{color:#86efac;font-size:.75rem}</style></head>
<body><main><p class="status">${report.status} · ${report.assertionsPassed}/${report.assertionsTotal}</p>
<h1>One authoritative client domain, two product surfaces</h1><div class="flow">
<div class="box"><b>Expo Web / Native</b><p>player product</p><p><code>${report.evidence.sharedViewHash}</code></p></div><div class="arrow">↔</div>
<div class="box shared"><b>Client Domain + shared battlefield projection</b><p>room · LegalSpace · Preview · Confirm · Apply · Replay</p><p>No whole-state or drag authority.</p></div><div class="arrow">↔</div>
<div class="box"><b>Battle Lab</b><p>observer · Referee · Agent trace</p><p>safe read projection; Ticket 15 owns live Agent sessions.</p></div></div>
<ul>${rows}</ul></main></body></html>`;
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

  const paths = {
    app: "apps/starcraft-tmg-battle-lab/app.mjs",
    html: "apps/starcraft-tmg-battle-lab/index.html",
    styles: "apps/starcraft-tmg-battle-lab/styles.css",
    runtime: "apps/starcraft-tmg-battle-lab/battle-lab-runtime-v1.mjs",
    sharedBoard: "packages/client-domain/battlefield-presentation-v1.mjs",
    sharedBoardTypes: "packages/client-domain/battlefield-presentation-v1.d.mts",
    observability: "packages/client-domain/battle-lab-observability-v1.mjs",
    expoFacade: "apps/starcraft-tmg-expo/lib/level3/battlefield-presentation-v1.ts",
    expoWorkspace: "apps/starcraft-tmg-expo/components/battlefield/authoritative-battle-workspace.tsx",
  };
  const sources = Object.fromEntries(await Promise.all(Object.entries(paths).map(
    async ([key, relative]) => [key, await readFile(path.join(ROOT, relative), "utf8")],
  )));
  const legacyApp = await readFile(path.join(PROJECT_ROOT, "starcraft-tmg-local/app.js"), "utf8");
  const legacyServer = await readFile(path.join(PROJECT_ROOT, "scripts/serve-starcraft-tmg-local.mjs"), "utf8");

  await check("slice_binding_is_hash_sealed_with_all_promotion_gates_closed", () => {
    const { bindingHash, ...body } = binding;
    assert(bindingHash === hashStarcraftTmgContract(body), "binding hash drifted");
    assert(Object.values(binding.promotion).every((value) => value === false), "promotion gate widened");
    assert(binding.delivery.actualBrowserRuntimeVerified === false, "Slice 135 overclaimed browser evidence");
  });

  await check("battle_lab_runtime_exposes_exactly_the_shared_four_operations", () => {
    const runtime = createStarcraftTmgBattleLabRuntime({
      transport: { execute: async () => ({ ok: false, reason: "EXPECTED" }) },
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter(),
    });
    assert(Object.keys(runtime).sort().join("/")
      === [...STARCRAFT_TMG_CLIENT_DOMAIN_INTERFACE].sort().join("/"), "runtime interface widened");
  });

  await check("expo_and_battle_lab_import_one_shared_battlefield_projector", () => {
    assert(sources.expoFacade.includes("packages/client-domain/battlefield-presentation-v1.mjs"), "Expo facade did not use shared projector");
    assert(sources.app.includes('from "./battle-lab-runtime-v1.mjs"'), "Battle Lab did not use its domain runtime");
    assert(sources.observability.includes('from\n  "./battlefield-presentation-v1.mjs"'), "Battle Lab observability did not use shared projector");
    assert(!sources.expoFacade.includes("function pointFrom")
      && !sources.app.includes("function projectStarcraftTmgBattlefieldPresentationV1"), "surface-local projector remains");
  });

  await check("tracked_battle_lab_has_distinct_room_board_referee_agent_and_harness_panels", () => {
    for (const marker of [
      "Authoritative battlefield", "Referee projection", "Agent trace projection",
      "Legal actions and preview", "Harness contract",
    ]) assert(sources.html.includes(marker), `missing panel: ${marker}`);
  });

  await check("battle_lab_has_no_direct_fetch_storage_whole_state_or_drag_mutation", () => {
    const current = `${sources.app}\n${sources.runtime}`;
    assert(!/localStorage|sessionStorage|indexedDB/u.test(current), "Battle Lab persisted local authority");
    assert(!/fetch\s*\(/u.test(sources.app), "UI bypassed Client Domain transport");
    assert(!/dragstart|dragover|drop|pointermove|mousemove/u.test(sources.app), "UI retained drag mutation");
    assert(!/apply_action|confirm_preview|claim_control/u.test(sources.app), "UI called internal transport operation");
    assert(!/state\s*:/u.test(sources.app), "UI submitted whole state");
  });

  await check("seat_token_is_ephemeral_and_cleared_before_the_first_await", () => {
    const readIndex = sources.app.indexOf('const seatToken = el["seat-token"].value');
    const clearIndex = sources.app.indexOf('el["seat-token"].value = ""', readIndex);
    const awaitIndex = sources.app.indexOf("await runtime.bootstrap", readIndex);
    assert(readIndex >= 0 && clearIndex > readIndex && awaitIndex > clearIndex, "seat token clear ordering drifted");
    assert(!sources.observability.includes("seatToken"), "trace projector references SeatGrant secret");
  });

  await check("legacy_battle_lab_unsafe_authority_is_detected_and_not_imported", () => {
    assert(legacyApp.includes("state: state.battle"), "legacy whole-state submit witness missing");
    assert(legacyApp.includes("state.battle = json.room?.state"), "legacy room replacement witness missing");
    assert(legacyServer.includes("const rooms = new Map()"), "legacy process-local room witness missing");
    const imports = [...`${sources.app}\n${sources.runtime}`.matchAll(/from\s+["']([^"']+)["']/gu)]
      .map((match) => match[1]);
    assert(imports.every((entry) => !entry.includes("starcraft-tmg-local")), "legacy sandbox entered current import graph");
  });

  await check("board_uses_uniform_contain_geometry_and_no_fixed_model_limit", () => {
    assert(sources.html.includes('preserveAspectRatio="xMidYMid meet"'), "uniform contain missing");
    assert(sources.app.includes("scene.models") && !/scene\.models\.slice\(/u.test(sources.app), "model count was truncated");
    assert(sources.app.includes("baseWidthMilliInches") && sources.app.includes("baseDepthMilliInches"), "physical bases not used");
    assert(sources.styles.includes("aspect-ratio: 3 / 2"), "54x36 presentation ratio missing");
  });

  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const state = createStarcraftTmgSampleState(data);
  state.board.terrain = [];
  state.activeSideKey = "player1";
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const roomRuntime = createStarcraftTmgRoomRuntime({ authorityEngine: engine, now: () => OCCURRED_AT });
  const created = await roomRuntime.createRoom({
    roomId: ROOM_ID,
    matchId: "ticket-14-slice-135-match",
    gameId: "starcraft-tmg",
    surfaceMode: "battle_lab",
    initialStateAuthority: {
      source: "server_factory",
      state,
      dataVersion: data.version,
      receiptHash: hashStarcraftTmgContract({ source: "ticket-14-slice-135", state }),
    },
    serverSeatPlan: [
      { label: "host", grantId: "ticket-14-slice-135-host", seatKey: "player1", roleMode: "player", principalType: "human" },
    ],
  });
  assert(created.ok, `fixture room failed: ${created.reason || "unknown"}`);
  const seatToken = created.credentials.host.seatToken;
  const baseTransport = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({ roomRuntime });
  const expoClient = createStarcraftTmgClientDomain({
    transport: baseTransport,
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" }),
    now: () => OCCURRED_AT,
    createId: deterministicIds("expo"),
  });
  const tracePortCalls = [];
  const lab = createStarcraftTmgBattleLabRuntime({
    transport: baseTransport,
    projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
    lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" }),
    traceProjectionPort: {
      async read(input) {
        tracePortCalls.push(clone(input));
        return safeAgentTraceProjection(input.roomId);
      },
    },
    now: () => OCCURRED_AT,
    createId: deterministicIds("lab"),
  });

  await check("expo_and_battle_lab_bootstrap_the_same_viewer_projection", async () => {
    const [expoResult, labResult] = await Promise.all([
      expoClient.bootstrap({ route: { roomId: ROOM_ID }, principal: { seatToken }, surface: "expo_web", locale: "en" }),
      lab.bootstrap({ route: { roomId: ROOM_ID }, principal: { seatToken }, locale: "en" }),
    ]);
    assert(expoResult.ok && labResult.ok, "cross-surface bootstrap failed");
    assert(expoClient.read().roomProjection.room.stateHash
      === lab.read().shared.roomProjection.room.stateHash, "room projections drifted");
  });

  await check("shared_room_view_hash_is_surface_independent", () => {
    const expoShared = projectStarcraftTmgSharedOperationalViewV1(expoClient.read());
    assert(expoShared.sharedViewHash === lab.read().shared.sharedViewHash, "shared view hash drifted by surface");
    assert(expoShared.sharedViewHash === hashStarcraftTmgContract({
      schemaVersion: expoShared.schemaVersion,
      roomId: expoShared.roomId,
      roomProjection: expoShared.roomProjection,
      legalSpace: expoShared.legalSpace,
      trainingTruth: false,
    }), "shared hash basis drifted");
  });

  await check("both_surfaces_receive_hash_identical_legal_space", async () => {
    const [expoLegal, labLegal] = await Promise.all([
      expoClient.dispatch({ type: "load_legal_space" }),
      lab.dispatch({ type: "load_legal_space" }),
    ]);
    assert(expoLegal.ok && labLegal.ok, "LegalSpace load failed");
    assert(expoClient.read().legalSpace.legalSpaceHash
      === lab.read().shared.legalSpace.legalSpaceHash, "LegalSpace hashes drifted");
    assert(projectStarcraftTmgSharedOperationalViewV1(expoClient.read()).sharedViewHash
      === lab.read().shared.sharedViewHash, "shared legal view hash drifted");
  });

  await check("battlefield_scene_is_hash_identical_to_the_shared_expo_projection", () => {
    const expoScene = projectStarcraftTmgBattlefieldPresentationV1({
      roomProjection: expoClient.read().roomProjection,
      legalSpace: expoClient.read().legalSpace,
      pendingPreview: expoClient.read().pendingPreview,
    });
    assert(hashStarcraftTmgContract(expoScene)
      === hashStarcraftTmgContract(lab.read().battlefield), "battlefield projections drifted");
  });

  await check("trace_port_receives_only_the_room_locator_and_returns_safe_hashes", () => {
    assert(tracePortCalls.length >= 1, "trace port was not read");
    assert(tracePortCalls.every((call) => Object.keys(call).join("/") === "roomId"), "trace port received authority material");
    const serialized = JSON.stringify(lab.read().agent);
    assert(!serialized.includes(seatToken), "SeatGrant leaked into Agent trace projection");
    assert(lab.read().agent.traces.length === 1
      && lab.read().agent.traces[0].ruleSkillRefHashes[0] === "a".repeat(64), "safe trace projection drifted");
  });

  await check("agent_trace_projection_rejects_cross_room_secret_and_training_claims", () => {
    for (const mutate of [
      (value) => { value.roomId = "other-room"; },
      (value) => { value.status = "sk-secret-material-must-not-render"; },
      (value) => { value.traces[0].seatToken = seatToken; },
      (value) => { value.traces[0].agentVersion = "sk-secret-material-must-not-render"; },
      (value) => { value.traces[0].trainingTruth = true; },
      (value) => { value.traces[0].decision.legalSpaceHash = "bad"; },
      (value) => { value.traces[0].decision.legalSpaceHash = "c".repeat(65); },
      (value) => { value.traces.push(clone(value.traces[0])); },
    ]) {
      const unsafe = safeAgentTraceProjection(ROOM_ID);
      mutate(unsafe);
      let rejected = false;
      try {
        projectStarcraftTmgBattleLabObservabilityV1({
          clientView: expoClient.read(),
          agentTraceProjection: unsafe,
        });
      } catch {
        rejected = true;
      }
      assert(rejected, "unsafe Agent trace projection was accepted");
    }
  });

  await check("invalid_trace_adapter_is_quarantined_without_masking_room_bootstrap", async () => {
    const quarantined = createStarcraftTmgBattleLabRuntime({
      transport: baseTransport,
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({ online: true, visibility: "active" }),
      traceProjectionPort: {
        async read({ roomId }) {
          const unsafe = safeAgentTraceProjection(roomId);
          unsafe.traces[0].rawOutput = "must-not-cross-the-projection";
          return unsafe;
        },
      },
      now: () => OCCURRED_AT,
      createId: deterministicIds("quarantined-trace"),
    });
    const result = await quarantined.bootstrap({
      route: { roomId: ROOM_ID }, principal: { seatToken }, locale: "en",
    });
    assert(result.ok, "trace failure masked successful room bootstrap");
    assert(quarantined.read().agent.status === "unavailable:TRACE_PROJECTION_REJECTED", "bad trace was not quarantined");
    assert(quarantined.read().agent.traces.length === 0, "quarantined trace remained visible");
  });

  await check("missing_agent_runtime_is_explicit_and_does_not_fabricate_a_trace", () => {
    const projection = projectStarcraftTmgBattleLabObservabilityV1({ clientView: expoClient.read() });
    assert(projection.agent.status === "not_mounted_ticket_15", "missing runtime status drifted");
    assert(projection.agent.traces.length === 0, "missing runtime fabricated trace");
    assert(projection.harness.trainingTraceCandidates.length === 0, "missing runtime fabricated training data");
  });

  await check("caller_cannot_inject_surface_state_or_confirmation", async () => {
    const rejectedBootstrap = await lab.bootstrap({
      route: { roomId: ROOM_ID }, principal: { seatToken }, locale: "en", surface: "expo_web",
    });
    assert(!rejectedBootstrap.ok || rejectedBootstrap.rejection, "surface injection was accepted");
    const callsBefore = tracePortCalls.length;
    const rejectedIntent = await lab.dispatch({ type: "load_legal_space", state: {}, confirmed: true });
    assert(!rejectedIntent.ok && rejectedIntent.rejection.code === "CLIENT_AUTHORITY_FIELD_REJECTED", "authority fields were accepted");
    assert(tracePortCalls.length === callsBefore + 1, "post-rejection safe trace refresh did not remain read-only");
  });

  await check("finite_action_flows_through_preview_then_separate_human_confirmation", async () => {
    await lab.bootstrap({ route: { roomId: ROOM_ID }, principal: { seatToken }, locale: "en" });
    await lab.dispatch({ type: "load_legal_space" });
    const candidate = lab.read().battlefield.finiteActions[0];
    assert(candidate, "no finite action available for fixture");
    const previewed = await lab.dispatch({ type: "preview_finite", actionKey: candidate.actionKey });
    assert(previewed.ok && lab.read().shared.pendingPreview?.previewId, "sealed preview missing");
    assert(roomRuntime && lab.read().referee.lastReceipt === null, "preview mutated the room");
    const applied = await lab.dispatch({
      type: "confirm_and_apply_preview",
      previewId: lab.read().shared.pendingPreview.previewId,
    });
    assert(applied.ok, `confirmed apply failed: ${applied.rejection?.code || "unknown"}`);
    assert(lab.read().referee.lastReceipt?.referenceHash, "Referee receipt projection missing");
    assert(lab.read().shared.pendingPreview === null, "accepted preview remained pending");
  });

  await check("referee_projection_is_read_only_and_replay_integrity_bound", async () => {
    const replayed = await lab.dispatch({ type: "read_replay" });
    assert(replayed.ok && lab.read().referee.replayAvailable, "replay projection missing");
    assert(lab.read().referee.authoritativeMutation === false
      && lab.read().referee.rulesEvaluation === false, "Referee UI overclaimed authority");
    assert(lab.read().referee.replayBlocked === false, "valid replay was blocked");
    assert(/^[a-f0-9]{64}$/u.test(lab.read().referee.projectionHash), "Referee projection hash missing");
  });

  await check("battle_lab_harness_report_contains_every_required_observability_lane", () => {
    const harness = lab.read().harness;
    for (const key of [
      "harnessLoopUsed", "targetGames", "promptPackRoutes", "harnessToolsCalled",
      "uiTraceEvidence", "agentDecisionEvidence", "memoryTraceEvidence",
      "trainingTraceCandidates", "rollbackOrDemotionRules", "userVisibleChecks",
    ]) assert(Object.prototype.hasOwnProperty.call(harness, key), `missing harness field: ${key}`);
    assert(harness.harnessLoopUsed === true
      && harness.targetGames.join("/") === "starcraft-tmg", "harness scope drifted");
    assert(harness.promptPackRoutes.includes("opponent_prompt"), "prompt route not observable");
    assert(harness.trainingTraceCandidates.length === 0, "training candidate was emitted");
  });

  await check("battle_lab_ui_uses_only_typed_client_domain_intents", () => {
    for (const intent of [
      'type: "refresh"', 'type: "load_legal_space"', 'type: "read_replay"',
      'type: "revalidate_authority"', 'type: "confirm_and_apply_preview"',
      'type: "preview_parameterized"', 'type: "preview_finite"',
    ]) assert(sources.app.includes(intent), `missing typed intent: ${intent}`);
    assert(sources.html.includes("Confirm and apply current sealed preview"), "human confirmation UI missing");
  });

  await check("all_current_and_legacy_authority_boundaries_are_visible_in_the_contract", () => {
    assert(binding.battleLab.wholeStateInputAccepted === false
      && binding.battleLab.dragCreatesAuthority === false, "current authority boundary widened");
    assert(binding.legacySandbox.importedIntoCurrentBattleLab === false
      && binding.legacySandbox.mayCreateLevel3Receipt === false
      && binding.legacySandbox.mayCreateTrainingEvidence === false, "legacy sandbox boundary widened");
    assert(binding.agentTraceProjection.onlineSessionOwner === "ticket_15", "Ticket 15 ownership drifted");
  });

  await check("source_provider_skill_dsh_muzero_selfplay_and_training_remain_closed", () => {
    assert(binding.promotion.sourceRefreshed === false
      && binding.promotion.providerCalled === false
      && binding.promotion.skillGenerated === false
      && binding.promotion.dshRun === false
      && binding.promotion.muzeroDataGenerated === false
      && binding.promotion.selfPlayRun === false
      && binding.promotion.trainingTruth === false, "future lane was promoted");
  });

  const sharedViewHash = projectStarcraftTmgSharedOperationalViewV1(expoClient.read()).sharedViewHash;
  const sourceHashes = Object.fromEntries(Object.entries(sources).map(
    ([key, source]) => [key, sha256(source)],
  ));
  const referee = lab.read().referee;
  // Journal/receipt hashes intentionally contain runtime-unique sealed artifact
  // identifiers. Snapshot evidence records their verified shape, not those
  // per-run values, so identical inputs yield byte-identical reports.
  const stableRefereeEvidence = {
    schemaVersion: referee.schemaVersion,
    roomId: referee.roomId,
    roomRevision: referee.roomRevision,
    stateRevision: referee.stateRevision,
    stateHash: referee.stateHash,
    matchBindingHashVerified: /^[a-f0-9]{64}$/u.test(String(referee.matchBindingHash || "")),
    refereeKeyIdPresent: String(referee.refereeKeyId || "").length > 0,
    refereePublicKeyFingerprintVerified:
      /^[a-f0-9]{64}$/u.test(String(referee.refereePublicKeyFingerprint || "")),
    rulesRuntimeBinding: referee.rulesRuntimeBinding,
    journalHeadHashVerified: /^[a-f0-9]{64}$/u.test(String(referee.journalHeadHash || "")),
    lastReceipt: referee.lastReceipt ? {
      present: true,
      journalHashVerified: /^[a-f0-9]{64}$/u.test(String(referee.lastReceipt.journalHash || "")),
      stateRevision: referee.lastReceipt.stateRevision,
      signatureAlgorithm: referee.lastReceipt.signatureAlgorithm,
    } : null,
    replayAvailable: referee.replayAvailable,
    replayBlocked: referee.replayBlocked,
    authoritativeMutation: referee.authoritativeMutation,
    rulesEvaluation: referee.rulesEvaluation,
    trainingTruth: false,
  };
  const reportCore = {
    schemaVersion: "starcraft_tmg_ticket_14_slice_135_battle_lab_report_v1",
    status: failures.length ? "failed" : "passed",
    generatedAt: OCCURRED_AT,
    ticket: 14,
    slice: 135,
    ticketProgress: "8/11",
    projectProgress: "13/22",
    assertionsPassed: checks.filter((entry) => entry.passed).length,
    assertionsTotal: checks.length,
    checks,
    failures,
    evidence: {
      bindingHash: binding.bindingHash,
      sharedViewHashEqualityVerified: true,
      sharedViewHashShapeVerified: /^[a-f0-9]{64}$/u.test(sharedViewHash),
      sharedOperationalHashFieldsHash: hashStarcraftTmgContract(
        binding.surfaces.sharedOperationalHashFields,
      ),
      battlefieldHash: hashStarcraftTmgContract(lab.read().battlefield),
      stableRefereeEvidence,
      stableRefereeEvidenceHash: hashStarcraftTmgContract(stableRefereeEvidence),
      agentTraceProjectionHash: lab.read().agent.projectionHash,
      sourceHashes,
      legacySandboxRoot: "../starcraft-tmg-local",
      legacySandboxImported: false,
    },
    harness: lab.read().harness,
    gates: {
      actualBrowserRuntimeVerified: false,
      pinnedWebBuildVerified: false,
      nativeDeviceVerified: false,
      providerCalled: false,
      skillGenerated: false,
      dshRun: false,
      muzeroDataGenerated: false,
      selfPlayRun: false,
      trainingTruth: false,
    },
  };
  const report = { ...reportCore, reportHash: hashStarcraftTmgContract(reportCore) };
  await mkdir(BUILD_ROOT, { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(PREVIEW_PATH, previewHtml(report));
  if (failures.length) throw new Error(failures.join("\n"));
  process.stdout.write(`Ticket 14 Slice 135 passed ${report.assertionsPassed}/${report.assertionsTotal}\n`);
  process.stdout.write(`Shared view hash: ${sharedViewHash}\n`);
  process.stdout.write(`Report hash: ${report.reportHash}\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error}\n`);
  process.exitCode = 1;
});
