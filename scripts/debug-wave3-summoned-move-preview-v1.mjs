import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createOfficialReleaseResolverV2, bindOfficialReleaseRulesRuntimeV2 } from '../packages/source-data/official-release-context-v2.mjs';
import { createSqliteOfficialReleaseStoreV1 } from '../packages/source-data/sqlite-official-release-store-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { openWave3EngineeringRoomV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = 'build/ticket-28-terran-wave3-20261116-v1/nova-holo-decoy/';
const directory = path.join(root, output);
const id = 'assault-use-before';
const roomId = 'wave3-nova-holo-' + id;
const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
function differences(left, right, at = '', result = []) {
  if (result.length >= 40 || JSON.stringify(left) === JSON.stringify(right)) return result;
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) differences(left[key], right[key], at + '/' + key, result);
  } else result.push({ path: at, saved: left, observed: right });
  return result;
}
const store = createSqliteOfficialReleaseStoreV1({ filename: path.join(directory, 'releases.sqlite') });
const resolver = createOfficialReleaseResolverV2({ store, loadArtifact: read });
try {
  const context = await resolver.resolve({ releaseId: roomId + '-v1', purpose: 'area_ability_component' });
  const authority = await read(output + id + '/authority.json');
  const runtime = createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: authority.state, definitionIds: [] });
  const native = openWave3EngineeringRoomV1({ directory: path.join(directory, id), filename: 'room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime }) });
  try {
    const current = await native.store.loadRoom(roomId);
    const credentials = await native.create(roomId, authority);
    const files = (await fs.readdir(path.join(directory, id))).filter(name => name.startsWith('operation-'));
    const saved = (await Promise.all(files.map(name => read(output + id + '/' + name))))
      .find(value => value.domain.actionType === 'move');
    const input = { roomId, seatToken: credentials.player1.seatToken };
    const legal = await native.room.legalSpace(input);
    const fresh = await native.room.previewAction({ ...input, proposal: saved.preview.core.proposal,
      expectedStateRevision: current.stateRevision, expectedStateHash: current.envelope.stateHash,
      expectedMatchBindingHash: current.envelope.matchBindingHash, expectedLegalSpaceHash: legal.legalSpace.legalSpaceHash });
    if (!fresh.ok) throw Error(JSON.stringify(fresh));
    const first = runtime.apply(current.envelope.state, saved.preview.core.action, { postRevision: current.stateRevision + 1 });
    const second = runtime.apply(JSON.parse(JSON.stringify(current.envelope.state)), saved.preview.core.action, { postRevision: current.stateRevision + 1 });
    const report = { revision: current.stateRevision, previewCoreDifferences: differences(saved.preview.core, fresh.preview.core),
      liveVsJsonResultDifferences: differences(first, second), savedResultKeys: Object.keys(saved.preview.core.result),
      modelCalls: 0, nativeActionApplied: false };
    await atomicWrite(path.join(directory, 'preview-diagnostic.json'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
  } finally { native.close(); }
} finally { store.close(); }
