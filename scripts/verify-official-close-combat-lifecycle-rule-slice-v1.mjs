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
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_NEW_ATOM_IDS,
  OFFICIAL_CLOSE_COMBAT_LIFECYCLE_PARAMETER_KIND,
  openOfficialCloseCombatLifecyclePendingV1,
} from "../packages/rule-atoms/official-close-combat-lifecycle-executor-v1.mjs";
import { OFFICIAL_CLOSE_COMBAT_LIFECYCLE_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-close-combat-lifecycle-relationship-contract-v1.mjs";
import {
  createOfficialCloseCombatLifecycleRuleSliceV1,
  verifyOfficialCloseCombatLifecycleRuleSliceV1,
} from "../packages/rule-atoms/official-close-combat-lifecycle-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-attack-pool-edge-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];
function executableAction(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function procedure(extra = {}) {
  return { sideKey: "player1", actorUnitId: "p1-actor",
    attackDicePerEligibleModel: 1, hitThreshold: 3, surgeResult: 1,
    surgeTargetTags: ["light"], armourThreshold: 4,
    closeCombatEvadeGranted: false, damageCharacteristic: 1,
    hitPointsPerModel: 1, ...extra };
}
function prepare(state) {
  state.phase = "combat";
  state.phaseFirstActorByRound = { [`${state.round}:combat`]: {
    round: state.round, phase: "combat", markerHolderSideKey: "player1",
    chosenFirstActorSideKey: "player1" } };
  state.rulesProcedureMode = true;
  for (const piece of state.pieces) piece.activationMarker = "assault";
  return state;
}
function multiTargetState(fixture) {
  return prepare(fixture.battleState({ pieces: [
    { id: "p1-actor", sideKey: "player1", positions: [
      { xInches: 10, yInches: 10 }, { xInches: 8.74, yInches: 10 },
    ] },
    { id: "p2-target-a", sideKey: "player2",
      positions: [{ xInches: 11.8, yInches: 10 }] },
    { id: "p2-target-b", sideKey: "player2",
      positions: [{ xInches: 10, yInches: 11.8 }] },
  ] }));
}
function freedState(fixture) {
  return prepare(fixture.battleState({ pieces: [
    { id: "p1-actor", sideKey: "player1",
      positions: [{ xInches: 10, yInches: 10 }] },
    { id: "p1-ally", sideKey: "player1",
      positions: [{ xInches: 11.8, yInches: 11.8 }] },
    { id: "p2-target", sideKey: "player2",
      positions: [{ xInches: 11.8, yInches: 10 }] },
  ] }));
}
function bindingFor(fixture, runtime) {
  return { bindingHash: "slice-80-close-combat-lifecycle-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: "player1", includeDisabled: true,
    matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_CLOSE_COMBAT_LIFECYCLE_PARAMETER_KIND
  ));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-30T22:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-80-close-combat",
      privateKey: keys.privateKey, publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen close-combat lifecycle procedure.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-80-close-combat-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-close-combat-lifecycle-geometry-v1",
        content: { kind: "geometry-artifact",
          geometryVersion: "close_combat_lifecycle_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-80-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-80-close-combat-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-80-close-combat-session", leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision }) };
}
function registerReplay(engine, initial, fixture, runtime) {
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
      geometryVersion: "close_combat_lifecycle_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v25" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialCloseCombatLifecycleRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialCloseCombatLifecycleRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 501,
  newlyExecutableRuleAtoms: 8, reviewRequiredRuleAtoms: 411,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 501,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 49, missingStateContractExecutors: 0 });
assert.equal(OFFICIAL_CLOSE_COMBAT_LIFECYCLE_NEW_ATOM_IDS.length, 8);
acceptance.push("slice80_promotes_exact_8_current_review_atoms_to_501_executable");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const binding = bindingFor(fixture, runtime);
assert.equal(fixture.sourceLockAudit.lockHash,
  "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1");
assert.equal(slice.closeCombatLifecycleProgress.sourceRefreshPerformed, false);
acceptance.push("fixed_official_source_lock_is_reused_without_refresh_or_repository_fallback");

