#!/usr/bin/env node

import assert from 'node:assert/strict';
import { containsStarcraftTmgOnlineCredentialMaterialV1 as contains }
  from '../packages/online-agent-session/portable-credential-material-v1.mjs';

// Rules, game tokens and security-policy metadata are ordinary portable
// content. Only actual API-key/authentication values are rejected here;
// exact known-key echo detection remains a separate stronger boundary.
for (const value of [
  { secretAttachmentPolicy: 'credential_worker_only', credentialStatus: 'not_attached' },
  { gameToken: 'apostle-end-round-move', accessTokenBudget: 3 },
  'Rule reminder: secret: objectives are still public game information.',
  'authorization is handled by the worker and is not embedded here',
]) assert.equal(contains(value), false);

for (const value of [
  'sk-1234567890abcdef1234567890abcdef',
  'jsk-1234567890abcdef1234567890abcdef',
  'Bearer abcdefghijklmnopqrstuvwxyz',
  { apiKey: 'development-key-123456' },
  { authorization: 'opaque-api-key-123456' },
]) assert.equal(contains(value), true);

console.log(JSON.stringify({ ticket: 18, slice: 174, passed: true,
  ordinaryRuleAndPolicyMetadataAllowed: 4, actualApiKeyFormsRejected: 5 }));
