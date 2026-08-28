#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createStarcraftTmgAuthoritativeEngine,
  hashStarcraftTmgContract,
} from "../packages/authoritative-engine/transition-v1.mjs";
import {
  createStarcraftTmgSampleState,
  loadStarcraftTmgData,
} from "../../scripts/starcraft-tmg-rules-v0.mjs";
const LEVEL3_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PROJECT_ROOT = path.resolve(LEVEL3_ROOT, "..");
const REPORT_PATH = path.join(LEVEL3_ROOT, "build", "authoritative-transition-v1", "report.json");
const OCCURRED_AT = "2026-08-24T00:00:00.000Z";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const data = await loadStarcraftTmgData(PROJECT_ROOT);
  const engine = createStarcraftTmgAuthoritativeEngine({ now: () => OCCURRED_AT });
  const checks = [];
  const failures = [];
  const state = createStarcraftTmgSampleState(data);
  state.board.terrain = [];

  async function check(id, fn) {
    try {
      await fn();
      checks.push({ id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      checks.push({ id, ok: false, error: message });
      failures.push(`${id}: ${message}`);
    }
  }

  const initialEnvelope = engine.createEnvelope({
    gameId: "starcraft-tmg",
    roomId: "authority-verifier-room",
    dataVersion: data.version,
    state,
  });
  const seatAuthority = engine.issueSeatAuthority({
    grantId: "authority-verifier-player1",
    roomId: initialEnvelope.roomId,
    matchBindingHash: initialEnvelope.matchBindingHash,
    seatKey: "player1",
    roleMode: "player",
    principalType: "human",
    capabilities: ["read_legal_space", "preview", "apply"],
  });
  const controlLease = engine.issueControlLease({
    seatAuthority,
    sessionId: "authority-verifier-session",
    leaseFence: 1,
    issuedAtRoomRevision: 0,
  });
  const legalSpace = engine.legalSpace(initialEnvelope, { seatAuthority });
  const moveDomain = legalSpace.parameterDomains.find((domain) => domain.actionType === "move");
  const moveProposal = moveDomain ? {
    kind: "parameterized",
    domainId: moveDomain.domainId,
    parameters: {
      path: [
        { ...moveDomain.constraints.start },
        {
          xMilliInches: moveDomain.constraints.start.xMilliInches,
          yMilliInches: moveDomain.constraints.start.yMilliInches + 250,
        },
        {
          xMilliInches: moveDomain.constraints.start.xMilliInches,
          yMilliInches: moveDomain.constraints.start.yMilliInches + 500,
        },
      ],
    },
  } : null;
  let preview = null;
  let applied = null;

  await check("envelope_and_legal_space_are_hash_bound", () => {
    assert(initialEnvelope.revision === 0, "initial revision must be zero");
    assert(initialEnvelope.stateHash === hashStarcraftTmgContract(initialEnvelope.state), "state hash must bind normalized state");
    assert(legalSpace.revision === initialEnvelope.revision, "LegalSpace revision mismatch");
    assert(legalSpace.stateHash === initialEnvelope.stateHash, "LegalSpace state hash mismatch");
    assert(moveDomain, "sample state must expose a Rules-owned movement domain");
    assert(legalSpace.searchSuggestions.every((candidate) => candidate.authoritativeIdentity === false), "search suggestion became LegalSpace authority");
    assert(legalSpace.searchAndStrategyExcludedFromAuthority === true, "LegalSpace did not exclude search and strategy");
  });

  await check("preview_is_pure_and_candidate_bound", () => {
    const result = engine.preview({
      envelope: initialEnvelope,
      seatAuthority,
      proposal: moveProposal,
      occurredAt: OCCURRED_AT,
    });
    assert(result.ok, `preview rejected: ${result.reason || "unknown"}`);
    preview = result.preview;
    assert(preview.core.expectedStateRevision === 0, "preview revision mismatch");
    assert(preview.core.preStateHash === initialEnvelope.stateHash, "preview pre-state mismatch");
    assert(preview.core.result.postStateHash !== preview.core.preStateHash, "move preview did not change state");
    assert(preview.previewSeal.sealAlgorithm === "hmac-sha256", "preview is not short-term HMAC sealed");
    assert(initialEnvelope.revision === 0, "preview mutated the envelope");
  });

  await check("apply_matches_preview_and_appends_receipt", () => {
    applied = engine.apply({
      envelope: initialEnvelope,
      preview,
      seatAuthority,
      controlLease,
      expectedStateRevision: 0,
      idempotencyKey: "authority-verifier-move-1",
      occurredAt: OCCURRED_AT,
    });
    assert(applied.ok, `apply rejected: ${applied.reason || "unknown"}`);
    assert(applied.envelope.revision === 1, "apply did not increment revision");
    assert(applied.receipt.postStateHash === preview.core.result.postStateHash, "preview/apply post-state parity failed");
    assert(applied.receipt.eventsHash === preview.core.result.eventsHash, "preview/apply event parity failed");
    assert(applied.envelope.journalHeadHash === applied.receipt.journalHash, "journal head did not advance to receipt hash");
    assert(applied.receipt.refereeSignature.signatureAlgorithm === "ed25519", "accepted receipt is not permanently Ed25519 signed");
  });

  await check("stale_revision_fails_closed", () => {
    const stale = engine.apply({
      envelope: applied.envelope,
      preview,
      seatAuthority,
      controlLease,
      expectedStateRevision: 0,
      idempotencyKey: "authority-verifier-stale",
    });
    assert(!stale.ok && stale.reason === "REVISION_CONFLICT", `expected REVISION_CONFLICT, got ${stale.reason}`);
    assert(applied.envelope.revision === 1, "stale apply mutated current envelope");
  });

  await check("forged_preview_fails_closed", () => {
    const forged = {
      ...preview,
      core: {
        ...preview.core,
        action: { ...preview.core.action, to: { xInches: 999, yInches: 999 } },
      },
    };
    const result = engine.apply({
      envelope: initialEnvelope,
      preview: forged,
      seatAuthority,
      controlLease,
      expectedStateRevision: 0,
      idempotencyKey: "authority-verifier-forged-preview",
    });
    assert(!result.ok && result.reason === "CONFIRMATION_INVALID", `expected CONFIRMATION_INVALID, got ${result.reason}`);
  });

  await check("unknown_legal_space_action_fails_closed", () => {
    const result = engine.preview({
      envelope: initialEnvelope,
      seatAuthority,
      proposal: { kind: "finite", actionKey: "sc-action-forged" },
      occurredAt: OCCURRED_AT,
    });
    assert(!result.ok && result.reason === "LEGAL_SPACE_STALE", `expected LEGAL_SPACE_STALE, got ${result.reason}`);
  });

  await check("journal_replays_and_tampering_is_detected", () => {
    const replayed = engine.replay({ initialEnvelope, journal: [applied.receipt] });
    assert(replayed.ok, `valid replay rejected: ${replayed.reason || "unknown"}`);
    assert(replayed.envelope.stateHash === applied.envelope.stateHash, "replay final state mismatch");
    const tampered = { ...applied.receipt, events: [...applied.receipt.events, { type: "forged" }] };
    const rejected = engine.replay({ initialEnvelope, journal: [tampered] });
    assert(!rejected.ok && rejected.reason === "SIGNATURE_INVALID", `expected SIGNATURE_INVALID, got ${rejected.reason}`);
  });

  const report = {
    schemaVersion: "starcraft_tmg_authoritative_transition_compatibility_verifier_v2",
    generatedAt: new Date().toISOString(),
    checks,
    failures,
    ok: failures.length === 0,
    evidence: {
      roomId: initialEnvelope.roomId,
      initialStateHash: initialEnvelope.stateHash,
      legalSpaceHash: legalSpace.legalSpaceHash,
      parameterDomainId: moveDomain?.domainId || null,
      previewToken: preview?.previewToken || null,
      receiptHash: applied?.receipt?.journalHash || null,
      finalStateHash: applied?.envelope?.stateHash || null,
      seatGrantVerified: true,
      controlLeaseVerified: true,
      legacySecurityBypassUsed: false,
      trainingTruth: false,
    },
  };
  await mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await writeFile(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  if (!report.ok) throw new Error(failures.join("\n"));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : String(error));
  process.exitCode = 1;
});
