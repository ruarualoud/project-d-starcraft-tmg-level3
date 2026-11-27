import { deriveOfficialEngagementGraphV2 } from './official-engagement-graph-v2.mjs';
import { inspectOfficialMultiModelCasualtySelectionV1 } from './official-multi-model-casualty-resolution-kernel-v1.mjs';

export function inspectOfficialSingleModelRemovalChoicesV1(state, piece) {
  const ids = piece.models.filter(model => !model.isDestroyed && model.isOnField !== false).map(model => model.id).sort();
  if (ids.length !== piece.currentModels || new Set(ids).size !== ids.length || !ids.length) {
    throw Error('SINGLE_MODEL_REMOVAL_LEDGER_INVALID');
  }
  const graph = deriveOfficialEngagementGraphV2(state);
  const selectionContract = { candidateModelIds: ids, casualtyCount: 1,
    orderedRemovalRequired: graph.engagedUnitIds.includes(piece.id),
    relevantModelEdges: graph.modelEdges.filter(edge => edge.leftUnitId === piece.id || edge.rightUnitId === piece.id) };
  const next = inspectOfficialMultiModelCasualtySelectionV1({ targetPieceId: piece.id,
    selectionContract, casualtyModelIds: [], complete: false });
  return { modelIds: next.legalNextModelIds, selectionContract, engagementGraphHash: graph.graphHash };
}
