import assert from "node:assert/strict";

import {
  COMPANION_BACKEND_CONTRACT_VERSION,
  COMPANION_BACKEND_ERROR_CODES,
  COMPANION_BACKEND_INTEGRATION_DESCRIPTOR,
  COMPANION_PRESENTATION_STATES,
  CompanionBackendError,
  assertCompanionBackendDependencies,
  assertCompanionPersistencePort,
  assertCompanionProviderPort,
  composeCompanionBackend,
  createCompanionPackage,
  createCompanionPackageRegistry,
  createCompanionProviderRequest,
  createInMemoryPersistenceAdapter,
  createInMemoryProviderAdapter,
  exportCompanionBackendContract,
  importCompanionBackendContract,
} from "./index.mjs";

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

function samplePackage(n, extra = {}) {
  return {
    packageId: `companion-${n}`,
    slug: `companion-${n}`,
    displayName: `Companion ${n}`,
    version: "1.0.0",
    defaultPersonaState: `companion-${n}-default`,
    authority: { rules: "external_rules_service", matchState: "room_tools_only" },
    provenance: {
      sourceKind: "platform_original",
      author: "cb1-verify",
      license: "proprietary-internal",
      sourceRefs: ["internal://cb1-verify"],
    },
    ...extra,
  };
}

check("companion package seals with integrity and round-trips through export/import", () => {
  const contract = createCompanionPackage(samplePackage(1));
  assert.equal(contract.schemaVersion, COMPANION_BACKEND_CONTRACT_VERSION);
  assert.equal(contract.contractType, "companion-package");
  assert.equal(contract.integrity.algorithm, "sha256");
  assert.match(contract.integrity.hash, /^[a-f0-9]{64}$/);
  assert.equal(contract.trainingTruth, false);
  assert.equal(contract.rationalePolicy, "public_rationale_only");
  assert.equal(contract.reasoningTransparency, "public_rationale_and_receipts_only");
  const reimported = importCompanionBackendContract(exportCompanionBackendContract(contract), "companion-package");
  assert.equal(reimported.integrity.hash, contract.integrity.hash);
  assert.ok(Object.isFrozen(contract));
});

check("package rejects rules-authority and match-state boundary violations", () => {
  expectError(COMPANION_BACKEND_ERROR_CODES.AUTHORITY_BOUNDARY_VIOLATION, () => createCompanionPackage(samplePackage(1, {
    authority: { rules: "companion_decides", matchState: "room_tools_only" },
  })));
  expectError(COMPANION_BACKEND_ERROR_CODES.AUTHORITY_BOUNDARY_VIOLATION, () => createCompanionPackage(samplePackage(1, {
    authority: { rules: "external_rules_service", matchState: "companion_inference" },
  })));
});

check("package rejects hidden chain-of-thought, credentials and training truth", () => {
  expectError(COMPANION_BACKEND_ERROR_CODES.HIDDEN_COT_FORBIDDEN, () => createCompanionPackage(samplePackage(1, {
    extensions: { chainOfThought: "secret reasoning" },
  })));
  expectError(COMPANION_BACKEND_ERROR_CODES.CREDENTIALS_FORBIDDEN, () => createCompanionPackage(samplePackage(1, {
    extensions: { apiKey: "sk-test" },
  })));
  expectError(COMPANION_BACKEND_ERROR_CODES.TRAINING_TRUTH_FORBIDDEN, () => createCompanionPackage(samplePackage(1, {
    trainingTruth: true,
  })));
});

check("package requires explicit provenance and receipt-bound presentation assets", () => {
  expectError(COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID, () => createCompanionPackage({
    ...samplePackage(1),
    provenance: undefined,
  }));
  const assetHash = "a".repeat(64);
  const contract = createCompanionPackage(samplePackage(1, {
    presentationAssets: { idle: { assetId: "portrait-idle", contentHash: assetHash, mediaType: "image/png" } },
  }));
  assert.equal(contract.presentationAssets.idle.contentHash, assetHash);
  expectError(COMPANION_BACKEND_ERROR_CODES.PRESENTATION_ASSET_INVALID, () => createCompanionPackage(samplePackage(1, {
    presentationAssets: { idle: { assetId: "portrait-idle", contentHash: "not-a-hash" } },
  })));
  expectError(COMPANION_BACKEND_ERROR_CODES.PRESENTATION_ASSET_INVALID, () => createCompanionPackage(samplePackage(1, {
    presentationAssets: { enraged: { assetId: "x", contentHash: assetHash } },
  })));
  assert.ok(COMPANION_PRESENTATION_STATES.includes("alert_combat"));
});

