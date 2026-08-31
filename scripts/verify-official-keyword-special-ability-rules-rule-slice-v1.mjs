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
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_NEW_ATOM_IDS,
  OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PARAMETER_KIND,
  openOfficialKeywordSpecialAbilityRulesPendingV1,
} from "../packages/rule-atoms/official-keyword-special-ability-rules-executor-v1.mjs";
import {
  classifyOfficialSpecialAbilityV1,
  evaluateOfficialRepeatablePermissionV1,
  resolveOfficialAbilityTargetingPrimitiveV1,
  resolveOfficialKeywordUsesV1,
  resolveOfficialSameNamedSpecialAbilityEffectsV1,
} from "../packages/rule-atoms/official-keyword-special-ability-rules-kernel-v1.mjs";
import { OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-keyword-special-ability-rules-relationship-contract-v1.mjs";
import {
  createOfficialKeywordSpecialAbilityRulesRuleSliceV1,
  verifyOfficialKeywordSpecialAbilityRulesRuleSliceV1,
} from "../packages/rule-atoms/official-keyword-special-ability-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialKeywordSpecialAbilityDataBundleV1,
  verifyOfficialKeywordSpecialAbilityDataBundleV1,
} from "../packages/source-data/official-keyword-special-ability-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-dice-test-modifier-rules-rule-slice-v1-report.json",
), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-elevation-effective-size-rules-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];

function prepare(fixture, bundle) {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "movement";
  state.rulesProcedureMode = true;
  state.officialKeywordSpecialAbilityDataBundle = bundle;
  state.keywordSpecialAbilityRulesHistory = [];
  return state;
}
function procedure(state, kind, plan) {
  return { procedureKind: kind, sideKey: state.activeSideKey,
    candidatePlansComplete: true, rulesDenominatorComplete: true,
    candidatePlans: [plan] };
}
function plan(planId, procedureKind, input) {
  return { planId, procedureKind, input,
    rulesOwnedInputsComplete: true, clientSuppliedResult: false };
}
function bindingFor(gameplayDataBundle) {
  const dataHash = hashStarcraftTmgContract(gameplayDataBundle);
  return { bindingHash: "slice-90-keyword-special-ability-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true, matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PARAMETER_KIND
  ));
}
function ability(bundle, name, predicate = () => true) {
  const found = bundle.specialAbilities.find((entry) => (
    entry.canonicalName === name.toLocaleUpperCase("en-US") && predicate(entry)
  ));
  assert(found, `missing official ability ${name}`);
  return found;
}
function keywordUse(id, title, displayText, extra = {}) {
  return { sourceUseId: id, keywordTitle: title, displayText, bold: true, ...extra };
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T04:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-90-keyword-special-ability",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 90 keyword/special ability rules.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-90-keyword-special-ability-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-keyword-special-ability-no-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "keyword_special_ability_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-90-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-90-action-schema-v28",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v28" } },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({
    grantId: "slice-90-keyword-special-ability-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-90-keyword-special-ability-session", leaseFence: 1,
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
      geometryVersion: "keyword_special_ability_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v28" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialKeywordSpecialAbilityRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialKeywordSpecialAbilityRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 658,
  newlyExecutableRuleAtoms: 13, reviewRequiredRuleAtoms: 254,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 658,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 59, missingStateContractExecutors: 0 });
acceptance.push("slice90_promotes_exact_13_route_atoms_to_658_executable");

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 90);
assert.deepEqual(assignment.atomIds,
  [...OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_NEW_ATOM_IDS]);
