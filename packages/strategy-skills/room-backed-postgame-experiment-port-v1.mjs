import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const STARCRAFT_TMG_ROOM_BACKED_POSTGAME_EXPERIMENT_PORT_VERSION =
  "starcraft_tmg_room_backed_postgame_experiment_port_v1";

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) {
    return value;
  }
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function sourceRoomIdentity(aggregate) {
  if (!object(aggregate?.envelope)) {
    throw new Error("POSTGAME_EXPERIMENT_SOURCE_ROOM_MISSING");
  }
  return freeze({
    roomId: required(aggregate.roomId, "aggregate.roomId"),
    roomRevision: Number(aggregate.roomRevision),
    stateRevision: Number(aggregate.stateRevision),
    stateHash: required(aggregate.envelope.stateHash,
      "aggregate.envelope.stateHash"),
    journalHeadHash: required(aggregate.envelope.journalHeadHash,
      "aggregate.envelope.journalHeadHash"),
    privateJournalSequence: Number(aggregate.privateJournalSequence),
    publicJournalSequence: Number(aggregate.publicJournalSequence),
    seatRecoveryRevision: Number(aggregate.seatRecoveryRevision),
  });
}

function acceptedReceipts(bundle) {
  return (bundle?.privateJournal || [])
    .filter((entry) => entry?.payload?.type === "accepted_transition")
    .map((entry) => ({
      sequence: entry.sequence,
      receipt: clone(entry.payload.payload?.receipt),
    }));
}

function checkpointIdentity(checkpoint) {
  if (!object(checkpoint)) {
    throw new TypeError("checkpoint is required");
  }
  return freeze({
    checkpointId: required(checkpoint.checkpointId,
      "checkpoint.checkpointId"),
    stateRevision: Number(checkpoint.stateRevision),
    stateHash: required(checkpoint.stateHash, "checkpoint.stateHash"),
    rngCursor: required(checkpoint.rngCursor, "checkpoint.rngCursor"),
    replayRef: clone(checkpoint.replayRef),
  });
}

function executionIdentity(input) {
  return hashStarcraftTmgContract({
    executionKey: input.executionKey,
    pairId: input.pairId,
    armName: input.armName,
    sourceCheckpoint: input.sourceCheckpoint,
    scenarioContext: input.scenarioContext,
    evaluationSplit: input.evaluationSplit,
    rng: input.rng,
    subjectSeat: input.subjectSeat,
    subjectStrategyRef: input.subjectStrategyRef,
    subjectModelRef: input.subjectModelRef,
    subjectPromptPackRef: input.subjectPromptPackRef,
    opponentPolicy: input.opponentPolicy,
  });
}

