#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash, generateKeyPairSync } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { canonicalStarcraftTmgJson } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  createOfficialExistingSpecialistV2ContractClosureRuleSliceV1,
  OFFICIAL_SLICE_73_MIGRATED_ATOM_IDS,
  verifyOfficialExistingSpecialistV2ContractClosureRuleSliceV1,
} from "../packages/rule-atoms/official-existing-specialist-v2-contract-closure-rule-slice-v1.mjs";
import { createOfficialExecutableRuleRuntimeV1 } from
  "../packages/rule-atoms/official-executable-rule-runtime-v1.mjs";
import { auditRuleRelationshipGraphV1, createRuleRelationshipGraphV1 } from
  "../packages/rule-atoms/rule-relationship-graph-v1.mjs";
import { OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID } from
  "../packages/rule-atoms/official-specialist-loadout-executor-v2.mjs";
import { OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID } from
  "../packages/rule-atoms/official-specialist-ranged-batch-executor-v2.mjs";
import { createOfficialSpecialistV2RelationshipExtensionV1 } from
  "../packages/rule-atoms/official-specialist-v2-relationship-contract-v1.mjs";
import * as fixture from "./verify-official-specialist-v2-public-contract-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(ROOT, "build/ticket-11-rule-atoms-v1");
const previousReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-existing-sidearm-pinpoint-v2-contract-closure-v1-report.json",
), "utf8"));
const liveSourceReport = JSON.parse(await readFile(path.join(
  OUTPUT_DIR,
  "official-live-source-snapshots-report.json",
), "utf8"));
const acceptance = [];

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function documentHash(document) { return sha256(`${canonicalStarcraftTmgJson(document)}\n`); }
function action(candidate) {
  return Object.fromEntries(Object.entries(candidate).filter(([key]) => (
    !["isEnabled", "disabledReason", "score", "details"].includes(key)
  )));
}
async function fetchOfficial(url, kind) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
      if (response.ok) return response;
      lastError = new Error(`${kind} HTTP ${response.status}`);
    } catch (error) { lastError = error; }
  }
  throw lastError;
}

const slice = createOfficialExistingSpecialistV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
});
const audit = verifyOfficialExistingSpecialistV2ContractClosureRuleSliceV1({
  previousSlice: previousReport.slice,
  slice,
});
assert.deepEqual(audit.counts, {
  executableRuleAtoms: 421,
  reviewRequiredRuleAtoms: 491,
  displayOnlyRuleAtoms: 114,
  changedAtoms: 10,
  strictCompleteAtoms: 417,
  partialContractAtoms: 4,
  noContractAtoms: 0,
  declaredStateContractExecutors: 40,
  missingStateContractExecutors: 2,
});
assert.deepEqual(slice.versionReassignedRuleAtomIds,
  [...OFFICIAL_SLICE_73_MIGRATED_ATOM_IDS]);
assert.equal(slice.newlyExecutableRuleAtomIds.length, 0);
acceptance.push("ten_existing_specialist_atoms_rebound_without_denominator_growth");

const runtime = createOfficialExecutableRuleRuntimeV1({ catalogue: slice.catalogue });
const matchBinding = {
  ...fixture.matchBinding,
  rulesRuntimeBinding: { runtimeHash: runtime.descriptor.runtimeHash },
};
const army = fixture.armyBuildingState();
const armyLegal = runtime.enumerate(army, { sideKey: "player1", matchBinding });
const domain = armyLegal.parameterDomains.find((entry) => (
  entry.executorId === OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID
));
assert.ok(domain, JSON.stringify(armyLegal.candidates));
const instantiated = runtime.instantiate(army, domain, {
  assignments: [{ weaponName: "AGG-12", modelId: "p1-marines-m1" }],
}, { matchBinding });
const configured = runtime.apply(army, instantiated.action, {
  matchBinding, postRevision: 1,
});
assert.equal(configured.state.pieces[0].specialistLoadout.gameplayDataBundleHash,
  fixture.gameplayDataBundle.gameplayDataBundleHash);
