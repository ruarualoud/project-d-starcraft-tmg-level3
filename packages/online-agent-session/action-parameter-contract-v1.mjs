import { isDeepStrictEqual } from "node:util";
import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { describeOfficialSelectedRosterFightParameterFieldsV1,
  canonicalOfficialSelectedRosterAttackAllocationsV1 } from
  "../product-composition/official-selected-roster-attack-allocation-contract-v1.mjs";
import { describeOfficialSelectedRosterChargeParameterFieldsV1,
  canonicalOfficialSelectedRosterChargeParametersV1 } from
  "../product-composition/official-selected-roster-charge-parameter-contract-v1.mjs";
import {describeOfficialSelectedRosterSpatialParameterFieldsV1,
  remainingOfficialSelectedRosterSpatialModelIdsV1} from
  '../product-composition/official-selected-roster-spatial-parameter-contract-v1.mjs';
import {describeOfficialRelocationParameterFieldsV1,inspectOfficialRelocationPlacementIdsV1} from
  '../product-composition/official-relocation-parameter-contract-v1.mjs';

export const STARCRAFT_TMG_ACTION_PARAMETER_CONTRACT_VERSION =
  "starcraft_tmg_action_parameter_contract_v1";
const MAX_MATERIALIZED_OPTIONS = 64;
const object = value => Boolean(value) && typeof value === "object"
  && !Array.isArray(value);
const clone = value => value === undefined ? undefined : structuredClone(value);
function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}
function sourceDomain(value) {
  return object(value?.sourceAction) ? value.sourceAction : value;
}
function fieldSchemas(schema) {
  if (object(schema.properties)) return schema.properties;
  // Rules domains use a flat descriptor, not JSON Schema properties. Metadata
  // such as paymentCardInstanceIdsByChoice is not a parameter field.
  return Object.fromEntries(Object.entries(schema).filter(([, value]) =>
    object(value) && (value.type || Array.isArray(value.enum)
      || Object.hasOwn(value, "const"))));
}
function paymentRows(value) {
  return Array.isArray(value) ? value.filter(row => Array.isArray(row)
    && row.every(id => typeof id === "string")) : [];
}
function fieldValues(descriptor) {
  if (Object.hasOwn(descriptor || {}, "const")) return [descriptor.const];
  return Array.isArray(descriptor?.enum) ? descriptor.enum : null;
}
function samePayment(left, right) {
  const canonical = value => [...new Set(value)].sort();
  return Array.isArray(left) && left.every(id => typeof id === "string")
    && isDeepStrictEqual(canonical(left), canonical(right));
}

function inspectNestedDescriptor(value, descriptor, path, add) {
  const type = descriptor?.type;
  const invalid = type === "array" ? !Array.isArray(value)
    : type === "object" ? !object(value)
      : type === "integer" ? !Number.isSafeInteger(value)
        : type === "number" ? typeof value !== "number" || !Number.isFinite(value)
          : type === "string" ? typeof value !== "string"
            : type === "boolean" ? typeof value !== "boolean" : false;
  if (invalid) { add(path, "type_mismatch", value, [type]); return; }
  const values = fieldValues(descriptor);
  if (values && !values.some(allowed => isDeepStrictEqual(allowed, value))) {
    add(path, "value_not_in_current_domain", value, values);
  }
  if (Number.isFinite(descriptor.minimum) && typeof value === "number"
    && value < descriptor.minimum) {
    add(path, "value_below_minimum", value, [descriptor.minimum]);
  }
  if (Array.isArray(value)) {
    if (Number.isSafeInteger(descriptor.minItems) && value.length < descriptor.minItems) {
      add(path, "array_too_short", value, [descriptor.minItems]);
    }
    if (Number.isSafeInteger(descriptor.maxItems) && value.length > descriptor.maxItems) {
      add(path, "array_too_long", value, [descriptor.maxItems]);
    }
    if (object(descriptor.items)) value.forEach((child, index) =>
      inspectNestedDescriptor(child, descriptor.items, `${path}[${index}]`, add));
  } else if (object(value) && object(descriptor.properties)) {
    for (const field of descriptor.required || []) {
      if (!Object.hasOwn(value, field)) add(`${path}.${field}`, "required_field_missing", null);
    }
    for (const [field, child] of Object.entries(value)) {
      if (Object.hasOwn(descriptor.properties, field)) {
        inspectNestedDescriptor(child, descriptor.properties[field], `${path}.${field}`, add);
      } else if (descriptor.additionalProperties === false) {
        add(`${path}.${field}`, "additional_field_not_allowed", child,
          Object.keys(descriptor.properties));
      }
    }
  }
}

