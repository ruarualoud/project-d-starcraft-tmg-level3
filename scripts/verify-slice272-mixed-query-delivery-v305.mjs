import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createIterativeRosterFileStoreV1 } from '../packages/roster-strategist/iterative-roster-file-store-v1.mjs';
import { projectIterativeRosterLatestToolTurnV1 } from '../packages/roster-strategist/iterative-roster-flash-model-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [directory] = process.argv.slice(2);
const request = JSON.parse(gunzipSync(await fs.readFile(`${directory}/request-130.private.json.gz`)));
const delivered = request.promptNodes[0].content.latestToolTurn;
assert.equal(delivered.results[0].deliveryStatus, 'saved_result_unavailable');
const progress = JSON.parse(await fs.readFile(`${directory}/progress.private.json`, 'utf8'));
const store = createIterativeRosterFileStoreV1({ directory: `${directory}/workspace/iterative-draft` });
const state = await store.load(progress.sessionId);
const index = state.iterations.findIndex(row => row.requestKey === delivered.requestKey);
assert(index >= 0);
const iteration = state.iterations[index];
assert(iteration.toolReceiptHashes.length > iteration.publicDecision.queries.length,
  'Actual F batch includes ignored-query receipts before its successful read');
const view = { ...state, iterations: state.iterations.slice(0, index + 1),
  currentCandidate: { ...state.currentCandidate, candidateHash: iteration.currentCandidateHash } };
const query = iteration.publicDecision.queries[0];
const original = state.observations.find(row => row.requestKey === iteration.requestKey
  && hash(row.query) === hash(query) && iteration.toolReceiptHashes.includes(row.receipt.receiptHash));
assert(original);
const result = projectIterativeRosterLatestToolTurnV1(view, {}).latestToolTurn.results[0];
assert.equal(result.deliveryStatus, 'already_returned', 'Ignored receipts must not shift the successful query/result pairing');
assert.equal(result.receiptHash, original.receipt.receiptHash);
assert.equal(result.receipt.result.sourceReceiptHash, JSON.parse(query.argumentsJson).receiptHash);
const absent = { ...view, observations: view.observations.filter(row => row !== original) };
assert.equal(projectIterativeRosterLatestToolTurnV1(absent, {}).latestToolTurn.results[0].deliveryStatus,
  'saved_result_unavailable', 'Never borrow a result from another request or unrelated query');
console.log(JSON.stringify({ pass: true, actualF130AssociationRepaired: true,
  noPositionBasedReceiptGuess: true, missingEvidenceStillMissing: true,
  originalQueriesAndReceiptsUnchanged: true, providerCalls: 0, nativeCalls: 0 }));
