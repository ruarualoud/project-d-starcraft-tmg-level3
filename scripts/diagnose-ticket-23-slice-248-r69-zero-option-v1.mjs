// Read-only reconstruction of the actual r69 Goliath deployment query.
// This is a diagnostic capture, not a new Room, Provider call or pass gate.
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { createStarcraftTmgPrivatePayloadCodec } from
  "../packages/room-store/room-store-v1.mjs";
import { createStarcraftTmgRefereeCrypto } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { createStarcraftTmgAuthoritativeEngine, hashStarcraftTmgContract } from
  "../packages/authoritative-engine/transition-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV1 } from
  "../packages/product-composition/official-current-product-match-runtime-v1.mjs";
import { createOfficialCurrentProductMatchRuntimeV2 } from
  "../packages/product-composition/official-current-product-match-runtime-v2.mjs";
import { createOfficialCurrentProductMatchRuntimeV5 } from
  "../packages/product-composition/official-current-product-match-runtime-v5.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1,
  loadOfficialDevelopmentTrancheSourceLockFixtureV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";
import { searchStarcraftTmgLegalFormationOptionsAsyncV1 } from
  "../packages/online-agent-session/legal-formation-search-v1.mjs";
import { compareStarcraftTmgFormationBatchInWorkersV1 } from
  "../packages/online-agent-session/formation-comparison-worker-batch-v1.mjs";
import { projectStarcraftTmgSpatialParameterDomainsV1 } from
  "../packages/online-agent-session/spatial-action-query-runtime-v1.mjs";

const [roomDirectory, capturePath, reportPath, diagnosticMode,
  replayBaselinePath] = process.argv.slice(2);
const replayPrefixRegression = diagnosticMode === "--replay-prefix-regression";
const replayStagesOnly = diagnosticMode === "--replay-r70-stages"
  || replayPrefixRegression;
const captureOnlyPath = replayStagesOnly ? undefined : diagnosticMode;
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const capture = JSON.parse(await readFile(capturePath, "utf8"));
const secrets = JSON.parse(await readFile(path.join(roomDirectory,
  "runner-private.json"), "utf8"));
const report = { schemaVersion: "r69_zero_option_readonly_diagnostic_v1",
  targetRevision: replayStagesOnly ? 70 : 69, providerCalls: 0, realRoomMutations: 0,
  fullMatchAccepted: false, wholeActionOneMinuteAccepted: false, stages: [] };
const notice = stage => console.log(JSON.stringify({ stage,
  targetRevision: report.targetRevision, providerCalls: 0 }));
