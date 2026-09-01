import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_RESPAWN_MORPH_RULES_NEW_ATOM_IDS,
  OFFICIAL_RESPAWN_MORPH_RULES_PARAMETER_KIND,
  openOfficialRespawnMorphRulesPendingV1,
} from "../packages/rule-atoms/official-respawn-morph-rules-executor-v1.mjs";
import {
  resolveOfficialMorphAvailabilityV1,
  resolveOfficialRespawnModelsV1,
} from "../packages/rule-atoms/official-respawn-morph-rules-kernel-v1.mjs";
import { OFFICIAL_RESPAWN_MORPH_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-respawn-morph-rules-relationship-contract-v1.mjs";
import {
  createOfficialRespawnMorphRulesRuleSliceV1,
  verifyOfficialRespawnMorphRulesRuleSliceV1,
} from "../packages/rule-atoms/official-respawn-morph-rules-rule-slice-v1.mjs";
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { getOfficialCurrentProductRecord } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { getOfficialModelBaseGeometryProfileV1 } from
  "../packages/source-data/official-model-base-geometry-data-bundle-v1.mjs";
import {
  createOfficialRespawnMorphDataBundleV1,
  verifyOfficialRespawnMorphDataBundleV1,
} from "../packages/source-data/official-respawn-morph-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-summon-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(...names) { acceptance.push(...names); }
function rejects(code, operation) {
  assert.throws(operation, (error) => String(error?.message || error).startsWith(code));
}

const slice = createOfficialRespawnMorphRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialRespawnMorphRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 769,
  newlyExecutableRuleAtoms: 9, reviewRequiredRuleAtoms: 143,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 769,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 70, missingStateContractExecutors: 0 });
accept("01_slice101_promotes_exact_9_route_atoms_to_769_executable");
const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 101);
assert.deepEqual(assignment.atomIds, [...OFFICIAL_RESPAWN_MORPH_RULES_NEW_ATOM_IDS]);
assert.deepEqual([assignment.executableAfter, assignment.reviewRequiredAfter], [769, 143]);
accept("02_route_v2_exact_slice101_atom_identity_and_counts_match");
const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 70);
accept("03_runtime_exposes_respawn_morph_as_executor_70");

const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialRespawnMorphDataBundleV1({ dataset: fixture.dataset });
assert.equal(verifyOfficialRespawnMorphDataBundleV1(bundle), true);
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_RESPAWN_MORPH_RULES_NEW_ATOM_IDS]);
assert.equal(bundle.ruleSectionRecord.recordKey,
  "rules_sections:FuahgilWtc8nccVSp2Vv");
assert.equal(bundle.ruleClauses.every((entry) => (
  entry.sourceTextHashes.every((hash) => /^[a-f0-9]{64}$/u.test(hash))
    && /^[a-f0-9]{64}$/u.test(entry.candidateSequenceHash)
)), true);
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("04_respawn_morph_bundle_is_content_hash_verified",
  "05_nine_exact_core_clause_boundaries_cover_route_atoms",
  "06_part11_rule_record_identity_is_pinned",
  "07_each_clause_binds_source_text_and_candidate_sequence_hashes",
  "08_source_lock_remains_offline_without_repository_fallback");

assert.equal(bundle.currentRespawnCarriers.length, 1);
assert.equal(bundle.currentRespawnCarriers[0].unitName, "Swarmling (Zergling)");
assert.equal(bundle.currentRespawnCarriers[0].definitionName,
  "Zergling Reconstitution");
assert.equal(bundle.currentRespawnCarriers[0].baseRespawnValue, 2);
assert.equal(bundle.currentRespawnCarriers[0].onCreepRespawnValue, 3);
assert.equal(bundle.currentMorphCarriers.length, 0);
accept("09_current_respawn_carrier_denominator_is_exactly_one",
  "10_zergling_reconstitution_is_the_exact_current_carrier",
  "11_printed_respawn_value_is_two",
  "12_on_creep_printed_respawn_value_is_three",
  "13_current_morph_carrier_denominator_is_exactly_zero");
assert.deepEqual(bundle.returnRuleRegistry.destroyedUnitReturnAtomIds, []);
assert.equal(bundle.returnRuleRegistry.respawnRequiresAtLeastOneExistingModel, true);
assert.equal(bundle.returnRuleRegistry.morphCreatesNewUnitInsteadOfReturningDestroyedUnit,
  true);
