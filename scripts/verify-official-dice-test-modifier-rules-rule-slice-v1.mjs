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
  OFFICIAL_DICE_TEST_MODIFIER_RULES_NEW_ATOM_IDS,
  OFFICIAL_DICE_TEST_MODIFIER_RULES_PARAMETER_KIND,
  openOfficialDiceTestModifierRulesPendingV1,
} from "../packages/rule-atoms/official-dice-test-modifier-rules-executor-v1.mjs";
import {
  classifyOfficialPhysicalDieV1,
  classifyOfficialTestV1,
  createOfficialCockedDiceAgreementV1,
  createOfficialModifierRegistryV1,
  createOfficialRerollGrantV1,
  evaluateOfficialGeneratedValueV1,
  evaluateOfficialTestRollsV1,
  resolveOfficialInvalidDieRerollV1,
  resolveOfficialRerollV1,
  resolveOfficialTargetNumberV1,
} from "../packages/rule-atoms/official-dice-test-modifier-rules-kernel-v1.mjs";
import { OFFICIAL_DICE_TEST_MODIFIER_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-dice-test-modifier-rules-relationship-contract-v1.mjs";
import {
  createOfficialDiceTestModifierRulesRuleSliceV1,
  verifyOfficialDiceTestModifierRulesRuleSliceV1,
} from "../packages/rule-atoms/official-dice-test-modifier-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialDiceTestModifierDataBundleV1,
  verifyOfficialDiceTestModifierDataBundleV1,
} from "../packages/source-data/official-dice-test-modifier-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-player-control-relationship-rules-rule-slice-v1-report.json",
), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-elevation-effective-size-rules-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];

