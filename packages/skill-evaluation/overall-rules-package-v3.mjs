import { verifyFirstFivePlan } from '../skill-production/coverage-plan.mjs';
import { createEvidenceReader } from '../skill-production/evidence.mjs';
import { createGlobalProductionContext } from '../skill-production-v3/context.mjs';
import { inspectDraft, validateReview, reconcileReviews } from '../skill-production-v3/contracts.mjs';
import { seal, verifySeal, hash, fail, clone, integer } from '../skill-production/common.mjs';

export function assembleOverallRulesCandidateV3({ catalogue, plan, packets }) {
  verifyFirstFivePlan(plan, catalogue);
  if (!Array.isArray(packets) || packets.length !== plan.packets.length) fail('OVERALL_PACKET_DENOMINATOR_INVALID');
  const context = createGlobalProductionContext(catalogue), reader = createEvidenceReader(catalogue);
  const sections = plan.packets.map((packet, index) => {
    const result = verifySeal(packets[index]);
    if (result.schema !== 'starcraft_production_packet_candidate_v3' || result.packetHash !== packet.hash
      || result.packetId !== packet.id || result.contextHash !== context.hash
      || hash(result.sourceBinding) !== hash(catalogue.sourceBinding)) fail('OVERALL_V3_PACKET_BINDING_INVALID');
    if (!result.semanticPassed || !result.candidateOnly || result.runtimeAccepted || result.trainingTruth
      || result.heldoutPassed || result.failure || result.repairStops?.length) fail('OVERALL_V3_PACKET_QUARANTINED');
    const final = result.rounds?.at(-1);
    if (!final || final.reviews.length !== 2) fail('OVERALL_V3_REVIEW_MISSING');
    const inventory = inspectDraft(result.draft, { packet, context, reader });
    if (inventory.hash !== verifySeal(final.inventory).hash) fail('OVERALL_V3_INVENTORY_DRIFT');
    const reviews = final.reviews.map(review => {
      verifySeal(review);
      const rebuilt = validateReview({ verdicts: review.verdicts.map(v => ({ ...v,
        evidence: v.evidence.map(e => ({ ref: e.ref, spanId: e.spanId })) })),
      passageCoverage: review.passageCoverage.map(({ sourceEvidence, ...p }) => p) }, inventory,
      { packet, context, reader, reviewId: review.reviewId, role: review.role });
      if (rebuilt.hash !== review.hash) fail('OVERALL_V3_REVIEW_DRIFT');
      return rebuilt;
    });
    const combined = reconcileReviews(inventory, packet, reviews), journal = verifySeal(result.issueJournal);
    if (!combined.passed || combined.hash !== verifySeal(final.combined).hash
      || journal.hash !== final.journalHash || journal.combinedHash !== combined.hash
      || journal.contextHash !== context.hash || journal.packetHash !== packet.hash
      || journal.openIssues !== 0 || journal.records.some(r => r.state === 'open')) fail('OVERALL_V3_OPEN_ISSUE_OR_REVIEW_DRIFT');
    const sourceRefs = [...new Set(packet.passages.map(p => p.ref))];
    return { id: packet.id, packetArtifactHash: result.hash, inventoryHash: inventory.hash,
      reviewHashes: reviews.map(r => r.hash), issueJournalHash: journal.hash, sourceRefs,
      topics: [...new Set(sourceRefs.flatMap(ref => catalogue.rows.find(r => r.id === ref).chapterIds))],
      sourceDispositions: combined.dispositions,
      claims: result.draft.claims.map((claim, n) => ({ id: packet.id + '.claims.' + n, ...clone(claim) })) };
  });
  const dispositions = sections.flatMap(s => s.sourceDispositions);
  if (dispositions.length !== plan.counts.passages) fail('OVERALL_V3_SOURCE_DENOMINATOR_INVALID');
  return seal({ schema: 'starcraft_overall_rules_candidate_v3', gameId: 'starcraft-tmg',
    skillId: plan.skills[0].skillId, skillType: 'how_to_play', version: '3.0.0-candidate',
    sourceBinding: catalogue.sourceBinding, catalogueHash: catalogue.hash, planHash: plan.hash, globalContextHash: context.hash,
    sections, sourceRefs: [...new Set(plan.packets.flatMap(p => p.passages.map(s => s.ref)))],
    coverage: { ...plan.counts, claims: sections.reduce((n, s) => n + s.claims.length, 0),
      reviewCoveredPassages: dispositions.filter(d => d.kind === 'rule_covered').length,
      explicitNonNormativePassages: dispositions.filter(d => d.kind === 'non_normative').length,
      meaning: 'every_declared_passage_has_explicit_source_grounded_disposition_not_full_game_proof' },
    excluded: plan.excluded, candidateOnly: true, semanticPassed: true, heldoutPassed: false,
    roomReplayPerformed: false, runtimeAccepted: false, published: false, humanReviewed: false,
    canAffectRules: false, trainingTruth: false });
}

// Generation/evaluation gets the entire produced Skill, not only snippets
// selected by the exam question. Overflow is explicit; never silently trim.
export function readCompleteOverallRulesContextV3(candidate, { maxBytes = 600000 } = {}) {
  verifySeal(candidate); integer(maxBytes, 100, 1_000_000);
  if (candidate.schema !== 'starcraft_overall_rules_candidate_v3' || !candidate.semanticPassed
    || candidate.trainingTruth) fail('OVERALL_V3_CONTEXT_INVALID');
  const result = seal({ candidateHash: candidate.hash, sourceBinding: candidate.sourceBinding,
    usage: 'Advisory Skill. Current Rules service decides legality. Select enabled LegalSpace actions; Preview, configured confirmation, Apply, Replay.',
    selection: 'entire_skill_all_sections', sections: candidate.sections.map(s => ({ id: s.id, topics: s.topics, claims: s.claims })),
    omittedClaims: 0, runtimeAccepted: false, trainingTruth: false });
  if (Buffer.byteLength(JSON.stringify(result)) > maxBytes) fail('OVERALL_COMPLETE_CONTEXT_BUDGET_EXCEEDED');
  return result;
}

export function renderOverallRulesCandidateV3(candidate) {
  readCompleteOverallRulesContextV3(candidate);
  return ['# 星际争霸 TMG：总规则 Skill（候选 v3）', '',
    '来源与双路语义核验通过不等于完整规则或策略效果验收。此文件没有裁判、发布或训练权限。', '',
    '使用：读取完整 Skill，按当前 Rules 绑定和 LegalSpace 选择动作，经 Preview 与配置的确认策略后再 Apply。FAQ 优先级服从冻结来源。', '',
    ...candidate.sections.flatMap(s => ['## ' + s.id + ' / ' + s.topics.join('、'), '',
      ...s.claims.map(c => '- [' + c.kind + '] ' + c.text + '〔' + c.evidence.map(e => e.ref + '/' + e.spanId).join('；') + '〕'), '']),
    '## 来源处置', '', '评审标记已覆盖的段落：' + candidate.coverage.reviewCoveredPassages + '；明确标记非规范说明：' + candidate.coverage.explicitNonNormativePassages + '。',
    '“已覆盖”是评审处置类别，不是独立原子规则数量，也不能证明该段没有说明性文字。',
    '非规范说明的原文地址、两路理由及审核哈希保留在结构化候选；不以编造规则来补齐引用计数。',
    '冻结来源：' + JSON.stringify(candidate.sourceBinding), ''].join('\n');
}
