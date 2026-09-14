import { createOfficialExecutableRuleRuntimeV1 } from './official-executable-rule-runtime-v1.mjs';
import { createOfficialFaqRuleRouterV2 } from './official-faq-rule-router-v2.mjs';
import { enumerateOfficialMarineOptionalStimpackMoveV3, instantiateOfficialMarineOptionalStimpackMoveV3,
  applyOfficialMarineOptionalStimpackMoveV3, OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V3_EXECUTOR_ID as MOVE_ID,
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V3_PARAMETER_KIND as MOVE_KIND } from './official-marine-optional-stimpack-move-executor-v3.mjs';
import { fail, freeze, hash, seal } from '../skill-production/common.mjs';

const OLD_MOVE = 'authority.marine-optional-stimpack-move-v2';
// A versioned composition of existing Rules executors, not an alternate
// transition authority. The Referee still owns Preview/Apply/signing/replay.
// Unsupported other units/terrain remain unsupported, never auto-emulated.
export function createOfficialStrategyCaseRuntimeV1({ catalogue, sourceBinding, sources }) {
  const base = createOfficialExecutableRuleRuntimeV1({ catalogue });
  const faq = createOfficialFaqRuleRouterV2({ sourceBinding, sources });
  const previousMove = base.descriptor.executorManifest.find(e => e.executorId === OLD_MOVE);
  if (!previousMove) fail('STRATEGY_RUNTIME_BASE_MOVE_MISSING');
  const composition = seal({ version: 'official_strategy_case_runtime_composition_v1',
    baseRuntimeHash: base.descriptor.runtimeHash, baseCatalogueHash: catalogue.catalogueHash,
    sourceBinding, faqRouterHash: faq.manifest.hash,
    replacement: { previousExecutorId: OLD_MOVE, executorId: MOVE_ID, executorVersion: '3.0.0' },
    scope: 'current_frozen_data_two_marine_movement_and_faq_rule_probes',
    fullGameCoverage: false, historicalRuntimeUnchanged: true, trainingTruth: false });
  const { runtimeHash: oldHash, ...baseBody } = base.descriptor;
  const body = { ...baseBody, runtimeId: 'official-strategy-case-runtime-v1', runtimeVersion: '1.0.0',
    rulesVersion: 'official-faq-v1-strategy-case-composition-2026-09-07',
    catalogueHash: composition.hash,
    executorManifest: base.descriptor.executorManifest.map(e => e.executorId === OLD_MOVE
      ? { ...e, executorId: MOVE_ID, executorVersion: '3.0.0' } : e),
    parameterDomainKinds: [...base.descriptor.parameterDomainKinds, MOVE_KIND],
    composition, faqRouterHash: faq.manifest.hash, productionRoomEligible: false };
  const descriptor = freeze({ ...body, runtimeHash: hash(body) });
  function assertBinding(state, options) {
    if (state.officialGameplayDataBundle?.normalizedDatasetHash !== sourceBinding.dataset
      || options.matchBinding?.rulesRuntimeBinding?.runtimeHash !== descriptor.runtimeHash) fail('STRATEGY_RUNTIME_SOURCE_OR_VERSION_DRIFT');
  }
  function enumerate(state, options = {}) {
    assertBinding(state, options);
    const original = base.enumerate(state, options);
    const candidates = original.candidates.filter(c => c.executorId !== OLD_MOVE);
    const parameterDomains = (original.parameterDomains || []).filter(d => d.executorId !== OLD_MOVE);
    const initiativePending = candidates.some(c => c.actionType === 'choose_first_actor' && c.isEnabled);
    if (state.phase === 'movement' && !initiativePending) {
      const current = enumerateOfficialMarineOptionalStimpackMoveV3(state, options);
      candidates.push(...current.candidates); parameterDomains.push(...current.parameterDomains);
    }
    return freeze({ ...original, rulesRuntimeHash: descriptor.runtimeHash, candidates, parameterDomains });
  }
  function instantiate(state, domain, parameters, options = {}) {
    assertBinding(state, options);
    if (domain.executorId === OLD_MOVE) fail('STRATEGY_RUNTIME_HISTORICAL_EXECUTOR_FORBIDDEN');
    return domain.executorId === MOVE_ID ? instantiateOfficialMarineOptionalStimpackMoveV3(state, domain, parameters, options)
      : base.instantiate(state, domain, parameters, options);
  }
  function apply(state, action, options = {}) {
    assertBinding(state, options);
    if (action.executorId === OLD_MOVE) fail('STRATEGY_RUNTIME_HISTORICAL_EXECUTOR_FORBIDDEN');
    const result = action.executorId === MOVE_ID ? applyOfficialMarineOptionalStimpackMoveV3(state, action, options)
      : base.apply(state, action, options);
    if (action.executorId !== MOVE_ID || action.moveMode !== 'stimpack') return result;
    const before = state.pieces.find(p => p.id === action.pieceId);
    const after = result.state.pieces.find(p => p.id === action.pieceId);
    const audit = faq.evaluate('faq-v1:03', { priorTotalDamage: before.damageMarker, nonlethalDamage: 2, shieldValue: 0 });
    if (after.damageMarker !== audit.values.totalDamage || after.currentModels !== before.currentModels) {
      fail('STRATEGY_RUNTIME_FAQ_NONLETHAL_PARITY_FAILED');
    }
    return { ...result, events: [...result.events, { type: 'official_faq_rule_audit', entryId: 'faq-v1:03',
      routerHash: faq.manifest.hash, decisionHash: audit.hash }] };
  }
  return freeze({ descriptor, composition, faq, enumerate, instantiate, apply });
}
