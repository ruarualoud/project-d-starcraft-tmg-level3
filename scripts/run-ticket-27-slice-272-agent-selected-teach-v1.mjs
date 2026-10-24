#!/usr/bin/env node

// Continue the saved Agent-selected exact-2000 roster through the existing
// locked-list Teach runtime. The lock prevents a second list selection; the
// later bridge restores the original Agent candidate identity.
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, rename, writeFile } from "node:fs/promises";

import { hashStarcraftTmgContract } from
  "../packages/authoritative-engine/referee-crypto-v1.mjs";
import { reviewRosterFinalPlanV1, reviewRosterFinalPlanV2,
  reviewRosterFinalPlanV3,
  supplementRosterFinalPlanReviewWithMissionScoringV1 } from
  "../packages/roster-strategist/roster-final-plan-review-v1.mjs";
import { createRosterPlanningProductModuleV1 } from
  "../packages/product-composition/roster-planning-product-module-v1.mjs";
import { createRosterPlanningSecureDeliberationFactoryV1 } from
  "../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs";
import { decideRosterReviewDispatchRecoveryV1 } from
  "../packages/roster-planning-workspace/review-dispatch-recovery-v1.mjs";
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
const iterativeSessionId = argument("iterative-session-id")
  || "iterative-standard-2000-live-v1";
const teachSessionId = argument("teach-session-id")
  || "agent-selected-teach-standard-2000-live-v1";
const artifactStem = iterativeSessionId === "iterative-standard-2000-live-v1"
  && teachSessionId === "agent-selected-teach-standard-2000-live-v1"
  ? "agent-selected-teach-"
  : `agent-selected-teach-${hashStarcraftTmgContract({
    iterativeSessionId, teachSessionId }).slice(0, 16)}-`;
const prepareOnly = process.argv.includes("--prepare-only");
const bridgeOnly = process.argv.includes("--bridge-only");
const reviewAgent = process.argv.includes("--review-agent");
const repairAndReview = process.argv.includes("--repair-and-review");
const repairAgent = process.argv.includes("--repair-agent")
  || repairAndReview;
const reviewRepaired = process.argv.includes("--review-repaired")
  || repairAndReview;
const repairRound = Number(argument("repair-round") || 1);
const resumeAmbiguousReviewShard = Number(
  argument("resume-ambiguous-review-shard") || 0);
if (!Number.isSafeInteger(resumeAmbiguousReviewShard)
  || resumeAmbiguousReviewShard < 0) {
  throw new Error("AGENT_SELECTED_TEACH_REVIEW_RESUME_SHARD_INVALID");
}
const recoveryCycleId = argument("recovery-cycle-id") || null;
const recoveryBaseRepairRound = Number(
  argument("recovery-base-repair-round") || 0);
if (!Number.isInteger(repairRound) || repairRound < 1 || repairRound > 3
  || (repairRound !== 1 && !repairAgent && !reviewRepaired)) {
  throw new Error("AGENT_SELECTED_TEACH_REPAIR_ROUND_INVALID");
}
if (recoveryCycleId && (!/^[a-z0-9][a-z0-9-]{0,48}$/.test(recoveryCycleId)
  || !Number.isInteger(recoveryBaseRepairRound)
  || recoveryBaseRepairRound < 1 || recoveryBaseRepairRound > 3
  || (!repairAgent && !reviewRepaired))
  || (!recoveryCycleId && recoveryBaseRepairRound !== 0)) {
  throw new Error("AGENT_SELECTED_TEACH_RECOVERY_CYCLE_INVALID");
}
if ([prepareOnly, bridgeOnly, reviewAgent,
  process.argv.includes("--repair-agent"),
  process.argv.includes("--review-repaired"), repairAndReview]
  .filter(Boolean).length > 1) {
  throw new Error("AGENT_SELECTED_TEACH_MODE_CONFLICT");
}
const secure = prepareOnly || bridgeOnly ? null
  : await createRosterPlanningSecureDeliberationFactoryV1();
const reviewPath = path.join(dataDirectory,
  `${artifactStem}final-review-v1.json`);
const sourceReviewPath = path.join(dataDirectory,
  `${artifactStem}final-review-source-bound-v1.json`);
const retainedReviewPath = path.join(dataDirectory,
  `${artifactStem}final-review-retained-v1.json`);
const retainedReviewShardPath = (roundIndex) => path.join(dataDirectory,
  `${artifactStem}final-review-shard-${roundIndex}-retained-v1.json`);
