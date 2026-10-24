// Offline fixed-cohort extraction. Never calls Rules, Provider or a mutable Store.
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createStarcraftTmgPrivatePayloadCodec } from
  '../../packages/room-store/room-store-v1.mjs';
import { createStarcraftTmgRefereeCrypto, hashStarcraftTmgContract as hash } from
  '../../packages/authoritative-engine/referee-crypto-v1.mjs';

async function selectedNativeReceipts(sourceDirectory, groups) {
  const wanted = new Set(groups.flatMap(group => group.selected || [])
    .map(row => row.receiptHash));
  const receipts = new Map();
  const invalid = new Set();
  if (!wanted.size) return { receipts, invalid };
  const privateState = JSON.parse(await readFile(path.join(sourceDirectory, 'runner-private.json'), 'utf8'));
  const database = new DatabaseSync(path.join(sourceDirectory, 'room.sqlite'), { readOnly: true });
  let codec;
  try {
    database.exec('BEGIN');
    const head = database.prepare('SELECT private_sequence FROM sc_rooms WHERE room_id=?')
      .get(privateState.roomId);
    if (!head) throw Error('AUTHORITY_CASE_SOURCE_ROOM_MISSING');
    for (const row of database.prepare('SELECT sequence,payload_cipher FROM sc_private_journal WHERE room_id=? AND sequence<=? ORDER BY sequence')
      .iterate(privateState.roomId, head.private_sequence)) {
      codec ||= createStarcraftTmgPrivatePayloadCodec({
        key: privateState.storeEncryptionKeyBase64,
        keyId: JSON.parse(row.payload_cipher).keyId,
      });
      const item = codec.decode(row.payload_cipher, `room:${privateState.roomId}:private:${row.sequence}`);
      if (item.type !== 'accepted_transition') continue;
      const receipt = item.payload?.receipt;
      if (!wanted.has(receipt?.journalHash)) continue;
      const { journalHash, refereeSignature, audit, ...core } = receipt;
      const crypto = createStarcraftTmgRefereeCrypto({
        privateKey: privateState.refereePrivateKeyPem,
        publicKey: privateState.refereePublicKeyPem,
        hmacSecret: privateState.refereeHmacSecret,
        keyId: refereeSignature.keyId, trustLevel: 'development_persistent',
      });
      if (!crypto.verify(core, refereeSignature, 'accepted_receipt')
        || hash({ receipt: core, refereeSignature }) !== journalHash) {
        invalid.add(journalHash);
      } else if (receipts.has(journalHash)) {
        invalid.add(journalHash);
      } else {
        receipts.set(journalHash, { receipt, storePrivateSequence: Number(row.sequence) });
      }
    }
    if (Number(database.prepare('SELECT total_changes() AS n').get().n) !== 0) {
      throw Error('AUTHORITY_CASE_SOURCE_DATABASE_CHANGED');
    }
    database.exec('COMMIT');
  } finally { database.close(); }
  return { receipts, invalid };
}

function bindingMatches(row, receipt) {
  return row.roomId === receipt.roomId && row.seatKey === receipt.applyingSeatKey
    && row.preStateRevision === receipt.preStateRevision && row.preStateHash === receipt.preStateHash
    && row.postStateRevision === receipt.postStateRevision && row.postStateHash === receipt.postStateHash
    && row.matchBindingHash === receipt.matchBindingHash && row.actionType === receipt.action.actionType;
}

