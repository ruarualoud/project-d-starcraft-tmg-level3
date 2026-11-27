import {hashStarcraftTmgContract as hash,createStarcraftTmgRefereeCrypto} from '../authoritative-engine/referee-crypto-v1.mjs';
export const POSTGAME_PAIRED_RNG_V1='postgame_common_action_counter_v1';
// Only offline branches opt into this scheme. Signing, grants and action seals
// are unchanged. Couple chance by action ordinal/counter/faces, never by the
// branch room ID or candidate text. Diverging action sequences need replication;
// a paired seed is not a probability estimate.
export function createPostgamePairedRandomnessV1(crypto,seed){
  if(typeof seed!=='string'||!seed.trim())throw Error('POSTGAME_RANDOM_SEED_REQUIRED');
  // Native HMAC also binds referee keyId; independent room signing keys must
  // not change the offline chance stream. Ordinary room seals stay untouched.
  const chance=createStarcraftTmgRefereeCrypto({keyId:'postgame-offline-chance-v1',
    hmacSecret:hash({seed,scheme:POSTGAME_PAIRED_RNG_V1})});
  const seal=(value,purpose)=>{
    if(purpose!=='chance_outcome'||value.rngSchemeId!==POSTGAME_PAIRED_RNG_V1)return crypto.seal(value,purpose);
    const normalized={scheme:POSTGAME_PAIRED_RNG_V1,seed,step:value.stateRevision,counter:value.counter,faces:value.faces};
    return {...crypto.seal(value,purpose),mac:chance.seal(normalized,purpose).mac};
  };
  return Object.freeze({...crypto,seal,verifySeal(value,proof,purpose){
    if(purpose==='chance_outcome'&&value.rngSchemeId===POSTGAME_PAIRED_RNG_V1)
      return hash(seal(value,purpose))===hash(proof);
    return crypto.verifySeal(value,proof,purpose);
  }});
}
