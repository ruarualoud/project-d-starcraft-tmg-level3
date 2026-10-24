import { validateStarcraftTmgProviderJsonSchemaValueV1 as validate } from '../structured-generation/output-contract-registry-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

// Review coverage is model-owned. It must never be synthesized by the Host.
export async function deliberateRosterReviewOutputV1(deliberation, request) {
  let next = request;
  const history = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    // Transport failures propagate to the existing dispatch reconciler. Only
    // completed public replies enter this local bounded schema-feedback loop.
    const result = await deliberation.deliberate(next);
    const check = validate(reviewValidationSchema(request.responseFormat.schema, result?.output), result?.output);
    if (check.ok) return { ...result, structuredRecovery: { version: 1,
      correctionCount: history.length, history, modelOwnedFieldsFilledByHost: false } };
    history.push({ contextHash: next.contextHash, outputHash: hash(result?.output ?? null),
      validationIssues: check.issues });
    if (attempt === 2) throw Object.assign(Error('ROSTER_FINAL_PLAN_REVIEW_OUTPUT_INVALID'),
      { code: 'ROSTER_FINAL_PLAN_REVIEW_OUTPUT_INVALID', validation: check, recoveryHistory: history });
    const feedback = { kind: 'repair_completed_public_reply',
      version: 'review_schema_feedback_v1', validationIssues: check.issues,
      previousOutput: result?.output ?? null,
      instruction: 'Correct the listed output-contract errors using the same frozen claims and evidence. Return the complete schema. Preserve valid findings. You, not the Host, must state which claims you reviewed and whether material findings remain unreported. Do not infer coverage from the presence of findings, invent evidence, or change the Plan. Coverage/claim checks still run after this format repair.' };
    next = { ...request, promptNodes: [...request.promptNodes, feedback],
      contextHash: hash({ version: feedback.version, originalContextHash: request.contextHash,
        attempt: attempt + 1, feedback }) };
    // Stable correction identities let the existing retained-reply port replay
    // completed corrections after restart, rather than refill a new retry loop.
  }
}

function reviewValidationSchema(schema, output) {
  // Existing review capacity policy: preserve findings beyond the advisory cap.
  if (!Array.isArray(output?.findings) || !schema.properties.findings
    || output.findings.length <= schema.properties.findings.maxItems) return schema;
  return { ...schema, properties: { ...schema.properties,
    findings: { ...schema.properties.findings, maxItems: output.findings.length } } };
}
