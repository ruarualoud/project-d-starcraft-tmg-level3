import assert from "node:assert/strict";

import {
  COMPANION_BACKEND_CB4_ERROR_CODES,
  COMPANION_BACKEND_ERROR_CODES,
  COMPANION_AUDIT_EVENT_KINDS,
  COMPANION_PRESENTATION_STATES,
  COMPANION_RATIONALE_RECEIPT_KINDS,
  CompanionBackendError,
  assertCompanionPersistencePort,
  composeCompanionBackend,
  createCompanionAuditLog,
  createCompanionPackage,
  createCompanionPersistenceGateway,
  createCompanionPresentationResolver,
  createCompanionProviderGateway,
  createCompanionRationaleRecord,
  createInMemoryPersistenceAdapter,
  createInMemoryProviderAdapter,
  verifyCompanionAuditExport,
} from "./index.mjs";

const CB4 = COMPANION_BACKEND_CB4_ERROR_CODES;
const CB1 = COMPANION_BACKEND_ERROR_CODES;

const checks = [];
function check(name, fn) {
  checks.push({ name, fn });
}

function expectError(code, fn) {
  try {
    fn();
  } catch (error) {
    assert.ok(error instanceof CompanionBackendError, `expected CompanionBackendError, received ${error}`);
    assert.equal(error.code, code);
    return error;
  }
  assert.fail(`expected CompanionBackendError ${code}`);
}

async function expectAsyncError(code, fn) {
  try {
    await fn();
  } catch (error) {
    assert.ok(error instanceof CompanionBackendError, `expected CompanionBackendError, received ${error}`);
    assert.equal(error.code, code);
    return error;
  }
  assert.fail(`expected CompanionBackendError ${code}`);
}

const hashOf = (letter) => letter.repeat(64);

function samplePackageWithAssets(assetHashes) {
  const presentationAssets = {};
  for (const [index, state] of COMPANION_PRESENTATION_STATES.entries()) {
    presentationAssets[state] = {
      assetId: `asset-${state}`,
      contentHash: assetHashes ? assetHashes[index] : hashOf("abcdef"[index]),
      mediaType: "image/png",
    };
  }
  return createCompanionPackage({
    packageId: "companion-cb4",
    slug: "companion-cb4",
    displayName: "CB-4 Companion",
    version: "1.0.0",
    defaultPersonaState: "cb4-default",
    authority: { rules: "external_rules_service", matchState: "room_tools_only" },
    provenance: {
      sourceKind: "platform_original",
      author: "cb4-verify",
      license: "proprietary-internal",
      sourceRefs: ["internal://cb4-verify"],
    },
    presentationAssets,
  });
}

function catalogFor(pkg, overrides = {}) {
  const catalog = {};
  for (const state of COMPANION_PRESENTATION_STATES) {
    const binding = pkg.presentationAssets[state];
    const contentHash = overrides[`${binding.assetId}:contentHash`] || binding.contentHash;
    catalog[binding.assetId] = {
      assetId: binding.assetId,
      contentHash,
      mediaType: binding.mediaType,
      receipt: overrides[`${binding.assetId}:receipt`] === undefined
        ? { receiptId: `receipt-${binding.assetId}`, sourceRef: `asset-store://${binding.assetId}`, contentHash }
        : overrides[`${binding.assetId}:receipt`],
    };
  }
  return catalog;
}

function scriptedResponder(request) {
  return {
    content: `Acknowledged: ${request.messages[request.messages.length - 1].content}`,
    rationale: "public rationale only",
    receipts: [{ receiptId: "tool-receipt-1", kind: "tool", sourceRef: "tool://situation-report" }],
    uncertainty: 0.25,
    usage: { promptTokens: 11, completionTokens: 7, reportedCostUnits: 0 },
  };
}

