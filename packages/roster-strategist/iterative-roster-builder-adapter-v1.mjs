import {
  ARMY_BUILDER_ROSTER_VERDICT_SCHEMA,
  ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA,
  verifyArmyBuilderRejectionReceiptV1,
  verifyArmyBuilderRosterVerdictV1,
} from "./army-builder-query-port-v1.mjs";

function fail(code) {
  throw Object.assign(new Error(code), { code });
}

export function createIterativeRosterBuilderAdapterV1(officialBuilderPort) {
  if (typeof officialBuilderPort?.evaluateRosterCandidate !== "function") {
    fail("ITERATIVE_ROSTER_BUILDER_PORT_MISSING");
  }
  return Object.freeze({
    evaluate: async (candidateInput, state) => {
      const receipt = officialBuilderPort.evaluateRosterCandidate(candidateInput);
      if (receipt.schema === ARMY_BUILDER_ROSTER_VERDICT_SCHEMA) {
        verifyArmyBuilderRosterVerdictV1(receipt);
        if (receipt.summary.mineralBudget !== state.mineralBudget
          || candidateInput.mineralBudget !== state.mineralBudget) {
          fail("ITERATIVE_ROSTER_CANDIDATE_BUDGET_MISMATCH");
        }
        return { legal: true, status: "legal",
          candidateHash: receipt.candidateHash,
          mineralSpent: receipt.summary.mineralSpent,
          mineralBudget: receipt.summary.mineralBudget,
          verdictHash: receipt.verdictHash, receiptHash: receipt.verdictHash,
          auditResultHash: receipt.auditResultHash };
      }
      if (receipt.schema === ARMY_BUILDER_REJECTION_RECEIPT_SCHEMA) {
        verifyArmyBuilderRejectionReceiptV1(receipt);
        if (candidateInput.mineralBudget !== state.mineralBudget) {
          fail("ITERATIVE_ROSTER_CANDIDATE_BUDGET_MISMATCH");
        }
        return { legal: false, status: receipt.status,
          candidateHash: receipt.candidateHash,
          mineralSpent: null, mineralBudget: state.mineralBudget,
          verdictHash: null, receiptHash: receipt.receiptHash,
          rejectionKind: receipt.rejectionKind,
          rulesErrorCode: receipt.rulesErrorCode,
          rulesErrorDetail: receipt.rulesErrorDetail,
          portErrorCode: receipt.portErrorCode,
          portErrorDetail: receipt.portErrorDetail };
      }
      fail("ITERATIVE_ROSTER_BUILDER_RECEIPT_UNKNOWN");
    },
  });
}
