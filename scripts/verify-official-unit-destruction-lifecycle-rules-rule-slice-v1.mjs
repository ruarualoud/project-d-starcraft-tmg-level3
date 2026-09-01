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
import { createOfficialRemainingRuleAtomRouteV2 } from
  "../packages/rule-atoms/official-remaining-rule-atom-route-v2.mjs";
import {
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_NEW_ATOM_IDS,
  OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PARAMETER_KIND,
  openOfficialUnitDestructionLifecycleRulesPendingV1,
} from "../packages/rule-atoms/official-unit-destruction-lifecycle-rules-executor-v1.mjs";
import {
  resolveOfficialDestroyedUnitReturnRestrictionV1,
  resolveOfficialUnitDestructionSettlementV1,
} from "../packages/rule-atoms/official-unit-destruction-lifecycle-rules-kernel-v1.mjs";
import { OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-unit-destruction-lifecycle-rules-relationship-contract-v1.mjs";
import {
  createOfficialUnitDestructionLifecycleRulesRuleSliceV1,
  verifyOfficialUnitDestructionLifecycleRulesRuleSliceV1,
} from "../packages/rule-atoms/official-unit-destruction-lifecycle-rules-rule-slice-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import {
  createOfficialUnitDestructionLifecycleDataBundleV1,
  verifyOfficialUnitDestructionLifecycleDataBundleV1,
} from "../packages/source-data/official-unit-destruction-lifecycle-data-bundle-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-reserve-lifecycle-rules-rule-slice-v1-report.json"), "utf8"));
const routeBaseReport = JSON.parse(await readFile(path.join(OUTPUT_DIR,
  "official-elevation-effective-size-rules-rule-slice-v1-report.json"), "utf8"));
const acceptance = [];
function accept(name) { acceptance.push(name); }

const slice = createOfficialUnitDestructionLifecycleRulesRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialUnitDestructionLifecycleRulesRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 717,
  newlyExecutableRuleAtoms: 5, reviewRequiredRuleAtoms: 195,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 717,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 66, missingStateContractExecutors: 0 });
accept("01_slice97_promotes_exact_5_route_atoms_to_717_executable");

const route = createOfficialRemainingRuleAtomRouteV2(routeBaseReport.slice.catalogue);
const assignment = route.assignments.find((entry) => entry.slice === 97);
assert.deepEqual(assignment.atomIds,
  [...OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_NEW_ATOM_IDS]);
assert.deepEqual({ executable: assignment.executableAfter,
  review: assignment.reviewRequiredAfter }, { executable: 717, review: 195 });
accept("02_route_v2_exact_slice97_atom_identity_and_counts_match");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executorManifest.length, 66);
accept("03_runtime_exposes_unit_destruction_lifecycle_as_executor_66");
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const bundle = createOfficialUnitDestructionLifecycleDataBundleV1({
  dataset: fixture.dataset,
});
assert.equal(verifyOfficialUnitDestructionLifecycleDataBundleV1(bundle), true);
accept("04_unit_destruction_bundle_is_content_hash_verified");
assert.deepEqual(bundle.ruleClauses.map((entry) => entry.atomId).sort(),
  [...OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_NEW_ATOM_IDS]);
accept("05_five_exact_part7_clause_boundaries_cover_five_route_atoms");
assert.equal(bundle.ruleSectionRecord.recordKey,
  "rules_sections:cB7X7UfOMHh3Wxn79ASF");
assert.equal(bundle.ruleSectionRecord.title, "PART 7: THE BATTLEFIELD");
accept("06_current_official_part7_record_identity_is_pinned");
assert.equal(bundle.ruleClauses.every((entry) => (
  entry.sourceTextHashes.every((hash) => /^[a-f0-9]{64}$/u.test(hash))
    && /^[a-f0-9]{64}$/u.test(entry.candidateSequenceHash)
)), true);
accept("07_each_clause_binds_exact_source_text_and_candidate_sequence_hash");
assert.equal(bundle.sourcePolicy.refreshDuringDevelopment, false);
assert.equal(bundle.sourcePolicy.repositoryFallbackAllowed, false);
accept("08_source_lock_remains_offline_without_refresh_or_repository_fallback");
assert.deepEqual(bundle.returnRuleRegistry.registeredAtomIds, []);
accept("09_positive_return_registry_is_explicitly_empty_until_slice101");

