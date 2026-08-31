import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialKeywordSpecialAbilityDataBundleV1,
  verifyOfficialKeywordSpecialAbilityDataBundleV1,
} from "./official-keyword-special-ability-data-bundle-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";

export const OFFICIAL_ABILITY_TIMING_PRIORITY_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_ability_timing_priority_data_bundle_v1";
export const OFFICIAL_ABILITY_TIMING_PRIORITY_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_RECORDS = Object.freeze([
  Object.freeze({ recordKey: "rules_sections:QX7B9DFpviRo84fVCBIj",
    title: "PART 2: CORE CONCEPTS",
    sourceRecordHash: "f7fce5a24ed1962598abb556f43a7cfffcfb541404c6bb705d119379b4094964",
    payloadHash: "615c599d401b8457266c56d1033a4259c0d1f353ba686becab05876a3af66acb" }),
  Object.freeze({ recordKey: "rules_sections:iuUyObNTQ2M8xK4IUqzC",
    title: "PART 8: THE GAME SEQUENCE",
    sourceRecordHash: "730f49b30de4cbe1c956a3da65b8c59d238b5715c8822b74063e535524d81fba",
    payloadHash: "1544376c9e3da46537ea0bb475fcfc16f1044e2e9bdc27c182df4e66f49d2276" }),
  Object.freeze({ recordKey: "rules_sections:H3Fn8YSvEvpJZpT57qw1",
    title: "PART 10: ADVANCED RULES",
    sourceRecordHash: "b2d1089659ae55440711a8c5315e70142c4777c4e1a94268abddb768ca8c1f13",
    payloadHash: "05da4c287b6e7fe8f9f3159269cf668ead93e74f10df49a666a1ee36c521f206" }),
]);

const RULE_CLAUSES = Object.freeze([
  Object.freeze({ clauseId: "core:8.9.4:end-round-effect-order", section: "8.9.4",
    printedPage: 74, sourceTextHash:
      "e182b6f305a05be82772ae834122e4f5534a454b2a0c156d8d8faed2d7710fa8" }),
  Object.freeze({ clauseId: "core:10.4:default-end-round-expiry", section: "10.4",
    printedPage: 82, sourceTextHash:
      "c37249c868718942e3d2c36fbb6c0a6c2283c8304fd5bd4762bfa3bb415482af" }),
  Object.freeze({ clauseId: "core:10.4:simultaneous-reaction-priority", section: "10.4",
    printedPage: 82, sourceTextHash:
      "340e8ba4622087e2aa8923909fe3580045436edbaad86ae2c270003ecb9b4e8d" }),
  Object.freeze({ clauseId: "core:2.7.3:reaction-priority", section: "2.7.3",
    printedPage: 32, sourceTextHash:
      "4e3b1d54ddd9833ac15621a66b90822c6c50476828ed143877bd8dd5e8eb5d24" }),
  Object.freeze({ clauseId: "core:10.3:cross-player-passive-priority", section: "10.3",
    printedPage: 82, sourceTextHash:
      "9fb9086f6fc403f3c773a88c0e89602751163913271488d5879de7ed05f47c59" }),
  Object.freeze({ clauseId: "core:10.3:simultaneous-own-passive-order", section: "10.3",
    printedPage: 82, sourceTextHash:
      "a4a68dbbc60653c7d530534737412f7d1ce3c7f36268863113be419e67e3f9d3" }),
  Object.freeze({ clauseId: "core:10.4:ability-type-comparison-table", section: "10.4",
    printedPage: 82, sourceTextHash:
      "6b08dd3f35a70e0d2f9a65ab1d69dde0923273369161d7bc51a80b6d90fe5729" }),
]);

