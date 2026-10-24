// Submission shape is owned by the Native declaration executor. Describing a
// retained domain must not reseal it or choose a leader/target for the agent.
const KIND = 'official_selected_roster_charge_declaration_v1';
const FIELDS = Object.freeze(['leadingModelId', 'targets']);
const TARGET_FIELDS = Object.freeze(['unitId', 'modelId']);
const object = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
function fail(code, detail = '') { throw new Error(detail ? `${code}:${detail}` : code); }

export function canonicalOfficialSelectedRosterChargeParametersV1(domain, parameters) {
  if (!object(parameters) || Object.keys(parameters).some(key => !FIELDS.includes(key))) {
    fail('SELECTED_MELEE_CHARGE_DECLARATION_PARAMETERS_INVALID');
  }
  const leadingModelId = String(parameters.leadingModelId || '');
  if (!domain.constraints.leadingModelIds.includes(leadingModelId)) {
    fail('SELECTED_MELEE_CHARGE_LEADING_MODEL_INVALID', leadingModelId);
  }
  const value = parameters.targets;
  if (!Array.isArray(value) || value.length === 0) fail('SELECTED_MELEE_CHARGE_TARGETS_REQUIRED');
  const seen = new Set();
  const targets = value.map(entry => {
    const unitId = String(entry?.unitId || '');
    const modelId = String(entry?.modelId || '');
    if (seen.has(unitId)
      || !domain.constraints.eligibleTargetModelIdsByUnitId?.[unitId]?.includes(modelId)
      || Object.keys(entry || {}).some(key => !TARGET_FIELDS.includes(key))) {
      fail('SELECTED_MELEE_CHARGE_TARGET_INVALID', `${unitId}:${modelId}`);
    }
    seen.add(unitId);
    return { unitId, modelId };
  }).sort((left, right) => left.unitId.localeCompare(right.unitId));
  return { leadingModelId, targets };
}

export function describeOfficialSelectedRosterChargeParameterFieldsV1(domain) {
  if (domain?.parameterKind !== KIND) return null;
  const eligible = domain.constraints.eligibleTargetModelIdsByUnitId;
  return {
    leadingModelId: { type: 'string', enum: [...domain.constraints.leadingModelIds] },
    targets: { type: 'array', minItems: 1, items: {
      type: 'object', required: [...TARGET_FIELDS], additionalProperties: false,
      properties: {
        unitId: { type: 'string', enum: Object.keys(eligible) },
        modelId: { type: 'string', enum: [...new Set(Object.values(eligible).flat())] },
      },
    }, oneTargetModelPerTargetUnit: true,
    eligibleTargetModelIdsByUnitId: structuredClone(eligible) },
  };
}

export function describeOfficialSelectedRosterChargeParameterRepairV1(domain, failureCode, failureDetail = null) {
  const fields = describeOfficialSelectedRosterChargeParameterFieldsV1(domain);
  if (!fields) return null;
  return {
    schemaVersion: 'official_selected_roster_charge_submission_v1',
    failureCode, failureDetail, actionType: domain.actionType,
    stage: 'charge_declaration', fieldContracts: fields,
    requiredFields: [...FIELDS], additionalFieldsAllowed: false,
    instruction: 'Submit leadingModelId and targets, each target containing unitId and modelId from the same eligible pair. Choose one model per target unit. This declaration takes no path or placements; path resolution is a later domain. Correct submission shape does not prove charge reach or strategic value.',
    useForSameChoiceRepairOnly: true, doesNotProveProposalLegal: true, trainingTruth: false,
  };
}
