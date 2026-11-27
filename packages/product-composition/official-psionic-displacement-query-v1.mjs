import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialTokenDisplacementSceneV1, solveOfficialTokenDisplacementGeometryV1,
  resolveOfficialTokenDisplacementCoordinateV1, validateOfficialDisplacementChoicesV1 }
  from '../rule-atoms/official-token-displacement-geometry-v1.mjs';
import { createOfficialBattlefieldTokenV1 } from '../rule-atoms/official-battlefield-token-marker-rules-kernel-v1.mjs';

const seal = (body, field) => ({ ...body, [field]: hash(body) });
export function createOfficialPsionicDisplacementQueryPolicyV1({ context, source }) {
  const record = context.dataset.recordsByKey['rules_sections:FuahgilWtc8nccVSp2Vv'];
  const rule = record?.payload.items?.[0]?.subItems?.[16];
  const text = rule?.content?.[0]?.value;
  if (rule?.title !== 'DISPLACEMENT' || typeof text !== 'string' || !text.includes('controlling player of the <b>Leading Model</b>')
    || !text.includes('If <b>Base-to-Base</b> is not possible, set it as close as possible.')
    || !['Move', 'Deploy', 'Run', 'Charge', 'Disengage', 'Close Ranks', 'Special Ability'].every(word => text.includes('<b>' + word + '</b>'))) {
    throw Error('PSIONIC_DISPLACEMENT_RULE_SOURCE_REQUIRED');
  }
  return seal({ schema: 'starcraft_tmg_psionic_displacement_query_policy_v1', version: '1.0.0',
    sourceBundleHash: source.bundleHash, ruleRecordHash: record.sourceRecordHash, rulePayloadHash: record.payloadHash,
    rulePointer: '/payload/items/0/subItems/16', sourceText: text, coordinateQuantumMilliInches: 1,
    closestToleranceMilliInches: 1, maxSearchNodes: 50000, searchMissIsNotImpossibility: true,
    executionConsumerReady: false, trainingTruth: false }, 'policyHash');
}
export function createOfficialBattlefieldDisplacementQueryPolicyV1({ context, source }) {
  if (source?.schema !== 'starcraft_tmg_battlefield_displacement_source_v1') {
    throw Error('BATTLEFIELD_DISPLACEMENT_SOURCE_REQUIRED');
  }
  const { schema, policyHash, ...body } = createOfficialPsionicDisplacementQueryPolicyV1({ context, source });
  return seal({ schema: 'starcraft_tmg_battlefield_displacement_query_policy_v1', ...body }, 'policyHash');
}
export function createOfficialPsionicDisplacementQueryV1({ context, source, producer, spatial, state,
  executionConsumerReady = false, prepareMovement = null }) {
  const battlefield = source?.schema === 'starcraft_tmg_battlefield_displacement_source_v1';
  const policy = (battlefield ? createOfficialBattlefieldDisplacementQueryPolicyV1
    : createOfficialPsionicDisplacementQueryPolicyV1)({ context, source });
  const selectedPolicy = battlefield ? state.officialBattlefieldDisplacementQueryPolicy : state.officialPsionicDisplacementQueryPolicy;
  if (!spatial || !isDeepStrictEqual(policy, selectedPolicy)) throw Error('PSIONIC_DISPLACEMENT_QUERY_POLICY_MISMATCH');
  const descriptor = { queryVersion: prepareMovement ? '1.1.0' : '1.0.0', policyHash: policy.policyHash,
    queryKind: battlefield ? 'battlefield_token_displacement' : 'psionic_transfer_displacement', geometryVersion: '1.0.0', executionConsumerReady,
    ...(prepareMovement ? { registeredMovementDomains: true, precedingTokenChoicesSupported: true } : {}),
    ruleAtomId: 'rule-atom:source-bound-displacement-coordinate-proof-v1', trainingTruth: false };
  const cache = new Map();
  const sourceEvidence = row => battlefield ? row.sourceEvidence : { sourceEffectHash: row.effect.effectHash };
  function inspectPrepared(current, { postMovementState, pieceId, movementGeometry, tokenId, coordinate }) {
    const effect = producer.validatedEffects(current).find(row => row.token.tokenId === tokenId);
    if (!effect) throw Error('PSIONIC_DISPLACEMENT_SOURCE_TOKEN_REQUIRED');
    const scene = createOfficialTokenDisplacementSceneV1({ state: postMovementState, pieceId,
      movementGeometry, tokenId, policyHash: policy.policyHash });
    let solution = cache.get(scene.sceneHash);
    if (!solution) {
      solution = solveOfficialTokenDisplacementGeometryV1({ scene, maxVisitedNodes: policy.maxSearchNodes });
      if (cache.size >= 16) cache.delete(cache.keys().next().value);
      cache.set(scene.sceneHash, solution);
    }
    return { ...sourceEvidence(effect), solution,
      ...(coordinate !== undefined ? { coordinateVerdict: resolveOfficialTokenDisplacementCoordinateV1({ scene, coordinate, solution }) } : {}) };
  }
  function query(current, request) {
    if (!request || Object.keys(request).some(key => !['queryKind', 'pieceId', 'actionType', 'parameters', 'tokenId', 'coordinate',
      ...(prepareMovement ? ['definitionId', 'weaponName', 'precedingDisplacements'] : [])].includes(key))) {
      throw Error('PSIONIC_DISPLACEMENT_QUERY_PARAMETERS_INVALID');
    }
    const effect = producer.validatedEffects(current).find(row => row.token.tokenId === request.tokenId);
    if (!effect) throw Error('PSIONIC_DISPLACEMENT_SOURCE_TOKEN_REQUIRED');
    let prepared;
    if (prepareMovement) prepared = prepareMovement(current, request);
    else {
      const domain = spatial.enumerate(current).parameterDomains.find(row => row.pieceId === request.pieceId && row.actionType === request.actionType);
      if (!domain) throw Error('PSIONIC_DISPLACEMENT_MOVEMENT_DOMAIN_UNAVAILABLE');
      const value = spatial.instantiate(current, domain, request.parameters);
      prepared = { action: value.action, geometry: value.action.spatialPlan, sideKey: domain.sideKey,
        state: executionConsumerReady ? spatial.apply(current, value.action, {}).state : current };
    }
    const preceding = validateOfficialDisplacementChoicesV1(request.precedingDisplacements === undefined ? [] : request.precedingDisplacements);
    if (preceding.some(row => row.tokenId === request.tokenId)) throw Error('PSIONIC_DISPLACEMENT_QUERY_TOKEN_ALREADY_SELECTED');
    const postMovement = preceding.length ? prepareChoices(current, { postMovementState: prepared.state,
      pieceId: request.pieceId, movementGeometry: prepared.geometry, choices: preceding }).state : prepared.state;
    const inspected = inspectPrepared(current, { postMovementState: postMovement,
      pieceId: request.pieceId, movementGeometry: prepared.geometry, tokenId: request.tokenId, coordinate: request.coordinate });
    return seal({ schema: battlefield ? 'starcraft_tmg_battlefield_displacement_query_result_v1'
      : 'starcraft_tmg_psionic_displacement_query_result_v1', policyHash: policy.policyHash,
      stateHash: hash(current), ...sourceEvidence(effect), tokenId: request.tokenId,
      moverPieceId: request.pieceId, controllerSideKey: prepared.sideKey, leadingModelId: prepared.geometry.leadingModelId,
      movementCoreActionHash: hash(prepared.action), movementCorePrepared: true,
      scope: 'token_coordinate_geometry_after_declared_full_movement_formation', solution: inspected.solution,
      ...(inspected.coordinateVerdict ? { coordinateVerdict: inspected.coordinateVerdict } : {}), executionConsumerReady,
      fullMovementExecutableNotCertified: true, mutationAuthority: false, trainingTruth: false }, 'queryReceiptHash');
  }
  function prepareChoices(current, { postMovementState, pieceId, movementGeometry, choices }) {
    const selected = validateOfficialDisplacementChoicesV1(choices);
    const next = structuredClone(postMovementState);
    const evidence = [];
    const events = [];
    const actor = current.pieces.find(piece => piece.id === pieceId);
    for (const choice of selected) {
      const token = next.board.tokens.find(row => row.tokenId === choice.tokenId);
      if (!token) throw Error('PSIONIC_DISPLACEMENT_TOKEN_REMOVED_DURING_MOVE');
      const proof = inspectPrepared(current, { postMovementState: next, pieceId,
        movementGeometry, tokenId: choice.tokenId, coordinate: choice.coordinate });
      const originEvidence = proof.sourceBindingHash ? { sourceBindingHash: proof.sourceBindingHash }
        : { sourceEffectHash: proof.sourceEffectHash };
      if (!proof.coordinateVerdict.displacementConditionSatisfied) {
        throw Error(proof.coordinateVerdict.needsClosestProof ? 'PSIONIC_DISPLACEMENT_NEAREST_PROOF_INCOMPLETE'
          : 'PSIONIC_DISPLACEMENT_COORDINATE_NOT_RULE_LEGAL');
      }
      const replacement = createOfficialBattlefieldTokenV1({ registry: next.officialBattlefieldTokenMarkerRegistry,
        tokenId: token.tokenId, tokenKind: token.tokenKind, baseShape: token.baseShape,
        baseDiameterMm: token.baseDiameterMm, createdByPieceId: token.createdByPieceId,
        createdRound: token.createdRound, stayInPlay: token.stayInPlay,
        coordinate: { x: choice.coordinate.xMilliInches / 1000, y: choice.coordinate.yMilliInches / 1000 } });
      next.board.tokens = next.board.tokens.map(row => row.tokenId === token.tokenId ? replacement : row);
      if (battlefield) producer.recordTokenDisplacement(next, token, replacement);
      evidence.push({ tokenId: token.tokenId, previousTokenHash: token.tokenHash, tokenHash: replacement.tokenHash,
        sceneHash: proof.solution.sceneHash, resultHash: proof.solution.resultHash,
        ...originEvidence, gapMilliInches: proof.coordinateVerdict.gapMilliInches,
        baseContact: proof.coordinateVerdict.baseContact, globalLowerBoundMilliInches: proof.solution.globalLowerBoundMilliInches,
        optimalityCertified: proof.solution.optimalityCertified });
      events.push({ type: battlefield ? 'battlefield_token_displaced' : 'psionic_shade_displaced', tokenId: token.tokenId, sourcePieceId: token.createdByPieceId,
        moverPieceId: pieceId, controllerSideKey: actor.sideKey, leadingModelId: movementGeometry.leadingModelId,
        coordinate: choice.coordinate, previousTokenHash: token.tokenHash, tokenHash: replacement.tokenHash });
    }
    return { state: next, evidence, events };
  }
  return Object.freeze({ descriptor, query, inspectPrepared, prepareChoices });
}
