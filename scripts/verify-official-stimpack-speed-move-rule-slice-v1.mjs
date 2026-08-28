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
import {
  createOfficialCharacteristicStatusKernelV2,
} from "../packages/rule-atoms/official-characteristic-status-kernel-v2.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID,
  OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID,
} from "../packages/rule-atoms/official-stimpack-lifecycle-executors-v1.mjs";
import {
  OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE,
  OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID,
} from "../packages/rule-atoms/official-stimpack-ranged-consumer-executor-v1.mjs";
import {
  applyOfficialStimpackMoveV1,
  enumerateOfficialStimpackMoveV1,
  instantiateOfficialStimpackMoveV1,
  OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS,
  OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID,
  OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION,
  OFFICIAL_STIMPACK_MOVE_PARAMETER_KIND,
} from "../packages/rule-atoms/official-stimpack-move-consumer-executor-v1.mjs";
import {
  createOfficialStimpackSpeedMoveRuleSliceV1,
  verifyOfficialStimpackSpeedMoveRuleSliceV1,
} from "../packages/rule-atoms/official-stimpack-speed-move-rule-slice-v1.mjs";
import { createOfficialMissionSetupBindingV1 } from
  "../packages/source-data/official-mission-setup-binding-v1.mjs";
import { createOfficialMarineStimpackFixtureV1 } from
  "./support/official-marine-stimpack-fixture-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const OCCURRED_AT = "2026-08-26T00:00:00.000Z";
const FIRESTORE_ROOT =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents";
const URLS = Object.freeze({
  versions: `${FIRESTORE_ROOT}/system_metadata/versions`,
  marine: `${FIRESTORE_ROOT}/army_units/marine`,
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

function action(candidate) {
  const {
    isEnabled: _isEnabled,
    disabledReason: _disabledReason,
    score: _score,
    details: _details,
    ...result
  } = candidate;
  return result;
}

const previousReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-marine-stimpack-rule-slice-v1-report.json"),
  "utf8",
));
const slice = createOfficialStimpackSpeedMoveRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialStimpackSpeedMoveRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 421);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 491);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 1);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
acceptance.push("catalogue_promotes_only_the_buff_value_characteristic_atom");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 421);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 605);
assert.ok(runtime.descriptor.parameterDomainKinds.includes(
  OFFICIAL_STIMPACK_MOVE_PARAMETER_KIND,
));
const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(
  historicalRuntime.descriptor.runtimeHash,
  "d7ae88eb24d20313aebca63a2c43a6a2ae4c5f000ff92a896864f10710fe89fe",
);
acceptance.push("runtime_advances_to_421_while_slice40_runtime_stays_exact");

