import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { evaluateOfficialPhysicalFootprintRelationV1 } from
  "../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs";

export const STARCRAFT_TMG_SPATIAL_PREEXECUTION_SEARCH_VERSION =
  "starcraft_tmg_spatial_preexecution_search_v2";

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function seal(value, field) {
  const body = clone(value);
  return freezeDeep({ ...body, [field]: hashStarcraftTmgContract(body) });
}

function actionPriority(actionType) {
  if (/attack|fight/u.test(actionType)) return 90;
  if (/charge|impact/u.test(actionType)) return 82;
  if (/ability|card|heal|restore/u.test(actionType)) return 72;
  if (/move|run|disengage/u.test(actionType)) return 64;
  if (/deploy|place|summon|respawn/u.test(actionType)) return 58;
  if (/score|control/u.test(actionType)) return 48;
  if (/choose_first_actor/u.test(actionType)) return 36;
  if (/finish_activation/u.test(actionType)) return 12;
  if (/pass/u.test(actionType)) return 4;
  return 24;
}

function minimumSeparation(models, leftRelation, rightRelation) {
  const left = models.filter((entry) => entry.sideRelation === leftRelation)
    .map((entry) => entry.footprint).filter((entry) => (
      entry?.schema === "starcraft_tmg_physical_footprint_v1"
    ));
  const right = models.filter((entry) => entry.sideRelation === rightRelation)
    .map((entry) => entry.footprint).filter((entry) => (
      entry?.schema === "starcraft_tmg_physical_footprint_v1"
    ));
  if (!left.length || !right.length) return null;
  let minimum = Number.POSITIVE_INFINITY;
  for (const a of left) {
    for (const b of right) minimum = Math.min(minimum,
      evaluateOfficialPhysicalFootprintRelationV1({ left: a, right: b })
        .minimumSeparationMilliInches);
  }
  return Number.isFinite(minimum) ? Math.round(minimum) : null;
}

function candidateRows(actionSpace) {
  const finite = (actionSpace?.finiteActions || []).map((entry) => ({
    candidateId: String(entry.candidateId || entry.actionKey || ""),
    kind: "finite",
    actionType: String(entry.action?.actionType || "action"),
    pieceId: entry.action?.pieceId || null,
    proposal: clone(entry.proposal || {
      kind: "finite", actionKey: entry.candidateId || entry.actionKey,
    }),
    sourceAction: clone(entry.action || null),
    exactParametersBound: true,
  }));
  const domains = (actionSpace?.parameterDomains || []).map((entry) => ({
    candidateId: String(entry.candidateId || entry.domainId || ""),
    kind: "parameterized",
    actionType: String(entry.actionType || "parameterized_action"),
    pieceId: entry.pieceId || null,
    proposal: { kind: "parameterized", domainId: entry.domainId },
    exactParametersBound: false,
  }));
  return [...finite, ...domains].filter((entry) => entry.candidateId);
}

/**
 * Produces bounded, advisory hypotheses while the opponent is handling the
 * table. It never invents coordinates, calls a model, mutates the Room or
 * substitutes for Rules instantiation. The next decision may use a ready
 * result; a slow or stale result is discarded without blocking gameplay.
 */
