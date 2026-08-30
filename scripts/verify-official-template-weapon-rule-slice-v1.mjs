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
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_TEMPLATE_WEAPON_EXECUTOR_ID,
  OFFICIAL_TEMPLATE_WEAPON_NEW_ATOM_IDS,
  OFFICIAL_TEMPLATE_WEAPON_PARAMETER_KIND,
  openOfficialTemplateWeaponPendingV1,
} from "../packages/rule-atoms/official-template-weapon-executor-v1.mjs";
import { OFFICIAL_TEMPLATE_WEAPON_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-template-weapon-relationship-contract-v1.mjs";
import {
  createOfficialTemplateWeaponRuleSliceV1,
  verifyOfficialTemplateWeaponRuleSliceV1,
} from "../packages/rule-atoms/official-template-weapon-rule-slice-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR, "official-assault-run-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];
function executableAction(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function geometryAsset(templateType, localPolygon, physicalSource = "component_asset_pending") {
  const body = { schema: "starcraft_tmg_template_geometry_asset_v1", templateType,
    localPolygon, physicalSource, productionEligible: false, trainingTruth: false };
  return { ...body, assetHash: hashStarcraftTmgContract(body) };
}
const blastAsset = geometryAsset("blast", [
  { xMilliInches: -2500, yMilliInches: -2500 },
  { xMilliInches: 2500, yMilliInches: -2500 },
  { xMilliInches: 2500, yMilliInches: 2500 },
  { xMilliInches: -2500, yMilliInches: 2500 },
]);
const flamerAsset = geometryAsset("flamer", [
  { xMilliInches: 0, yMilliInches: -400 },
  { xMilliInches: 7000, yMilliInches: -2500 },
  { xMilliInches: 7000, yMilliInches: 2500 },
  { xMilliInches: 0, yMilliInches: 400 },
]);
function stateFor(fixture, options = {}) {
  const state = fixture.battleState({ pieces: [
    { id: "p1-attacker", sideKey: "player1", positions: [{ xInches: 5, yInches: 10 }] },
    { id: "p2-primary", sideKey: "player2", positions: [
      { xInches: 10, yInches: 10 }, { xInches: 10, yInches: 11.2 },
    ] },
    { id: "p2-spill", sideKey: "player2", positions: [{ xInches: 12, yInches: 10 }] },
    { id: "p1-spill", sideKey: "player1", positions: [{ xInches: 10, yInches: 8.8 }] },
    { id: "p2-outside", sideKey: "player2", positions: [{ xInches: 20, yInches: 20 }] },
  ] });
  state.rulesProcedureMode = true;
  if (options.terrain === true) state.board.terrain = [{
    id: "blocking-wall", size: 2, blocksLineOfSight: true,
    xInches: 11, yInches: 10, widthInches: 0.5, depthInches: 1,
  }];
  return state;
}
function declaration(type, asset) {
  return { templateType: type, attackerUnitId: "p1-attacker",
    attackerModelId: "p1-attacker-model-1", primaryTargetUnitId: "p2-primary",
    primaryTargetModelId: "p2-primary-model-1", geometryAsset: asset,
    attackProfile: { targetTags: ["ground"], hitThreshold: 3,
      rateOfAttackModifier: 1, surgeTargetTags: ["ground"] } };
}
function bindingFor(fixture, runtime) {
  return { bindingHash: "slice-78-template-procedure-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash } };
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({ rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-30T20:00:00.000Z",
    cryptoOptions: { keyId: "ticket-11-slice-78-template", privateKey: keys.privateKey,
      publicKey: keys.publicKey, hmacSecret } });
}
function envelopeFor(engine, fixture, state) {
  return engine.createEnvelope({ roomId: "official-slice-78-template-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: { artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot },
      dataSnapshot: { artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle },
      geometryArtifact: { artifactId: "official-template-polygon-geometry-v1",
        content: { kind: "geometry-artifact", geometryVersion: "template_polygon_v1" } },
      rulesDisplay: { artifactId: "official-slice-78-historical-rules-display",
        mediaType: "text/markdown", locale: "en",
        content: "# Historical rules display\n\nFrozen template procedure; carrier remains quarantined." },
    }, state });
}
function credentials(engine, envelope) {
  const authority = engine.issueSeatAuthority({ grantId: "slice-78-template-grant",
    roomId: envelope.roomId, matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1", roleMode: "player", principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"] });
  return { authority, lease: engine.issueControlLease({ seatAuthority: authority,
    sessionId: "slice-78-template-session", leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision }) };
}
function registerReplay(engine, initial, fixture, runtime) {
  const entries = {
    sourceSnapshot: fixture.snapshot, dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding },
    executorArtifact: { kind: "executor-artifact", authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest },
    geometryArtifact: { kind: "geometry-artifact", geometryVersion: "template_polygon_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v25" },
  };
  for (const [kind, content] of Object.entries(entries)) engine.registerDependency({
    kind, artifactId: initial.matchBinding.dependencies[kind].artifactId, content,
  });
  engine.registerDependency({ kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown", locale: "en",
    content: "# Historical rules display\n\nFrozen template procedure; carrier remains quarantined." });
}

