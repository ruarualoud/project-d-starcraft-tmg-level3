import { exact, text, fail, seal, hash, clone, safe, verifySeal } from "./common.mjs";
import { resolveSpan } from "./spans.mjs";

const FIELDS = ["rules", "strategy", "cautions"];
export const CHAPTER_OUTPUT_SCHEMA = Object.freeze({
  rules: [{ text: "A concrete rule statement with all relevant conditions.", evidence: [{ ref: "source ID", spanId: "p1" }] }],
  strategy: [{ text: "A conditional tactical suggestion, not a guaranteed rule.", evidence: [{ ref: "source ID", spanId: "p1" }] }],
  cautions: [{ text: "An exception, counterexample or failure condition.", evidence: [{ ref: "source ID", spanId: "p1" }] }],
});

// Every rendered statement is inventoried. Unknown fields cannot conceal an
// unreviewed summary, example, numerical claim or fabricated test expectation.
export function inspectChapterDraft(draft, { reader, chapterId, readRefs, requiredRefs = [] }) {
  safe(draft); exact(draft, FIELDS);
  const findings = []; const claims = []; const referenced = new Set();
  for (const field of FIELDS) {
    const values = draft[field];
    const minimum = field === "rules" ? 4 : 2;
    if (!Array.isArray(values) || values.length < minimum || values.length > 8) fail("CHAPTER_COVERAGE_INVALID", { field });
    values.forEach((value, index) => {
      exact(value, ["text", "evidence"]); text(value.text, 1000);
      const claimId = `${field}.${index}`;
      if (!Array.isArray(value.evidence) || value.evidence.length < 1 || value.evidence.length > 4) fail("CLAIM_EVIDENCE_INVALID");
      const evidence = value.evidence.map((binding) => {
        exact(binding, ["ref", "spanId"]); text(binding.ref, 200); text(binding.spanId, 20);
        if (!readRefs.includes(binding.ref)) {
          findings.push({ claimId, code: "EVIDENCE_NOT_ACTUALLY_READ", ref: binding.ref });
          return clone(binding);
        }
        let resolved;
        try { resolved = resolveSpan(reader, binding); }
        catch (error) { findings.push({ claimId, code: error.code || "EVIDENCE_SPAN_INVALID", ref: binding.ref }); return clone(binding); }
        if (!resolved.chapterIds.includes(chapterId)) findings.push({ claimId, code: "EVIDENCE_OUTSIDE_CHAPTER", ref: binding.ref });
        referenced.add(binding.ref);
        return resolved;
      });
      claims.push({ claimId, field, text: value.text, evidence, verification: "semantic_review_required" });
    });
  }
  for (const ref of requiredRefs) if (!referenced.has(ref)) findings.push({ claimId: "coverage", code: "MANDATORY_SOURCE_NOT_COVERED", ref });
  return seal({ chapterId, draftHash: hash(draft), claims, findings,
    structuralAndProvenancePassed: findings.length === 0, factsVerified: false,
    currentBinding: reader.binding, trainingTruth: false });
}

export function validateSemanticReview(output, inventory, { reader, reviewId, role }) {
  verifySeal(inventory); safe(output); text(reviewId, 200);
  exact(output, ["verdicts"]);
  if (!Array.isArray(output.verdicts) || output.verdicts.length !== inventory.claims.length) fail("REVIEW_DENOMINATOR_INVALID");
  const expected = new Set(inventory.claims.map((claim) => claim.claimId));
  const verdicts = output.verdicts.map((row) => {
    exact(row, ["claimId", "verdict", "reason", "evidence"]);
    if (!expected.delete(row.claimId) || !["supported", "unsupported", "unknown"].includes(row.verdict)) fail("REVIEW_CLAIM_INVALID");
    text(row.reason, 900);
    if (!Array.isArray(row.evidence) || row.evidence.length < 1 || row.evidence.length > 4) fail("REVIEW_EVIDENCE_REQUIRED");
    const evidence = row.evidence.map((binding) => {
      return resolveSpan(reader, binding);
    });
    return { ...row, evidence };
  });
  if (expected.size) fail("REVIEW_DENOMINATOR_INVALID");
  return seal({ reviewId, role, candidateHash: inventory.draftHash, inventoryHash: inventory.hash,
    verdicts, independentContextRequired: true, selfReviewAccepted: false, trainingTruth: false });
}

export function combineSemanticReviews(inventory, supportive, adversarial, arbitration = null) {
  verifySeal(inventory);
  const reviews = [supportive, adversarial, ...(arbitration ? [arbitration] : [])];
  reviews.forEach(verifySeal);
  if (new Set(reviews.map((review) => review.reviewId)).size !== reviews.length
    || supportive.role !== "supportive_reviewer" || adversarial.role !== "adversarial_reviewer"
    || arbitration && arbitration.role !== "arbitrator"
    || reviews.some((review) => review.candidateHash !== inventory.draftHash || review.inventoryHash !== inventory.hash)) {
    fail("REVIEW_CONTEXT_OR_BINDING_INVALID");
  }
  const findings = clone(inventory.findings); const disagreements = [];
  for (const claim of inventory.claims) {
    const values = reviews.map((review) => review.verdicts.find((row) => row.claimId === claim.claimId));
    if (values.some((value) => !value)) fail("REVIEW_DENOMINATOR_INVALID");
    const [a, b, c] = values;
    if (a.verdict !== b.verdict) {
      disagreements.push(claim.claimId);
      if (!c || c.verdict !== "supported") findings.push({ claimId: claim.claimId,
        code: c ? "SEMANTIC_ARBITRATION_UNSAFE_OR_UNKNOWN" : "SEMANTIC_DISAGREEMENT_UNRESOLVED" });
    } else if (a.verdict !== "supported") findings.push({ claimId: claim.claimId, code: "SEMANTIC_UNSAFE_OR_UNKNOWN" });
  }
  return seal({ inventoryHash: inventory.hash, reviewHashes: reviews.map((review) => review.hash),
    passed: findings.length === 0, findings, disagreements,
    evidenceLevel: "source_grounded_semantic_candidate_not_formal_proof", trainingTruth: false });
}

export function applyTargetedPatch(draft, patch, findings) {
  exact(patch, ["parentHash", "replacements"]);
  if (patch.parentHash !== hash(draft) || !Array.isArray(patch.replacements) || !patch.replacements.length) fail("PATCH_PARENT_OR_SHAPE_INVALID");
  const allowed = new Set(findings.map((finding) => finding.claimId).filter((id) => id !== "coverage"));
  const copy = clone(draft); const seen = new Set();
  for (const replacement of patch.replacements) {
    exact(replacement, ["claimId", "value"]);
    if (!allowed.has(replacement.claimId) || seen.has(replacement.claimId)) fail("PATCH_PATH_NOT_AUTHORIZED");
    seen.add(replacement.claimId);
    const [field, index] = replacement.claimId.split(".");
    if (!FIELDS.includes(field) || !/^\d+$/.test(index) || !copy[field]?.[Number(index)]) fail("PATCH_PATH_NOT_AUTHORIZED");
    exact(replacement.value, ["text", "evidence"]);
    safe(replacement.value); copy[field][Number(index)] = clone(replacement.value);
  }
  return copy;
}

export function renderChapter(chapter, draft) {
  return [`## ${chapter.title}`, ...FIELDS.flatMap((field) => ["", `### ${{ rules: "玩法规则", strategy: "策略建议（待实战评估）", cautions: "例外与反例" }[field]}`, "",
    ...draft[field].map((row) => `- ${row.text}〔${row.evidence.map((ref) => ref.ref).join("，")}〕`)])].join("\n");
}
