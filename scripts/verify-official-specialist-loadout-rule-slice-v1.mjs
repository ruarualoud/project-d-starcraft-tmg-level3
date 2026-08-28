#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1 } from
  "../content/official-command-center-faction-delta-2026-08-25-v1.mjs";
import { OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1 } from
  "../content/official-command-center-faction-delta-2026-08-26-v1.mjs";
import {
  canonicalStarcraftTmgJson,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import {
  OFFICIAL_SPECIALIST_LOADOUT_ACTION_ATOM_IDS,
  OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID,
  OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS,
  OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND,
} from "../packages/rule-atoms/official-specialist-loadout-executor-v1.mjs";
import {
  createOfficialSpecialistLoadoutRuleSliceV1,
  verifyOfficialSpecialistLoadoutRuleSliceV1,
} from "../packages/rule-atoms/official-specialist-loadout-rule-slice-v1.mjs";
import { createOfficialCommandCenterDataset } from
  "../packages/source-data/official-command-center-adapter-v1.mjs";
import { applyOfficialCommandCenterFirestoreDelta } from
  "../packages/source-data/official-command-center-snapshot-delta-v1.mjs";
import { createOfficialGameplayDataBundleV1 } from
  "../packages/source-data/official-gameplay-data-bundle-v1.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..");
const OUTPUT_DIR = path.join(ROOT, "build", "ticket-11-rule-atoms-v1");
const FIRESTORE_DIR = path.join(
  ROOT,
  "build",
  "source-intake",
  "official-rules",
  "command-center",
  "firestore",
);
const OCCURRED_AT = "2026-08-26T00:00:00.000Z";
const HISTORICAL_SLICE_30_RUNTIME_HASH =
  "28dd32c0b27bda8573171b4ed7008bebde9f919bf954688d0fe30d7f154915fc";
const CORE_PDF_URL =
  "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf";
const TERRAN_P2P_URL =
  "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf";
const VERSIONS_URL =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_metadata/versions";
const MARINE_URL =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/marine";

const acceptance = [];

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

async function fetchOfficial(url, kind, responseKind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) {
        lastError = new Error(`${kind} HTTP ${response.status}`);
      } else if (responseKind === "json") {
        return await response.json();
      } else if (responseKind === "bytes") {
        return Buffer.from(await response.arrayBuffer());
      } else {
        throw new Error(`unsupported official response kind: ${responseKind}`);
      }
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
  path.join(OUTPUT_DIR, "official-close-combat-attack-rule-slice-v8-report.json"),
  "utf8",
));
const slice = createOfficialSpecialistLoadoutRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialSpecialistLoadoutRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.equal(audit.counts.executableRuleAtoms, 331);
assert.equal(audit.counts.reviewRequiredRuleAtoms, 581);
assert.equal(audit.counts.displayOnlyRuleAtoms, 114);
assert.equal(audit.counts.newlyExecutableRuleAtoms, 4);
assert.equal(audit.counts.changedNonTargetAtoms, 0);
assert.equal(slice.effectKernel.knownUnimplementedEffectAtoms, 5);
assert.equal(slice.specialistProgress.separateAttackBatchExecutable, false);
acceptance.push("catalogue_promotes_only_four_assignment_atoms_and_keeps_batch_atom_closed");

const basePayloads = Object.fromEntries(await Promise.all([
  "army_units",
  "faction_cards",
  "rules_sections",
  "tactical_cards",
].map(async (collectionId) => [
  collectionId,
  JSON.parse(await readFile(path.join(FIRESTORE_DIR, `${collectionId}.json`), "utf8")),
])));
const driftReport = JSON.parse(await readFile(
  path.join(OUTPUT_DIR, "official-command-center-community-drift-v2-report.json"),
  "utf8",
));
const firstFactionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: basePayloads.faction_cards,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_25_V1,
});
const secondFactionApplication = applyOfficialCommandCenterFirestoreDelta({
  basePayload: firstFactionApplication.firestorePayload,
  delta: OFFICIAL_COMMAND_CENTER_FACTION_DELTA_2026_08_26_V1,
});
const snapshot = driftReport.currentOfficialSnapshot.snapshot;
const dataset = createOfficialCommandCenterDataset({
  snapshot,
  firestorePayloads: {
    ...basePayloads,
    faction_cards: secondFactionApplication.firestorePayload,
  },
});
const gameplayDataBundle = createOfficialGameplayDataBundleV1({
  snapshot,
  dataset,
  unitRecordKeys: ["army_units:marine"],
  missionRecordKey: "faction_cards:mission_hold_position",
  attackProfileData: true,
});
assert.equal(snapshot.snapshotHash,
  "2407d2536278776692c9116cb74c4147e15f2aa6ff9af9204141e5620220bd78");
