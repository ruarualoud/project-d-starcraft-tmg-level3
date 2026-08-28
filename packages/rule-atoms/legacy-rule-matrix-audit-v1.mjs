import { hashStarcraftTmgContract } from "../authoritative-engine/referee-crypto-v1.mjs";

export const LEGACY_RULE_MATRIX_AUDIT_SCHEMA = "starcraft_tmg_legacy_rule_matrix_audit_v1";

const GAMEPLAY_FAMILIES = new Set([
  "board",
  "construction",
  "supply",
  "turn",
  "resources",
  "deployment",
  "movement",
  "assault",
  "combat",
  "damage",
  "keywords",
  "scenario",
  "terrain",
]);
const PRODUCT_DATA_FAMILIES = new Set(["identity"]);
const DERIVED_ANALYSIS_FAMILIES = new Set(["threat", "ai"]);
const PLATFORM_FAMILIES = new Set(["source", "service", "ui", "deploy"]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function requiredText(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}

function dispositionForFamily(family) {
  if (GAMEPLAY_FAMILIES.has(family)) return "requires_official_clause_mapping";
  if (PRODUCT_DATA_FAMILIES.has(family)) return "product_data_reference";
  if (DERIVED_ANALYSIS_FAMILIES.has(family)) return "derived_analysis_reference";
  if (PLATFORM_FAMILIES.has(family)) return "platform_reference";
  fail("unclassified_legacy_rule_family", family);
}

function blockersForDisposition(disposition) {
  if (disposition === "requires_official_clause_mapping") {
    return [
      "official_source_clause_missing",
      "rule_atom_contract_missing",
      "level3_executor_mapping_missing",
      "judge_evidence_missing",
    ];
  }
  if (disposition === "product_data_reference") {
    return ["official_product_snapshot_review_missing", "not_a_rule_clause"];
  }
  if (disposition === "derived_analysis_reference") {
    return ["derived_analysis_has_no_rules_authority", "not_a_rule_clause"];
  }
  return ["platform_behavior_has_no_rules_authority", "not_a_rule_clause"];
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export function auditLegacyRuleMatrix(matrix) {
  if (!Array.isArray(matrix)) fail("legacy_rule_matrix_required");
  const rowIds = new Set();
  const fixtureReferenceIds = new Set();
  const rows = matrix.map((raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) fail("invalid_legacy_rule_row");
    const legacyRuleId = requiredText(raw.id, "legacy_rule_id_required");
    if (rowIds.has(legacyRuleId)) fail("duplicate_legacy_rule_row", legacyRuleId);
    rowIds.add(legacyRuleId);
    const family = requiredText(raw.family, "legacy_rule_family_required");
    const disposition = dispositionForFamily(family);
    const checkItems = Array.isArray(raw.checkItems) ? raw.checkItems : fail("legacy_check_items_required", legacyRuleId);
    const fixtureIds = checkItems.map((item) => {
      const referenceId = requiredText(item?.id, "legacy_fixture_reference_id_required");
      const fixtureId = requiredText(item?.fixtureId, "legacy_fixture_id_required");
      if (fixtureReferenceIds.has(referenceId)) fail("duplicate_legacy_fixture_reference", referenceId);
      fixtureReferenceIds.add(referenceId);
      return fixtureId;
    }).sort((left, right) => left.localeCompare(right));
    return {
      legacyRuleId,
      family,
      legacyStatus: requiredText(raw.status, "legacy_rule_status_required"),
      conceptHash: hashStarcraftTmgContract(requiredText(raw.concept, "legacy_rule_concept_required")),
      sourceRefHash: hashStarcraftTmgContract(requiredText(raw.sourceRef, "legacy_rule_source_ref_required")),
      fixtureIds,
      fixtureAuthority: "reference_only",
      disposition,
      promotionBlockers: blockersForDisposition(disposition),
      canEnterLegalSpace: false,
      canAffectRules: false,
      trainingTruth: false,
    };
  }).sort((left, right) => left.legacyRuleId.localeCompare(right.legacyRuleId));

  const byDisposition = {
    requires_official_clause_mapping: rows.filter((row) => row.disposition === "requires_official_clause_mapping").length,
    product_data_reference: rows.filter((row) => row.disposition === "product_data_reference").length,
    derived_analysis_reference: rows.filter((row) => row.disposition === "derived_analysis_reference").length,
    platform_reference: rows.filter((row) => row.disposition === "platform_reference").length,
  };
  const unclassifiedRows = rows.filter((row) => !Object.hasOwn(byDisposition, row.disposition));
  const rowsWithoutFixtureIds = rows
    .filter((row) => row.fixtureIds.length === 0)
    .map((row) => row.legacyRuleId)
    .sort((left, right) => left.localeCompare(right));
  const body = {
    schema: LEGACY_RULE_MATRIX_AUDIT_SCHEMA,
    sourceAdapter: {
      id: "project-d.root.starcraft-tmg-rules-v0.RULE_MATRIX",
      authority: "read_only_reference_implementation",
    },
    counts: {
      rows: rows.length,
      unclassifiedRows: unclassifiedRows.length,
      legacyExecutableLabels: rows.filter((row) => row.legacyStatus === "executable").length,
      authoritativeExecutableRows: 0,
      fixtureReferences: rows.reduce((total, row) => total + row.fixtureIds.length, 0),
      rowsWithoutFixtures: rowsWithoutFixtureIds.length,
      byDisposition,
    },
    rowsWithoutFixtureIds,
    rows,
    rulesTruth: false,
    trainingTruth: false,
    promotionEligible: false,
  };
  return deepFreeze({ ...body, auditHash: hashStarcraftTmgContract(body) });
}
