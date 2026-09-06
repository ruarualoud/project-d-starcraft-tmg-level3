#!/usr/bin/env node

import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile } from
  "../content/skill-generation/offline-provider-profile-v1.mjs";
import {
  STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_V1 as contract,
  STARCRAFT_TMG_FACTION_ADVICE_EDITOR_OUTPUT_CONTRACT_REF_V1 as contractRef,
} from "../content/skill-generation/ticket-18-faction-advice-editor-output-contract-v1.mjs";
import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_VERSION } from
  "../packages/secure-provider-runtime/provider-egress-contract-v1.mjs";
import { STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_V2_VERSION } from
  "../packages/secure-provider-runtime/provider-egress-contract-v2.mjs";
import { createStarcraftTmgProviderProfileRegistryV1 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v1.mjs";
import { createStarcraftTmgProviderProfileRegistryV2 } from
  "../packages/secure-provider-runtime/provider-profile-registry-v2.mjs";
import {
  createStarcraftTmgOutputContractChainReceiptV1,
  createStarcraftTmgOutputContractRegistryV1,
  STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
} from "../packages/structured-generation/output-contract-registry-v1.mjs";
import {
  createStarcraftTmgProviderCapabilityReceiptV1,
  verifyStarcraftTmgProviderCapabilityCurrentV1,
} from "../packages/structured-generation/provider-capability-receipt-v1.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT,
  "build/ticket-18-structured-generation-v1/r1-contract-report.json");
const checks = [];

async function check(id, operation) {
  await operation();
  checks.push({ id, passed: true });
}

const advice = {
  title: "夺取目标时保留撤退条件",
  when: ["任务目标可计分且撤退路径仍开放"],
  procedure: ["先核对当前阶段与合法动作", "再用最小单位承诺争夺"],
  alternatives: ["若对手威胁叠加过高则转为远程施压"],
  risk: "过度承诺会丢失下一轮行动资源。",
  reviseIf: ["对手部署预备队", "目标控制条件改变"],
  sourceRefs: ["core.example/p1", "faq-v1:11/p1"],
  unproven: ["具体交换效率需要由对战回放验证"],
};

const outputRegistry = createStarcraftTmgOutputContractRegistryV1({
  entries: [contract],
});

await check("r1.output-contract-content-addressed", async () => {
  assert.equal(contractRef.hash, contract.contractHash);
  assert.equal(contract.schemaSubsetVersion,
    STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION);
  const resolved = outputRegistry.resolve({ outputContractRef: contractRef });
  assert.equal(resolved.ok, true);
  assert.deepEqual(resolved.outputContract.modelOwnedFields.slice().sort(),
    Object.keys(contract.providerSchema.properties).sort());
  assert.equal(resolved.outputContract.hostOwnedFields.includes("parentHash"), true);
  assert.equal(Object.hasOwn(
    resolved.outputContract.providerSchema.properties, "parentHash"), false);
});

await check("r1.output-contract-local-schema-validation", async () => {
  assert.equal(outputRegistry.validate({
    outputContractRef: contractRef, value: advice,
  }).ok, true);
  assert.equal(outputRegistry.validate({
    outputContractRef: contractRef,
    value: { ...advice, parentHash: "model-must-not-author-this" },
  }).issues[0].code, "additional_property_forbidden");
  const { risk: _risk, ...missing } = advice;
  assert.equal(outputRegistry.validate({
    outputContractRef: contractRef, value: missing,
  }).issues[0].code, "required_field_missing");
  assert.equal(outputRegistry.validate({
    outputContractRef: contractRef,
    value: { ...advice, sourceRefs: ["same", "same"] },
  }).issues.some((issue) => issue.code === "array_items_not_unique"), true);
});

const v2Registry = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: "/responses" }],
  allowedProviders: ["deepseek-openai-compatible-direct"],
});
const resolvedV2 = v2Registry.resolveEgressBinding({
  profileRef: { id: profile.providerProfileId, version: profile.version,
    hash: profile.integrity.hash },
});