const slice = createOfficialTemplateWeaponRuleSliceV1({ previousSlice: previousReport.slice });
const audit = verifyOfficialTemplateWeaponRuleSliceV1({
  previousSlice: previousReport.slice, slice,
});
assert.deepEqual(audit.counts, { executableRuleAtoms: 480,
  newlyExecutableRuleAtoms: 23, reviewRequiredRuleAtoms: 432,
  displayOnlyRuleAtoms: 114, strictCompleteAtoms: 480,
  partialContractAtoms: 0, noContractAtoms: 0,
  declaredStateContractExecutors: 47, missingStateContractExecutors: 0 });
assert.equal(OFFICIAL_TEMPLATE_WEAPON_NEW_ATOM_IDS.length, 23);
acceptance.push("slice78_promotes_exact_23_template_and_spillover_atoms_to_480_executable");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({ root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash });
assert.equal(fixture.sourceLockAudit.lockHash,
  "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1");
assert.equal(slice.templateWeaponProgress.sourceRefreshPerformed, false);
acceptance.push("fixed_official_source_lock_is_reused_without_network_refresh_or_repository_fallback");
assert.equal(slice.templateWeaponProgress.currentOfficialTemplateCarrierAvailable, false);
assert.equal(slice.templateWeaponProgress.productionCarrierQuarantined, true);
acceptance.push("missing_current_bt_ft_carrier_and_physical_geometry_asset_are_explicitly_quarantined");

const binding = bindingFor(fixture, runtime);
const opened = openOfficialTemplateWeaponPendingV1(
  stateFor(fixture), declaration("blast", blastAsset),
);
assert.equal(opened.pending.placement.targetPoint.xMilliInches, 10000);
assert.equal(opened.pending.placement.targetPoint.yMilliInches, 10000);
acceptance.push("blast_template_is_authoritatively_centred_on_primary_target_point");
assert.deepEqual(opened.pending.batches.map((row) => ({ id: row.unitId,
  main: row.mainTarget, affected: row.affectedModelIds.length, dice: row.attackDice,
  rate: row.rateOfAttackModifierApplied, surge: row.surgeResult })), [
  { id: "p1-spill", main: false, affected: 1, dice: 1, rate: 0, surge: 0 },
  { id: "p2-primary", main: true, affected: 2, dice: 3, rate: 1, surge: 2 },
  { id: "p2-spill", main: false, affected: 1, dice: 1, rate: 0, surge: 0 },
]);
acceptance.push("main_pool_adds_rate_modifier_while_friendly_and_enemy_spillover_are_separate_unit_batches");
assert.equal(opened.pending.totalAttackDice, 5);
assert.equal(opened.pending.batches.filter((row) => row.mainTarget).length, 1);
acceptance.push("template_base_coverage_and_unit_identity_define_exact_affected_model_counts");

const domain = runtime.enumerate(opened.state, { sideKey: "player1", includeDisabled: true,
  matchBinding: binding }).parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_TEMPLATE_WEAPON_PARAMETER_KIND
));
assert.ok(domain);
const instantiated = runtime.instantiate(opened.state, domain, {}, { matchBinding: binding });
const applied = runtime.apply(opened.state, executableAction(instantiated.action), {
  matchBinding: binding, chanceReveals: [6, 2, 3, 4, 1],
});
assert.deepEqual(applied.state.lastTemplateResolution.batches.map((row) => ({
  id: row.unitId, hits: row.hitSuccesses, surgeDie: row.surgeDieRolled,
  surgeApplied: row.surgeApplied,
})), [
  { id: "p1-spill", hits: 1, surgeDie: false, surgeApplied: false },
  { id: "p2-primary", hits: 2, surgeDie: false, surgeApplied: true },
  { id: "p2-spill", hits: 0, surgeDie: false, surgeApplied: false },
]);
acceptance.push("hit_threshold_moves_successes_to_armour_pools_without_rolling_any_surge_die");
assert.equal(applied.state.pendingAction, null);
assert.equal(applied.events[0].batchResults.filter((row) => row.spillover).length, 2);
acceptance.push("main_target_uses_affected_count_as_surge_result_and_spillover_never_applies_surge");