function pass(id) { acceptance.push(id); }
function hash(value) { return hashStarcraftTmgContract(value); }
function claim(input) {
  const common = {
    claimId: input.claimId,
    sourceName: input.sourceName,
    sourceKind: input.sourceKind,
    sourceArtifactId: `artifact:${input.claimId}`,
    sourceContentHash: hash({ content: input.claimId }),
    sourceTextHash: hash({ text: input.claimId }),
    targetClass: "target_number",
    differentNamedSourcesCumulative: true,
    stackingOverrideApplied: false,
  };
  return input.sourceKind === "modifier"
    ? { ...common, signedValue: input.value }
    : { ...common, magnitude: input.value };
}
function registry(claims = []) {
  return createOfficialModifierRegistryV1({
    rulesOwned: true,
    claimsComplete: true,
    sameNamedSourceClaimsConsolidated: true,
    claims,
  });
}
function rerollGrant(input = {}) {
  return createOfficialRerollGrantV1({
    rulesOwned: true,
    sourceArtifactId: input.sourceArtifactId || "ability:reroll",
    sourceContentHash: hash({ ability: input.sourceArtifactId || "reroll" }),
    sourceTextHash: hash({ text: input.sourceArtifactId || "reroll" }),
    scope: input.scope || "default_single_die",
    ...(input.maximumDice ? { maximumDice: input.maximumDice } : {}),
  });
}
function agreement(sideKeys = ["player1", "player2"]) {
  return createOfficialCockedDiceAgreementV1({
    rulesOwned: true,
    agreementTiming: "before_game",
    ambiguousAtGlanceReroll: true,
    playerSideKeys: sideKeys,
    acceptedBySideKeys: [...sideKeys].reverse(),
  });
}
function prepare(fixture, bundle) {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "assault";
  state.rulesProcedureMode = true;
  state.officialDiceTestModifierDataBundle = bundle;
  return state;
}
function procedure(state, kind, plan) {
  return { procedureKind: kind, sideKey: state.activeSideKey,
    candidatePlansComplete: true, rulesDenominatorComplete: true,
    candidatePlans: [plan] };
}
function bindingFor(gameplayDataBundle) {
  const dataHash = hash(gameplayDataBundle);
  return { bindingHash: "slice-89-dice-rules-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true, matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_DICE_TEST_MODIFIER_RULES_PARAMETER_KIND
  ));
}
function modifierPlan(id, modifierRegistry, baseTargetNumber = 5) {
  return { planId: id, kind: "modifier_query", baseTargetNumber,
    modifierRegistry };
}
function testPlan(id, modifierRegistry, grant = null, input = {}) {
  return { planId: id, kind: "test", testId: `${id}-test`,
    testClass: input.testClass || "attribute",
    sourceClass: input.sourceClass || "weapon_profile",
    baseTargetNumber: input.baseTargetNumber === undefined
      ? 4 : input.baseTargetNumber,
    modifierRegistry,
    rollCount: input.baseTargetNumber === null ? 0 : Number(input.rollCount || 1),
    rerollGrant: grant };
}
function applyInitial(runtime, state, binding, plan, kind, reveals = []) {
  const opened = openOfficialDiceTestModifierRulesPendingV1(
    state, procedure(state, kind, plan),
  );
  const domain = domainFor(runtime, opened.state, binding);
  assert(domain);
  const action = runtime.instantiate(opened.state, domain,
    { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
  const applied = runtime.apply(opened.state, action.action,
    { matchBinding: binding, chanceReveals: reveals });
  return { opened, domain, action, applied };
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T04:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-89-dice-rules",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 89 dice/test rules.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-89-dice-rules-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-dice-rules-no-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "dice_test_modifier_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-89-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-89-action-schema-v27",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v27" } },
    }, state });
}
function credentials(engine, envelope, suffix) {
  const authority = engine.issueSeatAuthority({ grantId: `slice-89-dice-${suffix}`,
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: `slice-89-dice-session-${suffix}`, leaseFence: 1,
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
      geometryVersion: "dice_test_modifier_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v27" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialDiceTestModifierRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialDiceTestModifierRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 645,
  newlyExecutableRuleAtoms: 18, reviewRequiredRuleAtoms: 267,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 645,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 58, missingStateContractExecutors: 0 });
pass("slice89_promotes_exact_18_route_atoms_to_645_executable"); // 1

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 89);
assert.deepEqual(assignment.atomIds,
  [...OFFICIAL_DICE_TEST_MODIFIER_RULES_NEW_ATOM_IDS]);
assert.equal(assignment.executableAfter, 645);
assert.equal(assignment.reviewRequiredAfter, 267);
pass("route_v2_exact_slice89_atom_identity_and_counts_match"); // 2

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialDiceTestModifierDataBundleV1({ dataset: fixture.dataset });
assert.deepEqual(fixture.snapshot.dataVersions, {
  unitsVersion: "71", cardsVersion: "69", rulesVersion: "48",
});
pass("sealed_source_lock_binds_versions_71_69_48_without_refresh"); // 3

