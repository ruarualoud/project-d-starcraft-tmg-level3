import { seal, exact, fail } from "./common.mjs";

// Models select addresses; the host copies quotations. No approximate quote
// matching and no model-authored hashes, offsets or source text.
export function sourceSpans(row) {
  const spans = []; let start = 0;
  while (start < row.text.length) {
    let end = Math.min(start + 1000, row.text.length);
    if (end < row.text.length) {
      const newline = row.text.lastIndexOf("\n", end), sentence = row.text.lastIndexOf(". ", end);
      const boundary = Math.max(newline, sentence >= 0 ? sentence + 1 : -1);
      if (boundary >= start + 100) end = boundary + 1;
    }
    if (row.text.length - end < 20) end = row.text.length;
    spans.push({ spanId: "p" + (spans.length + 1), text: row.text.slice(start, end), start, end });
    start = end;
  }
  return spans;
}
export function resolveSpan(reader, binding) {
  exact(binding, ["ref", "spanId"]);
  const row = reader.read({ refs: [binding.ref], maxChars: 48000 }).rows[0];
  const span = sourceSpans(row).find((part) => part.spanId === binding.spanId);
  if (!span) fail("EVIDENCE_SPAN_UNKNOWN");
  return { ...binding, quote: span.text, evidenceHash: row.hash, start: span.start, end: span.end,
    sourceClass: row.sourceClass, atomIds: row.atomIds, chapterIds: row.chapterIds };
}
export function modelEvidence(receipt) {
  return seal({ catalogueHash: receipt.catalogueHash, sourceBinding: receipt.sourceBinding,
    rows: receipt.rows.map((row) => ({ id: row.id, title: row.title, sourceHash: row.hash,
      sourceClass: row.sourceClass, executable: row.executable, atomIds: row.atomIds,
      passages: sourceSpans(row).map(({ spanId, text }) => ({ spanId, text })) })),
    quoteOwnership: "host_materialized_only", trainingTruth: false });
}
