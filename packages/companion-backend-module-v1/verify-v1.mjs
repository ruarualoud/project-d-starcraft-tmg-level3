import assert from "node:assert/strict";

// Ticket 26 / Slice 266 — CB-5 aggregate closure verifier for the companion
// backend module. One focused command covers the whole module end to end:
// data-only seventh companion, worldbook/context, layered memory and observed
// relationship state, multi-speaker mentions/permissions, non-overwriting
// branches, checkpoint resume, external provider accounting plus no-provider
// fail-closed (the CB-4 High repair), six receipt-bound presentation states
// and deterministic replay candidates with trainingTruth false and automatic
// promotion forbidden. Headless: 0 Provider calls, 0 network, ¥0 cost.

import {
  COMPANION_BACKEND_CB2_ERROR_CODES,
  COMPANION_BACKEND_CB3_ERROR_CODES,
  COMPANION_BACKEND_CB4_ERROR_CODES,
  COMPANION_BACKEND_ERROR_CODES,
  COMPANION_PRESENTATION_STATES,
  CompanionBackendError,
  composeCompanionBackend,
  createCompanionAuditLog,
  createCompanionMemoryEngine,
  createCompanionPackage,
  createCompanionPackageRegistry,
  createCompanionPresentationResolver,
  createCompanionSessionRuntime,
  createInMemoryPersistenceAdapter,
  createInMemoryProviderAdapter,
  createWorldbookEntry,
  verifyCompanionAuditExport,
} from "./index.mjs";

const CB1 = COMPANION_BACKEND_ERROR_CODES;
const CB2 = COMPANION_BACKEND_CB2_ERROR_CODES;
const CB3 = COMPANION_BACKEND_CB3_ERROR_CODES;
const CB4 = COMPANION_BACKEND_CB4_ERROR_CODES;

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
  author: "cb5-verify",
  license: "proprietary-internal",
  sourceRefs: ["internal://cb5-verify"],
};

const hashOf = (letter) => letter.repeat(64);

function samplePackage(n, extra = {}) {
  return createCompanionPackage({
    packageId: `companion-${n}`,
    slug: `companion-${n}`,
    displayName: `Companion ${n}`,
    version: "1.0.0",
    defaultPersonaState: `companion-${n}-default`,
    authority: { rules: "external_rules_service", matchState: "room_tools_only" },
    provenance: { ...provenance, sourceRefs: [`internal://cb5-verify/companion-${n}`] },
    ...extra,
  });
}

function packageWithAllAssets(packageId = "companion-present") {
  const presentationAssets = {};
  for (const [index, state] of COMPANION_PRESENTATION_STATES.entries()) {
    presentationAssets[state] = {
      assetId: `asset-${state}`,
      contentHash: hashOf("abcdef"[index]),
      mediaType: "image/png",
    };
  }
  return createCompanionPackage({
    packageId,
    slug: packageId,
    displayName: "Presentation Companion",
    version: "1.0.0",
    defaultPersonaState: `${packageId}-default`,
    authority: { rules: "external_rules_service", matchState: "room_tools_only" },
    provenance,
    presentationAssets,
  });
}

function catalogFor(pkg) {
  const catalog = {};
  for (const state of COMPANION_PRESENTATION_STATES) {
    const binding = pkg.presentationAssets[state];
    catalog[binding.assetId] = {
      assetId: binding.assetId,
      contentHash: binding.contentHash,
      mediaType: binding.mediaType,
      receipt: {
        receiptId: `receipt-${binding.assetId}`,
        sourceRef: `asset-store://${binding.assetId}`,
        contentHash: binding.contentHash,
      },
    };
  }
  return catalog;
}

const scopeOf = (companionId, conversationId = "conv-1") => ({
  packageId: "pack-1",
  companionId,
  conversationId,
});

const transcriptScope = (sessionId) => ({ packageId: null, companionId: "conversation", conversationId: sessionId });

function worldbookEntry(entryId, overrides = {}) {
  return {
    entryId,
    triggers: [{ kind: "keyword", keywords: ["aiur"] }],
    priority: 0,
    tokenBudget: 64,
    content: `lore for ${entryId}`,
    provenance,
    sourceReceipts: [{ receiptId: `rcpt-${entryId}`, sourceRef: `internal://cb5-verify/${entryId}` }],
    ...overrides,
  };
}

