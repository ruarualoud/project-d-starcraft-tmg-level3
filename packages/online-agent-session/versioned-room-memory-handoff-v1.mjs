import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { hashStarcraftTmgContract as hash } from
  "../authoritative-engine/transition-v1.mjs";
import { createStarcraftTmgMatchDecisionContinuityV1 } from
  "./match-decision-continuity-v1.mjs";
import { summarizeStarcraftTmgAppliedOutcomeV1 } from
  "./hosted-bot-seat-runtime-v1.mjs";
import { verifyStarcraftTmgRosterTurnPlanOriginV1 } from
  "./roster-plan-turn-plan-bridge-v1.mjs";

const VERSION = "starcraft_tmg_versioned_room_memory_handoff_v1";
const SEATS = ["player1", "player2"];

function fail(code) {
  throw Object.assign(new Error(code), { code, severity: "High" });
}

function scope(roomId, matchBindingHash, seatKey) {
  const body = { gameId: "starcraft-tmg", roomId, matchBindingHash, seatKey };
  return { ...body, scopeKey: hash(body) };
}

function readSourceRecords(filename, sourceScope, throughRevision, lastSequence,
  stopAfterReceiptHash = null) {
  if (!existsSync(filename)) fail("FORK_SOURCE_MEMORY_MISSING");
  const db = new DatabaseSync(filename, { readOnly: true });
  let rows;
  try {
    rows = db.prepare("SELECT sequence, record_hash, record_json FROM "
      + "sc_match_decision_journal WHERE scope_key = ? ORDER BY sequence ASC")
      .all(sourceScope.scopeKey);
  } finally {
    db.close();
  }
  const records = [];
  let previous = 0;
  for (const row of rows) {
    const record = JSON.parse(String(row.record_json));
    const { recordHash, ...unsigned } = record;
    if (row.sequence !== ++previous || record.sequence !== row.sequence
      || record.scopeKey !== sourceScope.scopeKey
      || recordHash !== row.record_hash || recordHash !== hash(unsigned)) {
      fail("FORK_SOURCE_MEMORY_INTEGRITY_FAILED");
    }
    if (lastSequence !== null && row.sequence > lastSequence) break;
    if (record.authority?.stateRevision > throughRevision) {
      if (lastSequence !== null) fail("FORK_SOURCE_MEMORY_REVISION_DRIFT");
      break;
    }
    records.push(record);
    if (stopAfterReceiptHash && record.kind === "decision_outcome"
      && record.payload?.receiptHash === stopAfterReceiptHash) break;
  }
  if (!records.length || (lastSequence !== null
    && records.at(-1).sequence !== lastSequence)
    || (stopAfterReceiptHash
      && records.at(-1).payload?.receiptHash !== stopAfterReceiptHash)) {
    fail("FORK_SOURCE_MEMORY_PREFIX_UNAVAILABLE");
  }
  return records;
}

function latestPlan(records) {
  const record = [...records].reverse().find((entry) =>
    entry.kind === "turn_plan" || entry.kind === "plan_revision");
  if (!record?.payload?.planId) fail("FORK_SOURCE_PLAN_UNAVAILABLE");
  return record;
}

function rebasePlan(record, targetProjection, targetScope, ancestry) {
  const original = record.payload;
  const plan = {
    ...structuredClone(original),
    status: "reflection_required",
    revisionReason: "versioned_rules_fork_reassessment_required",
    futureActionPlans: [],
    lastAssessmentRef: null,
    lastValidatedAuthority: null,
    forkSourcePlanRecordHash: record.recordHash,
    forkSourceRoomId: ancestry.sourceRoomId,
    forkSourceStateHash: ancestry.sourceStateHash,
    forkSourceStateRevision: ancestry.sourceStateRevision,
    eligibleForTraining: false,
    trainingTruth: false,
  };
  if (original.pregamePlanOrigin) {
    verifyStarcraftTmgRosterTurnPlanOriginV1(original.pregamePlanOrigin);
    if (original.pregamePlanOrigin.roomId !== ancestry.sourceRoomId
      || original.pregamePlanOrigin.matchBindingHash
        !== ancestry.sourceMatchBindingHash
      || original.pregamePlanOrigin.seatKey !== targetScope.seatKey) {
      fail("FORK_SOURCE_ROSTER_ORIGIN_MISMATCH");
    }
    const { originHash: sourceOriginHash, ...origin } =
      original.pregamePlanOrigin;
    const rebased = { ...origin,
      roomId: targetScope.roomId,
      matchBindingHash: targetScope.matchBindingHash,
      openedAtStateRevision: targetProjection.room.stateRevision,
      openedAtStateHash: targetProjection.room.stateHash,
      forkSourceOriginHash: sourceOriginHash,
      forkSourceRoomId: ancestry.sourceRoomId,
    };
    plan.pregamePlanOrigin = { ...rebased, originHash: hash(rebased) };
    verifyStarcraftTmgRosterTurnPlanOriginV1(plan.pregamePlanOrigin);
  }
  return plan;
}

