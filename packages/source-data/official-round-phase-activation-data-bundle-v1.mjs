import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "./official-development-tranche-source-lock-v1.mjs";

export const OFFICIAL_ROUND_PHASE_ACTIVATION_DATA_BUNDLE_SCHEMA =
  "starcraft_tmg_official_round_phase_activation_data_bundle_v1";
export const OFFICIAL_ROUND_PHASE_ACTIVATION_CORE_RULEBOOK_HASH =
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54";

const RULE_RECORDS = Object.freeze([
  Object.freeze({ recordKey: "rules_sections:iuUyObNTQ2M8xK4IUqzC",
    title: "PART 8: THE GAME SEQUENCE",
    sourceRecordHash: "730f49b30de4cbe1c956a3da65b8c59d238b5715c8822b74063e535524d81fba",
    payloadHash: "1544376c9e3da46537ea0bb475fcfc16f1044e2e9bdc27c182df4e66f49d2276" }),
  Object.freeze({ recordKey: "rules_sections:gMXfLyHJfnGYKw2rmoPS",
    title: "PART 12: QUICK REFERENCE",
    sourceRecordHash: "572cb18a86731b32f12d81a26c777f99115a1da4bf57ef73b18215fadd18abc9",
    payloadHash: "faf1f3771196090c327ead1144f4015bf2d633b6d90ccc83dc62091c5a3e7b38" }),
]);

const RULE_CLAUSES = Object.freeze([
  Object.freeze({ clauseId: "core:8.1:round-limit", section: "8.1", printedPage: 56,
    sourceTextHash: "9817a51fa24ca64de24cb9ead2d01a762ed1026a0fe0b0382b50e96f59d0263b" }),
  Object.freeze({ clauseId: "core:8.1:phase-order", section: "8.1", printedPage: 56,
    sourceTextHash: "9ad600a488679d0d02d87db9c1bddf2f602122ee6d500ed3c910009fee38bd6f" }),
  Object.freeze({ clauseId: "core:8.2:alternating-activation-phases", section: "8.2",
    printedPage: 56, sourceTextHash:
      "c231599623a9eec131a6cec2ed9e240a20aba8b74d87904c786184e0f85e625b" }),
  Object.freeze({ clauseId: "core:8.2:unit-activation-alternation", section: "8.2",
    printedPage: 56, sourceTextHash:
      "640bdbc1d81259c05e27f13e1d6f5a0e4267f7628016a121c919b26b9739399a" }),
  Object.freeze({ clauseId: "core:8.2:one-action-per-activation", section: "8.2",
    printedPage: 56, sourceTextHash:
      "2c16b6281909467867fed06f7b391b0e7ca5aa6a6265f81ddd76bedc6f030ccf" }),
  Object.freeze({ clauseId: "core:8.4.1:on-table-action-choice", section: "8.4.1",
    printedPage: 58, sourceTextHash:
      "06c9ee06e52a7c189e21bbd61d9655c1007b0fc5899e3aa400a06b0f7f07036a" }),
  Object.freeze({ clauseId: "core:12.2:round-phase-summary", section: "12.2",
    printedPage: 94, sourceTextHash:
      "be928f4e30830631e3bff2e36a1a3cc84f15f09db8e8a626120224ef2714d1fc" }),
]);

const PHASE_SEQUENCE = Object.freeze([
  Object.freeze({ ordinal: 1, phase: "movement", printedName: "Movement",
    alternatingActivation: true,
    phaseActionTypes: Object.freeze(["deploy", "move", "disengage", "hold"]) }),
  Object.freeze({ ordinal: 2, phase: "assault", printedName: "Assault",
    alternatingActivation: true,
    phaseActionTypes: Object.freeze(["ranged_attack", "charge", "run", "hold"]) }),
  Object.freeze({ ordinal: 3, phase: "combat", printedName: "Combat",
    alternatingActivation: true,
    phaseActionTypes: Object.freeze(["close_combat_attack"]) }),
  Object.freeze({ ordinal: 4, phase: "cleanup", printedName: "Scoring & Cleanup",
    alternatingActivation: false,
    orderedOperations: Object.freeze(["control_markers", "score_vp",
      "end_of_game_check", "end_of_round_effects", "cleanup", "initiative"]) }),
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
      fail("ROUND_PHASE_ACTIVATION_RULE_RECORD_DRIFT", expected.recordKey);
    }
    return { ...expected, authorityDisposition: index.authorityDisposition,
      sourceVersion: dataset.dataVersions?.rulesVersion };
  });
}