function positions(count, x, y) {
  return Array.from({ length: count }, (_, index) => ({
    xInches: x + (index % 3) * 1.5,
    yInches: y + Math.floor(index / 3) * 1.5,
  }));
}
function stateFor() {
  const state = fixture.battleState({ round: 2, activeSideKey: "player1",
    pieces: [
      { id: "p1-marine", sideKey: "player1", positions: positions(6, 5, 5) },
      { id: "p2-marine", sideKey: "player2", positions: positions(6, 30, 20) },
    ] });
  state.rulesProcedureMode = true;
  state.officialUnitDestructionLifecycleDataBundle = bundle;
  state.unitDestructionLifecycleHistory = [];
  const destroyed = state.pieces[1];
  destroyed.models.forEach((model) => {
    model.isDestroyed = true; model.isOnField = false;
  });
  destroyed.destroyedModelIds = destroyed.models.map((model) => model.id).sort();
  destroyed.currentModels = 0; destroyed.currentSupply = 0;
  destroyed.isDestroyed = true; destroyed.isOnField = false;
  destroyed.statuses = [{ id: "local-status" }];
  destroyed.conditions = [{ id: "local-condition" }];
  destroyed.combatEffects = [{ id: "local-combat" }];
  destroyed.timedEffects = [{ id: "local-timed" }];
  const survivor = state.pieces[0];
  survivor.statuses = [
    { id: "outward-stays", sourcePieceId: destroyed.id },
    { id: "outward-explicit-end", sourcePieceId: destroyed.id,
      endsWhenSourceDestroyed: true },
    { id: "unrelated", sourcePieceId: "other-source" },
  ];
  state.board.tokens.push(
    { id: "created-token", createdByPieceId: destroyed.id, stayInPlay: false },
    { id: "stay-token", createdByPieceId: destroyed.id, stayInPlay: true },
    { id: "foreign-token", createdByPieceId: survivor.id, stayInPlay: false },
  );
  state.board.effectMarkers.push(
    { id: "local-marker", affectedPieceId: destroyed.id },
    { id: "outward-marker", sourcePieceId: destroyed.id,
      affectedPieceId: survivor.id },
    { id: "explicit-end-marker", sourcePieceId: destroyed.id,
      affectedPieceId: survivor.id, endsWhenSourceDestroyed: true },
  );
  return state;
}
function kernel(state, extra = {}) {
  return { state, unitDestructionLifecycleDataBundle: bundle,
    rulesOwnedStateRequested: true, ...extra };
}
function procedure(state, procedureKind, extra = {}) {
  return { procedureKind, sideKey: state.activeSideKey,
    rulesDenominatorComplete: true, ...extra };
}
function bindingFor(gameplayDataBundle) {
  const dataHash = hashStarcraftTmgContract(gameplayDataBundle);
  return { bindingHash: "slice-97-unit-destruction-lifecycle-binding",
    dataSnapshotHash: dataHash,
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
    dependencies: { dataSnapshot: { contentHash: dataHash } } };
}
function domainFor(state, binding) {
  return runtime.enumerate(state, { sideKey: state.activeSideKey,
    includeDisabled: true, matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PARAMETER_KIND));
}
function applyProcedure(state, procedureKind, extra, binding) {
  const opened = openOfficialUnitDestructionLifecycleRulesPendingV1(state,
    procedure(state, procedureKind, extra));
  const domain = domainFor(opened.state, binding);
  assert(domain);
  const instantiated = runtime.instantiate(opened.state, domain,
    { choiceId: domain.constraints.choices[0].choiceId }, { matchBinding: binding });
  return { opened, domain, instantiated,
    applied: runtime.apply(opened.state, instantiated.action,
      { matchBinding: binding }) };
}

const state = stateFor();
const settlementInput = kernel(state, { procedureKind: "settle_unit_destruction",
  pieceId: "p2-marine", triggerReceiptHash: "b".repeat(64),
  triggerAuthority: "casualty_resolution" });
