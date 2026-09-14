import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";

export const STARCRAFT_TMG_COMPANION_TACTICAL_ANALYSIS_VERSION =
  "starcraft_tmg_companion_tactical_analysis_v1";

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

function seal(value, hashField) {
  const unsigned = clone(value);
  return freeze({ ...unsigned, [hashField]: hashStarcraftTmgContract(unsigned) });
}

function required(value, field) {
  const normalized = String(value || "").trim();
  if (!normalized) throw new TypeError(`${field} is required`);
  return normalized;
}

function assertBinding(input, expected) {
  const room = input.roomProjection?.room;
  const match = input.roomProjection?.matchBinding;
  const observation = input.spatialObservation;
  const events = input.publicEvents;
  if (!object(room) || room.roomId !== expected.roomId
    || !object(match) || match.bindingHash !== expected.matchBindingHash
    || !object(observation) || observation.roomId !== expected.roomId
    || observation.matchBindingHash !== expected.matchBindingHash
    || observation.stateRevision !== room.stateRevision
    || observation.stateHash !== room.stateHash
    || !object(events) || events.roomId !== expected.roomId
    || events.matchBindingHash !== expected.matchBindingHash) {
    throw new TypeError("companion tactical inputs do not share one room binding");
  }
  return { room, observation, events };
}

function modelIndex(observation) {
  return new Map((observation?.models || []).map((model) => [model.modelId, model]));
}

function changed(value, previous) {
  return JSON.stringify(value) !== JSON.stringify(previous);
}

function spatialDeltas(previous, current) {
  if (!previous) return [];
  const before = modelIndex(previous);
  const after = modelIndex(current);
  const deltas = [];
  for (const [modelId, model] of after) {
    const prior = before.get(modelId);
    if (!prior) {
      deltas.push({ kind: "model_entered_visible_battlefield", modelId,
        unitId: model.unitId, after: clone(model.center) });
      continue;
    }
    if (changed(prior.center, model.center)) {
      deltas.push({ kind: "model_position_changed", modelId,
        unitId: model.unitId, before: clone(prior.center), after: clone(model.center) });
    }
    if (changed(prior.fullyInsideBattlefield, model.fullyInsideBattlefield)) {
      deltas.push({ kind: "model_boundary_state_changed", modelId,
        unitId: model.unitId, before: prior.fullyInsideBattlefield,
        after: model.fullyInsideBattlefield });
    }
  }
  for (const [modelId, model] of before) {
    if (!after.has(modelId)) {
      deltas.push({ kind: "model_left_visible_battlefield", modelId,
        unitId: model.unitId, before: clone(model.center) });
    }
  }
  const beforeUnits = new Map((previous.units || []).map((unit) => [unit.unitId, unit]));
  for (const unit of current.units || []) {
    const prior = beforeUnits.get(unit.unitId);
    if (!prior) continue;
    for (const field of ["currentModels", "damageMarker", "statuses", "activatedPhases"]) {
      if (changed(prior[field], unit[field])) {
        deltas.push({ kind: `unit_${field}_changed`, unitId: unit.unitId,
          before: clone(prior[field]), after: clone(unit[field]) });
      }
    }
  }
  const beforeScores = previous.objectiveState?.scores || {};
  const afterScores = current.objectiveState?.scores || {};
  for (const sideKey of new Set([...Object.keys(beforeScores), ...Object.keys(afterScores)])) {
    if (beforeScores[sideKey] !== afterScores[sideKey]) {
      deltas.push({ kind: "score_changed", sideKey,
        before: beforeScores[sideKey] ?? null, after: afterScores[sideKey] ?? null });
    }
  }
  return deltas;
}

function publicEventRows(events, previousEventsHash) {
  const rows = Array.isArray(events.events) ? events.events
    : Array.isArray(events.entries) ? events.entries : [];
  return rows.slice(-24).map((event, index) => ({
    factId: `public-event-${event.sequence ?? event.publicSequence ?? index + 1}`,
    classification: "observed_fact",
    authority: "public_room_journal",
    event: clone(event),
    newlyObserved: previousEventsHash !== events.eventsHash,
  }));
}

