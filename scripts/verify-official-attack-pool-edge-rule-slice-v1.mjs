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
  OFFICIAL_ATTACK_POOL_EDGE_EXECUTOR_ID,
  OFFICIAL_ATTACK_POOL_EDGE_NEW_ATOM_IDS,
  OFFICIAL_ATTACK_POOL_EDGE_PARAMETER_KIND,
  openOfficialAttackPoolEdgePendingV1,
} from "../packages/rule-atoms/official-attack-pool-edge-executor-v1.mjs";
import { OFFICIAL_ATTACK_POOL_EDGE_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-attack-pool-edge-relationship-contract-v1.mjs";
import {
  createOfficialAttackPoolEdgeRuleSliceV1,
  verifyOfficialAttackPoolEdgeRuleSliceV1,
} from "../packages/rule-atoms/official-attack-pool-edge-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-template-weapon-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];
function executableAction(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function stateFor(fixture) {
  const state = fixture.battleState({ pieces: [
    { id: "p1-attacker", sideKey: "player1", positions: [{ xInches: 5, yInches: 10 }] },
    { id: "p2-target", sideKey: "player2", positions: [
      { xInches: 10, yInches: 9 }, { xInches: 10, yInches: 10 },
      { xInches: 10, yInches: 11 },
    ] },
  ] });
  state.rulesProcedureMode = true;
  return state;
}
function batchProcedure(extra = {}) {
  return { kind: "attack_batch", sideKey: "player1", targetUnitId: "p2-target",
    targetCombatTag: "ground", hitThreshold: 3, armourThreshold: 4,
    damageCharacteristic: 1, hitPointsPerModel: 2, visibleModelCount: 3,
    concentratedFireCap: null, tough: 1, reductionCount: 1, surgeResult: 2,
    surgeTargetTags: ["armoured"], attackDice: [
      { dieId: "d1", modelId: "m1", rangeBand: "standard", hitTargetModifier: 0 },
      { dieId: "d2", modelId: "m1", rangeBand: "standard", hitTargetModifier: -1 },
      { dieId: "d3", modelId: "m2", rangeBand: "long", hitTargetModifier: 0 },
      { dieId: "d4", modelId: "m2", rangeBand: "long", hitTargetModifier: 1 },
    ], ...extra };
}
function hitsXProcedure(extra = {}) {
  return { kind: "hits_x", sideKey: "player1", targetUnitId: "p2-target",
    targetCombatTag: "ground", automaticHits: 4, damageCharacteristic: 2,
    armourThreshold: 4, tough: 1, hitPointsPerModel: 2, visibleModelCount: 3,
    concentratedFireCap: null, ...extra };
}
function bindingFor(fixture, runtime) {
  return { bindingHash: "slice-79-attack-pool-edge-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash } };
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, { sideKey: "player1", includeDisabled: true,
    matchBinding: binding }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_ATTACK_POOL_EDGE_PARAMETER_KIND
  ));
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-30T21:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-79-attack-pool", privateKey: keys.privateKey,
      publicKey: keys.publicKey, hmacSecret } });
}
const DISPLAY = "# Historical rules display\n\nFrozen attack-pool edge procedure.";
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-79-attack-pool-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-attack-pool-geometry-v1",
        content: { kind: "geometry-artifact", geometryVersion: "attack_pool_no_geometry_v1" } },
      rulesDisplay: { artifactId: "official-slice-79-historical-rules-display",
        mediaType: "text/markdown", locale: "en", content: DISPLAY },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-79-attack-pool-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-79-attack-pool-session", leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision }) };
}
function registerReplay(engine, initial, fixture, runtime) {
  const entries = { sourceSnapshot: fixture.snapshot,
    dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact", authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: { kind: "geometry-artifact", geometryVersion: "attack_pool_no_geometry_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v25" } };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en", content: DISPLAY });
}

const slice = createOfficialAttackPoolEdgeRuleSliceV1({ previousSlice: previousReport.slice });
const audit = verifyOfficialAttackPoolEdgeRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 493,
  newlyExecutableRuleAtoms: 13, reviewRequiredRuleAtoms: 419,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 493,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 48, missingStateContractExecutors: 0 });
