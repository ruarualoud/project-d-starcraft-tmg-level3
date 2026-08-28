import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import {
  createOfficialAttackProfileCatalogueV2,
  getOfficialAttackProfileV2,
} from "../source-data/official-attack-profile-catalogue-v2.mjs";
import { getOfficialCombatProfileV1 } from
  "../source-data/official-combat-profile-bundle-v1.mjs";
import { verifyOfficialGameplayDataBundleV1 } from
  "../source-data/official-gameplay-data-bundle-v1.mjs";

export const OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID =
  "authority.specialist-loadout-v1";
export const OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_VERSION = "1.0.0";
export const OFFICIAL_SPECIALIST_LOADOUT_TRANSITION_SCHEMA =
  "starcraft_tmg_authority_v2.receipt";
export const OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE =
  "configure_specialist_loadout";
export const OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND =
  "official_specialist_loadout_assignment_v1";

export const OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-11-specialist-single-weapon-limit:6559885dfc6a",
  "rule-atom:singleton:core-9-1-7-specialist-distinct-assignment:b7eea08d049e",
  "rule-atom:singleton:core-9-1-7-specialist-nomination:2fd9d6fc1e8c",
  "rule-atom:singleton:core-9-1-7-specialist-single-carrier:81a9cd2746ac",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_SPECIALIST_LOADOUT_DEPENDENCY_ATOM_IDS = Object.freeze([
  "rule-atom:singleton:core-5-2-replacement:91b9f418d86b",
  "rule-atom:singleton:core-5-2-upgrade:191e2715a36e",
  "rule-atom:singleton:core-9-1-7-replacement-weapon-effect:cfcd72d74c46",
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_SPECIALIST_LOADOUT_ACTION_ATOM_IDS = Object.freeze([
  ...new Set([
    ...OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS,
    ...OFFICIAL_SPECIALIST_LOADOUT_DEPENDENCY_ATOM_IDS,
  ]),
].sort((left, right) => left.localeCompare(right)));

export const OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ATOM_IDS =
  OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS;

const CURRENT_SOURCE_SNAPSHOT_HASH =
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78";
const CURRENT_DATASET_HASH =
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a";
const MARINE_RECORD_KEY = "army_units:marine";
const MARINE_SOURCE_RECORD_HASH =
  "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215";
const MARINE_PAYLOAD_HASH =
  "33cbc0b9e9e17ca95f1cd639f78d81e8ec7606f035642e32fdf7064bcc49d1e6";
const HASH_PATTERN = /^[a-f0-9]{64}$/u;
const SIDE_KEYS = Object.freeze(["player1", "player2"]);
const SPECIALIST_EFFECT_ATOM_ID = "attack-effect:specialist-v1";
const DEFERRED_SPECIALIST_BATCH_ATOM_ID =
  "rule-atom:singleton:core-9-1-7-specialist-separate-attack-batch:85e56fc370d2";

const PROFILE_SCOPES = Object.freeze({
  "C-14 rifle": Object.freeze({
    profileKey: "army_units:marine::assault::C-14 rifle",
    profileHash:
      "a20160b32f9965e1b23c17b6d0fdbd3995796dedad0277a52fd15bf194cb7229",
    linkedTo: "-",
    costSmall: 0,
    costLarge: 0,
    specialist: false,
  }),
  "AGG-12": Object.freeze({
    profileKey: "army_units:marine::assault::AGG-12",
    profileHash:
      "ab0ac32f359ecccf3ae1110c663f475bcff182564d9c138f7c23863bab8ad282",
    linkedTo: "C-14 Rifle",
    costSmall: 10,
    costLarge: 10,
    specialist: true,
  }),
  "Rocket Launcher": Object.freeze({
    profileKey: "army_units:marine::assault::Rocket Launcher",
    profileHash:
      "bf67c07fba458f4cca9487d63befe57dd8b905d97d01f53dcb24f661a49ceef0",
    linkedTo: "-",
    costSmall: 40,
    costLarge: 40,
    specialist: true,
  }),
});
const SPECIALIST_WEAPON_NAMES = Object.freeze([
  "AGG-12",
  "Rocket Launcher",
]);

function fail(code, detail = "") {
  throw new Error(detail ? `${code}:${detail}` : code);
}

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone(value) {
  return structuredClone(value);
}

function freezeDeep(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function requiredText(value, code) {
  const result = String(value || "").trim().normalize("NFC");
  if (!result) fail(code);
  return result;
}

function runtimeHash(matchBinding) {
  const value = String(matchBinding?.rulesRuntimeBinding?.runtimeHash || "").trim();
  if (!HASH_PATTERN.test(value)) fail("SPECIALIST_RUNTIME_BINDING_REQUIRED");
  return value;
}

function normalizedSelectedNames(value) {
  if (!Array.isArray(value) || value.length === 0) {
    fail("SPECIALIST_SELECTED_UPGRADES_REQUIRED");
  }
  const names = value.map((entry) => requiredText(
    entry,
    "SPECIALIST_SELECTED_UPGRADE_INVALID",
  ));
  if (new Set(names).size !== names.length) {
    fail("SPECIALIST_DUPLICATE_UPGRADE_FORBIDDEN");
  }
  if (names.some((name) => !SPECIALIST_WEAPON_NAMES.includes(name))) {
    fail("SPECIALIST_SELECTED_UPGRADE_SCOPE_UNSUPPORTED");
  }
  return names.sort((left, right) => left.localeCompare(right));
}

function verifyExactProfile(profile, weaponName) {
  const scope = PROFILE_SCOPES[weaponName];
  if (!scope
    || profile.profileKey !== scope.profileKey
    || profile.profileHash !== scope.profileHash
    || profile.recordKey !== MARINE_RECORD_KEY
    || profile.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || profile.payloadHash !== MARINE_PAYLOAD_HASH
    || profile.phase !== "assault"
    || profile.weaponName !== weaponName
    || profile.linkedTo !== scope.linkedTo
    || profile.costSmall !== scope.costSmall
    || profile.costLarge !== scope.costLarge) {
    fail("SPECIALIST_OFFICIAL_PROFILE_DRIFT", weaponName);
  }
  const specialistEffects = profile.effects.filter((effect) => (
    effect.effectAtomId === SPECIALIST_EFFECT_ATOM_ID
  ));
  if (scope.specialist) {
    if (specialistEffects.length !== 1
      || specialistEffects[0].sourceKind !== "weapon_keyword"
      || !object(specialistEffects[0].parameters)
      || Object.keys(specialistEffects[0].parameters).length !== 0) {
      fail("SPECIALIST_EFFECT_PROFILE_INVALID", weaponName);
    }
  } else if (specialistEffects.length !== 0) {
    fail("SPECIALIST_DEFAULT_PROFILE_INVALID", weaponName);
  }
  return profile;
}

function officialBindings(state, matchBinding) {
  const gameplayDataBundle = state.officialGameplayDataBundle;
  verifyOfficialGameplayDataBundleV1(gameplayDataBundle);
  if (gameplayDataBundle.sourceSnapshotHash !== CURRENT_SOURCE_SNAPSHOT_HASH
    || gameplayDataBundle.normalizedDatasetHash !== CURRENT_DATASET_HASH
    || gameplayDataBundle.dataVersions?.unitsVersion !== "71"
    || gameplayDataBundle.dataVersions?.cardsVersion !== "69"
    || gameplayDataBundle.dataVersions?.rulesVersion !== "48"
    || gameplayDataBundle.repositoryFallbackAllowed !== false) {
    fail("SPECIALIST_LATEST_OFFICIAL_DATA_REQUIRED");
  }
  if (!object(matchBinding)
    || hashStarcraftTmgContract(gameplayDataBundle) !== matchBinding.dataSnapshotHash) {
    fail("SPECIALIST_DATA_SNAPSHOT_MISMATCH");
  }
  const boundRuntimeHash = runtimeHash(matchBinding);
  const previousCatalogue = gameplayDataBundle.attackProfileCatalogue;
  if (!previousCatalogue) fail("SPECIALIST_ATTACK_PROFILE_CATALOGUE_REQUIRED");
  const catalogue = createOfficialAttackProfileCatalogueV2({ previousCatalogue });
  const combatProfile = getOfficialCombatProfileV1(
    gameplayDataBundle.combatProfileBundle,
    MARINE_RECORD_KEY,
  );
  if (combatProfile.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || combatProfile.payloadHash !== MARINE_PAYLOAD_HASH
    || combatProfile.unitId !== "marine"
    || combatProfile.unitName !== "Marine"
    || combatProfile.squadProfile.at(-1)?.maximumModels !== 9) {
    fail("SPECIALIST_MARINE_PROFILE_DRIFT");
  }
  const profiles = Object.fromEntries([
    "C-14 rifle",
    ...SPECIALIST_WEAPON_NAMES,
  ].map((weaponName) => [
    weaponName,
    verifyExactProfile(getOfficialAttackProfileV2(catalogue, {
      recordKey: MARINE_RECORD_KEY,
      phase: "assault",
      weaponName,
    }), weaponName),
  ]));
  return {
    gameplayDataBundle,
    catalogue,
    combatProfile,
    profiles,
    boundRuntimeHash,
  };
}

function validatePiece(piece, sideKey, bindings) {
  if (!object(piece)
    || piece.sideKey !== sideKey
    || piece.officialUnitRecordKey !== MARINE_RECORD_KEY
    || piece.sourceRecordHash !== MARINE_SOURCE_RECORD_HASH
    || piece.isDestroyed === true
    || piece.isOnField === true
    || ![6, 9].includes(Number(piece.currentModels))
    || !Array.isArray(piece.models)
    || piece.models.length !== Number(piece.currentModels)
    || !Array.isArray(piece.selectedUpgradeNames)
    || piece.specialistLoadoutHash !== undefined
    || piece.specialistLoadout !== undefined
    || piece.rosterLoadoutSealed === true) {
    fail("SPECIALIST_UNIT_SCOPE_UNSUPPORTED", String(piece?.id || ""));
  }
  const expectedSupply = Number(piece.currentModels) === 6 ? 1 : 2;
  if (Number(piece.currentSupply) !== expectedSupply) {
    fail("SPECIALIST_CURRENT_SUPPLY_MISMATCH", String(piece.id || ""));
  }
  const modelIds = piece.models.map((model) => requiredText(
    model?.id,
    "SPECIALIST_MODEL_ID_REQUIRED",
  ));
  if (new Set(modelIds).size !== modelIds.length
    || piece.models.some((model) => model.isDestroyed === true || model.isOnField === true)) {
    fail("SPECIALIST_MODEL_DENOMINATOR_INVALID", String(piece.id || ""));
  }
  const selectedUpgradeNames = normalizedSelectedNames(piece.selectedUpgradeNames);
  const specialistProfiles = selectedUpgradeNames.map((weaponName) => (
    bindings.profiles[weaponName]
  ));
  return {
    piece,
    modelIds: modelIds.sort((left, right) => left.localeCompare(right)),
    selectedUpgradeNames,
    specialistProfiles,
  };
}

function specialistContext(state, sideKey, pieceId, options = {}) {
  if (!object(state)
    || !object(state.players)
    || !Array.isArray(state.pieces)
    || !SIDE_KEYS.includes(sideKey)
    || state.phase !== "army_building"
    || state.activeSideKey !== sideKey
    || state.gameOver === true
    || state.terminal === true) {
    fail("SPECIALIST_ARMY_BUILDING_STATE_REQUIRED");
  }
  const bindings = officialBindings(state, options.matchBinding);
  const piece = state.pieces.find((entry) => (
    entry?.id === pieceId && entry?.sideKey === sideKey
  ));
  if (!piece) fail("SPECIALIST_UNIT_NOT_FOUND", pieceId);
  return {
    ...bindings,
    ...validatePiece(piece, sideKey, bindings),
    sideKey,
  };
}

function diagnosticAction(sideKey, pieceId, error) {
  return {
    actionType: OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE,
    sideKey,
    phase: "army_building",
    pieceId,
    ruleAtomIds: [...OFFICIAL_SPECIALIST_LOADOUT_ACTION_ATOM_IDS],
    executorId: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_VERSION,
    isEnabled: false,
    disabledReason: String(error?.message || error).split(":")[0],
    score: 0,
    details: {
      rulesTruth: "official_specialist_loadout_fail_closed",
      trainingTruth: false,
    },
  };
}

function domainFor(state, context, matchBinding) {
  const specialistProfiles = context.specialistProfiles.map((profile) => ({
    weaponName: profile.weaponName,
    profileKey: profile.profileKey,
    profileHash: profile.profileHash,
    linkedTo: profile.linkedTo,
    replacement: profile.linkedTo !== "-",
  })).sort((left, right) => left.weaponName.localeCompare(right.weaponName));
  const core = {
    schemaVersion: "starcraft_tmg_official_parameter_domain_v1",
    parameterKind: OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND,
    matchBindingHash: String(matchBinding?.bindingHash || ""),
    phase: "army_building",
    sideKey: context.sideKey,
    actionType: OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE,
    pieceId: context.piece.id,
    executorId: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_VERSION,
    ruleAtomIds: [...OFFICIAL_SPECIALIST_LOADOUT_ACTION_ATOM_IDS],
    parameterSchema: {
      type: "object",
      required: ["assignments"],
      assignmentRequired: ["weaponName", "modelId"],
      exactAssignmentCount: specialistProfiles.length,
      uniqueWeaponNames: true,
      uniqueModelIds: true,
    },
    constraints: {
      recordKey: MARINE_RECORD_KEY,
      sourceRecordHash: MARINE_SOURCE_RECORD_HASH,
      payloadHash: MARINE_PAYLOAD_HASH,
      currentModels: Number(context.piece.currentModels),
      currentSupply: Number(context.piece.currentSupply),
      modelIds: [...context.modelIds],
      selectedSpecialistProfiles: specialistProfiles,
      defaultAssaultProfile: {
        weaponName: context.profiles["C-14 rifle"].weaponName,
        profileKey: context.profiles["C-14 rifle"].profileKey,
        profileHash: context.profiles["C-14 rifle"].profileHash,
      },
      attackProfileCatalogueHash: context.catalogue.catalogueHash,
      gameplayDataBundleHash: context.gameplayDataBundle.gameplayDataBundleHash,
      rulesRuntimeHash: context.boundRuntimeHash,
      repositoryFallbackAllowed: false,
    },
    confirmationClass: "explicit_human",
    rulesTruth: "official_marine_specialist_assignment_parameter_domain",
    trainingTruth: false,
  };
  return freezeDeep({
    ...core,
    domainId: `sc-domain-${hashStarcraftTmgContract(core)}`,
  });
}

export function enumerateOfficialSpecialistLoadoutV1(state, options = {}) {
  const sideKey = String(options.sideKey || state?.activeSideKey || "").trim();
  const pieces = Array.isArray(state?.pieces)
    ? state.pieces.filter((piece) => piece?.sideKey === sideKey)
    : [];
  const parameterDomains = [];
  const candidates = [];
  for (const piece of pieces) {
    try {
      const context = specialistContext(state, sideKey, piece.id, options);
      parameterDomains.push(domainFor(state, context, options.matchBinding));
    } catch (error) {
      if (options.includeDisabled === true) {
        candidates.push(diagnosticAction(sideKey, String(piece?.id || ""), error));
      }
    }
  }
  return freezeDeep({ candidates, parameterDomains });
}

function canonicalAssignments(parameters, domain) {
  if (!object(parameters) || !Array.isArray(parameters.assignments)) {
    fail("SPECIALIST_ASSIGNMENTS_REQUIRED");
  }
  const assignments = parameters.assignments.map((entry) => ({
    weaponName: requiredText(entry?.weaponName, "SPECIALIST_ASSIGNMENT_WEAPON_REQUIRED"),
    modelId: requiredText(entry?.modelId, "SPECIALIST_ASSIGNMENT_MODEL_REQUIRED"),
  }));
  const expectedWeapons = domain.constraints.selectedSpecialistProfiles
    .map((profile) => profile.weaponName)
    .sort((left, right) => left.localeCompare(right));
  const observedWeapons = assignments.map((entry) => entry.weaponName)
    .sort((left, right) => left.localeCompare(right));
  if (!isDeepStrictEqual(observedWeapons, expectedWeapons)) {
    fail("SPECIALIST_ASSIGNMENT_DENOMINATOR_MISMATCH");
  }
  if (new Set(assignments.map((entry) => entry.weaponName)).size !== assignments.length) {
    fail("SPECIALIST_DUPLICATE_UPGRADE_FORBIDDEN");
  }
  if (new Set(assignments.map((entry) => entry.modelId)).size !== assignments.length) {
    fail("SPECIALIST_DISTINCT_CARRIER_REQUIRED");
  }
  const allowedModelIds = new Set(domain.constraints.modelIds);
  if (assignments.some((entry) => !allowedModelIds.has(entry.modelId))) {
    fail("SPECIALIST_CARRIER_MODEL_UNKNOWN");
  }
  return assignments.sort((left, right) => left.weaponName.localeCompare(right.weaponName));
}

function modelLoadouts(domain, assignments) {
  const profileByWeapon = new Map(domain.constraints.selectedSpecialistProfiles.map((profile) => (
    [profile.weaponName, profile]
  )));
  const defaultProfile = domain.constraints.defaultAssaultProfile;
  const loadouts = new Map(domain.constraints.modelIds.map((modelId) => [
    modelId,
    [{ ...defaultProfile, source: "official_default_weapon" }],
  ]));
  for (const assignment of assignments) {
    const profile = profileByWeapon.get(assignment.weaponName);
    const weapons = loadouts.get(assignment.modelId);
    if (profile.replacement) {
      const linked = profile.linkedTo.toLocaleLowerCase("en-US");
      const index = weapons.findIndex((weapon) => (
        weapon.weaponName.toLocaleLowerCase("en-US") === linked
      ));
      if (index < 0) fail("SPECIALIST_REPLACED_WEAPON_MISSING", profile.linkedTo);
      weapons.splice(index, 1);
    }
    weapons.push({
      weaponName: profile.weaponName,
      profileKey: profile.profileKey,
      profileHash: profile.profileHash,
      source: "official_specialist_upgrade",
    });
  }
  return [...loadouts.entries()].map(([modelId, weapons]) => ({
    modelId,
    assaultWeapons: weapons.sort((left, right) => (
      left.profileKey.localeCompare(right.profileKey)
    )),
  })).sort((left, right) => left.modelId.localeCompare(right.modelId));
}

function canonicalAction(domain, plan) {
  return freezeDeep({
    actionType: OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE,
    sideKey: domain.sideKey,
    phase: "army_building",
    pieceId: domain.pieceId,
    domainId: domain.domainId,
    specialistLoadoutPlan: plan,
    ruleAtomIds: [...OFFICIAL_SPECIALIST_LOADOUT_ACTION_ATOM_IDS],
    executorId: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_VERSION,
  });
}

export function instantiateOfficialSpecialistLoadoutV1(
  state,
  domain,
  parameters,
  options = {},
) {
  if (!object(domain)
    || domain.parameterKind !== OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND
    || domain.executorId !== OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID
    || domain.executorVersion !== OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_VERSION) {
    fail("SPECIALIST_PARAMETER_DOMAIN_INVALID");
  }
  const enumeration = enumerateOfficialSpecialistLoadoutV1(state, {
    sideKey: domain.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const current = enumeration.parameterDomains.find((entry) => (
    entry.domainId === domain.domainId
  ));
  if (!current || !isDeepStrictEqual(current, domain)) {
    fail("SPECIALIST_PARAMETER_DOMAIN_STALE");
  }
  const assignments = canonicalAssignments(parameters, domain);
  const assignmentsByWeapon = new Map(assignments.map((entry) => (
    [entry.weaponName, entry]
  )));
  const assignmentReceipts = domain.constraints.selectedSpecialistProfiles.map((profile) => {
    const assignment = assignmentsByWeapon.get(profile.weaponName);
    return {
      weaponName: profile.weaponName,
      profileKey: profile.profileKey,
      profileHash: profile.profileHash,
      nominatedModelId: assignment.modelId,
      linkedTo: profile.linkedTo,
      replacement: profile.replacement,
      originalWeaponRetained: !profile.replacement,
    };
  }).sort((left, right) => left.weaponName.localeCompare(right.weaponName));
  const planBody = {
    schemaVersion: "starcraft_tmg_official_specialist_loadout_plan_v1",
    pieceId: domain.pieceId,
    recordKey: domain.constraints.recordKey,
    sourceRecordHash: domain.constraints.sourceRecordHash,
    payloadHash: domain.constraints.payloadHash,
    attackProfileCatalogueHash: domain.constraints.attackProfileCatalogueHash,
    gameplayDataBundleHash: domain.constraints.gameplayDataBundleHash,
    rulesRuntimeHash: domain.constraints.rulesRuntimeHash,
    currentModels: domain.constraints.currentModels,
    currentSupply: domain.constraints.currentSupply,
    assignments: assignmentReceipts,
    modelLoadouts: modelLoadouts(domain, assignments),
    assignmentRuleAtomIds: [...OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS],
    dependencyRuleAtomIds: [...OFFICIAL_SPECIALIST_LOADOUT_DEPENDENCY_ATOM_IDS],
    deferredAttackRuleAtomIds: [DEFERRED_SPECIALIST_BATCH_ATOM_ID],
    attackBatchExecutionAuthorized: false,
    sidearmExecutionAuthorized: false,
    indirectFireExecutionAuthorized: false,
    assignmentStatus: "executable",
    attackBatchStatus: "review_required",
    repositoryFallbackAllowed: false,
    trainingTruth: false,
  };
  const plan = freezeDeep({
    ...planBody,
    specialistLoadoutHash: hashStarcraftTmgContract(planBody),
  });
  return freezeDeep({
    schemaVersion: "starcraft_tmg_official_parameter_instantiation_v1",
    canonicalParameters: { assignments: clone(assignments) },
    action: canonicalAction(domain, plan),
    rulesTruth: "official_marine_specialist_assignment_instantiation",
    trainingTruth: false,
  });
}

export function applyOfficialSpecialistLoadoutV1(stateInput, actionInput, options = {}) {
  if (!object(actionInput)
    || actionInput.actionType !== OFFICIAL_SPECIALIST_LOADOUT_ACTION_TYPE
    || actionInput.executorId !== OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID
    || actionInput.executorVersion !== OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_VERSION
    || !object(actionInput.specialistLoadoutPlan)) {
    fail("SPECIALIST_ACTION_INVALID");
  }
  const enumeration = enumerateOfficialSpecialistLoadoutV1(stateInput, {
    sideKey: actionInput.sideKey,
    includeDisabled: true,
    matchBinding: options.matchBinding,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.domainId === actionInput.domainId && entry.pieceId === actionInput.pieceId
  ));
  if (!domain) fail("SPECIALIST_PARAMETER_DOMAIN_STALE");
  const instantiated = instantiateOfficialSpecialistLoadoutV1(stateInput, domain, {
    assignments: actionInput.specialistLoadoutPlan.assignments.map((assignment) => ({
      weaponName: assignment.weaponName,
      modelId: assignment.nominatedModelId,
    })),
  }, options);
  if (!isDeepStrictEqual(actionInput, instantiated.action)) {
    fail("SPECIALIST_ACTION_STALE");
  }
  const state = clone(stateInput);
  const piece = state.pieces.find((entry) => entry.id === actionInput.pieceId);
  const loadouts = new Map(actionInput.specialistLoadoutPlan.modelLoadouts.map((entry) => (
    [entry.modelId, entry.assaultWeapons]
  )));
  for (const model of piece.models) {
    const weapons = loadouts.get(model.id);
    if (!weapons) fail("SPECIALIST_MODEL_LOADOUT_MISSING", model.id);
    model.assaultWeaponProfileKeys = weapons.map((weapon) => weapon.profileKey);
    model.assaultWeaponNames = weapons.map((weapon) => weapon.weaponName);
  }
  piece.specialistLoadout = clone(actionInput.specialistLoadoutPlan);
  piece.specialistLoadoutHash = actionInput.specialistLoadoutPlan.specialistLoadoutHash;
  piece.rosterLoadoutSealed = true;
  const events = [{
    type: "specialist_loadout_configured",
    sideKey: actionInput.sideKey,
    pieceId: piece.id,
    specialistLoadoutHash: piece.specialistLoadoutHash,
    assignments: actionInput.specialistLoadoutPlan.assignments.map((assignment) => ({
      weaponName: assignment.weaponName,
      nominatedModelId: assignment.nominatedModelId,
      replacement: assignment.replacement,
    })),
    attackBatchExecutionAuthorized: false,
    trainingTruth: false,
  }];
  state.log = Array.isArray(state.log) ? state.log : [];
  state.log.push({
    id: `log-${state.log.length + 1}`,
    round: Number(state.round || 0),
    phase: "army_building",
    action: clone(actionInput),
    events: clone(events),
  });
  return freezeDeep({
    ok: true,
    schemaVersion: "starcraft_tmg_official_specialist_loadout_transition_v1",
    executorId: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID,
    executorVersion: OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_VERSION,
    postRevision: Number(options.postRevision || 0),
    state,
    events,
    action: clone(actionInput),
    rulesTruth: "official_marine_specialist_assignment_exact_subset",
    trainingTruth: false,
  });
}
