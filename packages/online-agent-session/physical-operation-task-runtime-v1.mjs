import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_PHYSICAL_OPERATION_TASK_RUNTIME_VERSION =
  "starcraft_tmg_physical_operation_task_runtime_v1";

const ACTIVE_STATUSES = new Set([
  "pending_human", "delegated_agent", "rules_dispute",
  "awaiting_authoritative_correction",
]);
const CUSTODY_MODES = new Set(["human", "agent", "digital_only"]);

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
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
function iso(value, field) {
  const result = new Date(value).toISOString();
  if (!Number.isFinite(Date.parse(result))) throw new TypeError(`${field} is invalid`);
  return result;
}
function scope(input = {}) {
  const body = {
    gameId: required(input.gameId || "starcraft-tmg", "scope.gameId"),
    roomId: required(input.roomId, "scope.roomId"),
    matchBindingHash: required(input.matchBindingHash,
      "scope.matchBindingHash"),
  };
  if (body.gameId !== "starcraft-tmg") {
    throw new TypeError("scope.gameId must be starcraft-tmg");
  }
  return freezeDeep({ ...body,
    scopeKey: hashStarcraftTmgContract(body) });
}
function same(left, right) {
  return hashStarcraftTmgContract(left) === hashStarcraftTmgContract(right);
}
function position(value = {}) {
  const xInches = Number(value.xInches);
  const yInches = Number(value.yInches);
  const rotationDegrees = Number(value.baseRotationDegrees
    ?? value.rotationDegrees ?? 0);
  return {
    xInches: Number.isFinite(xInches) ? xInches : null,
    yInches: Number.isFinite(yInches) ? yInches : null,
    rotationDegrees: Number.isFinite(rotationDegrees) ? rotationDegrees : 0,
  };
}
function physicalState(value = {}) {
  return {
    isOnField: value.isOnField !== false,
    isDestroyed: value.isDestroyed === true,
    position: position(value),
  };
}
function unitState(piece = {}) {
  return {
    currentModels: Number(piece.currentModels || 0),
    damageMarker: Number(piece.damageMarker || 0),
    statuses: [...new Set((piece.statuses || []).map(String))].sort(),
    deploymentStatus: String(piece.deploymentStatus || ""),
  };
}
function modelRows(state = {}) {
  return (state.pieces || []).flatMap((piece) => {
    const models = Array.isArray(piece.models) && piece.models.length > 0
      ? piece.models : [{ ...piece, id: piece.id }];
    return models.map((model) => ({
      objectId: required(model.id, "model.id"),
      objectType: model.id === piece.id ? "unit" : "model",
      pieceId: required(piece.id, "piece.id"),
      ownerSideKey: required(piece.sideKey, "piece.sideKey"),
      state: physicalState(model),
      unitState: null,
    }));
  });
}
function componentRows(state = {}) {
  const board = state.board || {};
  return [
    ["token", board.tokens || []],
    ["marker", board.markers || []],
    ["effect_marker", board.effectMarkers || []],
  ].flatMap(([objectType, rows]) => rows.map((entry) => ({
    objectId: required(entry.id, `${objectType}.id`),
    objectType,
    pieceId: null,
    ownerSideKey: String(entry.sideKey || entry.ownerSideKey
      || entry.controlSideKey || "shared"),
    state: {
      isOnField: entry.isRemoved !== true,
      isDestroyed: entry.isDestroyed === true,
      position: position(entry),
    },
    unitState: {
      isActivated: entry.isActivated === true,
      status: String(entry.status || ""),
      value: Number(entry.value || 0),
    },
  })));
}
function rowsById(state) {
  return new Map([...modelRows(state), ...componentRows(state)].map((entry) => [
    `${entry.objectType}:${entry.objectId}`, entry,
  ]));
}
function unitsById(state = {}) {
  return new Map((state.pieces || []).map((piece) => [piece.id, piece]));
}
function operationKind(before, after) {
  if (!before && after?.state.isOnField && !after.state.isDestroyed) {
    return after.objectType === "model" || after.objectType === "unit"
      ? "place_model" : "place_component";
  }
  if (before?.state.isOnField && !before.state.isDestroyed
    && (!after || after.state.isOnField === false || after.state.isDestroyed)) {
    return before.objectType === "model" || before.objectType === "unit"
      ? "remove_model" : "remove_component";
  }
  if (!before || !after || after.state.isOnField === false
    || after.state.isDestroyed) return null;
  if (!same(before.state.position, after.state.position)) {
    return after.objectType === "model" || after.objectType === "unit"
      ? "move_model" : "move_component";
  }
  if (!same(before.unitState, after.unitState)) {
    return after.objectType === "model" || after.objectType === "unit"
      ? "record_unit_damage_or_status" : "update_component_state";
  }
  return null;
}
function deriveOperations(beforeState, afterState, custody) {
  const before = rowsById(beforeState);
  const after = rowsById(afterState);
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort();
  const physicalOperations = keys.flatMap((key) => {
    const prior = before.get(key) || null;
    const next = after.get(key) || null;
    const kind = operationKind(prior, next);
    const row = next || prior;
    const custodyMode = custody[row.ownerSideKey] || custody.shared;
    if (!kind || custodyMode === "digital_only") return [];
    const body = {
      operationKind: kind,
      objectType: row.objectType,
      objectId: row.objectId,
      pieceId: row.pieceId,
      ownerSideKey: row.ownerSideKey,
      custodyMode,
      expectedPhysicalState: clone(next?.state || { isOnField: false,
        isDestroyed: true, position: null }),
      expectedUnitOrComponentState: clone(next?.unitState || null),
      beforePhysicalState: clone(prior?.state || null),
    };
    return [{ ...body,
      operationId: `physical-op-${hashStarcraftTmgContract(body).slice(0, 24)}` }];
  });
  const beforeUnits = unitsById(beforeState);
  const afterUnits = unitsById(afterState);
  const unitOperations = [...new Set([...beforeUnits.keys(), ...afterUnits.keys()])]
    .sort().flatMap((pieceId) => {
      const prior = beforeUnits.get(pieceId);
      const next = afterUnits.get(pieceId);
      if (!prior || !next || same(unitState(prior), unitState(next))) return [];
      const ownerSideKey = String(next.sideKey || prior.sideKey || "shared");
      const custodyMode = custody[ownerSideKey] || custody.shared;
      if (custodyMode === "digital_only") return [];
      const body = {
        operationKind: "record_unit_damage_or_status",
        objectType: "unit",
        objectId: pieceId,
        pieceId,
        ownerSideKey,
        custodyMode,
        expectedPhysicalState: physicalState(next),
        expectedUnitOrComponentState: unitState(next),
        beforePhysicalState: physicalState(prior),
      };
      return [{ ...body,
        operationId: `physical-op-${hashStarcraftTmgContract(body).slice(0, 24)}` }];
    });
  return [...physicalOperations, ...unitOperations].sort((left, right) => (
    left.operationId.localeCompare(right.operationId)));
}
function record(scopeValue) {
  return {
    schemaVersion: `${STARCRAFT_TMG_PHYSICAL_OPERATION_TASK_RUNTIME_VERSION}.record`,
    scope: clone(scopeValue), revision: 0, tasks: [],
    pendingTransitionObservations: [], trainingTruth: false,
  };
}
function activeTasks(value) {
  return (value?.tasks || []).filter((task) => ACTIVE_STATUSES.has(task.status));
}
function syncStatus(value) {
  const active = activeTasks(value);
  if (active.some((task) => ["rules_dispute",
    "awaiting_authoritative_correction"].includes(task.status))) {
    return "rules_dispute";
  }
  return active.length > 0 ? "physical_sync_pending" : "in_sync";
}
function projection(value) {
  const body = {
    schemaVersion:
      `${STARCRAFT_TMG_PHYSICAL_OPERATION_TASK_RUNTIME_VERSION}.projection`,
    scope: clone(value.scope), revision: value.revision,
    syncStatus: syncStatus(value), activeTaskCount: activeTasks(value).length,
    pendingTransitionObservationCount:
      (value.pendingTransitionObservations || []).length,
    tasks: clone(value.tasks),
    normalDisagreementCanRejectAcceptedOpponentAction: false,
    rulesDisputeCanPauseSynchronization: true,
    acceptedDigitalFactsRolledBackByPendingPhysicalTask: false,
    productionRoomEligible: false, trainingTruth: false,
  };
  return freezeDeep({ ...body,
    projectionHash: hashStarcraftTmgContract(body) });
}

