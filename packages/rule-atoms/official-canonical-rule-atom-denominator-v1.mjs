import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createRuleAtomCatalogue,
  verifyRuleAtomCatalogue,
} from "./rule-atom-catalogue-v1.mjs";

const DENOMINATOR_SCHEMA = "starcraft_tmg_official_canonical_rule_atom_denominator_v1";
const BINDING_SCHEMA = "starcraft_tmg_official_canonical_rule_atom_binding_v1";
const MANIFEST_SCHEMA = "starcraft_tmg_official_rule_source_manifest_v1";
const FINALIZATION_SCHEMA = "starcraft_tmg_global_canonical_clause_finalization_v1";
const FAQ_RECEIPT_SCHEMA = "starcraft_tmg_official_gameplay_faq_receipt_v1";
const FAQ_SUPPLEMENTAL_SCHEMA = "starcraft_tmg_official_faq_supplemental_clause_reconciliation_v3";
const CORE_COVERAGE_SCHEMA = "starcraft_tmg_core_semantic_clause_coverage_index_v1";
const EXPECTED_SOURCE_MANIFEST_HASH = "298df219f7de531231d562c62b6efd0b83c740ea4dc69c5087946aeb9e924ed8";
const EXPECTED_CANONICAL_FINALIZATION_HASH = "f9a6aa95bc836c6b93f85d4e3b5cb94d3ae699bdd1bee497bc904ec80a2d3dfd";
const EXPECTED_CANONICAL_CATALOGUE_HASH = "2ca56c1d2d8cfcc09e6ae17ee74fdf92bf4a412e34bc077e7037ea49ada14140";
const EXPECTED_FAQ_RECEIPT_HASH = "18bdfbd2e298eb7c6a360ca47d30e61ab4ba59b198ce1df0d082d28780f9984d";
const EXPECTED_FAQ_SUPPLEMENTAL_HASH = "6d1e52f52c47f002cc0dfcb0701041ebbbae7044c7c6aeb096a81073ba5d3b40";
const EXPECTED_CORE_CONTENT_HASH = "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";
const EXPECTED_CORE_COVERAGE_HASH = "dc9c33554c796d7ca545e756746ea9065d6dbe79084e4d54ebd3466e8bb3d7a0";

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function verifyHashEnvelope(value, hashKey, code) {
  if (!object(value)
    || hashStarcraftTmgContract(without(value, [hashKey])) !== value[hashKey]) {
    fail(code);
  }
}

function verifySourceManifest(sourceManifest) {
  verifyHashEnvelope(
    sourceManifest,
    "manifestHash",
    "official_rule_atom_source_manifest_hash_mismatch",
  );
  if (sourceManifest.schema !== MANIFEST_SCHEMA
    || sourceManifest.manifestHash !== EXPECTED_SOURCE_MANIFEST_HASH
    || sourceManifest.gameId !== "starcraft-tmg"
    || sourceManifest.rulesEligible !== false
    || sourceManifest.trainingTruth !== false) {
    fail("official_rule_atom_source_manifest_dependency_mismatch");
  }
  const core = sourceManifest.pdfSources?.find((row) => row.sourceId === "core-rules-en");
  if (!core || core.contentHash !== EXPECTED_CORE_CONTENT_HASH
    || core.sourceKind !== "core_rulebook" || core.pdfPages !== 128) {
    fail("official_rule_atom_core_snapshot_dependency_mismatch");
  }
  return core;
}

function verifyFinalization(finalization) {
  verifyHashEnvelope(
    finalization,
    "finalizationHash",
    "official_rule_atom_canonical_finalization_hash_mismatch",
  );
  if (finalization.schema !== FINALIZATION_SCHEMA
    || finalization.finalizationHash !== EXPECTED_CANONICAL_FINALIZATION_HASH
    || finalization.canonicalCatalogueHash !== EXPECTED_CANONICAL_CATALOGUE_HASH
    || finalization.localClauseCount !== 1093
    || finalization.globalCanonicalClauseCount !== 1026
    || finalization.canonicalMappingComplete !== true
    || finalization.ruleAtomMappingComplete !== false
    || finalization.rulesEligible !== false
    || finalization.trainingTruth !== false) {
    fail("official_rule_atom_canonical_finalization_dependency_mismatch");
  }
}

