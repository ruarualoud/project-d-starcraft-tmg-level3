// Read-only reporting sidecar; never imported by the live Host or Rules runtime.
import { readFile, stat, writeFile, rename } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import path from 'node:path';

const [handlesFile, ownerFile, outputDirectory, mode = '--once'] = process.argv.slice(2);
if (!handlesFile || !ownerFile || !outputDirectory || !['--once', '--watch'].includes(mode)) {
  throw Error('ROUND_TIMING_ARGUMENTS_REQUIRED');
}
const handles = JSON.parse(await readFile(handlesFile, 'utf8'));
const owner = JSON.parse(await readFile(ownerFile, 'utf8'));
const reportEpoch = path.basename(ownerFile).replace(/-independent-monitor-start\.private\.json$/, '');
const epochStartMs = Date.parse(owner.launchAt);
if (!Number.isFinite(epochStartMs) || handles.sourceVersion !== owner.sourceVersion) {
  throw Error('ROUND_TIMING_OWNER_SOURCE_MISMATCH');
}
for (const row of handles.rows) {
  const original = path.resolve(path.dirname(row.progressPath));
  const out = path.resolve(outputDirectory);
  if (out === original || out.startsWith(original + path.sep)) {
    throw Error('ROUND_TIMING_OUTPUT_MUST_NOT_OVERWRITE_ORIGINAL_ROOM');
  }
  const entry = JSON.parse(await readFile(row.entryPath, 'utf8'));
  if (path.resolve(entry.dataDirectory) !== original || typeof entry.roomId !== 'string') {
    throw Error('ROUND_TIMING_ENTRY_DIRECTORY_MISMATCH');
  }
  row.entryRoomId = entry.roomId;
}

function lines(text) {
  // A concurrent append may expose an incomplete final line; preserve its source.
  const complete = text.endsWith('\n') ? text : text.slice(0, text.lastIndexOf('\n') + 1);
  return complete.split('\n').filter(Boolean).map(line => JSON.parse(line));
}
function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.ceil(fraction * sorted.length) - 1];
}
function summarize(row, accepted, stages) {
  const observed = stages.filter(s => s.schemaVersion
    === 'starcraft_tmg_hosted_bot_stage_observation_v1'
    && Date.parse(s.recordedAt) >= epochStartMs);
  const timed = [];
  for (let index = 0; index < accepted.length; index++) {
    const action = accepted[index];
    if (action.postStateRevision <= row.initialActions) continue;
    const events = observed.filter(s => s.lastObservedStateRevision
      === action.postStateRevision - 1 && s.seatKey === action.sideKey);
    const endIndex = events.findLastIndex(s => s.operation === 'record_outcome');
    const end = events[endIndex];
    const beforeEnd = events.slice(0, endIndex + 1);
    const decisionIndex = beforeEnd.findLastIndex(s => s.operation === 'agent_decision');
    const decision = beforeEnd[decisionIndex];
    const selected = decisionIndex >= 0 ? beforeEnd.slice(decisionIndex) : [];
    const operations = Object.fromEntries(selected.map(s => [s.operation, s.elapsedMs]));
    const complete = Boolean(end && decision && action.replayMatchesCurrent === true
      && ['preview_action', 'apply_action', 'replay_room', 'record_outcome']
        .every(k => Number.isFinite(operations[k]) && operations[k] >= 0));
    const startMs = complete ? Date.parse(decision.recordedAt) - decision.elapsedMs : null;
    const endMs = complete ? Date.parse(end.recordedAt) : null;
    const preRound = accepted[index - 1]?.round ?? action.round;
    timed.push({ revision: action.postStateRevision, preRound, postRound: action.round,
      preActionPhase: action.phase, sideKey: action.sideKey, actionType: action.actionType,
      receiptHash: action.receiptHash, replayMatchesCurrent: action.replayMatchesCurrent,
      modelDecision: action.modelDecision, timingStatus: complete ? 'complete_recorded_chain'
        : 'accepted_without_complete_epoch_timing',
      startAt: complete ? new Date(startMs).toISOString() : null,
      endAt: complete ? new Date(endMs).toISOString() : null,
      decisionToReplayedOutcomeWallMs: complete ? endMs - startMs : null,
      recordedOperations: operations,
      association: 'same_seat_and_pre_revision_to_single_accepted_post_revision',
      stageEventsContainReceiptHash: false,
      screenshot: action.boardScreenshot, observedScreenshotRevision:
        action.screenshotObservedStateRevision });
  }
  const maxRound = Math.max(...accepted.map(a => a.round));
  const rounds = [...new Set(accepted.map(a => a.round))].sort((a, b) => a - b).map(round => {
    const subset = timed.filter(t => t.preRound === round);
    const measured = subset.filter(t => t.timingStatus === 'complete_recorded_chain');
    const values = measured.map(t => t.decisionToReplayedOutcomeWallMs);
    return { round, boundaryStatus: round < maxRound ? 'next_round_observed' : 'in_progress',
      epochAcceptedActionCount: subset.length, epochMeasuredActionCount: measured.length,
      epochDecisionToOutcomeSumMs: values.reduce((a, b) => a + b, 0),
      epochRecordedP50Ms: percentile(values, .5), epochRecordedP95Ms: percentile(values, .95),
      fullRoundComparableWallMs: null,
      fullRoundTimingStatus: 'not_certified_across_prior_versions_and_pause_recovery',
      recoverySetupExcluded: true, nestedQueryWorkerEventsExcluded: true,
      uiCaptureAndBetweenActionTimeNotInActionSum: true };
  });
  return { schemaVersion: 'ticket23_live_round_timing_v2', arm: row.arm,
    roomId: row.entryRoomId, reportEpoch,
    sourceVersion: handles.sourceVersion, capturedAt: new Date().toISOString(),
    epochStartAt: owner.launchAt, originalProgressPath: row.progressPath,
    acceptedFrameCutoffRevision: accepted.at(-1)?.postStateRevision ?? null,
    lastAcceptedPostRound: maxRound, initialEpochRevision: row.initialActions,
    collectorProviderCalls: 0, originalRoomWrites: 0, rulesApply: 0,
    timingScope: 'recorded_epoch_decision_to_committed_replayed_outcome_only',
    recordedOperationsMayContainNestedReads: true,
    sumUsesWallIntervalsNotNestedOperationSums: true,
    includesMixedHistoricalRoundBoundaries: true, trainingTruth: false, rounds, actions: timed };
}