function freshStack() {
  const persistence = createInMemoryPersistenceAdapter();
  const memoryEngine = createCompanionMemoryEngine({ persistence });
  const runtime = createCompanionSessionRuntime({ persistence, memoryEngine });
  return { persistence, memoryEngine, runtime };
}

function baseParticipants() {
  return [
    { participantId: "user-1", kind: "user", seat: "player_seat" },
    { participantId: "comp-kerrigan", kind: "companion", seat: "player_seat" },
    { participantId: "comp-zeratul", kind: "companion", seat: "player_seat" },
  ];
}

const baseOrder = () => ["user-1", "comp-kerrigan", "comp-zeratul"];

// ---------------------------------------------------------------------------
// 1. Data-only seventh companion: registry extension plus memory isolation.
// ---------------------------------------------------------------------------
check("data-only seventh companion extends the registry and stays isolated from the other six", async () => {
  const registry = createCompanionPackageRegistry();
  for (let n = 1; n <= 6; n += 1) {
    assert.equal(registry.register(samplePackage(n)).ok, true);
  }
  assert.equal(registry.count(), 6);
  const seventh = registry.register(samplePackage(7));
  assert.equal(seventh.ok, true);
  assert.equal(seventh.duplicate, false);
  assert.equal(registry.count(), 7);
  const resolved = registry.resolve({ packageId: "companion-7", version: "1.0.0" });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.receipt.rulesAuthority, "external_rules_service");
  assert.equal(resolved.receipt.trainingTruth, false);

  const { memoryEngine } = freshStack();
  for (let n = 1; n <= 6; n += 1) {
    await memoryEngine.writeCanon(scopeOf(`comp-${n}`), "homeworld", `homeworld of companion ${n}`, provenance);
  }
  await memoryEngine.writeCanon(scopeOf("comp-7"), "homeworld", "Shakuras, homeworld of companion 7", provenance);
  await memoryEngine.registerWorldbookEntry(scopeOf("comp-7"), worldbookEntry("wb-shakuras", {
    triggers: [{ kind: "keyword", keywords: ["shakuras"] }],
    priority: 5,
    tokenBudget: 32,
    content: "Shakuras: twilight world of the Nerazim.",
  }));
  const seventhAssembly = await memoryEngine.assembleContext(scopeOf("comp-7"), { tokenBudget: 1000, scanText: "shakuras" });
  assert.match(seventhAssembly.sections.find((s) => s.layer === "canon").content, /companion 7/);
  assert.ok(seventhAssembly.sections.some((s) => s.itemId === "worldbook:wb-shakuras"));
  const thirdAssembly = await memoryEngine.assembleContext(scopeOf("comp-3"), { tokenBudget: 1000 });
  assert.ok(!thirdAssembly.sections.some((s) => s.content.includes("companion 7")));
  assert.ok(!thirdAssembly.sections.some((s) => s.itemId === "worldbook:wb-shakuras"));
});

