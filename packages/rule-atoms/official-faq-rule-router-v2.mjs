import { evaluateOfficialFaqF3RuleV1 } from './official-faq-f3-movement-battlefield-deployment-kernel-v1.mjs';
import { evaluateOfficialFaqF4RuleV1 } from './official-faq-f4-ability-tactical-keyword-kernel-v1.mjs';
import { evaluateOfficialFaqF5RuleV1 } from './official-faq-f5-attack-scoring-template-kernel-v1.mjs';
import { createOfficialFaq46SizeCorrectionV2 } from './official-faq46-force-field-size-correction-v2.mjs';
import { fail, hash, seal } from '../skill-production/common.mjs';

// Explicit new consumer route. The v1 aggregate, its hashes and historical
// Room bindings do not change. Consumers must pin this manifest deliberately.
export function createOfficialFaqRuleRouterV2({ sourceBinding, sources }) {
  const faq = sources.filter(s => /^faq-v1:\d{2}$/u.test(s.ref));
  if (faq.length !== 68 || new Set(faq.map(s => s.ref)).size !== 68
    || Array.from({ length: 68 }, (_, i) => `faq-v1:${String(i + 1).padStart(2, '0')}`).some(id => !faq.some(s => s.ref === id))) {
    fail('FAQ_ROUTER_COMPLETE_SOURCE_REQUIRED');
  }
  const correction = createOfficialFaq46SizeCorrectionV2({ sourceLockHash: sourceBinding.faq,
    source: faq.find(s => s.ref === 'faq-v1:46') });
  const manifest = seal({ version: 'official_faq_consumer_router_v2', gameId: 'starcraft-tmg', sourceBinding,
    sourceHash: hash(faq), entryCount: 68, correctedEntryId: 'faq-v1:46', correctionHash: correction.manifest.hash,
    legacyRouterUnchanged: true, adoption: 'explicit_strategy_production_and_case_consumer',
    wholeRoomRuleCoverageClaimed: false, trainingTruth: false });
  function evaluate(entryId, input) {
    if (!faq.some(s => s.ref === entryId)) fail('FAQ_ROUTER_UNKNOWN_ENTRY');
    if (entryId === 'faq-v1:46') {
      const result = correction.evaluate(input);
      return seal({ entryId, legal: result.allowedWithinThisSizeRestriction,
        values: { forceFieldBlocksSizeAtMost: 2 }, reasonCodes: result.reasonCodes,
        routerHash: manifest.hash, correction: result,
        scope: 'faq46_size_predicate_not_complete_move_permission', trainingTruth: false });
    }
    const n = Number(entryId.slice(-2));
    const evaluateKernel = n >= 5 && n <= 27 ? evaluateOfficialFaqF3RuleV1
      : n >= 34 && n <= 59 || n === 64 ? evaluateOfficialFaqF4RuleV1 : evaluateOfficialFaqF5RuleV1;
    return seal({ ...evaluateKernel(entryId, structuredClone(input)), routerHash: manifest.hash });
  }
  return Object.freeze({ manifest, evaluate });
}