const opened = openOfficialCloseCombatLifecyclePendingV1(
  multiTargetState(fixture), procedure(),
);
const domain = domainFor(runtime, opened.state, binding);
assert.deepEqual(domain.constraints.eligibleTargetUnitIds,
  ["p2-target-a", "p2-target-b"]);
assert.equal(domain.constraints.meleeRange, "E");
assert.equal(domain.constraints.engagementRangeMilliInches, 1000);
acceptance.push("melee_e_uses_one_inch_engagement_range_and_lists_every_eligible_enemy_unit");
const targetA = domain.constraints.targetEligibilityByUnit.find((entry) => (
  entry.targetUnitId === "p2-target-a"
));
assert.deepEqual(targetA.fightingModelIds, ["p1-actor-model-1"]);
assert.deepEqual(targetA.supportingModelIds, ["p1-actor-model-2"]);
acceptance.push("fighting_and_supporting_rank_eligibility_is_derived_per_specific_enemy_unit");
assert.throws(() => runtime.instantiate(opened.state, domain,
  { targetUnitId: "not-engaged" }, { matchBinding: binding }),
/CLOSE_COMBAT_LIFECYCLE_TARGET_SELECTION_INVALID/u);
const missingMarker = multiTargetState(fixture);
missingMarker.pieces.find((piece) => piece.id === "p1-actor").activationMarker = null;
assert.throws(() => openOfficialCloseCombatLifecyclePendingV1(
  missingMarker, procedure(),
), /CLOSE_COMBAT_LIFECYCLE_ACTOR_INVALID/u);
acceptance.push("non_engaged_unknown_target_or_missing_activation_marker_fails_closed");

const actionA = runtime.instantiate(opened.state, domain,
  { targetUnitId: "p2-target-a" }, { matchBinding: binding });
const appliedA = runtime.apply(opened.state, executableAction(actionA.action), {
  matchBinding: binding, chanceReveals: [6, 1, 1, 1, 1],
});
const resultA = appliedA.state.lastCloseCombatLifecycleResolution;
assert.equal(resultA.surgeMatched, true);
assert.equal(resultA.armourBypassDice, 1);
assert.deepEqual(resultA.targetCombatTags, ["biological", "ground", "light"]);
acceptance.push("melee_surge_matches_the_selected_targets_combat_tags_and_bypasses_armour");
assert.equal(resultA.closeCombatEvadeGranted, false);
assert.deepEqual(resultA.evadeRolls, []);
acceptance.push("close_combat_evade_is_absent_without_an_explicit_special_ability_or_keyword");
assert.equal(resultA.combatActivationMarkerRemoved, true);
assert.equal(appliedA.state.pieces.find((piece) => piece.id === "p1-actor")
  .activationMarker, null);
acceptance.push("fully_resolved_close_combat_attack_removes_the_actors_activation_marker");
assert.equal(resultA.targetDestroyed, true);
assert(resultA.postEngagementGraphHash !== resultA.preEngagementGraphHash);
acceptance.push("casualty_resolution_recomputes_engagement_from_authoritative_geometry");

const evadeOpened = openOfficialCloseCombatLifecyclePendingV1(
  multiTargetState(fixture), procedure({ closeCombatEvadeGranted: true,
    evadeThreshold: 4 }),
);
const evadeDomain = domainFor(runtime, evadeOpened.state, binding);
const evadeAction = runtime.instantiate(evadeOpened.state, evadeDomain,
  { targetUnitId: "p2-target-a" }, { matchBinding: binding });
const evaded = runtime.apply(evadeOpened.state, executableAction(evadeAction.action), {
  matchBinding: binding, chanceReveals: [6, 6, 1, 1, 1, 6, 1],
}).state.lastCloseCombatLifecycleResolution;
assert.equal(evaded.closeCombatEvadeGranted, true);
assert.deepEqual(evaded.evadeRolls, [6, 1]);
assert.equal(evaded.evadeSaves, 1);
acceptance.push("explicit_close_combat_evade_grant_rolls_the_damage_pool_before_damage");

const freedOpened = openOfficialCloseCombatLifecyclePendingV1(
  freedState(fixture), procedure({ actorUnitId: "p1-actor" }),
);
const freedDomain = domainFor(runtime, freedOpened.state, binding);
const freedAction = runtime.instantiate(freedOpened.state, freedDomain,
  { targetUnitId: "p2-target" }, { matchBinding: binding });