const battle = fixture.battleStateFromConfigured(configured.state);
const battleLegal = runtime.enumerate(battle, { sideKey: "player1", matchBinding });
const batches = battleLegal.candidates.filter((entry) => (
  entry.executorId === OFFICIAL_SPECIALIST_RANGED_BATCH_V2_EXECUTOR_ID
));
assert.equal(batches.length, 4);
const first = runtime.apply(battle, action(batches[0]), {
  matchBinding, postRevision: 2,
  chanceReveals: Array.from({ length: batches[0].chance.count }, () => 1),
});
assert.equal(first.sequenceComplete, false);
assert.equal(first.state.pendingRangedAttackSequence.specialistLoadoutHash,
  first.state.pieces[0].specialistLoadoutHash);
acceptance.push("current_runtime_configures_loadout_and_exposes_four_sequential_batches");

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
function authorityEngine(hmacSecret) {
  return createStarcraftTmgAuthoritativeEngine({
    rulesRuntime: runtime,
    allowIncompleteRuleRuntimeForDevelopment: true,
    now: () => "2026-08-30T18:00:00.000Z",
    cryptoOptions: {
      keyId: "ticket-11-slice-73-referee-v1",
      privateKey, publicKey, hmacSecret,
    },
  });
}
function credentials(engine, envelope) {
  const seatAuthority = engine.issueSeatAuthority({
    grantId: "slice-73-player1-grant",
    roomId: envelope.roomId,
    matchBindingHash: envelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "confirm", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: "slice-73-player1-session",
    leaseFence: 1,
    issuedAtRoomRevision: envelope.stateRevision,
  });
  return { seatAuthority, controlLease };
}
const engine = authorityEngine("ticket-11-slice-73-short-seal-v1");
const initialEnvelope = engine.createEnvelope({
  roomId: "official-slice-73-specialist-room",
  dataVersion: "71/69/48",
  dependencies: {
    sourceSnapshot: { artifactId: "official-command-center-snapshot",
      content: liveSourceReport.commandSnapshot },
    dataSnapshot: { artifactId: "official-specialist-gameplay-data-bundle",
      content: fixture.gameplayDataBundle },
  },
  state: army,
});
const access = credentials(engine, initialEnvelope);
const legal = engine.legalSpace(initialEnvelope, { seatAuthority: access.seatAuthority });
const authorityDomain = legal.parameterDomains.find((entry) => (
  entry.executorId === OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID
));
assert.ok(authorityDomain);
const preview = engine.preview({
  envelope: initialEnvelope,
  seatAuthority: access.seatAuthority,
  proposal: { kind: "parameterized", domainId: authorityDomain.domainId,
    parameters: { assignments: [{ weaponName: "AGG-12", modelId: "p1-marines-m1" }] } },
});
assert.equal(preview.ok, true, JSON.stringify(preview));
const confirmation = engine.confirmPreview({
  envelope: initialEnvelope, preview: preview.preview,
  seatAuthority: access.seatAuthority,
});
const authorityApplied = engine.apply({
  envelope: initialEnvelope,
  expectedStateRevision: 0,
  preview: preview.preview,
  confirmation: confirmation.confirmation,
  seatAuthority: access.seatAuthority,
  controlLease: access.controlLease,
  idempotencyKey: "slice-73-specialist-loadout",
});
assert.equal(authorityApplied.ok, true, JSON.stringify(authorityApplied));

