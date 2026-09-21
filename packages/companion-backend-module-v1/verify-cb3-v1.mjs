import assert from "node:assert/strict";

import {
  COMPANION_BACKEND_CB3_ERROR_CODES,
  COMPANION_BACKEND_ERROR_CODES,
  COMPANION_BRANCH_KINDS,
  COMPANION_RESOURCE_VISIBILITIES,
  COMPANION_SEAT_READ_POLICY,
  CompanionBackendError,
  composeCompanionBackend,
  createCompanionMemoryEngine,
  createCompanionSessionRuntime,
  createInMemoryPersistenceAdapter,
} from "./index.mjs";

const CB3 = COMPANION_BACKEND_CB3_ERROR_CODES;
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

function createBaseSession(runtime, sessionId = "sess-1", overrides = {}) {
  return runtime.createSession({
    sessionId,
    participants: baseParticipants(),
    speakerOrder: baseOrder(),
    ...overrides,
  });
}

const transcriptScope = (sessionId) => ({ packageId: null, companionId: "conversation", conversationId: sessionId });

check("session runtime requires injected persistence and the CB-2 memory engine", () => {
  expectError(CB1.DEPENDENCY_MISSING, () => createCompanionSessionRuntime({}));
  expectError(CB1.DEPENDENCY_MISSING, () =>
    createCompanionSessionRuntime({ persistence: createInMemoryPersistenceAdapter() }));
  expectError(CB1.DEPENDENCY_MISSING, () =>
    createCompanionSessionRuntime({ memoryEngine: createCompanionMemoryEngine({ persistence: createInMemoryPersistenceAdapter() }) }));
  const composed = composeCompanionBackend({ persistence: createInMemoryPersistenceAdapter() });
  assert.equal(composed.sessionRuntime.engineId, "companion_session_runtime_v1");
  assert.deepEqual([...COMPANION_BRANCH_KINDS], ["swipe", "regenerate", "edit"]);
  assert.ok(COMPANION_RESOURCE_VISIBILITIES.includes("opponent_private"));
  assert.deepEqual([...COMPANION_SEAT_READ_POLICY.player_seat], [
    "player_visible",
    "same_seat_public_plan",
    "same_seat_public_memory",
  ]);
  assert.deepEqual([...COMPANION_SEAT_READ_POLICY.observer], ["observer_public"]);
  assert.deepEqual([...COMPANION_SEAT_READ_POLICY.review], ["review_public", "player_visible"]);
});

check("session creation validates participants and the explicit speaker order", async () => {
  const { runtime } = freshStack();
  await expectAsyncError(CB3.SESSION_INVALID, () => runtime.createSession({ participants: baseParticipants(), speakerOrder: baseOrder() }));
  await expectAsyncError(CB3.PARTICIPANT_DUPLICATE, () => runtime.createSession({
    sessionId: "sess-dup",
    participants: [...baseParticipants(), { participantId: "user-1", kind: "agent", seat: "observer" }],
    speakerOrder: baseOrder(),
  }));
  await expectAsyncError(CB3.PARTICIPANT_INVALID, () => runtime.createSession({
    sessionId: "sess-kind",
    participants: [{ participantId: "x", kind: "rules_engine", seat: "player_seat" }],
    speakerOrder: ["x"],
  }));
  await expectAsyncError(CB3.PARTICIPANT_INVALID, () => runtime.createSession({
    sessionId: "sess-seat",
    participants: [{ participantId: "x", kind: "user", seat: "opponent_seat" }],
    speakerOrder: ["x"],
  }));
  await expectAsyncError(CB3.SPEAKER_ORDER_INVALID, () => runtime.createSession({
    sessionId: "sess-empty-order",
    participants: baseParticipants(),
    speakerOrder: [],
  }));
  await expectAsyncError(CB3.SPEAKER_ORDER_INVALID, () => runtime.createSession({
    sessionId: "sess-unknown-order",
    participants: baseParticipants(),
    speakerOrder: ["user-1", "comp-missing"],
  }));
  await expectAsyncError(CB3.SPEAKER_ORDER_INVALID, () => runtime.createSession({
    sessionId: "sess-dup-order",
    participants: baseParticipants(),
    speakerOrder: ["user-1", "user-1"],
  }));
  // Review seat is read-only and observer defaults off: neither may be ordered to speak.
  await expectAsyncError(CB3.SPEAKER_ORDER_INVALID, () => runtime.createSession({
    sessionId: "sess-review-order",
    participants: [...baseParticipants(), { participantId: "reviewer", kind: "agent", seat: "review" }],
    speakerOrder: ["user-1", "reviewer"],
  }));
  await expectAsyncError(CB3.SPEAKER_ORDER_INVALID, () => runtime.createSession({
    sessionId: "sess-observer-order",
    participants: [...baseParticipants(), { participantId: "watcher", kind: "agent", seat: "observer" }],
    speakerOrder: ["user-1", "watcher"],
  }));

  const created = await createBaseSession(runtime, "sess-ok", {
    participants: [...baseParticipants(), { participantId: "watcher", kind: "agent", seat: "observer", permissions: { canSpeak: true } }],
    speakerOrder: [...baseOrder(), "watcher"],
  });
  assert.equal(created.ok, true);
  assert.equal(created.turnCounter, 0);
  assert.deepEqual(created.nextTurn, { turnSequence: 1, ownerParticipantId: "user-1", source: "rotation" });
  await expectAsyncError(CB3.SESSION_ALREADY_EXISTS, () => createBaseSession(runtime, "sess-ok"));
});