assert.equal(assignment.executableAfter, 658);
assert.equal(assignment.reviewRequiredAfter, 254);
acceptance.push("route_v2_exact_slice90_atom_identity_and_counts_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialKeywordSpecialAbilityDataBundleV1({ dataset: fixture.dataset });
assert.deepEqual(fixture.snapshot.dataVersions, {
  unitsVersion: "71", cardsVersion: "69", rulesVersion: "48",
});
acceptance.push("sealed_source_lock_binds_versions_71_69_48_without_refresh");

assert.equal(verifyOfficialKeywordSpecialAbilityDataBundleV1(bundle), true);
assert.equal(bundle.coreRulebookHash,
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54");
acceptance.push("source_bundle_binds_locked_core_pdf_and_exact_part2_part10_part11_records");

assert.equal(bundle.keywordDefinitions.length, 76);
assert.equal(bundle.specialAbilities.length, 201);
assert.equal(bundle.specialAbilityAudit.ignoredNonAbilityUnitUpgradeCount, 51);
acceptance.push("official_indexes_compile_76_keywords_and_201_special_abilities");

assert.deepEqual({ unit: bundle.specialAbilityAudit.unitAbilityCount,
  tactical: bundle.specialAbilityAudit.tacticalCardAbilityCount,
  faction: bundle.specialAbilityAudit.factionCardAbilityCount },
{ unit: 132, tactical: 55, faction: 14 });
acceptance.push("ability_index_covers_unit_tactical_and_faction_card_sources");

assert.deepEqual({ active: bundle.specialAbilityAudit.activeCount,
  passive: bundle.specialAbilityAudit.passiveCount,
  reaction: bundle.specialAbilityAudit.reactionCount },
{ active: 87, passive: 90, reaction: 24 });
acceptance.push("ability_index_has_exact_active_passive_reaction_denominator");

assert.deepEqual({ unique: bundle.specialAbilityAudit.uniqueNameCount,
  duplicate: bundle.specialAbilityAudit.duplicateNameCount,
  categoryConflict: bundle.specialAbilityAudit.categoryConflictNameCount,
  definitionConflict: bundle.specialAbilityAudit.differentDefinitionNameCount },
{ unique: 139, duplicate: 30, categoryConflict: 2, definitionConflict: 9 });
acceptance.push("same_name_audit_records_all_duplicate_and_conflicting_definitions");

assert.deepEqual(bundle.sourceLocators.map((entry) => entry.section), [
  "2.6.1", "2.7", "10.1", "10.2", "11/INTRO", "11/REPEATABLE",
  "11/SPECIAL ABILITY",
]);
acceptance.push("core_keyword_ability_targeting_and_repeatable_locators_are_exact");

const precision = resolveOfficialKeywordUsesV1({ dataBundle: bundle,
  registryComplete: true, keywordUses: [
    keywordUse("precision-1", "PRECISION (X)", "PRECISION (1)", { numericValue: 1 }),
    keywordUse("precision-3", "PRECISION (X)", "PRECISION (3)", { numericValue: 3 }),
    keywordUse("precision-2", "PRECISION (X)", "PRECISION (2)", { numericValue: 2 }),
  ] });
assert.equal(precision.effectiveKeywordUses[0].numericValue, 3);
assert.equal(precision.suppressedKeywordUses.length, 2);
acceptance.push("same_numeric_keyword_uses_only_highest_value_not_sum");

const specialist = resolveOfficialKeywordUsesV1({ dataBundle: bundle,
  registryComplete: true, keywordUses: [
    keywordUse("specialist-a", "SPECIALIST", "SPECIALIST"),
    keywordUse("specialist-b", "SPECIALIST", "SPECIALIST"),
  ] });
assert.equal(specialist.effectiveKeywordUses.length, 1);
assert.equal(specialist.suppressedKeywordUses[0].suppressionReason,
  "same_keyword_does_not_stack");
acceptance.push("same_non_numeric_keyword_does_not_stack");

const different = resolveOfficialKeywordUsesV1({ dataBundle: bundle,
  registryComplete: true, keywordUses: [
    keywordUse("specialist", "SPECIALIST", "SPECIALIST"),
    keywordUse("sidearm", "SIDEARM", "SIDEARM"),
  ] });
assert.equal(different.effectiveKeywordUses.length, 2);
acceptance.push("different_keywords_remain_independently_effective");

assert.throws(() => resolveOfficialKeywordUsesV1({ dataBundle: bundle,
  registryComplete: true, keywordUses: [{
    ...keywordUse("not-bold", "SPECIALIST", "SPECIALIST"), bold: false,
  }] }), /KEYWORD_USE_INVALID/u);
acceptance.push("keyword_must_be_bold");

assert.throws(() => resolveOfficialKeywordUsesV1({ dataBundle: bundle,
  registryComplete: true,
  keywordUses: [keywordUse("lower", "SPECIALIST", "Specialist")] }),
/KEYWORD_BOLD_CAPS_FORMAT_INVALID/u);
acceptance.push("keyword_display_must_use_canonical_caps");

assert.throws(() => resolveOfficialKeywordUsesV1({ dataBundle: bundle,
  registryComplete: true,
  keywordUses: [keywordUse("unknown", "MADE UP", "MADE UP")] }),
/KEYWORD_DEFINITION_UNKNOWN/u);
acceptance.push("unknown_keyword_fails_closed");

assert.throws(() => resolveOfficialKeywordUsesV1({ dataBundle: bundle,
  registryComplete: true, keywordUses: [{
    ...keywordUse("meaning", "SPECIALIST", "SPECIALIST"), meaningHash: "0".repeat(64),
  }] }), /KEYWORD_CLIENT_MEANING_FORBIDDEN/u);
acceptance.push("client_cannot_replace_official_keyword_meaning");

assert.throws(() => resolveOfficialKeywordUsesV1({ dataBundle: bundle,
  registryComplete: true,
  keywordUses: [keywordUse("numeric", "PRECISION (X)", "PRECISION (3)")] }),
/KEYWORD_NUMERIC_VALUE_INVALID/u);
acceptance.push("numeric_keyword_requires_an_explicit_value");

const stimpack = ability(bundle, "STIMPACK", (entry) => (
  entry.sourceRecordKey === "army_units:marine"
));
const active = classifyOfficialSpecialAbilityV1({ dataBundle: bundle,
  abilityId: stimpack.abilityId });
assert.equal(active.category, "active");
assert.equal(active.sourceKind, "unit");
acceptance.push("official_marine_stimpack_is_classified_active_from_source_index");

const slugthrower = ability(bundle, "SLUGTHROWER", (entry) => (
  entry.sourceRecordKey === "army_units:marine"
));
assert.equal(classifyOfficialSpecialAbilityV1({ dataBundle: bundle,
  abilityId: slugthrower.abilityId }).category, "passive");
acceptance.push("official_marine_slugthrower_is_classified_passive");

const restoration = ability(bundle, "RESTORATION", (entry) => (
  entry.sourceRecordKey === "army_units:medic"
));
assert.equal(classifyOfficialSpecialAbilityV1({ dataBundle: bundle,
  abilityId: restoration.abilityId }).category, "reaction");
acceptance.push("official_medic_restoration_is_classified_reaction");

assert.throws(() => classifyOfficialSpecialAbilityV1({ dataBundle: bundle,
  abilityId: stimpack.abilityId, claimedCategory: "passive" }),
/SPECIAL_ABILITY_CATEGORY_FORGERY/u);
acceptance.push("client_cannot_forge_special_ability_category");

const targeted = resolveOfficialAbilityTargetingPrimitiveV1({
  targetingMode: "targeted", targetingDeclarationComplete: true,
  rulesOwnedDeclaration: true, targetUnitId: "p2-unit",
  rangeSatisfied: true, lineOfSightSatisfied: true, lineOfSightEvaluated: true,
});
assert.deepEqual({ target: targeted.targetRequired, range: targeted.rangeRequired,
  los: targeted.lineOfSightRequired }, { target: true, range: true, los: true });
acceptance.push("targeted_ability_requires_target_range_and_line_of_sight");

assert.throws(() => resolveOfficialAbilityTargetingPrimitiveV1({
  targetingMode: "targeted", targetingDeclarationComplete: true,
  rulesOwnedDeclaration: true, targetUnitId: "p2-unit",
  rangeSatisfied: true, lineOfSightSatisfied: false, lineOfSightEvaluated: true,
}), /SPECIAL_ABILITY_TARGET_REQUIREMENTS_UNSATISFIED/u);
acceptance.push("targeted_ability_without_line_of_sight_fails_closed");

const untargeted = resolveOfficialAbilityTargetingPrimitiveV1({
  targetingMode: "untargeted", targetingDeclarationComplete: true,
  rulesOwnedDeclaration: true, lineOfSightEvaluated: false,
});
assert.equal(untargeted.lineOfSightRequired, false);
assert.equal(untargeted.untargetedLosExemptUnlessSpecificRuleStatesOtherwise, true);
acceptance.push("untargeted_ability_is_line_of_sight_exempt_by_default");

assert.throws(() => resolveOfficialAbilityTargetingPrimitiveV1({
  targetingMode: "untargeted", targetingDeclarationComplete: true,
  rulesOwnedDeclaration: true, lineOfSightEvaluated: false, targetUnitId: "forged",
}), /SPECIAL_ABILITY_UNTARGETED_LOS_EXEMPTION_INVALID/u);
acceptance.push("untargeted_mode_cannot_smuggle_a_target_unit");

const placed = resolveOfficialAbilityTargetingPrimitiveV1({
  targetingMode: "place_token_or_marker", targetingDeclarationComplete: true,
  rulesOwnedDeclaration: true, lineOfSightEvaluated: false, placementKind: "token",
});
assert.equal(placed.tokenOrMarkerPlacementIsTarget, false);
assert.equal(placed.lineOfSightRequired, false);
acceptance.push("placing_a_token_or_marker_is_not_a_target_and_needs_no_los");

assert.throws(() => resolveOfficialAbilityTargetingPrimitiveV1({
  targetingMode: "place_token_or_marker", targetingDeclarationComplete: true,
  rulesOwnedDeclaration: true, lineOfSightEvaluated: false,
  placementKind: "marker", targetUnitId: "forged",
}), /SPECIAL_ABILITY_TOKEN_MARKER_NOT_TARGET_INVALID/u);
acceptance.push("token_marker_placement_rejects_forged_target_semantics");

const commanders = bundle.specialAbilities.filter((entry) => (
  entry.canonicalName === "COMMANDER"
));
const commanderResolution = resolveOfficialSameNamedSpecialAbilityEffectsV1({
  dataBundle: bundle, simultaneousSetComplete: true,
  instances: commanders.map((entry, index) => ({
    instanceId: `commander-${index}`, abilityId: entry.abilityId, simultaneous: true,
  })),
});
assert.equal(commanderResolution.effectiveInstanceCount, 1);
assert.equal(commanderResolution.suppressedInstances.length, 2);
acceptance.push("identical_simultaneous_same_named_abilities_apply_once");

const chargeVariants = bundle.specialAbilities.filter((entry) => (
  entry.canonicalName === "DEVASTATING CHARGE"
));
const differentCharge = chargeVariants.find((entry) => (
  entry.definitionHash !== chargeVariants[0].definitionHash
));
assert.throws(() => resolveOfficialSameNamedSpecialAbilityEffectsV1({
  dataBundle: bundle, simultaneousSetComplete: true, instances: [
    { instanceId: "charge-a", abilityId: chargeVariants[0].abilityId, simultaneous: true },
    { instanceId: "charge-b", abilityId: differentCharge.abilityId, simultaneous: true },
  ],
}), /SPECIAL_ABILITY_SAME_NAME_EFFECT_CONFLICT_UNRESOLVED/u);
acceptance.push("same_name_with_different_effect_definitions_fails_closed");

assert.throws(() => resolveOfficialSameNamedSpecialAbilityEffectsV1({
  dataBundle: bundle, simultaneousSetComplete: true, instances: [
    { instanceId: "stimpack", abilityId: stimpack.abilityId, simultaneous: true },
    { instanceId: "slugthrower", abilityId: slugthrower.abilityId, simultaneous: true },
  ],
}), /SPECIAL_ABILITY_SAME_NAME_SET_REQUIRED/u);
acceptance.push("nonstack_resolution_requires_one_canonical_ability_name");

const orders = ability(bundle, "ORDERS");
const repeated = evaluateOfficialRepeatablePermissionV1({ dataBundle: bundle,
  abilityId: orders.abilityId, usesThisRound: 3, usesThisActivation: 2,
  normalFrequencyAvailable: false, costPaid: true, triggerSatisfied: true,
});
assert.equal(repeated.repeatableGranted, true);
assert.equal(repeated.usePermitted, true);
acceptance.push("source_bound_repeatable_allows_multiple_round_and_activation_uses");

assert.equal(evaluateOfficialRepeatablePermissionV1({ dataBundle: bundle,
  abilityId: orders.abilityId, usesThisRound: 3, usesThisActivation: 2,
  normalFrequencyAvailable: false, costPaid: false, triggerSatisfied: true,
}).usePermitted, false);
acceptance.push("repeatable_still_requires_cost_on_every_use");

assert.equal(evaluateOfficialRepeatablePermissionV1({ dataBundle: bundle,
  abilityId: orders.abilityId, usesThisRound: 3, usesThisActivation: 2,
  normalFrequencyAvailable: false, costPaid: true, triggerSatisfied: false,
}).usePermitted, false);
acceptance.push("repeatable_still_requires_trigger_on_every_use");

assert.equal(evaluateOfficialRepeatablePermissionV1({ dataBundle: bundle,
  abilityId: stimpack.abilityId, usesThisRound: 0, usesThisActivation: 0,
  normalFrequencyAvailable: true, costPaid: true, triggerSatisfied: true,
}).usePermitted, true);
acceptance.push("nonrepeatable_ability_can_use_the_existing_normal_frequency_window");

assert.equal(evaluateOfficialRepeatablePermissionV1({ dataBundle: bundle,
  abilityId: stimpack.abilityId, usesThisRound: 1, usesThisActivation: 1,
  normalFrequencyAvailable: false, costPaid: true, triggerSatisfied: true,
}).usePermitted, false);
acceptance.push("nonrepeatable_ability_cannot_bypass_normal_frequency_limit");

assert.throws(() => evaluateOfficialRepeatablePermissionV1({ dataBundle: bundle,
  abilityId: stimpack.abilityId, usesThisRound: 1, usesThisActivation: 1,
  normalFrequencyAvailable: false, costPaid: true, triggerSatisfied: true,
  repeatableGranted: true,
}), /REPEATABLE_KEYWORD_FORGERY/u);
acceptance.push("client_cannot_forge_repeatable_onto_an_ability");

const state = prepare(fixture, bundle);
const binding = bindingFor(fixture.gameplayDataBundle);
const keywordPlan = plan("precision-plan", "keyword_resolution", {
  registryComplete: true, keywordUses: [
    keywordUse("precision-a", "PRECISION (X)", "PRECISION (1)", { numericValue: 1 }),
    keywordUse("precision-b", "PRECISION (X)", "PRECISION (3)", { numericValue: 3 }),
  ],
});
const opened = openOfficialKeywordSpecialAbilityRulesPendingV1(state,
  procedure(state, "keyword_resolution", keywordPlan));
const domain = domainFor(runtime, opened.state, binding);
assert(domain);
assert.equal(domain.constraints.choices.length, 1);
assert.equal(domain.constraints.clientSuppliedMeaningCategoryOrResultAccepted, false);
acceptance.push("runtime_domain_binds_complete_rules_certified_primitive_choice");

const action = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
const applied = runtime.apply(opened.state, action.action, { matchBinding: binding });
assert.equal(applied.state.pendingAction, null);
assert.equal(applied.state.lastKeywordSpecialAbilityRulesResolution
  .result.effectiveKeywordUses[0].numericValue, 3);
assert.equal(applied.events[0].type, "keyword_special_ability_rules_resolved");
acceptance.push("runtime_apply_persists_rules_owned_result_history_and_event");

const stale = structuredClone(opened.state);
stale.keywordSpecialAbilityRulesHistory.push({ forged: true });
assert.equal(runtime.enumerate(stale, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding }).candidates[0].disabledReason,
"KEYWORD_SPECIAL_ABILITY_PENDING_INVALID");
acceptance.push("history_drift_invalidates_old_keyword_ability_domain");

const sourceDrift = structuredClone(opened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding }).candidates[0].disabledReason,
"KEYWORD_SPECIAL_ABILITY_SOURCE_LOCK_BINDING_INVALID");
acceptance.push("source_lock_drift_disables_keyword_ability_legalspace");

