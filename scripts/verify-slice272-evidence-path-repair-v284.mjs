// Reproduce B's repeated saved-evidence path miss, with no Provider or Rules execution.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { readRosterTeachRetainedEvidenceV1, projectRosterTeachPromptEvidenceV1 }
  from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const [base] = process.argv.slice(2);
const dir = `${base}/B/fresh-generation-v264/workspace/iterative-draft/sessions`;
const name = (await fs.readdir(dir)).find(f => f.endsWith('.json'));
const raw = JSON.parse(await fs.readFile(`${dir}/${name}`, 'utf8'));
const state = raw.value ?? raw;
const record = state.draftTeachSnapshots.findLast(row => row.state.investigation?.operations
  .some(op => op.queryId === 'q-timing-assault-branch-parameter-domains-readback'));
const request = record.state.investigation.operations.find(op =>
  op.queryId === 'q-timing-assault-branch-parameter-domains-readback').request.toolRequest;
const archive = new Map();
projectRosterTeachPromptEvidenceV1([record.context, record.state], archive);
const original = JSON.stringify([...archive]);
let failure;
try { readRosterTeachRetainedEvidenceV1(record.context.existingEvidence || [], request, archive); }
catch (error) { failure = error; }
assert.match(failure?.code || failure?.message || '', /ROSTER_TEACH_EVIDENCE_PATH_UNKNOWN/);
assert.equal(failure.queryRepair?.correctable, true, 'Path failure must offer exact navigation, not invite another blind guess');
const navigation = failure.queryRepair.navigation;
assert(navigation.length > 0);
assert(navigation.some(row => row.childPaths.length > 0));
for (const row of navigation) {
  for (const path of row.childPaths) {
    const result = readRosterTeachRetainedEvidenceV1(record.context.existingEvidence || [],
      { receiptHash: request.receiptHash, path }, archive);
    assert.equal(result.sourceReceiptHash, request.receiptHash);
  }
}
assert.equal(failure.queryRepair.originalQueryNotAnswered, true);
assert.equal(JSON.stringify([...archive]), original, 'No original receipt rewritten');
console.log(JSON.stringify({ pass: true, actualBPath: request.path,
  navigablePaths: navigation.reduce((n, row) => n + row.childPaths.length, 0),
  providerCalls: 0, nativeExecutions: 0, originalReceiptUnchanged: true }));
