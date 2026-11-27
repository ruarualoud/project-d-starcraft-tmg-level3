import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRosterDecisionWorkflowStoreV1 } from '../packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs';
import { createRosterDecisionWorkspaceRunV1 } from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
import { createRosterPlanningProductModuleV1 } from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import { createStarcraftProductRoomHostV1 } from './support/starcraft-product-room-host-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const previous = process.argv[2];
assert.match(previous ?? '', /^build\/ticket-28-wave3-author-query-[A-Za-z0-9]+$/);
const root = process.cwd();
const saved = createRosterDecisionWorkflowStoreV1({directory:path.join(root, previous, 'workflow')});
const state = await saved.load();
const entry = state.evidence.find(row => row.id === 'bound-map');
const original = await saved.get(entry.artifactRef);
const directory = await mkdtemp(path.join(root,'build/ticket-28-wave3-author-map-binding-'));
const host = await createStarcraftProductRoomHostV1({root, dataDirectory:path.join(directory,'host'),
  offlineWave3MatchVersion:'2.99.0', liveEnabled:false});
try {
  const board = await createRosterPlanningProductModuleV1({root, ...host.planningInputsForSetup('wave3-standard-v1'), operation:'board_queries'});
  assert.equal(board.releaseBinding.manifestHash, original.releaseBinding.manifestHash);
  const open = (location = directory) => createRosterDecisionWorkspaceRunV1({directory:path.join(location,'workflow'),
    scope:state.scope, sessionId:'release-binding-probe', laboratory:board.laboratory,
    builderPort:board.armyBuilderPort, deliberation:{deliberate(){throw Error('Unexpected model call');}}});
  const previousFailure = process.argv[3];
  if (previousFailure) {
    assert.match(previousFailure, /^build\/ticket-28-wave3-author-map-binding-[A-Za-z0-9]+$/);
    await assert.rejects(() => open(path.resolve(previousFailure)), /ROSTER_MAP_EVIDENCE_RELEASE_MISMATCH/);
  }
  let run = await open();
  const publish = (id,value) => run.publishEvidence({id, value, title:entry.title, kind:entry.kind,
    conditions:entry.conditions, bindings:entry.bindings});
  const {receiptHash, ...body} = original;
  assert.equal(hash(body), receiptHash);
  const wrong = {...body, releaseBinding:{...body.releaseBinding, manifestHash:'0'.repeat(64)}};
  const {releaseBinding, ...withoutBinding} = body;
  assert.equal(releaseBinding.manifestHash, state.scope.releaseManifest);
  await assert.rejects(() => publish('wrong-release', {...wrong, receiptHash:hash(wrong)}), /ROSTER_MAP_EVIDENCE_RELEASE_MISMATCH/);
  await assert.rejects(() => publish('missing-release', {...withoutBinding, receiptHash:hash(withoutBinding)}), /ROSTER_MAP_EVIDENCE_RELEASE_MISMATCH/);
  await assert.rejects(() => publish('damaged-body', {...original, queryId:'changed-after-seal'}), /ROSTER_MAP_EVIDENCE_HASH_MISMATCH/);
  assert.equal((await run.inspect()).evidence.length, 0);
  const accepted = await publish('same-release', original);
  run = await open();
  const retained = (await run.inspect()).evidence;
  assert.equal(retained.length,1);
  assert.equal(retained[0].artifactRef, accepted.artifactRef);
  const result = {receiptHash, manifestHash:releaseBinding.manifestHash,
    rejected:['other manifest with valid hash','missing manifest with valid hash','modified payload'],
    coldArtifactRef:retained[0].artifactRef, rejectedPreviouslyStoredMismatch: Boolean(previousFailure), providerCalls:0};
  await writeFile(path.join(directory,'result.public.json'), JSON.stringify(result,null,2)+'\n');
  console.log(path.relative(root,directory));
} finally { await host.close(); }
