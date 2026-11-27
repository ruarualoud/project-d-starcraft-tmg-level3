import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { compileWave4StukovArmy } from './compile-wave4-stukov-army.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { verifyOfficialStukovArmyPolicyV1 } from '../packages/source-data/official-stukov-army-policy-v1.mjs';
import { bindOfficialFactionUnitConversionV1, quoteOfficialFactionUnitResourceConversionV1, readOfficialFactionUnitConversionV1 } from '../packages/rule-atoms/official-faction-unit-conversion-v1.mjs';
import { projectOfficialUnitRestrictionsV1 } from '../packages/rule-atoms/official-unit-restrictions-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputs = await compileWave4StukovArmy(root);
const { context, dataset } = inputs;
const policy = context.resources.armyBuilder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.foreignArmyPolicy;
const nativeProof = await inputs.read('docs/development/wave4/evidence/stukov-army.public.json');
assert.equal(nativeProof.status, 'passed');
assert.equal(nativeProof.candidateManifestHash, context.manifest.manifestHash);
assert.ok(nativeProof.nativeResults.every(row => row.coldReplay && row.idempotencyVerified));
assert.deepEqual(nativeProof.negatives.map(row => row.rulesErrorCode), [
  'FACTION_TAG_MISMATCH', 'FACTION_TAG_MISMATCH', 'FACTION_TAG_MISMATCH', 'FACTION_TAG_MISMATCH',
  'ARMY_EXACTLY_ONE_TACTICAL_GROUP_REQUIRED', 'ARMY_EXACTLY_ONE_TACTICAL_GROUP_REQUIRED',
  'ARMY_SLOT_CAPACITY_EXCEEDED', 'UNIQUE_UNIT_COPY_LIMIT_EXCEEDED',
]);
assert.ok(nativeProof.nativeResults.every(row => row.declaredNewAtoms.length === (row.kind.startsWith('imported') ? 2 : 0)));
for (const kind of ['imported-goliath', 'imported-tank']) {
  const authority = await inputs.read(nativeProof.runRef + '/' + kind + '/authority.json');
  const actor = authority.state.pieces.find(piece => piece.id === 'actor');
  assert.equal(readOfficialFactionUnitConversionV1(actor).policy.policyHash, policy.policyHash);
  assert.equal(authority.state.armyCompositionUpgradeAuditsBySide.player1.armyResourceBudgetResult.mineralSpent,
    kind === 'imported-tank' ? 240 : 180);
  authority.state.round = 5;
  actor.structureRules = { specialAbilitiesDisabledThroughRound: 5 };
  assert.equal(projectOfficialUnitRestrictionsV1(authority.state, actor.id).cannotGainBurrowed, true);
}
assert.equal(policy.sourceFeatureHash, inputs.identities.definitions.find(row => row.definitionId === policy.definitionId).sourceFeatureHash);
const port = createOfficialArmyBuilderQueryPortV1({ releaseContext: context, unitCompositionUpgradeDataBundle: context.resources.armyBuilder });
const heldRecords = [...new Set(inputs.inventory.definitions.filter(row => row.sourceHolds.length).map(row => row.recordKey))].sort();
assert.equal(heldRecords.length, 4);
const heldRejections = heldRecords.map(recordKey => {
  const verdict = port.evaluateRosterCandidate({ sideKey: 'player1', scaleId: 'Standard', mineralBudget: 2000,
    factionRecordKey: policy.factionRecordKey, tacticalCardRecordKeys: [policy.virusGroup.recordKeys[0]],
    units: [{ unitInstanceId: 'held', recordKey, compositionKind: 'small', upgrades: [] }] });
  assert.notEqual(verdict.status, 'legal');
  return { recordKey, status: verdict.status, rulesErrorCode: verdict.rulesErrorCode, portErrorCode: verdict.portErrorCode };
});
for (const recordKey of ['army_units:infested_goliath', 'army_units:infested_siege_tank']) {
  const record = dataset.recordsByKey[recordKey];
  const piece = { id: 'native-zerg', sideKey: 'player1', officialUnitRecordKey: recordKey,
    sourceRecordHash: record.sourceRecordHash, officialPayloadHash: record.payloadHash,
    combatTags: record.payload.tags.toLowerCase().split(',').map(tag => tag.trim()) };
  assert.equal(bindOfficialFactionUnitConversionV1(piece, policy, policy.factionRecordKey), piece);
  const cost = { resourceType: 'CP', printedResourceCost: 1, effectiveResourceCost: 1 };
  assert.equal(quoteOfficialFactionUnitResourceConversionV1({ pieces: [piece] }, piece.id, 'unit_feature', cost), cost);
}
for (const mutate of [p => { p.effectiveResourceType = 'CP'; }, p => { p.sourceText += ' '; },
  p => { p.importedUnits[0].factionTag = 'Zerg'; }, p => { p.sourceBinding.normalizedDatasetHash = ''; }]) {
  const changed = structuredClone(policy);
  mutate(changed);
  const { policyHash, ...body } = changed;
  assert.throws(() => verifyOfficialStukovArmyPolicyV1({ ...body, policyHash: hash(body) }), /STUKOV_ARMY_POLICY_INVALID/);
}
const consumerRefs = [
  ['packages/source-data/official-stukov-army-policy-v1.mjs', 'createOfficialStukovArmyPolicyV1'],
  ['packages/source-data/official-faction-army-eligibility-data-bundle-v1.mjs', 'compileOfficialFactionArmyProfilesV2'],
  ['packages/rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs', 'resolveOfficialFactionTagEligibilityV1'],
  ['packages/roster-strategist/army-builder-query-port-v1.mjs', 'createOfficialArmyBuilderQueryPortV1'],
  ['packages/product-composition/official-standard-room-factory-v1.mjs', 'buildOfficialRoomArmyAuditV1'],
  ['packages/product-composition/official-standard-room-factory-v1.mjs', 'createOfficialRoomPieceFromRosterUnitV1'],
  ['packages/rule-atoms/official-faction-unit-conversion-v1.mjs', 'bindOfficialFactionUnitConversionV1'],
  ['packages/product-composition/official-unit-ability-payment-modifiers-v1.mjs', 'quoteOfficialUnitAbilityModifiersV1'],
  ['packages/product-composition/official-unit-ability-payment-modifiers-v1.mjs', 'consumeOfficialUnitAbilityModifiersV1'],
  ['packages/product-composition/official-characteristic-status-family-adapter-v1.mjs', 'createOfficialCharacteristicStatusFamilyAdapterV1'],
  ['packages/product-composition/official-reaction-family-adapter-v1.mjs', 'createOfficialReactionFamilyAdapterV1'],
  ['packages/product-composition/official-selected-roster-ability-runtime-v1.mjs', 'createOfficialSelectedRosterAbilityRuntimeV1'],
  ['packages/rule-atoms/official-unit-restrictions-v1.mjs', 'projectOfficialUnitRestrictionsV1'],
  ['packages/product-composition/official-characteristic-status-component-runtime-v2.mjs', 'createOfficialCharacteristicStatusComponentRuntimeV2'],
  ['packages/source-data/official-army-builder-catalogue-v2.mjs', 'createOfficialArmyBuilderCatalogueV2'],
  ['packages/rule-atoms/official-faction-army-eligibility-rules-kernel-v1.mjs', 'resolveOfficialArmySlotAuditV1'],
].map(([file, exportName]) => ({ file, exportName }));
for (const { file, exportName } of consumerRefs) {
  assert.match(await fs.readFile(path.join(root, file), 'utf8'), new RegExp('export function ' + exportName + '\\('));
}
const result = { schema: 'starcraft_tmg_wave4_stukov_boundaries_v1', status: 'passed',
  policyHash: policy.policyHash, heldDefinitions: 39, heldRejections,
  nativeZergCpNotConverted: true, rehashedInvalidPoliciesRejected: 4, consumerRefs,
  nativeEvidenceRef: 'docs/development/wave4/evidence/stukov-army.public.json', nativePolicyBindingMatches: true,
  fullMatchAdmission: false, modelCalls: 0, trainingTruth: false };
await atomicWrite(path.join(root, 'docs/development/wave4/evidence/stukov-boundaries.public.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ status: 'passed', heldRejections: heldRejections.length, consumerExports: consumerRefs.length,
  nativeZergCpNotConverted: true }));
