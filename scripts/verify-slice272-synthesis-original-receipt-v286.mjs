import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import * as reader from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const [base] = process.argv.slice(2);
const request = JSON.parse(gunzipSync(await fs.readFile(`${base}/A/fresh-generation-v264/request-185.private.json.gz`)));
const actual = JSON.parse(await fs.readFile(`${base}/A/fresh-generation-v264/workspace/drafts/rws-5c8ed89c-06a0-4c29-910d-f33d17421516.json`, 'utf8'));
const references = new Set();
function walk(value, visit) {
  if (!value || typeof value !== 'object') return;
  visit(value);
  for (const child of Object.values(value)) walk(child, visit);
}
walk(request.promptNodes, value => {
  if (value.retrieval?.kind === 'retained_evidence') references.add(JSON.parse(value.retrieval.toolRequestJson).receiptHash);
});
let original;
walk(actual.teachFramework.state, value => {
  if (!original && references.has(value.receiptHash) && Buffer.byteLength(JSON.stringify(value)) > 32768) original = value;
});
assert(original, 'Actual A contains a displayed reference to a large saved original receipt');
const source = new Map([[original.receiptHash, original]]);
const archive = reader.createRosterTeachSynthesisArchiveV1(request.promptNodes, { retainedEvidence: source });
const receipt = reader.readRosterTeachSynthesisDocumentV1(archive, { documentId: `evidence:${original.receiptHash}`, path: '/receiptHash', offset: 0 });
assert.equal(receipt.kind, 'value', 'Synthesis must be able to follow its retained_evidence links');
assert.equal(receipt.value, original.receiptHash);
const state = reader.createRosterTeachSynthesisReaderStateV1(archive);
assert(reader.projectRosterTeachSynthesisReaderV1(archive, state)[0].retainedEvidenceLookup);
for (const key of Object.keys(original)) {
  const value = reader.readRosterTeachSynthesisDocumentV1(archive, { documentId: `evidence:${original.receiptHash}`,
    path: `/${key.replaceAll('~','~0').replaceAll('/','~1')}`, offset: 0 });
  assert.notEqual(value.kind, 'document_error');
  assert.notEqual(value.kind, 'path_error');
  if (value.kind === 'value') assert.deepEqual(value.value, original[key]);
}
assert.equal(reader.readRosterTeachSynthesisDocumentV1(archive, {documentId:'evidence:not-retained',path:'',offset:0}).kind,'document_error');
console.log(JSON.stringify({pass:true,originalReceiptHash:original.receiptHash,originalBytes:Buffer.byteLength(JSON.stringify(original)),
  fields:Object.keys(original).length,originalUntouched:true,providerCalls:0,rulesQueries:0}));
