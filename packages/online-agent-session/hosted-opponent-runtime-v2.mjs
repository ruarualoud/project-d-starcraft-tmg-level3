import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgHostedBotSeatRuntimeV1 } from
  "./hosted-bot-seat-runtime-v1.mjs";
import {
  createPhysicalSyncGatedRoomPortV1,
  createStarcraftTmgPhysicalOperationTaskRuntimeV1,
} from "./physical-operation-task-runtime-v1.mjs";

export const STARCRAFT_TMG_HOSTED_OPPONENT_RUNTIME_VERSION =
  "starcraft_tmg_hosted_opponent_runtime_v2";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function required(value, field) {
  const result = String(value || "").trim();
  if (!result) throw new TypeError(`${field} is required`);
  return result;
}
function normalizedScope(input = {}) {
  return {
    gameId: required(input.gameId || "starcraft-tmg", "scope.gameId"),
    roomId: required(input.roomId, "scope.roomId"),
    matchBindingHash: required(input.matchBindingHash,
      "scope.matchBindingHash"),
    seatKey: required(input.seatKey, "scope.seatKey"),
  };
}
function physicalScope(value) {
  return { gameId: value.gameId, roomId: value.roomId,
    matchBindingHash: value.matchBindingHash };
}

export function createStarcraftTmgHostedOpponentRuntimeV2(options = {}) {
  const room = options.roomPort;
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const physical = options.physicalOperationTaskRuntime
    || createStarcraftTmgPhysicalOperationTaskRuntimeV1({
      now, store: options.physicalOperationTaskStore,
      physicalCustodyBySide: options.physicalCustodyBySide,
    });
  const notificationPort = options.notificationPort || null;
  const physicalAgentPort = options.physicalAgentPort || null;
  if (notificationPort && typeof notificationPort.notify !== "function") {
    throw new TypeError("notificationPort.notify is required");
  }
  if (physicalAgentPort && typeof physicalAgentPort.execute !== "function") {
    throw new TypeError("physicalAgentPort.execute is required");
  }
  const scopesByRoom = new Map();
  const lastTaskResultByRoom = new Map();
  const notificationIssues = [];
  const timers = new Map();
  const intervalMs = Math.max(100, Number(options.autoDriveIntervalMs || 750));
  let closed = false;

  async function notify(event) {
    if (!notificationPort) return null;
    try {
      return await notificationPort.notify(freezeDeep({
        schemaVersion: `${STARCRAFT_TMG_HOSTED_OPPONENT_RUNTIME_VERSION}.notification`,
        ...clone(event), notificationId: `hosted-opponent-notice-${
          hashStarcraftTmgContract(event).slice(0, 24)}`,
        createdAt: new Date(now()).toISOString(), trainingTruth: false,
      }));
    } catch (error) {
      notificationIssues.push({ severity: "Medium",
        code: "HOSTED_OPPONENT_NOTIFICATION_FAILED",
        message: String(error?.message || error).slice(0, 300) });
      return null;
    }
  }

  function scopeForRequest(request = {}) {
    const value = scopesByRoom.get(String(request.roomId || ""));
    if (!value) throw new Error("HOSTED_OPPONENT_SCOPE_NOT_ATTACHED");
    return physicalScope(value);
  }
  const gated = createPhysicalSyncGatedRoomPortV1({
    roomPort: room, physicalOperationTaskRuntime: physical, scopeFor: scopeForRequest,
  });
  const observingRoomPort = Object.freeze({
    readRoom: gated.readRoom,
    legalSpace: gated.legalSpace,
    previewAction: gated.previewAction,
    confirmPreview: gated.confirmPreview,
    claimControl: gated.claimControl,
    replayRoom: gated.replayRoom,
    async applyAction(request = {}) {
      const scopeValue = scopesByRoom.get(String(request.roomId || ""));
      if (!scopeValue) throw new Error("HOSTED_OPPONENT_SCOPE_NOT_ATTACHED");
      const before = await room.readRoom({ roomId: request.roomId,
        seatToken: request.seatToken });
      await physical.stageAcceptedTransition({
        scope: physicalScope(scopeValue),
        applyRequestKey: required(request.idempotencyKey, "idempotencyKey"),
        beforeState: before?.projection?.state || {},
      });
      const applied = await gated.applyAction(request);
      if (applied?.ok !== true) return applied;
      const after = await room.readRoom({ roomId: request.roomId,
        seatToken: request.seatToken });
      const receipt = applied.receipt || {};
      const taskResult = await physical.observeAcceptedTransition({
        scope: physicalScope(scopeValue),
        applyRequestKey: request.idempotencyKey,
        authorityReceiptHash: receipt.journalHash,
        acceptedAction: receipt.action,
        postStateRevision: receipt.postStateRevision,
        beforeState: before?.projection?.state || {},
        afterState: after?.projection?.state || {},
      });
      lastTaskResultByRoom.set(scopeValue.roomId, taskResult);
      await notify({ kind: "machine_action_applied",
        roomId: scopeValue.roomId, seatKey: scopeValue.seatKey,
        postStateRevision: receipt.postStateRevision,
        authorityReceiptHash: receipt.journalHash,
        action: clone(receipt.action || null), events: clone(receipt.events || []),
        physicalOperationTaskCreated: taskResult.taskCreated === true });
      if (taskResult.taskCreated) await notify({
        kind: "physical_operation_required", roomId: scopeValue.roomId,
        seatKey: scopeValue.seatKey, task: clone(taskResult.task),
      });
      return applied;
    },
  });
  const base = createStarcraftTmgHostedBotSeatRuntimeV1({
    ...options,
    roomPort: observingRoomPort,
    autoDriveIntervalMs: intervalMs,
  });

  function schedule(scopeValue) {
    const key = `${scopeValue.roomId}:${scopeValue.seatKey}`;
    if (closed || timers.has(key)) return;
    const timer = setTimeout(async () => {
      timers.delete(key);
      try {
        const gate = await physical.guardRoomMutation({
          scope: physicalScope(scopeValue),
        });
        if (gate.ok) await drive({ scope: scopeValue });
      } catch {}
      if (!closed) schedule(scopeValue);
    }, intervalMs);
    timer.unref?.(); timers.set(key, timer);
  }
  async function attach(input = {}) {
    const scopeValue = normalizedScope(input.scope || input);
    scopesByRoom.set(scopeValue.roomId, scopeValue);
    const result = await base.attach({ ...input, scope: scopeValue,
      autoDrive: false });
    if (result.ok && input.autoDrive !== false) schedule(scopeValue);
    return read({ scope: scopeValue, baseProjection: result.projection });
  }
  async function drive(input = {}) {
    const scopeValue = normalizedScope(input.scope || input);
    scopesByRoom.set(scopeValue.roomId, scopeValue);
    const gate = await physical.guardRoomMutation({
      scope: physicalScope(scopeValue),
    });
    if (!gate.ok) return freezeDeep({ ok: true,
      outcome: gate.reason === "ROOM_RULES_DISPUTE_PENDING"
        ? "waiting_rules_dispute" : "waiting_physical_sync",
      physicalOperationProjection: gate.projection,
      bot: (await base.read({ scope: scopeValue })).projection,
      trainingTruth: false });
    const result = await base.drive({ ...input, scope: scopeValue });
    return freezeDeep({ ...clone(result),
      physicalOperationProjection: await physical.read({
        scope: physicalScope(scopeValue),
      }),
      physicalOperationTask: clone(lastTaskResultByRoom.get(scopeValue.roomId)?.task
        || null), notificationIssues: clone(notificationIssues),
      automaticLegalMachineAction: true,
      perActionHumanApprovalRequired: false,
      trainingTruth: false });
  }
  async function read(input = {}) {
    const scopeValue = normalizedScope(input.scope || input);
    scopesByRoom.set(scopeValue.roomId, scopeValue);
    const bot = input.baseProjection
      ? { ok: true, projection: input.baseProjection }
      : await base.read({ scope: scopeValue });
    const physicalProjection = await physical.read({
      scope: physicalScope(scopeValue),
    });
    const body = {
      schemaVersion: `${STARCRAFT_TMG_HOSTED_OPPONENT_RUNTIME_VERSION}.projection`,
      scope: clone(scopeValue), bot: clone(bot.projection || null),
      physicalOperation: physicalProjection,
      notificationIssues: clone(notificationIssues),
      automaticLegalMachineAction: true,
      perActionHumanApprovalRequired: false,
      ordinaryHumanRejectionSupported: false,
      rulesDisputeSupported: true,
      modelReceivesCredential: false, modelConfirmCalls: 0, modelApplyCalls: 0,
      productionRoomEligible: false, trainingTruth: false,
    };
    return freezeDeep({ ok: Boolean(bot.projection),
      outcome: "hosted_opponent_projection", projection: { ...body,
        projectionHash: hashStarcraftTmgContract(body) } });
  }
  async function delegatePhysicalTask(input = {}) {
    const scopeValue = normalizedScope(input.scope || input);
    let result = await physical.delegate({ ...input,
      scope: physicalScope(scopeValue) });
    await notify({ kind: "physical_operation_delegated",
      roomId: scopeValue.roomId, taskId: input.taskId, performer: "agent" });
    if (physicalAgentPort) {
      const executed = await physicalAgentPort.execute(clone(result.task));
      if (executed?.completed === true) result = await physical.complete({
        scope: physicalScope(scopeValue), taskId: input.taskId,
        completedBy: "agent", evidenceRefs: executed.evidenceRefs || [],
      });
    }
    if (result.projection.syncStatus === "in_sync") schedule(scopeValue);
    return result;
  }
  async function completePhysicalTask(input = {}) {
    const scopeValue = normalizedScope(input.scope || input);
    const result = await physical.complete({ ...input,
      scope: physicalScope(scopeValue) });
    await notify({ kind: "physical_operation_completed",
      roomId: scopeValue.roomId, taskId: input.taskId,
      completedBy: input.completedBy });
    if (result.projection.syncStatus === "in_sync") schedule(scopeValue);
    return result;
  }
  async function openRulesDispute(input = {}) {
    const scopeValue = normalizedScope(input.scope || input);
    const result = await physical.openRulesDispute({ ...input,
      scope: physicalScope(scopeValue) });
    await notify({ kind: "rules_dispute_opened", roomId: scopeValue.roomId,
      taskId: input.taskId, reason: input.reason });
    return result;
  }
  async function resolveRulesDispute(input = {}) {
    const scopeValue = normalizedScope(input.scope || input);
    const result = await physical.resolveRulesDispute({ ...input,
      scope: physicalScope(scopeValue) });
    await notify({ kind: "rules_dispute_resolved", roomId: scopeValue.roomId,
      taskId: input.taskId, resolution: input.resolution });
    if (result.projection.syncStatus === "in_sync") schedule(scopeValue);
    return result;
  }
  async function close(input = {}) {
    if (input.scope) {
      const value = normalizedScope(input.scope);
      const key = `${value.roomId}:${value.seatKey}`;
      if (timers.has(key)) clearTimeout(timers.get(key));
      timers.delete(key);
    } else {
      for (const timer of timers.values()) clearTimeout(timer);
      timers.clear(); closed = true;
    }
    return base.close(input);
  }
  return Object.freeze({ attach, drive, read, delegatePhysicalTask,
    completePhysicalTask, openRulesDispute, resolveRulesDispute, close,
    physicalOperationTaskRuntime: physical,
    physicalSyncGatedRoomPort: gated,
    descriptor: freezeDeep({
      schemaVersion: STARCRAFT_TMG_HOSTED_OPPONENT_RUNTIME_VERSION,
      automaticLegalMachineAction: true,
      perActionHumanApprovalRequired: false,
      physicalOperationTasks: true,
      normalDisagreementCanRejectAcceptedOpponentAction: false,
      rulesDisputePauseAndResume: true,
      modelReceivesCredential: false,
      productionRoomEligible: false, trainingTruth: false,
    }),
  });
}