const failedReviewShardPath = (roundIndex) => path.join(dataDirectory,
  `${artifactStem}final-review-shard-${roundIndex}-failure-v1.json`);
const reviewRecoveryIntentPath = (roundIndex, version = 1) => path.join(
  dataDirectory,
  `${artifactStem}final-review-shard-${roundIndex}-recovery-intent-v${version}.json`);
const repairSuffix = repairRound === 1 ? "v1" : `v${repairRound}`;
const repairArtifactStem = recoveryCycleId
  ? `${artifactStem}cycle-${recoveryCycleId}-` : artifactStem;
const recoverySessionSuffix = recoveryCycleId
  ? `-${recoveryCycleId}` : "";
const repairPath = path.join(dataDirectory,
  `${repairArtifactStem}claim-repair-${repairSuffix}.json`);
const retainedRepairPath = path.join(dataDirectory,
  `${repairArtifactStem}claim-repair-retained-${repairSuffix}.json`);
const revisedReviewPath = path.join(dataDirectory,
  `${repairArtifactStem}revised-review-${repairSuffix}.json`);
const retainedRevisedReviewPath = path.join(dataDirectory,
  `${repairArtifactStem}revised-review-retained-${repairSuffix}.json`);
const revisedReviewShardPath = (roundIndex) => path.join(dataDirectory,
  `${repairArtifactStem}revised-review-shard-${roundIndex}-retained-${repairSuffix}.json`);
const revisedReviewFailurePath = (roundIndex) => path.join(dataDirectory,
  `${repairArtifactStem}revised-review-shard-${roundIndex}-failure-${repairSuffix}.json`);
const revisedReviewRecoveryIntentPath = (roundIndex, version = 1) =>
  path.join(dataDirectory,
    `${repairArtifactStem}revised-review-shard-${roundIndex}-recovery-intent-v${version}-${repairSuffix}.json`);
const priorRepairPath = repairRound === 1 ? null : path.join(dataDirectory,
  `${repairArtifactStem}claim-repair-v${repairRound - 1}.json`);
const priorRevisedReviewPath = repairRound === 1 ? null
  : path.join(dataDirectory,
    `${repairArtifactStem}revised-review-v${repairRound - 1}.json`);
const recoveryBaseRepairPath = recoveryCycleId ? path.join(dataDirectory,
  `${artifactStem}claim-repair-v${recoveryBaseRepairRound}.json`) : null;
const recoveryBaseReviewPath = recoveryCycleId ? path.join(dataDirectory,
  `${artifactStem}revised-review-v${recoveryBaseRepairRound}.json`) : null;