const settlement = resolveOfficialUnitDestructionSettlementV1(settlementInput);
assert.equal(settlement.lastModelFallen, true);
assert.equal(settlement.unitDestroyed, true);
accept("10_zero_live_models_and_complete_destroyed_model_ledger_trigger_unit_destruction");
assert.deepEqual(settlement.localEffectsEnded.map((entry) => entry.effectId).sort(),
  ["local-combat", "local-condition", "local-status", "local-timed"]);
accept("11_every_present_local_effect_and_condition_is_in_cleanup_denominator");
assert.equal(settlement.localEffectsEndedImmediately, true);
accept("12_local_effect_cleanup_is_immediate_and_rules_owned");
assert.deepEqual(settlement.removeBoardTokenIds, ["created-token"]);
accept("13_non_stay_in_play_token_created_by_destroyed_unit_is_removed");
assert.deepEqual(settlement.stayInPlayTokenIds, ["stay-token"]);
accept("14_stay_in_play_created_token_is_preserved");
assert.deepEqual(settlement.outwardEffectsPreserved.map((entry) => entry.effectId),
  ["outward-stays"]);
accept("15_outward_effect_on_another_unit_remains_by_default");
assert.deepEqual(settlement.explicitOutwardEffectsEnded.map((entry) => entry.effectId),
  ["outward-explicit-end"]);
accept("16_outward_effect_ends_only_when_its_own_rule_explicitly_says_so");
assert.deepEqual(settlement.removeEffectMarkerIds,
  ["explicit-end-marker", "local-marker"]);
accept("17_local_and_explicit_end_markers_are_removed_exactly");
assert.deepEqual(settlement.preservedOutwardMarkerIds, ["outward-marker"]);
accept("18_outward_effect_marker_is_preserved_by_default");
assert.equal(settlement.mutation.piecePatches[0].set.abilitiesActive, false);
assert.deepEqual(settlement.mutation.piecePatches[0].set.statuses, []);
accept("19_destroyed_unit_ability_activity_and_local_statuses_are_cleared");
assert.deepEqual(settlement.mutation.outwardPiecePatches[0].set.statuses.map(
  (entry) => entry.id), ["outward-stays", "unrelated"]);
accept("20_target_patch_removes_only_explicit_source_destroyed_exception");

const live = stateFor(); live.pieces[1].currentModels = 1;
assert.throws(() => resolveOfficialUnitDestructionSettlementV1(kernel(live, {
  procedureKind: "settle_unit_destruction", pieceId: "p2-marine",
  triggerReceiptHash: "b".repeat(64), triggerAuthority: "casualty_resolution",
})), /UNIT_DESTRUCTION_SETTLEMENT_INVALID/u);
accept("21_unit_with_remaining_model_cannot_be_settled_as_destroyed");
assert.throws(() => resolveOfficialUnitDestructionSettlementV1({
  ...settlementInput, triggerAuthority: "client_assertion",
}), /UNIT_DESTRUCTION_SETTLEMENT_INVALID/u);
accept("22_unregistered_destruction_trigger_authority_fails_closed");
assert.throws(() => resolveOfficialUnitDestructionSettlementV1({
  ...settlementInput, clientSuppliedMutation: {},
}), /UNIT_DESTRUCTION_LIFECYCLE_STATE_INVALID/u);
accept("23_client_supplied_cleanup_mutation_is_rejected");
const incomplete = stateFor(); incomplete.pieces[1].destroyedModelIds.pop();
assert.throws(() => resolveOfficialUnitDestructionSettlementV1(kernel(incomplete, {
  procedureKind: "settle_unit_destruction", pieceId: "p2-marine",
  triggerReceiptHash: "b".repeat(64), triggerAuthority: "casualty_resolution",
})), /UNIT_DESTRUCTION_SETTLEMENT_INVALID/u);
accept("24_incomplete_destroyed_model_denominator_fails_closed");