accept("14_respawn_registers_model_return_not_destroyed_unit_return",
  "15_fully_destroyed_unit_stays_forbidden_without_an_existing_model",
  "16_morph_is_new_unit_creation_not_destroyed_unit_return");

const record = getOfficialCurrentProductRecord(fixture.dataset,
  "army_units:swarmling__zergling_");
const profile = getOfficialModelBaseGeometryProfileV1(
  bundle.modelBaseGeometryDataBundle, record.recordKey,
);
function swarmling(input = {}) {
  const alive = Number(input.alive ?? 4);
  const positions = [[10, 10], [10, 13], [10, 16], [10, 19], [13, 19], [16, 19],
    [19, 19], [22, 19], [25, 19], [28, 19], [31, 19], [34, 19],
    [34, 16], [34, 13], [34, 10], [31, 10], [28, 10], [25, 10]];
  return { id: "swarmling", name: record.payload.name, sideKey: "player1",
    officialUnitRecordKey: record.recordKey, sourceRecordHash: record.sourceRecordHash,
    officialPayloadHash: record.payloadHash, currentModels: alive, maxModels: 18,
    currentSupply: alive <= 6 ? 0 : 1,
    destroyedModelIds: positions.slice(alive).map((_, index) => `z-${alive + index + 1}`),
    isOnField: true, isInReserves: false, isDestroyed: false,
    derivedKeywords: input.onCreep ? ["on_creep"] : [],
    combatTags: ["biological", "light", "ground"], statuses: [],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: positions.map(([x, y], index) => ({ id: `z-${index + 1}`,
      xInches: x, yInches: y, baseShape: profile.baseShape,
      baseWidthInches: profile.baseWidthMilliInches / 1000,
      baseDepthInches: profile.baseDepthMilliInches / 1000,
      baseRotationDegrees: 0, elevation: "ground", supportTerrainIds: [],
      adjacentAccessPointIds: [], isOnField: index < alive,
      isDestroyed: index >= alive })) };
}
function enemy() {
  const marine = getOfficialCurrentProductRecord(fixture.dataset, "army_units:marine");
  const marineProfile = getOfficialModelBaseGeometryProfileV1(
    bundle.modelBaseGeometryDataBundle, marine.recordKey,
  );
  return { id: "enemy", name: marine.payload.name, sideKey: "player2",
    officialUnitRecordKey: marine.recordKey, sourceRecordHash: marine.sourceRecordHash,
    officialPayloadHash: marine.payloadHash, currentModels: 1, maxModels: 1,
    currentSupply: 1, destroyedModelIds: [], isOnField: true,
    isInReserves: false, isDestroyed: false, combatTags: ["ground"],
    models: [{ id: "enemy-1", xInches: 40, yInches: 20,
      baseShape: marineProfile.baseShape,
      baseWidthInches: marineProfile.baseWidthMilliInches / 1000,
      baseDepthInches: marineProfile.baseDepthMilliInches / 1000,
      baseRotationDegrees: 0, elevation: "ground", supportTerrainIds: [],
      adjacentAccessPointIds: [], isOnField: true, isDestroyed: false }] };
}
function stateFor(input = {}) {
  const state = fixture.battleState({ round: 2, activeSideKey: "player1" });
  state.phase = "movement"; state.rulesProcedureMode = true;
  state.officialRespawnMorphDataBundle = bundle;
  state.respawnMorphRulesHistory = []; state.pieces = [swarmling(input), enemy()];
  state.log = [];
  return state;
}
function witness(state) {
  const carrier = bundle.currentRespawnCarriers[0];
  const event = { type: "special_ability_resolved", sideKey: "player1",
    pieceId: "swarmling", abilityName: carrier.definitionName,
    abilityDefinitionHash: carrier.definitionHash, effectKeyword: "RESPAWN",
    baseRespawnValue: 2, onCreepRespawnValue: 3 };
  state.log.push({ type: "fixture_witness", events: [event] });
  return hashStarcraftTmgContract(event);
}
const diameter = profile.baseWidthMilliInches;
function placement(returned = ["z-5", "z-6"]) {
  const points = [[10000 + diameter, 10000], [10000 - diameter, 10000],
    [10000, 10000 - diameter]];
  return { returnedModelIds: returned,
    placements: returned.map((modelId, index) => ({ modelId,
      contactModelId: "z-1", xMilliInches: points[index][0],
      yMilliInches: points[index][1], rotationDegrees: 0 })) };
}
function kernel(state, extra = {}) {
  return { state, respawnMorphDataBundle: bundle,
    procedureKind: "respawn_models", pieceId: "swarmling",
    rulesOwnedRespawnRequested: true, ...extra };
}

