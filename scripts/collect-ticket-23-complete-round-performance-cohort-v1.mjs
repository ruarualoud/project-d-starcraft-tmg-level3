// Offline observations only: no Rules execution, Provider call or Room write.
// Authority clocks define rounds; UI records do not invent missing transitions.
import { createReadStream } from 'node:fs';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createStarcraftTmgPrivatePayloadCodec } from
  '../packages/room-store/room-store-v1.mjs';
import { buildTicket23AuthorityStageCohortV1 } from
  './support/ticket23-authority-stage-cohort-v1.mjs';

const [evidenceDirectory, outputPath,
  manifestFilename = 'common-v17-source-manifest.private.json',
  handlesFilename = 'common-v17r2-live-process-handles.private.json'] = process.argv.slice(2);
if (!evidenceDirectory || !outputPath) throw new Error('EXPLICIT_EVIDENCE_AND_OUTPUT_REQUIRED');
// Pin the actual common version's recovery boundary. Older observations stay
// immutable; a correctness-only recovery must not relabel their partial round.
const manifestPath = path.join(evidenceDirectory, manifestFilename);
const handlesPath = path.join(evidenceDirectory, handlesFilename);
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const handles = JSON.parse(await readFile(handlesPath, 'utf8'));
if (!manifest.sourceVersion || handles.sourceVersion !== manifest.sourceVersion) {
  throw new Error('COHORT_SOURCE_VERSION_MISMATCH');
}

async function readRows(filename) {
  const stream = createReadStream(filename, { encoding: 'utf8' });
  const lines = createInterface({ input: stream, crlfDelay: Infinity });
  const rows = [];
  let lastLine = null;
  let omittedIncompleteTail = false;
  try {
    // Delay one line so only an incomplete concurrently appended tail may be
    // omitted. Malformed earlier records remain errors, never silent omissions.
    for await (const line of lines) {
      if (lastLine?.trim()) rows.push(JSON.parse(lastLine));
      lastLine = line;
    }
    if (lastLine?.trim()) {
      try { rows.push(JSON.parse(lastLine)); }
      catch { omittedIncompleteTail = true; }
    }
  } finally { lines.close(); stream.destroy(); }
  return { rows, omittedIncompleteTail };
}

function acceptedSuffix(directory, boundary) {
  const db = new DatabaseSync(path.join(directory, 'room.sqlite'), { readOnly: true });
  let codec;
  const receipts = [];
  try {
    db.exec('BEGIN');
    const head = db.prepare('SELECT state_revision,private_sequence FROM sc_rooms WHERE room_id=?')
      .get(boundary.roomId);
    if (!head) throw new Error('COHORT_ORIGINAL_ROOM_MISSING');
    for (const row of db.prepare('SELECT sequence,payload_cipher FROM sc_private_journal WHERE room_id=? AND sequence<=? ORDER BY sequence')
      .iterate(boundary.roomId, head.private_sequence)) {
      // The codec is passed locally by the caller; keys are never retained in
      // this report or returned together with the original observations.
      codec ||= boundary.codecForCipher(row.payload_cipher);
      const item = codec.decode(row.payload_cipher, `room:${boundary.roomId}:private:${row.sequence}`);
      if (item.type !== 'accepted_transition') continue;
      const receipt = item.payload?.receipt;
      if (Number(receipt?.postStateRevision) <= boundary.revision) continue;
      receipts.push({ sequence: row.sequence, receipt });
    }
    const problems = [];
    let revision = boundary.revision;
    let stateHash = boundary.stateHash;
    for (const { receipt } of receipts) {
      if (receipt.roomId !== boundary.roomId || receipt.preStateRevision !== revision
        || receipt.postStateRevision !== revision + 1 || receipt.preStateHash !== stateHash) {
        problems.push({ reason: 'accepted_suffix_discontinuity', expectedRevision: revision,
          observedPreRevision: receipt.preStateRevision, observedPostRevision: receipt.postStateRevision });
      }
      revision = receipt.postStateRevision;
      stateHash = receipt.postStateHash;
    }
    if (revision !== Number(head.state_revision)) problems.push({ reason: 'journal_does_not_reach_captured_head' });
    if (Number(db.prepare('SELECT total_changes() AS n').get().n) !== 0) {
      throw new Error('COHORT_ORIGINAL_DATABASE_CHANGED');
    }
    db.exec('COMMIT');
    return { receipts, problems, capturedRevision: Number(head.state_revision) };
  } finally { db.close(); }
}

