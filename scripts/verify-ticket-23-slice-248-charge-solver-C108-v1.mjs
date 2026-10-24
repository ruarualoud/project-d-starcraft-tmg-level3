// Concrete original C108: seven Marines, rolled 13-inch charge, zero layouts.
// This repro uses the same Rules instantiator, never a Room mutation or a reroll.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { searchStarcraftTmgLegalFormationOptionsV1 } from
  '../packages/online-agent-session/legal-formation-search-v1.mjs';
import { enumerateOfficialSelectedRosterMeleeActionsV1,
  instantiateOfficialSelectedRosterMeleeActionV1 } from
  '../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs';
import { hashStarcraftTmgContract as hash } from
  '../packages/authoritative-engine/referee-crypto-v1.mjs';

const [capturePath, reportPath] = process.argv.slice(2);
const captured = JSON.parse(gunzipSync(await readFile(capturePath)).toString('utf8'));
assert.equal(captured.stateRevision, 108);
assert.equal(hash(captured.state), captured.stateHash);
assert.equal(captured.state.pendingAction?.pieceId, 'player1-marine-3');
assert.equal(captured.state.pendingAction?.maxDistanceMilliInches, 13000);
const domain = enumerateOfficialSelectedRosterMeleeActionsV1(captured.state,
  { sideKey: 'player1', includeDisabled: true }).parameterDomains.find(row => row.actionType === 'resolve_charge');
assert(domain, 'original mandatory resolution domain must exist');
const planner = Object.values(captured.choice.attempts).map(row => row.safeOutput?.planning)
  .filter(row => row?.formationSearchRequested === true).at(-1);
assert(planner, 'original paid formation intent must exist');
const request = { maximumOptions: planner.formationMaximumOptions,
  preferredAnchor: { xMilliInches: planner.formationPreferredX, yMilliInches: planner.formationPreferredY },
  tacticalPurpose: planner.formationTacticalPurpose, formationObjectives: planner.formationObjectives };
const progress = [];
let result;
const started = performance.now();
const report = { schemaVersion: 'ticket23_actual_C108_charge_solver_repro_v1',
  roomId: captured.roomId, stateRevision: 108, stateHash: captured.stateHash,
  chargeRollPreserved: captured.state.pendingAction.chargeRoll,
  providerCalls: 0, originalRoomWrites: 0, performancePromotionAdmitted: false,
  trainingTruth: false };
try {
  result = searchStarcraftTmgLegalFormationOptionsV1({ state: captured.state, domain, request,
    observeProgress: event => { if (['charge_candidate_generation_diagnostic',
      'candidate_generation_complete', 'search_completed'].includes(event.stage)) progress.push(event); },
    instantiate: (state, currentDomain, parameters) =>
      instantiateOfficialSelectedRosterMeleeActionV1(state, currentDomain, parameters) });
  assert(result.optionCount > 0,
    'ACTUAL_C108_MANDATORY_CHARGE_RESOLUTION_HAS_NO_RULES_ACCEPTED_LAYOUT');
  for (const option of result.formationOptions) {
    const checked = instantiateOfficialSelectedRosterMeleeActionV1(captured.state, domain, option.canonicalParameters);
    assert.deepEqual(checked.canonicalParameters, option.canonicalParameters);
    assert.equal(option.canonicalParameters.outcome, 'success');
    assert.equal(option.canonicalParameters.placements.length, 6);
  }
  assert.equal(hash(captured.state), captured.stateHash);
  report.ok = true;
} catch (error) {
  report.ok = false;
  report.error = error.message;
  throw error;
} finally {
  Object.assign(report, { elapsedMs: performance.now() - started, progress,
    optionCount: result?.optionCount ?? null, failureCounts: result?.failureCounts ?? null,
    options: result?.formationOptions ?? [] });
  await writeFile(reportPath, JSON.stringify(report), { mode: 0o600 });
  console.log(JSON.stringify({ ...report, options: undefined }));
}
