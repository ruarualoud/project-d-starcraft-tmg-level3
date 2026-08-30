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
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND,
  OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID,
  OFFICIAL_MARINE_CHARGE_V2_NEW_ATOM_IDS,
  OFFICIAL_MARINE_CHARGE_V2_RESOLUTION_PARAMETER_KIND,
} from "../packages/rule-atoms/official-marine-charge-executor-v2.mjs";
import { OFFICIAL_MARINE_CHARGE_V2_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-marine-charge-v2-relationship-contract-v1.mjs";
import {
  createOfficialMarineChargeV2RuleSliceV1,
  verifyOfficialMarineChargeV2RuleSliceV1,
} from "../packages/rule-atoms/official-marine-charge-v2-rule-slice-v1.mjs";
import {
  auditRuleRelationshipGraphV1,
} from "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { createOfficialMarineChargeFixtureV2 } from
  "./support/official-marine-charge-fixture-v2.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-stimpack-current-v2-contract-closure-v1-report.json",
), "utf8"));
const sourceLockReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-development-tranche-source-lock-report.json",
), "utf8"));
const acceptance = [];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}
function executableAction(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
function matchBinding(fixture, runtime) {
  return {
    bindingHash: "marine-charge-v2-direct-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
  };
}
function domainFor(runtime, state, binding, kind, pieceId = "p1-charge") {
  const enumeration = runtime.enumerate(state, {
    sideKey: state.activeSideKey,
    includeDisabled: true,
    matchBinding: binding,
  });
  const domain = enumeration.parameterDomains.find((entry) => (
    entry.parameterKind === kind
      && entry.executorId === OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID
      && entry.pieceId === pieceId
  ));
  assert.ok(domain, JSON.stringify(enumeration.candidates));
  return domain;
}
function credentials(engine, envelope, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `slice-75-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `slice-75-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}
function applyParameterized(engine, envelope, domain, parameters, suffix) {
  const access = credentials(engine, envelope, suffix);
  const preview = engine.preview({
    envelope,
    seatAuthority: access.authority,
    proposal: { kind: "parameterized", domainId: domain.domainId, parameters },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  const confirmed = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: access.authority,
  });
  assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmed.confirmation,
    seatAuthority: access.authority,
    controlLease: access.lease,
    idempotencyKey: `slice-75-${suffix}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return { preview, confirmed, applied };
}
function authoritativeEngine(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-30T14:30:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-slice-75-marine-charge-v2",
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      hmacSecret,
    },
  });
}
function initialEnvelope(engine, fixture, state, roomId) {
  return engine.createEnvelope({
    roomId,
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
  const contents = {
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
    geometryArtifact: {
      kind: "geometry-artifact",
      geometryVersion: "fixed_point_round_base_v1",
    },
    actionSchema: { kind: "action-schema", schemaVersion: "hybrid_legal_space_v25" },
  };
  for (const [kind, content] of Object.entries(contents)) {
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

const slice = createOfficialMarineChargeV2RuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialMarineChargeV2RuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.deepEqual(audit.counts, {
  executableRuleAtoms: 445,
  newlyExecutableRuleAtoms: 24,
  reviewRequiredRuleAtoms: 467,
  displayOnlyRuleAtoms: 114,
  strictCompleteAtoms: 445,
  partialContractAtoms: 0,
  noContractAtoms: 0,
  declaredStateContractExecutors: 43,
  missingStateContractExecutors: 0,
});
assert.equal(OFFICIAL_MARINE_CHARGE_V2_NEW_ATOM_IDS.length, 24);
acceptance.push("slice75_promotes_exactly_24_charge_atoms_to_445_of_912_executable");

assert.equal(sourceLockReport.sourceLock.snapshotHash,
  "8828471846f5befa2e7eb464d64dfebf834e7aba5c1908381a44b29f5529e105");
assert.equal(sourceLockReport.sourceLock.sameVersionDrift.canAffectRules, false);
acceptance.push("pinned_official_source_lock_is_reused_without_network_refresh_or_rule_drift");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialMarineChargeFixtureV2({
  root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const binding = matchBinding(fixture, runtime);
const state = fixture.battleState();
const declarationDomain = domainFor(
  runtime,
  state,
  binding,
  OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND,
);
assert.equal(declarationDomain.constraints.speedInches, 4);
assert.equal(declarationDomain.parameterSchema.targetUnitCount.maximum, null);
assert.equal(declarationDomain.constraints.sourceLockHash,
  fixture.sourceLockAudit.lockHash);
acceptance.push("multi_model_speed_and_unbounded_target_denominator_are_source_locked");

const singleState = fixture.battleState({
  pieces: [
    { id: "p1-charge", sideKey: "player1", positions: [{ xInches: 5, yInches: 10 }] },
    { id: "p2-target-a", sideKey: "player2", positions: [{ xInches: 12, yInches: 10 }] },
  ],
});
assert.equal(domainFor(runtime, singleState, binding,
  OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND).constraints.speedInches, 7);
acceptance.push("single_model_charge_uses_the_official_seven_inch_speed_value");

const arbitraryState = fixture.battleState({
  pieces: [
    { id: "p1-charge", sideKey: "player1", positions: [{ xInches: 5, yInches: 10 }] },
    { id: "p2-a", sideKey: "player2", positions: [{ xInches: 12, yInches: 8 }] },
    { id: "p2-b", sideKey: "player2", positions: [{ xInches: 12, yInches: 10 }] },
    { id: "p2-c", sideKey: "player2", positions: [{ xInches: 12, yInches: 12 }] },
  ],
});
const arbitraryDomain = domainFor(runtime, arbitraryState, binding,
  OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND);
const arbitraryDeclaration = runtime.instantiate(arbitraryState, arbitraryDomain, {
  leadingModelId: "p1-charge-model-1",
  targets: ["a", "b", "c"].map((suffix) => ({
    unitId: `p2-${suffix}`,
    modelId: `p2-${suffix}-model-1`,
  })),
}, { matchBinding: binding });
assert.equal(arbitraryDeclaration.canonicalParameters.targets.length, 3);
acceptance.push("three_targets_prove_the_domain_is_not_hard_coded_to_two_or_eight_slots");

const declaration = runtime.instantiate(state, declarationDomain, {
  leadingModelId: "p1-charge-model-1",
  targets: [
    { unitId: "p2-target-b", modelId: "p2-target-b-model-1" },
    { unitId: "p2-target-a", modelId: "p2-target-a-model-1" },
  ],
}, { matchBinding: binding });
const opened = runtime.apply(state, executableAction(declaration.action), {
  matchBinding: binding,
  chanceReveals: [{ faces: 6, outcome: 5 }],
  postRevision: 1,
});
assert.equal(opened.state.pendingAction.schema,
  "starcraft_tmg_official_marine_charge_pending_v2");
assert.equal(opened.state.pendingAction.chargeRollDistanceInches, 9);
assert.equal(opened.state.pieces[0].activatedPhases.assault, false);
acceptance.push("targets_are_declared_before_the_hidden_d6_and_resolution_stays_pending");

const resolutionDomain = domainFor(runtime, opened.state, binding,
  OFFICIAL_MARINE_CHARGE_V2_RESOLUTION_PARAMETER_KIND);
const success = runtime.instantiate(opened.state, resolutionDomain, {
  outcome: "success",
  path: [{ xMilliInches: 10_909, yMilliInches: 10_000 }],
  placements: [{
    modelId: "p1-charge-model-2",
    xMilliInches: 13_091,
    yMilliInches: 10_000,
  }],
}, { matchBinding: binding });
const succeeded = runtime.apply(opened.state, executableAction(success.action), {
  matchBinding: binding,
  postRevision: 2,
});
assert.deepEqual(succeeded.state.pieces[0].models.map((model) => [
  model.xInches,
  model.yInches,
]), [[10.909, 10], [13.091, 10]]);
assert.equal(succeeded.state.pieces[0].activatedPhases.assault, true);
assert.equal(succeeded.state.pendingAction, null);
assert.equal(succeeded.state.activeSideKey, "player2");
acceptance.push("successful_resolution_moves_every_model_clears_pending_and_settles_alternation");

assert.throws(() => runtime.instantiate(opened.state, resolutionDomain, {
  outcome: "success",
  path: [{ xMilliInches: 12_000, yMilliInches: 10_000 }],
  placements: [{
    modelId: "p1-charge-model-2",
    xMilliInches: 13_091,
    yMilliInches: 10_000,
  }],
}, { matchBinding: binding }), /CHARGE_PATH_COLLISION|CHARGE_BASE_OVERLAP/u);
acceptance.push("path_collision_and_endpoint_overlap_fail_closed");

const staleState = structuredClone(opened.state);
staleState.pieces.find((piece) => piece.id === "p2-target-a").models[0].xInches += 1;
const staleEnumeration = runtime.enumerate(staleState, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: binding,
});
assert.equal(staleEnumeration.parameterDomains.length, 0);
assert.ok(staleEnumeration.candidates.some((candidate) => (
  candidate.disabledReason === "CHARGE_TARGET_STALE"
    || candidate.disabledReason === "CHARGE_PENDING_STALE"
)));
acceptance.push("target_position_change_invalidates_the_pending_resolution_domain");

const tamperedSourceState = structuredClone(state);
tamperedSourceState.officialDevelopmentTrancheSourceLockAudit.lockHash = "f".repeat(64);
assert.throws(() => runtime.enumerate(tamperedSourceState, {
  sideKey: "player1",
  matchBinding: binding,
}), /CHARGE_V2_SOURCE_LOCK_BINDING_INVALID/u);
acceptance.push("source_lock_or_adapter_tamper_is_rejected_before_legal_space");

const farState = fixture.battleState({
  pieces: [
    {
      id: "p1-charge",
      sideKey: "player1",
      positions: [{ xInches: 5, yInches: 10 }, { xInches: 5, yInches: 12 }],
    },
    { id: "p2-far", sideKey: "player2", positions: [{ xInches: 20, yInches: 10 }] },
  ],
});
const farDeclarationDomain = domainFor(runtime, farState, binding,
  OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND);
const farDeclaration = runtime.instantiate(farState, farDeclarationDomain, {
  leadingModelId: "p1-charge-model-1",
  targets: [{ unitId: "p2-far", modelId: "p2-far-model-1" }],
}, { matchBinding: binding });
const farOpened = runtime.apply(farState, executableAction(farDeclaration.action), {
  matchBinding: binding,
  chanceReveals: [{ faces: 6, outcome: 1 }],
  postRevision: 1,
});
const farResolutionDomain = domainFor(runtime, farOpened.state, binding,
  OFFICIAL_MARINE_CHARGE_V2_RESOLUTION_PARAMETER_KIND);
const failure = runtime.instantiate(farOpened.state, farResolutionDomain, {
  outcome: "failure",
  failureProof: { kind: "distance_shortfall" },
}, { matchBinding: binding });
const failed = runtime.apply(farOpened.state, executableAction(failure.action), {
  matchBinding: binding,
  postRevision: 2,
});
assert.equal(failed.events[0].type, "marine_charge_failed");
assert.equal(failed.state.pieces[0].models[0].xInches, 5);
assert.equal(failed.state.pieces[0].activatedPhases.assault, true);
assert.equal(failed.state.activeSideKey, "player2");
acceptance.push("proven_distance_shortfall_applies_no_move_and_ends_the_assault_activation");

assert.throws(() => runtime.instantiate(opened.state, resolutionDomain, {
  outcome: "failure",
  failureProof: { kind: "distance_shortfall" },
}, { matchBinding: binding }), /CHARGE_V2_FAILURE_NOT_PROVEN/u);
acceptance.push("player_claimed_failure_without_a_rules_owned_proof_is_rejected");

const flyingState = fixture.battleState({
  pieces: [
    { id: "p1-charge", sideKey: "player1", positions: [{ xInches: 5, yInches: 10 }] },
    {
      id: "p2-flying",
      sideKey: "player2",
      flying: true,
      positions: [{ xInches: 12, yInches: 10 }],
    },
  ],
});
const flyingSpace = runtime.enumerate(flyingState, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: binding,
});
assert.equal(flyingSpace.parameterDomains.some((entry) => (
  entry.executorId === OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID
)), false);
assert.ok(flyingSpace.candidates.some((candidate) => (
  candidate.disabledReason === "CHARGE_UNIT_DENOMINATOR_UNSUPPORTED"
)));
acceptance.push("flying_units_are_rejected_from_the_bounded_ground_charge_denominator");

const graph = audit.graph;
const graphAudit = auditRuleRelationshipGraphV1(graph);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.counts.declaredStateContractExecutors, 43);
const brokenGraph = structuredClone(graph);
const chargeScope = brokenGraph.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_MARINE_CHARGE_V2_RELATIONSHIP_SCOPE_ID
));
const invalidationEdge = chargeScope.requiredEdges.find((entry) => (
  entry.relationship === "invalidates"
));
brokenGraph.edges = brokenGraph.edges.filter((entry) => entry.edgeId !== invalidationEdge.edgeId);
brokenGraph.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(brokenGraph).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(brokenGraph).valid, false);
acceptance.push("charge_relationship_graph_is_complete_and_a_missing_invalidation_edge_fails");

for (const [relativePath, expectedHash] of [
  ["packages/rule-atoms/official-marine-charge-executor-v1.mjs",
    "8bba198aa8381b1137e129065fdf6637db1a1d7fe336a32a8092528781d805f5"],
  ["packages/rule-atoms/official-marine-charge-rule-slice-v1.mjs",
    "0c0d7d4d889c8b4595b5bb4e45999eba06380a0fb4119189197533262193a1a8"],
  ["scripts/verify-official-marine-charge-rule-slice-v1.mjs",
    "be55a075fd3e33c3dd2ee50f47e6e54e0025444f408864a008e9eb27cb4110ca"],
  ["scripts/support/official-marine-charge-fixture-v1.mjs",
    "30e37511f12a04924dcf30cf381d078309e292bbfe39ee00ce1ac17e353b0912"],
]) {
  assert.equal(sha256(await readFile(path.join(ROOT, relativePath))), expectedHash);
}
acceptance.push("all_four_charge_v1_artifacts_remain_byte_exact_for_history_and_rules_display");

const keys = generateKeyPairSync("ed25519");
const engine = authoritativeEngine(runtime, keys, "slice-75-charge-short-seal-v1");
const authorityInitial = initialEnvelope(
  engine,
  fixture,
  fixture.battleState(),
  "official-slice-75-charge-success-room",
);
const initialAccess = credentials(engine, authorityInitial, "success-read");
const authorityDeclarationDomain = engine.legalSpace(authorityInitial, {
  seatAuthority: initialAccess.authority,
}).parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND
));
const authorityDeclaration = applyParameterized(
  engine,
  authorityInitial,
  authorityDeclarationDomain,
  declaration.canonicalParameters,
  "authority-declaration",
);
assert.equal(authorityDeclaration.preview.preview.core.chanceTicket.spec.faces, 6);
assert.equal(authorityDeclaration.applied.receipt.refereeSignature.signatureAlgorithm, "ed25519");
const authorityRoll = authorityDeclaration.applied.receipt.chanceReveal.reveals[0].outcome;
const pendingAccess = credentials(engine, authorityDeclaration.applied.envelope, "success-pending-read");
const authorityResolutionDomain = engine.legalSpace(
  authorityDeclaration.applied.envelope,
  { seatAuthority: pendingAccess.authority },
).parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_MARINE_CHARGE_V2_RESOLUTION_PARAMETER_KIND
));
const authorityResolutionParameters = authorityRoll === 1
  ? {
      outcome: "success",
      path: [{ xMilliInches: 10_000, yMilliInches: 10_000 }],
      placements: [{
        modelId: "p1-charge-model-2",
        xMilliInches: 12_000,
        yMilliInches: 8_110,
      }],
    }
  : {
      outcome: "success",
      path: [{ xMilliInches: 10_909, yMilliInches: 10_000 }],
      placements: [{
        modelId: "p1-charge-model-2",
        xMilliInches: 13_091,
        yMilliInches: 10_000,
      }],
    };
const authorityResolution = applyParameterized(
  engine,
  authorityDeclaration.applied.envelope,
  authorityResolutionDomain,
  authorityResolutionParameters,
  "authority-success-resolution",
);
assert.equal(authorityResolution.applied.envelope.state.pendingAction, null);
assert.equal(authorityResolution.applied.envelope.state.pieces[0].activatedPhases.assault, true);
assert.equal(authorityResolution.applied.receipt.action.executorId,
  OFFICIAL_MARINE_CHARGE_V2_EXECUTOR_ID);
acceptance.push("authority_preview_confirm_apply_closes_both_declaration_and_success_resolution");

const replayEngine = authoritativeEngine(runtime, keys, "slice-75-charge-rotated-seal-v2");
registerReplayDependencies(replayEngine, authorityInitial, fixture, runtime);
const journal = [authorityDeclaration.applied.receipt, authorityResolution.applied.receipt];
const replayed = replayEngine.replay({ initialEnvelope: authorityInitial, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, authorityResolution.applied.envelope.stateHash);
const tamperedJournal = structuredClone(journal);
tamperedJournal[1].events.push({ type: "forged_charge_event" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope: authorityInitial,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("two_ed25519_receipts_replay_after_hmac_rotation_and_tamper_fails");

const failureEngine = authoritativeEngine(runtime, keys, "slice-75-failure-short-seal-v1");
const authorityFailureInitial = initialEnvelope(
  failureEngine,
  fixture,
  farState,
  "official-slice-75-charge-failure-room",
);
const failureRead = credentials(failureEngine, authorityFailureInitial, "failure-read");
const authorityFarDeclarationDomain = failureEngine.legalSpace(authorityFailureInitial, {
  seatAuthority: failureRead.authority,
}).parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_MARINE_CHARGE_V2_DECLARATION_PARAMETER_KIND
));
const authorityFarDeclaration = applyParameterized(
  failureEngine,
  authorityFailureInitial,
  authorityFarDeclarationDomain,
  farDeclaration.canonicalParameters,
  "authority-failure-declaration",
);
const failurePendingRead = credentials(
  failureEngine,
  authorityFarDeclaration.applied.envelope,
  "failure-pending-read",
);
const authorityFailureDomain = failureEngine.legalSpace(
  authorityFarDeclaration.applied.envelope,
  { seatAuthority: failurePendingRead.authority },
).parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_MARINE_CHARGE_V2_RESOLUTION_PARAMETER_KIND
));
const authorityFailure = applyParameterized(
  failureEngine,
  authorityFarDeclaration.applied.envelope,
  authorityFailureDomain,
  { outcome: "failure", failureProof: { kind: "distance_shortfall" } },
  "authority-failure-resolution",
);
assert.equal(authorityFailure.applied.receipt.events[0].type, "marine_charge_failed");
assert.equal(authorityFailure.applied.envelope.state.pieces[0].models[0].xInches, 5);
acceptance.push("authority_failure_branch_is_rules_proven_confirmed_and_applied_without_movement");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs_in_slice75");

assert.equal(acceptance.length, 19);
const report = {
  schema: "starcraft_tmg_official_marine_charge_v2_rule_slice_verification_v1",
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
  graphAudit,
  coverage: audit.stateContractCoverage,
  authority: {
    previewConfirmApply: true,
    successBranch: true,
    failureBranch: true,
    signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true,
    tamperRejected: true,
  },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesEligible: false,
  productionRoomEligible: false,
  rulesTruth: "official_current_marine_charge_v2",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(
  OUTPUT_DIR,
  "official-marine-charge-v2-rule-slice-v1-report.json",
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
  repositoryFallbackUsed: false,
  trainingTruth: false,
}, null, 2));