function sourceQueryPort(records, sourceScope) {
  return createStarcraftTmgMatchDecisionContinuityV1({ journal: {
    durability: "read_only_versioned_fork_ancestry",
    async read(requested) { return { ok: true,
      records: requested.scopeKey === sourceScope.scopeKey ? records : [] }; },
    async append() { fail("FORK_SOURCE_MEMORY_READ_ONLY"); },
  } });
}

async function forkSettlementReceipt(roomRuntime, targetRoomId,
  targetMatchBindingHash, targetInitialStateHash) {
  const bundle = await roomRuntime.roomStore.loadReplayBundle(targetRoomId);
  const receipts = (bundle.privateJournal || []).filter((entry) =>
    entry.payload?.type === "accepted_transition")
    .map((entry) => entry.payload.payload.receipt)
    .filter((receipt) => receipt.postStateRevision === 1);
  if (receipts.length !== 1
    || receipts[0].preStateRevision !== 0
    || receipts[0].postStateHash !== targetInitialStateHash
    || receipts[0].matchBindingHash !== targetMatchBindingHash
    || !SEATS.includes(receipts[0].applyingSeatKey)
    || !receipts[0].journalHash
    || !receipts[0].events?.some((event) =>
      event.type === "charge_failed"
        && event.modelPositionsChanged === false)) {
    fail("FORK_SETTLEMENT_RECEIPT_INVALID");
  }
  return receipts[0];
}

async function readAncestorSources(sourceDirectory) {
  const ancestors = [];
  const seen = new Set([path.resolve(sourceDirectory)]);
  let directory = path.resolve(sourceDirectory);
  for (let depth = 0; depth < 8; depth += 1) {
    const forkPath = path.join(directory, "fork-private.json");
    if (!existsSync(forkPath)) return ancestors;
    const fork = JSON.parse(await readFile(forkPath, "utf8"));
    const receipt = JSON.parse(await readFile(path.join(directory,
      "fork-receipt.json"), "utf8"));
    const sourceLock = JSON.parse(await readFile(path.join(directory,
      "memory-source-lock.json"), "utf8"));
    const { lockHash, ...unsignedLock } = sourceLock;
    if (!fork.sourceRoomId || !fork.targetRoomId
      || fork.targetRoomId !== receipt.targetRoomId
      || fork.sourceRoomId !== receipt.sourceRoomId
      || fork.sourceRoomId !== sourceLock.sourceRoomId
      || receipt.sourceMatchBindingHash
        !== sourceLock.sourceMatchBindingHash
      || receipt.sourceStateHash !== sourceLock.sourceStateHash
      || receipt.sourceStateRevision !== sourceLock.sourceStateRevision
      || lockHash !== hash(unsignedLock)) {
      fail("FORK_MEMORY_ANCESTRY_PROVENANCE_INVALID");
    }
    const ancestorDirectory = path.resolve(fork.sourceDirectory || "");
    if (seen.has(ancestorDirectory)) fail("FORK_MEMORY_ANCESTRY_CYCLE");
    seen.add(ancestorDirectory);
    const seats = {};
    for (const seatKey of SEATS) {
      const ancestorScope = scope(sourceLock.sourceRoomId,
        sourceLock.sourceMatchBindingHash, seatKey);
      const rows = readSourceRecords(path.join(ancestorDirectory, "seats",
        seatKey, "match-memory.sqlite"), ancestorScope,
      sourceLock.sourceStateRevision,
      sourceLock.seats?.[seatKey]?.lastSequence ?? null);
      if (rows.length !== sourceLock.seats?.[seatKey]?.recordCount
        || rows.at(-1).recordHash
          !== sourceLock.seats?.[seatKey]?.lastRecordHash) {
        fail("FORK_MEMORY_ANCESTRY_PREFIX_MISMATCH");
      }
      seats[seatKey] = { scope: ancestorScope, records: rows };
    }
    ancestors.push({ roomId: sourceLock.sourceRoomId,
      stateHash: sourceLock.sourceStateHash, lockHash, seats });
    directory = ancestorDirectory;
  }
  if (existsSync(path.join(directory, "fork-private.json"))) {
    fail("FORK_MEMORY_ANCESTRY_TOO_DEEP");
  }
  return ancestors;
}