// ---------------------------------------------------------------------------
// 2. Worldbook triggers and budgeted context assembly.
// ---------------------------------------------------------------------------
check("worldbook always/keyword/regex triggers, priority order, budget truncation and omission disclosure", async () => {
  const { memoryEngine } = freshStack();
  const scope = scopeOf("comp-wb");
  const bigContent = (seed) => `${seed} ${"lore ".repeat(40)}`;
  await memoryEngine.registerWorldbookEntry(scope, worldbookEntry("z-low", {
    triggers: [{ kind: "keyword", keywords: ["zerg"] }],
    priority: 10,
    tokenBudget: 64,
    content: bigContent("low"),
  }));
  await memoryEngine.registerWorldbookEntry(scope, worldbookEntry("a-high", {
    triggers: [{ kind: "always" }],
    priority: 100,
    tokenBudget: 8,
    content: bigContent("high"),
  }));
  await memoryEngine.registerWorldbookEntry(scope, worldbookEntry("r-regex", {
    triggers: [{ kind: "regex", pattern: "swarm\\s+endless", flags: "i" }],
    priority: 50,
    tokenBudget: 64,
    content: bigContent("regex"),
  }));
  await memoryEngine.registerWorldbookEntry(scope, worldbookEntry("x-nomatch", {
    triggers: [{ kind: "keyword", keywords: ["terran"] }],
    priority: 999,
    tokenBudget: 64,
    content: bigContent("nomatch"),
  }));

  const assembly = await memoryEngine.assembleContext(scope, { tokenBudget: 40, scanText: "the swarm endless consumes all zerg" });
  const worldbookSections = assembly.sections.filter((s) => s.layer === "worldbook");
  // 40-token budget: a-high truncates to its 8-token entry budget, r-regex
  // fills the remaining 32 tokens truncated, z-low is omitted with disclosure
  // and x-nomatch never fires at all.
  assert.deepEqual(worldbookSections.map((s) => s.itemId), ["worldbook:a-high", "worldbook:r-regex"]);
  assert.equal(worldbookSections[0].itemId, "worldbook:a-high");
  assert.equal(worldbookSections[0].truncated, true);
  assert.equal(worldbookSections[0].tokens, 8);
  assert.ok(worldbookSections[0].provenance.sourceReceipts[0].receiptId.startsWith("rcpt-"));
  assert.ok(assembly.tokensUsed <= assembly.tokenBudget);
  assert.deepEqual(assembly.omissions.map((o) => o.itemId), ["worldbook:z-low"]);
  for (const omission of assembly.omissions) {
    assert.equal(omission.reason, "token_budget_exceeded");
  }
  assert.equal(assembly.disclosures.omittedCount, 1);
  assert.ok(!assembly.sections.some((s) => s.itemId === "worldbook:x-nomatch"));
  assert.ok(!assembly.omissions.some((o) => o.itemId === "worldbook:x-nomatch"));
  expectError(CB2.WORLDBOOK_TRIGGER_INVALID, () =>
    createWorldbookEntry(worldbookEntry("wb-bad", { triggers: [{ kind: "semantic" }] })));
});

// ---------------------------------------------------------------------------
// 3. Layered memory and observed relationship state.
// ---------------------------------------------------------------------------
check("layered memory isolates namespaces, canon is immutable, durable memory needs user approval", async () => {
  const { memoryEngine } = freshStack();
  const scope = scopeOf("comp-mem");
  await memoryEngine.writeCanon(scope, "truth", "canon truth", provenance);
  await memoryEngine.addEpisodicFact(scope, { factId: "truth", content: "episodic observation", factType: "observation" });
  await memoryEngine.appendTranscript(scope, { speakerId: "user", content: "hello" });
  assert.deepEqual(await memoryEngine.listLayerKeys(scope, "canon"), ["truth"]);
  assert.deepEqual(await memoryEngine.listLayerKeys(scope, "episodic_facts"), ["truth"]);
  assert.deepEqual(await memoryEngine.listLayerKeys(scope, "transcript"), ["log"]);
  assert.equal((await memoryEngine.readCanon(scope, "truth")).value.value, "canon truth");

  await expectAsyncError(CB2.CANON_IMMUTABLE, () =>
    memoryEngine.writeCanon(scope, "truth", "rewritten", provenance));
  const summaryA = await memoryEngine.writeRollingSummary(scope, { content: "first", coversTranscriptThrough: 1 });
  assert.equal(summaryA.summaryVersion, 1);
  await memoryEngine.writeRollingSummary(scope, { content: "second" });
  assert.equal((await memoryEngine.readRollingSummary(scope)).value.content, "second");

  await memoryEngine.proposeDurableMemoryCandidate(scope, {
    candidateId: "dur-1",
    content: "user prefers lore-heavy answers",
    reason: "repeated lore questions",
  });
  const before = await memoryEngine.assembleContext(scope, { tokenBudget: 500 });
  assert.equal(before.disclosures.excludedDurableCandidates, 1);
  await expectAsyncError(CB2.DURABLE_PROMOTION_REQUIRES_USER_APPROVAL, () =>
    memoryEngine.approveDurableMemoryCandidate(scope, "dur-1", { approvedBy: "system", userApproved: true }));
  const approved = await memoryEngine.approveDurableMemoryCandidate(scope, "dur-1", { approvedBy: "user", userApproved: true });
  assert.equal(approved.status, "approved_durable");
  const after = await memoryEngine.assembleContext(scope, { tokenBudget: 500 });
  assert.ok(after.sections.some((s) => s.layer === "durable_memory"));
});

