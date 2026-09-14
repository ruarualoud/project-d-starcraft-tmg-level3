import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { hash, verifySeal, fail } from '../skill-production/common.mjs';
import { FACTION_PARSED_REVIEW_VALUE_BINDING_V1, verifyFactionParsedReviewValueRecordV1, readFactionReviewArtifactByHashV1 }
  from './faction-parsed-review-value-v1.mjs';
import { prepareFactionSlotReviewRoleV1 } from './faction-slot-review-runtime-v1.mjs';
import { createFactionStructuralReviewRuntimeV1, verifyFactionStructuralReviewRoleV1 } from './faction-structural-json-runtime-v1.mjs';
import { readFactionStructuralReviewOriginV1, authenticateFactionStructuralReviewV1 } from './faction-structural-json-environment-v1.mjs';
import { assertFactionStructuralJsonRecipeV1 } from './faction-structural-json-scope-v1.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 } from '../structured-generation/authenticated-structural-json-recovery-v2.mjs';
import { FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2, prepareFactionStructuralJsonSchemaRepairV2,
  factionParsedWirePhaseCapsuleV2, verifyFactionParsedWireCorrectionRecordV2 } from './faction-structural-json-schema-bridge-v2.mjs';

export function createFactionStructuralReviewLaneV1({ root, filename, runId, recipe, input, runtime, store, dsh,
  executionPolicy, dry = false, onUncached, onProgress }) {
  if (!assertFactionStructuralJsonRecipeV1(recipe)) return runtime;
  const readOrigin = prepared => readFactionStructuralReviewOriginV1({ filename, currentRunId: dry ? null : runId,
    origins: recipe.structuralJsonReviewOrigins, prepared });
  const authenticateOrigin = async ({ origin, prepared, parsed = false }) => {
    const ownerRecipe = origin.runId === runId ? recipe : verifySeal(JSON.parse(await readFile(path.join(root,
      'build/ticket-18-faction-production-v1', origin.runId, 'recipe.json'), 'utf8')));
    return authenticateFactionStructuralReviewV1({ filename, origin, ownerRecipe, prepared,
      executionPolicy, helperRef: recipe.wireKeyHelperRef,
      parsedRecoveryBinding: parsed ? AUTHENTICATED_STRUCTURAL_JSON_RECOVERY_BINDING_V2 : null });
  };
  if (!dry) return createFactionStructuralReviewRuntimeV1({ runtime, input, store, dsh, executionPolicy,
    selectedBinding: recipe.structuralJsonReviewBinding, readOrigin, authenticateOrigin, onProgress,
    parsedWireSchemaBridgeBinding: recipe.parsedWireSchemaBridgeBinding || null });
  return Object.freeze({ async role(request) {
    const prepared = prepareFactionSlotReviewRoleV1({ input, request, executionPolicy });
    const origin = prepared && readOrigin(prepared);
    if (!origin) return runtime.role(request);
    let proof;
    try { ({ proof } = await authenticateOrigin({ origin, prepared })); }
    catch (error) {
      if (recipe.parsedWireSchemaBridgeBinding?.hash !== FACTION_STRUCTURAL_JSON_SCHEMA_BRIDGE_BINDING_V2.hash
        || !['STRUCTURAL_JSON_SYNTAX_UNSUPPORTED', 'STRUCTURAL_JSON_SCHEMA_INVALID',
          'FACTION_STRUCTURAL_JSON_ARCHIVED_PARSED_ROUTE_REQUIRED'].includes(error.code)) throw error;
      const actual = await authenticateOrigin({ origin, prepared, parsed: true });
      const valid = actual.proof.validation.ok && recipe.parsedReviewValueBinding?.hash === FACTION_PARSED_REVIEW_VALUE_BINDING_V1.hash;
      const preparation = valid ? null : prepareFactionStructuralJsonSchemaRepairV2({ capsule: prepared.capsule, authenticated: actual.proof });
      const lease = store.acquire(prepared.fullRoleId, prepared.roleInput);
      if (lease.cached) {
        const value = verifySeal(lease.artifact);
        const records = [...(value.parsedWireRecoveries || []), ...(value.parsedReviewValues || [])];
        if (!records.length || records.length > 4 || new Set(records.map(r => r.originalContextHash)).size !== records.length
          || value.parsedReviewValues && recipe.parsedReviewValueBinding?.hash !== FACTION_PARSED_REVIEW_VALUE_BINDING_V1.hash
          || !(valid ? value.parsedReviewValues : value.parsedWireRecoveries)?.some(r => r.originalContextHash === prepared.capsule.hash))
          fail('FACTION_PARSED_WIRE_SCHEMA_PREFLIGHT_CACHE_INVALID');
        for (const record of records) {
          const capsule = factionParsedWirePhaseCapsuleV2({ input, baseCapsule: prepared.capsule, value, record,
            resolveArtifact: identity => readFactionReviewArtifactByHashV1({ filename,
              ...(typeof identity === 'string' ? { artifactHash: identity }
                : { rejectedCandidateContextHash: identity.contextHash,
                  rejectedCandidateRoleId: identity.roleId }),
              allowedRunIds: [runId, ...(recipe.continuation?.checkpointInventory?.ancestors || []).map(r => r.runId)] }) });
          const phase = { ...prepared, capsule, roleInput: { ...prepared.roleInput, roleRef: capsule.roleRef,
            contextManifestRef: contextManifestRefStarcraftTmgV1(capsule) } };
          const phaseOrigin = readOrigin(phase);
          if (!phaseOrigin) fail('FACTION_PARSED_WIRE_SCHEMA_PREFLIGHT_ORIGIN_MISSING');
          const auth = capsule.hash === prepared.capsule.hash ? actual
            : await authenticateOrigin({ origin: phaseOrigin, prepared: phase, parsed: true });
          if (record.version === FACTION_PARSED_REVIEW_VALUE_BINDING_V1.version)
            verifyFactionParsedReviewValueRecordV1({ record, capsule, authenticated: auth.proof, dshBindingHash: recipe.dshBindingHash });
          else verifyFactionParsedWireCorrectionRecordV2({ record, capsule, authenticated: auth.proof, dshBindingHash: recipe.dshBindingHash,
            parsedReviewValue: value.parsedReviewValues?.find(r => r.hash === record.correctedParsedReviewValueRef?.hash) });
        }
        return value;
      }
      store.release(lease);
      if (valid) {
        onUncached?.({ roleId: prepared.fullRoleId, contextHash: prepared.capsule.hash,
          proofHash: actual.proof.hash, origin, nextRoute: 'parsed_schema_valid_no_provider_call' });
        fail('FACTION_PREFLIGHT_STRUCTURAL_JSON_RECOVERY_REQUIRED');
      }
      onUncached?.({ roleId: prepared.fullRoleId, contextHash: prepared.capsule.hash,
        preparationHash: preparation.hash, origin, nextRoute: 'parsed_wire_schema_correction_v2' });
      fail('FACTION_PREFLIGHT_PARSED_WIRE_SCHEMA_CORRECTION_REQUIRED');
    }
    const lease = store.acquire(prepared.fullRoleId, prepared.roleInput);
    if (lease.cached) {
      verifyFactionStructuralReviewRoleV1({ value: lease.artifact, prepared, authenticated: proof,
        dshBindingHash: recipe.dshBindingHash, selectedBinding: recipe.structuralJsonReviewBinding });
      return verifySeal(lease.artifact);
    }
    store.release(lease);
    onUncached?.({ roleId: prepared.fullRoleId, contextHash: prepared.capsule.hash, proofHash: proof.hash, origin });
    fail('FACTION_PREFLIGHT_STRUCTURAL_JSON_RECOVERY_REQUIRED');
  } });
}
