import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialDiceTestModifierDataBundleV1 } from
  "../source-data/official-dice-test-modifier-data-bundle-v1.mjs";

export const OFFICIAL_MODIFIER_REGISTRY_SCHEMA =
  "starcraft_tmg_official_modifier_registry_v1";
export const OFFICIAL_REROLL_GRANT_SCHEMA =
  "starcraft_tmg_official_reroll_grant_v1";
export const OFFICIAL_COCKED_DICE_AGREEMENT_SCHEMA =
  "starcraft_tmg_official_cocked_dice_agreement_v1";

const MODIFIER_SOURCE_KINDS = new Set(["buff", "debuff", "modifier"]);
const TEST_CLASS_SOURCES = Object.freeze({
  attribute: new Set(["special_rule", "weapon_profile"]),
  characteristic: new Set(["unit_profile"]),
});
const INVALID_DIE_CONDITIONS = Object.freeze([
  "ambiguous_at_glance",
  "lodged_against_terrain",
  "off_table",
  "tilted_on_base",
  "not_flat_on_playing_surface",
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
function hash(value, code) {
  const normalized = String(value || "");
  if (!/^[a-f0-9]{64}$/u.test(normalized)) fail(code);
  return normalized;
}
function integer(value, minimum, maximum, code) {
  const normalized = Number(value);
  if (!Number.isSafeInteger(normalized)
    || normalized < minimum || normalized > maximum) fail(code);
  return normalized;
}
function canonicalTargetNumber(value) {
  if (value === null || value === undefined || value === "-") return null;
  return integer(value, 2, 6, "DICE_TARGET_NUMBER_INVALID");
}
function modifierSignedValue(claim) {
  if (claim.sourceKind === "buff") return claim.magnitude;
  if (claim.sourceKind === "debuff") return -claim.magnitude;
  return claim.signedValue;
}

export function createOfficialModifierRegistryV1(input = {}) {
  if (input.rulesOwned !== true
    || input.claimsComplete !== true
    || input.sameNamedSourceClaimsConsolidated !== true
    || !Array.isArray(input.claims)
    || input.claims.length > 64) {
    fail("DICE_MODIFIER_REGISTRY_INCOMPLETE");
  }
  const ids = new Set();
  const sourceNames = new Set();
  const claims = input.claims.map((raw) => {
    const claimId = nonEmpty(raw?.claimId, "DICE_MODIFIER_CLAIM_INVALID");
    const sourceName = nonEmpty(raw?.sourceName,
      "DICE_MODIFIER_CLAIM_INVALID");
    const sourceKind = nonEmpty(raw?.sourceKind,
      "DICE_MODIFIER_CLAIM_INVALID");
    const sourceKey = sourceName.toLocaleLowerCase("en-US");
    if (ids.has(claimId) || sourceNames.has(sourceKey)
      || !MODIFIER_SOURCE_KINDS.has(sourceKind)
      || raw.targetClass !== "target_number"
      || raw.differentNamedSourcesCumulative !== true
      || raw.stackingOverrideApplied === true) {
      fail("DICE_MODIFIER_CLAIM_INVALID", claimId);
    }
    ids.add(claimId); sourceNames.add(sourceKey);
    const common = {
      claimId,
      sourceName,
      sourceKind,
      sourceArtifactId: nonEmpty(raw.sourceArtifactId,
        "DICE_MODIFIER_CLAIM_INVALID"),
      sourceContentHash: hash(raw.sourceContentHash,
        "DICE_MODIFIER_CLAIM_INVALID"),
      sourceTextHash: hash(raw.sourceTextHash,
        "DICE_MODIFIER_CLAIM_INVALID"),
      targetClass: "target_number",
      differentNamedSourcesCumulative: true,
      stackingOverrideApplied: false,
    };
    if (sourceKind === "modifier") {
      const signedValue = integer(raw.signedValue, -6, 6,
        "DICE_MODIFIER_CLAIM_INVALID");
      if (signedValue === 0 || raw.magnitude !== undefined) {
        fail("DICE_MODIFIER_CLAIM_INVALID", claimId);
      }
      return { ...common, signedValue };
    }
    if (raw.signedValue !== undefined) {
      fail("DICE_MODIFIER_CLAIM_INVALID", claimId);
    }
    return { ...common, magnitude: integer(raw.magnitude, 1, 6,
      "DICE_MODIFIER_CLAIM_INVALID") };
  }).sort((left, right) => left.claimId.localeCompare(right.claimId));
  const body = {
    schema: OFFICIAL_MODIFIER_REGISTRY_SCHEMA,
    rulesOwned: true,
    claimsComplete: true,
    sameNamedSourceClaimsConsolidated: true,
    claims,
    differentNamedSourcesStackByDefault: true,
    sameNamedSourceImplicitStackingAllowed: false,
    clientSuppliedFinalTargetNumberAccepted: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, registryHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialModifierRegistryV1(registry) {
  if (!object(registry)
    || registry.schema !== OFFICIAL_MODIFIER_REGISTRY_SCHEMA
    || registry.rulesOwned !== true || registry.claimsComplete !== true
    || registry.sameNamedSourceClaimsConsolidated !== true
    || registry.differentNamedSourcesStackByDefault !== true
    || registry.sameNamedSourceImplicitStackingAllowed !== false
    || registry.clientSuppliedFinalTargetNumberAccepted !== false
    || registry.trainingTruth !== false
    || registry.registryHash !== hashStarcraftTmgContract(without(registry,
      ["registryHash"]))) {
    fail("DICE_MODIFIER_REGISTRY_INVALID");
  }
  const rebuilt = createOfficialModifierRegistryV1(registry);
  if (!isDeepStrictEqual(registry, rebuilt)) fail("DICE_MODIFIER_REGISTRY_DRIFT");
  return true;
}

export function resolveOfficialTargetNumberV1(input = {}) {
  verifyOfficialModifierRegistryV1(input.modifierRegistry);
  const baseTargetNumber = canonicalTargetNumber(input.baseTargetNumber);
  const appliedClaims = input.modifierRegistry.claims.map((claim) => ({
    claimId: claim.claimId,
    sourceName: claim.sourceName,
    sourceKind: claim.sourceKind,
    signedModifier: modifierSignedValue(claim),
    direction: modifierSignedValue(claim) > 0
      ? "reduce_target_number" : "increase_target_number",
  }));
  const totalSignedModifier = appliedClaims.reduce((sum, claim) => (
    sum + claim.signedModifier
  ), 0);
  const nullCapability = baseTargetNumber === null;
  const unboundedTargetNumber = nullCapability
    ? null : baseTargetNumber - totalSignedModifier;
  const finalTargetNumber = nullCapability
    ? null : Math.max(2, Math.min(6, unboundedTargetNumber));
  const body = {
    schema: "starcraft_tmg_official_target_number_resolution_v1",
    baseTargetNumber,
    modifierRegistryHash: input.modifierRegistry.registryHash,
    appliedClaims,
    totalSignedModifier,
    unboundedTargetNumber,
    finalTargetNumber,
    lowerBound: 2,
    upperBound: 6,
    positiveModifierReducesTargetNumber: true,
    negativeModifierIncreasesTargetNumber: true,
    buffReducesTargetNumber: true,
    debuffIncreasesTargetNumber: true,
    modifiesTargetNumberNotDieResult: true,
    modifiersAppliedBeforeRoll: true,
    nullCapability,
    rollAllowed: !nullCapability,
    modifierCanGrantNullRoll: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body,
    targetNumberResolutionHash: hashStarcraftTmgContract(body) });
}

export function classifyOfficialTestV1(input = {}) {
  const testClass = nonEmpty(input.testClass, "DICE_TEST_CLASS_INVALID");
  const sourceClass = nonEmpty(input.sourceClass, "DICE_TEST_CLASS_INVALID");
  if (!TEST_CLASS_SOURCES[testClass]?.has(sourceClass)) {
    fail("DICE_TEST_CLASS_INVALID", `${testClass}:${sourceClass}`);
  }
  const body = {
    schema: "starcraft_tmg_official_test_classification_v1",
    testClass,
    sourceClass,
    characteristicTest: testClass === "characteristic",
    attributeTest: testClass === "attribute",
    hasTargetNumber: true,
    valueGeneration: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body,
    classificationHash: hashStarcraftTmgContract(body) });
}

export function evaluateOfficialTestRollsV1(input = {}) {
  const classification = classifyOfficialTestV1(input.classification || input);
  const target = resolveOfficialTargetNumberV1({
    baseTargetNumber: input.baseTargetNumber,
    modifierRegistry: input.modifierRegistry,
  });
  if (!target.rollAllowed) fail("DICE_NULL_CAPABILITY_ROLL_FORBIDDEN");
  if (!Array.isArray(input.rolls) || input.rolls.length < 1
    || input.rolls.length > 64) fail("DICE_TEST_ROLLS_INVALID");
  const results = input.rolls.map((raw, index) => {
    const roll = integer(raw, 1, 6, "DICE_TEST_ROLL_INVALID");
    const automaticSuccess = roll === 6;
    const automaticFailure = roll === 1;
    return {
      index, roll,
      automaticSuccess,
      automaticFailure,
      success: automaticSuccess || (!automaticFailure
        && roll >= target.finalTargetNumber),
    };
  });
  const body = {
    schema: "starcraft_tmg_official_test_roll_resolution_v1",
    classification,
    targetNumberResolution: target,
    rolls: results,
    successCount: results.filter((entry) => entry.success).length,
    failureCount: results.filter((entry) => !entry.success).length,
    equalOrExceedSucceeds: true,
    naturalSixAlwaysSucceeds: true,
    naturalOneAlwaysFails: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body,
    testResolutionHash: hashStarcraftTmgContract(body) });
}

export function createOfficialRerollGrantV1(input = {}) {
  if (input.rulesOwned !== true) fail("DICE_REROLL_GRANT_INVALID");
  const scope = nonEmpty(input.scope, "DICE_REROLL_GRANT_INVALID");
  if (!new Set(["default_single_die", "specified_multiple_dice"]).has(scope)) {
    fail("DICE_REROLL_GRANT_INVALID");
  }
  const maximumDice = scope === "default_single_die"
    ? 1 : integer(input.maximumDice, 2, 64, "DICE_REROLL_GRANT_INVALID");
  if (scope === "default_single_die" && input.maximumDice !== undefined
    && Number(input.maximumDice) !== 1) fail("DICE_REROLL_GRANT_INVALID");
  const body = {
    schema: OFFICIAL_REROLL_GRANT_SCHEMA,
    rulesOwned: true,
    sourceArtifactId: nonEmpty(input.sourceArtifactId,
      "DICE_REROLL_GRANT_INVALID"),
    sourceContentHash: hash(input.sourceContentHash, "DICE_REROLL_GRANT_INVALID"),
    sourceTextHash: hash(input.sourceTextHash, "DICE_REROLL_GRANT_INVALID"),
    scope,
    maximumDice,
    defaultScopeIsSingleDie: true,
    specifiedMultipleDiceFollowAbility: scope === "specified_multiple_dice",
    clientSuppliedReplacementResultAccepted: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, grantHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialRerollGrantV1(grant) {
  if (!object(grant) || grant.schema !== OFFICIAL_REROLL_GRANT_SCHEMA
    || grant.rulesOwned !== true || grant.defaultScopeIsSingleDie !== true
    || grant.clientSuppliedReplacementResultAccepted !== false
    || grant.trainingTruth !== false
    || grant.grantHash !== hashStarcraftTmgContract(without(grant, ["grantHash"]))) {
    fail("DICE_REROLL_GRANT_INVALID");
  }
  const rebuilt = createOfficialRerollGrantV1(grant);
  if (!isDeepStrictEqual(grant, rebuilt)) fail("DICE_REROLL_GRANT_DRIFT");
  return true;
}

export function resolveOfficialRerollV1(input = {}) {
  verifyOfficialRerollGrantV1(input.grant);
  if (!Array.isArray(input.originalRolls) || input.originalRolls.length < 1
    || input.originalRolls.length > 64
    || !Array.isArray(input.selectedIndices)
    || input.selectedIndices.length < 1
    || input.selectedIndices.length > input.grant.maximumDice
    || !Array.isArray(input.replacementRolls)
    || input.replacementRolls.length !== input.selectedIndices.length) {
    fail("DICE_REROLL_SELECTION_INVALID");
  }
  const originalRolls = input.originalRolls.map((value) => integer(value, 1, 6,
    "DICE_REROLL_RESULT_INVALID"));
  const selectedIndices = input.selectedIndices.map((value) => integer(value, 0,
    originalRolls.length - 1, "DICE_REROLL_SELECTION_INVALID"));
  if (new Set(selectedIndices).size !== selectedIndices.length) {
    fail("DICE_REROLL_SELECTION_INVALID");
  }
  const replacementRolls = input.replacementRolls.map((value) => integer(value,
    1, 6, "DICE_REROLL_RESULT_INVALID"));
  const finalRolls = [...originalRolls];
  const replacements = selectedIndices.map((index, offset) => {
    const original = originalRolls[index];
    const replacement = replacementRolls[offset];
    finalRolls[index] = replacement;
    return { index, original, replacement,
      replacementIsWorse: replacement < original };
  });
  const body = {
    schema: "starcraft_tmg_official_reroll_resolution_v1",
    grantHash: input.grant.grantHash,
    originalRolls,
    selectedIndices,
    replacementRolls,
    replacements,
    finalRolls,
    replacementAlwaysWinsEvenWhenWorse: true,
    originalResultRetainedForAudit: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body,
    rerollResolutionHash: hashStarcraftTmgContract(body) });
}

function canonicalGeneratedExpression(input = {}) {
  const dieKind = nonEmpty(input.dieKind, "DICE_GENERATED_EXPRESSION_INVALID");
  if (!new Set(["D3", "D6"]).has(dieKind)) {
    fail("DICE_GENERATED_EXPRESSION_INVALID");
  }
  return {
    dieKind,
    diceCount: integer(input.diceCount, 1, 64,
      "DICE_GENERATED_EXPRESSION_INVALID"),
    fixedAddition: integer(input.fixedAddition ?? 0, 0, 64,
      "DICE_GENERATED_EXPRESSION_INVALID"),
  };
}

export function evaluateOfficialGeneratedValueV1(input = {}) {
  const expression = canonicalGeneratedExpression(input.expression);
  if (!Array.isArray(input.rawD6Rolls)
    || input.rawD6Rolls.length !== expression.diceCount) {
    fail("DICE_GENERATED_ROLLS_INVALID");
  }
  const rawD6Rolls = input.rawD6Rolls.map((value) => integer(value, 1, 6,
    "DICE_GENERATED_ROLL_INVALID"));
  const generatedDice = rawD6Rolls.map((value) => (
    expression.dieKind === "D3" ? Math.ceil(value / 2) : value
  ));
  const diceTotal = generatedDice.reduce((sum, value) => sum + value, 0);
  const body = {
    schema: "starcraft_tmg_official_generated_value_resolution_v1",
    expression,
    rawD6Rolls,
    generatedDice,
    diceTotal,
    fixedAddition: expression.fixedAddition,
    generatedValue: diceTotal + expression.fixedAddition,
    isTest: false,
    targetNumber: null,
    modifiersApplied: false,
    fixedAdditionIsTargetNumberModifier: false,
    naturalSuccessFailureApplied: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body,
    generatedValueResolutionHash: hashStarcraftTmgContract(body) });
}

export function createOfficialCockedDiceAgreementV1(input = {}) {
  if (input.rulesOwned !== true || input.agreementTiming !== "before_game"
    || input.ambiguousAtGlanceReroll !== true
    || !Array.isArray(input.playerSideKeys)
    || !Array.isArray(input.acceptedBySideKeys)) {
    fail("DICE_COCKED_AGREEMENT_INVALID");
  }
  const playerSideKeys = [...new Set(input.playerSideKeys.map((value) => (
    nonEmpty(value, "DICE_COCKED_AGREEMENT_INVALID")
  )))].sort();
  const acceptedBySideKeys = [...new Set(input.acceptedBySideKeys.map((value) => (
    nonEmpty(value, "DICE_COCKED_AGREEMENT_INVALID")
  )))].sort();
  if (playerSideKeys.length < 2
    || !isDeepStrictEqual(playerSideKeys, acceptedBySideKeys)) {
    fail("DICE_COCKED_AGREEMENT_INVALID");
  }
  const body = {
    schema: OFFICIAL_COCKED_DICE_AGREEMENT_SCHEMA,
    rulesOwned: true,
    agreementTiming: "before_game",
    playerSideKeys,
    acceptedBySideKeys,
    invalidConditions: [...INVALID_DIE_CONDITIONS],
    ambiguousAtGlanceReroll: true,
    flatClearPlayingSurfaceIsValid: true,
    digitalAuthorityRollsNeverCocked: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, agreementHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialCockedDiceAgreementV1(agreement) {
  if (!object(agreement)
    || agreement.schema !== OFFICIAL_COCKED_DICE_AGREEMENT_SCHEMA
    || agreement.rulesOwned !== true
    || agreement.digitalAuthorityRollsNeverCocked !== true
    || agreement.trainingTruth !== false
    || agreement.agreementHash !== hashStarcraftTmgContract(without(agreement,
      ["agreementHash"]))) fail("DICE_COCKED_AGREEMENT_INVALID");
  const rebuilt = createOfficialCockedDiceAgreementV1(agreement);
  if (!isDeepStrictEqual(agreement, rebuilt)) fail("DICE_COCKED_AGREEMENT_DRIFT");
  return true;
}

export function classifyOfficialPhysicalDieV1(input = {}) {
  verifyOfficialCockedDiceAgreementV1(input.agreement);
  const condition = nonEmpty(input.condition, "DICE_PHYSICAL_OBSERVATION_INVALID");
  const invalid = input.agreement.invalidConditions.includes(condition);
  if (!invalid && condition !== "flat_clear_on_playing_surface") {
    fail("DICE_PHYSICAL_OBSERVATION_INVALID", condition);
  }
  const body = {
    schema: "starcraft_tmg_official_physical_die_validity_v1",
    agreementHash: input.agreement.agreementHash,
    condition,
    invalid,
    rerollRequired: invalid,
    originalResultAccepted: !invalid,
    defaultAmbiguousAtGlancePolicy: "reroll",
    trainingTruth: false,
  };
  return freezeDeep({ ...body,
    validityHash: hashStarcraftTmgContract(body) });
}

export function resolveOfficialInvalidDieRerollV1(input = {}) {
  const validity = classifyOfficialPhysicalDieV1(input);
  if (!validity.rerollRequired) fail("DICE_INVALID_REROLL_NOT_REQUIRED");
  const expression = canonicalGeneratedExpression({
    dieKind: input.dieKind,
    diceCount: 1,
    fixedAddition: 0,
  });
  const generated = evaluateOfficialGeneratedValueV1({
    expression,
    rawD6Rolls: [input.rawD6Roll],
  });
  const body = {
    schema: "starcraft_tmg_official_invalid_die_reroll_resolution_v1",
    validity,
    dieKind: expression.dieKind,
    replacementRawD6Roll: generated.rawD6Rolls[0],
    replacementResult: generated.generatedDice[0],
    originalInvalidResultDiscarded: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body,
    invalidDieRerollHash: hashStarcraftTmgContract(body) });
}

export function certifyOfficialDiceTestModifierPlanV1(input = {}) {
  verifyOfficialDiceTestModifierDataBundleV1(input.dataBundle);
  const state = input.state;
  const plan = input.plan;
  if (!object(state) || !object(plan) || !object(state.players)) {
    fail("DICE_RULES_PLAN_INVALID");
  }
  const sideKey = nonEmpty(plan.sideKey || state.activeSideKey,
    "DICE_RULES_PLAN_INVALID");
  if (!object(state.players[sideKey])) fail("DICE_RULES_PLAN_INVALID");
  const planId = nonEmpty(plan.planId, "DICE_RULES_PLAN_INVALID");
  const procedureKind = nonEmpty(input.procedureKind,
    "DICE_RULES_PLAN_INVALID");
  if (procedureKind !== plan.kind) fail("DICE_RULES_PLAN_KIND_MISMATCH");
  let payload;
  if (plan.kind === "modifier_query") {
    verifyOfficialModifierRegistryV1(plan.modifierRegistry);
    const resolution = resolveOfficialTargetNumberV1({
      baseTargetNumber: plan.baseTargetNumber,
      modifierRegistry: plan.modifierRegistry,
    });
    payload = { baseTargetNumber: resolution.baseTargetNumber,
      modifierRegistry: clone(plan.modifierRegistry) };
  } else if (plan.kind === "test") {
    verifyOfficialModifierRegistryV1(plan.modifierRegistry);
    const classification = classifyOfficialTestV1(plan);
    const baseTargetNumber = canonicalTargetNumber(plan.baseTargetNumber);
    const rollCount = baseTargetNumber === null ? 0 : integer(plan.rollCount, 1, 64,
      "DICE_RULES_PLAN_INVALID");
    if (baseTargetNumber === null && Number(plan.rollCount || 0) !== 0) {
      fail("DICE_NULL_CAPABILITY_ROLL_FORBIDDEN");
    }
    if (plan.rerollGrant !== null && plan.rerollGrant !== undefined) {
      verifyOfficialRerollGrantV1(plan.rerollGrant);
      if (baseTargetNumber === null) fail("DICE_NULL_CAPABILITY_ROLL_FORBIDDEN");
    }
    payload = {
      testId: nonEmpty(plan.testId, "DICE_RULES_PLAN_INVALID"),
      classification,
      baseTargetNumber,
      modifierRegistry: clone(plan.modifierRegistry),
      rollCount,
      rerollGrant: plan.rerollGrant ? clone(plan.rerollGrant) : null,
    };
  } else if (plan.kind === "generated_value") {
    payload = { expression: canonicalGeneratedExpression(plan.expression) };
  } else if (plan.kind === "invalid_die_reroll") {
    verifyOfficialCockedDiceAgreementV1(plan.agreement);
    const expectedPlayers = Object.keys(state.players).sort();
    if (!isDeepStrictEqual(plan.agreement.playerSideKeys, expectedPlayers)) {
      fail("DICE_COCKED_AGREEMENT_PLAYER_DRIFT");
    }
    const validity = classifyOfficialPhysicalDieV1({
      agreement: plan.agreement,
      condition: plan.condition,
    });
    if (!validity.rerollRequired
      || !new Set(["D3", "D6"]).has(plan.dieKind)) {
      fail("DICE_RULES_PLAN_INVALID");
    }
    payload = { agreement: clone(plan.agreement), condition: validity.condition,
      dieKind: plan.dieKind };
  } else {
    fail("DICE_RULES_PLAN_KIND_INVALID", plan.kind);
  }
  const body = {
    schema: "starcraft_tmg_official_dice_test_modifier_plan_certificate_v1",
    planId,
    kind: plan.kind,
    sideKey,
    payload,
    sourceLockHash: input.dataBundle.sourceLockHash,
    dataBundleHash: input.dataBundle.bundleHash,
    candidateDerivedByRules: true,
    clientSuppliedDiceResultAccepted: false,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}
