import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

const EXPANSION_SCHEMA = "starcraft_tmg_global_canonical_clause_residual_candidate_expansion_v1";
const SUPPLEMENT_SCHEMA = "starcraft_tmg_global_canonical_clause_residual_candidate_supplement_v1";
const PLAN_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_plan_v1";
const FIRST_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_merge_batch_v1";
const SECOND_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_semantic_merge_batch_v1";
const THIRD_BATCH_SCHEMA = "starcraft_tmg_global_canonical_clause_containment_merge_batch_v1";
const FAQ_SCHEMA = "starcraft_tmg_official_faq_supplemental_clause_reconciliation_v3";
const EXPECTED_PLAN_HASH = "8068f9635e473d3a4c72849aacb997a87365d46c8e5479d877bf1c68bbee4618";
const EXPECTED_BATCH_HASHES = Object.freeze([
  "f881fdc48a64f7be2506abf36e4c5d10a1c668054848a34441678ecd108c83e2",
  "c5eda2ecb1ee817520579eba5f6d9cf364872b4d2b86c14034aa61e1bb702f5f",
  "1c99facab4bca696ea97927e9f6ff788ff0efd7bd960f5decbf1887dbea27d97",
]);
const EXPECTED_FAQ_HASH = "6d1e52f52c47f002cc0dfcb0701041ebbbae7044c7c6aeb096a81073ba5d3b40";
const CHARACTER_CONTAINMENT_MINIMUM = 32;
const CHARACTER_SIZE_RATIO_NUMERATOR = 25;
const CHARACTER_SIZE_RATIO_DENOMINATOR = 100;
const SOURCE_TOKEN_INTERSECTION_MINIMUM = 5;
const SOURCE_TOKEN_JACCARD_NUMERATOR = 50;
const SOURCE_TOKEN_JACCARD_DENOMINATOR = 100;
const SOURCE_TOKEN_CONTAINMENT_NUMERATOR = 85;
const SOURCE_TOKEN_CONTAINMENT_DENOMINATOR = 100;
const TITLE_INTERSECTION_MINIMUM = 2;
const TITLE_JACCARD_NUMERATOR = 60;
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

function text(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
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
  return String(value || "").normalize("NFC").toLowerCase().replace(/[^a-z0-9]+/gu, "");
}

function tokenSet(value) {
  return new Set(String(value || "").normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter((token) => token.length > 1));
}

