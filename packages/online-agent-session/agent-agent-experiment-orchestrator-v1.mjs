import { resolveStarcraftTmgEffectiveActingSideV1 } from
  "./effective-acting-side-v1.mjs";

export const STARCRAFT_TMG_AGENT_AGENT_EXPERIMENT_ORCHESTRATOR_VERSION =
  "starcraft_tmg_agent_agent_experiment_orchestrator_v1";

const SEAT_KEYS = Object.freeze(["player1", "player2"]);
const BLOCKING_SEVERITIES = new Set(["Critical", "High"]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function iso(value, field) {
  const normalized = new Date(value).toISOString();
  if (!Number.isFinite(Date.parse(normalized))) {
    throw new TypeError(`${field} must be an ISO-8601 instant`);
  }
  return normalized;
}

function positiveInteger(value, field) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized) || normalized < 1) {
    throw new TypeError(`${field} must be a positive safe integer`);
  }
  return normalized;
}

function normalizeExperimentCell(value = {}) {
  if (!object(value)) throw new TypeError("experimentCell must be an object");
  const denominator = object(value.denominator) ? value.denominator : {};
  const index = positiveInteger(denominator.index, "denominator.index");
  const total = positiveInteger(denominator.total, "denominator.total");
  if (index > total) throw new TypeError("denominator.index exceeds total");
  const maxAppliedActions = positiveInteger(value.budgets?.maxAppliedActions,
    "budgets.maxAppliedActions");
  const maxRecoverableFailuresPerState = positiveInteger(
    value.budgets?.maxRecoverableFailuresPerState || 3,
    "budgets.maxRecoverableFailuresPerState");
  const seats = Object.fromEntries(SEAT_KEYS.map((seatKey) => {
    const seat = value.seats?.[seatKey];
    if (!object(seat) || !Array.isArray(seat.skillRefs)
      || seat.skillRefs.length === 0) {
      throw new TypeError(`experimentCell.seats.${seatKey} requires skillRefs`);
    }
    return [seatKey, {
      agentId: required(seat.agentId, `seats.${seatKey}.agentId`),
      factionRecordKey: required(seat.factionRecordKey,
        `seats.${seatKey}.factionRecordKey`),
      providerId: required(seat.providerId, `seats.${seatKey}.providerId`),
      skillRefs: seat.skillRefs.map((entry, indexValue) => ({
        id: required(entry.id, `seats.${seatKey}.skillRefs[${indexValue}].id`),
        version: required(entry.version || "accepted",
          `seats.${seatKey}.skillRefs[${indexValue}].version`),
        hash: required(entry.hash,
          `seats.${seatKey}.skillRefs[${indexValue}].hash`),
      })),
    }];
  }));
  return deepFreeze({
    schemaVersion:
      `${STARCRAFT_TMG_AGENT_AGENT_EXPERIMENT_ORCHESTRATOR_VERSION}.cell`,
    experimentId: required(value.experimentId, "experimentId"),
    cellId: required(value.cellId, "cellId"),
    denominator: { index, total },
    mode: "agent_vs_agent",
    roomId: required(value.roomId, "roomId"),
    matchBindingHash: required(value.matchBindingHash, "matchBindingHash"),
    versions: {
      source: required(value.versions?.source, "versions.source"),
      rules: required(value.versions?.rules, "versions.rules"),
      strategy: required(value.versions?.strategy, "versions.strategy"),
      harness: STARCRAFT_TMG_AGENT_AGENT_EXPERIMENT_ORCHESTRATOR_VERSION,
    },
    scenario: {
      mapId: required(value.scenario?.mapId, "scenario.mapId"),
      missionId: required(value.scenario?.missionId, "scenario.missionId"),
      rosterIdsBySeat: Object.fromEntries(SEAT_KEYS.map((seatKey) => [
        seatKey,
        required(value.scenario?.rosterIdsBySeat?.[seatKey],
          `scenario.rosterIdsBySeat.${seatKey}`),
      ])),
    },
    rng: {
      scheme: required(value.rng?.scheme, "rng.scheme"),
      seed: required(value.rng?.seed, "rng.seed"),
    },
    budgets: { maxAppliedActions, maxRecoverableFailuresPerState },
    seats,
    promotionPolicy: "manual_review_only",
    automaticPromotion: false,
    productionEligible: false,
    trainingTruth: false,
  });
}

