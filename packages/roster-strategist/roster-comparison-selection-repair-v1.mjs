import { hashStarcraftTmgContract } from
  "../authoritative-engine/referee-crypto-v1.mjs";

export const ROSTER_COMPARISON_SELECTION_REPAIR_VERSION = "1.0.0";
const QUOTED_SELECTION =
  /Selected candidate:\s*([^\s()]+)\s*\(candidateHash\s+([a-f0-9]{64})\)/gu;

// The paid text is never rewritten. Only a single explicit ID + full hash
// quotation, matching one Rules-legal evaluated candidate, may fill a field
// the model omitted from the structured comparison. All other cases keep the
// original output and let the existing strict validator reject it.
export function recoverRosterComparisonSelectionFromQuotedEvidenceV1({
  output, evaluated,
} = {}) {
  const unchanged = { output, receipt: null };
  const comparison = output?.comparison;
  if (!comparison || typeof comparison !== "object"
    || Array.isArray(comparison)
    || Object.hasOwn(comparison, "selectedCandidateId")
    || !Array.isArray(comparison.basisTexts)
    || !Array.isArray(evaluated)) return unchanged;

  const quotes = [];
  for (const [index, text] of comparison.basisTexts.entries()) {
    if (typeof text !== "string") continue;
    for (const match of text.matchAll(QUOTED_SELECTION)) {
      quotes.push({ index, text, quote: match[0],
        candidateId: match[1], candidateHash: match[2] });
    }
  }
  if (quotes.length !== 1) return unchanged;
  const quote = quotes[0];
  const bound = evaluated.filter((entry) =>
    entry?.proposal?.candidateId === quote.candidateId
    && entry?.candidate?.candidateHash === quote.candidateHash
    && entry?.candidate?.legalityStatus === "legal");
  if (bound.length !== 1) return unchanged;

  const repairedOutput = { ...output, comparison: {
    ...comparison, selectedCandidateId: quote.candidateId } };
  const receiptBody = {
    schema: "starcraft_tmg_roster_comparison_selection_repair_v1",
    version: ROSTER_COMPARISON_SELECTION_REPAIR_VERSION,
    repairKind: "unique_explicit_quote_bound_to_rules_legal_candidate",
    sourcePath: `comparison.basisTexts[${quote.index}]`,
    sourceTextHash: hashStarcraftTmgContract(quote.text),
    sourceQuoteHash: hashStarcraftTmgContract(quote.quote),
    selectedCandidateId: quote.candidateId,
    candidateHash: quote.candidateHash,
    originalOutputHash: hashStarcraftTmgContract(output),
    normalizedOutputHash: hashStarcraftTmgContract(repairedOutput),
    trainingTruth: false,
  };
  return { output: repairedOutput, receipt: {
    ...receiptBody,
    receiptHash: hashStarcraftTmgContract(receiptBody),
  } };
}