check("explicit rotation order is enforced and no turn can be owned twice", async () => {
  const { runtime, memoryEngine } = freshStack();
  await createBaseSession(runtime, "sess-rot");

  const peek1 = await runtime.peekNextTurn("sess-rot");
  const peek2 = await runtime.peekNextTurn("sess-rot");
  assert.deepEqual(peek1, peek2);
  assert.equal(peek1.ownerParticipantId, "user-1");
  assert.equal(peek1.turnSequence, 1);

  // Wrong owner and stale/future sequence claims fail closed.
  await expectAsyncError(CB3.TURN_OWNERSHIP_VIOLATION, () =>
    runtime.submitTurn("sess-rot", { participantId: "comp-kerrigan", expectedTurnSequence: 1, content: "out of order" }));
  await expectAsyncError(CB3.TURN_SEQUENCE_CONFLICT, () =>
    runtime.submitTurn("sess-rot", { participantId: "user-1", expectedTurnSequence: 2, content: "wrong sequence" }));
  await expectAsyncError(CB3.TURN_INVALID, () =>
    runtime.submitTurn("sess-rot", { participantId: "user-1", expectedTurnSequence: 1, content: "" }));
  await expectAsyncError(CB3.PARTICIPANT_NOT_FOUND, () =>
    runtime.submitTurn("sess-rot", { participantId: "ghost", expectedTurnSequence: 1, content: "boo" }));

  const t1 = await runtime.submitTurn("sess-rot", { participantId: "user-1", expectedTurnSequence: 1, content: "Commanders, report." });
  assert.equal(t1.turn.turnSequence, 1);
  assert.equal(t1.turn.prevTurnHash, null);
  assert.match(t1.turn.turnHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(t1.nextTurn, { turnSequence: 2, ownerParticipantId: "comp-kerrigan", source: "rotation" });

  // Replaying the consumed turn is a sequence conflict: ownership moved on.
  await expectAsyncError(CB3.TURN_SEQUENCE_CONFLICT, () =>
    runtime.submitTurn("sess-rot", { participantId: "user-1", expectedTurnSequence: 1, content: "Commanders, report." }));

  await runtime.submitTurn("sess-rot", { participantId: "comp-kerrigan", expectedTurnSequence: 2, content: "The swarm is ready." });
  const t3 = await runtime.submitTurn("sess-rot", { participantId: "comp-zeratul", expectedTurnSequence: 3, content: "I walk in shadow." });
  assert.equal(t3.turn.prevTurnHash.length, 64);
  const t4 = await runtime.submitTurn("sess-rot", { participantId: "user-1", expectedTurnSequence: 4, content: "Rotation wraps to me." });
  assert.equal(t4.nextTurn.ownerParticipantId, "comp-kerrigan");

  // Accepted turns are mirrored into the CB-2 transcript layer.
  const transcript = await memoryEngine.readTranscript(transcriptScope("sess-rot"));
  assert.equal(transcript.length, 4);
  assert.equal(transcript[0].speakerId, "user-1");
  assert.equal(transcript[2].speakerId, "comp-zeratul");
  assert.equal(transcript[3].content, "Rotation wraps to me.");
});

check("mentions queue explicit out-of-rotation turns deterministically", async () => {
  const { runtime } = freshStack();
  await createBaseSession(runtime, "sess-mention");

  await expectAsyncError(CB3.MENTION_TARGET_UNKNOWN, () =>
    runtime.submitTurn("sess-mention", { participantId: "user-1", expectedTurnSequence: 1, content: "hi @ghost", mentions: ["ghost"] }));
  await expectAsyncError(CB3.MENTION_INVALID, () =>
    runtime.submitTurn("sess-mention", { participantId: "user-1", expectedTurnSequence: 1, content: "hi myself", mentions: ["user-1"] }));

  // Mentioning zeratul jumps her ahead of kerrigan's rotation turn.
  const t1 = await runtime.submitTurn("sess-mention", {
    participantId: "user-1",
    expectedTurnSequence: 1,
    content: "Zeratul, your read?",
    mentions: ["comp-zeratul"],
  });
  assert.deepEqual(t1.nextTurn, { turnSequence: 2, ownerParticipantId: "comp-zeratul", source: "mention_queue" });
  const t2 = await runtime.submitTurn("sess-mention", { participantId: "comp-zeratul", expectedTurnSequence: 2, content: "The void stirs." });
  // The mention queue is consumed; the rotation resumes exactly where it was.
  assert.deepEqual(t2.nextTurn, { turnSequence: 3, ownerParticipantId: "comp-kerrigan", source: "rotation" });

  // Mentioning the participant who already owns the next rotation turn does
  // not create a duplicate queued turn.
  const t3 = await runtime.submitTurn("sess-mention", {
    participantId: "comp-kerrigan",
    expectedTurnSequence: 3,
    content: "Zeratul, again.",
    mentions: ["comp-zeratul"],
  });
  assert.equal(t3.nextTurn.ownerParticipantId, "comp-zeratul");
  const t4 = await runtime.submitTurn("sess-mention", { participantId: "comp-zeratul", expectedTurnSequence: 4, content: "Again, yes." });
  assert.equal(t4.nextTurn.ownerParticipantId, "user-1");

  // Multiple mentions queue in mention order.
  await runtime.submitTurn("sess-mention", {
    participantId: "user-1",
    expectedTurnSequence: 5,
    content: "Both of you.",
    mentions: ["comp-zeratul", "comp-kerrigan"],
  });
  const q1 = await runtime.peekNextTurn("sess-mention");
  assert.equal(q1.ownerParticipantId, "comp-zeratul");
  assert.equal(q1.source, "mention_queue");
  await runtime.submitTurn("sess-mention", { participantId: "comp-zeratul", expectedTurnSequence: 6, content: "First." });
  const q2 = await runtime.peekNextTurn("sess-mention");
  assert.equal(q2.ownerParticipantId, "comp-kerrigan");
  assert.equal(q2.source, "mention_queue");
  const q3 = await runtime.submitTurn("sess-mention", { participantId: "comp-kerrigan", expectedTurnSequence: 7, content: "Second." });
  assert.deepEqual(q3.nextTurn, { turnSequence: 8, ownerParticipantId: "comp-kerrigan", source: "rotation" });
});

check("player-seat, observer and review reads are isolated and fail closed", async () => {
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

  // Human-seat companion: player-visible + same-seat public plan/memory only.
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", { visibility: "player_visible" })).ok, true);
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", { visibility: "same_seat_public_plan", seat: "player_seat" })).ok, true);
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", { visibility: "same_seat_public_memory", seat: "player_seat" })).ok, true);
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", { visibility: "same_seat_public_plan", seat: "opponent_seat" })).reason, "cross_seat_binding");
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", { visibility: "same_seat_public_plan" })).reason, "missing_seat_binding");
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", { visibility: "observer_public" })).reason, "denied_by_seat_policy");
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", { visibility: "review_public" })).ok, false);

  // Observer defaults to observer_public only; review mode is separate.
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "watcher", { visibility: "observer_public" })).ok, true);
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "watcher", { visibility: "player_visible" })).ok, false);
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "reviewer", { visibility: "review_public" })).ok, true);
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "reviewer", { visibility: "player_visible" })).ok, true);
  assert.equal((await runtime.authorizeSessionRead("sess-perm", "reviewer", { visibility: "same_seat_public_memory", seat: "review" })).ok, false);

  // Opponent-private and unknown visibility are denied for every seat.
  for (const who of ["user-1", "comp-kerrigan", "watcher", "reviewer"]) {
    const denied = await runtime.authorizeSessionRead("sess-perm", who, { visibility: "opponent_private" });
    assert.equal(denied.ok, false);
    assert.equal(denied.reason, "opponent_private_forbidden");
    assert.equal(denied.failClosed, true);
    const unknown = await runtime.authorizeSessionRead("sess-perm", who, { visibility: "teammate_hidden" });
    assert.equal(unknown.ok, false);
    assert.equal(unknown.reason, "unknown_visibility");
    assert.equal(unknown.visibility, "unknown");
  }

  await expectAsyncError(CB3.PERMISSION_DENIED, () =>
    runtime.assertSessionReadAccess("sess-perm", "watcher", { visibility: "player_visible" }));

  // Even an allowed label fails closed when the payload carries
  // opponent-private keys, hidden reasoning or credentials.
  await expectAsyncError(CB3.OPPONENT_PRIVATE_STATE_FORBIDDEN, () =>
    runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", {
      visibility: "player_visible",
      payload: { board: "visible", opponentHand: ["marine"] },
    }));
  await expectAsyncError(CB1.HIDDEN_COT_FORBIDDEN, () =>
    runtime.authorizeSessionRead("sess-perm", "comp-kerrigan", {
      visibility: "player_visible",
      payload: { hiddenReasoning: "secret" },
    }));

  // The state filter partitions without copying withheld payloads.
  const filtered = await runtime.filterSessionState("sess-perm", "comp-kerrigan", {
    items: [
      { itemId: "board", visibility: "player_visible", payload: { minerals: 50 } },
      { itemId: "plan", visibility: "same_seat_public_plan", seat: "player_seat", payload: { intent: "expand" } },
      { itemId: "foe-hand", visibility: "opponent_private", payload: { cards: 4 } },
      { itemId: "smuggled", visibility: "player_visible", payload: { opponentDeck: ["zergling"] } },
      { itemId: "mystery", visibility: "referee_hidden", payload: { x: 1 } },
      { itemId: "observer-feed", visibility: "observer_public", payload: { tick: 12 } },
    ],
  });
  assert.deepEqual(filtered.visible.map((entry) => entry.itemId), ["board", "plan"]);
  assert.equal(filtered.visible[0].payload.minerals, 50);
  assert.deepEqual(filtered.withheld.map((entry) => entry.itemId), ["foe-hand", "smuggled", "mystery", "observer-feed"]);
  assert.ok(filtered.withheld.every((entry) => !("payload" in entry)));
  assert.equal(filtered.withheld.find((entry) => entry.itemId === "foe-hand").reason, "opponent_private_forbidden");
  assert.equal(filtered.withheld.find((entry) => entry.itemId === "smuggled").reason, "forbidden_content_fail_closed");
  assert.equal(filtered.withheld.find((entry) => entry.itemId === "mystery").reason, "unknown_visibility");
  assert.equal(filtered.disclosures.opponentPrivateWithheld, 2);
  assert.equal(filtered.disclosures.unknownVisibilityWithheld, 1);
  assert.equal(filtered.disclosures.unknownNeverAllowed, true);
  assert.equal(filtered.disclosures.opponentPrivateInference, "not_performed");

  // Review and default-observer seats are read-only: no speaking turns.
  await expectAsyncError(CB3.PERMISSION_DENIED, () =>
    runtime.submitTurn("sess-perm", { participantId: "reviewer", expectedTurnSequence: 1, content: "review speaks?" }));
  await expectAsyncError(CB3.PERMISSION_DENIED, () =>
    runtime.submitTurn("sess-perm", { participantId: "watcher", expectedTurnSequence: 1, content: "observer speaks?" }));
  // Read-only participants cannot be mentioned into the speaking queue either.
  await expectAsyncError(CB3.MENTION_INVALID, () =>
    runtime.submitTurn("sess-perm", { participantId: "user-1", expectedTurnSequence: 1, content: "watcher?", mentions: ["watcher"] }));
});

