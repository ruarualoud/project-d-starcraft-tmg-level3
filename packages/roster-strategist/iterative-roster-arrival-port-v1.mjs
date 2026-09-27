import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { validateStarcraftTmgProviderJsonSchemaValueV1,
  outputContractRefStarcraftTmgV1 } from
  "../structured-generation/output-contract-registry-v1.mjs";
import { ARMY_BUILDER_ROSTER_VERDICT_SCHEMA,
  verifyArmyBuilderRosterVerdictV1 } from
  "./army-builder-query-port-v1.mjs";
import { AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_V1 } from
  "./agent-arrival-schedule-output-v1.mjs";
import { AGENT_ARRIVAL_PUBLIC_REVISION_OUTPUT_CONTRACT_V1 } from
  "./agent-arrival-public-revision-output-v1.mjs";
import { auditIterativeRosterArrivalPublicRevisionV1 } from
  "./iterative-roster-arrival-public-audit-v1.mjs";
import { createPlannedPresetRoundSupplyScheduleV1 } from
  "./planned-preset-roster-plan-v2.mjs";
import { createRosterCandidateV1 } from
  "./roster-plan-contracts-v1.mjs";

export const ITERATIVE_ROSTER_ARRIVAL_PORT_V1 =
  "starcraft_tmg_iterative_roster_arrival_port_v1";

function fail(code) { throw Object.assign(new Error(code), { code }); }
const copy = (value) => structuredClone(value);

function candidateFromVerdict(input, verdict) {
  return createRosterCandidateV1({
    candidateId: input.candidateId, sideKey: input.sideKey,
    factionRecordKey: input.factionRecordKey, scaleId: input.scaleId,
    mineralBudget: input.mineralBudget,
    tacticalCardRecordKeys: input.tacticalCardRecordKeys,
    units: input.units.map((unit) => ({
      unitInstanceId: unit.unitInstanceId,
      recordKey: unit.recordKey,
      compositionKind: unit.compositionKind,
      upgradeSelections: unit.upgrades,
    })),
    legalityStatus: "legal",
    legalityReceipt: { auditResultHash: verdict.auditResultHash },
  });
}

function feasibleScheduleMenu(units, capacityRounds, rosterCandidate,
  armyAudit, missionProfile) {
  const options = [];
  const signatures = new Set();
  const finite = capacityRounds.filter((entry) => entry.capacity !== null);
  const committed = finite.map(() => 0);
  const assigned = [];
  let visited = 0;
  function visit(index) {
    if (options.length >= 6 || visited >= 100_000) return;
    visited += 1;
    if (index === units.length) {
      const signature = capacityRounds.map((round) => {
        const counts = new Map();
        for (const entry of assigned.filter((value) =>
          value.round === round.round)) {
          counts.set(entry.recordKey, (counts.get(entry.recordKey) || 0) + 1);
        }
        return [...counts.entries()].sort(([a], [b]) =>
          a.localeCompare(b));
      });
      const key = JSON.stringify(signature);
      if (signatures.has(key)) return;
      const schedule = createPlannedPresetRoundSupplyScheduleV1({
        proposedEntries: assigned.map((entry) => ({
          round: entry.round, unitInstanceId: entry.unitInstanceId,
          publicReasonText: "numeric feasibility witness only",
        })),
        rosterCandidate, armyAudit, missionProfile,
      });
      signatures.add(key);
      options.push({ optionId: `numeric-arrivals-${options.length + 1}`,
        entries: assigned.map((entry) => ({
          round: entry.round, unitInstanceId: entry.unitInstanceId })),
        supplyByRound: schedule.rounds,
        rulesScheduleHash: schedule.scheduleHash,
        numericSupplyFeasible: true,
        placementAndPathVerified: false,
        strategyRankingPerformed: false });
      return;
    }
    const unit = units[index];
    for (const round of capacityRounds) {
      const affected = finite.map((entry, position) => ({ entry,
        position })).filter(({ entry }) => entry.round >= round.round);
      if (affected.some(({ entry, position }) =>
        committed[position] + unit.startingSupply > entry.capacity)) continue;
      for (const { position } of affected) {
        committed[position] += unit.startingSupply;
      }
      assigned.push({ round: round.round,
        unitInstanceId: unit.unitInstanceId,
        recordKey: unit.recordKey });
      visit(index + 1);
      assigned.pop();
      for (const { position } of affected) {
        committed[position] -= unit.startingSupply;
      }
      if (options.length >= 6 || visited >= 100_000) break;
    }
  }
  visit(0);
  return { status: "rules_certified_numeric_options_not_strategy_ranking",
    options, visited, searchTruncated: visited >= 100_000 };
}

