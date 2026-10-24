// Concrete captured B bug: a missing attacker is delivered as unknown, then
// Teach immediately moves on to Student instead of asking for a corrected query.
// This gate covers the actual cycle/role/output-contract boundary. The evidence
// port is a seam probe, NOT a probability or Rules implementation.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { runRosterTeachCycleV1 } from
  "../packages/roster-strategist/roster-teach-cycle-v1.mjs";
import { createRosterTeachRolePortsV1 } from
  "../packages/roster-strategist/roster-teach-role-ports-v1.mjs";

const [sourcePath, outputPath] = process.argv.slice(2);
const source = JSON.parse(await readFile(sourcePath, "utf8"));
const original = JSON.stringify(source);
const full = structuredClone(source.publicOutputs.find(x =>
  x.roundKind === "strategy_foundation").sanitizedOutput);
const { schemaVersion, roundKind, ...foundation } = full;
const challengeOutput = structuredClone(source.publicOutputs.find(x =>
  x.roundKind === "teach_challenge").sanitizedOutput);
challengeOutput.challenges = challengeOutput.challenges.filter(x =>
  x.challengeId === "chal-hyp-creep-charge");
assert.equal(challengeOutput.challenges[0].evidenceRequest.toolRequest.attackerUnitId, "");
const calls = [];
const requests = [];
const rolePorts = createRosterTeachRolePortsV1({
  sessionId: source.sessionId,
  deliberation: {
    async deliberate(request) {
      calls.push(structuredClone(request));
      if (request.roundKind === "teach_revision") {
        throw new Error("CAPTURED_STUDENT_BOUNDARY_REACHED");
      }
      const output = structuredClone(challengeOutput);
      if (calls.length > 1) {
        const diagnostic = request.promptNodes.find(x =>
          x.kind === "correctable-evidence-query-errors");
        assert(diagnostic, "the model must see the actual error and original query");
        assert.equal(diagnostic.repairs[0].reasonCode,
          "PREGAME_LAB_PROBABILITY_ATTACKER_REQUIRED");
        // Explicit model-authored correction, never a Host default attacker.
        output.challenges[0].evidenceRequest.toolRequest.attackerUnitId =
          "player2-hydralisk";
      }
      return { output, receipt: { receiptHash: hash({ call: calls.length }) } };
    },
  },
});
const evidencePort = {
  descriptor: () => ({ readOnly: true }),
  async query(input) {
    requests.push(structuredClone(input));
    const missing = input.request.toolRequest.attackerUnitId === "";
    const receipt = {
      challengeId: input.challengeId, status: "unknown",
      unknownReasonCode: missing
        ? "PREGAME_LAB_PROBABILITY_ATTACKER_REQUIRED"
        : "no_current_legal_ranged_domain_for_attacker_target_pair",
      ...(missing ? { queryRepair: {
        correctable: true,
        reasonCode: "PREGAME_LAB_PROBABILITY_ATTACKER_REQUIRED",
        capabilities: { probability: "current_legal_ranged_attack_only" },
        availableUnits: [{ unitId: "player2-hydralisk", sideKey: "player2" }],
      } } : {}),
      trainingTruth: false,
    };
    return { ...receipt, receiptHash: hash(receipt) };
  },
};
await assert.rejects(runRosterTeachCycleV1({ ...rolePorts, evidencePort,
  initialFoundation: foundation, sourceHashes: [hash(foundation)],
  sourceContext: { frozenOpponentReferenceNotLiveEnemyTruth: true },
}), /CAPTURED_STUDENT_BOUNDARY_REACHED/);
assert.equal(requests.length, 2,
  "Teach must execute the model's corrected request before asking Student");
assert.equal(calls.length, 3);
assert.equal(requests[1].request.toolRequest.attackerUnitId, "player2-hydralisk");
assert.equal(requests[1].request.toolRequest.targetUnitId,
  requests[0].request.toolRequest.targetUnitId);
assert.notEqual(calls[0].contextHash, calls[1].contextHash,
  "the correction cannot reuse the failed original paid request identity");
assert.equal(JSON.stringify(source), original);
const report = { passed: true, actualTeachCycleAndRolePortsUsed: true,
  capturedMissingAttackerCorrectedByModel: true,
  originalRequestAndErrorRetained: true, distinctCorrectionRequestIdentity: true,
  genuineNoLegalAttackStillUnknown: true, noProbabilityInvented: true,
  evidencePortIsSeamProbe: true, probabilityAndRulesNotCertified: true,
  providerCalls: 0, liveRoomWrites: 0, trainingTruth: false };
await writeFile(outputPath, JSON.stringify(report, null, 2) + "\n", { mode: 0o600 });
console.log(JSON.stringify(report));
