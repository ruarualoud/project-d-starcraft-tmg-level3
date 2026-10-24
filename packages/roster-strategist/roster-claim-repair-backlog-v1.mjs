import { rosterPublicClaimTextEntriesV1, rosterReferencedRepairClaimPathsV1 } from "./roster-public-claim-paths-v1.mjs";
import { effectiveRosterFinalPlanReviewFindingsV1 } from "./roster-final-plan-review-v1.mjs";

function adjudicatedIndexes(plan, review) {
  if (!review?.reviewAdjudication) return new Set();
  const effective = effectiveRosterFinalPlanReviewFindingsV1({ plan, review });
  return new Set(effective.flatMap((finding, index) =>
    finding.originalSeverity === "high" && finding.severity === "medium" ? [index] : []));
}

export function rosterRepairClaimTextV1(plan, claimPath) {
  if (claimPath.startsWith("componentPurposes.")) {
    const matches = (plan?.componentPurposes || []).filter(purpose =>
      `componentPurposes.${purpose.instanceId}` === claimPath);
    return matches.length === 1 ? matches[0].publicPurposeText : undefined;
  }
  return new Map(rosterPublicClaimTextEntriesV1(plan)).get(claimPath);
}

// Derived from the existing persisted lineage; no new mutable queue or
// migration. Absence from a subsequent judge's findings is not completion
// of a deferred/unchanged claim. A changed text requires a current, covering,
// clean source review. These are advisory claims, never Rules authority.
export function collectRosterClaimRepairBacklogV1({ plan, planVersionHistory = [],
  planReview, planReviewHistory = [], claimRepairHistory = [] } = {}) {
  if (!plan) return [];
  const versions = new Map([...planVersionHistory, plan].map(p => [p.planHash, p]));
  const currentReview = planReview?.status === "completed"
    && planReview.planHash === plan.planHash
    && planReview.review?.planHash === plan.planHash ? planReview.review : null;
  const covered = new Set(currentReview?.reviewedClaimPaths || []);
  const currentAdjudicated = adjudicatedIndexes(plan, currentReview);
  const currentBlocking = new Set((currentReview?.findings || []).filter((f, i) =>
    ["high", "critical"].includes(f.severity) && !currentAdjudicated.has(i))
    .map(f => f.claimPath));
  const dismissed = new Set([...currentAdjudicated].map(i =>
    JSON.stringify([currentReview.findings[i].claimPath, currentReview.findings[i].claimQuote])));
  const pending = new Map();
  const reviews = [...planReviewHistory, planReview].filter(r =>
    r?.status === "completed" && r.review?.planHash === r.planHash
      && versions.has(r.planHash)).sort((a, b) =>
    versions.get(a.planHash).planVersion - versions.get(b.planHash).planVersion);
  for (const wrapper of reviews) {
    const origin = versions.get(wrapper.planHash);
    const adjudicated = adjudicatedIndexes(origin, wrapper.review);
    for (const [index, finding] of (wrapper.review.findings || []).entries()) {
      if (!["high", "critical"].includes(finding.severity)) continue;
      if (adjudicated.has(index)
        || dismissed.has(JSON.stringify([finding.claimPath, finding.claimQuote]))) continue;
      const claimPath = finding.claimPath;
      const before = rosterRepairClaimTextV1(origin, claimPath);
      const current = rosterRepairClaimTextV1(plan, claimPath);
      if (typeof before !== "string" || typeof current !== "string") continue;
      const replaced = claimRepairHistory.some(repair =>
        versions.has(repair.fromPlanHash) && versions.has(repair.toPlanHash)
          && versions.get(repair.fromPlanHash).planVersion >= origin.planVersion
          && repair.coverage?.replacedClaimPaths?.includes(claimPath));
      const changed = current !== before;
      const quotedClaimRemoved = typeof finding.claimQuote === "string"
        && !current.includes(finding.claimQuote);
      if (changed && covered.has(claimPath) && !currentBlocking.has(claimPath)
        && (replaced || quotedClaimRemoved)) continue;
      pending.set(claimPath, {
        claimPath, currentPlanHash: plan.planHash,
        sourcePlanHash: origin.planHash, sourceReviewHash: wrapper.review.reviewHash,
        finding: structuredClone(finding), currentClaimText: current,
        status: !changed || currentBlocking.has(claimPath)
          || (!replaced && !quotedClaimRemoved)
          ? "repair_required" : "source_review_required",
        rulesAuthority: false, trainingTruth: false,
      });
    }
  }
  // A later review of only the primary quote must not erase its unresolved
  // cross-claim dependencies. Clear a dependency only after its current prose
  // was itself freshly checked after the originating finding, not inherited.
  const cleanReviews = reviews.map(wrapper => ({ wrapper,
    version: versions.get(wrapper.planHash),
    blocking: new Set(effectiveRosterFinalPlanReviewFindingsV1({
      plan: versions.get(wrapper.planHash), review: wrapper.review })
      .filter(f => ["high", "critical"].includes(f.severity)).map(f => f.claimPath)) }));
  for (const wrapper of reviews) {
    const origin = versions.get(wrapper.planHash);
    const adjudicated = adjudicatedIndexes(origin, wrapper.review);
    for (const [index, finding] of wrapper.review.findings.entries()) {
      if (!["high", "critical"].includes(finding.severity) || adjudicated.has(index)) continue;
      for (const claimPath of rosterReferencedRepairClaimPathsV1(origin, [finding])) {
        if (claimPath === finding.claimPath || pending.has(claimPath)) continue;
        const current = rosterRepairClaimTextV1(plan, claimPath);
        if (typeof current !== "string") continue;
        const cleared = cleanReviews.some(({ wrapper: later, version, blocking }) => {
          if (version.planVersion <= origin.planVersion || blocking.has(claimPath)
            || rosterRepairClaimTextV1(version, claimPath) !== current) return false;
          const incremental = later.review.incrementalReview;
          return incremental ? [...(incremental.changedClaimPaths || []),
            ...(incremental.explicitlyRecheckedClaimPaths || [])].includes(claimPath)
            : later.review.reviewedClaimPaths?.includes(claimPath);
        });
        if (cleared) continue;
        pending.set(claimPath, { claimPath, currentPlanHash: plan.planHash,
          sourcePlanHash: origin.planHash, sourceReviewHash: wrapper.review.reviewHash,
          finding: { ...structuredClone(finding), claimPath, claimQuote: current },
          findingOrigin: "related_claim_dependency", dependencyOfClaimPath: finding.claimPath,
          currentClaimText: current, status: "repair_required",
          requiresFreshRelatedClaimReview: true, rulesAuthority: false, trainingTruth: false });
      }
    }
  }
  return [...pending.values()];
}
