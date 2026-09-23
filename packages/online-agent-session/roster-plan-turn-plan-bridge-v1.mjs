import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { ROSTER_PLAN_SCHEMA, verifyRosterPlanV1 } from
  "../roster-strategist/roster-plan-contracts-v1.mjs";
import { PLANNED_PRESET_ROSTER_PLAN_SCHEMA,
  verifyPlannedPresetRosterPlanV2 } from
  "../roster-strategist/planned-preset-roster-plan-v2.mjs";
import { verifyRosterStrategistSessionReceiptV1,
  verifyRosterStrategistPresetSessionReceiptV1 } from
  "../roster-strategist/roster-strategist-runtime-v1.mjs";

export const STARCRAFT_TMG_ROSTER_TURN_PLAN_ORIGIN_SCHEMA =
  "starcraft_tmg_roster_turn_plan_origin_v1";

function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(code) { throw new TypeError(code); }

function strings(value) {
  return Array.isArray(value)
    ? value.map((entry) => String(entry || "").trim()).filter(Boolean) : [];
}

function unique(value) { return [...new Set(strings(value))]; }

function verifiedPlan(plan, receipt) {
  let revisionEvent = null;
  if (plan?.schema === ROSTER_PLAN_SCHEMA) {
    verifyRosterPlanV1(plan);
    if (plan.planStatus === "no_pregame_plan" || plan.presetRoster !== false) {
      fail("ROSTER_TURN_PLAN_NO_PREGAME_PLAN");
    }
    verifyRosterStrategistSessionReceiptV1(receipt);
    if (receipt.planHash !== plan.planHash) {
      // The current workspace retains one public revision event, not a
      // multi-hop plan snapshot chain. Admit that exact one-hop case only.
      revisionEvent = plan.revisions?.length === 1
        ? plan.revisions[0] : null;
      if (plan.planStatus !== "revised" || !revisionEvent
        || revisionEvent.planId !== plan.planId
        || revisionEvent.previousPlanHash !== receipt.planHash
        || revisionEvent.fromPlanVersion + 1 !== plan.planVersion
        || revisionEvent.toPlanVersion !== plan.planVersion) {
        fail("ROSTER_TURN_PLAN_REVISION_LINEAGE_MISSING");
      }
    }
  } else if (plan?.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA) {
    verifyPlannedPresetRosterPlanV2(plan);
    verifyRosterStrategistPresetSessionReceiptV1(receipt);
  } else {
    fail("ROSTER_TURN_PLAN_SCHEMA_UNSUPPORTED");
  }
  if (receipt.planId !== plan.planId
    || (revisionEvent === null && (receipt.planHash !== plan.planHash
      || receipt.planStatus !== plan.planStatus))
    || receipt.rosterCandidateHash !== plan.rosterCandidate.candidateHash
    || receipt.finalAuditResultHash
      !== plan.rosterCandidate.legalityReceipt?.auditResultHash
    || receipt.provenanceHash !== plan.provenance.provenanceHash) {
    fail("ROSTER_TURN_PLAN_SESSION_BINDING_MISMATCH");
  }
  return revisionEvent;
}

export function verifyStarcraftTmgRosterTurnPlanOriginV1(origin) {
  if (!object(origin)
    || origin.schemaVersion !== STARCRAFT_TMG_ROSTER_TURN_PLAN_ORIGIN_SCHEMA
    || origin.gameId !== "starcraft-tmg"
    || !["agent_built", "planned_preset"].includes(origin.rosterMode)
    || !origin.roomId || !origin.matchBindingHash || !origin.seatKey
    || !origin.rosterPlanHash || !origin.sessionReceiptHash
    || !origin.rosterCandidateHash || !origin.rulesAuditResultHash
    || !Number.isSafeInteger(origin.openedAtStateRevision)
    || !origin.openedAtStateHash
    || origin.canAffectRules !== false || origin.trainingTruth !== false
    || origin.originHash !== hashStarcraftTmgContract(
      Object.fromEntries(Object.entries(origin).filter(([key]) =>
        key !== "originHash")))) {
    fail("ROSTER_TURN_PLAN_ORIGIN_INVALID");
  }
  return true;
}

