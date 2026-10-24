// Concrete regression probe for the retained C106 provider_request_too_large.
// No Provider call, room mutation, new fixture or generic validation suite.
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { compactQueryReceiptForPrompt } from '../packages/online-agent-session/live-flash-decision-port-v1.mjs';
import { restoreStarcraftTmgFormationFireFactsForPromptV1 } from '../packages/online-agent-session/spatial-query-prompt-projection-v1.mjs';
import { decodeStarcraftTmgGeometryColumnReuseV2 } from '../packages/online-agent-session/exact-geometry-column-reuse-v2.mjs';

const [root, batchRoot] = process.argv.slice(2);
const directory = path.join(root, 'packages/online-agent-session');
const readBefore = name => readFile(path.join(batchRoot, 'before-source',
  `packages__online-agent-session__${name}`), 'utf8');
function imports(source, replacements = {}) {
  return source.replace(/from\s+(["'])(\.{1,2}\/[^"']+)\1/g,
    (_match, quote, specifier) => `from ${quote}${replacements[specifier]
      || pathToFileURL(path.resolve(directory, specifier)).href}${quote}`);
}
const oldProjectionUrl = 'data:text/javascript;base64,' + Buffer.from(imports(
  await readBefore('spatial-query-prompt-projection-v1.mjs'))).toString('base64');
const oldLiveUrl = 'data:text/javascript;base64,' + Buffer.from(imports(
  await readBefore('live-flash-decision-port-v1.mjs'), {
    './spatial-query-prompt-projection-v1.mjs': oldProjectionUrl,
  })).toString('base64');
const old = await import(oldLiveUrl);
const receipts = JSON.parse(await readFile(path.join(batchRoot,
  'c106-captured-receipts.private.json'), 'utf8'));
function expand(value) {
  if (!value || typeof value !== 'object') return value;
  if (value.encoding === 'exact_geometry_columns_v1'
    || value.encoding === 'exact_geometry_column_reuse_v2') {
    return expand(decodeStarcraftTmgGeometryColumnReuseV2(value));
  }
  if (value.sharedIncomingFireFacts && Array.isArray(value.formationOptions)) {
    const { sharedIncomingFireFacts, ...rest } = value;
    return expand({ ...rest, formationOptions:
      restoreStarcraftTmgFormationFireFactsForPromptV1(value.formationOptions,
        sharedIncomingFireFacts) });
  }
  return Array.isArray(value) ? value.map(expand)
    : Object.fromEntries(Object.entries(value).map(([key, child]) => [key, expand(child)]));
}
const before = receipts.map(old.compactQueryReceiptForPrompt);
const after = receipts.map(compactQueryReceiptForPrompt);
const same = isDeepStrictEqual(expand(before), expand(after));
const bytes = value => Buffer.byteLength(JSON.stringify(value));
const result = {
  schemaVersion: 'starcraft_tmg_c106_exact_receipt_capacity_probe_v1',
  completedAt: new Date().toISOString(), providerCalls: 0, roomWrites: 0,
  receiptCount: receipts.length, sameCompleteRestoredProjectedFacts: same,
  rawReceiptBytes: bytes(receipts), beforeProjectedBytes: bytes(before),
  afterProjectedBytes: bytes(after),
  beforeEscapedContentBytes: bytes(JSON.stringify(before)),
  afterEscapedContentBytes: bytes(JSON.stringify(after)),
  estimatedRemainingPromptBytes: 1969355 - 1639021,
  actualCompleteTransportMeasured: false,
};
await writeFile(path.join(batchRoot, 'c106-capacity-probe.private.json'),
  JSON.stringify(result, null, 2), { mode: 0o600 });
console.log(JSON.stringify(result));
if (!same || result.afterProjectedBytes >= result.beforeProjectedBytes) process.exitCode = 1;