check("registry extends by registration only: six companions plus a seventh", () => {
  const registry = createCompanionPackageRegistry();
  for (let n = 1; n <= 6; n += 1) {
    const result = registry.register(samplePackage(n));
    assert.equal(result.ok, true);
    assert.equal(result.duplicate, false);
  }
  assert.equal(registry.count(), 6);
  const seventh = registry.register(samplePackage(7));
  assert.equal(seventh.ok, true);
  assert.equal(registry.count(), 7);
  assert.equal(registry.list().length, 7);
  assert.ok(registry.list().some((row) => row.packageId === "companion-7"));
});

check("registry binds exact version and provenance, rejects conflicts and ambiguity", () => {
  const registry = createCompanionPackageRegistry();
  const first = registry.register(samplePackage(1));
  const duplicate = registry.register(samplePackage(1));
  assert.equal(duplicate.duplicate, true);
  assert.equal(registry.count(), 1);
  expectError(COMPANION_BACKEND_ERROR_CODES.PACKAGE_VERSION_CONFLICT, () => registry.register(samplePackage(1, {
    displayName: "Tampered Companion 1",
  })));
  registry.register(samplePackage(1, { version: "2.0.0" }));
  expectError(COMPANION_BACKEND_ERROR_CODES.PACKAGE_VERSION_AMBIGUOUS, () => registry.get("companion-1"));
  const exact = registry.get("companion-1", "1.0.0");
  assert.equal(exact.integrity.hash, first.packageRef.hash);
  expectError(COMPANION_BACKEND_ERROR_CODES.PACKAGE_NOT_FOUND, () => registry.get("companion-1", "9.9.9"));
  expectError(COMPANION_BACKEND_ERROR_CODES.PACKAGE_NOT_FOUND, () => registry.get("companion-missing"));
  const rejected = registry.resolve({ packageId: "companion-missing" });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, COMPANION_BACKEND_ERROR_CODES.PACKAGE_NOT_FOUND);
  const resolved = registry.resolve({ packageId: "companion-1", version: "1.0.0" });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.receipt.packageRef.hash, first.packageRef.hash);
  assert.match(resolved.receipt.provenanceHash, /^[a-f0-9]{64}$/);
  assert.equal(resolved.receipt.rulesAuthority, "external_rules_service");
  assert.equal(resolved.receipt.trainingTruth, false);
});

check("in-memory persistence adapter conforms, round-trips and never claims durability", async () => {
  const adapter = createInMemoryPersistenceAdapter();
  assertCompanionPersistencePort(adapter);
  assert.equal(adapter.durable, false);
  assert.equal(adapter.durability, "volatile_in_memory");
  const put = await adapter.put("session-1", "transcript", { entries: ["hello"] });
  assert.equal(put.ok, true);
  assert.equal(put.durable, false);
  const got = await adapter.get("session-1", "transcript");
  assert.equal(got.found, true);
  assert.deepEqual(got.value, { entries: ["hello"] });
  assert.ok(Object.isFrozen(got.value));
  const gotAgain = await adapter.get("session-1", "transcript");
  assert.deepEqual(gotAgain.value, { entries: ["hello"] });
  assert.deepEqual(await adapter.list("session-1"), ["transcript"]);
  const missing = await adapter.get("session-1", "absent");
  assert.equal(missing.found, false);
  expectError(COMPANION_BACKEND_ERROR_CODES.PERSISTENCE_FAKE_DURABLE, () => createInMemoryPersistenceAdapter({ durable: true }));
  expectError(COMPANION_BACKEND_ERROR_CODES.PERSISTENCE_DURABILITY_MISDECLARED, () => assertCompanionPersistencePort({
    portId: adapter.portId,
    durable: true,
    durability: "volatile_in_memory",
    get: async () => {},
    put: async () => {},
    delete: async () => {},
    list: async () => {},
    checkpoint: async () => {},
    restore: async () => {},
    exportSnapshot: async () => {},
    close: async () => {},
  }));
});

check("in-memory persistence checkpoints and restores without overwriting accepted history", async () => {
  const adapter = createInMemoryPersistenceAdapter();
  await adapter.put("session-1", "accepted", { turn: 1 });
  const first = await adapter.checkpoint("before-branch");
  await adapter.put("session-1", "accepted", { turn: 2 });
  await adapter.put("session-1", "swipe-branch", { turn: 2, branch: true });
  const restored = await adapter.restore(first.checkpointId);
  assert.equal(restored.ok, true);
  const accepted = await adapter.get("session-1", "accepted");
  assert.deepEqual(accepted.value, { turn: 1 });
  assert.equal((await adapter.get("session-1", "swipe-branch")).found, false);
  const unknown = await adapter.restore("ckpt-missing");
  assert.equal(unknown.ok, false);
  assert.equal(unknown.reason, "checkpoint_not_found");
  const snapshot = await adapter.exportSnapshot();
  const parsed = JSON.parse(snapshot);
  assert.equal(parsed.durable, false);
  assert.equal(parsed.durability, "volatile_in_memory");
  await adapter.close();
  await assert.rejects(() => adapter.list("session-1"), (error) => error.code === COMPANION_BACKEND_ERROR_CODES.PERSISTENCE_CLOSED);
});