assert.equal(verifyOfficialDiceTestModifierDataBundleV1(bundle), true);
assert.equal(bundle.coreRulebookHash,
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54");
pass("dice_rules_source_bundle_binds_locked_core_pdf"); // 4

assert.deepEqual(bundle.ruleSectionRecords.map((entry) => entry.title), [
  "PART 3: DICE AND ROLLING", "PART 11: KEYWORD GLOSSARY AND DEFINITIONS",
]);
assert.deepEqual(bundle.sourceLocators.map((entry) => entry.section), [
  "3.3", "3.4", "3.5", "3.7", "3.8", "11/BUFF", "11/DEBUFF", "11/MODIFIER",
]);
pass("part3_and_glossary_records_and_locators_are_exact"); // 5

const empty = registry();
const unmodified = resolveOfficialTargetNumberV1({ baseTargetNumber: 5,
  modifierRegistry: empty });
assert.equal(unmodified.finalTargetNumber, 5);
pass("empty_rules_owned_registry_preserves_target_number"); // 6

const positive = registry([claim({ claimId: "high-ground", sourceName: "High Ground",
  sourceKind: "modifier", value: 1 })]);
assert.equal(resolveOfficialTargetNumberV1({ baseTargetNumber: 5,
  modifierRegistry: positive }).finalTargetNumber, 4);
pass("positive_modifier_reduces_target_number"); // 7

const negative = registry([claim({ claimId: "long-range", sourceName: "Long Range",
  sourceKind: "modifier", value: -1 })]);
assert.equal(resolveOfficialTargetNumberV1({ baseTargetNumber: 5,
  modifierRegistry: negative }).finalTargetNumber, 6);
pass("negative_modifier_increases_target_number"); // 8

const buff = registry([claim({ claimId: "armour-buff", sourceName: "Armour Buff",
  sourceKind: "buff", value: 2 })]);
assert.equal(resolveOfficialTargetNumberV1({ baseTargetNumber: 5,
  modifierRegistry: buff }).finalTargetNumber, 3);
pass("buff_reduces_target_number_characteristic"); // 9

const debuff = registry([claim({ claimId: "hit-debuff", sourceName: "Hit Debuff",
  sourceKind: "debuff", value: 2 })]);
assert.equal(resolveOfficialTargetNumberV1({ baseTargetNumber: 4,
  modifierRegistry: debuff }).finalTargetNumber, 6);
pass("debuff_increases_target_number_characteristic"); // 10

const stacked = registry([
  claim({ claimId: "source-a", sourceName: "Source A", sourceKind: "modifier", value: 1 }),
  claim({ claimId: "source-b", sourceName: "Source B", sourceKind: "buff", value: 1 }),
]);
assert.equal(resolveOfficialTargetNumberV1({ baseTargetNumber: 5,
  modifierRegistry: stacked }).finalTargetNumber, 3);
pass("differently_named_modifier_sources_stack_cumulatively"); // 11

assert.equal(resolveOfficialTargetNumberV1({ baseTargetNumber: 5,
  modifierRegistry: registry([claim({ claimId: "plus-six", sourceName: "Plus Six",
    sourceKind: "modifier", value: 6 })]) }).finalTargetNumber, 2);
assert.equal(resolveOfficialTargetNumberV1({ baseTargetNumber: 3,
  modifierRegistry: registry([claim({ claimId: "minus-six", sourceName: "Minus Six",
    sourceKind: "modifier", value: -6 })]) }).finalTargetNumber, 6);
pass("modified_target_numbers_are_clamped_to_two_and_six"); // 12

assert.throws(() => registry([
  claim({ claimId: "same-a", sourceName: "Same Source", sourceKind: "modifier", value: 1 }),
  claim({ claimId: "same-b", sourceName: "same source", sourceKind: "modifier", value: 1 }),
]), /DICE_MODIFIER_CLAIM_INVALID/u);
pass("same_named_source_implicit_stacking_fails_closed"); // 13

const forgedRegistry = structuredClone(positive);
forgedRegistry.claims[0].signedValue = -1;
assert.throws(() => resolveOfficialTargetNumberV1({ baseTargetNumber: 5,
  modifierRegistry: forgedRegistry }), /DICE_MODIFIER_REGISTRY_INVALID/u);
pass("forged_modifier_registry_hash_is_rejected"); // 14

const nullTarget = resolveOfficialTargetNumberV1({ baseTargetNumber: null,
  modifierRegistry: positive });
assert.equal(nullTarget.rollAllowed, false);
assert.equal(nullTarget.finalTargetNumber, null);
assert.throws(() => evaluateOfficialTestRollsV1({
  testClass: "attribute", sourceClass: "weapon_profile",
  baseTargetNumber: null, modifierRegistry: positive, rolls: [6],
}), /DICE_NULL_CAPABILITY_ROLL_FORBIDDEN/u);
pass("null_capability_cannot_gain_a_roll_from_modifiers"); // 15

assert.equal(classifyOfficialTestV1({ testClass: "attribute",
  sourceClass: "weapon_profile" }).attributeTest, true);
pass("weapon_profile_hit_is_an_attribute_test"); // 16

assert.equal(classifyOfficialTestV1({ testClass: "characteristic",
  sourceClass: "unit_profile" }).characteristicTest, true);
pass("unit_profile_armour_or_evade_is_a_characteristic_test"); // 17

const test = evaluateOfficialTestRollsV1({
  testClass: "attribute", sourceClass: "weapon_profile",
  baseTargetNumber: 4, modifierRegistry: empty, rolls: [1, 4, 6],
});
assert.deepEqual(test.rolls.map((entry) => entry.success), [false, true, true]);
assert.equal(test.targetNumberResolution.modifiersAppliedBeforeRoll, true);
pass("tests_resolve_final_target_then_natural_boundaries_and_threshold"); // 18

const d3PlusOne = evaluateOfficialGeneratedValueV1({
  expression: { dieKind: "D3", diceCount: 1, fixedAddition: 1 },
  rawD6Rolls: [6],
});
assert.equal(d3PlusOne.generatedValue, 4);
assert.equal(d3PlusOne.isTest, false);
pass("d3_plus_one_generates_value_and_is_not_a_test"); // 19

const twoD6PlusTwo = evaluateOfficialGeneratedValueV1({
  expression: { dieKind: "D6", diceCount: 2, fixedAddition: 2 },
  rawD6Rolls: [2, 5],
});
assert.equal(twoD6PlusTwo.generatedValue, 9);
pass("multiple_dice_and_fixed_addition_generate_exact_value"); // 20

assert.equal(twoD6PlusTwo.fixedAdditionIsTargetNumberModifier, false);
assert.equal(twoD6PlusTwo.targetNumber, null);
assert.equal(twoD6PlusTwo.naturalSuccessFailureApplied, false);
pass("fixed_addition_is_distinct_from_target_number_modifier"); // 21

const defaultGrant = rerollGrant();
assert.equal(defaultGrant.maximumDice, 1);
assert.equal(defaultGrant.defaultScopeIsSingleDie, true);
pass("default_reroll_scope_is_one_die"); // 22

const multipleGrant = rerollGrant({ scope: "specified_multiple_dice", maximumDice: 2 });
assert.equal(multipleGrant.maximumDice, 2);
assert.equal(multipleGrant.specifiedMultipleDiceFollowAbility, true);
pass("ability_specified_multiple_dice_reroll_scope_is_bounded"); // 23

const worse = resolveOfficialRerollV1({ grant: defaultGrant,
  originalRolls: [6], selectedIndices: [0], replacementRolls: [1] });
assert.deepEqual(worse.finalRolls, [1]);
assert.equal(worse.replacements[0].replacementIsWorse, true);
pass("reroll_replaces_original_even_when_worse"); // 24

assert.throws(() => resolveOfficialRerollV1({ grant: defaultGrant,
  originalRolls: [2, 3], selectedIndices: [0, 1], replacementRolls: [4, 5] }),
/DICE_REROLL_SELECTION_INVALID/u);
pass("reroll_selection_cannot_exceed_granted_scope"); // 25

const diceAgreement = agreement();
assert.deepEqual(diceAgreement.acceptedBySideKeys, ["player1", "player2"]);
assert.equal(diceAgreement.agreementTiming, "before_game");
pass("all_players_bind_pregame_cocked_dice_agreement"); // 26

assert.equal(classifyOfficialPhysicalDieV1({ agreement: diceAgreement,
  condition: "flat_clear_on_playing_surface" }).rerollRequired, false);
pass("flat_clear_physical_die_is_valid"); // 27

for (const condition of diceAgreement.invalidConditions) {
  assert.equal(classifyOfficialPhysicalDieV1({ agreement: diceAgreement,
    condition }).rerollRequired, true, condition);
}
pass("lodged_tilted_off_table_not_flat_and_ambiguous_dice_are_invalid"); // 28

const invalidD3 = resolveOfficialInvalidDieRerollV1({ agreement: diceAgreement,
  condition: "off_table", dieKind: "D3", rawD6Roll: 5 });
assert.equal(invalidD3.replacementResult, 3);
assert.equal(invalidD3.originalInvalidResultDiscarded, true);
pass("invalid_die_is_rerolled_and_d3_mapping_is_preserved"); // 29

const forgedAgreement = structuredClone(diceAgreement);
forgedAgreement.acceptedBySideKeys = ["player1"];
assert.throws(() => classifyOfficialPhysicalDieV1({ agreement: forgedAgreement,
  condition: "off_table" }), /DICE_COCKED_AGREEMENT_INVALID/u);
pass("forged_or_partial_cocked_dice_agreement_is_rejected"); // 30

assert.equal(runtime.descriptor.executableRuleAtomCount, 645);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 381);
assert.equal(runtime.descriptor.executorManifest.length, 58);
pass("runtime_binds_645_atoms_and_58_executors"); // 31