const {
  snapshot,
  dataset,
  gameplayDataBundle,
  battleState,
} = await createOfficialMarineStimpackFixtureV1({
  root: ROOT,
  runtimeHash: runtime.descriptor.runtimeHash,
});
assert.equal(snapshot.snapshotHash,
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78");
assert.equal(dataset.datasetHash,
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a");
assert.equal(gameplayDataBundle.gameplayDataBundleHash,
  "35cd2e1a7a7cb7575f0525dbf6ff08fa0a5285b5fcf89e6b901976f532f1463b");
assert.equal(gameplayDataBundle.repositoryFallbackAllowed, false);
acceptance.push("latest_snapshot_dataset_and_gameplay_bundle_are_bound_without_repository_fallback");

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
const part8Text = firestoreStrings(liveDocuments.part8).join("\n").replace(/<[^>]*>/gu, " ");
const part10Text = firestoreStrings(liveDocuments.part10).join("\n").replace(/<[^>]*>/gu, " ");
const part11Text = firestoreStrings(liveDocuments.part11).join("\n").replace(/<[^>]*>/gu, " ");
assert.match(marineText, /BUFF Speed \(3\)/u);
assert.match(marineText, /all Close Combat Weapons gain PRECISION \(3\)/u);
assert.match(part8Text, /move it up to the Unit.s Speed/iu);
assert.match(part10Text, /immediately before declaring an action/iu);
assert.match(part10Text, /cannot\s+be used during an action/iu);
assert.match(part11Text, /Value characteristic[\s\S]*increase the value[\s\S]*by X/iu);
acceptance.push("live_marine_parts_8_10_11_and_pdf_sources_match_current_official_contracts");

const matchBinding = {
  dataSnapshotHash: hashStarcraftTmgContract(gameplayDataBundle),
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
function legal(state, sideKey = state.activeSideKey, includeDisabled = false) {
  return runtime.enumerate(state, { sideKey, includeDisabled, matchBinding });
}
function stimpackDomain(state, sideKey = state.activeSideKey) {
  return legal(state, sideKey).parameterDomains.find((row) => (
    row.executorId === OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID
  ));
}

const initialState = battleState("player1");
const directEnumeration = enumerateOfficialStimpackMoveV1(initialState, {
  sideKey: "player1",
  matchBinding,
  throwOnError: true,
});
assert.equal(directEnumeration.parameterDomains.length, 1);
const domain = stimpackDomain(initialState);
assert.ok(domain);
assert.equal(domain.executorVersion, OFFICIAL_STIMPACK_MOVE_EXECUTOR_VERSION);
assert.deepEqual(domain.ruleAtomIds, [...OFFICIAL_STIMPACK_MOVE_ACTION_ATOM_IDS]);
assert.equal(domain.constraints.printedSpeedMilliInches, 7000);
assert.equal(domain.constraints.buffModifierMilliInches, 3000);
assert.equal(domain.constraints.maxDistanceMilliInches, 10000);
assert.match(domain.constraints.valueBuffResolutionHash, /^[a-f0-9]{64}$/u);
acceptance.push("legal_space_exposes_printed_seven_plus_buff_three_exact_ten_inch_domain");

const validParameters = {
  leadingModelId: "player1-stimpack-marine-model",
  path: [{ xMilliInches: 12_000, yMilliInches: 5_000 }],
  placements: [],
};
const instantiated = instantiateOfficialStimpackMoveV1(
  initialState,
  domain,
  validParameters,
  { matchBinding },
);
assert.equal(instantiated.action.movePlan.distanceTravelledInches, 10);
assert.equal(instantiated.action.movePlan.printedSpeedInches, 7);
assert.equal(instantiated.action.movePlan.speedBuff, 3);
assert.equal(instantiated.action.movePlan.speedAllowanceInches, 10);
assert.equal(instantiated.action.abilityWindow, "before_action");
assert.equal(instantiated.action.underlyingAction, "move");
const characteristicKernel = createOfficialCharacteristicStatusKernelV2();
assert.equal(
  instantiated.action.movePlan.characteristicStatusKernelHash,
  characteristicKernel.descriptor.kernelHash,
);
acceptance.push("parameter_instantiation_binds_value_buff_resolution_and_source_order");

const directApplied = runtime.apply(initialState, instantiated.action, {
  matchBinding,
  postRevision: 1,
});
const moved = directApplied.state.pieces.find((row) => row.id === instantiated.action.pieceId);
assert.equal(moved.models[0].xInches, 12);
assert.equal(moved.models[0].yInches, 5);
assert.equal(moved.damageMarker, 2);
assert.equal(moved.currentModels, 1);
assert.equal(moved.isDestroyed, false);
assert.equal(moved.statuses.length, 1);
assert.equal(directApplied.state.board.effectMarkers.length, 1);
assert.equal(directApplied.state.cardResources.player1[0].readiness, "exhausted");
assert.equal(moved.activatedPhases.movement, true);
assert.equal(directApplied.state.activeSideKey, "player2");
assert.deepEqual(directApplied.events.slice(0, 2).map((event) => event.type), [
  "use_ability",
  "unit_standard_moved",
]);
assert.equal(directApplied.events[0].underlyingAction, "move");
assert.equal(directApplied.events[0].nonLethalDamage.targetDestroyed, false);
assert.equal(directApplied.events[1].speedAllowanceInches, 10);
acceptance.push("payment_non_lethal_status_and_ten_inch_move_apply_atomically_in_source_order");

assert.throws(
  () => runtime.instantiate(initialState, domain, {
    ...validParameters,
    path: [{ xMilliInches: 12_001, yMilliInches: 5_000 }],
  }, { matchBinding }),
  /STIMPACK_MOVE_PATH_EXCEEDS_BUFFED_SPEED/u,
);
const baseSpeedOnly = structuredClone(initialState);
baseSpeedOnly.cardResources.player1[0].readiness = "exhausted";
baseSpeedOnly.cardResources.player1[0].face = "down";
assert.equal(stimpackDomain(baseSpeedOnly), undefined);
acceptance.push("over_ten_path_and_unavailable_payment_fail_closed");

const collisionState = structuredClone(initialState);
const collisionEnemy = collisionState.pieces.find((row) => row.sideKey === "player2");
collisionEnemy.models[0].xInches = 7;
collisionEnemy.models[0].yInches = 5;
const collisionDomain = stimpackDomain(collisionState);
assert.ok(collisionDomain);
assert.throws(
  () => runtime.instantiate(collisionState, collisionDomain, validParameters, { matchBinding }),
  /STIMPACK_MOVE_PATH_COLLISION/u,
);
const engagementState = structuredClone(initialState);
const engagementEnemy = engagementState.pieces.find((row) => row.sideKey === "player2");
engagementEnemy.models[0].xInches = 14;
engagementEnemy.models[0].yInches = 5;
const engagementDomain = stimpackDomain(engagementState);
assert.ok(engagementDomain);
assert.throws(
  () => runtime.instantiate(engagementState, engagementDomain, {
    ...validParameters,
    path: [{ xMilliInches: 12_000, yMilliInches: 5_000 }],
  }, { matchBinding }),
  /STIMPACK_MOVE_ENEMY_ENGAGEMENT_RANGE/u,
);
acceptance.push("enemy_path_collision_and_enemy_engagement_endpoint_fail_closed");

const staleState = structuredClone(initialState);
staleState.cardResources.player1[0].readiness = "exhausted";
staleState.cardResources.player1[0].face = "down";
assert.throws(
  () => instantiateOfficialStimpackMoveV1(staleState, domain, validParameters, { matchBinding }),
  /STIMPACK_FULL_COST_UNAVAILABLE|STIMPACK_MOVE_PARAMETER_DOMAIN_STALE/u,
);
const tamperedAction = structuredClone(instantiated.action);
tamperedAction.movePlan.speedAllowanceInches = 99;
assert.throws(
  () => applyOfficialStimpackMoveV1(initialState, tamperedAction, { matchBinding }),
  /STIMPACK_MOVE_ACTION_STALE/u,
);
acceptance.push("stale_domain_payment_drift_and_action_tamper_fail_closed");

const assaultState = structuredClone(directApplied.state);
assaultState.phase = "assault";
assaultState.activeSideKey = "player1";
assaultState.phaseFirstActorByRound["2:assault"] = {
  round: 2,
  phase: "assault",
  markerHolderSideKey: "player1",
  chosenFirstActorSideKey: "player1",
};
for (const piece of assaultState.pieces) piece.activatedPhases.assault = false;
const precisionAttack = legal(assaultState, "player1").candidates.find((row) => (
  row.executorId === OFFICIAL_STIMPACK_RANGED_EXECUTOR_ID
    && row.resolutionMode === "precision_pending_choice"
));
assert.ok(precisionAttack);
const precisionOpened = runtime.apply(assaultState, action(precisionAttack), {
  matchBinding,
  chanceReveals: [2, 1, 6, 4, 4],
  postRevision: 2,
});
const precisionChoices = legal(precisionOpened.state, "player1").candidates;
assert.equal(precisionChoices.length, 4);
assert.ok(precisionChoices.every((row) => (
  row.actionType === OFFICIAL_RESOLVE_STIMPACK_PRECISION_ACTION_TYPE
)));
acceptance.push("post_move_stimpack_status_remains_compatible_with_c14_precision_pending_choice");

const missionSetupBinding = createOfficialMissionSetupBindingV1({
  gameplayDataBundle,
  missionDraftReceiptHash: "1".repeat(64),
  deploymentDraftReceiptHash: "2".repeat(64),
  seatColorAssignment: { player1: "red", player2: "blue" },
});
const lifecycleState = structuredClone(directApplied.state);
lifecycleState.phase = "cleanup";
lifecycleState.activeSideKey = null;
lifecycleState.firstPlayerSideKey = "player1";
lifecycleState.officialMissionSetupBinding = missionSetupBinding;
lifecycleState.scoringCleanupProgress = {
  schemaVersion: "starcraft_tmg_scoring_cleanup_progress_v1",
  round: 2,
  completedSteps: [
    "determine_mission_marker_control",
    "score_victory_points",
    "check_end_game_conditions",
  ],
  currentStep: "resolve_end_of_round_effects",
  controlResolutionHash: "3".repeat(64),
  scoringResolutionHash: "4".repeat(64),
  endGameResolutionHash: "5".repeat(64),
  trainingTruth: false,
};
const eor = legal(lifecycleState, "player1").candidates.find((row) => (
  row.executorId === OFFICIAL_END_OF_ROUND_EFFECTS_V4_EXECUTOR_ID
));
assert.ok(eor);
const eorApplied = runtime.apply(lifecycleState, action(eor), { matchBinding });
assert.equal(eorApplied.state.pieces.find((row) => row.id === moved.id).statuses.length, 1);
const cleanup = legal(eorApplied.state, "player1").candidates.find((row) => (
  row.executorId === OFFICIAL_CLEANUP_REFRESH_V4_EXECUTOR_ID
));
assert.ok(cleanup);
const cleanupApplied = runtime.apply(eorApplied.state, action(cleanup), { matchBinding });
const cleaned = cleanupApplied.state.pieces.find((row) => row.id === moved.id);
assert.equal(cleaned.statuses.length, 0);
assert.equal(cleaned.damageMarker, 2);
assert.equal(cleanupApplied.state.board.effectMarkers.length, 0);
assert.equal(cleanupApplied.state.cardResources.player1[0].readiness, "ready");
acceptance.push("post_move_status_persists_through_eor_then_cleanup_removes_it_without_healing");

const player2State = battleState("player2");
const player2Domain = stimpackDomain(player2State, "player2");
assert.ok(player2Domain);
const player2Action = runtime.instantiate(player2State, player2Domain, {
  leadingModelId: "player2-stimpack-marine-model",
  path: [{ xMilliInches: 12_000, yMilliInches: 5_000 }],
  placements: [],
}, { matchBinding }).action;
const player2Applied = runtime.apply(player2State, player2Action, { matchBinding });
assert.equal(
  player2Applied.state.pieces.find((row) => row.sideKey === "player2").damageMarker,
  2,
);
assert.equal(player2Applied.state.activeSideKey, "player1");
acceptance.push("both_player_seats_receive_the_same_stimpack_speed_move_domain");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-stimpack-speed-move-referee-v1",
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
      sourceSnapshot: { artifactId: `official-command-center-snapshot-${roomId}`, content: snapshot },
      dataSnapshot: { artifactId: `official-stimpack-speed-move-${roomId}`, content: gameplayDataBundle },
      geometryArtifact: {
        artifactId: `official-empty-battlefield-${roomId}`,
        content: { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" },
      },
    },
    state,
  });
}