check("swipe, regenerate and edit branches never overwrite accepted history", async () => {
  const { runtime } = freshStack();
  await createBaseSession(runtime, "sess-branch");
  await runtime.submitTurn("sess-branch", { participantId: "user-1", expectedTurnSequence: 1, content: "Kerrigan, status?" });
  const t2 = await runtime.submitTurn("sess-branch", { participantId: "comp-kerrigan", expectedTurnSequence: 2, content: "The swarm holds." });
  const historyBefore = t2.acceptedHistoryHash;
  const originalTurn1 = (await runtime.getSessionState("sess-branch")).acceptedTurns[0];
  const originalTurn2 = (await runtime.getSessionState("sess-branch")).acceptedTurns[1];

  // Branch validation: kind, base bounds and base-turn ownership.
  await expectAsyncError(CB3.BRANCH_INVALID, () =>
    runtime.openBranch("sess-branch", { kind: "rewrite", participantId: "comp-kerrigan", baseTurnSequence: 2 }));
  await expectAsyncError(CB3.BRANCH_BASE_INVALID, () =>
    runtime.openBranch("sess-branch", { kind: "swipe", participantId: "comp-kerrigan", baseTurnSequence: 99 }));
  await expectAsyncError(CB3.TURN_OWNERSHIP_VIOLATION, () =>
    runtime.openBranch("sess-branch", { kind: "swipe", participantId: "user-1", baseTurnSequence: 2 }));

  const swipeA = await runtime.openBranch("sess-branch", { kind: "swipe", participantId: "comp-kerrigan", baseTurnSequence: 2 });
  const swipeB = await runtime.openBranch("sess-branch", { kind: "swipe", participantId: "comp-kerrigan", baseTurnSequence: 2 });
  assert.equal(swipeA.branch.branchId, "branch-1");
  assert.equal(swipeA.branch.swipeIndex, 0);
  assert.equal(swipeB.branch.swipeIndex, 1);
  assert.equal(swipeA.branch.baseTurnHash, originalTurn2.turnHash);

  await expectAsyncError(CB3.TURN_OWNERSHIP_VIOLATION, () =>
    runtime.submitBranchEntry("sess-branch", swipeA.branch.branchId, { participantId: "user-1", content: "not the owner" }));
  await expectAsyncError(CB3.BRANCH_NOT_FOUND, () =>
    runtime.submitBranchEntry("sess-branch", "branch-missing", { participantId: "comp-kerrigan", content: "x" }));

  const entry = await runtime.submitBranchEntry("sess-branch", swipeA.branch.branchId, {
    participantId: "comp-kerrigan",
    content: "The swarm advances.",
  });
  assert.equal(entry.entry.entryId, "branch-1-entry-1");

  // Accepting the swipe appends a NEW turn; both original turns are untouched.
  const accepted = await runtime.acceptBranchEntry("sess-branch", swipeA.branch.branchId, entry.entry.entryId, { expectedTurnSequence: 3 });
  assert.equal(accepted.turn.turnSequence, 3);
  assert.equal(accepted.turn.ownerParticipantId, "comp-kerrigan");
  assert.deepEqual(accepted.turn.source, {
    origin: "branch",
    branchId: "branch-1",
    entryId: "branch-1-entry-1",
    branchKind: "swipe",
    baseTurnSequence: 2,
  });
  const stateAfterSwipe = await runtime.getSessionState("sess-branch");
  assert.equal(stateAfterSwipe.acceptedTurns.length, 3);
  assert.deepEqual(stateAfterSwipe.acceptedTurns[0], originalTurn1);
  assert.deepEqual(stateAfterSwipe.acceptedTurns[1], originalTurn2);
  assert.equal(stateAfterSwipe.acceptedTurns[1].content, "The swarm holds.");
  assert.equal(stateAfterSwipe.branches["branch-1"].status, "accepted");

  // Closed branches reject further entries and re-acceptance.
  await expectAsyncError(CB3.BRANCH_CLOSED, () =>
    runtime.submitBranchEntry("sess-branch", swipeA.branch.branchId, { participantId: "comp-kerrigan", content: "more" }));
  await expectAsyncError(CB3.BRANCH_CLOSED, () =>
    runtime.acceptBranchEntry("sess-branch", swipeA.branch.branchId, entry.entry.entryId));
  await expectAsyncError(CB3.BRANCH_ENTRY_NOT_FOUND, () =>
    runtime.acceptBranchEntry("sess-branch", swipeB.branch.branchId, "branch-2-entry-9"));

  // Sibling swipe remains open and can be discarded instead.
  const discarded = await runtime.discardBranch("sess-branch", swipeB.branch.branchId);
  assert.equal(discarded.status, "discarded");
  await expectAsyncError(CB3.BRANCH_CLOSED, () =>
    runtime.submitBranchEntry("sess-branch", swipeB.branch.branchId, { participantId: "comp-kerrigan", content: "late" }));

  // Edit branch: the user revises their own earlier message; the original
  // turn stays in history and the edit lands as a new appended turn.
  const edit = await runtime.openBranch("sess-branch", { kind: "edit", participantId: "user-1", baseTurnSequence: 1, note: "typo" });
  await runtime.submitBranchEntry("sess-branch", edit.branch.branchId, { participantId: "user-1", content: "Kerrigan, status report?" });
  const editAccepted = await runtime.acceptBranchEntry("sess-branch", edit.branch.branchId, "branch-3-entry-1");
  assert.equal(editAccepted.turn.source.branchKind, "edit");
  const stateAfterEdit = await runtime.getSessionState("sess-branch");
  assert.equal(stateAfterEdit.acceptedTurns.length, 4);
  assert.deepEqual(stateAfterEdit.acceptedTurns[0], originalTurn1);
  assert.equal(stateAfterEdit.acceptedTurns[0].content, "Kerrigan, status?");
  assert.equal(stateAfterEdit.acceptedTurns[3].content, "Kerrigan, status report?");

  // Branch-committed turns are out-of-band: rotation ownership is unchanged.
  assert.equal(editAccepted.nextTurn.ownerParticipantId, "comp-zeratul");
  assert.notEqual(historyBefore, editAccepted.acceptedHistoryHash);

  const branches = await runtime.listBranches("sess-branch");
  assert.deepEqual(branches.map((branch) => [branch.branchId, branch.status]), [
    ["branch-1", "accepted"],
    ["branch-2", "discarded"],
    ["branch-3", "accepted"],
  ]);
});