check("relationship state requires typed observed player-visible events and unknown is never zero", async () => {
  const { memoryEngine } = freshStack();
  const scope = scopeOf("comp-rel");
  await memoryEngine.initializeRelationshipState(scope, { axes: ["trust", "affinity"] });
  const initial = await memoryEngine.assembleContext(scope, { tokenBudget: 500 });
  const relSection = initial.sections.find((s) => s.layer === "relationship_state");
  assert.match(relSection.content, /affinity: unknown/);
  assert.doesNotMatch(relSection.content, /affinity: 0\b/);
  assert.equal(initial.disclosures.unknownNeverZero, true);
  assert.equal(initial.disclosures.opponentPrivateInference, "not_performed");

  await expectAsyncError(CB2.RELATIONSHIP_EVENT_INVALID, () =>
    memoryEngine.applyRelationshipEvent(scope, {
      eventType: "vibe_check",
      observed: { observedBy: "player_seat", source: "observed_event" },
      deltas: [{ axis: "trust", delta: 1 }],
    }));
  await expectAsyncError(CB2.OPPONENT_PRIVATE_INFERENCE_FORBIDDEN, () =>
    memoryEngine.applyRelationshipEvent(scope, {
      eventType: "observed_match_outcome",
      observed: { observedBy: "player_seat", source: "observed_event" },
      deltas: [{ axis: "trust", delta: 1 }],
      opponentHand: ["marine"],
    }));

  const applied = await memoryEngine.applyRelationshipEvent(scope, {
    eventId: "evt-1",
    eventType: "personal_shared",
    visibility: "player_visible",
    observed: { observedBy: "player_seat", source: "observed_event" },
    deltas: [{ axis: "trust", delta: 5 }],
  });
  assert.equal(applied.axes.trust.value, 5);
  const state = await memoryEngine.getRelationshipState(scope);
  assert.equal(state.history.length, 1);
  assert.equal(state.axes.affinity.status, "unknown");
});

// ---------------------------------------------------------------------------
// 4. Multi-speaker mentions and seat permissions.
// ---------------------------------------------------------------------------
check("multiple companions share one conversation with rotation, mention queue and no duplicate turn ownership", async () => {
  const { runtime, memoryEngine } = freshStack();
  await runtime.createSession({
    sessionId: "sess-multi",
    participants: baseParticipants(),
    speakerOrder: baseOrder(),
  });
  const peek1 = await runtime.peekNextTurn("sess-multi");
  assert.equal(peek1.turnSequence, 1);
  assert.equal(peek1.ownerParticipantId, "user-1");
  assert.equal(peek1.source, "rotation");

  await expectAsyncError(CB3.TURN_OWNERSHIP_VIOLATION, () =>
    runtime.submitTurn("sess-multi", { participantId: "comp-kerrigan", expectedTurnSequence: 1, content: "out of order" }));
  const t1 = await runtime.submitTurn("sess-multi", {
    participantId: "user-1",
    expectedTurnSequence: 1,
    content: "Zeratul, your read?",
    mentions: ["comp-zeratul"],
  });
  assert.deepEqual(t1.nextTurn, { turnSequence: 2, ownerParticipantId: "comp-zeratul", source: "mention_queue" });
  const t2 = await runtime.submitTurn("sess-multi", { participantId: "comp-zeratul", expectedTurnSequence: 2, content: "The void stirs." });
  assert.deepEqual(t2.nextTurn, { turnSequence: 3, ownerParticipantId: "comp-kerrigan", source: "rotation" });
  await runtime.submitTurn("sess-multi", { participantId: "comp-kerrigan", expectedTurnSequence: 3, content: "The swarm holds." });
  // Both companions spoke in the same conversation; transcript mirrors order.
  const transcript = await memoryEngine.readTranscript(transcriptScope("sess-multi"));
  assert.deepEqual(transcript.map((entry) => entry.speakerId), ["user-1", "comp-zeratul", "comp-kerrigan"]);
  // A consumed turn can never be owned twice.
  await expectAsyncError(CB3.TURN_SEQUENCE_CONFLICT, () =>
    runtime.submitTurn("sess-multi", { participantId: "user-1", expectedTurnSequence: 1, content: "again" }));
});

