#!/usr/bin/env node

// One paid decision per requested step. The resulting draft is never an
// active RosterPlan until the separate Rules schedule and Teach review exist.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createInterface } from "node:readline";

import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { createRosterPlanningSecureDeliberationFactoryV1 } from
  "../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";
import { createIterativeRosterFileStoreV1 } from
  "../packages/roster-strategist/iterative-roster-file-store-v1.mjs";
import { OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1 } from
  "../packages/product-composition/official-standard-room-factory-v1.mjs";
import { STARCRAFT_TMG_DEEPSEEK_CURRENT_PRICING_SNAPSHOT_V2 } from
  "../packages/secure-provider-runtime/provider-pricing-v2.mjs";
import { resolveOfficialDevelopmentTrancheFixtureRootV1 } from
  "./support/official-development-tranche-source-lock-fixture-v1.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = await resolveOfficialDevelopmentTrancheFixtureRootV1({
  root, overrideRoot: process.env.TICKET27_S271_FIXTURE_ROOT || null,
});
const dataDirectory = path.join(root,
  "build/ticket-27-slice-272-iterative-live-v1");
const argument = (name) => process.argv.find((value) =>
  value.startsWith(`--${name}=`))?.slice(name.length + 3);
const sessionId = argument("session") || "iterative-standard-2000-live-v1";
const steps = Number(argument("steps") || 1);
const preferRetainedRepair = argument("reconcile-last") === "true";
const advanceAfterKnownInvalid = argument("advance-after-repair") === "true";
const advanceAfterBuilderRepair =
  argument("advance-after-builder-repair") === "true";
const prepareOnly = argument("prepare-only") === "true";
const scheduleOnly = argument("schedule") === "true";
const reviseSchedulePublicOnly = argument("revise-schedule-public") === "true";
const interactive = argument("interactive") === "true";
if (!Number.isSafeInteger(steps) || steps < 1 || steps > 12) {
  throw new Error("ITERATIVE_LIVE_STEPS_INVALID");
}
if (advanceAfterBuilderRepair && steps !== 1) {
  throw new Error("ITERATIVE_BUILDER_REPAIR_REQUIRES_ONE_STEP");
}

function repeatedBuilderRejection(state) {
  if (state.currentCandidate) return null;
  let code = null;
  let count = 0;
  for (const iteration of [...state.iterations].reverse()) {
    if (iteration.decisionKind !== "propose"
      || iteration.rulesVerdictStatus !== "illegal") break;
    const rejection = state.observations.findLast((entry) =>
      entry.requestKey === iteration.requestKey
        && entry.query?.kind === "builder_verdict"
        && entry.receipt?.status === "illegal");
    const nextCode = rejection?.receipt?.rulesErrorCode;
    if (!nextCode || (code && nextCode !== code)) break;
    code = nextCode;
    count += 1;
  }
  return count >= 3 ? { code, consecutiveRejections: count } : null;
}

const secure = (preferRetainedRepair && steps === 1) || prepareOnly
  ? { factory: { createForRun: async () => {
      throw new Error("RETAINED_RECONCILIATION_MUST_NOT_CALL_PROVIDER");
    } }, close: async () => {} }
  : await createRosterPlanningSecureDeliberationFactoryV1();
