#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  OFFICIAL_ASSAULT_RUN_EXECUTOR_ID,
  OFFICIAL_ASSAULT_RUN_NEW_ATOM_IDS,
  OFFICIAL_ASSAULT_RUN_PARAMETER_KIND,
} from "../packages/rule-atoms/official-assault-run-executor-v1.mjs";
import { OFFICIAL_ASSAULT_RUN_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-assault-run-relationship-contract-v1.mjs";
import {
  createOfficialAssaultRunRuleSliceV1,
  verifyOfficialAssaultRunRuleSliceV1,
} from "../packages/rule-atoms/official-assault-run-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-impact-after-charge-rule-slice-v1-report.json",
), "utf8"));
const acceptance = [];

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function executableAction(value) {
  return Object.fromEntries(Object.entries(value).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function bindingFor(fixture, runtime) {
  return {
    bindingHash: "assault-run-direct-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
  };
}
function runState(fixture, options = {}) {
  const seven = options.sevenModels === true;
  const positions = options.singleModel === true
    ? [{ xInches: 5, yInches: 10 }]
    : seven
    ? Array.from({ length: 7 }, (_unused, index) => ({
        xInches: 5 + (index % 3) * 1.3,
        yInches: 8 + Math.floor(index / 3) * 1.3,
      }))
    : [{ xInches: 5, yInches: 10 }, { xInches: 5, yInches: 12 }];
  return fixture.battleState({
    pieces: [{
      id: "p1-run",
      sideKey: "player1",
      movementActivated: options.movementActivated !== false,
      assaultActivated: false,
      positions,
    }, {
      id: "p2-far",
      sideKey: "player2",
      movementActivated: true,
      assaultActivated: false,
      positions: [{ xInches: options.engaged === true ? 7 : 30, yInches: 10 }],
    }],
  });
}
function domainFor(runtime, state, binding) {
  return runtime.enumerate(state, {
    sideKey: state.activeSideKey,
    includeDisabled: true,
    matchBinding: binding,
  }).parameterDomains.find((entry) => (
    entry.parameterKind === OFFICIAL_ASSAULT_RUN_PARAMETER_KIND
      && entry.executorId === OFFICIAL_ASSAULT_RUN_EXECUTOR_ID
      && entry.pieceId === "p1-run"
  ));
}
function runParameters(domain, distance = 3000) {
  const leadingModelId = domain.constraints.modelIds[0];
  const start = domain.constraints.modelStartPoints[leadingModelId];
  const endpoint = {
    xMilliInches: start.xMilliInches + distance,
    yMilliInches: start.yMilliInches,
  };
  const placements = domain.constraints.modelIds.slice(1).map((modelId, index) => ({
    modelId,
    xMilliInches: endpoint.xMilliInches + ((index % 3) * 1300),
    yMilliInches: endpoint.yMilliInches + ((Math.floor(index / 3) + 1) * 1300),
  }));
  return { leadingModelId, path: [endpoint], placements };
}
function credentials(engine, envelope, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `slice-77-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  return {
    authority,
    lease: engine.issueControlLease({
      seatAuthority: authority,
      sessionId: `slice-77-${suffix}-session`,
      leaseFence: 1,
      issuedAtRoomRevision: envelope.stateRevision,
    }),
  };
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-30T18:00:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-slice-77-assault-run",
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      hmacSecret,
    },
  });
}
function initialEnvelope(engine, fixture, state) {
  return engine.createEnvelope({
    roomId: "official-slice-77-assault-run-room",
    dataVersion: `${fixture.snapshot.dataVersions.unitsVersion}`
      + `/${fixture.snapshot.dataVersions.cardsVersion}`
      + `/${fixture.snapshot.dataVersions.rulesVersion}`,
    dependencies: {
      sourceSnapshot: {
        artifactId: "official-development-tranche-command-center-snapshot",
        content: fixture.snapshot,
      },
      dataSnapshot: {
        artifactId: "official-development-tranche-gameplay-data-bundle",
        content: fixture.gameplayDataBundle,
      },
    },
    state,
  });
}
function registerReplayDependencies(engine, initial, fixture, runtime) {
  const values = {
    sourceSnapshot: fixture.snapshot,
    dataSnapshot: fixture.gameplayDataBundle,
    rulesArtifact: {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding,
    },
    executorArtifact: {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
      catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest,
    },
    geometryArtifact: { kind: "geometry-artifact", geometryVersion: "fixed_point_round_base_v1" },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v25" },
  };
  for (const [kind, content] of Object.entries(values)) {
    engine.registerDependency({
      kind,
      artifactId: initial.matchBinding.dependencies[kind].artifactId,
      content,
    });
  }
  engine.registerDependency({
    kind: "rulesDisplay",
    artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}`
      + "\n\nThis development artifact preserves the rules identity used by the match.",
  });
}