check("player-seat, observer and review permissions isolate reads and fail closed on opponent-private state", async () => {
  const { runtime } = freshStack();
  await runtime.createSession({
    sessionId: "sess-perm",
    participants: [
      ...baseParticipants(),
      { participantId: "watcher", kind: "agent", seat: "observer" },
      { participantId: "reviewer", kind: "agent", seat: "review" },
    ],
    speakerOrder: baseOrder(),
  });
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", { visibility: "player_visible" })).ok, true);
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", { visibility: "same_seat_public_plan", seat: "player_seat" })).ok, true);
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", { visibility: "same_seat_public_plan", seat: "opponent_seat" })).reason, "cross_seat_binding");
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "watcher", { visibility: "observer_public" })).ok, true);
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "watcher", { visibility: "player_visible" })).ok, false);
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "reviewer", { visibility: "review_public" })).ok, true);
  for (const who of ["user-1", "comp-kerrigan", "watcher", "reviewer"]) {
    const denied = await runtime.authorizeSessionRead("sess-perm", who, { visibility: "opponent_private" });
    assert.equal(denied.ok, false);
    assert.equal(denied.reason, "opponent_private_forbidden");
    assert.equal(denied.failClosed, true);
  }
  await expectAsyncError(CB3.PERMISSION_DENIED, () =>
    runtime.submitTurn("sess-perm", { participantId: "watcher", expectedTurnSequence: 1, content: "observer speaks?" }));
  await expectAsyncError(CB3.MENTION_INVALID, () =>
    runtime.submitTurn("sess-perm", { participantId: "user-1", expectedTurnSequence: 1, content: "watcher?", mentions: ["watcher"] }));
});

// ---------------------------------------------------------------------------
// 5. Non-overwriting branches.
// ---------------------------------------------------------------------------
check("swipe and edit branches append new turns and never overwrite accepted history", async () => {
  const { runtime } = freshStack();
  await runtime.createSession({ sessionId: "sess-branch", participants: baseParticipants(), speakerOrder: baseOrder() });
  await runtime.submitTurn("sess-branch", { participantId: "user-1", expectedTurnSequence: 1, content: "Kerrigan, status?" });
  await runtime.submitTurn("sess-branch", { participantId: "comp-kerrigan", expectedTurnSequence: 2, content: "The swarm holds." });
  const originalTurns = (await runtime.getSessionState("sess-branch")).acceptedTurns.map((turn) => ({ ...turn }));

  const swipe = await runtime.openBranch("sess-branch", { kind: "swipe", participantId: "comp-kerrigan", baseTurnSequence: 2 });
  const entry = await runtime.submitBranchEntry("sess-branch", swipe.branch.branchId, {
    participantId: "comp-kerrigan",
    content: "The swarm advances.",
  });
  const accepted = await runtime.acceptBranchEntry("sess-branch", swipe.branch.branchId, entry.entry.entryId, { expectedTurnSequence: 3 });
  assert.equal(accepted.turn.turnSequence, 3);
  assert.equal(accepted.turn.source.origin, "branch");
  const stateAfter = await runtime.getSessionState("sess-branch");
  assert.equal(stateAfter.acceptedTurns.length, 3);
  assert.deepEqual(stateAfter.acceptedTurns[0], originalTurns[0]);
  assert.deepEqual(stateAfter.acceptedTurns[1], originalTurns[1]);
  assert.equal(stateAfter.acceptedTurns[1].content, "The swarm holds.");

  const edit = await runtime.openBranch("sess-branch", { kind: "edit", participantId: "user-1", baseTurnSequence: 1, note: "typo" });
  await runtime.submitBranchEntry("sess-branch", edit.branch.branchId, { participantId: "user-1", content: "Kerrigan, status report?" });
  const editAccepted = await runtime.acceptBranchEntry("sess-branch", edit.branch.branchId, "branch-2-entry-1");
  assert.equal(editAccepted.turn.source.branchKind, "edit");
  const finalState = await runtime.getSessionState("sess-branch");
  assert.equal(finalState.acceptedTurns.length, 4);
  assert.equal(finalState.acceptedTurns[0].content, "Kerrigan, status?");
  assert.equal(finalState.acceptedTurns[3].content, "Kerrigan, status report?");
});

