import { isDeepStrictEqual } from 'node:util';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialModelBaseFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 }
  from '../rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { createOfficialDisplacementTokenFootprintV1, getOfficialDisplacementMovementGeometryV1,
  validateOfficialDisplacementChoicesV1 as canonicalChoices }
  from '../rule-atoms/official-token-displacement-geometry-v1.mjs';
import { createOfficialPsionicDisplacementQueryPolicyV1, createOfficialBattlefieldDisplacementQueryPolicyV1 }
  from './official-psionic-displacement-query-v1.mjs';

const version = '1.0.0';
const pendingKey = 'pendingOfficialDisplacedCloseRanksFight';
const seal = (body, field) => ({ ...body, [field]: hash(body) });
const withoutParentHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'parentHash'));
const positionsHash = (state, pieceId) => hash(state.pieces.find(piece => piece.id === pieceId)?.models);
export function createOfficialPsionicDisplacementPolicyV1({ context, source, includeCloseRanks = false,
  includeMovementQueries = false, includeCloseRanksReactions = false }) {
  if (includeCloseRanksReactions && !includeCloseRanks) throw Error('PSIONIC_CLOSE_RANKS_REACTION_MOVEMENT_REQUIRED');
  const battlefield = source?.schema === 'starcraft_tmg_battlefield_displacement_source_v1';
  const query = (battlefield ? createOfficialBattlefieldDisplacementQueryPolicyV1
    : createOfficialPsionicDisplacementQueryPolicyV1)({ context, source });
  return seal({ schema: battlefield ? 'starcraft_tmg_battlefield_displacement_policy_v1'
    : 'starcraft_tmg_psionic_displacement_policy_v1', version: includeCloseRanksReactions ? '1.3.0' : includeMovementQueries ? '1.2.0' : includeCloseRanks ? '1.1.0' : version,
    sourceBundleHash: source.bundleHash, queryPolicyHash: query.policyHash,
    atomicMovementAndTokenCommit: true, movingLeaderControllerChooses: true,
    boundMovementKinds: ['spatial', 'melee_successful_charge', 'unit_relocation', ...(includeCloseRanks ? ['melee_close_ranks'] : [])],
    ...(includeCloseRanks ? { closeRanksConsumerReady: true, closeRanksBeforeFightChance: true } : {}),
    ...(includeMovementQueries ? { movementQueriesReady: true, sequentialChoicesQueryAndApplyShared: true } : {}),
    ...(includeCloseRanksReactions ? { closeRanksReactionsReady: true, allCloseRanksMovementBeforeAttack: true } : {}),
    completeMovementKindCoverage: false, trainingTruth: false }, 'policyHash');
}
export function createOfficialBattlefieldDisplacementPolicyV1(options) {
  if (options.source?.schema !== 'starcraft_tmg_battlefield_displacement_source_v1') {
    throw Error('BATTLEFIELD_DISPLACEMENT_SOURCE_REQUIRED');
  }
  return createOfficialPsionicDisplacementPolicyV1(options);
}
function movementGeometry(action) {
  return action.spatialPlan || action.chargeResolutionPlan?.geometry || action.relocationPlan?.geometryPlan;
}
export function createOfficialPsionicDisplacementRuntimeV1({ context, source, producer, queryPort, state, applyOriginal,
  projectCloseRanksMovement, prepareFightContinuation, applyFightContinuation, fightContinuationChoices, readHiddenLossParent }) {
  const battlefield = source?.schema === 'starcraft_tmg_battlefield_displacement_source_v1';
  const selectedPolicy = battlefield ? state.officialBattlefieldDisplacementPolicy : state.officialPsionicDisplacementPolicy;
  const closeRanks = selectedPolicy?.closeRanksConsumerReady === true;
  const closeRanksReactions = selectedPolicy?.closeRanksReactionsReady === true;
  const policy = createOfficialPsionicDisplacementPolicyV1({ context, source, includeCloseRanks: closeRanks,
    includeMovementQueries: selectedPolicy?.movementQueriesReady === true,
    includeCloseRanksReactions: closeRanksReactions });
  if (!queryPort || !isDeepStrictEqual(policy, selectedPolicy)) throw Error('PSIONIC_DISPLACEMENT_POLICY_MISMATCH');
  if (closeRanks && [projectCloseRanksMovement, prepareFightContinuation, applyFightContinuation].some(value => typeof value !== 'function')) {
    throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_CONSUMERS_REQUIRED');
  }
  if (closeRanksReactions && [fightContinuationChoices, readHiddenLossParent].some(value => typeof value !== 'function')) {
    throw Error('PSIONIC_CLOSE_RANKS_REACTION_CONSUMERS_REQUIRED');
  }
  const runtimeId = battlefield ? 'official-battlefield-displacement-runtime-v1' : 'official-psionic-displacement-runtime-v1';
  const historyKey = battlefield ? 'battlefieldTokenDisplacementHistory' : 'psionicShadeDisplacementHistory';
  const runtimeVersion = policy.version;
  const descriptor = { runtimeId, runtimeVersion, policyHash: policy.policyHash,
    ruleAtomIds: [battlefield ? 'rule-atom:source-bound-atomic-token-displacement-v1' : 'rule-atom:source-bound-atomic-shade-displacement-v1'],
    boundMovementKinds: policy.boundMovementKinds, completeMovementKindCoverage: false, trainingTruth: false };
  function split(parameters) {
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) throw Error('PSIONIC_DISPLACEMENT_PARAMETERS_INVALID');
    const { tokenDisplacements, ...coreParameters } = parameters;
    return { coreParameters, choices: tokenDisplacements === undefined ? [] : canonicalChoices(tokenDisplacements) };
  }
  function prepare(current, originalKind, originalAction, selected, options = {}) {
    if (!['spatial', 'melee', 'relocation'].includes(originalKind)) throw Error('PSIONIC_DISPLACEMENT_MOVEMENT_KIND_UNSUPPORTED');
    const choices = canonicalChoices(selected);
    const stagedFight = closeRanks && Boolean(originalAction.meleePlan?.closeRanksGeometry);
    const geometry = closeRanks ? getOfficialDisplacementMovementGeometryV1(originalAction) : movementGeometry(originalAction);
    if (!geometry?.finalModelPositions) {
      if (choices.length) throw Error('PSIONIC_DISPLACEMENT_MOVEMENT_REQUIRED');
      return null;
    }
    const actor = current.pieces.find(piece => piece.id === originalAction.pieceId);
    const lead = actor.models.find(model => model.id === geometry.leadingModelId);
    const placed = geometry.finalModelPositions.find(row => row.modelId === geometry.leadingModelId);
    const footprint = createOfficialModelBaseFootprintV1({ piece: actor, model: lead, position: placed,
      dataBundle: current.officialModelBaseGeometryDataBundle });
    const overlapped = producer.validatedEffects(current).filter(({ token }) =>
      evaluateOfficialPhysicalFootprintRelationV1({ left: footprint, right: createOfficialDisplacementTokenFootprintV1(token) }).overlappingInteriors);
    if (!overlapped.length && !(stagedFight && closeRanksReactions)) {
      if (choices.length) throw Error('PSIONIC_DISPLACEMENT_UNEXPECTED_TOKEN_CHOICE');
      return null;
    }
    if (choices.length !== overlapped.length || choices.some(row => !overlapped.some(effect => effect.token.tokenId === row.tokenId))) {
      throw Error('PSIONIC_DISPLACEMENT_PLACEMENTS_REQUIRED');
    }
    if (originalAction.chance?.count > 0 && !stagedFight) throw Error('PSIONIC_DISPLACEMENT_RANDOM_MOVEMENT_STEP_UNSUPPORTED');
    if (stagedFight && options.chanceReveals?.length) throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_MUST_NOT_ROLL');
    const original = stagedFight ? { ok: true, state: projectCloseRanksMovement(current, originalAction),
      events: [{ type: 'close_ranks_movement_committed', pieceId: actor.id,
        geometryHash: geometry.geometryPlanHash || hash(geometry), attackDiceRolled: false }] }
      : applyOriginal(current, originalKind, originalAction, options);
    const displaced = queryPort.prepareChoices(current, { postMovementState: original.state,
      pieceId: actor.id, movementGeometry: geometry, choices });
    const { state: next, evidence } = displaced;
    const events = [...original.events, ...displaced.events];
    producer.assertEndpoint(next, { pieceId: actor.id, spatialPlan: geometry });
    const action = { actionType: originalAction.actionType, sideKey: originalAction.sideKey, phase: originalAction.phase,
      pieceId: actor.id, executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: descriptor.ruleAtomIds,
      stateHash: hash(current), policyHash: policy.policyHash, originalKind, originalAction,
      tokenDisplacements: choices, evidence, ...(stagedFight ? { executionStage: 'close_ranks_movement' } : {}) };
    next[historyKey] = [...(next[historyKey] || []), {
      round: Number(next.round), phase: next.phase, moverPieceId: actor.id, sideKey: originalAction.sideKey,
      leadingModelId: geometry.leadingModelId, actionHash: hash(action), evidence, trainingTruth: false }];
    if (stagedFight) {
      if (next[pendingKey]) throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_ALREADY_PENDING');
      next[pendingKey] = seal({ schema: 'starcraft_tmg_displaced_close_ranks_fight_parent_v1',
        round: Number(next.round), phase: next.phase, sideKey: originalAction.sideKey, pieceId: actor.id,
        policyHash: policy.policyHash, originalAction, originalActionHash: hash(originalAction),
        positionsHash: positionsHash(next, actor.id), tokenProofs: evidence.map(row => ({ tokenId: row.tokenId, tokenHash: row.tokenHash })),
        movementActionHash: hash(action), trainingTruth: false }, 'parentHash');
      next.log = [...(next.log || []), { id: 'log-' + ((next.log?.length || 0) + 1), round: Number(next.round),
        phase: next.phase, action, events: structuredClone(events) }];
    } else if (next.log?.length) next.log.at(-1).events = structuredClone(events);
    return { action, result: { ...original, state: next, action, events, runtimeId, runtimeVersion, trainingTruth: false } };
  }
  function pending(current) {
    const parent = current[pendingKey];
    if (!parent) return null;
    const reactionParent = closeRanksReactions ? readHiddenLossParent(current) : null;
    const waitingForReaction = reactionParent?.closeRanksParentHash === parent.parentHash
      && reactionParent.resumeSideKey === parent.sideKey;
    if (!closeRanks || parent.parentHash !== hash(withoutParentHash(parent))
      || parent.schema !== 'starcraft_tmg_displaced_close_ranks_fight_parent_v1'
      || parent.policyHash !== policy.policyHash || parent.round !== Number(current.round) || parent.phase !== current.phase
      || !waitingForReaction && parent.sideKey !== current.activeSideKey || parent.originalActionHash !== hash(parent.originalAction)
      || parent.positionsHash !== positionsHash(current, parent.pieceId)
      || parent.tokenProofs.some(proof => current.board.tokens.find(token => token.tokenId === proof.tokenId)?.tokenHash !== proof.tokenHash)) {
      throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_PARENT_INVALID');
    }
    return parent;
  }
  function continuation(current, parameters = {}) {
    const parent = pending(current);
    if (!parent) throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_PARENT_REQUIRED');
    const clean = continuationState(current, parent);
    const prepared = prepareFightContinuation(clean, parent.originalAction, parameters);
    return { actionType: 'fight', sideKey: parent.sideKey, phase: parent.phase,
      pieceId: parent.pieceId, executorId: runtimeId, executorVersion: runtimeVersion, ruleAtomIds: descriptor.ruleAtomIds,
      stateHash: hash(current), policyHash: policy.policyHash, executionStage: 'fight_after_close_ranks',
      parentHash: parent.parentHash, preparedAction: prepared,
      ...(closeRanksReactions ? { canonicalParameters: structuredClone(parameters) } : {}),
      ...(prepared.chance ? { chance: prepared.chance } : {}) };
  }
  function enumerate(current) {
    const parent = pending(current);
    if (!parent) throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_PARENT_REQUIRED');
    const schema = closeRanksReactions ? fightContinuationChoices(continuationState(current, parent), parent.originalAction) : null;
    if (!schema?.required.length) return { candidates: [continuation(current)], parameterDomains: [] };
    const domain = seal({ schemaVersion: 'starcraft_tmg_official_parameter_domain_v1',
      parameterKind: 'official_close_ranks_reaction_fight_continuation_v1', actionType: 'fight',
      sideKey: parent.sideKey, phase: parent.phase, pieceId: parent.pieceId, executorId: runtimeId,
      executorVersion: runtimeVersion, parentHash: parent.parentHash, stateHash: hash(current),
      ruleAtomIds: descriptor.ruleAtomIds, parameterSchema: schema, trainingTruth: false }, 'domainId');
    return { candidates: [], parameterDomains: [domain] };
  }
  function instantiate(current, domain, parameters) {
    const expected = enumerate(current).parameterDomains.find(row => row.domainId === domain.domainId);
    if (!expected || !isDeepStrictEqual(expected, domain)) throw Error('PSIONIC_DISPLACEMENT_CONTINUATION_DOMAIN_STALE');
    const required = expected.parameterSchema.required;
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)
      || Object.keys(parameters).length !== required.length
      || required.some(field => !expected.parameterSchema[field].enum.includes(parameters[field]))) {
      throw Error('PSIONIC_DISPLACEMENT_CONTINUATION_CHOICES_INVALID');
    }
    return { action: continuation(current, parameters), canonicalParameters: structuredClone(parameters) };
  }
  function continuationState(current, parent) {
    const clean = structuredClone(current);
    delete clean[pendingKey];
    // Child attack owners hash all non-log facts. Finish this parent's state
    // writes before compiling the child, so its saved facts stay stable.
    clean.displacedCloseRanksFightHistory = [...(clean.displacedCloseRanksFightHistory || []), {
      parentHash: parent.parentHash, movementActionHash: parent.movementActionHash,
      originalActionHash: parent.originalActionHash, consumedOnce: true, trainingTruth: false }];
    return clean;
  }
  function apply(current, action, options = {}) {
    if (action.executorId !== runtimeId || action.executorVersion !== runtimeVersion || action.policyHash !== policy.policyHash
      || action.stateHash !== hash(current)) throw Error('PSIONIC_DISPLACEMENT_ACTION_STALE');
    if (action.executionStage === 'fight_after_close_ranks') {
      const parent = pending(current);
      if (!isDeepStrictEqual(continuation(current, action.canonicalParameters), action)) throw Error('PSIONIC_DISPLACEMENT_ACTION_STALE');
      const clean = continuationState(current, parent);
      return applyFightContinuation(clean, action.preparedAction, options);
    }
    if (pending(current)) throw Error('PSIONIC_DISPLACEMENT_CLOSE_RANKS_CONTINUATION_REQUIRED');
    const expected = prepare(current, action.originalKind, action.originalAction, action.tokenDisplacements, options);
    if (!expected || !isDeepStrictEqual(expected.action, action)) throw Error('PSIONIC_DISPLACEMENT_ACTION_STALE');
    return expected.result;
  }
  return Object.freeze({ descriptor, split, prepare, apply, pending, continuation, enumerate, instantiate });
}
