import { verifySeal, seal, hash, fail } from '../skill-production/common.mjs';
import { assembleOverallRulesCandidateV3, inspectOverallPacketCandidateV3 } from '../skill-evaluation/overall-rules-package-v3.mjs';
import { createExternalClaimFinding } from './external-findings.mjs';
import { resolveSpan } from '../skill-production/spans.mjs';

// Developer source audit of one exact, retained actual candidate. This is not
// an LLM verdict or a rule inferred from an expected test answer.
export function createConfirmedOverallOmissionsV1({ candidate, packets, context, reader }) {
  verifySeal(candidate);
  if (candidate.hash !== 'b68272f9678e0bbacccc7a9e5266dd438e862b9b967eba9ac1c65c4bddb667cc') fail('COMPLETE_OMISSION_AUDIT_PARENT_DRIFT');
  const packet = packets.find(p => p.packetId === 'rules-reading-018');
  if (!packet || candidate.sections.find(s => s.id === packet.packetId)?.packetArtifactHash !== packet.hash) fail('COMPLETE_OMISSION_AUDIT_PACKET_DRIFT');
  const definitions = [
    { claimId: 'claims.0', ref: 'core.iuUyObNTQ2M8xK4IUqzC.items.5.subItems.2', spanId: 'p2',
      anchor: 'No part of a base of the Leading Model can move more than its unit Speed value.',
      reason: '完整候选仅描述领队沿路径不超过Speed，遗漏所引p2的明确限制：领队底座的任何部分都不能移动超过单位Speed，不能只按中心位移核对。请将这个底座范围条件补入当前移动规则，保留原有其余条件；不得把其他模型的放置改为同样的路径移动。' },
    { claimId: 'claims.5', ref: 'core.iuUyObNTQ2M8xK4IUqzC.items.5.subItems.4', spanId: 'p2',
      anchor: 'the clock does not pause just because the Unit has left',
      reason: '完整候选遗漏所引p2的限时效果段：返回Reserves后仍有效的限时增益、减益和任务效果保留，但离场不暂停计时；原本在Cleanup & Refresh到期的效果仍按时到期，无论单位是否在战场。请补齐这一独立规则，保留装备、Damage、能力停用、Tokens及本阶段激活状态条件，不得误写成重新激活许可。' },
  ];
  return definitions.map(({ ref, spanId, anchor, ...d }) => {
    if (!resolveSpan(reader, { ref, spanId }).quote.includes(anchor)) fail('COMPLETE_OMISSION_AUDIT_SOURCE_DRIFT');
    return createExternalClaimFinding({ candidate: packet, context, reader, ...d, kind: 'omitted_conditions', evidence: [{ ref, spanId }] });
  });
}

export function prepareCompleteSkillRepairV1({ catalogue, plan, context, candidate, packets, findings }) {
  [candidate, context, ...findings].forEach(verifySeal);
  const rebuilt = assembleOverallRulesCandidateV3({ catalogue, plan, packets });
  if (rebuilt.hash !== candidate.hash || !findings.length || new Set(findings.map(f => f.hash)).size !== findings.length) fail('COMPLETE_REPAIR_PARENT_OR_FINDINGS_INVALID');
  const targets = [];
  for (const f of findings) {
    const packet = packets.find(p => p.packetId === f.packetId);
    const index = Number(/^claims\.(\d+)$/.exec(f.claimId)?.[1]);
    if (!packet || f.schema !== 'starcraft_external_claim_finding_v1' || f.contextHash !== context.hash
      || f.candidateHash !== packet.hash || f.claimTextHash !== hash(packet.draft.claims[index]?.text ?? null)) fail('COMPLETE_REPAIR_FINDING_STALE');
    if (targets.some(t => t.packetId === f.packetId && t.claimId === f.claimId)) fail('COMPLETE_REPAIR_DUPLICATE_TARGET');
    targets.push({ packetId: f.packetId, claimId: f.claimId, findingHash: f.hash, claimHash: hash(packet.draft.claims[index]) });
  }
  return seal({ schema: 'starcraft_complete_skill_local_repair_plan_v1', candidateHash: candidate.hash,
    planHash: plan.hash, contextHash: context.hash, catalogueHash: catalogue.hash,
    parentPacketHashes: packets.map(p => p.hash), findingHashes: findings.map(f => f.hash), targets,
    affectedPackets: new Set(targets.map(t => t.packetId)).size,
    untouchedPackets: packets.length - new Set(targets.map(t => t.packetId)).size,
    preserveAllUnflaggedClaims: true, freshSourceReviewsRequired: true, formalAcceptance: false, trainingTruth: false });
}

export async function repairCompleteSkillV1({ catalogue, plan, context, candidate, packets, findings, repairPacket, importPacket,
  onProgress = () => {} }) {
  const manifest = prepareCompleteSkillRepairV1({ catalogue, plan, context, candidate, packets, findings });
  const repairedPackets = [], receipts = [];
  for (const [index, old] of packets.entries()) {
    const packet = plan.packets[index], issues = findings.filter(f => f.packetId === old.packetId);
    let result;
    if (issues.length) {
      const repaired = await repairPacket({ packet, candidate: old, findings: issues });
      result = repaired.candidate;
      verifySeal(result); verifySeal(repaired.repair);
      if (repaired.repair.parentCandidateHash !== old.hash || repaired.repair.candidateHash !== result.hash
        || hash(repaired.repair.findingHashes) !== hash(issues.map(f => f.hash))) fail('COMPLETE_REPAIR_RECEIPT_DRIFT');
      if (result.draft.claims.length !== old.draft.claims.length) fail('COMPLETE_REPAIR_CLAIM_DENOMINATOR_CHANGED');
      for (const [n, claim] of old.draft.claims.entries()) {
        const targeted = issues.some(f => f.claimId === 'claims.' + n);
        if (targeted && result.draft.claims[n].text === claim.text) fail('COMPLETE_REPAIR_NO_PROGRESS');
        if (!targeted && hash(result.draft.claims[n]) !== hash(claim)) fail('COMPLETE_REPAIR_UNFLAGGED_CHANGE');
      }
      inspectOverallPacketCandidateV3({ catalogue, packet, result, context });
      receipts.push(repaired.repair);
    } else {
      result = await importPacket({ packet, candidate: old, manifest });
      if (verifySeal(result).hash !== old.hash) fail('COMPLETE_REPAIR_UNTOUCHED_PACKET_DRIFT');
    }
    repairedPackets.push(result);
    onProgress({ packetId: packet.id, processed: repairedPackets.length, total: packets.length,
      sourceRepaired: !!issues.length, correctedClaims: issues.length, hash: result.hash });
  }
  const overall = assembleOverallRulesCandidateV3({ catalogue, plan, packets: repairedPackets });
  return { candidate: overall, packets: repairedPackets, repairs: receipts, manifest,
    receipt: seal({ schema: 'starcraft_complete_skill_local_repair_receipt_v1', manifestHash: manifest.hash,
      parentCandidateHash: candidate.hash, candidateHash: overall.hash, parentPacketHashes: packets.map(p => p.hash),
      packetHashes: repairedPackets.map(p => p.hash), repairHashes: receipts.map(r => r.hash),
      changedClaims: manifest.targets.length, unchangedClaims: candidate.coverage.claims - manifest.targets.length,
      retainedPackets: manifest.untouchedPackets, sourceAssemblyPassed: true, actualExamPassed: false,
      formalAcceptance: false, runtimeAccepted: false, trainingTruth: false }) };
}