try {
  const product = await createRosterPlanningProductModuleV1({
    root, fixtureRoot, dataDirectory,
    mapConfiguration: { seedId: "sc1_lost_temple_v1",
      elementSelections: [], passageSelections: [] },
    deliberationFactory: secure.factory,
    enableIterativeDraft: true,
  });
  const port = product.iterativeDraft;
  let state;
  try { state = await port.read(sessionId); }
  catch (error) {
    if (error?.code !== "ITERATIVE_ROSTER_SESSION_NOT_FOUND") throw error;
    state = await port.start({ sessionId, sideKey: "player1",
      factionRecordKey:
        OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player1.factionRecordKey,
      opponentFactionRecordKey:
        OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1.player2.factionRecordKey,
      scaleId: "Standard", mineralBudget: 2000 });
  }
  if (prepareOnly) {
    state = await port.prepare(sessionId);
    const receipt = state.observations.findLast((entry) =>
      entry.query?.kind === "exact_budget_repairs"
        && entry.query.candidateHash
          === state.currentCandidate?.candidateHash)?.receipt;
    process.stdout.write(`${JSON.stringify({
      event: "iterative_roster_exact_budget_prepared", sessionId,
      revision: state.revision, status: state.status,
      sourceMineralSpent: receipt?.sourceMineralSpent ?? null,
      exactBuilderCertifiedOptions: receipt?.matches?.length ?? 0,
      menuPathsVisited: receipt?.menuPathsVisited ?? null,
      builderEvaluations: receipt?.builderEvaluations ?? null,
      providerCalls: 0,
    })}\n`);
  }
  if (scheduleOnly) {
    const result = await port.proposeSchedule(sessionId);
    state = await port.read(sessionId);
    process.stdout.write(`${JSON.stringify({
      event: "iterative_roster_arrival_schedule", sessionId,
      status: result.status,
      scheduleHash: result.schedule?.scheduleHash || null,
      rounds: result.schedule?.rounds || null,
      publicAudit: result.publicAudit || null,
      rejection: result.rejection || null,
      providerCallsThisCommand: result.providerCalls,
      readyForMatch: state.status === "ready_for_match",
    })}\n`);
  }
  if (reviseSchedulePublicOnly) {
    const result = await port.reviseSchedulePublicPlan(sessionId);
    state = await port.read(sessionId);
    process.stdout.write(`${JSON.stringify({
      event: "iterative_roster_arrival_public_revision", sessionId,
      status: result.status,
      publicAudit: result.publicAudit || null,
      rejection: result.rejection || null,
      providerCallsThisCommand: result.providerCalls,
      scheduleHash: state.openingDeploymentSchedule?.scheduleHash || null,
      readyForMatch: state.status === "ready_for_match",
    })}\n`);
  }
  if (interactive) {
    process.stdout.write(`${JSON.stringify({ event: "iterative_roster_ready",
      sessionId, revision: state.revision, status: state.status })}\n`);
    const lines = createInterface({ input: process.stdin,
      crlfDelay: Infinity });
    for await (const raw of lines) {
      const command = raw.trim();
      if (command === "quit") break;
      try {
        state = command === "status" ? await port.read(sessionId)
          : command === "prepare" ? await port.prepare(sessionId)
          : command === "step" ? await port.resume(sessionId)
          : command === "advance" ? await port.resume(sessionId,
            { advanceAfterKnownInvalid: true })
          : command === "reconcile" ? await port.resume(sessionId,
            { preferRetainedRepair: true })
          : null;
        if (!state) {
          process.stdout.write(`${JSON.stringify({
            event: "iterative_roster_command_invalid", command })}\n`);
          continue;
        }
        process.stdout.write(`${JSON.stringify({
          event: "iterative_roster_command_complete", command,
          revision: state.revision, status: state.status,
          decisionKind: state.iterations.at(-1)?.decisionKind || null,
          rulesVerdictStatus:
            state.iterations.at(-1)?.rulesVerdictStatus || null,
          mineralSpent: state.currentCandidate?.mineralSpent ?? null,
          blockingFinding: state.blockingFinding || null,
          exactOptions: state.observations.findLast((entry) =>
            entry.query?.kind === "exact_budget_repairs"
              && entry.query.candidateHash
                === state.currentCandidate?.candidateHash)
            ?.receipt?.matches?.length ?? 0,
        })}\n`);
      } catch (error) {
        process.stdout.write(`${JSON.stringify({
          event: "iterative_roster_command_failed", command,
          code: error?.code || error?.message || "UNKNOWN" })}\n`);
      }
    }
  }
  let operatorStop = null;
  if (!interactive && !prepareOnly && !scheduleOnly
    && !reviseSchedulePublicOnly && !advanceAfterBuilderRepair) {
    operatorStop = repeatedBuilderRejection(state);
    if (operatorStop) state = await port.pause(sessionId);
  }
  for (let step = 0; !operatorStop && !interactive && !prepareOnly && !scheduleOnly
    && !reviseSchedulePublicOnly
    && step < steps
    && (["active", "paused"].includes(state.status)
      || (state.status === "requires_reconciliation"
        && state.iterations.at(-1)?.decisionKind === "repair_needed"
        && (step === 0 || !advanceAfterKnownInvalid)));
    step += 1) {
    state = await port.resume(sessionId,
      { preferRetainedRepair: preferRetainedRepair && step === 0,
        advanceAfterKnownInvalid: advanceAfterKnownInvalid && step === 0 });
    process.stdout.write(`${JSON.stringify({
      event: "iterative_roster_step",
      sessionId, revision: state.revision,
      status: state.status,
      decisionKind: state.iterations.at(-1)?.decisionKind || null,
      rulesVerdictStatus:
        state.iterations.at(-1)?.rulesVerdictStatus || null,
      mineralSpent: state.currentCandidate?.mineralSpent || null,
      candidateHash: state.currentCandidate?.candidateHash || null,
      blockingFinding: state.blockingFinding || null,
      trainingTruth: false,
    })}\n`);
    operatorStop = repeatedBuilderRejection(state);
    if (operatorStop) {
      state = await port.pause(sessionId);
      break;
    }
  }
  if (operatorStop) process.stdout.write(`${JSON.stringify({
    event: "iterative_roster_builder_rejection_nonconvergent",
    sessionId, revision: state.revision, status: state.status,
    ...operatorStop, providerCallsAfterStop: 0,
    resumeRequiresExplicitBuilderRepair: true,
  })}\n`);
  const replyStore = createIterativeRosterFileStoreV1({
    directory: path.join(dataDirectory, "iterative-draft") });
  let paidReplies = 0;
  let inputUnits = 0;
  let outputUnits = 0;
  let inputCacheHitUnits = 0;
  for (const requestKey of [...state.iterations.map((iteration) =>
    iteration.requestKey), ...(state.arrivalRequestKeys || []),
    ...(state.publicRevisionRequestKeys || [])]) {
    const reply = await replyStore.loadRetainedReply(requestKey);
    if (reply?.paidProviderCall !== true) continue;
    paidReplies += 1;
    inputUnits += Number(reply.usage?.inputUnits || 0);
    outputUnits += Number(reply.usage?.outputUnits || 0);
    inputCacheHitUnits += Number(reply.usage?.inputCacheHitUnits || 0);
  }
  const tariff = STARCRAFT_TMG_DEEPSEEK_CURRENT_PRICING_SNAPSHOT_V2
    .models["deepseek-flash"].ratesPerTokenNanoUsd;
  const estimate = (rates) => Number((((
    (inputCacheHitUnits * rates.inputCacheHit)
    + ((inputUnits - inputCacheHitUnits) * rates.inputCacheMiss)
    + (outputUnits * rates.output)) / 1_000_000_000) * 8).toFixed(6));
  process.stdout.write(`${JSON.stringify({
    event: "iterative_roster_summary", sessionId,
    status: state.status, revision: state.revision,
    paidReplies, inputUnits, outputUnits,
    estimatedCostCnyRange: {
      offPeak: estimate(tariff.offPeak), peak: estimate(tariff.peak),
      providerInvoiceAuthoritative: false,
    },
    exact2000BuilderLegal: state.currentCandidate?.mineralSpent === 2000,
    selectedMapEvidenceBound: Boolean(state.plan?.mapEvidenceHash),
    readyForMatch: state.status === "ready_for_match",
    operatorStop,
    draftOnly: true, trainingTruth: false,
  })}\n`);
} finally {
  await secure.close();
}
