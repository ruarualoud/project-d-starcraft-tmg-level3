#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  applyOfficialMarineOptionalStimpackMoveV2,
  enumerateOfficialMarineOptionalStimpackMoveV2,
  instantiateOfficialMarineOptionalStimpackMoveV2,
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID,
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_VERSION,
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_PARAMETER_KIND,
} from "../packages/rule-atoms/official-marine-optional-stimpack-move-executor-v2.mjs";
import {
  createOfficialMarineOptionalStimpackMoveRuleSliceV2,
  verifyOfficialMarineOptionalStimpackMoveRuleSliceV2,
} from "../packages/rule-atoms/official-marine-optional-stimpack-move-rule-slice-v2.mjs";
import { createOfficialMarineOptionalStimpackMoveFixtureV2 } from
  "./support/official-marine-optional-stimpack-move-fixture-v2.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-26T00:00:00.000Z";
const FIRESTORE_ROOT =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents";
const URLS = Object.freeze({
  versions: `${FIRESTORE_ROOT}/system_metadata/versions`,
  marine: `${FIRESTORE_ROOT}/army_units/marine`,
  part5: `${FIRESTORE_ROOT}/rules_sections/u3zNStKpd5XegMjmJfMS`,
  part8: `${FIRESTORE_ROOT}/rules_sections/iuUyObNTQ2M8xK4IUqzC`,
  part10: `${FIRESTORE_ROOT}/rules_sections/H3Fn8YSvEvpJZpT57qw1`,
  part11: `${FIRESTORE_ROOT}/rules_sections/FuahgilWtc8nccVSp2Vv`,
  corePdf: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  terranP2p:
    "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
});
const acceptance = [];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function documentHash(document) {
  return sha256(`${canonicalStarcraftTmgJson(document)}\n`);
}

function firestoreStrings(value) {
  if (!value || typeof value !== "object") return [];
  const own = typeof value.stringValue === "string" ? [value.stringValue] : [];
  return [...own, ...Object.values(value).flatMap((child) => firestoreStrings(child))];
}

