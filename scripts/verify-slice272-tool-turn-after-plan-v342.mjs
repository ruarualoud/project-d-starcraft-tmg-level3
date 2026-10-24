import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { projectIterativeRosterLatestToolTurnV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
const [directory] = process.argv.slice(2);
const read = async n => JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-${n}.product-request.json.gz`))).promptNodes[0].content;
const before = await read('046'), after = await read('048');
assert(!after.latestToolTurn, 'Captured048 lost the current query handoff after the Plan note');
const turn = before.latestToolTurn;
const state = { modelContextVersion: 19, currentCandidate: after.decisionState.currentCandidate,
  iterations: [{ revision: turn.revision, requestKey: turn.requestKey, decisionKind: 'query',
    currentCandidateHash: turn.candidateHash, toolReceiptHashes: turn.results.map(r=>r.receiptHash),
    publicDecision: { queries: turn.results.map(r=>r.query), question: turn.question } },
    { revision: 9, decisionKind: 'revise_plan', currentCandidateHash: turn.candidateHash }],
  observations: turn.results.map(r=>({ requestKey: turn.requestKey, query: r.query, receipt: r.receipt })) };
const preserved = JSON.stringify(state);
const projected = projectIterativeRosterLatestToolTurnV1(state, {});
assert.equal(projected.latestToolTurn?.revision, turn.revision,
  'A Plan edit must not evict the last completed same-army tool turn from the explicit handoff');
assert.deepEqual(projected.latestToolTurn.results.map(r=>r.receipt), turn.results.map(r=>r.receipt));
assert.equal(projected.latestToolTurn.results[0].receipt.branchStateHash, '3dcb7637d7bba3324456c229e709dee1eae8d0fb0d8a1d29b27867520d1ade9d');
const changedArmy = { ...state, currentCandidate: { candidateHash: 'another-army' } };
assert.equal(projectIterativeRosterLatestToolTurnV1(changedArmy, {}).latestToolTurn, undefined);
assert.equal(JSON.stringify(state), preserved);
console.log(JSON.stringify({ pass: true, checks: 2, actual048HandoffGap: true,
  sameArmyOriginalsRetainedAcrossPlanEdit: true, changedArmyNotPromoted: true,
  providerCalls: 0, nativeCalls: 0 }));