check("CB-4 exports are surfaced through the single index entry and composition exposes the new surfaces", () => {
  assert.ok(Array.isArray(COMPANION_AUDIT_EVENT_KINDS));
  assert.ok(COMPANION_AUDIT_EVENT_KINDS.includes("provider.request"));
  assert.deepEqual([...COMPANION_RATIONALE_RECEIPT_KINDS], ["source", "tool"]);
  assert.ok(Object.isFrozen(COMPANION_BACKEND_CB4_ERROR_CODES));

  const persistence = createInMemoryPersistenceAdapter();
  const module = composeCompanionBackend({ persistence });
  assert.equal(module.persistence, persistence);
  assert.equal(module.provider, null);
  assert.ok(module.auditLog && typeof module.auditLog.record === "function");
  assert.ok(module.persistenceGateway && module.persistenceGateway.portId === "companion_persistence_port_v1");
  assert.ok(module.providerGateway && module.providerGateway.providerInjected === false);
  assert.ok(module.presentation && Array.isArray(module.presentation.requiredStates));
  assert.deepEqual([...module.presentation.requiredStates], [
    "idle", "speaking", "listening", "alert_combat", "damaged_concerned", "reflective",
  ]);
  // CB-1 startup contract preserved.
  expectError(CB1.DEPENDENCY_MISSING, () => composeCompanionBackend({}));
});

check("persistence gateway is a conformant audited pass-through with namespace enforcement and no fake durability", async () => {
  const auditLog = createCompanionAuditLog({ logId: "pg" });
  const delegate = createInMemoryPersistenceAdapter();
  const gateway = createCompanionPersistenceGateway({
    persistence: delegate,
    auditLog,
    namespacePrefixes: ["cb4."],
  });
  assertCompanionPersistencePort(gateway);
  assert.equal(gateway.durable, false);
  assert.equal(gateway.implementsRealDurability, false);
  const declaration = gateway.durabilityDeclaration();
  assert.equal(declaration.addsDurability, false);
  assert.equal(declaration.fakeDurablePersistence, "forbidden");

  await expectAsyncError(CB4.PERSISTENCE_NAMESPACE_VIOLATION, () => gateway.put("other.ns", "k", { v: 1 }));
  await gateway.put("cb4.store", "key-1", { v: 1 });
  const got = await gateway.get("cb4.store", "key-1");
  assert.equal(got.found, true);
  assert.deepEqual(got.value, { v: 1 });
  const keys = await gateway.list("cb4.store");
  assert.deepEqual(keys, ["key-1"]);
  const checkpoint = await gateway.checkpoint("pg-check");
  assert.equal(checkpoint.ok, true);
  await gateway.delete("cb4.store", "key-1");
  const restored = await gateway.restore(checkpoint.checkpointId);
  assert.equal(restored.ok, true);
  const snapshot = await gateway.exportSnapshot();
  assert.match(snapshot, /volatile_in_memory/);

  const kinds = auditLog.list().map((entry) => entry.kind);
  for (const expected of ["persistence.put", "persistence.get", "persistence.list", "persistence.checkpoint", "persistence.delete", "persistence.restore", "persistence.export"]) {
    assert.ok(kinds.includes(expected), `audit log is missing ${expected}`);
  }
  // Audited subjects carry hashes and counts, never stored payloads.
  const putEntry = auditLog.list().find((entry) => entry.kind === "persistence.put");
  assert.match(putEntry.subject.valueHash, /^[a-f0-9]{64}$/);
  assert.equal(putEntry.subject.value, undefined);

  // A misdeclared fake-durable adapter is rejected at construction.
  const fakeDurable = {
    portId: "companion_persistence_port_v1",
    durable: true,
    durability: "volatile_in_memory",
    get: async () => ({}), put: async () => ({}), delete: async () => ({}), list: async () => [],
    checkpoint: async () => ({}), restore: async () => ({}), exportSnapshot: async () => "", close: async () => ({}),
  };
  expectError(CB1.PERSISTENCE_DURABILITY_MISDECLARED, () =>
    createCompanionPersistenceGateway({ persistence: fakeDurable }));
  // The in-memory adapter itself can never claim durability.
  expectError(CB1.PERSISTENCE_FAKE_DURABLE, () => createInMemoryPersistenceAdapter({ durable: true }));
});

