import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { createRosterDeploymentConceptV1 } from
  "./roster-plan-contracts-v1.mjs";

export const ITERATIVE_ROSTER_ARRIVAL_PUBLIC_AUDIT_V1 =
  "starcraft_tmg_iterative_roster_arrival_public_audit_v1";

// The Rules schedule is independent of the model's prose. A numerically
// legal arrival must not launder stale unit IDs into an executable plan.
export function auditIterativeRosterArrivalPublicRevisionV1({
  rosterCandidate, revisedDeploymentConcept,
} = {}) {
  const concept = createRosterDeploymentConceptV1(
    revisedDeploymentConcept);
  const unitIds = new Set((rosterCandidate?.units || []).map((unit) =>
    unit.unitInstanceId));
  if (unitIds.size === 0) {
    throw new Error("ITERATIVE_ROSTER_ARRIVAL_PUBLIC_ROSTER_REQUIRED");
  }
  const unknownActivationUnitIds = [...new Set(concept.activationOrder
    .map((entry) => entry.unitInstanceId)
    .filter((id) => !unitIds.has(id)))].sort();
  const body = {
    schema: ITERATIVE_ROSTER_ARRIVAL_PUBLIC_AUDIT_V1,
    candidateHash: rosterCandidate.candidateHash,
    deploymentConceptHash: concept.deploymentConceptHash,
    status: unknownActivationUnitIds.length === 0
      ? "unit_references_verified" : "plan_revision_required",
    unknownActivationUnitIds,
    supplyScheduleUnaffected: true,
    trainingTruth: false,
  };
  return Object.freeze({ ...body,
    auditHash: hashStarcraftTmgContract(body) });
}
