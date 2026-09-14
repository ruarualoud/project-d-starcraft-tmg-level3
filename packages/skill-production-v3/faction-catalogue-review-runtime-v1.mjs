import { hash, fail, verifySeal } from '../skill-production/common.mjs';
import { createFactionReviewContextCapsuleV1 } from './faction-review-context-capsule-v1.mjs';
import { contextManifestRefStarcraftTmgV1 } from '../structured-generation/context-capsule-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V5 as outputContractRef } from '../../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION } from './faction-structured-review-runtime-v1.mjs';

const canonical = id => id.replace(/\.source-evidence-v1\.[a-f0-9]{20}$/u, '');
const rolePattern = /\.review-target-batch-v1\.(supportive|adversarial)\.([0-3])(?:\.phase-seed-v1\.[a-f0-9]{20})?\.([0-9]+)(?:\.source-evidence-v1\.[a-f0-9]{20})?$/u;

// Explicit dual-version routing. A saved V4 request is replayed by V4 only;
// every new review uses V5. Never relabel an old receipt as a new contract.
export function createFactionCatalogueReviewRuntimeV1({ input, legacyRuntime,
  currentRuntime = null, frozenCurrentRuntime = null, frozenCurrentRoleIds = [],
  includeSharedScenarioSources = false, legacyRoleIds, store, executionPolicy, onUncached }) {
  const old = new Set(legacyRoleIds);
  const frozen = new Set(frozenCurrentRoleIds);
  return { async role(request) {
    const fullId = request.packet.id + '.' + request.roleId;
    const match = rolePattern.exec(request.roleId);
    if (!match || old.has(canonical(fullId))) return legacyRuntime.role(request);
    const sharedScenarios = includeSharedScenarioSources && !frozen.has(canonical(fullId));
    if (frozen.has(canonical(fullId)) && frozenCurrentRuntime) return frozenCurrentRuntime.role(request);
    if (!frozen.has(canonical(fullId)) && currentRuntime) return currentRuntime.role(request);
    // Read-only/dry preflight reconstructs the native V5 host request without
    // fabricating a Provider capability receipt or invoking a Provider.
    const roleId = canonical(request.roleId);
    const roleRef = { id: roleId, version: 'structured-review-v1', hash: hash(roleId + '.structured-review-v1') };
    const w = request.workspace;
    const capsule = createFactionReviewContextCapsuleV1({ factionInput: input,
      section: w.section, draft: w.draft, reviewIndices: w.reviewIndices,
      coverageRequiredSourceRefs: w.coverageRequiredSourceRefs,
      targets: w.outputRequestAtEnd.targetContract, roleRef, outputContractRef, route: match[1],
      includeSharedScenarioSources: sharedScenarios });
    const roleInput = { version: STARCRAFT_TMG_FACTION_STRUCTURED_REVIEW_RUNTIME_VERSION,
      packetHash: request.packet.hash, roleRef, contextManifestRef: contextManifestRefStarcraftTmgV1(capsule),
      outputContractRef, executionPolicyRef: { id: 'policy.faction-target-review.production',
        version: '2026.09.06.1', hash: hash(executionPolicy) }, semanticAcceptanceInherited: false };
    const lease = store.acquire(fullId, roleInput);
    if (lease.cached) return verifySeal(lease.artifact);
    store.release(lease);
    onUncached?.({ roleId, roleInput, capsule });
    fail('FACTION_PREFLIGHT_FIRST_CATALOGUE_UNCACHED_ROLE');
  } };
}