check("provider gateway fails closed without a provider and never attempts network or paid inference", async () => {
  const auditLog = createCompanionAuditLog({ logId: "pr-none" });
  const gateway = createCompanionProviderGateway({ provider: null, auditLog });
  const result = await gateway.complete({
    requestId: "req-none-1",
    messages: [{ role: "user", content: "status?" }],
  });
  assert.equal(result.ok, false);
  assert.equal(result.failClosed, true);
  assert.equal(result.reason, "provider_unavailable");
  assert.equal(result.directModuleNetworkAttempts, 0);
  assert.equal(result.networkAttempts, 0);
  assert.equal(result.paidInference, "not_performed");
  const stats = gateway.stats();
  assert.equal(stats.providerInjected, false);
  assert.equal(stats.directModuleNetworkAttempts, 0);
  assert.equal(stats.externalNetworkAttempts, 0);
  const kinds = auditLog.list().map((entry) => entry.kind);
  assert.ok(kinds.includes("provider.request"));
  assert.ok(kinds.includes("provider.rejection"));
});

check("provider gateway enforces the strict request/response port", async () => {
  // Port conformance and credential hygiene are enforced; network-capable
  // adapters are NOT rejected — an injected provider port is opaque and may
  // execute externally (endpoint/transport/fetch live outside this module).
  expectError(CB1.PORT_CONFORMANCE_FAILURE, () => createCompanionProviderGateway({
    provider: { portId: "wrong-port", complete: async () => ({}) },
  }));
  expectError(CB1.CREDENTIALS_FORBIDDEN, () => createCompanionProviderGateway({
    provider: { portId: "companion_provider_port_v1", complete: async () => ({}), apiKey: "sk-test" },
  }));

  const gateway = createCompanionProviderGateway({
    provider: createInMemoryProviderAdapter({ responder: scriptedResponder }),
  });
  // Strict request validation: empty messages, hidden CoT and paid-inference directives are rejected.
  await expectAsyncError(CB1.PROVIDER_REQUEST_INVALID, () => gateway.complete({ messages: [] }));
  await expectAsyncError(CB1.HIDDEN_COT_FORBIDDEN, () => gateway.complete({
    messages: [{ role: "user", content: "hi" }],
    metadata: { hiddenReasoning: "secret" },
  }));
  await expectAsyncError(CB4.PROVIDER_PAID_INFERENCE_FORBIDDEN, () => gateway.complete({
    messages: [{ role: "user", content: "hi" }],
    paidInference: true,
  }));

  const ok = await gateway.complete({
    requestId: "req-ok-1",
    messages: [{ role: "system", content: "You are an adjutant." }, { role: "user", content: "report" }],
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.request.schemaVersion, "companion_backend_module_contract_v1.provider-request");
  assert.equal(ok.request.rationalePolicy, "public_rationale_only");
  assert.equal(ok.request.reasoningTrace, "not_requested");
  assert.equal(ok.response.rationale, "public rationale only");
  assert.equal(ok.response.uncertainty, 0.25);
  assert.equal(ok.response.receipts[0].kind, "tool");
  assert.match(ok.receipt.responseHash, /^[a-f0-9]{64}$/);
  assert.equal(ok.receipt.directModuleNetworkAttempts, 0);
  assert.equal(ok.receipt.networkAttempts, 0);
  assert.equal(ok.receipt.externalNetworkAttempts, 0);
  assert.equal(ok.receipt.paidInference, "not_performed");
  assert.equal(ok.receipt.accountingSource, "adapter_declared_no_network");
  assert.equal(ok.receipt.hiddenChainOfThought, "not_present");
  const stats = gateway.stats();
  assert.equal(stats.calls, 1);
  assert.equal(stats.promptTokens, 11);
  assert.equal(stats.completionTokens, 7);
  assert.equal(stats.directModuleNetworkAttempts, 0);
  assert.equal(stats.externalNetworkAttempts, 0);
  assert.equal(stats.paidInferencePerformed, 0);

  // Responder failures and invalid responses fail closed, never throw raw.
  const throwingGateway = createCompanionProviderGateway({
    provider: createInMemoryProviderAdapter({
      responder: () => { throw new Error("responder exploded"); },
    }),
  });
  const failed = await throwingGateway.complete({ messages: [{ role: "user", content: "hi" }] });
  assert.equal(failed.ok, false);
  assert.equal(failed.reason, CB1.PROVIDER_RESPONDER_ERROR);
  assert.equal(failed.failClosed, true);

  const emptyGateway = createCompanionProviderGateway({ provider: createInMemoryProviderAdapter() });
  const unavailable = await emptyGateway.complete({ messages: [{ role: "user", content: "hi" }] });
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.reason, "provider_unavailable");

  // Responses smuggling hidden chain-of-thought keys are normalized away to a rejection.
  const cotGateway = createCompanionProviderGateway({
    provider: createInMemoryProviderAdapter({
      responder: () => ({ content: "hi", chainOfThought: "secret reasoning" }),
    }),
  });
  const cotResult = await cotGateway.complete({ messages: [{ role: "user", content: "hi" }] });
  assert.equal(cotResult.ok, false);
  assert.equal(cotResult.reason, CB1.HIDDEN_COT_FORBIDDEN);
});

