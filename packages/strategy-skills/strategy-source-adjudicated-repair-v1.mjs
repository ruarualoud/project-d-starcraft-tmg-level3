import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { validateStrategyDraftV1 } from './strategy-contract-v1.mjs';
import { prepareStrategyEvidenceReviewV1, strategyFieldTargetsV1,
  reconcileStrategyReviewOpinionsV1 } from './strategy-evidence-review-v1.mjs';

export const ACTIVATION_TEMPO_PARENT_POLICY_HASH_V1 = '57f368715113c2ffa8be1ec4e47ddc809f8c37f6a68f8422c18f62829d1e378f';

const EXPECTED = Object.freeze({
  activation: {
    ref: 'core.iuUyObNTQ2M8xK4IUqzC.items.2',
    text: 'Players then alternate, each activating one Unit per turn. Each Activated Unit performs exactly one action from the list available in that Phase.',
  },
  initiative: {
    ref: 'core.FuahgilWtc8nccVSp2Vv.items.0.subItems.26',
    text: 'The holder of the First Player Marker chooses which player activates first at the start of each Phase.',
  },
  reaction: {
    ref: 'core.H3Fn8YSvEvpJZpT57qw1.items.4',
    text: 'Reaction Limit: Each player may resolve only one Reaction per each Activation.',
  },
});

function sourceEvidence(input, expected) {
  const source = input.workspace.fullFrozenSources.sources.find(row => row.ref === expected.ref);
  const passage = source?.passages.find(row => row.text.includes(expected.text));
  if (!source || !passage) fail('ACTIVATION_TEMPO_SOURCE_DRIFT', { ref: expected.ref });
  return seal({ ref: source.ref, sourceHash: hash(source), spanId: passage.spanId,
    textHash: hash(passage.text), requiredExcerptHash: hash(expected.text) });
}

function validatePolicy(input, policy) {
  const { hash: omitted, ...contract } = input.contract;
  validateStrategyDraftV1({ policies: [policy] }, seal({ ...contract, requiredAxes: ['activation_tempo'] }), {
    allowedRuleRefs: input.workspace.fullFrozenSources.sources.map(source => source.ref),
    allowedCaseIds: input.workspace.developmentCases.map(testCase => testCase.caseId),
  });
}