let state = stateFor(); let triggerHash = witness(state);
let resolved = resolveOfficialRespawnModelsV1(kernel(state, {
  triggerEventHash: triggerHash, placementPlan: placement(),
}));
assert.equal(resolved.respawnLimit, 2);
assert.deepEqual(resolved.returnedModelIds, ["z-5", "z-6"]);
assert.deepEqual([resolved.currentModelsBefore, resolved.currentModelsAfter], [4, 6]);
assert.deepEqual([resolved.currentSupplyBefore, resolved.currentSupplyAfter], [0, 0]);
assert.equal(resolved.placementRows.every((entry) => (
  /^[a-f0-9]{64}$/u.test(entry.geometryResultHash)
    && /^[a-f0-9]{64}$/u.test(entry.contactMeasurementHash)
)), true);
accept("17_respawn_returns_up_to_printed_two_destroyed_models",
  "18_returned_model_identity_denominator_is_explicit",
  "19_current_model_count_is_rules_derived_before_and_after",
  "20_respawn_preserves_the_current_supply_bracket",
  "21_each_returned_model_has_exact_geometry_and_contact_receipts");

state = stateFor({ alive: 3, onCreep: true }); triggerHash = witness(state);
resolved = resolveOfficialRespawnModelsV1(kernel(state, {
  triggerEventHash: triggerHash, placementPlan: placement(["z-4", "z-5", "z-6"]),
}));
assert.equal(resolved.onCreep, true);
assert.equal(resolved.respawnLimit, 3);
assert.equal(resolved.returnedModelIds.length, 3);
accept("22_on_creep_is_read_from_the_rules_derived_keyword",
  "23_on_creep_raises_the_exact_limit_to_three",
  "24_three_models_can_return_without_crossing_the_zero_supply_bracket");

state = stateFor({ alive: 6 }); triggerHash = witness(state);
rejects("RESPAWN_SUPPLY_BRACKET_INCREASE", () => resolveOfficialRespawnModelsV1(
  kernel(state, { triggerEventHash: triggerHash, placementPlan: placement(["z-7"]) }),
));
accept("25_seven_models_would_cross_the_supply_bracket_and_fail_closed");
state = stateFor(); state.pieces[0].currentSupply = 1; triggerHash = witness(state);
rejects("RESPAWN_CURRENT_SUPPLY_STATE_DRIFT", () => resolveOfficialRespawnModelsV1(
  kernel(state, { triggerEventHash: triggerHash, placementPlan: placement() }),
));
accept("26_client_or_stale_current_supply_drift_fails_closed");
state = stateFor(); triggerHash = witness(state);
const far = placement(["z-5"]); far.placements[0].xMilliInches = 20000;
rejects("RESPAWN_EXISTING_MODEL_CONTACT_REQUIRED", () => resolveOfficialRespawnModelsV1(
  kernel(state, { triggerEventHash: triggerHash, placementPlan: far }),
));
accept("27_returned_model_must_contact_an_existing_model");
state = stateFor(); state.pieces[1].models[0].xInches = 12.4;
state.pieces[1].models[0].yInches = 10; triggerHash = witness(state);
rejects("RESPAWN_MODEL_CANNOT_BE_SET_LEGALLY", () => resolveOfficialRespawnModelsV1(
  kernel(state, { triggerEventHash: triggerHash, placementPlan: placement(["z-5"]) }),
));
accept("28_returned_model_cannot_enter_enemy_engagement_range");
state = stateFor(); triggerHash = witness(state);
const overlap = placement(["z-5"]); overlap.placements[0].xMilliInches = 10000;
rejects("RESPAWN_MODEL_CANNOT_BE_SET_LEGALLY", () => resolveOfficialRespawnModelsV1(
  kernel(state, { triggerEventHash: triggerHash, placementPlan: overlap }),
));
accept("29_returned_model_cannot_overlap_an_existing_model");
state = stateFor(); triggerHash = witness(state);
const forged = structuredClone(state.log[0].events[0]); forged.abilityName = "Invented";
state.log = [{ type: "fixture_witness", events: [forged] }];
rejects("RESPAWN_EFFECT_TRIGGER_REQUIRED", () => resolveOfficialRespawnModelsV1(
  kernel(state, { triggerEventHash: triggerHash, placementPlan: placement() }),
));
accept("30_forged_effect_event_hash_fails_closed");
state = stateFor(); triggerHash = witness(state);
rejects("RESPAWN_PLACEMENT_PLAN_INVALID", () => resolveOfficialRespawnModelsV1(
  kernel(state, { triggerEventHash: triggerHash,
    placementPlan: placement(["z-5", "z-5"]) }),
));
accept("31_duplicate_returned_model_identity_fails_closed");
state = stateFor(); triggerHash = witness(state);
rejects("RESPAWN_PLACEMENT_PLAN_INVALID", () => resolveOfficialRespawnModelsV1(
  kernel(state, { triggerEventHash: triggerHash,
    placementPlan: placement(["z-1"]) }),
));
accept("32_live_model_cannot_be_named_as_a_respawn_candidate");
state = stateFor(); state.pieces[0].isDestroyed = true;
state.pieces[0].currentModels = 0; triggerHash = witness(state);
rejects("RESPAWN_REQUEST_INVALID", () => resolveOfficialRespawnModelsV1(
  kernel(state, { triggerEventHash: triggerHash, placementPlan: placement([]) }),
));
accept("33_fully_destroyed_unit_cannot_use_respawn");