// Compilation is a current-domain submission contract, never a new Rules
// implementation. Finite options are complete only when every required value
// is finite. Large/continuous domains keep parameters and the existing solver;
// the materialization ceiling is not an action-rejection or strategy budget.
export function compileStarcraftTmgActionParameterContractV1(value) {
  const domain = sourceDomain(value) || {};
  const schema = object(domain.parameterSchema) ? domain.parameterSchema : {};
  const required = Array.isArray(schema.required) ? [...schema.required] : [];
  const chargeFields = describeOfficialSelectedRosterChargeParameterFieldsV1(domain);
  const fields = { ...fieldSchemas(schema),
    ...describeOfficialSelectedRosterFightParameterFieldsV1(domain), ...chargeFields,
    ...describeOfficialSelectedRosterSpatialParameterFieldsV1(domain),
    ...describeOfficialRelocationParameterFieldsV1(domain) };
  const byChoice = object(schema.paymentCardInstanceIdsByChoice)
    ? schema.paymentCardInstanceIdsByChoice : null;
  const choices = fieldValues(fields.choice);
  const unavailableChoices = byChoice && choices
    ? choices.filter(choice => paymentRows(byChoice[choice]).length === 0) : [];
  const selectableChoices = choices
    ? choices.filter(choice => !unavailableChoices.includes(choice)) : null;
  let fullyEnumerated = Array.isArray(schema.required);
  let rows = [{}];
  for (const field of required.filter(field => field !== "paymentCardInstanceIds")) {
    const values = field === "choice" ? selectableChoices : fieldValues(fields[field]);
    if (!values || rows.length * values.length > MAX_MATERIALIZED_OPTIONS) {
      fullyEnumerated = false;
      break;
    }
    rows = rows.flatMap(row => values.map(value => ({ ...row, [field]: clone(value) })));
  }
  if (fullyEnumerated && required.includes("paymentCardInstanceIds")) {
    const paidRows = rows.flatMap(row => {
      const values = byChoice ? paymentRows(byChoice[row.choice ?? "default"])
        : fieldValues(fields.paymentCardInstanceIds);
      if (!values) { fullyEnumerated = false; return []; }
      return values.map(value => ({ ...row, paymentCardInstanceIds: clone(value) }));
    });
    if (paidRows.length > MAX_MATERIALIZED_OPTIONS) fullyEnumerated = false;
    rows = paidRows;
  }
  const finiteOptions = fullyEnumerated ? rows.map(parameters => ({
    parameterOptionId: "parameter-option-" + hashStarcraftTmgContract({
      domainId: domain.domainId, parameters,
    }),
    parameters,
  })) : [];
  return freeze({ schemaVersion: STARCRAFT_TMG_ACTION_PARAMETER_CONTRACT_VERSION,
    domainId: domain.domainId || null, requiredFields: required,
    conditionalRequiredFields: clone(schema.conditionalRequiredFields || []),
    additionalFieldsAllowed: chargeFields ? false : schema.additionalProperties !== false,
    fieldContracts: clone(fields),
    // Current ground-place domains advertise flat input coordinates while
    // Rules returns the same coordinates in its canonical placement object.
    canonicalGroundPlacementAccepted: object(schema.groundPoint)
      && required.includes("xMilliInches") && required.includes("yMilliInches"),
    // Selected self-place Rules accepts placements as input and returns the
    // same complete model array as placement. Preserve that native receipt.
    canonicalUnitPlacementsAccepted: domain.actionType === "use_active_ability"
      && domain.parameterKind === "official_selected_roster_active_ability_v1"
      && domain.effectContract?.targetKind === "self_place"
      && required.includes("placements")
      && Array.isArray(schema.placements?.modelIds),
    selectableChoices: clone(selectableChoices), unavailableChoices,
    paymentCombinationsByChoice: byChoice ? clone(byChoice) : null,
    noPaymentCombinationMeansUnavailable: true,
    emptyPaymentCombinationMustBeExplicit: [[]],
    fullyEnumerated, finiteOptions,
    rulesInstantiationRequired: true, doesNotProveProposalLegal: true,
    trainingTruth: false });
}