export function createStarcraftTmgRoomBackedPostgameExperimentPortV1(
  options = {},
) {
  const roomId = required(options.roomId, "roomId");
  const roomStore = options.roomStore;
  const authorityEngine = options.authorityEngine;
  const branchExecutor = options.branchExecutor;
  if (typeof roomStore?.loadRoom !== "function"
    || typeof roomStore?.loadReplayBundle !== "function") {
    throw new TypeError("roomStore loadRoom/loadReplayBundle are required");
  }
  if (typeof authorityEngine?.replay !== "function") {
    throw new TypeError("authorityEngine.replay is required");
  }
  if (typeof branchExecutor?.run !== "function") {
    throw new TypeError("branchExecutor.run is required");
  }

  const clones = new Map();
  const executions = new Map();

  async function reconstruct(checkpointInput) {
    const checkpoint = checkpointIdentity(checkpointInput);
    const bundle = await roomStore.loadReplayBundle(roomId);
    if (!object(bundle?.initialEnvelope)
      || !object(bundle?.currentAggregate?.envelope)) {
      throw new Error("POSTGAME_EXPERIMENT_REPLAY_SOURCE_MISSING");
    }
    const receipts = acceptedReceipts(bundle);
    const actionReceipt = receipts.find((entry) => (
      entry.receipt?.preStateRevision === checkpoint.stateRevision
      && entry.receipt?.preStateHash === checkpoint.stateHash
    ));
    if (!actionReceipt
      || checkpoint.replayRef?.hash !== actionReceipt.receipt.journalHash) {
      throw new Error("POSTGAME_EXPERIMENT_CHECKPOINT_RECEIPT_DRIFT");
    }
    const prefix = receipts.filter((entry) =>
      Number(entry.receipt?.postStateRevision) <= checkpoint.stateRevision)
      .map((entry) => entry.receipt);
    const replayed = authorityEngine.replay({
      initialEnvelope: bundle.initialEnvelope,
      journal: prefix,
    });
    if (replayed?.ok !== true
      || replayed.envelope?.stateRevision !== checkpoint.stateRevision
      || replayed.envelope?.stateHash !== checkpoint.stateHash) {
      throw new Error("POSTGAME_EXPERIMENT_CHECKPOINT_REPLAY_DIVERGED");
    }
    return freeze({
      checkpoint,
      envelope: clone(replayed.envelope),
      sourceTerminalStateHash: bundle.currentAggregate.envelope.stateHash,
      sourceJournalTailHash:
        bundle.currentAggregate.envelope.journalHeadHash,
      prefixAcceptedTransitionCount: prefix.length,
    });
  }

  async function cloneCheckpoint(input = {}) {
    const cloneKey = required(input.cloneKey, "cloneKey");
    if (input.isolated !== true) {
      throw new Error("POSTGAME_EXPERIMENT_ISOLATED_CLONE_REQUIRED");
    }
    const reconstructed = await reconstruct(input.checkpoint);
    const cloneIdentity = hashStarcraftTmgContract({
      cloneKey,
      roomId,
      checkpoint: reconstructed.checkpoint,
      sourceTerminalStateHash: reconstructed.sourceTerminalStateHash,
      sourceJournalTailHash: reconstructed.sourceJournalTailHash,
    });
    const existing = clones.get(cloneKey);
    if (existing && existing.cloneIdentity !== cloneIdentity) {
      throw new Error("POSTGAME_EXPERIMENT_CLONE_KEY_DRIFT");
    }
    const record = existing || freeze({
      cloneIdentity,
      checkpoint: reconstructed.checkpoint,
      envelope: reconstructed.envelope,
      sourceTerminalStateHash: reconstructed.sourceTerminalStateHash,
      sourceJournalTailHash: reconstructed.sourceJournalTailHash,
      prefixAcceptedTransitionCount:
        reconstructed.prefixAcceptedTransitionCount,
    });
    clones.set(cloneKey, record);
    return freeze({
      ok: true,
      exact: true,
      sourceCheckpointId: record.checkpoint.checkpointId,
      cloneRef: {
        schemaVersion:
          `${STARCRAFT_TMG_ROOM_BACKED_POSTGAME_EXPERIMENT_PORT_VERSION}.clone-ref`,
        cloneKey,
        cloneIdentity: record.cloneIdentity,
        sourceRoomId: roomId,
        stateRevision: record.checkpoint.stateRevision,
        stateHash: record.checkpoint.stateHash,
        sourceTerminalStateHash: record.sourceTerminalStateHash,
        sourceJournalTailHash: record.sourceJournalTailHash,
      },
      sourceRoomMutationCalls: 0,
      eligibleForTraining: false,
      trainingTruth: false,
    });
  }

  async function resolveClone(input) {
    const cloneRef = input.clonedCheckpointRef;
    if (!object(cloneRef)
      || cloneRef.sourceRoomId !== roomId
      || cloneRef.stateHash !== input.sourceCheckpoint?.stateHash) {
      throw new Error("POSTGAME_EXPERIMENT_CLONE_REF_INVALID");
    }
    let record = clones.get(cloneRef.cloneKey);
    if (!record) {
      await cloneCheckpoint({
        cloneKey: cloneRef.cloneKey,
        checkpoint: input.sourceCheckpoint,
        isolated: true,
      });
      record = clones.get(cloneRef.cloneKey);
    }
    if (!record || record.cloneIdentity !== cloneRef.cloneIdentity) {
      throw new Error("POSTGAME_EXPERIMENT_CLONE_REF_DRIFT");
    }
    return record;
  }

  async function executeArm(input = {}) {
    const executionKey = required(input.executionKey, "executionKey");
    if (input.opponentResponseSearch !== true
      || input.realTrajectoryMutationAllowed !== false
      || input.hiddenEvaluatorContextVisibleToGameplayAgent !== false) {
      throw new Error("POSTGAME_EXPERIMENT_EXECUTION_BOUNDARY_INVALID");
    }
    const identity = executionIdentity(input);
    const existing = executions.get(executionKey);
    if (existing?.identity !== identity) {
      if (existing) {
        throw new Error("POSTGAME_EXPERIMENT_EXECUTION_KEY_DRIFT");
      }
    } else if (existing.status === "completed") {
      return clone(existing.result);
    } else {
      throw new Error("POSTGAME_EXPERIMENT_EXECUTION_COMMIT_UNKNOWN");
    }
    const cloned = await resolveClone(input);
    const sourceBefore = sourceRoomIdentity(await roomStore.loadRoom(roomId));
    executions.set(executionKey, freeze({ identity, status: "running" }));
    let raw;
    try {
      raw = await branchExecutor.run({
        ...clone(input),
        sourceRoomId: roomId,
        sourceRoomMutationAllowed: false,
        initialEnvelope: clone(cloned.envelope),
        initialEnvelopeHash: hashStarcraftTmgContract(cloned.envelope),
        isolatedBranchRequired: true,
        exactRulesReplayRequired: true,
        hiddenChainOfThoughtRequested: false,
        trainingTruth: false,
      });
    } catch (error) {
      executions.set(executionKey, freeze({
        identity,
        status: "commit_unknown",
        errorCode: String(error?.code || error?.message || "unknown"),
      }));
      throw error;
    }
    const sourceAfter = sourceRoomIdentity(await roomStore.loadRoom(roomId));
    if (hashStarcraftTmgContract(sourceBefore)
      !== hashStarcraftTmgContract(sourceAfter)) {
      throw new Error("POSTGAME_EXPERIMENT_MUTATED_SOURCE_ROOM");
    }
    if (raw?.ok !== true || raw?.replayMatchesCurrent !== true
      || raw?.initialStateHash !== cloned.checkpoint.stateHash
      || !object(raw?.metrics) || !object(raw?.trajectoryRef)) {
      throw new Error("POSTGAME_EXPERIMENT_BRANCH_RESULT_INVALID");
    }
    const result = freeze({
      ok: true,
      executionKey,
      checkpointId: cloned.checkpoint.checkpointId,
      rngSeed: required(input.rng?.seed, "rng.seed"),
      subjectStrategyHash: required(input.subjectStrategyRef?.hash,
        "subjectStrategyRef.hash"),
      opponentStrategyHash: required(
        input.opponentPolicy?.strategySnapshotRef?.hash,
        "opponentPolicy.strategySnapshotRef.hash",
      ),
      metrics: clone(raw.metrics),
      trajectoryRef: clone(raw.trajectoryRef),
      opponentResponseTrace: clone(raw.opponentResponseTrace || []),
      replayMatchesCurrent: true,
      isolatedClone: true,
      sourceRoomIdentityBefore: sourceBefore,
      sourceRoomIdentityAfter: sourceAfter,
      sourceRoomMutationCalls: 0,
      realTrajectoryMutationCalls: 0,
      hiddenEvaluatorContextProjectedToGameplayAgent: false,
      hiddenChainOfThoughtStored: false,
      eligibleForTraining: false,
      trainingTruth: false,
    });
    executions.set(executionKey, freeze({
      identity,
      status: "completed",
      result,
    }));
    return result;
  }

  async function readExecution(input = {}) {
    const executionKey = required(input.executionKey, "executionKey");
    const local = executions.get(executionKey);
    if (local?.status === "completed") {
      return freeze({ status: "completed", result: clone(local.result) });
    }
    if (local?.status === "running" || local?.status === "commit_unknown") {
      if (typeof branchExecutor.readExecution === "function") {
        const recovered = await branchExecutor.readExecution({ executionKey });
        if (recovered?.status === "completed") {
          return freeze({ status: "completed", result: clone(recovered.result) });
        }
        if (recovered?.status === "definitely_not_started") {
          executions.delete(executionKey);
          return freeze({ status: "definitely_not_started" });
        }
      }
      return freeze({ status: "commit_unknown" });
    }
    if (typeof branchExecutor.readExecution === "function") {
      return freeze(clone(await branchExecutor.readExecution({ executionKey })));
    }
    return freeze({ status: "definitely_not_started" });
  }

  function read() {
    return freeze({
      schemaVersion:
        `${STARCRAFT_TMG_ROOM_BACKED_POSTGAME_EXPERIMENT_PORT_VERSION}.projection`,
      roomId,
      exactCloneCount: clones.size,
      executions: [...executions.entries()].map(([executionKey, row]) => ({
        executionKey,
        status: row.status,
      })),
      sourceRoomMutationCalls: 0,
      hiddenChainOfThoughtStored: false,
      automaticSkillPromotion: false,
      eligibleForTraining: false,
      trainingTruth: false,
    });
  }

  return freeze({ cloneCheckpoint, executeArm, readExecution, read });
}