const ABILITY_TYPE_COMPARISON = Object.freeze([
  Object.freeze({ characteristic: "when_to_use", active: "before_or_after_an_action",
    passive: "always_when_conditions_apply", reaction: "at_exact_defined_trigger" }),
  Object.freeze({ characteristic: "requires_activation", active: true,
    passive: false, reaction: false }),
  Object.freeze({ characteristic: "player_decision", active: "yes",
    passive: "automatic", reaction: "yes_declared" }),
  Object.freeze({ characteristic: "frequency", active: "once_per_round_per_unit_per_name_unless_repeatable",
    passive: "always", reaction: "once_per_round_per_unit_per_name_unless_repeatable" }),
  Object.freeze({ characteristic: "reaction_per_activation", active: "not_applicable",
    passive: "not_applicable", reaction: "one_per_player" }),
  Object.freeze({ characteristic: "interrupt", active: "no",
    passive: "when_conditions_apply", reaction: "yes_at_trigger" }),
  Object.freeze({ characteristic: "reserves", active: "inactive_unless_explicit",
    passive: "inactive_unless_explicit", reaction: "inactive_unless_explicit" }),
  Object.freeze({ characteristic: "duration", active: "end_current_round_unless_explicit",
    passive: "while_on_battlefield", reaction: "end_current_round_unless_explicit" }),
  Object.freeze({ characteristic: "simultaneous", active: "not_applicable",
    passive: "controller_orders_own_then_active_player_first",
    reaction: "active_player_first" }),
  Object.freeze({ characteristic: "cost", active: "pay_full_cost",
    passive: "none", reaction: "pay_full_cost" }),
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function exactRuleSectionRecords(dataset) {
  return RULE_RECORDS.map((expected) => {
    const record = dataset.recordsByKey[expected.recordKey];
    const index = dataset.recordIndex.find((entry) => entry.recordKey === expected.recordKey);
    if (!object(record) || !object(index)
      || index.authorityDisposition !== "official_rule_prose_review_required"
      || record.payload?.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash) {
      fail("ABILITY_TIMING_PRIORITY_RULE_RECORD_DRIFT", expected.recordKey);
    }
    return { ...expected, authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions?.rulesVersion };
  });
}

export function createOfficialAbilityTimingPriorityDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) fail("ABILITY_TIMING_PRIORITY_DATASET_INVALID");
  const abilityBundle = input.keywordSpecialAbilityDataBundle
    || createOfficialKeywordSpecialAbilityDataBundleV1({ dataset });
  verifyOfficialKeywordSpecialAbilityDataBundleV1(abilityBundle);
  const body = {
    schema: OFFICIAL_ABILITY_TIMING_PRIORITY_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_ABILITY_TIMING_PRIORITY_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48", ruleSectionRecords: exactRuleSectionRecords(dataset),
    ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    abilityTypeComparison: ABILITY_TYPE_COMPARISON,
    abilityTypeComparisonHash: hashStarcraftTmgContract(ABILITY_TYPE_COMPARISON),
    specialAbilityIndexHash: abilityBundle.specialAbilityIndexHash,
    reactionAbilityCount: abilityBundle.specialAbilityAudit.reactionCount,
    sourcePolicy: { captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
      pdfRole: "primary_normative_core_rules_source" },
    productionRoomEligible: false,
    rulesTruth: "official_ability_timing_priority_source_index",
    trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialAbilityTimingPriorityDataBundleV1(bundle, abilityBundle);
  return bundle;
}

export function verifyOfficialAbilityTimingPriorityDataBundleV1(bundle,
  abilityBundle = null) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_ABILITY_TIMING_PRIORITY_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_ABILITY_TIMING_PRIORITY_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48" || bundle.ruleSectionRecords?.length !== 3
    || bundle.ruleClauses?.length !== 7
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(bundle.ruleClauses)
    || bundle.abilityTypeComparison?.length !== 10
    || bundle.abilityTypeComparisonHash
      !== hashStarcraftTmgContract(bundle.abilityTypeComparison)
    || bundle.reactionAbilityCount !== 24
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("ABILITY_TIMING_PRIORITY_DATA_BUNDLE_INVALID");
  }
  for (const expected of RULE_RECORDS) {
    const record = bundle.ruleSectionRecords.find((entry) => entry.recordKey === expected.recordKey);
    if (!object(record) || record.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash
      || record.authorityDisposition !== "official_rule_prose_review_required"
      || record.sourceVersion !== "48") {
      fail("ABILITY_TIMING_PRIORITY_RULE_RECORD_INVALID", expected.recordKey);
    }
  }
  if (abilityBundle) {
    verifyOfficialKeywordSpecialAbilityDataBundleV1(abilityBundle);
    if (bundle.specialAbilityIndexHash !== abilityBundle.specialAbilityIndexHash) {
      fail("ABILITY_TIMING_PRIORITY_ABILITY_INDEX_DRIFT");
    }
  }
  return true;
}