export function createIterativeRosterArrivalPortV1({ store, builder,
  missionAuthority, deliberationFactory } = {}) {
  if (typeof store?.load !== "function"
    || typeof store?.save !== "function"
    || typeof store?.loadRetainedReply !== "function"
    || typeof store?.retainReply !== "function"
    || typeof builder?.evaluateRosterCandidate !== "function"
    || typeof deliberationFactory?.createForRun !== "function"
    || missionAuthority?.resultStatus !== "derivable") {
    fail("ITERATIVE_ROSTER_ARRIVAL_PORT_MISSING");
  }
  const busy = new Set();
  const missionProfile = missionAuthority.missionScoringProfile;
  const contract = AGENT_ARRIVAL_SCHEDULE_OUTPUT_CONTRACT_V1;
  const expectedSchemaVersion =
    contract.providerSchema.properties.schemaVersion.enum[0];

  async function propose(sessionId) {
    if (busy.has(sessionId)) fail("ITERATIVE_ROSTER_ARRIVAL_BUSY");
    busy.add(sessionId);
    try {
      const state = await store.load(sessionId);
      const current = state?.currentCandidate;
      if (state?.status !== "paused" || !current
        || current.mineralSpent !== state.mineralBudget
        || state.plan?.candidateHash !== current.candidateHash
        || !state.observations.some((entry) =>
          entry.query?.kind === "map_route"
            && entry.query.candidateHash === current.candidateHash
            && entry.receipt?.status === "certified"
            && entry.receipt.receiptHash === state.plan.mapEvidenceHash)) {
        fail("ITERATIVE_ROSTER_ARRIVAL_SOURCE_NOT_READY");
      }
      const verdict = builder.evaluateRosterCandidate(copy(current.input));
      if (verdict.schema !== ARMY_BUILDER_ROSTER_VERDICT_SCHEMA
        || verdict.candidateHash !== current.candidateHash
        || verdict.verdictHash !== current.verdictHash
        || verdict.summary.mineralSpent !== state.mineralBudget) {
        fail("ITERATIVE_ROSTER_ARRIVAL_BUILDER_DRIFT");
      }
      verifyArmyBuilderRosterVerdictV1(verdict);
      const rosterCandidate = candidateFromVerdict(current.input, verdict);
      if (state.openingDeploymentSchedule) {
        if (!state.arrivalPublicRevision?.publicAudit) {
          state.arrivalPublicRevision.publicAudit =
            auditIterativeRosterArrivalPublicRevisionV1({
              rosterCandidate,
              revisedDeploymentConcept:
                state.arrivalPublicRevision.revisedDeploymentConcept,
            });
          await store.save(sessionId, copy(state));
        }
        return { status: state.arrivalPublicRevision.publicAudit.status
            === "unit_references_verified"
            ? "rules_audited" : "rules_audited_public_plan_revision_required",
          schedule: copy(state.openingDeploymentSchedule),
          publicAudit: copy(state.arrivalPublicRevision.publicAudit),
          providerCalls: 0 };
      }
      const capacityWitness = createPlannedPresetRoundSupplyScheduleV1({
        proposedEntries: current.input.units.map((unit) => ({
          round: missionProfile.gameLengthRounds,
          unitInstanceId: unit.unitInstanceId,
          publicReasonText: "capacity witness only; not an Agent choice",
        })),
        rosterCandidate, armyAudit: verdict.audit, missionProfile,
      });
      const attempt = Number(state.arrivalAttemptCount || 0) + 1;
      if (attempt > 3) fail("ITERATIVE_ROSTER_ARRIVAL_REVIEW_LIMIT");
      const route = state.observations.findLast((entry) =>
        entry.query?.kind === "map_route"
          && entry.query.candidateHash === current.candidateHash
          && entry.receipt.receiptHash === state.plan.mapEvidenceHash);
      const context = {
        schema: ITERATIVE_ROSTER_ARRIVAL_PORT_V1,
        sessionId, attempt, frozenContext: state.frozenContext,
        candidateInputHash: current.candidateHash,
        rosterCandidateHash: rosterCandidate.candidateHash,
        armyAuditResultHash: verdict.auditResultHash,
        missionScoringProfileHash:
          missionProfile.missionScoringProfileHash,
        mission: { gameLengthRounds: missionProfile.gameLengthRounds,
          startingSupply: missionProfile.startingSupply,
          extraSupplyPerRound: missionProfile.extraSupplyPerRound,
          finalRoundUnlimited: true,
          cumulativeOnTableCaps: capacityWitness.rounds.map((entry) => ({
            round: entry.round, capacity: entry.capacity,
          })) },
        units: verdict.audit.units.map((unit) => ({
          unitInstanceId: unit.unitInstanceId,
          recordKey: unit.recordKey,
          compositionKind: current.input.units.find((entry) =>
            entry.unitInstanceId === unit.unitInstanceId)?.compositionKind,
          startingSupply: unit.unitCompositionResult.startingSupply,
        })),
        currentPublicPlan: state.plan,
        certifiedMapRoute: { receiptHash: route.receipt.receiptHash,
          accessByBase: route.receipt.accessByBase,
          unresolvedUnits: route.receipt.unresolvedUnits,
          exactMoveOrDeploymentLegality: false },
        priorRulesRejection: state.arrivalRejection || null,
        ...(attempt >= 3 ? { feasibleScheduleOptions:
          feasibleScheduleMenu(verdict.audit.units.map((unit) => ({
            unitInstanceId: unit.unitInstanceId,
            recordKey: unit.recordKey,
            startingSupply: unit.unitCompositionResult.startingSupply,
          })), capacityWitness.rounds, rosterCandidate, verdict.audit,
          missionProfile) } : {}),
      };
      const contextHash = hashStarcraftTmgContract(context);
      const requestKey = hashStarcraftTmgContract({ sessionId,
        candidateHash: current.candidateHash, contextHash, attempt,
        kind: "arrival_schedule" });
      if (state.pendingArrivalRequestKey
        && state.pendingArrivalRequestKey !== requestKey) {
        fail("ITERATIVE_ROSTER_ARRIVAL_PENDING_RECONCILIATION");
      }
      let retained = await store.loadRetainedReply(requestKey);
      let dispatchedNow = false;
      if (!retained) {
        // Persist the exact request identity before egress. An ambiguous
        // dispatch is never replayed under a new key automatically.
        state.pendingArrivalRequestKey = requestKey;
        await store.save(sessionId, copy(state));
        dispatchedNow = true;
        const deliberation = await deliberationFactory.createForRun({
          sessionId, runKind: "iterative_roster_arrival_schedule",
          onEvent: async (event) => {
            if (event?.type === "round_completed") {
              await store.retainReply(requestKey, {
                outcome: "completed", requestKey, contextHash,
                receiptHash: event.receiptHash,
                output: event.sanitizedOutputRecord?.sanitizedOutput,
                usage: event.usage, paidProviderCall: true,
              });
            } else if (event?.type === "round_failed"
              && event.paidProviderCall === true) {
              await store.retainReply(requestKey, {
                outcome: "repair_needed", requestKey, contextHash,
                receiptHash: event.receiptHash,
                failureCode: event.code,
                failedOutputRecord: event.failedOutputRecord || null,
                usage: event.usage, paidProviderCall: true,
              });
            }
          },
        });
        try {
          await deliberation.deliberate({
            roundKind: "arrival_schedule", roundIndex: state.revision + attempt,
            promptPack: ITERATIVE_ROSTER_ARRIVAL_PORT_V1,
            promptNodes: [{ role: "frozen_context", content: context }],
            userMessage: "The selected 2000-mineral roster is immutable. "
              + "Choose exactly one first-arrival round for every listed "
              + "Unit. Supply is cumulative on the table in each finite "
              + "round: cumulativeOnTableCaps are TOTAL limits, not extra "
              + "arrivals or a second increment. Sum every Unit arriving "
              + "by that round. The final round is unlimited. Base each "
              + "choice and "
              + "public reason on the current victory route, opponent "
              + "responses and certified base-access evidence. Align the "
              + "deployment concept with actual arrivals. Do not invent "
              + "Supply, change the roster, claim exact movement or "
              + "placement, or reveal private chain of thought. If a prior "
              + "Rules rejection is present, correct its specific overfill "
              + "without ignoring any Unit. If feasibleScheduleOptions is "
              + "present, choose one Rules-certified numeric allocation or "
              + "justify a different allocation that passes the same "
              + "cumulative audit; the options are not strategy-ranked.",
            responseContract: { schemaVersion: expectedSchemaVersion,
              finalAuthority: "official_army_audit_and_mission_supply" },
            responseFormat: { kind: "provider_strict_json_schema",
              schemaName: contract.schemaName,
              schema: copy(contract.providerSchema),
              outputContractRef: outputContractRefStarcraftTmgV1(contract) },
            contextHash,
          });
        } catch (error) {
          retained = await store.loadRetainedReply(requestKey);
          if (!retained) throw error;
        }
        retained = await store.loadRetainedReply(requestKey);
      }
      if (!retained || retained.contextHash !== contextHash
        || retained.requestKey !== requestKey) {
        fail("ITERATIVE_ROSTER_ARRIVAL_RETAINED_CONTEXT_INVALID");
      }
      state.arrivalRequestKeys = [...new Set([
        ...(state.arrivalRequestKeys || []), requestKey ])];
      if (retained.outcome !== "completed") {
        state.arrivalAttemptCount = attempt;
        state.arrivalRejection = { code: retained.failureCode
            || "MODEL_OUTPUT_REPAIR_REQUIRED",
          outputHash: retained.failedOutputRecord?.rawTextHash || null };
        state.pendingArrivalRequestKey = null;
        await store.save(sessionId, copy(state));
        return { status: "model_repair_needed",
          rejection: copy(state.arrivalRejection),
          providerCalls: dispatchedNow ? 1 : 0 };
      }
      const rawOutput = retained.output;
      // The first correction round was accidentally told the port version
      // rather than the shared output-contract version. Preserve its paid
      // original, repair only that metadata alias, then revalidate every
      // substantive field against the unchanged strict schema.
      const transportVersionAlias = rawOutput?.schemaVersion
        === ITERATIVE_ROSTER_ARRIVAL_PORT_V1;
      const output = transportVersionAlias
        ? { ...rawOutput, schemaVersion: expectedSchemaVersion }
        : rawOutput;
      const shape = validateStarcraftTmgProviderJsonSchemaValueV1(
        contract.providerSchema, output);
      if (!shape.ok) {
        state.arrivalAttemptCount = attempt;
        state.arrivalRejection = {
          code: "ITERATIVE_ROSTER_ARRIVAL_OUTPUT_INVALID",
          outputHash: hashStarcraftTmgContract(rawOutput),
          diagnostics: copy(shape.errors || null),
        };
        state.pendingArrivalRequestKey = null;
        await store.save(sessionId, copy(state));
        return { status: "model_repair_needed",
          rejection: copy(state.arrivalRejection),
          providerCalls: dispatchedNow ? 1 : 0 };
      }
      try {
        const schedule = createPlannedPresetRoundSupplyScheduleV1({
          proposedEntries: output.openingDeploymentSchedule,
          rosterCandidate, armyAudit: verdict.audit, missionProfile,
        });
        const publicAudit = auditIterativeRosterArrivalPublicRevisionV1({
          rosterCandidate,
          revisedDeploymentConcept: output.revisedDeploymentConcept,
        });
        state.openingDeploymentSchedule = copy(schedule);
        state.arrivalPublicRevision = {
          revisedDeploymentConcept: copy(output.revisedDeploymentConcept),
          publicSummaryText: output.publicSummaryText,
          publicAudit: copy(publicAudit),
          modelReceiptHash: retained.receiptHash,
          outputHash: hashStarcraftTmgContract(rawOutput),
          transportVersionAliasNormalized: transportVersionAlias,
        };
        state.arrivalAttemptCount = attempt;
        state.arrivalRejection = null;
        state.pendingArrivalRequestKey = null;
        await store.save(sessionId, copy(state));
        return { status: publicAudit.status === "unit_references_verified"
            ? "rules_audited" : "rules_audited_public_plan_revision_required",
          schedule: copy(schedule), publicAudit: copy(publicAudit),
          providerCalls: dispatchedNow ? 1 : 0 };
      } catch (error) {
        const supplyByUnit = new Map(verdict.audit.units.map((unit) => [
          unit.unitInstanceId, unit.unitCompositionResult.startingSupply]));
        const cumulativeSupplyViolations = capacityWitness.rounds.filter(
          (round) => round.capacity !== null).map((round) => ({
            round: round.round, capacity: round.capacity,
            committedSupply: output.openingDeploymentSchedule.filter((entry) =>
              entry.round <= round.round).reduce((sum, entry) =>
                sum + Number(supplyByUnit.get(entry.unitInstanceId) || 0), 0),
          })).filter((round) => round.committedSupply > round.capacity);
        state.arrivalAttemptCount = attempt;
        state.arrivalRejection = { code: String(error?.message || error),
          details: copy(error?.details || null),
          cumulativeSupplyViolations,
          outputHash: hashStarcraftTmgContract(rawOutput),
          transportVersionAliasNormalized: transportVersionAlias };
        state.pendingArrivalRequestKey = null;
        await store.save(sessionId, copy(state));
        return { status: "rules_rejected",
          rejection: copy(state.arrivalRejection),
          providerCalls: dispatchedNow ? 1 : 0 };
      }
    } finally { busy.delete(sessionId); }
  }

  async function revisePublicPlan(sessionId) {
    if (busy.has(sessionId)) fail("ITERATIVE_ROSTER_ARRIVAL_BUSY");
    busy.add(sessionId);
    try {
      const state = await store.load(sessionId);
      if (state?.status !== "paused"
        || !state.openingDeploymentSchedule
        || !state.arrivalPublicRevision?.publicAudit) {
        fail("ITERATIVE_ROSTER_PUBLIC_REVISION_SOURCE_NOT_READY");
      }
      if (state.arrivalPublicRevision.publicAudit.status
        === "unit_references_verified") {
        return { status: "unit_references_verified",
          publicAudit: copy(state.arrivalPublicRevision.publicAudit),
          providerCalls: 0 };
      }
      const current = state.currentCandidate;
      const verdict = builder.evaluateRosterCandidate(copy(current.input));
      if (verdict.candidateHash !== current.candidateHash
        || verdict.verdictHash !== current.verdictHash) {
        fail("ITERATIVE_ROSTER_PUBLIC_REVISION_BUILDER_DRIFT");
      }
      verifyArmyBuilderRosterVerdictV1(verdict);
      const rosterCandidate = candidateFromVerdict(current.input, verdict);
      if (rosterCandidate.candidateHash
        !== state.openingDeploymentSchedule.candidateHash) {
        fail("ITERATIVE_ROSTER_PUBLIC_REVISION_CANDIDATE_DRIFT");
      }
      const attempt = Number(state.publicRevisionAttemptCount || 0) + 1;
      if (attempt > 3) fail("ITERATIVE_ROSTER_PUBLIC_REVISION_REVIEW_LIMIT");
      const context = {
        schema: ITERATIVE_ROSTER_ARRIVAL_PORT_V1,
        kind: "public_plan_revision", sessionId, attempt,
        candidateHash: rosterCandidate.candidateHash,
        exactUnitIds: rosterCandidate.units.map((unit) => ({
          unitInstanceId: unit.unitInstanceId,
          recordKey: unit.recordKey,
        })),
        immutableArrivalSchedule: state.openingDeploymentSchedule,
        priorPublicRevision: state.arrivalPublicRevision,
        priorRejection: state.publicRevisionRejection || null,
        sourceMapRouteEvidenceHash: state.plan?.mapEvidenceHash || null,
      };
      const contextHash = hashStarcraftTmgContract(context);
      const requestKey = hashStarcraftTmgContract({ sessionId,
        kind: "public_plan_revision", attempt, contextHash });
      if (state.pendingPublicRevisionRequestKey
        && state.pendingPublicRevisionRequestKey !== requestKey) {
        fail("ITERATIVE_ROSTER_PUBLIC_REVISION_PENDING_RECONCILIATION");
      }
      let retained = await store.loadRetainedReply(requestKey);
      let dispatchedNow = false;
      if (!retained) {
        state.pendingPublicRevisionRequestKey = requestKey;
        await store.save(sessionId, copy(state));
        dispatchedNow = true;
        const deliberation = await deliberationFactory.createForRun({
          sessionId, runKind: "iterative_roster_public_plan_revision",
          onEvent: async (event) => {
            if (event?.type === "round_completed") {
              await store.retainReply(requestKey, {
                outcome: "completed", requestKey, contextHash,
                receiptHash: event.receiptHash,
                output: event.sanitizedOutputRecord?.sanitizedOutput,
                usage: event.usage, paidProviderCall: true,
              });
            } else if (event?.type === "round_failed"
              && event.paidProviderCall === true) {
              await store.retainReply(requestKey, {
                outcome: "repair_needed", requestKey, contextHash,
                receiptHash: event.receiptHash,
                failureCode: event.code,
                failedOutputRecord: event.failedOutputRecord || null,
                usage: event.usage, paidProviderCall: true,
              });
            }
          },
        });
        try {
          const outputContract =
            AGENT_ARRIVAL_PUBLIC_REVISION_OUTPUT_CONTRACT_V1;
          await deliberation.deliberate({
            roundKind: "arrival_public_revision",
            roundIndex: state.revision + 3 + attempt,
            promptPack: ITERATIVE_ROSTER_ARRIVAL_PORT_V1,
            promptNodes: [{ role: "frozen_context", content: context }],
            userMessage: "Correct only the public deployment concept and "
              + "summary. The Rules-audited arrival schedule and roster "
              + "are immutable. Every activationOrder unitInstanceId must "
              + "exactly match one of exactUnitIds, or declare activation "
              + "order unknown with an empty array. Do not use prior "
              + "agent-unit-N aliases. Respect each unit's first-arrival "
              + "round, the cumulative Supply caps and approximate-only "
              + "map evidence. Do not invent exact movement, placement, "
              + "terrain effects, or private chain of thought.",
            responseContract: { schemaVersion:
                outputContract.providerSchema.properties.schemaVersion.enum[0],
              finalAuthority: "rules_audited_schedule_immutable" },
            responseFormat: { kind: "provider_strict_json_schema",
              schemaName: outputContract.schemaName,
              schema: copy(outputContract.providerSchema),
              outputContractRef:
                outputContractRefStarcraftTmgV1(outputContract) },
            contextHash,
          });
        } catch (error) {
          retained = await store.loadRetainedReply(requestKey);
          if (!retained) throw error;
        }
        retained = await store.loadRetainedReply(requestKey);
      }
      if (!retained || retained.requestKey !== requestKey
        || retained.contextHash !== contextHash) {
        fail("ITERATIVE_ROSTER_PUBLIC_REVISION_RETAINED_CONTEXT_INVALID");
      }
      state.publicRevisionRequestKeys = [...new Set([
        ...(state.publicRevisionRequestKeys || []), requestKey ])];
      const outputContract =
        AGENT_ARRIVAL_PUBLIC_REVISION_OUTPUT_CONTRACT_V1;
      const output = retained.output;
      const shape = retained.outcome === "completed"
        ? validateStarcraftTmgProviderJsonSchemaValueV1(
          outputContract.providerSchema, output) : { ok: false };
      if (!shape.ok) {
        state.publicRevisionAttemptCount = attempt;
        state.publicRevisionRejection = {
          code: retained.failureCode
            || "ITERATIVE_ROSTER_PUBLIC_REVISION_OUTPUT_INVALID",
          outputHash: output ? hashStarcraftTmgContract(output) : null,
          diagnostics: copy(shape.errors || null),
        };
        state.pendingPublicRevisionRequestKey = null;
        await store.save(sessionId, copy(state));
        return { status: "model_repair_needed",
          rejection: copy(state.publicRevisionRejection),
          providerCalls: dispatchedNow ? 1 : 0 };
      }
      try {
        const audit = auditIterativeRosterArrivalPublicRevisionV1({
          rosterCandidate,
          revisedDeploymentConcept: output.revisedDeploymentConcept,
        });
        if (audit.status !== "unit_references_verified") {
          fail("ITERATIVE_ROSTER_PUBLIC_REVISION_UNIT_IDS_INVALID");
        }
        state.arrivalPublicRevision = {
          revisedDeploymentConcept: copy(output.revisedDeploymentConcept),
          publicSummaryText: output.publicSummaryText,
          publicAudit: copy(audit),
          modelReceiptHash: retained.receiptHash,
          outputHash: hashStarcraftTmgContract(output),
          correctedFromOutputHash:
            state.arrivalPublicRevision.outputHash,
        };
        state.publicRevisionAttemptCount = attempt;
        state.publicRevisionRejection = null;
        state.pendingPublicRevisionRequestKey = null;
        await store.save(sessionId, copy(state));
        return { status: "unit_references_verified",
          publicAudit: copy(audit),
          providerCalls: dispatchedNow ? 1 : 0 };
      } catch (error) {
        state.publicRevisionAttemptCount = attempt;
        state.publicRevisionRejection = {
          code: String(error?.message || error),
          outputHash: hashStarcraftTmgContract(output),
        };
        state.pendingPublicRevisionRequestKey = null;
        await store.save(sessionId, copy(state));
        return { status: "rules_rejected",
          rejection: copy(state.publicRevisionRejection),
          providerCalls: dispatchedNow ? 1 : 0 };
      }
    } finally { busy.delete(sessionId); }
  }

  return Object.freeze({ propose, revisePublicPlan });
}
