import { verifyFirstFivePlan } from '../skill-production/coverage-plan.mjs';
import { createEvidenceReader } from '../skill-production/evidence.mjs';
import { inspectPacket, validatePacketReview, combinePacketReviews } from '../skill-production/packet-contract.mjs';
import { seal, verifySeal, hash, fail, clone, exact, integer } from '../skill-production/common.mjs';

// Compilation does not summarize away generated conditions or invent rules.
// Every body claim and its source address survives, while bulky review/quote
// evidence remains in the referenced immutable packet artifacts.
export function assembleOverallRulesCandidate({ catalogue, plan, packets }) {
  verifyFirstFivePlan(plan, catalogue);
  if (!Array.isArray(packets) || packets.length !== plan.packets.length) fail('OVERALL_PACKET_DENOMINATOR_INVALID');
  const reader = createEvidenceReader(catalogue), seen = new Set(), sections = [];
  for (let i = 0; i < plan.packets.length; i++) {
    const packet = plan.packets[i], result = verifySeal(packets[i]);
    if (result.packetHash !== packet.hash || result.packetId !== packet.id || seen.has(result.packetId)
      || hash(result.sourceBinding) !== hash(plan.sourceBinding)) fail('OVERALL_PACKET_BINDING_INVALID');
    seen.add(result.packetId);
    if (!result.semanticPassed || !result.candidateOnly || result.runtimeAccepted || result.heldoutPassed
      || result.trainingTruth || result.failure || result.repairStops?.length) fail('OVERALL_PACKET_NOT_ACCEPTABLE');
    const final = result.rounds?.at(-1);
    if (!final || final.reviews.length !== 2) fail('OVERALL_PACKET_REVIEW_MISSING');
    // Independent host re-reading checks current source/citation/inventory;
    // this is NOT a claim that the model performed another tool call.
    const inventory = inspectPacket(result.draft, { packet, reader,
      readRefs: [...new Set([...packet.passages, ...(packet.contextPassages || [])].map(p => p.ref))] });
    if (inventory.hash !== verifySeal(final.inventory).hash || !inventory.structuralAndProvenancePassed) fail('OVERALL_PACKET_INVENTORY_DRIFT');
    const reviews = final.reviews.map(review => {
      verifySeal(review);
      const regenerated = validatePacketReview({ verdicts: review.verdicts.map(v => ({ ...v,
        evidence: v.evidence.map(e => ({ ref: e.ref, spanId: e.spanId })) })), passageCoverage: review.passageCoverage },
      inventory, { packet, reader, reviewId: review.reviewId, role: review.role });
      if (regenerated.hash !== review.hash) fail('OVERALL_PACKET_REVIEW_DRIFT');
      return regenerated;
    });
    const combined = combinePacketReviews(inventory, packet, reviews);
    if (!combined.passed || combined.hash !== verifySeal(final.combined).hash) fail('OVERALL_PACKET_REVIEW_FAILED');
    const sourceRefs = [...new Set(packet.passages.map(p => p.ref))];
    sections.push({ id: packet.id, packetArtifactHash: result.hash, inventoryHash: inventory.hash,
      reviewHashes: reviews.map(r => r.hash), sourceRefs,
      topics: [...new Set(sourceRefs.flatMap(ref => catalogue.rows.find(r => r.id === ref).chapterIds))],
      claims: result.draft.claims.map((c, n) => ({ id: packet.id + '.claims.' + n, ...clone(c) })) });
  }
  return seal({ schema: 'starcraft_overall_rules_candidate_v2', gameId: 'starcraft-tmg',
    skillId: plan.skills[0].skillId, skillType: 'how_to_play', version: '2.0.0-candidate',
    sourceBinding: plan.sourceBinding, catalogueHash: catalogue.hash, planHash: plan.hash,
    sections, sourceRefs: [...new Set(plan.packets.flatMap(p => p.passages.map(s => s.ref)))],
    coverage: { ...plan.counts, claims: sections.reduce((n, s) => n + s.claims.length, 0),
      meaning: 'all_declared_passages_read_and_semantically_reviewed_not_full_game_correctness_proof' },
    sourceIndex: catalogue.rows.filter(r => !r.quarantined).map(r => ({ ref: r.id, title: r.title, sourceHash: r.hash,
      topics: r.chapterIds, sourceClass: r.sourceClass })),
    excluded: plan.excluded, candidateOnly: true, semanticPassed: true, heldoutPassed: false,
    roomReplayPerformed: false, runtimeAccepted: false, published: false, humanReviewed: false,
    canAffectRules: false, trainingTruth: false });
}