check("opaque external provider port executes externally and its provider-reported accounting is preserved (High repair)", async () => {
  // An injected provider port may carry endpoint/transport/fetch capability
  // and execute externally; the module must not reject it and must not
  // fabricate zeros over provider-reported accounting.
  const auditLog = createCompanionAuditLog({ logId: "pr-ext" });
  const externalProvider = {
    portId: "companion_provider_port_v1",
    adapterId: "external-provider-stub",
    endpoint: "https://provider.example.invalid/v1/complete",
    transport: "https",
    network: "https",
    fetch: async () => { throw new Error("never invoked by this module"); },
    complete: async (request) => ({
      ok: true,
      response: {
        content: `External answer to: ${request.messages[request.messages.length - 1].content}`,
        rationale: "public rationale from the external provider",
        receipts: [{ receiptId: "ext-rcpt-1", kind: "tool", sourceRef: "tool://external-completion" }],
        uncertainty: 0.1,
        usage: { promptTokens: 21, completionTokens: 9, reportedCostUnits: 0.0042 },
      },
      receipt: { networkAttempts: 2, paidInference: "performed", reportedCostUnits: 0.0042 },
    }),
  };
  const gateway = createCompanionProviderGateway({ provider: externalProvider, auditLog });
  assert.equal(gateway.providerInjected, true);
  assert.equal(gateway.directModuleNetwork, "none");
  assert.equal(gateway.externalProviderExecution, "allowed_outside_module");

  const ok = await gateway.complete({
    requestId: "req-ext-1",
    messages: [{ role: "user", content: "external status?" }],
  });
  assert.equal(ok.ok, true);
  assert.match(ok.response.content, /^External answer to:/);
  // Provider-reported external accounting is preserved verbatim, not zeroed.
  assert.equal(ok.receipt.directModuleNetworkAttempts, 0);
  assert.equal(ok.receipt.networkAttempts, 2);
  assert.equal(ok.receipt.externalNetworkAttempts, 2);
  assert.equal(ok.receipt.paidInference, "performed");
  assert.equal(ok.receipt.reportedCostUnits, 0.0042);
  assert.equal(ok.receipt.accountingSource, "provider_receipt");
  const stats = gateway.stats();
  assert.equal(stats.directModuleNetworkAttempts, 0);
  assert.equal(stats.externalNetworkAttempts, 2);
  assert.equal(stats.paidInferencePerformed, 1);
  assert.equal(stats.reportedCostUnits, 0.0042);
  const responseEntry = auditLog.list().find((entry) => entry.kind === "provider.response");
  assert.equal(responseEntry.subject.externalNetworkAttempts, 2);
  assert.equal(responseEntry.subject.paidInference, "performed");
  assert.equal(responseEntry.subject.directModuleNetworkAttempts, 0);

  // An opaque external adapter that reports no receipt yields "unknown"
  // external accounting, never a fabricated zero.
  const silentGateway = createCompanionProviderGateway({
    provider: {
      portId: "companion_provider_port_v1",
      endpoint: "https://provider.example.invalid",
      transport: "https",
      complete: async () => ({ content: "opaque answer", usage: { promptTokens: 5, completionTokens: 3, reportedCostUnits: 0.001 } }),
    },
  });
  const silent = await silentGateway.complete({ messages: [{ role: "user", content: "hi" }] });
  assert.equal(silent.ok, true);
  assert.equal(silent.receipt.directModuleNetworkAttempts, 0);
  assert.equal(silent.receipt.externalNetworkAttempts, "unknown");
  assert.equal(silent.receipt.paidInference, "unknown");
  assert.equal(silent.receipt.reportedCostUnits, 0.001);
  assert.equal(silent.receipt.accountingSource, "unreported");
  assert.equal(silentGateway.stats().paidInferenceUnknown, 1);

  // Malformed provider receipts fail closed instead of being trusted.
  const badReceiptGateway = createCompanionProviderGateway({
    provider: {
      portId: "companion_provider_port_v1",
      endpoint: "https://provider.example.invalid",
      complete: async () => ({
        ok: true,
        response: { content: "x" },
        receipt: { networkAttempts: -3, paidInference: "performed" },
      }),
    },
  });
  const bad = await badReceiptGateway.complete({ messages: [{ role: "user", content: "hi" }] });
  assert.equal(bad.ok, false);
  assert.equal(bad.failClosed, true);
  assert.equal(bad.reason, CB4.PROVIDER_RECEIPT_INVALID);
  assert.equal(bad.directModuleNetworkAttempts, 0);
});