function normalizeSeatBinding(value, cell, seatKey) {
  if (!object(value) || value.seatKey !== seatKey) {
    throw new TypeError(`seat binding ${seatKey} is required`);
  }
  for (const method of ["attach", "drive", "read", "close"]) {
    if (typeof value.runtime?.[method] !== "function") {
      throw new TypeError(`${seatKey}.runtime.${method} is required`);
    }
  }
  const scope = clone(value.scope);
  if (scope?.roomId !== cell.roomId || scope?.seatKey !== seatKey
    || scope?.matchBindingHash !== cell.matchBindingHash) {
    throw new TypeError(`${seatKey} scope does not match the experiment cell`);
  }
  return {
    seatKey,
    runtime: value.runtime,
    scope,
    seatToken: required(value.seatToken, `${seatKey}.seatToken`),
    automationConsent: clone(value.automationConsent),
    strategySkillSetHash: required(value.strategySkillSetHash,
      `${seatKey}.strategySkillSetHash`),
  };
}

function safeTrace(trace) {
  if (!trace) return null;
  return deepFreeze({
    traceId: trace.traceId,
    seatKey: trace.seatKey,
    mode: trace.mode,
    promptPack: trace.promptPack,
    harnessVersion: trace.harnessVersion,
    agentVersion: trace.agentVersion,
    stateRevision: trace.stateRevision,
    stateHash: trace.stateHash,
    legalSpaceHash: trace.legalSpaceHash,
    spatialObservationHash: trace.spatialObservationHash,
    spatialActionSpaceHash: trace.spatialActionSpaceHash,
    continuityContextHash: trace.continuityContextHash,
    turnPlanHash: trace.turnPlanHash,
    actionIntentHash: trace.actionIntentHash,
    candidateId: trace.candidateId,
    selectedReason: trace.selectedReason,
    scoreOrPositionValue: trace.scoreOrPositionValue,
    risk: trace.risk,
    publicDecisionSummary: clone(trace.publicDecisionSummary || null),
    plan: clone(trace.plan || null),
    assessment: clone(trace.assessment || null),
    planRevision: clone(trace.planRevision || null),
    intent: clone(trace.intent || null),
    strategySkillRefs: clone(trace.strategySkillRefs || []),
    applyReceiptHash: trace.applyReceiptHash,
    postStateRevision: trace.postStateRevision,
    postStateHash: trace.postStateHash,
    replayMatchesCurrent: trace.replayMatchesCurrent === true,
    providerCalls: Number(trace.providerCalls || 0),
    paidProviderUsed: trace.paidProviderUsed === true,
    modelConfirmCalls: Number(trace.modelConfirmCalls || 0),
    modelApplyCalls: Number(trace.modelApplyCalls || 0),
    hostConfirmCalls: Number(trace.hostConfirmCalls || 0),
    hostApplyCalls: Number(trace.hostApplyCalls || 0),
    eventLogPersistence: trace.eventLogPersistence,
    eligibleForTraining: false,
    trainingTruth: false,
  });
}

function issueFromOutcome(outcome, seatKey, stateRevision, at) {
  return deepFreeze({
    seatKey,
    stateRevision,
    code: String(outcome?.reason || "AGENT_SEAT_DRIVE_FAILED"),
    severity: String(outcome?.findingSeverity || "Medium"),
    occurredAt: at,
    integrationBlocking: BLOCKING_SEVERITIES.has(String(
      outcome?.findingSeverity || "Medium")),
  });
}

