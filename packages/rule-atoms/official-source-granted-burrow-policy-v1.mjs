import {isDeepStrictEqual} from 'node:util';
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
export const OFFICIAL_SOURCE_GRANTED_BURROW_POLICY_V1=Object.freeze({
  schema:'starcraft_tmg_source_granted_burrow_lifecycle_v1',version:'1.0.0',
  definitionId:'card:hive/brutal-instinct-any@1',sourceBoundStatusRequired:true,
  movementUsesSharedBurrowRemoval:true,newGameAtoms:0,trainingTruth:false,
});
export function hasOfficialSourceGrantedBurrowPolicyV1(state){
  const policy=state.officialSourceGrantedBurrowPolicy;if(policy===undefined)return false;
  if(!isDeepStrictEqual(policy,OFFICIAL_SOURCE_GRANTED_BURROW_POLICY_V1))throw Error('SOURCE_GRANTED_BURROW_POLICY_INVALID');
  return true;
}
export function readOfficialSourceGrantedBurrowRouteV1(state,piece){
  if(!hasOfficialSourceGrantedBurrowPolicyV1(state))return null;
  const route=state.officialReactionFamilySourceBundle?.routes.find(r=>r.definitionId===OFFICIAL_SOURCE_GRANTED_BURROW_POLICY_V1.definitionId
    &&r.effectKind==='selected_unit_burrow_toggle'&&r.addedCardStatusOwner),
    origin=(piece.statuses||[]).find(s=>s.statusName==='burrowed'&&s.sourceDefinitionId===route?.definitionId);
  if(!origin)return null;
  const {statusEffectHash,...body}=origin;
  const {routeHash,...routeBody}=route||{},bundle=state.officialReactionFamilySourceBundle,
    {bundleHash,...bundleBody}=bundle||{};
  if(!route||routeHash!==hash(routeBody)||bundleHash!==hash(bundleBody)||origin.sourceFeatureHash!==route.sourceFeatureHash||origin.targetPieceId!==piece.id||hash(body)!==statusEffectHash)
    throw Error('SOURCE_GRANTED_BURROW_STATUS_BINDING_INVALID');
  return route;
}
