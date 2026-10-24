import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { searchStarcraftTmgLegalFormationOptionsV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { enumerateOfficialSelectedRosterMeleeActionsV1,
  instantiateOfficialSelectedRosterMeleeActionV1 } from
  "../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs";

// Concrete r87: rolled 11-inch charge, 18 models, no options from the solver.
// The captured state is immutable evidence; direct underlying Rules validation
// avoids Room creation, paid model requests, replay or changes to the live state.
const arg = name => process.argv.find(x => x.startsWith(`--${name}=`))?.slice(name.length + 3);
const captured = JSON.parse(await readFile(arg("capture"), "utf8"));
const before = JSON.stringify(captured.state);
const domain = enumerateOfficialSelectedRosterMeleeActionsV1(captured.state,
  { sideKey: "player2", includeDisabled: true }).parameterDomains.find(d =>
  d.parameterKind === captured.domain.parameterKind);
assert.ok(domain);
assert.deepEqual(domain.constraints, captured.domain.constraints);
const planner = captured.choice.attemptKeys.map(key => captured.choice.attempts[key].safeOutput)
  .map(output => output?.providerTurn?.toolCalls?.find(call => call.name === "submit_planning")
    ?.arguments || output?.planning || output).filter(value => value?.recommendedCandidateId).at(-1);
assert.ok(planner);
const request = { maximumOptions: planner.formationMaximumOptions,
  preferredAnchor: { xMilliInches: planner.formationPreferredX,
    yMilliInches: planner.formationPreferredY },
  tacticalPurpose: planner.formationTacticalPurpose,
  formationObjectives: planner.formationObjectives };
const progress = [];
const failures = [];
let result = null;
const started = Date.now();
try {
  result = searchStarcraftTmgLegalFormationOptionsV1({ state: captured.state, domain, request,
    observeProgress: event => {
      if (["charge_candidate_generation_diagnostic", "candidate_generation_complete",
        "search_completed"].includes(event.stage)) progress.push(event);
    },
    instantiate: (state, currentDomain, parameters) => {
      try { return instantiateOfficialSelectedRosterMeleeActionV1(state, currentDomain, parameters); }
      catch (error) { if (failures.length < 8) failures.push(error.message); throw error; }
    } });
  assert.ok(result.optionCount > 0, "actual rolled charge must expose a Rules-accepted complete formation");
  assert.ok(result.formationOptions.every(option => option.canonicalParameters.outcome === "success"
    && option.canonicalParameters.placements.length === 17));
  assert.equal(JSON.stringify(captured.state), before);
  await writeFile(arg("report"), JSON.stringify({ ok: true, progress,
    optionCount: result.optionCount, failureCounts: result.failureCounts,
    durationMs: Date.now() - started, failures, realProviderCalls: 0,
    originalRoomWrites: 0, trainingTruth: false }, null, 2), { mode: 0o600 });
  console.log("R87_CHARGE_SOLVER_OK");
} catch (error) {
  await writeFile(arg("report"), JSON.stringify({ ok: false, message: error.message,
    progress, optionCount: result?.optionCount, failureCounts: result?.failureCounts,
    durationMs: Date.now() - started, failures, realProviderCalls: 0,
    originalRoomWrites: 0, trainingTruth: false }, null, 2), { mode: 0o600 });
  throw error;
}