function verifyFaq(faqReceipt, faqSupplemental) {
  verifyHashEnvelope(faqReceipt, "receiptHash", "official_rule_atom_faq_receipt_hash_mismatch");
  if (faqReceipt.schema !== FAQ_RECEIPT_SCHEMA
    || faqReceipt.receiptHash !== EXPECTED_FAQ_RECEIPT_HASH
    || faqReceipt.semanticContentHash !== faqSupplemental.faqSemanticContentHash
    || faqReceipt.rulesEligible !== false
    || faqReceipt.trainingTruth !== false) {
    fail("official_rule_atom_faq_receipt_dependency_mismatch");
  }
  verifyHashEnvelope(
    faqSupplemental,
    "reconciliationHash",
    "official_rule_atom_faq_supplemental_hash_mismatch",
  );
  if (faqSupplemental.schema !== FAQ_SUPPLEMENTAL_SCHEMA
    || faqSupplemental.reconciliationHash !== EXPECTED_FAQ_SUPPLEMENTAL_HASH
    || faqSupplemental.faqReceiptHash !== faqReceipt.receiptHash
    || faqSupplemental.faqLocalClauseCount !== 3
    || faqSupplemental.rulesEligible !== false
    || faqSupplemental.trainingTruth !== false) {
    fail("official_rule_atom_faq_supplemental_dependency_mismatch");
  }
}

function verifyCoreCoverageIndex(coreCoverageIndex) {
  verifyHashEnvelope(
    coreCoverageIndex,
    "coverageIndexHash",
    "official_rule_atom_core_coverage_index_hash_mismatch",
  );
  if (coreCoverageIndex.schema !== CORE_COVERAGE_SCHEMA
    || coreCoverageIndex.coverageIndexHash !== EXPECTED_CORE_COVERAGE_HASH
    || coreCoverageIndex.sourceContentHash !== EXPECTED_CORE_CONTENT_HASH
    || coreCoverageIndex.counts?.reviewedPartCanonicalClauses !== 1090
    || coreCoverageIndex.uncoveredSourceParts?.length !== 0
    || coreCoverageIndex.rulesEligible !== false
    || coreCoverageIndex.trainingTruth !== false) {
    fail("official_rule_atom_core_coverage_index_dependency_mismatch");
  }
  return new Map(coreCoverageIndex.partLedgers.map((row) => [row.sourcePart, row]));
}

function collectCoreClauseMetadata(partLedgers, coreCoverageIndex) {
  if (!Array.isArray(partLedgers) || partLedgers.length !== 23) {
    fail("official_rule_atom_part_ledger_denominator_mismatch");
  }
  const partCoverage = verifyCoreCoverageIndex(coreCoverageIndex);
  const metadata = new Map();
  const reviewLedgerHashes = [];
  const observedPartCounts = new Map();
  let sourceSnapshotId = null;
  for (const ledger of partLedgers) {
    const hashKey = ledger.ledgerHash ? "ledgerHash" : "batchLedgerHash";
    verifyHashEnvelope(
      ledger,
      hashKey,
      "official_rule_atom_part_ledger_hash_mismatch",
    );
    if (!Array.isArray(ledger.canonicalClauses)
      || ledger.sourceContentHash !== EXPECTED_CORE_CONTENT_HASH
      || ledger.rulesEligible !== false
      || ledger.trainingTruth !== false) {
      fail("official_rule_atom_part_ledger_dependency_mismatch", String(ledger.sourcePart || ""));
    }
    if (sourceSnapshotId === null) sourceSnapshotId = ledger.sourceSnapshotId;
    if (sourceSnapshotId !== ledger.sourceSnapshotId) {
      fail("official_rule_atom_core_snapshot_id_mismatch", ledger.sourceSnapshotId);
    }
    const fullPart = partCoverage.get(ledger.sourcePart);
    if (!fullPart) fail("official_rule_atom_part_coverage_missing", ledger.sourcePart);
    reviewLedgerHashes.push(ledger[hashKey]);
    observedPartCounts.set(
      ledger.sourcePart,
      (observedPartCounts.get(ledger.sourcePart) || 0) + ledger.canonicalClauses.length,
    );
    for (const clause of ledger.canonicalClauses) {
      if (metadata.has(clause.clauseId)) {
        fail("official_rule_atom_duplicate_core_clause", clause.clauseId);
      }
      if (clause.sourceSnapshotId !== sourceSnapshotId
        || clause.sourceContentHash !== EXPECTED_CORE_CONTENT_HASH
        || clause.authority !== "official_primary"
        || !Number.isInteger(clause.locator?.pdfPage)
        || !Array.isArray(clause.sourceTextHashes)
        || clause.sourceTextHashes.length === 0) {
        fail("official_rule_atom_core_clause_metadata_invalid", clause.clauseId);
      }
      metadata.set(clause.clauseId, { ...clause, sourceLedgerHash: fullPart.ledgerHash });
    }
  }
  for (const [sourcePart, coverage] of partCoverage) {
    if (observedPartCounts.get(sourcePart) !== coverage.canonicalClauseCount) {
      fail("official_rule_atom_part_clause_count_mismatch", sourcePart);
    }
  }
  if (metadata.size !== 1090) fail("official_rule_atom_core_clause_denominator_mismatch");
  return {
    metadata,
    sourceSnapshotId,
    partLedgerHashes: [...partCoverage.values()].map((row) => row.ledgerHash)
      .sort((left, right) => left.localeCompare(right)),
    reviewLedgerHashes: reviewLedgerHashes.sort((left, right) => left.localeCompare(right)),
  };
}

