// Rule discovery is not current-action discovery. A phase-filtered action menu
// cannot tell a planner which other phase or trigger a selected card needs.
// Project the same frozen compiled definitions used by Native, without deriving
// costs, eligibility, strategy or a different source snapshot.
export function projectNativeAbilityReferenceV1(state) {
  const records = new Map();
  const record = key => {
    if (!records.has(key)) records.set(key, {recordKey:key, unitIds:[], cardInstanceIds:[],
      selectedUpgradeNames:[], definitions:[]});
    return records.get(key);
  };
  for (const piece of state.pieces || []) {
    if (!piece.officialUnitRecordKey) continue;
    const row = record(piece.officialUnitRecordKey);
    row.unitIds.push(piece.id);
    row.selectedUpgradeNames.push(...(piece.selectedUpgradeNames || []));
  }
  for (const card of Object.values(state.cardResources || {}).flat()) {
    if (card.officialCardRecordKey) record(card.officialCardRecordKey)
      .cardInstanceIds.push(card.cardInstanceId ?? card.id);
  }
  for (const [bundleName, bundle] of Object.entries(state)) {
    if (!bundleName.endsWith('SourceBundle') || !bundle || typeof bundle !== 'object') continue;
    for (const definition of [...(bundle.routes || []), ...(bundle.passiveBindings || [])]) {
      const row = records.get(definition.recordKey);
      const sourceText = definition.sourceText || definition.sourceDescription || definition.activationText;
      if (!row || typeof sourceText !== 'string' || !sourceText) continue;
      row.definitions.push({...structuredClone(definition), sourceBundle:bundleName, sourceText});
    }
  }
  for (const row of records.values()) row.selectedUpgradeNames = [...new Set(row.selectedUpgradeNames)];
  return {schema:'starcraft_tmg_native_ability_reference_v1',
    scope:'frozen_selected_records_compiled_ability_definitions',
    executionEligibilityProven:false,
    instruction:'Read sourceText, phase, timing and applicability before constructing a scenario. These are frozen rule definitions for selected records, not a current legal action menu; a record may contain unselected upgrade definitions. Check selectedUpgradeNames and the branch actionSpace. Absence from one phase does not mean missing capability. resourceCost is the compiled explicit cost, not proof of free activation or future card readiness: Native validates all card/exhaustion/target prerequisites. This reference is not the complete rulebook or a prediction of hidden opponent choices.',
    records:[...records.values()]};
}
