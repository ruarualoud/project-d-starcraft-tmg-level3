import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createOfficialCurrentProductMatchRuntimeV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { createOfficialCurrentProductMatchRuntimeV6 } from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import { hashStarcraftTmgContract } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createStarcraftTmgSnapshotSceneQueryServiceV1 } from '../packages/online-agent-session/scene-query-service-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const directory = path.join(root, 'build/ticket-28-wave3-release-context-20261112-v1');
const read = async name => JSON.parse(await fs.readFile(path.join(directory, name), 'utf8'));
const [dataset, snapshot, manifest, authority] = await Promise.all([
  read('legacy-dataset.json'), read('legacy-snapshot.json'), read('native-release.json'), read('native-authority.json'),
]);
const native = createOfficialCurrentProductMatchRuntimeV6({ legacyRuntime:
  createOfficialCurrentProductMatchRuntimeV1({ dataset, state: structuredClone(authority.state) }) });
const other = createOfficialReleaseManifestV2({ releaseId: manifest.releaseId + '-second-scope', dataset, snapshot,
  snapshotRef: manifest.source.snapshotRef, datasetRef: manifest.source.datasetRef,
  sourceRevisionRef: manifest.source.sourceRevisionRef, components: manifest.components, sourcePolicy: manifest.source.policy });
const stateHash = hashStarcraftTmgContract(authority.state);
function scope(runtime) {
  return createStarcraftTmgSnapshotSceneQueryServiceV1({ state: authority.state, rulesRuntime: runtime,
    seatKey: 'player1', sceneScope: { kind: 'hypothetical_branch', sourceStateHash: stateHash, baseStateHash: stateHash } })
    .actionSpace().authority.matchBindingHash;
}
const first = scope(bindOfficialReleaseRulesRuntimeV2({ context: { dataset, snapshot, manifest }, runtime: native }));
const second = scope(bindOfficialReleaseRulesRuntimeV2({ context: { dataset, snapshot, manifest: other }, runtime: native }));
const unbound = scope(native);
const evidence = { first, second, legacyScopePreserved: unbound === hashStarcraftTmgContract({}),
  source: 'actual native state, hypothetical scene without a Room match binding', modelCalls: 0 };
try {
  assert.notEqual(first, second, 'SCENE_RELEASE_SCOPES_COLLIDE');
  assert.equal(evidence.legacyScopePreserved, true);
  await atomicWrite(path.join(directory, 'scene-scope-result.json'), JSON.stringify({ status: 'passed', ...evidence }, null, 2));
  console.log(JSON.stringify({ status: 'passed', ...evidence }, null, 2));
} catch (error) {
  await atomicWrite(path.join(directory, 'scene-scope-failure.json'), JSON.stringify({ status: 'failed', ...evidence, error: error.message }, null, 2));
  throw error;
}
