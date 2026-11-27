import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export function verifyOfficialEngineeringImageBaseEstimateV1(estimate) {
  const { estimateHash, ...body } = estimate || {};
  if (estimate?.schema !== 'starcraft_tmg_engineering_image_base_estimate_v1'
    || estimateHash !== hash(body) || estimate.recordKey !== 'army_units:infested_missile_turret'
    || estimate.shape !== 'round' || !Number.isSafeInteger(estimate.diameterMillimetres) || estimate.diameterMillimetres <= 0
    || !Number.isSafeInteger(estimate.uncertaintyMillimetres?.minimum) || estimate.uncertaintyMillimetres.minimum <= 0
    || !Number.isSafeInteger(estimate.uncertaintyMillimetres?.maximum)
    || estimate.uncertaintyMillimetres?.minimum > estimate.diameterMillimetres
    || estimate.uncertaintyMillimetres?.maximum < estimate.diameterMillimetres
    || estimate.officialPhysicalAuthority !== false || estimate.usageScope !== 'conditional_engineering'
    || estimate.productionRoomEligible !== false || estimate.trainingTruth !== false
    || !estimate.sourceImage?.ref || typeof estimate.sourceImage.url !== 'string'
    || !estimate.sourceImage.url.startsWith('https://starcraft-tmg.com/')
    || ![estimate.sourceRecordHash, estimate.payloadHash, estimate.sourceImage.byteHash].every(value => /^[a-f0-9]{64}$/u.test(value))) {
    throw Error('ENGINEERING_IMAGE_BASE_ESTIMATE_INVALID');
  }
  return true;
}