check("checkpoint resume restores long-session state and memory consistently", async () => {
  const { persistence, memoryEngine, runtime } = freshStack();
  await createBaseSession(runtime, "sess-long");
  await runtime.submitTurn("sess-long", { participantId: "user-1", expectedTurnSequence: 1, content: "Turn one." });
  await runtime.submitTurn("sess-long", { participantId: "comp-kerrigan", expectedTurnSequence: 2, content: "Turn two." });
  const t3 = await runtime.submitTurn("sess-long", { participantId: "comp-zeratul", expectedTurnSequence: 3, content: "Turn three." });

  const ckpt = await runtime.checkpointSession("sess-long", "before-the-push");
  assert.equal(ckpt.checkpoint.turnSequence, 3);
  assert.equal(ckpt.checkpoint.acceptedHistoryHash, t3.acceptedHistoryHash);
  assert.deepEqual((await runtime.listCheckpoints("sess-long")).map((row) => row.checkpointId), [ckpt.checkpoint.checkpointId]);

  // The session continues far past the checkpoint (long session).
  await runtime.submitTurn("sess-long", { participantId: "user-1", expectedTurnSequence: 4, content: "Turn four." });
  await runtime.submitTurn("sess-long", { participantId: "comp-kerrigan", expectedTurnSequence: 5, content: "Turn five." });
  assert.equal((await runtime.getSessionState("sess-long")).turnCounter, 5);
  assert.equal((await memoryEngine.readTranscript(transcriptScope("sess-long"))).length, 5);

  // Branch resume from the checkpoint: later turns roll back with the
  // persistence snapshot; the mirrored CB-2 transcript rolls back too.
  const resumed = await runtime.resumeSession("sess-long", { checkpointId: ckpt.checkpoint.checkpointId });
  assert.equal(resumed.turnCounter, 3);
  assert.equal(resumed.acceptedHistoryHash, t3.acceptedHistoryHash);
  assert.deepEqual(resumed.nextTurn, { turnSequence: 4, ownerParticipantId: "user-1", source: "rotation" });
  const transcriptAfter = await memoryEngine.readTranscript(transcriptScope("sess-long"));
  assert.equal(transcriptAfter.length, 3);
  assert.equal(transcriptAfter[2].content, "Turn three.");

  // The resumed branch accepts new turns immediately, deterministically.
  const continued = await runtime.submitTurn("sess-long", { participantId: "user-1", expectedTurnSequence: 4, content: "A different turn four." });
  assert.equal(continued.turn.turnSequence, 4);
  assert.equal((await memoryEngine.readTranscript(transcriptScope("sess-long"))).length, 4);

  await expectAsyncError(CB3.CHECKPOINT_NOT_FOUND, () =>
    runtime.resumeSession("sess-long", { checkpointId: "sessckpt-missing" }));
  await expectAsyncError(CB3.SESSION_NOT_FOUND, () => runtime.resumeSession("sess-missing"));

  // Crash resume on a fresh runtime over the same store: no checkpoint needed.
  const freshRuntime = createCompanionSessionRuntime({
    persistence,
    memoryEngine: createCompanionMemoryEngine({ persistence }),
  });
  const crashResumed = await freshRuntime.resumeSession("sess-long");
  assert.equal(crashResumed.resumedFrom, "latest");
  assert.equal(crashResumed.turnCounter, 4);
  assert.equal(crashResumed.acceptedHistoryHash, continued.acceptedHistoryHash);
});

