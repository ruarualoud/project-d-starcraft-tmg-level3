import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { freezeArmyBuilderReleaseValueV2 as freeze } from '../packages/source-data/official-army-builder-release-bundle-v2.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
const bundle = freeze(await read('content/source-releases/wave3-20261112-army-builder-v2.json'));
const current = await read('content/source-releases/wave3-20261112-army-builder-release-v2.json');
const old = await read('build/ticket-28-wave3-release-context-20261112-v1/native-release.json');
let rejected = false;
try {
  createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: bundle,
    releaseContext: { manifest: old } });
} catch (error) {
  assert.match(error.message, /ARMY_BUILDER_RELEASE_SOURCE_MISMATCH/);
  rejected = true;
}
const mode = process.argv[2] || 'green';
assert.equal(rejected, mode === 'green');
const port = createOfficialArmyBuilderQueryPortV1({ unitCompositionUpgradeDataBundle: bundle,
  releaseContext: { manifest: current } });
if (mode === 'green') {
  assert.equal(port.portDescriptor().releaseBinding.manifestHash, current.manifestHash);
  const menu = port.enumerateArmyBuildingChoices({ factionRecordKey: 'tactical_cards:terran_armed_forces',
    scaleId: 'Skirmish', mineralBudget: 500 });
  assert.deepEqual(menu.releaseBinding, port.portDescriptor().releaseBinding);
}
const result = { mode, wrongReleaseRejected: rejected,
  releaseBinding: port.portDescriptor().releaseBinding || null };
await atomicWrite(path.join(root, `build/ticket-28-wave3-army-builder-20261112-v1/binding-${mode}.json`),
  JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result));