// ---------------------------------------------------------------------------
// 6. Checkpoint resume.
// ---------------------------------------------------------------------------
check("checkpoint resume rolls a long session back consistently, including the mirrored transcript", async () => {
  const { persistence, memoryEngine, runtime } = freshStack();
  await runtime.createSession({ sessionId: "sess-long", participants: baseParticipants(), speakerOrder: baseOrder() });
  await runtime.submitTurn("sess-long", { participantId: "user-1", expectedTurnSequence: 1, content: "Turn one." });
  await runtime.submitTurn("sess-long", { participantId: "comp-kerrigan", expectedTurnSequence: 2, content: "Turn two." });
  const t3 = await runtime.submitTurn("sess-long", { participantId: "comp-zeratul", expectedTurnSequence: 3, content: "Turn three." });
  const ckpt = await runtime.checkpointSession("sess-long", "before-the-push");
  assert.equal(ckpt.checkpoint.turnSequence, 3);

  await runtime.submitTurn("sess-long", { participantId: "user-1", expectedTurnSequence: 4, content: "Turn four." });
  await runtime.submitTurn("sess-long", { participantId: "comp-kerrigan", expectedTurnSequence: 5, content: "Turn five." });
  assert.equal((await memoryEngine.readTranscript(transcriptScope("sess-long"))).length, 5);

  const resumed = await runtime.resumeSession("sess-long", { checkpointId: ckpt.checkpoint.checkpointId });
  assert.equal(resumed.turnCounter, 3);
  assert.equal(resumed.acceptedHistoryHash, t3.acceptedHistoryHash);
  assert.deepEqual(resumed.nextTurn, { turnSequence: 4, ownerParticipantId: "user-1", source: "rotation" });
  assert.equal((await memoryEngine.readTranscript(transcriptScope("sess-long"))).length, 3);

  const continued = await runtime.submitTurn("sess-long", { participantId: "user-1", expectedTurnSequence: 4, content: "A different turn four." });
  assert.equal(continued.turn.turnSequence, 4);

  // Crash resume on a fresh runtime over the same store.
  const freshRuntime = createCompanionSessionRuntime({
    persistence,
    memoryEngine: createCompanionMemoryEngine({ persistence }),
  });
  const crashResumed = await freshRuntime.resumeSession("sess-long");
  assert.equal(crashResumed.resumedFrom, "latest");
  assert.equal(crashResumed.turnCounter, 4);
  assert.equal(crashResumed.acceptedHistoryHash, continued.acceptedHistoryHash);
  await expectAsyncError(CB3.CHECKPOINT_NOT_FOUND, () =>
    runtime.resumeSession("sess-long", { checkpointId: "sessckpt-missing" }));
});

