import assert from "node:assert/strict";

import {
  COMPANION_BACKEND_CB2_ERROR_CODES,
  COMPANION_BACKEND_ERROR_CODES,
  COMPANION_CONTEXT_ASSEMBLY_ORDER,
  COMPANION_CONTEXT_BUDGET_POLICY,
  COMPANION_MEMORY_LAYERS,
  CompanionBackendError,
  composeCompanionBackend,
  createCompanionMemoryEngine,
  createInMemoryPersistenceAdapter,
  createWorldbookEntry,
  estimateWorldbookTokens,
  matchWorldbookEntry,
  selectWorldbookEntries,
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

const provenance = {
  sourceKind: "platform_original",
  author: "cb2-verify",
  license: "proprietary-internal",
  sourceRefs: ["internal://cb2-verify"],
};

const receipts = [{ receiptId: "rcpt-1", sourceRef: "internal://cb2-verify/lore" }];

function worldbookEntry(entryId, overrides = {}) {
  return {
    entryId,
    triggers: [{ kind: "keyword", keywords: ["aiur"] }],
    priority: 0,
    tokenBudget: 64,
    content: `lore for ${entryId}`,
    provenance,
    sourceReceipts: receipts,
    ...overrides,
  };
}

function freshEngine() {
  return createCompanionMemoryEngine({ persistence: createInMemoryPersistenceAdapter() });
}

const scopeOf = (companionId, conversationId = "conv-1") => ({
  packageId: "pack-1",
  companionId,
  conversationId,
});

check("memory engine requires injected persistence and rejects hidden CoT / credentials", async () => {
  expectError(COMPANION_BACKEND_ERROR_CODES.DEPENDENCY_MISSING, () => createCompanionMemoryEngine({}));
  expectError(COMPANION_BACKEND_ERROR_CODES.HIDDEN_COT_FORBIDDEN, () => createWorldbookEntry(worldbookEntry("wb-x", {
    extensions: { chainOfThought: "secret" },
  })));
  expectError(COMPANION_BACKEND_ERROR_CODES.CREDENTIALS_FORBIDDEN, () => createWorldbookEntry(worldbookEntry("wb-y", {
    extensions: { apiKey: "sk-test" },
  })));
  const engine = freshEngine();
  await expectAsyncError(COMPANION_BACKEND_ERROR_CODES.HIDDEN_COT_FORBIDDEN, () =>
    engine.appendTranscript(scopeOf("c1"), { speakerId: "user", content: "hi", receipts: [], hiddenReasoning: "x" }));
  const composed = composeCompanionBackend({ persistence: createInMemoryPersistenceAdapter() });
  assert.equal(composed.memoryEngine.engineId, "companion_worldbook_memory_engine_v1");
  assert.deepEqual([...COMPANION_MEMORY_LAYERS], [
    "canon",
    "transcript",
    "rolling_summary",
    "episodic_facts",
    "relationship_state",
    "durable_memory",
  ]);
});

check("worldbook entries validate triggers, budgets, provenance and source receipts", () => {
  const entry = createWorldbookEntry(worldbookEntry("wb-ok", {
    triggers: [
      { kind: "always" },
      { kind: "keyword", keywords: ["Aiur", "Shakuras"] },
      { kind: "regex", pattern: "protoss (homeworld|archive)", flags: "i" },
    ],
    priority: 42,
    tokenBudget: 128,
  }));
  assert.match(entry.entryHash, /^[a-f0-9]{64}$/);
  assert.ok(Object.isFrozen(entry));
  assert.equal(entry.priority, 42);
  expectError(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID, () =>
    createWorldbookEntry(worldbookEntry("wb-bad-kind", { triggers: [{ kind: "semantic" }] })));
  expectError(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID, () =>
    createWorldbookEntry(worldbookEntry("wb-bad-regex", { triggers: [{ kind: "regex", pattern: "(unclosed" }] })));
  expectError(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_TRIGGER_INVALID, () =>
    createWorldbookEntry(worldbookEntry("wb-empty-kw", { triggers: [{ kind: "keyword", keywords: [] }] })));
  expectError(COMPANION_BACKEND_CB2_ERROR_CODES.TOKEN_BUDGET_INVALID, () =>
    createWorldbookEntry(worldbookEntry("wb-bad-budget", { tokenBudget: 0 })));
  expectError(COMPANION_BACKEND_CB2_ERROR_CODES.WORLDBOOK_ENTRY_INVALID, () =>
    createWorldbookEntry(worldbookEntry("wb-no-receipts", { sourceReceipts: [] })));
  expectError(COMPANION_BACKEND_ERROR_CODES.PROVENANCE_INVALID, () =>
    createWorldbookEntry(worldbookEntry("wb-no-prov", { provenance: undefined })));
  assert.equal(matchWorldbookEntry(entry, "the protoss homeworld endures").matched, true);
  assert.ok(matchWorldbookEntry(entry, "the protoss homeworld endures").matchedBy.includes("always"));
  const keywordOnly = createWorldbookEntry(worldbookEntry("wb-kw"));
  assert.equal(matchWorldbookEntry(keywordOnly, "we speak of AIUR tonight").matched, true);
  assert.equal(matchWorldbookEntry(keywordOnly, "we speak of korhal tonight").matched, false);
  assert.equal(estimateWorldbookTokens(""), 1);
  assert.equal(estimateWorldbookTokens("abcd"), 1);
  assert.equal(estimateWorldbookTokens("abcde"), 2);
});

check("trigger ordering is priority-desc/entryId-asc and budget omissions are disclosed", async () => {
  const engine = freshEngine();
  const scope = scopeOf("c-order");
  const bigContent = (seed) => `${seed} ${"lore ".repeat(40)}`; // ~ 50 tokens each
  await engine.registerWorldbookEntry(scope, worldbookEntry("z-low", {
    triggers: [{ kind: "keyword", keywords: ["zerg"] }],
    priority: 10,
    tokenBudget: 64,
    content: bigContent("low"),
  }));
  await engine.registerWorldbookEntry(scope, worldbookEntry("a-high", {
    triggers: [{ kind: "always" }],
    priority: 100,
    tokenBudget: 8,
    content: bigContent("high"),
  }));
  await engine.registerWorldbookEntry(scope, worldbookEntry("m-mid", {
    triggers: [{ kind: "keyword", keywords: ["zerg"] }],
    priority: 50,
    tokenBudget: 64,
    content: bigContent("mid"),
  }));
  await engine.registerWorldbookEntry(scope, worldbookEntry("x-nomatch", {
    triggers: [{ kind: "keyword", keywords: ["terran"] }],
    priority: 999,
    tokenBudget: 64,
    content: bigContent("nomatch"),
  }));
  await engine.registerWorldbookEntry(scope, worldbookEntry("r-regex", {
    triggers: [{ kind: "regex", pattern: "swarm\\s+endless", flags: "i" }],
    priority: 50,
    tokenBudget: 64,
    content: bigContent("regex"),
  }));

  // Pure selection: deterministic order independent of registration order.
  const entries = await engine.listWorldbookEntries(scope);
  const fired = selectWorldbookEntries(entries, "the swarm endless consumes all zerg");
  assert.deepEqual(fired.map((f) => f.entry.entryId), ["a-high", "m-mid", "r-regex", "z-low"]);
  const firedAgain = selectWorldbookEntries([...entries].reverse(), "the swarm endless consumes all zerg");
  assert.deepEqual(firedAgain.map((f) => f.entry.entryId), ["a-high", "m-mid", "r-regex", "z-low"]);

  // Budgeted assembly: 40 tokens total. a-high truncates to its 8-token entry
  // budget; m-mid is truncated to the 32 remaining tokens; once the budget is
  // exhausted r-regex and z-low are omitted whole with disclosure; x-nomatch
  // never fires at all.
  const assembly = await engine.assembleContext(scope, { tokenBudget: 40, scanText: "the swarm endless consumes all zerg" });
  assert.equal(assembly.policy, COMPANION_CONTEXT_BUDGET_POLICY);
  assert.deepEqual(assembly.assemblyOrder, [...COMPANION_CONTEXT_ASSEMBLY_ORDER]);
  const worldbookSections = assembly.sections.filter((s) => s.layer === "worldbook");
  assert.deepEqual(worldbookSections.map((s) => s.itemId), ["worldbook:a-high", "worldbook:m-mid"]);
  assert.equal(worldbookSections[0].truncated, true);
  assert.equal(worldbookSections[0].tokens, 8);
  assert.ok(worldbookSections[0].content.length <= 32);
  assert.deepEqual(worldbookSections[0].matchedBy, ["always"]);
  assert.equal(worldbookSections[0].provenance.sourceReceipts[0].receiptId, "rcpt-1");
  assert.equal(worldbookSections[1].truncated, true);
  assert.equal(worldbookSections[1].tokens, 32);
  assert.equal(assembly.tokensUsed, 40);
  assert.ok(assembly.tokensUsed <= assembly.tokenBudget);
  const omittedIds = assembly.omissions.map((o) => o.itemId);
  assert.deepEqual(omittedIds, ["worldbook:r-regex", "worldbook:z-low"]);
  for (const omission of assembly.omissions) {
    assert.equal(omission.reason, "token_budget_exceeded");
    assert.equal(omission.availableTokens, 0);
    assert.ok(omission.requiredTokens > omission.availableTokens);
  }
  assert.equal(assembly.disclosures.omittedCount, 2);
  assert.ok(!assembly.sections.some((s) => s.itemId === "worldbook:x-nomatch"));
  assert.ok(!assembly.omissions.some((o) => o.itemId === "worldbook:x-nomatch"));
});

check("memory layers are isolated namespaces and canon is immutable", async () => {
  const engine = freshEngine();
  const scope = scopeOf("c-layers");
  await engine.writeCanon(scope, "shared-key", "canon truth", provenance);
  await engine.addEpisodicFact(scope, { factId: "shared-key", content: "episodic observation", factType: "observation" });
  await engine.appendTranscript(scope, { speakerId: "user", content: "shared-key utterance" });

  assert.deepEqual(await engine.listLayerKeys(scope, "canon"), ["shared-key"]);
  assert.deepEqual(await engine.listLayerKeys(scope, "episodic_facts"), ["shared-key"]);
  assert.deepEqual(await engine.listLayerKeys(scope, "transcript"), ["log"]);
  assert.deepEqual(await engine.listLayerKeys(scope, "durable_memory"), []);

  const canon = await engine.readCanon(scope, "shared-key");
  assert.equal(canon.found, true);
  assert.equal(canon.value.value, "canon truth");
  const facts = await engine.listEpisodicFacts(scope);
  assert.equal(facts.length, 1);
  assert.equal(facts[0].content, "episodic observation");
  const transcript = await engine.readTranscript(scope);
  assert.equal(transcript.length, 1);
  assert.equal(transcript[0].content, "shared-key utterance");

  await expectAsyncError(COMPANION_BACKEND_CB2_ERROR_CODES.CANON_IMMUTABLE, () =>
    engine.writeCanon(scope, "shared-key", "rewritten canon", provenance));
  const stillCanon = await engine.readCanon(scope, "shared-key");
  assert.equal(stillCanon.value.value, "canon truth");

  await expectAsyncError(COMPANION_BACKEND_CB2_ERROR_CODES.MEMORY_LAYER_INVALID, () =>
    engine.listLayerKeys(scope, "opponent_private_notes"));

  const summaryA = await engine.writeRollingSummary(scope, { content: "first summary", coversTranscriptThrough: 1 });
  assert.equal(summaryA.summaryVersion, 1);
  const summaryB = await engine.writeRollingSummary(scope, { content: "second summary" });
  assert.equal(summaryB.summaryVersion, 2);
  const current = await engine.readRollingSummary(scope);
  assert.equal(current.value.content, "second summary");
});

check("durable memory promotion is explicit user approval only", async () => {
  const engine = freshEngine();
  const scope = scopeOf("c-durable");
  await engine.proposeDurableMemoryCandidate(scope, {
    candidateId: "dur-1",
    content: "user prefers lore-heavy answers",
    reason: "repeated lore questions",
    provenance,
  });

  // Candidates never enter assembled context before approval.
  const before = await engine.assembleContext(scope, { tokenBudget: 500 });
  assert.equal(before.disclosures.excludedDurableCandidates, 1);
  assert.ok(!before.sections.some((s) => s.layer === "durable_memory"));

  // No implicit, system or self approval path exists.
  await expectAsyncError(COMPANION_BACKEND_CB2_ERROR_CODES.DURABLE_PROMOTION_REQUIRES_USER_APPROVAL, () =>
    engine.approveDurableMemoryCandidate(scope, "dur-1", { approvedBy: "system", userApproved: true }));
  await expectAsyncError(COMPANION_BACKEND_CB2_ERROR_CODES.DURABLE_PROMOTION_REQUIRES_USER_APPROVAL, () =>
    engine.approveDurableMemoryCandidate(scope, "dur-1", { approvedBy: "user", userApproved: false }));
  await expectAsyncError(COMPANION_BACKEND_CB2_ERROR_CODES.DURABLE_PROMOTION_REQUIRES_USER_APPROVAL, () =>
    engine.approveDurableMemoryCandidate(scope, "dur-1", {}));
  await expectAsyncError(COMPANION_BACKEND_CB2_ERROR_CODES.DURABLE_CANDIDATE_NOT_FOUND, () =>
    engine.approveDurableMemoryCandidate(scope, "dur-missing", { approvedBy: "user", userApproved: true }));
  const stillCandidate = await engine.listDurableMemory(scope, { status: "candidate" });
  assert.equal(stillCandidate.length, 1);

  const approved = await engine.approveDurableMemoryCandidate(scope, "dur-1", {
    approvedBy: "user",
    userApproved: true,
    note: "remember this",
  });
  assert.equal(approved.status, "approved_durable");
  const after = await engine.assembleContext(scope, { tokenBudget: 500 });
  assert.equal(after.disclosures.excludedDurableCandidates, 0);
  const durableSections = after.sections.filter((s) => s.layer === "durable_memory");
  assert.equal(durableSections.length, 1);
  assert.equal(durableSections[0].content, "user prefers lore-heavy answers");
});

check("relationship updates require typed observed player-visible events; unknown is never zero", async () => {
  const engine = freshEngine();
  const scope = scopeOf("c-rel");
  await engine.initializeRelationshipState(scope, { axes: ["trust", "affinity"] });

  // Unknown axes render as "unknown", never as 0.
  const initial = await engine.assembleContext(scope, { tokenBudget: 500 });
  const relSection = initial.sections.find((s) => s.layer === "relationship_state");
  assert.ok(relSection, "relationship section expected");
  assert.match(relSection.content, /affinity: unknown/);
  assert.doesNotMatch(relSection.content, /affinity: 0\b/);
  assert.equal(initial.unknowns.length, 2);
  assert.ok(initial.unknowns.every((u) => u.value === "unknown"));
  assert.equal(initial.disclosures.unknownNeverZero, true);
  assert.equal(initial.disclosures.opponentPrivateInference, "not_performed");

  // Untyped / unobserved / private events are rejected.
  await expectAsyncError(COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID, () =>
    engine.applyRelationshipEvent(scope, {
      eventType: "vibe_check",
      observed: { observedBy: "player_seat", source: "observed_event" },
      deltas: [{ axis: "trust", delta: 1 }],
    }));
  await expectAsyncError(COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_INVALID, () =>
    engine.applyRelationshipEvent(scope, {
      eventType: "personal_shared",
      observed: { observedBy: "player_seat", source: "engine_inference" },
      deltas: [{ axis: "trust", delta: 1 }],
    }));
  await expectAsyncError(COMPANION_BACKEND_CB2_ERROR_CODES.RELATIONSHIP_EVENT_VISIBILITY_VIOLATION, () =>
    engine.applyRelationshipEvent(scope, {
      eventType: "observed_match_outcome",
      visibility: "opponent_private",
      observed: { observedBy: "player_seat", source: "observed_event" },
      deltas: [{ axis: "trust", delta: 1 }],
    }));
  await expectAsyncError(COMPANION_BACKEND_CB2_ERROR_CODES.OPPONENT_PRIVATE_INFERENCE_FORBIDDEN, () =>
    engine.applyRelationshipEvent(scope, {
      eventType: "observed_match_outcome",
      observed: { observedBy: "player_seat", source: "observed_event" },
      deltas: [{ axis: "trust", delta: 1 }],
      opponentHand: ["marine", "siege-tank"],
    }));
  await expectAsyncError(COMPANION_BACKEND_CB2_ERROR_CODES.OPPONENT_PRIVATE_INFERENCE_FORBIDDEN, () =>
    engine.applyRelationshipEvent(scope, {
      eventType: "personal_shared",
      observed: { observedBy: "player_seat", source: "observed_event" },
      deltas: [{ axis: "trust", delta: 1 }],
      inferred: { affinity: 10 },
    }));

  // Rejected events left no trace.
  let state = await engine.getRelationshipState(scope);
  assert.equal(state.history.length, 0);

  const applied = await engine.applyRelationshipEvent(scope, {
    eventId: "evt-1",
    eventType: "personal_shared",
    visibility: "player_visible",
    observed: { observedBy: "player_seat", source: "observed_event" },
    deltas: [{ axis: "trust", delta: 5 }],
    note: "user shared a personal story",
  });
  assert.equal(applied.axes.trust.value, 5);
  assert.equal(applied.axes.trust.establishedFrom, "unknown");

  // Clamping at the +100 bound.
  await engine.applyRelationshipEvent(scope, {
    eventType: "assistance_given",
    observed: { observedBy: "player_seat", source: "observed_event" },
    deltas: [{ axis: "trust", delta: 100 }],
  });
  const clamped = await engine.applyRelationshipEvent(scope, {
    eventType: "assistance_given",
    observed: { observedBy: "player_seat", source: "observed_event" },
    deltas: [{ axis: "trust", delta: 100 }],
  });
  assert.equal(clamped.axes.trust.value, 100);

  state = await engine.getRelationshipState(scope);
  assert.equal(state.history.length, 3);
  assert.equal(state.axes.affinity.status, "unknown");
  const assembled = await engine.assembleContext(scope, { tokenBudget: 500 });
  const rel = assembled.sections.find((s) => s.layer === "relationship_state");
  assert.match(rel.content, /trust: 100/);
  assert.match(rel.content, /affinity: unknown/);
  assert.equal(assembled.unknowns.length, 1);
  assert.equal(assembled.unknowns[0].itemId, "relationship:affinity");
});

async function runDeterministicScenario(adapter) {
  const engine = createCompanionMemoryEngine({ persistence: adapter });
  const scope = scopeOf("comp-replay", "conv-replay");
  await engine.writeCanon(scope, "homeworld", "Aiur is the protoss homeworld.", provenance);
  await engine.registerWorldbookEntry(scope, worldbookEntry("wb-aiur", {
    triggers: [{ kind: "keyword", keywords: ["aiur"] }],
    priority: 10,
    tokenBudget: 32,
    content: "Aiur: lush jungle world, seat of the Khalai.",
  }));
  await engine.registerWorldbookEntry(scope, worldbookEntry("wb-always", {
    triggers: [{ kind: "always" }],
    priority: 1,
    tokenBudget: 32,
    content: "The companion speaks with quiet formality.",
  }));
  await engine.appendTranscript(scope, { speakerId: "user", content: "Tell me of Aiur." });
  await engine.appendTranscript(scope, { speakerId: "comp-replay", content: "Aiur endures in memory." });
  await engine.writeRollingSummary(scope, { content: "User asked about Aiur; companion answered.", coversTranscriptThrough: 2 });
  await engine.addEpisodicFact(scope, { content: "User is curious about protoss history.", factType: "observation" });
  await engine.initializeRelationshipState(scope, { axes: ["trust", "affinity"] });
  await engine.applyRelationshipEvent(scope, {
    eventId: "evt-replay-1",
    eventType: "personal_shared",
    visibility: "player_visible",
    observed: { observedBy: "player_seat", source: "observed_event" },
    deltas: [{ axis: "trust", delta: 5 }],
  });
  await engine.proposeDurableMemoryCandidate(scope, {
    candidateId: "dur-replay",
    content: "User enjoys protoss lore.",
    reason: "repeated lore questions",
  });
  await engine.approveDurableMemoryCandidate(scope, "dur-replay", { approvedBy: "user", userApproved: true });
  return engine.assembleContext(scope, { tokenBudget: 4000 });
}

check("assembly replay is deterministic across adapters and across checkpoint/restore", async () => {
  const assemblyA = await runDeterministicScenario(createInMemoryPersistenceAdapter());
  const assemblyB = await runDeterministicScenario(createInMemoryPersistenceAdapter());
  assert.equal(assemblyA.assemblyHash, assemblyB.assemblyHash);
  assert.equal(JSON.stringify(assemblyA), JSON.stringify(assemblyB));
  assert.ok(assemblyA.sections.length > 0);

  // A second engine instance over the same store replays identically.
  const sharedAdapter = createInMemoryPersistenceAdapter();
  const first = await runDeterministicScenario(sharedAdapter);
  const secondEngine = createCompanionMemoryEngine({ persistence: sharedAdapter });
  const replayed = await secondEngine.assembleContext(scopeOf("comp-replay", "conv-replay"), { tokenBudget: 4000 });
  assert.equal(replayed.assemblyHash, first.assemblyHash);

  // Checkpoint/restore: branch mutations never leak into restored history.
  const branchingAdapter = createInMemoryPersistenceAdapter();
  const beforeBranch = await runDeterministicScenario(branchingAdapter);
  const branchEngine = createCompanionMemoryEngine({ persistence: branchingAdapter });
  const checkpoint = await branchingAdapter.checkpoint("before-swipe");
  await branchEngine.appendTranscript(scopeOf("comp-replay", "conv-replay"), { speakerId: "comp-replay", content: "A swipe variant line." });
  const branched = await branchEngine.assembleContext(scopeOf("comp-replay", "conv-replay"), { tokenBudget: 4000 });
  assert.notEqual(branched.assemblyHash, beforeBranch.assemblyHash);
  const restored = await branchingAdapter.restore(checkpoint.checkpointId);
  assert.equal(restored.ok, true);
  const afterRestore = await branchEngine.assembleContext(scopeOf("comp-replay", "conv-replay"), { tokenBudget: 4000 });
  assert.equal(afterRestore.assemblyHash, beforeBranch.assemblyHash);
  assert.equal(JSON.stringify(afterRestore), JSON.stringify(beforeBranch));
});

check("seventh character extends by data only, fully isolated from the other six", async () => {
  const persistence = createInMemoryPersistenceAdapter();
  const engine = createCompanionMemoryEngine({ persistence });
  for (let n = 1; n <= 6; n += 1) {
    const scope = scopeOf(`comp-${n}`);
    await engine.writeCanon(scope, "homeworld", `homeworld of companion ${n}`, provenance);
    await engine.appendTranscript(scope, { speakerId: "user", content: `hello companion ${n}` });
  }
  // The seventh companion is added through the same data APIs; no code change.
  const seventh = scopeOf("comp-7");
  await engine.writeCanon(seventh, "homeworld", "Shakuras, homeworld of companion 7", provenance);
  await engine.registerWorldbookEntry(seventh, worldbookEntry("wb-shakuras", {
    triggers: [{ kind: "keyword", keywords: ["shakuras"] }],
    priority: 5,
    tokenBudget: 32,
    content: "Shakuras: twilight world of the Nerazim.",
  }));
  await engine.appendTranscript(seventh, { speakerId: "user", content: "Tell me of Shakuras." });

  const seventhAssembly = await engine.assembleContext(seventh, { tokenBudget: 1000 });
  const canonSection = seventhAssembly.sections.find((s) => s.layer === "canon");
  assert.match(canonSection.content, /companion 7/);
  assert.ok(seventhAssembly.sections.some((s) => s.itemId === "worldbook:wb-shakuras"));
  assert.ok(!seventhAssembly.sections.some((s) => s.content.includes("companion 3")));

  const thirdAssembly = await engine.assembleContext(scopeOf("comp-3"), { tokenBudget: 1000 });
  assert.ok(!thirdAssembly.sections.some((s) => s.content.includes("companion 7")));
  assert.ok(!thirdAssembly.sections.some((s) => s.itemId === "worldbook:wb-shakuras"));
  assert.deepEqual(await engine.listLayerKeys(scopeOf("comp-6"), "canon"), ["homeworld"]);
  assert.deepEqual(await engine.listLayerKeys(seventh, "canon"), ["homeworld"]);
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
  console.log(`CB-2 verify: ${passed}/${checks.length} checks passed`);
}
