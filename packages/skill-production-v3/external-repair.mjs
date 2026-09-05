import { verifySeal, seal, hash, fail } from '../skill-production/common.mjs';
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
  let draft;
  try { draft = validate(edited.output); }
  catch (error) {
    if (error.code === 'EXTERNAL_PATCH_NO_PROGRESS') throw error;
    edited = await runtime.role({ packet, roleId: 'external-source-editor.schema',
      instruction: instruction + '\nFix only the declared shape/address/path violation. Do not expand edit scope.',
      workspace: { ...workspace, rejectedPatch: edited.output, failure: error.code || 'OUTPUT_SCHEMA_INVALID' } });
    draft = validate(edited.output);
  }
  const seed = seal({ schema: 'starcraft_external_correction_seed_v3', packetId: packet.id, packetHash: packet.hash,
    catalogueHash: context.catalogueHash, sourceBinding: context.sourceBinding,
    parentCandidateHash: candidate.hash, parentDraftHash: hash(candidate.draft), findingHashes: findings.map(f => f.hash),
    patchHash: hash(edited.output), draft, draftHash: hash(draft), semanticAcceptanceInherited: false,
    freshSourceReviewsRequired: true, externalProbePassed: false, trainingTruth: false });
  const corrected = await runtime.produce(packet, seed);
  return { candidate: corrected, seed, repair: seal({ schema: 'starcraft_external_correction_receipt_v3',
    packetId: packet.id, parentCandidateHash: candidate.hash, candidateHash: corrected.hash,
    findingHashes: findings.map(f => f.hash), editorArtifactHash: edited.hash, patch: edited.output, seedHash: seed.hash,
    sourceReviewPassed: corrected.semanticPassed, externalProbePassed: false, actualRoomReplayPerformed: false,
    formalSkillAcceptance: false, trainingTruth: false }) };
}