// ---------------------------------------------------------------------------
// 7. External provider accounting (High repair) and no-provider fail-closed.
// ---------------------------------------------------------------------------
check("opaque external provider port executes externally with provider-reported accounting preserved; no provider fails closed with zeros", async () => {
  const externalProvider = {
    portId: "companion_provider_port_v1",
    adapterId: "external-provider-stub",
    endpoint: "https://provider.example.invalid/v1/complete",
    transport: "https",
    network: "https",
    complete: async (request) => ({
      ok: true,
      response: {
        content: `External answer to: ${request.messages[request.messages.length - 1].content}`,
        rationale: "public rationale from the external provider",
        uncertainty: 0.1,
        usage: { promptTokens: 21, completionTokens: 9, reportedCostUnits: 0.0042 },
      },
      receipt: { networkAttempts: 2, paidInference: "performed", reportedCostUnits: 0.0042 },
    }),
  };
  const module = composeCompanionBackend({
    persistence: createInMemoryPersistenceAdapter(),
    provider: externalProvider,
  });
  assert.equal(module.providerGateway.directModuleNetwork, "none");
  assert.equal(module.providerGateway.externalProviderExecution, "allowed_outside_module");
  const ok = await module.providerGateway.complete({
    requestId: "req-ext-agg-1",
    messages: [{ role: "user", content: "external status?" }],
  });
  assert.equal(ok.ok, true);
  assert.equal(ok.receipt.directModuleNetworkAttempts, 0);
  assert.equal(ok.receipt.networkAttempts, 2);
  assert.equal(ok.receipt.externalNetworkAttempts, 2);
  assert.equal(ok.receipt.paidInference, "performed");
  assert.equal(ok.receipt.reportedCostUnits, 0.0042);
  assert.equal(ok.receipt.accountingSource, "provider_receipt");
  const stats = module.providerGateway.stats();
  assert.equal(stats.directModuleNetworkAttempts, 0);
  assert.equal(stats.externalNetworkAttempts, 2);
  assert.equal(stats.paidInferencePerformed, 1);
  assert.equal(stats.reportedCostUnits, 0.0042);

  // A partial external receipt must not turn an omitted network-attempt count
  // into a fabricated zero, either on the call receipt or in aggregate stats.
  const partialAccountingModule = composeCompanionBackend({
    persistence: createInMemoryPersistenceAdapter(),
    provider: {
      portId: "companion_provider_port_v1",
      endpoint: "https://provider.example.invalid/v1/complete",
      network: "https",
      complete: async () => ({
        ok: true,
        response: {
          content: "External answer with partial accounting.",
          usage: { promptTokens: 5, completionTokens: 3, reportedCostUnits: 0.001 },
        },
        receipt: { paidInference: "performed", reportedCostUnits: 0.001 },
      }),
    },
  });
  const partial = await partialAccountingModule.providerGateway.complete({
    requestId: "req-ext-partial-agg-1",
    messages: [{ role: "user", content: "partial accounting?" }],
  });
  assert.equal(partial.ok, true);
  assert.equal(partial.receipt.externalNetworkAttempts, "unknown");
  assert.equal(partial.receipt.accountingSource, "provider_receipt_partial");
  const partialStats = partialAccountingModule.providerGateway.stats();
  assert.equal(partialStats.externalNetworkAttempts, "unknown");
  assert.equal(partialStats.externalNetworkAttemptsKnown, 0);
  assert.equal(partialStats.externalNetworkAttemptsUnknown, 1);

  // Credentials remain forbidden in stored adapter data even for opaque ports.
  expectError(CB1.CREDENTIALS_FORBIDDEN, () => composeCompanionBackend({
    persistence: createInMemoryPersistenceAdapter(),
    provider: { portId: "companion_provider_port_v1", complete: async () => ({}), apiKey: "sk-test" },
  }));

  // No provider injected: fail closed with all zeros, never a throw.
  const noProvider = composeCompanionBackend({ persistence: createInMemoryPersistenceAdapter() });
  const rejected = await noProvider.providerGateway.complete({
    requestId: "req-none-agg-1",
    messages: [{ role: "user", content: "status?" }],
  });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.failClosed, true);
  assert.equal(rejected.reason, "provider_unavailable");
  assert.equal(rejected.directModuleNetworkAttempts, 0);
  assert.equal(rejected.networkAttempts, 0);
  assert.equal(rejected.paidInference, "not_performed");
  const noneStats = noProvider.providerGateway.stats();
  assert.equal(noneStats.directModuleNetworkAttempts, 0);
  assert.equal(noneStats.externalNetworkAttempts, 0);

  // The pure in-memory provider stays no-network and truthfully reports zeros.
  const pureModule = composeCompanionBackend({
    persistence: createInMemoryPersistenceAdapter(),
    provider: createInMemoryProviderAdapter({
      responder: () => ({ content: "pure answer", usage: { promptTokens: 3, completionTokens: 2, reportedCostUnits: 0 } }),
    }),
  });
  const pure = await pureModule.providerGateway.complete({ messages: [{ role: "user", content: "hi" }] });
  assert.equal(pure.ok, true);
  assert.equal(pure.receipt.accountingSource, "adapter_declared_no_network");
  assert.equal(pure.receipt.networkAttempts, 0);
  assert.equal(pure.receipt.paidInference, "not_performed");
  assert.equal(pureModule.provider.network, "none");
});