const baseState = prepare(fixture, bundle);
const binding = bindingFor(fixture.gameplayDataBundle);
const modifierRun = applyInitial(runtime, baseState, binding,
  modifierPlan("stacked-modifier", stacked), "modifier_query");
assert.equal(modifierRun.applied.state.lastDiceTestModifierResolution.finalTargetNumber, 3);
assert.equal(modifierRun.applied.events[0].type, "dice_modifier_query_resolved");
pass("runtime_resolves_rules_owned_modifier_query"); // 32

const generatedRun = applyInitial(runtime, baseState, binding, {
  planId: "generated-d3-plus-one", kind: "generated_value",
  expression: { dieKind: "D3", diceCount: 1, fixedAddition: 1 },
}, "generated_value", [{ faces: 6, outcome: 4 }]);
assert.equal(generatedRun.applied.state.lastDiceTestModifierResolution.generatedValue, 3);
pass("runtime_resolves_referee_revealed_generated_value"); // 33

const initialRun = applyInitial(runtime, baseState, binding,
  testPlan("reroll-test", empty, defaultGrant), "test",
  [{ faces: 6, outcome: 6 }]);
assert.equal(initialRun.applied.state.pendingAction.stage, "choose_reroll");
assert.equal(initialRun.applied.state.pendingAction.initialTestResolution.rolls[0].roll, 6);
pass("runtime_commits_initial_test_before_opening_reroll_choice"); // 34

