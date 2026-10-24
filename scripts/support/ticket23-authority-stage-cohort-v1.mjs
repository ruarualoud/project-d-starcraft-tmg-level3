// Offline timing correlation only. The caller first checks native round bounds,
// journal continuity, Replay and original images; this module grants no authority.
import { lstat } from 'node:fs/promises';
import path from 'node:path';

const authorityOperations = ['preview_action', 'apply_action', 'replay_room'];
const decisionOperations = ['agent_decision', 'prepare_plan', ...authorityOperations, 'record_outcome'];
const timingSchema = 'starcraft_tmg_hosted_bot_stage_observation_v1';

function measuredStage(rows, operation) {
  const candidates = rows.filter(row => row.operation === operation);
  if (candidates.length !== 1) return { operation, status: 'pending', candidates,
    reason: `${candidates.length ? 'ambiguous' : 'missing'}_stage:${operation}` };
  const row = candidates[0];
  const endMs = Date.parse(row.recordedAt);
  if (!Number.isFinite(endMs) || !Number.isFinite(row.elapsedMs) || row.elapsedMs < 0) {
    return { operation, status: 'pending', candidates, reason: `invalid_stage:${operation}` };
  }
  return { operation, status: 'complete', elapsedMs: row.elapsedMs,
    recordedAt: row.recordedAt, startMs: endMs - row.elapsedMs, endMs };
}

function ordered(stages) {
  return stages.every((row, index) => !index || stages[index - 1].endMs <= row.startMs + 2);
}

async function webEvidenceSpan(directory, ui) {
  if (ui.historicalUiReconstructionRequired === true) {
    return { status: 'pending', reason: 'historical_ui_reconstruction_not_live_latency' };
  }
  const groups = [
    [ui.preActionScreenshot, ui.preActionBoardScreenshot, ui.preActionControlScreenshot],
    [ui.screenshot, ui.boardScreenshot, ui.controlScreenshot],
  ];
  const timestamps = [];
  const root = path.resolve(directory);
  for (const paths of groups) {
    const times = [];
    for (const relative of paths) {
      if (typeof relative !== 'string' || !relative) {
        return { status: 'pending', reason: 'original_ui_timing_image_missing' };
      }
      const filename = path.resolve(root, relative);
      if (!filename.startsWith(root + path.sep)) {
        return { status: 'pending', reason: 'original_ui_timing_path_outside_room' };
      }
      try {
        const metadata = await lstat(filename);
        if (!metadata.isFile() || !Number.isFinite(metadata.mtimeMs)) {
          return { status: 'pending', reason: 'original_ui_timing_image_invalid' };
        }
        times.push(metadata.mtimeMs);
      } catch { return { status: 'pending', reason: 'original_ui_timing_image_unavailable' }; }
    }
    timestamps.push(Math.max(...times));
  }
  if (timestamps[1] < timestamps[0]) {
    return { status: 'pending', reason: 'original_ui_image_time_order_invalid' };
  }
  return { status: 'complete', elapsedMs: timestamps[1] - timestamps[0],
    startedAt: new Date(timestamps[0]).toISOString(), recordedAt: new Date(timestamps[1]).toISOString(),
    scope: 'last_pre_action_image_write_to_last_post_action_image_write',
    source: 'original_filesystem_image_write_times', exactClickLatencyCertified: false };
}

