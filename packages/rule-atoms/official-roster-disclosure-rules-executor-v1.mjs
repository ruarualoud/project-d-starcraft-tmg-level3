import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH,
  OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
} from "../source-data/official-development-tranche-source-lock-v1.mjs";
import { verifyOfficialRosterDisclosureDataBundleV1 } from
  "../source-data/official-roster-disclosure-data-bundle-v1.mjs";
import {
  certifyOfficialRosterDisclosurePlanV1,
  officialRosterDisclosureProcedureKindsV1,
} from "./official-roster-disclosure-rules-kernel-v1.mjs";

export const OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_ID =
  "authority.roster-disclosure-rules-v1";
export const OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_ROSTER_DISCLOSURE_RULES_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_TYPE =
  "resolve_roster_disclosure_rules_procedure";
export const OFFICIAL_ROSTER_DISCLOSURE_RULES_PARAMETER_KIND =
  "official_roster_disclosure_rules_choice_v1";
export const OFFICIAL_ROSTER_DISCLOSURE_RULES_PENDING_SCHEMA =
  "starcraft_tmg_official_roster_disclosure_rules_pending_v1";

export const OFFICIAL_ROSTER_DISCLOSURE_RULES_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:closed-list-faction-and-tactical-card-visibility",
  "rule-atom:singleton:core-9-1-10-closed-list-agreement:3a2b6a1daafa",
  "rule-atom:singleton:core-9-1-10-closed-list-roster-secrecy:de47ad1eb2f1",
  "rule-atom:singleton:core-9-1-10-default-open-list-disclosure:5afe0eff433e",
  "rule-atom:singleton:core-9-1-10-deployed-unit-upgrade-disclosure:bd72883d19b4",
  "rule-atom:singleton:core-9-1-10-on-table-unit-inspection-right:271479053551",
  "rule-atom:singleton:core-9-1-10-tournament-roster-visibility-override:f41a3117b826",
  "rule-atom:singleton:core-9-1-11-accurate-equipment-modelling:696f66138b23",
  "rule-atom:singleton:core-9-1-11-full-equipment-knowledge:32e46eafb231",
  "rule-atom:singleton:core-9-1-11-nondisclosure-unsportsmanlike:ce3b2e1afb19",
  "rule-atom:singleton:core-9-1-11-nonrepresented-loadout-deployment-disclosure:674f84f8ffcd",
  "rule-atom:singleton:core-9-1-11-relevant-action-reminder:ef019e037df7",
  "rule-atom:singleton:core-9-1-8-independent-team-rosters:1acaaaa5e34f",
].sort());
export const OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_ATOM_IDS =
  OFFICIAL_ROSTER_DISCLOSURE_RULES_NEW_ATOM_IDS;
export const OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_ATOM_IDS =
  OFFICIAL_ROSTER_DISCLOSURE_RULES_NEW_ATOM_IDS;

const PROCEDURE_KINDS = new Set(officialRosterDisclosureProcedureKindsV1());
const AUTHORITY_INPUT_KEYS = new Set([
  "state", "armyCompositionUpgradeAuditsBySide", "teamMineralBudgetResult",
  "rosterRegistryResult", "rosterVisibilityResult", "equipmentDisclosureResult",
  "tournamentOverride", "playerClosedListAgreements",
]);

function fail(code, detail = "") { throw new Error(detail ? `${code}:${detail}` : code); }
function object(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function clone(value) { return structuredClone(value); }
function without(value, keys) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => !keys.includes(key)));
}
function hashBody(value, field) { return hashStarcraftTmgContract(without(value, [field])); }

function verifySourceAndData(state, matchBinding = null) {
  const audit = state?.officialDevelopmentTrancheSourceLockAudit;
  const gameplay = state?.officialGameplayDataBundle;
  const bundle = state?.officialRosterDisclosureDataBundle;
  if (!object(audit) || audit.lockHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH
    || audit.snapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || audit.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || audit.repositoryFallbackAllowed !== false || audit.trainingTruth !== false
    || gameplay?.sourceSnapshotHash !== OFFICIAL_DEVELOPMENT_TRANCHE_SNAPSHOT_HASH
    || gameplay?.normalizedDatasetHash !== OFFICIAL_DEVELOPMENT_TRANCHE_DATASET_HASH
    || gameplay?.repositoryFallbackAllowed !== false || gameplay?.trainingTruth !== false) {
    fail("ROSTER_DISCLOSURE_SOURCE_LOCK_BINDING_INVALID");
  }
  verifyOfficialRosterDisclosureDataBundleV1(bundle);
  if (matchBinding) {
    const expectedDataHash = hashStarcraftTmgContract(gameplay);
    if (matchBinding.dependencies?.dataSnapshot?.contentHash !== expectedDataHash
      || matchBinding.dataSnapshotHash !== expectedDataHash) {
      fail("ROSTER_DISCLOSURE_DATA_ARTIFACT_BINDING_INVALID");
    }
  }
  return bundle;
}

