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
  OFFICIAL_GOLIATH_CHARGE_DECLARATION_PARAMETER_KIND,
  OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID,
  OFFICIAL_GOLIATH_CHARGE_RESOLUTION_PARAMETER_KIND,
} from "../packages/rule-atoms/official-goliath-charge-executor-v1.mjs";
import {
  OFFICIAL_IMPACT_EXECUTOR_ID,
  OFFICIAL_IMPACT_NEW_ATOM_IDS,
  OFFICIAL_IMPACT_PARAMETER_KIND,
} from "../packages/rule-atoms/official-impact-executor-v1.mjs";
import { OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID } from
  "../packages/rule-atoms/official-impact-after-charge-relationship-contract-v1.mjs";
import {
  createOfficialImpactAfterChargeRuleSliceV1,
  verifyOfficialImpactAfterChargeRuleSliceV1,
} from "../packages/rule-atoms/official-impact-after-charge-rule-slice-v1.mjs";
import { auditRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { verifyOfficialImpactStateBindingV1 } from
  "../packages/source-data/official-impact-profile-bundle-v1.mjs";
import { createOfficialImpactAfterChargeFixtureV1 } from
  "./support/official-impact-after-charge-fixture-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-marine-charge-v2-rule-slice-v1-report.json",
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
    bindingHash: "impact-after-charge-direct-binding",
    dataSnapshotHash: hashStarcraftTmgContract(fixture.gameplayDataBundle),
    rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
  };
}
function domainFor(runtime, state, binding, parameterKind, executorId) {
  const space = runtime.enumerate(state, {
    sideKey: state.activeSideKey,
    includeDisabled: true,
    matchBinding: binding,
  });
  const domain = space.parameterDomains.find((entry) => (
    entry.parameterKind === parameterKind
      && entry.executorId === executorId
      && entry.pieceId === "p1-goliath"
  ));
  assert.ok(domain, JSON.stringify(space.candidates));
  return domain;
}
function chargeParameters(targetIds) {
  return {
    leadingModelId: "p1-goliath-model-1",
    targets: targetIds.map((unitId) => ({ unitId, modelId: `${unitId}-model-1` })),
  };
}
function directChargeToImpact(runtime, state, binding, targetIds, endpoint) {
  let domain = domainFor(runtime, state, binding,
    OFFICIAL_GOLIATH_CHARGE_DECLARATION_PARAMETER_KIND,
    OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID);
  const declaration = runtime.instantiate(
    state, domain, chargeParameters(targetIds), { matchBinding: binding },
  );
  const opened = runtime.apply(state, executableAction(declaration.action), {
    matchBinding: binding,
    chanceReveals: [{ faces: 6, outcome: 4 }],
    postRevision: 1,
  });
  domain = domainFor(runtime, opened.state, binding,
    OFFICIAL_GOLIATH_CHARGE_RESOLUTION_PARAMETER_KIND,
    OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID);
  const resolution = runtime.instantiate(opened.state, domain, {
    outcome: "success",
    path: [endpoint],
  }, { matchBinding: binding });
  const succeeded = runtime.apply(opened.state, executableAction(resolution.action), {
    matchBinding: binding,
    postRevision: 2,
  });
  return { declaration, opened, resolution, succeeded };
}
function credentials(engine, envelope, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `slice-76-${suffix}-grant`,
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
      sessionId: `slice-76-${suffix}-session`,
      leaseFence: 1,
      issuedAtRoomRevision: envelope.stateRevision,
    }),
  };
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
    idempotencyKey: `slice-76-${suffix}`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return applied;
}
function engineFor(runtime, keys, hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-30T16:00:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-slice-76-impact-after-charge",
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      hmacSecret,
    },
  });
}
function initialEnvelope(engine, fixture, state) {
  return engine.createEnvelope({
    roomId: "official-slice-76-impact-room",
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

const slice = createOfficialImpactAfterChargeRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialImpactAfterChargeRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.deepEqual(audit.counts, {
  executableRuleAtoms: 451,
  newlyExecutableRuleAtoms: 6,
  reviewRequiredRuleAtoms: 461,
  displayOnlyRuleAtoms: 114,
  strictCompleteAtoms: 451,
  partialContractAtoms: 0,
  noContractAtoms: 0,
  declaredStateContractExecutors: 45,
  missingStateContractExecutors: 0,
});
assert.equal(OFFICIAL_IMPACT_NEW_ATOM_IDS.length, 6);
assert.equal(OFFICIAL_IMPACT_NEW_ATOM_IDS.includes(
  "rule-atom:singleton:core-11-hidden-impact-immunity:6ee45ab3f111",
), false);
acceptance.push("slice76_promotes_six_impact_atoms_to_451_executable_and_defers_hidden_immunity");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const fixture = await createOfficialImpactAfterChargeFixtureV1({
  root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash,
});
const binding = bindingFor(fixture, runtime);
const profile = fixture.officialImpactProfile;
assert.deepEqual({
  unit: profile.unitName,
  speed: profile.speedInches,
  base: profile.baseDiameterMillimetres,
  impact: profile.impactDice,
  hit: profile.impactHitThreshold,
  p2pPage: profile.terranP2pLocator.pdfPage,
  refresh: profile.sourcePolicy.refreshDuringDevelopment,
}, { unit: "Goliath", speed: 7, base: 80, impact: 4, hit: 3, p2pPage: 7, refresh: false });
acceptance.push("pinned_latest_official_goliath_profile_proves_speed_base_and_devastating_charge");

const state = fixture.battleState();
const declarationDomain = domainFor(runtime, state, binding,
  OFFICIAL_GOLIATH_CHARGE_DECLARATION_PARAMETER_KIND,
  OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID);
assert.equal(declarationDomain.constraints.speedInches, 7);
assert.equal(declarationDomain.constraints.baseDiameterMilliInches, 3150);
assert.equal(declarationDomain.parameterSchema.targetUnitCount.maximum, null);
acceptance.push("goliath_charge_is_a_real_unbounded_target_consumer_of_existing_charge_atoms");

const chain = directChargeToImpact(
  runtime,
  state,
  binding,
  ["p2-target-a", "p2-target-b"],
  { xMilliInches: 9230, yMilliInches: 18000 },
);
assert.equal(chain.opened.state.pendingAction.schema,
  "starcraft_tmg_official_goliath_charge_pending_v1");
assert.equal(chain.succeeded.state.pendingAction.schema,
  "starcraft_tmg_official_impact_pending_v1");
assert.equal(chain.succeeded.state.activeSideKey, "player1");
acceptance.push("successful_charge_opens_mandatory_impact_before_alternating_settlement");

const impactDomain = domainFor(runtime, chain.succeeded.state, binding,
  OFFICIAL_IMPACT_PARAMETER_KIND, OFFICIAL_IMPACT_EXECUTOR_ID);
const impact = runtime.instantiate(chain.succeeded.state, impactDomain, {
  allocations: [
    { targetUnitId: "p2-target-a", dice: 1 },
    { targetUnitId: "p2-target-b", dice: 3 },
  ],
}, { matchBinding: binding });
assert.deepEqual(impact.action.impactPlan.rollLayout.map((entry) => [
  entry.hitRollOffset, entry.armourReserveOffset,
]), [[0, 1], [2, 5]]);
const resolved = runtime.apply(chain.succeeded.state, executableAction(impact.action), {
  matchBinding: binding,
  chanceReveals: [6, 2, 6, 4, 1, 5, 2, 2],
  postRevision: 3,
});
assert.deepEqual(resolved.state.pieces.slice(1).map((piece) => piece.damageMarker), [1, 1]);
assert.deepEqual(resolved.events[0].targetResults.map((entry) => [
  entry.hits, entry.saves, entry.damageApplied,
]), [[1, 0, 1], [2, 1, 1]]);
assert.equal(resolved.events[0].surgeResolved, false);
assert.equal(resolved.events[0].damagePerUnsavedDie, 1);
assert.equal(resolved.state.activeSideKey, "player2");
acceptance.push("multiple_target_impact_resolves_each_hit_then_armour_with_no_surge_and_damage_one");

assert.throws(() => runtime.instantiate(chain.succeeded.state, impactDomain, {
  allocations: [
    { targetUnitId: "p2-target-a", dice: 2 },
    { targetUnitId: "p2-target-b", dice: 1 },
  ],
}, { matchBinding: binding }), /IMPACT_ALLOCATION_DENOMINATOR_INVALID/u);
acceptance.push("multiple_target_allocation_must_name_every_target_and_sum_to_four");

const singleState = fixture.battleState({
  pieces: [
    { id: "p1-goliath", sideKey: "player1", xInches: 5, yInches: 18 },
    { id: "p2-single", sideKey: "player2", xInches: 12, yInches: 18 },
  ],
});
const singleChain = directChargeToImpact(
  runtime, singleState, binding, ["p2-single"],
  { xMilliInches: 8850, yMilliInches: 18000 },
);
const singleDomain = domainFor(runtime, singleChain.succeeded.state, binding,
  OFFICIAL_IMPACT_PARAMETER_KIND, OFFICIAL_IMPACT_EXECUTOR_ID);
assert.throws(() => runtime.instantiate(singleChain.succeeded.state, singleDomain, {
  allocations: [{ targetUnitId: "p2-single", dice: 3 }],
}, { matchBinding: binding }), /IMPACT_ALLOCATION_DENOMINATOR_INVALID/u);
assert.equal(runtime.instantiate(singleChain.succeeded.state, singleDomain, {
  allocations: [{ targetUnitId: "p2-single", dice: 4 }],
}, { matchBinding: binding }).canonicalParameters.allocations[0].dice, 4);
acceptance.push("single_enemy_unit_forces_all_four_impact_dice_into_that_target");

const stale = structuredClone(chain.succeeded.state);
stale.pieces.find((piece) => piece.id === "p2-target-a").damageMarker = 1;
const staleSpace = runtime.enumerate(stale, {
  sideKey: "player1", includeDisabled: true, matchBinding: binding,
});
assert.equal(staleSpace.parameterDomains.length, 0);
assert.ok(staleSpace.candidates.some((candidate) => [
  "IMPACT_UNIT_DENOMINATOR_UNSUPPORTED", "IMPACT_PENDING_INVALID",
].includes(candidate.disabledReason)));
const tamperedSource = structuredClone(state);
tamperedSource.officialImpactProfile.speedInches = 8;
assert.throws(() => verifyOfficialImpactStateBindingV1(tamperedSource), /IMPACT_PROFILE_INVALID/u);
acceptance.push("pending_target_or_source_profile_drift_invalidates_legal_space");

const injured = fixture.battleState({
  pieces: [
    { id: "p1-goliath", sideKey: "player1", xInches: 5, yInches: 18 },
    { id: "p2-injured", sideKey: "player2", xInches: 12, yInches: 18, damageMarker: 1 },
  ],
});
const injuredSpace = runtime.enumerate(injured, {
  sideKey: "player1", includeDisabled: true, matchBinding: binding,
});
assert.equal(injuredSpace.parameterDomains.some((entry) => (
  entry.executorId === OFFICIAL_GOLIATH_CHARGE_EXECUTOR_ID
)), false);
acceptance.push("injured_and_broader_casualty_states_are_quarantined_without_silent_compatibility");

const graph = audit.graph;
assert.equal(auditRuleRelationshipGraphV1(graph).valid, true);
const broken = structuredClone(graph);
const impactScope = broken.coverageScopes.find((entry) => (
  entry.scopeId === OFFICIAL_IMPACT_RELATIONSHIP_SCOPE_ID
));
const triggerEdge = impactScope.requiredEdges.find((entry) => (
  entry.from === "state_event:goliath_charge_succeeded"
    && entry.to === "state_event:impact_triggered_after_successful_charge"
));
broken.edges = broken.edges.filter((entry) => entry.edgeId !== triggerEdge.edgeId);
broken.graphHash = hashStarcraftTmgContract(Object.fromEntries(
  Object.entries(broken).filter(([key]) => key !== "graphHash"),
));
assert.equal(auditRuleRelationshipGraphV1(broken).valid, false);
acceptance.push("relationship_graph_makes_charge_to_impact_reachability_a_blocking_contract");

for (const [relativePath, expectedHash] of [
  ["packages/rule-atoms/official-marine-charge-executor-v2.mjs",
    "da371b3cdf3c59d08626349387ca1e32c5ddf4c619d13e78af3b2fd4c4afce93"],
  ["packages/rule-atoms/official-marine-charge-v2-rule-slice-v1.mjs",
    "0a72bdfb99746ea73d96e4a3d02b31feb1d43d3243118a9594e5c9deb6285fa3"],
  ["scripts/verify-official-marine-charge-v2-rule-slice-v1.mjs",
    "34d14947acdc7be0d9c30131f42fe6491f28f07eb0f7cb58051a9ac9bcb5b8c1"],
  ["scripts/support/official-marine-charge-fixture-v2.mjs",
    "1103d89367e8ea0b28a71a3177178eed3c86d24ce0362ffb15637d1260dc8a6d"],
]) {
  assert.equal(sha256(await readFile(path.join(ROOT, relativePath))), expectedHash);
}
acceptance.push("marine_charge_v2_implementation_slice_judge_and_fixture_remain_byte_exact");

const keys = generateKeyPairSync("ed25519");
const authority = engineFor(runtime, keys, "slice-76-impact-short-seal-v1");
const initial = initialEnvelope(authority, fixture, fixture.battleState());
let access = credentials(authority, initial, "initial-read");
let domain = authority.legalSpace(initial, {
  seatAuthority: access.authority,
}).parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_GOLIATH_CHARGE_DECLARATION_PARAMETER_KIND
));
const declared = applyParameterized(authority, initial, domain,
  chargeParameters(["p2-target-a", "p2-target-b"]), "declaration");
access = credentials(authority, declared.envelope, "charge-pending-read");
domain = authority.legalSpace(declared.envelope, {
  seatAuthority: access.authority,
}).parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_GOLIATH_CHARGE_RESOLUTION_PARAMETER_KIND
));
const charged = applyParameterized(authority, declared.envelope, domain, {
  outcome: "success",
  path: [{ xMilliInches: 9230, yMilliInches: 18000 }],
}, "charge-resolution");
access = credentials(authority, charged.envelope, "impact-pending-read");
domain = authority.legalSpace(charged.envelope, {
  seatAuthority: access.authority,
}).parameterDomains.find((entry) => entry.parameterKind === OFFICIAL_IMPACT_PARAMETER_KIND);
const impacted = applyParameterized(authority, charged.envelope, domain, {
  allocations: [
    { targetUnitId: "p2-target-a", dice: 1 },
    { targetUnitId: "p2-target-b", dice: 3 },
  ],
}, "impact-resolution");
assert.equal(declared.receipt.refereeSignature.signatureAlgorithm, "ed25519");
assert.equal(impacted.envelope.state.pendingAction, null);
assert.equal(impacted.envelope.state.activeSideKey, "player2");
acceptance.push("authority_preview_confirm_apply_executes_all_three_charge_to_impact_stages");

