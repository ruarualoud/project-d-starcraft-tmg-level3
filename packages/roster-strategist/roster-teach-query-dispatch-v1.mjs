import { STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1 } from '../online-agent-session/spatial-query-contracts-v1.mjs';
import { isDeepStrictEqual } from 'node:util';

// The strict multi-family wire schema requires these fields even for spatial
// queries. Only its known neutral placeholders may be omitted. A real zero
// inside argumentsJson, unknown field, nonempty vector or scenario is untouched.
const neutralWireObjects = {
  inputs: { mineralBudget: 0, mineralSpent: 0, vespeneSpent: 0,
    vespeneLimitNumerator: 0, vespeneLimitDenominator: 0,
    planned: [], projected: [], values: [] },
  spec: { kind: '', lifecycleSteps: 0, phase: '', activeSideKey: '',
    isolateToPlacedPieces: false, clearTerrain: false, placements: [] },
};
const neutralObject = (value, shape) => value && typeof value === 'object'
  && !Array.isArray(value) && Object.entries(value).every(([key, item]) =>
    Object.hasOwn(shape, key) && JSON.stringify(item) === JSON.stringify(shape[key]));

// Preparation must admit a known bad model request into per-query correction.
// Execution still uses the strict normalizer; ambiguity is never silently fixed.
export function prepareRosterTeachQueryDispatchV1(request) {
  try { return normalizeRosterTeachQueryDispatchV1(request); }
  catch (error) {
    if (error.code !== 'ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS') throw error;
    return { request, normalization: null, error: { code: error.code, detail: error.message } };
  }
}