const keepDomain = domainFor(runtime, initialRun.applied.state, binding);
const keepAction = runtime.instantiate(initialRun.applied.state, keepDomain,
  { decision: "keep_original", selectedIndices: [] }, { matchBinding: binding });
const kept = runtime.apply(initialRun.applied.state, keepAction.action,
  { matchBinding: binding });
assert.equal(kept.state.lastDiceTestModifierResolution.decision, "keep_original");
assert.equal(kept.state.lastDiceTestModifierResolution.finalTestResolution.rolls[0].roll, 6);
pass("runtime_keep_choice_retains_original_result_without_new_chance"); // 35

const rerollRun = applyInitial(runtime, baseState, binding,
  testPlan("worse-reroll-test", empty, defaultGrant), "test",
  [{ faces: 6, outcome: 6 }]);
const rerollDomain = domainFor(runtime, rerollRun.applied.state, binding);
const rerollAction = runtime.instantiate(rerollRun.applied.state, rerollDomain,
  { decision: "reroll", selectedIndices: [0] }, { matchBinding: binding });
const rerolled = runtime.apply(rerollRun.applied.state, rerollAction.action,
  { matchBinding: binding, chanceReveals: [{ faces: 6, outcome: 1 }] });
assert.equal(rerolled.state.lastDiceTestModifierResolution.finalTestResolution.rolls[0].roll, 1);
assert.equal(rerolled.state.lastDiceTestModifierResolution.finalTestResolution.successCount, 0);
pass("runtime_reroll_replacement_is_final_even_when_initial_was_success"); // 36