export function inspectStarcraftTmgActionParametersV1(domain, parameters) {
  const contract = compileStarcraftTmgActionParameterContractV1(domain);
  const fieldIssues = [];
  const add = (field, code, actualValue, allowedValues = null) => {
    fieldIssues.push({ fieldPath: field ? `parameters.${field}` : "parameters",
      code, actualValue: clone(actualValue ?? null), allowedValues: clone(allowedValues) });
  };
  if (!object(parameters)) add(null, "object_required", parameters);
  else {
    if (!contract.additionalFieldsAllowed) {
      for (const field of Object.keys(parameters)) {
        if (!Object.hasOwn(contract.fieldContracts, field)) {
          add(field, "additional_field_not_allowed", parameters[field],
            Object.keys(contract.fieldContracts));
        }
      }
    }
    const point = contract.canonicalGroundPlacementAccepted
      && object(parameters.placement) ? parameters.placement : null;
    const canonicalPlacements = contract.canonicalUnitPlacementsAccepted
      && Array.isArray(parameters.placement) ? parameters.placement : null;
    if (contract.canonicalUnitPlacementsAccepted) {
      if (Object.hasOwn(parameters, "placements")
        && !Array.isArray(parameters.placements)) {
        add("placements", "type_mismatch", parameters.placements, ["array"]);
      }
      if (canonicalPlacements && Array.isArray(parameters.placements)
        && !isDeepStrictEqual(canonicalPlacements, parameters.placements)) {
        add("placements", "placement_representations_conflict",
          parameters.placements, [canonicalPlacements]);
      }
    }
    const conditionalRequired = contract.conditionalRequiredFields.flatMap(row =>
      object(row?.when) && Array.isArray(row.required)
        && isDeepStrictEqual(parameters[row.when.field], row.when.value) ? row.required : []);
    for (const field of [...new Set([...contract.requiredFields, ...conditionalRequired])]) {
      const coordinate = field === "xMilliInches" || field === "yMilliInches";
      if (!Object.hasOwn(parameters, field)
        && !(coordinate && point && Object.hasOwn(point, field))
        && !(field === "placements" && canonicalPlacements)) {
        add(field, "required_field_missing", null);
      }
      if (coordinate && contract.canonicalGroundPlacementAccepted) {
        if (Object.hasOwn(parameters, field)
          && !Number.isSafeInteger(parameters[field])) {
          add(field, "type_mismatch", parameters[field], ["integer"]);
        }
        if (point && Object.hasOwn(point, field)) {
          if (!Number.isSafeInteger(point[field])) {
            add(`placement.${field}`, "type_mismatch", point[field], ["integer"]);
          }
          if (Object.hasOwn(parameters, field)
            && parameters[field] !== point[field]) {
            add(field, "coordinate_representations_conflict",
              parameters[field], [point[field]]);
          }
        }
      }
    }
    for (const [field, descriptor] of Object.entries(contract.fieldContracts)) {
      if (!Object.hasOwn(parameters, field)) continue;
      const values = fieldValues(descriptor);
      if (values && !values.some(value => isDeepStrictEqual(value, parameters[field]))) {
        add(field, "value_not_in_current_domain", parameters[field], values);
      }
      // Only standard descriptor types are checked here. Rules-specific path,
      // coordinate and allocation contracts remain owned by their executors.
      const actual = parameters[field];
      const type = descriptor.type;
      const invalid = type === "array" ? !Array.isArray(actual)
        : type === "object" ? !object(actual)
          : type === "integer" ? !Number.isSafeInteger(actual)
            : type === "number" ? typeof actual !== "number" || !Number.isFinite(actual)
              : type === "string" ? typeof actual !== "string"
                : type === "boolean" ? typeof actual !== "boolean" : false;
      if (invalid) add(field, "type_mismatch", actual, [type]);
      else if (type === "array" && object(descriptor.items)) {
        inspectNestedDescriptor(actual, descriptor, field, add);
      } else if (type === "object" && object(descriptor.properties)) {
        inspectNestedDescriptor(actual, descriptor, field, add);
      }
      if (descriptor.allocatedTargetRequired && typeof actual === "string"
        && Array.isArray(parameters.allocations)
        && !parameters.allocations.some(row => row?.targetUnitId === actual)) {
        add(field, "target_not_in_submitted_allocation", actual,
          parameters.allocations.map(row => row?.targetUnitId).filter(value => typeof value === "string"));
      }
    }
    const native = sourceDomain(domain);
    if (describeOfficialRelocationParameterFieldsV1(native)) {
      const identity=inspectOfficialRelocationPlacementIdsV1(
        native.parameterSchema.placements.exactModelIds,parameters.placements);
      if(!identity.valid)add('placements','relocation_complete_model_identity_or_count_invalid',
        parameters.placements,[{...identity,includesLeadingModel:true,
          exactModelIds:native.parameterSchema.placements.exactModelIds}]);
    }
    if (fieldIssues.length === 0 && describeOfficialSelectedRosterSpatialParameterFieldsV1(native)) {
      try { remainingOfficialSelectedRosterSpatialModelIdsV1(native,parameters.leadingModelId,parameters.placements); }
      catch(error){
        if(!String(error.message).startsWith('SELECTED_SPATIAL_'))throw error;
        add('placements','spatial_remaining_model_identity_or_count_invalid',parameters.placements,
          [{modelIds:native.constraints.modelProfiles.map(row=>row.modelId).filter(id=>id!==parameters.leadingModelId),
            excludesLeadingModel:true,exactRemainingPlacementCount:native.constraints.modelProfiles.length-1,
            nativeReason:error.message}]);
      }
    }
    if (fieldIssues.length === 0 && describeOfficialSelectedRosterChargeParameterFieldsV1(native)) {
      try { canonicalOfficialSelectedRosterChargeParametersV1(native, parameters); }
      catch (error) {
        if (!String(error.message).startsWith('SELECTED_MELEE_CHARGE_')) throw error;
        add('targets', 'charge_target_pair_or_duplicate_invalid', parameters.targets,
          [{ eligibleTargetModelIdsByUnitId: native.constraints.eligibleTargetModelIdsByUnitId,
            oneTargetModelPerTargetUnit: true }]);
      }
    }
    if (fieldIssues.length === 0 && native?.parameterKind === "official_selected_roster_fight_v1"
      && parameters.closeRanksMode === "decline"
      && Number.isSafeInteger(native.constraints?.declineCloseRanksAttackDice)) {
      try {
        // Reuse the actual allocation validator, not a second attack-count rule.
        canonicalOfficialSelectedRosterAttackAllocationsV1(parameters.allocations,
          native.parameterSchema.targetUnitIds, native.constraints.declineCloseRanksAttackDice,
          "SELECTED_MELEE_FIGHT_ALLOCATION_INVALID");
      } catch (error) {
        if (!String(error.message).startsWith("SELECTED_MELEE_FIGHT_ALLOCATION_INVALID")) throw error;
        add("allocations", "allocation_dice_total_or_target_invalid", parameters.allocations,
          [{ targetUnitIds: native.parameterSchema.targetUnitIds,
            totalDice: native.constraints.declineCloseRanksAttackDice }]);
      }
    }
    const choice = parameters.choice ?? "default";
    if (contract.unavailableChoices.includes(choice)) {
      add("choice", "choice_unavailable", choice, contract.selectableChoices);
    }
    if (contract.paymentCombinationsByChoice) {
      const rows = paymentRows(contract.paymentCombinationsByChoice[choice]);
      // If the choice itself is unavailable, changing payment cannot progress.
      // Do not imply that an empty list of combinations permits free payment.
      if (!contract.unavailableChoices.includes(choice)
        && !rows.some(row => samePayment(parameters.paymentCardInstanceIds, row))) {
        add("paymentCardInstanceIds", "payment_combination_not_available",
          parameters.paymentCardInstanceIds, rows);
      }
    }
  }
  return freeze({ valid: fieldIssues.length === 0, fieldIssues, parameterContract: contract,
    requiresReplan: fieldIssues.some(issue => issue.code === "choice_unavailable"),
    doesNotProveProposalLegal: true, trainingTruth: false });
}