assert.equal(dataset.datasetHash,
  "40ba72534a2165131288ec77ccf67984baf5f740e58c4f94283b46137a54757a");

// Keep the four official reads sequential. The cumulative foundation gate executes
// many short-lived verifier processes; opening both large PDFs beside Firestore
// reads caused avoidable connection starvation and made the proof flaky.
const versionsDocument = await fetchOfficial(
  VERSIONS_URL,
  "official versions",
  "json",
);
const marineDocument = await fetchOfficial(MARINE_URL, "official Marine", "json");
const corePdf = await fetchOfficial(CORE_PDF_URL, "official Core PDF", "bytes");
const terranP2p = await fetchOfficial(
  TERRAN_P2P_URL,
  "official Terran P2P PDF",
  "bytes",
);
const corePdfHash = sha256(corePdf);
const terranP2pHash = sha256(terranP2p);
// Match the documented `jq -S -c` capture contract, including its trailing LF.
const versionsCanonicalHash = sha256(`${canonicalStarcraftTmgJson(versionsDocument)}\n`);
const marineCanonicalHash = sha256(`${canonicalStarcraftTmgJson(marineDocument)}\n`);
assert.deepEqual({
  unitsVersion: versionsDocument.fields.unitsVersion.integerValue,
  cardsVersion: versionsDocument.fields.cardsVersion.integerValue,
  rulesVersion: versionsDocument.fields.rulesVersion.integerValue,
}, { unitsVersion: "71", cardsVersion: "69", rulesVersion: "48" });
assert.equal(versionsDocument.updateTime, "2026-05-26T13:23:51.064119Z");
assert.equal(versionsCanonicalHash,
  "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733");
assert.equal(marineDocument.updateTime, "2026-05-15T14:00:22.456608Z");
assert.equal(marineCanonicalHash,
  "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1");
assert.equal(corePdfHash,
  "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54");
assert.equal(terranP2pHash,
  "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c");
acceptance.push("live_versions_marine_core_and_terran_sources_match_reviewed_hashes");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
assert.equal(runtime.descriptor.executableRuleAtomCount, 331);
assert.equal(runtime.descriptor.nonExecutableRuleAtomCount, 695);
assert.ok(runtime.descriptor.parameterDomainKinds.includes(
  OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND,
));
acceptance.push("runtime_exposes_specialist_assignment_parameter_domain");

function marinePiece(input = {}) {
  const currentModels = Number(input.currentModels || 6);
  return {
    id: input.id || "p1-marines",
    name: "Marine",
    sideKey: input.sideKey || "player1",
    officialUnitRecordKey: "army_units:marine",
    sourceRecordHash:
      "682a2ea237c32dc25cc7c389c3b949705326bba6c416085c39dda2388dd3f215",
    currentModels,
    maxModels: currentModels,
    currentSupply: currentModels === 6 ? 1 : 2,
    isOnField: false,
    isDestroyed: false,
    statuses: [],
    selectedUpgradeNames: input.selectedUpgradeNames || ["AGG-12", "Rocket Launcher"],
    activatedPhases: { movement: false, assault: false, combat: false },
    models: Array.from({ length: currentModels }, (_unused, index) => ({
      id: `${input.id || "p1-marines"}-m${index + 1}`,
      isOnField: false,
      isDestroyed: false,
    })),
  };
}

function armyBuildingState(input = {}) {
  return {
    schemaVersion: "starcraft_tmg_state_v0",
    round: 1,
    phase: input.phase || "army_building",
    activeSideKey: input.activeSideKey || "player1",
    firstPlayerSideKey: "player1",
    players: {
      player1: { sideKey: "player1", passedPhases: {} },
      player2: { sideKey: "player2", passedPhases: {} },
    },
    scores: { player1: 0, player2: 0 },
    officialGameplayDataBundle: gameplayDataBundle,
    board: { widthInches: 54, heightInches: 36, terrain: [], effectMarkers: [] },
    cardResources: { player1: [], player2: [] },
    pieces: input.pieces || [marinePiece()],
    gameOver: false,
    terminal: false,
    winner: "",
    terminalReason: "",
    log: [],
  };
}

const { privateKey, publicKey } = generateKeyPairSync("ed25519");

function authoritativeEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => OCCURRED_AT,
    cryptoOptions: {
      keyId: "ticket-11-specialist-loadout-referee-v1",
      privateKey,
      publicKey,
      hmacSecret,
    },
  });
}