export async function prepareVersionedRoomMemoryHandoffV1(input = {}) {
  const { sourceDirectory, targetDirectory, sourceRoomId,
    sourceMatchBindingHash, sourceStateHash, sourceStateRevision,
    targetRoomId, targetMatchBindingHash, targetInitialStateHash, roomRuntime,
    targetContinuities, seatTokens } = input;
  let legalRecovery = input.legalPrefixRecovery || null;
  const identityRecovery = input.singletonIdentityRecovery || null;
  const genesisRecovery = legalRecovery || identityRecovery;
  const initialRevision = genesisRecovery ? 0 : 1;
  if (!sourceDirectory || !targetDirectory || !sourceRoomId
    || !sourceMatchBindingHash || !sourceStateHash
    || !Number.isSafeInteger(sourceStateRevision)
    || !targetRoomId || !targetMatchBindingHash || !targetInitialStateHash
    || !roomRuntime
    || !targetContinuities || !seatTokens) fail("FORK_MEMORY_INPUT_INVALID");
  const ancestry = { sourceRoomId, sourceMatchBindingHash,
    sourceStateHash, sourceStateRevision };
  if (identityRecovery && (identityRecovery.schemaVersion
      !== "ticket23_slice248_singleton_identity_recovery_v1"
    || identityRecovery.recoveryKind !== "singleton_summon_identity_v6"
    || Object.entries(ancestry).some(([key, value]) => identityRecovery[key] !== value)
    || sourceRoomId !== targetRoomId
    || !identityRecovery.sourceJournalHeadHash
    || identityRecovery.physicalLiveBoardUnchanged !== true
    || identityRecovery.originalAcceptedHistoryPreserved !== true)) {
    fail("FORK_SINGLETON_IDENTITY_RECOVERY_BASIS_INVALID");
  }
  // The first captured recovery receipt predates the explicit actor field.
  // Derive it only from that branch's exact initial Rules state, never from
  // its later current side or a caller-selected default. Both source prefix
  // and target state were already replay-verified by the recovery producer.
  if (legalRecovery && !legalRecovery.sourceApplyingSeatKey) {
    const bundle = await roomRuntime.roomStore.loadReplayBundle(targetRoomId);
    const initial = bundle?.initialEnvelope;
    if (initial?.stateRevision !== 0 || initial.stateHash !== targetInitialStateHash
      || initial.matchBindingHash !== targetMatchBindingHash
      || initial.state?.officialRulesVersionFork?.sourceJournalHeadHash
        !== legalRecovery.sourceJournalHeadHash) {
      fail("FORK_LEGAL_PREFIX_RECOVERY_ACTOR_UNAVAILABLE");
    }
    legalRecovery = { ...legalRecovery,
      sourceApplyingSeatKey: initial.state.activeSideKey };
  }
  if (legalRecovery && (legalRecovery.schemaVersion
      !== "ticket23_slice248_legal_prefix_recovery_v1"
    || legalRecovery.recoveryKind !== "named_active_once_per_round_v8"
    || Object.entries(ancestry).some(([key, value]) => legalRecovery[key] !== value)
    || !legalRecovery.sourceJournalHeadHash
    || !SEATS.includes(legalRecovery.sourceApplyingSeatKey))) {
    fail("FORK_LEGAL_PREFIX_RECOVERY_BASIS_INVALID");
  }
  const lockPath = path.join(targetDirectory, "memory-source-lock.json");
  let lock = null;
  try { lock = JSON.parse(await readFile(lockPath, "utf8")); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (lock && (lock.schemaVersion !== VERSION
    || Object.entries(ancestry).some(([key, value]) => lock[key] !== value)
    || lock.lockHash !== hash(Object.fromEntries(Object.entries(lock)
      .filter(([key]) => key !== "lockHash"))))) {
    fail("FORK_MEMORY_SOURCE_LOCK_MISMATCH");
  }
  const sources = {};
  for (const seatKey of SEATS) {
    const sourceScope = scope(sourceRoomId, sourceMatchBindingHash, seatKey);
    const records = readSourceRecords(path.join(sourceDirectory, "seats",
      seatKey, "match-memory.sqlite"), sourceScope, sourceStateRevision,
    lock?.seats?.[seatKey]?.lastSequence ?? null,
    legalRecovery?.sourceApplyingSeatKey === seatKey
      ? legalRecovery.sourceJournalHeadHash : null);
    if (lock && (records.length !== lock.seats?.[seatKey]?.recordCount
      || records.at(-1).recordHash
        !== lock.seats?.[seatKey]?.lastRecordHash)) {
      fail("FORK_MEMORY_SOURCE_PREFIX_MISMATCH");
    }
    sources[seatKey] = { scope: sourceScope, records };
  }
  const ancestors = await readAncestorSources(sourceDirectory);
  let settlement = null;
  let settlementResult = null;
  if (genesisRecovery) {
    const bundle = await roomRuntime.roomStore.loadReplayBundle(targetRoomId);
    const initial = bundle?.initialEnvelope;
    if (initial?.stateRevision !== 0 || initial.stateHash !== targetInitialStateHash
      || initial.matchBindingHash !== targetMatchBindingHash
      || initial.state?.officialRulesVersionFork?.sourceStateHash !== sourceStateHash
      || initial.state.officialRulesVersionFork.sourceJournalHeadHash
        !== genesisRecovery.sourceJournalHeadHash) {
      fail("FORK_LEGAL_PREFIX_INITIAL_STATE_INVALID");
    }
  } else {
    settlement = await forkSettlementReceipt(roomRuntime, targetRoomId,
      targetMatchBindingHash, targetInitialStateHash);
    settlementResult = summarizeStarcraftTmgAppliedOutcomeV1({
      receipt: settlement, candidateId: settlement.proposal?.domainId,
    });
  }
  const recoveryEvidenceHash = genesisRecovery ? hash(genesisRecovery) : null;
  if (!lock) {
    const body = { schemaVersion: VERSION, ...ancestry,
      seats: Object.fromEntries(SEATS.map((seatKey) => [seatKey, {
        recordCount: sources[seatKey].records.length,
        lastSequence: sources[seatKey].records.at(-1).sequence,
        lastRecordHash: sources[seatKey].records.at(-1).recordHash,
      }])), trainingTruth: false };
    lock = { ...body, lockHash: hash(body) };
    await writeFile(lockPath, JSON.stringify(lock, null, 2) + "\n", {
      encoding: "utf8", mode: 0o600, flag: "wx",
    });
  }
  const seatReports = {};
  const queryPorts = {};
  for (const seatKey of SEATS) {
    const targetScope = scope(targetRoomId, targetMatchBindingHash, seatKey);
    const source = sources[seatKey];
    const sourcePlan = latestPlan(source.records);
    const continuity = targetContinuities[seatKey];
    const room = await roomRuntime.readRoom({ roomId: targetRoomId,
      seatToken: seatTokens[seatKey] });
    if (!room.ok || room.projection.room.stateRevision < initialRevision
      || room.projection.matchBinding?.bindingHash
        !== targetMatchBindingHash) {
      fail("FORK_TARGET_MEMORY_AUTHORITY_INVALID");
    }
    const existing = await continuity.query({ scope: targetScope,
      query: { order: "oldest_first", limit: 100_000 } });
    if (!existing.records.length) {
      if (room.projection.room.stateRevision !== initialRevision
        || room.projection.room.stateHash !== targetInitialStateHash) {
        fail("FORK_TARGET_MEMORY_FIRST_WRITE_MISSED");
      }
      const recorded = await continuity.record({ scope: targetScope,
        roomProjection: room.projection,
        turnPlan: rebasePlan(sourcePlan, room.projection,
          targetScope, ancestry) });
      if (!recorded.ok || recorded.recorded !== 1) {
        fail("FORK_TARGET_MEMORY_WRITE_FAILED");
      }
    } else if (existing.records[0].kind !== "turn_plan"
      || existing.records[0].payload?.forkSourcePlanRecordHash
        !== sourcePlan.recordHash
      || existing.records[0].payload?.forkSourceStateHash
        !== sourceStateHash) fail("FORK_TARGET_MEMORY_CONFLICT");
    const settlementPresent = existing.records.some((record) => genesisRecovery
      ? record.payload?.forkRecoveryEvidenceHash === recoveryEvidenceHash
      : record.payload?.forkSettlementReceiptHash === settlement.journalHash);
    if (!settlementPresent) {
      if (genesisRecovery) {
        const recorded = await continuity.record({ scope: targetScope,
          roomProjection: room.projection,
          event: { kind: "rules_repair_branch_opened", payload: {
            forkRecoveryEvidenceHash: recoveryEvidenceHash,
            source: identityRecovery ? "verified_signed_current_boundary_and_identity_projection"
              : "verified_signed_source_checkpoint_and_legal_prefix",
            sourceRoomId, sourceStateRevision, sourceStateHash,
            resultSummary: identityRecovery
              ? "Continued the same accepted battlefield under nonreused singleton identities; archived only confirmed inactive collisions. No game action was replayed."
              : "Restored the exact legal prefix; invalid suffix excluded. This is recovery, not a new game action.",
            ...(identityRecovery ? {
              sourceBoundaryReceiptHash: identityRecovery.sourceJournalHeadHash,
              sourceBoundaryOutcome: identityRecovery.sourceBoundaryOutcome,
              singletonIdentityRepairs: identityRecovery.singletonIdentityRepairs,
              physicalLiveBoardUnchanged: true,
              sourceOutcomeIsHistorical: true,
            } : {}),
            planImpact: "reassess_against_current_rules_before_next_action",
            actionReexecuted: false, diceRerolled: false,
            eligibleForTraining: false, trainingTruth: false,
          } } });
        if (!recorded.ok || recorded.recorded !== 1) {
          fail("FORK_RECOVERY_MEMORY_WRITE_FAILED");
        }
      } else {
      const actorSeat = settlement.applyingSeatKey === seatKey;
      const payload = { forkSettlementReceiptHash: settlement.journalHash,
        forkSettlementStateRevision: 1,
        source: "signed_versioned_charge_room_receipt",
        receiptHash: settlement.journalHash,
        resultSummary: settlementResult.resultSummary,
        observedSignals: settlementResult.observedSignals,
        planImpact: actorSeat ? settlementResult.planImpact
          : "reassess_opponent_failed_charge_before_next_choice",
        unitIntentResults: settlementResult.unitIntentResults,
        eligibleForTraining: false, trainingTruth: false };
      const recorded = await continuity.record({ scope: targetScope,
        roomProjection: room.projection,
        ...(actorSeat ? { outcome: {
          ...payload, status: "applied_and_replay_verified",
        } } : { event: { kind: "opponent_response_observed",
          payload: { ...payload,
            opponentAction: settlementResult.resultSummary,
            unitId: settlement.action?.pieceId || null,
            result: "charge_failed" } } }),
      });
      if (!recorded.ok || recorded.recorded !== 1) {
        fail("FORK_SETTLEMENT_MEMORY_WRITE_FAILED");
      }
      }
    }
    const imported = (await continuity.query({ scope: targetScope,
      query: { kinds: ["turn_plan"], order: "oldest_first", limit: 1 } }))
      .records[0];
    if (imported?.payload?.forkSourcePlanRecordHash
      !== sourcePlan.recordHash
      || imported.authority?.stateRevision !== initialRevision
      || imported.authority?.stateHash !== targetInitialStateHash) {
      fail("FORK_TARGET_MEMORY_VERIFY_FAILED");
    }
    const oldPorts = [source, ...ancestors.map((entry) =>
      entry.seats[seatKey])].map((entry) =>
      sourceQueryPort(entry.records, entry.scope));
    queryPorts[seatKey] = Object.freeze({ async query(request = {}) {
      if (request.scope?.roomId !== targetRoomId
        || request.scope?.matchBindingHash !== targetMatchBindingHash
        || request.scope?.seatKey !== seatKey) {
        fail("FORK_MEMORY_QUERY_SCOPE_MISMATCH");
      }
      const query = request.query || {};
      const current = await continuity.query({ scope: targetScope, query });
      const previousLayers = await Promise.all(oldPorts.map((port, index) =>
        port.query({ scope: index === 0 ? source.scope
          : ancestors[index - 1].seats[seatKey].scope, query })));
      const previousRecords = query.order === "oldest_first"
        ? previousLayers.toReversed().flatMap((entry) => entry.records)
        : previousLayers.flatMap((entry) => entry.records);
      const previousMatchedCount = previousLayers.reduce((sum, entry) =>
        sum + entry.matchedCount, 0);
      const lane = query.historyLane || "combined";
      if (!["combined", "current_versioned_room",
        "frozen_source_room"].includes(lane)) {
        fail("FORK_MEMORY_QUERY_LANE_INVALID");
      }
      const rows = lane === "current_versioned_room"
        ? current.records : lane === "frozen_source_room"
          ? previousRecords : query.order === "oldest_first"
            ? [...previousRecords, ...current.records]
            : [...current.records, ...previousRecords];
      const matchedCount = lane === "current_versioned_room"
        ? current.matchedCount : lane === "frozen_source_room"
          ? previousMatchedCount
          : current.matchedCount + previousMatchedCount;
      const limit = Number(query.limit || 50);
      const body = { schemaVersion: VERSION + ".query", scope: targetScope,
        query, historyLane: lane,
        records: rows.slice(0, limit).map((entry) => ({ ...entry,
          recordOrigin: entry.scopeKey === targetScope.scopeKey
            ? "current_versioned_room" : "frozen_source_room" })),
        matchedCount,
        returnedCount: Math.min(rows.length, limit),
        hasMore: matchedCount > limit,
        source: "versioned_fork_same_seat_ancestry_and_current_room",
        sourceRoomId, sourceStateHash,
        ancestorRoomIds: ancestors.map((entry) => entry.roomId),
        ancestorLockHashes: ancestors.map((entry) => entry.lockHash),
        oldActionsAreNotNewRoomReceipts: true,
        eligibleForTraining: false, trainingTruth: false };
      return { ...body, queryResultHash: hash(body) };
    } });
    seatReports[seatKey] = {
      sourceRecordCount: source.records.length,
      sourceLastRecordHash: source.records.at(-1).recordHash,
      sourcePlanRecordHash: sourcePlan.recordHash,
      targetPlanRecordHash: imported.recordHash,
      rosterOriginRebound: Boolean(imported.payload?.pregamePlanOrigin),
      forkSettlementReceiptHash: settlement?.journalHash || null,
      forkRecoveryEvidenceHash: recoveryEvidenceHash,
      forkSettlementMemoryAlreadyPresent: settlementPresent,
      ancestorRecordCounts: ancestors.map((entry) => ({
        roomId: entry.roomId,
        recordCount: entry.seats[seatKey].records.length,
        lastRecordHash: entry.seats[seatKey].records.at(-1).recordHash,
      })),
    };
  }
  return { lockHash: lock.lockHash, seatReports, queryPorts,
    ancestorRoomIds: ancestors.map((entry) => entry.roomId),
    ancestorLockHashes: ancestors.map((entry) => entry.lockHash),
    trainingTruth: false };
}