const versions = new Map();
async function refresh(force = false) {
  const summaries = [];
  for (const row of handles.rows) {
    const directory = path.dirname(row.progressPath);
    const file = path.join(directory, 'actions.ndjson');
    const version = (await stat(file)).mtimeMs;
    if (!force && versions.get(row.arm) === version) continue;
    const accepted = lines(await readFile(file, 'utf8'));
    const stages = lines(await readFile(path.join(directory, 'bot-stage-timings.ndjson'), 'utf8'));
    const frame = summarize(row, accepted, stages);
    if (!Number.isInteger(frame.acceptedFrameCutoffRevision)
      || frame.acceptedFrameCutoffRevision < row.initialActions) throw Error('ROUND_TIMING_FRAME_BEHIND_EPOCH');
    const target = path.join(outputDirectory, `${reportEpoch}-round-timing-${row.arm}.private.json`);
    await writeFile(target + '.tmp', JSON.stringify(frame, null, 2) + '\n', { mode: 0o600 });
    await rename(target + '.tmp', target);
    versions.set(row.arm, version);
    summaries.push({ arm: row.arm, revision: frame.acceptedFrameCutoffRevision,
      round: frame.lastAcceptedPostRound, measured: frame.actions.filter(a =>
        a.timingStatus === 'complete_recorded_chain').length, output: target });
  }
  return summaries;
}
async function birth(pid) {
  return new Promise((resolve, reject) => execFile('/bin/ps', ['-p', String(pid),
    '-o', 'pid=,lstart='], { shell: false }, (error, out) => {
      if (error && error.code !== 1) return reject(error);
      resolve(out.trim().replace(/\s+/g, ' '));
    }));
}
console.log(JSON.stringify({ reports: await refresh(true), collectorProviderCalls: 0,
  originalRoomWrites: 0, rulesApply: 0 }));
if (mode === '--watch') {
  const ownerBirth = await birth(owner.pid);
  if (!ownerBirth) throw Error('ROUND_TIMING_MONITOR_NOT_LIVE');
  const abort = new AbortController();
  process.once('SIGTERM', () => abort.abort());
  while (!abort.signal.aborted && await birth(owner.pid) === ownerBirth) {
    try { await sleep(40000, undefined, { signal: abort.signal }); }
    catch (e) { if (e.name !== 'AbortError') throw e; break; }
    if (await birth(owner.pid) !== ownerBirth) break;
    await refresh();
  }
}