async function imagePresent(directory, relativePath) {
  if (!relativePath || typeof relativePath !== 'string') return false;
  const image = path.resolve(directory, relativePath);
  if (!image.startsWith(path.resolve(directory) + path.sep)) return false;
  try { return (await stat(image)).isFile(); } catch { return false; }
}

function selectBands(rows) {
  const sorted = [...rows].sort((a, b) => a.elapsedMs - b.elapsedMs
    || a.recordedAt.localeCompare(b.recordedAt));
  if (!sorted.length) return [];
  const selected = new Map();
  for (const [band, index] of [['short', 0], ['median', Math.floor((sorted.length - 1) / 2)],
    ['extreme', sorted.length - 1]]) {
    const row = sorted[index];
    if (!selected.has(row.observationId)) selected.set(row.observationId, { ...row, bands: [] });
    selected.get(row.observationId).bands.push(band);
  }
  return [...selected.values()];
}

const arms = [];
for (const arm of ['A', 'B', 'C']) {
  const handle = handles.rows.find(row => row.arm === arm);
  const originalBoundary = manifest.resumeBoundaries.find(row => row.arm === arm);
  if (!handle?.progressPath || !originalBoundary) throw new Error(`COHORT_ARM_EVIDENCE_MISSING:${arm}`);
  const directory = path.dirname(handle.progressPath);
  const privateState = JSON.parse(await readFile(path.join(directory, 'runner-private.json'), 'utf8'));
  if (privateState.roomId !== originalBoundary.roomId) throw new Error(`COHORT_ROOM_ID_MISMATCH:${arm}`);
  const journal = acceptedSuffix(directory, { ...originalBoundary,
    codecForCipher(cipher) { return createStarcraftTmgPrivatePayloadCodec({
      key: privateState.storeEncryptionKeyBase64, keyId: JSON.parse(cipher).keyId,
    }); } });
  const actionRows = await readRows(path.join(directory, 'actions.ndjson'));
  const timings = await readRows(path.join(directory, 'bot-stage-timings.ndjson'));
  const byReceipt = new Map(actionRows.rows.map(row => [row.receiptHash, row]));
  const rounds = [...new Set(journal.receipts.map(({ receipt }) => receipt.preGameClock?.round))]
    .filter(round => Number.isSafeInteger(round) && round > originalBoundary.round);
  const roundEvidence = [];
  const cohort = [];
  const authorityStageCapture = [];
  const authorityStageCohort = [];
  const actionPipelineCohort = [];
  for (const round of rounds) {
    const start = journal.receipts.find(({ receipt }) => receipt.preGameClock?.round === round - 1
      && receipt.postGameClock?.round === round);
    const finish = journal.receipts.find(({ receipt }) => receipt.preGameClock?.round === round
      && receipt.postGameClock?.round === round + 1);
    const actions = journal.receipts.filter(({ receipt }) => receipt.preGameClock?.round === round);
    const missingUi = [];
    for (const { receipt } of actions) {
      const ui = byReceipt.get(receipt.journalHash);
      if (!ui || ui.postStateRevision !== receipt.postStateRevision
        || ui.postStateHash !== receipt.postStateHash || ui.replayMatchesCurrent !== true
        || !(await imagePresent(directory, ui.boardScreenshot))
        || !(await imagePresent(directory, ui.controlScreenshot))) {
        missingUi.push(receipt.postStateRevision);
      }
    }
    const complete = Boolean(start && finish && !journal.problems.length && !missingUi.length);
    roundEvidence.push({ round, complete, acceptedActions: actions.length,
      enteringReceiptHash: start?.receipt.journalHash || null,
      closingReceiptHash: finish?.receipt.journalHash || null,
      missingUiRevisions: missingUi, reasons: [!start && 'entry_boundary_missing',
        !finish && 'round_not_closed', journal.problems.length > 0 && 'journal_discontinuous',
        missingUi.length > 0 && 'original_ui_evidence_pending'].filter(Boolean) });
    if (!complete) continue;
    const actionByPreRevision = new Map(actions.map(({ receipt }) => [receipt.preStateRevision, receipt]));
    const groups = new Map();
    for (const timing of timings.rows) {
      if (timing.operation !== 'spatial_query_backend' || timing.roomId !== originalBoundary.roomId
        || !timing.queryReceiptHash || !Number.isFinite(timing.elapsedMs) || timing.elapsedMs < 0) continue;
      const receipt = actionByPreRevision.get(timing.stateRevision);
      if (!receipt) continue;
      const groupKey = JSON.stringify([receipt.action.actionType, timing.queryKind]);
      if (!groups.has(groupKey)) groups.set(groupKey, []);
      groups.get(groupKey).push({ observationId: `${arm}:${round}:${timing.stateRevision}:${timing.queryReceiptHash}:${timing.recordedAt}`,
        arm, round, roomId: timing.roomId, preStateRevision: timing.stateRevision,
        preStateHash: receipt.preStateHash, actionType: receipt.action.actionType,
        queryKind: timing.queryKind, queryReceiptHash: timing.queryReceiptHash,
        status: timing.status, elapsedMs: timing.elapsedMs, seatKey: timing.seatKey,
        recordedAt: timing.recordedAt, receiptHash: receipt.journalHash });
    }
    for (const [groupKey, rows] of groups) {
      // A fast failure/unknown response never stands in for a successful
      // computation. Keep those counts and require complete input capture next.
      const eligible = rows.filter(row => ['exact', 'advisory_estimate'].includes(row.status));
      cohort.push({ type: JSON.parse(groupKey), totalObservations: rows.length,
        successfulObservations: eligible.length, unknownOrFailedObservations: rows.length - eligible.length,
        selected: selectBands(eligible), originalInputAndResultCaptureRequired: true });
    }
    const authorityCapture = await buildTicket23AuthorityStageCohortV1({
      arm, round, actions, timings: timings.rows, uiByReceipt: byReceipt,
      directory, selectBands,
    });
    authorityStageCapture.push(...authorityCapture.captures);
    authorityStageCohort.push(...authorityCapture.authorityStageCohort);
    actionPipelineCohort.push(...authorityCapture.actionPipelineCohort);
  }
  arms.push({ arm, roomId: originalBoundary.roomId, originalDirectory: directory,
    capturedRevision: journal.capturedRevision, sourceVersion: manifest.sourceVersion,
    partialEntryRoundExcluded: originalBoundary.round,
    completeRounds: roundEvidence.filter(row => row.complete).length,
    roundEvidence, cohort, authorityStageCapture, authorityStageCohort, actionPipelineCohort,
    journalProblems: journal.problems,
    omittedIncompleteActionTail: actionRows.omittedIncompleteTail,
    omittedIncompleteTimingTail: timings.omittedIncompleteTail });
}
const report = { schemaVersion: 'ticket23_complete_round_per_type_cohort_observation_v1',
  recordedAt: new Date().toISOString(), sourceVersion: manifest.sourceVersion,
  sourceEvidence: { manifestPath, handlesPath, launchAt: handles.launchAt }, arms,
  fullRoundObservationAvailableEveryArm: arms.every(arm => arm.completeRounds >= 1),
  authorityStageTimingCaptureAvailableEveryArm: arms.every(arm => arm.completeRounds >= 1
    && arm.authorityStageCapture.length > 0
    && arm.authorityStageCapture.every(row => row.authorityTimingStatus === 'complete')),
  replayCohortLocked: false, performancePromotionAdmitted: false,
  reasons: ['Matched full initial state/request/result capture and candidate performance parity remain required.'],
  providerCalls: 0, originalRoomWrites: 0, rulesExecutions: 0,
  timingScope: 'Original tool and Authority stage wall intervals, decision-to-memory windows and image-write evidence spans. Nested intervals are not summed; exact click/SLA latency and separate model time are not inferred.',
  trainingTruth: false };
await writeFile(outputPath, JSON.stringify(report), { mode: 0o600 });
console.log(JSON.stringify({ outputPath, sourceVersion: report.sourceVersion,
  fullRoundObservationAvailableEveryArm: report.fullRoundObservationAvailableEveryArm,
  arms: arms.map(({ arm, capturedRevision, completeRounds, roundEvidence, journalProblems }) =>
    ({ arm, capturedRevision, completeRounds, roundEvidence, journalProblems })),
  performancePromotionAdmitted: false, providerCalls: 0, originalRoomWrites: 0, rulesExecutions: 0 }));
