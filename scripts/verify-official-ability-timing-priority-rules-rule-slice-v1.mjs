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
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_NEW_ATOM_IDS,
  OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PARAMETER_KIND,
  openOfficialAbilityTimingPriorityRulesPendingV1,
} from "../packages/rule-atoms/official-ability-timing-priority-rules-executor-v1.mjs";
import {
  resolveOfficialAbilityTypeComparisonV1,
  resolveOfficialEndOfRoundEffectOrderV1,
  resolveOfficialPassivePriorityV1,
  resolveOfficialReactionDefaultDurationV1,
  resolveOfficialReactionPriorityV1,
} from "../packages/rule-atoms/official-ability-timing-priority-rules-kernel-v1.mjs";
import { OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-ability-timing-priority-rules-relationship-contract-v1.mjs";
import {
  createOfficialAbilityTimingPriorityRulesRuleSliceV1,
  verifyOfficialAbilityTimingPriorityRulesRuleSliceV1,
} from "../packages/rule-atoms/official-ability-timing-priority-rules-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialAbilityTimingPriorityDataBundleV1,
  verifyOfficialAbilityTimingPriorityDataBundleV1,
} from "../packages/source-data/official-ability-timing-priority-data-bundle-v1.mjs";
import { createOfficialKeywordSpecialAbilityDataBundleV1 } from
  "../packages/source-data/official-keyword-special-ability-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-keyword-special-ability-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];

function ability(bundle, category, predicate = () => true) {
  const found = bundle.specialAbilities.find((entry) => (
    entry.category === category && predicate(entry)
  ));
  assert(found, `missing official ${category} ability`);
  return found;
}
function effect(abilityEntry, effectId, controllerSideKey, triggerId) {
  return { effectId, controllerSideKey, triggerId,
    abilityId: abilityEntry.abilityId, sourceEffectHash: abilityEntry.definitionHash };
}
function plan(planId, procedureKind, input) {
  return { planId, procedureKind, input,
    rulesOwnedInputsComplete: true, clientSuppliedResult: false };
}
function procedure(state, procedureKind, candidatePlan) {
  return { procedureKind, sideKey: state.activeSideKey,
    candidatePlansComplete: true, rulesDenominatorComplete: true,
    candidatePlans: [candidatePlan] };
}
function prepare(fixture, abilityBundle, timingBundle) {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "movement"; state.rulesProcedureMode = true;
  state.officialKeywordSpecialAbilityDataBundle = abilityBundle;
  state.officialAbilityTimingPriorityDataBundle = timingBundle;
  state.abilityTimingPriorityRulesHistory = [];
  return state;
}
function bindingFor(gameplayDataBundle) {
  const dataHash = hashStarcraftTmgContract(gameplayDataBundle);
  return { bindingHash: "slice-91-ability-timing-priority-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true, matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PARAMETER_KIND
  ));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T05:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-91-ability-timing-priority",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 91 ability timing rules.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-91-ability-timing-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-ability-timing-priority-no-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "ability_timing_priority_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-91-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-91-action-schema-v29",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v29" } },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({
    grantId: "slice-91-ability-timing-grant", roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash, seatKey: "player1",
    roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-91-ability-timing-session", leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision }) };
}
function registerReplay(engine, initial, fixture, runtime) {
  const entries = {
    sourceSnapshot: fixture.snapshot, dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: { kind: "geometry-artifact",
      geometryVersion: "ability_timing_priority_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v29" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialAbilityTimingPriorityRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialAbilityTimingPriorityRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 664,
  newlyExecutableRuleAtoms: 6, reviewRequiredRuleAtoms: 248,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 664,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 60, missingStateContractExecutors: 0 });
acceptance.push("slice91_promotes_exact_6_route_atoms_to_664_executable");

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 91);
assert.deepEqual(assignment.atomIds,
  [...OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_NEW_ATOM_IDS]);
assert.deepEqual({ executable: assignment.executableAfter,
  review: assignment.reviewRequiredAfter }, { executable: 664, review: 248 });
acceptance.push("route_v2_exact_slice91_atom_identity_and_counts_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const abilityBundle = createOfficialKeywordSpecialAbilityDataBundleV1({
  dataset: fixture.dataset,
});
const timingBundle = createOfficialAbilityTimingPriorityDataBundleV1({
  dataset: fixture.dataset, keywordSpecialAbilityDataBundle: abilityBundle,
});
assert.equal(verifyOfficialAbilityTimingPriorityDataBundleV1(
  timingBundle, abilityBundle), true);
