import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {OFFICIAL_ADMIRAL_ACTIVATION_EXCHANGE_ID,OFFICIAL_ADMIRAL_ACTIVATION_EXCHANGE_ATOM} from '../source-data/official-stukov-infestation-source-v1.mjs';
import {hasOfficialRepeatedActivationIdentityPolicyV1,renewOfficialPhaseActivationIdentityV1} from './official-repeated-activation-identity-v1.mjs';
const statusName=s=>String(s?.statusName||s?.name||s||'').trim().toLowerCase();
export function resolveOfficialInfestationActivationExchangeV1({state,route,actor,enemy,friendly=null,eligibleFriendlyUnitIds}){
 if(route.definitionId!==OFFICIAL_ADMIRAL_ACTIVATION_EXCHANGE_ID||route.effectKind!=='infestation_activation_exchange'
  ||state.phase!=='movement'||actor.officialUnitRecordKey!=='army_units:stukov'||enemy.sideKey===actor.sideKey
  ||!enemy.statuses?.some(s=>statusName(s)==='infestation')
  ||!Array.isArray(eligibleFriendlyUnitIds)||friendly&&!eligibleFriendlyUnitIds.includes(friendly.id))throw Error('INFESTATION_ACTIVATION_EXCHANGE_INVALID');
 const enemyWasActivated=enemy.activatedPhases?.movement===true,friendlyWasActivated=friendly?.activatedPhases?.movement===true;
 enemy.activatedPhases={...(enemy.activatedPhases||{}),movement:true};
 const removedStatuses=enemy.statuses.filter(s=>statusName(s)==='infestation');
 enemy.statuses=enemy.statuses.filter(s=>statusName(s)!=='infestation');
 const removedHashes=removedStatuses.map(s=>s.statusEffectHash).filter(Boolean);
 if(state.board)state.board.effectMarkers=(state.board.effectMarkers||[]).filter(marker=>!removedHashes.includes(marker.statusEffectHash));
 if(friendly)friendly.activatedPhases={...(friendly.activatedPhases||{}),movement:false};
 const body={schema:'starcraft_tmg_infestation_activation_exchange_resolution_v1',ruleAtomId:OFFICIAL_ADMIRAL_ACTIVATION_EXCHANGE_ATOM,
  sourceDefinitionId:route.definitionId,sourceFeatureHash:route.sourceFeatureHash,sourcePieceId:actor.id,enemyUnitId:enemy.id,
  friendlyUnitId:friendly?.id||null,round:Number(state.round),phase:state.phase,enemyWasActivated,enemyActivatedAfter:true,
  friendlyWasActivated:friendly?friendlyWasActivated:null,friendlyActivatedAfter:friendly?false:null,
  removedInfestationStatusHashes:removedStatuses.map(s=>s.statusEffectHash||hash(s)),trainingTruth:false};
 if(friendly&&friendlyWasActivated&&hasOfficialRepeatedActivationIdentityPolicyV1(state)){
  const activationRenewal=renewOfficialPhaseActivationIdentityV1(state,friendly,hash(body));
  const renewed={...body,activationRenewal};return{...renewed,resolutionHash:hash(renewed)};
 }
 return{...body,resolutionHash:hash(body)};
}
