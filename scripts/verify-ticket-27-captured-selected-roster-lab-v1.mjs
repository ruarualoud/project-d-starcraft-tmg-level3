// Regression for B's captured need-round2-scenario: the ordinary preset
// planning entry must query its locked roster, not the factory's default army.
// The captured paid Foundation is fixture input only. Stop at Teach challenge;
// no Provider, fabricated completed plan, or live Room mutation is involved.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { createScriptedRosterDeliberationPortV1 } from
  "../packages/roster-strategist/roster-strategist-runtime-v1.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const root = path.resolve(import.meta.dirname, "..");
function argument(name) {
  const entry = process.argv.find((value) => value.startsWith(`--${name}=`));
  assert.ok(entry, `--${name} is required`);
  return entry.slice(name.length + 3);
}
const sourceSessionPath = argument("source-session");
const mapConfigurationPath = argument("map-configuration");
const evidenceDirectory = argument("evidence-directory");
await fs.mkdir(evidenceDirectory, { recursive: true });
const sourceSession = JSON.parse(await fs.readFile(sourceSessionPath, "utf8"));
const candidateInput = sourceSession.lockedRoster.lock.candidateInput;
const foundation = structuredClone(sourceSession.publicOutputs.find((entry) =>
  entry.roundKind === "strategy_foundation").sanitizedOutput);
foundation.informationNeeds = foundation.informationNeeds.filter((entry) =>
  entry.needId === "need-round2-scenario");
assert.equal(foundation.informationNeeds.length, 1);
let deliveredContext = null;
let fixtureCalls = 0;
const deliberationFactory = {
  availability: () => ({ available: true }),
  async createForRun() {
    return createScriptedRosterDeliberationPortV1({
      handler(request) {
        fixtureCalls += 1;
        if (request.roundKind === "strategy_foundation") return foundation;
        assert.equal(request.roundKind, "teach_challenge");
        deliveredContext = structuredClone(request.promptNodes.find((node) =>
          node.kind === "frozen-source-and-skill-boundary").sourceContext);
        throw Object.assign(new Error("CAPTURED_LAB_STOP_AFTER_FOUNDATION"),
          { code: "CAPTURED_LAB_STOP_AFTER_FOUNDATION" });
      },
    });
  },
};
const module = await createRosterPlanningProductModuleV1({
  root, fixtureRoot: await resolveOfficialDevelopmentTrancheFixtureRootV1({ root }),
  dataDirectory: path.join(evidenceDirectory, "isolated-drafts"),
  mapConfiguration: JSON.parse(await fs.readFile(mapConfigurationPath, "utf8")),
  deliberationFactory,
});
const session = await module.service.createPresetSession({
  setup: sourceSession.setup, candidateInput,
});
await module.service.startPlanning(session.sessionId);
let result;
const deadline = Date.now() + 60_000;
do {
  result = await module.service.readSession(session.sessionId);
  if (result.status !== "running") break;
  await new Promise((resolve) => setTimeout(resolve, 20));
} while (Date.now() < deadline);
const reference = deliveredContext?.foundationToolReferences.find((entry) =>
  entry.referenceId.startsWith("needref-need-round2-scenario-"));
const captured = {
  schema: "ticket27_captured_selected_roster_lab_regression_v1",
  sourceSessionId: sourceSession.sessionId,
  actualPlanningEntry: "createPresetSession -> startPlanning -> Foundation -> Teach",
  selectedUnitIds: candidateInput.units.map((entry) => entry.unitInstanceId),
  scenarioPieceIds: foundation.informationNeeds[0].toolRequest.spec.placements
    .map((entry) => entry.pieceId),
  sessionStatus: result.status, failure: result.failure,
  reference: reference ?? null,
  foundationToolReferences: deliveredContext?.foundationToolReferences ?? null,
  fixtureCalls, realProviderCalls: 0, liveRoomMutationCount: 0,
  hiddenChainOfThoughtStored: false, trainingTruth: false,
};
await fs.writeFile(path.join(evidenceDirectory, "captured-reference.json"),
  `${JSON.stringify(captured, null, 2)}\n`, { mode: 0o600 });
assert.equal(result.failure?.code, "CAPTURED_LAB_STOP_AFTER_FOUNDATION",
  "fixture must reach Teach after querying the captured Foundation");
assert.equal(fixtureCalls, 2);
assert.equal(reference?.status, "attached",
  "selected locked roster's actual six pieces must exist in its scenario source");
assert.ok(reference.receiptHash);
console.log(JSON.stringify({ ok: true, selectedRosterScenarioAttached: true,
  realProviderCalls: 0, trainingTruth: false }));
