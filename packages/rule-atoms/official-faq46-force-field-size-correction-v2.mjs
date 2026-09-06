import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';

const SOURCE_LOCK = '2881adb2a4e0475f07bb17aebf02e64f35c9073f274cec2cf0a8f770f8647226';
const SOURCE_TEXT = 'No. Force Fields explicitly forbid Units of Size 2 or less from moving across them. Because Raptors are Size 1, they cannot ignore this specific terrain restriction.';
const LEGACY_KERNEL_HASH = '5227429f3393544934f075826e7b22b9a708aca7c32d07920b32fef105899218';
const hash = hashStarcraftTmgContract;
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) { Object.values(value).forEach(freeze); Object.freeze(value); }
  return value;
};
const fail = code => { throw Object.assign(new Error(code), { code }); };

// Explicit corrected version; no import replacement or silent legacy behavior
// change. A release/Room adapter must deliberately adopt this version's receipt.
export function createOfficialFaq46SizeCorrectionV2({ sourceLockHash, source }) {
  if (sourceLockHash !== SOURCE_LOCK || source?.ref !== 'faq-v1:46'
    || source.passages?.length !== 1 || source.passages[0].spanId !== 'p1'
    || source.passages[0].text !== SOURCE_TEXT) fail('FAQ46_V2_FROZEN_SOURCE_DRIFT');
  const body = { schema: 'starcraft_tmg_faq46_size_correction_manifest_v2', gameId: 'starcraft-tmg',
    entryId: 'faq-v1:46', kernelVersion: 2, sourceLockHash, sourceHash: hash(source), exactSourceText: SOURCE_TEXT,
    legacyKernelHash: LEGACY_KERNEL_HASH, correctedCondition: 'raptor_crosses_force_field_and_model_size_at_most_two_is_blocked',
    scope: 'the_specific_faq46_size_restriction_not_complete_movement_permission',
    legacyBehaviorRetained: true, defaultRouterChanged: false, currentReleaseAdopted: false, runtimeAccepted: false, trainingTruth: false };
  const manifest = freeze({ ...body, hash: hash(body) });
  return Object.freeze({ manifest,
    evaluate(input) {
      if (!input || typeof input !== 'object' || Array.isArray(input)
        || Object.keys(input).length !== 3 || Object.keys(input).some(k => !['unitIsRaptor', 'modelSize', 'crossesForceField'].includes(k))
        || input.unitIsRaptor !== true || !Number.isSafeInteger(input.modelSize) || input.modelSize < 1
        || typeof input.crossesForceField !== 'boolean') fail('FAQ46_V2_INPUT_OUTSIDE_DECLARED_SCOPE');
      const blockedBySizeRestriction = input.crossesForceField && input.modelSize <= 2;
      const value = { schema: 'starcraft_tmg_faq46_size_restriction_decision_v2', entryId: 'faq-v1:46',
        kernelManifestHash: manifest.hash, inputHash: hash(input), blockedBySizeRestriction,
        allowedWithinThisSizeRestriction: !blockedBySizeRestriction, forceFieldBlocksSizeAtMost: 2,
        reasonCodes: blockedBySizeRestriction ? ['RAPTOR_FORCE_FIELD_SIZE_RESTRICTION'] : [],
        completeMoveLegalityProven: false, forceFieldDestructionResolved: false, roomMutationPerformed: false, trainingTruth: false };
      return freeze({ ...value, hash: hash(value) });
    },
  });
}