export function createOfficialRoundPhaseActivationDataBundleV1(input = {}) {
  const dataset = input.dataset;
  if (!object(dataset) || dataset.datasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || dataset.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || dataset.repositoryFallbackAllowed !== false || !Array.isArray(dataset.recordIndex)
    || !object(dataset.recordsByKey)) fail("ROUND_PHASE_ACTIVATION_DATASET_INVALID");
  const body = {
    schema: OFFICIAL_ROUND_PHASE_ACTIVATION_DATA_BUNDLE_SCHEMA,
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    sourceSnapshotHash: OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
    normalizedDatasetHash: OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
    coreRulebookHash: OFFICIAL_ROUND_PHASE_ACTIVATION_CORE_RULEBOOK_HASH,
    officialRulesVersion: "48", ruleSectionRecords: exactRuleSectionRecords(dataset),
    ruleClauses: RULE_CLAUSES,
    ruleClauseIndexHash: hashStarcraftTmgContract(RULE_CLAUSES),
    maximumRounds: 5, phaseSequence: PHASE_SEQUENCE,
    phaseSequenceHash: hashStarcraftTmgContract(PHASE_SEQUENCE),
    battlefieldMovementActionTypes: Object.freeze(["move", "hold", "disengage"]),
    sourcePolicy: { captureMode: "slice_75_single_official_capture_lock",
      refreshDuringDevelopment: false, repositoryFallbackAllowed: false,
      pdfRole: "primary_normative_core_rules_source" },
    productionRoomEligible: false,
    rulesTruth: "official_round_phase_activation_source_index", trainingTruth: false,
  };
  const bundle = freezeDeep({ ...body, bundleHash: hashStarcraftTmgContract(body) });
  verifyOfficialRoundPhaseActivationDataBundleV1(bundle);
  return bundle;
}

export function verifyOfficialRoundPhaseActivationDataBundleV1(bundle) {
  if (!object(bundle) || bundle.schema !== OFFICIAL_ROUND_PHASE_ACTIVATION_DATA_BUNDLE_SCHEMA
    || bundle.sourceLockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || bundle.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || bundle.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || bundle.coreRulebookHash !== OFFICIAL_ROUND_PHASE_ACTIVATION_CORE_RULEBOOK_HASH
    || bundle.officialRulesVersion !== "48" || bundle.ruleSectionRecords?.length !== 2
    || bundle.ruleClauses?.length !== 7
    || bundle.ruleClauseIndexHash !== hashStarcraftTmgContract(bundle.ruleClauses)
    || bundle.maximumRounds !== 5 || bundle.phaseSequence?.length !== 4
    || bundle.phaseSequenceHash !== hashStarcraftTmgContract(bundle.phaseSequence)
    || bundle.phaseSequence.filter((entry) => entry.alternatingActivation).length !== 3
    || bundle.sourcePolicy?.refreshDuringDevelopment !== false
    || bundle.sourcePolicy?.repositoryFallbackAllowed !== false
    || bundle.productionRoomEligible !== false || bundle.trainingTruth !== false
    || bundle.bundleHash !== hashStarcraftTmgContract(without(bundle, ["bundleHash"]))) {
    fail("ROUND_PHASE_ACTIVATION_DATA_BUNDLE_INVALID");
  }
  for (const expected of RULE_RECORDS) {
    const record = bundle.ruleSectionRecords.find((entry) => entry.recordKey === expected.recordKey);
    if (!object(record) || record.title !== expected.title
      || record.sourceRecordHash !== expected.sourceRecordHash
      || record.payloadHash !== expected.payloadHash
      || record.authorityDisposition !== "official_rule_prose_review_required"
      || record.sourceVersion !== "48") {
      fail("ROUND_PHASE_ACTIVATION_RULE_RECORD_INVALID", expected.recordKey);
    }
  }
  return true;
}