function grouped(rows, selectBands) {
  const groups = new Map();
  for (const row of rows) {
    const key = JSON.stringify([row.actionType, row.operation, row.decisionMode]);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return [...groups].map(([key, observations]) => {
    const eligible = observations.filter(row => row.status === 'capture_complete');
    return { type: JSON.parse(key), totalObservations: observations.length,
      successfulObservations: eligible.length, missingOrAmbiguousObservations: observations.length - eligible.length,
      selected: selectBands(eligible), pending: observations.filter(row => row.status !== 'capture_complete'),
      originalInputAndResultCaptureRequired: true };
  });
}

export async function buildTicket23AuthorityStageCohortV1({
  arm, round, actions, timings, uiByReceipt, directory, selectBands,
}) {
  if (typeof selectBands !== 'function') throw Error('AUTHORITY_COHORT_BAND_POLICY_REQUIRED');
  const captures = [];
  const stageObservations = [];
  const windowObservations = [];
  for (const { receipt } of actions) {
    const ui = uiByReceipt.get(receipt.journalHash) || {};
    const reasons = [];
    const uiMatches = ui.receiptHash === receipt.journalHash
      && ui.postStateRevision === receipt.postStateRevision
      && ui.postStateHash === receipt.postStateHash && ui.replayMatchesCurrent === true
      && ui.sideKey === receipt.applyingSeatKey;
    if (!uiMatches) reasons.push('original_ui_receipt_or_replay_mismatch');
    const rows = timings.filter(row => row.schemaVersion === timingSchema
      && row.roomId === receipt.roomId && row.seatKey === receipt.applyingSeatKey
      && row.lastObservedStateRevision === receipt.preStateRevision);
    const stages = decisionOperations.map(operation => measuredStage(rows, operation));
    const authorityStages = stages.filter(row => authorityOperations.includes(row.operation));
    reasons.push(...authorityStages.filter(row => row.reason).map(row => row.reason));
    const uniqueAuthority = authorityStages.every(row => row.status === 'complete');
    let authorityOrderValid = true;
    if (uniqueAuthority) {
      const acceptedAtMs = Date.parse(receipt.audit?.occurredAt);
      authorityOrderValid = ordered(authorityStages) && Number.isFinite(acceptedAtMs)
        // occurredAt is captured while constructing Apply input, before its
        // final persistence/dispatch; it need not be inside the measured call.
        && acceptedAtMs >= authorityStages[0].endMs - 2
        && acceptedAtMs <= authorityStages[1].endMs + 2;
      if (!authorityOrderValid) reasons.push('authority_stage_or_receipt_time_order_invalid');
    }
    const decisionMode = ui.modelDecision === true ? 'model'
      : ui.modelDecision === false ? 'forced' : 'unknown';
    const basis = { arm, round, roomId: receipt.roomId, seatKey: receipt.applyingSeatKey,
      preStateRevision: receipt.preStateRevision, preStateHash: receipt.preStateHash,
      postStateRevision: receipt.postStateRevision, postStateHash: receipt.postStateHash,
      receiptHash: receipt.journalHash, matchBindingHash: receipt.matchBindingHash,
      actionType: receipt.action.actionType, decisionMode };
    const capture = { ...basis, proposal: receipt.proposal, chanceReveal: receipt.chanceReveal,
      authorityTimingStatus: uiMatches && uniqueAuthority && authorityOrderValid ? 'complete' : 'pending',
      authorityStages, reasons, fullRoundEligibilityOwnedByCaller: true };
    const completeDecision = uiMatches && uniqueAuthority && authorityOrderValid
      && stages.every(row => row.status === 'complete') && ordered(stages);
    capture.decisionToMemoryWindow = completeDecision ? {
      status: 'complete', elapsedMs: stages.at(-1).endMs - stages[0].startMs,
      recordedAt: stages.at(-1).recordedAt,
      knownSequentialStagesElapsedMs: stages.reduce((sum, row) => sum + row.elapsedMs, 0),
      scope: 'agent_decision_start_to_record_outcome_end', includesProviderWait: true,
      providerCalls: ui.providerCalls ?? null,
      providerElapsedMs: ui.providerCalls === 0 ? 0 : null,
      fullOnlineActionLatencyCertified: false,
      excludedScopes: ['pre_decision_observation', 'post_outcome_UI'],
    } : { status: 'pending', reasons: stages.filter(row => row.reason).map(row => row.reason),
      fullOnlineActionLatencyCertified: false };
    capture.webEvidenceSpan = uiMatches ? await webEvidenceSpan(directory, ui)
      : { status: 'pending', reason: 'original_ui_receipt_or_replay_mismatch' };
    captures.push(capture);
    for (const stage of authorityStages) {
      stageObservations.push({ ...basis, operation: stage.operation,
        observationId: `${arm}:${round}:${receipt.journalHash}:${stage.operation}`,
        status: uiMatches && authorityOrderValid && stage.status === 'complete' ? 'capture_complete' : 'pending',
        elapsedMs: stage.elapsedMs ?? null, recordedAt: stage.recordedAt || receipt.audit?.occurredAt || '',
        timingEvidence: stage });
    }
    for (const [operation, window] of [
      ['decision_to_memory_window', capture.decisionToMemoryWindow],
      ['web_evidence_span', capture.webEvidenceSpan],
    ]) {
      windowObservations.push({ ...basis, operation,
        observationId: `${arm}:${round}:${receipt.journalHash}:${operation}`,
        status: window.status === 'complete' ? 'capture_complete' : 'pending',
        elapsedMs: window.elapsedMs ?? null, recordedAt: window.recordedAt || receipt.audit?.occurredAt || '',
        timingEvidence: window });
    }
  }
  return { captures, authorityStageCohort: grouped(stageObservations, selectBands),
    actionPipelineCohort: grouped(windowObservations, selectBands) };
}