check("resume and export fail closed on tampered accepted history", async () => {
  const { persistence, runtime } = freshStack();
  await createBaseSession(runtime, "sess-tamper");
  await runtime.submitTurn("sess-tamper", { participantId: "user-1", expectedTurnSequence: 1, content: "Original words." });
  await runtime.submitTurn("sess-tamper", { participantId: "comp-kerrigan", expectedTurnSequence: 2, content: "Reply." });

  // Tamper at the persistence layer: rewrite accepted turn content in place.
  const stored = await persistence.get("cb3.session", "state::sess-tamper");
  assert.equal(stored.found, true);
  const tampered = JSON.parse(JSON.stringify(stored.value));
  tampered.acceptedTurns[0].content = "Overwritten words.";
  await persistence.put("cb3.session", "state::sess-tamper", tampered);

  await expectAsyncError(CB3.SESSION_INTEGRITY_MISMATCH, () => runtime.resumeSession("sess-tamper"));
  await expectAsyncError(CB3.SESSION_INTEGRITY_MISMATCH, () => runtime.exportSession("sess-tamper"));
});

check("session export/import round-trips with integrity and rejects duplicates", async () => {
  const { runtime } = freshStack();
  await createBaseSession(runtime, "sess-export");
  await runtime.submitTurn("sess-export", { participantId: "user-1", expectedTurnSequence: 1, content: "Pack this session.", mentions: ["comp-kerrigan"] });
  await runtime.submitTurn("sess-export", { participantId: "comp-kerrigan", expectedTurnSequence: 2, content: "Packed." });
  const exported = await runtime.exportSession("sess-export");
  const historyHash = (await runtime.getSessionState("sess-export")).acceptedHistoryHash
    ?? (await runtime.getSessionState("sess-export")).acceptedTurns.at(-1).turnHash;

  const { runtime: runtimeB } = freshStack();
  const imported = await runtimeB.importSession(exported);
  assert.equal(imported.turnCounter, 2);
  assert.equal(imported.acceptedHistoryHash, historyHash);
  assert.equal(await runtimeB.exportSession("sess-export"), exported);
  // The imported session resumes speaking from the exact persisted state.
  assert.deepEqual(imported.nextTurn, { turnSequence: 3, ownerParticipantId: "comp-zeratul", source: "rotation" });

  await expectAsyncError(CB3.SESSION_ALREADY_EXISTS, () => runtimeB.importSession(exported));

  const parsed = JSON.parse(exported);
  parsed.exportedState.acceptedTurns[0].content = "Forged.";
  await expectAsyncError(CB1.CONTRACT_INTEGRITY_MISMATCH, () =>
    runtimeB.importSession(JSON.stringify(parsed)));
});