async function fetchOfficial(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) {
        const bytes = Buffer.from(await response.arrayBuffer());
        return new Response(bytes, {
          status: response.status,
          headers: response.headers,
        });
      }
      lastError = new Error(`${kind} HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) {
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
    }
  }
  throw lastError;
}

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-stimpack-speed-move-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialMarineOptionalStimpackMoveRuleSliceV2({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialMarineOptionalStimpackMoveRuleSliceV2({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 421);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 491);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 0);
assert.equal(audit.counts.versionReassignedRuleAtoms, 0);
assert.equal(audit.counts.changedAtoms, 0);
acceptance.push("composition_slice_adds_an_executor_without_mutating_or_promoting_atoms");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 421);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 605);
assert.ok(runtime.descriptor.parameterDomainKinds.includes(
  OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_PARAMETER_KIND,
));
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(
  historicalRuntime.descriptor.runtimeHash,
  "6206a3058aec4ec9750a27465b5c203049b50a9cb7bafb7763be39810a3ece86",
);
acceptance.push("runtime_adds_v2_while_slice41_runtime_stays_exact");

const {
  snapshot,
  dataset,
  gameplayDataBundle,
  battleState,
} = await createOfficialMarineOptionalStimpackMoveFixtureV2({
  root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash,
});
assert.equal(snapshot.snapshotHash,
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78");
assert.equal(dataset.datasetHash,
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a");
assert.equal(gameplayDataBundle.gameplayDataBundleHash,
  "0bfdd8678995b4aaa439fba2fbb75d96f26e067af2cdf86ca96eecc25ef93098");
assert.equal(gameplayDataBundle.reserveDeployDataBundle.unitMovementProfile.sourceValue, "4/7");
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
acceptance.push("comprehensive_latest_bundle_binds_split_speed_cleanup_and_geometry_without_fallback");

const liveResponses = await Promise.all(Object.entries(URLS).map(async ([key, url]) => (
  [key, await fetchOfficial(url, key)]
)));
const liveDocuments = {};
const liveHashes = {};
for (const [key, response] of liveResponses) {
  if (["corePdf", "terranP2p"].includes(key)) {
    liveHashes[key] = sha256(Buffer.from(await response.arrayBuffer()));
  } else {
    liveDocuments[key] = await response.json();
    liveHashes[key] = documentHash(liveDocuments[key]);
  }
}
assert.deepEqual(liveHashes, {
  versions: "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733",
  marine: "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
  part5: "cf666f0fb4dba745486c795a16344468683de2ef7a1cfcce9fef37af823db864",
  part8: "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
  part10: "3c2ef4d29afbf6dc38b609388dcb663b40e91627eaa29cbe469e6db4cf8d86a1",
  part11: "35bf7492bae59a5f30b51dc94c23295b231b908b667a2a44e7c5e317ac2e045c",
  corePdf: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2p: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
});
const versions = liveDocuments.versions.fields;
assert.deepEqual({
  unitsVersion: versions.unitsVersion.integerValue,
  cardsVersion: versions.cardsVersion.integerValue,
  rulesVersion: versions.rulesVersion.integerValue,
}, { unitsVersion: "71", cardsVersion: "69", rulesVersion: "48" });
const marineText = firestoreStrings(liveDocuments.marine).join("\n");
const part5Text = firestoreStrings(liveDocuments.part5).join("\n").replace(/<[^>]*>/gu, " ");
const part8Text = firestoreStrings(liveDocuments.part8).join("\n").replace(/<[^>]*>/gu, " ");
const part10Text = firestoreStrings(liveDocuments.part10).join("\n").replace(/<[^>]*>/gu, " ");
const part11Text = firestoreStrings(liveDocuments.part11).join("\n").replace(/<[^>]*>/gu, " ");
assert.match(marineText, /"4\/7"|4\/7/u);
assert.match(marineText, /BUFF Speed \(3\)/u);
assert.match(part5Text, /second value only when the Unit is reduced to a single remaining model/iu);
assert.match(part5Text, /or when the Unit started with a single model/iu);
assert.match(part8Text, /move it up to the Unit.s Speed/iu);
assert.match(part10Text, /immediately before declaring an action/iu);
assert.match(part11Text, /Value characteristic[\s\S]*increase the value[\s\S]*by X/iu);
acceptance.push("live_command_center_core_and_p2p_sources_match_split_speed_and_stimpack_contract");

const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};

function optionalDomains(state, sideKey = state.activeSideKey) {
  return runtime.enumerate(state, { sideKey, includeDisabled: true, matchBinding })
    .parameterDomains.filter((row) => (
      row.executorId === OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID
    ));
}

function domainFor(state, moveMode, sideKey = state.activeSideKey) {
  return optionalDomains(state, sideKey).find((row) => row.moveMode === moveMode);
}

const multiState = battleState({ currentModels: 4, maxModels: 4 });
const directMulti = enumerateOfficialMarineOptionalStimpackMoveV2(multiState, {
  sideKey: "player1",
  matchBinding,
  throwOnError: true,
});
assert.deepEqual(directMulti.parameterDomains.map((row) => [
  row.moveMode,
  row.constraints.printedSpeedMilliInches,
  row.constraints.maxDistanceMilliInches,
]), [
  ["base", 4000, 4000],
  ["stimpack", 4000, 7000],
]);
assert.ok(directMulti.parameterDomains.every((row) => (
  row.constraints.currentModelCount === 4
    && row.constraints.splitSpeedSelection === "first"
)));
acceptance.push("multi_model_legal_space_exposes_four_base_and_seven_stimpack_domains");

const initialSingleState = battleState({ currentModels: 1, maxModels: 1 });
assert.deepEqual(optionalDomains(initialSingleState).map((row) => [
  row.moveMode,
  row.constraints.maxDistanceMilliInches,
  row.constraints.startedSingleModel,
]), [
  ["base", 7000, true],
  ["stimpack", 10000, true],
]);
const reducedSingleState = battleState({ currentModels: 1, maxModels: 4 });
assert.deepEqual(optionalDomains(reducedSingleState).map((row) => [
  row.moveMode,
  row.constraints.maxDistanceMilliInches,
  row.constraints.startedSingleModel,
]), [
  ["base", 7000, false],
  ["stimpack", 10000, false],
]);
acceptance.push("initially_single_and_reduced_to_single_units_both_use_second_speed_value");

const multiBaseParameters = {
  leadingModelId: "player1-stimpack-marine-model-1",
  path: [{ xMilliInches: 6000, yMilliInches: 5000 }],
  placements: [
    { modelId: "player1-stimpack-marine-model-2", xMilliInches: 4500, yMilliInches: 5000 },
    { modelId: "player1-stimpack-marine-model-3", xMilliInches: 6000, yMilliInches: 6500 },
    { modelId: "player1-stimpack-marine-model-4", xMilliInches: 7500, yMilliInches: 5000 },
  ],
};
const multiStimpackParameters = {
  ...multiBaseParameters,
  path: [{ xMilliInches: 9000, yMilliInches: 5000 }],
  placements: [
    { modelId: "player1-stimpack-marine-model-2", xMilliInches: 7500, yMilliInches: 5000 },
    { modelId: "player1-stimpack-marine-model-3", xMilliInches: 9000, yMilliInches: 6500 },
    { modelId: "player1-stimpack-marine-model-4", xMilliInches: 10500, yMilliInches: 5000 },
  ],
};
const multiBaseDomain = domainFor(multiState, "base");
const multiBaseInstantiation = instantiateOfficialMarineOptionalStimpackMoveV2(
  multiState,
  multiBaseDomain,
  multiBaseParameters,
  { matchBinding },
);
const multiBaseApplied = applyOfficialMarineOptionalStimpackMoveV2(
  multiState,
  multiBaseInstantiation.action,
  { matchBinding, postRevision: 1 },
);
const basePiece = multiBaseApplied.state.pieces.find((row) => row.sideKey === "player1");
assert.equal(multiBaseInstantiation.action.abilityChoice, "decline");
assert.equal(multiBaseInstantiation.action.movePlan.speedAllowanceInches, 4);
assert.equal(multiBaseApplied.state.cardResources.player1[0].readiness, "ready");
assert.equal(basePiece.damageMarker, 0);
assert.deepEqual(basePiece.statuses, []);
assert.deepEqual(multiBaseApplied.state.board.effectMarkers, []);
assert.deepEqual(multiBaseApplied.state.activeAbilityUseHistory, []);
assert.deepEqual(multiBaseApplied.events.map((row) => row.type), ["unit_standard_moved"]);
acceptance.push("base_branch_moves_four_models_without_payment_damage_status_marker_or_ability_history");

const multiStimpackDomain = domainFor(multiState, "stimpack");
const multiStimpackInstantiation = runtime.instantiate(
  multiState,
  multiStimpackDomain,
  multiStimpackParameters,
  { matchBinding },
);
const multiStimpackApplied = runtime.apply(
  multiState,
  multiStimpackInstantiation.action,
  { matchBinding, postRevision: 1 },
);
const stimPiece = multiStimpackApplied.state.pieces.find((row) => row.sideKey === "player1");
assert.equal(multiStimpackInstantiation.action.movePlan.speedAllowanceInches, 7);
assert.equal(stimPiece.currentModels, 4);
assert.equal(stimPiece.damageMarker, 2);
assert.equal(stimPiece.statuses.length, 1);
assert.equal(multiStimpackApplied.state.board.effectMarkers.length, 1);
assert.equal(multiStimpackApplied.state.cardResources.player1[0].readiness, "exhausted");
assert.deepEqual(multiStimpackApplied.events.slice(0, 2).map((row) => row.type), [
  "use_ability",
  "unit_standard_moved",
]);
acceptance.push("multi_model_stimpack_pays_and_applies_non_lethal_status_before_seven_inch_move");

const noPaymentState = battleState({
  currentModels: 4,
  maxModels: 4,
  paymentReadiness: "exhausted",
});
assert.deepEqual(optionalDomains(noPaymentState).map((row) => row.moveMode), ["base"]);
const noPaymentEnumeration = runtime.enumerate(noPaymentState, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding,
});
assert.ok(noPaymentEnumeration.candidates.some((row) => (
  row.executorId === OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID
    && row.moveMode === "stimpack"
    && row.disabledReason === "OPTIONAL_STIMPACK_MOVE_FULL_COST_UNAVAILABLE"
)));
acceptance.push("unavailable_payment_removes_only_stimpack_and_preserves_base_move");

assert.throws(
  () => runtime.instantiate(multiState, multiBaseDomain, {
    ...multiBaseParameters,
    path: [{ xMilliInches: 6001, yMilliInches: 5000 }],
  }, { matchBinding }),
  /MARINE_MOVE_PATH_EXCEEDS_SPEED/u,
);
assert.throws(
  () => runtime.instantiate(multiState, multiStimpackDomain, {
    ...multiStimpackParameters,
    path: [{ xMilliInches: 9001, yMilliInches: 5000 }],
  }, { matchBinding }),
  /MARINE_MOVE_PATH_EXCEEDS_SPEED/u,
);
acceptance.push("base_and_stimpack_paths_are_independently_capped_at_four_and_seven");

assert.throws(
  () => runtime.instantiate(multiState, multiBaseDomain, {
    ...multiBaseParameters,
    placements: multiBaseParameters.placements.slice(0, 2),
  }, { matchBinding }),
  /MARINE_MOVE_PLACEMENT_DENOMINATOR_INVALID/u,
);
assert.throws(
  () => runtime.instantiate(multiState, multiBaseDomain, {
    ...multiBaseParameters,
    placements: [
      { modelId: "player1-stimpack-marine-model-2", xMilliInches: 6000, yMilliInches: 5000 },
      ...multiBaseParameters.placements.slice(1),
    ],
  }, { matchBinding }),
  /MARINE_MOVE_BASE_OVERLAP/u,
);
assert.throws(
  () => runtime.instantiate(multiState, multiBaseDomain, {
    ...multiBaseParameters,
    placements: [
      { modelId: "player1-stimpack-marine-model-2", xMilliInches: 2000, yMilliInches: 5000 },
      ...multiBaseParameters.placements.slice(1),
    ],
  }, { matchBinding }),
  /MARINE_MOVE_OUT_OF_COHERENCY/u,
);
acceptance.push("multi_model_placement_denominator_overlap_and_coherency_fail_closed");

const collisionState = battleState({ currentModels: 1, maxModels: 1 });
collisionState.pieces.find((row) => row.sideKey === "player2").models[0].xInches = 6;
const collisionDomain = domainFor(collisionState, "stimpack");
assert.throws(
  () => runtime.instantiate(collisionState, collisionDomain, {
    leadingModelId: "player1-stimpack-marine-model-1",
    path: [{ xMilliInches: 12000, yMilliInches: 5000 }],
    placements: [],
  }, { matchBinding }),
  /MARINE_MOVE_PATH_COLLISION/u,
);
const engagementState = battleState({ currentModels: 1, maxModels: 1 });
engagementState.pieces.find((row) => row.sideKey === "player2").models[0].xInches = 14;
const engagementDomain = domainFor(engagementState, "stimpack");
assert.throws(
  () => runtime.instantiate(engagementState, engagementDomain, {
    leadingModelId: "player1-stimpack-marine-model-1",
    path: [{ xMilliInches: 12000, yMilliInches: 5000 }],
    placements: [],
  }, { matchBinding }),
  /MARINE_MOVE_ENEMY_ENGAGEMENT_RANGE/u,
);
acceptance.push("other_unit_swept_collision_and_enemy_engagement_endpoint_fail_closed");

const staleScaleState = battleState({ currentModels: 1, maxModels: 4 });
assert.throws(
  () => instantiateOfficialMarineOptionalStimpackMoveV2(
    staleScaleState,
    multiBaseDomain,
    multiBaseParameters,
    { matchBinding },
  ),
  /OPTIONAL_STIMPACK_MOVE_PARAMETER_DOMAIN_STALE/u,
);
const tamperedAction = structuredClone(multiStimpackInstantiation.action);
tamperedAction.movePlan.speedAllowanceInches = 99;
assert.throws(
  () => applyOfficialMarineOptionalStimpackMoveV2(
    multiState,
    tamperedAction,
    { matchBinding },
  ),
  /OPTIONAL_STIMPACK_MOVE_ACTION_STALE/u,
);
acceptance.push("casualty_scale_change_invalidates_old_domain_and_action_tamper_rejects");

const player2State = battleState({
  stimpackSide: "player2",
  currentModels: 4,
  maxModels: 4,
});
assert.deepEqual(optionalDomains(player2State, "player2").map((row) => [
  row.moveMode,
  row.constraints.maxDistanceMilliInches,
]), [["base", 4000], ["stimpack", 7000]]);
acceptance.push("both_player_seats_receive_the_same_scale_choice_domains");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-optional-stimpack-move-referee-v2",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function envelopeFor(engine, roomId, state) {
  return engine.createEnvelope({
    roomId,
    dataVersion: "71/69/48",
    dependencies: {
      sourceSnapshot: { artifactId: `official-command-center-${roomId}`, content: snapshot },
      dataSnapshot: { artifactId: `official-optional-stimpack-${roomId}`, content: gameplayDataBundle },
      geometryArtifact: {
        artifactId: `official-empty-battlefield-${roomId}`,
        content: { kind: "geometry-artifact", geometryVersion: "marine_move_v2" },
      },
    },
    state,
  });
}

function credentials(engine, envelope, seatKey, fence) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `optional-stimpack-${seatKey}-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: `optional-stimpack-${seatKey}-session-${fence}`,
    leaseFence: fence,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
}