await check("r1.provider-v1-frozen-v2-explicit", async () => {
  const v1Registry = createStarcraftTmgProviderProfileRegistryV1({
    entries: [{ providerProfile: profile,
      completionPath: "/chat/completions" }],
    allowedProviders: ["deepseek-openai-compatible-direct"],
  });
  const resolvedV1 = await v1Registry.resolveEgressBinding({
    profileRef: { id: profile.providerProfileId, version: profile.version,
      hash: profile.integrity.hash },
  });
  assert.equal(resolvedV1.egressBinding.schemaVersion,
    STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_VERSION);
  assert.equal(resolvedV1.egressBinding.endpoint.path, "/chat/completions");
  assert.equal(resolvedV2.ok, true);
  assert.equal(resolvedV2.egressBinding.schemaVersion,
    STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_V2_VERSION);
  assert.equal(resolvedV2.egressBinding.endpoint.path, "/responses");
  assert.deepEqual(resolvedV2.egressBinding.structuredOutputCapabilities,
    ["responses_json_schema"]);
});

const capabilityReceipt = createStarcraftTmgProviderCapabilityReceiptV1({
  providerProfileRef: resolvedV2.egressBinding.providerProfileRef,
  endpointPath: resolvedV2.egressBinding.endpoint.path,
  endpointDialect: resolvedV2.egressBinding.endpointDialect,
  model: resolvedV2.egressBinding.model,
  capability: "responses_json_schema",
  schemaSubsetVersion: STARCRAFT_TMG_JSON_SCHEMA_SUBSET_VERSION,
  outputContractRef: contractRef,
  probeInputHash: hashStarcraftTmgContract("probe-input"),
  probeOutputHash: hashStarcraftTmgContract(advice),
  probeResult: "accepted_schema_valid",
  usage: { inputUnits: 80, outputUnits: 24, totalUnits: 104 },
  usageKnown: true,
  physicalAttempts: 1,
  probedAt: "2026-09-06T10:00:00.000Z",
  expiresAt: "2026-09-07T10:00:00.000Z",
});

await check("r1.capability-receipt-exact-and-expiring", async () => {
  const common = {
    receipt: capabilityReceipt,
    providerProfileRef: resolvedV2.egressBinding.providerProfileRef,
    endpointPath: "/responses",
    endpointDialect: "deepseek_responses_v1",
    model: profile.model,
    capability: "responses_json_schema",
    outputContractRef: contractRef,
  };
  assert.equal(verifyStarcraftTmgProviderCapabilityCurrentV1({
    ...common, now: "2026-09-06T12:00:00.000Z",
  }).ok, true);
  assert.deepEqual(verifyStarcraftTmgProviderCapabilityCurrentV1({
    ...common, now: "2026-09-08T12:00:00.000Z",
  }).reasons, ["capability_receipt_expired"]);
  assert.equal(verifyStarcraftTmgProviderCapabilityCurrentV1({
    ...common,
    outputContractRef: { ...contractRef,
      hash: hashStarcraftTmgContract("different-contract") },
    now: "2026-09-06T12:00:00.000Z",
  }).reasons.includes("outputContractRef_drift"), true);
});

await check("r1.output-contract-hash-end-to-end", async () => {
  const seams = Object.fromEntries([
    "workflow", "provider_request", "capability_receipt", "transport_receipt",
    "local_validation", "stored_artifact", "continuation_manifest",
  ].map((seam) => [seam, contractRef]));
  const receipt = createStarcraftTmgOutputContractChainReceiptV1({
    expectedRef: contractRef, seams,
  });
  assert.equal(receipt.chainComplete, true);
  assert.equal(receipt.seams.transport_receipt.hash, contractRef.hash);
  await assert.rejects(async () => createStarcraftTmgOutputContractChainReceiptV1({
    expectedRef: contractRef,
    seams: { ...seams, stored_artifact: { ...contractRef,
      hash: hashStarcraftTmgContract("drift") } },
  }), (error) => error.code === "CONTRACT_CHAIN_DRIFT");
});

const report = {
  schemaVersion: "ticket_18_slice_174_r1_contract_report_v1",
  ticket: 18,
  slice: 174,
  workpoint: "174-R1",
  passed: checks.every((row) => row.passed),
  checks,
  outputContractRef: contractRef,
  providerPolicyVersions: {
    frozen: STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_VERSION,
    structured: STARCRAFT_TMG_PROVIDER_EGRESS_POLICY_V2_VERSION,
  },
  paidProviderCalls: 0,
  trainingTruth: false,
};

await mkdir(path.dirname(REPORT_PATH), { recursive: true });
await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ report: REPORT_PATH, passed: report.passed,
  checks: checks.length, outputContractHash: contractRef.hash }));