const binding = bindingFor(fixture.gameplayDataBundle);
const flow = applyProcedure(state, "settle_unit_destruction", {
  pieceId: "p2-marine", triggerReceiptHash: "b".repeat(64),
  triggerAuthority: "casualty_resolution",
}, binding);
assert.equal(flow.domain.constraints.procedureKind, "settle_unit_destruction");
accept("25_runtime_exposes_hash_bound_destruction_parameter_domain");
assert.equal(flow.applied.state.pieces[1].destructionLifecycleSettled, true);
assert.equal(flow.applied.state.pieces[1].abilitiesActive, false);
accept("26_apply_commits_destroyed_and_inactive_unit_lifecycle_state");
assert.deepEqual(flow.applied.state.pieces[1].statuses, []);
assert.deepEqual(flow.applied.state.pieces[1].conditions, []);
accept("27_apply_clears_local_status_condition_and_effect_collections");
assert.deepEqual(flow.applied.state.board.tokens.map((entry) => entry.id).sort(),
  ["foreign-token", "stay-token"]);
accept("28_apply_removes_only_non_stay_in_play_created_token");
assert.deepEqual(flow.applied.state.pieces[0].statuses.map((entry) => entry.id),
  ["outward-stays", "unrelated"]);
accept("29_apply_preserves_default_outward_and_unrelated_effects");
assert.deepEqual(flow.applied.state.board.effectMarkers.map((entry) => entry.id),
  ["outward-marker"]);
accept("30_apply_removes_local_and_explicit_end_markers_only");
assert.equal(flow.applied.events[0].type, "unit_destruction_lifecycle_settled");
assert.equal(flow.applied.state.unitDestructionLifecycleHistory.length, 1);
accept("31_apply_persists_event_and_hash_bound_lifecycle_history");

const drifted = structuredClone(flow.opened.state);
drifted.pieces[0].statuses.push({ id: "late-drift" });
assert.equal(runtime.enumerate(drifted, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).candidates[0].disabledReason,
"UNIT_DESTRUCTION_LIFECYCLE_PENDING_INVALID");
accept("32_piece_or_outward_effect_drift_invalidates_pending_transition");
const sourceDrift = structuredClone(flow.opened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
assert.equal(runtime.enumerate(sourceDrift, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding }).candidates[0].disabledReason,
"UNIT_DESTRUCTION_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID");
accept("33_source_lock_drift_disables_pending_transition");
assert.throws(() => runtime.apply(flow.opened.state, {
  ...flow.instantiated.action, ruleAtomIds: [],
}, { matchBinding: binding }), /RULE_RUNTIME_ACTION_LINEAGE_MISMATCH/u);
accept("34_runtime_rejects_forged_action_atom_lineage");

const returned = resolveOfficialDestroyedUnitReturnRestrictionV1(kernel(
  flow.applied.state, { procedureKind: "evaluate_destroyed_unit_return",
    pieceId: "p2-marine", specificReturnRuleAtomId: null }));
assert.equal(returned.canReturnToPlay, false);
assert.equal(returned.specificRuleRequired, true);
accept("35_destroyed_unit_cannot_return_without_specific_registered_rule");
assert.throws(() => resolveOfficialDestroyedUnitReturnRestrictionV1(kernel(
  flow.applied.state, { procedureKind: "evaluate_destroyed_unit_return",
    pieceId: "p2-marine", specificReturnRuleAtomId: "rule-atom:forged" })),
/DESTROYED_UNIT_RETURN_RULE_UNREGISTERED/u);
accept("36_client_named_unregistered_return_rule_fails_closed");
const returnFlow = applyProcedure(flow.applied.state,
  "evaluate_destroyed_unit_return", { pieceId: "p2-marine",
    specificReturnRuleAtomId: null }, binding);
assert.equal(returnFlow.applied.state.pieces[1].isDestroyed, true);
assert.equal(returnFlow.applied.events[0].type,
  "destroyed_unit_return_restriction_resolved");