const morph = resolveOfficialMorphAvailabilityV1({ procedureKind: "morph_availability",
  respawnMorphDataBundle: bundle, rulesOwnedAvailabilityRequested: true });
assert.equal(morph.currentCarrierCount, 0);
assert.equal(morph.actionAvailable, false);
assert.equal(morph.coreContractExecutable, true);
assert.equal(morph.coreContract.sufficientAvailableSupplyRequired, true);
assert.equal(morph.coreContract.newModelBaseToBaseWithActiveUnitRequired, true);
assert.equal(morph.coreContract.removeExactlyPrintedXSourceModels, true);
assert.equal(morph.coreContract.newModelFormsNewUnit, true);
assert.equal(morph.coreContract.enemySeparationMilliInches, 1000);
assert.equal(morph.coreContract.activationLockedForRemainderOfRound, true);
accept("34_morph_current_carrier_query_returns_zero",
  "35_zero_carrier_query_exposes_no_current_action",
  "36_generic_morph_core_contract_remains_executable",
  "37_morph_requires_available_supply",
  "38_morph_requires_new_model_contact_with_active_unit",
  "39_morph_removes_exactly_printed_x_source_models",
  "40_morphed_model_forms_a_new_unit",
  "41_morphed_unit_keeps_one_inch_enemy_separation",
  "42_morphed_unit_is_activation_locked_for_the_round");
rejects("MORPH_AVAILABILITY_REQUEST_INVALID", () => resolveOfficialMorphAvailabilityV1({
  procedureKind: "morph_availability", respawnMorphDataBundle: bundle,
  rulesOwnedAvailabilityRequested: true, clientSuppliedCarrier: "invented",
}));
accept("43_client_cannot_invent_a_morph_carrier");

function procedure(stateInput, procedureKind, planInput) {
  return { procedureKind, sideKey: "player1", candidatePlansComplete: true,
    rulesDenominatorComplete: true, candidatePlans: [{ planId: `${procedureKind}-plan`,
      procedureKind, rulesOwnedInputsComplete: true, clientSuppliedResult: false,
      input: { state: stateInput, ...planInput } }] };
}
state = stateFor(); triggerHash = witness(state);
const opened = openOfficialRespawnMorphRulesPendingV1(state, procedure(state,
  "respawn_models", { procedureKind: "respawn_models", pieceId: "swarmling",
    triggerEventHash: triggerHash, placementPlan: placement(),
    rulesOwnedRespawnRequested: true }));
