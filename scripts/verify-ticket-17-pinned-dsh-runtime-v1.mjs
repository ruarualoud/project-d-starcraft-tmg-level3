#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import {
  DSH_EFFECTIVE_CONFIG_DUMP_HASH,
  DSH_EFFECTIVE_CONFIG_ROW_COUNT,
  DSH_EFFECTIVE_CONFIG_ROWS_HASH,
  DSH_KNOWN_SESSION_EVENT_TYPES_HASH,
  DSH_NPM_INTEGRITY,
  DSH_PLUGIN_LOCK_HASH,
  DSH_PLUGIN_LOCK_PACKAGE_COUNT,
  DSH_PROFILE_ACTIVE_ROWS,
  DSH_PROFILE_DISABLED_ROWS,
  DSH_PROFILE_PATCH_HASH,
  DSH_RUNTIME_PNPM_LOCK_HASH,
  DSH_RUNTIME_TREE_BYTES,
  DSH_RUNTIME_TREE_ENTRY_COUNT,
  DSH_RUNTIME_TREE_HASH,
  DSH_UPSTREAM_COMMIT,
  DSH_UPSTREAM_TAG,
  DSH_VERSION,
  parseDshSessionJsonlV1,
  runPinnedDshLifecycleSmokeV1,
  verifyDshLifecycleReceiptV1,
  verifyDshSessionParseReceiptV1,
  verifyPinnedDshRuntimeReceiptV1,
} from "../packages/skill-generation-runtime/dsh-pinned-runtime-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_PATH = path.join(
  ROOT,
  "build/ticket-17-skill-generation-v1/slice-167-report.json",
);
const checks = [];
const failures = [];

