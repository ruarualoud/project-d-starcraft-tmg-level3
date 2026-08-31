import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialCardBuildPaymentProfileV1,
  verifyOfficialCardBuildPaymentDataBundleV1,
} from "../source-data/official-card-build-payment-data-bundle-v1.mjs";

const PROCEDURE_KINDS = new Set([
  "ability_resource_payment", "card_layout", "tactical_purchase", "unique_copy_limit",
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function nonEmpty(value, code) {
  const result = String(value || "").trim();
  if (!result) fail(code);
  return result;
}
function sourceBoundProfile(bundle, raw, code) {
  const profile = getOfficialCardBuildPaymentProfileV1(bundle,
    nonEmpty(raw?.recordKey, code));
  if (raw.sourceRecordHash !== profile.sourceRecordHash
    || raw.payloadHash !== profile.payloadHash
    || raw.profileHash !== profile.profileHash) fail(code, profile.recordKey);
  return profile;
}
function result(body) {
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function resolveOfficialCardLayoutV1(input = {}) {
  const bundle = input.cardDataBundle;
  verifyOfficialCardBuildPaymentDataBundleV1(bundle);
  if (input.rulesOwnedLayoutRequested !== true
    || input.clientSuppliedLayout !== undefined) fail("CARD_LAYOUT_REQUEST_INVALID");
  const profile = getOfficialCardBuildPaymentProfileV1(bundle,
    nonEmpty(input.recordKey, "CARD_LAYOUT_RECORD_REQUIRED"));
  return result({ schema: "starcraft_tmg_official_card_layout_resolution_v1",
    recordKey: profile.recordKey, sourceRecordHash: profile.sourceRecordHash,
    payloadHash: profile.payloadHash, profileHash: profile.profileHash,
    cardId: profile.cardId, cardName: profile.cardName, cardType: profile.cardKind,
    uniqueMarking: profile.isUnique, factionTags: [...profile.factionTags],
    raceTag: profile.raceTag, subFactionTags: [...profile.subFactionTags],
    armySlots: structuredClone(profile.slots),
    exhaustResource: { type: profile.resourceType, value: profile.resourceValue },
    specialAbilities: { count: profile.abilityCount,
      definitionsHash: profile.abilityDefinitionsHash },
    rulesOwnedLayout: true, clientSuppliedLayoutAccepted: false,
    trainingTruth: false });
}

export function resolveOfficialTacticalCardPurchaseV1(input = {}) {
  const bundle = input.cardDataBundle;
  verifyOfficialCardBuildPaymentDataBundleV1(bundle);
  const profile = getOfficialCardBuildPaymentProfileV1(bundle,
    nonEmpty(input.recordKey, "TACTICAL_CARD_PURCHASE_RECORD_REQUIRED"));
  if (profile.cardKind !== "tactical") {
    fail("TACTICAL_CARD_PURCHASE_TACTICAL_ONLY", profile.recordKey);
  }
  if (input.paymentResource !== "vespene_gas"
    || input.rulesOwnedCostAndSlotsRequested !== true
    || input.clientSuppliedCost !== undefined || input.clientSuppliedSlots !== undefined) {
    fail("TACTICAL_CARD_PURCHASE_REQUEST_INVALID");
  }
  const existingCopyCount = Number(input.existingCopyCount);
  if (!Number.isInteger(existingCopyCount) || existingCopyCount < 0) {
    fail("TACTICAL_CARD_PURCHASE_COPY_COUNT_INVALID");
  }
  if (profile.isUnique && existingCopyCount !== 0) {
    fail("UNIQUE_CARD_SINGLE_COPY_LIMIT", profile.cardId);
  }
  return result({ schema: "starcraft_tmg_official_tactical_card_purchase_resolution_v1",
    recordKey: profile.recordKey, cardId: profile.cardId, cardName: profile.cardName,
    profileHash: profile.profileHash, paymentResource: "vespene_gas",
    vespeneGasCost: profile.vespeneGasCost, armySlotsAdded: structuredClone(profile.slots),
    raceTag: profile.raceTag, factionTags: [...profile.factionTags],
    uniqueMarking: profile.isUnique, existingCopyCount,
    resultingCopyCount: existingCopyCount + 1,
    exactSourceCostAndSlotsUsed: true, overallVespeneBudgetValidated: false,
    overallVespeneBudgetDeferredToSlice: 103,
    fullFactionEligibilityValidated: false, fullFactionEligibilityDeferredToSlice: 102,
    clientSuppliedCostOrSlotsAccepted: false, trainingTruth: false });
}

export function resolveOfficialUniqueCardCopyLimitV1(input = {}) {
  const bundle = input.cardDataBundle;
  verifyOfficialCardBuildPaymentDataBundleV1(bundle);
  if (input.armyCardInstanceSetComplete !== true
    || !Array.isArray(input.cardInstances) || input.cardInstances.length > 512) {
    fail("UNIQUE_CARD_COMPLETE_ARMY_SET_REQUIRED");
  }
  const instanceIds = new Set(); const counts = new Map(); const entries = [];
  for (const raw of input.cardInstances) {
    const instanceId = nonEmpty(raw?.cardInstanceId, "UNIQUE_CARD_INSTANCE_INVALID");
    if (instanceIds.has(instanceId)) fail("UNIQUE_CARD_INSTANCE_DUPLICATE", instanceId);
    instanceIds.add(instanceId);
    const profile = sourceBoundProfile(bundle, raw, "UNIQUE_CARD_SOURCE_PROFILE_INVALID");
    counts.set(profile.cardId, (counts.get(profile.cardId) || 0) + 1);
    entries.push({ cardInstanceId: instanceId, recordKey: profile.recordKey,
      cardId: profile.cardId, cardName: profile.cardName, cardKind: profile.cardKind,
      isUnique: profile.isUnique, profileHash: profile.profileHash });
  }
  const violations = [...counts.entries()].flatMap(([cardId, count]) => {
    const profile = bundle.cardProfiles.find((entry) => entry.cardId === cardId);
    return profile.isUnique && count > 1
      ? [{ cardId, cardName: profile.cardName, count, maximum: 1 }] : [];
  });
  if (violations.length > 0) fail("UNIQUE_CARD_SINGLE_COPY_LIMIT", violations[0].cardId);
  return result({ schema: "starcraft_tmg_official_unique_card_copy_limit_resolution_v1",
    armyCardInstanceSetComplete: true, instanceCount: entries.length,
    cardInstances: entries.sort((left, right) => (
      left.cardInstanceId.localeCompare(right.cardInstanceId))),
    copyCounts: Object.fromEntries([...counts.entries()].sort(([left], [right]) => (
      left.localeCompare(right)))),
    uniqueCardsLimitedToSingleCopy: true, nonUniqueCardsMayRepeat: true,
    exactlyOneFactionCardValidated: false, exactlyOneFactionCardDeferredToSlice: 102,
    violations: [], clientSuppliedUniqueMarkingAccepted: false, trainingTruth: false });
}

export function resolveOfficialAbilityResourcePaymentV1(input = {}) {
  const bundle = input.cardDataBundle;
  verifyOfficialCardBuildPaymentDataBundleV1(bundle);
  const resourceType = nonEmpty(input.resourceType, "ABILITY_RESOURCE_TYPE_REQUIRED");
  if (!new Set(["CP", "BM", "PE"]).has(resourceType)) {
    fail("ABILITY_RESOURCE_TYPE_INVALID", resourceType);
  }
  const cost = Number(input.resourceCost);
  if (!Number.isInteger(cost) || cost < 0) fail("ABILITY_RESOURCE_COST_INVALID");
  if (input.selectedCardInstanceSetComplete !== true
    || !Array.isArray(input.selectedCardInstances)
    || input.selectedCardInstances.length > 64) {
    fail("ABILITY_RESOURCE_COMPLETE_SELECTION_REQUIRED");
  }
  const ids = new Set();
  const selected = input.selectedCardInstances.map((raw) => {
    const cardInstanceId = nonEmpty(raw?.cardInstanceId, "ABILITY_RESOURCE_CARD_INVALID");
    if (ids.has(cardInstanceId)) fail("ABILITY_RESOURCE_CARD_DUPLICATE", cardInstanceId);
    ids.add(cardInstanceId);
    const profile = sourceBoundProfile(bundle, raw, "ABILITY_RESOURCE_SOURCE_PROFILE_INVALID");
    if (raw.isReady !== true) fail("ABILITY_RESOURCE_CARD_NOT_READY", cardInstanceId);
    if (profile.resourceType !== resourceType) {
      fail("ABILITY_RESOURCE_TYPE_MISMATCH", cardInstanceId);
    }
    return { cardInstanceId, recordKey: profile.recordKey, cardId: profile.cardId,
      cardName: profile.cardName, profileHash: profile.profileHash,
      resourceType: profile.resourceType, resourceValue: profile.resourceValue,
      readyBeforePayment: true, exhaustOnCommit: true };
  });
  const totalGenerated = selected.reduce((sum, entry) => sum + entry.resourceValue, 0);
  if (totalGenerated < cost) fail("ABILITY_RESOURCE_FULL_COST_REQUIRED");
  if (cost === 0 && selected.length > 0) fail("ABILITY_RESOURCE_ZERO_COST_SELECTION_FORBIDDEN");
  const excessResourceLost = totalGenerated - cost;
  return result({ schema: "starcraft_tmg_official_ability_resource_payment_resolution_v1",
    resourceType, resourceCost: cost, selectedCardInstances: selected,
    totalGenerated, appliedToCost: cost, excessResourceLost,
    retainedAfterPayment: 0, fullCostPaid: true,
    generatedResourceMayBeSaved: false,
    generatedResourceMayPayAnotherAbility: false,
    selectedCardsExhaustOnCommit: selected.map((entry) => entry.cardInstanceId),
    arbitraryAbilityEffectExecuted: false,
    clientSuppliedResourceValueAccepted: false, trainingTruth: false });
}

export function certifyOfficialCardBuildPaymentPlanV1(input = {}) {
  const bundle = input.cardDataBundle; const plan = input.plan;
  const procedureKind = String(input.procedureKind || "");
  verifyOfficialCardBuildPaymentDataBundleV1(bundle);
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult === true) fail("CARD_BUILD_PAYMENT_PLAN_INVALID");
  const planId = nonEmpty(plan.planId, "CARD_BUILD_PAYMENT_PLAN_INVALID");
  const shared = { ...plan.input, cardDataBundle: bundle };
  let resolution;
  if (procedureKind === "card_layout") resolution = resolveOfficialCardLayoutV1(shared);
  else if (procedureKind === "tactical_purchase") {
    resolution = resolveOfficialTacticalCardPurchaseV1(shared);
  } else if (procedureKind === "unique_copy_limit") {
    resolution = resolveOfficialUniqueCardCopyLimitV1(shared);
  } else resolution = resolveOfficialAbilityResourcePaymentV1(shared);
  const body = { schema: "starcraft_tmg_official_card_build_payment_plan_certificate_v1",
    planId, procedureKind, sideKey: String(plan.sideKey || ""),
    cardDataBundleHash: bundle.bundleHash, result: resolution,
    rulesOwnedInputsComplete: true, clientSuppliedResultAccepted: false,
    trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialCardBuildPaymentPlanCertificateV1(input = {}) {
  const rebuilt = certifyOfficialCardBuildPaymentPlanV1(input);
  if (!isDeepStrictEqual(rebuilt, input.certificate)) {
    fail("CARD_BUILD_PAYMENT_PLAN_CERTIFICATE_DRIFT");
  }
  return true;
}

export function officialCardBuildPaymentProcedureKindsV1() {
  return [...PROCEDURE_KINDS].sort();
}