// ---------------------------------------------------------------------------
// 8. Six receipt-bound presentation states.
// ---------------------------------------------------------------------------
check("all six presentation states resolve from receipt-bound assets and fail closed when an asset is missing", () => {
  const pkg = packageWithAllAssets();
  const auditLog = createCompanionAuditLog({ logId: "pres-agg" });
  const resolver = createCompanionPresentationResolver({ assetCatalog: catalogFor(pkg), auditLog });
  assert.deepEqual([...resolver.requiredStates], [
    "idle", "speaking", "listening", "alert_combat", "damaged_concerned", "reflective",
  ]);
  const all = resolver.resolveAllStates(pkg);
  assert.equal(all.length, 6);
  for (const [index, output] of all.entries()) {
    assert.equal(output.ok, true, `state ${COMPANION_PRESENTATION_STATES[index]} should resolve`);
    assert.equal(output.state, COMPANION_PRESENTATION_STATES[index]);
    assert.equal(output.receipt.contentHash, output.asset.contentHash);
    assert.equal(output.receipt.receiptId, `receipt-asset-${output.state}`);
    assert.equal(output.trainingTruth, false);
    assert.match(output.outputHash, /^[a-f0-9]{64}$/);
  }

  const partialCatalog = catalogFor(pkg);
  delete partialCatalog["asset-alert_combat"];
  const partial = createCompanionPresentationResolver({ assetCatalog: partialCatalog });
  const missing = partial.resolveState({ package: pkg, state: "alert_combat" });
  assert.equal(missing.ok, false);
  assert.equal(missing.failClosed, true);
  assert.equal(missing.reason, "asset_absent");
  assert.equal(partial.resolveState({ package: pkg, state: "idle" }).ok, true);
});

// ---------------------------------------------------------------------------
// 9. Deterministic replay candidate: trainingTruth false, promotion forbidden.
// ---------------------------------------------------------------------------
async function runAuditedScenario() {
  const module = composeCompanionBackend({
    persistence: createInMemoryPersistenceAdapter(),
    provider: createInMemoryProviderAdapter({
      responder: () => ({ content: "advice", rationale: "public", usage: { promptTokens: 4, completionTokens: 2, reportedCostUnits: 0 } }),
    }),
    assetCatalog: catalogFor(packageWithAllAssets()),
  });
  module.registry.register(samplePackage(1));
  await module.sessionRuntime.createSession({
    sessionId: "sess-audit",
    participants: baseParticipants(),
    speakerOrder: baseOrder(),
  });
  await module.sessionRuntime.submitTurn("sess-audit", { participantId: "user-1", expectedTurnSequence: 1, content: "Report." });
  await module.sessionRuntime.submitTurn("sess-audit", { participantId: "comp-kerrigan", expectedTurnSequence: 2, content: "Holding." });
  await module.providerGateway.complete({ requestId: "req-audit-1", messages: [{ role: "user", content: "advise" }] });
  module.presentation.resolveState({ package: packageWithAllAssets(), state: "speaking" });
  return module;
}

check("audit log is deterministic and replay candidates carry trainingTruth false with automatic promotion forbidden", async () => {
  const moduleA = await runAuditedScenario();
  const moduleB = await runAuditedScenario();
  const exportA = moduleA.auditLog.exportAuditLog();
  const exportB = moduleB.auditLog.exportAuditLog();
  assert.equal(exportA, exportB);
  const verified = verifyCompanionAuditExport(exportA);
  assert.equal(verified.ok, true);

  const candidate = moduleA.auditLog.buildReplayCandidate({ sessionRef: { sessionId: "sess-audit" } });
  assert.equal(candidate.schemaVersion, "companion_backend_module_contract_v1.replay-candidate");
  assert.deepEqual([...candidate.candidateFor], ["wikiskill", "evotest"]);
  assert.equal(candidate.trainingTruth, false);
  assert.equal(candidate.promotion.automatic, "forbidden");
  assert.equal(candidate.promotion.skillPromotion, "manual_approval_only");
  assert.equal(candidate.promotion.memoryPromotion, "manual_approval_only");
  assert.ok(candidate.promotion.requiredGates.includes("promotion_review"));
  assert.ok(candidate.eventKinds.includes("provider.response"));
  assert.match(candidate.candidateHash, /^[a-f0-9]{64}$/);
  assert.equal(moduleA.auditLog.head().kind, "replay.candidate_built");

  expectError(CB4.AUTOMATIC_PROMOTION_FORBIDDEN, () => moduleA.auditLog.buildReplayCandidate({ promote: true }));
  expectError(CB4.AUTOMATIC_PROMOTION_FORBIDDEN, () => moduleA.auditLog.record("promotion.skill", {}));

  const tampered = JSON.parse(exportA);
  tampered.entries[0].subject.gatewayId = "forged";
  expectError(CB4.AUDIT_INTEGRITY_MISMATCH, () => verifyCompanionAuditExport(JSON.stringify(tampered)));
});

// ---------------------------------------------------------------------------

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
  console.log(`CB-5 aggregate verify: ${passed}/${checks.length} checks passed`);
}