assert.equal(timingBundle.reactionAbilityCount, 24);
acceptance.push("timing_bundle_binds_frozen_source_and_24_official_reactions");

assert.deepEqual(timingBundle.ruleClauses.map((entry) => entry.clauseId), [
  "core:8.9.4:end-round-effect-order", "core:10.4:default-end-round-expiry",
  "core:10.4:simultaneous-reaction-priority", "core:2.7.3:reaction-priority",
  "core:10.3:cross-player-passive-priority",
  "core:10.3:simultaneous-own-passive-order",
  "core:10.4:ability-type-comparison-table",
]);
acceptance.push("seven_exact_pdf_clause_hashes_cover_the_six_atoms");

assert.deepEqual(timingBundle.ruleSectionRecords.map((entry) => entry.title), [
  "PART 2: CORE CONCEPTS", "PART 8: THE GAME SEQUENCE",
  "PART 10: ADVANCED RULES",
]);
acceptance.push("part2_part8_and_part10_records_match_frozen_official_capture");

const shared = { timingDataBundle: timingBundle, abilityDataBundle: abilityBundle };
const comparison = resolveOfficialAbilityTypeComparisonV1({ ...shared,
  rulesOwnedComparisonRequested: true });
assert.deepEqual(comparison.categories, ["active", "passive", "reaction"]);
assert.equal(comparison.rulesOwnedComparison, true);
acceptance.push("ability_type_comparison_is_rules_owned_and_three_category_exhaustive");

assert.equal(comparison.comparison.length, 10);
assert.deepEqual(comparison.comparison.find((entry) => entry.characteristic === "simultaneous"),
  { characteristic: "simultaneous", active: "not_applicable",
    passive: "controller_orders_own_then_active_player_first",
    reaction: "active_player_first" });
acceptance.push("comparison_table_exposes_exact_ten_timing_frequency_and_cost_rows");

assert.throws(() => resolveOfficialAbilityTypeComparisonV1({ ...shared,
  rulesOwnedComparisonRequested: true, clientSuppliedComparison: [] }),
/ABILITY_TYPE_COMPARISON_REQUEST_INVALID/u);
acceptance.push("client_cannot_replace_the_official_ability_type_comparison");

const passives = abilityBundle.specialAbilities.filter((entry) => entry.category === "passive");
const passiveInput = { ...shared, activeSideKey: "player1",
  playerSideKeys: ["player1", "player2"], triggerId: "same-trigger-passive",
  simultaneousSetComplete: true,
  effects: [effect(passives[0], "p1-passive-b", "player1", "same-trigger-passive"),
    effect(passives[1], "p1-passive-a", "player1", "same-trigger-passive"),
    effect(passives[2], "p2-passive", "player2", "same-trigger-passive")],
  orderBySide: { player1: ["p1-passive-a", "p1-passive-b"],
    player2: ["p2-passive"] } };
const passiveResolution = resolveOfficialPassivePriorityV1(passiveInput);
assert.deepEqual(passiveResolution.sequence.map((entry) => entry.controllerSideKey),
  ["player1", "player1", "player2"]);
acceptance.push("active_player_passive_group_resolves_before_opponent_group");

assert.deepEqual(passiveResolution.sequence.map((entry) => entry.effectId),
  ["p1-passive-a", "p1-passive-b", "p2-passive"]);
acceptance.push("controller_exact_permutation_orders_own_simultaneous_passives");

assert.equal(passiveResolution.arbitraryEffectExecutionPerformed, false);
assert.equal(passiveResolution.consumerMustFullyResolveEachEffectBeforeNext, true);
acceptance.push("passive_certificate_orders_but_does_not_execute_card_effects");