check("audit log is deterministic, hash-chained and tamper-evident", async () => {
  async function runScript() {
    const auditLog = createCompanionAuditLog({ logId: "det" });
    const persistence = createCompanionPersistenceGateway({
      persistence: createInMemoryPersistenceAdapter(),
      auditLog,
    });
    await persistence.put("det.ns", "k1", { v: 1 });
    await persistence.get("det.ns", "k1");
    const provider = createCompanionProviderGateway({
      provider: createInMemoryProviderAdapter({ responder: scriptedResponder }),
      auditLog,
    });
    await provider.complete({ requestId: "req-det-1", messages: [{ role: "user", content: "go" }] });
    const resolver = createCompanionPresentationResolver({
      assetCatalog: catalogFor(samplePackageWithAssets()),
      auditLog,
    });
    resolver.resolveState({ package: samplePackageWithAssets(), state: "idle" });
    return auditLog.exportAuditLog();
  }
  const exportA = await runScript();
  const exportB = await runScript();
  assert.equal(exportA, exportB);

  const verified = verifyCompanionAuditExport(exportA);
  assert.equal(verified.ok, true);
  assert.equal(verified.entryCount, 5);

  const tampered = JSON.parse(exportA);
  tampered.entries[0].subject.key = "tampered";
  expectError(CB4.AUDIT_INTEGRITY_MISMATCH, () => verifyCompanionAuditExport(JSON.stringify(tampered)));

  const log = createCompanionAuditLog({ logId: "guards" });
  expectError(CB4.AUDIT_KIND_UNSUPPORTED, () => log.record("session.turn", {}));
  expectError(CB4.AUTOMATIC_PROMOTION_FORBIDDEN, () => log.record("promotion.skill", {}));
  expectError(CB1.HIDDEN_COT_FORBIDDEN, () => log.record("persistence.get", { hiddenThought: "x" }));
  expectError(CB1.CREDENTIALS_FORBIDDEN, () => log.record("persistence.get", { accessToken: "x" }));
});