function envelopeForState(engine, roomId, state) {
  return engine.createEnvelope({
    roomId,
    dataVersion: "71/69/48",
    dependencies: {
      sourceSnapshot: {
        artifactId: "official-command-center-snapshot",
        content: snapshot,
      },
      dataSnapshot: {
        artifactId: "official-gameplay-data-bundle",
        content: gameplayDataBundle,
      },
    },
    state,
  });
}

function credentials(engine, envelope, sideKey, suffix) {
  const authority = engine.issueSeatAuthority({
    grantId: `specialist-${suffix}-grant`,
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: sideKey,
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const lease = engine.issueControlLease({
    seatAuthority: authority,
    sessionId: `specialist-${suffix}-session`,
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { authority, lease };
}

const engine = authoritativeEngine("ticket-11-specialist-loadout-seal-v1");
const initial = envelopeForState(
  engine,
  "official-specialist-loadout-room",
  armyBuildingState(),
);
const access = credentials(engine, initial, "player1", "valid");
const legal = engine.legalSpace(initial, { seatAuthority: access.authority });
const domain = legal.parameterDomains.find((entry) => (
  entry.parameterKind === OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND
    && entry.pieceId === "p1-marines"
));
assert.ok(domain, JSON.stringify(legal.disabledDiagnostics));
assert.equal(domain.executorId, OFFICIAL_SPECIALIST_LOADOUT_EXECUTOR_ID);
assert.deepEqual(domain.ruleAtomIds, [...OFFICIAL_SPECIALIST_LOADOUT_ACTION_ATOM_IDS]);
assert.deepEqual(domain.constraints.modelIds, [
  "p1-marines-m1",
  "p1-marines-m2",
  "p1-marines-m3",
  "p1-marines-m4",
  "p1-marines-m5",
  "p1-marines-m6",
]);
assert.deepEqual(
  domain.constraints.selectedSpecialistProfiles.map((entry) => entry.weaponName),
  ["AGG-12", "Rocket Launcher"],
);
acceptance.push("legal_space_names_exact_specialist_profiles_and_roster_models");

const validParameters = {
  assignments: [
    { weaponName: "Rocket Launcher", modelId: "p1-marines-m1" },
    { weaponName: "AGG-12", modelId: "p1-marines-m2" },
  ],
};
const preview = engine.preview({
  envelope: initial,
  seatAuthority: access.authority,
  proposal: { kind: "parameterized", domainId: domain.domainId, parameters: validParameters },
});
assert.equal(preview.ok, true, JSON.stringify(preview));
const plan = preview.preview.core.action.specialistLoadoutPlan;
assert.equal(plan.assignmentStatus, "executable");
assert.equal(plan.attackBatchStatus, "review_required");
assert.equal(plan.attackBatchExecutionAuthorized, false);
assert.equal(plan.sidearmExecutionAuthorized, false);
assert.equal(plan.indirectFireExecutionAuthorized, false);
const loadoutByModel = new Map(plan.modelLoadouts.map((entry) => [
  entry.modelId,
  entry.assaultWeapons.map((weapon) => weapon.weaponName),
]));
assert.deepEqual(loadoutByModel.get("p1-marines-m1"), ["C-14 rifle", "Rocket Launcher"]);
assert.deepEqual(loadoutByModel.get("p1-marines-m2"), ["AGG-12"]);
for (const modelId of [
  "p1-marines-m3",
  "p1-marines-m4",
  "p1-marines-m5",
  "p1-marines-m6",
]) assert.deepEqual(loadoutByModel.get(modelId), ["C-14 rifle"]);
acceptance.push("preview_applies_model_local_replacement_and_nonreplacement_addition");

const confirmed = engine.confirmPreview({
  envelope: initial,
  preview: preview.preview,
  seatAuthority: access.authority,
});
assert.equal(confirmed.ok, true, JSON.stringify(confirmed));
const applied = engine.apply({
  envelope: initial,
  expectedStateRevision: initial.stateRevision,
  preview: preview.preview,
  confirmation: confirmed.confirmation,
  seatAuthority: access.authority,
  controlLease: access.lease,
  idempotencyKey: "specialist-loadout-valid-v1",
});
assert.equal(applied.ok, true, JSON.stringify(applied));
const configured = applied.envelope.state.pieces.find((piece) => piece.id === "p1-marines");
assert.equal(configured.rosterLoadoutSealed, true);
assert.equal(configured.specialistLoadoutHash, plan.specialistLoadoutHash);
assert.deepEqual(
  configured.models.find((model) => model.id === "p1-marines-m1").assaultWeaponNames,
  ["C-14 rifle", "Rocket Launcher"],
);
assert.deepEqual(
  configured.models.find((model) => model.id === "p1-marines-m2").assaultWeaponNames,
  ["AGG-12"],
);
const postLegal = engine.legalSpace(applied.envelope, { seatAuthority: access.authority });
assert.equal(postLegal.parameterDomains.some((entry) => (
  entry.parameterKind === OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND
)), false);
assert.equal(applied.receipt.trainingTruth, false);
acceptance.push("apply_seals_model_loadout_once_and_removes_repeat_legal_action");

function expectInstantiationFailure(parameters, pattern) {
  assert.throws(
    () => runtime.instantiate(initial.state, domain, parameters, {
      matchBinding: initial.matchBinding,
    }),
    pattern,
  );
}

expectInstantiationFailure({
  assignments: [
    { weaponName: "AGG-12", modelId: "p1-marines-m1" },
    { weaponName: "Rocket Launcher", modelId: "p1-marines-m1" },
  ],
}, /SPECIALIST_DISTINCT_CARRIER_REQUIRED/u);
expectInstantiationFailure({
  assignments: [{ weaponName: "AGG-12", modelId: "p1-marines-m1" }],
}, /SPECIALIST_ASSIGNMENT_DENOMINATOR_MISMATCH/u);
expectInstantiationFailure({
  assignments: [
    { weaponName: "AGG-12", modelId: "p1-marines-m2" },
    { weaponName: "Rocket Launcher", modelId: "unknown-model" },
  ],
}, /SPECIALIST_CARRIER_MODEL_UNKNOWN/u);
expectInstantiationFailure({
  assignments: [
    { weaponName: "AGG-12", modelId: "p1-marines-m2" },
    { weaponName: "AGG-12", modelId: "p1-marines-m3" },
  ],
}, /SPECIALIST_ASSIGNMENT_DENOMINATOR_MISMATCH/u);
acceptance.push("shared_carrier_missing_unknown_and_duplicate_assignment_fail_closed");

const duplicateUpgradeState = armyBuildingState({
  pieces: [marinePiece({ selectedUpgradeNames: ["AGG-12", "AGG-12"] })],
});
const duplicateLegal = runtime.enumerate(duplicateUpgradeState, {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: initial.matchBinding,
});
assert.equal(duplicateLegal.parameterDomains.length, 0);
assert.ok(duplicateLegal.candidates.some((candidate) => (
  candidate.disabledReason === "SPECIALIST_DUPLICATE_UPGRADE_FORBIDDEN"
)));
const wrongPhase = runtime.enumerate(armyBuildingState({ phase: "movement" }), {
  sideKey: "player1",
  includeDisabled: true,
  matchBinding: initial.matchBinding,
});
assert.equal(wrongPhase.parameterDomains.some((entry) => (
  entry.parameterKind === OFFICIAL_SPECIALIST_LOADOUT_PARAMETER_KIND
)), false);
acceptance.push("duplicate_purchase_and_wrong_phase_are_not_legal_space");

const nineState = armyBuildingState({
  pieces: [marinePiece({
    id: "p1-nine-marines",
    currentModels: 9,
    selectedUpgradeNames: ["AGG-12"],
  })],
});
const nineLegal = runtime.enumerate(nineState, {
  sideKey: "player1",
  matchBinding: initial.matchBinding,
});
const nineDomain = nineLegal.parameterDomains[0];
assert.equal(nineDomain.constraints.currentModels, 9);
assert.equal(nineDomain.constraints.currentSupply, 2);
const nineInstantiation = runtime.instantiate(nineState, nineDomain, {
  assignments: [{ weaponName: "AGG-12", modelId: "p1-nine-marines-m9" }],
}, { matchBinding: initial.matchBinding });
assert.equal(nineInstantiation.action.specialistLoadoutPlan.assignments.length, 1);
assert.deepEqual(
  nineInstantiation.action.specialistLoadoutPlan.modelLoadouts
    .find((entry) => entry.modelId === "p1-nine-marines-m9").assaultWeapons
    .map((weapon) => weapon.weaponName),
  ["AGG-12"],
);
acceptance.push("nine_model_composition_supports_one_exact_specialist_nomination");

const stalePlan = structuredClone(preview.preview.core.action);
stalePlan.specialistLoadoutPlan.modelLoadouts[0].assaultWeapons = [];
assert.throws(
  () => runtime.apply(initial.state, stalePlan, { matchBinding: initial.matchBinding }),
  /SPECIALIST_ACTION_STALE/u,
);
const tamperedBundleState = structuredClone(initial.state);
tamperedBundleState.officialGameplayDataBundle.attackProfileCatalogue.profiles[0].damage = 99;
assert.throws(
  () => runtime.instantiate(tamperedBundleState, domain, validParameters, {
    matchBinding: initial.matchBinding,
  }),
  /SPECIALIST_PARAMETER_DOMAIN_STALE/u,
);
acceptance.push("action_and_official_profile_tamper_fail_closed");

const replayEngine = authoritativeEngine("ticket-11-specialist-loadout-rotated-seal-v2");
for (const [kind, content] of [
  ["sourceSnapshot", snapshot],
  ["dataSnapshot", gameplayDataBundle],
  ["rulesArtifact", {
    kind: "rules-artifact",
    rulesVersion: runtime.descriptor.rulesVersion,
    rulesRuntimeBinding: initial.matchBinding.rulesRuntimeBinding,
  }],
  ["executorArtifact", {
    kind: "executor-artifact",
    authorityVersion: "starcraft_tmg_authority_v2",
    rulesRuntimeHash: initial.matchBinding.rulesRuntimeBinding.runtimeHash,
    catalogueHash: initial.matchBinding.rulesRuntimeBinding.catalogueHash,
    executorManifest: runtime.descriptor.executorManifest,
  }],
  ["geometryArtifact", {
    kind: "geometry-artifact",
    geometryVersion: "fixed_point_round_base_v1",
  }],
  ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v1" }],
]) {
  replayEngine.registerDependency({
    kind,
    artifactId: initial.matchBinding.dependencies[kind].artifactId,
    content,
  });
}
replayEngine.registerDependency({
  kind: "rulesDisplay",
  artifactId: initial.matchBinding.rulesDisplayBinding.artifactId,
  mediaType: "text/markdown",
  locale: "en",
  content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}\n\nThis development artifact preserves the rules identity used by the match.`,
});
const replayed = replayEngine.replay({
  initialEnvelope: initial,
  journal: [applied.receipt],
});
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, applied.envelope.stateHash);
const tamperedJournal = [structuredClone(applied.receipt)];
tamperedJournal[0].events.push({ type: "forged_specialist_assignment" });
const tamperedReplay = replayEngine.replay({
  initialEnvelope: initial,
  journal: tamperedJournal,
});
assert.equal(tamperedReplay.ok, false);
assert.equal(tamperedReplay.reason, "SIGNATURE_INVALID");
acceptance.push("ed25519_replay_survives_hmac_rotation_and_rejects_tamper");

const historicalRuntime = createOfficialExecutableRuleRuntimeV1({
  catalogue: previousReport.slice.catalogue,
});
assert.equal(historicalRuntime.descriptor.runtimeHash, HISTORICAL_SLICE_30_RUNTIME_HASH);
assert.equal(historicalRuntime.descriptor.executableRuleAtomCount, 327);
assert.equal(slice.historicalCompatibility.silentCompatibilityAllowed, false);
assert.equal(slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("historical_slice30_runtime_and_rules_display_remain_frozen");

assert.deepEqual(slice.newlyExecutableRuleAtomIds,
  [...OFFICIAL_SPECIALIST_LOADOUT_NEW_ATOM_IDS]);
assert.equal(slice.ctx2skill.skillsGenerated.length, 0);
assert.equal(slice.ctx2skill.promotions.length, 0);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
assert.equal(slice.trainingTruth, false);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_official_specialist_loadout_rule_slice_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  liveOfficialRevalidation: {
    versionsUrl: VERSIONS_URL,
    versionsCanonicalHash,
    versionsUpdateTime: versionsDocument.updateTime,
    marineUrl: MARINE_URL,
    marineCanonicalHash,
    marineUpdateTime: marineDocument.updateTime,
    corePdfUrl: CORE_PDF_URL,
    corePdfHash,
    terranP2pUrl: TERRAN_P2P_URL,
    terranP2pHash,
    repositoryFallbackUsed: false,
  },
  officialSourceSnapshotHash: snapshot.snapshotHash,
  officialDatasetHash: dataset.datasetHash,
  gameplayDataBundleHash: gameplayDataBundle.gameplayDataBundleHash,
  slice,
  audit,
  runtime: runtime.descriptor,
  historicalSliceHash: previousReport.slice.sliceHash,
  historicalCatalogueHash: previousReport.slice.catalogueHash,
  historicalRuntimeHash: historicalRuntime.descriptor.runtimeHash,
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesTruth: "official_marine_specialist_assignment_exact_subset",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(
  path.join(OUTPUT_DIR, "official-specialist-loadout-rule-slice-v1-report.json"),
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
  knownUnimplementedEffectAtoms: report.slice.effectKernel.knownUnimplementedEffectAtoms,
  trainingTruth: report.trainingTruth,
}, null, 2));
