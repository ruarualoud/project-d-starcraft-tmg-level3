// Concrete production bug: the Product laboratory facade omitted
// describeQueryContext, so real Teach retries never received named units.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { hashStarcraftTmgContract as hash } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
const [sourcePath, mapPath, workDir, reportPath] = process.argv.slice(2);
const sourceBytes = await fs.readFile(sourcePath, "utf8");
const source = JSON.parse(sourceBytes);
const foundation = structuredClone(source.publicOutputs.find(x =>
  x.roundKind === "strategy_foundation").sanitizedOutput);
// Only the captured probability/query-context defect is in scope. Do not
// re-execute unrelated full-roster route audits or lifecycle hypotheses.
foundation.informationNeeds = foundation.informationNeeds.filter(x =>
  x.kind === "probability");
const challenger = structuredClone(source.publicOutputs.find(x =>
  x.roundKind === "teach_challenge").sanitizedOutput);
challenger.challenges = challenger.challenges.filter(x =>
  x.challengeId === "C3-r4-focus-fire-probability");
assert.equal(challenger.challenges.length, 1);
assert.equal(challenger.challenges[0].evidenceRequest.toolRequest.targetUnitId, "");
const observations = [];
let correctedTarget = null;
let studentEvidence = null;
const deliberationFactory = {
  async createForRun() {
    return {
      descriptor: () => ({ kind: "captured_product_context_probe",
        modelVersion: "zero-provider", promptVersion: "captured-context-probe-v1",
        paidProviderCalls: 0 }),
      async deliberate(request) {
        if (request.roundKind === "strategy_foundation") {
          return { output: structuredClone(foundation),
            receipt: { receiptHash: hash({ probe: "foundation" }) } };
        }
        if (request.roundKind === "teach_challenge") {
          const context = request.promptNodes.find(x =>
            x.kind === "frozen-source-and-skill-boundary")?.sourceContext;
          const repair = request.promptNodes.find(x =>
            x.kind === "correctable-evidence-query-errors");
          observations.push({ context, repair });
          if (!context?.evidenceQueryContext) {
            throw new Error("PRODUCT_QUERY_CONTEXT_MISSING");
          }
          const output = structuredClone(challenger);
          if (repair) {
            const diagnostic = repair.repairs[0];
            assert.equal(diagnostic.reasonCode,
              "PREGAME_LAB_PROBABILITY_TARGET_REQUIRED");
            assert(diagnostic.availableUnits.length > 0,
              "correction must receive actual named source/branch units");
            const own = diagnostic.availableUnits.find(x =>
              x.unitId === "u-marauder-1");
            const enemy = diagnostic.availableUnits.find(x =>
              x.sideKey !== own.sideKey);
            assert(enemy, "the frozen reference opponent must be delivered");
            // This represents the explicitly authored model correction in
            // the fixture, NOT a Host choice of attacker or target.
            correctedTarget = enemy.unitId;
            output.challenges[0].evidenceRequest.toolRequest.targetUnitId =
              correctedTarget;
          }
          return { output, receipt: { receiptHash: hash({
            probe: "challenger", round: observations.length }) } };
        }
        if (request.roundKind === "teach_revision") {
          studentEvidence = request.promptNodes.find(x =>
            x.kind === "independent-challenges-and-read-only-evidence")
            .evidenceReceipts;
          throw new Error("CAPTURED_CONTEXT_BOUNDARY_COMPLETE");
        }
        throw new Error("UNEXPECTED_PROBE_ROUND");
      },
    };
  },
};
const product = await createRosterPlanningProductModuleV1({ root,
  fixtureRoot: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }),
  dataDirectory: workDir,
  mapConfiguration: JSON.parse(await fs.readFile(mapPath, "utf8")),
  deliberationFactory, createSessionId: () => "captured-product-context" });
const session = await product.service.createPresetSession({ setup: source.setup,
  candidateInput: source.lockedRoster.lock.candidateInput });
await product.service.startPlanning(session.sessionId);
while (product.service.readSession(session.sessionId).status === "running") {
  await new Promise(resolve => setTimeout(resolve, 25));
}
const finalSession = product.service.readSession(session.sessionId);
assert.equal(finalSession.failure?.code,
  observations[0]?.context?.evidenceQueryContext
    ? "CAPTURED_CONTEXT_BOUNDARY_COMPLETE" : "PRODUCT_QUERY_CONTEXT_MISSING",
  "a descriptor/setup failure must not be misreported as the query-context bug");
assert(observations[0]?.context?.evidenceQueryContext,
  "actual Product facade must expose the lab's query context to Teach");
assert.equal(observations.length, 2,
  "one explicit correction, not three blind repeats of the missing target");
assert.equal(new Set(observations[0].context.evidenceQueryContext.availableUnits
  .map(x => x.sideKey)).size, 2);
assert(Array.isArray(observations[0].context.availableFoundationBranchRefs));
assert.equal(studentEvidence.length, 2);
assert.equal(studentEvidence[0].unknownReasonCode,
  "PREGAME_LAB_PROBABILITY_TARGET_REQUIRED");
assert.equal(studentEvidence[1].unknownReasonCode,
  "no_current_legal_ranged_domain_for_attacker_target_pair");
assert.equal(studentEvidence[1].queryRepair, undefined);
assert.equal(studentEvidence[1].sourceReceipt.targetUnitId, correctedTarget);
assert.equal(studentEvidence[1].sourceReceipt.estimate, null);
assert.equal(await fs.readFile(sourcePath, "utf8"), sourceBytes);
const report = { passed: true, actualProductServiceRuntimeTeachLaboratoryUsed: true,
  initialAndCorrectionNamedContextDelivered: true,
  modelFixtureOwnsTargetNotHost: true, originalMissingTargetRetained: true,
  oneCorrectionThenGenuineUnknown: true, noProbabilityInvented: true,
  providerCalls: 0, originalRoomWrites: 0, trainingTruth: false };
await fs.writeFile(reportPath, JSON.stringify(report, null, 2) + "\n",
  { mode: 0o600 });
console.log(JSON.stringify(report));
