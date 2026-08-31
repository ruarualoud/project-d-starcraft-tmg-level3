#!/usr/bin/env node

import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_NEW_ATOM_IDS,
  OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PARAMETER_KIND,
  openOfficialPlayerControlRelationshipRulesPendingV1,
} from "../packages/rule-atoms/official-player-control-relationship-rules-executor-v1.mjs";
import {
  createOfficialPlayerControlRelationshipRegistryV1,
  createOfficialRulePrecedenceRegistryV1,
  evaluateOfficialAttackTargetRelationshipV1,
  evaluateOfficialFriendlyEnemyRelationshipV1,
  evaluateOfficialPlayerRoleAndControlV1,
  evaluateOfficialRulePrecedenceV1,
} from "../packages/rule-atoms/official-player-control-relationship-rules-kernel-v1.mjs";
import { OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-player-control-relationship-rules-relationship-contract-v1.mjs";
import {
  createOfficialPlayerControlRelationshipRulesRuleSliceV1,
  verifyOfficialPlayerControlRelationshipRulesRuleSliceV1,
} from "../packages/rule-atoms/official-player-control-relationship-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialPlayerControlRelationshipDataBundleV1,
  verifyOfficialPlayerControlRelationshipDataBundleV1,
} from "../packages/source-data/official-player-control-relationship-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-model-base-geometry-rules-rule-slice-v1-report.json",
), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-elevation-effective-size-rules-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];

function prepare(fixture, bundle, input = {}) {
  const state = fixture.battleState({ activeSideKey: input.activeSideKey || "player1",
    pieces: input.pieces || [{ id: "p1-unit", sideKey: "player1",
      positions: [{ xInches: 5, yInches: 5 }, { xInches: 7, yInches: 5 }] },
    { id: "p2-unit", sideKey: "player2",
      positions: [{ xInches: 15, yInches: 5 }] }] });
  state.phase = input.phase || "assault";
  state.rulesProcedureMode = true;
  state.officialPlayerControlRelationshipDataBundle = bundle;
  return state;
}
function ref(kind, id) { return { kind, id }; }
function procedure(state, kind, plan) {
  return { procedureKind: kind, sideKey: state.activeSideKey,
    candidatePlansComplete: true, rulesDenominatorComplete: true,
    candidatePlans: [plan] };
}
function claim(input) {
  return { claimId: input.claimId,
    sourceKind: input.sourceKind,
    sourceArtifactId: input.sourceArtifactId || `artifact:${input.claimId}`,
    sourceContentHash: hashStarcraftTmgContract({ content: input.claimId }),
    sourceTextHash: hashStarcraftTmgContract({ text: input.claimId }),
    effectKey: input.effectKey || "attack_may_target_friendly",
    contextKey: input.contextKey || "friendly-fire-example",
    value: input.value,
    explicitCoreOverride: input.sourceKind !== "core_rule" };
}
function registry(claims) {
  return createOfficialRulePrecedenceRegistryV1({
    rulesOwned: true, claimsComplete: true, claims,
  });
}
function bindingFor(gameplayDataBundle) {
  const dataHash = hashStarcraftTmgContract(gameplayDataBundle);
  return { bindingHash: "slice-88-player-control-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true, matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PARAMETER_KIND
  ));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T03:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-88-player-control",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 88 player/control rules.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-88-player-control-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-player-control-no-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "player_control_relationship_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-88-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-88-action-schema-v26",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v26" } },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-88-player-control-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-88-player-control-session", leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision }) };
}
function registerReplay(engine, initial, fixture, runtime) {
  const entries = {
    sourceSnapshot: fixture.snapshot,
    dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: { kind: "geometry-artifact",
      geometryVersion: "player_control_relationship_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v26" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialPlayerControlRelationshipRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialPlayerControlRelationshipRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 627,
  newlyExecutableRuleAtoms: 15, reviewRequiredRuleAtoms: 285,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 627,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 57, missingStateContractExecutors: 0 });
acceptance.push("slice88_promotes_exact_15_route_atoms_to_627_executable");

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 88);
assert.deepEqual(assignment.atomIds,
  [...OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_NEW_ATOM_IDS]);
