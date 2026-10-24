import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import * as port from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [base] = process.argv.slice(2);
const directory = `${base}/roster-plan-matrix-v274/E/fresh-generation-v274`;
const request = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-103.private.json.gz`)));
const file = (await fs.readdir(`${directory}/workspace/iterative-draft/sessions`)).find(name => name.endsWith('.json'));
const raw = JSON.parse(await fs.readFile(`${directory}/workspace/iterative-draft/sessions/${file}`, 'utf8'));
const state = structuredClone(raw.value || raw);
const originalContext = request.promptNodes[0].content;
const originalHash = hash(originalContext);
state.modelContextVersion = 17;
const projected = port.projectIterativeRosterLatestToolTurnV1
  ? port.projectIterativeRosterLatestToolTurnV1(state, originalContext) : originalContext;
assert.equal(Object.keys(projected)[0], 'latestToolTurn', 'Actual E103 had no direct current query→result turn before its 1.2MB history');
const turn = projected.latestToolTurn;
assert.equal(turn.revision, 26);
assert.equal(turn.results.length, 3);
assert.equal(turn.results[0].query.kind, 'map_route');
assert.equal(turn.results[2].query.kind, 'scene_query');
assert.equal(turn.results[2].query.branchStateHash, '', 'Do not silently select a hypothetical branch');
for (const row of turn.results) {
  assert.equal(row.deliveryStatus, 'already_returned');
  const original = state.observations.find(observation => observation.requestKey === turn.requestKey
    && observation.receipt?.receiptHash === row.receiptHash && hash(observation.query) === hash(row.query));
  assert(original);
  assert.deepEqual(row.receipt, original.receipt, 'No fact/geometry/scope/unknown changes');
}
assert.equal(turn.strategyChosenByHost, false);
assert.equal(hash(originalContext), originalHash);
assert.equal(hash(projected.decisionState), hash(originalContext.decisionState), 'Historical state retained');
assert.deepEqual(port.projectIterativeRosterLatestToolTurnV1({...state,modelContextVersion:16},originalContext),originalContext,'Paid v16 projection unchanged');
assert.deepEqual(port.projectIterativeRosterLatestToolTurnV1({...state,currentCandidate:{candidateHash:'different'}},originalContext),originalContext,'Do not promote old army evidence');
assert.deepEqual(port.projectIterativeRosterLatestToolTurnV1({...state,iterations:[...state.iterations,{decisionKind:'revise_plan'}]},originalContext),originalContext,'Do not label a pre-revision query as the current turn');
console.log(JSON.stringify({pass:true,actualCase:'E103',originalContextBytes:Buffer.byteLength(JSON.stringify(originalContext)),
  activeTurnBytes:Buffer.byteLength(JSON.stringify(turn)),completeOriginalResults:3,oldContextUnchanged:true,
  strategySelected:false,providerCalls:0,rulesQueries:0,modelConvergenceNotProven:true}));