// Advisory pregame strategy is admitted only for the exact current Room seat,
// mission, deployment and Rules-audited roster. It is never Rules authority.
export function createStarcraftTmgRosterTurnPlanSeedV1(input = {}) {
  const { rosterPlan: plan, sessionReceipt: receipt, roomProjection,
    scope } = input;
  const revisionEvent = verifiedPlan(plan, receipt);
  const state = roomProjection?.state;
  const ownAudit = state?.armyCompositionUpgradeAuditsBySide?.[scope?.seatKey];
  const binding = plan.provenance?.missionBinding;
  if (!object(scope) || scope.gameId !== "starcraft-tmg"
    || !scope.roomId || !scope.matchBindingHash || !scope.seatKey
    || plan.sideKey !== scope.seatKey
    || roomProjection?.room?.roomId !== scope.roomId
    || roomProjection?.viewer?.seatKey !== scope.seatKey
    || roomProjection?.matchBinding?.bindingHash !== scope.matchBindingHash
    || !Number.isSafeInteger(roomProjection?.room?.stateRevision)
    || !roomProjection?.room?.stateHash
    || !object(ownAudit)
    || ownAudit.resultHash
      !== plan.rosterCandidate.legalityReceipt.auditResultHash
    || binding?.status !== "frozen"
    // The viewer-safe V3 projection intentionally omits selected card
    // profiles. These Rules-owned public identifiers survive it.
    || binding.missionRecordKey
      !== state?.officialMissionRuntimeState?.missionRecordKey
    || binding.deploymentRecordKey !== state?.board?.deploymentId) {
    fail("ROSTER_TURN_PLAN_ROOM_BINDING_MISMATCH");
  }
  // MatchBinding.sourceSnapshotHash is the hash of the registered dependency
  // artifact, not the official dataset snapshot hash carried by RosterPlan.
  if (plan.provenance.sourceSnapshotHash
      !== state?.officialMissionRuntimeState?.sourceSnapshotHash) {
    fail("ROSTER_TURN_PLAN_SOURCE_SNAPSHOT_MISMATCH");
  }
  if (plan.presetRoster) {
    const recipe = state?.armyBuildingConfigurationBySide?.[scope.seatKey];
    if (!object(recipe) || plan.presetBinding.rosterHash
      !== hashStarcraftTmgContract({ sideKey: scope.seatKey, recipe })) {
      fail("ROSTER_TURN_PLAN_PRESET_ROSTER_MISMATCH");
    }
  }
  const unitIds = new Set(plan.rosterCandidate.units.map((unit) =>
    unit.unitInstanceId));
  if ((plan.componentPurposes || []).some((purpose) =>
    purpose.componentKind === "unit" && !unitIds.has(purpose.instanceId))
    || (plan.deploymentConcept?.activationOrder || []).some((entry) =>
      !unitIds.has(entry.unitInstanceId))) {
    fail("ROSTER_TURN_PLAN_UNIT_REFERENCE_MISMATCH");
  }
  const originBody = {
    schemaVersion: STARCRAFT_TMG_ROSTER_TURN_PLAN_ORIGIN_SCHEMA,
    gameId: "starcraft-tmg",
    roomId: scope.roomId,
    matchBindingHash: scope.matchBindingHash,
    seatKey: scope.seatKey,
    openedAtStateRevision: roomProjection.room.stateRevision,
    openedAtStateHash: roomProjection.room.stateHash,
    rosterMode: plan.presetRoster ? "planned_preset" : "agent_built",
    rosterPlanSchema: plan.schema,
    rosterPlanId: plan.planId,
    rosterPlanVersion: plan.planVersion,
    rosterPlanHash: plan.planHash,
    originalRosterPlanHash: receipt.planHash,
    pregameRevisionHash: revisionEvent?.revisionHash || null,
    sessionReceiptHash: receipt.receiptHash,
    teachCycleHash: receipt.teachCycleHash || null,
    rosterCandidateHash: plan.rosterCandidate.candidateHash,
    rulesAuditResultHash: ownAudit.resultHash,
    provenanceHash: plan.provenance.provenanceHash,
    sourceSnapshotHash: plan.provenance.sourceSnapshotHash,
    skillRouteReceiptHash: receipt.skillRouteReceiptHash,
    missionRecordKey: binding.missionRecordKey,
    deploymentRecordKey: binding.deploymentRecordKey,
    presetBaselinePlanHash: plan.presetRoster
      ? plan.presetBinding.baselinePlanHash : null,
    canAffectRules: false,
    trainingTruth: false,
  };
  const origin = Object.freeze({ ...originBody,
    originHash: hashStarcraftTmgContract(originBody) });
  verifyStarcraftTmgRosterTurnPlanOriginV1(origin);

  const route = plan.scoreRoute;
  const deployment = plan.deploymentConcept;
  const loss = plan.lossResourceBudget;
  const planSpec = {
    objective: String(route?.routeText || plan.publicSummaryText).trim(),
    currentGoal: String(route?.routeText || plan.publicSummaryText).trim(),
    strategicApproach: unique([plan.publicSummaryText,
      deployment?.deploymentConceptText,
      deployment?.threatTradeText,
      deployment?.objectiveControlText,
      ...(plan.componentPurposes || []).map((purpose) =>
        `${purpose.instanceId}: ${purpose.publicPurposeText}`)]),
    successSignals: route?.scheduleStatus === "declared"
      ? route.targetVpSchedule.map((entry) =>
        `${entry.window}: planned cumulative VP ${entry.plannedCumulativeVp}`)
      : [],
    activationPriorities: deployment?.activationOrderStatus === "declared"
      ? deployment.activationOrder.map((entry) =>
        `${entry.ordinal}. ${entry.unitInstanceId} in ${entry.phase}`) : [],
    resourcePolicy: loss?.lossBudgetStatus === "declared"
      ? loss.plannedLossBudget.map((entry) =>
        `${entry.window}: maximum ${entry.resourceKind} loss ${entry.plannedMaximumLoss}`)
      : [],
    initiativePolicy: [],
    reservePolicy: unique([deployment?.reinforcementPolicyText]),
    futureActionPlans: [],
    reviseIf: unique((plan.invalidationTriggers || []).map((entry) =>
      entry.triggerText)),
    assumptions: unique((plan.opponentHypotheses || []).map((entry) =>
      entry.hypothesisText)),
    opponentModel: unique((plan.opponentHypotheses || []).map((entry) =>
      `${entry.archetypeLabel}: ${entry.hypothesisText}`)),
    contingencies: unique([route?.fallbackRouteText,
      ...(plan.counterResponses || []).map((entry) =>
        `${entry.triggerText}: ${entry.responseText}`)]),
  };
  if (!planSpec.objective) fail("ROSTER_TURN_PLAN_OBJECTIVE_MISSING");
  return Object.freeze({ planSpec: Object.freeze(planSpec), origin });
}