assert.equal(assignment.executableAfter, 627);
assert.equal(assignment.reviewRequiredAfter, 285);
acceptance.push("route_v2_exact_slice88_atom_identity_and_counts_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialPlayerControlRelationshipDataBundleV1({
  dataset: fixture.dataset,
});
assert.deepEqual(fixture.snapshot.dataVersions, {
  unitsVersion: "71", cardsVersion: "69", rulesVersion: "48",
});
acceptance.push("sealed_source_lock_binds_versions_71_69_48_without_refresh");

assert.equal(verifyOfficialPlayerControlRelationshipDataBundleV1(bundle), true);
assert.equal(bundle.coreRulebookHash,
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54");
acceptance.push("player_control_source_bundle_binds_the_locked_core_pdf");

assert.deepEqual(bundle.ruleSectionRecords.map((entry) => entry.title), [
  "PART 2: CORE CONCEPTS", "PART 11: KEYWORD GLOSSARY AND DEFINITIONS",
]);
assert.deepEqual(bundle.sourceLocators.map((entry) => entry.section), [
  "2.2", "2.5", "2.6.2", "11/ACTIVE PLAYER", "11/CONTROLLING PLAYER",
  "11/ENEMY", "11/FRIENDLY",
]);
acceptance.push("part2_and_glossary_rule_records_and_locators_are_exact");

const state = prepare(fixture, bundle);
const relationshipRegistry = createOfficialPlayerControlRelationshipRegistryV1({
  state, dataBundle: bundle,
});
assert.deepEqual(relationshipRegistry.armies, [
  { sideKey: "player1", unitIds: ["p1-unit"] },
  { sideKey: "player2", unitIds: ["p2-unit"] },
]);
assert.equal(relationshipRegistry.units[0].actsAsSingleFormation, true);
assert.equal(relationshipRegistry.units[0].modelIds.length, 2);
acceptance.push("army_unit_and_unit_model_membership_are_complete");

const activeRole = evaluateOfficialPlayerRoleAndControlV1({ state,
  dataBundle: bundle, sideKey: "player1", subjectRef: ref("unit", "p1-unit") });
assert.equal(activeRole.isActivePlayer, true);
assert.deepEqual(activeRole.roles, ["active_player", "controlling_player"]);
acceptance.push("active_player_is_the_player_whose_turn_it_is_to_act");

const inactiveRole = evaluateOfficialPlayerRoleAndControlV1({ state,
  dataBundle: bundle, sideKey: "player2", subjectRef: ref("unit", "p2-unit") });
assert.equal(inactiveRole.isActivePlayer, false);
assert.deepEqual(inactiveRole.roles, ["controlling_player"]);
acceptance.push("player_roles_are_contextual_and_may_overlap");

assert.equal(activeRole.controllerMakesAllDecisions, true);
assert.equal(activeRole.controllerRollsAllDice, true);
acceptance.push("controlling_player_owns_all_decisions_and_dice_rolls");

const transferred = structuredClone(state);
transferred.pieces[0].ownerSideKey = "player1";
transferred.pieces[0].sideKey = "player2";
transferred.pieces[0].controllerSideKey = "player2";
const transferredRole = evaluateOfficialPlayerRoleAndControlV1({ state: transferred,
  dataBundle: bundle, sideKey: "player2", subjectRef: ref("unit", "p1-unit") });
assert.deepEqual(transferredRole.subject, {
  ref: ref("unit", "p1-unit"), legalOwnerSideKey: "player1",
  controllerSideKey: "player2", effectiveOwnerSideKey: "player2",
  controlTransferred: true, transferredControllerActsAsOwner: true,
});
acceptance.push("transferred_controller_acts_as_owner_without_erasing_legal_owner");

const formerOwnerRole = evaluateOfficialPlayerRoleAndControlV1({ state: transferred,
  dataBundle: bundle, sideKey: "player1", subjectRef: ref("unit", "p1-unit") });
assert.equal(formerOwnerRole.controllerMakesAllDecisions, false);
assert.equal(formerOwnerRole.controllerRollsAllDice, false);
acceptance.push("former_owner_does_not_retain_controller_decision_or_dice_authority");

const teamState = structuredClone(state);
teamState.players.player1.teamKey = "red-team";
teamState.players.player2.teamKey = "blue-team";
teamState.players.player3 = { sideKey: "player3", teamKey: "red-team",
  faction: "Protoss", passedPhases: {} };
teamState.players.player4 = { sideKey: "player4", teamKey: "blue-team",
  faction: "Zerg", passedPhases: {} };
teamState.cardResources.player3 = [{ id: "p3-card", sideKey: "player3" }];
teamState.cardResources.player4 = [];
const p3Unit = structuredClone(teamState.pieces[1]);
p3Unit.id = "p3-unit"; p3Unit.sideKey = "player3";
p3Unit.models[0].id = "p3-model";
const p4Unit = structuredClone(teamState.pieces[1]);
p4Unit.id = "p4-unit"; p4Unit.sideKey = "player4";
p4Unit.models[0].id = "p4-model";
teamState.pieces.push(p3Unit, p4Unit);
teamState.board.tokens.push({ id: "p3-token", sideKey: "player3" });

const teammate = evaluateOfficialFriendlyEnemyRelationshipV1({ state: teamState,
  dataBundle: bundle, perspectiveControllerSideKey: "player1",
  subjectRef: ref("unit", "p1-unit"), targetRef: ref("unit", "p3-unit") });
assert.equal(teammate.isFriendly, true);
assert.equal(teammate.isTeammateOwned, true);
acceptance.push("teammate_owned_units_are_friendly_in_team_games");

const opponent = evaluateOfficialFriendlyEnemyRelationshipV1({ state: teamState,
  dataBundle: bundle, perspectiveControllerSideKey: "player1",
  subjectRef: ref("unit", "p1-unit"), targetRef: ref("unit", "p4-unit") });
assert.equal(opponent.isEnemy, true);
assert.equal(opponent.enemyIsFriendlyInverse, true);
acceptance.push("opposing_team_units_are_enemies_and_enemy_is_friendly_inverse");

const ownModel = evaluateOfficialFriendlyEnemyRelationshipV1({ state: teamState,
  dataBundle: bundle, perspectiveControllerSideKey: "player1",
  subjectRef: ref("unit", "p1-unit"),
  targetRef: ref("model", teamState.pieces[0].models[0].id) });
assert.equal(ownModel.modelFriendlyToOwnUnit, true);
assert.equal(ownModel.isFriendly, true);
acceptance.push("a_units_own_models_are_always_friendly_to_that_unit");

const teamToken = evaluateOfficialFriendlyEnemyRelationshipV1({ state: teamState,
  dataBundle: bundle, perspectiveControllerSideKey: "player1",
  subjectRef: ref("unit", "p1-unit"), targetRef: ref("token", "p3-token") });
assert.equal(teamToken.isFriendly, true);
acceptance.push("teammate_owned_tokens_are_friendly");

const teamCard = evaluateOfficialFriendlyEnemyRelationshipV1({ state: teamState,
  dataBundle: bundle, perspectiveControllerSideKey: "player1",
  subjectRef: ref("unit", "p1-unit"), targetRef: ref("card", "p3-card") });
assert.equal(teamCard.isFriendly, true);
acceptance.push("teammate_owned_cards_are_friendly");

assert.deepEqual(teammate.ruleUses,
  ["ability_eligibility", "attack_restriction", "movement_interaction"]);
acceptance.push("friendly_relationship_exposes_targeting_movement_and_ability_uses");

assert.deepEqual(opponent.ruleUses,
  ["attack_targeting", "engagement", "mission_marker_contest"]);
acceptance.push("enemy_relationship_exposes_targeting_engagement_and_mission_uses");

const friendlyAttack = evaluateOfficialAttackTargetRelationshipV1({ state: teamState,
  dataBundle: bundle, perspectiveControllerSideKey: "player1",
  subjectRef: ref("unit", "p1-unit"), targetRef: ref("unit", "p3-unit") });
assert.equal(friendlyAttack.mayTargetWithAttack, false);
assert.equal(friendlyAttack.friendlyAttackProhibitedByGeneralRule, true);
acceptance.push("friendly_units_cannot_be_attack_targets_by_general_rule");

const enemyAttack = evaluateOfficialAttackTargetRelationshipV1({ state: teamState,
  dataBundle: bundle, perspectiveControllerSideKey: "player1",
  subjectRef: ref("unit", "p1-unit"), targetRef: ref("unit", "p4-unit") });
assert.equal(enemyAttack.mayTargetWithAttack, true);
acceptance.push("enemy_units_are_ordinary_legal_attack_relationship_targets");

const generalClaim = claim({ claimId: "core-friendly-fire-prohibition",
  sourceKind: "core_rule", value: false });
const generalRegistry = registry([generalClaim]);
const generalResolution = evaluateOfficialRulePrecedenceV1({
  registry: generalRegistry, effectKey: "attack_may_target_friendly",
  contextKey: "friendly-fire-example",
});
assert.equal(generalResolution.winningSourceClass, "general");
assert.equal(generalResolution.winningValue, false);
acceptance.push("general_core_rule_wins_when_no_specific_rule_contradicts_it");

const unitOverride = claim({ claimId: "unit-card-friendly-fire-override",
  sourceKind: "unit_card", value: true });
const overrideRegistry = registry([generalClaim, unitOverride]);
const overrideResolution = evaluateOfficialRulePrecedenceV1({
  registry: overrideRegistry, effectKey: "attack_may_target_friendly",
  contextKey: "friendly-fire-example",
});
assert.equal(overrideResolution.winningSourceClass, "specific");
assert.equal(overrideResolution.specificOverrideApplied, true);
acceptance.push("specific_unit_card_rule_overrides_contradictory_core_rule");

const overriddenAttack = evaluateOfficialAttackTargetRelationshipV1({ state: teamState,
  dataBundle: bundle, perspectiveControllerSideKey: "player1",
  subjectRef: ref("unit", "p1-unit"), targetRef: ref("unit", "p3-unit"),
  precedenceRegistry: overrideRegistry,
  contextKey: "friendly-fire-example" });
assert.equal(overriddenAttack.mayTargetWithAttack, true);
assert.equal(overriddenAttack.friendlyAttackExplicitlyAllowed, true);
acceptance.push("explicit_specific_override_can_authorize_friendly_attack_targeting");

const sameSpecific = registry([generalClaim, unitOverride,
  claim({ claimId: "mission-card-friendly-fire-override",
    sourceKind: "mission_card", value: true })]);
assert.equal(evaluateOfficialRulePrecedenceV1({ registry: sameSpecific,
  effectKey: "attack_may_target_friendly",
  contextKey: "friendly-fire-example" }).winningValue, true);
acceptance.push("equal_specificity_claims_with_identical_results_are_stable");

const conflictingSpecific = registry([generalClaim, unitOverride,
  claim({ claimId: "ability-friendly-fire-denial",
    sourceKind: "special_ability", value: false })]);
assert.throws(() => evaluateOfficialRulePrecedenceV1({ registry: conflictingSpecific,
  effectKey: "attack_may_target_friendly", contextKey: "friendly-fire-example" }),
/PLAYER_CONTROL_EQUAL_SPECIFICITY_CONFLICT_UNRESOLVED/u);
acceptance.push("contradictory_equal_specificity_rules_fail_closed");

const forgedRegistry = structuredClone(overrideRegistry);
forgedRegistry.claims[1].value = false;
assert.throws(() => evaluateOfficialRulePrecedenceV1({ registry: forgedRegistry,
  effectKey: "attack_may_target_friendly", contextKey: "friendly-fire-example" }),
/PLAYER_CONTROL_PRECEDENCE_REGISTRY_INVALID/u);
acceptance.push("forged_precedence_registry_hash_is_rejected");

const unknownOwner = structuredClone(state);
unknownOwner.pieces[0].ownerSideKey = "unknown-player";
assert.throws(() => createOfficialPlayerControlRelationshipRegistryV1({
  state: unknownOwner, dataBundle: bundle,
}), /PLAYER_CONTROL_SIDE_UNKNOWN/u);
acceptance.push("unknown_legal_owner_or_controller_fails_closed");

state.officialRulePrecedenceRegistry = overrideRegistry;
const binding = bindingFor(fixture.gameplayDataBundle);
const plan = { planId: "relationship-plan",
  perspectiveControllerSideKey: "player1",
  subjectRef: ref("unit", "p1-unit"), targetRef: ref("unit", "p2-unit") };
const opened = openOfficialPlayerControlRelationshipRulesPendingV1(state,
  procedure(state, "relationship_query", plan));
const domain = domainFor(runtime, opened.state, binding);
assert(domain);
assert.equal(domain.constraints.choices.length, 1);
assert.equal(domain.constraints.clientSuppliedRelationshipTruthAccepted, false);
acceptance.push("runtime_domain_binds_complete_rules_certified_relationship_choices");

const action = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
const applied = runtime.apply(opened.state, action.action, { matchBinding: binding });
assert.equal(applied.state.pendingAction, null);
assert.equal(applied.state.lastPlayerControlRelationshipRulesResolution
  .result.relationship, "enemy");
assert.equal(applied.events[0].type, "player_control_relationship_rules_resolved");
acceptance.push("runtime_apply_persists_relationship_result_and_audit_event");

const staleController = structuredClone(opened.state);
staleController.pieces[0].controllerSideKey = "player2";
assert.equal(runtime.enumerate(staleController, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding }).candidates[0].disabledReason,
"PLAYER_CONTROL_RELATIONSHIP_PENDING_INVALID");
acceptance.push("controller_drift_invalidates_old_relationship_domain");

