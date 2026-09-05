import { seal, hash, exact, fail } from "../skill-production/common.mjs";
import { CHAPTERS } from "../skill-production/evidence.mjs";

// Deliberately separate from the already-frozen pilot's raw API-field test.
// This follow-up measures rule outcomes, not interpretation of debug flags.
const QUESTIONS = {
  setup: [{ key: "card_survives_removal_rule", field: "legal",
    question: "仅依据选牌中移除实体卡的限制，这张候选实体卡是否仍可选？不要评判其他选牌限制。" }],
  round: [{ key: "ability_passes_usage_gate", field: "legal",
    question: "只依据给出的支付、同名使用次数及反应次数，能力是否通过使用门槛？" }],
  movement: [{ key: "gap_clearance_satisfied", field: "legal",
    question: "该模型和缝隙是否满足 Gap Clearance 这一项要求？不判断整条路径的其他限制。" }],
  assault: [{ key: "close_ranks_condition_satisfied", field: "legal",
    question: "只判断给出的全员接触及领队模型靠近条件，是否允许 Close Ranks？" }],
  combat: [{ key: "damage_pool_before_evade", field: "values.evadeInputDamagePool",
    question: "装甲伤害与 Surge 伤害合并后、Evade 之前的伤害池是多少？" }],
  terrain: [{ key: "direct_cover_applies", field: "values.directCover",
    question: "只依据被射线穿过的地形、近邻地形是否同一件及距离，是否满足该件地形的直接掩护条件？" }],
  abilities: [{ key: "self_inclusion_applies", field: "values.withinRange",
    question: "只判断自身纳入范围的条款：该条款本身是否使给出的 subject 属于 source 的范围？其他单位的实际测距未给出，不由此条款断言。" }],
  tokens: [
    { key: "combined_first_model_hit_points", field: "values.firstModelCombinedHitPoints", question: "第一个模型的生命与护盾合并值是多少？" },
    { key: "damage_remaining_after_heal", field: "values.totalDamageAfterHeal", question: "应用给定治疗后，单位剩余的总伤害标记是多少？下限为零。" },
  ],
  scoring: [{ key: "marker_is_controlled", field: "values.controlled",
    question: "标记是否在场、给出的通常控制条件及标记正反面综合起来，是否控制该标记？" }],
  exceptions: [{ key: "destroyed_return_prohibition_applies", field: "values.returnToPlayAllowed", invert: true,
    question: "只考虑已摧毁单位返回的禁止条款：该条款是否阻止本案例？未摧毁时本禁止条款不适用；不判断其他返回或部署条件。" }],
};
export function createSemanticDrills(verifier) {
  function list(chapterId) {
    if (!QUESTIONS[chapterId]) fail("DRILL_CHAPTER_INVALID");
    return verifier.list(chapterId, "heldout").map((test) => ({
      id: test.id, entryId: test.entryId, input: test.input,
      questions: QUESTIONS[chapterId].map(({ key, question }) => ({ key, question })),
      scope: "specified_rule_only_not_complete_action_legality",
    }));
  }
  function judge(chapterId, prediction) {
    exact(prediction, ["id", "values"]);
    if (!list(chapterId).some((test) => test.id === prediction.id)) fail("DRILL_ID_INVALID");
    const questions = QUESTIONS[chapterId];
    exact(prediction.values, questions.map((q) => q.key));
    const execution = verifier.run(prediction.id, { allowHeldout: true });
    const checks = questions.map((q) => {
      const raw = q.field.split(".").reduce((value, key) => value?.[key], execution.observed);
      if (!["number", "boolean"].includes(typeof raw)) fail("DRILL_ENGINE_VALUE_INVALID");
      const expected = q.invert ? !raw : raw, actual = prediction.values[q.key];
      return { key: q.key, expected, actual, passed: hash(expected) === hash(actual) };
    });
    return seal({ id: prediction.id, prediction, checks, kernelReceipt: execution,
      passed: execution.passed && checks.every((c) => c.passed),
      completeGameEffectiveness: false, trainingTruth: false });
  }
  return Object.freeze({ list, judge, manifest: seal({ questions: QUESTIONS,
    chapters: CHAPTERS.map((c) => c.id), cases: 36,
    originalMetricOverwritten: false, evaluationKind: "supplementary_semantic_question_clarification",
    preregisteredBeforeOriginalPilot: false, dshBenefitClaimAllowed: false, trainingTruth: false }) });
}
