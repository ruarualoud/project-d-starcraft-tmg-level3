#!/usr/bin/env node

import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { hash } from '../packages/skill-production/common.mjs';
import { createStarcraftTmgProviderProfileRegistryV2 }
  from '../packages/secure-provider-runtime/provider-profile-registry-v2.mjs';
import { factionFieldValueDispatchWireMatchesV1 }
  from '../packages/skill-production-v3/faction-field-value-runtime-v1.mjs';
import { STARCRAFT_TMG_OFFLINE_SKILL_PROVIDER_PROFILE_V1 as profile }
  from '../content/skill-generation/offline-provider-profile-v1.mjs';

const db = new DatabaseSync('build/ticket-17-production-redesign-v1/production.sqlite', { readOnly: true });
const row = db.prepare("SELECT artifact FROM steps WHERE id LIKE ? AND state='complete' ORDER BY rowid DESC LIMIT 1")
  .get('%ambiguous-replacement.choice');
db.close();
const choice = JSON.parse(row.artifact).value;
const egressBinding = createStarcraftTmgProviderProfileRegistryV2({
  entries: [{ providerProfile: profile, responsePath: '/responses' }],
  allowedProviders: ['deepseek-openai-compatible-direct'],
}).resolveEgressBinding({ profileRef: {
  id: profile.providerProfileId, version: profile.version, hash: profile.integrity.hash,
} }).egressBinding;

assert.notEqual(choice.egressBindingHash, hash(egressBinding));
assert.equal(factionFieldValueDispatchWireMatchesV1({ dispatchChoice: choice, egressBinding }), true);
assert.equal(factionFieldValueDispatchWireMatchesV1({ dispatchChoice: choice,
  egressBinding: { ...egressBinding, model: 'different-model' } }), false);
assert.equal(factionFieldValueDispatchWireMatchesV1({ dispatchChoice: choice,
  egressBinding: { ...egressBinding, endpoint: { ...egressBinding.endpoint, path: '/different' } } }), false);

console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
  fullPolicyHashChanged: true, portableRequestBindingMatched: true,
  modelDriftBlocked: true, endpointDriftBlocked: true, providerCalls: 0 }));
