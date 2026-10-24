// Read only public text from the two already-cancelled Kimi sessions. Never
// copy think blocks or treat a valid prefix as an accepted full Plan.
import fs from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { join, resolve } from 'node:path';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../packages/structured-generation/output-contract-registry-v1.mjs';
import { normalizeProviderJsonDocumentV1 } from '../packages/secure-provider-runtime/provider-response-outcome-v1.mjs';
const exec = promisify(execFile);
const [base] = process.argv.slice(2);
if (!base) throw Error('EXPLICIT_BASE_REQUIRED');
const dest = join(base, 'common-v223-kimi-public-interruption-capture.private.json');
await (await fs.open(dest, 'wx', 0o600)).close();
const report = { providerCalls: 0, nativeCalls: 0, originalWrites: 0, rows: [] };
function completeItems(text) {
  const field = /"repairs"\s*:\s*\[/.exec(text);
  if (!field) return [];
  const items = []; let start = -1, depth = 0, inString = false, escape = false;
  for (let i = field.index + field[0].length; i < text.length; i++) {
    const c = text[i];
    if (inString) { if (escape) escape = false; else if (c === '\\') escape = true;
      else if (c === '"') inString = false; continue; }
    if (c === '"') { inString = true; continue; }
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}') { depth--; if (depth === 0 && start >= 0) {
      items.push(JSON.parse(text.slice(start, i + 1))); start = -1;
    } }
    else if (c === ']' && depth === 0) break;
  }
  return items;
}
for (const trial of ['v221r3', 'v223']) {
  const progress = JSON.parse(await fs.readFile(join(base, `common-${trial}-B-kimi-shadow-progress.private.json`), 'utf8'));
  if (!progress.finishedAt || progress.status !== 'failed') throw Error('ONLY_TERMINAL_FAILED_TRIALS');
  const dir = join(base, 'B/kimi-code-revision-shadow-' + trial);
  const sent = progress.events.find(e => e.type === 'prompt_sent');
  const { stdout } = await exec('/Users/rualoud/.kimi-code/bin/kimi',
    ['session', 'list', '--cwd', dir, '--limit', '10', '--json'], { cwd: dir, maxBuffer: 50000 });
  const session = JSON.parse(stdout).find(s => s.id === sent.kimiSessionId && resolve(s.workDir) === resolve(dir));
  if (!session) throw Error('EXACT_SESSION_NOT_FOUND');
  const wire = (await fs.readFile(join(session.sessionDir, 'agents/main/wire.jsonl'), 'utf8'))
    .split('\n').filter(Boolean).map(JSON.parse);
  const message = wire.filter(e => e.type === 'agent.message.appended'
    && e.message?.message?.role === 'assistant').at(-1)?.message.message;
  const publicText = (message?.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const request = JSON.parse(await fs.readFile(join(dir, 'turn-01.request.private.json'), 'utf8'));
  const schema = request.responseFormat.schema;
  const expectedPaths = schema.properties.repairs.items.properties.claimPath.enum;
  const items = completeItems(publicText);
  const issues = items.flatMap((item, index) => validate(schema.properties.repairs.items, item).issues.map(issue => ({ index, issue })));
  const seen = new Set();
  for (const item of items) {
    if (seen.has(item.claimPath)) issues.push({ code: 'duplicate_claim_path', claimPath: item.claimPath });
    seen.add(item.claimPath);
  }
  let fullParseable = false;
  try { JSON.parse(normalizeProviderJsonDocumentV1(publicText).text); fullParseable = true; } catch {}
  const row = { trial, sessionId: session.id, sourceContextHash: request.contextHash,
    sourcePlanHash: progress.sourcePlanHash, publicTextHash: hash(publicText), publicCharacters: publicText.length,
    fullParseable, completeItemCount: items.length, expectedItemCount: expectedPaths.length,
    completePaths: items.map(item => item.claimPath), missingPaths: expectedPaths.filter(path => !seen.has(path)),
    itemSchemaIssues: issues, originalDraftUnchanged: progress.originalDraftUnchanged,
    sourceOutcome: 'cancelled_incomplete_not_accepted', chargeStatus: 'unknown',
    requiresCompleteReplyAndIndependentReview: true, trainingTruth: false };
  await fs.writeFile(join(dir, 'turn-01.public-interrupted.private.txt'), publicText, { flag: 'wx', mode: 0o600 });
  await fs.writeFile(join(dir, 'turn-01.complete-prefix.private.json'), JSON.stringify({ ...row, items }), { flag: 'wx', mode: 0o600 });
  report.rows.push(row);
}
await fs.writeFile(dest, JSON.stringify(report, null, 2), { mode: 0o600 });
console.log(JSON.stringify(report));