function credentials(engine, envelope, seatKey, fence) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: `stimpack-speed-move-${seatKey}-${fence}`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority,
    sessionId: `stimpack-speed-move-${seatKey}-session-${fence}`,
    leaseFence: fence,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, lease };
}

function authorityApply(engine, envelope, seatKey) {
  const creds = credentials(engine, envelope, seatKey, 1);
  const legalSpace = engine.legalSpace(envelope, { seatAuthority: creds.seatAuthority });
  const authorityDomain = legalSpace.parameterDomains.find((row) => (
    row.executorId === OFFICIAL_STIMPACK_MOVE_EXECUTOR_ID
  ));
  assert.ok(authorityDomain, JSON.stringify(legalSpace));
  const parameters = {
    leadingModelId: `${seatKey}-stimpack-marine-model`,
    path: [{ xMilliInches: 12_000, yMilliInches: 5_000 }],
    placements: [],
  };
  const preview = engine.preview({
    envelope,
    seatAuthority: creds.seatAuthority,
    proposal: {
      kind: "parameterized",
      domainId: authorityDomain.domainId,
      parameters,
    },
  });
  assert.equal(preview.ok, true, JSON.stringify(preview));
  assert.equal(preview.preview.core.action.movePlan.speedAllowanceInches, 10);
  assert.equal(preview.preview.core.confirmationPolicy.baseClass, "explicit_human");
  assert.equal(preview.preview.core.confirmationPolicy.requiresExplicitHuman, true);
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
    controlLease: creds.lease,
    idempotencyKey: `stimpack-speed-move-${seatKey}-apply`,
  });
  assert.equal(applied.ok, true, JSON.stringify(applied));
  return applied;
}