function sanitizedRegistry(result) {
  return { schema: "starcraft_tmg_official_roster_registry_summary_v1",
    resultHash: result.resultHash, playerIds: [...result.playerIds],
    teamGame: result.teamGame, teams: result.teams.map((team) => ({
      teamId: team.teamId, playerIds: [...team.playerIds],
      playerRosterHashes: clone(team.playerRosterHashes),
      playersBuildOwnArmiesIndependently: true,
      teammatesMayChooseSameOrDifferentRaces: true,
    })), teamMembershipByPlayer: clone(result.teamMembershipByPlayer),
    rosterSetComplete: true, trainingTruth: false };
}

function authoritativeInput(state, sideKey, procedureKind, rawInput) {
  if (!object(rawInput)) fail("ROSTER_DISCLOSURE_PLAN_INPUT_INVALID");
  for (const key of Object.keys(rawInput)) {
    if (AUTHORITY_INPUT_KEYS.has(key)) {
      fail("ROSTER_DISCLOSURE_CLIENT_AUTHORITY_INPUT_FORBIDDEN", key);
    }
  }
  const input = clone(rawInput);
  if (procedureKind === "roster_registry_audit") {
    return { ...input, state: { players: clone(state.players) },
      teamGame: state.teamGame === true,
      armyCompositionUpgradeAuditsBySide:
        clone(state.armyCompositionUpgradeAuditsBySide || {}),
      teamMineralBudgetResult: state.teamGame === true
        ? clone(state.teamMineralBudgetAgreement) : undefined };
  }
  const registry = state.authoritativeRosterRegistry;
  if (!object(registry)) fail("ROSTER_DISCLOSURE_REGISTRY_REQUIRED");
  if (procedureKind === "closed_list_agreement_submission") {
    return { ...input, playerId: sideKey, rosterRegistryResult: clone(registry) };
  }
  if (procedureKind === "roster_visibility_resolution") {
    const override = state.verifiedTournamentRosterVisibilityOverride;
    if (object(override) && override.applicable === true) {
      return { ...input, rosterRegistryResult: clone(registry),
        tournamentOverride: clone(override), playerAgreementSetComplete: true };
    }
    const agreements = state.rosterVisibilityAgreementsByPlayer || {};
    if (!isDeepStrictEqual(Object.keys(agreements).sort(), registry.playerIds)) {
      fail("ROSTER_VISIBILITY_PLAYER_AGREEMENTS_INCOMPLETE");
    }
    return { ...input, rosterRegistryResult: clone(registry),
      tournamentOverride: { applicable: false },
      playerClosedListAgreements: registry.playerIds.map((playerId) => ({
        playerId, closedListsAgreed: agreements[playerId].closedListsAgreed,
      })), playerAgreementSetComplete: true };
  }
  const visibility = state.rosterVisibilityResolution;
  if (!object(visibility)) fail("ROSTER_DISCLOSURE_VISIBILITY_REQUIRED");
  if (procedureKind === "unit_equipment_deployment_disclosure") {
    return { ...input, playerId: sideKey, rosterRegistryResult: clone(registry),
      rosterVisibilityResult: clone(visibility) };
  }
  const unitInstanceId = String(input.unitInstanceId || "");
  const disclosure = state.equipmentDisclosureByUnit?.[unitInstanceId];
  if (!object(disclosure)) fail("EQUIPMENT_DISCLOSURE_RESULT_REQUIRED",
    unitInstanceId);
  if (procedureKind === "equipment_relevant_action_reminder") {
    return { ...without(input, ["unitInstanceId"]),
      equipmentDisclosureResult: clone(disclosure) };
  }
  return { ...without(input, ["unitInstanceId"]), inspectorPlayerId: sideKey,
    rosterRegistryResult: clone(registry), rosterVisibilityResult: clone(visibility),
    equipmentDisclosureResult: clone(disclosure) };
}

