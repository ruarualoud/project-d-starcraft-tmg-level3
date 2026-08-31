import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { verifyOfficialPlayerControlRelationshipDataBundleV1 } from
  "../source-data/official-player-control-relationship-data-bundle-v1.mjs";

export const OFFICIAL_RULE_PRECEDENCE_REGISTRY_SCHEMA =
  "starcraft_tmg_official_rule_precedence_registry_v1";
export const OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_REGISTRY_SCHEMA =
  "starcraft_tmg_official_player_control_relationship_registry_v1";

const OBJECT_KINDS = new Set(["card", "model", "player", "token", "unit"]);
const SPECIFIC_SOURCE_KINDS = new Set(["mission_card", "special_ability", "unit_card"]);

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
function assertHash(value, code) {
  if (!/^[a-f0-9]{64}$/u.test(String(value || ""))) fail(code);
  return String(value);
}
function canonicalRef(ref) {
  if (!object(ref) || !OBJECT_KINDS.has(ref.kind)) {
    fail("PLAYER_CONTROL_OBJECT_REFERENCE_INVALID");
  }
  return freezeDeep({ kind: ref.kind, id: nonEmpty(ref.id,
    "PLAYER_CONTROL_OBJECT_REFERENCE_INVALID") });
}

export function createOfficialRulePrecedenceRegistryV1(input = {}) {
  if (input.rulesOwned !== true || input.claimsComplete !== true
    || !Array.isArray(input.claims) || input.claims.length === 0
    || input.claims.length > 128) {
    fail("PLAYER_CONTROL_PRECEDENCE_REGISTRY_INCOMPLETE");
  }
  const ids = new Set();
  const claims = input.claims.map((raw) => {
    const claimId = nonEmpty(raw?.claimId, "PLAYER_CONTROL_PRECEDENCE_CLAIM_INVALID");
    const sourceKind = nonEmpty(raw?.sourceKind,
      "PLAYER_CONTROL_PRECEDENCE_CLAIM_INVALID");
    if (ids.has(claimId)
      || !(sourceKind === "core_rule" || SPECIFIC_SOURCE_KINDS.has(sourceKind))) {
      fail("PLAYER_CONTROL_PRECEDENCE_CLAIM_INVALID", claimId);
    }
    ids.add(claimId);
    const specific = SPECIFIC_SOURCE_KINDS.has(sourceKind);
    if (specific !== (raw.explicitCoreOverride === true)) {
      fail("PLAYER_CONTROL_PRECEDENCE_CLAIM_INVALID", claimId);
    }
    if (raw.value === undefined) {
      fail("PLAYER_CONTROL_PRECEDENCE_CLAIM_INVALID", claimId);
    }
    return {
      claimId,
      sourceKind,
      sourceArtifactId: nonEmpty(raw.sourceArtifactId,
        "PLAYER_CONTROL_PRECEDENCE_CLAIM_INVALID"),
      sourceContentHash: assertHash(raw.sourceContentHash,
        "PLAYER_CONTROL_PRECEDENCE_CLAIM_INVALID"),
      sourceTextHash: assertHash(raw.sourceTextHash,
        "PLAYER_CONTROL_PRECEDENCE_CLAIM_INVALID"),
      effectKey: nonEmpty(raw.effectKey, "PLAYER_CONTROL_PRECEDENCE_CLAIM_INVALID"),
      contextKey: nonEmpty(raw.contextKey, "PLAYER_CONTROL_PRECEDENCE_CLAIM_INVALID"),
      value: clone(raw.value),
      explicitCoreOverride: specific,
    };
  }).sort((left, right) => left.claimId.localeCompare(right.claimId));
  const body = {
    schema: OFFICIAL_RULE_PRECEDENCE_REGISTRY_SCHEMA,
    rulesOwned: true,
    claimsComplete: true,
    claims,
    clientSuppliedClaimsAccepted: false,
    equalSpecificityConflictPolicy: "fail_closed",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, registryHash: hashStarcraftTmgContract(body) });
}

