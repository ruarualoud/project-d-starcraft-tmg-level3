import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createOfficialAbilityIdentityRegistryV2, compileOfficialAbilityIdentityCatalogueV2 }
  from '../packages/source-data/official-ability-identity-v2.mjs';
import { createOfficialAbilityEffectIrCatalogueV1, createOfficialAbilitySourcePhasePolicyV1 }
  from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import { WAVE4_CONSUMERS, WAVE4_NEW_ATOMS, WAVE4_NAMED_REVIEWS,
  WAVE4_EXISTING_NAMED_CONSUMERS, WAVE4_TIMING_REACTION_RECORDS }
  from '../content/source-releases/wave4-20261127/ability-review-v1.mjs';
import { WAVE4_SOURCE_DIRECTORY, compileWave4SourceCandidate } from './compile-wave4-source-candidate.mjs';
import { atomicWrite } from './lib/development-context.mjs';

export const WAVE4_ABILITY_DIRECTORY = `${WAVE4_SOURCE_DIRECTORY}/abilities`;
const normalize = value => String(value || '').replace(/\s+/gu, ' ').trim().toLowerCase();
const locator = row => JSON.stringify([row.recordKey, normalize(row.sourceName), normalize(row.sourcePhase)]);
const body = (value, field) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));
const seal = (value, field) => ({ ...value, [field]: hash(value) });
const atomId = key => `rule-atom:wave4/${key}@1`;