function coreSourceClause(clause) {
  return {
    clauseId: clause.clauseId,
    sourceSnapshotId: clause.sourceSnapshotId,
    sourceContentHash: clause.sourceContentHash,
    locator: {
      kind: "pdf_page",
      page: clause.locator.pdfPage,
      section: clause.sourceAnchorId,
      anchorId: clause.anchorId,
      lineOrdinal: clause.locator.anchorLineOrdinal,
      candidateOrdinalStart: clause.locator.candidateOrdinalStart,
      candidateOrdinalEnd: clause.locator.candidateOrdinalEnd,
    },
    textHash: clause.candidateSequenceHash,
    language: "en",
    authority: "official_primary",
  };
}

function faqMetadata(faqReceipt, faqSupplemental, faqSnapshotId) {
  const entryById = new Map(faqReceipt.entryIndex.map((entry) => [entry.entryId, entry]));
  return faqSupplemental.supplementalClauses.map((clause) => {
    const entry = entryById.get(clause.sourceEntryId);
    if (!entry || entry.answerHash !== clause.sourceAnswerHash) {
      fail("official_rule_atom_faq_entry_binding_mismatch", clause.clauseId);
    }
    return {
      sourceClause: {
        clauseId: clause.clauseId,
        sourceSnapshotId: faqSnapshotId,
        sourceContentHash: faqReceipt.semanticContentHash,
        locator: {
          kind: "faq_entry",
          section: "Gameplay FAQ",
          entryId: entry.entryId,
          entryOrdinal: entry.ordinal,
        },
        textHash: clause.sourceAnswerHash,
        language: "en",
        authority: "official_mutable_supplement",
      },
      title: `FAQ ${entry.entryId}: ${clause.semanticKind.replaceAll("_", " ")}`,
      sourceLedgerHash: faqSupplemental.reconciliationHash,
    };
  });
}

function canonicalTitle(canonical, metadataById) {
  const primary = metadataById.get(canonical.sourceLocalClauseIds[0]);
  if (!primary) fail("official_rule_atom_canonical_source_metadata_missing", canonical.canonicalClauseId);
  return primary.title;
}

function atomId(canonicalClauseId) {
  return canonicalClauseId.replace(/^canonical:/u, "rule-atom:");
}

function denominatorBody(denominator) {
  return without(denominator, ["denominatorHash"]);
}