function stateProjection(state, pending) {
  return hashStarcraftTmgContract({ round: Number(state.round), phase: state.phase,
    activeSideKey: state.activeSideKey, players: state.players,
    teamGame: state.teamGame === true,
    teamMineralBudgetAgreement: state.teamMineralBudgetAgreement || null,
    armyCompositionUpgradeAuditsBySide:
      state.armyCompositionUpgradeAuditsBySide || {},
    authoritativeRosterRegistry: state.authoritativeRosterRegistry || null,
    rosterRegistryResolution: state.rosterRegistryResolution || null,
    rosterVisibilityAgreementsByPlayer:
      state.rosterVisibilityAgreementsByPlayer || {},
    verifiedTournamentRosterVisibilityOverride:
      state.verifiedTournamentRosterVisibilityOverride || null,
    rosterVisibilityResolution: state.rosterVisibilityResolution || null,
    publicRosterDisclosureBySide: state.publicRosterDisclosureBySide || {},
    equipmentDisclosureByUnit: state.equipmentDisclosureByUnit || {},
    equipmentReminderPermitsByActionHash:
      state.equipmentReminderPermitsByActionHash || {},
    onTableUnitInspectionsBySide: state.onTableUnitInspectionsBySide || {},
    rosterDisclosureRulesHistory: state.rosterDisclosureRulesHistory || [],
    privateRosterDisclosureConductIncidents:
      state.privateRosterDisclosureConductIncidents || [],
    lastRosterDisclosureRulesResolution:
      state.lastRosterDisclosureRulesResolution || null,
    officialRosterDisclosureDataBundle: state.officialRosterDisclosureDataBundle,
    pending: without(pending, ["pendingHash", "stateProjectionHash"]),
    trainingTruth: false });
}

export function openOfficialRosterDisclosureRulesPendingV1(stateInput,
  procedure = {}) {
  const state = clone(stateInput); const bundle = verifySourceAndData(state);
  const procedureKind = String(procedure.procedureKind || "");
  const sideKey = String(procedure.sideKey || state.activeSideKey || "");
  if (state.rulesProcedureMode !== true || state.pendingAction
    || !PROCEDURE_KINDS.has(procedureKind) || !object(state.players?.[sideKey])
    || procedure.candidatePlansComplete !== true
    || procedure.rulesDenominatorComplete !== true
    || !Array.isArray(procedure.candidatePlans)
    || procedure.candidatePlans.length === 0 || procedure.candidatePlans.length > 64) {
    fail("ROSTER_DISCLOSURE_PROCEDURE_CERTIFICATE_REQUIRED");
  }
  const choices = procedure.candidatePlans.map((plan) => {
    const input = authoritativeInput(state, sideKey, procedureKind, plan.input);
    const certificate = certifyOfficialRosterDisclosurePlanV1({
      plan: { ...plan, input }, procedureKind,
      rosterDisclosureDataBundle: bundle,
    });
    const result = certificate.result;
    if ((procedureKind === "closed_list_agreement_submission"
        || procedureKind === "unit_equipment_deployment_disclosure")
      && result.playerId !== sideKey) fail("ROSTER_DISCLOSURE_PLAN_SIDE_MISMATCH");
    if (procedureKind === "equipment_relevant_action_reminder"
      && result.playerId !== sideKey) fail("ROSTER_DISCLOSURE_PLAN_SIDE_MISMATCH");
    if (procedureKind === "on_table_unit_inspection"
      && result.inspectorPlayerId !== sideKey) {
      fail("ROSTER_DISCLOSURE_PLAN_SIDE_MISMATCH");
    }
    return certificate;
  });
  if (new Set(choices.map((entry) => entry.planId)).size !== choices.length) {
    fail("ROSTER_DISCLOSURE_PLAN_ID_DUPLICATE");
  }
  const body = { schema: OFFICIAL_ROSTER_DISCLOSURE_RULES_PENDING_SCHEMA,
    stage: "choose_certified_roster_disclosure_plan",
    round: Number(state.round), phase: state.phase, sideKey, procedureKind,
    choices: choices.map((entry) => ({ ...entry,
      choiceId: `roster-disclosure-${entry.planHash}` }))
      .sort((left, right) => left.choiceId.localeCompare(right.choiceId)),
    rulesCertificate: { candidatePlansComplete: true,
      rulesDenominatorComplete: true,
      exactThirteenPart9RosterDisclosureAtomsBound: true,
      independentPerPlayerRosterAndTeamPartitionBound: true,
      tournamentOverrideAndUnanimousClosedAgreementBound: true,
      defaultOpenAndClosedUndeployedSecrecyBound: true,
      faceUpCardsDeploymentDisclosureAndInspectionBound: true,
      rulesOwnedExpectedEquipmentAndReminderPermitBound: true,
      roomViewerProjectionNoLeakRequired: true,
      slice104CompositionUpgradeAuditReused: true,
      clientSuppliedAuthorityResultAccepted: false },
    sourceLockHash: OFFICIAL_DEVELOPMENT_TRANCHE_SOURCE_LOCK_HASH,
    dataBundleHash: bundle.bundleHash, stateProjectionHash: "",
    sourceRefreshPerformed: false, repositoryFallbackUsed: false,
    trainingTruth: false };
  body.stateProjectionHash = stateProjection(state, body);
  state.pendingAction = { ...body, pendingHash: hashStarcraftTmgContract(body) };
  return { state, pending: clone(state.pendingAction) };
}