check("replay candidates target WikiSkill/EvoTest evaluation and can never auto-promote", async () => {
  const auditLog = createCompanionAuditLog({ logId: "replay" });
  const gateway = createCompanionProviderGateway({
    provider: createInMemoryProviderAdapter({ responder: scriptedResponder }),
    auditLog,
  });
  await gateway.complete({ requestId: "req-replay-1", messages: [{ role: "user", content: "advise" }] });
  const candidate = auditLog.buildReplayCandidate({ sessionRef: { sessionId: "sess-replay" } });
  assert.equal(candidate.schemaVersion, "companion_backend_module_contract_v1.replay-candidate");
  assert.deepEqual([...candidate.candidateFor], ["wikiskill", "evotest"]);
  assert.equal(candidate.trainingTruth, false);
  assert.equal(candidate.promotion.automatic, "forbidden");
  assert.equal(candidate.promotion.skillPromotion, "manual_approval_only");
  assert.equal(candidate.promotion.memoryPromotion, "manual_approval_only");
  assert.ok(candidate.promotion.requiredGates.includes("promotion_review"));
  assert.match(candidate.candidateHash, /^[a-f0-9]{64}$/);
  assert.ok(candidate.eventKinds.includes("provider.response"));
  // Building the candidate is itself audited, after the candidate hash.
  assert.equal(auditLog.head().kind, "replay.candidate_built");
  expectError(CB4.AUTOMATIC_PROMOTION_FORBIDDEN, () => auditLog.buildReplayCandidate({ promote: true }));
});