const staleHistory = structuredClone(initialRun.applied.state);
staleHistory.diceRulesHistory.push({ forged: true });
assert.equal(runtime.enumerate(staleHistory, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding }).candidates[0].disabledReason,
"DICE_RULES_PENDING_INVALID");
pass("dice_history_drift_invalidates_open_reroll_domain"); // 37

const sourceDrift = structuredClone(initialRun.opened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding }).candidates[0].disabledReason,
"DICE_RULES_SOURCE_LOCK_BINDING_INVALID");
pass("source_lock_drift_disables_dice_rules_legalspace"); // 38

const dataDrift = structuredClone(binding);
dataDrift.dependencies.dataSnapshot.contentHash = "0".repeat(64);
assert.equal(runtime.enumerate(initialRun.opened.state, { sideKey: "player1",
  includeDisabled: true, matchBinding: dataDrift }).candidates[0].disabledReason,
"DICE_RULES_DATA_ARTIFACT_BINDING_INVALID");
pass("match_bound_data_artifact_drift_disables_dice_rules_legalspace"); // 39

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
pass("dice_rules_relationship_graph_is_closed_for_declared_scope"); // 40

const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_DICE_TEST_MODIFIER_RULES_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:diceTestModifierV1.initialTestRoll"
    && entry.to === "derived_value:diceTestModifierV1.postRollRerollDecision"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hash(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
pass("relationship_graph_blocks_missing_initial_result_to_reroll_choice_edge"); // 41

assert.equal(slice.previousSliceHash, previousReport.slice.sliceHash);
assert.equal(slice.historicalCompatibility.previousRuntimeHash,
  previousReport.runtimeHash);
pass("slice88_catalogue_runtime_and_display_lineage_remain_frozen"); // 42

assert.deepEqual(slice.newlyExecutableRuleAtomIds,
  [...OFFICIAL_DICE_TEST_MODIFIER_RULES_NEW_ATOM_IDS]);
const priorBuffValue = slice.catalogue.atoms.find((entry) => (
  entry.atomId === "rule-atom:singleton:core-11-buff-value:260df1f72f16"
));
assert.equal(priorBuffValue.disposition, "executable");
assert(!slice.newlyExecutableRuleAtomIds.includes(priorBuffValue.atomId));
pass("existing_value_buff_atom_is_reused_without_duplicate_promotion"); // 43

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-89-dice-short-seal-v1");
const authoritySeed = envelopeFor(authority, fixture, baseState);
const authorityOpened = openOfficialDiceTestModifierRulesPendingV1(
  authoritySeed.state,
  procedure(authoritySeed.state, "test",
    testPlan("authority-reroll", empty, defaultGrant)),
);
const initial = authority.createEnvelope({ roomId: authoritySeed.roomId,
  matchBinding: authoritySeed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime);
const firstAccess = credentials(authority, initial, "initial");
const firstSpace = authority.legalSpace(initial,
  { seatAuthority: firstAccess.authority });
const firstDomain = firstSpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_DICE_TEST_MODIFIER_RULES_PARAMETER_KIND
));
const firstPreview = authority.preview({ envelope: initial,
  seatAuthority: firstAccess.authority,
  proposal: { kind: "parameterized", domainId: firstDomain.domainId,
    parameters: { choiceId: firstDomain.constraints.choices[0].choiceId } } });
assert.equal(firstPreview.ok, true, JSON.stringify(firstPreview));
const firstConfirmation = authority.confirmPreview({ envelope: initial,
  preview: firstPreview.preview, seatAuthority: firstAccess.authority });
const firstApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: firstPreview.preview,
  confirmation: firstConfirmation.confirmation,
  seatAuthority: firstAccess.authority, controlLease: firstAccess.lease,
  idempotencyKey: "slice-89-dice-initial" });
assert.equal(firstApplied.ok, true, JSON.stringify(firstApplied));
assert.equal(firstApplied.receipt.chanceReveal.spec.layout.testInitial, 1);
assert.equal(firstApplied.envelope.state.pendingAction.stage, "choose_reroll");
pass("authority_preview_confirm_apply_commits_hidden_initial_chance"); // 44

const secondAccess = credentials(authority, firstApplied.envelope, "reroll");
const secondSpace = authority.legalSpace(firstApplied.envelope,
  { seatAuthority: secondAccess.authority });
const secondDomain = secondSpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_DICE_TEST_MODIFIER_RULES_PARAMETER_KIND
));
const secondPreview = authority.preview({ envelope: firstApplied.envelope,
  seatAuthority: secondAccess.authority,
  proposal: { kind: "parameterized", domainId: secondDomain.domainId,
    parameters: { decision: "reroll", selectedIndices: [0] } } });
assert.equal(secondPreview.ok, true, JSON.stringify(secondPreview));
const secondConfirmation = authority.confirmPreview({ envelope: firstApplied.envelope,
  preview: secondPreview.preview, seatAuthority: secondAccess.authority });
const secondApplied = authority.apply({ envelope: firstApplied.envelope,
  expectedStateRevision: firstApplied.envelope.stateRevision,
  preview: secondPreview.preview, confirmation: secondConfirmation.confirmation,
  seatAuthority: secondAccess.authority, controlLease: secondAccess.lease,
  idempotencyKey: "slice-89-dice-reroll" });
assert.equal(secondApplied.ok, true, JSON.stringify(secondApplied));
assert.equal(secondApplied.receipt.chanceReveal.spec.layout.testReroll, 1);
assert.equal(secondApplied.envelope.state.pendingAction, null);
pass("authority_second_action_owns_post_result_reroll_chance"); // 45

const replay = engineFor(runtime, keys, "slice-89-dice-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
const replayed = replay.replay({ initialEnvelope: initial,
  journal: [firstApplied.receipt, secondApplied.receipt] });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, secondApplied.envelope.stateHash);
pass("two_stage_ed25519_replay_survives_hmac_rotation"); // 46

const tampered = structuredClone(secondApplied.receipt);
tampered.events.push({ type: "forged_dice_event" });
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [firstApplied.receipt, tampered] }).reason, "SIGNATURE_INVALID");
pass("signed_dice_receipt_tampering_is_rejected"); // 47

const chanceTamper = structuredClone(firstApplied.receipt);
chanceTamper.chanceReveal.reveals[0].outcome = chanceTamper.chanceReveal.reveals[0].outcome === 6
  ? 1 : 6;
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [chanceTamper] }).reason, "SIGNATURE_INVALID");
pass("signed_chance_outcome_tampering_is_rejected"); // 48

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.diceTestModifierRulesProgress.sourceRefreshPerformed, false);
assert.equal(slice.trainingTruth, false);
pass("no_source_refresh_skill_dsh_muzero_selfplay_or_training_promotion_occurs"); // 49

assert.equal(acceptance.length, 49);

const report = {
  schema: "starcraft_tmg_official_dice_test_modifier_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  diceTestModifierDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash,
  slice,
  sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph,
  graphAudit: audit.graphAudit,
  coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, twoStageReroll: true,
    signatureAlgorithm: "ed25519", replayAfterHmacRotation: true,
    tamperRejected: true, historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesEligible: false,
  productionRoomEligible: false,
  rulesTruth: "official_dice_test_modifier_reroll_and_generated_value_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-dice-test-modifier-rules-rule-slice-v1-report.json"),
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