const dataDrift = structuredClone(binding);
dataDrift.dependencies.dataSnapshot.contentHash = "0".repeat(64);
assert.equal(runtime.enumerate(opened.state, { sideKey: "player1",
  includeDisabled: true, matchBinding: dataDrift }).candidates[0].disabledReason,
"KEYWORD_SPECIAL_ABILITY_DATA_ARTIFACT_BINDING_INVALID");
acceptance.push("match_bound_data_artifact_drift_disables_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:keywordSpecialAbilityV1.keywordRegistry"
    && entry.to === "derived_value:keywordSpecialAbilityV1.formattedKeyword"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_registry_to_format_edge");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-90-keyword-short-seal-v1");
const authoritySeed = envelopeFor(authority, fixture, state);
const authorityOpened = openOfficialKeywordSpecialAbilityRulesPendingV1(
  authoritySeed.state,
  procedure(authoritySeed.state, "keyword_resolution", keywordPlan),
);
const initial = authority.createEnvelope({ roomId: authoritySeed.roomId,
  matchBinding: authoritySeed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial,
  { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_KEYWORD_SPECIAL_ABILITY_RULES_PARAMETER_KIND
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
  controlLease: access.lease, idempotencyKey: "slice-90-keyword-special-ability" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(runtime, keys, "slice-90-keyword-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_keyword_special_ability_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
acceptance.push("authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const secondBundle = createOfficialKeywordSpecialAbilityDataBundleV1({
  dataset: fixture.dataset,
});
assert.equal(secondBundle.bundleHash, bundle.bundleHash);
assert.equal(secondBundle.specialAbilityIndexHash, bundle.specialAbilityIndexHash);
acceptance.push("official_keyword_and_ability_index_compilation_is_deterministic");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.keywordSpecialAbilityRulesProgress.sourceRefreshPerformed, false);
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
acceptance.push("no_source_refresh_skill_dsh_muzero_selfplay_or_training_promotion_occurs");
assert.equal(acceptance.length, 45);

const report = {
  schema:
    "starcraft_tmg_official_keyword_special_ability_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  keywordSpecialAbilityDataBundle: bundle,
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
  rulesTruth: "official_keyword_special_ability_primitive_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-keyword-special-ability-rules-rule-slice-v1-report.json"),
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
  sourceIndexCounts: { keywords: bundle.keywordDefinitions.length,
    specialAbilities: bundle.specialAbilities.length,
    uniqueAbilityNames: bundle.specialAbilityAudit.uniqueNameCount },
  routeV2Hash: route.routeHash,
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false,
  repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
