import { seal, verifySeal, fail } from "../skill-production/common.mjs";

// Reviewer consensus is not a promotion decision. Known counterexamples have
// veto power; the registry/arena/human approval remains Ticket18 authority.
export function candidateDisposition({ candidate, supplemental, findings = [] }) {
  verifySeal(candidate); verifySeal(supplemental);
  if (supplemental.candidateHash !== candidate.hash) fail("DISPOSITION_CANDIDATE_DRIFT");
  findings.forEach((finding) => {
    verifySeal(finding);
    if (finding.candidateHash !== candidate.hash || !finding.code || !finding.evidenceHash) fail("DISPOSITION_FINDING_DRIFT");
  });
  const reasons = [];
  if (!candidate.semanticPassed) reasons.push("SEMANTIC_REVIEW_NOT_PASSED");
  if (!candidate.heldoutPassed) reasons.push("ORIGINAL_HELDOUT_NOT_PASSED");
  if (supplemental.correct !== supplemental.cases) reasons.push("SUPPLEMENTARY_HELDOUT_NOT_PASSED");
  if (findings.length) reasons.push("KNOWN_REVIEWER_MISS");
  if (!candidate.scope?.allRulesCovered) reasons.push("INCOMPLETE_SOURCE_SCOPE");
  reasons.push("ROOM_ARENA_AND_REGISTRY_APPROVAL_NOT_PERFORMED");
  return seal({ candidateHash: candidate.hash, supplementalHash: supplemental.hash,
    knownFindingHashes: findings.map((f) => f.hash), reasons, status: "quarantined_candidate",
    automaticQualityAccepted: false, published: false, trainingTruth: false });
}
