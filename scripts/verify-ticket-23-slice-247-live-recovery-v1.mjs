#!/usr/bin/env node

import {
  createInMemoryStarcraftTmgAuthoritativeTransportAdapter,
  StarcraftTmgClientTransportError,
} from "../packages/client-domain/authoritative-transport-adapters-v1.mjs";
import { createStarcraftTmgClientDomain } from
  "../packages/client-domain/client-domain-v1.mjs";
import { createInMemoryStarcraftTmgLifecycleAdapter } from
  "../packages/client-domain/lifecycle-adapters-v1.mjs";
import { createInMemoryStarcraftTmgProjectionStoreAdapter } from
  "../packages/client-domain/projection-store-adapters-v1.mjs";
import { createTicket20HumanAgentDemoFixtureV1 } from
  "./support/ticket20-human-agent-demo-fixture-v1.mjs";

const NOW = "2026-09-15T13:00:00.000Z";

function ensure(condition, code, details = {}) {
  if (!condition) throw Object.assign(new Error(code), { code, ...details });
}

function sleep(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const fixture = await createTicket20HumanAgentDemoFixtureV1({
    roomId: "ticket23-slice247-live-recovery",
    roomProfile: "standard_2000",
    attachBot: false,
    autoDrive: false,
    autoDriveIntervalMs: 100,
    now: () => NOW,
  });
  const failures = [];
  const checks = [];
  const check = async (id, operation) => {
    try {
      await operation();
      checks.push({ id, passed: true });
    } catch (error) {
      checks.push({ id, passed: false, code: error?.code || error?.message });
      failures.push(`${id}:${error?.code || error?.message}`);
    }
  };

  await check("auxiliary_workbench_timeout_does_not_freeze_room", async () => {
    const base = createInMemoryStarcraftTmgAuthoritativeTransportAdapter({
      roomRuntime: fixture.roomRuntime,
    });
    let failWorkbench = true;
    const client = createStarcraftTmgClientDomain({
      transport: {
        async execute(request) {
          if (request.operation === "read_battle_workbench" && failWorkbench) {
            failWorkbench = false;
            throw new StarcraftTmgClientTransportError(
              "TRANSPORT_TIMEOUT",
              "focused auxiliary read timeout",
            );
          }
          return base.execute(request);
        },
      },
      projectionStore: createInMemoryStarcraftTmgProjectionStoreAdapter(),
      lifecycle: createInMemoryStarcraftTmgLifecycleAdapter({
        online: true,
        visibility: "active",
      }),
      now: () => NOW,
    });
    const bootstrapped = await client.bootstrap({
      route: { roomId: fixture.roomId },
      principal: {
        seatToken: fixture.createdRoom.credentials.human.seatToken,
      },
      surface: "expo_web",
      locale: "zh-CN",
    });
    ensure(bootstrapped.ok, "FOCUSED_CLIENT_BOOTSTRAP_FAILED");
    const beforeRevision = client.read().roomProjection.room.stateRevision;
    const failedPanelRead = await client.dispatch({
      type: "load_battle_workbench",
    });
    ensure(failedPanelRead.ok === false
      && failedPanelRead.rejection?.code === "TRANSPORT_TIMEOUT",
    "AUXILIARY_TIMEOUT_WAS_NOT_PANEL_LOCAL", {
      outcome: failedPanelRead.outcome || null,
      phase: client.read().phase,
    });
    ensure(client.read().phase === "ready"
      && client.read().roomProjection.room.stateRevision === beforeRevision,
    "AUXILIARY_TIMEOUT_FROZE_ROOM");
    const legal = await client.dispatch({ type: "load_legal_space" });
    ensure(legal.ok, "ROOM_DID_NOT_REMAIN_OPERATIONAL_AFTER_AUXILIARY_TIMEOUT");
  });

  await check("manual_drive_mode_survives_physical_sync_completion", async () => {
    const attached = await fixture.botRuntime.attach({
      scope: fixture.botScope,
      seatToken: fixture.createdRoom.credentials.bot.seatToken,
      automationConsent: {
        approved: true,
        approvedBy: "human",
        scope: "current_match_bot_seat",
        approvedAt: NOW,
      },
      autoDrive: false,
    });
    ensure(attached.ok, "FOCUSED_BOT_ATTACH_FAILED");
    const room = await fixture.roomRuntime.readRoom({
      roomId: fixture.roomId,
      seatToken: fixture.createdRoom.credentials.human.seatToken,
    });
    ensure(room.ok, "FOCUSED_ROOM_READ_FAILED");
    const beforeState = structuredClone(room.projection.state);
    const afterState = structuredClone(beforeState);
    const piece = afterState.pieces[0];
    const model = piece.models[0];
    piece.isOnField = true;
    piece.isInReserves = false;
    model.isOnField = true;
    model.xInches = 4;
    model.yInches = 4;
    const physicalScope = {
      gameId: "starcraft-tmg",
      roomId: fixture.roomId,
      matchBindingHash: fixture.createdRoom.matchBinding.bindingHash,
    };
    await fixture.botRuntime.physicalOperationTaskRuntime
      .stageAcceptedTransition({
        scope: physicalScope,
        applyRequestKey: "focused-physical-transition",
        beforeState,
      });
    const observed = await fixture.botRuntime.physicalOperationTaskRuntime
      .observeAcceptedTransition({
        scope: physicalScope,
        applyRequestKey: "focused-physical-transition",
        authorityReceiptHash: "focused-authority-receipt",
        acceptedAction: { actionType: "deploy", sideKey: "player2" },
        postStateRevision: 1,
        beforeState,
        afterState,
      });
    ensure(observed.taskCreated === true, "FOCUSED_PHYSICAL_TASK_MISSING");
    const beforeBot = (await fixture.botRuntime.read({
      scope: fixture.botScope,
    })).projection.bot;
    await fixture.botRuntime.completePhysicalTask({
      scope: fixture.botScope,
      taskId: observed.task.taskId,
      completedBy: "human",
      evidenceRefs: ["focused-physical-sync"],
    });
    await sleep(350);
    const afterBot = (await fixture.botRuntime.read({
      scope: fixture.botScope,
    })).projection.bot;
    ensure(afterBot.actionCount === beforeBot.actionCount
      && afterBot.driveStatus === beforeBot.driveStatus,
    "PHYSICAL_SYNC_REENABLED_AUTODRIVE", {
      beforeActionCount: beforeBot.actionCount,
      afterActionCount: afterBot.actionCount,
      beforeDriveStatus: beforeBot.driveStatus,
      afterDriveStatus: afterBot.driveStatus,
    });
  });

  await fixture.botRuntime.close();
  const report = {
    schema: "ticket23_slice247_live_recovery_focused_v1",
    ok: failures.length === 0,
    checks,
    failures,
    providerCalls: 0,
    sourceRefreshPerformed: false,
    trainingTruth: false,
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  ensure(report.ok, "SLICE247_LIVE_RECOVERY_FOCUSED_FAILED", { failures });
}

main().catch((error) => {
  process.stderr.write(`${String(error?.stack || error)}\n`);
  process.exitCode = 1;
});
