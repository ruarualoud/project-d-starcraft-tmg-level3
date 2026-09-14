import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as legacy } from '../content/skill-generation/offline-provider-profile-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V2 as capacity } from '../content/skill-generation/offline-provider-profile-v2.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V3 as beta,
  assertDeepSeekV41BetaWindowV1 } from '../content/skill-generation/offline-provider-profile-v3.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 } from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1,
  STARCRAFT_TMG_STRUCTURED_PROVIDER_REQUEST_VERSION as requestVersion } from
  '../packages/structured-generation/adapters/deepseek-responses-json-schema-v1.mjs';
import { STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_V4 as contract,
  STARCRAFT_TMG_FACTION_REVIEW_OUTPUT_CONTRACT_REF_V4 as contractRef } from
  '../content/skill-generation/ticket-18-faction-review-output-contract-v1.mjs';
import { hash } from '../packages/skill-production/common.mjs';

assert.equal(legacy.model, 'deepseek-v4-flash');
assert.equal(capacity.model, legacy.model);
assert.equal(beta.model, 'deepseek-v4.1-flash-expires-on-0910');
assert.notEqual(beta.integrity.hash, capacity.integrity.hash);
assert.equal(beta.baseUrl, 'https://api.deepseek.com');
assert.equal(beta.outputBudget, 8192);
assert.equal(beta.retryPolicy.maxAttempts, 1);
assert.equal(beta.fallbackPolicy, 'fail_closed');
assertDeepSeekV41BetaWindowV1('2026-09-09T15:59:59.999Z');
assert.throws(() => assertDeepSeekV41BetaWindowV1('2026-09-09T16:00:00.000Z'), {code:'DEEPSEEK_V41_BETA_LOCAL_WINDOW_CLOSED'});
assert.throws(() => assertDeepSeekV41BetaWindowV1('invalid'), {code:'DEEPSEEK_V41_BETA_LOCAL_WINDOW_CLOSED'});
const registry = createStarcraftTmgProviderProfileRegistryV2({ entries: [{providerProfile:beta,responsePath:'/responses'}] });
const binding = registry.resolveEgressBinding({profileRef:{id:beta.providerProfileId,version:beta.version,hash:beta.integrity.hash}}).egressBinding;
assert.equal(binding.model, beta.model);
assert.equal(binding.endpoint.hostname, 'api.deepseek.com');
assert.equal(binding.endpoint.path, '/responses');
assert.equal(binding.automaticRetryAllowed, false);
assert.equal(registry.resolveEgressBinding({profileRef:{id:legacy.providerProfileId,version:legacy.version,hash:legacy.integrity.hash}}).ok, false);
let calls = 0;
const adapter = createStarcraftTmgDeepSeekResponsesJsonSchemaAdapterV1({ send: async request => {
  calls += 1;
  assert.equal(request.body.model, beta.model);
  assert.equal(request.body.max_output_tokens, 256);
  // Stop at the transport boundary. This is NOT a live-capability proof.
  throw Object.assign(new Error('TEST_NOT_SENT'), {code:'TEST_NOT_SENT',safeReceipt:{requestDefinitelyNotSent:true,requestMayHaveBeenSent:false,physicalAttempts:0}});
} });
const result = await adapter.probeCapability({egressBinding:binding,outputContract:contract,
  providerRequest:{schemaVersion:requestVersion,requestId:'beta-profile-dry-transport-001',
    roleRef:{id:'beta.probe',version:'v1',hash:hash('beta.probe')},instructions:'Return JSON only.',input:'Synthetic test.',outputContractRef:contractRef,maxOutputUnits:256},
  expiresAt:'2026-09-09T15:00:00.000Z'});
assert.equal(calls, 1);
assert.equal(result.ok, false);
assert.equal(result.safeReceipt.requestDefinitelyNotSent, true);
const source = await readFile(new URL('./run-ticket-18-deepseek-v41-beta-canary-v1.mjs', import.meta.url), 'utf8');
assert.match(source, /bindingHash: binding.policyHash/);
assert.match(source, /reportedModel !== profile.model/);
console.log(JSON.stringify({passed:true,providerCalls:0,oldProfilesPreserved:true,betaWireModelVerified:true,
  localExpiryTested:true,liveCapabilityProven:false,skillAcceptance:false}));
