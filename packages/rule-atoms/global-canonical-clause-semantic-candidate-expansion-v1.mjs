import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

const EXPANSION_SCHEMA = "starcraft_tmg_global_canonical_clause_semantic_candidate_expansion_v1";
const CONTAINMENT_EXPANSION_SCHEMA = "starcraft_tmg_global_canonical_clause_containment_candidate_expansion_v1";
const PLAN_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_plan_v1";
const BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_batch_v1";
const SEMANTIC_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_semantic_merge_batch_v1";
const EXPECTED_PLAN_HASH = "8068f9635e473d3a4c72849aacb997a87365d46c8e5479d877bf1c68bbee4618";
const EXPECTED_PREVIOUS_BATCH_HASH = "f881fdc48a64f7be2506abf36e4c5d10a1c668054848a34441678ecd108c83e2";
const EXPECTED_SECOND_BATCH_HASH = "c5eda2ecb1ee817520579eba5f6d9cf364872b4d2b86c14034aa61e1bb702f5f";
const EXACT_CHARACTER_MINIMUM = 32;
const NEAR_MINIMUM_INTERSECTION = 8;
const NEAR_JACCARD_NUMERATOR = 84;
const NEAR_JACCARD_DENOMINATOR = 100;
const NEAR_CONTAINMENT_NUMERATOR = 90;
const NEAR_CONTAINMENT_DENOMINATOR = 100;
const CHARACTER_CONTAINMENT_MINIMUM = 32;
const CHARACTER_CONTAINMENT_RATIO_NUMERATOR = 25;
const CHARACTER_CONTAINMENT_RATIO_DENOMINATOR = 100;
const TOKEN_FULL_CONTAINMENT_MINIMUM = 5;
const TOKEN_SIZE_RATIO_NUMERATOR = 30;
const TOKEN_SIZE_RATIO_DENOMINATOR = 100;
const TITLE_INTERSECTION_MINIMUM = 2;
const TITLE_JACCARD_NUMERATOR = 65;
const TITLE_JACCARD_DENOMINATOR = 100;
const TITLE_STOP_WORDS = new Set([
  "a", "action", "actions", "after", "all", "an", "and", "any", "are", "as", "at", "be", "been", "being", "before",
  "by", "can", "card", "cards", "constraint", "constraints", "could", "definition", "definitions",
  "do", "does", "during", "each", "effect", "effects", "field", "fields", "for", "from", "in",
  "into", "is", "it", "may", "model", "models", "must", "no", "not", "of", "on", "only", "or",
  "per", "phase", "player", "players", "requirement", "requirements", "rule", "rules", "set", "should",
  "source", "step", "summary", "than", "that", "the", "their", "then", "these", "this", "those",
  "timing", "to", "type", "types", "unit", "units", "when", "while", "with", "would",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function sha256Text(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function normalizedCharacters(value) {
  return value.normalize("NFC").toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function tokenSet(value) {
  return new Set(value.normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter((token) => token.length > 1));
}

function verifyFrozenPlan(plan) {
  if (!object(plan) || plan.schema !== PLAN_SCHEMA) {
    fail("semantic_candidate_plan_invalid");
  }
  if (hashStarcraftTmgContract(without(plan, ["planHash"])) !== plan.planHash) {
    fail("semantic_candidate_plan_hash_mismatch");
  }
  if (plan.planHash !== EXPECTED_PLAN_HASH
    || plan.counts?.localClauses !== 1093
    || plan.counts?.coreLocalClauses !== 1090
    || plan.globalCanonicalClauseCount !== null
    || plan.rulesEligible !== false
    || plan.trainingTruth !== false) {
    fail("semantic_candidate_plan_dependency_mismatch");
  }
}

function verifyPreviousBatch(plan, previousBatch) {
  if (!object(previousBatch) || previousBatch.schema !== BATCH_SCHEMA) {
    fail("semantic_candidate_previous_batch_invalid");
  }
  if (hashStarcraftTmgContract(without(previousBatch, ["batchHash"])) !== previousBatch.batchHash) {
    fail("semantic_candidate_previous_batch_hash_mismatch");
  }
  if (previousBatch.batchHash !== EXPECTED_PREVIOUS_BATCH_HASH
    || previousBatch.globalMergePlanHash !== plan.planHash
    || previousBatch.reviewedLocalClauseCount !== 28
    || previousBatch.remainingLocalClauseCount !== 1065
    || previousBatch.globalCanonicalClauseCount !== null
    || previousBatch.rulesEligible !== false
    || previousBatch.trainingTruth !== false) {
    fail("semantic_candidate_previous_batch_dependency_mismatch");
  }
}

function normalizedCorpus(plan, reviewCorpus) {
  if (!Array.isArray(reviewCorpus)) fail("semantic_candidate_review_corpus_required");
  const planCoreRows = plan.localClauseIndex.filter((row) => row.sourceKind === "core_pdf");
  const planRowById = new Map(planCoreRows.map((row) => [row.localClauseId, row]));
  const seenClauseIds = new Set();
  const rows = [];
  for (const rawRow of reviewCorpus) {
    if (!object(rawRow)) fail("semantic_candidate_review_corpus_row_invalid");
    const localClauseId = String(rawRow.localClauseId || "").trim();
    const planRow = planRowById.get(localClauseId);
    if (!planRow) fail("semantic_candidate_review_corpus_clause_unknown", localClauseId);
    if (seenClauseIds.has(localClauseId)) {
      fail("semantic_candidate_review_corpus_clause_duplicate", localClauseId);
    }
    seenClauseIds.add(localClauseId);
    if (rawRow.sourcePart !== planRow.sourcePart
      || rawRow.sourceAnchorId !== planRow.sourceAnchorId
      || rawRow.semanticClass !== planRow.semanticClass
      || rawRow.disposition !== planRow.disposition) {
      fail("semantic_candidate_review_corpus_metadata_mismatch", localClauseId);
    }
    if (!Array.isArray(rawRow.sourceCandidates) || rawRow.sourceCandidates.length === 0) {
      fail("semantic_candidate_source_candidates_required", localClauseId);
    }
    const seenCandidateIds = new Set();
    const candidates = rawRow.sourceCandidates.map((candidate) => {
      if (!object(candidate)) fail("semantic_candidate_source_candidate_invalid", localClauseId);
      const clauseCandidateId = String(candidate.clauseCandidateId || "").trim();
      const sourceTextHash = String(candidate.sourceTextHash || "").trim();
      const sourceText = typeof candidate.text === "string" ? candidate.text : "";
      if (!clauseCandidateId || seenCandidateIds.has(clauseCandidateId)) {
        fail("semantic_candidate_source_candidate_identity_invalid", localClauseId);
      }
      seenCandidateIds.add(clauseCandidateId);
      if (!/^[a-f0-9]{64}$/u.test(sourceTextHash)
        || sha256Text(sourceText) !== sourceTextHash) {
        fail("semantic_candidate_source_text_hash_mismatch", clauseCandidateId);
      }
      return { clauseCandidateId, sourceTextHash, sourceText };
    }).sort((left, right) => left.clauseCandidateId.localeCompare(right.clauseCandidateId));
    const sourceTextHashes = candidates.map((candidate) => candidate.sourceTextHash)
      .sort((left, right) => left.localeCompare(right));
    if (hashStarcraftTmgContract({ sourceTextHashes }) !== planRow.sourceIdentitySetHash) {
      fail("semantic_candidate_source_identity_mismatch", localClauseId);
    }
    const sourceDocument = candidates.map((candidate) => candidate.sourceText).join("\n");
    const characters = normalizedCharacters(sourceDocument);
    const tokens = tokenSet(sourceDocument);
    rows.push({
      localClauseId,
      sourcePart: planRow.sourcePart,
      sourceAnchorId: planRow.sourceAnchorId,
      semanticClass: planRow.semanticClass,
      disposition: planRow.disposition,
      sourceIdentitySetHash: planRow.sourceIdentitySetHash,
      normalizedCharacterHash: hashStarcraftTmgContract({ characters }),
      normalizedCharacterCount: characters.length,
      sourceTokenSetHash: hashStarcraftTmgContract({ tokens: [...tokens].sort() }),
      sourceTokenCount: tokens.size,
      characters,
      tokens,
    });
  }
  if (seenClauseIds.size !== planCoreRows.length
    || planCoreRows.some((row) => !seenClauseIds.has(row.localClauseId))) {
    fail("semantic_candidate_review_corpus_incomplete");
  }
  return rows.sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
}

function candidatePair(left, right) {
  if (left.sourceAnchorId === right.sourceAnchorId
    || left.semanticClass !== right.semanticClass
    || left.disposition !== right.disposition) return null;
  const exactNormalizedCharacters = left.normalizedCharacterCount >= EXACT_CHARACTER_MINIMUM
    && left.normalizedCharacterHash === right.normalizedCharacterHash;
  let intersectionTokenCount = 0;
  for (const token of left.tokens) if (right.tokens.has(token)) intersectionTokenCount += 1;
  const unionTokenCount = new Set([...left.tokens, ...right.tokens]).size;
  const smallerTokenCount = Math.min(left.sourceTokenCount, right.sourceTokenCount);
  const nearSourceTokens = intersectionTokenCount >= NEAR_MINIMUM_INTERSECTION
    && intersectionTokenCount * NEAR_JACCARD_DENOMINATOR
      >= unionTokenCount * NEAR_JACCARD_NUMERATOR
    && intersectionTokenCount * NEAR_CONTAINMENT_DENOMINATOR
      >= smallerTokenCount * NEAR_CONTAINMENT_NUMERATOR;
  if (!exactNormalizedCharacters && !nearSourceTokens) return null;
  const localClauseIds = [left.localClauseId, right.localClauseId]
    .sort((a, b) => a.localeCompare(b));
  const evidenceKind = exactNormalizedCharacters
    ? "normalized_character_equivalence"
    : "source_token_near_equivalence";
  const evidence = {
    evidenceKind,
    localClauseIds,
    semanticClass: left.semanticClass,
    disposition: left.disposition,
    intersectionTokenCount,
    unionTokenCount,
    smallerTokenCount,
    normalizedCharacterHashes: [left.normalizedCharacterHash, right.normalizedCharacterHash]
      .sort((a, b) => a.localeCompare(b)),
    sourceTokenSetHashes: [left.sourceTokenSetHash, right.sourceTokenSetHash]
      .sort((a, b) => a.localeCompare(b)),
  };
  const evidenceHash = hashStarcraftTmgContract(evidence);
  return {
    pairId: `semantic-pair:${evidenceHash.slice(0, 20)}`,
    ...evidence,
    evidenceHash,
    autoMergeAllowed: false,
    requiresHumanSemanticReview: true,
  };
}

function candidateGroups(pairs, rowById) {
  const parent = new Map();
  const find = (value) => {
    if (!parent.has(value)) parent.set(value, value);
    if (parent.get(value) !== value) parent.set(value, find(parent.get(value)));
    return parent.get(value);
  };
  const union = (left, right) => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(rightRoot, leftRoot);
  };
  for (const pair of pairs) union(pair.localClauseIds[0], pair.localClauseIds[1]);
  const idsByRoot = new Map();
  for (const clauseId of parent.keys()) {
    const root = find(clauseId);
    if (!idsByRoot.has(root)) idsByRoot.set(root, []);
    idsByRoot.get(root).push(clauseId);
  }
  return [...idsByRoot.values()].map((rawIds) => {
    const localClauseIds = rawIds.sort((left, right) => left.localeCompare(right));
    const memberPairs = pairs.filter((pair) => (
      pair.localClauseIds.every((clauseId) => localClauseIds.includes(clauseId))
    ));
    const identityHash = hashStarcraftTmgContract({
      localClauseIds,
      pairEvidenceHashes: memberPairs.map((pair) => pair.evidenceHash)
        .sort((left, right) => left.localeCompare(right)),
    });
    return {
      groupId: `semantic-candidate:${identityHash.slice(0, 20)}`,
      localClauseIds,
      localClauseCount: localClauseIds.length,
      pairIds: memberPairs.map((pair) => pair.pairId)
        .sort((left, right) => left.localeCompare(right)),
      evidenceKinds: [...new Set(memberPairs.map((pair) => pair.evidenceKind))]
        .sort((left, right) => left.localeCompare(right)),
      semanticClasses: [...new Set(localClauseIds.map((id) => rowById.get(id).semanticClass))],
      dispositions: [...new Set(localClauseIds.map((id) => rowById.get(id).disposition))],
      sourceParts: [...new Set(localClauseIds.map((id) => rowById.get(id).sourcePart))]
        .sort((left, right) => Number(left) - Number(right)),
      autoMergeAllowed: false,
      requiresHumanSemanticReview: true,
    };
  }).sort((left, right) => left.groupId.localeCompare(right.groupId));
}

function expansionBody(expansion) {
  return without(expansion, ["expansionHash"]);
}

export function createGlobalCanonicalClauseSemanticCandidateExpansionV1(input = {}) {
  verifyFrozenPlan(input.plan);
  verifyPreviousBatch(input.plan, input.previousBatch);
  const corpus = normalizedCorpus(input.plan, input.reviewCorpus);
  const previouslyReviewed = new Set(input.previousBatch.canonicalClauses.flatMap((clause) => (
    clause.sourceLocalClauseIds
  )));
  const remaining = corpus.filter((row) => !previouslyReviewed.has(row.localClauseId));
  const candidatePairs = [];
  for (let leftIndex = 0; leftIndex < remaining.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < remaining.length; rightIndex += 1) {
      const pair = candidatePair(remaining[leftIndex], remaining[rightIndex]);
      if (pair) candidatePairs.push(pair);
    }
  }
  candidatePairs.sort((left, right) => left.pairId.localeCompare(right.pairId));
  const rowById = new Map(corpus.map((row) => [row.localClauseId, row]));
  const groups = candidateGroups(candidatePairs, rowById);
  const reviewCorpusHash = hashStarcraftTmgContract({
    clauses: corpus.map((row) => ({
      localClauseId: row.localClauseId,
      sourceIdentitySetHash: row.sourceIdentitySetHash,
      normalizedCharacterHash: row.normalizedCharacterHash,
      normalizedCharacterCount: row.normalizedCharacterCount,
      sourceTokenSetHash: row.sourceTokenSetHash,
      sourceTokenCount: row.sourceTokenCount,
    })),
  });
  const body = {
    schema: EXPANSION_SCHEMA,
    globalMergePlanHash: input.plan.planHash,
    previousBatchHash: input.previousBatch.batchHash,
    reviewCorpusHash,
    reviewCorpusClauseCount: corpus.length,
    heuristic: {
      exactNormalizedCharacterMinimum: EXACT_CHARACTER_MINIMUM,
      nearMinimumIntersectionTokenCount: NEAR_MINIMUM_INTERSECTION,
      nearJaccardMinimum: {
        numerator: NEAR_JACCARD_NUMERATOR,
        denominator: NEAR_JACCARD_DENOMINATOR,
      },
      nearContainmentMinimum: {
        numerator: NEAR_CONTAINMENT_NUMERATOR,
        denominator: NEAR_CONTAINMENT_DENOMINATOR,
      },
      sameSourceAnchorExcluded: true,
      sameSemanticClassRequired: true,
      sameDispositionRequired: true,
      autoMergeAllowed: false,
    },
    candidatePairs,
    candidateGroups: groups,
    reviewedLocalClauseCount: input.previousBatch.reviewedLocalClauseCount,
    remainingLocalClauseCount: input.previousBatch.remainingLocalClauseCount,
    globalCanonicalClauseCount: null,
    expansionStatus: "semantic_candidates_require_human_review",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
    blocks: [
      "human_semantic_candidate_review_pending",
      "remaining_global_canonical_mapping_pending",
      "rule_atom_mapping_pending",
      "executor_judge_and_replay_pending",
    ],
  };
  return deepFreeze({ ...body, expansionHash: hashStarcraftTmgContract(body) });
}

export function verifyGlobalCanonicalClauseSemanticCandidateExpansionV1(input = {}) {
  if (!object(input.expansion) || input.expansion.schema !== EXPANSION_SCHEMA) {
    fail("semantic_candidate_expansion_invalid");
  }
  if (hashStarcraftTmgContract(expansionBody(input.expansion)) !== input.expansion.expansionHash) {
    fail("semantic_candidate_expansion_hash_mismatch");
  }
  const expected = createGlobalCanonicalClauseSemanticCandidateExpansionV1(input);
  if (!isDeepStrictEqual(input.expansion, expected)) {
    fail("semantic_candidate_expansion_content_mismatch");
  }
  const planCoreIds = new Set(input.plan.localClauseIndex
    .filter((row) => row.sourceKind === "core_pdf")
    .map((row) => row.localClauseId));
  const corpusIds = input.reviewCorpus.map((row) => row.localClauseId);
  const candidateRefs = input.expansion.candidateGroups.flatMap((group) => group.localClauseIds);
  const uniqueCandidateRefs = new Set(candidateRefs);
  return deepFreeze({
    valid: true,
    counts: {
      reviewCorpusClauses: corpusIds.length,
      missingPlanClauses: [...planCoreIds].filter((id) => !corpusIds.includes(id)).length,
      unknownReviewCorpusClauses: corpusIds.filter((id) => !planCoreIds.has(id)).length,
      sourceHashMismatches: 0,
      previouslyReviewedLocalClauses: input.previousBatch.reviewedLocalClauseCount,
      remainingCoreLocalClauses: planCoreIds.size - input.previousBatch.reviewedLocalClauseCount,
      candidatePairs: input.expansion.candidatePairs.length,
      candidateGroups: input.expansion.candidateGroups.length,
      candidateLocalClauseRefs: candidateRefs.length,
      uniqueCandidateLocalClauses: uniqueCandidateRefs.size,
      overlappingCandidateGroups: candidateRefs.length - uniqueCandidateRefs.size,
    },
  });
}

function normalizeReviewTitle(value) {
  return String(value || "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim();
}

function titleTokenSet(value) {
  return new Set(normalizeReviewTitle(value)
    .split(/\s+/u)
    .filter((token) => token && !TITLE_STOP_WORDS.has(token)));
}

function verifyContainmentBatchChain(plan, previousBatches) {
  if (!Array.isArray(previousBatches) || previousBatches.length !== 2) {
    fail("containment_candidate_previous_batch_chain_invalid");
  }
  const [firstBatch, secondBatch] = previousBatches;
  if (firstBatch?.schema !== BATCH_SCHEMA
    || firstBatch?.batchHash !== EXPECTED_PREVIOUS_BATCH_HASH
    || secondBatch?.schema !== SEMANTIC_BATCH_SCHEMA
    || secondBatch?.batchHash !== EXPECTED_SECOND_BATCH_HASH) {
    fail("containment_candidate_previous_batch_chain_invalid");
  }
  verifyPreviousBatch(plan, firstBatch);
  if (!object(secondBatch) || secondBatch.schema !== SEMANTIC_BATCH_SCHEMA
    || hashStarcraftTmgContract(without(secondBatch, ["batchHash"])) !== secondBatch.batchHash
    || secondBatch.batchHash !== EXPECTED_SECOND_BATCH_HASH
    || secondBatch.globalMergePlanHash !== plan.planHash
    || secondBatch.previousBatchHash !== firstBatch.batchHash
    || secondBatch.cumulativeReviewedLocalClauseCount !== 82
    || secondBatch.remainingLocalClauseCount !== 1011
    || secondBatch.globalCanonicalClauseCount !== null
    || secondBatch.rulesEligible !== false
    || secondBatch.trainingTruth !== false) {
    fail("containment_candidate_previous_batch_chain_invalid");
  }
  return { firstBatch, secondBatch };
}

function containmentCandidatePair(left, right) {
  if (left.sourceAnchorId === right.sourceAnchorId
    || left.semanticClass !== right.semanticClass
    || left.disposition !== right.disposition) return null;
  const shorterCharacterCount = Math.min(left.normalizedCharacterCount, right.normalizedCharacterCount);
  const longerCharacterCount = Math.max(left.normalizedCharacterCount, right.normalizedCharacterCount);
  const shorterCharacters = left.normalizedCharacterCount <= right.normalizedCharacterCount
    ? left.characters
    : right.characters;
  const longerCharacters = left.normalizedCharacterCount <= right.normalizedCharacterCount
    ? right.characters
    : left.characters;
  const normalizedCharacterContainment = shorterCharacterCount >= CHARACTER_CONTAINMENT_MINIMUM
    && shorterCharacterCount * CHARACTER_CONTAINMENT_RATIO_DENOMINATOR
      >= longerCharacterCount * CHARACTER_CONTAINMENT_RATIO_NUMERATOR
    && longerCharacters.includes(shorterCharacters);

  let intersectionTokenCount = 0;
  for (const token of left.tokens) if (right.tokens.has(token)) intersectionTokenCount += 1;
  const smallerTokenCount = Math.min(left.sourceTokenCount, right.sourceTokenCount);
  const largerTokenCount = Math.max(left.sourceTokenCount, right.sourceTokenCount);
  const unionTokenCount = new Set([...left.tokens, ...right.tokens]).size;
  const sourceTokenFullContainment = intersectionTokenCount >= TOKEN_FULL_CONTAINMENT_MINIMUM
    && intersectionTokenCount === smallerTokenCount
    && smallerTokenCount * TOKEN_SIZE_RATIO_DENOMINATOR
      >= largerTokenCount * TOKEN_SIZE_RATIO_NUMERATOR;

  let titleIntersectionTokenCount = 0;
  for (const token of left.titleTokens) if (right.titleTokens.has(token)) titleIntersectionTokenCount += 1;
  const titleUnionTokenCount = new Set([...left.titleTokens, ...right.titleTokens]).size;
  const semanticTitleNearEquivalence = titleIntersectionTokenCount >= TITLE_INTERSECTION_MINIMUM
    && titleIntersectionTokenCount * TITLE_JACCARD_DENOMINATOR
      >= titleUnionTokenCount * TITLE_JACCARD_NUMERATOR;
  if (!normalizedCharacterContainment
    && !sourceTokenFullContainment
    && !semanticTitleNearEquivalence) return null;

  const localClauseIds = [left.localClauseId, right.localClauseId]
    .sort((a, b) => a.localeCompare(b));
  const evidenceKinds = [
    normalizedCharacterContainment ? "normalized_character_containment" : null,
    sourceTokenFullContainment ? "source_token_full_containment" : null,
    semanticTitleNearEquivalence ? "semantic_title_near_equivalence" : null,
  ].filter(Boolean);
  const evidenceKind = evidenceKinds[0];
  const evidence = {
    evidenceKind,
    evidenceKinds,
    localClauseIds,
    semanticClass: left.semanticClass,
    disposition: left.disposition,
    normalizedCharacterContainment,
    shorterCharacterCount,
    longerCharacterCount,
    sourceTokenFullContainment,
    intersectionTokenCount,
    unionTokenCount,
    smallerTokenCount,
    largerTokenCount,
    semanticTitleNearEquivalence,
    titleIntersectionTokenCount,
    titleUnionTokenCount,
    normalizedCharacterHashes: [left.normalizedCharacterHash, right.normalizedCharacterHash]
      .sort((a, b) => a.localeCompare(b)),
    sourceTokenSetHashes: [left.sourceTokenSetHash, right.sourceTokenSetHash]
      .sort((a, b) => a.localeCompare(b)),
    semanticTitleHashes: [left.semanticTitleHash, right.semanticTitleHash]
      .sort((a, b) => a.localeCompare(b)),
  };
  const evidenceHash = hashStarcraftTmgContract(evidence);
  return {
    pairId: `containment-pair:${evidenceHash.slice(0, 20)}`,
    ...evidence,
    evidenceHash,
    autoMergeAllowed: false,
    requiresHumanSemanticReview: true,
  };
}

function containmentExpansionBody(expansion) {
  return without(expansion, ["expansionHash"]);
}

export function createGlobalCanonicalClauseContainmentCandidateExpansionV1(input = {}) {
  verifyFrozenPlan(input.plan);
  const { firstBatch, secondBatch } = verifyContainmentBatchChain(
    input.plan,
    input.previousBatches,
  );
  const corpus = normalizedCorpus(input.plan, input.reviewCorpus);
  const rawRowById = new Map(input.reviewCorpus.map((row) => [row.localClauseId, row]));
  const planRowById = new Map(input.plan.localClauseIndex.map((row) => [row.localClauseId, row]));
  const enrichedCorpus = corpus.map((row) => {
    const rawRow = rawRowById.get(row.localClauseId);
    const normalizedTitle = normalizeReviewTitle(rawRow?.title);
    const semanticTitleHash = hashStarcraftTmgContract({ normalizedTitle });
    if (!normalizedTitle || semanticTitleHash !== planRowById.get(row.localClauseId)?.semanticTitleHash) {
      fail("containment_candidate_semantic_title_hash_mismatch", row.localClauseId);
    }
    return {
      ...row,
      semanticTitleHash,
      titleTokens: titleTokenSet(rawRow.title),
    };
  });
  const previouslyReviewed = new Set([...firstBatch.canonicalClauses, ...secondBatch.canonicalClauses]
    .flatMap((clause) => clause.sourceLocalClauseIds));
  if (previouslyReviewed.size !== secondBatch.cumulativeReviewedLocalClauseCount) {
    fail("containment_candidate_previous_batch_local_coverage_invalid");
  }
  const remaining = enrichedCorpus.filter((row) => !previouslyReviewed.has(row.localClauseId));
  const pairs = [];
  for (let leftIndex = 0; leftIndex < remaining.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < remaining.length; rightIndex += 1) {
      const pair = containmentCandidatePair(remaining[leftIndex], remaining[rightIndex]);
      if (pair) pairs.push(pair);
    }
  }
  pairs.sort((left, right) => left.pairId.localeCompare(right.pairId));
  const rowById = new Map(enrichedCorpus.map((row) => [row.localClauseId, row]));
  const groups = candidateGroups(pairs, rowById).map((group) => ({
    ...group,
    groupId: group.groupId.replace("semantic-candidate:", "containment-candidate:"),
    evidenceKinds: [...new Set(pairs
      .filter((pair) => pair.localClauseIds.every((id) => group.localClauseIds.includes(id)))
      .flatMap((pair) => pair.evidenceKinds))].sort((left, right) => left.localeCompare(right)),
  })).sort((left, right) => left.groupId.localeCompare(right.groupId));
  const reviewCorpusHash = hashStarcraftTmgContract({
    clauses: enrichedCorpus.map((row) => ({
      localClauseId: row.localClauseId,
      sourceIdentitySetHash: row.sourceIdentitySetHash,
      normalizedCharacterHash: row.normalizedCharacterHash,
      normalizedCharacterCount: row.normalizedCharacterCount,
      sourceTokenSetHash: row.sourceTokenSetHash,
      sourceTokenCount: row.sourceTokenCount,
      semanticTitleHash: row.semanticTitleHash,
    })),
  });
  const body = {
    schema: CONTAINMENT_EXPANSION_SCHEMA,
    globalMergePlanHash: input.plan.planHash,
    previousBatchHashes: [firstBatch.batchHash, secondBatch.batchHash],
    reviewCorpusHash,
    reviewCorpusClauseCount: enrichedCorpus.length,
    heuristic: {
      normalizedCharacterContainment: {
        minimumCharacterCount: CHARACTER_CONTAINMENT_MINIMUM,
        minimumSizeRatio: {
          numerator: CHARACTER_CONTAINMENT_RATIO_NUMERATOR,
          denominator: CHARACTER_CONTAINMENT_RATIO_DENOMINATOR,
        },
      },
      sourceTokenFullContainment: {
        minimumIntersectionTokenCount: TOKEN_FULL_CONTAINMENT_MINIMUM,
        minimumSizeRatio: {
          numerator: TOKEN_SIZE_RATIO_NUMERATOR,
          denominator: TOKEN_SIZE_RATIO_DENOMINATOR,
        },
      },
      semanticTitleNearEquivalence: {
        minimumIntersectionTokenCount: TITLE_INTERSECTION_MINIMUM,
        minimumJaccard: {
          numerator: TITLE_JACCARD_NUMERATOR,
          denominator: TITLE_JACCARD_DENOMINATOR,
        },
      },
      sameSourceAnchorExcluded: true,
      sameSemanticClassRequired: true,
      sameDispositionRequired: true,
      autoMergeAllowed: false,
    },
    candidatePairs: pairs,
    candidateGroups: groups,
    reviewedLocalClauseCount: secondBatch.cumulativeReviewedLocalClauseCount,
    remainingLocalClauseCount: secondBatch.remainingLocalClauseCount,
    globalCanonicalClauseCount: null,
    expansionStatus: "containment_and_title_candidates_require_human_review",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
    blocks: [
      "human_containment_candidate_review_pending",
      "remaining_global_canonical_mapping_pending",
      "rule_atom_mapping_pending",
      "executor_judge_and_replay_pending",
    ],
  };
  return deepFreeze({ ...body, expansionHash: hashStarcraftTmgContract(body) });
}

export function verifyGlobalCanonicalClauseContainmentCandidateExpansionV1(input = {}) {
  if (!object(input.expansion) || input.expansion.schema !== CONTAINMENT_EXPANSION_SCHEMA) {
    fail("containment_candidate_expansion_invalid");
  }
  if (hashStarcraftTmgContract(containmentExpansionBody(input.expansion))
    !== input.expansion.expansionHash) {
    fail("containment_candidate_expansion_hash_mismatch");
  }
  const expected = createGlobalCanonicalClauseContainmentCandidateExpansionV1(input);
  if (!isDeepStrictEqual(input.expansion, expected)) {
    fail("containment_candidate_expansion_content_mismatch");
  }
  const candidateRefs = input.expansion.candidateGroups.flatMap((group) => group.localClauseIds);
  const uniqueCandidateRefs = new Set(candidateRefs);
  const secondBatch = input.previousBatches[1];
  return deepFreeze({
    valid: true,
    counts: {
      reviewCorpusClauses: input.reviewCorpus.length,
      sourceHashMismatches: 0,
      semanticTitleHashMismatches: 0,
      previouslyReviewedLocalClauses: secondBatch.cumulativeReviewedLocalClauseCount,
      remainingCoreLocalClauses: 1090 - secondBatch.cumulativeReviewedLocalClauseCount,
      candidatePairs: input.expansion.candidatePairs.length,
      candidateGroups: input.expansion.candidateGroups.length,
      candidateLocalClauseRefs: candidateRefs.length,
      uniqueCandidateLocalClauses: uniqueCandidateRefs.size,
      overlappingCandidateGroups: candidateRefs.length - uniqueCandidateRefs.size,
    },
  });
}
