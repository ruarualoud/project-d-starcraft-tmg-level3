import { hashStarcraftTmgContract } from '../authoritative-engine/referee-crypto-v1.mjs';

// Pinned FAQ v1.3. Only releases that opt in bind this byte hash.
export const WAVE3_FAQ_V13_BYTE_HASH='65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213';
export function usesWave3FaqClarifications(state) {
  const binding=state?.officialWave3FaqClarificationsHash;
  if(binding===undefined)return false;
  if(binding!==WAVE3_FAQ_V13_BYTE_HASH)throw Error('WAVE3_FAQ_V13_BINDING_INVALID');
  return true;
}

const weaponIdentity = name => String(name ?? '').normalize('NFC').trim().toLowerCase();

export function matchesGrantedWeapon(effect, weaponName, round) {
  return !effect.boundWeaponName || (effect.boundWeaponName === weaponIdentity(weaponName)
    && (effect.boundWeaponRound ?? effect.roundApplied) === Number(round));
}

export function bindGrantedWeapon(effect, weaponName, round) {
  const boundWeaponName = weaponIdentity(weaponName);
  if (!boundWeaponName) throw Error('FAQ_GRANTED_WEAPON_IDENTITY_REQUIRED:'+effect.sourceDefinitionId);
  const { effectHash, ...previous } = effect;
  const body = { ...previous, boundWeaponName,
    ...(previous.roundApplied === Number(round) ? {} : { boundWeaponRound: Number(round) }) };
  return { ...body, effectHash: hashStarcraftTmgContract(body) };
}
