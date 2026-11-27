import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadWave4TimingInputs, timingParameters } from './support/wave4-timing-room-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialHumanConfirmedRuntimeV1 } from '../packages/product-composition/official-human-confirmed-runtime-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.resolve(process.argv[2]);
assert.ok(directory.startsWith(path.join(root, 'build/wave4-web') + path.sep));
const { state } = JSON.parse(await fs.readFile(path.join(directory, 'rooms/armory/authority.json'), 'utf8'));
const inputs = await loadWave4TimingInputs(root);
const definitionId = 'card:armory/vehicle-plating-any@2';
const source = createOfficialCharacteristicStatusComponentRuntimeV2({ context: inputs.context, spatialState: state,
  definitionIds: [], sourceDefinitionIds: [definitionId], includeMelee: true, includeArmourReactions: true });
const before = source.enumerate(state);
const original = before.parameterDomains.find(d => d.definitionId === definitionId);
const runtime = createOfficialHumanConfirmedRuntimeV1(source);
const domain = runtime.enumerate(state).parameterDomains.find(d => d.definitionId === definitionId);
assert.equal(domain.confirmationClass, 'explicit_human');
assert.equal(runtime.descriptor.productionRoomEligible, false);
assert.notEqual(runtime.descriptor.runtimeHash, source.descriptor.runtimeHash);
assert.deepEqual(runtime.instantiate(state, domain, timingParameters(domain)).action,
  source.instantiate(state, original, timingParameters(original)).action);
for (const bad of [{ ...domain, confirmationClass: 'direct_gesture' },
  { ...domain, domainId: original.domainId }, { ...domain, humanConfirmationSourceDomainId: 'different-source' }]) {
  assert.throws(() => runtime.instantiate(state, bad, timingParameters(domain)), /HUMAN_CONFIRMED_DOMAIN_STALE/);
}
assert.deepEqual(source.enumerate(state), before);
const report = { schema: 'starcraft_tmg_wave4_human_confirmation_policy_v1', status: 'passed', definitionId,
  sourceRuntimeHash: source.descriptor.runtimeHash, webRuntimeHash: runtime.descriptor.runtimeHash,
  sourceEnumerationUnchanged: true, canonicalRulesActionUnchanged: true,
  confirmationDowngradeRejected: true, staleSourceDomainRejected: true, productionRoomEligible: false, modelCalls: 0, trainingTruth: false };
await atomicWrite(path.join(root, 'docs/development/wave4/evidence/human-confirmation-policy.public.json'), JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report));