const sourceDrift = structuredClone(opened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding }).candidates[0].disabledReason,
"PLAYER_CONTROL_RELATIONSHIP_SOURCE_LOCK_BINDING_INVALID");
acceptance.push("source_lock_drift_disables_player_control_legalspace");

const dataDrift = structuredClone(binding);
dataDrift.dependencies.dataSnapshot.contentHash = "0".repeat(64);
assert.equal(runtime.enumerate(opened.state, { sideKey: "player1",
  includeDisabled: true, matchBinding: dataDrift }).candidates[0].disabledReason,
"PLAYER_CONTROL_RELATIONSHIP_DATA_ARTIFACT_BINDING_INVALID");
acceptance.push("match_bound_data_artifact_drift_disables_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:playerControlRelationshipV1.friendlyRelationship"
    && entry.to === "derived_value:playerControlRelationshipV1.enemyRelationship"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_friendly_to_enemy_inverse_edge");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-88-player-control-short-seal-v1");
const authoritySeed = envelopeFor(authority, fixture, state);
const authorityOpened = openOfficialPlayerControlRelationshipRulesPendingV1(
  authoritySeed.state, procedure(authoritySeed.state, "relationship_query", plan),
);
const initial = authority.createEnvelope({ roomId: authoritySeed.roomId,
  matchBinding: authoritySeed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial,
  { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_PLAYER_CONTROL_RELATIONSHIP_RULES_PARAMETER_KIND
));
const preview = authority.preview({ envelope: initial,
  seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-88-player-control" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(runtime, keys, "slice-88-player-control-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_player_control_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
acceptance.push("authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.playerControlRelationshipRulesProgress.sourceRefreshPerformed, false);
acceptance.push("no_source_refresh_skill_dsh_muzero_selfplay_or_training_promotion_occurs");
assert.equal(acceptance.length, 35);

const report = {
  schema:
    "starcraft_tmg_official_player_control_relationship_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  playerControlRelationshipDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash,
  slice,
  sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph,
  graphAudit: audit.graphAudit,
  coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesEligible: false,
  productionRoomEligible: false,
  rulesTruth: "official_player_control_relationship_and_precedence_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-player-control-relationship-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts,
  routeV2Hash: route.routeHash,
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false,
  repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