check("in-memory provider adapter fails closed, forbids network/credentials and rejects CoT", async () => {
  const empty = createInMemoryProviderAdapter();
  assertCompanionProviderPort(empty);
  assert.equal(empty.implementsRealProvider, false);
  assert.equal(empty.network, "none");
  const request = createCompanionProviderRequest({
    messages: [{ role: "user", content: "hello" }],
  });
  assert.equal(request.reasoningTrace, "not_requested");
  const unavailable = await empty.complete(request);
  assert.equal(unavailable.ok, false);
  assert.equal(unavailable.reason, "provider_unavailable");
  assert.equal(unavailable.failClosed, true);
  assert.equal(unavailable.networkAttempts, 0);
  expectError(COMPANION_BACKEND_ERROR_CODES.CREDENTIALS_FORBIDDEN, () => createInMemoryProviderAdapter({ apiKey: "sk-test" }));
  expectError(COMPANION_BACKEND_ERROR_CODES.PROVIDER_NETWORK_FORBIDDEN, () => createInMemoryProviderAdapter({ baseUrl: "https://example.invalid" }));
  expectError(COMPANION_BACKEND_ERROR_CODES.HIDDEN_COT_FORBIDDEN, () => createCompanionProviderRequest({
    messages: [{ role: "user", content: "hi" }],
    chain_of_thought: "please think secretly",
  }));
  expectError(COMPANION_BACKEND_ERROR_CODES.CREDENTIALS_FORBIDDEN, () => createCompanionProviderRequest({
    messages: [{ role: "user", content: "hi" }],
    metadata: { authorization: "Bearer token" },
  }));
  const cotAdapter = createInMemoryProviderAdapter({
    responder: () => ({ content: "answer", chainOfThought: "hidden reasoning" }),
  });
  const cotResult = await cotAdapter.complete(request);
  assert.equal(cotResult.ok, false);
  assert.equal(cotResult.reason, COMPANION_BACKEND_ERROR_CODES.HIDDEN_COT_FORBIDDEN);
  const goodAdapter = createInMemoryProviderAdapter({
    responder: () => ({ content: "public answer", rationale: "public rationale", receipts: [{ tool: "none" }], uncertainty: "unknown", usage: { promptTokens: 3, completionTokens: 2, reportedCostUnits: 0 } }),
  });
  const good = await goodAdapter.complete(request);
  assert.equal(good.ok, true);
  assert.equal(good.response.content, "public answer");
  assert.equal(good.response.uncertainty, "unknown");
  assert.equal(good.response.trainingTruth, false);
  const stats = goodAdapter.stats();
  assert.equal(stats.calls, 1);
  assert.equal(stats.promptTokens, 3);
  assert.equal(stats.reportedCostUnits, 0);
  assert.equal(stats.networkAttempts, 0);
});

check("integration descriptor enforces required dependency startup failure", () => {
  assert.equal(COMPANION_BACKEND_INTEGRATION_DESCRIPTOR.entryPoint, "packages/companion-backend-module-v1/index.mjs");
  expectError(COMPANION_BACKEND_ERROR_CODES.DEPENDENCY_MISSING, () => assertCompanionBackendDependencies({}));
  expectError(COMPANION_BACKEND_ERROR_CODES.DEPENDENCY_MISSING, () => composeCompanionBackend({}));
  const persistence = createInMemoryPersistenceAdapter();
  const module = composeCompanionBackend({ persistence });
  assert.ok(Object.isFrozen(module));
  assert.equal(module.provider, null);
  assert.equal(module.persistence, persistence);
  const seventh = module.registry.register(samplePackage(7));
  assert.equal(seventh.ok, true);
  assert.equal(module.registry.count(), 1);
  const withProvider = composeCompanionBackend({ persistence: createInMemoryPersistenceAdapter(), provider: createInMemoryProviderAdapter() });
  assert.equal(withProvider.provider.implementsRealProvider, false);
  expectError(COMPANION_BACKEND_ERROR_CODES.PORT_CONFORMANCE_FAILURE, () => composeCompanionBackend({
    persistence: createInMemoryPersistenceAdapter(),
    provider: { portId: "wrong-port" },
  }));
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
  console.log(`CB-1 verify: ${passed}/${checks.length} checks passed`);
}
