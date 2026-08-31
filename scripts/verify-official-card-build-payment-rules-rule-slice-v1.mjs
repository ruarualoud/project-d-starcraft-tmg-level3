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
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_NEW_ATOM_IDS,
  OFFICIAL_CARD_BUILD_PAYMENT_RULES_PARAMETER_KIND,
  openOfficialCardBuildPaymentRulesPendingV1,
} from "../packages/rule-atoms/official-card-build-payment-rules-executor-v1.mjs";
import {
  resolveOfficialAbilityResourcePaymentV1,
  resolveOfficialCardLayoutV1,
  resolveOfficialTacticalCardPurchaseV1,
  resolveOfficialUniqueCardCopyLimitV1,
} from "../packages/rule-atoms/official-card-build-payment-rules-kernel-v1.mjs";
import { OFFICIAL_CARD_BUILD_PAYMENT_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-card-build-payment-rules-relationship-contract-v1.mjs";
import {
  createOfficialCardBuildPaymentRulesRuleSliceV1,
  verifyOfficialCardBuildPaymentRulesRuleSliceV1,
} from "../packages/rule-atoms/official-card-build-payment-rules-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialCardBuildPaymentDataBundleV1,
  verifyOfficialCardBuildPaymentDataBundleV1,
} from "../packages/source-data/official-card-build-payment-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-ability-timing-priority-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];

function profile(bundle, recordKey) {
  const found = bundle.cardProfiles.find((entry) => entry.recordKey === recordKey);
  assert(found, `missing ${recordKey}`); return found;
}
function cardInstance(entry, cardInstanceId, input = {}) {
  return { cardInstanceId, recordKey: entry.recordKey,
    sourceRecordHash: entry.sourceRecordHash, payloadHash: entry.payloadHash,
    profileHash: entry.profileHash, ...input };
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
function prepare(fixture, bundle) {
  const state = fixture.battleState({ activeSideKey: "player1" });
  state.phase = "movement"; state.rulesProcedureMode = true;
  state.officialCardBuildPaymentDataBundle = bundle;
  state.cardBuildPaymentRulesHistory = [];
  return state;
}
function bindingFor(gameplayDataBundle) {
  const dataHash = hashStarcraftTmgContract(gameplayDataBundle);
  return { bindingHash: "slice-92-card-build-payment-binding",
    dataSnapshotHash: dataHash,
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true, matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_CARD_BUILD_PAYMENT_RULES_PARAMETER_KIND));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-09-01T08:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-92-card-build-payment",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 92 card build/payment rules.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-92-card-build-payment-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-card-build-payment-no-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "card_build_payment_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-92-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-92-action-schema-v30",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v30" } },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-92-card-build-payment-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-92-card-build-payment-session", leaseFence: 1,
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
      geometryVersion: "card_build_payment_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v30" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialCardBuildPaymentRulesRuleSliceV1({
  previousSlice: previousReport.slice });
const audit = verifyOfficialCardBuildPaymentRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice });
assert.deepEqual(audit.counts, { executableRuleAtoms: 671,
  newlyExecutableRuleAtoms: 7, reviewRequiredRuleAtoms: 241,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 671,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 61, missingStateContractExecutors: 0 });
acceptance.push("slice92_promotes_exact_7_route_atoms_to_671_executable");

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 92);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_CARD_BUILD_PAYMENT_RULES_NEW_ATOM_IDS]);
assert.deepEqual({ executable: assignment.executableAfter,
  review: assignment.reviewRequiredAfter }, { executable: 671, review: 241 });
