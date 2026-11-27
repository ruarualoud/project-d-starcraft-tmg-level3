import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
export const OFFICIAL_REPEATED_ACTIVATION_IDENTITY_POLICY_V1=Object.freeze({
 schema:'starcraft_tmg_repeated_activation_identity_policy_v1',version:'1.0.0',
 sourceDefinitionId:'unit:stukov/admiral-of-the-infested-movement-phase@1',
 ruleAtomId:'rule-atom:wave4/infestation-activation-exchange@1',trainingTruth:false});
export function hasOfficialRepeatedActivationIdentityPolicyV1(state){
 const policy=state?.officialRepeatedActivationIdentityPolicy;if(policy===undefined)return false;
 if(!isDeepStrictEqual(policy,OFFICIAL_REPEATED_ACTIVATION_IDENTITY_POLICY_V1))throw Error('REPEATED_ACTIVATION_POLICY_INVALID');
 return true;
}
export function renewOfficialPhaseActivationIdentityV1(state,piece,sourceExchangeHash){
 if(!hasOfficialRepeatedActivationIdentityPolicyV1(state)||!/^[a-f0-9]{64}$/.test(sourceExchangeHash))throw Error('ACTIVATION_RENEWAL_SOURCE_REQUIRED');
 const body={round:Number(state.round),phase:state.phase,sideKey:piece.sideKey,pieceId:piece.id,
  sourceDefinitionId:OFFICIAL_REPEATED_ACTIVATION_IDENTITY_POLICY_V1.sourceDefinitionId,sourceExchangeHash,
  activationId:`${state.round}:${state.phase}:${piece.sideKey}:${piece.id}:renewed:${sourceExchangeHash.slice(0,24)}`,trainingTruth:false};
 const renewal={...body,renewalHash:hash(body)};piece.officialActivationInstanceRenewal=renewal;
 state.officialActivationRenewalHistory=[...(state.officialActivationRenewalHistory||[]),renewal];return renewal;
}
export function readOfficialRenewedActivationIdV1(state,piece){
 if(!hasOfficialRepeatedActivationIdentityPolicyV1(state))return null;
 const renewal=piece?.officialActivationInstanceRenewal;if(!renewal)return null;
 const {renewalHash,...body}=renewal;
 if(renewalHash!==hash(body)||renewal.pieceId!==piece.id||renewal.sideKey!==piece.sideKey
  ||renewal.sourceDefinitionId!==OFFICIAL_REPEATED_ACTIVATION_IDENTITY_POLICY_V1.sourceDefinitionId)throw Error('ACTIVATION_RENEWAL_INVALID');
 return renewal.round===Number(state.round)&&renewal.phase===state.phase?renewal.activationId:null;
}