export function createStarcraftTmgAgentAgentExperimentOrchestratorV1(
  options = {},
) {
  const room = options.roomPort;
  for (const method of ["readRoom", "replayRoom"]) {
    if (typeof room?.[method] !== "function") {
      throw new TypeError(`roomPort.${method} is required`);
    }
  }
  const cell = normalizeExperimentCell(options.experimentCell);
  const bindings = Object.fromEntries(SEAT_KEYS.map((seatKey) => [
    seatKey,
    normalizeSeatBinding((options.seats || []).find((entry) =>
      entry?.seatKey === seatKey), cell, seatKey),
  ]));
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();

  let status = "created";
  let startedAt = null;
  let completedAt = null;
  let appliedActionCount = 0;
  let driveAttemptCount = 0;
  let waitObservationCount = 0;
  let resumeCount = 0;
  let lastProjection = null;
  let replayMatchesCurrent = null;
  const trajectories = [];
  const issues = [];
  const pauseReceipts = [];
  const recoveryReceipts = [];
  const recoverableFailuresByState = new Map();

  async function readAuthority() {
    const anchor = bindings.player1;
    const result = await room.readRoom({
      roomId: cell.roomId,
      seatToken: anchor.seatToken,
    });
    if (result?.ok !== true) {
      throw Object.assign(new Error(result?.reason || "A2A_ROOM_READ_FAILED"), {
        code: result?.reason || "A2A_ROOM_READ_FAILED",
        severity: "High",
      });
    }
    if (result.projection?.room?.roomId !== cell.roomId
      || result.projection?.matchBinding?.bindingHash !== cell.matchBindingHash) {
      throw Object.assign(new Error("A-A room binding mismatch"), {
        code: "A2A_ROOM_BINDING_MISMATCH",
        severity: "High",
      });
    }
    lastProjection = result.projection;
    return result.projection;
  }

  function isTerminal(projection) {
    return projection?.state?.terminal === true
      || projection?.state?.gameOver === true;
  }

  async function finalizeTerminal(projection) {
    const replay = await room.replayRoom({
      roomId: cell.roomId,
      seatToken: bindings.player1.seatToken,
    });
    if (replay?.ok !== true || replay.matchesCurrent !== true) {
      const issue = deepFreeze({
        seatKey: null,
        stateRevision: projection?.room?.stateRevision ?? null,
        code: "A2A_REPLAY_MISMATCH",
        severity: "High",
        occurredAt: iso(now(), "now"),
        integrationBlocking: true,
      });
      issues.push(issue);
      status = "blocked";
      replayMatchesCurrent = false;
      return;
    }
    status = "completed";
    completedAt = iso(now(), "now");
    replayMatchesCurrent = true;
  }

  function compactState() {
    const state = lastProjection?.state || {};
    return {
      stateRevision: lastProjection?.room?.stateRevision ?? null,
      stateHash: lastProjection?.room?.stateHash || null,
      round: state.round ?? null,
      phase: state.phase || null,
      activeSideKey: resolveStarcraftTmgEffectiveActingSideV1(state).sideKey,
      scores: clone(state.scores || {}),
      terminal: isTerminal(lastProjection),
      winner: state.winner || null,
      terminalReason: state.terminalReason || null,
    };
  }

  async function seatSummaries() {
    const entries = await Promise.all(SEAT_KEYS.map(async (seatKey) => {
      const result = await bindings[seatKey].runtime.read({
        scope: bindings[seatKey].scope,
      });
      const rootProjection = result?.projection;
      const projection = rootProjection?.bot || rootProjection;
      return [seatKey, {
        lifecycle: projection?.lifecycle || null,
        driveStatus: projection?.driveStatus || null,
        connected: projection?.connected === true,
        connectionEpoch: projection?.connectionEpoch || 0,
        actionCount: projection?.actionCount || 0,
        replayVerifiedCount: projection?.replayVerifiedCount || 0,
        issueCount: projection?.issues?.length || 0,
        mode: projection?.mode || "agent_vs_agent",
        promptPack: projection?.promptPack || "selfplay_agent_prompt",
      }];
    }));
    return Object.fromEntries(entries);
  }

  async function publicResult() {
    if (!lastProjection && status !== "created") await readAuthority();
    const blockingFindings = issues.filter((entry) => entry.integrationBlocking);
    const completedCell = status === "completed" && replayMatchesCurrent === true;
    return deepFreeze({
      schemaVersion:
        `${STARCRAFT_TMG_AGENT_AGENT_EXPERIMENT_ORCHESTRATOR_VERSION}.result`,
      experimentCell: clone(cell),
      status,
      startedAt,
      completedAt,
      appliedActionCount,
      driveAttemptCount,
      waitObservationCount,
      resumeCount,
      state: lastProjection ? compactState() : null,
      seats: await seatSummaries(),
      trajectory: clone(trajectories),
      pauseReceipts: clone(pauseReceipts),
      recoveryReceipts: clone(recoveryReceipts),
      failureAccounting: {
        total: issues.length,
        blocking: blockingFindings.length,
        trackedNonBlocking: issues.length - blockingFindings.length,
        findings: clone(issues),
      },
      denominator: {
        planned: cell.denominator.total,
        currentCellIndex: cell.denominator.index,
        completed: completedCell ? 1 : 0,
        failed: status === "blocked" ? 1 : 0,
        remaining: completedCell ? cell.denominator.total - 1
          : cell.denominator.total,
      },
      replayMatchesCurrent,
      modelUsage: {
        providerCalls: trajectories.reduce((sum, entry) =>
          sum + entry.providerCalls, 0),
        paidProviderCalls: trajectories.filter((entry) =>
          entry.paidProviderUsed).length,
        inputTokens: 0,
        outputTokens: 0,
        estimatedCostCny: 0,
      },
      viewerSafe: true,
      credentialMaterialProjected: false,
      automaticPromotion: false,
      eligibleForTraining: false,
      trainingTruth: false,
    });
  }

  async function start() {
    if (status !== "created") return publicResult();
    for (const seatKey of SEAT_KEYS) {
      const binding = bindings[seatKey];
      await binding.runtime.attach({
        scope: binding.scope,
        seatToken: binding.seatToken,
        automationConsent: clone(binding.automationConsent),
        autoDrive: false,
      });
    }
    const durableSeatReads = await Promise.all(SEAT_KEYS.map((seatKey) => (
      bindings[seatKey].runtime.read({ scope: bindings[seatKey].scope })
    )));
    appliedActionCount = durableSeatReads.reduce((sum, result) => (
      sum + Number((result?.projection?.bot || result?.projection)
        ?.actionCount || 0)
    ), 0);
    startedAt = iso(now(), "now");
    status = "running";
    await readAuthority();
    return publicResult();
  }

  async function pause(input = {}) {
    if (status === "completed" || status === "blocked") return publicResult();
    if (status === "created") await start();
    status = "paused";
    pauseReceipts.push(deepFreeze({
      reason: required(input.reason || "manual_pause", "pause.reason"),
      appliedActionCount,
      stateRevision: lastProjection?.room?.stateRevision ?? null,
      pausedAt: iso(now(), "now"),
      atomicBoundary: true,
      canAffectRules: false,
      trainingTruth: false,
    }));
    return publicResult();
  }

  async function run(input = {}) {
    if (status === "created") await start();
    if (status !== "running") return publicResult();
    const remainingBudget = cell.budgets.maxAppliedActions
      - appliedActionCount;
    const maxAdditionalActions = input.maxAdditionalActions === undefined
      ? remainingBudget
      : Math.min(remainingBudget, positiveInteger(input.maxAdditionalActions,
        "maxAdditionalActions"));
    const pauseAfterAppliedActions = input.pauseAfterAppliedActions === undefined
      ? null : positiveInteger(input.pauseAfterAppliedActions,
        "pauseAfterAppliedActions");
    const batchStart = appliedActionCount;
    let noProgressPasses = 0;

    while (status === "running") {
      const projection = await readAuthority();
      if (isTerminal(projection)) {
        await finalizeTerminal(projection);
        break;
      }
      if (appliedActionCount - batchStart >= maxAdditionalActions) {
        await pause({ reason: "run_action_batch_complete" });
        break;
      }
      let progressed = false;
      for (const seatKey of SEAT_KEYS) {
        if (status !== "running") break;
        const binding = bindings[seatKey];
        driveAttemptCount += 1;
        const outcome = await binding.runtime.drive({
          scope: binding.scope,
          strategySkillSetHash: binding.strategySkillSetHash,
          retry: true,
        });
        if (outcome?.ok === true && outcome.outcome === "bot_action_applied") {
          const trace = safeTrace(outcome.trace);
          trajectories.push(trace);
          appliedActionCount += 1;
          progressed = true;
          recoverableFailuresByState.clear();
        } else if (outcome?.ok === true) {
          waitObservationCount += 1;
        } else {
          const current = await readAuthority();
          const issue = issueFromOutcome(outcome, seatKey,
            current.room?.stateRevision ?? null, iso(now(), "now"));
          issues.push(issue);
          if (issue.integrationBlocking) {
            status = "blocked";
            break;
          }
          const failureKey = `${seatKey}:${current.room?.stateHash || "unknown"}`;
          const failures = (recoverableFailuresByState.get(failureKey) || 0) + 1;
          recoverableFailuresByState.set(failureKey, failures);
          if (failures >= cell.budgets.maxRecoverableFailuresPerState) {
            await pause({ reason: "recoverable_failure_budget_exhausted" });
            break;
          }
        }
        const current = await readAuthority();
        if (isTerminal(current)) {
          await finalizeTerminal(current);
          break;
        }
        if (pauseAfterAppliedActions !== null
          && appliedActionCount - batchStart >= pauseAfterAppliedActions) {
          await pause({ reason: "requested_atomic_action_checkpoint" });
          break;
        }
        if (appliedActionCount - batchStart >= maxAdditionalActions) {
          await pause({ reason: "run_action_batch_complete" });
          break;
        }
      }
      if (!progressed && status === "running") {
        noProgressPasses += 1;
        if (noProgressPasses >= 2) {
          issues.push(deepFreeze({
            seatKey: null,
            stateRevision: lastProjection?.room?.stateRevision ?? null,
            code: "A2A_NO_PROGRESS_AT_CURRENT_STATE",
            severity: "Medium",
            occurredAt: iso(now(), "now"),
            integrationBlocking: false,
          }));
          await pause({ reason: "no_progress_requires_operator_review" });
        }
      } else if (progressed) {
        noProgressPasses = 0;
      }
    }
    return publicResult();
  }

  async function resume(input = {}) {
    if (status !== "paused") return publicResult();
    status = "running";
    resumeCount += 1;
    return run(input);
  }

  async function recoverSeat(input = {}) {
    if (status !== "paused") {
      throw new TypeError("recoverSeat is only allowed at a paused atomic boundary");
    }
    const seatKey = required(input.seatKey, "recoverSeat.seatKey");
    if (!SEAT_KEYS.includes(seatKey)) throw new TypeError("unknown seatKey");
    const binding = bindings[seatKey];
    const before = await binding.runtime.read({ scope: binding.scope });
    await binding.runtime.close({ scope: binding.scope });
    const attached = await binding.runtime.attach({
      scope: binding.scope,
      seatToken: binding.seatToken,
      automationConsent: clone(binding.automationConsent),
      autoDrive: false,
    });
    const receipt = deepFreeze({
      seatKey,
      stateRevision: lastProjection?.room?.stateRevision ?? null,
      previousConnectionEpoch: before.projection?.connectionEpoch || 0,
      recoveredConnectionEpoch: attached.projection?.connectionEpoch || 0,
      sameRoom: attached.projection?.scope?.roomId === cell.roomId,
      sameMatchBinding: attached.projection?.scope?.matchBindingHash
        === cell.matchBindingHash,
      credentialMaterialProjected: false,
      recoveredAt: iso(now(), "now"),
      trainingTruth: false,
    });
    recoveryReceipts.push(receipt);
    return receipt;
  }

  return Object.freeze({ start, run, pause, resume, recoverSeat,
    read: publicResult });
}
