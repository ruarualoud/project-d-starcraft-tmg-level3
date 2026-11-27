import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const OFFICIAL_SPAWN_ROUND_ABILITY_LOCK_ATOM_ID = 'rule-atom:wave4/spawn-round-ability-lock@1';
export const OFFICIAL_HOSTILE_INCUBATION_DEFINITION_ID = 'card:stukov_s_forces/hostile-incubation-any@1';
const sourceText = 'Hostile Incubation <Active> <Movement Phase>: If there is no Friendly Infested Missile Turret on the battlefield, set a Friendly Infested Missile Turret Unit anywhere on the GROUND LEVEL of the battlefield more than 10" away from any Enemy model. This Round, the Missile Turret is not eligible to use its Special Abilities (excluding Structure).';
const without = (value, field) => Object.fromEntries(Object.entries(value).filter(([key]) => key !== field));

export function createOfficialSpawnRoundAbilityLockPolicyV1(definition) {
  if (definition?.definitionId !== OFFICIAL_HOSTILE_INCUBATION_DEFINITION_ID
    || definition.recordKey !== 'tactical_cards:stukov_s_forces' || definition.sourceKind !== 'card_feature'
    || definition.phase !== 'movement' || definition.activationKind !== 'active' || definition.sourceText !== sourceText) {
    throw Error('SPAWN_ROUND_LOCK_SOURCE_UNSUPPORTED');
  }
  const body = { schema: 'starcraft_tmg_official_spawn_round_ability_lock_policy_v1',
    ruleAtomId: OFFICIAL_SPAWN_ROUND_ABILITY_LOCK_ATOM_ID, definitionId: definition.definitionId,
    sourceRecordKey: definition.recordKey, sourceFeatureHash: definition.sourceFeatureHash,
    sourceText, createdUnitRecordKey: 'army_units:infested_missile_turret', exceptAbilityName: 'Structure',
    expiry: 'after_spawn_round', summonKeywordGranted: false, trainingTruth: false };
  return Object.freeze({ ...body, policyHash: hash(body) });
}

export function verifyOfficialSpawnRoundAbilityLockPolicyV1(policy) {
  const expected = createOfficialSpawnRoundAbilityLockPolicyV1({ definitionId: policy?.definitionId,
    recordKey: policy?.sourceRecordKey, sourceKind: 'card_feature', phase: 'movement', activationKind: 'active',
    sourceText: policy?.sourceText, sourceFeatureHash: policy?.sourceFeatureHash });
  if (!/^[a-f0-9]{64}$/u.test(policy.sourceFeatureHash)
    || hash(policy) !== hash(expected)) throw Error('SPAWN_ROUND_LOCK_POLICY_INVALID');
  return true;
}

export function bindOfficialSpawnRoundAbilityLockV1(piece, policy, round) {
  verifyOfficialSpawnRoundAbilityLockPolicyV1(policy);
  if (!Number.isSafeInteger(round) || round < 1 || piece.officialUnitRecordKey !== policy.createdUnitRecordKey
    || typeof piece.id !== 'string' || !['player1', 'player2'].includes(piece.sideKey)
    || ![piece.sourceRecordHash, piece.officialPayloadHash].every(value => /^[a-f0-9]{64}$/u.test(value))) throw Error('SPAWN_ROUND_LOCK_BINDING_INVALID');
  const body = { schema: 'starcraft_tmg_official_spawn_round_ability_lock_v1', policy,
    pieceId: piece.id, sideKey: piece.sideKey, recordKey: piece.officialUnitRecordKey, spawnRound: round,
    sourceRecordHash: piece.sourceRecordHash, payloadHash: piece.officialPayloadHash, trainingTruth: false };
  const lock = { ...body, lockHash: hash(body) };
  if (piece.officialSpawnRoundAbilityLock && hash(piece.officialSpawnRoundAbilityLock) !== hash(lock)) {
    throw Error('SPAWN_ROUND_LOCK_REBIND_FORBIDDEN');
  }
  piece.officialSpawnRoundAbilityLock = lock;
  piece.structureRules = { ...piece.structureRules, specialAbilitiesDisabledThroughRound: round };
  return lock;
}

export function allowsOfficialSpawnRoundSpecialAbilityV1(state, piece, abilityName) {
  const lock = piece?.officialSpawnRoundAbilityLock;
  if (!lock) return true;
  verifyOfficialSpawnRoundAbilityLockPolicyV1(lock.policy);
  if (lock.schema !== 'starcraft_tmg_official_spawn_round_ability_lock_v1' || lock.trainingTruth !== false
    || lock.lockHash !== hash(without(lock, 'lockHash')) || lock.pieceId !== piece.id || lock.sideKey !== piece.sideKey
    || lock.recordKey !== piece.officialUnitRecordKey || lock.recordKey !== lock.policy.createdUnitRecordKey
    || lock.sourceRecordHash !== piece.sourceRecordHash || lock.payloadHash !== piece.officialPayloadHash
    || !Number.isSafeInteger(lock.spawnRound) || lock.spawnRound < 1 || !Number.isSafeInteger(state.round)
    || state.round < lock.spawnRound) throw Error('SPAWN_ROUND_LOCK_STATE_INVALID');
  return abilityName === lock.policy.exceptAbilityName || state.round > lock.spawnRound;
}
