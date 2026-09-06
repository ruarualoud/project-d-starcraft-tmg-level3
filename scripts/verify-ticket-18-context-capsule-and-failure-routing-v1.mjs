#!/usr/bin/env node

import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_REF_V1 as outputContractRef,
} from "../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createFactionWritingPlanV1 } from
  "../packages/skill-production-v3/faction-strategy-workflow-v1.mjs";
import { createFactionLocalEditorContextCapsuleV1,
  isolateFactionLocalEditorIssueV1 } from
  "../packages/skill-production-v3/faction-local-editor-context-capsule-v1.mjs";
import { verifySeal } from "../packages/skill-production/common.mjs";
import {
  contextManifestRefStarcraftTmgV1,
  createStarcraftTmgContextCapsuleRegistryV1,
  verifyStarcraftTmgContextCapsuleV1,
} from "../packages/structured-generation/context-capsule-v1.mjs";
import { classifyStarcraftTmgStructuredFailureV1 } from
  "../packages/structured-generation/failure-classifier-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = path.join(ROOT, "build/ticket-18-structured-generation-v1");
const REPORT_PATH = path.join(REPORT_DIR, "r4-context-and-routing-report.json");
const CAPSULE_PATH = path.join(REPORT_DIR,
  "objectives-editor-0.1-context-capsule.json");
const RUN_ID = "faction-v1-9a88d1a1008f0bb079ba";
const checks = [];

async function check(id, operation) {
  await operation();
  checks.push({ id, passed: true });
}

const factionInput = verifySeal(JSON.parse(await readFile(path.join(ROOT,
  "build/ticket-18-faction-production-v1/terran_armed_forces-input.json"),
"utf8")));
const plan = createFactionWritingPlanV1(factionInput);
const section = plan.sections.find((row) =>
  row.id === "faction.terran_armed_forces.objectives.1");
assert(section);
const db = new DatabaseSync(path.join(ROOT,
  "build/ticket-17-production-redesign-v1/production.sqlite"),
{ readOnly: true });
let journal;
let corrected;
try {
  const readStep = (id) => {
    const row = db.prepare("SELECT artifact FROM steps WHERE run=? AND id=? AND state='complete'")
      .get(RUN_ID, id);
    assert(row, `missing production step ${id}`);
    return verifySeal(JSON.parse(row.artifact)).value;
  };
  journal = readStep("faction.terran_armed_forces.objectives.1.issue-journal.0");
  corrected = readStep(
    "faction.terran_armed_forces.objectives.1.known-rule-correction");
} finally { db.close(); }
const draft = corrected.draft;
assert.equal(hashStarcraftTmgContract(draft), journal.issues.parentHash);
const localIssues = isolateFactionLocalEditorIssueV1({
  issues: journal.issues,
  issueOrdinal: 1,
});
const roleRef = {
  id: "faction.terran_armed_forces.objectives.1.editor.0.1",
  version: "structured-v1",
  hash: hashStarcraftTmgContract(
    "faction.terran_armed_forces.objectives.1.editor.0.1.structured-v1"),
};
const capsule = createFactionLocalEditorContextCapsuleV1({
  factionInput,
  section,
  draft,
  issues: localIssues,
  issueOrdinal: 0,
  roleRef,
  outputContractRef,
});

await check("r4.actual-objectives-capsule-closure", async () => {
  verifyStarcraftTmgContextCapsuleV1(capsule);
  assert.equal(capsule.kind, "local_proof_capsule");
  assert.equal(capsule.dependencyGraph.closureCompleteForDeclaredGraph, true);
  assert.equal(capsule.dependencyGraph.nodes.length > 0, true);
  assert.equal(capsule.dependencyGraph.nodes.every((node) =>
    node.hash === hashStarcraftTmgContract(node.content)), true);
  assert.equal(capsule.localIssue.issueOrdinal, 0);
  assert.equal(localIssues.sourceIssueOrdinal, 1);
  assert.equal(localIssues.sourceIssueSetHash, journal.issues.hash);
  assert.equal(capsule.section.parentDraftHash, localIssues.parentHash);
});

await check("r4.context-registry-binds-role-schema-and-capsule", async () => {
  const registry = createStarcraftTmgContextCapsuleRegistryV1({
    entries: [capsule],
  });
  const manifestRef = contextManifestRefStarcraftTmgV1(capsule);
  const resolved = registry.resolve({ contextManifestRef: manifestRef,
    roleRef, outputContractRef });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.capsuleHash, capsule.hash);
  assert.equal(resolved.closureVerifiedBeforeEgress, true);
  assert.equal(Buffer.byteLength(resolved.input, "utf8"),
    capsule.compiledInputBytes);
  assert.equal(registry.resolve({ contextManifestRef: manifestRef,
    roleRef: { ...roleRef, hash: hashStarcraftTmgContract("role-drift") },
    outputContractRef }).ok, false);
});

await check("r4.local-capsule-excludes-full-source-text", async () => {
  assert.equal(capsule.dependencyGraph.nodes.length
    < factionInput.frozenSources.manifest.sourceHashes.length, true);
  assert.equal(capsule.omittedDomains.some((row) =>
    row.id === "sources_outside_declared_dependency_closure"), true);
  assert.equal(capsule.compiledInputBytes < 512 * 1024, true);
  assert.equal(capsule.fullContextFormatRetryAllowed, false);
});

