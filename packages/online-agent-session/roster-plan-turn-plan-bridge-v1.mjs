import { hashStarcraftTmgContract } from
  "../authoritative-engine/transition-v1.mjs";
import { ROSTER_PLAN_SCHEMA, verifyRosterPlanV1 } from
  "../roster-strategist/roster-plan-contracts-v1.mjs";
import { PLANNED_PRESET_ROSTER_PLAN_SCHEMA,
  verifyPlannedPresetRosterPlanV2,
  verifyPlannedPresetRoundSupplyScheduleV1 } from
  "../roster-strategist/planned-preset-roster-plan-v2.mjs";
import { AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA,
  verifyAgentScheduledRosterPlanV1 } from
  "../roster-strategist/agent-scheduled-roster-plan-v1.mjs";
import { AGENT_SELECTED_TEACH_SESSION_RECEIPT_V1,
  verifyAgentSelectedTeachSessionReceiptV1 } from
  "../roster-strategist/agent-selected-teach-plan-bridge-v1.mjs";
import { verifyRosterStrategistSessionReceiptV1,
  verifyRosterStrategistPresetSessionReceiptV1 } from
  "../roster-strategist/roster-strategist-runtime-v1.mjs";
import { STARCRAFT_TMG_ROSTER_PLAN_ROOM_EVIDENCE_SCHEMA } from
  "../client-domain/viewer-projection-v3.mjs";
import { ROSTER_DECISION_SESSION_RECEIPT_SCHEMA_V1,
  verifyRosterDecisionSessionReceiptV1 } from
  '../roster-planning-workspace/roster-workflow-acceptance-v1.mjs';

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

