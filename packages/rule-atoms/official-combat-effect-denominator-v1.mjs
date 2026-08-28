import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialAttackProfileCatalogueV2 } from
  "../source-data/official-attack-profile-catalogue-v2.mjs";

export const OFFICIAL_COMBAT_EFFECT_DENOMINATOR_SCHEMA =
  "starcraft_tmg_official_combat_effect_denominator_v1";

const EXPECTED_PREVIOUS_SLICE_HASH =
  "985f244a9dafdab218e15e627503bf5feaee8626d7de212bc3d4550a6366e482";
const PROFILE_EFFECT_ATOM_IDS = Object.freeze([
  "attack-effect:anti-evade-v1",
  "attack-effect:bulky-v1",
  "attack-effect:burst-fire-v1",
  "attack-effect:critical-hit-v1",
  "attack-effect:indirect-fire-v1",
  "attack-effect:instant-v1",
  "attack-effect:locked-in-v1",
  "attack-effect:long-range-v1",
  "attack-effect:pierce-v1",
  "attack-effect:pinpoint-v1",
  "attack-effect:sidearm-v1",
  "attack-effect:specialist-v1",
  "attack-effect:surge-armour-bypass-v1",
].sort((left, right) => left.localeCompare(right)));
const PREVIOUS_EXECUTABLE_EFFECT_ATOM_IDS = Object.freeze([
  "attack-effect:anti-evade-v1",
  "attack-effect:bulky-v1",
  "attack-effect:burst-fire-v1",
  "attack-effect:critical-hit-v1",
  "attack-effect:dodge-v1",
  "attack-effect:long-range-v1",
  "attack-effect:pierce-v1",
  "attack-effect:surge-armour-bypass-v1",
].sort((left, right) => left.localeCompare(right)));
const CURRENT_EXECUTABLE_EFFECT_ATOM_IDS = Object.freeze([
  ...PREVIOUS_EXECUTABLE_EFFECT_ATOM_IDS,
  "attack-effect:instant-v1",
].sort((left, right) => left.localeCompare(right)));

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

function verifyPreviousSlice(previousSlice) {
  if (!object(previousSlice)
    || previousSlice.schema !== "starcraft_tmg_official_close_combat_attack_rule_slice_v7"
    || previousSlice.sliceHash !== EXPECTED_PREVIOUS_SLICE_HASH
    || hashStarcraftTmgContract(without(previousSlice, ["sliceHash"]))
      !== previousSlice.sliceHash
    || previousSlice.effectKernel?.registeredEffectAtoms !== 13
    || previousSlice.effectKernel?.knownUnimplementedEffectAtoms !== 5
    || !isDeepStrictEqual(
      [...(previousSlice.effectKernel?.executableEffectAtomIds || [])]
        .sort((left, right) => left.localeCompare(right)),
      PREVIOUS_EXECUTABLE_EFFECT_ATOM_IDS,
    )) {
    fail("COMBAT_EFFECT_PREVIOUS_SLICE_INVALID");
  }
}

function correction(previousSlice) {
  const body = {
    schema: "starcraft_tmg_combat_effect_denominator_correction_receipt_v1",
    correctionId: "slice-29-profile-effects-plus-dodge-denominator-v1",
    previousSliceHash: previousSlice.sliceHash,
    previousReportedRegisteredEffectAtoms: 13,
    previousReportedExecutableEffectAtoms: 8,
    previousReportedKnownUnimplementedEffectAtoms: 5,
    correctedProfileEffectAtoms: 13,
    correctedContextualEffectAtoms: 1,
    correctedRegisteredEffectAtoms: 14,
    correctedBeforeInstantExecutableEffectAtoms: 8,
    correctedBeforeInstantKnownUnimplementedEffectAtoms: 6,
    defect:
      "slice_29_added_contextual_dodge_without_incrementing_the_existing_13_profile_effect_denominator",
    historicalSliceMutationAllowed: false,
    silentCompatibilityAllowed: false,
    rulesTruth: false,
    trainingTruth: false,
  };
  return {
    ...body,
    correctionReceiptHash: hashStarcraftTmgContract(body),
  };
}

