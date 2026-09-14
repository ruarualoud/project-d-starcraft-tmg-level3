import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, BUILD, ledgerSnapshot } from './support/strategy-live-production-support-v1.mjs';
import { hash, seal, verifySeal } from '../packages/skill-production/common.mjs';

const before = ledgerSnapshot();
const run = async () => JSON.parse((await promisify(execFile)(process.execPath,
  [path.join(ROOT, 'scripts/run-ticket-18-general-strategy-production-v1.mjs'), '--preflight'],
  { cwd: ROOT, timeout: 180000, maxBuffer: 100000 })).stdout.trim());
const first = await run(), second = await run();
assert(first.ready && second.ready);
assert.equal(first.runId, second.runId);
assert.equal(first.caseCorpusHash, second.caseCorpusHash);
const corpusPath = path.join(BUILD, 'general-case-corpus-v1.json');
const corpus = verifySeal(JSON.parse(await readFile(corpusPath, 'utf8')));
assert.equal(corpus.hash, first.caseCorpusHash);
assert.equal(corpus.cases.length, 5);
assert.equal(corpus.cases.reduce((n, c) => n + c.evaluation.outcomes.length, 0), 13);
assert.equal((await stat(corpusPath)).mode & 0o777, 0o600);
const heldout = corpus.cases.find(c => c.evaluation.split === 'heldout');
assert(heldout);
assert(!JSON.stringify(corpus.input.workspace).includes(heldout.prompt.caseId));
assert.equal(before.ledgerHash, ledgerSnapshot().ledgerHash);
const report = seal({ passed: true, checks: 6, providerCalls: 0, stableRunId: first.runId,
  caseCorpusHash: corpus.hash, ledgerUnchanged: true, sourceRefreshPerformed: false, trainingTruth: false });
await mkdir(BUILD, { recursive: true });
await writeFile(path.join(BUILD, 'case-restart-readiness.json'), JSON.stringify(report, null, 2));
console.log(JSON.stringify({ passed: true, checks: 6, providerCalls: 0, hash: report.hash }));