async function check(id, operation) {
  try {
    await operation();
    checks.push({ id, passed: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    checks.push({ id, passed: false, error: message });
    failures.push(`${id}: ${message}`);
  }
}

function rejectsCode(operation, code) {
  assert.throws(operation, (error) => error?.code === code);
}

function event(type, seq, data, extra = {}) {
  return { type, seq, time: 1_000 + seq, data, ...extra };
}

function sessionText(events, overrides = {}) {
  const header = {
    type: "session",
    version: 0,
    id: "slice167-parser-fixture",
    createdAt: 1_000,
    cwd: "/staged/input",
    delegationDepth: 0,
    agentPreset: "starcraft-tmg-skill-v1",
    ...overrides,
  };
  return [header, ...events].map((row) => JSON.stringify(row)).join("\n") + "\n";
}

const zeroEvents = [
  event("turn/start", 0, { turn: 1 }),
  event("step/start", 1, { turn: 1, step: 1 }),
  event("assistant/chunk", 2, {
    turn: 1,
    step: 1,
    chunk: {
      type: "usage",
      usage: { inputTokens: 0, outputTokens: 0 },
    },
  }),
  event("step/end", 3, { turn: 1, step: 1 }),
  event("turn/end", 4, { turn: 1, reason: { kind: "completed" } }),
];

await check("pinned_version_tag_and_commit_are_exact", () => {
  assert.equal(DSH_VERSION, "0.1.1-rc.2");
  assert.equal(DSH_UPSTREAM_TAG, "dsh-v0.1.1-rc.2");
  assert.equal(DSH_UPSTREAM_COMMIT,
    "b150a551b8d465e31e418e1b2eaf5e79bbb7d28e");
});

await check("pnpm_lock_contains_the_exact_npm_integrity", async () => {
  const lock = await readFile(path.join(
    ROOT, "vendor/dsh-runtime-v1/pnpm-lock.yaml"), "utf8");
  assert.ok(lock.includes(`integrity: ${DSH_NPM_INTEGRITY}`));
  const { createHash } = await import("node:crypto");
  assert.equal(createHash("sha256").update(lock).digest("hex"),
    DSH_RUNTIME_PNPM_LOCK_HASH);
});

await check("profile_patch_is_hash_frozen", async () => {
  const patch = await readFile(path.join(
    ROOT, "content/skill-generation/dsh-profile-v1/cordis.patch.yml"));
  const { createHash } = await import("node:crypto");
  assert.equal(createHash("sha256").update(patch).digest("hex"),
    DSH_PROFILE_PATCH_HASH);
});

let lifecycle;
await check("exact_dsh_runtime_composes_and_runs_inside_disposable_os", async () => {
  lifecycle = await runPinnedDshLifecycleSmokeV1({ repositoryRoot: ROOT });
  assert.equal(verifyDshLifecycleReceiptV1(
    lifecycle.receipt, lifecycle.isolationAttestation), lifecycle.receipt);
});

await check("runtime_tree_manifest_is_exact_and_complete", () => {
  assert.equal(lifecycle.receipt.runtime.runtimeTreeHash, DSH_RUNTIME_TREE_HASH);
  assert.equal(lifecycle.receipt.runtime.runtimeTreeEntryCount,
    DSH_RUNTIME_TREE_ENTRY_COUNT);
  assert.equal(lifecycle.receipt.runtime.runtimeTreeBytes,
    DSH_RUNTIME_TREE_BYTES);
  assert.equal(verifyPinnedDshRuntimeReceiptV1(
    lifecycle.receipt.runtime), lifecycle.receipt.runtime);
});

await check("third_party_lifecycle_scripts_were_not_executed", () => {
  assert.equal(lifecycle.receipt.runtime.lifecycleScriptsExecuted, false);
  assert.match(lifecycle.receipt.runtime.installCommand,
    /--frozen-lockfile --ignore-scripts$/u);
});

await check("effective_config_is_frozen_to_81_rows", () => {
  const config = lifecycle.receipt.effectiveConfig;
  assert.equal(config.configDumpHash, DSH_EFFECTIVE_CONFIG_DUMP_HASH);
  assert.equal(config.configRowsHash, DSH_EFFECTIVE_CONFIG_ROWS_HASH);
  assert.equal(config.rowCount, DSH_EFFECTIVE_CONFIG_ROW_COUNT);
  assert.deepEqual(config.activeRows, [...DSH_PROFILE_ACTIVE_ROWS].sort());
  assert.deepEqual(config.disabledRows, [...DSH_PROFILE_DISABLED_ROWS].sort());
  assert.equal(config.activeRows.length + config.disabledRows.length, 81);
});

await check("session_persistence_is_raw_append_only_jsonl", () => {
  assert.equal(lifecycle.receipt.effectiveConfig
    .profileFacts.persistenceCompression, "none");
  assert.equal(lifecycle.receipt.effectiveConfig
    .profileFacts.persistencePackChunks, false);
});

await check("direct_providers_network_process_filesystem_and_subagents_are_off", () => {
  const facts = lifecycle.receipt.effectiveConfig.profileFacts;
  assert.equal(facts.telemetryDisabled, true);
  assert.equal(facts.directProviderDisabled, true);
  assert.equal(facts.networkToolsDisabled, true);
  assert.equal(facts.processToolsDisabled, true);
  assert.equal(facts.filesystemToolsDisabled, true);
  assert.equal(facts.subagentsDisabled, true);
});

await check("offline_broker_route_is_named_but_not_mounted", () => {
  const facts = lifecycle.receipt.effectiveConfig.profileFacts;
  assert.equal(facts.defaultProvider, "project-d-offline-broker");
  assert.equal(facts.defaultModel, "project-d-frozen-job-model");
  assert.equal(lifecycle.isolationAttestation
    .capabilities.providerBrokerMounted, false);
});

await check("plugin_lock_is_exact_and_all_dsh_packages_share_the_pin", () => {
  const lock = lifecycle.receipt.pluginLock;
  assert.equal(lock.pluginLockHash, DSH_PLUGIN_LOCK_HASH);
  assert.equal(lock.packages.length, DSH_PLUGIN_LOCK_PACKAGE_COUNT);
  assert.ok(lock.packages.filter((entry) => entry.name
    .startsWith("@deepseek-ai/dsh")).every((entry) => (
    entry.version === DSH_VERSION
  )));
});

await check("real_dsh_session_catalog_and_append_lifecycle_are_parsed", () => {
  const session = lifecycle.receipt.session;
  assert.equal(session.knownEventTypesHash,
    DSH_KNOWN_SESSION_EVENT_TYPES_HASH);
  assert.equal(session.eventCount, 5);
  assert.equal(session.lastSeq, 4);
  assert.deepEqual(session.eventTypeCounts, {
    "turn/start": 1,
    "step/start": 1,
    "assistant/chunk": 1,
    "step/end": 1,
    "turn/end": 1,
  });
  assert.equal(verifyDshSessionParseReceiptV1(session), session);
});

await check("lifecycle_smoke_has_zero_provider_tokens_and_cost", () => {
  assert.deepEqual(lifecycle.receipt.externalUsage, {
    providerCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    cacheHitTokens: 0,
    cacheMissTokens: 0,
    totalTokens: 0,
    estimatedUsd: "0.00000000",
    estimatedCny: "0.00",
  });
  assert.equal(lifecycle.receipt.session.usage.totalTokens, 0);
});

await check("lifecycle_smoke_has_no_rules_room_skill_or_training_authority", () => {
  assert.ok(Object.values(lifecycle.receipt.authority)
    .every((allowed) => allowed === false));
  assert.equal(lifecycle.receipt.osIsolationReceipt
    .execution.cleanupVerified, true);
});

await check("parser_rejects_noncontiguous_sequence", () => {
  const malformed = structuredClone(zeroEvents);
  malformed[2].seq = 3;
  rejectsCode(() => parseDshSessionJsonlV1(sessionText(malformed)),
    "DSH_SESSION_EVENT_ENVELOPE_INVALID");
});

await check("parser_rejects_unknown_required_event", () => {
  rejectsCode(() => parseDshSessionJsonlV1(sessionText([
    event("future/required", 0, {}),
  ])), "DSH_SESSION_REQUIRED_EVENT_UNKNOWN");
});

await check("parser_accepts_only_explicitly_ignorable_unknown_event", () => {
  const receipt = parseDshSessionJsonlV1(sessionText([
    event("future/informational", 0, {}, { ignorable: true }),
  ]));
  assert.deepEqual(receipt.ignoredUnknownTypes, ["future/informational"]);
});

await check("parser_rejects_unclosed_turn_or_step", () => {
  rejectsCode(() => parseDshSessionJsonlV1(sessionText([
    event("turn/start", 0, { turn: 1 }),
    event("step/start", 1, { turn: 1, step: 1 }),
  ])), "DSH_SESSION_BRACKET_UNCLOSED");
});

await check("parser_counts_disjoint_usage_once_per_step", () => {
  const usage = {
    inputTokens: 11,
    outputTokens: 7,
    cacheReadTokens: 5,
    cacheWriteTokens: 3,
    reasoningTokens: 2,
  };
  const receipt = parseDshSessionJsonlV1(sessionText([
    event("turn/start", 0, { turn: 1 }),
    event("step/start", 1, { turn: 1, step: 1 }),
    event("assistant/chunk", 2, {
      turn: 1, step: 1, chunk: { type: "usage", usage },
    }),
    event("assistant/message", 3, {
      turn: 1, step: 1, message: {}, usage,
    }),
    event("step/end", 4, { turn: 1, step: 1 }),
    event("turn/end", 5, { turn: 1, reason: { kind: "completed" } }),
  ]));
  assert.deepEqual(receipt.usage, { ...usage, totalTokens: 26 });
});

await check("parser_rejects_chunk_and_message_usage_disagreement", () => {
  rejectsCode(() => parseDshSessionJsonlV1(sessionText([
    event("turn/start", 0, { turn: 1 }),
    event("step/start", 1, { turn: 1, step: 1 }),
    event("assistant/chunk", 2, {
      turn: 1,
      step: 1,
      chunk: { type: "usage", usage: { inputTokens: 1, outputTokens: 1 } },
    }),
    event("assistant/message", 3, {
      turn: 1,
      step: 1,
      message: {},
      usage: { inputTokens: 2, outputTokens: 1 },
    }),
    event("step/end", 4, { turn: 1, step: 1 }),
    event("turn/end", 5, { turn: 1, reason: { kind: "completed" } }),
  ])), "DSH_SESSION_USAGE_DISAGREEMENT");
});

await check("parser_rejects_tool_call_without_result", () => {
  rejectsCode(() => parseDshSessionJsonlV1(sessionText([
    event("turn/start", 0, { turn: 1 }),
    event("step/start", 1, { turn: 1, step: 1 }),
    event("tool/call", 2, {
      turn: 1, step: 1, callId: "call-1", name: "emit", arguments: "{}",
    }),
    event("step/end", 3, { turn: 1, step: 1 }),
    event("turn/end", 4, { turn: 1, reason: { kind: "completed" } }),
  ])), "DSH_SESSION_TOOL_RESULT_MISSING");
});

await check("parser_rejects_delegated_session", () => {
  rejectsCode(() => parseDshSessionJsonlV1(
    sessionText([], { delegationDepth: 1 })),
  "DSH_SESSION_HEADER_IDENTITY_INVALID");
});

await check("lifecycle_receipt_tampering_is_detected", () => {
  const tampered = structuredClone(lifecycle.receipt);
  tampered.effectiveConfig.profileFacts.directProviderDisabled = false;
  rejectsCode(() => verifyDshLifecycleReceiptV1(
    tampered, lifecycle.isolationAttestation),
  "DSH_LIFECYCLE_RECEIPT_INVALID");
});

const reportBody = {
  schemaVersion: "starcraft_tmg_ticket_17_slice_167_report_v1",
  generatedAt: new Date().toISOString(),
  summary: {
    total: checks.length,
    passed: checks.filter((entry) => entry.passed).length,
    failed: failures.length,
  },
  checks,
  evidence: lifecycle ? {
    runtimeReceiptHash: lifecycle.receipt.runtime.receiptHash,
    runtimeTreeHash: lifecycle.receipt.runtime.runtimeTreeHash,
    configDumpHash: lifecycle.receipt.effectiveConfig.configDumpHash,
    configRowsHash: lifecycle.receipt.effectiveConfig.configRowsHash,
    pluginLockHash: lifecycle.receipt.pluginLock.pluginLockHash,
    sessionReceiptHash: lifecycle.receipt.session.receiptHash,
    isolationReceiptHash: lifecycle.receipt.osIsolationReceipt.receiptHash,
    lifecycleReceiptHash: lifecycle.receipt.receiptHash,
  } : null,
  externalUsage: lifecycle?.receipt.externalUsage ?? null,
  authority: lifecycle?.receipt.authority ?? null,
};
const report = {
  ...reportBody,
  reportHash: hashStarcraftTmgContract(reportBody),
};
await mkdir(path.dirname(OUTPUT_PATH), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");

if (failures.length > 0) {
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({
    report: path.relative(ROOT, OUTPUT_PATH),
    ...report.summary,
    reportHash: report.reportHash,
    evidence: report.evidence,
    externalUsage: report.externalUsage,
  }));
}
