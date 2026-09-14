import { factionLimitsCompatibleV1 } from './faction-budget-extension-v1.mjs';
import { hash, seal, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2 as binding } from './faction-structural-json-schema-bridge-v2.mjs';

export const FACTION_PARSED_WIRE_FILES_V2 = Object.freeze([
  'packages/structured-generation/adapters/structural-json-recovery-v2.mjs',
  'packages/structured-generation/authenticated-structural-json-recovery-v2.mjs',
  'packages/skill-production-v3/faction-structural-json-schema-bridge-v2.mjs',
  'packages/skill-production-v3/faction-structural-json-environment-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-runtime-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-lane-v1.mjs',
  'packages/skill-production-v3/faction-structural-json-scope-v1.mjs',
  'packages/skill-production-v3/faction-parsed-wire-scope-v2.mjs',
  'packages/skill-production-v3/faction-structured-review-runtime-v1.mjs',
  'packages/skill-production-v3/faction-review-slot-namespace-v1.mjs',
  'packages/skill-production-v3/faction-continuation-v1.mjs',
  'packages/skill-evaluation/faction-structured-replay-v1.mjs',
  'packages/skill-evaluation/faction-production-replay-v1.mjs',
  'scripts/run-ticket-18-faction-strategy-production-v1.mjs',
  'scripts/check-ticket-18-faction-launch-readiness-v1.mjs',
  'scripts/verify-ticket-18-structural-json-schema-bridge-v2.mjs',
  'scripts/verify-ticket-18-parsed-wire-runtime-v2.mjs',
  'scripts/verify-ticket-18-parsed-wire-wiring-v2.mjs',
]);

export function factionParsedWireRecipeV2(readiness) {
  verifySeal(readiness);
  if (readiness.version !== 'faction_parsed_wire_wiring_readiness_v2' || readiness.bindingHash !== binding.hash
    || !readiness.passed || readiness.providerCalls !== 0 || !readiness.actualPaidOriginAuthenticated
    || !readiness.coldConsumerPassed || !readiness.paidResponseRestartPassed
    || !readiness.negativeBindingsPassed || !readiness.dryAndLiveFactoryPassed
    || !/^[a-f0-9]{64}$/u.test(readiness.runtimeDshProofHash || '')
    || hash(readiness.codeHashes.map(r => r.file).sort()) !== hash([...FACTION_PARSED_WIRE_FILES_V2].sort()))
    fail('FACTION_PARSED_WIRE_SCHEMA_READINESS_REQUIRED');
  return { parsedWireSchemaBridgeBinding: binding, parsedWireSchemaBridgeReadinessHash: readiness.hash };
}

export function validateFactionParsedWireMigrationV2({ parent, next, readiness }) {
  const fields = ['parsedWireSchemaBridgeBinding', 'parsedWireSchemaBridgeReadinessHash'];
  if (!fields.some(f => parent[f] !== undefined || next[f] !== undefined)) {
    if (readiness) fail('FACTION_PARSED_WIRE_SCHEMA_MIGRATION_UNSCOPED');
    return null;
  }
  [parent, next].forEach(verifySeal);
  const expected = factionParsedWireRecipeV2(readiness);
  if (fields.some(f => hash(next[f]) !== hash(expected[f]))
    || parent.parsedWireSchemaBridgeBinding && verifySeal(parent.parsedWireSchemaBridgeBinding).hash !== binding.hash
    || !parent.structuralJsonReviewBinding || hash(parent.structuralJsonReviewBinding) !== hash(next.structuralJsonReviewBinding)
    || !factionLimitsCompatibleV1(parent, next) || ['inputHashes', 'sourceBinding', 'modelHash', 'contextHash', 'dshBindingHash', 'executionModelBinding', 'reviewSlotNamespaceBinding']
      .some(f => hash(parent[f]) !== hash(next[f]))) fail('FACTION_PARSED_WIRE_SCHEMA_MIGRATION_INVALID');
  for (const row of readiness.codeHashes)
    if (next.codeHashes.find(r => r.file === row.file)?.hash !== row.hash) fail('FACTION_PARSED_WIRE_SCHEMA_MIGRATION_CODE_DRIFT');
  return seal({ version: 'faction_parsed_wire_schema_migration_v2', bindingHash: binding.hash,
    readinessHash: readiness.hash, files: readiness.codeHashes.map(r => r.file), originalAttemptsCopied: 0,
    accountingReset: false, sourceRefreshed: false, semanticAcceptanceInherited: false, trainingTruth: false });
}
