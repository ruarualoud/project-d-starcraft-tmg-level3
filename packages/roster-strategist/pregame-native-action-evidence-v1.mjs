// Project saved Native observations, never simulate or infer casualty rules.
// Original receipts/state patches remain available for exact retrieval/restore.
const HASH = /^[a-f0-9]{64}$/u;
const clone = value => value === undefined ? undefined : structuredClone(value);

export function collectPregameNativeActionEvidenceV1(value) {
  const rows = new Map();
  const seen = new Set();
  function visit(node) {
    if (!node || typeof node !== 'object' || seen.has(node)) return;
    seen.add(node);
    if (node.schema === 'starcraft_tmg_pregame_lab_scenario_branch_receipt_v1'
      && node.branchKind === 'native_action' && node.resultStatus === 'ok'
      && HASH.test(node.receiptHash || '') && HASH.test(node.branchStateHash || '')) {
      const action = node.nativeAction?.sourceAction || node.nativeAction || {};
      const pieces = node.stateChanges?.find(change => change.key === 'pieces'
        && change.operation === 'set')?.value;
      rows.set(node.receiptHash, {
        sourceReceiptHash: node.receiptHash, sourceStateHash: node.sourceStateHash,
        parentStateHash: node.parentStateHash, branchStateHash: node.branchStateHash,
        conditionalOnParent: true, provenArrivalHistory: false,
        conditionalNativeLegality: {
          accepted: node.nativeTransitionsApplied === 1 && typeof action.actionType === 'string',
          nativeTransitionsApplied: node.nativeTransitionsApplied ?? null,
          scope: 'one_native_transition_on_declared_parent',
          liveHistoryProven: false,
          instruction: 'A recorded accepted Native transition proves this action under this declared parent and outcome, not that the parent has a complete legal match history. provenArrivalHistory=false does not negate the recorded conditional transition. It also does not establish a different endpoint, other units, a whole route, future control or actual VP. Reuse only the matching action/parent/geometry; missing route segments still require evidence.',
        },
        provenFutureOpponentChoice: false, wholeQuestionAnswered: false,
        conditionalOnOutcome: node.conditionalOnOutcome === true,
        outcomeProbability: node.outcomeProbability ?? null,
        nativeChanceContract: clone(node.nativeChanceContract || null),
        nativeOutcomeAssumption: clone(node.nativeOutcomeAssumption || null),
        outcomeScope: node.outcomeScope || 'deterministic_step_on_conditional_parent',
        action: Object.fromEntries(['actionType', 'sideKey', 'pieceId', 'targetId',
          'abilityName', 'resolutionStage'].filter(key => action[key] !== undefined)
          .map(key => [key, clone(action[key])])),
        nativeCanonicalParameters: clone(node.nativeCanonicalParameters),
        ...(action.spatialPlan ? {spatialPlan: clone(action.spatialPlan),
          spatialPlanSourcePointer: node.nativeAction?.sourceAction
            ? '/receipt/nativeAction/sourceAction/spatialPlan' : '/receipt/nativeAction/spatialPlan'} : {}),
        nativeEvents: clone(node.nativeEvents || []),
        postStateUnitCoverage: Array.isArray(pieces)
          ? 'exact_native_pieces_field_after_action'
          : 'pieces_field_unchanged_retrieve_parent_if_needed',
        postStateUnits: (pieces || []).map(piece => ({ unitId: piece.id,
          sideKey: piece.sideKey, currentModels: piece.currentModels,
          currentSupply: piece.currentSupply, isOnField: piece.isOnField,
          isDestroyed: piece.isDestroyed, damageMarker: piece.damageMarker,
          destroyedModelIds: clone(piece.destroyedModelIds) })),
        fullNativeStateChangesPath: 'stateChanges',
        trainingTruth: false,
      });
      // No receipts live inside Native's full state patches. Do not repeatedly
      // traverse their frozen data bundles just to summarize this same action.
      return;
    }
    for (const child of Object.values(node)) visit(child);
  }
  visit(value);
  return [...rows.values()];
}