export function createOfficialCanonicalRuleAtomDenominatorV1(input = {}) {
  const coreSource = verifySourceManifest(input.sourceManifest);
  verifyFinalization(input.finalization);
  verifyFaq(input.faqReceipt, input.faqSupplemental);
  const core = collectCoreClauseMetadata(input.partLedgers, input.coreCoverageIndex);
  const faqSnapshotId = `${input.faqReceipt.sourceId}@${input.faqReceipt.semanticContentHash.slice(0, 12)}`;
  const faqRows = faqMetadata(input.faqReceipt, input.faqSupplemental, faqSnapshotId);
  const metadataById = new Map([...core.metadata.entries()].map(([id, row]) => [
    id,
    { title: row.title, sourceLedgerHash: row.sourceLedgerHash },
  ]));
  for (const row of faqRows) metadataById.set(row.sourceClause.clauseId, row);

  const finalLocalIds = new Set(input.finalization.localToCanonicalIndex.map((row) => row.localClauseId));
  const metadataIds = new Set(metadataById.keys());
  if (finalLocalIds.size !== 1093 || metadataIds.size !== 1093
    || [...finalLocalIds].some((id) => !metadataIds.has(id))) {
    fail("official_rule_atom_source_metadata_denominator_mismatch");
  }
  for (const canonical of input.finalization.canonicalClauses) {
    if (!Array.isArray(canonical.sourceRows)
      || canonical.sourceRows.length !== canonical.sourceLocalClauseIds.length) {
      fail("official_rule_atom_canonical_source_rows_invalid", canonical.canonicalClauseId);
    }
    for (const row of canonical.sourceRows) {
      const metadata = metadataById.get(row.localClauseId);
      if (!metadata || metadata.sourceLedgerHash !== row.sourceLedgerHash) {
        fail("official_rule_atom_canonical_source_ledger_mismatch", row.localClauseId);
      }
    }
  }

  const sourceSnapshots = [
    {
      sourceSnapshotId: core.sourceSnapshotId,
      authority: "official_primary",
      immutableLocator: `${coreSource.sourceUrl}#sha256=${coreSource.contentHash}`,
      contentHash: coreSource.contentHash,
      mediaType: "application/pdf",
      language: "en",
      capturedAt: input.sourceManifest.capturedAt,
    },
    {
      sourceSnapshotId: faqSnapshotId,
      authority: "official_mutable_supplement",
      immutableLocator: `${input.faqReceipt.sourceUrl}#semantic-sha256=${input.faqReceipt.semanticContentHash}`,
      contentHash: input.faqReceipt.semanticContentHash,
      mediaType: "text/html+semantic-json",
      language: "en",
      capturedAt: input.faqReceipt.capturedAt,
    },
  ];
  const sourceClauses = [
    ...[...core.metadata.values()].map(coreSourceClause),
    ...faqRows.map((row) => row.sourceClause),
  ];
  const atoms = input.finalization.canonicalClauses.map((canonical) => {
    if (!["display_only", "review_required"].includes(canonical.disposition)
      || canonical.executable !== false || canonical.trainingTruth !== false) {
      fail("official_rule_atom_canonical_disposition_invalid", canonical.canonicalClauseId);
    }
    return {
      atomId: atomId(canonical.canonicalClauseId),
      atomVersion: "0.1.0-screened",
      canonicalClauseId: canonical.canonicalClauseId,
      clauseIds: [...canonical.sourceLocalClauseIds],
      disposition: canonical.disposition,
      title: canonicalTitle(canonical, metadataById),
      reasonCode: canonical.disposition === "display_only"
        ? "screened_display_only_no_rules_authority"
        : "executor_legal_space_judge_and_replay_evidence_pending",
    };
  });
  const sourceDenominatorBinding = {
    schema: BINDING_SCHEMA,
    sourceManifestHash: input.sourceManifest.manifestHash,
    canonicalFinalizationHash: input.finalization.finalizationHash,
    canonicalCatalogueHash: input.finalization.canonicalCatalogueHash,
    localToCanonicalIndexHash: input.finalization.localToCanonicalIndexHash,
    faqReceiptHash: input.faqReceipt.receiptHash,
    mappingMode: "one_rule_atom_per_global_canonical_clause_non_executable",
  };
  const catalogue = createRuleAtomCatalogue({
    gameId: "starcraft-tmg",
    catalogueVersion: "0.1.0-official-canonical-denominator",
    rulesVersion: `starcraft-tmg-rules@${input.finalization.canonicalCatalogueHash.slice(0, 12)}`,
    sourceDenominatorStatus: "official_complete",
    sourceDenominatorBinding,
    sourceSnapshots,
    sourceClauses,
    atoms,
    executorManifest: [],
  });
  const catalogueAudit = verifyRuleAtomCatalogue(catalogue);
  if (catalogueAudit.counts.unclassifiedClauses !== 0
    || catalogueAudit.counts.sourceClauses !== 1093
    || catalogueAudit.counts.atoms !== 1026
    || catalogueAudit.counts.byDisposition.executable !== 0) {
    fail("official_rule_atom_catalogue_denominator_invalid");
  }
  const ruleAtomMappings = catalogue.atoms.map((atom) => ({
    canonicalClauseId: atom.canonicalClauseId,
    ruleAtomId: atom.atomId,
    sourceLocalClauseIds: [...atom.clauseIds],
    disposition: atom.disposition,
  })).sort((left, right) => left.canonicalClauseId.localeCompare(right.canonicalClauseId));
  const body = {
    schema: DENOMINATOR_SCHEMA,
    sourceManifestHash: input.sourceManifest.manifestHash,
    canonicalFinalizationHash: input.finalization.finalizationHash,
    canonicalCatalogueHash: input.finalization.canonicalCatalogueHash,
    localToCanonicalIndexHash: input.finalization.localToCanonicalIndexHash,
    faqReceiptHash: input.faqReceipt.receiptHash,
    faqSupplementalReconciliationHash: input.faqSupplemental.reconciliationHash,
    coreCoverageIndexHash: input.coreCoverageIndex.coverageIndexHash,
    partLedgerHashes: core.partLedgerHashes,
    reviewLedgerHashes: core.reviewLedgerHashes,
    catalogue,
    catalogueHash: catalogue.catalogueHash,
    ruleAtomMappings,
    ruleAtomMappingComplete: true,
    executableRuleAtomCount: 0,
    mappingStatus: "official_canonical_rule_atom_denominator_complete_execution_pending",
    ctx2skill: {
      ctx2skillLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      roleRoutes: ["rule_skill_builder", "referee"],
      skillsRead: [],
      skillsGenerated: [],
      judgeTestsRun: 0,
      crossTimeReplayResult: "not_run_no_executable_atoms",
      promotions: [],
      blocks: ["executor_legal_space_judge_and_replay_evidence_pending"],
      remainingRuleGaps: 1026,
    },
    harness: {
      harnessLoopUsed: true,
      targetGames: ["starcraft-tmg"],
      promptPackRoutes: ["referee_prompt", "rule_skill_builder_prompt"],
      harnessToolsCalled: [],
      uiTraceEvidence: "not_run_no_executable_atoms",
      agentDecisionEvidence: "not_run_no_executable_atoms",
      memoryTraceEvidence: "not_run_no_executable_atoms",
      trainingTraceCandidates: [],
      rollbackOrDemotionRules: [
        "source_or_canonical_drift_quarantines_the_catalogue",
        "missing_executor_or_judge_evidence_keeps_atoms_non_executable",
      ],
      userVisibleChecks: ["display_only_and_review_required_rule_debt_remains_visible"],
    },
    rulesEligible: false,
    canAffectRules: false,
    replayEligible: false,
    ctx2skillPromotionEligible: false,
    trainingTruth: false,
    blocks: [
      "executor_and_legal_space_coverage_pending",
      "judge_interaction_lifecycle_and_replay_pending",
    ],
  };
  return freezeDeep({ ...body, denominatorHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialCanonicalRuleAtomDenominatorV1(input = {}) {
  if (!object(input.denominator) || input.denominator.schema !== DENOMINATOR_SCHEMA) {
    fail("official_rule_atom_denominator_invalid");
  }
  if (hashStarcraftTmgContract(denominatorBody(input.denominator))
    !== input.denominator.denominatorHash) {
    fail("official_rule_atom_denominator_hash_mismatch");
  }
  const expected = createOfficialCanonicalRuleAtomDenominatorV1(input);
  if (!isDeepStrictEqual(input.denominator, expected)) {
    fail("official_rule_atom_denominator_content_mismatch");
  }
  const catalogueAudit = verifyRuleAtomCatalogue(input.denominator.catalogue);
  const mappedCanonicalIds = input.denominator.ruleAtomMappings.map((row) => row.canonicalClauseId);
  const expectedCanonicalIds = new Set(input.finalization.canonicalClauses.map((row) => (
    row.canonicalClauseId
  )));
  const mappedSourceIds = input.denominator.ruleAtomMappings.flatMap((row) => row.sourceLocalClauseIds);
  return freezeDeep({
    valid: true,
    denominatorHash: input.denominator.denominatorHash,
    catalogueHash: input.denominator.catalogueHash,
    counts: {
      sourceSnapshots: catalogueAudit.counts.sourceSnapshots,
      sourceClauses: catalogueAudit.counts.sourceClauses,
      corePdfSourceClauses: input.denominator.catalogue.sourceClauses.filter((row) => (
        row.locator.kind === "pdf_page"
      )).length,
      faqSourceClauses: input.denominator.catalogue.sourceClauses.filter((row) => (
        row.locator.kind === "faq_entry"
      )).length,
      unclassifiedSourceClauses: catalogueAudit.counts.unclassifiedClauses,
      duplicateSourceClauseMappings: mappedSourceIds.length - new Set(mappedSourceIds).size,
      canonicalClauses: expectedCanonicalIds.size,
      ruleAtoms: catalogueAudit.counts.atoms,
      duplicateCanonicalMappings: mappedCanonicalIds.length - new Set(mappedCanonicalIds).size,
      missingCanonicalMappings: [...expectedCanonicalIds].filter((id) => (
        !mappedCanonicalIds.includes(id)
      )).length,
      byDisposition: catalogueAudit.counts.byDisposition,
    },
    rulesTruth: false,
    trainingTruth: false,
  });
}