const flamer = openOfficialTemplateWeaponPendingV1(
  stateFor(fixture), declaration("flamer", flamerAsset),
);
assert.equal(flamer.pending.placement.narrowEnd.xMilliInches, 5630);
assert.equal(flamer.pending.placement.narrowEnd.yMilliInches, 10000);
acceptance.push("flamer_narrow_end_is_flush_with_attacker_base_and_axis_is_aimed_at_primary_target");
const blocked = openOfficialTemplateWeaponPendingV1(
  stateFor(fixture, { terrain: true }), declaration("blast", blastAsset),
);
assert.equal(blocked.pending.batches.some((row) => row.unitId === "p2-spill"), false);
assert.equal(blocked.pending.batches.some((row) => row.unitId === "p1-spill"), true);
acceptance.push("size_two_blocking_terrain_filters_each_covered_model_using_bt_or_ft_trace_origin");

const flyingState = stateFor(fixture);
const flying = flyingState.pieces.find((piece) => piece.id === "p2-spill");
flying.combatTag = "flying"; flying.combatTags = ["flying", "biological", "light"];
flying.models[0].elevation = "flying";
const groundOnly = openOfficialTemplateWeaponPendingV1(
  flyingState, declaration("blast", blastAsset),
);
assert.equal(groundOnly.pending.batches.some((row) => row.unitId === "p2-spill"), false);
acceptance.push("same_elevation_and_target_tag_checks_exclude_covered_flying_models_from_ground_template");

const stale = structuredClone(opened.state);
stale.pieces.find((piece) => piece.id === "p2-spill").models[0].xInches = 13;
assert.throws(() => runtime.instantiate(stale, domain, {}, { matchBinding: binding }),
  /TEMPLATE_PENDING_INVALID/u);
acceptance.push("model_terrain_pending_or_source_projection_change_invalidates_template_domain");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_TEMPLATE_WEAPON_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "derived_fact:templateWeaponV1.coverage"
    && entry.to === "derived_fact:templateWeaponV1.mainAndSpilloverBatches"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_coverage_to_spillover_batch_edge");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-78-template-short-seal-v1");
const initial = envelopeFor(authority, fixture, opened.state);
registerReplay(authority, initial, fixture, runtime);
const access = credentials(authority, initial);
const authorityDomain = authority.legalSpace(initial, {
  seatAuthority: access.authority,
}).parameterDomains.find((entry) => entry.parameterKind === OFFICIAL_TEMPLATE_WEAPON_PARAMETER_KIND);
const preview = authority.preview({ envelope: initial, seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId, parameters: {} } });
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = authority.confirmPreview({ envelope: initial, preview: preview.preview,
  seatAuthority: access.authority });
const authoritativeApplied = authority.apply({ envelope: initial,
  expectedStateRevision: initial.stateRevision, preview: preview.preview,
  confirmation: confirmation.confirmation, seatAuthority: access.authority,
  controlLease: access.lease, idempotencyKey: "slice-78-template" });
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
acceptance.push("authority_preview_confirm_apply_executes_template_hit_pools_with_ed25519_signature");

const replay = engineFor(runtime, keys, "slice-78-template-rotated-seal-v2");
registerReplay(replay, initial, fixture, runtime);
const replayed = replay.replay({ initialEnvelope: initial,
  journal: [authoritativeApplied.receipt] });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_template_event" });
assert.equal(replay.replay({ initialEnvelope: initial, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_selfplay_or_training_promotion_occurs_in_slice78");
assert.equal(acceptance.length, 16);

const report = { schema: "starcraft_tmg_official_template_weapon_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(), acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length, acceptance, failures: [],
  sourceLockAudit: fixture.sourceLockAudit, slice, sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash, catalogueHash: slice.catalogueHash,
  graph, graphAudit: audit.graphAudit, coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true },
  ctx2skill: slice.ctx2skill, harness: slice.harness,
  currentOfficialCarrierAvailable: false, productionCarrierQuarantined: true,
  rulesEligible: false, productionRoomEligible: false,
  rulesTruth: "official_template_procedure_conformance_current_carrier_quarantined",
  trainingTruth: false };
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(OUTPUT_DIR,
  "official-template-weapon-rule-slice-v1-report.json"),
`${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ schema: report.schema,
  acceptancePassed: report.acceptancePassed, acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash, catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash, graphHash: graph.graphHash,
  counts: audit.counts, sourceLockHash: fixture.sourceLockAudit.lockHash,
  currentOfficialCarrierAvailable: false, productionCarrierQuarantined: true,
  sourceRefreshPerformed: false, repositoryFallbackUsed: false,
  trainingTruth: false }, null, 2));
