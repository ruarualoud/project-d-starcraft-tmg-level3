import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { seal, verifySeal } from '../skill-production/common.mjs';
import { openRecoveryAttestationRegistryV1 } from './recovery-attestation-registry-v1.mjs';

// Explicit local Host trust configuration, not directory discovery or a key
// supplied by an LLM. These attestations were issued while raw access was live.
// Authenticity verification may evolve without rewriting the frozen content,
// origin recipe, failed receipt, price, or original recovery proof hash.
export const RECOVERY_ATTESTATION_HOST_POLICY_V1 = seal({
  version: 'faction_local_recovery_trust_policy_v1',
  registryFile: 'build/ticket-18-faction-production-v1/recovery-attestation-zerg-current-xFVr2m/registry.json',
  registryHash: '0f8af8ef85290e993bd8d9e4439077e6417c7ca2ac9682dd998e5cafe5260d71',
  scope: 'explicitly_pinned_local_development_host',
  existingContentAndProofHashesUnchanged: true, expiredRawAccess: false,
  semanticAcceptance: false, trainingTruth: false,
});

export async function openFactionHostRecoveryTrustV1({ root, filename }) {
  const policy = RECOVERY_ATTESTATION_HOST_POLICY_V1;
  const registry = verifySeal(JSON.parse(await readFile(path.join(root, policy.registryFile), 'utf8')));
  return openRecoveryAttestationRegistryV1({ root, filename, registry, expectedRegistryHash: policy.registryHash });
}
