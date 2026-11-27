// Core 7.4: the recipient loses its effects. An effect on another unit follows its
// own duration unless its rule explicitly ends it when the source is destroyed.
const attachedFields = [
  ['statuses', 'starcraft_tmg_official_characteristic_status_effect_v1', 'statusEffectHash'],
  ['officialAbilityEffects', 'starcraft_tmg_official_characteristic_status_runtime_effect_v1', 'effectHash'],
];
function disposition(effect, recipient, lostIds) {
  if (lostIds.has(recipient)) return 'end_on_recipient_loss';
  if (lostIds.has(effect.sourcePieceId)) return effect.endsWhenSourceDestroyed === true
    ? 'end_on_source_loss' : 'keep_own_duration';
  return null;
}

function affected(state, lostIds) {
  const rows = [];
  for (const piece of state.pieces) {
    for (const [field, schema, signature] of attachedFields) {
      for (const effect of piece[field] ?? []) {
        if (effect?.schema !== schema) continue;
        const fate = disposition(effect, piece.id, lostIds);
        if (!fate) continue;
        if (!effect[signature] || !effect.sourceDefinitionId || effect.targetPieceId !== piece.id) {
          throw Error('ATTACHED_EFFECT_SOURCE_BINDING_INVALID');
        }
        rows.push({field, effectHash:effect[signature], sourceUnitId:effect.sourcePieceId, targetUnitId:piece.id,
          definitionId:effect.sourceDefinitionId, name:effect.statusName ?? effect.abilityName,
          disposition:fate, expiresAt:effect.expiresAt ?? null,
          markerIds:(state.board.effectMarkers ?? []).filter(m=>m.targetPieceId === piece.id &&
            m.statusEffectHash === effect[signature]).map(m=>m.id).sort()});
      }
    }
  }
  return rows;
}

export function inspectOfficialAttachedEffectLossV1(state, unitId) {
  const unit = state.pieces.find(p=>p.id === unitId);
  if (!unit) throw Error('UNIT_EFFECT_LOSS_UNIT_UNKNOWN');
  return {schema:'native_attached_effect_loss_v1',scope:'characteristic_status_and_runtime_effect',unitId,
    condition:'last_model_destroyed',unitDestroyed:unit.isDestroyed === true && unit.currentModels === 0,
    effects:affected(state,new Set([unitId]))};
}

export function settleOfficialAttachedEffectLossV1(before, state) {
  const dead = new Set(state.pieces.filter(p=>p.isDestroyed === true && p.currentModels === 0).map(p=>p.id));
  if (!dead.size) return [];
  const removed = new Set(), markers = new Set();
  for (const row of affected(state,dead)) {
    if (row.disposition === 'keep_own_duration') continue;
    removed.add(row.effectHash);
    for (const id of row.markerIds) markers.add(id);
  }
  // A casualty or payment consumer can already have removed its attached effect.
  // Use its original binding to clear a remaining display marker in this transition.
  const newlyDead = new Set(before.pieces.filter(p=>dead.has(p.id) && !p.isDestroyed).map(p=>p.id));
  if (newlyDead.size && state.board.effectMarkers?.length) {
    for (const row of affected(before,newlyDead)) {
      if (row.disposition !== 'keep_own_duration') for (const id of row.markerIds) markers.add(id);
    }
  }
  if (!removed.size && !markers.size) return [];
  for (const piece of state.pieces) for (const [field,,signature] of attachedFields) {
    if (piece[field]?.some(e=>removed.has(e?.[signature]))) piece[field]=piece[field].filter(e=>!removed.has(e?.[signature]));
  }
  const markerIds=(state.board.effectMarkers ?? []).filter(m=>markers.has(m.id)).map(m=>m.id);
  if (markerIds.length) state.board.effectMarkers=state.board.effectMarkers.filter(m=>!markers.has(m.id));
  return removed.size || markerIds.length ? [{type:'attached_effects_ended_on_unit_loss',
    effectHashes:[...removed].sort(),markerIds:markerIds.sort(),trainingTruth:false}] : [];
}