export function createStarcraftTmgSpatialPreexecutionSearchV1(options = {}) {
  const requested = Number(options.maxHypotheses || 8);
  const maxHypotheses = Number.isSafeInteger(requested) && requested > 0
    ? Math.min(requested, 24) : 8;
  const previewSuccessor = typeof options.previewSuccessor === "function"
    ? options.previewSuccessor : null;
  return async function preExecute(input = {}, runtime = {}) {
    if (runtime.signal?.aborted) throw new Error("PREEXECUTION_ABORTED");
    await Promise.resolve();
    const models = input.spatialObservation?.models || [];
    const minimumOwnOpponentBaseSeparationMilliInches =
      minimumSeparation(models, "own", "opponent");
    const sorted = candidateRows(input.spatialActionSpace)
      .map((entry) => ({
        ...entry,
        advisoryPriority: actionPriority(entry.actionType),
        requiredBeforeExecution: entry.exactParametersBound
          ? "current_legalspace_membership_and_preview"
          : "explicit_parameters_then_exact_rules_query_and_preview",
        positionalQuestions: [
          "Does the complete physical base and formation remain legal?",
          "How does this change objective control and both fire zones?",
          "What is the opponent's strongest legal counter-action?",
        ],
      }))
      .sort((left, right) => right.advisoryPriority - left.advisoryPriority
        || left.candidateId.localeCompare(right.candidateId));
    const phaseControls = sorted.filter((entry) =>
      new Set(["pass", "choose_first_actor"]).has(entry.actionType));
    const ranked = [...phaseControls, ...sorted.filter((entry) =>
      !new Set(["pass", "choose_first_actor"]).has(entry.actionType))]
      .slice(0, Math.max(maxHypotheses, phaseControls.length));
    const rows = [];
    for (const entry of ranked) {
      if (runtime.signal?.aborted) throw new Error("PREEXECUTION_ABORTED");
      let successor = null;
      if (previewSuccessor && entry.kind === "finite"
        && new Set(["pass", "choose_first_actor"])
          .has(entry.actionType)) {
        try {
          const result = await previewSuccessor({
            scope: clone(input.scope || null),
            authority: clone(input.authority || null),
            legalSpace: clone(input.legalSpace || null),
            candidateId: entry.candidateId,
            action: clone(entry.sourceAction),
            signal: runtime.signal,
          });
          const exact = result?.ok === true && result?.rulesAuthority === true
            && result?.preStateHash === input.authority?.stateHash;
          successor = seal({
            status: exact ? "exact" : "unknown",
            candidateId: entry.candidateId,
            preStateHash: input.authority?.stateHash || null,
            nextStateRevision: exact
              ? result.nextStateRevision ?? null : null,
            nextStateHash: exact ? result.nextStateHash || null : null,
            nextRound: exact ? result.nextRound ?? null : null,
            nextPhase: exact ? result.nextPhase || null : null,
            nextActiveSideKey: exact
              ? result.nextActiveSideKey || null : null,
            controlledSeatActsNext: exact
              ? result.controlledSeatActsNext === true : null,
            controlledSeatNextFiniteActionTypes: exact
              ? clone(result.controlledSeatNextFiniteActionTypes || []) : [],
            controlledSeatNextParameterizedActionTypes: exact
              ? clone(result.controlledSeatNextParameterizedActionTypes || []) : [],
            reason: exact ? null : String(result?.reason
              || "successor_rules_preview_unavailable"),
            rulesAuthority: exact,
            liveRoomMutationCalls: 0,
            trainingTruth: false,
          }, "successorHash");
        } catch (error) {
          successor = seal({
            status: "unknown",
            candidateId: entry.candidateId,
            preStateHash: input.authority?.stateHash || null,
            nextStateRevision: null,
            nextStateHash: null,
            nextRound: null,
            nextPhase: null,
            nextActiveSideKey: null,
            controlledSeatActsNext: null,
            controlledSeatNextFiniteActionTypes: [],
            controlledSeatNextParameterizedActionTypes: [],
            reason: String(error?.code || error?.message
              || "successor_rules_preview_failed").slice(0, 240),
            rulesAuthority: false,
            liveRoomMutationCalls: 0,
            trainingTruth: false,
          }, "successorHash");
        }
      }
      const { sourceAction: _sourceAction, ...publicEntry } = entry;
      rows.push({ ...publicEntry, successor });
    }
    if (runtime.signal?.aborted) throw new Error("PREEXECUTION_ABORTED");
    return seal({
      schemaVersion: STARCRAFT_TMG_SPATIAL_PREEXECUTION_SEARCH_VERSION,
      searchKey: input.searchKey || null,
      stateRevision: input.authority?.stateRevision ?? null,
      stateHash: input.authority?.stateHash || null,
      legalSpaceHash: input.legalSpace?.legalSpaceHash || null,
      hypotheses: rows,
      geometrySnapshot: {
        visibleModelCount: models.length,
        exactFootprintCount:
          input.spatialObservation?.coverage?.exactFootprintCount ?? null,
        minimumOwnOpponentBaseSeparationMilliInches,
        distanceMeasurement: "nearest_complete_physical_base_edges",
        measurementAuthority:
          "advisory_center_distance_only_exact_queries_remain_rules_owned",
      },
      planRevisionPrompt: {
        compareBenefitsCostsAndCounterplay: true,
        preserveOrReviseCurrentGoal: true,
        bindConclusionToCurrentScenarioPositionAndResources: true,
      },
      bounded: true,
      workReceipt: {
        candidateDenominatorCount: sorted.length,
        examinedHypothesisCount: ranked.length,
        returnedHypothesisCount: rows.length,
        deterministicPriorityOrder: true,
        abortSignalCheckedBeforeEveryHypothesis: true,
        staleRevisionResultMayBlockDecision: false,
        exactRulesFallbackAlwaysRequiredBeforeApply: true,
      },
      modelCalls: 0,
      mayMutateRoom: false,
      rulesAuthority: false,
      trainingTruth: false,
    }, "resultHash");
  };
}