export function materializeStarcraftTmgActionParameterOptionV1(domain, optionId) {
  const contract = compileStarcraftTmgActionParameterContractV1(domain);
  const selected = contract.finiteOptions.find(option => option.parameterOptionId === optionId);
  if (!selected) throw new Error("ACTION_PARAMETER_OPTION_INVALID");
  return clone(selected.parameters);
}

// Upgrade an exhausted legacy parameter loop only with new, current-domain
// evidence that disproves the old intent. A policy version change alone is not
// permission to clear counters or buy a fourth repetition of that Action.
export function planStarcraftTmgLegacyParameterReplanV1(choice, {
  retryApproved, authority, promptPolicyVersion, submissions = [],
  maximumRounds = 3,
} = {}) {
  if (retryApproved !== true || choice?.status !== "provider_output_invalid"
    || choice.completedDecision || !choice.plannerResult
    || Number(choice.proposalValidationRounds || 0) < maximumRounds
    || (choice.parameterRecoveryHistory || []).length > 0
    || (choice.parameterContractUpgradeHistory || []).length > 0) return null;
  for (const field of ["roomId", "matchBindingHash", "seatKey", "stateRevision",
    "stateHash", "legalSpaceHash", "spatialActionSpaceHash"]) {
    if (authority?.[field] !== choice.authority?.[field]) return null;
  }
  const last = submissions.at(-1);
  const selected = choice.actionIndex.find(entry => entry.id
    === choice.plannerResult.recommendedCandidateId && entry.kind === "parameterized");
  if (!last || !selected || last.candidateId !== selected.id
    || !last.promptPolicyVersion || !promptPolicyVersion
    || last.promptPolicyVersion === promptPolicyVersion) return null;
  const inspection = inspectStarcraftTmgActionParametersV1(selected.action, last.parameters);
  const invalidLegacySubmissions = submissions.filter(submission =>
    submission.candidateId === selected.id
    && !inspectStarcraftTmgActionParametersV1(selected.action, submission.parameters).valid);
  if (inspection.valid || !inspection.requiresReplan
    || invalidLegacySubmissions.length < maximumRounds
    || !inspection.parameterContract.fullyEnumerated
    || inspection.parameterContract.finiteOptions.length === 0) return null;
  return freeze({ schemaVersion: "starcraft_tmg_legacy_parameter_replan_v1",
    kind: "parameter_contract_upgrade", scope: "current_decision",
    action: "replan", reason: "current_contract_disproves_legacy_intent",
    domainId: selected.id, authority: clone(authority),
    previousPromptPolicyVersion: last.promptPolicyVersion,
    nextPromptPolicyVersion: promptPolicyVersion,
    parameterContractVersion: STARCRAFT_TMG_ACTION_PARAMETER_CONTRACT_VERSION,
    contractHash: hashStarcraftTmgContract(inspection.parameterContract),
    priorProposalValidationRounds: choice.proposalValidationRounds,
    invalidLegacySubmissions: invalidLegacySubmissions.map(submission => ({
      attemptKey: submission.attemptKey, outputHash: submission.outputHash,
      parameters: clone(submission.parameters),
      fieldIssues: clone(inspectStarcraftTmgActionParametersV1(
        selected.action, submission.parameters).fieldIssues),
    })),
    feedback: {
      fieldIssues: clone(inspection.fieldIssues),
      unavailableChoices: clone(inspection.parameterContract.unavailableChoices),
      selectableChoices: clone(inspection.parameterContract.selectableChoices),
      paymentCombinationsByChoice: clone(inspection.parameterContract.paymentCombinationsByChoice),
      intentCannotBePreserved: true,
      instruction: "The current Rules domain disproves the previous selected intent. Reassess the prior plan and choose a current candidate with explicit revised purpose. Do not repeat the unavailable intent, silently substitute its target/effect, or default to Pass. Prior paid submissions and failure counters remain history.",
    },
    resolved: false, mayApply: false, trainingTruth: false });
}

