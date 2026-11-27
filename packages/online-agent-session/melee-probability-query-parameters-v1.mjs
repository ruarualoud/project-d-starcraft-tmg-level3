// Transport normalization only. Native allocation/dice/effect validation remains authoritative.
export function compileMeleeProbabilityQueryParametersV1(domain, parameters) {
  const native = domain?.sourceDomain || domain;
  if (native?.parameterKind !== 'official_selected_roster_fight_v1'
    || !parameters || typeof parameters !== 'object' || Array.isArray(parameters)) return parameters;
  const rows = parameters.allocations;
  if (parameters.targetUnitId != null || !Array.isArray(rows) || rows.length !== 1
    || typeof rows[0]?.targetUnitId !== 'string' || !rows[0].targetUnitId.trim()) return parameters;
  return { ...parameters, targetUnitId: rows[0].targetUnitId };
}