function verifiedPlan(plan, receipt, priorPlans = []) {
  if (plan?.schema === ROSTER_PLAN_SCHEMA) {
    verifyRosterPlanV1(plan);
    if (plan.planStatus === "no_pregame_plan" || plan.presetRoster !== false) {
      fail("ROSTER_TURN_PLAN_NO_PREGAME_PLAN");
    }
    // The new product accepts a reviewed CONDITIONAL intent, not a played
    // whole-army arrival schedule. Only that server-owned acceptance enters
    // this lane; historical unscheduled plans remain rejected. Actual moves,
    // supply windows and arrivals are still chosen through current LegalSpace.
    if(receipt?.schema!==ROSTER_DECISION_SESSION_RECEIPT_SCHEMA_V1)
      fail("ROSTER_TURN_PLAN_ROUND_SUPPLY_SCHEDULE_REQUIRED");
    verifyRosterDecisionSessionReceiptV1(receipt);
  } else if (plan?.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA) {
    verifyAgentScheduledRosterPlanV1(plan);
    if (receipt?.schema === AGENT_SELECTED_TEACH_SESSION_RECEIPT_V1) {
      verifyAgentSelectedTeachSessionReceiptV1(receipt);
    } else verifyRosterStrategistSessionReceiptV1(receipt);
    if (receipt.openingDeploymentScheduleHash
      !== plan.openingDeploymentSchedule.scheduleHash) {
      fail("ROSTER_TURN_PLAN_ROUND_SUPPLY_SESSION_MISMATCH");
    }
  } else if (plan?.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA) {
    verifyPlannedPresetRosterPlanV2(plan);
    verifyRosterStrategistPresetSessionReceiptV1(receipt);
  } else {
    fail("ROSTER_TURN_PLAN_SCHEMA_UNSUPPORTED");
  }
  let revisionEvent = null;
  if (receipt.planHash !== plan.planHash) {
    const revisions = plan.revisions || [];
    if (plan.planStatus !== "revised" || revisions.length < 1
      || !Array.isArray(priorPlans)
      || (plan.presetRoster && !plan.openingDeploymentSchedule)) {
      fail("ROSTER_TURN_PLAN_REVISION_LINEAGE_MISSING");
    }
    let previousHash = receipt.planHash;
    let previousVersion = revisions[0].fromPlanVersion;
    for (const [index, event] of revisions.entries()) {
      if (event.planId !== plan.planId
        || event.previousPlanHash !== previousHash
        || event.fromPlanVersion !== previousVersion
        || event.toPlanVersion !== previousVersion + 1) {
        fail("ROSTER_TURN_PLAN_REVISION_LINEAGE_MISSING");
      }
      if (index < revisions.length - 1) {
        const matching = priorPlans.filter((entry) => (
          entry?.planVersion === event.toPlanVersion));
        if (matching.length !== 1) {
          fail("ROSTER_TURN_PLAN_REVISION_SNAPSHOT_MISSING");
        }
        const snapshot = matching[0];
        if (snapshot.schema === ROSTER_PLAN_SCHEMA) {
          verifyRosterPlanV1(snapshot);
        } else if (snapshot.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA) {
          verifyAgentScheduledRosterPlanV1(snapshot);
        } else if (snapshot.schema === PLANNED_PRESET_ROSTER_PLAN_SCHEMA) {
          verifyPlannedPresetRosterPlanV2(snapshot);
        } else {
          fail("ROSTER_TURN_PLAN_REVISION_SNAPSHOT_INVALID");
        }
        if (snapshot.schema !== plan.schema
          || snapshot.planId !== plan.planId
          || snapshot.planStatus !== "revised"
          || snapshot.rosterCandidate.candidateHash
            !== plan.rosterCandidate.candidateHash
          || snapshot.provenance.provenanceHash
            !== plan.provenance.provenanceHash
          || snapshot.revisions.length !== index + 1
          || snapshot.revisions.some((prior, priorIndex) => (
            prior.revisionHash !== revisions[priorIndex].revisionHash))
          || (plan.presetRoster
            && snapshot.openingDeploymentSchedule?.scheduleHash
              !== plan.openingDeploymentSchedule.scheduleHash)
          || (plan.schema === AGENT_SCHEDULED_ROSTER_PLAN_SCHEMA
            && snapshot.openingDeploymentSchedule?.scheduleHash
              !== plan.openingDeploymentSchedule.scheduleHash)) {
          fail("ROSTER_TURN_PLAN_REVISION_SNAPSHOT_INVALID");
        }
        previousHash = snapshot.planHash;
      } else if (event.toPlanVersion !== plan.planVersion) {
        fail("ROSTER_TURN_PLAN_REVISION_LINEAGE_MISSING");
      }
      previousVersion = event.toPlanVersion;
    }
    revisionEvent = revisions[revisions.length - 1];
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
  const revisionEvent = verifiedPlan(plan, receipt,
    input.priorPlans || []);
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
  const evidence = state?.rosterPlanEvidenceBySide?.[scope.seatKey];
  if (plan.presetRoster || plan.openingDeploymentSchedule) {
    if (!object(evidence)
      || evidence.schema !== STARCRAFT_TMG_ROSTER_PLAN_ROOM_EVIDENCE_SCHEMA
      || evidence.auditResultHash !== ownAudit.resultHash
      || evidence.trainingTruth !== false
      || !Array.isArray(evidence.units)
      || evidence.evidenceHash !== hashStarcraftTmgContract(
        Object.fromEntries(Object.entries(evidence).filter(([key]) =>
          key !== "evidenceHash")))) {
      fail("ROSTER_TURN_PLAN_ROSTER_AUDIT_MISMATCH");
    }
    if (plan.presetRoster
      && evidence.recipeHash !== plan.presetBinding.rosterHash) {
      fail("ROSTER_TURN_PLAN_PRESET_ROSTER_MISMATCH");
    }
  }
  if (plan.openingDeploymentSchedule) {
    try {
      verifyPlannedPresetRoundSupplyScheduleV1(
        plan.openingDeploymentSchedule, plan.rosterCandidate, {
          resultHash: evidence.auditResultHash,
          units: evidence.units.map((unit) => ({
            unitInstanceId: unit.unitInstanceId,
            unitCompositionResult: {
              startingSupply: unit.startingSupply,
            },
          })),
        });
    } catch {
      fail("ROSTER_TURN_PLAN_ROUND_SUPPLY_AUDIT_MISMATCH");
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
    rosterMode: plan.presetRoster || receipt.schema===ROSTER_DECISION_SESSION_RECEIPT_SCHEMA_V1&&receipt.mode==='fixed'
      ? "planned_preset" : "agent_built",
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
    skillRouteReceiptHash: receipt.skillRouteReceiptHash
      ??(receipt.schema===ROSTER_DECISION_SESSION_RECEIPT_SCHEMA_V1?hashStarcraftTmgContract(plan.provenance.skillVersions):null),
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

  return seededPlan(plan, origin);
}

// An explicit, same-match revision is not a second pregame opening. The Room
// may already contain casualties: compare against its admitted immutable origin,
// never against a newly reconstructed full army at the current turn.
export function createStarcraftTmgRosterTurnPlanRevisionSeedV1(input = {}) {
  const { rosterPlan: plan, sessionReceipt: receipt, previousOrigin: previous,
    roomProjection: projection, scope } = input;
  verifyStarcraftTmgRosterTurnPlanOriginV1(previous);
  const revision = verifiedPlan(plan, receipt, input.priorPlans || []);
  const same = plan.planHash === previous.rosterPlanHash;
  const expected = input.replacesRosterPlanHash;
  if (expected !== previous.rosterPlanHash
    && !(same && expected === previous.previousRosterPlanHash)) {
    fail("ROSTER_TURN_PLAN_REVISION_SOURCE_MISMATCH");
  }
  if (scope?.gameId !== previous.gameId || scope?.roomId !== previous.roomId
    || scope?.matchBindingHash !== previous.matchBindingHash
    || scope?.seatKey !== previous.seatKey
    || projection?.room?.roomId !== previous.roomId
    || projection?.matchBinding?.bindingHash !== previous.matchBindingHash
    || projection?.viewer?.seatKey !== previous.seatKey
    || !Number.isSafeInteger(projection?.room?.stateRevision)
    || !projection?.room?.stateHash
    || projection?.state?.officialMissionRuntimeState?.missionRecordKey
      !== previous.missionRecordKey
    || projection?.state?.officialMissionRuntimeState?.sourceSnapshotHash
      !== previous.sourceSnapshotHash
    || projection?.state?.board?.deploymentId !== previous.deploymentRecordKey) {
    fail("ROSTER_TURN_PLAN_REVISION_ROOM_MISMATCH");
  }
  if (plan.planId !== previous.rosterPlanId
    || plan.schema !== previous.rosterPlanSchema
    || plan.sideKey !== previous.seatKey
    || plan.rosterCandidate.candidateHash !== previous.rosterCandidateHash
    || plan.rosterCandidate.legalityReceipt.auditResultHash
      !== previous.rulesAuditResultHash
    || plan.provenance.provenanceHash !== previous.provenanceHash
    || receipt.receiptHash !== previous.sessionReceiptHash
    || plan.openingDeploymentSchedule?.scheduleHash
      !== input.previousArrivalSchedule?.scheduleHash) {
    fail("ROSTER_TURN_PLAN_REVISION_FROZEN_BINDING_MISMATCH");
  }
  if (same) return seededPlan(plan, previous);
  if (!revision || plan.planVersion <= previous.rosterPlanVersion
    || !plan.revisions.some(event => event.previousPlanHash
      === previous.rosterPlanHash
      && event.fromPlanVersion === previous.rosterPlanVersion)) {
    fail("ROSTER_TURN_PLAN_REVISION_NOT_DESCENDANT");
  }
  const { originHash: _oldHash, ...body } = previous;
  Object.assign(body, {
    rosterPlanVersion: plan.planVersion,
    rosterPlanHash: plan.planHash,
    previousRosterPlanHash: previous.rosterPlanHash,
    pregameRevisionHash: revision.revisionHash,
    revisedAtStateRevision: projection.room.stateRevision,
    revisedAtStateHash: projection.room.stateHash,
  });
  const origin = Object.freeze({ ...body,
    originHash: hashStarcraftTmgContract(body) });
  verifyStarcraftTmgRosterTurnPlanOriginV1(origin);
  return seededPlan(plan, origin);
}

function seededPlan(plan, origin) {
  const route = plan.scoreRoute;
  const deployment = plan.deploymentConcept;
  const loss = plan.lossResourceBudget;
  const firstArrivalRoundByUnit = new Map(
    (plan.openingDeploymentSchedule?.entries || []).map((entry) =>
      [entry.unitInstanceId, entry.round]));
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
        `${entry.ordinal}. ${entry.unitInstanceId} in ${entry.phase}`
          + (firstArrivalRoundByUnit.has(entry.unitInstanceId)
            ? `; first roster arrival round ${firstArrivalRoundByUnit.get(
              entry.unitInstanceId)}, check current LegalSpace before acting`
            : "")) : [],
    resourcePolicy: loss?.lossBudgetStatus === "declared"
      ? loss.plannedLossBudget.map((entry) =>
        `${entry.window}: maximum ${entry.resourceKind} loss ${entry.plannedMaximumLoss}`)
      : [],
    initiativePolicy: [],
    reservePolicy: unique([deployment?.reinforcementPolicyText,
      ...(plan.openingDeploymentSchedule?.rounds || []).map((entry) =>
        `Round ${entry.round}: committed ${entry.committedSupply} Supply`
          + (entry.capacity === null ? " (unlimited final round)"
            : ` of ${entry.capacity} capacity`))]),
    // FutureActionPlans describes a selected action enabling a later action.
    // Pregame arrivals have no current LegalSpace candidate and must remain a
    // separate typed schedule rather than fabricated enabling candidates.
    futureActionPlans: [],
    ...(plan.openingDeploymentSchedule ? {
      pregameRosterArrivalSchedule: structuredClone(
        plan.openingDeploymentSchedule),
    } : {}),
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