export function applyStarcraftTmgLegacyParameterReplanV1(choice, plan, recordedAt) {
  if (!plan || choice?.status !== "provider_output_invalid"
    || (choice.parameterContractUpgradeHistory || []).length > 0) {
    throw new Error("LEGACY_PARAMETER_REPLAN_NOT_ADMITTED");
  }
  choice.parameterContractUpgradeHistory = [{ ...clone(plan), recordedAt,
    previousContinuationMessages: clone(choice.providerContinuationMessages),
    lifetimeFailureCountersReset: false, priorPaidAttemptsRewritten: false }];
  choice.parameterRecoveryHistory = [{ ...clone(plan), recordedAt }];
  choice.failedPlannerResults = [...(choice.failedPlannerResults || []), {
    plannerResult: clone(choice.plannerResult), reason: plan.reason, recordedAt,
  }];
  choice.stage = "planning";
  choice.plannerResult = null;
  // Old Action correction messages are archived above, not fed as active
  // instructions to a new Planner. Queries, attempts and lifetime counters stay.
  choice.providerContinuationMessages = [{ role: "user", content:
    "Current Rules contract requires replanning: " + JSON.stringify(plan.feedback) }];
  choice.stageQueryRounds = 0;
  choice.stageCorrectionRounds = 0;
  choice.status = "generating";
  choice.warnings.push("LEGACY_PARAMETER_CONTRACT_REPLAN:previous_failures_preserved");
}