const activeAbility = ability(abilityBundle, "active");
assert.throws(() => resolveOfficialPassivePriorityV1({ ...passiveInput,
  effects: [effect(activeAbility, "forged-active", "player1", "same-trigger-passive"),
    passiveInput.effects[2]],
  orderBySide: { player1: ["forged-active"], player2: ["p2-passive"] } }),
/ABILITY_TIMING_PRIORITY_CATEGORY_INVALID/u);
acceptance.push("passive_priority_rejects_a_forged_nonpassive_category");

assert.throws(() => resolveOfficialPassivePriorityV1({ ...passiveInput,
  simultaneousSetComplete: false }), /PASSIVE_PRIORITY_COMPLETE_SET_REQUIRED/u);
acceptance.push("passive_priority_requires_complete_simultaneous_trigger_set");

assert.throws(() => resolveOfficialPassivePriorityV1({ ...passiveInput,
  orderBySide: { player1: ["p1-passive-a"], player2: ["p2-passive"] } }),
/PASSIVE_PRIORITY_CONTROLLER_ORDER_INVALID/u);
acceptance.push("passive_priority_rejects_incomplete_controller_order");

const reactions = abilityBundle.specialAbilities.filter((entry) => entry.category === "reaction");
const reactionInput = { ...shared, activeSideKey: "player1",
  playerSideKeys: ["player1", "player2"], triggerId: "same-trigger-reaction",
  simultaneousSetComplete: true,
  reactions: [effect(reactions[1], "opponent-reaction", "player2", "same-trigger-reaction"),
    effect(reactions[0], "active-reaction", "player1", "same-trigger-reaction")] };
const reactionResolution = resolveOfficialReactionPriorityV1(reactionInput);
assert.deepEqual(reactionResolution.sequence.map((entry) => entry.effectId),
  ["active-reaction", "opponent-reaction"]);
acceptance.push("simultaneous_reactions_resolve_active_player_then_opponent");

assert.equal(reactionResolution.oneReactionPerPlayerPerActivationDependencyRequired, true);
acceptance.push("reaction_priority_records_existing_one_per_player_activation_dependency");

assert.throws(() => resolveOfficialReactionPriorityV1({ ...reactionInput,
  reactions: [effect(reactions[0], "same-side-a", "player1", "same-trigger-reaction"),
    effect(reactions[1], "same-side-b", "player1", "same-trigger-reaction")] }),
/REACTION_PRIORITY_ONE_PER_PLAYER_PER_ACTIVATION_REQUIRED/u);
acceptance.push("reaction_priority_rejects_two_reactions_from_one_player");

assert.throws(() => resolveOfficialReactionPriorityV1({ ...reactionInput,
  reactions: [effect(activeAbility, "active-not-reaction", "player1",
    "same-trigger-reaction"), reactionInput.reactions[0]] }),
/ABILITY_TIMING_PRIORITY_CATEGORY_INVALID/u);
acceptance.push("reaction_priority_rejects_forged_nonreaction_category");

const durationInput = { ...shared, abilityId: reactions[0].abilityId,
  effectInstanceId: "reaction-modifier-1",
  subjectKind: "reaction_modifier_or_effect_without_explicit_duration",
  rulesOwnedSpecificDurationAuditComplete: true,
  specificDurationOverrideApplies: false };
const duration = resolveOfficialReactionDefaultDurationV1(durationInput);
assert.equal(duration.removalBoundary, "cleanup_and_refresh_after_end_of_round_effects");
acceptance.push("default_reaction_modifier_removes_during_cleanup_after_eor_effects");

assert.equal(duration.effectiveThroughAllEndOfRoundEffects, true);
assert.equal(duration.permanentOrImmediateRulesChangesReinterpretedAsDurationEffects, false);
acceptance.push("default_duration_stays_through_eor_without_reinterpreting_instant_changes");

assert.throws(() => resolveOfficialReactionDefaultDurationV1({ ...durationInput,
  rulesOwnedSpecificDurationAuditComplete: false }),
/REACTION_SPECIFIC_DURATION_AUDIT_REQUIRED/u);
acceptance.push("reaction_default_duration_requires_rules_owned_override_audit");