const routes = [
  ["CONTRACT_CHAIN_DRIFT", {}, "pre_egress_contract", "stopped"],
  ["STRUCTURED_PROVIDER_PRE_EGRESS_FAILED",
    { allowDefinitelyNotSentRetry: true },
    "definitely_not_sent_transient", "retryable"],
  ["STRUCTURED_PROVIDER_AMBIGUOUS_SEND", {}, "ambiguous_egress", "stopped"],
  ["PROVIDER_RATE_LIMITED", { idempotentRetrySupported: true },
    "provider_rate_or_capacity", "retryable"],
  ["STRUCTURED_PROVIDER_INCOMPLETE", { allowOneCapacityRetry: true },
    "output_incomplete", "retryable"],
  ["STRUCTURED_PROVIDER_OUTPUT_MISSING", {}, "wire_syntax", "quarantined"],
  ["STRUCTURED_PROVIDER_SCHEMA_INVALID", {}, "schema_instance", "quarantined"],
  ["FACTION_PATCH_SCOPE_INVALID", {}, "address_or_scope", "quarantined"],
  ["SOURCE_SEMANTIC_INVALID", {}, "source_semantic", "quarantined"],
  ["REVIEW_DISAGREEMENT", {}, "review_disagreement", "quarantined"],
  ["STRATEGY_EFFECT_REGRESSION", {}, "strategy_effect", "quarantined"],
  ["PROVIDER_PAYMENT_REQUIRED", {}, "payment_exhausted", "stopped"],
];
await check("r4.failure-taxonomy-has-one-route-per-class", async () => {
  for (const [code, policy, expectedClass, status] of routes) {
    const result = classifyStarcraftTmgStructuredFailureV1({
      error: { code }, policy, outputContractRef,
      requestHash: hashStarcraftTmgContract(code),
    });
    assert.equal(result.class, expectedClass, code);
    assert.equal(result.status, status, code);
    assert.equal(result.genericRetryAllowed, false, code);
    assert.equal(result.fullContextFormatRetryAllowed, false, code);
    if (result.status === "retryable") {
      assert.equal(result.maxAdditionalProviderAttempts, 1, code);
    }
  }
});

await check("r4.identical-failure-never-retries", async () => {
  const first = classifyStarcraftTmgStructuredFailureV1({
    error: { code: "PROVIDER_RATE_LIMITED" },
    policy: { idempotentRetrySupported: true }, outputContractRef,
    requestHash: hashStarcraftTmgContract("same-request"),
  });
  const repeated = classifyStarcraftTmgStructuredFailureV1({
    error: { code: "PROVIDER_RATE_LIMITED" },
    policy: { idempotentRetrySupported: true }, outputContractRef,
    requestHash: hashStarcraftTmgContract("same-request"),
    priorFailureFingerprint: first.fingerprint,
  });
  assert.equal(first.status, "retryable");
  assert.equal(repeated.status, "stopped");
  assert.equal(repeated.class, "repeated_no_progress");
  assert.equal(repeated.maxAdditionalProviderAttempts, 0);
});

await check("r4.known-429-precedes-ambiguous-egress-routing", async () => {
  const classified = classifyStarcraftTmgStructuredFailureV1({
    error: { code: "STRUCTURED_PROVIDER_HTTP_REJECTED" },
    safeReceipt: { status: 429, requestMayHaveBeenSent: true,
      requestDefinitelyNotSent: false, usageKnown: false },
    policy: { idempotentRetrySupported: true }, outputContractRef,
    requestHash: hashStarcraftTmgContract("known-http-429"),
  });
  assert.equal(classified.class, "provider_rate_or_capacity");
  assert.equal(classified.status, "retryable");
  assert.equal(classified.maxAdditionalProviderAttempts, 1);
});

await mkdir(REPORT_DIR, { recursive: true });
await writeFile(CAPSULE_PATH, `${JSON.stringify(capsule, null, 2)}\n`, "utf8");
const report = {
  schemaVersion: "ticket_18_slice_174_r4_context_and_routing_report_v1",
  ticket: 18,
  slice: 174,
  workpoint: "174-R4",
  passed: checks.every((row) => row.passed),
  checks,
  actualRunId: RUN_ID,
  actualIssueOrdinal: 1,
  localIssueOrdinal: 0,
  localIssuesHash: localIssues.hash,
  contextCapsuleHash: capsule.hash,
  contextCapsuleBytes: capsule.compiledInputBytes,
  dependencyClosure: {
    roots: capsule.dependencyGraph.roots.length,
    nodes: capsule.dependencyGraph.nodes.length,
    edges: capsule.dependencyGraph.edges.length,
    indexedSources: factionInput.frozenSources.manifest.sourceHashes.length,
  },
  baselineFailedEditorInputTokens: 271803,
  actualNewProviderInputTokens: null,
  networkUsed: false,
  paidProviderCalls: 0,
  trainingTruth: false,
};
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ report: REPORT_PATH, capsule: CAPSULE_PATH,
  passed: report.passed, checks: checks.length,
  contextCapsuleBytes: report.contextCapsuleBytes,
  closure: report.dependencyClosure }));