// Severity answers whether unresolved failure can be integrated. Recovery
// action answers what to do before returning that failure to the caller. A
// stale authority/transport/unknown implementation error is never guessed to
// be a correctable parameter mistake merely because instantiate threw it.
export function planStarcraftTmgParameterFailureRecoveryV1({ domain, parameters,
  receipt, history = [], maximumRounds = 3 } = {}) {
  const issue = inspectStarcraftTmgActionParametersV1(domain, parameters);
  const typed = receipt?.repairContext?.fieldIssues?.length > 0
    && receipt?.safeFailureClass === "parameter_contract_invalid"
    && receipt?.reason === "RULES_QUERY_PARAMETER_CONTRACT_INVALID"
    && !issue.valid;
  const context = receipt?.repairContext;
  const geometry = issue.valid && receipt?.mayRepairSameChoice === true
    && receipt?.findingSeverity === "Medium"
    && receipt?.failureStage === "instantiate_current_rules_domain"
    && ["typed_rules_error", "implementation_error"].includes(receipt?.safeFailureClass)
    && !/^RULES_QUERY_|IMPLEMENTATION|TYPE_ERROR|RANGE_ERROR|SYNTAX_ERROR/u
      .test(String(receipt?.reason || ""))
    && context?.doesNotProveProposalLegal === true
    && Boolean(context.leadingModelId && context.leadingModelBase
      && Array.isArray(context.submittedPath) && context.submittedPath.length > 0);
  const fieldIssues = typed ? issue.fieldIssues : [];
  const failureSignature = hashStarcraftTmgContract({ domainId: domain?.domainId || null,
    reason: receipt?.reason || "validation_receipt_missing",
    // Varying an unrelated payment or prose is not progress on target/choice.
    violations: fieldIssues.map(({ fieldPath, code, allowedValues }) =>
      ({ fieldPath, code, allowedValues })),
  });
  const sameCauseRounds = history.filter(row => row.failureSignature === failureSignature).length + 1;
  const totalRounds = history.length + 1;
  const action = !(typed || geometry) || totalRounds >= maximumRounds ? "needs_attention"
    : issue.requiresReplan || sameCauseRounds > 1 ? "replan" : "repair_same_choice";
  return freeze({ schemaVersion: "starcraft_tmg_action_parameter_recovery_v1",
    kind: typed ? "parameter_submission_invalid"
      : geometry ? "rules_geometry_rejected" : "unclassified_authority_or_rules_failure",
    scope: "current_decision", severity: receipt?.findingSeverity || "High",
    domainId: domain?.domainId || null, action, sameCauseRounds, totalRounds,
    maximumRounds, failureSignature, reason: receipt?.reason || "validation_receipt_missing",
    queryReceiptHash: receipt?.queryReceiptHash || null,
    fieldIssues,
    feedback: typed ? { fieldIssues,
      selectableChoices: issue.parameterContract.selectableChoices,
      unavailableChoices: issue.parameterContract.unavailableChoices,
      paymentCombinationsByChoice: issue.parameterContract.paymentCombinationsByChoice,
      intentCannotBePreserved: issue.requiresReplan,
      instruction: action === "replan"
        ? "The submitted choice cannot execute as proposed. Re-evaluate the existing plan using current admissible targets, choices and payments, then select a current candidate. Do not silently change its target/effect or default to Pass."
        : "Correct the listed parameter fields only. Preserve supported intent. [] payment combinations means unavailable; only [[]] permits empty payment. Every new proposal still requires Rules validation." }
      : geometry ? { failureCode: receipt.reason,
        geometryRepairContext: clone(context),
        instruction: action === "replan"
          ? "The same geometry rejection has not progressed. Re-evaluate the spatial intent and current alternatives through the Planner, preserving prior goal and failure evidence. Do not default to Pass."
          : "Use the submitted path, model base and current distance/coherency limits to repair this candidate's geometry. Keep unsupported conclusions unknown; only a new exact Rules receipt can accept it." } : null,
    resolved: false, mayApply: false, trainingTruth: false });
}