export function verifyOfficialRulePrecedenceRegistryV1(registry) {
  if (!object(registry)
    || registry.schema !== OFFICIAL_RULE_PRECEDENCE_REGISTRY_SCHEMA
    || registry.rulesOwned !== true || registry.claimsComplete !== true
    || registry.clientSuppliedClaimsAccepted !== false
    || registry.equalSpecificityConflictPolicy !== "fail_closed"
    || registry.trainingTruth !== false
    || registry.registryHash !== hashStarcraftTmgContract(without(registry,
      ["registryHash"]))) {
    fail("PLAYER_CONTROL_PRECEDENCE_REGISTRY_INVALID");
  }
  const rebuilt = createOfficialRulePrecedenceRegistryV1(registry);
  if (!isDeepStrictEqual(registry, rebuilt)) {
    fail("PLAYER_CONTROL_PRECEDENCE_REGISTRY_DRIFT");
  }
  return true;
}

export function evaluateOfficialRulePrecedenceV1(input = {}) {
  const registry = input.registry;
  verifyOfficialRulePrecedenceRegistryV1(registry);
  const effectKey = nonEmpty(input.effectKey,
    "PLAYER_CONTROL_PRECEDENCE_QUERY_INVALID");
  const contextKey = nonEmpty(input.contextKey,
    "PLAYER_CONTROL_PRECEDENCE_QUERY_INVALID");
  const applicable = registry.claims.filter((claim) => (
    claim.effectKey === effectKey && claim.contextKey === contextKey
  ));
  const general = applicable.filter((claim) => claim.sourceKind === "core_rule");
  const specific = applicable.filter((claim) => SPECIFIC_SOURCE_KINDS.has(
    claim.sourceKind,
  ));
  if (general.length !== 1) {
    fail("PLAYER_CONTROL_GENERAL_RULE_DENOMINATOR_INVALID", effectKey);
  }
  if (specific.length > 1
    && specific.some((claim) => !isDeepStrictEqual(claim.value, specific[0].value))) {
    fail("PLAYER_CONTROL_EQUAL_SPECIFICITY_CONFLICT_UNRESOLVED", effectKey);
  }
  const winner = specific[0] || general[0];
  const body = {
    schema: "starcraft_tmg_official_rule_precedence_resolution_v1",
    effectKey,
    contextKey,
    generalClaimId: general[0].claimId,
    specificClaimIds: specific.map((claim) => claim.claimId).sort(),
    winningClaimIds: (specific.length ? specific : general)
      .map((claim) => claim.claimId).sort(),
    winningSourceClass: specific.length ? "specific" : "general",
    winningValue: clone(winner.value),
    specificOverrideApplied: specific.length > 0,
    cardOrAbilityOverridesCoreOnlyOnContradiction: true,
    equalSpecificityConflictPolicy: "fail_closed",
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

function playerRows(state) {
  if (!object(state?.players)) fail("PLAYER_CONTROL_PLAYERS_INVALID");
  const rows = Object.entries(state.players).map(([key, player]) => {
    if (!object(player) || player.sideKey !== key) {
      fail("PLAYER_CONTROL_PLAYER_IDENTITY_INVALID", key);
    }
    return { sideKey: key,
      teamKey: nonEmpty(player.teamKey || key, "PLAYER_CONTROL_TEAM_INVALID") };
  }).sort((left, right) => left.sideKey.localeCompare(right.sideKey));
  if (rows.length < 2 || new Set(rows.map((row) => row.sideKey)).size !== rows.length) {
    fail("PLAYER_CONTROL_PLAYERS_INVALID");
  }
  return rows;
}
function sideRow(players, sideKey) {
  const row = players.find((entry) => entry.sideKey === sideKey);
  if (!row) fail("PLAYER_CONTROL_SIDE_UNKNOWN", String(sideKey || ""));
  return row;
}
function controlFields(value, players, fallbackSideKey) {
  const legalOwnerSideKey = String(value?.ownerSideKey || fallbackSideKey || "");
  const controllerSideKey = String(value?.controllerSideKey
    || value?.sideKey || legalOwnerSideKey || "");
  sideRow(players, legalOwnerSideKey);
  sideRow(players, controllerSideKey);
  return { legalOwnerSideKey, controllerSideKey,
    effectiveOwnerSideKey: controllerSideKey,
    controlTransferred: controllerSideKey !== legalOwnerSideKey,
    transferredControllerActsAsOwner: controllerSideKey !== legalOwnerSideKey };
}

export function createOfficialPlayerControlRelationshipRegistryV1(input = {}) {
  const state = input.state;
  verifyOfficialPlayerControlRelationshipDataBundleV1(input.dataBundle);
  const players = playerRows(state);
  sideRow(players, state.activeSideKey);
  if (!Array.isArray(state.pieces)) fail("PLAYER_CONTROL_UNITS_INVALID");
  const objectIds = new Set(players.map((row) => `player:${row.sideKey}`));
  const units = state.pieces.map((piece) => {
    const unitId = nonEmpty(piece?.id, "PLAYER_CONTROL_UNIT_INVALID");
    if (objectIds.has(`unit:${unitId}`) || !Array.isArray(piece.models)
      || piece.models.length < 1) {
      fail("PLAYER_CONTROL_UNIT_INVALID", unitId);
    }
    objectIds.add(`unit:${unitId}`);
    const control = controlFields(piece, players, piece.sideKey);
    const modelIds = piece.models.map((model) => {
      const modelId = nonEmpty(model?.id, "PLAYER_CONTROL_MODEL_INVALID");
      if (objectIds.has(`model:${modelId}`)) {
        fail("PLAYER_CONTROL_MODEL_INVALID", modelId);
      }
      objectIds.add(`model:${modelId}`);
      return modelId;
    }).sort();
    return { unitId, modelIds, ...control,
      armySideKey: control.legalOwnerSideKey,
      actsAsSingleFormation: true };
  }).sort((left, right) => left.unitId.localeCompare(right.unitId));
  const tokens = (state.board?.tokens || []).map((token) => {
    const tokenId = nonEmpty(token?.id, "PLAYER_CONTROL_TOKEN_INVALID");
    if (objectIds.has(`token:${tokenId}`)) fail("PLAYER_CONTROL_TOKEN_INVALID", tokenId);
    objectIds.add(`token:${tokenId}`);
    return { tokenId, ...controlFields(token, players, token.sideKey) };
  }).sort((left, right) => left.tokenId.localeCompare(right.tokenId));
  const cards = Object.entries(state.cardResources || {}).flatMap(([sideKey, entries]) => {
    sideRow(players, sideKey);
    if (!Array.isArray(entries)) fail("PLAYER_CONTROL_CARDS_INVALID", sideKey);
    return entries.map((card) => {
      const cardId = nonEmpty(card?.id, "PLAYER_CONTROL_CARD_INVALID");
      if (objectIds.has(`card:${cardId}`)) fail("PLAYER_CONTROL_CARD_INVALID", cardId);
      objectIds.add(`card:${cardId}`);
      return { cardId, ...controlFields(card, players, sideKey) };
    });
  }).sort((left, right) => left.cardId.localeCompare(right.cardId));
  const body = {
    schema: OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_REGISTRY_SCHEMA,
    activePlayerSideKey: state.activeSideKey,
    players,
    units,
    tokens,
    cards,
    armies: players.map((player) => ({ sideKey: player.sideKey,
      unitIds: units.filter((unit) => unit.armySideKey === player.sideKey)
        .map((unit) => unit.unitId).sort() })),
    teamRelationshipComplete: true,
    armyUnitModelMembershipComplete: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, registryHash: hashStarcraftTmgContract(body) });
}

function resolveObject(registry, refInput) {
  const ref = canonicalRef(refInput);
  if (ref.kind === "player") {
    const player = sideRow(registry.players, ref.id);
    return { ref, legalOwnerSideKey: player.sideKey,
      controllerSideKey: player.sideKey, effectiveOwnerSideKey: player.sideKey,
      controlTransferred: false, transferredControllerActsAsOwner: false };
  }
  if (ref.kind === "unit") {
    const unit = registry.units.find((entry) => entry.unitId === ref.id);
    if (!unit) fail("PLAYER_CONTROL_OBJECT_NOT_FOUND", `${ref.kind}:${ref.id}`);
    return { ref, ...unit };
  }
  if (ref.kind === "model") {
    const unit = registry.units.find((entry) => entry.modelIds.includes(ref.id));
    if (!unit) fail("PLAYER_CONTROL_OBJECT_NOT_FOUND", `${ref.kind}:${ref.id}`);
    return { ref, unitId: unit.unitId, ...unit };
  }
  const field = ref.kind === "token" ? "tokens" : "cards";
  const idField = ref.kind === "token" ? "tokenId" : "cardId";
  const row = registry[field].find((entry) => entry[idField] === ref.id);
  if (!row) fail("PLAYER_CONTROL_OBJECT_NOT_FOUND", `${ref.kind}:${ref.id}`);
  return { ref, ...row };
}

export function evaluateOfficialPlayerRoleAndControlV1(input = {}) {
  const registry = createOfficialPlayerControlRelationshipRegistryV1(input);
  const sideKey = nonEmpty(input.sideKey, "PLAYER_CONTROL_ROLE_QUERY_INVALID");
  const side = sideRow(registry.players, sideKey);
  const subject = input.subjectRef ? resolveObject(registry, input.subjectRef) : null;
  const controlsSubject = subject ? subject.controllerSideKey === sideKey : false;
  const body = {
    schema: "starcraft_tmg_official_player_role_control_resolution_v1",
    sideKey,
    teamKey: side.teamKey,
    activePlayerSideKey: registry.activePlayerSideKey,
    isActivePlayer: registry.activePlayerSideKey === sideKey,
    roles: [
      ...(registry.activePlayerSideKey === sideKey ? ["active_player"] : []),
      ...(controlsSubject ? ["controlling_player"] : []),
    ],
    subject: subject ? { ref: subject.ref,
      legalOwnerSideKey: subject.legalOwnerSideKey,
      controllerSideKey: subject.controllerSideKey,
      effectiveOwnerSideKey: subject.effectiveOwnerSideKey,
      controlTransferred: subject.controlTransferred,
      transferredControllerActsAsOwner: subject.transferredControllerActsAsOwner } : null,
    controllerMakesAllDecisions: controlsSubject,
    controllerRollsAllDice: controlsSubject,
    roleTaxonomyAllowsMultipleSimultaneousRoles: true,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function evaluateOfficialFriendlyEnemyRelationshipV1(input = {}) {
  const registry = createOfficialPlayerControlRelationshipRegistryV1(input);
  const perspectiveControllerSideKey = nonEmpty(input.perspectiveControllerSideKey,
    "PLAYER_CONTROL_RELATIONSHIP_QUERY_INVALID");
  const perspective = sideRow(registry.players, perspectiveControllerSideKey);
  const subject = input.subjectRef ? resolveObject(registry, input.subjectRef) : null;
  if (subject && subject.controllerSideKey !== perspectiveControllerSideKey) {
    fail("PLAYER_CONTROL_PERSPECTIVE_NOT_CONTROLLER");
  }
  const target = resolveObject(registry, input.targetRef);
  const targetOwner = sideRow(registry.players, target.effectiveOwnerSideKey);
  const modelFriendlyToOwnUnit = subject?.ref.kind === "unit"
    && target.ref.kind === "model" && target.unitId === subject.ref.id;
  const sameTeam = perspective.teamKey === targetOwner.teamKey;
  const isFriendly = modelFriendlyToOwnUnit || sameTeam;
  const isEnemy = !isFriendly;
  const body = {
    schema: "starcraft_tmg_official_friendly_enemy_relationship_resolution_v1",
    perspectiveControllerSideKey,
    perspectiveTeamKey: perspective.teamKey,
    subjectRef: subject?.ref || null,
    targetRef: target.ref,
    targetLegalOwnerSideKey: target.legalOwnerSideKey,
    targetControllerSideKey: target.controllerSideKey,
    targetEffectiveOwnerSideKey: target.effectiveOwnerSideKey,
    targetEffectiveOwnerTeamKey: targetOwner.teamKey,
    targetControlTransferred: target.controlTransferred,
    isTeammateOwned: sameTeam
      && target.effectiveOwnerSideKey !== perspectiveControllerSideKey,
    modelFriendlyToOwnUnit,
    isFriendly,
    isEnemy,
    relationship: isFriendly ? "friendly" : "enemy",
    enemyIsFriendlyInverse: true,
    ruleUses: isFriendly
      ? ["ability_eligibility", "attack_restriction", "movement_interaction"]
      : ["attack_targeting", "engagement", "mission_marker_contest"],
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function evaluateOfficialAttackTargetRelationshipV1(input = {}) {
  const relationship = evaluateOfficialFriendlyEnemyRelationshipV1(input);
  let precedence = null;
  let friendlyAttackExplicitlyAllowed = false;
  if (relationship.isFriendly && input.precedenceRegistry) {
    precedence = evaluateOfficialRulePrecedenceV1({
      registry: input.precedenceRegistry,
      effectKey: input.effectKey || "attack_may_target_friendly",
      contextKey: input.contextKey,
    });
    friendlyAttackExplicitlyAllowed = precedence.specificOverrideApplied === true
      && precedence.winningValue === true;
  }
  const body = {
    schema: "starcraft_tmg_official_attack_target_relationship_resolution_v1",
    relationship,
    mayTargetWithAttack: relationship.isEnemy || friendlyAttackExplicitlyAllowed,
    friendlyAttackProhibitedByGeneralRule: relationship.isFriendly
      && !friendlyAttackExplicitlyAllowed,
    friendlyAttackExplicitlyAllowed,
    precedence,
    trainingTruth: false,
  };
  return freezeDeep({ ...body, resultHash: hashStarcraftTmgContract(body) });
}

export function certifyOfficialPlayerControlRelationshipPlanV1(input = {}) {
  const plan = input.plan;
  if (!object(plan)) fail("PLAYER_CONTROL_PLAN_INVALID");
  const planId = nonEmpty(plan.planId, "PLAYER_CONTROL_PLAN_INVALID");
  let result;
  if (input.procedureKind === "role_authority_query") {
    result = evaluateOfficialPlayerRoleAndControlV1({ state: input.state,
      dataBundle: input.dataBundle, sideKey: plan.sideKey,
      subjectRef: plan.subjectRef });
  } else if (input.procedureKind === "relationship_query") {
    result = evaluateOfficialFriendlyEnemyRelationshipV1({ state: input.state,
      dataBundle: input.dataBundle,
      perspectiveControllerSideKey: plan.perspectiveControllerSideKey,
      subjectRef: plan.subjectRef, targetRef: plan.targetRef });
  } else if (input.procedureKind === "attack_target_relationship_check") {
    result = evaluateOfficialAttackTargetRelationshipV1({ state: input.state,
      dataBundle: input.dataBundle,
      perspectiveControllerSideKey: plan.perspectiveControllerSideKey,
      subjectRef: plan.subjectRef, targetRef: plan.targetRef,
      precedenceRegistry: input.state.officialRulePrecedenceRegistry,
      effectKey: plan.effectKey, contextKey: plan.contextKey });
  } else if (input.procedureKind === "rule_precedence_query") {
    result = evaluateOfficialRulePrecedenceV1({
      registry: input.state.officialRulePrecedenceRegistry,
      effectKey: plan.effectKey, contextKey: plan.contextKey });
  } else {
    fail("PLAYER_CONTROL_PROCEDURE_KIND_INVALID");
  }
  const body = { schema: "starcraft_tmg_official_player_control_relationship_plan_v1",
    planId, procedureKind: input.procedureKind, result,
    clientSuppliedRelationshipTruthAccepted: false,
    trainingTruth: false };
  return freezeDeep({ ...body, planHash: hashStarcraftTmgContract(body) });
}
