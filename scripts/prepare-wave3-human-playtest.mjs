// Materialize the signed release's original path layout from checked-in, byte-pinned inputs.
import {createHash} from 'node:crypto';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const pack = path.join(root, 'content/release-inputs/wave3-human-v1');
const index = JSON.parse(await readFile(path.join(pack, 'index.json'), 'utf8'));
const shared = '../scripts/starcraft-tmg-rules-v0.mjs';
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
for (const [relative, record] of Object.entries(index)) {
  if (relative !== shared && (!relative.startsWith('build/') || relative.includes('..'))) throw Error('Invalid release input path');
  const target = path.resolve(root, relative);
  const existing = await readFile(target).catch(e => { if (e.code !== 'ENOENT') throw e; return null; });
  if (existing) {
    if (digest(existing) !== record.sha256) throw Error('Existing input differs: '+relative);
    continue;
  }
  if (relative === shared && !process.argv.includes('--include-shared-rules')) {
    throw Error('Shared Project D Rules missing. In a standalone checkout, rerun with --include-shared-rules to create '+target);
  }
  const payload = await readFile(path.join(pack, record.file));
  const bytes = record.file.endsWith('.gz') ? gunzipSync(payload) : payload;
  if (bytes.length !== record.length || digest(bytes) !== record.sha256) throw Error('Corrupt release input: '+relative);
  await mkdir(path.dirname(target), {recursive:true});
  await writeFile(target, bytes, {flag:'wx'});
}
console.log('Verified '+Object.keys(index).length+' Wave3 inputs.');