export function verifyOverallRulesCandidate(candidate, evidence) {
  verifySeal(candidate);
  if (assembleOverallRulesCandidate(evidence).hash !== candidate.hash) fail('OVERALL_PACKAGE_DRIFT');
  return candidate;
}

// The same bounded, source/topic-addressed reader is usable by offline
// dependent production and later online registry loaders. No silent truncation
// or replacement with an older/missing dependency is permitted.
export function readOverallRulesContext(candidate, { sourceRefs = [], topics = [], maxChars = 100000 } = {}) {
  verifySeal(candidate); integer(maxChars, 100, 100000);
  if (candidate.schema !== 'starcraft_overall_rules_candidate_v2' || !candidate.semanticPassed || candidate.trainingTruth
    || !Array.isArray(sourceRefs) || !Array.isArray(topics) || !sourceRefs.length && !topics.length) fail('OVERALL_CONTEXT_REQUEST_INVALID');
  const refs = new Set(sourceRefs), sourceMap = new Map(candidate.sourceIndex.map(r => [r.ref, r]));
  if (sourceRefs.some(ref => !candidate.sourceRefs.includes(ref))
    || topics.some(topic => !candidate.sourceIndex.some(row => row.topics.includes(topic)))) fail('OVERALL_CONTEXT_SCOPE_INVALID');
  const claims = candidate.sections.flatMap(s => s.claims).filter(c => c.evidence.some(e => refs.has(e.ref)
    || sourceMap.get(e.ref)?.topics.some(topic => topics.includes(topic))));
  if (!claims.length || sourceRefs.some(ref => !claims.some(c => c.evidence.some(e => e.ref === ref)))) fail('OVERALL_CONTEXT_DEPENDENCY_MISSING');
  const result = seal({ candidateHash: candidate.hash, sourceBinding: candidate.sourceBinding,
    selection: { sourceRefs, topics }, claims, omittedByBudget: 0, runtimeAccepted: false, trainingTruth: false });
  if (JSON.stringify(result).length > maxChars) fail('OVERALL_CONTEXT_BUDGET_EXCEEDED');
  return result;
}

export function readCompleteOverallRulesContext(candidate, { maxBytes = 600000 } = {}) {
  verifySeal(candidate); integer(maxBytes, 100, 1000000);
  if (candidate.schema !== 'starcraft_overall_rules_candidate_v2' || !candidate.semanticPassed || candidate.trainingTruth) fail('OVERALL_CONTEXT_REQUEST_INVALID');
  const result = seal({ candidateHash: candidate.hash, sourceBinding: candidate.sourceBinding,
    selection: 'entire_skill_all_sections', sections: candidate.sections.map(s => ({ id: s.id, topics: s.topics, claims: s.claims })),
    omittedClaims: 0, runtimeAccepted: false, trainingTruth: false });
  if (Buffer.byteLength(JSON.stringify(result)) > maxBytes) fail('OVERALL_COMPLETE_CONTEXT_BUDGET_EXCEEDED');
  return result;
}

export function renderOverallRulesCandidate(candidate) {
  verifySeal(candidate);
  if (candidate.schema !== 'starcraft_overall_rules_candidate_v2') fail('OVERALL_PACKAGE_SCHEMA_INVALID');
  return ['# 星际争霸 TMG：总规则 Skill（候选 v2）', '',
    '状态：来源与双路语义审核完成；独立测试、真实房间对局/回放与发布尚未完成。不能作为裁判或训练真值。', '',
    '使用方式：按来源或主题读取下列模块；从服务端当前 LegalSpace 中选动作，经 Preview 和配置的确认策略后再 Apply。来源冲突服从绑定版本的官方 FAQ 与规则服务，不能用本说明修改规则。', '',
    '## 模块索引', '', ...candidate.sections.map(s => '- ' + s.id + '：' + (s.topics.join('、') || '基础资料')), '',
    ...candidate.sections.flatMap(section => ['## ' + section.id, '', ...section.claims.map(claim =>
      '- [' + claim.kind + '] ' + claim.text + '〔' + claim.evidence.map(e => e.ref + '/' + e.spanId).join('；') + '〕'), '']),
    '## 来源与限制', '', '冻结来源绑定：' + JSON.stringify(candidate.sourceBinding),
    '声明数量：' + candidate.coverage.claims + '；来源段落：' + candidate.coverage.passages + '。',
    '完整阅读/审核不等于已证明全部规则交互或策略效果。两条原始占位来源仍隔离；不补造官方数据。', ''].join('\n');
}
