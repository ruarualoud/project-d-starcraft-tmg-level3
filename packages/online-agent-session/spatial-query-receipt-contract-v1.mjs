// Cheap receive-boundary validation. The runtime owns result sealing; this
// checks correlation, not another full hash pass over large geometry tables.
export function spatialQueryReceiptRejectionV1({ input, request, receipt }) {
  if (!receipt || typeof receipt !== "object" || Array.isArray(receipt)
    || !/^[a-f0-9]{64}$/.test(String(receipt.queryReceiptHash || ""))) return "shape";
  if (receipt.queryKind !== request.queryKind) return "query_kind";
  // Cached native runtime receipts intentionally have no per-call requestId.
  if (receipt.requestId !== undefined && receipt.requestId !== request.requestId) return "request_id";
  const expected = {
    roomId: input.roomProjection?.room?.roomId,
    matchBindingHash: input.roomProjection?.matchBinding?.bindingHash,
    stateRevision: input.roomProjection?.room?.stateRevision,
    stateHash: input.roomProjection?.room?.stateHash,
    legalSpaceHash: input.legalSpace?.legalSpaceHash,
    seatKey: input.roomProjection?.viewer?.seatKey,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (value === undefined || receipt.authority?.[key] !== value) return `authority_${key}`;
  }
  if (!["exact", "advisory_estimate", "unknown"].includes(receipt.status)) return "status";
  if (["maySelectAction", "mayPreview", "mayConfirm", "mayApply", "trainingTruth"]
    .some(key => receipt[key] === true)) return "query_authority";
  return null;
}