export async function extractTicket23AuthorityPerformanceCasesV1({ sourceDirectory, cohortArm }) {
  const groups = cohortArm.authorityStageCohort || [];
  const captures = cohortArm.authorityStageCapture || [];
  const { receipts, invalid } = await selectedNativeReceipts(sourceDirectory, groups);
  const casesByReceipt = new Map();
  const coverage = [];
  for (const group of groups) {
    const selections = [];
    for (const selected of group.selected || []) {
      const native = receipts.get(selected.receiptHash);
      const capture = captures.find(row => row.receiptHash === selected.receiptHash);
      let status = invalid.has(selected.receiptHash) ? 'original_native_receipt_invalid'
        : !native ? 'original_native_receipt_missing'
          : !bindingMatches(selected, native.receipt) ? 'original_native_binding_mismatch'
            : capture?.authorityTimingStatus !== 'complete' ? 'original_authority_timing_pending'
              : 'ready_for_signed_authority_state_restore';
      const originalStage = capture?.authorityStages.find(row => row.operation === selected.operation);
      if (status === 'ready_for_signed_authority_state_restore'
        && (selected.status !== 'capture_complete' || originalStage?.status !== 'complete'
          || selected.elapsedMs !== originalStage.elapsedMs || selected.recordedAt !== originalStage.recordedAt)) {
        status = 'original_authority_stage_selection_mismatch';
      }
      const selection = { ...selected, extractionStatus: status,
        groupType: group.type, historicalCount: group.totalObservations,
        eligibleHistoricalCount: group.successfulObservations };
      selections.push(selection);
      if (!casesByReceipt.has(selected.receiptHash)) {
        const receipt = native?.receipt || null;
        casesByReceipt.set(selected.receiptHash, {
          caseId: `${cohortArm.arm}-authority-${selected.preStateRevision}-${selected.receiptHash}`,
          kind: 'authority_action_pipeline', arm: cohortArm.arm, round: selected.round,
          actionType: selected.actionType, receiptHash: selected.receiptHash,
          status, stageSelections: [], originalReceipt: receipt,
          originalReceiptHash: receipt ? hash(receipt) : null,
          storePrivateSequence: native?.storePrivateSequence ?? null,
          nativeReceiptSignatureVerified: Boolean(native) && !invalid.has(selected.receiptHash),
          originalProposal: receipt?.proposal ?? null,
          originalChanceReveal: receipt?.chanceReveal ?? null,
          originalAuthority: receipt ? { gameId: receipt.gameId, roomId: receipt.roomId,
            matchBindingHash: receipt.matchBindingHash, stateRevision: receipt.preStateRevision,
            stateHash: receipt.preStateHash, legalSpaceHash: receipt.legalSpaceHash,
            seatKey: receipt.applyingSeatKey } : null,
          decisionToMemoryWindow: capture?.decisionToMemoryWindow ?? null,
          webEvidenceSpan: capture?.webEvidenceSpan ?? null,
          requestOrigin: 'original_signed_accepted_action_receipt',
          pairedRuntimeExecutionRequired: true,
          modelDecisionReexecutionRequired: false,
          performancePromotionAdmitted: false, trainingTruth: false,
        });
      }
      const entry = casesByReceipt.get(selected.receiptHash);
      entry.stageSelections.push(selection);
      if (status !== 'ready_for_signed_authority_state_restore') entry.status = status;
    }
    coverage.push({ type: group.type, selected: selections.length,
      recoverableSelections: selections.filter(row =>
        row.extractionStatus === 'ready_for_signed_authority_state_restore').length,
      missingOrAmbiguousSelections: selections.filter(row =>
        row.extractionStatus !== 'ready_for_signed_authority_state_restore')
        .map(row => ({ observationId: row.observationId, status: row.extractionStatus })),
      totalObservations: group.totalObservations,
      pendingOriginalObservations: group.pending || [],
      missingOrAmbiguousObservations: group.missingOrAmbiguousObservations ?? 0 });
  }
  return { cases: [...casesByReceipt.values()], coverage,
    // Retain the producer's two window scopes; they are NOT Rules-only replay
    // durations or complete click/SLA latency and are not automatically promoted.
    actionPipelineCoverage: cohortArm.actionPipelineCohort || [],
    providerCalls: 0, rulesExecutions: 0, originalRoomWrites: 0 };
}
