import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";
import { queryRosterBudgetBranchesV1 } from
  "./roster-budget-branch-query-v1.mjs";
import { searchRosterExactBudgetRepairsV1 } from
  "./roster-exact-budget-repair-search-v1.mjs";

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

function verifiedReceipt(receipt) {
  if (!receipt || typeof receipt !== "object"
    || receipt.receiptHash !== hashStarcraftTmgContract(
      Object.fromEntries(Object.entries(receipt).filter(([key]) => (
        key !== "receiptHash"))))) {
    fail("ITERATIVE_ROSTER_TOOL_RECEIPT_INVALID");
  }
  return receipt;
}

function currentCandidate(query, state) {
  const current = state?.currentCandidate;
  if (!current || query.candidateHash !== current.candidateHash) {
    fail("ITERATIVE_ROSTER_TOOL_STALE_CANDIDATE");
  }
  return current;
}

export function createIterativeRosterToolPortV1({ armyBuilderPort,
  mapEvidencePort } = {}) {
  if (typeof armyBuilderPort?.evaluateRosterCandidate !== "function"
    || typeof armyBuilderPort?.enumerateArmyBuildingChoices !== "function"
    || typeof mapEvidencePort?.summarizeMap !== "function"
    || typeof mapEvidencePort?.evaluateRosterRoute !== "function") {
    fail("ITERATIVE_ROSTER_TOOL_PORT_MISSING");
  }
  return Object.freeze({
    query: async (query, state) => {
      if (query?.kind === "candidate_menu") {
        const receipt = verifiedReceipt(
          armyBuilderPort.enumerateArmyBuildingChoices({
            factionRecordKey: query.factionRecordKey,
            scaleId: query.scaleId,
            mineralBudget: state.mineralBudget,
          }));
        if (receipt.faction.recordKey !== state.frozenContext.factionRecordKey
          || receipt.scale.scaleId !== state.frozenContext.scaleId) {
          fail("ITERATIVE_ROSTER_MENU_CONTEXT_MISMATCH");
        }
        return { status: "eligibility_menu_not_legality",
          receiptHash: receipt.receiptHash,
          faction: receipt.faction, scale: receipt.scale,
          tacticalCandidates: receipt.tacticalCandidates,
          unitCandidates: receipt.unitCandidates,
          bounds: receipt.bounds };
      }
      if (query?.kind === "budget_branches") {
        const current = currentCandidate(query, state);
        const receipt = verifiedReceipt(queryRosterBudgetBranchesV1({
          armyBuilderPort,
          candidateInput: current.input,
          expectedSourceCandidateHash: current.candidateHash,
          startOffset: query.startOffset ?? 0,
          // A paid model query must not synchronously audit dozens of full
          // armies. Four exact branches plus menu-only capacity directions
          // give useful evidence without turning one turn into minutes of
          // speculative Builder work.
          maximumEvaluations: Math.min(query.maximumEvaluations ?? 4, 4),
          maximumMutationDepth: query.maximumMutationDepth ?? 3,
        }));
        return { status: "bounded_rules_branches",
          receiptHash: receipt.receiptHash,
          exactBudgetImpossibilityClaimed: false,
          sourceCandidateHash: receipt.sourceCandidateHash,
          sourceMineralShortfall: receipt.sourceMineralShortfall,
          branches: receipt.branches, nextPage: receipt.nextPage,
          capacityDirections: receipt.capacityDirections,
          capacityDirectionsAreMenuOnly: true,
          truncated: receipt.truncated,
          strategyRankingPerformed: false };
      }
      if (query?.kind === "exact_budget_repairs") {
        const current = currentCandidate(query, state);
        const receipt = verifiedReceipt(searchRosterExactBudgetRepairsV1({
          armyBuilderPort,
          sourceCandidateInput: current.input,
          maximumMatches: 4,
          maximumBuilderEvaluations: 12,
          maximumMenuNodes: 250_000,
        }));
        return { status: "builder_certified_exact_budget_options",
          receiptHash: receipt.receiptHash,
          sourceCandidateHash: receipt.sourceCandidateHash,
          sourceMineralSpent: receipt.sourceMineralSpent,
          sourceMineralShortfall: receipt.sourceMineralShortfall,
          matches: receipt.matches,
          menuPathsVisited: receipt.menuPathsVisited,
          builderEvaluations: receipt.builderEvaluations,
          searchTruncated: receipt.searchTruncated,
          exactBudgetImpossibilityClaimed: false,
          strategyRankingPerformed: false };
      }
      if (query?.kind === "map_summary") {
        const receipt = verifiedReceipt(mapEvidencePort.summarizeMap({
          queryId: `iterative-map-summary-${state.sessionId}` }));
        if (receipt.mapBinding?.roomFreezeHash
          !== state.frozenContext.mapHash
          || receipt.mapBinding?.officialSourceSnapshotHash
            !== state.frozenContext.sourceHash) {
          fail("ITERATIVE_ROSTER_MAP_BINDING_MISMATCH");
        }
        return { status: receipt.resultStatus === "certified_map_summary"
          ? "certified" : "unknown", receiptHash: receipt.receiptHash,
        mapBinding: receipt.mapBinding, battlefield: receipt.battlefield,
        missionMarkers: receipt.missionMarkers,
        terrain: receipt.terrain,
        unknownReason: receipt.unknownReason };
      }
      if (query?.kind === "map_route") {
        const current = currentCandidate(query, state);
        const receipt = verifiedReceipt(mapEvidencePort.evaluateRosterRoute({
          queryId: `iterative-route-${state.sessionId}-${current.candidateHash}`,
          sideId: current.input.sideKey,
          candidateInput: current.input,
        }));
        const binding = receipt.mapBinding;
        if (receipt.candidateInputHash !== current.candidateHash
          || binding?.roomFreezeHash !== state.frozenContext.mapHash
          || binding?.officialSourceSnapshotHash
            !== state.frozenContext.sourceHash
          || hashStarcraftTmgContract({
            missionRecordKey: binding?.missionRecordKey,
            deploymentRecordKey: binding?.deploymentRecordKey,
          }) !== state.frozenContext.taskHash) {
          fail("ITERATIVE_ROSTER_MAP_BINDING_MISMATCH");
        }
        return { status: receipt.resultStatus
            === "certified_base_clearance_audit" ? "certified" : "unknown",
          receiptHash: receipt.receiptHash,
          candidateHash: current.candidateHash,
          mapBinding: binding, accessByBase: receipt.accessByBase,
          unresolvedUnits: receipt.unresolvedUnits,
          exactMoveOrDeploymentLegality: false,
          unknownReason: receipt.unknownReason };
      }
      fail("ITERATIVE_ROSTER_QUERY_UNSUPPORTED");
    },
  });
}
