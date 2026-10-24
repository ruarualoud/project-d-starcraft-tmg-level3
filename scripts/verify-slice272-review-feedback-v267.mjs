import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { deliberateRosterReviewOutputV1 } from '../packages/roster-strategist/roster-review-output-recovery-v1.mjs';
const directory = process.argv[2];
const request = JSON.parse(gunzipSync(await fs.readFile(directory + '/request-062.private.json.gz')));
const progress = JSON.parse(await fs.readFile(directory + '/progress.private.json', 'utf8'));
const saved = JSON.parse(await fs.readFile(directory + '/workspace/drafts/' + progress.sessionId + '.json', 'utf8'));
const workspace = saved.value || saved;
const record = workspace.publicOutputs.findLast(x => x.contextHash === request.contextHash);
assert.ok(record);
assert.equal(record.transportSchemaIssues.length, 2);
let calls = 0;
const result = await deliberateRosterReviewOutputV1({ deliberate: async next => {
  calls++;
  if (calls === 1) { assert.equal(next.contextHash, request.contextHash); return { output: record.sanitizedOutput }; }
  assert.equal(calls, 2);
  const feedback = next.promptNodes.at(-1);
  assert.equal(feedback.kind, 'repair_completed_public_reply');
  assert.ok(feedback.validationIssues.some(x => x.path === '$.reviewedClaimPaths'));
  assert.ok(feedback.validationIssues.some(x => x.path === '$.hasUnreportedMaterialFindings'));
  assert.notEqual(next.contextHash, request.contextHash);
  assert.deepEqual(next.promptNodes.slice(0, -1), request.promptNodes);
  // This fixture simulates the model completing coverage, not Host inference.
  return { output: { ...record.sanitizedOutput,
    reviewedClaimPaths: request.promptNodes.find(x => x.kind === 'frozen-plan-claims').sources.map(x => x.path),
    hasUnreportedMaterialFindings: false } };
} }, request);
assert.equal(calls, 2);
assert.deepEqual(result.output.findings, record.sanitizedOutput.findings);
assert.equal(result.structuredRecovery.correctionCount, 1);
console.log(JSON.stringify({ pass: true, actualSavedOutput: true, modelCorrectionRequested: true,
  findingsPreserved: true, coverageInventedByHost: false, providerCalls: 0, trainingTruth: false }));
