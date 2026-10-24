import { isDeepStrictEqual } from "node:util";

import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_PROPOSAL_DEDUPLICATION_SCHEMA =
  "starcraft_tmg_roster_identical_proposal_deduplication_v1";

// A Provider may repeat the same complete candidate to satisfy its requested
// row count. Remove only a structurally identical copy; two different lists
// with the same candidateId remain ambiguous and the strict validator rejects
// them. Raw paid output is retained separately by the workspace.
export function deduplicateIdenticalRosterProposalsV1(input = {}) {
  const output = structuredClone(input.output);
  const inputHash = hashStarcraftTmgContract(output);
  const operations = [];
  if (output?.roundKind === "candidate_proposals"
    && Array.isArray(output.proposals)) {
    const firstById = new Map();
    output.proposals = output.proposals.filter((proposal, index) => {
      const candidateId = typeof proposal?.candidateId === "string"
        ? proposal.candidateId : null;
      if (!candidateId) return true;
      const earlier = firstById.get(candidateId);
      if (!earlier) {
        firstById.set(candidateId, { index, proposal });
        return true;
      }
      if (!isDeepStrictEqual(earlier.proposal, proposal)) return true;
      operations.push({ candidateId, removedIndex: index,
        retainedIndex: earlier.index,
        proposalHash: hashStarcraftTmgContract(proposal) });
      return false;
    });
  }
  const body = {
    schema: ROSTER_PROPOSAL_DEDUPLICATION_SCHEMA,
    inputHash,
    outputHash: hashStarcraftTmgContract(output),
    operations,
    onlyStructurallyIdenticalRowsRemoved: true,
    differentContentIdCollisionsStillRejected: true,
    missingStrategyContentFilled: false,
    rulesLegalityStillRequired: true,
    trainingTruth: false,
  };
  return Object.freeze({ output,
    receipt: Object.freeze({ ...body,
      receiptHash: hashStarcraftTmgContract(body) }) });
}