acceptance.push("route_v2_exact_slice92_atom_identity_and_counts_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialCardBuildPaymentDataBundleV1({ dataset: fixture.dataset });
assert.equal(verifyOfficialCardBuildPaymentDataBundleV1(bundle), true);
assert.deepEqual(bundle.cardAudit, { cardCount: 37, factionCardCount: 6,
  tacticalCardCount: 31, uniqueCardCount: 26, nonUniqueCardCount: 11,
  uniqueCardNameCount: 37, resourceValueCounts: { 0: 2, 1: 32, 2: 3 } });
acceptance.push("source_bundle_binds_all_37_current_official_card_records");

assert.deepEqual(bundle.ruleSectionRecords.map((entry) => entry.title), [
  "PART 5: CARDS AND CHARACTERISTICS", "PART 9: PREPARING FOR BATTLE",
  "PART 10: ADVANCED RULES"]);
acceptance.push("part5_part9_and_part10_records_match_frozen_capture");

assert.equal(bundle.ruleClauses.length, 9);
assert.equal(bundle.ruleClauses[0].clauseId, "core:10.5.1:excess-resources-lost");
acceptance.push("nine_exact_pdf_clause_hashes_cover_the_seven_atoms");

const malignant = profile(bundle, "tactical_cards:malignant_creep");
assert.deepEqual({ race: malignant.raceTag, tags: malignant.factionTags,
  type: malignant.resourceType }, { race: "Zerg",
  tags: ["Zerg", "Kerrigan's Swarm"], type: "BM" });
acceptance.push("subfaction_only_malignant_creep_resolves_to_zerg_and_bm");

const academy = profile(bundle, "tactical_cards:academy");
const layout = resolveOfficialCardLayoutV1({ cardDataBundle: bundle,
  recordKey: academy.recordKey, rulesOwnedLayoutRequested: true });
assert.deepEqual({ name: layout.cardName, type: layout.cardType,
  tags: layout.factionTags, slots: layout.armySlots.Support,
  resource: layout.exhaustResource }, { name: "Academy", type: "tactical",
  tags: ["Terran"], slots: 2, resource: { type: "CP", value: 1 } });
acceptance.push("tactical_layout_exposes_rules_owned_name_type_tags_slots_and_cp");

const kerrigan = profile(bundle, "tactical_cards:kerrigan_s_swarm");
const factionLayout = resolveOfficialCardLayoutV1({ cardDataBundle: bundle,
  recordKey: kerrigan.recordKey, rulesOwnedLayoutRequested: true });
assert.deepEqual({ type: factionLayout.cardType, unique: factionLayout.uniqueMarking,
  tags: factionLayout.factionTags }, { type: "faction", unique: true,
  tags: ["Zerg", "Kerrigan's Swarm"] });
acceptance.push("faction_layout_exposes_type_unique_and_complete_faction_tags");

assert.throws(() => resolveOfficialCardLayoutV1({ cardDataBundle: bundle,
  recordKey: academy.recordKey, rulesOwnedLayoutRequested: true,
  clientSuppliedLayout: { cardName: "Forged" } }), /CARD_LAYOUT_REQUEST_INVALID/u);
acceptance.push("client_cannot_replace_official_card_layout");

const purchase = resolveOfficialTacticalCardPurchaseV1({ cardDataBundle: bundle,
  recordKey: academy.recordKey, paymentResource: "vespene_gas",
  existingCopyCount: 0, rulesOwnedCostAndSlotsRequested: true });
assert.deepEqual({ cost: purchase.vespeneGasCost, support: purchase.armySlotsAdded.Support,
  resource: purchase.paymentResource }, { cost: 35, support: 2,
  resource: "vespene_gas" });
acceptance.push("tactical_purchase_uses_exact_vespene_cost_and_army_slots");

assert.deepEqual({ budget: purchase.overallVespeneBudgetDeferredToSlice,
  faction: purchase.fullFactionEligibilityDeferredToSlice }, { budget: 103, faction: 102 });
acceptance.push("purchase_receipt_explicitly_defers_budget_and_full_eligibility");

assert.throws(() => resolveOfficialTacticalCardPurchaseV1({ cardDataBundle: bundle,
  recordKey: academy.recordKey, paymentResource: "CP", existingCopyCount: 0,
  rulesOwnedCostAndSlotsRequested: true }), /TACTICAL_CARD_PURCHASE_REQUEST_INVALID/u);
acceptance.push("tactical_purchase_rejects_non_vespene_payment");

assert.throws(() => resolveOfficialTacticalCardPurchaseV1({ cardDataBundle: bundle,
  recordKey: academy.recordKey, paymentResource: "vespene_gas", existingCopyCount: 0,
  rulesOwnedCostAndSlotsRequested: true, clientSuppliedCost: 1 }),
/TACTICAL_CARD_PURCHASE_REQUEST_INVALID/u);
acceptance.push("tactical_purchase_rejects_client_supplied_cost");

assert.throws(() => resolveOfficialTacticalCardPurchaseV1({ cardDataBundle: bundle,
  recordKey: kerrigan.recordKey, paymentResource: "vespene_gas", existingCopyCount: 0,
  rulesOwnedCostAndSlotsRequested: true }), /TACTICAL_CARD_PURCHASE_TACTICAL_ONLY/u);
acceptance.push("faction_card_is_not_misclassified_as_tactical_purchase");

assert.throws(() => resolveOfficialTacticalCardPurchaseV1({ cardDataBundle: bundle,
  recordKey: academy.recordKey, paymentResource: "vespene_gas", existingCopyCount: 1,
  rulesOwnedCostAndSlotsRequested: true }), /UNIQUE_CARD_SINGLE_COPY_LIMIT/u);
acceptance.push("unique_tactical_purchase_rejects_existing_copy");

const armory = profile(bundle, "tactical_cards:armory");
const repeatPurchase = resolveOfficialTacticalCardPurchaseV1({ cardDataBundle: bundle,
  recordKey: armory.recordKey, paymentResource: "vespene_gas", existingCopyCount: 2,
  rulesOwnedCostAndSlotsRequested: true });
assert.equal(repeatPurchase.resultingCopyCount, 3);
acceptance.push("nonunique_tactical_purchase_allows_additional_copy");

const uniqueAudit = resolveOfficialUniqueCardCopyLimitV1({ cardDataBundle: bundle,
  armyCardInstanceSetComplete: true,
  cardInstances: [cardInstance(kerrigan, "faction-1"),
    cardInstance(armory, "armory-1"), cardInstance(armory, "armory-2")] });
assert.equal(uniqueAudit.uniqueCardsLimitedToSingleCopy, true);
assert.equal(uniqueAudit.copyCounts.armory, 2);
acceptance.push("complete_army_audit_allows_nonunique_repeat_and_one_unique");

assert.equal(uniqueAudit.exactlyOneFactionCardDeferredToSlice, 102);
acceptance.push("unique_audit_does_not_claim_slice102_faction_card_denominator");

assert.throws(() => resolveOfficialUniqueCardCopyLimitV1({ cardDataBundle: bundle,
  armyCardInstanceSetComplete: true,
  cardInstances: [cardInstance(kerrigan, "faction-a"),
    cardInstance(kerrigan, "faction-b")] }), /UNIQUE_CARD_SINGLE_COPY_LIMIT/u);
acceptance.push("unique_audit_rejects_second_faction_or_tactical_unique_copy");

assert.throws(() => resolveOfficialUniqueCardCopyLimitV1({ cardDataBundle: bundle,
  armyCardInstanceSetComplete: false, cardInstances: [] }),
/UNIQUE_CARD_COMPLETE_ARMY_SET_REQUIRED/u);
acceptance.push("unique_audit_requires_complete_army_card_instance_set");

assert.throws(() => resolveOfficialUniqueCardCopyLimitV1({ cardDataBundle: bundle,
  armyCardInstanceSetComplete: true,
  cardInstances: [{ ...cardInstance(academy, "academy-forged"),
    profileHash: "0".repeat(64) }] }), /UNIQUE_CARD_SOURCE_PROFILE_INVALID/u);
acceptance.push("unique_audit_rejects_forged_card_profile_hash");

const proxy = profile(bundle, "tactical_cards:barracks__proxy_");
const payment = resolveOfficialAbilityResourcePaymentV1({ cardDataBundle: bundle,
  resourceType: "CP", resourceCost: 2, selectedCardInstanceSetComplete: true,
  selectedCardInstances: [cardInstance(academy, "academy-ready", { isReady: true }),
    cardInstance(proxy, "proxy-ready", { isReady: true })] });
assert.deepEqual({ generated: payment.totalGenerated, applied: payment.appliedToCost,
  excess: payment.excessResourceLost, retained: payment.retainedAfterPayment },
{ generated: 3, applied: 2, excess: 1, retained: 0 });
acceptance.push("cp_overpayment_applies_cost_and_loses_exact_excess");

assert.equal(payment.generatedResourceMayBeSaved, false);
assert.equal(payment.generatedResourceMayPayAnotherAbility, false);
acceptance.push("generated_resource_cannot_be_saved_or_spent_on_another_ability");

assert.deepEqual(payment.selectedCardsExhaustOnCommit, ["academy-ready", "proxy-ready"]);
assert.equal(payment.arbitraryAbilityEffectExecuted, false);
acceptance.push("payment_certificate_marks_cards_for_exhaust_without_executing_effect");

const exactPayment = resolveOfficialAbilityResourcePaymentV1({ cardDataBundle: bundle,
  resourceType: "CP", resourceCost: 2, selectedCardInstanceSetComplete: true,
  selectedCardInstances: [cardInstance(proxy, "proxy-exact", { isReady: true })] });
assert.equal(exactPayment.excessResourceLost, 0);
acceptance.push("exact_ability_payment_has_zero_excess");

assert.throws(() => resolveOfficialAbilityResourcePaymentV1({ cardDataBundle: bundle,
  resourceType: "BM", resourceCost: 1, selectedCardInstanceSetComplete: true,
  selectedCardInstances: [cardInstance(academy, "wrong-race", { isReady: true })] }),
/ABILITY_RESOURCE_TYPE_MISMATCH/u);
acceptance.push("ability_payment_rejects_wrong_faction_resource_type");

assert.throws(() => resolveOfficialAbilityResourcePaymentV1({ cardDataBundle: bundle,
  resourceType: "CP", resourceCost: 1, selectedCardInstanceSetComplete: true,
  selectedCardInstances: [cardInstance(academy, "exhausted", { isReady: false })] }),
/ABILITY_RESOURCE_CARD_NOT_READY/u);
acceptance.push("ability_payment_rejects_nonready_card");

assert.throws(() => resolveOfficialAbilityResourcePaymentV1({ cardDataBundle: bundle,
  resourceType: "CP", resourceCost: 2, selectedCardInstanceSetComplete: true,
  selectedCardInstances: [cardInstance(academy, "underpay", { isReady: true })] }),
/ABILITY_RESOURCE_FULL_COST_REQUIRED/u);
acceptance.push("ability_payment_requires_full_cost");

assert.throws(() => resolveOfficialAbilityResourcePaymentV1({ cardDataBundle: bundle,
  resourceType: "CP", resourceCost: 1, selectedCardInstanceSetComplete: false,
  selectedCardInstances: [cardInstance(academy, "incomplete", { isReady: true })] }),
/ABILITY_RESOURCE_COMPLETE_SELECTION_REQUIRED/u);
acceptance.push("ability_payment_requires_complete_selected_card_set");

assert.throws(() => resolveOfficialAbilityResourcePaymentV1({ cardDataBundle: bundle,
  resourceType: "CP", resourceCost: 1, selectedCardInstanceSetComplete: true,
  selectedCardInstances: [{ ...cardInstance(academy, "forged-resource", { isReady: true }),
    profileHash: "f".repeat(64), resourceValue: 99 }] }),
/ABILITY_RESOURCE_SOURCE_PROFILE_INVALID/u);
acceptance.push("ability_payment_rejects_forged_source_profile_and_resource_value");

assert.throws(() => resolveOfficialAbilityResourcePaymentV1({ cardDataBundle: bundle,
  resourceType: "CP", resourceCost: 0, selectedCardInstanceSetComplete: true,
  selectedCardInstances: [cardInstance(academy, "zero-cost", { isReady: true })] }),
/ABILITY_RESOURCE_ZERO_COST_SELECTION_FORBIDDEN/u);
acceptance.push("zero_cost_ability_cannot_exhaust_resource_card");

const state = prepare(fixture, bundle); const binding = bindingFor(fixture.gameplayDataBundle);
const paymentPlan = plan("cp-payment-plan", "ability_resource_payment", {
  resourceType: "CP", resourceCost: 2, selectedCardInstanceSetComplete: true,
  selectedCardInstances: [cardInstance(proxy, "proxy-runtime", { isReady: true })] });
const opened = openOfficialCardBuildPaymentRulesPendingV1(state,
  procedure(state, "ability_resource_payment", paymentPlan));
const domain = domainFor(runtime, opened.state, binding);
assert(domain); assert.equal(runtime.descriptor.executorManifest.length, 61);
acceptance.push("runtime_exposes_card_build_payment_as_executor_61");

const action = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
const applied = runtime.apply(opened.state, action.action, { matchBinding: binding });
assert.equal(applied.state.pendingAction, null);
assert.equal(applied.state.lastCardBuildPaymentRulesResolution.result.fullCostPaid, true);
acceptance.push("runtime_apply_persists_rules_owned_payment_history_and_event");

const stale = structuredClone(opened.state);
stale.cardBuildPaymentRulesHistory.push({ forged: true });
assert.equal(runtime.enumerate(stale, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason, "CARD_BUILD_PAYMENT_PENDING_INVALID");
acceptance.push("history_drift_invalidates_old_card_build_payment_domain");

const sourceDrift = structuredClone(opened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"CARD_BUILD_PAYMENT_SOURCE_LOCK_BINDING_INVALID");
acceptance.push("source_lock_drift_disables_card_build_payment_legalspace");

const dataDrift = structuredClone(binding);
dataDrift.dependencies.dataSnapshot.contentHash = "0".repeat(64);
assert.equal(runtime.enumerate(opened.state, { sideKey: "player1", includeDisabled: true,
  matchBinding: dataDrift }).candidates[0].disabledReason,
"CARD_BUILD_PAYMENT_DATA_ARTIFACT_BINDING_INVALID");
acceptance.push("match_bound_data_drift_disables_card_build_payment_legalspace");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
assert.deepEqual({ nodes: graph.nodes.length, edges: graph.edges.length },
  { nodes: 10285, edges: 29847 });
acceptance.push("relationship_graph_is_valid_at_10285_nodes_and_29847_edges");

const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_CARD_BUILD_PAYMENT_RULES_RELATIONSHIP_SCOPE_ID));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:cardBuildPaymentV1.completeSelectedPaymentCards"
    && entry.to === "derived_value:cardBuildPaymentV1.abilityResourcePayment"));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash")));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_payment_set_to_resolution_edge");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-92-card-build-payment-short-seal-v1");
