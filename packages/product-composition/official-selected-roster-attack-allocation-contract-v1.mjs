// One owner for the executor's allocation keys and its public submission view.
// This view also describes retained legacy fight domains without changing their
// domainId, authority, target set, attack count or paid proposal bytes.
const ALLOCATION_FIELDS = Object.freeze(['targetUnitId', 'dice']);

export function canonicalOfficialSelectedRosterAttackAllocationsV1(
  value, targetUnitIds, total, code,
) {
  const fail = detail => { throw new Error(detail ? `${code}:${detail}` : code); };
  if (!Array.isArray(value) || value.length === 0) fail();
  const seen = new Set();
  const rows = value.map(entry => {
    const targetUnitId = String(entry?.targetUnitId || '');
    const dice = Number(entry?.dice);
    if (!targetUnitIds.includes(targetUnitId) || seen.has(targetUnitId)
      || !Number.isSafeInteger(dice) || dice <= 0
      || Object.keys(entry || {}).some(key => !ALLOCATION_FIELDS.includes(key))) {
      fail(targetUnitId);
    }
    seen.add(targetUnitId);
    return { targetUnitId, dice };
  }).sort((left, right) => left.targetUnitId.localeCompare(right.targetUnitId));
  if (rows.reduce((sum, entry) => sum + entry.dice, 0) !== total) fail();
  return rows;
}

export function describeOfficialSelectedRosterFightParameterFieldsV1(domain) {
  if (domain?.parameterKind !== 'official_selected_roster_fight_v1'
    || domain.parameterSchema?.allocationUnit !== 'attack_die') return {};
  if (domain.parameterSchema.properties) return domain.parameterSchema.properties;
  return {
    closeRanksMode: { type: 'string', enum: domain.parameterSchema.closeRanksMode },
    allocations: { type: 'array', minItems: 1, items: {
      type: 'object', required: [...ALLOCATION_FIELDS], additionalProperties: false,
      properties: {
        targetUnitId: { type: 'string', enum: domain.parameterSchema.targetUnitIds },
        dice: { type: 'integer', minimum: 1 },
      },
    } },
  };
}

export function createOfficialSelectedRosterFightParameterSchemaV1({
  targetUnitIds, leadingModelIds, surgeRequired, criticalRequired, conditionalCriticalTargetUnitIds = [], hostDerivedFields,
}) {
  const target = required => required
    ? { type: 'string', enum: [...targetUnitIds], allocatedTargetRequired: true }
    : { enum: ['', null] };
  const coordinate = { type: 'integer' };
  const point = { type: 'object', required: ['xMilliInches', 'yMilliInches'],
    properties: { xMilliInches: coordinate, yMilliInches: coordinate } };
  return {
    type: 'object', additionalProperties: false, ...(hostDerivedFields ? {hostDerivedFields} : {}),
    required: ['closeRanksMode', 'allocations',
      ...(surgeRequired ? ['surgeTargetUnitId'] : []),
      ...(criticalRequired ? ['criticalTargetUnitId'] : [])],
    // Retain the original flat metadata for existing UI/query readers.
    closeRanksMode: ['decline', 'move'], allocationUnit: 'attack_die',
    targetUnitIds: [...targetUnitIds],
    moveRequires: ['leadingModelId', 'path', 'placements'],
    conditionalRequiredFields: [{ when: { field: 'closeRanksMode', value: 'move' },
      required: ['leadingModelId', 'path', 'placements'] }],
    properties: {
      ...describeOfficialSelectedRosterFightParameterFieldsV1({
        parameterKind: 'official_selected_roster_fight_v1',
        parameterSchema: { allocationUnit: 'attack_die',
          closeRanksMode: ['decline', 'move'], targetUnitIds },
      }),
      surgeTargetUnitId: target(surgeRequired),
      criticalTargetUnitId: !criticalRequired && conditionalCriticalTargetUnitIds.length
        ? { type: ['string', 'null'], enum: ['', null, ...conditionalCriticalTargetUnitIds], allocatedTargetRequired: true }
        : target(criticalRequired),
      leadingModelId: { type: 'string', enum: [...leadingModelIds] },
      path: { type: 'array', minItems: 1, items: point },
      placements: { type: 'array', items: { ...point,
        required: ['modelId', 'xMilliInches', 'yMilliInches'], properties: {
          ...point.properties, modelId: { type: 'string', enum: [...leadingModelIds] },
        } } },
      elevationTransitions: { type: 'array' },
      ...(hostDerivedFields ? {} : {gapMouths:{type:'array'}, coherencyGapMouths:{type:'array'}}),
    },
    submissionContractVersion: 'official_selected_roster_fight_submission_v2',
  };
}