export function createInMemoryStarcraftTmgPhysicalOperationTaskStoreV1() {
  const records = new Map();
  return Object.freeze({
    durability: "process_memory_development_only",
    async load(scopeKey) { return clone(records.get(scopeKey) || null); },
    async commit(scopeKey, expectedRevision, next) {
      const current = records.get(scopeKey) || null;
      if ((current?.revision ?? null) !== expectedRevision) {
        return { ok: false, reason: "PHYSICAL_TASK_STORE_REVISION_CONFLICT" };
      }
      records.set(scopeKey, clone(next));
      return { ok: true, revision: next.revision };
    },
  });
}

export function createStarcraftTmgPhysicalOperationTaskRuntimeV1(options = {}) {
  const store = options.store
    || createInMemoryStarcraftTmgPhysicalOperationTaskStoreV1();
  const now = typeof options.now === "function"
    ? options.now : () => new Date().toISOString();
  const custody = { player1: "human", player2: "human", shared: "human",
    ...(options.physicalCustodyBySide || {}) };
  if (Object.values(custody).some((value) => !CUSTODY_MODES.has(value))) {
    throw new TypeError("physical custody mode is invalid");
  }
  const records = new Map();

  async function load(scopeValue) {
    let value = records.get(scopeValue.scopeKey)
      || await store.load(scopeValue.scopeKey);
    if (!value) {
      value = record(scopeValue);
      const created = await store.commit(scopeValue.scopeKey, null, value);
      if (created?.ok !== true) throw new Error(created?.reason
        || "PHYSICAL_TASK_STORE_CREATE_FAILED");
    }
    records.set(scopeValue.scopeKey, value);
    return value;
  }
  async function persist(value, tasks) {
    const next = { ...clone(value), revision: value.revision + 1,
      tasks: clone(tasks.tasks ?? tasks),
      pendingTransitionObservations: clone(
        tasks.pendingTransitionObservations
          ?? value.pendingTransitionObservations ?? []),
    };
    const committed = await store.commit(value.scope.scopeKey, value.revision, next);
    if (committed?.ok !== true) throw new Error(committed?.reason
      || "PHYSICAL_TASK_STORE_COMMIT_FAILED");
    records.set(value.scope.scopeKey, next);
    return next;
  }
  async function stageAcceptedTransition(input = {}) {
    const scopeValue = scope(input.scope || input);
    const applyRequestKey = required(input.applyRequestKey, "applyRequestKey");
    let value = await load(scopeValue);
    const pending = value.pendingTransitionObservations || [];
    const existing = pending.find((entry) => entry.applyRequestKey === applyRequestKey);
    if (existing) return freezeDeep({ ok: true, staged: false,
      idempotent: true, observationId: existing.observationId,
      projection: projection(value) });
    const body = {
      applyRequestKey,
      beforeState: clone(input.beforeState || {}),
      stagedAt: iso(now(), "now"),
      trainingTruth: false,
    };
    const observation = { ...body,
      observationId: `physical-observation-${hashStarcraftTmgContract({
        scopeKey: scopeValue.scopeKey, applyRequestKey,
      }).slice(0, 24)}` };
    value = await persist(value, { tasks: value.tasks,
      pendingTransitionObservations: [...pending, observation] });
    return freezeDeep({ ok: true, staged: true,
      observationId: observation.observationId, projection: projection(value) });
  }
  async function observeAcceptedTransition(input = {}) {
    const scopeValue = scope(input.scope || input);
    const authorityReceiptHash = required(input.authorityReceiptHash,
      "authorityReceiptHash");
    let value = await load(scopeValue);
    const applyRequestKey = required(input.applyRequestKey, "applyRequestKey");
    const pending = value.pendingTransitionObservations || [];
    const staged = pending.find((entry) => entry.applyRequestKey === applyRequestKey);
    const operations = deriveOperations(staged?.beforeState
      || input.beforeState || {}, input.afterState || {}, custody);
    const remainingPending = pending.filter((entry) => (
      entry.applyRequestKey !== applyRequestKey));
    if (operations.length === 0) {
      value = await persist(value, { tasks: value.tasks,
        pendingTransitionObservations: remainingPending });
      return freezeDeep({ ok: true, taskCreated: false,
        projection: projection(value), task: null });
    }
    const taskBody = {
      schemaVersion:
        `${STARCRAFT_TMG_PHYSICAL_OPERATION_TASK_RUNTIME_VERSION}.task`,
      scope: clone(scopeValue), authorityReceiptHash,
      acceptedAction: clone(input.acceptedAction || null),
      postStateRevision: Number(input.postStateRevision || 0),
      operations, status: operations.every((entry) => entry.custodyMode === "agent")
        ? "delegated_agent" : "pending_human",
      assignedPerformer: operations.every((entry) => entry.custodyMode === "agent")
        ? "agent" : "human",
      createdAt: iso(now(), "now"), completedAt: null,
      evidenceRefs: [], dispute: null,
      blocksFurtherRoomMutation: true,
      acceptedDigitalFactRemainsAuthoritative: true,
      trainingTruth: false,
    };
    const taskId = `physical-task-${hashStarcraftTmgContract({
      scopeKey: scopeValue.scopeKey, authorityReceiptHash, operations,
    }).slice(0, 32)}`;
    const existing = value.tasks.find((entry) => entry.taskId === taskId);
    if (existing) {
      if (remainingPending.length !== pending.length) {
        value = await persist(value, { tasks: value.tasks,
          pendingTransitionObservations: remainingPending });
      }
      return freezeDeep({ ok: true, taskCreated: false,
        idempotent: true, task: clone(existing), projection: projection(value) });
    }
    const task = freezeDeep({ ...taskBody, taskId, version: 1 });
    value = await persist(value, { tasks: [...value.tasks, task],
      pendingTransitionObservations: remainingPending });
    return freezeDeep({ ok: true, taskCreated: true,
      task: clone(task), projection: projection(value) });
  }
  async function mutateTask(input, operation) {
    const scopeValue = scope(input.scope || input);
    let value = await load(scopeValue);
    const index = value.tasks.findIndex((entry) => entry.taskId === input.taskId);
    if (index < 0) throw new Error("PHYSICAL_OPERATION_TASK_NOT_FOUND");
    const current = value.tasks[index];
    const at = iso(now(), "now");
    let next;
    if (operation === "delegate") {
      if (current.status !== "pending_human") {
        throw new Error("PHYSICAL_OPERATION_TASK_NOT_DELEGATABLE");
      }
      next = { ...clone(current), version: current.version + 1,
        status: "delegated_agent", assignedPerformer: "agent",
        delegatedAt: at };
    } else if (operation === "complete") {
      if (!["pending_human", "delegated_agent"].includes(current.status)) {
        throw new Error("PHYSICAL_OPERATION_TASK_NOT_COMPLETABLE");
      }
      const completedBy = required(input.completedBy, "completedBy");
      if (!["human", "agent"].includes(completedBy)) {
        throw new Error("PHYSICAL_OPERATION_TASK_COMPLETER_INVALID");
      }
      next = { ...clone(current), version: current.version + 1,
        status: "completed", assignedPerformer: completedBy, completedAt: at,
        evidenceRefs: Array.isArray(input.evidenceRefs)
          ? input.evidenceRefs.map(String) : [] };
    } else if (operation === "dispute") {
      if (!["pending_human", "delegated_agent"].includes(current.status)) {
        throw new Error("PHYSICAL_OPERATION_TASK_NOT_DISPUTABLE");
      }
      next = { ...clone(current), version: current.version + 1,
        status: "rules_dispute", dispute: {
          openedAt: at, openedBy: "human",
          reason: required(input.reason, "reason"), resolution: null,
        } };
    } else if (operation === "resolve_dispute") {
      if (current.status !== "rules_dispute") {
        throw new Error("PHYSICAL_OPERATION_TASK_DISPUTE_NOT_OPEN");
      }
      const resolution = required(input.resolution, "resolution");
      if (!["accepted_action_confirmed", "physical_state_synchronized",
        "authoritative_correction_required"].includes(resolution)) {
        throw new Error("PHYSICAL_OPERATION_TASK_DISPUTE_RESOLUTION_INVALID");
      }
      next = { ...clone(current), version: current.version + 1,
        status: resolution === "physical_state_synchronized" ? "completed"
          : resolution === "accepted_action_confirmed" ? "pending_human"
            : "awaiting_authoritative_correction",
        completedAt: resolution === "physical_state_synchronized" ? at : null,
        dispute: { ...clone(current.dispute), resolvedAt: at,
          resolvedBy: "referee", resolution } };
    }
    const tasks = [...value.tasks]; tasks[index] = next;
    value = await persist(value, tasks);
    return freezeDeep({ ok: true, task: clone(next), projection: projection(value) });
  }
  async function read(input = {}) {
    const scopeValue = scope(input.scope || input);
    return projection(await load(scopeValue));
  }
  async function guardRoomMutation(input = {}) {
    const observed = await read(input);
    if (observed.syncStatus === "in_sync") return freezeDeep({ ok: true,
      reason: null, projection: observed });
    return freezeDeep({ ok: false,
      reason: observed.syncStatus === "rules_dispute"
        ? "ROOM_RULES_DISPUTE_PENDING" : "ROOM_PHYSICAL_SYNC_PENDING",
      projection: observed });
  }
  return Object.freeze({
    stageAcceptedTransition,
    observeAcceptedTransition,
    delegate: (input) => mutateTask(input, "delegate"),
    complete: (input) => mutateTask(input, "complete"),
    openRulesDispute: (input) => mutateTask(input, "dispute"),
    resolveRulesDispute: (input) => mutateTask(input, "resolve_dispute"),
    read,
    guardRoomMutation,
    descriptor: freezeDeep({
      schemaVersion: STARCRAFT_TMG_PHYSICAL_OPERATION_TASK_RUNTIME_VERSION,
      storeDurability: String(store.durability || "injected"),
      productionRoomEligible: false, trainingTruth: false,
    }),
  });
}

export function createPhysicalSyncGatedRoomPortV1(input = {}) {
  const room = input.roomPort;
  const physical = input.physicalOperationTaskRuntime;
  const scopeFor = input.scopeFor;
  if (!room || typeof physical?.guardRoomMutation !== "function"
    || typeof scopeFor !== "function") {
    throw new TypeError("room, physical runtime and scopeFor are required");
  }
  const mutationMethods = new Set([
    "previewAction", "confirmPreview", "claimControl", "applyAction",
  ]);
  return Object.freeze(Object.fromEntries([
    "readRoom", "legalSpace", "previewAction", "confirmPreview",
    "claimControl", "applyAction", "replayRoom",
  ].map((method) => [method, async (request = {}) => {
    if (typeof room[method] !== "function") {
      throw new TypeError(`roomPort.${method} is required`);
    }
    if (mutationMethods.has(method)) {
      const gate = await physical.guardRoomMutation({
        scope: scopeFor(request),
      });
      if (!gate.ok) return freezeDeep({ ok: false, reason: gate.reason,
        physicalOperationProjection: gate.projection, trainingTruth: false });
    }
    return room[method](request);
  }])));
}