function inferredIntent(facts) {
  const inferred = [];
  const moves = facts.filter((fact) => fact.delta?.kind === "model_position_changed");
  if (moves.length) {
    inferred.push({
      inferenceId: "intent-position-reallocation",
      classification: "inferred_intent",
      claim: "A player may be reallocating board position; the exact purpose is not observable from movement alone.",
      confidence: "low",
      basisFactIds: moves.map((fact) => fact.factId),
      falsifyOrClarifyWith: [
        "Ask the player for the declared action purpose.",
        "Compare the next authoritative action and objective-score change.",
      ],
      rulesAuthority: false,
    });
  }
  const scoring = facts.filter((fact) => fact.delta?.kind === "score_changed");
  if (scoring.length) {
    inferred.push({
      inferenceId: "intent-objective-conversion",
      classification: "inferred_intent",
      claim: "The preceding sequence may have aimed to convert position into objective points.",
      confidence: "medium",
      basisFactIds: scoring.map((fact) => fact.factId),
      falsifyOrClarifyWith: ["Inspect the declared TurnPlan and action-purpose record."],
      rulesAuthority: false,
    });
  }
  return inferred;
}

export function createStarcraftTmgCompanionTacticalAnalysisV1(input = {}) {
  const scope = freeze({
    gameId: "starcraft-tmg",
    roomId: required(input.roomId, "roomId"),
    matchBindingHash: required(input.matchBindingHash, "matchBindingHash"),
    seatKey: required(input.seatKey, "seatKey"),
  });
  let previousObservation = null;
  let previousEventsHash = null;
  let sequence = 0;
  const history = [];

  function observe(value = {}) {
    const { room, observation, events } = assertBinding(value, scope);
    const deltas = spatialDeltas(previousObservation, observation);
    const eventFacts = publicEventRows(events, previousEventsHash);
    const deltaFacts = deltas.map((delta, index) => ({
      factId: `spatial-delta-${room.stateRevision}-${index + 1}`,
      classification: "observed_fact",
      authority: "viewer_scoped_rules_derived_world_geometry",
      delta,
    }));
    const observedFacts = [...eventFacts, ...deltaFacts];
    const intentInferences = inferredIntent(deltaFacts);
    const analysis = seal({
      schemaVersion: `${STARCRAFT_TMG_COMPANION_TACTICAL_ANALYSIS_VERSION}.analysis`,
      scope,
      sequence: ++sequence,
      authority: {
        stateRevision: room.stateRevision,
        stateHash: room.stateHash,
        spatialObservationHash: observation.observationHash,
        publicEventsHash: events.eventsHash,
      },
      observedFacts,
      intentInferences,
      sameMatchMemory: clone(value.matchMemory || null),
      responseInstruction: {
        observedFactsMustBeStatedAsFacts: true,
        inferredIntentMustBeLabelledAsInference: true,
        inferenceMustCiteBasisFactIds: true,
        privateOpponentPlanMayBeClaimed: false,
        hiddenReasoningMayBeExposed: false,
      },
      roomMutationCalls: 0,
      skillGenerationRuns: 0,
      eligibleForTraining: false,
      trainingTruth: false,
    }, "analysisHash");
    history.push(analysis);
    if (history.length > 64) history.shift();
    previousObservation = clone(observation);
    previousEventsHash = events.eventsHash;
    return analysis;
  }

  function read() {
    return history.at(-1) || null;
  }

  function query(input = {}) {
    const classification = input.classification
      ? String(input.classification) : null;
    const records = history.flatMap((entry) => [
      ...entry.observedFacts,
      ...entry.intentInferences,
    ]).filter((entry) => !classification || entry.classification === classification);
    return freeze({
      records: clone(records.slice(-Math.max(1, Math.min(256,
        Number(input.limit || 32))))),
      completeSourceHistoryRetained: history.length,
      rulesAuthority: false,
      trainingTruth: false,
    });
  }

  return freeze({ observe, read, query, metadata: freeze({
    schemaVersion: `${STARCRAFT_TMG_COMPANION_TACTICAL_ANALYSIS_VERSION}.metadata`,
    interface: ["observe", "read", "query"],
    factInferenceSeparation: "typed_and_required",
    privateOpponentPlanAccess: false,
    roomMutationAuthority: false,
    trainingTruth: false,
  }) });
}