function verifyPending(state, matchBinding = null) {
  const bundle = verifySourceAndData(state, matchBinding);
  const pending = state?.pendingAction;
  const certificate = pending?.rulesCertificate;
  if (state?.rulesProcedureMode !== true || !object(pending)
    || pending.schema !== OFFICIAL_ROSTER_DISCLOSURE_RULES_PENDING_SCHEMA
    || pending.pendingHash !== hashBody(pending, "pendingHash")
    || pending.stateProjectionHash !== stateProjection(state, pending)
    || pending.dataBundleHash !== bundle.bundleHash
    || certificate?.candidatePlansComplete !== true
    || certificate?.rulesDenominatorComplete !== true
    || certificate?.exactThirteenPart9RosterDisclosureAtomsBound !== true
    || certificate?.independentPerPlayerRosterAndTeamPartitionBound !== true
    || certificate?.tournamentOverrideAndUnanimousClosedAgreementBound !== true
    || certificate?.defaultOpenAndClosedUndeployedSecrecyBound !== true
    || certificate?.faceUpCardsDeploymentDisclosureAndInspectionBound !== true
    || certificate?.rulesOwnedExpectedEquipmentAndReminderPermitBound !== true
    || certificate?.roomViewerProjectionNoLeakRequired !== true
    || certificate?.slice104CompositionUpgradeAuditReused !== true
    || certificate?.clientSuppliedAuthorityResultAccepted !== false
    || pending.sourceRefreshPerformed !== false || pending.repositoryFallbackUsed !== false
    || pending.trainingTruth !== false) fail("ROSTER_DISCLOSURE_PENDING_INVALID");
  return pending;
}

function domainFor(state, options = {}) {
  const pending = verifyPending(state, options.matchBinding);
  const body = { schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_ROSTER_DISCLOSURE_RULES_PARAMETER_KIND,
    matchBindingHash: String(options.matchBinding?.bindingHash || ""),
    round: pending.round, phase: pending.phase, sideKey: pending.sideKey,
    actionType: OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_TYPE, pieceId: "",
    executorId: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_ATOM_IDS],
    parameterSchema: { type: "object", required: ["choiceId"],
      choiceId: { enum: pending.choices.map((entry) => entry.choiceId) },
      selectionOwner: "controlling_player" },
    constraints: { pendingHash: pending.pendingHash,
      stateProjectionHash: pending.stateProjectionHash,
      procedureKind: pending.procedureKind,
      choices: pending.choices.map((entry) => ({ choiceId: entry.choiceId,
        planId: entry.planId, planHash: entry.planHash,
        procedureKind: entry.procedureKind,
        resultHash: entry.result.resultHash })),
      clientSuppliedAuthorityResultAccepted: false },
    confirmationClass: "explicit_human",
    rulesTruth: "official_roster_visibility_equipment_disclosure_conformance",
    trainingTruth: false };
  return { ...body, domainId: `sc-domain-${hashStarcraftTmgContract(body)}` };
}

export function enumerateOfficialRosterDisclosureRulesV1(state, options = {}) {
  const candidates = []; const parameterDomains = [];
  try {
    const domain = domainFor(state, options); parameterDomains.push(domain);
    candidates.push({ actionType: OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_TYPE,
      sideKey: domain.sideKey, phase: domain.phase, pieceId: "",
      ruleAtomIds: [...OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_ATOM_IDS],
      executorId: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_VERSION,
      isEnabled: true, disabledReason: "", score: 1,
      details: { parameterized: true, parameterKind: domain.parameterKind,
        procedureKind: domain.constraints.procedureKind, trainingTruth: false } });
  } catch (error) {
    if (!options.includeDisabled) return { candidates, parameterDomains };
    candidates.push({ actionType: OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_TYPE,
      sideKey: String(options.sideKey || state?.activeSideKey || ""),
      phase: String(state?.phase || ""), pieceId: "",
      executorId: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_ID,
      executorVersion: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_VERSION,
      ruleAtomIds: [...OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_ATOM_IDS],
      isEnabled: false,
      disabledReason: String(error?.message || error).split(":")[0],
      score: 0, details: { trainingTruth: false } });
  }
  return { candidates, parameterDomains };
}

