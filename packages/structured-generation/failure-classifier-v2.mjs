import { classifyStarcraftTmgStructuredFailureV1 } from './failure-classifier-v1.mjs';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';

export const STRUCTURED_FAILURE_CLASSIFIER_BINDING_V2 = seal({
  version: 'structured_failure_classifier_v2',
  syntaxEvidence: 'bound_safe_receipt_schemaIssues_root_provider_json_not_parseable',
  originalProviderCodeAndReceiptPreserved: true,
  oldClassifierUnchanged: true, availabilityFlagIsNotRawEvidence: true,
  fullContextFormatRetryAllowed: false, trainingTruth: false,
});

export function validateStructuredFailureClassifierBindingV2(binding) {
  if (verifySeal(binding).hash !== STRUCTURED_FAILURE_CLASSIFIER_BINDING_V2.hash)
    fail('STRUCTURED_FAILURE_CLASSIFIER_BINDING_INVALID');
  return binding;
}

export function classifyStarcraftTmgStructuredFailureV2(input = {}) {
  const prior = classifyStarcraftTmgStructuredFailureV1(input);
  const receipt = input.safeReceipt || input.error?.safeReceipt;
  const wire = prior.class === 'schema_instance' && receipt?.schemaIssues?.some(
    row => row.path === '$' && row.code === 'provider_json_not_parseable');
  if (!wire) return prior; // Payment, ambiguity, truncation and no-progress win.
  const { receiptHash, ...body } = receipt;
  if (hash(body) !== receiptHash) fail('STRUCTURED_WIRE_CLASSIFICATION_RECEIPT_INVALID');
  return Object.freeze({ ...prior, class: 'wire_syntax',
    // A later authenticated quarantine lookup may enable payload-only work.
    // A capability flag alone does not establish that any bytes survived.
    retryRoute: 'quarantine_no_raw_recovery', maxAdditionalProviderAttempts: 0,
    classificationBindingHash: STRUCTURED_FAILURE_CLASSIFIER_BINDING_V2.hash,
    originalReceiptHash: receiptHash, originalProviderCodePreserved: true,
    genericRetryAllowed: false, fullContextFormatRetryAllowed: false,
    trainingTruth: false });
}
