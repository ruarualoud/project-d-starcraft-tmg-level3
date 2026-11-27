import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { compileWave4AbilityDiff, WAVE4_ABILITY_DIRECTORY } from '../compile-wave4-ability-diff.mjs';
import { createOfficialAbilityEffectIrCatalogueV1, createOfficialAbilitySourcePhasePolicyV1 } from '../../packages/source-data/official-ability-effect-ir-v1.mjs';
import { createOfficialReactionFamilySourceBundleV2 } from '../../packages/product-composition/official-reaction-family-adapter-v1.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 } from '../../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialReleaseCardCatalogueV2 } from '../../packages/source-data/official-army-builder-catalogue-v2.mjs';
import { createOfficialStandardActionRouteCatalogueV1 } from '../../packages/product-composition/official-standard-action-route-catalogue-v1.mjs';
import { refreshOfficialReleaseRosterDerivedStateV2 } from '../../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialReleaseManifestV2, bindOfficialReleaseRulesRuntimeV2 } from '../../packages/source-data/official-release-context-v2.mjs';
import { OFFICIAL_FAQ_REACTION_POLICY_V13 } from '../../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import { declareWave3EngineeringCoherencyV1, createWave3ComponentEngineeringAuthorityV1, openWave3EngineeringRoomV1 } from './wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from '../lib/development-context.mjs';
import { createOfficialSpecialTerrainAgreementV1 } from '../../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs';
import { createOfficialTerrainElevationAgreementV1 } from '../../packages/rule-atoms/official-elevation-effective-size-rules-kernel-v1.mjs';
import { createOfficialHumanConfirmedRuntimeV1 } from '../../packages/product-composition/official-human-confirmed-runtime-v1.mjs';

export async function loadWave4TimingInputs(root) {
  const compiled = await compileWave4AbilityDiff(root);
  const { dataset, identities, snapshot, manifest } = compiled;
  const context = { dataset, snapshot, manifest, resources: { abilityIdentities: identities } };
  const phasePolicy = createOfficialAbilitySourcePhasePolicyV1({ dataset, includeInlineCardPhases: true });
  const source = createOfficialAbilityEffectIrCatalogueV1({ dataset, identityCatalogue: identities,
    sourceDefinitionIds: compiled.inventory.timingReactionDefinitionIds, sourcePhasePolicy: phasePolicy });
  const reactions = createOfficialReactionFamilySourceBundleV2({ catalogue: source, definitionIds: compiled.inventory.timingReactionDefinitionIds });
  const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
  const seeds = Object.fromEntries(await Promise.all(['Skirmish', 'Standard'].map(async scale => [scale,
    await read('build/wave4-web/armour-reaction-components/factory-' + scale + '.json')])));
  const oldDataset = await read('content/source-releases/wave4-20261127/compatibility/wave3-dataset.json');
  return { ...compiled, context, phasePolicy, reactions, seeds, oldDataset, read };
}

export function timingParameters(domain) {
  const schema = domain.sourceDomain?.parameterSchema || domain.parameterSchema;
  return Object.fromEntries((schema.required || []).map(key => {
    const prop = schema.properties?.[key] || schema[key];
    if (Object.hasOwn(prop || {}, 'const')) return [key, structuredClone(prop.const)];
    if (prop?.enum?.length) return [key, prop.enum[0]];
    if (prop?.items?.enum) return [key, prop.items.enum.slice(0, prop.maxItems ?? 0)];
    throw Error('TIMING_PARAMETER_REQUIRES_SELECTION:' + key);
  }));
}

