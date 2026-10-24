// Concrete A paid-response regression: C2 says revise H1 but changes R1.
// This checks protocol recovery only, not the strategy's correctness.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { runRosterTeachCycleV1 } from
  "../packages/roster-strategist/roster-teach-cycle-v1.mjs";
import { createRosterTeachRolePortsV1 } from
  "../packages/roster-strategist/roster-teach-role-ports-v1.mjs";

const captured = JSON.parse(await readFile(process.argv[2], "utf8"));
assert.equal(captured.sourceFailure.code, "ROSTER_TEACH_TARGET_NOT_REVISED");
const { schemaVersion, roundKind, ...initial } = captured.initial;
const { schemaVersion: sv, roundKind: rk, ...revised } =
  captured.student.revisedFoundation;
const challenge = { ...captured.challenge, evidenceRequest: null };
const answer = captured.student.answers.find(x => x.challengeId === challenge.challengeId);
const bad = { revisedFoundation: revised, answers: [answer], receipt: null };
const before = JSON.stringify(bad);
const sourceHashes = answer.evidenceRefs;
const base = {
  initialFoundation: initial, sourceHashes,
  challengerPort: { challenge: async () => ({ challenges: [challenge] }) },
  evidencePort: { descriptor: () => ({ readOnly: true }),
    query: async () => { throw new Error("NO_NEW_QUERY_FOR_PROTOCOL_REPAIR"); } },
};
if (process.argv.includes("--linked-targets-only")) {
  let delivered = 0;
  const result = await runRosterTeachCycleV1({ ...base, studentPort: {
    revise: async () => { delivered += 1; return structuredClone(bad); },
  } });
  assert.equal(delivered, 1, "actual linked response change needs no new model call");
  assert.ok(result.revisionTargetResolutions?.some(x =>
    x.challengeId === challenge.challengeId
      && x.kind === "explicit_linked_counter_response"
      && x.changedTargetIds.includes("R1-creep-token-removal")));
  const unrelated = structuredClone(bad);
  unrelated.revisedFoundation.counterResponses = unrelated.revisedFoundation
    .counterResponses.map(x => initial.opponentHypotheses.find(h =>
      h.hypothesisId === challenge.targetId).ownCounterResponseIds.includes(x.responseId)
      ? structuredClone(initial.counterResponses.find(y => y.responseId === x.responseId)) : x);
  let rejectedCalls = 0;
  await assert.rejects(runRosterTeachCycleV1({ ...base, studentPort: {
    revise: async () => { rejectedCalls += 1; return structuredClone(unrelated); },
  } }), /ROSTER_TEACH_TARGET_NOT_REVISED/u);
  assert.equal(rejectedCalls, 3);
  assert.equal(JSON.stringify(bad), before);
  await writeFile(process.argv[3], JSON.stringify({ status: "passed", checks: 3,
    actualRelatedTargetAccepted: true, unrelatedTargetRejected: true,
    sourceRewritten: false, providerCalls: 0, roomWrites: 0,
    resolutions: result.revisionTargetResolutions,
  }, null, 2));
  console.log(JSON.stringify({ status: "passed", mode: "linked-targets-only", checks: 3 }));
  process.exit(0);
}
// The original strict-target regression now isolates a genuinely unchanged
// target bundle, not the captured H1 -> R1 explicitly linked policy change.
bad.revisedFoundation.counterResponses = bad.revisedFoundation.counterResponses
  .map(x => initial.opponentHypotheses.find(h => h.hypothesisId === challenge.targetId)
    .ownCounterResponseIds.includes(x.responseId)
    ? structuredClone(initial.counterResponses.find(y => y.responseId === x.responseId)) : x);
const unmodifiedBad = JSON.stringify(bad);
let calls = 0;
const cycle = await runRosterTeachCycleV1({ ...base, studentPort: {
  revise: async input => {
    calls += 1;
    if (calls === 1) return structuredClone(bad);
    assert.equal(input.revisionRepair.issues[0].targetId, challenge.targetId);
    assert.equal(input.revisionRepair.issues[0].challengeId, challenge.challengeId);
    assert.deepEqual(input.revisionRepair.previousOutput, bad);
    assert.deepEqual(input.initialFoundation, initial);
    return { ...structuredClone(bad), answers: [{ ...answer, disposition: "retain" }] };
  },
} });
assert.equal(calls, 2);
assert.equal(cycle.revisionRepairHistory.length, 1);
assert.equal(cycle.answers[0].disposition, "retain");
assert.equal(JSON.stringify(bad), unmodifiedBad);
let bounded = 0;
await assert.rejects(runRosterTeachCycleV1({ ...base, studentPort: {
  revise: async () => { bounded += 1; return structuredClone(bad); },
} }), /ROSTER_TEACH_TARGET_NOT_REVISED/u);
assert.equal(bounded, 3);
let dispatched;
const ports = createRosterTeachRolePortsV1({ sessionId: "captured-A-target-repair", deliberation: {
  deliberate: async request => {
    dispatched = request;
    const output = structuredClone(captured.student);
    output.answers.find(x => x.challengeId === challenge.challengeId).disposition = "retain";
    return { output, receipt: null };
  },
} });
await ports.studentPort.revise({ initialFoundation: initial,
  initialFoundationHash: "a".repeat(64), sourceHashes, sourceContext: {},
  challenges: [challenge], evidenceReceipts: [],
  revisionRepair: { round: 1, issues: [{ targetId: challenge.targetId }],
    previousOutput: bad },
});
assert.equal(dispatched.roundIndex, 4);
assert.ok(dispatched.promptNodes.some(x => x.kind === "teach-protocol-correction"
  && x.repair.previousOutput.answers[0].challengeId === challenge.challengeId));
await writeFile(process.argv[3], JSON.stringify({ status: "passed", checks: 4,
  firstCapturedFailure: captured.sourceFailure.code, correctionCalls: calls,
  boundedCalls: bounded, sourceRewritten: false, providerCalls: 0, roomWrites: 0,
}, null, 2));
console.log(JSON.stringify({ status: "passed", checks: 4, providerCalls: 0 }));
