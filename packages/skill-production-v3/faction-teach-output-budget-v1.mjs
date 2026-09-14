import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { FACTION_TEACH_OUTPUT_CONTRACT_REF_V1 } from '../../content/skill-generation/ticket-18-faction-teach-output-contract-v1.mjs';

export const FACTION_TEACH_OUTPUT_BUDGET_BINDING_V1 = seal({
  version: 'faction_teach_output_budget_v1', scope: 'native_six_axis_teach_notes_only',
  outputTokenPromptTarget: 2000, providerHardMaximum: 4096,
  fullInputAndPriorNotesPreserved: true, finalSkillContentLimitChanged: false,
  notesAreNotASubstituteForFullSources: true, hardCharacterLimitAdded: false,
  originalIncompleteRequestRetried: false, partialOutputUsed: false,
  automaticRetries: 0, semanticAcceptanceInherited: false, trainingTruth: false });

export function applyFactionTeachOutputBudgetV1(request, binding) {
  verifySeal(binding);
  if (binding.hash !== FACTION_TEACH_OUTPUT_BUDGET_BINDING_V1.hash) fail('FACTION_TEACH_OUTPUT_BUDGET_BINDING_INVALID');
  if (!/^tutor\.capacity-part-v1\.[a-z_]+$/u.test(request.roleId || '')) return request;
  if (request.maxOutput !== binding.providerHardMaximum || typeof request.instruction !== 'string')
    fail('FACTION_TEACH_OUTPUT_BUDGET_SCOPE_INVALID');
  return { ...request, instruction: request.instruction + '\n'
    + '输出容量补充（本次优先执行）：64KB 是Host存储安全上限，不是要求你输出64KB；Provider单次只有4096 tokens。'
    + '本轴Teach只产生供随后完整七角色生产使用的决策提示笔记，不是最终Skill正文或规则书替代品。'
    + '后续角色仍收到全部官方来源、FAQ、总规则和已完成笔记，不依赖你重抄规则书。'
    + '请用约6至8条精炼lesson和最多3条uncertainties，目标总输出不超过2000 tokens；这是写作目标而非截断正文。'
    + '一条聚焦一种有条件选择，合并同一约束的重复说明，保留成本、时机、例外和明确不确定性；'
    + '无需逐字抄单位档案、把每个卡牌列一遍或罗列其他轴。不得为缩短笔记改变规则或抹除例外。'
    + '如某策略依赖尚未逐项展开的来源，明确后续角色须查原文，不把省略细节说成不存在。'
    + '输出仍只有原生lesson与uncertainties；不输出接受状态或跨轴总结。',
    workspace: { ...request.workspace, nativeTeachOutputBudget: binding } };
}

export function withFactionTeachOutputBudgetV1(runtime, binding) {
  verifySeal(binding);
  return Object.freeze({ role: request => runtime.role(applyFactionTeachOutputBudgetV1(request, binding)) });
}

export function verifyFactionNativeTeachCapacityFailureV1({ attempt, issue, inputHash }) {
  if (attempt?.state !== 'failed' || attempt.code !== 'STRUCTURED_PROVIDER_INCOMPLETE'
    || !attempt.usage || !attempt.response || !Number.isSafeInteger(attempt.settled)) fail('FACTION_NATIVE_TEACH_CAPACITY_FAILURE_INVALID');
  verifySeal(issue);
  const receipt = verifySeal(JSON.parse(attempt.response)).value;
  const usage = verifySeal(JSON.parse(attempt.usage)).value;
  const { receiptHash, ...body } = receipt;
  if (hash(body) !== receiptHash || receipt.incompleteReason !== 'max_output_tokens'
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || usage.outputUnits !== 4096 || hash(usage) !== hash(receipt.usage)
    || issue.safeReceiptHash !== receiptHash
    || attempt.id !== 'structured-' + issue.invocationHash.slice(0, 48)
    || hash(receipt.outputContractRef) !== hash(FACTION_TEACH_OUTPUT_CONTRACT_REF_V1)
    || hash(issue.outputContractRef) !== hash(receipt.outputContractRef))
    fail('FACTION_NATIVE_TEACH_CAPACITY_RECEIPT_INVALID');
  return seal({ originRunId: attempt.run, originAttemptId: attempt.id, inputHash,
    failureReceiptHash: receiptHash, originIssueHash: issue.hash,
    outputUnits: usage.outputUnits, originalIncompleteRequestRetried: false, trainingTruth: false });
}