accept("37_return_query_is_executable_non_returning_transition");
assert.throws(() => resolveOfficialUnitDestructionSettlementV1(kernel(
  flow.applied.state, { procedureKind: "settle_unit_destruction",
    pieceId: "p2-marine", triggerReceiptHash: "b".repeat(64),
    triggerAuthority: "casualty_resolution" })),
/UNIT_DESTRUCTION_SETTLEMENT_INVALID/u);
accept("38_same_destroyed_unit_cannot_be_settled_twice");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const scope = graph.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_RELATIONSHIP_SCOPE_ID
));
assert(scope);
assert.equal(scope.forbiddenPaths.length, 1);
accept("39_relationship_graph_connects_frozen_producers_cleanup_outward_and_return_gate");

function engineFor(keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    cryptoOptions: { keyId: "ticket-11-slice-97-unit-destruction",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen Slice 97 Unit destruction rules.";
function envelopeFor(engine, stateInput) {
  return engine.createEnvelope({ roomId: "official-slice-97-unit-destruction-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-unit-destruction-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "unit_destruction_no_new_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-97-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
      actionSchema: { artifactId: "official-slice-97-action-schema-v35",
        content: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v35" } },
    }, state: stateInput });
}
function registerReplay(engine, initial) {
  const entries = {
    sourceSnapshot: fixture.snapshot, dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: { kind: "geometry-artifact",
      geometryVersion: "unit_destruction_no_new_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v35" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}
const keys = generateKeyPairSync("ed25519");
const authority = engineFor(keys, "slice-97-unit-destruction-short-seal-v1");
const seed = envelopeFor(authority, stateFor());
const authorityOpened = openOfficialUnitDestructionLifecycleRulesPendingV1(seed.state,
  procedure(seed.state, "settle_unit_destruction", { pieceId: "p2-marine",
    triggerReceiptHash: "d".repeat(64), triggerAuthority: "casualty_resolution" }));
const initialEnvelope = authority.createEnvelope({ roomId: seed.roomId,
  matchBinding: seed.matchBinding, state: authorityOpened.state });
registerReplay(authority, initialEnvelope);
const seat = authority.issueSeatAuthority({ grantId: "slice-97-unit-destruction-grant",
  roomId: initialEnvelope.roomId,
  matchBindingHash: initialEnvelope.matchBindingHash,
  seatKey: "player1", roleMode: "player", principalType: "human",
  capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
const lease = authority.issueControlLease({ seatAuthority: seat,
  sessionId: "slice-97-unit-destruction-session", leaseFence: 1,
  issuedAtRoomRevision: initialEnvelope.stateRevision });
const space = authority.legalSpace(initialEnvelope, { seatAuthority: seat });
const authorityDomain = space.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_UNIT_DESTRUCTION_LIFECYCLE_RULES_PARAMETER_KIND));
const preview = authority.preview({ envelope: initialEnvelope, seatAuthority: seat,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { choiceId: authorityDomain.constraints.choices[0].choiceId } } });
const confirmation = authority.confirmPreview({ envelope: initialEnvelope,
  preview: preview.preview, seatAuthority: seat });
const authoritativeApplied = authority.apply({ envelope: initialEnvelope,
  expectedStateRevision: initialEnvelope.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: seat, controlLease: lease,
  idempotencyKey: "slice-97-unit-destruction" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const replay = engineFor(keys, "slice-97-unit-destruction-rotated-seal-v2");
registerReplay(replay, initialEnvelope);
assert.equal(replay.replay({ initialEnvelope,
  journal: [authoritativeApplied.receipt] }).ok, true);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_destruction_event" });
assert.equal(replay.replay({ initialEnvelope, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
accept("40_authority_apply_replay_survives_hmac_rotation_and_rejects_tamper");

assert.equal(acceptance.length, 40);
const report = {
  schema:
    "starcraft_tmg_official_unit_destruction_lifecycle_rules_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  unitDestructionLifecycleDataBundle: bundle,
  remainingRouteV2Hash: route.routeHash, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true,
    historicalRulesDisplayRetained: true },
  boundaries: { positiveReturnRuleRegistryDeferredToSlice101: true,
    existingCasualtyAndReserveConsumersFrozen: true,
    explicitLifecycleFollowupRequiredForFrozenCasualtyConsumers: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_unit_destruction_lifecycle_state_transition_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-unit-destruction-lifecycle-rules-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, dataBundleHash: bundle.bundleHash,
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
