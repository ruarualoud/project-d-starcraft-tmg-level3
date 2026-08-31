import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialDiceTestModifierDataBundleV1 } from
  "../source-data/official-dice-test-modifier-data-bundle-v1.mjs";
import {
  certifyOfficialDiceTestModifierPlanV1,
  evaluateOfficialGeneratedValueV1,
  evaluateOfficialTestRollsV1,
  resolveOfficialInvalidDieRerollV1,
  resolveOfficialRerollV1,
  resolveOfficialTargetNumberV1,
  verifyOfficialRerollGrantV1,
} from "./official-dice-test-modifier-rules-kernel-v1.mjs";

export const OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_ID =
  "authority.dice-test-modifier-rules-v1";
export const OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_DICE_TEST_MODIFIER_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_TYPE =
  "resolve_dice_test_modifier_rules_procedure";
export const OFFICIAL_DICE_TEST_MODIFIER_RULES_PARAMETER_KIND =
  "official_dice_test_modifier_rules_choice_v1";
export const OFFICIAL_DICE_TEST_MODIFIER_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_dice_test_modifier_rules_pending_v1";

export const OFFICIAL_DICE_TEST_MODIFIER_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:buff-target-number-reduction",
  "rule-atom:debuff-target-number-increase",
  "rule-atom:positive-modifier-direction",
  "rule-atom:singleton:core-11-modifier-fixed-addition-distinction:295b5b260950",
  "rule-atom:singleton:core-11-modifier-source-stacking:1266faa4a54d",
  "rule-atom:singleton:core-3-3-reroll-replacement:c7101e37f18a",
  "rule-atom:singleton:core-3-3-reroll-scope:a316ca03d15f",
  "rule-atom:singleton:core-3-4-ability-modifier-interpretation:dc9607fe24a6",
  "rule-atom:singleton:core-3-4-named-source-stacking:7090004f2209",
  "rule-atom:singleton:core-3-4-null-capability:63380b2ebe57",
  "rule-atom:singleton:core-3-5-generated-value-expression:774f014c3f02",
  "rule-atom:singleton:core-3-7-attribute-test:a09e616ffd2b",
  "rule-atom:singleton:core-3-7-characteristic-test:50d030f245a8",
  "rule-atom:singleton:core-3-7-test-definition:dfc343598b45",
  "rule-atom:singleton:core-3-7-test-resolution:053e9eaebbbe",
  "rule-atom:singleton:core-3-7-value-generation-is-not-test:b05dd444a2d7",
  "rule-atom:singleton:core-3-8-cocked-die-agreement:2368b302dd6d",
  "rule-atom:singleton:core-3-8-invalid-die-reroll:95c0984a4da1",
].sort());
export const OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_ATOM_IDS =
  OFFICIAL_DICE_TEST_MODIFIER_RULES_NEW_ATOM_IDS;
