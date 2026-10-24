// Read only the authorized root TASKS.md history; generate a candidate, never overwrite root.
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const worktree = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = '/Users/rualoud/Downloads/codex_project/project-d';
const target = repository + '/TASKS.md';
const sourceBlob = '93d9a06fd64740b959a99fd16ea26051b01e7b82';
const incidentAt = Date.parse('2026-10-21T16:30:57.970Z');
const prefix = path.join(worktree, 'build', `root-tasks-reconstruction-v835-${Date.now()}`);
const digest = value => createHash('sha256').update(value).digest('hex');
async function readCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: repository });
    const chunks = [], errors = [];
    child.stdout.on('data', value => chunks.push(value));
    child.stderr.on('data', value => errors.push(value));
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve(Buffer.concat(chunks)) : reject(new Error(Buffer.concat(errors).toString('utf8'))));
  });
}
const sql = `SELECT i.thread_id,i.rollout_ordinal,i.created_at_ms,i.started_at_ms,i.completed_at_ms,
  json_extract(i.item_json,'$.status') AS status,json_extract(c.value,'$.kind') AS kind,
  json_extract(c.value,'$.diff') AS diff
  FROM thread_items i,json_each(i.item_json,'$.changes') c
  WHERE i.item_type='fileChange' AND i.created_at_ms >= ${Date.parse('2026-09-23T00:27:12Z')}
    AND i.created_at_ms < ${incidentAt}
    AND json_extract(c.value,'$.path')='${target}'
  ORDER BY COALESCE(i.started_at_ms,i.created_at_ms),i.rollout_ordinal;`;
const historyBytes = process.argv[2]
  ? await fs.readFile(process.argv[2])
  : await readCommand('/usr/bin/sqlite3', ['-readonly', '-json', '/Users/rualoud/.codex/thread_history_1.sqlite', sql]);
const patches = JSON.parse(historyBytes.toString('utf8') || '[]');
const base = await readCommand('/usr/bin/git', ['cat-file', 'blob', sourceBlob]);
const current = await fs.readFile(target);
await fs.writeFile(prefix + '.patches.json', historyBytes, { flag: 'wx' });
await fs.writeFile(prefix + '.current-before.md', current, { flag: 'wx' });

function applyDiff(content, diff) {
  const source = content.split('\n');
  const patch = diff.split('\n');
  let delta = 0, hunks = 0;
  for (let i = 0; i < patch.length; i++) {
    const header = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(patch[i]);
    if (!header) continue;
    const oldLines = [], newLines = [];
    while (i + 1 < patch.length && !patch[i + 1].startsWith('@@ ')) {
      const line = patch[++i];
      if (line.startsWith(' ')) { oldLines.push(line.slice(1)); newLines.push(line.slice(1)); }
      else if (line.startsWith('-')) oldLines.push(line.slice(1));
      else if (line.startsWith('+')) newLines.push(line.slice(1));
      else if (line && !line.startsWith('\\ No newline')) throw new Error('Unknown patch line');
    }
    if (oldLines.length !== Number(header[2] ?? 1) || newLines.length !== Number(header[4] ?? 1)) {
      throw new Error('Hunk line count mismatch');
    }
    const expected = Math.max(0, Number(header[1]) - 1 + delta);
    const matches = (at, lines) => at >= 0 && at + lines.length <= source.length && lines.every((line, j) => source[at + j] === line);
    let at = expected;
    if (!matches(at, oldLines)) {
      const positions = [];
      for (let j = 0; j <= source.length - oldLines.length; j++) if (matches(j, oldLines)) positions.push(j);
      if (positions.length !== 1) throw Object.assign(new Error('Missing or ambiguous exact preimage'), { expected, oldLines, positions: positions.slice(0,8) });
      at = positions[0];
    }
    source.splice(at, oldLines.length, ...newLines);
    delta += newLines.length - oldLines.length;
    hunks++;
  }
  if (!hunks) throw new Error('No unified diff hunks');
  return source.join('\n');
}

let content = base.toString('utf8');
const applied = [], skipped = [], unresolved = [], observedPreimages = [], unchanged = [], uncertainAppendPositions = [];
for (const item of patches) {
  const identity = { thread: item.thread_id, ordinal: item.rollout_ordinal, timestamp: item.created_at_ms, status: item.status };
  if (item.status !== 'completed') { skipped.push(identity); continue; }
  if (!item.diff.trim()) { unchanged.push(identity); continue; }
  try {
    content = applyDiff(content, item.diff);
    applied.push(identity);
  } catch (error) {
    // Four inspected historical append records contain only a blank preimage.
    // Their text is exact, but an external edit changed line numbering. Preserve
    // the additions at EOF and disclose that placement is not byte-proven.
    if (item.thread_id === '01a03316-1e3c-7bc3-822e-21500daa0c5d' &&
        [636976, 637095, 637172, 637263].includes(item.rollout_ordinal) &&
        error.oldLines?.length === 1 && error.oldLines[0] === '' &&
        !item.diff.split('\n').some(line => line.startsWith('-'))) {
      const additions = item.diff.split('\n').filter(line => line.startsWith('+')).map(line => line.slice(1));
      content += (content.endsWith('\n') ? '' : '\n') + additions.join('\n') + '\n';
      uncertainAppendPositions.push({ ...identity, exactAddition: additions.join('\n'),
        reason: 'literal text recovered; blank-only original line position not independently proven; retained at EOF' });
      applied.push(identity);
      continue;
    }
    // External editors (e.g. K3) do not emit Codex fileChange items. A subsequent
    // successful patch is an exact observation of their top task paragraph, not
    // a license to invent missing text. Recover only that literal observed block.
    const nonempty = (error.oldLines ?? []).filter(line => line.length);
    if (error.expected === 1 && error.positions?.length === 0 && nonempty.length === 1 &&
        nonempty[0].startsWith('- [') && content.startsWith('# TASKS.md\n\n') &&
        !content.split('\n').includes(nonempty[0])) {
      const withObservedPreimage = content.replace('# TASKS.md\n\n', '# TASKS.md\n\n' + nonempty[0] + '\n\n');
      try {
        content = applyDiff(withObservedPreimage, item.diff);
        observedPreimages.push({ ...identity, exactParagraph: nonempty[0], source: 'completed patch literal preimage; external edit not separately recorded' });
        applied.push(identity);
        continue;
      } catch { /* Preserve the unresolved patch rather than guessing further. */ }
    }
    unresolved.push({ ...identity, error: error.message, expected: error.expected,
      preimage: error.oldLines, positions: error.positions, diff: item.diff });
  }
}
await fs.writeFile(prefix + '.candidate.md', content, { flag: 'wx' });
const report = { target, sourceBlob, sourceBlobBytes: base.length, sourceBlobSha256: digest(base), incidentAt,
  exactHistoryRows: patches.length, historySha256: digest(historyBytes), beforeSha256: digest(current),
  candidateBytes: Buffer.byteLength(content), candidateSha256: digest(content), applied, skipped, unresolved, observedPreimages, unchanged, uncertainAppendPositions,
  byteForByteOriginalProven: false,
  rootOverwritten: false, candidateFile: prefix + '.candidate.md', historyFile: prefix + '.patches.json',
  concurrentBeforeFile: prefix + '.current-before.md' };
await fs.writeFile(prefix + '.report.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ report: prefix + '.report.json', rows: patches.length, applied: applied.length,
  skipped: skipped.length, unresolved: unresolved.length, observedPreimages: observedPreimages.length,
  unchanged: unchanged.length, uncertainAppendPositions: uncertainAppendPositions.length,
  bytes: report.candidateBytes, rootOverwritten: false }));
