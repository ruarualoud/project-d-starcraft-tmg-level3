import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

// A presentation/runtime composition boundary, not a Rules implementation.
// Native semantic choice categories remain in the source runtime. The public
// Room contract uses the supported, stricter explicit-human confirmation mode.
export function createOfficialHumanConfirmedRuntimeV1(source,{projectParameterConstraints=false}={}) {
  if (!source?.descriptor?.runtimeHash || typeof source.enumerate !== 'function'
    || typeof source.instantiate !== 'function' || typeof source.apply !== 'function') {
    throw Error('HUMAN_CONFIRMED_SOURCE_RUNTIME_REQUIRED');
  }
  const { runtimeHash, ...previous } = source.descriptor;
  const body = { ...previous, runtimeId: previous.runtimeId + '-human-confirmed', runtimeVersion: projectParameterConstraints?'1.1.0':'1.0.0',
    sourceRuntimeHash: runtimeHash, parameterConfirmationPolicy: 'explicit_human_v1',
    ...(projectParameterConstraints?{parameterConstraintProjection:'empty_container_for_absent_native_constraints_v1'}:{}),
    productionRoomEligible: false, trainingTruth: false };
  const descriptor = Object.freeze({ ...body, runtimeHash: hash(body) });
  function wrap(domain) {
    const { domainId, ...fields } = domain;
    const body = { ...fields,...(projectParameterConstraints&&fields.constraints===undefined?{constraints:{}}:{}),
      confirmationClass: 'explicit_human', humanConfirmationSourceDomainId: domainId };
    return { ...body, domainId: 'sc-domain-' + hash(body) };
  }
  function enumerate(state, options) {
    const space = source.enumerate(state, options);
    return { ...space, parameterDomains: space.parameterDomains.map(wrap) };
  }
  function instantiate(state, domain, parameters) {
    const original = source.enumerate(state, { sideKey: domain?.sideKey }).parameterDomains.find(d =>
      d.domainId === domain?.humanConfirmationSourceDomainId);
    if (!original || !isDeepStrictEqual(wrap(original), domain)) throw Error('HUMAN_CONFIRMED_DOMAIN_STALE');
    return source.instantiate(state, original, parameters);
  }
  return Object.freeze({ ...source, descriptor, enumerate, instantiate });
}

export function createOfficialHumanConfirmedRuntimeV2(source){
  return createOfficialHumanConfirmedRuntimeV1(source,{projectParameterConstraints:true});
}
