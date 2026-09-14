import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { seal, verifySeal } from '../packages/skill-production/common.mjs';
import { readFactionTeachFailureEvidenceV1 } from '../packages/skill-evaluation/faction-teach-failure-evidence-v1.mjs';
import { validateFactionProposerBatchOutputV1 } from '../packages/skill-production-v3/faction-proposer-batches-v1.mjs';

// Regression written against the real failing native -> workflow boundary.
// The first assertion proves V1 is still strict; the second must fail before
// the explicit Host auxiliary-capacity implementation is installed.
const base = 'build/ticket-18-faction-production-v1/';
const read = async name => verifySeal(JSON.parse(await readFile(base + name + '.json', 'utf8')));
const input = await read('zerg_swarm-input'), diagnosis = await read('proposer-uncertainty-capacity-diagnosis');
const { plan, batchIndex } = diagnosis.request.workspace.proposerBatch;
const evidence = readFactionTeachFailureEvidenceV1({ filename: 'build/ticket-17-production-redesign-v1/production.sqlite',
  runId: diagnosis.originRunId, attemptId: diagnosis.originAttemptId });
const auxiliaryCapacityBinding = seal({ version: 'faction_proposer_auxiliary_capacity_v1',
  acceptedOverflowPaths: ['$.uncertainties'], maximumUncertainties: 128, maximumUncertaintyLength: 240,
  substantivePlanLimitsChanged: false, providerContractChanged: false, allOriginalTextPreserved: true,
  originalFailureRelabelled: false, automaticWholeRoleRetries: 0, semanticAcceptanceInherited: false, trainingTruth: false });
const args = { input, plan, indices: plan.batches[batchIndex] };
assert.throws(() => validateFactionProposerBatchOutputV1(evidence.rejected.providerValue, args),
  { code: 'FACTION_PROPOSER_BATCH_UNCERTAINTIES_INVALID' });
assert.deepEqual(validateFactionProposerBatchOutputV1(evidence.rejected.providerValue, { ...args, auxiliaryCapacityBinding }),
  evidence.rejected.providerValue);
console.log(JSON.stringify({ passed: true, actualThreeUncertaintiesPreserved: true, providerCalls: 0 }));
