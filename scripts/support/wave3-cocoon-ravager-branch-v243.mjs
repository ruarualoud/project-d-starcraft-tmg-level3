import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { openWave3EngineeringRoomV1 } from './wave3-room-boundary-fixture-v1.mjs';
import { read, root } from './wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY }
  from '../../packages/product-composition/official-standard-room-factory-v1.mjs';

export async function bindCocoonRavagerBranch({ base, parentDir, dir, source, bundle, checkpoint }) {
  const manifestRef = base + '/wave3-artefact-cocoon-v223-v1/morph/manifest.json';
  const context = await resolveWave3StandardContext(await read(manifestRef), 'area_ability_inputs');
  const roster = (await read(base + '/wave3-artefact-cocoon-v223-v1/factory-preflight.public.json')).find(row => row.status === 'compiled');
  const state = bundle.initialEnvelope.state;
  const opening = prepareOfficialStandardReleaseOpeningV2({ releaseContext: context, dataset: context.dataset,
    snapshot: context.snapshot, releaseMatchVersion: source.version, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    recipes: roster.recipes, missionRecordKey: state.officialMissionRuntimeState.missionRecordKey,
    deploymentRecordKey: state.officialDeploymentGeometryBinding.deploymentRecordKey });
  assert(!opening.state.pieces.some(p => p.officialUnitRecordKey === 'army_units:ravager'));
  assert.equal(bundle.currentAggregate.envelope.stateHash, source.stateHash);
  const scenario = { fromRoom: source.roomId, fromRevision: checkpoint.revision, fromStateHash: checkpoint.stateHash };
  await mkdir(path.join(root, dir), { recursive: true });
  const bound = await bindWave3StandardActionRoom({ manifestRef, initial: opening.state, dir, candidateVersion: source.version,
    frozenRuntimeRef: base + '/cocoon-ravager-attack-v243/runtime.json', scenario });
  let start = bundle.currentAggregate.envelope;
  if (start.stateRevision !== checkpoint.revision) {
    assert(checkpoint.revision > 0 && checkpoint.revision < source.revision);
    const parent = openWave3EngineeringRoomV1({ directory: path.join(root, parentDir), filename: 'room.sqlite', rulesRuntime: bound.rulesRuntime });
    try {
      await parent.restoreDependencies(source.roomId, bound.authorityFor(state, scenario));
      const receipts = bundle.privateJournal.filter(e => e.payload.type === 'accepted_transition')
        .map(e => e.payload.payload.receipt).slice(0, checkpoint.revision);
      assert.equal(receipts.length, checkpoint.revision);
      const replay = parent.engine.replay({ initialEnvelope: bundle.initialEnvelope, journal: receipts });
      assert(replay.ok, replay.reason);
      start = replay.envelope;
    } finally { parent.close(); }
  }
  assert.equal(start.stateRevision, checkpoint.revision);
  assert.equal(start.stateHash, checkpoint.stateHash);
  return { start, bound, authority: bound.authorityFor(start.state, scenario) };
}