check("session lifecycle closes fail-closed and listSessions summarizes", async () => {
  const { runtime } = freshStack();
  await createBaseSession(runtime, "sess-life-a");
  await createBaseSession(runtime, "sess-life-b");
  await runtime.submitTurn("sess-life-a", { participantId: "user-1", expectedTurnSequence: 1, content: "Hello." });
  const closed = await runtime.closeSession("sess-life-a");
  assert.equal(closed.status, "closed");
  assert.equal(closed.nextTurn, null);
  await expectAsyncError(CB3.SESSION_CLOSED, () =>
    runtime.submitTurn("sess-life-a", { participantId: "comp-kerrigan", expectedTurnSequence: 2, content: "Anyone?" }));
  await expectAsyncError(CB3.SESSION_CLOSED, () => runtime.peekNextTurn("sess-life-a"));
  await expectAsyncError(CB3.SESSION_CLOSED, () =>
    runtime.openBranch("sess-life-a", { kind: "swipe", participantId: "user-1", baseTurnSequence: 1 }));
  await expectAsyncError(CB3.SESSION_CLOSED, () => runtime.checkpointSession("sess-life-a", "too late"));

  const sessions = await runtime.listSessions();
  assert.deepEqual(sessions.map((row) => row.sessionId), ["sess-life-a", "sess-life-b"]);
  assert.equal(sessions[0].status, "closed");
  assert.equal(sessions[0].turnCounter, 1);
  assert.equal(sessions[1].status, "active");
});

