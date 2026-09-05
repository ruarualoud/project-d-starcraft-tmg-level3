import { verifySeal, seal, hash, fail, exact } from '../skill-production/common.mjs';
import { applyIssuePatch, inspectDraft } from './contracts.mjs';

// Source audits, evaluator failures and later replay critique enter through an
// explicit immutable finding bundle. Original text/reviews are retained; no
// reviewer vote can silently close a known external counterexample.
export async function repairExternalPacket({ runtime, packet, candidate, findings, context, reader }) {
  [packet, candidate, context, ...findings].forEach(verifySeal);
  if (!findings.length || candidate.packetHash !== packet.hash || candidate.contextHash !== context.hash) fail('EXTERNAL_REPAIR_SCOPE_INVALID');
  for (const f of findings) {
    const index = Number(/^claims\.(\d+)$/.exec(f.claimId)?.[1]);
    if (f.schema !== 'starcraft_external_claim_finding_v1' || f.packetId !== packet.id || f.contextHash !== context.hash
      || f.claimTextHash !== hash(candidate.draft.claims[index]?.text ?? null)) fail('EXTERNAL_REPAIR_FINDING_STALE');
  }
  const issues = findings.map(f => ({ kind: 'claim_external_counterexample', claimId: f.claimId, reason: f.reason,
    fingerprint: f.hash, evidence: f.evidence.map(e => ({ ref: e.ref, spanId: e.spanId })) }));
  const workspace = { parentHash: hash(candidate.draft), draft: candidate.draft, issues,
    sourceAudit: findings.map(f => ({ findingHash: f.hash, kind: f.kind, claimId: f.claimId, reason: f.reason,
      exactSourceEvidence: f.evidence })),
    boundary: 'Source audit findings are not new game rules. Correct the unsupported statement/omission; preserve genuine source conflicts without inventing precedence.' };
  const instruction = 'Correct only the flagged existing claims using the complete frozen sources and exact source audit. Preserve every unaffected claim byte-for-byte. Each flagged claim must be substantively corrected, not merely gain a citation. Preserve actors, complete enumerations, timing, conditions, exceptions and uncertain-source boundaries. In a genuinely conflicting source edge case do not choose a priority without authority: explain the conflict and defer that edge case to bound Rules/referee handling. Never generalize a movement/Coherency permission into a Line of Sight permission. Return {"parentHash":"exact hash","replacements":[{"claimId":"claims.N","value":{"kind":"rule or caution or strategy","text":"corrected complete Chinese statement","evidence":[{"ref":"source ID","spanId":"p1"}]}}],"additions":[],"citationAdditions":[]}. Exactly the flagged claim IDs, no unflagged rewrites, no new claims. A correct statement need not promise strategic success.';
  let edited = await runtime.role({ packet, roleId: 'external-source-editor', instruction, workspace });
  function validate(output) {
    const patched = applyIssuePatch(candidate.draft, output, issues);
    if (!patched.changed || findings.some(f => {
      const index = Number(f.claimId.split('.')[1]);
      return hash(patched.draft.claims[index].text) === f.claimTextHash;
    })) fail('EXTERNAL_PATCH_NO_PROGRESS');
    if (patched.draft.claims.length !== candidate.draft.claims.length) fail('EXTERNAL_PATCH_DENOMINATOR_CHANGED');
    inspectDraft(patched.draft, { packet, context, reader }); return patched.draft;
  }
  let draft; const noProgressResponses = [];
  try { draft = validate(edited.output); }
  catch (error) {
    if (error.code === 'EXTERNAL_PATCH_NO_PROGRESS') {
      const unchangedClaimIds = findings.filter(f => {
        const replacement = edited.output.replacements.find(p => p.claimId === f.claimId);
        return !replacement || hash(replacement.value.text) === f.claimTextHash;
      }).map(f => f.claimId);
      noProgressResponses.push({ artifactHash: edited.hash, code: error.code, unchangedClaimIds,
        diagnosis: 'host_exact_text_comparison_proves_flagged_bad_text_unchanged_not_a_schema_error' });
      edited = await runtime.role({ packet, roleId: 'external-source-editor.no-progress',
        instruction: instruction + '\n确定性检查发现你没有执行正文修改：下列 unchangedClaimIds 仍逐字保留已证实的问题。不是引用不足或格式问题。请逐项对照末尾 sourceAudit 的原文，纠正错误许可、补齐缺失条件；不能复制原句再补引用。仅一次带此具体失败反馈的纠正机会，不得自行宣称验证通过。',
        workspace: { ...workspace, priorArtifactHash: edited.hash, rejectedPatch: edited.output,
          failure: error.code, unchangedClaimIds, sourceAudit: workspace.sourceAudit } });
    } else edited = await runtime.role({ packet, roleId: 'external-source-editor.schema',
      instruction: instruction + '\nFix only the declared shape/address/path violation. Do not expand edit scope.',
      workspace: { ...workspace, rejectedPatch: edited.output, failure: error.code || 'OUTPUT_SCHEMA_INVALID' } });
    try { draft = validate(edited.output); }
    catch (nextError) {
      if (error.code !== 'EXTERNAL_PATCH_NO_PROGRESS' || nextError.code !== 'EXTERNAL_PATCH_NO_PROGRESS') throw nextError;
      noProgressResponses.push({ artifactHash: edited.hash, code: nextError.code,
        diagnosis: 'second_unchanged_response_escalated_to_source_first_reconstruction_without_bad_draft' });
      // A distinct bounded task: reconstruct only the flagged source topics.
      // Full global sources remain. Do not show the incorrect draft or either
      // failed replacement: these are stored in the journal, not a copy target.
      const rebuilt = await runtime.role({ packet, roleId: 'external-source-reconstruction',
        instruction: '从完整冻结官方来源重建指定规则说明。你没有旧稿；不得引用记忆中的电子游戏规则。每个scope输出一条完整中文陈述，保留主体、时机、条件、枚举与例外，并明确原文不支持的推论；真实来源冲突不得自行裁定优先级。输出 {"claims":[{"claimId":"指定地址","value":{"kind":"rule或caution","text":"依据原文写出的完整新陈述","evidence":[{"ref":"精确来源ID","spanId":"段落ID"}]}}]}。每个指定claimId恰好一次，不能增加其它项。返回finish。',
        workspace: { scopes: findings.map(f => ({ claimId: f.claimId, issueType: f.kind,
          sourceQuestion: f.reason, exactSourceEvidence: f.evidence })),
          sourceBinding: context.sourceBinding, recoveryMode: 'source_first_no_bad_draft_or_previous_answers',
          priorFailureArtifactHashes: noProgressResponses.map(r => r.artifactHash) } });
      exact(rebuilt.output, ['claims']);
      if (!Array.isArray(rebuilt.output.claims) || rebuilt.output.claims.length !== findings.length
        || new Set(rebuilt.output.claims.map(c => c.claimId)).size !== findings.length
        || rebuilt.output.claims.some(c => !findings.some(f => f.claimId === c.claimId))) fail('EXTERNAL_RECONSTRUCTION_SCOPE_INVALID');
      rebuilt.output.claims.forEach(c => exact(c, ['claimId', 'value']));
      const patch = { parentHash: hash(candidate.draft), replacements: rebuilt.output.claims, additions: [], citationAdditions: [] };
      draft = validate(patch);
      // Bind the real role artifact, while host binds the patch's parent hash.
      edited = { hash: rebuilt.hash, output: patch };
    }
  }
  const seed = seal({ schema: 'starcraft_external_correction_seed_v3', packetId: packet.id, packetHash: packet.hash,
    catalogueHash: context.catalogueHash, sourceBinding: context.sourceBinding,
    parentCandidateHash: candidate.hash, parentDraftHash: hash(candidate.draft), findingHashes: findings.map(f => f.hash),
    patchHash: hash(edited.output), draft, draftHash: hash(draft), semanticAcceptanceInherited: false,
    freshSourceReviewsRequired: true, externalProbePassed: false, trainingTruth: false });
  const corrected = await runtime.produce(packet, seed);
  return { candidate: corrected, seed, repair: seal({ schema: 'starcraft_external_correction_receipt_v3',
    packetId: packet.id, parentCandidateHash: candidate.hash, candidateHash: corrected.hash,
    findingHashes: findings.map(f => f.hash), editorArtifactHash: edited.hash, patch: edited.output, seedHash: seed.hash, noProgressResponses,
    sourceReviewPassed: corrected.semanticPassed, externalProbePassed: false, actualRoomReplayPerformed: false,
    formalSkillAcceptance: false, trainingTruth: false }) };
}