const freed = runtime.apply(freedOpened.state, executableAction(freedAction.action), {
  matchBinding: binding, chanceReveals: [6, 1, 1],
}).state;
assert.deepEqual(freed.lastCloseCombatLifecycleResolution.freedUnitIds,
  ["p1-actor", "p1-ally"]);
acceptance.push("removing_the_last_enemy_immediately_marks_all_surviving_units_unengaged");
assert.deepEqual(freed.lastCloseCombatLifecycleResolution.effectivelyPassedUnitIds,
  ["p1-ally"]);
assert.equal(freed.pieces.find((piece) => piece.id === "p1-ally")
  .effectivePassPhases.combat, freed.round);
assert.equal(freed.pieces.find((piece) => piece.id === "p1-ally")
  .combatPassState.actsNormallyFromNextRound, true);
acceptance.push("a_freed_unit_not_yet_activated_effectively_passes_the_current_combat_phase");
assert.equal(freed.pieces.find((piece) => piece.id === "p1-actor")
  .effectivePassPhases?.combat, undefined);
acceptance.push("the_attacking_unit_is_recorded_as_activated_not_as_a_freed_unactivated_pass");
assert.equal(freed.pieces.find((piece) => piece.id === "p1-ally")
  .reactionEligibility.combat, "allowed_by_reaction_or_specific_trigger");
assert.equal(freed.lastCloseCombatLifecycleResolution
  .freedUnitReactionExceptionPreserved, true);
acceptance.push("freed_unit_effective_pass_preserves_reaction_and_specific_trigger_exception");

const stale = structuredClone(opened.state);
stale.pieces.find((piece) => piece.id === "p2-target-b").models[0].xInches = 30;
assert.throws(() => runtime.instantiate(stale, domain,
  { targetUnitId: "p2-target-a" }, { matchBinding: binding }),
/CLOSE_COMBAT_LIFECYCLE_PENDING_INVALID/u);
acceptance.push("geometry_piece_or_pending_projection_change_invalidates_the_target_domain");
const sourceDrift = structuredClone(opened.state);
sourceDrift.officialDevelopmentTrancheSourceLockAudit.lockHash = "0".repeat(64);
const disabledForSourceDrift = runtime.enumerate(sourceDrift, { sideKey: "player1",
  includeDisabled: true, matchBinding: binding }).candidates[0];
assert.equal(disabledForSourceDrift.disabledReason,
  "CLOSE_COMBAT_LIFECYCLE_SOURCE_LOCK_BINDING_INVALID");
acceptance.push("source_lock_drift_fails_closed_before_close_combat_resolution");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_CLOSE_COMBAT_LIFECYCLE_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:closeCombatLifecycleV1.postCombatEngagementAndPass"
    && entry.to === "derived_value:closeCombatLifecycleV1.freedReactionException"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_freed_pass_to_reaction_exception_edge");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-80-close-combat-short-seal-v1");
const authorityState = openOfficialCloseCombatLifecyclePendingV1(
  freedState(fixture), procedure(),
).state;
const initial = envelopeFor(authority, fixture, authorityState);
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authoritySpace = authority.legalSpace(initial, {
  seatAuthority: access.authority,
});
const authorityDomain = authoritySpace.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_CLOSE_COMBAT_LIFECYCLE_PARAMETER_KIND
));
assert(authorityDomain, JSON.stringify({ domains: authoritySpace.parameterDomains,
  disabled: authoritySpace.disabledDiagnostics }));
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { targetUnitId: "p2-target" } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-80-close-combat" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
acceptance.push("authority_preview_confirm_apply_executes_target_choice_with_ed25519_signature");

const replay = engineFor(runtime, keys, "slice-80-close-combat-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
const replayed = replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_close_combat_lifecycle_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_selfplay_or_training_promotion_occurs_in_slice80");
assert.equal(acceptance.length, 20);

const report = {
  schema: "starcraft_tmg_official_close_combat_lifecycle_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_close_combat_lifecycle_procedure_conformance",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-close-combat-lifecycle-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  graphCounts: { nodes: graph.nodes.length, edges: graph.edges.length },
  counts: audit.counts, sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