export async function compileWave4AbilityDiff(root) {
  const read = async ref => JSON.parse(await fs.readFile(path.join(root, ref), 'utf8'));
  const candidate = await compileWave4SourceCandidate({ root });
  const { dataset, snapshot, manifest } = candidate;
  const previous = await read(candidate.index.baseline.artifactAliases[candidate.baseline.source.datasetRef]);
  const previousRegistry = await read('content/source-releases/wave3-20261112-feature-registry-v2.json');
  const previousIdentities = compileOfficialAbilityIdentityCatalogueV2({ dataset: previous, registry: previousRegistry });
  const previousByLocator = new Map(previousRegistry.entries.map(row => [locator(row), row]));
  const bootstrap = createOfficialAbilityIdentityRegistryV2({ dataset });
  const entries = bootstrap.entries.map(row => {
    const old = previousByLocator.get(locator(row));
    if (!old) return row;
    return { ...old, behaviorHash: row.behaviorHash,
      semanticVersion: old.semanticVersion + Number(old.behaviorHash !== row.behaviorHash) };
  });
  const registry = seal({ ...body(previousRegistry, 'registryHash'), entries }, 'registryHash');
  const identities = compileOfficialAbilityIdentityCatalogueV2({ dataset, registry, historicalDatasets: [previous] });
  // The inventory covers raw unclassified/withdrawn definitions too. Never
  // invent an activation kind just to make the complete IR compile.
  const source = { definitions: identities.definitions.map(identity => {
    const record = dataset.recordsByKey[identity.recordKey];
    const feature = (record.payload.upgrades || record.payload.boosts)[identity.sourceIndex];
    const phase = feature.phase || /<((?:Any|Movement|Assault|Combat) Phase)>/u.exec(feature.description)?.[1];
    return { ...identity, phase: { 'Any Phase': 'any', 'Movement Phase': 'movement',
      'Assault Phase': 'assault', 'Combat Phase': 'combat' }[phase] || null,
      activationKind: /^RANGE:/iu.test(feature.description) ? 'weapon'
        : /<(Active|Passive|Reaction)>/iu.exec(feature.activation || feature.description)?.[1].toLowerCase() || 'unclassified' };
  }) };
  let fullCompilationBlock;
  try { createOfficialAbilityEffectIrCatalogueV1({ dataset, identityCatalogue: identities }); }
  catch (error) { fullCompilationBlock = error.message; }
  assert.equal(fullCompilationBlock, 'ABILITY_EFFECT_IR_ACTIVATION_UNCLASSIFIED:Wip');
  let strictPhaseBlock;
  try {
    createOfficialAbilityEffectIrCatalogueV1({ dataset, identityCatalogue: identities,
      sourceDefinitionIds: [identities.definitions.find(row => row.semanticId.includes('alarak/bane-blades-')).definitionId],
      sourcePhasePolicy: createOfficialAbilitySourcePhasePolicyV1({ dataset, includeInlineCardPhases: true }) });
  } catch (error) { strictPhaseBlock = error.message; }
  assert.equal(strictPhaseBlock, 'ABILITY_SOURCE_PHASE_VALUE_UNSUPPORTED:Cobmbat Phase');
  const previousFeatures = previousIdentities.definitions.map(identity => {
    const record = previous.recordsByKey[identity.recordKey];
    return { identity, feature: (record.payload.upgrades || record.payload.boosts)[identity.sourceIndex] };
  });
  const observation = await read('docs/development/wave4/command-center-observation-2026-11-27.json');
  const scope = new Set([...observation.unitIds.map(id => 'army_units:' + id),
    ...[...observation.newTacticCardIds, ...observation.newFactionCardIds].map(id => 'tactical_cards:' + id)]);
  const review = await read(`${WAVE4_SOURCE_DIRECTORY}/review/source-review.json`);
  const liveBytes = await fs.readFile(path.join(root, review.liveUnitCollection.ref));
  assert.equal(createHash('sha256').update(liveBytes).digest('hex'), review.liveUnitCollection.sha256);
  const live = JSON.parse(liveBytes);
  assert.equal(live.documents.length, 59); assert.ok(!live.nextPageToken);
  assert.ok(!live.documents.some(row => row.name.endsWith('/archon')));
  const wave3Inventory = await read('coordination/wave3/new-definition-inventory.json');
  const definitions = [];
  const counts = rows => Object.fromEntries([...new Set(rows.map(row => row.classification))].sort()
    .map(key => [key, rows.filter(row => row.classification === key).length]));
  for (const definition of source.definitions) {
    const record = dataset.recordsByKey[definition.recordKey];
    const feature = (record.payload.upgrades || record.payload.boosts)[definition.sourceIndex];
    const identity = identities.definitions.find(row => row.definitionId === definition.definitionId);
    const oldIdentity = previousIdentities.definitions.find(row => row.semanticId === identity.semanticId);
    const isChanged = Boolean(oldIdentity && oldIdentity.behaviorHash !== identity.behaviorHash);
    if (!scope.has(definition.recordKey) && !isChanged) continue;
    const exactMatches = previousFeatures.filter(({ feature: old }) => old.description === feature.description
      && String(old.activation || '') === String(feature.activation || '') && String(old.phase || '') === String(feature.phase || ''));
    const weapon = /^RANGE:/iu.test(feature.description);
    let semantic;
    if (isChanged) {
      const roster = feature.name === 'Zerg Creep';
      semantic = { classification: 'existing_atom', consumers: roster ? ['builder'] : ['reaction', 'reactionRuntime'],
        trigger: roster ? 'During Army Building, same owner selects exactly one Creep card' : 'explicit immediately-before/after window; same printed target and outcome',
        choice: roster ? 'army owner selects and pays the required card' : 'same controlling player chooses use/pass and the original legal target',
        settlement: roster ? 'existing exactly_one_tactical_group audit' : 'reuse reviewed reaction effect, with new exact source/version binding',
        cleanup: roster ? 'saved roster constraint; no battle cleanup' : 'same printed roll/action/round lifetime as Wave3', newAtoms: [] };
    } else if (weapon) {
      semantic = { classification: 'data_change', consumers: ['attack'], trigger: feature.phase,
        choice: 'controller selects equipped weapon, valid target, and existing defence/pool choices',
        settlement: 'source numeric/template profile and printed weapon keywords; no new weapon atom inferred from a new name',
        cleanup: 'normal attack batch, casualty and first-weapon consumption', newAtoms: [] };
    } else if (definition.recordKey === 'tactical_cards:stukov_s_forces' && feature.name === 'Infestation') {
      semantic = { classification: 'existing_atoms_new_combination', consumers: ['builder'], trigger: 'During Army Building',
        choice: 'choose exactly one of the three Virus cards named by official 26 November overview',
        settlement: 'existing exactly-one card-group constraint with printed cost and faction eligibility',
        cleanup: 'persist same source-bound roster selection', newAtoms: [] };
    } else if (exactMatches.length) {
      const consumers = WAVE4_EXISTING_NAMED_CONSUMERS[feature.name];
      assert.ok(consumers, 'WAVE4_EXACT_CONSUMER_REVIEW_REQUIRED:' + definition.definitionId);
      semantic = { classification: 'existing_atom', consumers, trigger: definition.phase + ' / ' + definition.activationKind,
        choice: 'same complete printed trigger, controlling-player choice and cost as exact Wave3 definition',
        settlement: 'reuse exact source semantics; new record identity still requires explicit compiler/admission binding',
        cleanup: 'same printed lifetime and original Wave3 consumer cleanup', newAtoms: [] };
    } else {
      semantic = WAVE4_NAMED_REVIEWS[feature.name];
      assert.ok(semantic, 'WAVE4_DEFINITION_REVIEW_REQUIRED:' + definition.definitionId);
    }
    const holds = [];
    if (definition.recordKey === 'army_units:archon') holds.push('ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION');
    if (['army_units:infested_goliath', 'army_units:infested_siege_tank'].includes(definition.recordKey)) {
      holds.push('NATIVE_ZERG_CP_RESOURCE_POLICY_UNRESOLVED');
    }
    if (feature.phase === 'Cobmbat Phase') holds.push('EXPLICIT_SOURCE_PHASE_UNSUPPORTED');
    const reusableEvidence = exactMatches.flatMap(({ identity: old }) => wave3Inventory.entries.filter(row =>
      row.semanticId + '@' + row.semanticVersion === old.definitionId).flatMap(row => row.evidenceRefs || []));
    definitions.push({ definitionId: definition.definitionId, semanticId: identity.semanticId,
      semanticVersion: identity.semanticVersion, recordKey: definition.recordKey,
      sourceName: record.payload.name, definitionName: feature.name,
      sourceRef: { path: `${WAVE4_SOURCE_DIRECTORY}/dataset.json`, recordKey: definition.recordKey,
        field: record.collectionId === 'army_units' ? 'upgrades' : 'boosts', index: definition.sourceIndex,
        sourceFeatureHash: definition.sourceFeatureHash, payloadHash: record.payloadHash },
      changeKind: isChanged ? 'changed_existing_definition' : 'new_source_definition',
      ...(oldIdentity ? { previousDefinitionId: oldIdentity.definitionId } : {}),
      classification: semantic.classification, sourcePhase: feature.phase || null,
      parsedPhase: definition.phase, activationText: feature.activation || null,
      consumerRefs: semantic.consumers.map(key => { assert.ok(WAVE4_CONSUMERS[key], key); return WAVE4_CONSUMERS[key]; }),
      consumerBindingStatus: holds.length ? 'source_admission_blocked'
        : semantic.newAtoms.length ? 'new_contracts_then_binding_required' : 'existing_contracts_new_binding_required',
      wave4RuntimeVerified: false,
      newAtomIds: semantic.newAtoms.map(key => { assert.ok(WAVE4_NEW_ATOMS[key], key); return atomId(key); }),
      trigger: semantic.trigger, choiceOwnerAndSelection: semantic.choice,
      settlement: semantic.settlement, cleanupAndRemoval: semantic.cleanup,
      sourceHolds: holds,
      exactWave3DefinitionMatches: exactMatches.map(({ identity: old }) => old.definitionId),
      historicalEvidenceRefs: [...new Set(reusableEvidence)],
      ...(definition.recordKey === 'tactical_cards:tal_darim' && feature.name !== 'Proxy Pylon'
        ? { semanticGroup: 'card:tal_darim/chain-of-ascension-any@1',
          supportingSourceFragment: feature.name !== 'Chain of Ascension' } : {}),
      uncovered: ['Wave4 full-room admission', 'actual new-source legal menu/preview/apply/successor/cold replay', 'Web player choice'],
      trainingTruth: false });
  }
  assert.equal(definitions.length, 156);
  assert.equal(definitions.filter(row => row.changeKind === 'new_source_definition').length, 142);
  assert.equal(definitions.filter(row => row.changeKind === 'changed_existing_definition').length, 14);
  const atoms = Object.entries(WAVE4_NEW_ATOMS).map(([key, [contract, seams]]) => {
    const requiredBy = definitions.filter(row => row.newAtomIds.includes(atomId(key)));
    assert.ok(requiredBy.length, 'UNUSED_NEW_ATOM:' + key);
    return { atomId: atomId(key), contract, status: 'required_not_implemented',
      integrationSeams: seams.map(name => WAVE4_CONSUMERS[name]),
      requiredByDefinitionIds: requiredBy.map(row => row.definitionId),
      withdrawnOnly: requiredBy.every(row => row.sourceHolds.includes('ARCHON_WITHDRAWN_FROM_LIVE_OFFICIAL_COLLECTION')) };
  });
  const requiredNewAtoms = atoms.filter(row => !row.withdrawnOnly);
  assert.equal(requiredNewAtoms.length, 18);
  assert.equal(atoms.filter(row => row.withdrawnOnly).length, 3);
  const records = [...new Set(definitions.map(row => row.recordKey))].sort().map(recordKey => {
    const rows = definitions.filter(row => row.recordKey === recordKey);
    return { recordKey, name: dataset.recordsByKey[recordKey].payload.name, definitionCount: rows.length,
      classificationCounts: counts(rows), newAtomIds: [...new Set(rows.flatMap(row => row.newAtomIds))].sort(),
      sourceHolds: [...new Set(rows.flatMap(row => row.sourceHolds))] };
  });
  const inventory = seal({ schema: 'starcraft_tmg_wave4_ability_diff_v1',
    releaseId: manifest.releaseId, manifestHash: manifest.manifestHash, datasetHash: dataset.datasetHash,
    sourceSnapshotHash: snapshot.snapshotHash, identityCatalogueHash: identities.identityCatalogueHash,
    sourceReviewRef: `${WAVE4_SOURCE_DIRECTORY}/review/source-review.json`,
    denominator: { records: records.length, newDefinitions: 142, changedDefinitions: 14, totalDefinitions: 156,
      classifications: counts(definitions), requiredNewAtomCount: requiredNewAtoms.length,
      withdrawnOnlyNewAtomCount: atoms.filter(row => row.withdrawnOnly).length, implementedNewAtomCount: 0,
      sourceHeldDefinitions: definitions.filter(row => row.sourceHolds.length).length },
    atomCountingPolicy: 'one absent executable contract counted once across definition IDs; numeric data, new bindings and existing-contract compositions do not create atoms',
    fullCompilationBlock, strictPhaseBlock, records, definitions, newAtoms: atoms,
    timingReactionDefinitionIds: definitions.filter(row => row.changeKind === 'changed_existing_definition'
      && WAVE4_TIMING_REACTION_RECORDS.includes(row.recordKey.split(':')[1]) && row.definitionName !== 'Zerg Creep')
      .map(row => row.definitionId),
    unchangedUnitReferences: observation.unchangedOldUnits === 45 ? previous.recordIndex.filter(row => row.collectionId === 'army_units')
      .map(row => ({ recordKey: row.recordKey, payloadHash: row.payloadHash,
        previousDatasetHash: previous.datasetHash, wave4PayloadUnchanged: dataset.recordsByKey[row.recordKey].payloadHash === row.payloadHash })) : [],
    modelCalls: 0, productionRoomEligible: false, trainingTruth: false }, 'inventoryHash');
  return { inventory, registry, identities, source, dataset, snapshot, manifest };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const result = await compileWave4AbilityDiff(root);
  for (const [name, value] of Object.entries({ 'feature-registry.json': result.registry,
    'identity-catalogue.json': result.identities, 'ability-diff.json': result.inventory })) {
    await atomicWrite(path.join(root, WAVE4_ABILITY_DIRECTORY, name), JSON.stringify(value, null, 2) + '\n');
  }
  console.log(JSON.stringify({ status: 'compiled', ...result.inventory.denominator,
    fullIdentityCount: result.identities.definitions.length, strictPhaseBlock: result.inventory.strictPhaseBlock }, null, 2));
}
