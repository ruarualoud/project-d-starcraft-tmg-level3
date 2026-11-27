import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';
import { verifyOfficialStukovArmyPolicyV1, allowsOfficialStukovArmyPurchaseV1 } from '../source-data/official-stukov-army-policy-v1.mjs';
const withoutHash = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'conversionHash'));

export function bindOfficialFactionUnitConversionV1(piece, policy, factionRecordKey) {
  if (!allowsOfficialStukovArmyPurchaseV1(policy, factionRecordKey, { candidateKind: 'unit',
    recordKey: piece.officialUnitRecordKey, sourceRecordHash: piece.sourceRecordHash, payloadHash: piece.officialPayloadHash })) return piece;
  const body = { schema: 'starcraft_tmg_official_faction_unit_conversion_v1',
    policy, factionRecordKey, sideKey: piece.sideKey, pieceId: piece.id, recordKey: piece.officialUnitRecordKey,
    sourceRecordHash: piece.sourceRecordHash, payloadHash: piece.officialPayloadHash, trainingTruth: false };
  return { ...piece, combatTags: [...new Set([...piece.combatTags, policy.addedCombatTag])].sort(),
    officialFactionUnitConversion: { ...body, conversionHash: hash(body) } };
}

export function readOfficialFactionUnitConversionV1(piece) {
  const binding = piece?.officialFactionUnitConversion;
  if (!binding) return null;
  const policy = verifyOfficialStukovArmyPolicyV1(binding.policy);
  if (binding.schema !== 'starcraft_tmg_official_faction_unit_conversion_v1'
    || binding.conversionHash !== hash(withoutHash(binding)) || binding.trainingTruth !== false
    || binding.sideKey !== piece.sideKey || binding.pieceId !== piece.id || binding.recordKey !== piece.officialUnitRecordKey
    || binding.sourceRecordHash !== piece.sourceRecordHash || binding.payloadHash !== piece.officialPayloadHash
    || !piece.combatTags.includes(policy.addedCombatTag)
    || !allowsOfficialStukovArmyPurchaseV1(policy, binding.factionRecordKey, { candidateKind: 'unit',
      recordKey: binding.recordKey, sourceRecordHash: binding.sourceRecordHash, payloadHash: binding.payloadHash })) {
    throw Error('FACTION_UNIT_CONVERSION_BINDING_INVALID');
  }
  return binding;
}

export function quoteOfficialFactionUnitResourceConversionV1(state, pieceId, sourceKind, cost) {
  if (sourceKind !== 'unit_feature' || cost.resourceType !== 'CP') return cost;
  const binding = readOfficialFactionUnitConversionV1(state.pieces?.find(piece => piece.id === pieceId));
  if (!binding) return cost;
  return { ...cost, printedResourceType: cost.resourceType, resourceType: binding.policy.effectiveResourceType,
    factionUnitConversion: { pieceId, conversionHash: binding.conversionHash,
      definitionId: binding.policy.definitionId, sourceFeatureHash: binding.policy.sourceFeatureHash } };
}