let database;
try {
  database = new DatabaseSync(path.join(roomDirectory, "room.sqlite"),
    { readOnly: true });
  const room = database.prepare("SELECT room_id, aggregate_cipher, initial_envelope_cipher FROM sc_rooms WHERE room_id=?")
    .get(secrets.roomId);
  const codec = createStarcraftTmgPrivatePayloadCodec({
    key: secrets.storeEncryptionKeyBase64,
    keyId: JSON.parse(room.aggregate_cipher).keyId,
    trustLevel: "development_persistent",
  });
  const initial = codec.decode(room.initial_envelope_cipher,
    `room:${secrets.roomId}:initial-envelope`);
  const checkpointRow = database.prepare("SELECT state_revision, checkpoint_cipher FROM sc_checkpoints WHERE room_id=? AND state_revision<=? ORDER BY state_revision DESC LIMIT 1")
    .get(secrets.roomId, report.targetRevision);
  const checkpoint = codec.decode(checkpointRow.checkpoint_cipher,
    `room:${secrets.roomId}:checkpoint:${checkpointRow.state_revision}`);
  const tail = database.prepare("SELECT sequence,payload_cipher FROM sc_private_journal WHERE room_id=? ORDER BY sequence")
    .all(secrets.roomId).map(row => codec.decode(row.payload_cipher,
      `room:${secrets.roomId}:private:${row.sequence}`))
    .filter(entry => entry.type === "accepted_transition")
    .map(entry => entry.payload.receipt)
    .filter(receipt => receipt.postStateRevision > checkpoint.stateRevision
      && receipt.postStateRevision <= report.targetRevision);
  database.close();
  database = null;
  notice("original_checkpoint_and_receipts_read_only");

  const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({ root });
  const source = await loadOfficialDevelopmentTrancheSourceLockFixtureV1({ root: fixtureRoot });
  const legacy = createOfficialCurrentProductMatchRuntimeV1({
    dataset: source.dataset, state: initial.state,
  });
  let rules = createOfficialCurrentProductMatchRuntimeV5({
    legacyRuntime: createOfficialCurrentProductMatchRuntimeV2({ legacyRuntime: legacy }),
  });
  assert.equal(rules.descriptor.runtimeHash,
    initial.matchBinding.rulesRuntimeBinding.runtimeHash,
    "diagnosis cannot substitute a different frozen Rules runtime");
  const refereeCrypto = createStarcraftTmgRefereeCrypto({
    privateKey: secrets.refereePrivateKeyPem,
    publicKey: secrets.refereePublicKeyPem,
    hmacSecret: secrets.refereeHmacSecret,
    keyId: initial.matchBinding.refereeKeyId,
    trustLevel: "development_persistent",
  });
  let makeEngine = createStarcraftTmgAuthoritativeEngine;
  let replayTiming;
  if (replayStagesOnly) {
    const engineUrl = new URL("../packages/authoritative-engine/transition-v1.mjs",
      import.meta.url);
    let engineSource = await readFile(engineUrl, "utf8");
    engineSource = engineSource.replace("  hashStarcraftTmgContract,\n",
      "  hashStarcraftTmgContract as originalReplayContractHash,\n");
    for (const name of ["normalizeAuthorityState", "validateEnvelope",
      "verifyCheckpoint", "verifyReceipt", "resolveProposal",
      "deterministicTransition", "createEnvelope", "verifyFrozenDependencies",
      "validateMatchBinding"]) {
      const seam = `function ${name}(`;
      assert.ok(engineSource.includes(seam), `missing real replay seam: ${name}`);
      engineSource = engineSource.replace(seam,
        `function ${name}(...args) { return timeOriginalReplayStage("${name}", `
        + `() => originalTimed_${name}(...args)); }\nfunction originalTimed_${name}(`);
    }
    engineSource = engineSource.replace(/(\bfrom\s+["'])(\.[^"']+)(["'])/gu,
      (_, before, relative, after) =>
        `${before}${new URL(relative, engineUrl).href}${after}`);
    engineSource += `
let originalReplayTimings = {}, originalReplayTimingStack = [];
export function timeOriginalReplayStage(name, invoke) {
  const frame = { startedAt: performance.now(), childMs: 0 };
  originalReplayTimingStack.push(frame);
  try { return invoke(); } finally {
    const elapsedMs = performance.now() - frame.startedAt;
    originalReplayTimingStack.pop();
    const parent = originalReplayTimingStack.at(-1);
    if (parent) parent.childMs += elapsedMs;
    const row = originalReplayTimings[name] ||= { count: 0,
      inclusiveMs: 0, exclusiveMs: 0 };
    row.count += 1; row.inclusiveMs += elapsedMs;
    row.exclusiveMs += elapsedMs - frame.childMs;
  }
}
function hashStarcraftTmgContract(...args) {
  return timeOriginalReplayStage("hashStarcraftTmgContract",
    () => originalReplayContractHash(...args));
}
export function resetOriginalReplayTimings() { originalReplayTimings = {}; }
export function readOriginalReplayTimings() { return originalReplayTimings; }
`;
    replayTiming = await import(
      `data:text/javascript;base64,${Buffer.from(engineSource).toString("base64")}`);
    makeEngine = replayTiming.createStarcraftTmgAuthoritativeEngine;
    const originalRules = rules;
    rules = Object.freeze({ ...originalRules,
      ...Object.fromEntries(["enumerate", "apply", "instantiate"]
        .filter(name => typeof originalRules[name] === "function")
        .map(name => [name, (...args) => replayTiming.timeOriginalReplayStage(
          `rules.${name}`, () => originalRules[name](...args))])),
    });
  }
  const engine = makeEngine({ rulesRuntime: rules,
    refereeCrypto });
  const original = initial.matchBinding;
  const state = initial.state;
  // Register only exact original artifacts; no real Room creation or signing
  // lineage is changed. A mismatch stops diagnosis instead of adapting history.
  const registered = engine.createMatchBinding({
    roomId: original.roomId, gameId: original.gameId, matchId: original.matchId,
    dataVersion: original.dataVersion, rngSchemeId: original.rngSchemeId,
    dependencies: {
      sourceSnapshot: { ...original.dependencies.sourceSnapshot,
        content: source.snapshot },
      dataSnapshot: { ...original.dependencies.dataSnapshot,
        content: state.officialGameplayDataBundle },
      geometryArtifact: { ...original.dependencies.geometryArtifact,
        content: {
          geometryBinding: state.officialDeploymentGeometryBinding,
          terrainLedger: state.officialTerrainHeightTierLedger,
          markerPlacement: state.officialMissionMarkerPlacement,
          missionRuntimeDescriptor: state.officialMissionRuntimeDescriptor,
          battlefieldMapManifest: state.board.battlefieldMapManifest,
          competitiveMapRoomFreeze: state.officialCompetitiveMapRoomFreeze,
        } },
    },
  });
  assert.equal(registered.bindingHash, original.bindingHash);
  notice("original_frozen_binding_reconstructed");
  replayTiming?.resetOriginalReplayTimings();
  const replayStartedAt = performance.now();
  const precedingReplay = replayPrefixRegression ? engine.replay({
    initialEnvelope: initial, checkpoint, journal: tail.slice(0, -1),
  }) : null;
  const replay = engine.replay({ initialEnvelope: initial, checkpoint, journal: tail });
  report.reconstructionElapsedMs = Math.round(performance.now() - replayStartedAt);
  assert.equal(replay.ok, true, replay.reason || "original receipt reconstruction failed");
  assert.equal(replay.envelope.stateRevision, report.targetRevision);
  assert.equal(replay.envelope.stateHash, replayStagesOnly
    ? tail.at(-1).postStateHash : capture.authority.stateHash);
  if (replayStagesOnly) {
    report.restoredStateHash = replay.envelope.stateHash;
    report.restoredJournalHeadHash = replay.envelope.journalHeadHash;
    report.frozenRuntimeHash = rules.descriptor.runtimeHash;
    report.checkpointRevision = checkpoint.stateRevision;
    report.replayedReceiptCount = tail.length;
    report.originalStoredResultIdentical = true;
    report.methodTimings = replayTiming.readOriginalReplayTimings();
    report.cpuSamplingUsed = false;
    report.searchPerformed = false;
    report.status = "original_replay_captured";
    if (replayPrefixRegression) {
      assert.equal(precedingReplay.ok, true);
      assert.equal(precedingReplay.envelope.stateHash, tail.at(-2).postStateHash);
      const fullResults = [precedingReplay, replay].map(hashStarcraftTmgContract);
      let baseline;
      try { baseline = JSON.parse(await readFile(replayBaselinePath, "utf8")); }
      catch (error) {
        if (error.code !== "ENOENT") throw error;
        baseline = { fullResults,
          repeatedRuleApplyCount: report.methodTimings["rules.apply"].count,
          elapsedMs: report.reconstructionElapsedMs };
        await writeFile(replayBaselinePath, JSON.stringify(baseline) + "\n",
          { flag: "wx", mode: 0o600 });
      }
      assert.deepEqual(fullResults, baseline.fullResults,
        "retain the complete original preceding/current replay responses");
      report.originalFullReplayResponsesIdentical = true;
      report.baselineElapsedMs = baseline.elapsedMs;
      report.baselineRepeatedRuleApplyCount = baseline.repeatedRuleApplyCount;
      report.firstTwoRuleApplyCount = report.methodTimings["rules.apply"].count;
      assert.equal(report.firstTwoRuleApplyCount, tail.length,
        "the current replay must execute only the new receipt after a verified common prefix");
      replayTiming.resetOriginalReplayTimings();
      const sameReplay = engine.replay({ initialEnvelope: initial, checkpoint,
        journal: structuredClone(tail) });
      assert.equal(hashStarcraftTmgContract(sameReplay), fullResults[1]);
      assert.equal(replayTiming.readOriginalReplayTimings()["rules.apply"]?.count || 0, 0);
      assert.notStrictEqual(sameReplay.envelope, replay.envelope);
      const changedReceipts = structuredClone(tail);
      changedReceipts[0].postStateHash = "0".repeat(64);
      const tampered = engine.replay({ initialEnvelope: initial, checkpoint,
        journal: changedReceipts });
      assert.equal(tampered.ok, false,
        "a changed earlier receipt must invalidate the cached prefix");
      const changedCheckpoint = structuredClone(checkpoint);
      changedCheckpoint.state.scores.player1 += 1;
      assert.equal(engine.replay({ initialEnvelope: initial,
        checkpoint: changedCheckpoint, journal: tail }).ok, false);
      const changedInitial = structuredClone(initial);
      changedInitial.state.round += 1;
      assert.equal(engine.replay({ initialEnvelope: changedInitial,
        checkpoint, journal: tail }).ok, false);
      const shorterReplay = engine.replay({ initialEnvelope: initial, checkpoint,
        journal: tail.slice(0, -1) });
      assert.equal(hashStarcraftTmgContract(shorterReplay), fullResults[0]);
      report.exactInputRepeatReturnedIndependentResponse = true;
      report.changedReceiptCheckpointInitialRejected = true;
      report.shorterHistoryRetainsOriginalResponse = true;
      report.status = "original_replay_prefix_regression_passed";
    }
  } else {
  const legalSpace = engine.legalSpace(replay.envelope,
    { internalServerAuthority: true, sideKey: capture.authority.seatKey });
  assert.equal(legalSpace.legalSpaceHash, capture.authority.legalSpaceHash);
  const domain = legalSpace.parameterDomains.find(entry =>
    entry.domainId === capture.domainId);
  assert.ok(domain, "original selected domain missing");
  // The paid action index retains the model-facing projection, while the
  // production Query adapter receives the complete Rules domain. Compare
  // through that actual projection; pass the untouched full domain to Rules.
  const projectedDomain = projectStarcraftTmgSpatialParameterDomainsV1(legalSpace)
    .find(entry => entry.domainId === capture.domainId);
  assert.equal(hashStarcraftTmgContract(projectedDomain),
    hashStarcraftTmgContract(capture.domain));
  report.restoredStateHash = replay.envelope.stateHash;
  report.frozenRuntimeHash = rules.descriptor.runtimeHash;
  report.checkpointRevision = checkpoint.stateRevision;
  report.replayedReceiptCount = tail.length;
  report.originalDomainAndAuthorityIdentical = true;
  notice("actual_r69_query_ready");
  const capturedParameters = [];
  const searchStartedAt = performance.now();
  const result = await searchStarcraftTmgLegalFormationOptionsAsyncV1({
    state: replay.envelope.state, domain, request: capture.request,
    instantiate: (...args) => {
      if (!captureOnlyPath) return rules.instantiate(...args);
      // Capture the production solver's actual call-site inputs, without
      // executing Rules or inventing a verdict. No comparison runs because
      // capture mode deliberately produces no instantiated option.
      capturedParameters.push(structuredClone(args[2]));
      throw new Error("DIAGNOSTIC_CAPTURE_ONLY_NOT_A_RULES_VERDICT");
    },
    instantiateOptions: { matchBinding: original },
    observeProgress: event => {
      report.stages.push(event);
      if (["candidate_generation_complete", "search_completed"].includes(event.stage)
        || (event.stage === "candidate_started"
          && event.examinedGeneratedCandidateCount % 100 === 0)) {
        console.log(JSON.stringify({ stage: event.stage, elapsedMs: event.elapsedMs,
          examined: event.examinedGeneratedCandidateCount }));
      }
    },
  }, { compareBatch: compareStarcraftTmgFormationBatchInWorkersV1 });
  report.searchElapsedMs = Math.round(performance.now() - searchStartedAt);
  report.result = { optionCount: result.optionCount,
    attemptedCandidateCount: result.attemptedCandidateCount,
    instantiatedCandidateCount: result.instantiatedCandidateCount,
    prefilteredCandidateCount: result.prefilteredCandidateCount,
    duplicateIntentCandidateCount: result.duplicateIntentCandidateCount,
    failureCounts: result.failureCounts, searchCoverage: result.searchCoverage };
  if (captureOnlyPath) {
    assert.equal(capturedParameters.length, 164,
      "retain every original r69 instantiated candidate input");
    await writeFile(captureOnlyPath, JSON.stringify({
      schemaVersion: "r69_original_deploy_callsite_capture_v1",
      authority: capture.authority, state: replay.envelope.state, domain,
      parameters: capturedParameters,
      frozenRuntimeHash: report.frozenRuntimeHash,
      rulesVerdictGenerated: false, providerCalls: 0, realRoomMutations: 0,
    }) + "\n", { flag: "wx", mode: 0o600 });
    report.status = "callsite_inputs_captured_no_verdict";
    report.capturedParameterCount = capturedParameters.length;
    report.result = null;
  } else {
    report.status = "captured";
  }
  }
} catch (error) {
  report.status = "reconstruction_stopped";
  report.errorCode = error.code || error.name;
  // Assertion/code context only, never secret-bearing source state or options.
  report.message = String(error.message).slice(0, 1200);
  process.exitCode = 1;
} finally {
  database?.close();
  await writeFile(reportPath, JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify({ status: report.status,
    searchElapsedMs: report.searchElapsedMs, optionCount: report.result?.optionCount,
    errorCode: report.errorCode, providerCalls: 0, realRoomMutations: 0 }));
}