assert.throws(() => resolveOfficialReactionDefaultDurationV1({ ...durationInput,
  specificDurationOverrideApplies: true }),
/REACTION_SPECIFIC_DURATION_EXECUTOR_REQUIRED/u);
acceptance.push("explicit_duration_defers_to_individual_effect_executor");

assert.throws(() => resolveOfficialReactionDefaultDurationV1({ ...durationInput,
  clientSuppliedExpiry: "never" }), /REACTION_CLIENT_EXPIRY_FORBIDDEN/u);
acceptance.push("client_cannot_supply_reaction_expiry_truth");

const eorInput = { ...shared, playerSideKeys: ["player1", "player2"],
  firstPlayerSideKey: "player2", effectSetComplete: true,
  effects: [{ effectId: "p1-eor", controllerSideKey: "player1",
    sourceEffectHash: "a".repeat(64) },
  { effectId: "p2-eor-b", controllerSideKey: "player2",
    sourceEffectHash: "b".repeat(64) },
  { effectId: "p2-eor-a", controllerSideKey: "player2",
    sourceEffectHash: "c".repeat(64) }],
  orderBySide: { player1: ["p1-eor"], player2: ["p2-eor-a", "p2-eor-b"] } };
const eor = resolveOfficialEndOfRoundEffectOrderV1(eorInput);
assert.deepEqual(eor.sequence.map((entry) => entry.controllerSideKey),
  ["player2", "player2", "player1"]);
acceptance.push("first_player_resolves_all_end_round_effects_before_opponent");

assert.deepEqual(eor.sequence.map((entry) => entry.effectId),
  ["p2-eor-a", "p2-eor-b", "p1-eor"]);
acceptance.push("each_player_chooses_exact_order_of_their_end_round_effects");

assert.deepEqual(eor.sequence.map((entry) => entry.requiresPreviousResolutionReceipt),
  [false, true, true]);
assert.equal(eor.arbitraryEffectExecutionPerformed, false);
acceptance.push("end_round_sequence_requires_full_prior_receipt_without_executing_effects");

assert.throws(() => resolveOfficialEndOfRoundEffectOrderV1({ ...eorInput,
  orderBySide: { player1: ["p1-eor"], player2: ["p2-eor-a"] } }),
/END_OF_ROUND_CONTROLLER_ORDER_INVALID/u);
acceptance.push("end_round_order_rejects_incomplete_controller_permutation");

assert.throws(() => resolveOfficialEndOfRoundEffectOrderV1({ ...eorInput,
  effects: [{ ...eorInput.effects[0], sourceEffectHash: "not-a-hash" }] }),
/END_OF_ROUND_EFFECT_INVALID/u);
acceptance.push("end_round_order_requires_source_bound_effect_hashes");

assert.throws(() => resolveOfficialEndOfRoundEffectOrderV1({ ...eorInput,
  effectSetComplete: false }), /END_OF_ROUND_ORDER_COMPLETE_SET_REQUIRED/u);
acceptance.push("end_round_order_requires_complete_effect_denominator");

const state = prepare(fixture, abilityBundle, timingBundle);
const binding = bindingFor(fixture.gameplayDataBundle);
const reactionPlan = plan("reaction-priority-plan", "reaction_priority", {
  activeSideKey: "player1", playerSideKeys: ["player1", "player2"],
  triggerId: reactionInput.triggerId, simultaneousSetComplete: true,
  reactions: reactionInput.reactions,
});
const opened = openOfficialAbilityTimingPriorityRulesPendingV1(state,
  procedure(state, "reaction_priority", reactionPlan));
const domain = domainFor(runtime, opened.state, binding);
assert(domain); assert.equal(runtime.descriptor.executorManifest.length, 60);
assert.equal(domain.constraints.clientSuppliedPriorityDurationOrComparisonAccepted, false);
acceptance.push("runtime_exposes_one_of_60_executors_as_rules_certified_domain");