export const OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_DICE_TEST_MODIFIER_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = Object.freeze([
  "generated_value",
  "invalid_die_reroll",
  "modifier_query",
  "test",
]);
const CHANCE_LAYOUT_KEYS = Object.freeze([
  "testInitial", "testReroll", "generatedValue", "invalidDieReroll",
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
function hashBody(value, field) {
  return hashStarcraftTmgContract(without(value, [field]));
}
function chance(counts) {
  const layout = Object.fromEntries(CHANCE_LAYOUT_KEYS.map((key) => [
    key, Number(counts[key] || 0),
  ]));
  const count = Object.values(layout).reduce((sum, value) => sum + value, 0);
  return count === 0 ? null : {
    kind: "fixed_roll_sequence", faces: 6, count, layout,
  };
}
function verifySourceAndData(state, matchBinding = null) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const bundle = state?.officialDiceTestModifierDataBundle;
  if (!object(audit)
    || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("DICE_RULES_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialDiceTestModifierDataBundleV1(bundle);
  if (matchBinding) {
    const expectedDataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dependencies?.dataSnapshot?.contentHash !== expectedDataHash
      || matchBinding.dataSnapshotHash !== expectedDataHash) {
      fail("DICE_RULES_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}
function stateProjection(state, pending) {
  return hashStarcraftTmgContract({
    round: Number(state.round), phase: state.phase,
    activeSideKey: state.activeSideKey,
    players: state.players,
    diceRulesHistory: state.diceRulesHistory || [],
    lastDiceTestModifierResolution: state.lastDiceTestModifierResolution || null,
    officialDiceTestModifierDataBundle: state.officialDiceTestModifierDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false,
  });
}

export function openOfficialDiceTestModifierRulesPendingV1(stateInput,
  procedure = {}) {
  const state = clone(stateInput);
  const dataBundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.includes(procedureKind)
    || !object(state.players?.[sideKey])
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0
    || procedure.candidatePlans.length > 64) {
    fail("DICE_RULES_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => (
    certifyOfficialDiceTestModifierPlanV1({
      state, plan: { ...plan, sideKey }, procedureKind, dataBundle,
    })
  ));
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("DICE_RULES_PLAN_ID_DUPLICATE");
  }
  const body = {
    schema: OFFICIAL_DICE_TEST_MODIFIER_RULES_PENDING_SCHEMA,
    stage: "choose_certified_dice_test_modifier_plan",
    round: Number(state.round), phase: state.phase, sideKey,
    procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `dice-rules-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: {
      candidatePlansComplete: true,
      rulesDenominatorComplete: true,
      diceAuthority: "official_dice_test_modifier_rules_kernel_v1",
      chanceResultsPreallocatedByAuthority: true,
      clientSuppliedDiceResultAccepted: false,
    },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    diceTestModifierDataBundleHash: dataBundle.bundleHash,
    stateProjectionHash: "",
    sourceRefreshPerformed: false,
    repositoryFallbackUsed: false,
    trainingTruth: false,
  };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}
function verifyPending(state, matchBinding = null) {
  const bundle = verifySourceAndData(state, matchBinding);
  const pending = state?.pendingAction;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_DICE_TEST_MODIFIER_RULES_PENDING_SCHEMA
    || !new Set(["choose_certified_dice_test_modifier_plan", "choose_reroll"])
      .has(pending.stage)
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.diceTestModifierDataBundleHash !== bundle.bundleHash
    || pending.rulesCertificate?.candidatePlansComplete !== true
    || pending.rulesCertificate?.rulesDenominatorComplete !== true
    || pending.rulesCertificate?.chanceResultsPreallocatedByAuthority !== true
    || pending.rulesCertificate?.clientSuppliedDiceResultAccepted !== false
    || pending.sourceRefreshPerformed !== false
    || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) {
    fail("DICE_RULES_PENDING_INVALID");
  }
  if (pending.stage === "choose_reroll") {
    verifyOfficialRerollGrantV1(pending.rerollGrant);
    if (!object(pending.originalCertificate)
      || !object(pending.initialTestResolution)
      || pending.initialTestResolution.testResolutionHash
        !== hashBody(pending.initialTestResolution, "testResolutionHash")) {
      fail("DICE_RULES_PENDING_INVALID");
    }
  }
  return pending;
}
function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const choosingPlan = pending.stage === "choose_certified_dice_test_modifier_plan";
  const body = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_DICE_TEST_MODIFIER_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_TYPE,
    pieceId: "",
    executorId: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_ATOM_IDS],
    parameterSchema: choosingPlan ? {
      type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player",
    } : {
      type: "object", required: ["decision", "selectedIndices"],
      decision: { enum: ["keep_original", "reroll"] },
      selectedIndices: { type: "array", uniqueItems: true,
        items: { enum: pending.initialTestResolution.rolls.map((entry) => entry.index) },
        minItems: 0, maxItems: pending.rerollGrant.maximumDice },
      selectionOwner: "controlling_player_after_initial_result",
    },
    constraints: choosingPlan ? {
      stage: pending.stage,
      pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind,
      choices: clone(pending.choices),
      clientSuppliedDiceResultAccepted: false,
    } : {
      stage: pending.stage,
      pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      originalPlanHash: pending.originalCertificate.planHash,
      initialTestResolutionHash: pending.initialTestResolution.testResolutionHash,
      rerollGrantHash: pending.rerollGrant.grantHash,
      maximumRerollDice: pending.rerollGrant.maximumDice,
      availableIndices: pending.initialTestResolution.rolls.map((entry) => entry.index),
      originalResultVisibleBeforeChoice: true,
      clientSuppliedDiceResultAccepted: false,
    },
    confirmationClass: "explicit_human",
    rulesTruth: choosingPlan
      ? "official_dice_test_modifier_plan_choice"
      : "official_post_initial_roll_reroll_choice",
    trainingTruth: false,
  };
  return freezeDeep({ ...body,
    domainId: `sc-domain-${hashStarcraftTmgContract(body)}` });
}

export function enumerateOfficialDiceTestModifierRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  if (state?.pendingAction?.schema
    !== OFFICIAL_DICE_TEST_MODIFIER_RULES_PENDING_SCHEMA) {
    return { candidates, parameterDomains };
  }
  try {
    parameterDomains.push(domainFor(state, options));
  } catch (error) {
    if (options.includeDisabled === true) candidates.push({
      actionType: OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_TYPE,
      executorId: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_ATOM_IDS],
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0,
      details: { trainingTruth: false },
    });
  }
  return { candidates, parameterDomains };
}

function validateRerollParameters(domain, parameters) {
  if (!object(parameters)
    || Object.keys(parameters).some((key) => (
      !new Set(["decision", "selectedIndices"]).has(key)
    ))
    || !new Set(["keep_original", "reroll"]).has(parameters.decision)
    || !Array.isArray(parameters.selectedIndices)) {
    fail("DICE_RULES_REROLL_CHOICE_INVALID");
  }
  const selectedIndices = parameters.selectedIndices.map(Number).sort((a, b) => a - b);
  if (new Set(selectedIndices).size !== selectedIndices.length
    || selectedIndices.some((index) => !domain.constraints.availableIndices.includes(index))
    || selectedIndices.length > domain.constraints.maximumRerollDice
    || (parameters.decision === "keep_original" && selectedIndices.length !== 0)
    || (parameters.decision === "reroll" && selectedIndices.length === 0)) {
    fail("DICE_RULES_REROLL_CHOICE_INVALID");
  }
  return { decision: parameters.decision, selectedIndices };
}

export function instantiateOfficialDiceTestModifierRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) {
    fail("DICE_RULES_PARAMETER_DOMAIN_STALE");
  }
  let canonicalParameters; let plan; let chanceSpec = null;
  if (expected.constraints.stage === "choose_certified_dice_test_modifier_plan") {
    if (!object(parameters) || Object.keys(parameters).length !== 1
      || typeof parameters.choiceId !== "string") {
      fail("DICE_RULES_CHOICE_INVALID");
    }
    const choice = expected.constraints.choices.find((entry) => (
      entry.choiceId === parameters.choiceId
    ));
    if (!choice) fail("DICE_RULES_CHOICE_INVALID");
    canonicalParameters = { choiceId: choice.choiceId };
    plan = {
      schema: "starcraft_tmg_official_dice_test_modifier_rules_plan_v1",
      stage: "initial",
      choiceId: choice.choiceId,
      planHash: choice.planHash,
      kind: choice.kind,
      pendingHash: expected.constraints.pendingHash,
    };
    if (choice.kind === "test" && choice.payload.rollCount > 0) {
      chanceSpec = chance({ testInitial: choice.payload.rollCount });
    } else if (choice.kind === "generated_value") {
      chanceSpec = chance({ generatedValue: choice.payload.expression.diceCount });
    } else if (choice.kind === "invalid_die_reroll") {
      chanceSpec = chance({ invalidDieReroll: 1 });
    }
  } else {
    canonicalParameters = validateRerollParameters(expected, parameters);
    plan = {
      schema: "starcraft_tmg_official_dice_test_modifier_rules_plan_v1",
      stage: "reroll_decision",
      decision: canonicalParameters.decision,
      selectedIndices: [...canonicalParameters.selectedIndices],
      originalPlanHash: expected.constraints.originalPlanHash,
      initialTestResolutionHash: expected.constraints.initialTestResolutionHash,
      rerollGrantHash: expected.constraints.rerollGrantHash,
      pendingHash: expected.constraints.pendingHash,
    };
    if (canonicalParameters.decision === "reroll") {
      chanceSpec = chance({ testReroll: canonicalParameters.selectedIndices.length });
    }
  }
  const planHash = hashStarcraftTmgContract(plan);
  const action = {
    actionType: OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_TYPE,
    sideKey: expected.sideKey,
    phase: expected.phase,
    pieceId: "",
    ruleAtomIds: [...OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_VERSION,
    diceTestModifierPlan: { ...plan, planHash },
    pendingHash: expected.constraints.pendingHash,
    domainId: expected.domainId,
    isEnabled: true,
    disabledReason: "",
    score: 1,
    details: { rulesTruth: expected.rulesTruth, trainingTruth: false },
  };
  if (chanceSpec) action.chance = chanceSpec;
  return { action: freezeDeep(action), canonicalParameters };
}

function revealValues(input, expectedCount) {
  if (expectedCount === 0) {
    if (input !== undefined && input !== null
      && (!Array.isArray(input) || input.length !== 0)) {
      fail("DICE_RULES_UNEXPECTED_REVEALS");
    }
    return [];
  }
  if (!Array.isArray(input) || input.length !== expectedCount) {
    fail("DICE_RULES_REVEALS_REQUIRED");
  }
  return input.map((entry, index) => {
    const faces = object(entry) ? Number(entry.faces) : 6;
    const outcome = object(entry) ? Number(entry.outcome) : Number(entry);
    if (faces !== 6 || !Number.isSafeInteger(outcome)
      || outcome < 1 || outcome > 6) {
      fail("DICE_RULES_REVEAL_INVALID", String(index));
    }
    return outcome;
  });
}
function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}
function appendHistory(state, action, resolution, eventType) {
  const entryBody = {
    schema: "starcraft_tmg_official_dice_rules_history_entry_v1",
    round: Number(state.round), phase: state.phase,
    sideKey: action.sideKey,
    actionType: action.actionType,
    actionHash: hashStarcraftTmgContract(contractAction(action)),
    eventType,
    resolution: clone(resolution),
    trainingTruth: false,
  };
  const entry = { ...entryBody, entryHash: hashStarcraftTmgContract(entryBody) };
  state.diceRulesHistory = Array.isArray(state.diceRulesHistory)
    ? state.diceRulesHistory : [];
  state.diceRulesHistory.push(entry);
  state.lastDiceTestModifierResolution = clone(resolution);
  return entry;
}
function appendLog(state, action, events) {
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    type: "dice_test_modifier_rules_resolution",
    round: Number(state.round), phase: state.phase,
    sideKey: action.sideKey,
    action: clone(action), events: clone(events), trainingTruth: false,
  });
}
function finish(state, action, resolution, eventType) {
  state.pendingAction = null;
  const history = appendHistory(state, action, resolution, eventType);
  const event = { type: eventType, sideKey: action.sideKey,
    resolution: clone(resolution), historyEntryHash: history.entryHash,
    trainingTruth: false };
  appendLog(state, action, [event]);
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_dice_test_modifier_rules_transition_v1",
    executorId: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(action), settlementRequired: false,
    rulesTruth: "official_dice_test_modifier_rules_resolved",
    trainingTruth: false };
}

export function applyOfficialDiceTestModifierRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(stateInput) || !object(actionInput)
    || actionInput.actionType !== OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_DICE_TEST_MODIFIER_RULES_ACTION_ATOM_IDS])) {
    fail("DICE_RULES_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  if (domain.domainId !== actionInput.domainId) fail("DICE_RULES_ACTION_STALE");
  const pending = verifyPending(stateInput, options.matchBinding);
  const parameters = pending.stage === "choose_certified_dice_test_modifier_plan"
    ? { choiceId: actionInput.diceTestModifierPlan?.choiceId }
    : { decision: actionInput.diceTestModifierPlan?.decision,
      selectedIndices: actionInput.diceTestModifierPlan?.selectedIndices };
  const expected = instantiateOfficialDiceTestModifierRulesV1(
    stateInput, domain, parameters, options,
  );
  if (!isDeepStrictEqual(contractAction(actionInput),
    contractAction(expected.action))) fail("DICE_RULES_ACTION_STALE");
  const state = clone(stateInput);
  if (pending.stage === "choose_reroll") {
    const decision = expected.canonicalParameters;
    const replacementRolls = revealValues(options.chanceReveals,
      decision.decision === "reroll" ? decision.selectedIndices.length : 0);
    let rerollResolution = null;
    let finalTestResolution = clone(pending.initialTestResolution);
    if (decision.decision === "reroll") {
      rerollResolution = resolveOfficialRerollV1({
        grant: pending.rerollGrant,
        originalRolls: pending.initialTestResolution.rolls.map((entry) => entry.roll),
        selectedIndices: decision.selectedIndices,
        replacementRolls,
      });
      finalTestResolution = evaluateOfficialTestRollsV1({
        classification: pending.originalCertificate.payload.classification,
        baseTargetNumber: pending.originalCertificate.payload.baseTargetNumber,
        modifierRegistry: pending.originalCertificate.payload.modifierRegistry,
        rolls: rerollResolution.finalRolls,
      });
    }
    const resolutionBody = {
      schema: "starcraft_tmg_official_test_with_reroll_resolution_v1",
      planHash: pending.originalCertificate.planHash,
      decision: decision.decision,
      initialTestResolution: clone(pending.initialTestResolution),
      rerollResolution,
      finalTestResolution,
      choiceOccurredAfterInitialResult: true,
      replacementAlwaysWinsEvenWhenWorse: true,
      trainingTruth: false,
    };
    const resolution = { ...resolutionBody,
      resolutionHash: hashStarcraftTmgContract(resolutionBody) };
    return finish(state, actionInput, resolution,
      decision.decision === "reroll" ? "dice_test_rerolled" : "dice_test_kept");
  }
  const certificate = pending.choices.find((entry) => (
    entry.choiceId === expected.canonicalParameters.choiceId
  ));
  if (!certificate) fail("DICE_RULES_ACTION_STALE");
  if (certificate.kind === "modifier_query") {
    revealValues(options.chanceReveals, 0);
    const resolution = resolveOfficialTargetNumberV1({
      baseTargetNumber: certificate.payload.baseTargetNumber,
      modifierRegistry: certificate.payload.modifierRegistry,
    });
    return finish(state, actionInput, resolution,
      "dice_modifier_query_resolved");
  }
  if (certificate.kind === "generated_value") {
    const rolls = revealValues(options.chanceReveals,
      certificate.payload.expression.diceCount);
    const resolution = evaluateOfficialGeneratedValueV1({
      expression: certificate.payload.expression,
      rawD6Rolls: rolls,
    });
    return finish(state, actionInput, resolution,
      "dice_generated_value_resolved");
  }
  if (certificate.kind === "invalid_die_reroll") {
    const rolls = revealValues(options.chanceReveals, 1);
    const resolution = resolveOfficialInvalidDieRerollV1({
      agreement: certificate.payload.agreement,
      condition: certificate.payload.condition,
      dieKind: certificate.payload.dieKind,
      rawD6Roll: rolls[0],
    });
    return finish(state, actionInput, resolution,
      "dice_invalid_physical_die_rerolled");
  }
  if (certificate.kind !== "test") fail("DICE_RULES_PLAN_KIND_INVALID");
  if (certificate.payload.rollCount === 0) {
    revealValues(options.chanceReveals, 0);
    const target = resolveOfficialTargetNumberV1({
      baseTargetNumber: null,
      modifierRegistry: certificate.payload.modifierRegistry,
    });
    const body = {
      schema: "starcraft_tmg_official_null_capability_test_resolution_v1",
      planHash: certificate.planHash,
      targetNumberResolution: target,
      rollAllowed: false,
      rollPerformed: false,
      modifiersCannotGrantRoll: true,
      trainingTruth: false,
    };
    const resolution = { ...body, resolutionHash: hashStarcraftTmgContract(body) };
    return finish(state, actionInput, resolution,
      "dice_null_capability_roll_denied");
  }
  const initialRolls = revealValues(options.chanceReveals,
    certificate.payload.rollCount);
  const initialTestResolution = evaluateOfficialTestRollsV1({
    classification: certificate.payload.classification,
    baseTargetNumber: certificate.payload.baseTargetNumber,
    modifierRegistry: certificate.payload.modifierRegistry,
    rolls: initialRolls,
  });
  if (!certificate.payload.rerollGrant) {
    return finish(state, actionInput, initialTestResolution,
      "dice_test_resolved");
  }
  const initialHistory = appendHistory(state, actionInput,
    initialTestResolution, "dice_test_initial_rolled");
  const nextBody = {
    schema: OFFICIAL_DICE_TEST_MODIFIER_RULES_PENDING_SCHEMA,
    stage: "choose_reroll",
    round: Number(state.round), phase: state.phase,
    sideKey: certificate.sideKey,
    procedureKind: "test",
    originalCertificate: clone(certificate),
    initialTestResolution: clone(initialTestResolution),
    rerollGrant: clone(certificate.payload.rerollGrant),
    rulesCertificate: clone(pending.rulesCertificate),
    sourceLockHash: pending.sourceLockHash,
    diceTestModifierDataBundleHash: pending.diceTestModifierDataBundleHash,
    stateProjectionHash: "",
    sourceRefreshPerformed: false,
    repositoryFallbackUsed: false,
    trainingTruth: false,
  };
  nextBody.stateProjectionHash = stateProjection(state, nextBody);
  state.pendingAction = { ...nextBody,
    pendingHash: hashStarcraftTmgContract(nextBody) };
  const event = {
    type: "dice_test_initial_rolled",
    sideKey: actionInput.sideKey,
    initialTestResolution: clone(initialTestResolution),
    rerollGrantHash: certificate.payload.rerollGrant.grantHash,
    rerollDecisionRequired: true,
    resultVisibleBeforeDecision: true,
    historyEntryHash: initialHistory.entryHash,
    trainingTruth: false,
  };
  appendLog(state, actionInput, [event]);
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_dice_test_modifier_rules_transition_v1",
    executorId: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_DICE_TEST_MODIFIER_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_test_initial_result_then_controller_reroll_choice",
    trainingTruth: false };
}

export function isOfficialDiceTestModifierRulesPendingV1(state) {
  return state?.pendingAction?.schema
    === OFFICIAL_DICE_TEST_MODIFIER_RULES_PENDING_SCHEMA;
}
