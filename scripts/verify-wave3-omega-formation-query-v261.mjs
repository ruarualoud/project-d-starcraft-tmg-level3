import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext } from './support/wave3-standard-action-room-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';

import { createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1, describeStarcraftTmgActionParameterRepairContextV1 } from '../packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs';

const dir = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-network-deployment-v261';
const stage = process.argv[2];
assert(['before', 'after'].includes(stage));
const ready = await read(dir + '/prepared.json');
const { roomId, scenario } = ready;
const recipe = await read(scenario.rosterRecipeRef);
const context = await resolveWave3StandardContext(await read(recipe.manifestRef), 'area_ability_inputs');
const { state } = prepareOfficialStandardReleaseOpeningV2({ releaseMatchVersion: ready.version,
  releaseContext: context, dataset: context.dataset, snapshot: context.snapshot, recipes: recipe.recipes,
  missionRecordKey: recipe.mission, deploymentRecordKey: recipe.deployment, armySpendPolicy: OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY });
const bound = await bindWave3StandardActionRoom({ manifestRef: recipe.manifestRef, initial: state, dir,
  candidateVersion: ready.version, scenario, frozenRuntimeRef: scenario.frozenRuntimeRef });
const native = bound.open();
try {
  const captured = await read(dir + '/editor-input.json');
  const initial = await native.store.loadRoom(roomId);
  assert.equal(initial.envelope.stateHash, captured.stateHash);
  assert.equal(initial.envelope.matchBindingHash, captured.matchBindingHash);
  assert.equal(initial.stateRevision, captured.revision);
  const adapter = createStarcraftTmgRoomBackedSpatialRulesQueryAdapterV1({
    roomStore: native.store, rulesRuntime: bound.rulesRuntime, seatKey: 'player2',
    observeQueryBatchDiagnostic(event) {
      if (['candidate_generation_complete', 'rules_instantiation_completed', 'search_completed', 'formation_comparison_batch_completed'].includes(event.stage))
        console.log(event.stage, event.generatedCandidateCount ?? event.jobCount ?? event.instantiatedCandidateCount ?? '');
    },
  });
  const authority = { roomId, seatKey: 'player2', stateHash: captured.stateHash,
    matchBindingHash: captured.matchBindingHash, stateRevision: captured.revision, legalSpaceHash: captured.legalSpaceHash };
  async function evaluate(domain, preferredAnchor) {
    const args = { domainId: domain.domainId, currentLegalSpaceDomain: domain, preferredAnchor,
      maximumOptions: 1, maximumCandidateAttempts: 12 };
    console.log('query', domain.pieceId, preferredAnchor);
    const response = await adapter.query({ authority, queryKind: 'space.solve_formation', arguments: args });
    const option = response.result?.formationOptions?.[0];
    return { pieceId: domain.pieceId, preferredAnchor, precision: response.precision,
      reason: response.reason ?? null, failures: response.result?.failureCounts ?? response.details?.failureCounts,
      entry: option?.canonicalParameters?.entrySegmentId ?? null, option: option?.canonicalParameters ?? null,
      mutationAuthority: response.mutationAuthority, applyAuthority: response.applyAuthority };
  }
  const observations = [];
  for (const domain of captured.parameterDomains) {
    const source = domain.constraints.entrySegments.find(entry => entry.kind === 'unit_base_perimeter');
    const profile = domain.constraints.modelProfiles[0];
    const target = { xMilliInches: source.center.xMilliInches + 4500, yMilliInches: source.center.yMilliInches };
    const parameters = { leadingModelId: profile.modelId, entrySegmentId: source.segmentId,
      entryAlongEdgeMilliInches: 0, path: [target], placements: [] };
    // Inspect path diagnostics without inventing a Rules rejection for this valid endpoint.
    const repair = describeStarcraftTmgActionParameterRepairContextV1(domain, { parameters }, null, null);
    const observation = await evaluate(domain, target);
    const result = { ...observation, hostStart: repair.hostPrependedPathStart,
      distance: repair.submittedDistanceIncludingHostStartMilliInches };
    observations.push(result);
    await save(dir + '/formation-query-' + stage + '-' + domain.pieceId + '.json', result);
  }
  if (stage === 'after') {
    const control = await evaluate(captured.parameterDomains[1], { xMilliInches: 32000, yMilliInches: 1200 });
    observations.push(control);
  }
  const after = await native.store.loadRoom(roomId);
  assert.equal(after.envelope.stateHash, initial.envelope.stateHash);
  assert.equal(after.stateRevision, initial.stateRevision);
  await save(dir + '/formation-query-' + stage + '.json', { roomId, revision: after.stateRevision,
    stateHash: authority.stateHash, legalSpaceHash: authority.legalSpaceHash, observations,
    roomPreviewSent: false, actionSubmitted: false, modelCalls: 0 });
  console.log(JSON.stringify(observations.map(({pieceId,precision,entry,reason,hostStart,distance,failures}) =>
    ({pieceId,precision,entry,reason,hostStart,distance,failures}))));
  if (stage === 'before') {
    for (const row of observations) {
      assert.equal(row.hostStart, null);
      assert(!row.entry?.startsWith('omega-worm:'));
    }
  } else {
    for (const [index, domain] of captured.parameterDomains.entries()) {
      const row = observations[index];
      const segment = domain.constraints.entrySegments.find(entry => entry.kind === 'unit_base_perimeter');
      assert.equal(row.precision, 'exact');
      assert.equal(row.entry, segment.segmentId);
      assert.equal(row.option.placements.length, domain.constraints.modelProfiles.length - 1);
      assert.equal(row.mutationAuthority, false);
      assert.equal(row.applyAuthority, false);
      assert.equal(row.hostStart.xMilliInches, segment.center.xMilliInches + segment.radiusMilliInches
        + Math.round(domain.constraints.modelProfiles[0].baseWidthMilliInches / 2));
      assert.equal(row.hostStart.yMilliInches, segment.center.yMilliInches);
      assert.equal(row.distance, row.preferredAnchor.xMilliInches - row.hostStart.xMilliInches);
    }
    assert.equal(observations.at(-1).entry, captured.parameterDomains[1].constraints.entrySegments.find(entry => entry.side === 'bottom').segmentId);
    assert.equal(observations.at(-1).precision, 'exact');
  }
} finally { native.close(); }