const slice = createOfficialAssaultRunRuleSliceV1({ previousSlice: previousReport.slice });
const audit = verifyOfficialAssaultRunRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.deepEqual(audit.counts, {
  executableRuleAtoms: 457,
  newlyExecutableRuleAtoms: 6,
  reviewRequiredRuleAtoms: 455,
  displayOnlyRuleAtoms: 114,
  strictCompleteAtoms: 457,
  partialContractAtoms: 0,
  noContractAtoms: 0,
  declaredStateContractExecutors: 46,
  missingStateContractExecutors: 0,
});
assert.equal(OFFICIAL_ASSAULT_RUN_NEW_ATOM_IDS.length, 6);
acceptance.push("slice77_promotes_exact_six_run_and_assault_choice_atoms_to_457_executable");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({
  root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const binding = bindingFor(fixture, runtime);
assert.equal(fixture.sourceLockAudit.lockHash,
  "1adbdb652fafc09d01887981a3ae86f69e65e1f1480d804156a8da1d4d1757a1");
assert.equal(fixture.sourceLockAudit.repositoryFallbackAllowed, false);
assert.equal(slice.assaultRunProgress.sourceRefreshPerformed, false);
acceptance.push("sealed_official_source_lock_is_reused_without_refresh_or_repository_fallback");

const state = runState(fixture);
const domain = domainFor(runtime, state, binding);
assert.ok(domain);
assert.equal(domain.constraints.maxDistanceMilliInches, 4000);
assert.equal(domain.constraints.movementSideActivationMarkerRequired, true);
assert.equal(domain.constraints.assaultSideActivationMarkerMustBeAbsent, true);
acceptance.push("two_model_marine_run_uses_live_split_speed_and_requires_movement_side_marker");

const instantiated = runtime.instantiate(
  state,
  domain,
  runParameters(domain),
  { matchBinding: binding },
);
const applied = runtime.apply(state, executableAction(instantiated.action), {
  matchBinding: binding,
  postRevision: 1,
});
const actor = applied.state.pieces.find((piece) => piece.id === "p1-run");
assert.equal(actor.models[0].xInches, 8);
assert.deepEqual(actor.activatedPhases, { movement: true, assault: true, combat: false });
assert.equal(applied.state.activeSideKey, "player2");
assert.equal(applied.events[0].type, "unit_assault_ran");
acceptance.push("run_delegates_standard_move_geometry_then_writes_assault_marker_and_settles");

const sevenState = runState(fixture, { sevenModels: true });
const sevenDomain = domainFor(runtime, sevenState, binding);
assert.ok(sevenDomain);
assert.equal(sevenDomain.constraints.modelIds.length, 7);
assert.equal(sevenDomain.constraints.maxDistanceMilliInches, 4000);
const singleDomain = domainFor(runtime, runState(fixture, { singleModel: true }), binding);
assert.ok(singleDomain);
assert.equal(singleDomain.constraints.maxDistanceMilliInches, 7000);
acceptance.push("run_supports_arbitrary_profile_model_count_and_live_speed_bracket_not_ui_slots");

assert.equal(domainFor(runtime, runState(fixture, { movementActivated: false }), binding), undefined);
assert.equal(domainFor(runtime, runState(fixture, { engaged: true }), binding), undefined);
assert.throws(() => runtime.instantiate(
  state,
  domain,
  runParameters(domain, 5000),
  { matchBinding: binding },
), /MOVE_PATH_EXCEEDS_SPEED/u);
acceptance.push("unmoved_marker_engagement_and_over_speed_paths_fail_closed");

const stale = structuredClone(state);
stale.pieces.find((piece) => piece.id === "p1-run").models[0].xInches = 6;
assert.throws(() => runtime.instantiate(
  stale,
  domain,
  runParameters(domain),
  { matchBinding: binding },
), /ASSAULT_RUN_PARAMETER_DOMAIN_STALE/u);
acceptance.push("board_or_source_projection_change_invalidates_run_domain");

const manifestById = new Map(runtime.descriptor.executorManifest.map((entry) => [
  entry.executorId, entry,
]));
assert.deepEqual(manifestById.get("authority.assault-run-v1").actionTypes, ["run"]);
assert.deepEqual(manifestById.get("authority.assault-hold-v2").actionTypes, ["hold"]);
assert.ok(manifestById.get("authority.marine-charge-v2").actionTypes.includes("charge"));
assert.ok(manifestById.get("authority.ranged-attack-v6").actionTypes.includes("ranged_attack"));
acceptance.push("assault_choice_contract_routes_run_hold_charge_and_ranged_attack_to_distinct_executors");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const scope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_ASSAULT_RUN_RELATIONSHIP_SCOPE_ID
));
const required = scope.requiredEdges.find((entry) => (
  entry.from === "state_event:unit_assault_ran"
    && entry.to === "state_field:pieces[].activatedPhases.assault"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== required.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_blocks_missing_run_to_assault_marker_write");

assert.equal(sha256(await readFile(path.join(
  ROOT,
  "packages/rule-atoms/official-standard-move-executor-v1.mjs",
))), "e7c349f74524883e8205502d3afbe586737c0c938ce644fd3113916f86dfe56f");
acceptance.push("frozen_standard_move_v1_geometry_kernel_remains_byte_exact");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-77-run-short-seal-v1");
const initial = initialEnvelope(authority, fixture, runState(fixture));
const access = credentials(authority, initial, "run");
const authorityDomain = authority.legalSpace(initial, {
  seatAuthority: access.authority,
}).parameterDomains.find((entry) => entry.parameterKind === OFFICIAL_ASSAULT_RUN_PARAMETER_KIND);
assert.ok(authorityDomain);
const preview = authority.preview({
  envelope: initial,
  seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: runParameters(authorityDomain) },
});
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmed = authority.confirmPreview({
  envelope: initial,
  preview: preview.preview,
  seatAuthority: access.authority,
});
const authoritativeApplied = authority.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: preview.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: access.authority,
  controlLease: access.lease,
  idempotencyKey: "slice-77-run",
});
assert.equal(authoritativeApplied.ok, true, JSON.stringify(authoritativeApplied));
assert.equal(authoritativeApplied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
acceptance.push("authority_preview_confirm_apply_executes_run_with_long_term_ed25519_signature");

const replayEngine = engineFor(runtime, keys, "slice-77-run-rotated-seal-v2");
registerReplayDependencies(replayEngine, initial, fixture, runtime);
const replayed = replayEngine.replay({
  initialEnvelope: initial,
  journal: [authoritativeApplied.receipt],
});
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, authoritativeApplied.envelope.stateHash);
const tampered = structuredClone(authoritativeApplied.receipt);
tampered.events.push({ type: "forged_run_event" });
const rejected = replayEngine.replay({ initialEnvelope: initial, journal: [tampered] });
assert.equal(rejected.ok, false);
assert.equal(rejected.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_selfplay_or_training_promotion_occurs_in_slice77");

assert.equal(acceptance.length, 13);
const report = {
  schema: "starcraft_tmg_official_assault_run_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  sourceLockAudit: fixture.sourceLockAudit,
  slice,
  sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph,
  graphAudit: audit.graphAudit,
  coverage: audit.stateContractCoverage,
  authority: {
    previewConfirmApply: true,
    stages: 1,
    signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true,
    tamperRejected: true,
  },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesEligible: false,
  productionRoomEligible: false,
  rulesTruth: "official_current_marine_assault_run_v1",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(
  OUTPUT_DIR,
  "official-assault-run-rule-slice-v1-report.json",
), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: graph.graphHash,
  counts: audit.counts,
  sourceLockHash: fixture.sourceLockAudit.lockHash,
  sourceRefreshPerformed: false,
  repositoryFallbackUsed: false,
  trainingTruth: false,
}, null, 2));
