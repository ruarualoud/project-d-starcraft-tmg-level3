export function isFieldedOfficialSabotageDroneV1(piece) {
  return piece?.officialUnitRecordKey === 'army_units:sabotage_drone'
    && piece.isOnField === true && piece.isDestroyed !== true
    && piece.models?.some(model => model.isOnField !== false && !model.isDestroyed) === true;
}

export function isOfficialReleaseDroneAssaultDueV1(state) {
  return state.phase === 'assault'
    && Boolean(state.officialReleaseDroneAssaultTiming)
    && state.officialReleaseDroneAssaultTiming === state.officialSabotageDronePhaseEndPolicy?.policyHash
    && state.sabotageDronePhaseEndCompletedRound !== Number(state.round)
    && state.pieces.some(isFieldedOfficialSabotageDroneV1);
}
