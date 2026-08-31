import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialKeywordSpecialAbilityDataBundleV1 } from
  "../source-data/official-keyword-special-ability-data-bundle-v1.mjs";

const PROCEDURE_KINDS = new Set([
  "keyword_resolution",
  "repeatable_permission",
  "same_name_nonstack",
  "special_ability_classification",
  "targeting_resolution",
]);
const TARGETING_MODES = new Set([
  "place_token_or_marker", "targeted", "untargeted",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}
function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function nonEmpty(value, code) {
  const normalized = String(value || "").trim();
  if (!normalized) fail(code);
  return normalized;
}
function integer(value, minimum, maximum, code) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized)
    || normalized < minimum || normalized > maximum) fail(code);
  return normalized;
}
function canonical(value) {
  return String(value || "").trim().toLocaleUpperCase("en-US");
}
function keywordByTitle(bundle, title) {
  verifyOfficialKeywordSpecialAbilityDataBundleV1(bundle);
  const definition = bundle.keywordDefinitions.find((entry) => (
    entry.canonicalTitle === canonical(title)
  ));
  if (!definition) fail("KEYWORD_DEFINITION_UNKNOWN", String(title || ""));
  return definition;
}
function abilityById(bundle, abilityId) {
  verifyOfficialKeywordSpecialAbilityDataBundleV1(bundle);
  const ability = bundle.specialAbilities.find((entry) => entry.abilityId === abilityId);
  if (!ability) fail("SPECIAL_ABILITY_DEFINITION_UNKNOWN", String(abilityId || ""));
  return ability;
}
function expectedKeywordDisplay(definition, raw) {
  let expected = definition.canonicalTitle;
  const parameterKey = canonical(raw.parameterKey);
  if (/\[CHARACTERISTIC\]/u.test(expected)) {
    if (!parameterKey) fail("KEYWORD_PARAMETER_REQUIRED", definition.canonicalTitle);
    expected = expected.replace("[CHARACTERISTIC]", parameterKey);
  } else if (/\[TAG\]/u.test(expected)) {
    if (!parameterKey) fail("KEYWORD_PARAMETER_REQUIRED", definition.canonicalTitle);
    expected = expected.replace("[TAG]", parameterKey);
  } else if (/\((?:NAME|UNIT NAME)\)/u.test(expected)) {
    if (!parameterKey) fail("KEYWORD_PARAMETER_REQUIRED", definition.canonicalTitle);
    expected = expected.replace(/\((?:NAME|UNIT NAME)\)/u, `(${parameterKey})`);
  } else if (raw.parameterKey !== undefined && parameterKey) {
    fail("KEYWORD_PARAMETER_FORBIDDEN", definition.canonicalTitle);
  }
  let numericValue = null;
  if (definition.numericParameter) {
    numericValue = integer(raw.numericValue, 0, 999, "KEYWORD_NUMERIC_VALUE_INVALID");
    expected = expected.replace(/\(X\)/gu, `(${numericValue})`)
      .replace(/\bX(?=\s|$)/gu, String(numericValue));
  } else if (raw.numericValue !== undefined) {
    fail("KEYWORD_NUMERIC_VALUE_FORBIDDEN", definition.canonicalTitle);
  }
  return { expected, numericValue, parameterKey };
}