async function runReplayScenario() {
  const persistence = createInMemoryPersistenceAdapter();
  const memoryEngine = createCompanionMemoryEngine({ persistence });
  const runtime = createCompanionSessionRuntime({ persistence, memoryEngine });
  await runtime.createSession({
    sessionId: "sess-replay",
    participants: [
      { participantId: "user-1", kind: "user", seat: "player_seat" },
      { participantId: "comp-a", kind: "companion", seat: "player_seat" },
      { participantId: "comp-b", kind: "companion", seat: "player_seat" },
      { participantId: "reviewer", kind: "agent", seat: "review" },
    ],
    speakerOrder: ["user-1", "comp-a", "comp-b"],
  });
  await runtime.submitTurn("sess-replay", { participantId: "user-1", expectedTurnSequence: 1, content: "Hello both.", mentions: ["comp-b"] });
  await runtime.submitTurn("sess-replay", { participantId: "comp-b", expectedTurnSequence: 2, content: "Greetings, user." });
  await runtime.submitTurn("sess-replay", { participantId: "comp-a", expectedTurnSequence: 3, content: "First answer." });
  const branch = await runtime.openBranch("sess-replay", { kind: "swipe", participantId: "comp-a", baseTurnSequence: 3 });
  await runtime.submitBranchEntry("sess-replay", branch.branch.branchId, { participantId: "comp-a", content: "Alternate answer." });
  await runtime.acceptBranchEntry("sess-replay", branch.branch.branchId, "branch-1-entry-1");
  await runtime.checkpointSession("sess-replay", "mid-session");
  await runtime.submitTurn("sess-replay", { participantId: "comp-b", expectedTurnSequence: 5, content: "Following up." });
  await runtime.authorizeSessionRead("sess-replay", "reviewer", { visibility: "review_public" });
  return runtime.exportSession("sess-replay");
}

check("full session replay is deterministic across fresh runtimes", async () => {
  const exportA = await runReplayScenario();
  const exportB = await runReplayScenario();
  assert.equal(exportA, exportB);
  const parsed = JSON.parse(exportA);
  assert.equal(parsed.schemaVersion, "companion_backend_module_contract_v1.session-export");
  assert.equal(parsed.exportedState.turnCounter, 5);
  assert.equal(parsed.exportedState.acceptedTurns[3].source.origin, "branch");
  assert.equal(parsed.exportedState.checkpoints.length, 1);
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
  console.log(`CB-3 verify: ${passed}/${checks.length} checks passed`);
}
