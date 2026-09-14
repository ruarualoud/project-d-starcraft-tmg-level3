import { fail, hash, seal, verifySeal } from '../skill-production/common.mjs';
import { validateTutorLessonV3 } from './runtime.mjs';

const axes = ['army_resources', 'unit_roles', 'phase_tempo', 'objectives', 'threat_tradeoffs', 'card_packages'];

// Recovery permission derives from a settled, source-scoped actual failure.
// It cannot be used to replay an ambiguous request or bypass a payment stop.
export function createFactionTeachRecoveryV1({ input, runId, attempt }) {
  verifySeal(input);
  const id = 'faction.' + input.factionRecordKey.split(':')[1] + '.tutor.call-1.format-0';
  if (!/^faction-v1-[a-f0-9]{20}$/u.test(runId || '') || attempt?.run !== runId
    || attempt.id !== id || attempt.state !== 'failed'
    || attempt.code !== 'PROVIDER_RESPONSE_OUTPUT_TRUNCATED' || !attempt.usage
    || !Number.isSafeInteger(attempt.settled)) fail('FACTION_TEACH_RECOVERY_FAILURE_INVALID');
  const receipt = verifySeal(JSON.parse(attempt.response)).value;
  const { receiptHash, ...body } = receipt;
  const usage = verifySeal(JSON.parse(attempt.usage)).value;
  const outcome = receipt.responseOutcome;
  if (hash(body) !== receiptHash || receipt.code !== attempt.code
    || receipt.physicalAttempts !== 1 || receipt.automaticRetries !== 0
    || outcome?.finishReason !== 'length' || !outcome.usageKnown
    || hash(outcome.usage) !== hash(usage)
    || outcome.requestedModel !== 'deepseek-v4-flash'
    || outcome.reportedModel !== 'deepseek-v4-flash') fail('FACTION_TEACH_RECOVERY_RECEIPT_INVALID');
  return seal({ version: 'faction_teach_output_capacity_recovery_v1',
    inputHash: input.hash, sourceBinding: input.sourceBinding, factionRecordKey: input.factionRecordKey,
    originRunId: runId, originAttemptId: id, requestHash: attempt.request_hash,
    failureReceiptHash: receiptHash, profileHash: outcome.profileHash,
    outputUnits: usage.outputUnits, axes, maximumParts: 6,
    policy: 'complete_input_per_axis_lossless_host_assembly_no_original_retry_no_partial_output',
    semanticAcceptanceInherited: false, trainingTruth: false });
}

export async function produceFactionTeachRecoveryV1({ input, recovery, role }) {
  [input, recovery].forEach(verifySeal);
  if (recovery.version !== 'faction_teach_output_capacity_recovery_v1'
    || recovery.inputHash !== input.hash || recovery.factionRecordKey !== input.factionRecordKey
    || hash(recovery.axes) !== hash(axes) || recovery.maximumParts !== 6
    || recovery.semanticAcceptanceInherited !== false) fail('FACTION_TEACH_RECOVERY_SCOPE_INVALID');
  const parts = [];
  for (const axis of axes) {
    const part = await role('tutor.capacity-part-v1.' + axis,
      'Teach：阅读完整官方来源、FAQ、总规则和本阵营材料。上一份全轴教学达到单次输出上限，现仅编写指定axis的教学部分；其他轴另行生成，最终逐字合并而非摘要。完整输入、全部轴和已完成部分仍在，不得当RTS。保留条件、时机、成本、例外、对手回应及不确定性；只教授本轴，不重抄其他部分或整本规则书。返回{"lesson":["本轴有条件决策要点"],"uncertainties":["本轴未证明事项"]}。单份教学部分遵守64KB上限；不以模型意见替代官方规则。',
      { teachCapacityRecovery: { failureReceiptHash: recovery.failureReceiptHash,
        axis, allAxes: axes, completedParts: parts.map(p => ({ axis: p.axis, notes: p.value })) } },
      validateTutorLessonV3);
    validateTutorLessonV3(part.value); verifySeal(part.artifact);
    parts.push({ axis, ...part });
  }
  const value = validateTutorLessonV3({ lesson: parts.flatMap(p => p.value.lesson),
    uncertainties: parts.flatMap(p => p.value.uncertainties) });
  return { value, artifact: seal({ version: 'faction_teach_lossless_assembly_v1',
    inputHash: input.hash, recoveryHash: recovery.hash, output: value,
    parts: parts.map(p => ({ axis: p.axis, artifactHash: p.artifact.hash, outputHash: hash(p.value) })),
    originalFailureReplayed: false, rawPartialOutputUsed: false,
    semanticAcceptanceInherited: false, trainingTruth: false }) };
}