const replayEngine = engineFor(runtime, keys, "slice-76-impact-rotated-seal-v2");
registerReplayDependencies(replayEngine, initial, fixture, runtime);
const journal = [declared.receipt, charged.receipt, impacted.receipt];
const replayed = replayEngine.replay({ initialEnvelope: initial, journal });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, impacted.envelope.stateHash);
const tampered = structuredClone(journal);
tampered[2].events.push({ type: "forged_impact_event" });
const rejected = replayEngine.replay({ initialEnvelope: initial, journal: tampered });
assert.equal(rejected.ok, false);
assert.equal(rejected.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_three_receipt_replay_survives_hmac_rotation_and_rejects_tamper");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_selfplay_or_training_promotion_occurs_in_slice76");

assert.equal(acceptance.length, 14);
const report = {
  schema: "starcraft_tmg_official_impact_after_charge_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  sourceLockAudit: fixture.audit,
  impactProfile: profile,
  slice,
  sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph,
  graphAudit: audit.graphAudit,
  coverage: audit.stateContractCoverage,
  authority: {
    previewConfirmApply: true,
    stages: 3,
    signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true,
    tamperRejected: true,
  },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesEligible: false,
  productionRoomEligible: false,
  rulesTruth: "official_current_goliath_successful_charge_to_impact_v1",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(
  OUTPUT_DIR,
  "official-impact-after-charge-rule-slice-v1-report.json",
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
  sourceLockHash: fixture.audit.lockHash,
  sourceRefreshPerformed: false,
  repositoryFallbackUsed: false,
  trainingTruth: false,
}, null, 2));
