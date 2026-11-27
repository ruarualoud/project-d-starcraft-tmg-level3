// Development-only navigation and evidence summaries. Never controls a game/Provider.
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

export const navigationBudgets = [
  { path: 'CURRENT_WORK.md', maxLines: 120, maxBytes: 16384,
    requiredSnippets: ['## Active phase', '## Navigation'] },
  { path: 'AGENTS.md', maxLines: 120, maxBytes: 8192,
    requiredSnippets: ['CURRENT_WORK.md'] },
];
export function validateNavigation(text, budget) {
  const bytes = Buffer.byteLength(text), lines = text.split('\n').length;
  const missing = budget.requiredSnippets.filter(s => !text.includes(s));
  return { ok: bytes <= budget.maxBytes && lines <= budget.maxLines && !missing.length,
    bytes, lines, missing };
}
export function assertNavigation(text, name = 'CURRENT_WORK.md') {
  const budget = navigationBudgets.find(b => b.path === name);
  if (!budget) throw Error('UNKNOWN_NAVIGATION_FILE');
  const result = validateNavigation(text, budget);
  if (!result.ok) throw Error(`NAVIGATION_BUDGET: ${name} ${JSON.stringify(result)}`);
  return result;
}
export async function readBounded(file, maximumBytes) {
  const handle = await fs.open(file, 'r');
  try {
    const stat = await handle.stat();
    const buffer = Buffer.alloc(Math.min(stat.size, maximumBytes));
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (!bytesRead) break;
      offset += bytesRead;
    }
    return { bytes: stat.size, bytesRead: offset, truncated: stat.size > offset,
      text: new TextDecoder().decode(buffer.subarray(0, offset), { stream: stat.size > offset }) };
  } finally { await handle.close(); }
}
export async function readJson(file, maximumBytes = 128 * 1024) {
  const source = await readBounded(file, maximumBytes);
  if (source.truncated) throw Error('JSON_INPUT_TOO_LARGE: select a smaller artifact or explicit limit');
  return JSON.parse(source.text);
}
export function boundedOutput(value, maximumBytes = 16384) {
  const text = JSON.stringify(value, null, 2);
  if (Buffer.byteLength(text) > maximumBytes) throw Error('OUTPUT_TOO_LARGE: select fewer fields; no partial JSON emitted');
  return text;
}
// Validate before touching the destination; a failed write leaves its original intact.
// Failed temporary files are retained for diagnosis, never silently deleted.
export async function atomicWrite(file, text, { validate = () => {}, beforeReplace } = {}) {
  await validate(text);
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.pending-${randomUUID()}`;
  const handle = await fs.open(temporary, 'wx', 0o600);
  try { await handle.writeFile(text); await handle.sync(); } finally { await handle.close(); }
  await beforeReplace?.(temporary);
  await fs.rename(temporary, file);
  return { file, bytes: Buffer.byteLength(text) };
}
export async function prependRecord(file, record, { beforeReplace } = {}) {
  if (Buffer.byteLength(record) > 2048) throw Error('BOOKKEEPING_ENTRY_TOO_LARGE: link the report');
  const before = await fs.readFile(file, 'utf8');
  const prefix = `${record.trim()}\n\n`;
  if (before.startsWith(prefix)) return { reused: true };
  return atomicWrite(file, prefix + before, { beforeReplace: async temporary => {
    if (await fs.readFile(file, 'utf8') !== before) throw Error('BOOKKEEPING_CONCURRENT_CHANGE');
    await beforeReplace?.(temporary);
  } });
}

const facets = ['implementation', 'productHandoff', 'liveOutput', 'strategyEffect'];
export function isDevelopmentWorkId(id) {
  return typeof id === 'string' && /^T[1-9]\d*(?:\/S[1-9]\d*|-W[1-9]\d*-[0-9]{2})?$/u.test(id);
}

export function isDevelopmentBoundaryRef(ref) {
  return typeof ref === 'string' && /^build\/(?:[a-z0-9][a-z0-9_.-]*\/)+boundary\.json$/iu.test(ref);
}

export function compareDevelopmentWorkIds(activeId, goalId) {
  if (!isDevelopmentWorkId(activeId) || !isDevelopmentWorkId(goalId)) throw Error('DEVELOPMENT_WORK_ID_INVALID');
  const ticketId = activeId.split(/[/\-]/u, 1)[0];
  return goalId === activeId || goalId === ticketId ? 'matches' : 'different_work';
}
const allowed = {
  implementation: ['not_started', 'partial', 'implemented'],
  productHandoff: ['not_run', 'partial', 'passed', 'failed'],
  liveOutput: ['not_run', 'partial', 'produced', 'blocked', 'not_applicable'],
  strategyEffect: ['not_measured', 'inconclusive', 'no_measured_advantage', 'improved', 'not_applicable'],
};
export function validateProgress(state) {
  if (state.version !== 1 || !state.ticket || !state.slice || !state.next?.length) throw Error('PROGRESS_HEADER_REQUIRED');
  if (state.activeWork !== undefined && (!isDevelopmentWorkId(state.activeWork?.id)
    || (state.activeWork.boundaryRef !== undefined && !isDevelopmentBoundaryRef(state.activeWork.boundaryRef)))) {
    throw Error('PROGRESS_ACTIVE_WORK_INVALID');
  }
  if (!Array.isArray(state.items) || !state.items.length) throw Error('PROGRESS_ITEMS_REQUIRED');
  const ids = new Set();
  for (const item of state.items) {
    if (!item.id || ids.has(item.id)) throw Error('PROGRESS_ID_INVALID');
    ids.add(item.id);
    for (const facet of facets) {
      const value = item[facet];
      if (!value || !allowed[facet].includes(value.status) || !value.note || !Array.isArray(value.evidence)) {
        throw Error(`PROGRESS_FACET_REQUIRED: ${item.id}/${facet}`);
      }
      if (['implemented', 'passed', 'produced', 'improved'].includes(value.status) && !value.evidence.length) {
        throw Error(`PROGRESS_EVIDENCE_REQUIRED: ${item.id}/${facet}`);
      }
    }
    if (item.strategyEffect.status === 'improved') {
      if (item.liveOutput.status !== 'produced' || !item.evaluation?.independent ||
          !item.evaluation?.scopeVerified || !item.evaluation?.consumerVerified ||
          !item.evaluation?.cleanEvidence || item.evaluation?.coversChangedBehavior !== true) {
        throw Error('STRATEGY_CLAIM_OUTSIDE_EVIDENCE');
      }
    }
  }
  return state;
}
export function experimentCoverage(experiment) {
  const { start, end, phasesCompleted = [], memory, dice, consumers, evidence = [] } = experiment;
  if (!start || !end || !memory || !dice || !Array.isArray(consumers) || !evidence.length) {
    throw Error('EXPERIMENT_CONDITIONS_REQUIRED');
  }
  const phases = ['setup', 'movement', 'assault', 'cleanup'];
  const fullRound = start.phase === 'setup' && start.boundary === 'before' &&
    phases.every(p => phasesCompleted.includes(p)) &&
    ((end.round === start.round && end.phase === 'cleanup' && end.boundary === 'after') ||
      (end.round === start.round + 1 && end.phase === 'setup' && end.boundary === 'before'));
  return { ...experiment, coverage: fullRound ? 'full_round' : 'partial_round',
    fullRound, strategyImprovementProven: false };
}
const labels = {
  not_started: '未开始', partial: '部分完成', implemented: '已实现', not_run: '未执行',
  passed: '已通过', failed: '失败', produced: '已产出', blocked: '暂停/阻塞',
  not_applicable: '不适用', not_measured: '未测效果', inconclusive: '未能证明',
  no_measured_advantage: '未测出优势', improved: '已证改善',
};
export function renderCurrent(state) {
  validateProgress(state);
  const rows = state.items.map(i => `| ${i.title} | ${facets.map(f => labels[i[f].status]).join(' | ')} |`);
  const text = [
    '# StarCraft 当前工作', '', '## Active phase', '',
    ...(state.activeWork ? [`当前执行 ${state.activeWork.id}。`] : []),
    `Ticket ${state.ticket} / Slice ${state.slice}；整体 ${state.completion}；剩余 ${state.remainingSlices.join('、')}。`,
    `状态日期：${state.updatedAt}。本页由 coordination/current-development.json 生成，不追加历史。`,
    '', state.summary, '', `运行限制：${state.runPolicy}`, '',
    '| 工作 | 实现 | 产品交接 | 真实产出 | 策略效果 |',
    '|---|---|---|---|---|', ...rows, '',
    '下一步：', ...state.next.map((s, i) => `${i + 1}. ${s}`), '',
    '## Navigation', '',
    ...state.navigation.map(n => `- ${n.when}：[${n.title}](${n.path})`), '',
    '状态、证据范围与未覆盖消费者见 JSON 的各分项；文档状态不代表进程仍在运行。', '',
  ].join('\n');
  assertNavigation(text);
  return text;
}
export async function writeCurrent(worktree, state) {
  const text = renderCurrent(state); // Both validations precede any state write.
  await atomicWrite(path.join(worktree, 'coordination/current-development.json'), JSON.stringify(state, null, 2)+'\n');
  await atomicWrite(path.join(worktree, 'CURRENT_WORK.md'), text, { validate: assertNavigation });
  return { bytes: Buffer.byteLength(text), items: state.items.length };
}