export function instantiateOfficialRosterDisclosureRulesV1(state, domain,
  parameters, options = {}) {
  const expected = domainFor(state, options);
  if (!isDeepStrictEqual(domain, expected)) fail("ROSTER_DISCLOSURE_PARAMETER_DOMAIN_STALE");
  if (!object(parameters) || Object.keys(parameters).length !== 1
    || typeof parameters.choiceId !== "string"
    || !expected.constraints.choices.some((entry) => (
      entry.choiceId === parameters.choiceId))) {
    fail("ROSTER_DISCLOSURE_CHOICE_INVALID");
  }
  const choice = expected.constraints.choices.find((entry) => (
    entry.choiceId === parameters.choiceId));
  return { action: { actionType: OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_TYPE,
    sideKey: expected.sideKey, phase: expected.phase, pieceId: "",
    rosterDisclosurePlan: { schema:
      "starcraft_tmg_official_roster_disclosure_rules_plan_v1",
    choiceId: choice.choiceId, planHash: choice.planHash,
    procedureKind: choice.procedureKind, pendingHash: state.pendingAction.pendingHash },
    domainId: domain.domainId,
    ruleAtomIds: [...OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_ATOM_IDS],
    executorId: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_VERSION,
    isEnabled: true, disabledReason: "", score: 1,
    details: { procedureKind: choice.procedureKind,
      resultHash: choice.resultHash, trainingTruth: false } },
  canonicalParameters: { choiceId: choice.choiceId } };
}

function contractAction(value) {
  return without(value, ["isEnabled", "disabledReason", "score", "details"]);
}

function appendConductIncident(state, resultValue) {
  state.privateRosterDisclosureConductIncidents = Array.isArray(
    state.privateRosterDisclosureConductIncidents)
    ? state.privateRosterDisclosureConductIncidents : [];
  state.privateRosterDisclosureConductIncidents.push({
    schema: "starcraft_tmg_private_roster_disclosure_conduct_incident_v1",
    playerId: resultValue.playerId, unitInstanceId: resultValue.unitInstanceId,
    procedureKind: resultValue.procedureKind,
    resultHash: resultValue.resultHash,
    conductClassification: "unsportsmanlike_conduct", trainingTruth: false });
}

function publicResolutionSummary(resultValue) {
  return { schema: "starcraft_tmg_official_roster_disclosure_resolution_summary_v1",
    procedureKind: resultValue.procedureKind, resultHash: resultValue.resultHash,
    playerId: resultValue.playerId || resultValue.inspectorPlayerId || null,
    rosterVisibility: resultValue.rosterVisibility || null,
    deploymentPermitted: resultValue.deploymentPermitted,
    referencedActionPermitted: resultValue.referencedActionPermitted,
    conductClassification: resultValue.conductClassification || "compliant",
    trainingTruth: false };
}