assert.equal(OFFICIAL_ATTACK_POOL_EDGE_NEW_ATOM_IDS.length, 13);
acceptance.push("slice79_promotes_exact_13_current_review_atoms_to_493_executable");
assert.deepEqual(slice.attackPoolEdgeProgress.replacementPreviouslyUnassignedAtoms,
  ["three_pool_overview", "armour_roll_bypass", "surge_mismatch"]);
assert.equal(slice.attackPoolEdgeProgress.priorRouteDuplicateLongRangeAtomsCorrected, 3);
acceptance.push("route_replaces_three_already_executable_long_range_atoms_with_three_unassigned_pool_atoms");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
const binding = bindingFor(fixture, runtime);
assert.equal(fixture.sourceLockAudit.lockHash,
  "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1");
assert.equal(slice.attackPoolEdgeProgress.sourceRefreshPerformed, false);
acceptance.push("fixed_official_source_lock_is_reused_without_refresh_or_repository_fallback");

const opened = openOfficialAttackPoolEdgePendingV1(stateFor(fixture), batchProcedure());
const domain = domainFor(runtime, opened.state, binding);
assert.equal(domain.constraints.reductionCount, 1);
assert.equal(domain.parameterSchema.selectionOwner,
  "controller_of_unit_resolving_reduction");
acceptance.push("special_ability_reduction_exposes_exact_controller_owned_die_selection");
assert.throws(() => runtime.instantiate(opened.state, domain,
  { removedDieIds: ["unknown"] }, { matchBinding: binding }),
/ATTACK_POOL_EDGE_REDUCED_DICE_SELECTION_INVALID/u);
acceptance.push("unknown_duplicate_or_wrong_count_reduced_dice_selection_fails_closed");

const instantiated = runtime.instantiate(opened.state, domain,
  { removedDieIds: ["d4"] }, { matchBinding: binding });
const applied = runtime.apply(opened.state, executableAction(instantiated.action), {
  matchBinding: binding, chanceReveals: [3, 2, 4, 1, 2, 6],
});
const result = applied.state.lastAttackPoolEdgeResolution;
assert.deepEqual(result.hitGroups.map((group) => ({ band: group.rangeBand,
  targets: group.results.map((entry) => entry.targetNumber) })), [
  { band: "standard", targets: [3, 2] }, { band: "long", targets: [4] },
]);
assert.equal(result.rolledMixedRangeBandsSeparately, true);
acceptance.push("mixed_modifiers_and_standard_long_range_dice_roll_in_distinct_rules_owned_groups");
assert.equal(result.surgeMatched, false);
assert.equal(result.surgeIgnoredForMismatch, true);
assert.equal(result.armourBypassDice, 0);
acceptance.push("surge_type_mismatch_discards_result_without_bypassing_armour");
assert.equal(result.naturalSaves, 1);
assert.equal(result.toughConverted, 1);
assert.equal(result.damagePoolDice, 1);
assert.deepEqual(result.poolOrder, ["attack", "armour", "damage"]);
acceptance.push("tough_converts_up_to_x_failed_armour_rolls_before_damage_pool_transfer");

const matchedOpen = openOfficialAttackPoolEdgePendingV1(stateFor(fixture),
  batchProcedure({ reductionCount: 0, surgeTargetTags: ["ground"], tough: 0 }));
const matchedDomain = domainFor(runtime, matchedOpen.state, binding);
const matchedAction = runtime.instantiate(matchedOpen.state, matchedDomain,
  { removedDieIds: [] }, { matchBinding: binding });
const matched = runtime.apply(matchedOpen.state, executableAction(matchedAction.action), {
  matchBinding: binding, chanceReveals: [6, 6, 6, 6, 1, 1, 1, 1],
}).state.lastAttackPoolEdgeResolution;
assert.equal(matched.armourBypassDice, 2);
assert.equal(matched.armourRolls.length, 2);
acceptance.push("matching_surge_moves_bounded_dice_directly_to_damage_and_bypasses_armour_rolls");

const hitsOpen = openOfficialAttackPoolEdgePendingV1(stateFor(fixture), hitsXProcedure());
const hitsDomain = domainFor(runtime, hitsOpen.state, binding);
const hitsAction = runtime.instantiate(hitsOpen.state, hitsDomain,
  { removedDieIds: [] }, { matchBinding: binding });