async function readJsonIfPresent(file) {
  try { return JSON.parse(await readFile(file, "utf8")); }
  catch (error) { if (error?.code === "ENOENT") return null; throw error; }
}
async function persistJson(file, value) {
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`,
    { mode: 0o600 });
  await rename(temporary, file);
}
async function persistNewJson(file, value) {
  await writeFile(file, `${JSON.stringify(value, null, 2)}\n`,
    { mode: 0o600, flag: "wx" });
}

try {
  const product = await createRosterPlanningProductModuleV1({
    root, fixtureRoot, dataDirectory,
    mapConfiguration: { seedId: "sc1_lost_temple_v1",
      elementSelections: [], passageSelections: [] },
    deliberationFactory: secure?.factory || {
      createForRun: async () => {
        throw new Error("AGENT_SELECTED_TEACH_PREPARE_MUST_NOT_CALL_PROVIDER");
      },
    },
    createSessionId: () => teachSessionId,
    enableIterativeDraft: true,
  });
  const handoff = await product.iterativeDraft.prepareTeachHandoff(
    iterativeSessionId);
  let session;
  try {
    session = product.service.readSession(teachSessionId);
  } catch (error) {
    if (error?.code !== "ROSTER_WORKSPACE_SESSION_NOT_FOUND") throw error;
    const candidateInput = handoff.lockedRoster.lock.candidateInput;
    session = await product.service.createAgentSelectedTeachSession({
      setup: {
        sideKey: candidateInput.sideKey,
        factionRecordKey: candidateInput.factionRecordKey,
        opponentFactionRecordKey:
          (await product.iterativeDraft.read(iterativeSessionId))
            .frozenContext.opponentFactionRecordKey,
        engagementScale: candidateInput.scaleId,
        mineralBudget: candidateInput.mineralBudget,
        opponentInformationBoundary: "open_roster",
      },
      handoff,
    });
  }
  if (session.agentSelectionHandoffHash !== handoff.handoffHash
    || session.agentSelectedCandidateHash
      !== handoff.iterativeCandidateHash) {
    throw new Error("AGENT_SELECTED_TEACH_SESSION_SOURCE_DRIFT");
  }
  process.stdout.write(`${JSON.stringify({
    event: "agent_selected_teach_prepared",
    iterativeSessionId, teachSessionId,
    status: session.status,
    selectedByAgentDeliberation: true,
    exact2000: handoff.lockedRoster.lock.verdict.summary.mineralSpent,
    handoffHash: handoff.handoffHash,
    arrivalScheduleHash: handoff.arrivalScheduleHash,
    mapRouteReceiptHash: handoff.mapRouteReceiptHash,
    providerCallsThisCommand: 0,
  })}\n`);
  if (bridgeOnly) {
    const bridge = await product.prepareAgentSelectedTeachPromotion(
      iterativeSessionId, teachSessionId);
    process.stdout.write(`${JSON.stringify({
      event: "agent_selected_teach_plan_bridged",
      bridgeHash: bridge.bridgeHash,
      sessionReceiptHash: bridge.sessionReceipt.receiptHash,
      planHash: bridge.plan.planHash,
      planSchema: bridge.plan.schema,
      candidateId: bridge.plan.rosterCandidate.candidateId,
      selectedByAgentDeliberation: true,
      arrivalScheduleHash:
        bridge.plan.openingDeploymentSchedule.scheduleHash,
      sourceAuditRequiredBeforeRoom: true,
      readyForMatch: false,
      providerCallsThisCommand: 0,
    })}\n`);
  }
  if (reviewAgent) {
    const bridge = await product.prepareAgentSelectedTeachPromotion(
      iterativeSessionId, teachSessionId);
    const existing = await readJsonIfPresent(reviewPath);
    if (existing && existing.planHash !== bridge.plan.planHash) {
      throw new Error("AGENT_SELECTED_TEACH_REVIEW_PLAN_DRIFT");
    }
    let review = existing;
    let newProviderCalls = 0;
    if (!review) {
      const retainedLegacy = await readJsonIfPresent(retainedReviewPath);
      if (retainedLegacy) {
        const reviewPort = retainedLegacy.outputContractRef?.id
          === "ticket27.roster_final_plan_review.v1"
          ? reviewRosterFinalPlanV1
          : retainedLegacy.outputContractRef?.id
            === "ticket27.roster_final_plan_review.v2"
            ? reviewRosterFinalPlanV2 : null;
        if (!reviewPort) {
          throw new Error("AGENT_SELECTED_TEACH_RETAINED_REVIEW_CONTRACT_UNKNOWN");
        }
        review = await reviewPort({
          plan: bridge.plan,
          sessionId: `${teachSessionId}-agent-review`,
          toolReceipts: session.evidence.toolReceipts,
          selectedCandidateInputHash: hashStarcraftTmgContract(
            session.selectedCandidateInput),
          deliberation: { deliberate: async (request) => {
            if (request.contextHash !== retainedLegacy.contextHash
              || hashStarcraftTmgContract(request.responseFormat
                .outputContractRef)
                !== hashStarcraftTmgContract(
                  retainedLegacy.outputContractRef)) {
              throw new Error("AGENT_SELECTED_TEACH_RETAINED_REVIEW_DRIFT");
            }
            return { output: retainedLegacy.sanitizedOutput,
              receipt: { receiptHash: retainedLegacy.receiptHash,
                retainedPaidReplyReplay: true } };
          } },
        });
      } else {
      const live = await secure.factory.createForRun({
        sessionId: `${teachSessionId}-agent-review`,
        runKind: "final-review",
        onEvent: async (event) => {
          if (event.type === "round_failed") {
            await persistJson(failedReviewShardPath(event.roundIndex), {
              schema: "starcraft_tmg_agent_selected_teach_review_failure_v1",
              planHash: bridge.plan.planHash,
              roundIndex: event.roundIndex, code: event.code,
              paidProviderCall: event.paidProviderCall,
              usage: event.usage || null,
              latencyMs: event.latencyMs ?? null,
              receiptHash: event.receiptHash || null,
              providerTransport: event.providerTransport || null,
              providerIncompleteReason:
                event.providerIncompleteReason || null,
              recordedAt: event.at, trainingTruth: false,
            });
            return;
          }
          if (event.type !== "round_completed") return;
          await persistJson(retainedReviewShardPath(event.roundIndex), {
            schema: "starcraft_tmg_agent_selected_teach_review_retain_v1",
            ...event.sanitizedOutputRecord,
            receiptHash: event.receiptHash,
            paidProviderCall: event.paidProviderCall,
            usage: event.usage,
            trainingTruth: false,
          });
          newProviderCalls += 1;
        },
      });
      const deliberation = {
        deliberate: async (request) => {
          const retained = await readJsonIfPresent(
            retainedReviewShardPath(request.roundIndex));
          if (!retained) {
            const failed = await readJsonIfPresent(
              failedReviewShardPath(request.roundIndex));
            if (failed?.providerTransport?.requestMayHaveBeenSent) {
              const priorIntents = [];
              for (let version = 1; version <= 2; version += 1) {
                const intent = await readJsonIfPresent(
                  reviewRecoveryIntentPath(request.roundIndex, version));
                if (!intent) break;
                priorIntents.push(intent);
              }
              const decision = decideRosterReviewDispatchRecoveryV1({
                failed, priorIntents,
                planHash: bridge.plan.planHash,
                roundIndex: request.roundIndex,
                contextHash: request.contextHash,
                explicitResume: resumeAmbiguousReviewShard
                  === request.roundIndex,
              });
              if (decision.kind !== "retry_allowed") {
                throw new Error(`AGENT_SELECTED_TEACH_REVIEW_RECOVERY_BLOCKED:${decision.reason}`);
              }
              await persistNewJson(reviewRecoveryIntentPath(
                request.roundIndex, decision.nextIntentVersion), {
                ...decision.intent,
                recordedAt: new Date().toISOString(),
              });
            } else if (failed?.paidProviderCall) {
              throw new Error(
                "AGENT_SELECTED_TEACH_PAID_REVIEW_FAILURE_REQUIRES_VERSIONED_REPAIR");
            }
            return live.deliberate(request);
          }
          if (request.contextHash !== retained.contextHash
            || hashStarcraftTmgContract(request.responseFormat
              .outputContractRef)
              !== hashStarcraftTmgContract(retained.outputContractRef)) {
            throw new Error("AGENT_SELECTED_TEACH_RETAINED_REVIEW_DRIFT");
          }
          return { output: retained.sanitizedOutput,
            receipt: { receiptHash: retained.receiptHash,
              retainedPaidReplyReplay: true } };
        },
      };
      review = await reviewRosterFinalPlanV3({
        plan: bridge.plan, deliberation,
        sessionId: `${teachSessionId}-agent-review`,
        toolReceipts: session.evidence.toolReceipts,
        selectedCandidateInputHash: hashStarcraftTmgContract(
          session.selectedCandidateInput),
      });
      }
      await persistJson(reviewPath, review);
    }
    const sourceReview = await readJsonIfPresent(sourceReviewPath)
      || supplementRosterFinalPlanReviewWithMissionScoringV1({
        plan: bridge.plan, review,
        toolReceipts: session.evidence.toolReceipts,
        missionProfile: product.officialMissionScoringProfile(),
      });
    if (sourceReview.planHash !== bridge.plan.planHash) {
      throw new Error("AGENT_SELECTED_TEACH_SOURCE_REVIEW_PLAN_DRIFT");
    }
    await persistJson(sourceReviewPath, sourceReview);
    process.stdout.write(`${JSON.stringify({
      event: "agent_selected_teach_final_review",
      planHash: bridge.plan.planHash,
      reviewHash: sourceReview.reviewHash,
      paidReviewHash: review.reviewHash,
      findingCount: sourceReview.findings.length,
      highFindings: sourceReview.findings.filter((finding) =>
        finding.severity === "high").map((finding) => ({
        claimPath: finding.claimPath,
        publicReason: finding.publicReason,
      })),
      sourceAuditVersion: review.evidenceAuditVersion,
      newProviderCalls,
      readyForMatch: false,
    })}\n`);
  }
  if (repairAgent) {
    const bridge = await product.prepareAgentSelectedTeachPromotion(
      iterativeSessionId, teachSessionId);
    const paidReview = await readJsonIfPresent(reviewPath);
    const current = repairRound === 1 && recoveryCycleId
      ? (await readJsonIfPresent(recoveryBaseRepairPath))?.plan
      : repairRound === 1 ? bridge.plan
      : (await readJsonIfPresent(priorRepairPath))?.plan;
    const review = repairRound === 1 && recoveryCycleId
      ? await readJsonIfPresent(recoveryBaseReviewPath)
      : repairRound === 1
      ? await readJsonIfPresent(sourceReviewPath)
        || (paidReview && supplementRosterFinalPlanReviewWithMissionScoringV1({
        plan: bridge.plan, review: paidReview,
        toolReceipts: session.evidence.toolReceipts,
        missionProfile: product.officialMissionScoringProfile(),
      }))
      : await readJsonIfPresent(priorRevisedReviewPath);
    if (!current || review?.planHash !== current.planHash
      || !review.findings.some((finding) =>
        finding.severity === "high")) {
      throw new Error("AGENT_SELECTED_TEACH_HIGH_REVIEW_REQUIRED");
    }
    let repaired = await readJsonIfPresent(repairPath);
    let newProviderCalls = 0;
    if (!repaired) {
      const retained = await readJsonIfPresent(retainedRepairPath);
      const live = retained ? null : await secure.factory.createForRun({
        sessionId: `${teachSessionId}-claim-repair${
          recoverySessionSuffix}-r${repairRound}`,
        runKind: "claim-repair",
        onEvent: async (event) => {
          if (event.type !== "round_completed") return;
          await persistJson(retainedRepairPath, {
            schema: "starcraft_tmg_agent_selected_teach_repair_retain_v1",
            ...event.sanitizedOutputRecord,
            receiptHash: event.receiptHash,
            paidProviderCall: event.paidProviderCall,
            usage: event.usage,
            trainingTruth: false,
          });
          newProviderCalls += 1;
        },
      });
      const deliberation = retained ? {
        descriptor: () => ({ modelVersion: "retained_paid_reply",
          promptVersion: "agent_selected_claim_repair_v1" }),
        deliberate: async (request) => {
          if (request.contextHash !== retained.contextHash
            || hashStarcraftTmgContract(request.responseFormat
              .outputContractRef)
              !== hashStarcraftTmgContract(retained.outputContractRef)) {
            throw new Error("AGENT_SELECTED_TEACH_RETAINED_REPAIR_DRIFT");
          }
          return { output: retained.sanitizedOutput,
            receipt: { receiptHash: retained.receiptHash,
              retainedPaidReplyReplay: true } };
        },
      } : live;
      // V3 applies every distinct High path as one coordinated revision.
      // Do not emit another partially repaired plan merely to fit the old
      // five-field output contract.
      const paths = [...new Set(review.findings.filter((finding) =>
        finding.severity === "high").map((finding) =>
        finding.claimPath))];
      repaired = await product.reviseAgentSelectedTeachPlan({
        iterativeSessionId, teachSessionId,
        plan: current, review,
        targetedClaimPaths: paths, deliberation,
      });
      if (repaired.plan.rosterCandidate.candidateHash
          !== bridge.plan.rosterCandidate.candidateHash
        || repaired.plan.openingDeploymentSchedule.scheduleHash
          !== bridge.plan.openingDeploymentSchedule.scheduleHash
        || (!paths.includes("scoreRoute.routeText")
          && repaired.plan.scoreRoute.scoreRouteHash
            !== current.scoreRoute.scoreRouteHash)
        || repaired.plan.scoreRoute.targetVpSchedule.length
          !== bridge.plan.scoreRoute.targetVpSchedule.length
        || hashStarcraftTmgContract(
          repaired.plan.scoreRoute.targetVpSchedule)
          !== hashStarcraftTmgContract(
            bridge.plan.scoreRoute.targetVpSchedule)) {
        throw new Error("AGENT_SELECTED_TEACH_REPAIR_MUTATED_LOCKED_FACTS");
      }
      await persistJson(repairPath, repaired);
    }
    process.stdout.write(`${JSON.stringify({
      event: "agent_selected_teach_claims_repaired",
      fromPlanHash: current.planHash,
      revisedPlanHash: repaired.plan.planHash,
      revisionVersion: repaired.plan.planVersion,
      recoveryCycleId,
      repairRound,
      scheduleUnchanged: repaired.plan.openingDeploymentSchedule.scheduleHash
        === bridge.plan.openingDeploymentSchedule.scheduleHash,
      sourceReviewRequired: true,
      newProviderCalls,
      readyForMatch: false,
    })}\n`);
  }
  if (reviewRepaired) {
    const repaired = await readJsonIfPresent(repairPath);
    const preceding = repairRound === 1 && recoveryCycleId
      ? (await readJsonIfPresent(recoveryBaseRepairPath))?.plan
      : repairRound === 1 ? (await product.prepareAgentSelectedTeachPromotion(
        iterativeSessionId, teachSessionId)).plan
        : (await readJsonIfPresent(priorRepairPath))?.plan;
    if (!repaired?.plan || !preceding
      || repaired.plan.planVersion !== preceding.planVersion + 1) {
      throw new Error("AGENT_SELECTED_TEACH_REPAIRED_PLAN_REQUIRED");
    }
    const existing = await readJsonIfPresent(revisedReviewPath);
    if (existing && existing.planHash !== repaired.plan.planHash) {
      throw new Error("AGENT_SELECTED_TEACH_REVISED_REVIEW_PLAN_DRIFT");
    }
    if (existing && existing.evidenceAuditVersion !== "1.1.0") {
      throw new Error("AGENT_SELECTED_TEACH_LEGACY_REVISED_REVIEW_REQUIRES_MIGRATION");
    }
    let review = existing;
    let newProviderCalls = 0;
    if (!review) {
      if (await readJsonIfPresent(retainedRevisedReviewPath)) {
        throw new Error("AGENT_SELECTED_TEACH_LEGACY_REVISED_REVIEW_REQUIRES_MIGRATION");
      }
      const live = await secure.factory.createForRun({
        sessionId: `${teachSessionId}-revised-agent-review${
          recoverySessionSuffix}-r${repairRound}`,
        runKind: "final-review",
        onEvent: async (event) => {
          if (event.type === "round_failed") {
            await persistJson(revisedReviewFailurePath(event.roundIndex), {
              schema: "starcraft_tmg_agent_selected_teach_revised_review_dispatch_failure_v1",
              planHash: repaired.plan.planHash,
              roundIndex: event.roundIndex, code: event.code,
              paidProviderCall: event.paidProviderCall,
              usage: event.usage || null,
              latencyMs: event.latencyMs ?? null,
              receiptHash: event.receiptHash || null,
              providerTransport: event.providerTransport || null,
              providerIncompleteReason:
                event.providerIncompleteReason || null,
              recordedAt: event.at,
              trainingTruth: false,
            });
            return;
          }
          if (event.type !== "round_completed") return;
          await persistJson(revisedReviewShardPath(event.roundIndex), {
            schema: "starcraft_tmg_agent_selected_teach_revised_review_retain_v1",
            ...event.sanitizedOutputRecord,
            receiptHash: event.receiptHash,
            paidProviderCall: event.paidProviderCall,
            usage: event.usage,
            trainingTruth: false,
          });
          newProviderCalls += 1;
        },
      });
      const deliberation = {
        deliberate: async (request) => {
          const retained = await readJsonIfPresent(
            revisedReviewShardPath(request.roundIndex));
          if (!retained) {
            const failed = await readJsonIfPresent(
              revisedReviewFailurePath(request.roundIndex));
            if (failed?.providerTransport?.requestMayHaveBeenSent) {
              const priorIntents = [];
              for (let version = 1; version <= 2; version += 1) {
                const intent = await readJsonIfPresent(
                  revisedReviewRecoveryIntentPath(request.roundIndex,
                    version));
                if (!intent) break;
                priorIntents.push(intent);
              }
              const decision = decideRosterReviewDispatchRecoveryV1({
                failed, priorIntents,
                planHash: repaired.plan.planHash,
                roundIndex: request.roundIndex,
                contextHash: request.contextHash,
                explicitResume: resumeAmbiguousReviewShard
                  === request.roundIndex,
              });
              if (decision.kind !== "retry_allowed") {
                throw new Error(
                  `AGENT_SELECTED_TEACH_REVISED_REVIEW_RECOVERY_BLOCKED:${decision.reason}`);
              }
              await persistNewJson(revisedReviewRecoveryIntentPath(
                request.roundIndex, decision.nextIntentVersion), {
                ...decision.intent,
                recordedAt: new Date().toISOString(),
              });
            } else if (failed?.paidProviderCall) {
              throw new Error(
                "AGENT_SELECTED_TEACH_PAID_REVISED_REVIEW_FAILURE_REQUIRES_VERSIONED_REPAIR");
            }
            return live.deliberate(request);
          }
          if (request.contextHash !== retained.contextHash
            || hashStarcraftTmgContract(request.responseFormat
              .outputContractRef)
              !== hashStarcraftTmgContract(retained.outputContractRef)) {
            throw new Error("AGENT_SELECTED_TEACH_RETAINED_REVISED_REVIEW_DRIFT");
          }
          return { output: retained.sanitizedOutput,
            receipt: { receiptHash: retained.receiptHash,
              retainedPaidReplyReplay: true } };
        },
      };
      const paidReview = await reviewRosterFinalPlanV3({
        plan: repaired.plan, deliberation,
        sessionId: `${teachSessionId}-revised-agent-review${
          recoverySessionSuffix}-r${repairRound}`,
        toolReceipts: session.evidence.toolReceipts,
        selectedCandidateInputHash: hashStarcraftTmgContract(
          session.selectedCandidateInput),
      });
      review = supplementRosterFinalPlanReviewWithMissionScoringV1({
        plan: repaired.plan, review: paidReview,
        toolReceipts: session.evidence.toolReceipts,
        missionProfile: product.officialMissionScoringProfile(),
      });
      await persistJson(revisedReviewPath, review);
    }
    process.stdout.write(`${JSON.stringify({
      event: "agent_selected_teach_revised_review",
      planHash: repaired.plan.planHash,
      repairRound,
      recoveryCycleId,
      reviewHash: review.reviewHash,
      findingCount: review.findings.length,
      highFindings: review.findings.filter((finding) =>
        finding.severity === "high").map((finding) => ({
        claimPath: finding.claimPath,
        publicReason: finding.publicReason,
      })),
      newProviderCalls,
      readyForMatch: review.findings.every((finding) =>
        finding.severity !== "high"),
    })}\n`);
  }
  if (!prepareOnly && !bridgeOnly && !reviewAgent && !repairAgent
    && !reviewRepaired
    && session.status !== "planned") {
    if (session.status === "running") {
      throw new Error("AGENT_SELECTED_TEACH_STILL_RUNNING_IN_OTHER_PROCESS");
    }
    // readSession is a public projection; private publicOutputs are never
    // exposed here. Use its explicit retainedReplyCount instead of treating
    // the omitted array as empty and accidentally buying the same rounds.
    const retainedReplies = Number(session.retainedReplyCount || 0);
    const providerCallsBeforeResume = Number(session.usage?.calls || 0);
    const resume = session.status === "paused"
      || (session.status === "failed" && retainedReplies > 0);
    process.stdout.write(`${JSON.stringify({
      event: "agent_selected_teach_resume_policy", resume,
      retainedReplies, providerCallsBeforeResume,
    })}\n`);
    await product.service.startPlanning(teachSessionId, {
      resume,
    });
    let lastProgress = "";
    for (;;) {
      await new Promise((resolve) => setTimeout(resolve, 5_000));
      session = product.service.readSession(teachSessionId);
      const progress = JSON.stringify({ status: session.status,
        phase: session.progress.phase,
        completedRounds: session.progress.rounds.length,
        replayedRounds: session.progress.rounds.filter((round) =>
          round.status === "replayed").length,
        activeRoundKind: session.progress.activeRoundKind,
        providerCalls: session.usage?.calls || 0,
        newProviderCalls: Math.max(0, Number(session.usage?.calls || 0)
          - providerCallsBeforeResume) });
      if (progress !== lastProgress) {
        process.stdout.write(`${JSON.stringify({
          event: "agent_selected_teach_progress", ...JSON.parse(progress),
        })}\n`);
        lastProgress = progress;
      }
      if (session.status !== "running") break;
    }
  }
  if (!prepareOnly && !bridgeOnly && !reviewAgent && !repairAgent
    && !reviewRepaired) {
    process.stdout.write(`${JSON.stringify({
      event: "agent_selected_teach_result",
      status: session.status,
      failure: session.failure,
      planHash: session.plan?.planHash || null,
      planStatus: session.plan?.planStatus || null,
      modelSelectionLocked: session.lockedRoster?.modelSelectionLocked,
      selectedByAgentDeliberation: true,
      providerCalls: session.usage?.calls || 0,
      sourceAuditPending: true,
      readyForMatch: false,
    })}\n`);
    if (session.status !== "planned") process.exitCode = 1;
  }
} finally {
  await secure?.close();
}