const space = runtime.enumerate(opened.state, { sideKey: "player1" });
const domain = space.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_RESPAWN_MORPH_RULES_PARAMETER_KIND));
const instantiated = runtime.instantiate(opened.state, domain,
  { choiceId: domain.constraints.choices[0].choiceId });
const applied = runtime.apply(opened.state, instantiated.action);
assert.equal(applied.state.pieces.find((entry) => entry.id === "swarmling").currentModels, 6);
assert.equal(applied.state.respawnMorphRulesHistory.length, 1);
assert.equal(audit.graph.coverageScopes.some((entry) => (
  entry.scopeId === OFFICIAL_RESPAWN_MORPH_RULES_RELATIONSHIP_SCOPE_ID)), true);
accept("44_runtime_exposes_hash_bound_respawn_morph_parameter_domain",
  "45_runtime_apply_commits_only_the_rules_owned_respawn_mutation",
  "46_runtime_appends_an_expert_readable_respawn_morph_history",
  "47_relationship_graph_covers_new_executor_and_frozen_consumers");

function engineFor(keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    cryptoOptions: { keyId: "ticket-11-slice-101-respawn-morph",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 101 Respawn/Morph rules.";
function envelopeFor(engine, stateInput) {
  return engine.createEnvelope({ roomId: "official-slice-101-respawn-morph-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-respawn-morph-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "respawn_morph_base_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-101-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-101-action-schema-v39",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v39" } },
    }, state: stateInput });
}
function registerReplay(engine, initial) {
  const entries = { sourceSnapshot: fixture.snapshot,
    dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: { kind: "geometry-artifact",
      geometryVersion: "respawn_morph_base_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v39" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const keys = generateKeyPairSync("ed25519");
const authority = engineFor(keys, "slice-101-respawn-morph-short-seal-v1");
state = stateFor();
const seed = envelopeFor(authority, state);
const authorityOpened = openOfficialRespawnMorphRulesPendingV1(seed.state,
  procedure(seed.state, "morph_availability", {
    procedureKind: "morph_availability", rulesOwnedAvailabilityRequested: true }));
const initialEnvelope = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initialEnvelope);
const seat = authority.issueSeatAuthority({ grantId: "slice-101-respawn-morph-grant",
  roomId: initialEnvelope.roomId, matchBindingHash: initialEnvelope.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice-101-respawn-morph-session", leaseFence: 1,
  issuedAtRoomRevision: initialEnvelope.stateRevision });
const authoritySpace = authority.legalSpace(initialEnvelope, { seatAuthority: seat });
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_RESPAWN_MORPH_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initialEnvelope, seatAuthority: seat,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
const confirmation = authority.confirmPreview({ envelope: initialEnvelope,
  preview: preview.preview, seatAuthority: seat });
const authoritativeApplied = authority.apply({ envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: seat, controlLease: lease,
  idempotencyKey: "slice-101-respawn-morph" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(keys, "slice-101-respawn-morph-rotated-seal-v2");
registerReplay(replay, initialEnvelope);
assert.equal(replay.replay({ initialEnvelope,
  journal: [authoritativeApplied.receipt] }).ok, true);
accept("48_authority_preview_confirm_apply_uses_ed25519_and_survives_hmac_rotation");
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_respawn_morph_event" });
assert.equal(replay.replay({ initialEnvelope, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("49_ed25519_replay_rejects_tampered_respawn_morph_receipt");
assert.equal(previousReport.slice.sliceHash,
  "2005882bda4e1b8872bdf1f544b08a75d73c94ec1b0f106d431a5c647e860227");
accept("50_slice100_runtime_and_historical_rules_display_remain_frozen");

assert.equal(acceptance.length, 50);
const graph = audit.graph; const graphAudit = auditRuleRelationshipGraphV1(graph);
const report = {
  schema: "starcraft_tmg_official_respawn_morph_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit, respawnMorphDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  boundaries: { currentRespawnCarrierCount: 1, currentMorphCarrierCount: 0,
    modelReturnRegistered: true, destroyedUnitReturnRegistered: false,
    existingConsumersFrozen: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_respawn_morph_rules_state_transition_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-respawn-morph-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, dataBundleHash: bundle.bundleHash,
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
