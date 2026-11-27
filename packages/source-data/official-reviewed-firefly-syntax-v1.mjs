import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const OFFICIAL_FIREFLY_DEFINITION_ID = 'unit:infested_missile_turret/firefly-missiles-assault-phase@1';
const review = {
  schema: 'starcraft_tmg_official_reviewed_weapon_syntax_v1',
  definitionId: OFFICIAL_FIREFLY_DEFINITION_ID,
  recordKey: 'army_units:infested_missile_turret',
  sourceRecordHash: '36d00672b6ebc8145dda4defedc6e78a68f5cd4e94193a9b0c6a7a672c70a0f8',
  payloadHash: '7103c8b123c54b4641a519901658c460e519fbbecbd913833ceb0332ebccfd63',
  sourceFeatureHash: 'bdf0e76e30ca8e211d24bead22f507a53c51dd6595b88f9fbbd6e2f0f2c19c23',
  sourceValue: 'Light. Armoured (D3)', parserValue: 'Light, Armoured (D3)',
  interpretation: 'reviewed_period_separates_two_existing_surge_target_tags',
  sourceUrl: 'https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/infested_missile_turret',
  reviewRef: 'content/source-releases/wave4-20261127/review/firefly-syntax.json',
  sourceTextRewritten: false, trainingTruth: false,
};
export const OFFICIAL_FIREFLY_SYNTAX_REVIEW_V1 = Object.freeze({ ...review, reviewHash: hash(review) });

export function readOfficialReviewedFireflySurgeSyntaxV1(record, upgrade, value) {
  if (record.recordKey !== review.recordKey || upgrade.name !== 'Firefly Missiles' || value.trim() !== review.sourceValue) return null;
  if (record.sourceRecordHash !== review.sourceRecordHash || record.payloadHash !== review.payloadHash
    || upgrade.phase !== 'Assault Phase' || String(upgrade.activation || '').trim()) {
    throw Error('FIREFLY_REVIEWED_SYNTAX_SOURCE_MISMATCH');
  }
  return OFFICIAL_FIREFLY_SYNTAX_REVIEW_V1;
}
