// Browser-safe projection of Native submission contracts. No Rules arithmetic,
// target selection, payment selection, or geometry certification happens here.
import { describeOfficialSelectedRosterFightParameterFieldsV1 } from '../product-composition/official-selected-roster-attack-allocation-contract-v1.mjs';
import { describeOfficialSelectedRosterChargeParameterFieldsV1, describeOfficialChargeResolutionFieldsV1 } from '../product-composition/official-selected-roster-charge-parameter-contract-v1.mjs';
import { describeOfficialRelocationParameterFieldsV1 } from '../product-composition/official-relocation-parameter-contract-v1.mjs';
import { describeOfficialSelectedRosterSpatialParameterFieldsV1 } from '../product-composition/official-selected-roster-spatial-parameter-contract-v1.mjs';

const object = value => value && typeof value === 'object' && !Array.isArray(value);
const point = { type: 'object', required: ['xMilliInches', 'yMilliInches'], properties: {
  xMilliInches: { type: 'integer' }, yMilliInches: { type: 'integer' },
} };

function normalize(field) {
  if (!object(field)) return null;
  if (Object.hasOwn(field, 'const') || Array.isArray(field.enum)) return field;
  if (field.type === 'world_point_milli_inches') return { ...point };
  if (field.type === 'object' && object(field.properties)) {
    const properties = Object.fromEntries(Object.entries(field.properties)
      .map(([key, value]) => [key, normalize(value)]).filter(([, value]) => value));
    if ((field.required || []).some(key => !properties[key])) return null;
    return { ...field, properties };
  }
  if (field.type === 'array') {
    const items = normalize(field.items);
    return items ? { ...field, items } : null;
  }
  return ['integer', 'number', 'boolean', 'string'].includes(field.type) ? field : null;
}

export function describeNativeActionFormV1(outer, {modelIds = [], tokenIds = []} = {}) {
  const domain = outer?.constraints?.delegateDomain || outer || {};
  const schema = domain.parameterSchema || {};
  const resolution = describeOfficialChargeResolutionFieldsV1(domain, {modelIds});
  const fields = {
    ...(schema.properties || Object.fromEntries(Object.entries(schema)
      .filter(([, value]) => object(value) && (value.type || value.enum || Object.hasOwn(value, 'const'))))),
    ...describeOfficialSelectedRosterFightParameterFieldsV1(domain),
    ...describeOfficialSelectedRosterChargeParameterFieldsV1(domain),
    ...describeOfficialRelocationParameterFieldsV1(domain),
    ...describeOfficialSelectedRosterSpatialParameterFieldsV1(domain),
    ...resolution,
  };
  const tokens = schema.tokenDisplacements;
  if (tokens?.type === 'array' && tokens.items?.tokenId?.type === 'current_source_token_handle'
    && tokens.items?.coordinate?.coordinateUnit === 'milli-inch') {
    fields.tokenDisplacements = {type: 'array', items: {type: 'object', required: ['tokenId','coordinate'], properties: {
      tokenId: {type: 'string', enum: tokenIds}, coordinate: point,
    }}};
  }
  const payments = schema.paymentCardInstanceIdsByChoice;
  if (payments) fields.paymentCardInstanceIds = { type: 'array', enum: [] };
  const disengageRemoval=domain.actionType==='disengage'&&schema.casualtyRequiresNativeEndpointAbsenceProof===true;
  const required = [...new Set([...(schema.required || []),...(disengageRemoval?['leadingOutcome']:[])])];
  const normalized = Object.fromEntries(Object.entries(fields)
    .map(([key, value]) => [key, normalize(value)]).filter(([, value]) => value));
  const missing = required.filter(key => !normalized[key]);
  const conditional = resolution ? schema.outcome.flatMap(value => {
    const keys = value === 'success' ? schema.successRequires : schema.failureRequires;
    return keys?.length ? [{when: {field: 'outcome', value}, required: keys}] : [];
  }) : schema.conditionalRequiredFields || [];
  const chargeFieldOutcomes = resolution ? {path: 'success', placements: 'success', tokenDisplacements: 'success', failureProof: 'failure'} : null;
  for (const row of conditional) for (const key of row.required || []) {
    if (!normalized[key] && !missing.includes(key)) missing.push(key);
  }
  return {
    domainId: outer?.domainId, required, fields: normalized, conditional, chargeFieldOutcomes,
    disengageRemoval,
    casualtyOptions: Array.isArray(domain.constraints?.legalSelections)
      ? domain.constraints.legalSelections.map(row => ({selectionHash: row.selectionHash,
        casualtyModelIds: [...row.casualtyModelIds], remainingModelIds: [...row.remainingModelIds]})) : [],
    paymentsByChoice: payments || null,
    supported: Array.isArray(schema.required) && missing.length === 0,
    missing, rulesValidationRequired: true,
  };
}

