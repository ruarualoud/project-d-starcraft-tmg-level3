import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  getOfficialUnitCardInspectionProfileV1,
  verifyOfficialRosterDisclosureDataBundleV1,
} from "../source-data/official-roster-disclosure-data-bundle-v1.mjs";
import { verifyOfficialUnitCompositionUpgradeResultV1 } from
  "./official-unit-composition-upgrade-rules-kernel-v1.mjs";

const PROCEDURE_KINDS = new Set([
  "roster_registry_audit",
  "closed_list_agreement_submission",
  "roster_visibility_resolution",
  "unit_equipment_deployment_disclosure",
  "equipment_relevant_action_reminder",
  "on_table_unit_inspection",
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
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
  const text = String(value || "").trim();
  if (!text) fail(code);
  return text;
}
function result(body) {
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}
function verifyResult(value, schema, code) {
  if (!object(value) || value.schema !== schema
    || value.resultHash !== hashStarcraftTmgContract(without(value, ["resultHash"]))) {
    fail(code);
  }
  return value;
}
function exactUniqueStrings(value, code, limit = 4096) {
  if (!Array.isArray(value) || value.length > limit) fail(code);
  const rows = value.map((entry) => nonEmpty(entry, code));
  if (new Set(rows).size !== rows.length) fail(code);
  return rows.sort();
}
function normalizedName(value) {
  return String(value || "").normalize("NFKC").replace(/[’‘]/gu, "'")
    .replace(/[\p{Z}\p{Cf}]+/gu, " ").trim().toLocaleLowerCase("en-US");
}
function verifyTeamBudgetResult(value) {
  return verifyResult(value,
    "starcraft_tmg_official_team_mineral_budget_resolution_v1",
    "ROSTER_REGISTRY_TEAM_BUDGET_INVALID");
}
function verifyRegistry(value) {
  return verifyResult(value,
    "starcraft_tmg_official_roster_registry_audit_v1",
    "ROSTER_REGISTRY_RESULT_INVALID");
}
function verifyVisibility(value) {
  return verifyResult(value,
    "starcraft_tmg_official_roster_visibility_resolution_v1",
    "ROSTER_VISIBILITY_RESULT_INVALID");
}
function verifyEquipmentDisclosure(value) {
  return verifyResult(value,
    "starcraft_tmg_official_unit_equipment_deployment_disclosure_v1",
    "EQUIPMENT_DISCLOSURE_RESULT_INVALID");
}

function publicCardsForAudit(audit) {
  const budget = audit.armyResourceBudgetResult;
  const faction = budget.factionCard;
  const factionCard = { cardInstanceId: String(
    faction.selectedFactionCardInstanceId || `faction:${audit.sideKey}`),
  recordKey: faction.recordKey, cardId: faction.cardId,
  cardName: faction.factionName || faction.cardName,
  cardKind: "faction", sourceCardProfileHash: faction.profileHash,
  faceUp: true, public: true };
  return [factionCard, ...budget.tacticalCardRows.map((entry) => ({
    cardInstanceId: entry.cardInstanceId, recordKey: entry.recordKey,
    cardId: entry.cardId, cardName: entry.cardName, cardKind: "tactical",
    sourceCardProfileHash: entry.sourceCardProfileHash,
    faceUp: true, public: true,
  }))].sort((left, right) => left.cardInstanceId.localeCompare(right.cardInstanceId));
}

function rosterUnitProjection(unit) {
  const composition = unit.unitCompositionResult;
  return { unitInstanceId: unit.unitInstanceId, recordKey: unit.recordKey,
    unitId: unit.unitId, unitName: unit.unitName,
    factionTag: composition.factionTag, armySlotType: composition.armySlotType,
    compositionKind: composition.compositionKind,
    startingModelIds: [...composition.startingModelIds],
    startingModelCount: composition.startingModelCount,
    startingSupply: composition.startingSupply,
    occupiedArmySlots: composition.occupiedArmySlots,
    unitMineralCost: composition.mineralCost,
    selectedUpgrades: clone(unit.selectedUpgrades),
    selectedUpgradeCount: unit.selectedUpgradeCount,
    upgradeMineralCost: unit.mineralCost,
    unitCompositionResultHash: composition.resultHash,
    unitUpgradeSelectionResultHash: unit.resultHash,
    upgradesAndWeaponSwapsDisclosed: true,
    trainingTruth: false };
}

function publicRosterProjection(roster, includeUnits, disclosedUnitIds = []) {
  const allowed = includeUnits === true ? new Set(roster.units.map((entry) => (
    entry.unitInstanceId))) : new Set(disclosedUnitIds);
  const units = roster.units.filter((entry) => allowed.has(entry.unitInstanceId))
    .map(rosterUnitProjection);
  return { playerId: roster.playerId, teamId: roster.teamId,
    publicCards: clone(roster.publicCards), units,
    unitEntriesComplete: includeUnits === true,
    undisclosedRosterRemainderExists: includeUnits !== true,
    factionAndTacticalCardsFaceUp: true,
    rosterVisibility: includeUnits === true ? "full" : "deployed_units_only",
    trainingTruth: false };
}

export function resolveOfficialRosterRegistryAuditV1(input = {}) {
  const bundle = input.rosterDisclosureDataBundle;
  verifyOfficialRosterDisclosureDataBundleV1(bundle);
  const playerIds = Object.keys(input.state?.players || {}).sort();
  const audits = input.armyCompositionUpgradeAuditsBySide;
  if (input.procedureKind !== "roster_registry_audit"
    || input.rosterSetComplete !== true
    || input.rulesOwnedRosterProjectionRequested !== true
    || input.teamGame !== true && input.teamGame !== false
    || input.clientSuppliedRosterProjection !== undefined
    || playerIds.length < 2 || !object(audits)
    || !isDeepStrictEqual(Object.keys(audits).sort(), playerIds)) {
    fail("ROSTER_REGISTRY_AUDIT_REQUEST_INVALID");
  }
  let teams;
  if (input.teamGame) {
    const teamBudget = verifyTeamBudgetResult(input.teamMineralBudgetResult);
    if (!isDeepStrictEqual(teamBudget.playerIds, playerIds)) {
      fail("ROSTER_REGISTRY_TEAM_PLAYER_PARTITION_INVALID");
    }
    teams = teamBudget.teams.map((team) => ({ teamId: team.teamId,
      playerIds: team.playerRows.map((entry) => entry.playerId).sort(),
      mineralAllocations: Object.fromEntries(team.playerRows.map((entry) => (
        [entry.playerId, entry.mineralAllocation]))),
      agreedMineralBudget: team.agreedMineralBudget,
      teamMineralBudgetResultHash: teamBudget.resultHash,
    })).sort((left, right) => left.teamId.localeCompare(right.teamId));
  } else {
    if (input.teamMineralBudgetResult !== undefined
      && input.teamMineralBudgetResult !== null) {
      fail("ROSTER_REGISTRY_NON_TEAM_BUDGET_FORBIDDEN");
    }
    teams = playerIds.map((playerId) => ({ teamId: `solo:${playerId}`,
      playerIds: [playerId], mineralAllocations: {}, agreedMineralBudget: null,
      teamMineralBudgetResultHash: null }));
  }
  const teamByPlayer = new Map();
  for (const team of teams) {
    for (const playerId of team.playerIds) {
      if (!playerIds.includes(playerId) || teamByPlayer.has(playerId)) {
        fail("ROSTER_REGISTRY_TEAM_PLAYER_PARTITION_INVALID", playerId);
      }
      teamByPlayer.set(playerId, team);
    }
  }
  if (teamByPlayer.size !== playerIds.length) {
    fail("ROSTER_REGISTRY_TEAM_PLAYER_PARTITION_INVALID");
  }
  const rostersByPlayer = Object.fromEntries(playerIds.map((playerId) => {
    const audit = audits[playerId];
    verifyOfficialUnitCompositionUpgradeResultV1(audit,
      "starcraft_tmg_official_complete_army_composition_upgrade_audit_v1");
    if (audit.sideKey !== playerId
      || audit.fullCompositionUpgradeAndFieldingLegalityValidated !== true) {
      fail("ROSTER_REGISTRY_COMPLETE_ARMY_AUDIT_REQUIRED", playerId);
    }
    const team = teamByPlayer.get(playerId);
    if (input.teamGame
      && team.mineralAllocations[playerId]
        !== audit.armyResourceBudgetResult.mineralBudget) {
      fail("ROSTER_REGISTRY_TEAM_ALLOCATION_DRIFT", playerId);
    }
    const rosterBody = { schema: "starcraft_tmg_official_authoritative_army_roster_v1",
      playerId, teamId: team.teamId, factionCard:
        clone(audit.armyResourceBudgetResult.factionCard),
      tacticalCards: clone(audit.armyResourceBudgetResult.tacticalCardRows),
      publicCards: publicCardsForAudit(audit), units: clone(audit.units),
      unitCount: audit.unitCount, startingModelCount: audit.startingModelCount,
      startingSupply: audit.startingSupply,
      selectedUpgradeCount: audit.selectedUpgradeCount,
      mineralBudget: audit.armyResourceBudgetResult.mineralBudget,
      mineralSpent: audit.armyResourceBudgetResult.mineralSpent,
      completeArmyCompositionUpgradeAuditHash: audit.resultHash,
      independentlySelectedFactionTacticalCardsAndUnits: true,
      trainingTruth: false };
    return [playerId, { ...rosterBody,
      rosterHash: hashStarcraftTmgContract(rosterBody) }];
  }));
  const teamRows = teams.map((team) => ({ teamId: team.teamId,
    playerIds: [...team.playerIds],
    playerRosterHashes: Object.fromEntries(team.playerIds.map((playerId) => (
      [playerId, rostersByPlayer[playerId].rosterHash]))),
    playersBuildOwnArmiesIndependently: true,
    teammatesMayChooseSameOrDifferentRaces: true }));
  return result({ schema: "starcraft_tmg_official_roster_registry_audit_v1",
    procedureKind: "roster_registry_audit", playerIds, teamGame: input.teamGame,
    teams: teamRows, teamMembershipByPlayer: Object.fromEntries(
      [...teamByPlayer].map(([playerId, team]) => [playerId, team.teamId])),
    rostersByPlayer, rosterSetComplete: true,
    everyPlayerRosterSourceBoundAndFieldingLegal: true,
    everyPlayerBuildsOwnArmyIndependently: true,
    sameOrDifferentTeamRacesPermitted: true,
    rulesOwnedRosterProjection: true,
    clientSuppliedRosterProjectionAccepted: false, trainingTruth: false });
}

export function resolveOfficialClosedListAgreementSubmissionV1(input = {}) {
  const bundle = input.rosterDisclosureDataBundle;
  verifyOfficialRosterDisclosureDataBundleV1(bundle);
  const registry = verifyRegistry(input.rosterRegistryResult);
  const playerId = nonEmpty(input.playerId, "ROSTER_VISIBILITY_PLAYER_INVALID");
  if (input.procedureKind !== "closed_list_agreement_submission"
    || !registry.playerIds.includes(playerId)
    || typeof input.closedListsAgreed !== "boolean"
    || input.personalDecisionConfirmed !== true
    || input.rulesOwnedAgreementIdentityRequested !== true
    || input.clientSuppliedOtherPlayerAgreement !== undefined) {
    fail("CLOSED_LIST_AGREEMENT_SUBMISSION_INVALID");
  }
  return result({ schema:
    "starcraft_tmg_official_closed_list_agreement_submission_v1",
  procedureKind: "closed_list_agreement_submission", playerId,
  closedListsAgreed: input.closedListsAgreed,
  rosterRegistryResultHash: registry.resultHash,
  personalDecisionConfirmed: true,
  onePlayerMayNotSubmitForAnother: true,
  rulesOwnedAgreementIdentity: true,
  clientSuppliedOtherPlayerAgreementAccepted: false,
  trainingTruth: false });
}

function verifyTournamentOverride(value) {
  if (!object(value) || value.applicable !== true
    || value.authorityKind !== "tournament_organiser_rules_pack"
    || !nonEmpty(value.artifactId, "ROSTER_VISIBILITY_TOURNAMENT_OVERRIDE_INVALID")
    || !/^[a-f0-9]{64}$/u.test(String(value.contentHash || ""))
    || !/^[a-f0-9]{64}$/u.test(String(value.verificationReceiptHash || ""))
    || !nonEmpty(value.organizerKeyId,
      "ROSTER_VISIBILITY_TOURNAMENT_OVERRIDE_INVALID")
    || value.signatureVerified !== true
    || !["open", "closed"].includes(value.rosterVisibility)) {
    fail("ROSTER_VISIBILITY_TOURNAMENT_OVERRIDE_INVALID");
  }
  return clone(value);
}

export function resolveOfficialRosterVisibilityV1(input = {}) {
  const bundle = input.rosterDisclosureDataBundle;
  verifyOfficialRosterDisclosureDataBundleV1(bundle);
  const registry = verifyRegistry(input.rosterRegistryResult);
  if (input.procedureKind !== "roster_visibility_resolution"
    || input.rulesOwnedVisibilityRequested !== true
    || input.playerAgreementSetComplete !== true
    || input.clientSuppliedVisibility !== undefined) {
    fail("ROSTER_VISIBILITY_REQUEST_INVALID");
  }
  let authorityKind; let rosterVisibility; let agreements = [];
  let tournamentOverride = null;
  if (input.tournamentOverride?.applicable === true) {
    tournamentOverride = verifyTournamentOverride(input.tournamentOverride);
    authorityKind = "tournament_organiser_rules_pack";
    rosterVisibility = tournamentOverride.rosterVisibility;
    if (input.playerClosedListAgreements !== undefined) {
      fail("ROSTER_VISIBILITY_CORE_AGREEMENT_WITH_OVERRIDE_FORBIDDEN");
    }
  } else {
    if (input.tournamentOverride !== undefined && input.tournamentOverride !== null
      && input.tournamentOverride.applicable !== false) {
      fail("ROSTER_VISIBILITY_TOURNAMENT_OVERRIDE_INVALID");
    }
    if (!Array.isArray(input.playerClosedListAgreements)
      || input.playerClosedListAgreements.length !== registry.playerIds.length) {
      fail("ROSTER_VISIBILITY_PLAYER_AGREEMENTS_INCOMPLETE");
    }
    agreements = input.playerClosedListAgreements.map((entry) => ({
      playerId: nonEmpty(entry?.playerId, "ROSTER_VISIBILITY_PLAYER_INVALID"),
      closedListsAgreed: entry?.closedListsAgreed === true,
    })).sort((left, right) => left.playerId.localeCompare(right.playerId));
    if (!isDeepStrictEqual(agreements.map((entry) => entry.playerId), registry.playerIds)
      || new Set(agreements.map((entry) => entry.playerId)).size
        !== registry.playerIds.length) {
      fail("ROSTER_VISIBILITY_PLAYER_AGREEMENTS_INCOMPLETE");
    }
    const unanimousClosed = agreements.every((entry) => entry.closedListsAgreed);
    authorityKind = unanimousClosed
      ? "core_unanimous_closed_list_agreement" : "core_default_open_lists";
    rosterVisibility = unanimousClosed ? "closed" : "open";
  }
  const publicDisclosureBySide = Object.fromEntries(registry.playerIds.map((playerId) => (
    [playerId, publicRosterProjection(registry.rostersByPlayer[playerId],
      rosterVisibility === "open")]
  )));
  return result({ schema: "starcraft_tmg_official_roster_visibility_resolution_v1",
    procedureKind: "roster_visibility_resolution",
    rosterRegistryResultHash: registry.resultHash, authorityKind, rosterVisibility,
    tournamentOverride, playerClosedListAgreements: agreements,
    closedListsRequireEveryPlayerAgreement: authorityKind
      !== "tournament_organiser_rules_pack",
    anyCorePlayerDeclineDefaultsToOpen: authorityKind === "core_default_open_lists",
    tournamentRulesPackOverridesCoreDefault:
      authorityKind === "tournament_organiser_rules_pack",
    publicDisclosureBySide,
    factionAndTacticalCardsAlwaysFaceUpAndInspectable: true,
    undeployedOpponentRosterEntriesHidden: rosterVisibility === "closed",
    fullRosterDisclosedBeforeGame: rosterVisibility === "open",
    rulesOwnedVisibility: true, clientSuppliedVisibilityAccepted: false,
    trainingTruth: false });
}

function unitAndRoster(registry, playerId, unitInstanceId) {
  const roster = registry.rostersByPlayer[playerId];
  if (!object(roster)) fail("EQUIPMENT_DISCLOSURE_PLAYER_ROSTER_REQUIRED", playerId);
  const unit = roster.units.find((entry) => entry.unitInstanceId === unitInstanceId);
  if (!unit) fail("EQUIPMENT_DISCLOSURE_ROSTER_UNIT_REQUIRED", unitInstanceId);
  return { roster, unit };
}

export function deriveOfficialUnitExpectedEquipmentV1(input = {}) {
  const bundle = input.rosterDisclosureDataBundle;
  verifyOfficialRosterDisclosureDataBundleV1(bundle);
  const registry = verifyRegistry(input.rosterRegistryResult);
  const playerId = nonEmpty(input.playerId, "EQUIPMENT_DISCLOSURE_PLAYER_REQUIRED");
  const unitInstanceId = nonEmpty(input.unitInstanceId,
    "EQUIPMENT_DISCLOSURE_UNIT_REQUIRED");
  const { unit } = unitAndRoster(registry, playerId, unitInstanceId);
  const composition = unit.unitCompositionResult;
  const profile = getOfficialUnitCardInspectionProfileV1(bundle, unit.recordKey);
  const rows = [];
  for (const modelId of composition.startingModelIds) {
    const equipment = profile.defaultEquipment.map((entry) => ({
      equipmentKey: `${unitInstanceId}:${modelId}:default:${entry.upgradeIndex}`,
      modelId, equipmentName: entry.equipmentName,
      normalizedEquipmentName: entry.normalizedEquipmentName,
      equipmentSourceKind: entry.equipmentSourceKind,
      equipmentProfileId: entry.equipmentProfileId,
      sourceProfileHash: entry.profileHash,
      replacementTargetName: null,
    }));
    for (const upgrade of unit.selectedUpgrades) {
      if (!upgrade.appliedModelIds.includes(modelId)) continue;
      if (upgrade.replacementTargetName) {
        const target = normalizedName(upgrade.replacementTargetName);
        for (let index = equipment.length - 1; index >= 0; index -= 1) {
          if (equipment[index].normalizedEquipmentName === target) equipment.splice(index, 1);
        }
      }
      equipment.push({
        equipmentKey: `${unitInstanceId}:${modelId}:upgrade:${upgrade.upgradeInstanceId}`,
        modelId, equipmentName: upgrade.upgradeName,
        normalizedEquipmentName: normalizedName(upgrade.upgradeName),
        equipmentSourceKind: "selected_upgrade_or_weapon_swap",
        equipmentProfileId: upgrade.purchasableUpgradeProfileId,
        sourceProfileHash: upgrade.profileHash,
        replacementTargetName: upgrade.replacementTargetName,
      });
    }
    rows.push(...equipment);
  }
  rows.sort((left, right) => left.equipmentKey.localeCompare(right.equipmentKey));
  const body = { schema: "starcraft_tmg_official_expected_unit_equipment_v1",
    playerId, unitInstanceId, recordKey: unit.recordKey, unitName: unit.unitName,
    unitRosterResultHash: unit.resultHash, unitCardInspectionProfileHash: profile.profileHash,
    equipmentRows: rows, equipmentCount: rows.length,
    expectedLoadoutDerivedFromDefaultEquipmentAndSelectedUpgrades: true,
    weaponReplacementsAppliedPerModel: true,
    clientSuppliedExpectedLoadoutAccepted: false, trainingTruth: false };
  return result(body);
}

export function resolveOfficialUnitEquipmentDeploymentDisclosureV1(input = {}) {
  const bundle = input.rosterDisclosureDataBundle;
  verifyOfficialRosterDisclosureDataBundleV1(bundle);
  const registry = verifyRegistry(input.rosterRegistryResult);
  const visibility = verifyVisibility(input.rosterVisibilityResult);
  if (visibility.rosterRegistryResultHash !== registry.resultHash
    || input.procedureKind !== "unit_equipment_deployment_disclosure"
    || input.deployedToBattlefield !== true
    || input.representationSetComplete !== true
    || input.deploymentDisclosureSetComplete !== true
    || input.rulesOwnedExpectedLoadoutRequested !== true
    || input.clientSuppliedExpectedLoadout !== undefined) {
    fail("EQUIPMENT_DEPLOYMENT_DISCLOSURE_REQUEST_INVALID");
  }
  const playerId = nonEmpty(input.playerId, "EQUIPMENT_DISCLOSURE_PLAYER_REQUIRED");
  const unitInstanceId = nonEmpty(input.unitInstanceId,
    "EQUIPMENT_DISCLOSURE_UNIT_REQUIRED");
  const { unit } = unitAndRoster(registry, playerId, unitInstanceId);
  const expected = deriveOfficialUnitExpectedEquipmentV1({
    rosterDisclosureDataBundle: bundle, rosterRegistryResult: registry,
    playerId, unitInstanceId,
  });
  const expectedKeys = expected.equipmentRows.map((entry) => entry.equipmentKey);
  const represented = exactUniqueStrings(input.representedEquipmentKeys,
    "EQUIPMENT_REPRESENTATION_SET_INVALID");
  const declared = exactUniqueStrings(input.declaredUnrepresentedEquipmentKeys,
    "EQUIPMENT_DECLARATION_SET_INVALID");
  if (represented.some((key) => !expectedKeys.includes(key))
    || declared.some((key) => !expectedKeys.includes(key))) {
    fail("EQUIPMENT_DISCLOSURE_UNKNOWN_EQUIPMENT_KEY");
  }
  const unrepresented = expectedKeys.filter((key) => !represented.includes(key));
  const declarationComplete = isDeepStrictEqual(declared, unrepresented);
  const missing = unrepresented.filter((key) => !declared.includes(key));
  const extra = declared.filter((key) => !unrepresented.includes(key));
  const publicUnitRoster = rosterUnitProjection(unit);
  return result({ schema:
    "starcraft_tmg_official_unit_equipment_deployment_disclosure_v1",
  procedureKind: "unit_equipment_deployment_disclosure", playerId, unitInstanceId,
  rosterVisibility: visibility.rosterVisibility,
  rosterVisibilityResultHash: visibility.resultHash,
  expectedEquipment: expected, expectedEquipmentResultHash: expected.resultHash,
  representedEquipmentKeys: represented,
  unrepresentedEquipmentKeys: unrepresented,
  declaredUnrepresentedEquipmentKeys: declared,
  missingDeclaredEquipmentKeys: missing, extraDeclaredEquipmentKeys: extra,
  accurateRepresentationExpectedWherePossible: true,
  accurateRepresentationComplete: unrepresented.length === 0,
  immediateDeploymentDisclosureComplete: declarationComplete,
  publicUnitRoster, deployedUnitIdentityUpgradesAndWeaponSwapsPublic: declarationComplete,
  fullAndAccurateOnTableEquipmentKnowledgeEstablished: declarationComplete,
  deploymentPermitted: declarationComplete,
  conductClassification: declarationComplete ? "compliant" : "unsportsmanlike_conduct",
  rulesOwnedExpectedLoadout: true, clientSuppliedExpectedLoadoutAccepted: false,
  trainingTruth: false });
}

export function hashOfficialEquipmentRelevantActionV1(action) {
  if (!object(action) || !nonEmpty(action.actionType,
    "EQUIPMENT_RELEVANT_ACTION_INVALID")) fail("EQUIPMENT_RELEVANT_ACTION_INVALID");
  return hashStarcraftTmgContract(without(action,
    ["isEnabled", "disabledReason", "score", "details"]));
}

export function resolveOfficialEquipmentRelevantActionReminderV1(input = {}) {
  const bundle = input.rosterDisclosureDataBundle;
  verifyOfficialRosterDisclosureDataBundleV1(bundle);
  const disclosure = verifyEquipmentDisclosure(input.equipmentDisclosureResult);
  if (input.procedureKind !== "equipment_relevant_action_reminder"
    || input.actionInformationCouldBeRelevant !== true
    || input.reminderSetComplete !== true
    || input.rulesOwnedReminderRequirementRequested !== true
    || !object(input.referencedAction)) {
    fail("EQUIPMENT_RELEVANT_ACTION_REMINDER_REQUEST_INVALID");
  }
  if (String(input.referencedAction.pieceId || "") !== disclosure.unitInstanceId
    || String(input.referencedAction.sideKey || "") !== disclosure.playerId) {
    fail("EQUIPMENT_RELEVANT_ACTION_UNIT_MISMATCH");
  }
  const reminded = exactUniqueStrings(input.remindedEquipmentKeys,
    "EQUIPMENT_REMINDER_SET_INVALID");
  const required = [...disclosure.unrepresentedEquipmentKeys].sort();
  if (reminded.some((key) => !required.includes(key))) {
    fail("EQUIPMENT_REMINDER_UNKNOWN_EQUIPMENT_KEY");
  }
  const reminderComplete = disclosure.deploymentPermitted === true
    && isDeepStrictEqual(reminded, required);
  const actionContractHash = hashOfficialEquipmentRelevantActionV1(
    input.referencedAction);
  return result({ schema:
    "starcraft_tmg_official_equipment_relevant_action_reminder_v1",
  procedureKind: "equipment_relevant_action_reminder",
  playerId: disclosure.playerId, unitInstanceId: disclosure.unitInstanceId,
  equipmentDisclosureResultHash: disclosure.resultHash,
  referencedActionType: input.referencedAction.actionType, actionContractHash,
  reminderRequired: required.length > 0, requiredEquipmentKeys: required,
  remindedEquipmentKeys: reminded,
  missingReminderEquipmentKeys: required.filter((key) => !reminded.includes(key)),
  reminderComplete, referencedActionPermitted: reminderComplete,
  conductClassification: reminderComplete ? "compliant" : "unsportsmanlike_conduct",
  conservativeEveryUnitActionReminderPolicy: required.length > 0,
  rulesOwnedReminderRequirement: true, trainingTruth: false });
}

export function assertOfficialEquipmentRelevantActionReminderV1(state, action) {
  if (!object(state) || !object(action)
    || action.actionType === "resolve_roster_disclosure_rules_procedure") return true;
  const unitInstanceId = String(action.pieceId || "");
  if (!unitInstanceId) return true;
  const disclosure = state.equipmentDisclosureByUnit?.[unitInstanceId];
  if (!object(disclosure) || disclosure.unrepresentedEquipmentKeys?.length === 0) return true;
  verifyEquipmentDisclosure(disclosure);
  const actionContractHash = hashOfficialEquipmentRelevantActionV1(action);
  const permit = state.equipmentReminderPermitsByActionHash?.[actionContractHash];
  if (!object(permit)) fail("EQUIPMENT_RELEVANT_ACTION_REMINDER_REQUIRED",
    unitInstanceId);
  verifyResult(permit,
    "starcraft_tmg_official_equipment_relevant_action_reminder_v1",
    "EQUIPMENT_RELEVANT_ACTION_REMINDER_INVALID");
  if (permit.referencedActionPermitted !== true
    || permit.equipmentDisclosureResultHash !== disclosure.resultHash
    || permit.actionContractHash !== actionContractHash) {
    fail("EQUIPMENT_RELEVANT_ACTION_REMINDER_INVALID", unitInstanceId);
  }
  return true;
}

export function resolveOfficialOnTableUnitInspectionV1(input = {}) {
  const bundle = input.rosterDisclosureDataBundle;
  verifyOfficialRosterDisclosureDataBundleV1(bundle);
  const registry = verifyRegistry(input.rosterRegistryResult);
  const visibility = verifyVisibility(input.rosterVisibilityResult);
  const disclosure = verifyEquipmentDisclosure(input.equipmentDisclosureResult);
  if (input.procedureKind !== "on_table_unit_inspection"
    || input.inspectionRequested !== true
    || input.rulesOwnedInspectionProjectionRequested !== true
    || visibility.rosterRegistryResultHash !== registry.resultHash
    || disclosure.rosterVisibilityResultHash !== visibility.resultHash
    || disclosure.deploymentPermitted !== true) {
    fail("ON_TABLE_UNIT_INSPECTION_REQUEST_INVALID");
  }
  const inspectorPlayerId = nonEmpty(input.inspectorPlayerId,
    "ON_TABLE_UNIT_INSPECTOR_REQUIRED");
  if (!registry.playerIds.includes(inspectorPlayerId)) {
    fail("ON_TABLE_UNIT_INSPECTOR_INVALID", inspectorPlayerId);
  }
  const { roster, unit } = unitAndRoster(registry, disclosure.playerId,
    disclosure.unitInstanceId);
  const profile = getOfficialUnitCardInspectionProfileV1(bundle, unit.recordKey);
  const inspectorTeam = registry.teamMembershipByPlayer[inspectorPlayerId];
  const controllerTeam = registry.teamMembershipByPlayer[disclosure.playerId];
  return result({ schema: "starcraft_tmg_official_on_table_unit_inspection_v1",
    procedureKind: "on_table_unit_inspection", inspectorPlayerId,
    controllingPlayerId: disclosure.playerId,
    unitInstanceId: disclosure.unitInstanceId,
    opponentInspectionRightExercised: inspectorTeam !== controllerTeam,
    unitCard: clone(profile.unitCardPayload), unitCardProfileHash: profile.profileHash,
    selectedUnitRoster: rosterUnitProjection(unit),
    associatedTacticalCards: clone(roster.publicCards.filter((entry) => (
      entry.cardKind === "tactical"))),
    equipmentDisclosure: clone(disclosure),
    unitIsOnTable: true, unitCardAndAssociatedTacticalCardsInspectable: true,
    fullAndAccurateOnTableEquipmentKnowledgeProvided: true,
    rulesOwnedInspectionProjection: true, trainingTruth: false });
}

export function certifyOfficialRosterDisclosurePlanV1(input = {}) {
  const bundle = input.rosterDisclosureDataBundle;
  const procedureKind = String(input.procedureKind || "");
  const plan = input.plan;
  verifyOfficialRosterDisclosureDataBundleV1(bundle);
  if (!object(plan) || !PROCEDURE_KINDS.has(procedureKind)
    || plan.procedureKind !== procedureKind
    || !nonEmpty(plan.planId, "ROSTER_DISCLOSURE_PLAN_INVALID")
    || plan.rulesOwnedInputsComplete !== true
    || plan.clientSuppliedResult !== false || !object(plan.input)) {
    fail("ROSTER_DISCLOSURE_PLAN_INVALID");
  }
  const shared = { ...plan.input, procedureKind,
    rosterDisclosureDataBundle: bundle };
  let resolved;
  if (procedureKind === "roster_registry_audit") {
    resolved = resolveOfficialRosterRegistryAuditV1(shared);
  } else if (procedureKind === "closed_list_agreement_submission") {
    resolved = resolveOfficialClosedListAgreementSubmissionV1(shared);
  } else if (procedureKind === "roster_visibility_resolution") {
    resolved = resolveOfficialRosterVisibilityV1(shared);
  } else if (procedureKind === "unit_equipment_deployment_disclosure") {
    resolved = resolveOfficialUnitEquipmentDeploymentDisclosureV1(shared);
  } else if (procedureKind === "equipment_relevant_action_reminder") {
    resolved = resolveOfficialEquipmentRelevantActionReminderV1(shared);
  } else {
    resolved = resolveOfficialOnTableUnitInspectionV1(shared);
  }
  const body = { schema: "starcraft_tmg_official_roster_disclosure_plan_certificate_v1",
    planId: plan.planId, procedureKind,
    inputHash: hashStarcraftTmgContract(plan.input), result: clone(resolved),
    rulesOwnedInputsComplete: true, clientSuppliedResultAccepted: false,
    trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialRosterDisclosureResultV1(value, schema) {
  verifyResult(value, schema, "ROSTER_DISCLOSURE_RESULT_INVALID");
  return true;
}

export function officialRosterDisclosureProcedureKindsV1() {
  return [...PROCEDURE_KINDS].sort();
}