// The explicitly named, registered Native tool is the model's actual selection.
// Repair only its redundant family wrapper. Never invent arguments or interpret
// an ambiguous scene/math/legacy request as a different operation.
export function normalizeRosterTeachQueryDispatchV1(request) {
  // Some model replies put the complete selected request into toolRequest
  // again. Only a same-kind envelope with NO other fields is redundant. Never
  // guess which of two operation kinds, branches or argument copies was meant.
  let unwrapped = request, unwrappedEnvelopes = 0;
  while (typeof unwrapped?.kind === 'string'
    && Object.hasOwn(unwrapped.toolRequest || {}, 'kind')
    && unwrapped.toolRequest.kind === unwrapped.kind
    && unwrapped.toolRequest.toolRequest
    && typeof unwrapped.toolRequest.toolRequest === 'object'
    && !Array.isArray(unwrapped.toolRequest.toolRequest)
    && Object.keys(unwrapped.toolRequest).length === 2
    && Object.hasOwn(unwrapped.toolRequest, 'toolRequest')) {
    unwrapped = { ...unwrapped, toolRequest: unwrapped.toolRequest.toolRequest };
    unwrappedEnvelopes++;
  }
  if (unwrappedEnvelopes) {
    const normalized = normalizeRosterTeachQueryDispatchV1(unwrapped);
    return { ...normalized, normalization: { ...normalized.normalization,
      version: 4, requestedKind: request.kind, executedKind: normalized.request.kind,
      unwrappedEnvelopes, authority: 'identical_kind_envelope',
      argumentsChanged: false, hostTacticChosen: false } };
  }
  const args = request?.toolRequest;
  if (request?.kind === 'scenario'
    && Object.hasOwn(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1, args?.queryKind)) {
    // Creating a scene and asking a Native question are separate operations.
    // Silently ignoring the latter falsely labelled static geometry as an
    // answered movement/arrival query. The model must choose explicit followUps.
    throw Object.assign(Error('ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS:scenario_and_native_query; use explicit scenario followUps or a standalone spatial query'),
      { code: 'ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS' });
  }
  if (request?.kind === 'scenario' && Array.isArray(args?.followUps)) {
    const followUpNormalizations = [];
    const followUps = args.followUps.map((followUp, index) => {
      if (!followUp || typeof followUp !== 'object' || Array.isArray(followUp)) return followUp;
      const { kind, ...toolRequest } = followUp;
      let normalized;
      try { normalized = normalizeRosterTeachQueryDispatchV1({ kind, toolRequest }); }
      catch (error) {
        if (error.code !== 'ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS') throw error;
        return followUp; // Preserve conflict for the existing per-child rejection.
      }
      if (!normalized.normalization) return followUp;
      followUpNormalizations.push({ index, normalization: normalized.normalization });
      return { ...normalized.request.toolRequest, kind: normalized.request.kind };
    });
    if (followUpNormalizations.length) return { request: { ...request,
      toolRequest: { ...args, followUps } }, normalization: { version: 4,
      requestedKind: request.kind, executedKind: request.kind, followUpNormalizations,
      authority: 'shared_native_query_registry', argumentsChanged: false, hostTacticChosen: false } };
  }
  if (!args || request.kind === 'scenario'
    || !Object.hasOwn(STARCRAFT_TMG_SPATIAL_QUERY_CONTRACTS_V1, args.queryKind)) {
    return { request, normalization: null };
  }
  if (!['spatial', 'inspect', 'map_route', 'math', 'probability', 'threat_exchange'].includes(request.kind)) {
    return { request, normalization: null };
  }
  const active = value => value != null && value !== '' && value !== false && value !== 0
    && (!Array.isArray(value) || value.length > 0);
  // Strict multi-family output may repeat the same Native arguments outside
  // their canonical container. Coalesce only exact typed equality, not aliases,
  // guessed defaults, conflicting selectors or a missing native parameter.
  // The paid request is immutable; the Native arguments themselves never change.
  let nativeArguments = args.arguments;
  if (args.argumentsJson) {
    try { nativeArguments = JSON.parse(args.argumentsJson); }
    catch { nativeArguments = null; }
  }
  const omittedIdenticalNativeArgumentFields = nativeArguments
    && typeof nativeArguments === 'object' && !Array.isArray(nativeArguments)
    ? ['intent', 'attackerUnitId', 'targetUnitId', 'domainId', 'sideId', 'baseId',
      'targetId', 'subjectUnitIds', 'targetIds', 'sampleBudget'].filter(key =>
      Object.hasOwn(args, key) && Object.hasOwn(nativeArguments, key)
      && isDeepStrictEqual(args[key], nativeArguments[key])) : [];
  const conflicts = ['mathKind', 'intent', 'attackerUnitId', 'targetUnitId', 'sideId', 'baseId', 'targetId',
    'subjectUnitIds', 'targetIds', 'sampleBudget'].filter(key => active(args[key])
      && !omittedIdenticalNativeArgumentFields.includes(key));
  if (args.spec && Object.values(args.spec).some(active)) conflicts.push('spec');
  if (args.followUps?.length) conflicts.push('followUps');
  if (request.kind !== 'spatial' && conflicts.length) throw Object.assign(Error(`ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS:${conflicts.join(',')}`),
    { code: 'ROSTER_TEACH_QUERY_DISPATCH_AMBIGUOUS' });
  const omittedWirePlaceholderFields = ['sampleBudget', 'inputs', 'spec'].filter(key =>
    Object.hasOwn(args, key) && (key === 'sampleBudget' ? args[key] === 0
      : neutralObject(args[key], neutralWireObjects[key])));
  if (request.kind === 'spatial' && !omittedWirePlaceholderFields.length
    && !omittedIdenticalNativeArgumentFields.length) return { request, normalization: null };
  const toolRequest = { ...args };
  for (const key of [...omittedWirePlaceholderFields, ...omittedIdenticalNativeArgumentFields]) delete toolRequest[key];
  return { request: { ...request, kind: 'spatial', toolRequest }, normalization: {
    version: 3, requestedKind: request.kind, executedKind: 'spatial', nativeQueryKind: args.queryKind,
    omittedWirePlaceholderFields, omittedIdenticalNativeArgumentFields,
    authority: 'shared_native_query_registry', argumentsChanged: false, hostTacticChosen: false,
  } };
}