// Display only the facts already published in this defender's LegalSpace.
// The opaque selection hash remains the submitted authority identity.
export function nativeCasualtyOptionLabelsV1(form, names = {}) {
  const modelName = id => names[id] || (/model-([0-9]+)$/u.test(id)
    ? `模型 ${id.match(/model-([0-9]+)$/u)[1]}` : id);
  return Object.fromEntries((form.casualtyOptions || []).map((row, index) => [row.selectionHash,
    `方案 ${index + 1} · ${row.casualtyModelIds.length ? '移除顺序：' + row.casualtyModelIds.map(modelName).join(' → ') : '不移除模型'} · 剩余 ${row.remainingModelIds.length} 模型`]));
}

export function nativeActionFormDefaultsV1(form) {
  return Object.fromEntries(Object.entries(form.fields).flatMap(([key, field]) =>
    Object.hasOwn(field, 'const') ? [[key, structuredClone(field.const)]] : []));
}

export function compileNativeActionFormValuesV1(form, values) {
  const required = [...new Set([...form.required, ...form.conditional.flatMap(row =>
    values[row.when?.field] === row.when?.value ? row.required : [])])];
  const parameters = {};
  for (const [key, value] of Object.entries(values)) {
    if (!form.fields[key] || value === undefined) continue;
    if (form.chargeFieldOutcomes?.[key] && values.outcome !== form.chargeFieldOutcomes[key]) continue;
    parameters[key] = structuredClone(value);
  }
  for (const [key, field] of Object.entries(form.fields)) {
    if (Object.hasOwn(field, 'const') && (!form.chargeFieldOutcomes?.[key] || values.outcome === form.chargeFieldOutcomes[key])) {
      parameters[key] = structuredClone(field.const);
    }
  }
  if(form.disengageRemoval){
    if(parameters.leadingOutcome==='casualty'){parameters.path=[];parameters.placements=[];}
    else if(Array.isArray(parameters.placements))parameters.placements=parameters.placements.map(row=>
      row?.outcome==='casualty'?Object.fromEntries(Object.entries(row).filter(([key])=>['modelId','outcome'].includes(key))):row);
  }
  const missing = required.filter(key => !Object.hasOwn(parameters, key));
  const invalid = [];
  const inspect = (value, field, path) => {
    const choices = field.enum;
    if (choices && !choices.some(choice => JSON.stringify(choice) === JSON.stringify(value))) invalid.push(path);
    if (field.type === 'integer' && !Number.isSafeInteger(value)) invalid.push(path);
    if (field.type === 'number' && !Number.isFinite(value)) invalid.push(path);
    if (field.type === 'string' && typeof value !== 'string') invalid.push(path);
    if (field.type === 'object') {
      if (!object(value)) { invalid.push(path); return; }
      for (const key of field.required || []) if (value[key] === undefined) invalid.push(path + '.' + key);
      for(const row of field.conditionalRequiredFields||[])if(value[row.when.field]===row.when.value)
        for(const key of row.required)if(value[key]===undefined)invalid.push(path+'.'+key);
      for (const [key, child] of Object.entries(value)) {
        if (field.properties?.[key]) inspect(child, field.properties[key], path + '.' + key);
      }
    }
    if (field.type === 'array') {
      if (!Array.isArray(value)) { invalid.push(path); return; }
      if (value.length < (field.minItems || 0) || value.length > (field.maxItems ?? Infinity)) invalid.push(path);
      if (field.items) value.forEach((child, index) => inspect(child, field.items, path + '[' + index + ']'));
    }
  };
  for (const [key, value] of Object.entries(parameters)) {
    const field = form.disengageRemoval&&parameters.leadingOutcome==='casualty'&&['path','placements'].includes(key)?{const:[]}
      :key === 'paymentCardInstanceIds' && form.paymentsByChoice
      ? { enum: form.paymentsByChoice[parameters.choice ?? 'default'] || [] } : form.fields[key];
    inspect(value, field, key);
  }
  return { parameters, missing, invalid, complete: form.supported && !missing.length && !invalid.length };
}