export function applyOfficialRosterDisclosureRulesV1(stateInput, actionInput,
  options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_VERSION
    || !isDeepStrictEqual([...(actionInput.ruleAtomIds || [])].sort(),
      [...OFFICIAL_ROSTER_DISCLOSURE_RULES_ACTION_ATOM_IDS])) {
    fail("ROSTER_DISCLOSURE_ACTION_INVALID");
  }
  const domain = domainFor(stateInput, options);
  const choiceId = actionInput.rosterDisclosurePlan?.choiceId;
  const expected = instantiateOfficialRosterDisclosureRulesV1(stateInput, domain,
    { choiceId }, options);
  if (!isDeepStrictEqual(contractAction(actionInput), contractAction(expected.action))) {
    fail("ROSTER_DISCLOSURE_ACTION_STALE");
  }
  const pending = verifyPending(stateInput, options.matchBinding);
  const choice = pending.choices.find((entry) => entry.choiceId === choiceId);
  const resultValue = choice.result;
  const state = clone(stateInput); state.pendingAction = null;
  if (choice.procedureKind === "roster_registry_audit") {
    state.authoritativeRosterRegistry = clone(resultValue);
    state.authoritativeArmyRostersBySide = clone(resultValue.rostersByPlayer);
    state.rosterRegistryResolution = sanitizedRegistry(resultValue);
    state.publicRosterDisclosureBySide = Object.fromEntries(
      resultValue.playerIds.map((playerId) => [playerId, {
        playerId, teamId: resultValue.rostersByPlayer[playerId].teamId,
        publicCards: clone(resultValue.rostersByPlayer[playerId].publicCards),
        units: [], unitEntriesComplete: false,
        undisclosedRosterRemainderExists: true,
        factionAndTacticalCardsFaceUp: true,
        rosterVisibility: "deployed_units_only", trainingTruth: false,
      }]));
  } else if (choice.procedureKind === "closed_list_agreement_submission") {
    state.rosterVisibilityAgreementsByPlayer = object(
      state.rosterVisibilityAgreementsByPlayer)
      ? state.rosterVisibilityAgreementsByPlayer : {};
    state.rosterVisibilityAgreementsByPlayer[resultValue.playerId] = clone(resultValue);
  } else if (choice.procedureKind === "roster_visibility_resolution") {
    state.rosterVisibilityResolution = clone(resultValue);
    state.publicRosterDisclosureBySide = clone(resultValue.publicDisclosureBySide);
  } else if (choice.procedureKind === "unit_equipment_deployment_disclosure") {
    if (resultValue.deploymentPermitted) {
      state.equipmentDisclosureByUnit = object(state.equipmentDisclosureByUnit)
        ? state.equipmentDisclosureByUnit : {};
      state.equipmentDisclosureByUnit[resultValue.unitInstanceId] = clone(resultValue);
      const projection = state.publicRosterDisclosureBySide[resultValue.playerId];
      if (!object(projection)) fail("ROSTER_DISCLOSURE_PUBLIC_PROJECTION_REQUIRED");
      projection.units = Array.isArray(projection.units) ? projection.units : [];
      projection.units = projection.units.filter((entry) => (
        entry.unitInstanceId !== resultValue.unitInstanceId));
      projection.units.push({ ...clone(resultValue.publicUnitRoster),
        equipmentDisclosureResultHash: resultValue.resultHash,
        fullAndAccurateOnTableEquipmentKnowledgeEstablished: true });
      projection.units.sort((left, right) => (
        left.unitInstanceId.localeCompare(right.unitInstanceId)));
    } else appendConductIncident(state, resultValue);
  } else if (choice.procedureKind === "equipment_relevant_action_reminder") {
    if (resultValue.referencedActionPermitted) {
      state.equipmentReminderPermitsByActionHash = object(
        state.equipmentReminderPermitsByActionHash)
        ? state.equipmentReminderPermitsByActionHash : {};
      state.equipmentReminderPermitsByActionHash[resultValue.actionContractHash] =
        clone(resultValue);
    } else appendConductIncident(state, resultValue);
  } else {
    state.onTableUnitInspectionsBySide = object(state.onTableUnitInspectionsBySide)
      ? state.onTableUnitInspectionsBySide : {};
    state.onTableUnitInspectionsBySide[resultValue.inspectorPlayerId] = clone(resultValue);
  }
  const summary = publicResolutionSummary(resultValue);
  state.lastRosterDisclosureRulesResolution = summary;
  state.rosterDisclosureRulesHistory = Array.isArray(state.rosterDisclosureRulesHistory)
    ? state.rosterDisclosureRulesHistory : [];
  state.rosterDisclosureRulesHistory.push(clone(summary));
  const event = { type: "roster_disclosure_rules_resolved",
    sideKey: pending.sideKey, procedureKind: choice.procedureKind,
    resolution: clone(summary), trainingTruth: false };
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({ type: "roster_disclosure_rules_resolution",
    round: Number(state.round), phase: state.phase, sideKey: pending.sideKey,
    action: clone(actionInput), events: [clone(event)], trainingTruth: false });
  return { ok: true,
    schemaVersion: "starcraft_tmg_official_roster_disclosure_rules_transition_v1",
    executorId: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_ID,
    executorVersion: OFFICIAL_ROSTER_DISCLOSURE_RULES_EXECUTOR_VERSION,
    state, events: [event], action: clone(actionInput), settlementRequired: false,
    rulesTruth: "official_roster_visibility_equipment_disclosure_resolved",
    trainingTruth: false };
}
