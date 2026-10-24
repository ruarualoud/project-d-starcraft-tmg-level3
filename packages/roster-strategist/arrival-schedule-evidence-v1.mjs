import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';

function node(nodeType, authority, content) {
  const body = { nodeType, authority, content: structuredClone(content) };
  return Object.freeze({ ...body, nodeHash: hashStarcraftTmgContract(body) });
}

// The persisted schedule retains the Agent's original reasons for replay.
// Only native numeric/identity fields belong in a Rules-authority prompt.
// Never certify model prose merely because its chosen arrival rounds fit.
export function buildArrivalScheduleEvidenceNodesV1(schedule) {
  if (!schedule) return [];
  const { entries, ...header } = schedule;
  const facts = { ...header, entries: entries.map(({ publicReasonText, ...entry }) => entry) };
  return [
    node('agent-selected-locked-arrival-schedule', 'rules_checked_immutable_first_arrival_facts', {
      schedule: facts,
      sourceScheduleHash: schedule.scheduleHash,
      projectionKind: 'native_schedule_fields_without_model_prose',
      selectedByAgentBeforeTeach: true,
      noUnitMayActBeforeItsFirstArrivalRound: true,
      numericAuthority: 'entries.poolSupply and rounds.committedSupply, not the Agent explanations',
    }),
    node('agent-selected-arrival-intent', 'model_authored_intent_not_rules_evidence', {
      sourceScheduleHash: schedule.scheduleHash,
      entries: entries.map(({ ordinal, round, unitInstanceId, publicReasonText }) => ({
        ordinal, round, unitInstanceId, publicReasonText,
      })),
      semanticTruthVerified: false,
      instruction: 'These are prior Agent reasons, not Rules facts. Preserve strategic intent but correct any claimed Supply, upgrade or timing that conflicts with the native schedule and unit rules. Numeric schedule legality does not verify this prose.',
    }),
  ];
}