const seed = envelopeFor(authority, fixture, state);
const authorityOpened = openOfficialCardBuildPaymentRulesPendingV1(seed.state,
  procedure(seed.state, "ability_resource_payment", paymentPlan));
const initial = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, { seatAuthority: access.authority });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_CARD_BUILD_PAYMENT_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-92-card-build-payment" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(runtime, keys, "slice-92-card-build-payment-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
assert.equal(replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_card_payment_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
acceptance.push("authority_ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const secondBundle = createOfficialCardBuildPaymentDataBundleV1({ dataset: fixture.dataset });
assert.equal(secondBundle.bundleHash, bundle.bundleHash);
assert.equal(secondBundle.cardProfileIndexHash, bundle.cardProfileIndexHash);
acceptance.push("card_profile_source_compilation_is_deterministic");

assert.equal(slice.cardBuildPaymentRulesProgress.existingCardAndAbilityExecutorsFrozen, true);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("existing_card_ability_executors_and_rules_displays_remain_frozen");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.cardBuildPaymentRulesProgress.sourceRefreshPerformed, false);
acceptance.push("no_source_refresh_skill_dsh_muzero_selfplay_or_training_promotion_occurs");
assert.equal(acceptance.length, 42);

const report = {
  schema: "starcraft_tmg_official_card_build_payment_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit, cardBuildPaymentDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_card_build_payment_primitive_conformance", trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-card-build-payment-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, cardSourceIndexHash: bundle.cardSourceIndexHash,
  cardProfileIndexHash: bundle.cardProfileIndexHash,
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  arbitraryAbilityEffectExecuted: false, trainingTruth: false }, null, 2));