const player1Authority = authorityEngine("stimpack-speed-move-player1-seal-v1");
const player1Envelope = envelopeFor(
  player1Authority,
  "official-stimpack-speed-move-player1",
  battleState("player1"),
);
assert.equal(
  player1Envelope.matchBinding.dependencies.actionSchema.contentHash,
  hashStarcraftTmgContract({ kind: "action-schema", schemaVersion: "hybrid_legal_space_v11" }),
);
const player1AuthorityApplied = authorityApply(
  player1Authority,
  player1Envelope,
  "player1",
);
const player2Authority = authorityEngine("stimpack-speed-move-player2-seal-v1");
const player2Envelope = envelopeFor(
  player2Authority,
  "official-stimpack-speed-move-player2",
  battleState("player2"),
);
const player2AuthorityApplied = authorityApply(
  player2Authority,
  player2Envelope,
  "player2",
);
acceptance.push("authority_v11_preserves_parameterized_move_fields_and_requires_human_confirmation");

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
    ["geometryArtifact", { kind: "geometry-artifact", geometryVersion: "empty_battlefield_v1" }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v11" }],
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

const replayAuthority = authorityEngine("stimpack-speed-move-rotated-seal-v2");
registerReplayDependencies(replayAuthority, player1Envelope);
const player1Replayed = replayAuthority.replay({
  initialEnvelope: player1Envelope,
  journal: [player1AuthorityApplied.receipt],
});
assert.equal(player1Replayed.ok, true, JSON.stringify(player1Replayed));
assert.equal(player1Replayed.envelope.stateHash, player1AuthorityApplied.envelope.stateHash);
registerReplayDependencies(replayAuthority, player2Envelope);
const player2Replayed = replayAuthority.replay({
  initialEnvelope: player2Envelope,
  journal: [player2AuthorityApplied.receipt],
});
assert.equal(player2Replayed.ok, true, JSON.stringify(player2Replayed));
assert.equal(player2Replayed.envelope.stateHash, player2AuthorityApplied.envelope.stateHash);
const tamperedJournal = [structuredClone(player1AuthorityApplied.receipt)];
tamperedJournal[0].events.push({ type: "forged_stimpack_speed_move" });
const tamperedReplay = replayAuthority.replay({
  initialEnvelope: player1Envelope,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_for_both_seats_and_rejects_tamper");

assert.equal(slice.ctx2skill.skillsRead.length, 0);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

assert.equal(acceptance.length, 16);
const report = {
  schema: "starcraft_tmg_official_stimpack_speed_move_rule_slice_verification_v1",
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
    actionSchemaVersion: "hybrid_legal_space_v11",
    explicitHumanConfirmationRequired: true,
    player1JournalReceipts: 1,
    player1ReplayStateHash: player1Replayed.envelope.stateHash,
    player2JournalReceipts: 1,
    player2ReplayStateHash: player2Replayed.envelope.stateHash,
  },
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_current_stimpack_speed_move_composition_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-stimpack-speed-move-rule-slice-v1-report.json"),
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