function titleTokenSet(value) {
  return new Set(String(value || "").normalize("NFC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter((token) => token && !TITLE_STOP_WORDS.has(token)));
}

function verifyPlan(plan) {
  if (!object(plan) || plan.schema !== PLAN_SCHEMA
    || hashStarcraftTmgContract(without(plan, ["planHash"])) !== plan.planHash
    || plan.planHash !== EXPECTED_PLAN_HASH
    || plan.counts?.localClauses !== 1093
    || plan.counts?.coreLocalClauses !== 1090
    || plan.counts?.faqLocalClauses !== 3
    || plan.globalCanonicalClauseCount !== null
    || plan.rulesEligible !== false
    || plan.trainingTruth !== false) {
    fail("residual_candidate_plan_dependency_mismatch");
  }
}

function verifyPreviousBatchChain(plan, previousBatches) {
  if (!Array.isArray(previousBatches) || previousBatches.length !== 3) {
    fail("residual_candidate_previous_batch_chain_invalid");
  }
  const expectedSchemas = [FIRST_BATCH_SCHEMA, SECOND_BATCH_SCHEMA, THIRD_BATCH_SCHEMA];
  for (let index = 0; index < previousBatches.length; index += 1) {
    const batch = previousBatches[index];
    if (!object(batch) || batch.schema !== expectedSchemas[index]
      || hashStarcraftTmgContract(without(batch, ["batchHash"])) !== batch.batchHash
      || batch.batchHash !== EXPECTED_BATCH_HASHES[index]
      || batch.globalMergePlanHash !== plan.planHash
      || batch.globalCanonicalClauseCount !== null
      || batch.rulesEligible !== false
      || batch.trainingTruth !== false) {
      fail("residual_candidate_previous_batch_chain_invalid");
    }
  }
  const [first, second, third] = previousBatches;
  if (first.reviewedLocalClauseCount !== 28
    || first.batchCanonicalClauseCount !== 16
    || first.remainingLocalClauseCount !== 1065
    || second.previousBatchHash !== first.batchHash
    || second.cumulativeReviewedLocalClauseCount !== 82
    || second.cumulativeCanonicalClauseCount !== 49
    || second.remainingLocalClauseCount !== 1011
    || third.previousBatchHash !== second.batchHash
    || third.cumulativeReviewedLocalClauseCount !== 151
    || third.cumulativeCanonicalClauseCount !== 111
    || third.remainingLocalClauseCount !== 942) {
    fail("residual_candidate_previous_batch_chain_invalid");
  }
  const canonicalClauses = previousBatches.flatMap((batch) => batch.canonicalClauses);
  const canonicalIds = canonicalClauses.map((clause) => clause.canonicalClauseId);
  const localIds = canonicalClauses.flatMap((clause) => clause.sourceLocalClauseIds);
  if (canonicalClauses.length !== 111
    || new Set(canonicalIds).size !== canonicalIds.length
    || localIds.length !== 151
    || new Set(localIds).size !== localIds.length) {
    fail("residual_candidate_previous_batch_chain_invalid");
  }
  const canonicalByLocalId = new Map();
  for (const clause of canonicalClauses) {
    for (const localClauseId of clause.sourceLocalClauseIds) {
      canonicalByLocalId.set(localClauseId, clause.canonicalClauseId);
    }
  }
  return { canonicalClauses, canonicalByLocalId };
}

function coreCorpusRows(plan, coreReviewCorpus) {
  if (!Array.isArray(coreReviewCorpus)) fail("residual_candidate_core_review_corpus_required");
  const planRows = plan.localClauseIndex.filter((row) => row.sourceKind === "core_pdf");
  const planRowById = new Map(planRows.map((row) => [row.localClauseId, row]));
  const seen = new Set();
  const rows = [];
  for (const rawRow of coreReviewCorpus) {
    if (!object(rawRow)) fail("residual_candidate_core_review_corpus_row_invalid");
    const localClauseId = text(
      rawRow.localClauseId,
      "residual_candidate_core_review_corpus_clause_id_required",
    );
    const planRow = planRowById.get(localClauseId);
    if (!planRow) fail("residual_candidate_core_review_corpus_clause_unknown", localClauseId);
    if (seen.has(localClauseId)) fail("residual_candidate_core_review_corpus_clause_duplicate", localClauseId);
    seen.add(localClauseId);
    if (rawRow.sourcePart !== planRow.sourcePart
      || rawRow.sourceAnchorId !== planRow.sourceAnchorId
      || rawRow.semanticClass !== planRow.semanticClass
      || rawRow.disposition !== planRow.disposition) {
      fail("residual_candidate_core_review_corpus_metadata_mismatch", localClauseId);
    }
    const normalizedTitle = String(rawRow.title || "")
      .normalize("NFC").toLowerCase().replace(/[^a-z0-9]+/gu, " ").trim();
    if (!normalizedTitle
      || hashStarcraftTmgContract({ normalizedTitle }) !== planRow.semanticTitleHash) {
      fail("residual_candidate_semantic_title_hash_mismatch", localClauseId);
    }
    if (!Array.isArray(rawRow.sourceCandidates) || rawRow.sourceCandidates.length === 0) {
      fail("residual_candidate_source_candidates_required", localClauseId);
    }
    const seenCandidates = new Set();
    const candidates = rawRow.sourceCandidates.map((candidate) => {
      if (!object(candidate)) fail("residual_candidate_source_candidate_invalid", localClauseId);
      const clauseCandidateId = text(
        candidate.clauseCandidateId,
        "residual_candidate_source_candidate_id_required",
      );
      if (seenCandidates.has(clauseCandidateId)) {
        fail("residual_candidate_source_candidate_duplicate", clauseCandidateId);
      }
      seenCandidates.add(clauseCandidateId);
      const sourceText = typeof candidate.text === "string" ? candidate.text : "";
      const sourceTextHash = text(
        candidate.sourceTextHash,
        "residual_candidate_source_text_hash_required",
      );
      if (!/^[a-f0-9]{64}$/u.test(sourceTextHash) || sha256Text(sourceText) !== sourceTextHash) {
        fail("residual_candidate_source_text_hash_mismatch", clauseCandidateId);
      }
      return { clauseCandidateId, sourceTextHash, sourceText };
    }).sort((left, right) => left.clauseCandidateId.localeCompare(right.clauseCandidateId));
    const sourceTextHashes = candidates.map((candidate) => candidate.sourceTextHash)
      .sort((left, right) => left.localeCompare(right));
    if (hashStarcraftTmgContract({ sourceTextHashes }) !== planRow.sourceIdentitySetHash) {
      fail("residual_candidate_source_identity_mismatch", localClauseId);
    }
    const sourceDocument = candidates.map((candidate) => candidate.sourceText).join("\n");
    const characters = normalizedCharacters(sourceDocument);
    const sourceTokens = tokenSet(sourceDocument);
    rows.push({
      ...planRow,
      normalizedCharacterHash: hashStarcraftTmgContract({ characters }),
      normalizedCharacterCount: characters.length,
      sourceTokenSetHash: hashStarcraftTmgContract({ tokens: [...sourceTokens].sort() }),
      sourceTokenCount: sourceTokens.size,
      characters,
      sourceTokens,
      titleTokens: titleTokenSet(rawRow.title),
    });
  }
  if (seen.size !== planRows.length || planRows.some((row) => !seen.has(row.localClauseId))) {
    fail("residual_candidate_core_review_corpus_incomplete");
  }
  return rows.sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
}

function faqCorpusRows(plan, faqSupplemental) {
  if (!object(faqSupplemental) || faqSupplemental.schema !== FAQ_SCHEMA
    || hashStarcraftTmgContract(without(faqSupplemental, ["reconciliationHash"]))
      !== faqSupplemental.reconciliationHash
    || faqSupplemental.reconciliationHash !== EXPECTED_FAQ_HASH
    || plan.faqSupplementalReconciliationHash !== faqSupplemental.reconciliationHash
    || !Array.isArray(faqSupplemental.supplementalClauses)
    || faqSupplemental.supplementalClauses.length !== 3
    || faqSupplemental.globalCanonicalClauseCount !== null
    || faqSupplemental.rulesEligible !== false
    || faqSupplemental.trainingTruth !== false) {
    fail("residual_candidate_faq_dependency_mismatch");
  }
  const planRows = plan.localClauseIndex.filter((row) => (
    row.sourceKind === "official_faq_supplement"
  ));
  const planRowById = new Map(planRows.map((row) => [row.localClauseId, row]));
  const seen = new Set();
  const rows = [];
  for (const clause of faqSupplemental.supplementalClauses) {
    const planRow = planRowById.get(clause.clauseId);
    if (!planRow || seen.has(clause.clauseId)
      || hashStarcraftTmgContract({
        sourceAnswerHash: clause.sourceAnswerHash,
        sourceClaimCode: clause.sourceClaimCode,
      }) !== planRow.sourceIdentitySetHash
      || hashStarcraftTmgContract({
        semanticKind: clause.semanticKind,
        semanticValue: clause.semanticValue,
      }) !== planRow.semanticTitleHash
      || clause.sourceEntryId !== planRow.sourceAnchorId
      || clause.semanticKind !== planRow.semanticClass
      || clause.disposition !== planRow.disposition
      || clause.executable !== false
      || clause.trainingTruth !== false) {
      fail("residual_candidate_faq_dependency_mismatch", clause.clauseId);
    }
    seen.add(clause.clauseId);
    const sourceDocument = JSON.stringify({
      sourceClaimCode: clause.sourceClaimCode,
      semanticValue: clause.semanticValue,
    });
    const titleDocument = `${clause.semanticKind} ${clause.sourceClaimCode}`;
    const characters = normalizedCharacters(sourceDocument);
    const sourceTokens = tokenSet(sourceDocument);
    rows.push({
      ...planRow,
      normalizedCharacterHash: hashStarcraftTmgContract({ characters }),
      normalizedCharacterCount: characters.length,
      sourceTokenSetHash: hashStarcraftTmgContract({ tokens: [...sourceTokens].sort() }),
      sourceTokenCount: sourceTokens.size,
      characters,
      sourceTokens,
      titleTokens: titleTokenSet(titleDocument),
    });
  }
  if (seen.size !== planRows.length || planRows.some((row) => !seen.has(row.localClauseId))) {
    fail("residual_candidate_faq_dependency_mismatch");
  }
  return rows.sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
}

function heuristicPair(left, right, canonicalByLocalId) {
  const leftMapped = canonicalByLocalId.has(left.localClauseId);
  const rightMapped = canonicalByLocalId.has(right.localClauseId);
  if ((leftMapped && rightMapped)
    || left.sourceAnchorId === right.sourceAnchorId
    || left.semanticClass !== right.semanticClass
    || left.disposition !== right.disposition) return null;
  const shorter = left.normalizedCharacterCount <= right.normalizedCharacterCount ? left : right;
  const longer = shorter === left ? right : left;
  const normalizedCharacterContainment = shorter.normalizedCharacterCount
      >= CHARACTER_CONTAINMENT_MINIMUM
    && shorter.normalizedCharacterCount * CHARACTER_SIZE_RATIO_DENOMINATOR
      >= longer.normalizedCharacterCount * CHARACTER_SIZE_RATIO_NUMERATOR
    && longer.characters.includes(shorter.characters);
  let sourceIntersectionTokenCount = 0;
  for (const token of left.sourceTokens) {
    if (right.sourceTokens.has(token)) sourceIntersectionTokenCount += 1;
  }
  const sourceUnionTokenCount = new Set([...left.sourceTokens, ...right.sourceTokens]).size;
  const smallerSourceTokenCount = Math.min(left.sourceTokenCount, right.sourceTokenCount);
  const sourceTokenOverlap = sourceIntersectionTokenCount >= SOURCE_TOKEN_INTERSECTION_MINIMUM
    && (sourceIntersectionTokenCount * SOURCE_TOKEN_JACCARD_DENOMINATOR
        >= sourceUnionTokenCount * SOURCE_TOKEN_JACCARD_NUMERATOR
      || sourceIntersectionTokenCount * SOURCE_TOKEN_CONTAINMENT_DENOMINATOR
        >= smallerSourceTokenCount * SOURCE_TOKEN_CONTAINMENT_NUMERATOR);
  let titleIntersectionTokenCount = 0;
  for (const token of left.titleTokens) {
    if (right.titleTokens.has(token)) titleIntersectionTokenCount += 1;
  }
  const titleUnionTokenCount = new Set([...left.titleTokens, ...right.titleTokens]).size;
  const semanticTitleOverlap = titleIntersectionTokenCount >= TITLE_INTERSECTION_MINIMUM
    && titleIntersectionTokenCount * TITLE_JACCARD_DENOMINATOR
      >= titleUnionTokenCount * TITLE_JACCARD_NUMERATOR;
  if (!normalizedCharacterContainment && !sourceTokenOverlap && !semanticTitleOverlap) return null;
  const localClauseIds = [left.localClauseId, right.localClauseId]
    .sort((a, b) => a.localeCompare(b));
  const evidenceKinds = [
    normalizedCharacterContainment ? "normalized_character_containment" : null,
    sourceTokenOverlap ? "source_token_overlap" : null,
    semanticTitleOverlap ? "semantic_title_overlap" : null,
  ].filter(Boolean);
  const evidence = {
    evidenceKind: evidenceKinds[0],
    evidenceKinds,
    candidateOrigin: "bounded_residual_heuristic",
    localClauseIds,
    semanticClass: left.semanticClass,
    disposition: left.disposition,
    normalizedCharacterContainment,
    shorterCharacterCount: shorter.normalizedCharacterCount,
    longerCharacterCount: longer.normalizedCharacterCount,
    sourceTokenOverlap,
    sourceIntersectionTokenCount,
    sourceUnionTokenCount,
    smallerSourceTokenCount,
    semanticTitleOverlap,
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
    pairId: `residual-pair:${evidenceHash.slice(0, 20)}`,
    ...evidence,
    evidenceHash,
    autoMergeAllowed: false,
    requiresHumanSemanticReview: true,
  };
}

function supplementPairs(input, rowById, canonicalByLocalId, heuristicPairs) {
  const { plan, previousBatches, candidateSupplement } = input;
  if (!object(candidateSupplement) || candidateSupplement.schema !== SUPPLEMENT_SCHEMA
    || candidateSupplement.globalMergePlanHash !== plan.planHash
    || candidateSupplement.previousBatchHash !== previousBatches[2].batchHash
    || !Array.isArray(candidateSupplement.pairSpecs)
    || candidateSupplement.pairSpecs.length === 0) {
    fail("residual_candidate_supplement_dependency_mismatch");
  }
  const heuristicKeys = new Set(heuristicPairs.map((pair) => pair.localClauseIds.join("|")));
  const seenPairKeys = new Set();
  const normalizedSpecs = [];
  const pairs = [];
  for (const rawSpec of candidateSupplement.pairSpecs) {
    if (!object(rawSpec) || !Array.isArray(rawSpec.localClauseIds)
      || rawSpec.localClauseIds.length !== 2) {
      fail("residual_candidate_supplement_pair_invalid");
    }
    const localClauseIds = rawSpec.localClauseIds.map((id) => text(
      id,
      "residual_candidate_supplement_clause_id_required",
    )).sort((left, right) => left.localeCompare(right));
    if (localClauseIds[0] === localClauseIds[1]) {
      fail("residual_candidate_supplement_pair_invalid");
    }
    const pairKey = localClauseIds.join("|");
    if (seenPairKeys.has(pairKey)) fail("residual_candidate_supplement_pair_duplicate", pairKey);
    seenPairKeys.add(pairKey);
    const rows = localClauseIds.map((id) => {
      const row = rowById.get(id);
      if (!row) fail("residual_candidate_supplement_clause_unknown", id);
      return row;
    });
    if (heuristicKeys.has(pairKey)) fail("residual_candidate_supplement_pair_redundant", pairKey);
    if (rows[0].sourceAnchorId === rows[1].sourceAnchorId
      || rows[0].semanticClass !== rows[1].semanticClass
      || rows[0].disposition !== rows[1].disposition
      || rows.every((row) => canonicalByLocalId.has(row.localClauseId))) {
      fail("residual_candidate_supplement_pair_scope_invalid", pairKey);
    }
    const reviewBasisCode = text(
      rawSpec.reviewBasisCode,
      "residual_candidate_supplement_review_basis_required",
    );
    const evidence = {
      evidenceKind: "human_directed_residual_probe",
      evidenceKinds: ["human_directed_residual_probe"],
      candidateOrigin: "hash_bound_human_supplement",
      localClauseIds,
      semanticClass: rows[0].semanticClass,
      disposition: rows[0].disposition,
      reviewBasisCode,
      sourceIdentitySetHashes: rows.map((row) => row.sourceIdentitySetHash)
        .sort((left, right) => left.localeCompare(right)),
      semanticTitleHashes: rows.map((row) => row.semanticTitleHash)
        .sort((left, right) => left.localeCompare(right)),
    };
    const evidenceHash = hashStarcraftTmgContract(evidence);
    pairs.push({
      pairId: `residual-supplement-pair:${evidenceHash.slice(0, 20)}`,
      ...evidence,
      evidenceHash,
      autoMergeAllowed: false,
      requiresHumanSemanticReview: true,
    });
    normalizedSpecs.push({ localClauseIds, reviewBasisCode });
  }
  normalizedSpecs.sort((left, right) => (
    left.localClauseIds.join("|").localeCompare(right.localClauseIds.join("|"))
  ));
  pairs.sort((left, right) => left.pairId.localeCompare(right.pairId));
  return {
    supplementBindingHash: hashStarcraftTmgContract({
      schema: SUPPLEMENT_SCHEMA,
      globalMergePlanHash: plan.planHash,
      previousBatchHash: previousBatches[2].batchHash,
      pairSpecs: normalizedSpecs,
    }),
    pairs,
  };
}

function candidateGroups(pairs, rowById, canonicalByLocalId) {
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
  for (const localClauseId of parent.keys()) {
    const root = find(localClauseId);
    if (!idsByRoot.has(root)) idsByRoot.set(root, []);
    idsByRoot.get(root).push(localClauseId);
  }
  return [...idsByRoot.values()].map((rawIds) => {
    const localClauseIds = rawIds.sort((left, right) => left.localeCompare(right));
    const memberPairs = pairs.filter((pair) => (
      pair.localClauseIds.every((id) => localClauseIds.includes(id))
    ));
    const mappedLocalClauseIds = localClauseIds.filter((id) => canonicalByLocalId.has(id));
    const remainingLocalClauseIds = localClauseIds.filter((id) => !canonicalByLocalId.has(id));
    if (remainingLocalClauseIds.length === 0) fail("residual_candidate_mapped_only_group_invalid");
    const identityHash = hashStarcraftTmgContract({
      localClauseIds,
      pairEvidenceHashes: memberPairs.map((pair) => pair.evidenceHash)
        .sort((left, right) => left.localeCompare(right)),
    });
    return {
      groupId: `residual-candidate:${identityHash.slice(0, 20)}`,
      localClauseIds,
      localClauseCount: localClauseIds.length,
      mappedLocalClauseIds,
      remainingLocalClauseIds,
      existingCanonicalClauseIds: [...new Set(mappedLocalClauseIds.map((id) => (
        canonicalByLocalId.get(id)
      )))].sort((left, right) => left.localeCompare(right)),
      pairIds: memberPairs.map((pair) => pair.pairId)
        .sort((left, right) => left.localeCompare(right)),
      evidenceKinds: [...new Set(memberPairs.flatMap((pair) => pair.evidenceKinds))]
        .sort((left, right) => left.localeCompare(right)),
      candidateOrigins: [...new Set(memberPairs.map((pair) => pair.candidateOrigin))]
        .sort((left, right) => left.localeCompare(right)),
      semanticClasses: [...new Set(localClauseIds.map((id) => rowById.get(id).semanticClass))],
      dispositions: [...new Set(localClauseIds.map((id) => rowById.get(id).disposition))],
      sourceKinds: [...new Set(localClauseIds.map((id) => rowById.get(id).sourceKind))]
        .sort((left, right) => left.localeCompare(right)),
      sourceParts: [...new Set(localClauseIds.map((id) => rowById.get(id).sourcePart))]
        .sort((left, right) => String(left).localeCompare(String(right))),
      autoMergeAllowed: false,
      requiresHumanSemanticReview: true,
    };
  }).sort((left, right) => left.groupId.localeCompare(right.groupId));
}

function expansionBody(expansion) {
  return without(expansion, ["expansionHash"]);
}

export function createGlobalCanonicalClauseResidualCandidateExpansionV1(input = {}) {
  verifyPlan(input.plan);
  const { canonicalByLocalId } = verifyPreviousBatchChain(input.plan, input.previousBatches);
  const coreRows = coreCorpusRows(input.plan, input.coreReviewCorpus);
  const faqRows = faqCorpusRows(input.plan, input.faqSupplemental);
  const corpus = [...coreRows, ...faqRows]
    .sort((left, right) => left.localClauseId.localeCompare(right.localClauseId));
  const rowById = new Map(corpus.map((row) => [row.localClauseId, row]));
  if (corpus.length !== input.plan.counts.localClauses || rowById.size !== corpus.length) {
    fail("residual_candidate_local_denominator_incomplete");
  }
  const heuristicPairs = [];
  for (let leftIndex = 0; leftIndex < corpus.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < corpus.length; rightIndex += 1) {
      const pair = heuristicPair(corpus[leftIndex], corpus[rightIndex], canonicalByLocalId);
      if (pair) heuristicPairs.push(pair);
    }
  }
  heuristicPairs.sort((left, right) => left.pairId.localeCompare(right.pairId));
  const supplement = supplementPairs(input, rowById, canonicalByLocalId, heuristicPairs);
  const candidatePairs = [...heuristicPairs, ...supplement.pairs]
    .sort((left, right) => left.pairId.localeCompare(right.pairId));
  const groups = candidateGroups(candidatePairs, rowById, canonicalByLocalId);
  const reviewCorpusHash = hashStarcraftTmgContract({
    clauses: corpus.map((row) => ({
      localClauseId: row.localClauseId,
      sourceKind: row.sourceKind,
      sourceIdentitySetHash: row.sourceIdentitySetHash,
      normalizedCharacterHash: row.normalizedCharacterHash,
      normalizedCharacterCount: row.normalizedCharacterCount,
      sourceTokenSetHash: row.sourceTokenSetHash,
      sourceTokenCount: row.sourceTokenCount,
      semanticTitleHash: row.semanticTitleHash,
    })),
  });
  const body = {
    schema: EXPANSION_SCHEMA,
    globalMergePlanHash: input.plan.planHash,
    previousBatchHashes: input.previousBatches.map((batch) => batch.batchHash),
    reviewCorpusHash,
    reviewCorpusClauseCount: corpus.length,
    coreReviewCorpusClauseCount: coreRows.length,
    faqStructuredEvidenceClauseCount: faqRows.length,
    candidateSupplementBindingHash: supplement.supplementBindingHash,
    heuristic: {
      normalizedCharacterContainment: {
        minimumCharacterCount: CHARACTER_CONTAINMENT_MINIMUM,
        minimumSizeRatio: {
          numerator: CHARACTER_SIZE_RATIO_NUMERATOR,
          denominator: CHARACTER_SIZE_RATIO_DENOMINATOR,
        },
      },
      sourceTokenOverlap: {
        minimumIntersectionTokenCount: SOURCE_TOKEN_INTERSECTION_MINIMUM,
        minimumJaccard: {
          numerator: SOURCE_TOKEN_JACCARD_NUMERATOR,
          denominator: SOURCE_TOKEN_JACCARD_DENOMINATOR,
        },
        minimumSmallerSetContainment: {
          numerator: SOURCE_TOKEN_CONTAINMENT_NUMERATOR,
          denominator: SOURCE_TOKEN_CONTAINMENT_DENOMINATOR,
        },
      },
      semanticTitleOverlap: {
        minimumIntersectionTokenCount: TITLE_INTERSECTION_MINIMUM,
        minimumJaccard: {
          numerator: TITLE_JACCARD_NUMERATOR,
          denominator: TITLE_JACCARD_DENOMINATOR,
        },
      },
      sameSourceAnchorExcluded: true,
      sameSemanticClassRequired: true,
      sameDispositionRequired: true,
      mappedToMappedPairsExcluded: true,
      autoMergeAllowed: false,
    },
    heuristicCandidatePairCount: heuristicPairs.length,
    supplementCandidatePairCount: supplement.pairs.length,
    candidatePairs,
    candidateGroups: groups,
    reviewedLocalClauseCount: input.previousBatches[2].cumulativeReviewedLocalClauseCount,
    remainingLocalClauseCount: input.previousBatches[2].remainingLocalClauseCount,
    globalCanonicalClauseCount: null,
    expansionStatus: "residual_candidates_require_human_alias_extension_review",
    rulesEligible: false,
    canAffectRules: false,
    ctx2skillPromotionEligible: false,
    replayEligible: false,
    trainingTruth: false,
    blocks: [
      "human_residual_alias_extension_review_pending",
      "remaining_global_canonical_mapping_pending",
      "rule_atom_mapping_pending",
      "executor_judge_and_replay_pending",
    ],
  };
  return deepFreeze({ ...body, expansionHash: hashStarcraftTmgContract(body) });
}

export function verifyGlobalCanonicalClauseResidualCandidateExpansionV1(input = {}) {
  if (!object(input.expansion) || input.expansion.schema !== EXPANSION_SCHEMA) {
    fail("residual_candidate_expansion_invalid");
  }
  if (hashStarcraftTmgContract(expansionBody(input.expansion)) !== input.expansion.expansionHash) {
    fail("residual_candidate_expansion_hash_mismatch");
  }
  const expected = createGlobalCanonicalClauseResidualCandidateExpansionV1(input);
  if (!isDeepStrictEqual(input.expansion, expected)) {
    fail("residual_candidate_expansion_content_mismatch");
  }
  const candidateRefs = input.expansion.candidateGroups.flatMap((group) => group.localClauseIds);
  const uniqueCandidateRefs = new Set(candidateRefs);
  const mappedRefs = new Set(input.expansion.candidateGroups.flatMap((group) => (
    group.mappedLocalClauseIds
  )));
  const remainingRefs = new Set(input.expansion.candidateGroups.flatMap((group) => (
    group.remainingLocalClauseIds
  )));
  const mixedGroups = input.expansion.candidateGroups.filter((group) => (
    group.mappedLocalClauseIds.length > 0 && group.remainingLocalClauseIds.length > 0
  ));
  return deepFreeze({
    valid: true,
    counts: {
      coreReviewCorpusClauses: input.expansion.coreReviewCorpusClauseCount,
      faqStructuredEvidenceClauses: input.expansion.faqStructuredEvidenceClauseCount,
      localDenominatorClauses: input.expansion.reviewCorpusClauseCount,
      sourceHashMismatches: 0,
      semanticTitleHashMismatches: 0,
      previouslyReviewedLocalClauses: input.expansion.reviewedLocalClauseCount,
      remainingLocalClauses: input.expansion.remainingLocalClauseCount,
      heuristicCandidatePairs: input.expansion.heuristicCandidatePairCount,
      supplementCandidatePairs: input.expansion.supplementCandidatePairCount,
      candidatePairs: input.expansion.candidatePairs.length,
      candidateGroups: input.expansion.candidateGroups.length,
      candidateLocalClauseRefs: candidateRefs.length,
      uniqueCandidateLocalClauses: uniqueCandidateRefs.size,
      candidateMappedLocalClauses: mappedRefs.size,
      candidateRemainingLocalClauses: remainingRefs.size,
      mixedMappingStatusGroups: mixedGroups.length,
      remainingOnlyGroups: input.expansion.candidateGroups.filter((group) => (
        group.mappedLocalClauseIds.length === 0
      )).length,
      mappedOnlyGroups: input.expansion.candidateGroups.filter((group) => (
        group.remainingLocalClauseIds.length === 0
      )).length,
    },
  });
}