export function createWave4AttackScene(inputs, spec, { phase = 'combat', distance = 0.5 } = {}) {
  const { dataset, context, phasePolicy, seeds, oldDataset } = inputs;
  const scale = spec.requiredTargetTag === 'mechanical' || spec.requiredTargetTags ? 'Standard' : 'Skirmish';
  // Conditional, declared positions; unit stats/equipment/base geometry remain factory-owned.
  // This is deliberately not a claim of a legal mixed-faction army or a complete Wave4 release.
  const base = seeds[scale].state;
  const actor = structuredClone(seeds.Standard.state.pieces.find(p => p.id === 'zealot'));
  const target = structuredClone(seeds.Standard.state.pieces.find(p => p.id === (spec.requiredTargetTag === 'biological' ? 'defiler' : 'sentry')));
  actor.sideKey = 'player1'; target.sideKey = 'player2';
  for (const piece of [actor, target]) {
    assert.equal(dataset.recordsByKey[piece.officialUnitRecordKey].payloadHash, oldDataset.recordsByKey[piece.officialUnitRecordKey].payloadHash);
    Object.assign(piece, { isOnField: true, isInReserves: false, deploymentStatus: 'deployed', leadingModelId: piece.models[0].id });
    const x = piece === actor ? 12 : 12 + (actor.models[0].baseWidthInches + piece.models[0].baseWidthInches) / 2 + distance;
    piece.models.forEach((m, i) => Object.assign(m, { isOnField: true,
      xInches: x + (piece === actor ? -1 : 1) * (i === 1 ? m.baseWidthInches + 0.05 : i === 2 ? (m.baseWidthInches + 0.05) / 2 : 0),
      yInches: 10 + (i === 2 ? (m.baseDepthInches + 0.05) * Math.sqrt(3) / 2 : 0) }));
  }
  const keep = ['officialCombatProfileBundle','officialAttackProfileCatalogue','officialAttackProfileCatalogueV2',
    'officialModelBaseGeometryDataBundle','officialTerrainLosDataBundle','officialModelGapTransitPolicy',
    'officialUnitCardSupplyDataBundle','officialUnitCompositionUpgradeDataBundle','officialRosterDisclosureDataBundle',
    'officialMissionRuntimeDescriptor','supplyLossLedger','engagementScale','armyBuildingEngagementScale'];
  const cardRecord = dataset.recordsByKey[spec.recordKey];
  const catalogue = createOfficialAbilityEffectIrCatalogueV1({ dataset, identityCatalogue: inputs.identities,
    sourceDefinitionIds: [spec.definitionId], sourcePhasePolicy: phasePolicy });
  const state = { ...Object.fromEntries(keep.map(k => [k, structuredClone(base[k])])), round: 1, phase,
    activeSideKey: 'player1', firstPlayerSideKey: 'player1',
    phaseFirstActorByRound: { ['1:' + phase]: { round: 1, phase, chosenFirstActorSideKey: 'player1' } },
    players: { player1: { passedPhases: {} }, player2: { passedPhases: {} } },
    board: { widthInches: base.board.widthInches, heightInches: base.board.heightInches,
      terrain: [structuredClone(base.board.terrain[0])], accessPoints: [], tokens: [], markers: [], effectMarkers: [], engagementGeometry: structuredClone(base.board.engagementGeometry),
      specialTerrainAgreement: createOfficialSpecialTerrainAgreementV1({ terrainEntries:
        base.board.specialTerrainAgreement.terrainEntries.filter(e => e.terrainId === base.board.terrain[0].id) }),
      terrainElevationAgreement: createOfficialTerrainElevationAgreementV1({ supportRelations: [] }) },
    pieces: [actor, target], cardResources: { player1: [], player2: [{ cardInstanceId: 'source-card',
      officialCardRecordKey: spec.recordKey, sourceRecordHash: cardRecord.sourceRecordHash,
      officialPayloadHash: cardRecord.payloadHash, readiness: 'ready' }] },
    officialAbilitySourcePhasePolicy: phasePolicy, officialFaqReactionPolicy: structuredClone(OFFICIAL_FAQ_REACTION_POLICY_V13),
    officialReactionFamilySourceBundle: createOfficialReactionFamilySourceBundleV2({ catalogue, definitionIds: [spec.definitionId] }),
    officialCardBuildPaymentDataBundle: createOfficialReleaseCardCatalogueV2({ context, legacyCardDataBundle: base.officialCardBuildPaymentDataBundle }), log: [] };
  state.officialActionRouteCatalogue = createOfficialStandardActionRouteCatalogueV1({ dataset, state });
  declareWave3EngineeringCoherencyV1(state, { planIdPrefix: 'wave4-timing-' });
  return refreshOfficialReleaseRosterDerivedStateV2({ context, state });
}

export async function bindWave4TimingRoom({ inputs, state, definitionId, directory, runtimeOptions = {}, scenario = {}, humanConfirmed = false }) {
  const sourceRuntimeFor = () => createOfficialCharacteristicStatusComponentRuntimeV2({ context: inputs.context,
    spatialState: state, definitionIds: [], sourceDefinitionIds: [definitionId], includeMelee: true,
    includeArmourReactions: true, ...runtimeOptions });
  const runtimeFor = () => humanConfirmed ? createOfficialHumanConfirmedRuntimeV1(sourceRuntimeFor()) : sourceRuntimeFor();
  const runtime = runtimeFor();
  const { manifest, dataset, snapshot, identities, read } = inputs;
  const release = createOfficialReleaseManifestV2({ releaseId: 'wave4-native-timing-' + definitionId.split('/')[0].split(':')[1] + '-v1',
    dataset, snapshot, sourceRevision: await read(manifest.source.sourceRevisionRef),
    datasetRef: manifest.source.datasetRef, snapshotRef: manifest.source.snapshotRef, sourceRevisionRef: manifest.source.sourceRevisionRef,
    sourcePolicy: manifest.source.policy, components: {
      abilityIdentities: { ref: `${WAVE4_ABILITY_DIRECTORY}/identity-catalogue.json`, version: '2', integrity: { field: 'identityCatalogueHash', value: identities.identityCatalogueHash } },
      rulesRuntime: { ref: 'component-runtime/' + runtime.descriptor.runtimeHash, version: runtime.descriptor.runtimeVersion,
        integrity: { field: 'runtimeHash', value: runtime.descriptor.runtimeHash } } } });
  const context = { ...inputs.context, manifest: release };
  const authority = createWave3ComponentEngineeringAuthorityV1({ context, state, scenario: {
    kind: 'native_attack_timing', sourceFactory: 'loadWave3MatchBoardFactoryV1.prepare',
    fullMatchAdmission: false, terrain: 'declared board with one factory terrain piece outside combat area', ...scenario } });
  await fs.mkdir(directory, { recursive: true });
  async function frozen(name, value) {
    const file = path.join(directory, name), bytes = JSON.stringify(value);
    try { assert.equal(await fs.readFile(file, 'utf8'), bytes, 'TIMING_FROZEN_INPUT_CHANGED:' + name); }
    catch (error) { if (error.code !== 'ENOENT') throw error; await atomicWrite(file, bytes); }
  }
  await frozen('authority.json', authority);
  await frozen('runtime.json', runtime.descriptor);
  const open = () => openWave3EngineeringRoomV1({ directory, filename: 'room.sqlite',
    rulesRuntime: bindOfficialReleaseRulesRuntimeV2({ context, runtime: runtimeFor() }) });
  return { runtime, authority, context, open };
}
