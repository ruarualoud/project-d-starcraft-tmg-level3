import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { assertOfficialReleaseSourceV2 } from './official-release-context-v2.mjs';
import { officialAbilitySourceFeatureHashV1 } from './official-ability-effect-ir-v1.mjs';

export const OFFICIAL_STUKOV_ASHES_DEFINITION_ID = 'card:stukov_s_forces/ashes-of-the-ued-any@1';
export const OFFICIAL_STUKOV_ARMY_ATOM_IDS = Object.freeze([
  'rule-atom:wave4/foreign-faction-army-eligibility@1',
  'rule-atom:wave4/faction-unit-runtime-conversion@1',
]);
const factionRecordKey = 'tactical_cards:stukov_s_forces';
const ashesText = "Ashes of the UED <Passive> <Any Phase>: During Army Building, you may include Units with the Terran Faction Tag and both Ground and Mechanical Combat Tags in your army. Those Units gain the Infested Combat Tag. Treat any CP cost for those Units' Special Abilities as BM. These Units cannot gain the BURROWED Status.";
const infestationText = 'Infestation <Passive> <Any Phase>: During Army Building, select exactly one Virus Card and add it to your Army List, paying its listed cost (if any).';
const virusRecordKeys = ['tactical_cards:healing_pathogen', 'tactical_cards:hungering_infestation', 'tactical_cards:weighted_pustule'];
const reviewHash = '95d69e9f69a7b162c9b62525c2601b3567feddbbe60d161f5fbe55fff5802c1c';
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'policyHash'));
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  Object.values(value).forEach(freeze); Object.freeze(value);
} return value; };

export function createOfficialStukovArmyPolicyV1({ dataset, releaseContext }) {
  assertOfficialReleaseSourceV2(releaseContext, { dataset, snapshot: releaseContext.snapshot });
  const record = dataset.recordsByKey[factionRecordKey];
  const ashes = record?.payload.boosts.find(feature => feature.name === 'Ashes of the UED');
  const infestation = record?.payload.boosts.find(feature => feature.name === 'Infestation');
  if (record?.payload.faction !== 'Zerg' || record.payload.isFactionCard !== true
    || ashes?.description !== ashesText || infestation?.description !== infestationText
    || virusRecordKeys.some(key => dataset.recordsByKey[key]?.payload.isFactionCard !== false)) {
    throw Error('STUKOV_ARMY_POLICY_SOURCE_UNSUPPORTED');
  }
  const importedUnits = dataset.recordIndex.filter(row => row.recordType === 'unit'
    && row.authorityDisposition === 'official_current_product_candidate').map(row => dataset.recordsByKey[row.recordKey])
    .filter(row => row.payload.faction === 'Terran'
      && ['Air', 'Core', 'Elite', 'Hero', 'Support'].includes(row.payload.unitType)
      && ['ground', 'mechanical'].every(tag => row.payload.tags.toLowerCase().split(',').map(value => value.trim()).includes(tag)))
    .map(row => ({ recordKey: row.recordKey, sourceRecordHash: row.sourceRecordHash, payloadHash: row.payloadHash,
      factionTag: row.payload.faction, combatTags: row.payload.tags.toLowerCase().split(',').map(value => value.trim()).sort() }))
    .sort((a, b) => a.recordKey.localeCompare(b.recordKey));
  const body = { schema: 'starcraft_tmg_official_stukov_army_policy_v1',
    sourceBinding: { releaseId: releaseContext.manifest.releaseId, sourceSnapshotHash: dataset.sourceSnapshotHash,
      normalizedDatasetHash: dataset.datasetHash },
    factionRecordKey, sourceRecordHash: record.sourceRecordHash, payloadHash: record.payloadHash,
    definitionId: OFFICIAL_STUKOV_ASHES_DEFINITION_ID, sourceText: ashesText,
    sourceDefinitionHash: hash(ashes), sourceFeatureHash: officialAbilitySourceFeatureHashV1(record, record.payload.boosts.indexOf(ashes), ashes),
    atomIds: [...OFFICIAL_STUKOV_ARMY_ATOM_IDS], importedUnits,
    virusGroup: { groupName: 'Virus', recordKeys: virusRecordKeys,
      sourceDefinitionId: 'card:stukov_s_forces/infestation-any@1', sourceText: infestationText,
      sourceDefinitionHash: hash(infestation), sourceReviewHash: reviewHash,
      sourceUrl: 'https://starcraft-tmg.com/news/rules/double-the-action-with-the-new-starcraft-tabletop-miniatures-game-2-player-starter-set' },
    addedCombatTag: 'infested', printedResourceType: 'CP', effectiveResourceType: 'BM', cannotGainBurrowed: true,
    productionRoomEligible: false, trainingTruth: false };
  const policy = freeze({ ...body, policyHash: hash(body) });
  verifyOfficialStukovArmyPolicyV1(policy);
  return policy;
}

export function verifyOfficialStukovArmyPolicyV1(policy) {
  const digest = value => typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
  if (policy?.schema !== 'starcraft_tmg_official_stukov_army_policy_v1'
    || policy.policyHash !== hash(withoutHash(policy)) || policy.factionRecordKey !== factionRecordKey
    || policy.definitionId !== OFFICIAL_STUKOV_ASHES_DEFINITION_ID || policy.sourceText !== ashesText
    || policy.addedCombatTag !== 'infested' || policy.printedResourceType !== 'CP' || policy.effectiveResourceType !== 'BM'
    || policy.cannotGainBurrowed !== true || policy.productionRoomEligible !== false || policy.trainingTruth !== false
    || typeof policy.sourceBinding?.releaseId !== 'string'
    || ![policy.sourceBinding.sourceSnapshotHash, policy.sourceBinding.normalizedDatasetHash,
      policy.sourceRecordHash, policy.payloadHash, policy.sourceDefinitionHash, policy.sourceFeatureHash].every(digest)
    || hash(policy.atomIds) !== hash(OFFICIAL_STUKOV_ARMY_ATOM_IDS)
    || policy.virusGroup?.groupName !== 'Virus' || policy.virusGroup.sourceDefinitionId !== 'card:stukov_s_forces/infestation-any@1'
    || policy.virusGroup?.sourceText !== infestationText || policy.virusGroup.sourceReviewHash !== reviewHash
    || hash(policy.virusGroup.recordKeys) !== hash(virusRecordKeys)
    || !Array.isArray(policy.importedUnits) || policy.importedUnits.length === 0
    || new Set(policy.importedUnits.map(row => row.recordKey)).size !== policy.importedUnits.length
    || policy.importedUnits.some(row => row.factionTag !== 'Terran'
      || typeof row.recordKey !== 'string' || !row.recordKey.startsWith('army_units:')
      || !digest(row.sourceRecordHash) || !digest(row.payloadHash) || !Array.isArray(row.combatTags)
      || !['ground', 'mechanical'].every(tag => row.combatTags.includes(tag)))) throw Error('STUKOV_ARMY_POLICY_INVALID');
  return policy;
}

export function allowsOfficialStukovArmyPurchaseV1(policy, factionKey, candidate) {
  if (!policy) return false;
  verifyOfficialStukovArmyPolicyV1(policy);
  return factionKey === policy.factionRecordKey && candidate.candidateKind === 'unit'
    && policy.importedUnits.some(row => row.recordKey === candidate.recordKey
      && row.sourceRecordHash === candidate.sourceRecordHash && row.payloadHash === candidate.payloadHash);
}
