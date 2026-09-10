import { clone, fail, freeze, seal } from "../skill-production/common.mjs";

export const STARCRAFT_TMG_ONLINE_STRATEGY_ARENA_VERSION =
  "starcraft_tmg_online_strategy_arena_v1";

function requireOk(value, code) {
  if (value?.ok !== true) fail(code, { reason: value?.reason || "unknown" });
  return value;
}

export function createStarcraftTmgOnlineStrategyArenaV1(options = {}) {
  const agentRuntime = options.agentRuntime;
  const roomRuntime = options.roomRuntime;
  if (typeof agentRuntime?.sendTurn !== "function") {
    throw new TypeError("agentRuntime.sendTurn is required");
  }
  for (const method of ["confirmPreview", "claimControl", "applyAction", "replayRoom"] ) {
    if (typeof roomRuntime?.[method] !== "function") {
      throw new TypeError(`roomRuntime.${method} is required`);
    }
  }
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  async function runSupervisedTurn(input = {}) {
    const agent = requireOk(await agentRuntime.sendTurn({
      sessionId: input.session.sessionId,
      roomId: input.roomId,
      expectedConnectionEpoch: input.session.connection.epoch,
      intent: "take_turn",
      userMessage: input.userMessage ||
        "Compare current legal actions using the loaded strategy route, then preview one.",
    }, input.agentContext || {}), "STRATEGY_ARENA_AGENT_TURN_REJECTED");
    if (!agent.preview || agent.confirmationRequired !== true
      || agent.confirmationOwner !== "human_outside_agent_runtime"
      || agent.trace?.modelConfirmCalls !== 0 || agent.trace?.modelApplyCalls !== 0
      || !agent.trace?.strategySkillRefs?.length) {
      fail("STRATEGY_ARENA_PREVIEW_POLICY_INVALID");
    }
    const preview = agent.preview;
    const confirmation = requireOk(await roomRuntime.confirmPreview({
      roomId: input.roomId,
      seatToken: input.humanSeatToken,
      previewId: preview.previewId,
      previewToken: preview.previewToken,
      previewContentHash: preview.previewContentHash,
      occurredAt: now(),
    }), "STRATEGY_ARENA_CONFIRMATION_REJECTED");
    const control = requireOk(await roomRuntime.claimControl({
      roomId: input.roomId,
      seatToken: input.humanSeatToken,
      sessionId: input.humanControllerSessionId,
    }), "STRATEGY_ARENA_CONTROL_REJECTED");
    const applied = requireOk(await roomRuntime.applyAction({
      roomId: input.roomId,
      seatToken: input.humanSeatToken,
      previewId: preview.previewId,
      confirmationId: confirmation.confirmation.confirmationId,
      leaseId: control.controlLease.leaseId,
      leaseFence: control.controlLease.leaseFence,
      expectedStateRevision: preview.expectedStateRevision,
      idempotencyKey: input.idempotencyKey,
      occurredAt: now(),
    }), "STRATEGY_ARENA_APPLY_REJECTED");
    const replay = requireOk(await roomRuntime.replayRoom({
      roomId: input.roomId,
      seatToken: input.humanSeatToken,
    }), "STRATEGY_ARENA_REPLAY_REJECTED");
    if (replay.matchesCurrent !== true || replay.replay?.silentCompatibilityUsed === true
      || replay.replay?.envelope?.stateRevision !== applied.envelope?.stateRevision) {
      fail("STRATEGY_ARENA_REPLAY_MISMATCH");
    }
    return seal({
      schema: `${STARCRAFT_TMG_ONLINE_STRATEGY_ARENA_VERSION}.supervised-turn`,
      gameId: "starcraft-tmg",
      roomId: input.roomId,
      mode: "user_vs_agent",
      promptPack: agent.trace.promptPack,
      strategySkillRefs: clone(agent.trace.strategySkillRefs),
      ruleSkillRefs: clone(agent.trace.ruleSkillRefs),
      memoryRefs: clone(agent.trace.memoryRefs),
      harnessVersion: agent.trace.harnessVersion,
      agentVersion: agent.trace.agentVersion,
      rulesVersion: agent.trace.rulesVersion,
      decision: clone(agent.decision),
      agentDecisionReceiptHash: agent.decisionReceipt?.receiptHash || null,
      previewProjectionHash: preview.previewProjectionHash,
      humanConfirmationReceiptHash:
        confirmation.confirmation.confirmationSeal?.contentHash || null,
      applyReceiptHash: applied.receipt.journalHash,
      replayStateHash: replay.replay.envelope.stateHash,
      appliedStateHash: applied.envelope.stateHash,
      appliedStateRevision: applied.envelope.stateRevision,
      harnessToolsCalled: [
        ...agent.trace.harnessToolsCalled,
        "confirm_preview_after_human_authorization",
        "claim_control",
        "apply_action",
        "replay_room",
        "write_episode_trace",
      ],
      modelConfirmCalls: 0,
      modelApplyCalls: 0,
      eligibleForTraining: false,
      reviewStatus: "raw",
      trainingTruth: false,
    });
  }

  return freeze({ runSupervisedTurn });
}
