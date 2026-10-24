// Shared discovery vocabulary; keep it independent of the solver import graph.
export const STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS = Object.freeze([
  'balanced', 'advance', 'compact', 'disperse', 'maximize_engagement',
  'surround_target', 'avoid_threat', 'control_objective', 'screen', 'preserve_lane',
]);
export const STATIC_FORMATION_OBJECTIVE_CONTRACT_V1 = Object.freeze({
  kind: STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS, weight: 'optional integer 1..5; default3',
  targetIds: 'optional array of exact target IDs; default[]',
  unsupportedIntent: 'correctable error; never silently replaced with balanced',
});
export const STATIC_FORMATION_OBJECTIVES_CONTRACT_V1=Object.freeze([STATIC_FORMATION_OBJECTIVE_CONTRACT_V1]);
export const STATIC_FORMATION_JOINT_SEARCH_DEFAULTS_V1=Object.freeze({maximumOptions:6,maximumEvaluations:128});
export function normalizeExplicitStaticFormationObjectivesV1(value) {
  if (value === undefined) return undefined;
  const fail = detail => { throw Object.assign(new TypeError(
    `STATIC_FORMATION_ARGUMENTS_INVALID:formationObjectives:${detail}; supported kinds=${STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS.join(',')}`),
    { code: 'STATIC_FORMATION_ARGUMENTS_INVALID' }); };
  if (!Array.isArray(value)) fail('array_required');
  return value.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)
      || Object.keys(entry).some(k => !['kind','weight','targetIds'].includes(k))
      || !STARCRAFT_TMG_FORMATION_OBJECTIVE_KINDS.includes(entry.kind)) fail(`invalid_entry_${index}`);
    const weight = entry.weight ?? 3, targetIds = entry.targetIds ?? [];
    if (!Number.isSafeInteger(weight) || weight < 1 || weight > 5) fail(`invalid_weight_${index}`);
    if (!Array.isArray(targetIds) || targetIds.some(id => typeof id !== 'string' || !id)) fail(`invalid_targetIds_${index}`);
    return { kind: entry.kind, weight, targetIds: [...new Set(targetIds)] };
  });
}