export function applyStarcraftTmgParameterFailureRecoveryV1(choice, recovery,
  { attemptKey, recordedAt } = {}) {
  choice.parameterRecoveryHistory = [...(choice.parameterRecoveryHistory || []),
    { ...clone(recovery), attemptKey, recordedAt }];
  choice.proposalValidationRounds = Number(choice.proposalValidationRounds || 0) + 1;
  choice.lastProposalValidationFailureSignature = recovery.failureSignature;
  choice.repeatedProposalValidationFailureCount = recovery.sameCauseRounds;
  if (attemptKey && !choice.processedAttemptKeys.includes(attemptKey)) {
    choice.processedAttemptKeys.push(attemptKey);
  }
  if (recovery.action === "replan") {
    if (choice.plannerResult) {
      choice.failedPlannerResults = [...(choice.failedPlannerResults || []), {
        plannerResult: clone(choice.plannerResult), reason: recovery.reason,
        failureSignature: recovery.failureSignature, recordedAt,
      }];
    }
    choice.stage = "planning";
    choice.plannerResult = null;
    // Do not reset lifetime failure/usage counters or discard paid returns,
    // query receipts, same-match memory, or the abandoned plan evidence.
    choice.stageQueryRounds = 0;
    choice.stageCorrectionRounds = 0;
  }
  if (recovery.feedback) {
    choice.providerContinuationMessages.push({ role: "user", content:
      "Current Rules-domain submission failed: " + JSON.stringify(recovery.feedback) });
  }
  choice.warnings.push(`PARAMETER_RECOVERY:${recovery.action}:${recovery.reason}`);
  choice.status = recovery.action === "needs_attention" ? "provider_output_invalid" : "generating";
}
