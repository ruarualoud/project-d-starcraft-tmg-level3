import { createOfficialModelBaseFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { deriveOfficialModelSurfacePlacementV2 } from '../rule-atoms/official-engagement-graph-v2.mjs';
import { evaluateOfficialElevatedTargetPointLineOfSightV1 }
  from '../rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';

const active = piece => piece.isOnField === true && !piece.isDestroyed && piece.currentModels > 0;
const liveModels = piece => piece.models.filter(model => !model.isDestroyed && model.isOnField !== false);

// Target-point templates share physical base elevation and the Size 2+ obstruction rule.
export function projectOfficialGroundedTemplateCoverageV1({ current, template, point, pointSurface, projected,
  modelDenominatorError = 'GROUNDED_TEMPLATE_MODEL_DENOMINATOR_INVALID' }) {
  const assessments = [];
  for (const piece of current.pieces.filter(active)) {
    const models = liveModels(piece);
    if (models.length !== piece.currentModels) throw Error(modelDenominatorError);
    for (const model of models) {
      const base = createOfficialModelBaseFootprintV1({ piece, model, dataBundle: current.officialModelBaseGeometryDataBundle });
      const relation = evaluateOfficialPhysicalFootprintRelationV1({ left: template, right: base });
      const surface = deriveOfficialModelSurfacePlacementV2(current, { pieceId: piece.id, modelId: model.id });
      const reasons = [];
      if (relation.minimumSeparationMilliInches > 0) reasons.push('outside_template');
      if (surface.elevation !== pointSurface.elevation) reasons.push('different_elevation');
      let blockers = [], traceHash = null;
      if (!reasons.length) {
        const trace = evaluateOfficialElevatedTargetPointLineOfSightV1({ state: projected,
          attacker: piece, attackerModelId: model.id, targetPointFootprint: point,
          physicalBaseElevation: true, dataBundle: current.officialTerrainLosDataBundle });
        blockers = trace.assessments.filter(row => row.terrainEffectiveSize >= 2 && row.blockingTerrainTrace)
          .map(row => row.terrainId).sort();
        traceHash = trace.resultHash;
        if (blockers.length) reasons.push('size_two_plus_terrain');
      }
      assessments.push({ pieceId: piece.id, modelId: model.id, sideKey: piece.sideKey,
        combatTag: piece.combatTag, physicalBaseElevation: surface.elevation, affected: !reasons.length,
        reasons, relationHash: relation.relationHash, blockingTerrainIds: blockers, traceHash });
    }
  }
  return assessments;
}