check("presentation output resolves all six states from receipt-bound assets and fails closed when any required asset is absent", () => {
  const pkg = samplePackageWithAssets();
  const auditLog = createCompanionAuditLog({ logId: "pres" });
  const resolver = createCompanionPresentationResolver({ assetCatalog: catalogFor(pkg), auditLog });
  assert.equal(resolver.assetCatalogSize, 6);

  for (const state of COMPANION_PRESENTATION_STATES) {
    const output = resolver.resolveState({ package: pkg, state });
    assert.equal(output.ok, true, `state ${state} should resolve`);
    assert.equal(output.failClosed, false);
    assert.equal(output.state, state);
    assert.equal(output.asset.assetId, `asset-${state}`);
    assert.equal(output.asset.contentHash, pkg.presentationAssets[state].contentHash);
    assert.equal(output.receipt.receiptId, `receipt-asset-${state}`);
    assert.equal(output.receipt.contentHash, output.asset.contentHash);
    assert.equal(output.companionRef.id, "companion-cb4");
    assert.equal(output.trainingTruth, false);
    assert.match(output.outputHash, /^[a-f0-9]{64}$/);
  }
  const all = resolver.resolveAllStates(pkg);
  assert.equal(all.length, 6);
  assert.ok(all.every((output) => output.ok));

  // Fail closed: asset missing from the externally supplied catalog.
  const partialCatalog = catalogFor(pkg);
  delete partialCatalog["asset-alert_combat"];
  const partial = createCompanionPresentationResolver({ assetCatalog: partialCatalog });
  const missing = partial.resolveState({ package: pkg, state: "alert_combat" });
  assert.equal(missing.ok, false);
  assert.equal(missing.failClosed, true);
  assert.equal(missing.reason, "asset_absent");
  assert.equal(missing.assetId, "asset-alert_combat");
  // Other states still resolve; failure is per-state, never silent fallback.
  assert.equal(partial.resolveState({ package: pkg, state: "idle" }).ok, true);

  // Fail closed: content hash mismatch, absent catalog, undeclared binding.
  const mismatched = createCompanionPresentationResolver({
    assetCatalog: catalogFor(pkg, { "asset-damaged_concerned:contentHash": hashOf("f") }),
  });
  assert.equal(mismatched.resolveState({ package: pkg, state: "damaged_concerned" }).reason, "asset_hash_mismatch");
  const noCatalog = createCompanionPresentationResolver({});
  assert.equal(noCatalog.resolveState({ package: pkg, state: "idle" }).reason, "asset_catalog_absent");
  const noBinding = createCompanionPackage({
    packageId: "companion-nobind",
    slug: "companion-nobind",
    displayName: "No Binding",
    version: "1.0.0",
    defaultPersonaState: "nb",
    authority: { rules: "external_rules_service", matchState: "room_tools_only" },
    provenance: { sourceKind: "platform_original", author: "cb4-verify", license: "proprietary-internal", sourceRefs: [] },
  });
  assert.equal(resolver.resolveState({ package: noBinding, state: "reflective" }).reason, "asset_binding_absent");

  // Invalid inputs throw; absent assets fail closed without throwing.
  expectError(CB4.PRESENTATION_STATE_INVALID, () => resolver.resolveState({ package: pkg, state: "celebrating" }));
  expectError(CB4.PRESENTATION_BINDING_INVALID, () => resolver.resolveState({ state: "idle" }));

  // The catalog itself is strict: receipts are mandatory and must bind the hash.
  expectError(CB4.ASSET_CATALOG_INVALID, () => createCompanionPresentationResolver({
    assetCatalog: { "asset-x": { assetId: "asset-x", contentHash: hashOf("a") } },
  }));
  expectError(CB4.ASSET_CATALOG_INVALID, () => createCompanionPresentationResolver({
    assetCatalog: {
      "asset-x": {
        assetId: "asset-x",
        contentHash: hashOf("a"),
        receipt: { receiptId: "r1", sourceRef: "asset-store://asset-x", contentHash: hashOf("b") },
      },
    },
  }));

  // Fail-closed resolutions are audited with their reason and state.
  const failClosedEntry = auditLog.list().find((entry) => entry.kind === "presentation.fail_closed");
  assert.equal(failClosedEntry.subject.reason, "asset_binding_absent");
  assert.equal(failClosedEntry.subject.state, "reflective");
});

check("public rationale records carry rationale, source/tool receipts and uncertainty only", () => {
  const record = createCompanionRationaleRecord({
    subjectRef: { sessionId: "sess-1", turnSequence: 2 },
    companionRef: { id: "companion-cb4", version: "1.0.0" },
    rationale: "Recommend holding the natural expansion because the opponent scout was seen late.",
    receipts: [
      { receiptId: "src-1", kind: "source", sourceRef: "room://player-visible/scout-report" },
      { receiptId: "tool-1", kind: "tool", sourceRef: "tool://attack-probability", toolName: "attack_probability", note: "read-only" },
    ],
    uncertainty: 0.4,
  });
  assert.equal(record.schemaVersion, "companion_backend_module_contract_v1.rationale");
  assert.equal(record.uncertainty, 0.4);
  assert.equal(record.receipts.length, 2);
  assert.equal(record.receipts[1].kind, "tool");
  assert.equal(record.hiddenChainOfThought, "not_included");
  assert.equal(record.trainingTruth, false);
  assert.match(record.rationaleHash, /^[a-f0-9]{64}$/);
  assert.equal(createCompanionRationaleRecord({}).uncertainty, "unknown");

  // Any extra field is rejected: rationale, receipts and uncertainty only.
  expectError(CB4.RATIONALE_INVALID, () => createCompanionRationaleRecord({ rationale: "x", debugTrace: "no" }));
  expectError(CB1.HIDDEN_COT_FORBIDDEN, () => createCompanionRationaleRecord({ rationale: "x", chainOfThought: "secret" }));
  expectError(CB1.CREDENTIALS_FORBIDDEN, () => createCompanionRationaleRecord({ rationale: "x", sessionToken: "t" }));
  expectError(CB4.RATIONALE_INVALID, () => createCompanionRationaleRecord({
    receipts: [{ receiptId: "r", kind: "internal", sourceRef: "x://y" }],
  }));
  expectError(CB4.RATIONALE_INVALID, () => createCompanionRationaleRecord({
    receipts: [{ receiptId: "r", kind: "source", sourceRef: "x://y", rawPayload: {} }],
  }));
  expectError(CB4.RATIONALE_INVALID, () => createCompanionRationaleRecord({ uncertainty: 1.5 }));
  expectError(CB4.RATIONALE_INVALID, () => createCompanionRationaleRecord({ rationale: 42 }));
});

