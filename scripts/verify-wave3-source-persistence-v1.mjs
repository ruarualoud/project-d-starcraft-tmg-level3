import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { stageOfficialWave3SourceCandidateV1 } from './support/official-wave3-source-candidate-v1.mjs';
import { replayStarcraftTmgSourceImportLedgerV4 } from '../packages/source-data/official-source-import-workflow-v4.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const intake = path.join(root, 'build/ticket-28-wave3-source-candidate-20261112-v1');
const directory = path.join(intake, 'persistence-recovery');
await fs.mkdir(directory, { recursive: true });
const retained = ['snapshot.json', 'dataset.json'];
for (const name of retained) {
  await fs.copyFile(path.join(intake, 'compiled', name), path.join(directory, name), fs.constants.COPYFILE_EXCL);
}
const before = await Promise.all(retained.map(name => fs.stat(path.join(directory, name))));
await stageOfficialWave3SourceCandidateV1({
  worktreeRoot: root,
  fixtureRoot: path.resolve(root, '../..'),
  sourceIndexFile: path.join(intake, 'source-index.json'),
  outputDirectory: directory,
});
const files = await fs.readdir(path.join(intake, 'compiled'));
for (const name of files) {
  assert.deepEqual(await fs.readFile(path.join(directory, name)), await fs.readFile(path.join(intake, 'compiled', name)));
}
for (const [index, name] of retained.entries()) {
  assert.equal((await fs.stat(path.join(directory, name))).mtimeMs, before[index].mtimeMs);
}
const ledger = JSON.parse(await fs.readFile(path.join(directory, 'import-ledger.json'), 'utf8'));
const replay = replayStarcraftTmgSourceImportLedgerV4(ledger);
assert.equal(replay.pointerEventCount, 0);
const report = {
  status: 'passed',
  scope: 'restore missing artifacts after two source artifacts have been persisted',
  retainedFilesRewritten: 0,
  completedFilesMatchOriginal: files.length,
  coldReplay: replay,
  modelCalls: 0,
  productionPromotion: false,
};
await fs.writeFile(path.join(intake, 'persistence-verification.json'), JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(report, null, 2));