export function resolveOfficialKeywordUsesV1(input = {}) {
  const bundle = input.dataBundle;
  verifyOfficialKeywordSpecialAbilityDataBundleV1(bundle);
  if (input.registryComplete !== true || !Array.isArray(input.keywordUses)
    || input.keywordUses.length === 0 || input.keywordUses.length > 128) {
    fail("KEYWORD_REGISTRY_COMPLETE_USES_REQUIRED");
  }
  const useIds = new Set();
  const resolved = input.keywordUses.map((raw) => {
    const sourceUseId = nonEmpty(raw?.sourceUseId, "KEYWORD_USE_INVALID");
    if (useIds.has(sourceUseId) || raw.bold !== true) {
      fail("KEYWORD_USE_INVALID", sourceUseId);
    }
    useIds.add(sourceUseId);
    const definition = keywordByTitle(bundle, raw.keywordTitle);
    if (raw.meaningHash !== undefined && raw.meaningHash !== definition.meaningHash) {
      fail("KEYWORD_CLIENT_MEANING_FORBIDDEN", sourceUseId);
    }
    const parameters = expectedKeywordDisplay(definition, raw);
    const displayText = String(raw.displayText || "").trim();
    if (displayText !== canonical(displayText)
      || displayText !== parameters.expected) {
      fail("KEYWORD_BOLD_CAPS_FORMAT_INVALID", sourceUseId);
    }
    return {
      sourceUseId,
      keywordId: definition.keywordId,
      canonicalTitle: definition.canonicalTitle,
      displayText,
      bold: true,
      parameterKey: parameters.parameterKey,
      numericValue: parameters.numericValue,
      meaningHash: definition.meaningHash,
      groupingKey: `${definition.keywordId}:${parameters.parameterKey}`,
    };
  });
  const grouped = new Map();
  for (const use of resolved) {
    if (!grouped.has(use.groupingKey)) grouped.set(use.groupingKey, []);
    grouped.get(use.groupingKey).push(use);
  }
  const effectiveKeywordUses = [];
  const suppressedKeywordUses = [];
  for (const entries of grouped.values()) {
    const definition = bundle.keywordDefinitions.find((entry) => (
      entry.keywordId === entries[0].keywordId
    ));
    const sorted = [...entries].sort((left, right) => {
      if (definition.numericParameter && right.numericValue !== left.numericValue) {
        return right.numericValue - left.numericValue;
      }
      return left.sourceUseId.localeCompare(right.sourceUseId);
    });
    effectiveKeywordUses.push(sorted[0]);
    suppressedKeywordUses.push(...sorted.slice(1).map((entry) => ({
      ...entry,
      suppressedBySourceUseId: sorted[0].sourceUseId,
      suppressionReason: definition.numericParameter
        ? "same_numeric_keyword_only_highest_applies"
        : "same_keyword_does_not_stack",
    })));
  }
  effectiveKeywordUses.sort((left, right) => left.groupingKey.localeCompare(right.groupingKey));
  suppressedKeywordUses.sort((left, right) => left.sourceUseId.localeCompare(right.sourceUseId));
  const body = {
    schema: "starcraft_tmg_official_keyword_resolution_v1",
    registryComplete: true,
    keywordDefinitionIndexHash: bundle.keywordDefinitionIndexHash,
    effectiveKeywordUses,
    suppressedKeywordUses,
    sameKeywordStacks: false,
    numericKeywordCombinesBy: "highest_only",
    meaningOwnedByOfficialRegistry: true,
    clientSuppliedMeaningAccepted: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function classifyOfficialSpecialAbilityV1(input = {}) {
  const bundle = input.dataBundle;
  const ability = abilityById(bundle, input.abilityId);
  if (input.claimedName !== undefined
    && canonical(input.claimedName) !== ability.canonicalName) {
    fail("SPECIAL_ABILITY_NAME_FORGERY", ability.abilityId);
  }
  if (input.claimedCategory !== undefined
    && String(input.claimedCategory) !== ability.category) {
    fail("SPECIAL_ABILITY_CATEGORY_FORGERY", ability.abilityId);
  }
  const body = {
    schema: "starcraft_tmg_official_special_ability_classification_v1",
    abilityId: ability.abilityId,
    name: ability.name,
    canonicalName: ability.canonicalName,
    category: ability.category,
    sourceKind: ability.sourceKind,
    sourceRecordKey: ability.sourceRecordKey,
    sourceRecordHash: ability.sourceRecordHash,
    definitionHash: ability.definitionHash,
    activePassiveReactionExhaustive: true,
    timingDetailsDeferredToCategoryExecutors: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function resolveOfficialAbilityTargetingPrimitiveV1(input = {}) {
  const mode = String(input.targetingMode || "");
  if (!TARGETING_MODES.has(mode)
    || input.targetingDeclarationComplete !== true
    || input.rulesOwnedDeclaration !== true) {
    fail("SPECIAL_ABILITY_TARGETING_DECLARATION_REQUIRED");
  }
  const targetUnitId = String(input.targetUnitId || "").trim();
  let lineOfSightRequired = false;
  let rangeRequired = false;
  let targetRequired = false;
  let placementKind = "";
  if (mode === "targeted") {
    targetRequired = true; lineOfSightRequired = true; rangeRequired = true;
    if (!targetUnitId || input.rangeSatisfied !== true
      || input.lineOfSightSatisfied !== true
      || input.lineOfSightEvaluated !== true) {
      fail("SPECIAL_ABILITY_TARGET_REQUIREMENTS_UNSATISFIED");
    }
  } else if (mode === "untargeted") {
    if (targetUnitId || input.lineOfSightEvaluated !== false
      || input.rangeSatisfied !== undefined
      || input.lineOfSightSatisfied !== undefined) {
      fail("SPECIAL_ABILITY_UNTARGETED_LOS_EXEMPTION_INVALID");
    }
  } else {
    placementKind = String(input.placementKind || "");
    if (!new Set(["marker", "token"]).has(placementKind)
      || targetUnitId || input.lineOfSightEvaluated !== false
      || input.rangeSatisfied !== undefined
      || input.lineOfSightSatisfied !== undefined) {
      fail("SPECIAL_ABILITY_TOKEN_MARKER_NOT_TARGET_INVALID");
    }
  }
  const body = {
    schema: "starcraft_tmg_official_special_ability_targeting_resolution_v1",
    targetingMode: mode,
    targetUnitId,
    placementKind,
    targetRequired,
    rangeRequired,
    lineOfSightRequired,
    lineOfSightEvaluated: input.lineOfSightEvaluated,
    targetRangeAndLosDelegatedToExistingExecutor: mode === "targeted",
    tokenOrMarkerPlacementIsTarget: false,
    untargetedLosExemptUnlessSpecificRuleStatesOtherwise: true,
    rulesOwnedDeclaration: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function resolveOfficialSameNamedSpecialAbilityEffectsV1(input = {}) {
  const bundle = input.dataBundle;
  if (input.simultaneousSetComplete !== true
    || !Array.isArray(input.instances) || input.instances.length < 1
    || input.instances.length > 64) {
    fail("SPECIAL_ABILITY_SIMULTANEOUS_SET_INCOMPLETE");
  }
  const instanceIds = new Set();
  const instances = input.instances.map((raw) => {
    const instanceId = nonEmpty(raw?.instanceId, "SPECIAL_ABILITY_INSTANCE_INVALID");
    if (instanceIds.has(instanceId) || raw.simultaneous !== true) {
      fail("SPECIAL_ABILITY_INSTANCE_INVALID", instanceId);
    }
    instanceIds.add(instanceId);
    const ability = abilityById(bundle, raw.abilityId);
    return { instanceId, abilityId: ability.abilityId, name: ability.name,
      canonicalName: ability.canonicalName, category: ability.category,
      definitionHash: ability.definitionHash };
  });
  const names = new Set(instances.map((entry) => entry.canonicalName));
  if (names.size !== 1) fail("SPECIAL_ABILITY_SAME_NAME_SET_REQUIRED");
  const definitions = new Set(instances.map((entry) => entry.definitionHash));
  if (definitions.size !== 1) {
    fail("SPECIAL_ABILITY_SAME_NAME_EFFECT_CONFLICT_UNRESOLVED",
      [...names][0]);
  }
  const sorted = [...instances].sort((left, right) => (
    left.instanceId.localeCompare(right.instanceId)
  ));
  const body = {
    schema: "starcraft_tmg_official_same_named_special_ability_resolution_v1",
    canonicalName: sorted[0].canonicalName,
    selectedInstance: sorted[0],
    suppressedInstances: sorted.slice(1),
    simultaneousInstanceCount: sorted.length,
    effectiveInstanceCount: 1,
    sameNamedEffectsStack: false,
    differentDefinitionConflictFailsClosed: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function evaluateOfficialRepeatablePermissionV1(input = {}) {
  const bundle = input.dataBundle;
  const repeatable = keywordByTitle(bundle, "REPEATABLE");
  const ability = abilityById(bundle, input.abilityId);
  const granted = ability.repeatableKeywordPresent === true;
  if ((input.repeatableKeywordId !== undefined
      && input.repeatableKeywordId !== repeatable.keywordId)
    || (input.repeatableMeaningHash !== undefined
      && input.repeatableMeaningHash !== repeatable.meaningHash)
    || input.repeatableGranted !== undefined) {
    fail("REPEATABLE_KEYWORD_FORGERY", ability.abilityId);
  }
  const usesThisRound = integer(input.usesThisRound, 0, 999,
    "REPEATABLE_USE_COUNT_INVALID");
  const usesThisActivation = integer(input.usesThisActivation, 0, 999,
    "REPEATABLE_USE_COUNT_INVALID");
  const costPaid = input.costPaid === true;
  const triggerSatisfied = input.triggerSatisfied === true;
  const normalFrequencyAvailable = input.normalFrequencyAvailable === true;
  const permittedByFrequency = granted || normalFrequencyAvailable;
  const usePermitted = permittedByFrequency && costPaid && triggerSatisfied;
  const body = {
    schema: "starcraft_tmg_official_repeatable_permission_v1",
    abilityId: ability.abilityId,
    abilityName: ability.name,
    category: ability.category,
    repeatableGranted: granted,
    repeatableKeywordId: granted ? repeatable.keywordId : "",
    repeatableMeaningHash: granted ? repeatable.meaningHash : "",
    usesThisRound,
    usesThisActivation,
    normalFrequencyAvailable,
    normalOncePerRoundLimitBypassed: granted,
    multipleUsesPerRoundAllowed: granted,
    multipleUsesPerActivationAllowed: granted,
    costPaid,
    triggerSatisfied,
    usePermitted,
    allCostsAndTriggersRequiredEveryUse: true,
    clientSuppliedFrequencyResultAccepted: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function certifyOfficialKeywordSpecialAbilityPlanV1(input = {}) {
  const plan = input.plan;
  const procedureKind = String(input.procedureKind || "");
  const bundle = input.dataBundle;
  verifyOfficialKeywordSpecialAbilityDataBundleV1(bundle);
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind
    || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult === true) {
    fail("KEYWORD_SPECIAL_ABILITY_PLAN_INVALID");
  }
  const planId = nonEmpty(plan.planId, "KEYWORD_SPECIAL_ABILITY_PLAN_INVALID");
  let result;
  if (procedureKind === "keyword_resolution") {
    result = resolveOfficialKeywordUsesV1({ ...plan.input, dataBundle: bundle });
  } else if (procedureKind === "special_ability_classification") {
    result = classifyOfficialSpecialAbilityV1({ ...plan.input, dataBundle: bundle });
  } else if (procedureKind === "targeting_resolution") {
    result = resolveOfficialAbilityTargetingPrimitiveV1(plan.input);
  } else if (procedureKind === "same_name_nonstack") {
    result = resolveOfficialSameNamedSpecialAbilityEffectsV1({
      ...plan.input, dataBundle: bundle,
    });
  } else {
    result = evaluateOfficialRepeatablePermissionV1({ ...plan.input, dataBundle: bundle });
  }
  const body = {
    schema: "starcraft_tmg_official_keyword_special_ability_plan_certificate_v1",
    planId,
    procedureKind,
    sideKey: String(plan.sideKey || ""),
    dataBundleHash: bundle.bundleHash,
    result,
    rulesOwnedInputsComplete: true,
    clientSuppliedResultAccepted: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialKeywordSpecialAbilityPlanCertificateV1(input = {}) {
  const rebuilt = certifyOfficialKeywordSpecialAbilityPlanV1({
    plan: input.plan, procedureKind: input.procedureKind,
    dataBundle: input.dataBundle,
  });
  if (!isDeepStrictEqual(rebuilt, input.certificate)) {
    fail("KEYWORD_SPECIAL_ABILITY_PLAN_CERTIFICATE_DRIFT");
  }
  return true;
}

export function officialKeywordSpecialAbilityProcedureKindsV1() {
  return [...PROCEDURE_KINDS].sort();
}
