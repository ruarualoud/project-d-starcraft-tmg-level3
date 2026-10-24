// Bounded, read-only development context. No process, network or Provider calls.
import fs from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const worktree = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectRoot = basename(dirname(worktree)) === '.worktrees'
  ? resolve(worktree, '../../..') : resolve(worktree, '..');
const OUTPUT_LIMIT = 16 * 1024;

function clip(text, bytes) {
  if (Buffer.byteLength(text) <= bytes) return text;
  let result = '';
  let used = 0;
  for (const character of text) {
    const size = Buffer.byteLength(character);
    if (used + size > bytes - 24) break;
    result += character;
    used += size;
  }
  return `${result}\n[excerpt shortened]`;
}

async function readPrefix(path, maximumBytes) {
  const file = await fs.open(path, 'r');
  try {
    const stat = await file.stat();
    const buffer = Buffer.alloc(Math.min(stat.size, maximumBytes));
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await file.read(buffer, offset, buffer.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    return { bytes: stat.size, bytesRead: offset, truncated: stat.size > offset,
      text: new TextDecoder('utf-8').decode(buffer.subarray(0, offset), { stream: stat.size > offset }) };
  } finally { await file.close(); }
}

export async function inspectDevelopmentContext() {
  const sources = [];
  let current;
  try {
    const source = await readPrefix(join(worktree, 'CURRENT_WORK.md'), 12 * 1024);
    current = source.text;
    sources.push({ file: 'CURRENT_WORK.md', bytes: source.bytes, bytesRead: source.bytesRead,
      truncated: source.truncated });
  } catch (error) { current = `CURRENT_WORK.md unavailable: ${error.code}`; }
  const excerpts = {};
  for (const name of ['PROJECT_MEMORY.md', 'TASKS.md']) {
    try {
      const source = await readPrefix(join(projectRoot, name), 64 * 1024);
      // Select complete recent bullet records only. Never interpret a partial tail as a complete entry.
      const text = source.truncated
        ? source.text.slice(0, Math.max(0, source.text.lastIndexOf('\n- '))) : source.text;
      const records = text.split(/\n(?=- )/)
        .filter(entry => /^- (?:\[[^\]]+\] )?(?:\*\*)?StarCraft\b/i.test(entry));
      excerpts[name] = records.slice(0, 2).map(entry => clip(entry.trim(), 1000));
      sources.push({ file: name, bytes: source.bytes, bytesRead: source.bytesRead,
        truncated: source.truncated, selectedEntries: excerpts[name].length });
      if (!records.length) excerpts[name] = ['No complete StarCraft entry in the bounded prefix; search this file explicitly if needed.'];
    } catch (error) { excerpts[name] = [`Unavailable: ${error.code}; no fallback to another project.`]; }
  }
  const result = {
    observedAt: new Date().toISOString(), worktree, current, excerpts, sources,
    limits: { outputBytes: OUTPUT_LIMIT, historyPrefixBytesPerFile: 64 * 1024 },
    note: 'Document snapshot, not live process verification. Latest user instruction wins. No run, resume, model or credential access. History and product data are unchanged.',
  };
  // Independent from the existing CURRENT_WORK size gate; even escaped text has
  // a bounded serialized output. A shortened excerpt is explicitly marked.
  for (const budget of [6000, 3000, 1000, 250]) {
    if (Buffer.byteLength(JSON.stringify(result, null, 2)) < OUTPUT_LIMIT) break;
    result.current = clip(current, budget);
    result.excerpts = Object.fromEntries(Object.entries(excerpts)
      .map(([name, entries]) => [name, entries.map(entry => clip(entry, Math.max(100, Math.floor(budget / 4))))]));
    result.outputShortened = true;
  }
  if (Buffer.byteLength(JSON.stringify(result, null, 2)) >= OUTPUT_LIMIT) {
    throw Error('CONTEXT_OUTPUT_LIMIT: inspect CURRENT_WORK.md directly; no history dump.');
  }
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  console.log(JSON.stringify(await inspectDevelopmentContext(), null, 2));
}
