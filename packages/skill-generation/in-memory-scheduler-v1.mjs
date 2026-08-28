import { hashStarcraftTmgContract } from "../authoritative-engine/transition-v1.mjs";
import { assertStarcraftTmgSkillExperimentContract } from "./experiment-contracts-v1.mjs";

export const STARCRAFT_TMG_SKILL_SCHEDULER_VERSION = "starcraft_tmg_skill_scheduler_v1";

function clone(value) {
  if (value === undefined) return undefined;
  return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function requiredString(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new Error(`${field} is required`);
  return normalized;
}

function zeroBudget() {
  return { nodeLeases: 0, providerAttempts: 0, inputTokens: 0, outputTokens: 0, wallMs: 0, estimatedCost: 0 };
}

function normalizedBudgetDelta(input = {}) {
  const output = {};
  for (const field of ["providerAttempts", "inputTokens", "outputTokens", "wallMs"]) {
    const value = Number(input[field] || 0);
    if (!Number.isSafeInteger(value) || value < 0) throw new Error(`budgetDelta.${field} must be a non-negative safe integer`);
    output[field] = value;
  }
  output.estimatedCost = Number(input.estimatedCost || 0);
  if (!Number.isFinite(output.estimatedCost) || output.estimatedCost < 0) throw new Error("budgetDelta.estimatedCost must be non-negative");
  return output;
}

function addBudget(target, delta) {
  for (const field of ["providerAttempts", "inputTokens", "outputTokens", "wallMs", "estimatedCost"]) target[field] += delta[field];
}

function budgetExceeded(used, maximum) {
  return used.nodeLeases > maximum.maxNodeLeases
    || used.providerAttempts > maximum.maxProviderAttempts
    || used.inputTokens > maximum.maxInputTokens
    || used.outputTokens > maximum.maxOutputTokens
    || used.wallMs > maximum.maxWallMs
    || used.estimatedCost > maximum.maxEstimatedCost;
}

function projection(state) {
  return {
    schemaVersion: `${STARCRAFT_TMG_SKILL_SCHEDULER_VERSION}.projection`,
    experimentId: state.manifest.experimentId,
    manifestHash: state.manifest.integrity.hash,
    status: state.status,
    nodes: state.nodeOrder.map((nodeId) => {
      const node = state.nodes.get(nodeId);
      return {
        nodeId,
        dependencies: clone(node.dependencies),
        status: node.status,
        attempts: node.attempts,
        fenceEpoch: node.fenceEpoch,
        lease: node.lease ? {
          leaseId: node.lease.leaseId,
          workerId: node.lease.workerId,
          expiresAt: node.lease.expiresAt,
          fenceTokenHash: node.lease.fenceTokenHash,
        } : null,
        checkpoints: clone(node.checkpoints),
        artifactHash: node.artifactHash,
        failureClass: node.failureClass,
      };
    }),
    budgetUsed: clone(state.budgetUsed),
    durability: "process_memory_v0",
    productionReady: false,
    trainingTruth: false,
  };
}

export function createStarcraftTmgInMemorySkillScheduler(options = {}) {
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const createLeaseId = typeof options.createLeaseId === "function" ? options.createLeaseId : ({ experimentId, nodeId, attempt }) => `lease-${experimentId}-${nodeId}-${attempt}`;
  const createFenceToken = typeof options.createFenceToken === "function" ? options.createFenceToken : ({ experimentId, nodeId, epoch }) => hashStarcraftTmgContract({ experimentId, nodeId, epoch, nonce: now() });
  const experiments = new Map();
  const idempotency = new Map();

  function idempotent(commandId, fn) {
    const id = requiredString(commandId, "commandId");
    if (idempotency.has(id)) return clone(idempotency.get(id));
    const result = fn();
    idempotency.set(id, clone(result));
    return result;
  }

  function get(experimentId) {
    return experiments.get(String(experimentId || "")) || null;
  }

  function appendWal(state, event) {
    const stateProjection = projection(state);
    const unsigned = {
      schemaVersion: `${STARCRAFT_TMG_SKILL_SCHEDULER_VERSION}.wal-entry`,
      sequence: state.wal.length + 1,
      previousHash: state.wal.at(-1)?.entryHash || null,
      event: clone(event),
      stateHash: hashStarcraftTmgContract(stateProjection),
      stateProjection,
    };
    const entry = deepFreeze({ ...unsigned, entryHash: hashStarcraftTmgContract(unsigned) });
    state.wal.push(entry);
    return entry;
  }

  function submitExperiment(input = {}) {
    return idempotent(input.commandId, () => {
      const manifest = assertStarcraftTmgSkillExperimentContract(input.experimentManifest, "experiment-manifest");
      if (experiments.has(manifest.experimentId)) return deepFreeze({ ok: false, reason: "experiment_already_exists" });
      const nodes = new Map(manifest.dag.map((node) => [node.nodeId, {
        nodeId: node.nodeId,
        dependencies: clone(node.dependencies),
        status: "pending",
        attempts: 0,
        fenceEpoch: 0,
        lease: null,
        checkpoints: [],
        artifactHash: null,
        failureClass: null,
      }]));
      const state = {
        manifest,
        nodeOrder: manifest.dag.map((node) => node.nodeId),
        nodes,
        status: "running",
        budgetUsed: zeroBudget(),
        wal: [],
      };
      experiments.set(manifest.experimentId, state);
      appendWal(state, { eventType: "experiment_submitted", occurredAt: new Date(input.occurredAt || now()).toISOString() });
      return deepFreeze({ ok: true, experiment: projection(state) });
    });
  }

  function expireLeases(state, at) {
    for (const node of state.nodes.values()) {
      if (node.status !== "running" || new Date(node.lease.expiresAt).getTime() > at.getTime()) continue;
      const expiredLease = clone(node.lease);
      node.lease = null;
      if (node.attempts < state.manifest.schedulerPolicy.maxNodeAttempts) {
        node.status = "pending";
        node.failureClass = "LEASE_EXPIRED";
      } else {
        node.status = "failed";
        node.failureClass = "LEASE_EXPIRED";
        state.status = "failed";
      }
      appendWal(state, { eventType: "lease_expired", nodeId: node.nodeId, leaseId: expiredLease.leaseId, fenceTokenHash: expiredLease.fenceTokenHash, occurredAt: at.toISOString() });
    }
  }

  function leaseNext(input = {}) {
    return idempotent(input.commandId, () => {
      const state = get(input.experimentId);
      if (!state) return deepFreeze({ ok: false, reason: "experiment_not_found" });
      const at = new Date(input.occurredAt || now());
      expireLeases(state, at);
      if (state.status !== "running") return deepFreeze({ ok: false, reason: `experiment_${state.status}` });
      if (state.budgetUsed.nodeLeases + 1 > state.manifest.totalBudget.maxNodeLeases) {
        state.status = "budget_exhausted";
        appendWal(state, { eventType: "budget_exhausted", occurredAt: at.toISOString() });
        return deepFreeze({ ok: false, reason: "experiment_budget_exhausted" });
      }
      const node = state.nodeOrder.map((nodeId) => state.nodes.get(nodeId)).find((candidate) => candidate.status === "pending"
        && candidate.dependencies.every((dependency) => state.nodes.get(dependency)?.status === "complete"));
      if (!node) return deepFreeze({ ok: false, reason: "no_ready_node" });
      node.attempts += 1;
      node.fenceEpoch += 1;
      const fenceToken = requiredString(createFenceToken({ experimentId: state.manifest.experimentId, nodeId: node.nodeId, epoch: node.fenceEpoch }), "fenceToken");
      const leaseId = requiredString(createLeaseId({ experimentId: state.manifest.experimentId, nodeId: node.nodeId, attempt: node.attempts }), "leaseId");
      const leaseMs = Number(input.leaseMs || state.manifest.schedulerPolicy.leaseMs);
      if (!Number.isSafeInteger(leaseMs) || leaseMs < 1) throw new Error("leaseMs must be a positive safe integer");
      node.status = "running";
      node.lease = {
        leaseId,
        workerId: requiredString(input.workerId, "workerId"),
        expiresAt: new Date(at.getTime() + leaseMs).toISOString(),
        fenceTokenHash: hashStarcraftTmgContract(fenceToken),
      };
      state.budgetUsed.nodeLeases += 1;
      appendWal(state, { eventType: "node_leased", nodeId: node.nodeId, attempt: node.attempts, fenceEpoch: node.fenceEpoch, lease: clone(node.lease), occurredAt: at.toISOString() });
      return deepFreeze({
        ok: true,
        experimentId: state.manifest.experimentId,
        nodeId: node.nodeId,
        attempt: node.attempts,
        leaseId,
        fenceToken,
        expiresAt: node.lease.expiresAt,
      });
    });
  }

  function authorizedNode(state, input) {
    const node = state.nodes.get(String(input.nodeId || ""));
    if (!node || node.status !== "running" || !node.lease) return { ok: false, reason: "active_lease_not_found" };
    if (node.lease.leaseId !== input.leaseId || node.lease.fenceTokenHash !== hashStarcraftTmgContract(String(input.fenceToken || ""))) {
      return { ok: false, reason: "stale_or_invalid_fence" };
    }
    if (new Date(node.lease.expiresAt).getTime() <= new Date(input.occurredAt || now()).getTime()) return { ok: false, reason: "lease_expired" };
    return { ok: true, node };
  }

  function heartbeat(input = {}) {
    return idempotent(input.commandId, () => {
      const state = get(input.experimentId);
      if (!state) return deepFreeze({ ok: false, reason: "experiment_not_found" });
      const authorized = authorizedNode(state, input);
      if (!authorized.ok) return deepFreeze(authorized);
      const at = new Date(input.occurredAt || now());
      const leaseMs = Number(input.leaseMs || state.manifest.schedulerPolicy.leaseMs);
      if (!Number.isSafeInteger(leaseMs) || leaseMs < 1) throw new Error("leaseMs must be a positive safe integer");
      authorized.node.lease.expiresAt = new Date(at.getTime() + leaseMs).toISOString();
      appendWal(state, { eventType: "lease_renewed", nodeId: authorized.node.nodeId, leaseId: authorized.node.lease.leaseId, expiresAt: authorized.node.lease.expiresAt, occurredAt: at.toISOString() });
      return deepFreeze({ ok: true, expiresAt: authorized.node.lease.expiresAt });
    });
  }

  function applyBudget(state, delta) {
    addBudget(state.budgetUsed, delta);
    if (!budgetExceeded(state.budgetUsed, state.manifest.totalBudget)) return true;
    state.status = "budget_exhausted";
    return false;
  }

  function checkpoint(input = {}) {
    return idempotent(input.commandId, () => {
      const state = get(input.experimentId);
      if (!state) return deepFreeze({ ok: false, reason: "experiment_not_found" });
      const authorized = authorizedNode(state, input);
      if (!authorized.ok) return deepFreeze(authorized);
      const delta = normalizedBudgetDelta(input.budgetDelta);
      const artifactHash = requiredString(input.artifactHash, "artifactHash");
      const checkpointEntry = {
        checkpointId: requiredString(input.checkpointId, "checkpointId"),
        artifactHash,
        budgetDelta: delta,
        occurredAt: new Date(input.occurredAt || now()).toISOString(),
      };
      if (authorized.node.checkpoints.some((entry) => entry.checkpointId === checkpointEntry.checkpointId)) return deepFreeze({ ok: false, reason: "checkpoint_id_conflict" });
      authorized.node.checkpoints.push(checkpointEntry);
      const withinBudget = applyBudget(state, delta);
      if (!withinBudget) {
        authorized.node.status = "failed";
        authorized.node.failureClass = "BUDGET_EXCEEDED";
        authorized.node.lease = null;
      }
      appendWal(state, { eventType: withinBudget ? "node_checkpointed" : "budget_exhausted", nodeId: authorized.node.nodeId, checkpoint: checkpointEntry });
      return deepFreeze({ ok: withinBudget, reason: withinBudget ? null : "experiment_budget_exhausted", checkpoint: clone(checkpointEntry), budgetUsed: clone(state.budgetUsed) });
    });
  }

  function finishNode(input = {}) {
    return idempotent(input.commandId, () => {
      const state = get(input.experimentId);
      if (!state) return deepFreeze({ ok: false, reason: "experiment_not_found" });
      const authorized = authorizedNode(state, input);
      if (!authorized.ok) return deepFreeze(authorized);
      const node = authorized.node;
      const disposition = requiredString(input.disposition, "disposition");
      if (!["complete", "failed"].includes(disposition)) throw new Error(`unsupported node disposition: ${disposition}`);
      const delta = normalizedBudgetDelta(input.budgetDelta);
      if (!applyBudget(state, delta)) {
        node.status = "failed";
        node.failureClass = "BUDGET_EXCEEDED";
        node.lease = null;
        appendWal(state, { eventType: "budget_exhausted", nodeId: node.nodeId, occurredAt: new Date(input.occurredAt || now()).toISOString() });
        return deepFreeze({ ok: false, reason: "experiment_budget_exhausted" });
      }
      const occurredAt = new Date(input.occurredAt || now()).toISOString();
      const lease = clone(node.lease);
      node.lease = null;
      if (disposition === "complete") {
        node.status = "complete";
        node.artifactHash = requiredString(input.artifactHash, "artifactHash");
        node.failureClass = null;
      } else if (disposition === "failed") {
        const failureClass = requiredString(input.failureClass, "failureClass");
        const retryable = state.manifest.schedulerPolicy.retryableFailureClasses.includes(failureClass)
          && node.attempts < state.manifest.schedulerPolicy.maxNodeAttempts;
        node.status = retryable ? "pending" : "failed";
        node.failureClass = failureClass;
        if (!retryable) state.status = "failed";
      }
      if (state.nodeOrder.every((nodeId) => state.nodes.get(nodeId).status === "complete")) state.status = "complete";
      appendWal(state, {
        eventType: disposition === "complete" ? "node_completed" : "node_failed",
        nodeId: node.nodeId,
        disposition,
        artifactHash: node.artifactHash,
        failureClass: node.failureClass,
        leaseId: lease.leaseId,
        fenceTokenHash: lease.fenceTokenHash,
        budgetDelta: delta,
        occurredAt,
      });
      return deepFreeze({ ok: true, experiment: projection(state) });
    });
  }

  function inspectExperiment(input = {}) {
    const state = get(input.experimentId);
    if (!state) return deepFreeze({ ok: false, reason: "experiment_not_found" });
    return deepFreeze({ ok: true, experiment: projection(state), walHead: state.wal.at(-1)?.entryHash || null });
  }

  function exportWal(input = {}) {
    const state = get(input.experimentId);
    if (!state) return deepFreeze({ ok: false, reason: "experiment_not_found" });
    return deepFreeze({ ok: true, experimentId: state.manifest.experimentId, manifestHash: state.manifest.integrity.hash, entries: clone(state.wal) });
  }

  return Object.freeze({ submitExperiment, leaseNext, heartbeat, checkpoint, finishNode, inspectExperiment, exportWal });
}

export function replayStarcraftTmgSkillSchedulerWal(input = {}) {
  const entries = input.entries || [];
  let previousHash = null;
  let finalProjection = null;
  for (const entry of entries) {
    const { entryHash, ...unsigned } = entry;
    if (entry.previousHash !== previousHash || hashStarcraftTmgContract(unsigned) !== entryHash) throw new Error("Skill Scheduler WAL chain mismatch");
    if (hashStarcraftTmgContract(entry.stateProjection) !== entry.stateHash) throw new Error("Skill Scheduler WAL state projection mismatch");
    previousHash = entryHash;
    finalProjection = entry.stateProjection;
  }
  return deepFreeze({ ok: true, entryCount: entries.length, walHead: previousHash, finalProjection: clone(finalProjection), trainingTruth: false });
}
