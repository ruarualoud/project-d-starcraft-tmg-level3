// Continue unstarted measurements only. The old queue drains its in-flight case
// and stops on the observation-metadata version change before launching another.
import { readFile, writeFile, mkdir, appendFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const [root, outputRoot] = process.argv.slice(2);
const matrixPath = path.join(outputRoot, 'matrix.private.json');
const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
const originalPath = path.join(outputRoot, 'progress.private.json');
const prior = JSON.parse(await readFile(originalPath, 'utf8'));
const observer = 'scripts/observe-ticket-23-real-model-action-performance-v1.mjs';
const externalGroup = prior.current?.tag || null;
const externalLane = matrix.groups.find(g => g.groupId === externalGroup)?.lane;
const pending = matrix.groups.filter(g => g.groupId !== externalGroup
  && !prior.completed.some(c => c.groupId === g.groupId));
const sourceHashes = {};
for (const [file, expected] of Object.entries(prior.sourceHashes)) {
  const actual = createHash('sha256').update(await readFile(path.join(root, file))).digest('hex');
  if (file !== observer && actual !== expected) throw Error('PRODUCT_SOURCE_CHANGED:' + file);
  sourceHashes[file] = actual;
}
const state = { schemaVersion: 'starcraft_tmg_parallel_performance_tail_v1',
  startedAt: new Date().toISOString(), status: 'running', maximumConcurrentActions: 3,
  externalGroup, sourceHashes, pending: pending.map(g => g.groupId), active: [], completed: [],
  repeatedTerminalCases: 0, providerRetries: 0, originalRoomWrites: 0, newGames: 0 };
let writeTail = Promise.resolve();
const save = () => writeTail = writeTail.then(() => writeFile(
  path.join(outputRoot, 'parallel-progress.private.json'), JSON.stringify(state, null, 2), { mode: 0o600 }));
const active = new Map();
const failures = new Map();
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const reservedByLane = {};
for (const lane of ['A', 'B', 'C']) {
  const ledger = prior.laneLedger[lane];
  const count = pending.filter(g => g.lane === lane).length + Number(externalLane === lane);
  reservedByLane[lane] = Math.floor((ledger.totalAuthorizedLimitCnyMicros
    - ledger.baseCostCnyMicros - ledger.carriedCostCnyMicros - ledger.newCostCnyMicros) / Math.max(1, count));
}
async function observe(group, reservedBudgetCnyMicros) {
  for (const [file, expected] of Object.entries(sourceHashes)) {
    if (createHash('sha256').update(await readFile(path.join(root, file))).digest('hex') !== expected)
      throw Error('MEASUREMENT_SOURCE_CHANGED:' + file);
  }
  const output = path.join(outputRoot, group.groupId);
  await mkdir(output, { mode: 0o700 }); // Exclusive: no old/current/finished case can enter.
  const stdout = createWriteStream(path.join(outputRoot, group.groupId + '.stdout.log'), { flags: 'wx', mode: 0o600 });
  const stderr = createWriteStream(path.join(outputRoot, group.groupId + '.stderr.log'), { flags: 'wx', mode: 0o600 });
  const job = spawn(process.execPath, [path.join(root, observer), root, matrixPath, group.groupId,
    output, String(reservedBudgetCnyMicros)], { cwd: root, shell: false,
    env: { ...process.env, STARCRAFT_TMG_MEASUREMENT_CONCURRENCY: 'three_action_shared_cpu_admission' },
    stdio: ['ignore', 'pipe', 'pipe'] });
  job.stdout.pipe(stdout); job.stderr.pipe(stderr);
  const launch = { groupId: group.groupId, pid: job.pid, startedAt: new Date().toISOString(),
    lane: group.lane, reservedBudgetCnyMicros, measurementConcurrency: 'three_action_shared_cpu_admission' };
  state.active.push(launch);
  await writeFile(path.join(outputRoot, group.groupId + '.launch.json'), JSON.stringify(launch), { mode: 0o600 });
  await save();
  const exit = await new Promise((resolve, reject) => {
    job.once('error', reject);
    job.once('exit', (exitCode, signal) => resolve({ exitCode, signal, completedAt: new Date().toISOString() }));
  });
  await Promise.all([new Promise(r => stdout.writableFinished ? r() : stdout.once('finish', r)),
    new Promise(r => stderr.writableFinished ? r() : stderr.once('finish', r))]);
  await writeFile(path.join(outputRoot, group.groupId + '.exit.json'), JSON.stringify(exit), { mode: 0o600 });
  const report = JSON.parse(await readFile(path.join(output, 'report.private.json'), 'utf8'));
  const record = { groupId: group.groupId, exit, status: report.status,
    failure: report.failure || report.result?.reason || null,
    completeProductCoreElapsedMs: report.completeProductCoreElapsedMs ?? null,
    providerRoundElapsedMs: report.providerRoundElapsedMs ?? null,
    nonProviderCoreElapsedMs: report.nonProviderCoreElapsedMs ?? null,
    newEstimatedCostCnyMicros: report.newEstimatedCostCnyMicros ?? null,
    newProviderAttempts: report.actualNewProviderAttemptCount ?? null,
    sampleCoverage: report.sampleCoverage || [], reportPath: path.join(output, 'report.private.json'),
    measurementConcurrency: 'three_action_shared_cpu_admission' };
  state.completed.push(record);
  state.active = state.active.filter(a => a.groupId !== group.groupId);
  await appendFile(path.join(outputRoot, 'completed.ndjson'), JSON.stringify(record) + '\n', { mode: 0o600 });
  if (report.commitUnknown) state.stopReason = 'commit_unknown';
  if (record.failure) {
    const count = (failures.get(record.failure) || 0) + 1;
    failures.set(record.failure, count);
    if (count >= 3) state.stopReason = 'three_same_failures:' + record.failure;
  }
  await save();
  console.log(JSON.stringify({ event: 'parallel_case_terminal', ...record }));
}
try {
  await save();
  let old;
  while (pending.length || active.size) {
    old = JSON.parse(await readFile(originalPath, 'utf8'));
    const externalActive = Boolean(old.current);
    while (!state.stopReason && active.size < 3 - Number(externalActive) && pending.length) {
      const index = pending.findIndex(g => !externalActive || g.lane !== externalLane);
      if (index < 0) break; // Do not overlap the old lane's unpartitioned paid budget.
      const [group] = pending.splice(index, 1);
      state.pending = pending.map(g => g.groupId);
      const laneLedger = old.laneLedger[group.lane];
      const remaining = laneLedger.totalAuthorizedLimitCnyMicros - laneLedger.baseCostCnyMicros
        - laneLedger.carriedCostCnyMicros - laneLedger.newCostCnyMicros
        - state.completed.filter(r => matrix.groups.find(g => g.groupId === r.groupId).lane === group.lane)
          .reduce((sum, r) => sum + (r.newEstimatedCostCnyMicros || 0), 0)
        - state.active.filter(a => a.lane === group.lane).reduce((sum, a) => sum + a.reservedBudgetCnyMicros, 0);
      const budget = Math.min(reservedByLane[group.lane], remaining);
      if (budget <= 0) { state.stopReason = 'authorized_lane_budget_exhausted:' + group.lane; break; }
      const promise = observe(group, budget).catch(error => {
        state.stopReason = String(error.code || error.message);
      }).finally(() => active.delete(group.groupId));
      active.set(group.groupId, promise);
    }
    if (state.stopReason && !active.size) break;
    await pause(250);
  }
  do { old = JSON.parse(await readFile(originalPath, 'utf8')); if (old.current) await pause(250); } while (old.current);
  if (!['measurements_finished', 'matrix_failed'].includes(old.status)
    || (old.status === 'matrix_failed' && old.failure !== 'MEASUREMENT_SOURCE_CHANGED:' + observer))
    throw Error('OLD_QUEUE_NOT_AT_EXPECTED_DRAIN_BOUNDARY:' + old.status);
  const all = [...old.completed, ...state.completed];
  if (state.stopReason || new Set(all.map(c => c.groupId)).size !== matrix.groupCount
    || all.length !== matrix.groupCount) throw Error(state.stopReason || 'INCOMPLETE_OR_DUPLICATED_MATRIX');
  const ledger = structuredClone(old.laneLedger);
  for (const row of state.completed) {
    const lane = matrix.groups.find(g => g.groupId === row.groupId).lane;
    if (row.newEstimatedCostCnyMicros !== null) ledger[lane].newCostCnyMicros += row.newEstimatedCostCnyMicros;
  }
  const merged = { ...old, status: 'measurements_finished', failure: null, current: null,
    completed: all, laneLedger: ledger, sourceHashes, preConcurrencySourceHashes: old.sourceHashes,
    measurementConcurrency: 'mixed_single_queue_then_three_action_shared_cpu',
    completedAt: new Date().toISOString(), observationOnlyDrainReason: old.failure || null };
  await writeFile(originalPath, JSON.stringify(merged, null, 2), { mode: 0o600 });
  state.status = 'measurements_finished';
} catch (error) {
  state.status = 'stopped'; state.failure = String(error.code || error.message); process.exitCode = 1;
} finally {
  state.completedAt = new Date().toISOString(); await save();
  console.log(JSON.stringify({ event: 'parallel_tail_terminal', status: state.status,
    completed: state.completed.length, failure: state.failure || null }));
}