check("composed backend preserves CB-1..CB-3 behavior while routing persistence through the audited gateway", async () => {
  const module = composeCompanionBackend({
    persistence: createInMemoryPersistenceAdapter(),
    provider: createInMemoryProviderAdapter({ responder: scriptedResponder }),
    assetCatalog: catalogFor(samplePackageWithAssets()),
  });
  const registered = module.registry.register(samplePackageWithAssets());
  assert.equal(registered.ok, true);

  const created = await module.sessionRuntime.createSession({
    sessionId: "sess-cb4",
    participants: [
      { participantId: "user-1", kind: "user", seat: "player_seat" },
      { participantId: "comp-1", kind: "companion", seat: "player_seat" },
    ],
    speakerOrder: ["user-1", "comp-1"],
  });
  assert.equal(created.ok, true);
  const t1 = await module.sessionRuntime.submitTurn("sess-cb4", {
    participantId: "user-1",
    expectedTurnSequence: 1,
    content: "Status report.",
  });
  assert.equal(t1.turn.turnSequence, 1);
  await module.sessionRuntime.submitTurn("sess-cb4", {
    participantId: "comp-1",
    expectedTurnSequence: 2,
    content: "All quiet.",
  });
  // Transcript mirroring (CB-2/CB-3 integration) still works through the gateway.
  const transcript = await module.memoryEngine.readTranscript({ packageId: null, companionId: "conversation", conversationId: "sess-cb4" });
  assert.equal(transcript.length, 2);
  // Permission runtime preserved: opponent-private reads stay denied.
  const denied = await module.sessionRuntime.authorizeSessionRead("sess-cb4", "user-1", { visibility: "opponent_private" });
  assert.equal(denied.ok, false);
  assert.equal(denied.reason, "opponent_private_forbidden");
  // Long-session resume still re-verifies the hash chain.
  const resumed = await module.sessionRuntime.resumeSession("sess-cb4");
  assert.equal(resumed.ok, true);
  assert.equal(resumed.turnCounter, 2);

  // Every engine persistence operation was audited through the gateway.
  const kinds = new Set(module.auditLog.list().map((entry) => entry.kind));
  assert.ok(kinds.has("persistence.put"));
  assert.ok(kinds.has("persistence.get"));
  assert.ok(module.auditLog.verify().ok);

  // Composed provider gateway and presentation resolver work off the same audit log.
  const completion = await module.providerGateway.complete({
    requestId: "req-composed-1",
    messages: [{ role: "user", content: "advise" }],
  });
  assert.equal(completion.ok, true);
  const presentation = module.presentation.resolveState({ package: samplePackageWithAssets(), state: "speaking" });
  assert.equal(presentation.ok, true);
  const candidate = module.auditLog.buildReplayCandidate({ sessionRef: { sessionId: "sess-cb4" } });
  assert.equal(candidate.trainingTruth, false);
  assert.equal(candidate.promotion.automatic, "forbidden");
});

let passed = 0;
for (const { name, fn } of checks) {
  try {
    await fn();
    passed += 1;
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error);
    process.exitCode = 1;
    break;
  }
}

if (process.exitCode !== 1) {
  console.log(`CB-4 verify: ${passed}/${checks.length} checks passed`);
}