function authorityApply(engine, envelope, moveMode) {
  const seatKey = envelope.state.activeSideKey;
  const creds = credentials(engine, envelope, seatKey, 1);
  const legalSpace = engine.legalSpace(envelope, { seatAuthority: creds.seatAuthority });
  const domain = legalSpace.parameterDomains.find((row) => (
    row.executorId === OFFICIAL_MARINE_OPTIONAL_STIMPACK_MOVE_V2_EXECUTOR_ID
      && row.moveMode === moveMode
  ));
  assert.ok(domain, JSON.stringify(legalSpace));
  const oneModel = envelope.state.pieces.find((row) => row.sideKey === seatKey).currentModels === 1;
  assert.equal(oneModel, true);
  const parameters = {
    leadingModelId: `${seatKey}-stimpack-marine-model-1`,
    path: [{
      xMilliInches: moveMode === "stimpack" ? 12000 : 9000,
      yMilliInches: 5000,
    }],
    placements: [],
  };
  const preview = engine.preview({
    envelope,
    seatAuthority: creds.seatAuthority,
    proposal: { kind: "parameterized", domainId: domain.domainId, parameters },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  assert.equal(preview.preview.core.action.moveMode, moveMode);
  assert.equal(
    preview.preview.core.confirmationPolicy.baseClass,
    moveMode === "stimpack" ? "explicit_human" : "direct_gesture",
  );
  assert.equal(
    preview.preview.core.confirmationPolicy.requiresExplicitHuman,
    moveMode === "stimpack",
  );
  const confirmation = engine.confirmPreview({
    envelope,
    preview: preview.preview,
    seatAuthority: creds.seatAuthority,
  });
  assert.equal(confirmation.ok, true, JSON.stringify(confirmation));
  const applied = engine.apply({
    envelope,
    expectedStateRevision: envelope.stateRevision,
    preview: preview.preview,
    confirmation: confirmation.confirmation,
    seatAuthority: creds.seatAuthority,
    controlLease: creds.controlLease,
    idempotencyKey: `optional-stimpack-${seatKey}-${moveMode}-apply`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return applied;
}

const baseAuthority = authorityEngine("optional-stimpack-base-seal-v1");
const baseEnvelope = envelopeFor(
  baseAuthority,
  "official-optional-stimpack-base",
  battleState({ currentModels: 1, maxModels: 1 }),
);
assert.equal(
  baseEnvelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({ kind: "action-schema", schemaVersion: "hybrid_legal_space_v12" }),
);
const baseAuthorityApplied = authorityApply(baseAuthority, baseEnvelope, "base");
const stimAuthority = authorityEngine("optional-stimpack-use-seal-v1");
const stimEnvelope = envelopeFor(
  stimAuthority,
  "official-optional-stimpack-use",
  battleState({ currentModels: 1, maxModels: 4 }),
);
const stimAuthorityApplied = authorityApply(stimAuthority, stimEnvelope, "stimpack");
acceptance.push("authority_v12_preserves_choice_and_uses_direct_vs_explicit_confirmation");

function registerReplayDependencies(engine, envelope) {
  for (const [kind, content] of [
    ["sourceSnapshot", snapshot],
    ["dataSnapshot", gameplayDataBundle],
    ["rulesArtifact", {
      kind: "rules-artifact",
      rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: envelope.matchBinding.rulesRuntimeBinding,
    }],
    ["executorArtifact", {
      kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: runtime.descriptor.runtimeHash,
      catalogueHash: runtime.descriptor.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest,
    }],
    ["geometryArtifact", { kind: "geometry-artifact", geometryVersion: "marine_move_v2" }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v12" }],
  ]) {
    engine.registerDependency({
      kind,
      artifactId: envelope.matchBinding.dependencies[kind].artifactId,
      content,
    });
  }
  engine.registerDependency({
    kind: "rulesDisplay",
    artifactId: envelope.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
  });
}

const replayAuthority = authorityEngine("optional-stimpack-rotated-seal-v2");
registerReplayDependencies(replayAuthority, baseEnvelope);
const baseReplayed = replayAuthority.replay({
  initialEnvelope: baseEnvelope,
  journal: [baseAuthorityApplied.receipt],
});
assert.equal(baseReplayed.ok, true, JSON.stringify(baseReplayed));
assert.equal(baseReplayed.envelope.stateHash, baseAuthorityApplied.envelope.stateHash);
registerReplayDependencies(replayAuthority, stimEnvelope);
const stimReplayed = replayAuthority.replay({
  initialEnvelope: stimEnvelope,
  journal: [stimAuthorityApplied.receipt],
});
assert.equal(stimReplayed.ok, true, JSON.stringify(stimReplayed));
assert.equal(stimReplayed.envelope.stateHash, stimAuthorityApplied.envelope.stateHash);
const tamperedJournal = [structuredClone(stimAuthorityApplied.receipt)];
tamperedJournal[0].events.push({ type: "forged_optional_stimpack_move" });
const tamperedReplay = replayAuthority.replay({
  initialEnvelope: stimEnvelope,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_for_both_branches_and_rejects_tamper");

assert.equal(slice.ctx2skill.skillsRead.length, 0);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

assert.equal(acceptance.length, 17);
const report = {
  schema: "starcraft_tmg_official_marine_optional_stimpack_move_rule_slice_verification_v2",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  liveOfficialRevalidation: {
    urls: URLS,
    hashes: liveHashes,
    updateTimes: Object.fromEntries(Object.entries(liveDocuments).map(([key, document]) => (
      [key, document.updateTime]
    ))),
    repositoryFallbackUsed: false,
  },
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  slice,
  audit,
  runtime: runtime.descriptor,
  authorityFixture: {
    actionSchemaVersion: "hybrid_legal_space_v12",
    baseRequiresExplicitHuman: false,
    stimpackRequiresExplicitHuman: true,
    baseReplayStateHash: baseReplayed.envelope.stateHash,
    stimpackReplayStateHash: stimReplayed.envelope.stateHash,
  },
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth:
    "official_current_marine_scale_and_optional_stimpack_move_composition_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-marine-optional-stimpack-move-rule-slice-v2-report.json"),
  `${JSON.stringify(report, null, 2)}\n`,
  "utf8",
);

console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: report.slice.sliceHash,
  catalogueHash: report.slice.catalogueHash,
  runtimeHash: report.runtime.runtimeHash,
  executableRuleAtoms: report.audit.counts.executableRuleAtoms,
  reviewRequiredRuleAtoms: report.audit.counts.reviewRequiredRuleAtoms,
  displayOnlyRuleAtoms: report.audit.counts.displayOnlyRuleAtoms,
  trainingTruth: report.trainingTruth,
}, null, 2));