const action = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
const applied = runtime.apply(opened.state, action.action, { matchBinding: binding });
assert.equal(applied.state.pendingAction, null);
assert.deepEqual(applied.state.lastAbilityTimingPriorityRulesResolution.result.sequence
  .map((entry) => entry.effectId), ["active-reaction", "opponent-reaction"]);
acceptance.push("runtime_apply_persists_rules_owned_priority_history_and_event");

const stale = structuredClone(opened.state);
stale.abilityTimingPriorityRulesHistory.push({ forged: true });
assert.equal(runtime.enumerate(stale, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"ABILITY_TIMING_PRIORITY_PENDING_INVALID");
acceptance.push("history_drift_invalidates_old_timing_priority_domain");

const sourceDrift = structuredClone(opened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"ABILITY_TIMING_PRIORITY_SOURCE_LOCK_BINDING_INVALID");
acceptance.push("source_lock_drift_disables_timing_priority_legalspace");

const dataDrift = structuredClone(binding);
dataDrift.dependencies.dataSnapshot.contentHash = "0".repeat(64);
assert.equal(runtime.enumerate(opened.state, { sideKey: "player1", includeDisabled: true,
  matchBinding: dataDrift }).candidates[0].disabledReason,
"ABILITY_TIMING_PRIORITY_DATA_ARTIFACT_BINDING_INVALID");
acceptance.push("match_bound_data_drift_disables_timing_priority_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
assert.deepEqual({ nodes: graph.nodes.length, edges: graph.edges.length },
  { nodes: 10220, edges: 29740 });
acceptance.push("relationship_graph_is_valid_at_10220_nodes_and_29740_edges");

const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:abilityTimingPriorityV1.completePassiveTriggerSet"
    && entry.to === "derived_value:abilityTimingPriorityV1.ownPassiveOrder"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_passive_set_to_order_edge");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-91-ability-timing-short-seal-v1");
const seed = envelopeFor(authority, fixture, state);
const authorityOpened = openOfficialAbilityTimingPriorityRulesPendingV1(seed.state,
  procedure(seed.state, "reaction_priority", reactionPlan));
const initial = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_ABILITY_TIMING_PRIORITY_RULES_PARAMETER_KIND
));
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-91-ability-timing" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(runtime, keys, "slice-91-ability-timing-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_ability_timing_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
acceptance.push("authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const secondTimingBundle = createOfficialAbilityTimingPriorityDataBundleV1({
  dataset: fixture.dataset, keywordSpecialAbilityDataBundle: abilityBundle,
});
assert.equal(secondTimingBundle.bundleHash, timingBundle.bundleHash);
assert.equal(secondTimingBundle.abilityTypeComparisonHash,
  timingBundle.abilityTypeComparisonHash);
acceptance.push("timing_priority_source_compilation_is_deterministic");

assert.deepEqual(slice.historicalCompatibility.frozenExecutorIds, [
  "authority.keyword-special-ability-rules-v1", "authority.end-of-round-effects-v1",
  "authority.end-of-round-effects-v2", "authority.end-of-round-effects-v3",
  "authority.end-of-round-effects-v4", "authority.end-of-round-effects-v5",
  "authority.cleanup-refresh-v3",
]);
assert.equal(slice.abilityTimingPriorityRulesProgress.existingEndOfRoundExecutorsFrozen, true);
acceptance.push("all_existing_end_round_executors_and_rules_displays_remain_frozen");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.abilityTimingPriorityRulesProgress.sourceRefreshPerformed, false);
assert.equal(timingBundle.sourcePolicy.refreshDuringDevelopment, false);
acceptance.push("no_source_refresh_skill_dsh_muzero_selfplay_or_training_promotion_occurs");
assert.equal(acceptance.length, 40);

const report = {
  schema: "starcraft_tmg_official_ability_timing_priority_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  abilityTimingPriorityDataBundle: timingBundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_ability_timing_priority_primitive_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-ability-timing-priority-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, routeV2Hash: route.routeHash,
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  arbitraryEffectExecutionPerformed: false, trainingTruth: false }, null, 2));
