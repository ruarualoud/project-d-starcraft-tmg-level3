#!/usr/bin/env node

// One paid decision per requested step. The resulting draft is never an
// active RosterPlan until the separate Rules schedule and Teach review exist.
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = process.env.TICKET27_S271_FIXTURE_ROOT || root;
const dataDirectory = path.join(root,
  "build/ticket-27-slice-272-iterative-live-v1");
const argument = (name) => process.argv.find((value) =>
  value.startsWith(`--${name}=`))?.slice(name.length + 3);
const sessionId = argument("session") || "iterative-standard-2000-live-v1";
const steps = Number(argument("steps") || 1);
const preferRetainedRepair = argument("reconcile-last") === "true";
if (!Number.isSafeInteger(steps) || steps < 1 || steps > 12) {
  throw new Error("ITERATIVE_LIVE_STEPS_INVALID");
}

const secure = await createRosterPlanningSecureDeliberationFactoryV1();
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
  for (let step = 0; step < steps
    && (["active", "paused"].includes(state.status)
      || (state.status === "requires_reconciliation"
        && state.iterations.at(-1)?.decisionKind === "repair_needed"));
    step += 1) {
    state = await port.resume(sessionId,
      { preferRetainedRepair: preferRetainedRepair && step === 0 });
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
  }
  const replyStore = createIterativeRosterFileStoreV1({
    directory: path.join(dataDirectory, "iterative-draft") });
  let paidReplies = 0;
  let inputUnits = 0;
  let outputUnits = 0;
  let inputCacheHitUnits = 0;
  for (const iteration of state.iterations) {
    const reply = await replyStore.loadRetainedReply(iteration.requestKey);
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
    draftOnly: true, trainingTruth: false,
  })}\n`);
} finally {
  await secure.close();
}