function registerReplayDependencies(replayEngine) {
  for (const [kind, content] of [
    ["sourceSnapshot", liveSourceReport.commandSnapshot],
    ["dataSnapshot", fixture.gameplayDataBundle],
    ["rulesArtifact", { kind: "rules-artifact", rulesVersion: runtime.descriptor.rulesVersion,
      rulesRuntimeBinding: initialEnvelope.matchBinding.rulesRuntimeBinding }],
    ["executorArtifact", { kind: "executor-artifact",
      authorityVersion: "starcraft_tmg_authority_v2",
      rulesRuntimeHash: runtime.descriptor.runtimeHash,
      catalogueHash: slice.catalogueHash,
      executorManifest: runtime.descriptor.executorManifest }],
    ["geometryArtifact", { kind: "geometry-artifact",
      geometryVersion: "fixed_point_round_base_v1" }],
    ["actionSchema", { kind: "action-schema", schemaVersion: "hybrid_legal_space_v25" }],
  ]) replayEngine.registerDependency({
    kind,
    artifactId: initialEnvelope.matchBinding.dependencies[kind].artifactId,
    content,
  });
  replayEngine.registerDependency({
    kind: "rulesDisplay",
    artifactId: initialEnvelope.matchBinding.rulesDisplayBinding.artifactId,
    mediaType: "text/markdown",
    locale: "en",
    content: `# Historical rules display\n\nFrozen rules version: ${runtime.descriptor.rulesVersion}`
      + "\n\nThis development artifact preserves the rules identity used by the match.",
  });
}
const replayEngine = authorityEngine("ticket-11-slice-73-rotated-short-seal-v2");
registerReplayDependencies(replayEngine);
const replayed = replayEngine.replay({ initialEnvelope, journal: [authorityApplied.receipt] });
assert.equal(replayed.ok, true, JSON.stringify(replayed));
assert.equal(replayed.envelope.stateHash, authorityApplied.envelope.stateHash);
const tampered = structuredClone(authorityApplied.receipt);
tampered.action.dataAdapterReceiptHash = "0".repeat(64);
assert.equal(replayEngine.replay({ initialEnvelope, journal: [tampered] }).reason,
  "SIGNATURE_INVALID");
acceptance.push("authority_preview_confirm_apply_and_ed25519_replay_survive_hmac_rotation");

const graph = createRuleRelationshipGraphV1({
  catalogue: slice.catalogue,
  extension: createOfficialSpecialistV2RelationshipExtensionV1({
    catalogueHash: slice.catalogueHash,
    runtimeHash: runtime.descriptor.runtimeHash,
  }),
});
const graphAudit = auditRuleRelationshipGraphV1(graph);
assert.equal(graphAudit.valid, true);
assert.equal(graphAudit.counts.declaredStateContractExecutors, 40);
const brokenGraph = structuredClone(graph);
const targetScope = brokenGraph.coverageScopes.find((entry) => (
  entry.executorId === OFFICIAL_SPECIALIST_LOADOUT_V2_EXECUTOR_ID
));
const requiredEdge = targetScope.requiredEdges[0];
brokenGraph.edges = brokenGraph.edges.filter((entry) => entry.edgeId !== requiredEdge.edgeId);
brokenGraph.graphHash = sha256("broken-by-negative-gap-test");
assert.throws(() => auditRuleRelationshipGraphV1(brokenGraph));
acceptance.push("two_relationship_contracts_are_complete_and_negative_gap_fails_closed");

for (const [file, expected] of [
  ["official-specialist-loadout-executor-v1.mjs",
    "6bc5b048d975436f385245078a56e6fb778bb7f251bc33367df00c6ede4662ac"],
  ["official-specialist-ranged-batch-executor-v1.mjs",
    "8e2a0041c6b511c44ef76f3312040d9978f07e2b6c11744c1e1e356c0e334d56"],
]) {
  const bytes = await readFile(path.join(ROOT, "packages/rule-atoms", file));
  assert.equal(sha256(bytes), expected);
}
assert.equal(previousReport.slice.historicalCompatibility.historicalRulesDisplayRetained, true);
acceptance.push("slice72_runtime_rules_display_and_both_v1_executor_bytes_remain_frozen");

const firestoreRoot =
  "https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents";