// This is a narrow Host-authored correction backed by exact frozen prose. It
// repairs three already-adjudicated wording errors; it is not a whole-policy
// source pass and does not promote the candidate.
export function prepareActivationTempoSourceRepairV1({ input, candidate }) {
  verifySeal(input); verifySeal(candidate);
  if (candidate.inputHash !== input.hash || candidate.axis !== 'activation_tempo'
    || hash(candidate.policy) !== ACTIVATION_TEMPO_PARENT_POLICY_HASH_V1
    || !Array.isArray(candidate.roleHistory)) fail('ACTIVATION_TEMPO_PARENT_DRIFT');
  const evidence = Object.fromEntries(Object.entries(EXPECTED).map(([key, expected]) =>
    [key, sourceEvidence(input, expected)]));
  const before = candidate.policy, policy = structuredClone(before);
  policy.decisionProcedure[0] = '读取当前阶段、先手标记持有者、各单位已激活状态和剩余合法行动；阶段1/2/3使用交替激活：轮到一名玩家时激活一个单位，每个被激活单位只执行该阶段允许的一个行动。';
  policy.decisionProcedure[2] = '比较先行动、保留关键激活、合法Pass三种选择的后果；若提前Pass，明确放弃的本阶段行动机会，以及取得下一阶段先手标记并由标记持有者选择首个行动方的价值。';
  policy.decisionProcedure[4] = '若己方单位携带Active Ability，确认其只能在该单位激活时、声明行动前或行动完全结算后使用；若携带Reaction Ability，须在具体触发发生时声明，且每名玩家在每次激活期间最多结算一个Reaction。';
  policy.alternatives[2] = {
    option: '提前Pass取得下一阶段先手标记',
    preferWhen: '己方关键单位已就位或无需再行动，且由标记持有者选择下一阶段首个行动方的收益超过放弃本阶段剩余激活的机会成本',
  };
  validatePolicy(input, policy);
  const changedFields = Object.keys(before).filter(field => hash(before[field]) !== hash(policy[field]));
  if (hash(changedFields) !== hash(['decisionProcedure', 'alternatives'])) fail('ACTIVATION_TEMPO_REPAIR_SCOPE_DRIFT');
  const adjudication = seal({ schema: 'strategy_targeted_source_adjudication_v1', inputHash: input.hash,
    axis: 'activation_tempo', parentCandidateHash: candidate.hash, parentPolicyHash: hash(before),
    findings: [
      { path: 'decisionProcedure.0', finding: 'Round/turn/action wording incorrectly implied one action per unit per round.', sourceEvidence: [evidence.activation] },
      { path: 'decisionProcedure.2', finding: 'Passing grants the next-phase marker; its holder chooses the first acting player.', sourceEvidence: [evidence.initiative] },
      { path: 'decisionProcedure.4', finding: 'The rule limits resolved Reactions per activation, not the number of trigger windows.', sourceEvidence: [evidence.reaction] },
      { path: 'alternatives.2', finding: 'The option must describe marker control and choice, not automatic self-first activation.', sourceEvidence: [evidence.initiative] },
    ],
    wholePolicySourceReviewPassed: false, humanReviewed: false, canAffectRules: false, trainingTruth: false });
  const patch = seal({ schema: 'strategy_host_source_patch_v1', inputHash: input.hash, axis: 'activation_tempo',
    parentCandidateHash: candidate.hash, parentPolicyHash: hash(before), authorizedFields: changedFields,
    beforeValueHashes: Object.fromEntries(changedFields.map(field => [field, hash(before[field])])),
    afterValueHashes: Object.fromEntries(changedFields.map(field => [field, hash(policy[field])])),
    adjudicationHash: adjudication.hash, policy, semanticAcceptanceInherited: false,
    runtimeAccepted: false, trainingTruth: false });
  return seal({ schema: 'strategy_source_adjudicated_repair_plan_v1', inputHash: input.hash,
    parentCandidateHash: candidate.hash, policy, adjudication, patch,
    targetedSourceRepairVerified: true, wholePolicySourceReviewPassed: false,
    runtimeAccepted: false, trainingTruth: false });
}

export function createSourceAdjudicatedStrategyRepairV1({ input, reviewer, store }) {
  if (typeof reviewer?.review !== 'function' || typeof store?.acquire !== 'function') fail('STRATEGY_RUNTIME_PORTS_REQUIRED');
  async function repairActivationTempo(candidate) {
    const plan = prepareActivationTempoSourceRepairV1({ input, candidate });
    const history = [...candidate.roleHistory, ...(candidate.reviews || []), candidate.lifecycle,
      plan.adjudication, plan.patch], reviews = [];
    const targets = strategyFieldTargetsV1();
    for (let start = 0; start < targets.length; start += 4) {
      const prepared = prepareStrategyEvidenceReviewV1({ input, policy: plan.policy,
        history, targets: targets.slice(start, start + 4) });
      const result = await reviewer.review(prepared);
      verifySeal(result); verifySeal(result.evidence);
      if (result.preparedHash !== prepared.hash || result.evidence.policyHash !== hash(plan.policy)) {
        fail('STRATEGY_SOURCE_REPAIR_REVIEW_DRIFT');
      }
      reviews.push(result);
    }
    const lifecycle = reconcileStrategyReviewOpinionsV1(reviews.map(result => result.evidence), hash(plan.policy));
    const result = seal({ schema: 'strategy_source_adjudicated_candidate_v1', inputHash: input.hash,
      axis: 'activation_tempo', policy: plan.policy, parentCandidateHash: candidate.hash,
      roleHistory: history, reviews, lifecycle, repairPlanHash: plan.hash,
      status: lifecycle.open || lifecycle.uncertain ? 'needs_independent_adjudication'
        : 'model_review_clear_pending_independent_validation',
      targetedSourceRepairVerified: true, sourceReviewIndependentlyVerified: false,
      strategyEffectivenessProven: false, runtimeAccepted: false, trainingTruth: false });
    const lease = store.acquire('source-adjudicated-candidate.' + result.hash.slice(0, 48), { candidateHash: result.hash });
    return lease.cached ? lease.artifact : store.finish(lease, result);
  }
  return Object.freeze({ repairActivationTempo });
}
