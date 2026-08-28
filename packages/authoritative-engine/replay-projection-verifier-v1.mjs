import { hashStarcraftTmgContract } from "./transition-v1.mjs";

export const STARCRAFT_TMG_REPLAY_PROJECTION_VERIFIER_VERSION = "starcraft_tmg_replay_projection_verifier_v1";

const FORBIDDEN_PUBLIC_KEYS = /(?:seatToken|tokenHash|bearerToken|idempotencyKey|confirmationProofHash|confirmingGrantId|applyingGrantId|cardResources|privateJournal)/i;

function object(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function publicLeakPaths(value, path = "$") {
  if (Array.isArray(value)) return value.flatMap((entry, index) => publicLeakPaths(entry, `${path}[${index}]`));
  if (!object(value)) return [];
  const failures = [];
  for (const [key, entry] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (FORBIDDEN_PUBLIC_KEYS.test(key)) failures.push(nextPath);
    failures.push(...publicLeakPaths(entry, nextPath));
  }
  return failures;
}

function monotonic(rows, field) {
  return rows.every((row, index) => Number(row[field]) === index + 1);
}

export function createStarcraftTmgReplayProjectionVerifier(options = {}) {
  const authorityEngine = options.authorityEngine;
  const roomStore = options.roomStore;
  if (!authorityEngine || typeof authorityEngine.replay !== "function") throw new Error("authorityEngine is required");
  if (!roomStore || typeof roomStore.loadReplayBundle !== "function") throw new Error("roomStore is required");

  async function verifyRoom(roomId) {
    const failures = [];
    const bundle = await roomStore.loadReplayBundle(roomId);
    if (!bundle) return { ok: false, reason: "ROOM_NOT_FOUND", roomId };
    const dependencies = authorityEngine.verifyFrozenDependencies(bundle.initialEnvelope.matchBinding);
    if (!dependencies.ok) failures.push({ gate: "dependencies", reason: dependencies.reason, details: dependencies.quarantine });
    if (bundle.latestCheckpoint) {
      const checkpoint = authorityEngine.verifyCheckpoint(bundle.latestCheckpoint, bundle.initialEnvelope.matchBinding);
      if (!checkpoint.ok) failures.push({ gate: "checkpoint", reason: checkpoint.reason });
    }
    const privateJournal = await roomStore.readJournal(roomId, "private", 0) || [];
    const publicJournal = await roomStore.readJournal(roomId, "public", 0) || [];
    if (!monotonic(privateJournal, "sequence")) failures.push({ gate: "private_sequence", reason: "JOURNAL_CHAIN_INVALID" });
    if (!monotonic(publicJournal, "sequence")) failures.push({ gate: "public_sequence", reason: "PUBLIC_PROJECTION_DIVERGED" });
    const rejectedPublic = publicJournal.filter((entry) => entry.payload?.type === "rejected_attempt");
    if (rejectedPublic.length) failures.push({ gate: "rejection_visibility", reason: "PUBLIC_PROJECTION_DIVERGED", count: rejectedPublic.length });
    const leakPaths = publicJournal.flatMap((entry) => publicLeakPaths(entry.payload, `public[${entry.sequence}]`));
    if (leakPaths.length) failures.push({ gate: "public_leakage", reason: "PUBLIC_PROJECTION_DIVERGED", leakPaths });
    const privateAccepted = privateJournal
      .filter((entry) => entry.payload?.type === "accepted_transition")
      .map((entry) => entry.payload.payload.receipt);
    const publicAccepted = publicJournal
      .filter((entry) => entry.payload?.type === "accepted_transition")
      .map((entry) => entry.payload.payload);
    if (privateAccepted.length !== publicAccepted.length) {
      failures.push({ gate: "projection_count", reason: "PUBLIC_PROJECTION_DIVERGED", privateCount: privateAccepted.length, publicCount: publicAccepted.length });
    }
    privateAccepted.forEach((receipt, index) => {
      const projected = publicAccepted[index];
      if (!projected || projected.journalHash !== receipt.journalHash
        || projected.postStateHash !== receipt.postStateHash
        || projected.eventsHash !== receipt.eventsHash
        || projected.refereeSignature?.contentHash !== receipt.refereeSignature?.contentHash) {
        failures.push({ gate: "projection_identity", reason: "PUBLIC_PROJECTION_DIVERGED", index });
      }
    });
    const replay = dependencies.ok
      ? authorityEngine.replay({ initialEnvelope: bundle.initialEnvelope, journal: privateAccepted })
      : dependencies;
    if (!replay.ok) failures.push({ gate: "replay", reason: replay.reason });
    else if (replay.envelope.stateHash !== bundle.currentAggregate.envelope.stateHash
      || replay.envelope.stateRevision !== bundle.currentAggregate.envelope.stateRevision
      || replay.envelope.journalHeadHash !== bundle.currentAggregate.envelope.journalHeadHash) {
      failures.push({ gate: "current_state", reason: "REPLAY_DIVERGED" });
    }
    const projectionFailureGates = new Set(["public_sequence", "projection_count", "projection_identity", "public_leakage", "rejection_visibility"]);
    const reportCore = {
      schemaVersion: STARCRAFT_TMG_REPLAY_PROJECTION_VERIFIER_VERSION,
      roomId,
      matchBindingHash: bundle.initialEnvelope.matchBindingHash,
      privateJournalCount: privateJournal.length,
      publicJournalCount: publicJournal.length,
      acceptedReceiptCount: privateAccepted.length,
      rejectedAttemptCount: privateJournal.filter((entry) => entry.payload?.type === "rejected_attempt").length,
      checkpointPresent: Boolean(bundle.latestCheckpoint),
      dependencyVerified: dependencies.ok,
      replayVerified: replay.ok,
      publicProjectionVerified: failures.every((failure) => !projectionFailureGates.has(failure.gate)),
      failures,
      silentCompatibilityUsed: false,
      eligibleForTraining: false,
      trainingTruth: false,
    };
    const attestation = authorityEngine.attestVerificationReport(reportCore);
    return Object.freeze({
      ok: failures.length === 0,
      report: attestation,
      verificationHash: attestation.verificationHash,
      reportHash: hashStarcraftTmgContract(reportCore),
    });
  }

  return Object.freeze({ verifyRoom });
}