const urls = {
  versions: `${firestoreRoot}/system_metadata/versions`,
  marine: `${firestoreRoot}/army_units/marine`,
  goliath: `${firestoreRoot}/army_units/goliath`,
  part8: `${firestoreRoot}/rules_sections/iuUyObNTQ2M8xK4IUqzC`,
  part9: `${firestoreRoot}/rules_sections/Rj6sMyNODPQ8OHUc9Clp`,
  core: "https://starcraft-tmg.com/files/downloads/StarCraft-TMG_EN.pdf",
  terran: "https://starcraft-tmg.com/files/downloads/StarCraft-Terran-P2P-Card-Sheets-A4_EN.pdf",
};
const responses = Object.fromEntries(await Promise.all(Object.entries(urls).map(
  async ([key, url]) => [key, await fetchOfficial(url, key)],
)));
const documents = Object.fromEntries(await Promise.all([
  "versions", "marine", "goliath", "part8", "part9",
].map(async (key) => [key, await responses[key].json()])));
const liveOfficialRevalidation = {
  versionsCanonicalHash: documentHash(documents.versions),
  marineCanonicalHash: documentHash(documents.marine),
  goliathCanonicalHash: documentHash(documents.goliath),
  part8CanonicalHash: documentHash(documents.part8),
  part9CanonicalHash: documentHash(documents.part9),
  corePdfHash: sha256(Buffer.from(await responses.core.arrayBuffer())),
  terranP2pHash: sha256(Buffer.from(await responses.terran.arrayBuffer())),
  repositoryFallbackUsed: false,
};
assert.deepEqual(liveOfficialRevalidation, {
  versionsCanonicalHash: "35b3c26bb9c82bce1efba3e48697b41e512b0be7d7e4bacb9452d224fd62c733",
  marineCanonicalHash: "32061705b67ab074c6aa755dc527f6d0db0e4fc2d7cb2fa95d7b288f35cf79f1",
  goliathCanonicalHash: "d11236a23f30fe101958d6af919d34f57796dff51409247006d7639bf2b7a8cc",
  part8CanonicalHash: "35df7670c92d7402ef22333184f267a66cf155808b3bcaa333340932b19bf55b",
  part9CanonicalHash: "0b7f93150a5c915fb1fe52f2b2a276e5eee2f77fa251b3be583de71837bfd2cb",
  corePdfHash: "27639c562e6db9777dd9ba984d0c9f9b581841ec30166848e021f893cd00ea54",
  terranP2pHash: "afa3f229db61444d0673dea35e31772530a4c39dadaa0e281ba1bae0d271109c",
  repositoryFallbackUsed: false,
});
acceptance.push("seven_latest_official_sources_revalidate_without_repository_fallback");

assert.deepEqual(slice.ctx2skill.skillsGenerated, []);
assert.deepEqual(slice.ctx2skill.promotions, []);
assert.deepEqual(slice.harness.trainingTraceCandidates, []);
acceptance.push("no_skill_dsh_muzero_memory_or_training_promotion_occurs");

const report = {
  schema: "starcraft_tmg_official_existing_specialist_v2_contract_closure_verification_v1",
  generatedAt: new Date().toISOString(),
  acceptancePassed: acceptance.length,
  acceptanceTotal: acceptance.length,
  acceptance,
  failures: [],
  liveOfficialRevalidation,
  officialSourceSnapshotHash: fixture.gameplayDataBundle.sourceSnapshotHash,
  officialDatasetHash: fixture.gameplayDataBundle.normalizedDatasetHash,
  gameplayDataBundleHash: fixture.gameplayDataBundle.gameplayDataBundleHash,
  slice,
  sliceAudit: audit,
  runtimeHash: runtime.descriptor.runtimeHash,
  catalogueHash: slice.catalogueHash,
  graph,
  graphAudit,
  coverage: audit.stateContractCoverage,
  authority: { previewConfirmApply: true, signatureAlgorithm: "ed25519",
    replayAfterHmacRotation: true, tamperRejected: true },
  ctx2skill: slice.ctx2skill,
  harness: slice.harness,
  rulesEligible: false,
  productionRoomEligible: false,
  rulesTruth: "official_current_specialist_v2_contract_closure",
  trainingTruth: false,
};
await mkdir(OUTPUT_DIR, { recursive: true });
await writeFile(path.join(
  OUTPUT_DIR,
  "official-existing-specialist-v2-contract-closure-v1-report.json",
), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  schema: report.schema,
  acceptancePassed: report.acceptancePassed,
  acceptanceTotal: report.acceptanceTotal,
  sliceHash: slice.sliceHash,
  catalogueHash: slice.catalogueHash,
  runtimeHash: runtime.descriptor.runtimeHash,
  graphHash: graph.graphHash,
  stateContractCoverage: audit.counts,
  repositoryFallbackUsed: false,
  trainingTruth: false,
}, null, 2));
