import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { getOfficialCardBuildPaymentProfileV1 } from
  "../source-data/official-card-build-payment-data-bundle-v1.mjs";
import {
  getOfficialArmyCandidateProfileV1,
  getOfficialEngagementScaleV1,
  getOfficialFactionProfileV1,
  verifyOfficialFactionArmyEligibilityDataBundleV1,
} from "../source-data/official-faction-army-eligibility-data-bundle-v1.mjs";
import { resolveOfficialUniqueCardCopyLimitV1 } from
  "./official-card-build-payment-rules-kernel-v1.mjs";

const PROCEDURE_KINDS = new Set([
  "army_slot_audit", "engagement_scale_agreement", "faction_card_selection",
  "faction_tag_eligibility",
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function nonEmpty(value, code) {
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}
function result(body) {
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function sourceBoundFaction(bundle, raw, code) {
  const profile = getOfficialFactionProfileV1(bundle, nonEmpty(raw?.recordKey, code));
  if (raw.sourceRecordHash !== profile.sourceRecordHash
    || raw.payloadHash !== profile.payloadHash || raw.profileHash !== profile.profileHash) {
    fail(code, profile.recordKey);
  }
  return profile;
}
function sourceBoundCandidate(bundle, raw, code) {
  const profile = getOfficialArmyCandidateProfileV1(bundle,
    nonEmpty(raw?.recordKey, code));
  if (raw.sourceRecordHash !== profile.sourceRecordHash
    || raw.payloadHash !== profile.payloadHash
    || raw.candidateProfileHash !== profile.profileHash) fail(code, profile.recordKey);
  return profile;
}
function factionLayout(profile) {
  return { recordKey: profile.recordKey, cardId: profile.cardId,
    factionName: profile.factionName, sourceRecordHash: profile.sourceRecordHash,
    payloadHash: profile.payloadHash, profileHash: profile.profileHash,
    raceTag: profile.raceTag, subFactionTags: [...profile.subFactionTags],
    factionTags: [...profile.factionTags],
    startingArmySlots: structuredClone(profile.startingArmySlots),
    specialAbilities: structuredClone(profile.specialAbilities) };
}

export function resolveOfficialEngagementScaleAgreementV1(input = {}) {
  const bundle = input.factionArmyEligibilityDataBundle;
  verifyOfficialFactionArmyEligibilityDataBundleV1(bundle);
  const state = input.state;
  const playerIds = Object.keys(state?.players || {}).sort();
  if (input.procedureKind !== "engagement_scale_agreement"
    || input.rulesOwnedPlayerDenominatorRequested !== true
    || input.playerAgreementSetComplete !== true || playerIds.length < 2
    || !Array.isArray(input.playerAgreements)
    || input.playerAgreements.length !== playerIds.length
    || input.clientSuppliedScaleProfile !== undefined) {
    fail("ENGAGEMENT_SCALE_AGREEMENT_REQUEST_INVALID");
  }
  const agreements = input.playerAgreements.map((entry) => ({
    playerId: nonEmpty(entry?.playerId, "ENGAGEMENT_SCALE_PLAYER_INVALID"),
    scaleId: nonEmpty(entry?.scaleId, "ENGAGEMENT_SCALE_REQUIRED"),
    agreed: entry?.agreed === true,
  })).sort((left, right) => left.playerId.localeCompare(right.playerId));
  if (!isDeepStrictEqual(agreements.map((entry) => entry.playerId), playerIds)
    || new Set(agreements.map((entry) => entry.playerId)).size !== playerIds.length
    || agreements.some((entry) => !entry.agreed)
    || new Set(agreements.map((entry) => entry.scaleId)).size !== 1) {
    fail("ENGAGEMENT_SCALE_ALL_PLAYERS_MUST_AGREE");
  }
  const scale = getOfficialEngagementScaleV1(bundle, agreements[0].scaleId);
  return result({ schema: "starcraft_tmg_official_engagement_scale_agreement_v1",
    procedureKind: "engagement_scale_agreement", playerAgreementSetComplete: true,
    playerIds, agreements, scale: structuredClone(scale),
    mineralAndVespeneBudgetValidated: false,
    completeResourceBudgetDeferredToSlice: 103,
    rulesOwnedScaleProfile: true, clientSuppliedScaleProfileAccepted: false,
    trainingTruth: false });
}

export function resolveOfficialFactionCardSelectionV1(input = {}) {
  const bundle = input.factionArmyEligibilityDataBundle;
  verifyOfficialFactionArmyEligibilityDataBundleV1(bundle);
  if (input.procedureKind !== "faction_card_selection"
    || input.armyCardInstanceSetComplete !== true
    || !Array.isArray(input.cardInstances) || input.cardInstances.length === 0
    || input.cardInstances.length > 512
    || input.rulesOwnedFactionCardSelectionRequested !== true
    || input.clientSuppliedFactionLayout !== undefined) {
    fail("FACTION_CARD_SELECTION_REQUEST_INVALID");
  }
  const ids = new Set();
  const cards = input.cardInstances.map((raw) => {
    const cardInstanceId = nonEmpty(raw?.cardInstanceId, "FACTION_CARD_INSTANCE_INVALID");
    if (ids.has(cardInstanceId)) fail("FACTION_CARD_INSTANCE_DUPLICATE", cardInstanceId);
    ids.add(cardInstanceId);
    const source = getOfficialCardBuildPaymentProfileV1(bundle.cardDataBundle,
      nonEmpty(raw?.recordKey, "FACTION_CARD_SOURCE_PROFILE_INVALID"));
    if (raw.sourceRecordHash !== source.sourceRecordHash
      || raw.payloadHash !== source.payloadHash
      || raw.sourceCardProfileHash !== source.profileHash) {
      fail("FACTION_CARD_SOURCE_PROFILE_INVALID", source.recordKey);
    }
    return { cardInstanceId, recordKey: source.recordKey, cardKind: source.cardKind,
      cardId: source.cardId, cardName: source.cardName,
      sourceCardProfileHash: source.profileHash };
  });
  const factions = cards.filter((entry) => entry.cardKind === "faction");
  if (factions.length !== 1) fail("EXACTLY_ONE_FACTION_CARD_REQUIRED");
  const selected = sourceBoundFaction(bundle, input.selectedFactionCard,
    "SELECTED_FACTION_CARD_INVALID");
  if (factions[0].recordKey !== selected.recordKey) {
    fail("SELECTED_FACTION_CARD_NOT_IN_COMPLETE_SET");
  }
  return result({ schema: "starcraft_tmg_official_faction_card_selection_v1",
    procedureKind: "faction_card_selection", armyCardInstanceSetComplete: true,
    cardInstanceCount: cards.length,
    selectedFactionCardInstanceId: factions[0].cardInstanceId,
    factionCard: factionLayout(selected), exactlyOneFactionCard: true,
    factionNameMayBeReferencedAsKeyword: true,
    rulesOwnedLayoutFields: ["faction_name", "faction_tags", "starting_army_slots",
      "special_abilities"], clientSuppliedFactionLayoutAccepted: false,
    trainingTruth: false });
}

export function resolveOfficialFactionTagEligibilityV1(input = {}) {
  const bundle = input.factionArmyEligibilityDataBundle;
  verifyOfficialFactionArmyEligibilityDataBundleV1(bundle);
  const faction = sourceBoundFaction(bundle, input.factionCard,
    "FACTION_TAG_FACTION_CARD_INVALID");
  if (input.procedureKind !== "faction_tag_eligibility"
    || input.candidateInstanceSetComplete !== true
    || !Array.isArray(input.candidateInstances) || input.candidateInstances.length > 512
    || input.rulesOwnedTagComparisonRequested !== true
    || input.clientSuppliedEligibility !== undefined) {
    fail("FACTION_TAG_ELIGIBILITY_REQUEST_INVALID");
  }
  const ids = new Set();
  const rows = input.candidateInstances.map((raw) => {
    const candidateInstanceId = nonEmpty(raw?.candidateInstanceId,
      "FACTION_TAG_CANDIDATE_INSTANCE_INVALID");
    if (ids.has(candidateInstanceId)) {
      fail("FACTION_TAG_CANDIDATE_INSTANCE_DUPLICATE", candidateInstanceId);
    }
    ids.add(candidateInstanceId);
    const profile = sourceBoundCandidate(bundle, raw,
      "FACTION_TAG_CANDIDATE_PROFILE_INVALID");
    const missingTags = profile.factionTags.filter((tag) => (
      !faction.factionTags.includes(tag)));
    const rowBody = { candidateInstanceId, recordKey: profile.recordKey,
      candidateKind: profile.candidateKind, candidateName: profile.candidateName,
      candidateProfileHash: profile.profileHash,
      candidateFactionTags: [...profile.factionTags],
      factionCardTags: [...faction.factionTags], missingTags,
      eligible: missingTags.length === 0 };
    return { ...rowBody, rowHash: hashStarcraftTmgContract(rowBody) };
  }).sort((left, right) => left.candidateInstanceId.localeCompare(right.candidateInstanceId));
  const ineligible = rows.filter((entry) => !entry.eligible);
  if (ineligible.length > 0) {
    fail("FACTION_TAG_MISMATCH", `${ineligible[0].candidateInstanceId}`
      + `:${ineligible[0].missingTags.join(",")}`);
  }
  return result({ schema: "starcraft_tmg_official_faction_tag_eligibility_v1",
    procedureKind: "faction_tag_eligibility", factionCard: factionLayout(faction),
    candidateInstanceSetComplete: true, candidateCount: rows.length,
    eligibilityRows: rows, everyCandidateTagAppearsOnFactionCard: true,
    fewerCandidateTagsPermitted: true, anyMissingTagDisqualifies: true,
    rulesOwnedTagComparison: true, clientSuppliedEligibilityAccepted: false,
    trainingTruth: false });
}

function zeroSlots(types) {
  return Object.fromEntries(types.map((type) => [type, 0]));
}
function addSlots(target, source, types) {
  for (const type of types) target[type] += Number(source[type]);
}

export function resolveOfficialArmySlotAuditV1(input = {}) {
  const bundle = input.factionArmyEligibilityDataBundle;
  verifyOfficialFactionArmyEligibilityDataBundleV1(bundle);
  const faction = sourceBoundFaction(bundle, input.factionCard,
    "ARMY_SLOT_FACTION_CARD_INVALID");
  if (input.procedureKind !== "army_slot_audit"
    || input.armyInstanceSetComplete !== true
    || !Array.isArray(input.tacticalCardInstances)
    || !Array.isArray(input.unitInstances)
    || input.tacticalCardInstances.length + input.unitInstances.length > 512
    || input.unusedSlotDisposition !== "lost"
    || input.rulesOwnedSlotTotalsRequested !== true
    || input.clientSuppliedSlotTotals !== undefined
    || input.retainedUnusedSlots !== undefined
    || input.slotConversions !== undefined) fail("ARMY_SLOT_AUDIT_REQUEST_INVALID");
  const tacticalIds = new Set();
  const tactical = input.tacticalCardInstances.map((raw) => {
    const cardInstanceId = nonEmpty(raw?.cardInstanceId, "ARMY_SLOT_CARD_INSTANCE_INVALID");
    if (tacticalIds.has(cardInstanceId)) fail("ARMY_SLOT_CARD_INSTANCE_DUPLICATE", cardInstanceId);
    tacticalIds.add(cardInstanceId);
    const profile = sourceBoundCandidate(bundle, raw, "ARMY_SLOT_CARD_PROFILE_INVALID");
    if (profile.candidateKind !== "tactical") fail("ARMY_SLOT_TACTICAL_CARD_REQUIRED");
    return { cardInstanceId, profile };
  });
  const unitIds = new Set();
  const units = input.unitInstances.map((raw) => {
    const unitInstanceId = nonEmpty(raw?.unitInstanceId, "ARMY_SLOT_UNIT_INSTANCE_INVALID");
    if (unitIds.has(unitInstanceId)) fail("ARMY_SLOT_UNIT_INSTANCE_DUPLICATE", unitInstanceId);
    unitIds.add(unitInstanceId);
    const profile = sourceBoundCandidate(bundle, raw, "ARMY_SLOT_UNIT_PROFILE_INVALID");
    if (profile.candidateKind !== "unit" || !profile.fieldableDuringArmyBuilding
      || !bundle.armySlotTypes.includes(profile.armySlotType)) {
      fail("ARMY_SLOT_FIELDABLE_UNIT_REQUIRED", profile.recordKey);
    }
    const compositionKind = nonEmpty(raw.compositionKind,
      "ARMY_SLOT_COMPOSITION_REQUIRED");
    const composition = profile.compositionSlots.find((entry) => (
      entry.compositionKind === compositionKind));
    if (!composition) fail("ARMY_SLOT_COMPOSITION_INVALID", profile.recordKey);
    return { unitInstanceId, profile, composition };
  });
  const eligibility = resolveOfficialFactionTagEligibilityV1({
    procedureKind: "faction_tag_eligibility", factionArmyEligibilityDataBundle: bundle,
    factionCard: input.factionCard, candidateInstanceSetComplete: true,
    rulesOwnedTagComparisonRequested: true,
    candidateInstances: [
      ...tactical.map((entry) => ({ candidateInstanceId: entry.cardInstanceId,
        recordKey: entry.profile.recordKey, sourceRecordHash: entry.profile.sourceRecordHash,
        payloadHash: entry.profile.payloadHash,
        candidateProfileHash: entry.profile.profileHash })),
      ...units.map((entry) => ({ candidateInstanceId: entry.unitInstanceId,
        recordKey: entry.profile.recordKey, sourceRecordHash: entry.profile.sourceRecordHash,
        payloadHash: entry.profile.payloadHash,
        candidateProfileHash: entry.profile.profileHash })),
    ],
  });
  const sourceFactionCard = getOfficialCardBuildPaymentProfileV1(bundle.cardDataBundle,
    faction.recordKey);
  const uniqueAudit = resolveOfficialUniqueCardCopyLimitV1({
    cardDataBundle: bundle.cardDataBundle, armyCardInstanceSetComplete: true,
    cardInstances: [{ cardInstanceId: input.factionCard.cardInstanceId,
      recordKey: sourceFactionCard.recordKey,
      sourceRecordHash: sourceFactionCard.sourceRecordHash,
      payloadHash: sourceFactionCard.payloadHash, profileHash: sourceFactionCard.profileHash },
    ...tactical.map((entry) => {
      const source = getOfficialCardBuildPaymentProfileV1(bundle.cardDataBundle,
        entry.profile.recordKey);
      return { cardInstanceId: entry.cardInstanceId, recordKey: source.recordKey,
        sourceRecordHash: source.sourceRecordHash, payloadHash: source.payloadHash,
        profileHash: source.profileHash };
    })],
  });
  const types = bundle.armySlotTypes;
  const available = zeroSlots(types); addSlots(available, faction.startingArmySlots, types);
  const tacticalRows = tactical.map((entry) => {
    addSlots(available, entry.profile.tacticalArmySlots, types);
    return { cardInstanceId: entry.cardInstanceId, recordKey: entry.profile.recordKey,
      cardName: entry.profile.candidateName,
      armySlotsAdded: structuredClone(entry.profile.tacticalArmySlots),
      candidateProfileHash: entry.profile.profileHash };
  });
  const used = zeroSlots(types);
  const unitRows = units.map((entry) => {
    used[entry.profile.armySlotType] += entry.composition.occupiedArmySlots;
    return { unitInstanceId: entry.unitInstanceId, recordKey: entry.profile.recordKey,
      unitName: entry.profile.candidateName, armySlotType: entry.profile.armySlotType,
      compositionKind: entry.composition.compositionKind,
      startingModels: entry.composition.startingModels,
      startingSupply: entry.composition.startingSupply,
      occupiedArmySlots: entry.composition.occupiedArmySlots,
      candidateProfileHash: entry.profile.profileHash };
  });
  const overCapacity = types.filter((type) => used[type] > available[type]);
  if (overCapacity.length > 0) fail("ARMY_SLOT_CAPACITY_EXCEEDED", overCapacity[0]);
  const unused = Object.fromEntries(types.map((type) => [type, available[type] - used[type]]));
  return result({ schema: "starcraft_tmg_official_army_slot_audit_v1",
    procedureKind: "army_slot_audit", factionCard: factionLayout(faction),
    armyInstanceSetComplete: true, armySlotTypes: [...types],
    initialArmySlots: structuredClone(faction.startingArmySlots),
    tacticalCardRows: tacticalRows, unitRows, availableArmySlots: available,
    usedArmySlots: used, unusedArmySlots: unused,
    unusedArmySlotsDisposition: "lost", unusedArmySlotsRetained: false,
    unusedArmySlotsConvertedOrExchanged: false,
    startingSupplyEqualsOccupiedSlotCount: true,
    factionTagEligibilityResultHash: eligibility.resultHash,
    uniqueCardCopyAuditResultHash: uniqueAudit.resultHash,
    completeResourceBudgetValidated: false,
    completeResourceBudgetDeferredToSlice: 103,
    completeCompositionCostAndUpgradeValidationDeferredToSlice: 104,
    rulesOwnedSlotTotals: true, clientSuppliedSlotTotalsAccepted: false,
    trainingTruth: false });
}

export function certifyOfficialFactionArmyEligibilityPlanV1(input = {}) {
  const bundle = input.factionArmyEligibilityDataBundle;
  const procedureKind = String(input.procedureKind || ""); const plan = input.plan;
  verifyOfficialFactionArmyEligibilityDataBundleV1(bundle);
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult === true) fail("FACTION_ARMY_ELIGIBILITY_PLAN_INVALID");
  const planId = nonEmpty(plan.planId, "FACTION_ARMY_ELIGIBILITY_PLAN_INVALID");
  const shared = { ...plan.input, procedureKind,
    factionArmyEligibilityDataBundle: bundle };
  let resolution;
  if (procedureKind === "engagement_scale_agreement") {
    resolution = resolveOfficialEngagementScaleAgreementV1(shared);
  } else if (procedureKind === "faction_card_selection") {
    resolution = resolveOfficialFactionCardSelectionV1(shared);
  } else if (procedureKind === "faction_tag_eligibility") {
    resolution = resolveOfficialFactionTagEligibilityV1(shared);
  } else resolution = resolveOfficialArmySlotAuditV1(shared);
  const body = { schema: "starcraft_tmg_official_faction_army_eligibility_plan_certificate_v1",
    planId, procedureKind, sideKey: String(plan.sideKey || ""),
    dataBundleHash: bundle.bundleHash, result: resolution,
    rulesOwnedInputsComplete: true, clientSuppliedResultAccepted: false,
    trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialFactionArmyEligibilityPlanCertificateV1(input = {}) {
  const rebuilt = certifyOfficialFactionArmyEligibilityPlanV1(input);
  if (!isDeepStrictEqual(rebuilt, input.certificate)) {
    fail("FACTION_ARMY_ELIGIBILITY_PLAN_CERTIFICATE_DRIFT");
  }
  return true;
}

export function officialFactionArmyEligibilityProcedureKindsV1() {
  return [...PROCEDURE_KINDS].sort();
}