export function createOfficialCombatEffectDenominatorV1(input = {}) {
  verifyPreviousSlice(input.previousSlice);
  verifyOfficialAttackProfileCatalogueV2(input.attackProfileCatalogue);
  const registryIds = input.attackProfileCatalogue.effectRegistry
    .map((entry) => entry.effectAtomId)
    .sort((left, right) => left.localeCompare(right));
  if (!isDeepStrictEqual(registryIds, PROFILE_EFFECT_ATOM_IDS)) {
    fail("COMBAT_EFFECT_PROFILE_DENOMINATOR_INVALID");
  }
  const entries = [
    ...input.attackProfileCatalogue.effectRegistry.map((entry) => ({
      effectAtomId: entry.effectAtomId,
      sourceKind: "official_current_attack_profile_keyword",
      sourceAuthority: entry.sourceAuthority,
      parameterContract: entry.parameterContract,
      implementationStatus: CURRENT_EXECUTABLE_EFFECT_ATOM_IDS.includes(entry.effectAtomId)
        ? "executable_subset"
        : "known_unimplemented",
      trainingTruth: false,
    })),
    {
      effectAtomId: "attack-effect:dodge-v1",
      sourceKind: "official_core_characteristic_and_card_grant",
      sourceAuthority:
        "core_rules_dodge_definition_plus_current_power_field_guardian_shell",
      parameterContract: "attack-effect:dodge-v1.parameters.reduction",
      implementationStatus: "executable_subset",
      trainingTruth: false,
    },
  ].sort((left, right) => left.effectAtomId.localeCompare(right.effectAtomId));
  if (new Set(entries.map((entry) => entry.effectAtomId)).size !== 14) {
    fail("COMBAT_EFFECT_COMBINED_DENOMINATOR_INVALID");
  }
  const executableEffectAtomIds = entries
    .filter((entry) => entry.implementationStatus === "executable_subset")
    .map((entry) => entry.effectAtomId);
  const knownUnimplementedEffectAtomIds = entries
    .filter((entry) => entry.implementationStatus === "known_unimplemented")
    .map((entry) => entry.effectAtomId);
  if (!isDeepStrictEqual(executableEffectAtomIds, CURRENT_EXECUTABLE_EFFECT_ATOM_IDS)
    || executableEffectAtomIds.length !== 9
    || knownUnimplementedEffectAtomIds.length !== 5) {
    fail("COMBAT_EFFECT_IMPLEMENTATION_STATUS_INVALID");
  }
  const correctionReceipt = correction(input.previousSlice);
  const body = {
    schema: OFFICIAL_COMBAT_EFFECT_DENOMINATOR_SCHEMA,
    sourceSnapshotHash: input.attackProfileCatalogue.sourceSnapshotHash,
    normalizedDatasetHash: input.attackProfileCatalogue.normalizedDatasetHash,
    attackProfileCatalogueHash: input.attackProfileCatalogue.catalogueHash,
    attackProfileEffectRegistryHash: input.attackProfileCatalogue.effectRegistryHash,
    entries,
    executableEffectAtomIds,
    knownUnimplementedEffectAtomIds,
    counts: {
      profileEffectAtoms: 13,
      contextualEffectAtoms: 1,
      registeredEffectAtoms: 14,
      executableEffectAtoms: 9,
      knownUnimplementedEffectAtoms: 5,
    },
    correction: correctionReceipt,
    unknownEffectPolicy: "quarantine_and_fail_closed",
    dataChangeCannotGrantRuleAuthority: true,
    canAffectRules: false,
    trainingTruth: false,
  };
  return freezeDeep({
    ...body,
    denominatorHash: hashStarcraftTmgContract(body),
  });
}

export function verifyOfficialCombatEffectDenominatorV1(denominator) {
  if (!object(denominator)
    || denominator.schema !== OFFICIAL_COMBAT_EFFECT_DENOMINATOR_SCHEMA
    || denominator.denominatorHash
      !== hashStarcraftTmgContract(without(denominator, ["denominatorHash"]))
    || denominator.correction?.correctionReceiptHash
      !== hashStarcraftTmgContract(without(
        denominator.correction,
        ["correctionReceiptHash"],
      ))
    || denominator.counts?.registeredEffectAtoms !== 14
    || denominator.counts?.executableEffectAtoms !== 9
    || denominator.counts?.knownUnimplementedEffectAtoms !== 5
    || denominator.canAffectRules !== false
    || denominator.trainingTruth !== false) {
    fail("COMBAT_EFFECT_DENOMINATOR_INVALID");
  }
  return denominator;
}