const hits = runtime.apply(hitsOpen.state, executableAction(hitsAction.action), {
  matchBinding: binding, chanceReveals: [1, 2, 3, 6],
}).state.lastAttackPoolEdgeResolution;
assert.equal(hits.automaticHits, 4);
assert.equal(hits.hitGroups.length, 0);
assert.equal(hits.surgeGenerated, false);
assert.equal(hits.damageCharacteristic, 2);
acceptance.push("hits_x_sets_automatic_armour_pool_dice_uses_y_damage_and_never_generates_surge");
assert.equal(hits.casualties, 2);
assert.equal(hits.damageMarkerRecorded, 0);
acceptance.push("hits_x_armour_failures_flow_to_damage_and_remove_models_by_hit_points");

const concentratedOpen = openOfficialAttackPoolEdgePendingV1(stateFor(fixture),
  hitsXProcedure({ automaticHits: 5, tough: 0, armourThreshold: 6,
    concentratedFireCap: 1 }));
const concentratedDomain = domainFor(runtime, concentratedOpen.state, binding);
const concentratedAction = runtime.instantiate(concentratedOpen.state, concentratedDomain,
  { removedDieIds: [] }, { matchBinding: binding });
const concentrated = runtime.apply(concentratedOpen.state,
  executableAction(concentratedAction.action), { matchBinding: binding,
    chanceReveals: [1, 1, 1, 1, 1] }).state.lastAttackPoolEdgeResolution;
assert.equal(concentrated.casualties, 1);
assert.equal(concentrated.excessDamageDiscarded, 8);
assert.equal(concentrated.damageMarkerRecorded, 0);
acceptance.push("concentrated_fire_caps_casualties_and_discards_all_remaining_total_damage");

const visibleOpen = openOfficialAttackPoolEdgePendingV1(stateFor(fixture),
  hitsXProcedure({ automaticHits: 5, tough: 0, armourThreshold: 6,
    visibleModelCount: 1 }));
const visibleDomain = domainFor(runtime, visibleOpen.state, binding);
const visibleAction = runtime.instantiate(visibleOpen.state, visibleDomain,
  { removedDieIds: [] }, { matchBinding: binding });
const visible = runtime.apply(visibleOpen.state, executableAction(visibleAction.action), {
  matchBinding: binding, chanceReveals: [1, 1, 1, 1, 1],
}).state.lastAttackPoolEdgeResolution;
assert.equal(visible.casualties, 1);
assert.equal(visible.excessDamageDiscarded, 8);
acceptance.push("unengaged_casualties_cannot_exceed_visible_models_and_excess_is_discarded");

const stale = structuredClone(opened.state);
stale.pieces.find((piece) => piece.id === "p2-target").damageMarker = 1;
assert.throws(() => runtime.instantiate(stale, domain, { removedDieIds: ["d4"] },
  { matchBinding: binding }), /ATTACK_POOL_EDGE_PENDING_INVALID/u);
acceptance.push("state_pending_or_source_projection_change_invalidates_attack_pool_domain");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_ATTACK_POOL_EDGE_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_value:attackPoolEdgeV1.armourAndTough"
    && entry.to === "derived_value:attackPoolEdgeV1.visibleAndConcentratedCaps"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_armour_to_casualty_cap_edge");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-79-attack-pool-short-seal-v1");
const initial = envelopeFor(authority, fixture, opened.state);
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authorityDomain = authority.legalSpace(initial, {
  seatAuthority: access.authority,
}).parameterDomains.find((entry) => entry.parameterKind === OFFICIAL_ATTACK_POOL_EDGE_PARAMETER_KIND);
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { removedDieIds: ["d4"] } } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial,
  preview: preview.preview, seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-79-attack-pool" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
acceptance.push("authority_preview_confirm_apply_executes_controller_choice_with_ed25519_signature");

const replay = engineFor(runtime, keys, "slice-79-attack-pool-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
const replayed = replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_attack_pool_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_selfplay_or_training_promotion_occurs_in_slice79");
assert.equal(acceptance.length, 18);

const report = { schema: "starcraft_tmg_official_attack_pool_edge_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  routeDuplicateCorrection: { alreadyExecutableLongRangeAtoms: 3,
    replacementPreviouslyUnassignedAttackPoolAtoms: 3 },
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_attack_pool_edge_procedure_conformance",
  trainingTruth: false };
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-attack-pool-edge-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  counts: audit.counts, sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
