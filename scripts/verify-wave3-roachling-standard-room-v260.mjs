import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {resolveWave3StandardContext,bindWave3StandardActionRoom,assertWave3StandardRoomColdReplayV1} from './support/wave3-standard-action-room-v1.mjs';
import {declareWave3EngineeringCoherencyV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {prepareOfficialStandardReleaseOpeningV2,OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {initializeOfficialMatchRoundSupplyV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {projectOfficialUnitRestrictionsV1,OFFICIAL_ROACHLING_BURROW_RESTRICTION_DEFINITION_ID} from '../packages/rule-atoms/official-unit-restrictions-v1.mjs';

const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const roomId='roachling-standard-v260', dir=base+'/'+roomId;
const version='2.60.0', parentId='player2-corpser';
const ability='unit:corpser__roach_/roachling-infestation-movement-phase@1';
const childRecord='army_units:roachling';
const unit=(s,id)=>s.pieces.find(p=>p.id===id);
let room, stage='standard_opening';

function field(state,key,positions) {
  const p=unit(state,key);
  assert.equal(p.models.length,positions.length);
  for(const [i,m] of p.models.entries()) Object.assign(m,positions[i],{isOnField:true});
  Object.assign(p,positions[0],{isOnField:true,isInReserves:false,leadingModelId:p.models[0].id,deploymentStatus:'deployed'});
  state.reserveManifestBySide[p.sideKey].find(row=>row.pieceId===key).deploymentStatus='deployed';
}

try {
  const original=await read(base+'/wave3-roachling-summoned-checkpoint.json');
  const previous=original.log.at(-1).action.unitLifecyclePlan.canonicalParameters;
  assert.equal(previous.activeUnitId,parentId);
  const source=await read(base+'/inherited-zerg-standard-2.51.0/kerrigan.json');
  const context=await resolveWave3StandardContext(await read(source.manifestRef),'area_ability_inputs');
  const {state:opening}=prepareOfficialStandardReleaseOpeningV2({releaseMatchVersion:version,releaseContext:context,
    dataset:context.dataset,snapshot:context.snapshot,recipes:source.recipes,missionRecordKey:source.mission,
    deploymentRecordKey:source.deployment,armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY});
  const scenario={twoHumanSeats:true,conditionalPhase:'round_1_movement',sourceOfPositions:'wave3-roachling-summoned-checkpoint.json',
    subject:ability,previousActionsAndOutcomesCopied:false};
  const bound=await bindWave3StandardActionRoom({manifestRef:source.manifestRef,initial:opening,dir,candidateVersion:version,scenario});
  const state=structuredClone(opening);
  Object.assign(state,{stage:'activation_phases',phase:'movement',activeSideKey:'player2',firstPlayerSideKey:'player2'});
  state.phaseFirstActorByRound['1:movement']={phase:'movement',round:1,chosenFirstActorSideKey:'player2',markerHolderSideKey:'player2'};
  field(state,parentId,unit(original,parentId).models.map(m=>({xInches:m.xInches,yInches:m.yInches})));
  field(state,'nova_stealth_mode',[{xInches:34,yInches:4}]);
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:roomId});
  initializeOfficialMatchRoundSupplyV1(state,true);
  const authority=bound.authorityFor(state,scenario);
  room=bound.open();
  const seats=await room.create(roomId,authority);
  let head=await room.store.loadRoom(roomId);
  const rosterCard=state.cardResources.player2.find(c=>c.officialCardRecordKey==='tactical_cards:spawning_pool__six_pool_');
  assert(rosterCard);
  async function menu(side) {
    const result=await room.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(result.ok,result.reason);
    return result.legalSpace;
  }
  stage='summon';
  if(head.stateRevision===0) {
    await room.commit({roomId,credential:seats.player2,operationKey:'corpser-summon',
      choice:{actionType:'resolve_unit_lifecycle_ability',pieceId:parentId,definitionId:ability},
      parameters:d=>{
        const models=d.constraints.summonPlacement.modelIds;
        assert.equal(models.length,previous.placementPlan.placements.length);
        const pay=d.parameterSchema.paymentCardInstanceIds.enum.find(ids=>ids.length===1 && ids[0]===rosterCard.cardInstanceId);
        assert(pay,'the current product menu must permit the named two-Biomass card');
        return {activeUnitId:d.pieceId,paymentCardInstanceIds:pay,parentContactModelId:d.parameterSchema.parentContactModelId.enum.find(id=>id===unit(state,parentId).models[0].id),
          placementPlan:{leadingModelId:models[0],placements:models.map((modelId,i)=>{
            const {xMilliInches,yMilliInches,rotationDegrees}=previous.placementPlan.placements[i];
            return {modelId,xMilliInches,yMilliInches,rotationDegrees};
          })}};
      }});
    head=await room.store.loadRoom(roomId);
  }
  stage='actual_child_and_successor';
  const after=head.envelope.state;
  const child=after.pieces.find(p=>p.officialUnitRecordKey===childRecord);
  assert(child && child.isSummoned && child.isOnField);
  assert.equal(child.currentModels,3);
  assert.equal(child.currentSupply,0);
  assert.equal(child.summonParentPieceId,parentId);
  assert.equal(child.summonSourceDefinitionId,ability);
  assert.deepEqual(child.summonActivationLock,{round:1,phase:'movement'});
  assert.equal(after.selectedRosterActivationWindow.pieceId,parentId);
  assert.equal(after.cardResources.player2.find(c=>c.cardInstanceId===rosterCard.cardInstanceId).readiness,'exhausted');
  const restrictions=projectOfficialUnitRestrictionsV1(after,child.id);
  assert(restrictions.cannotGainBurrowed && restrictions.sourceDefinitionIds.includes(OFFICIAL_ROACHLING_BURROW_RESTRICTION_DEFINITION_ID));
  const space=await menu('player2');
  assert(!space.parameterDomains.some(d=>d.definitionId===ability));
  assert(!space.parameterDomains.some(d=>d.pieceId===child.id && d.actionType==='move'));
  const parentNext=space.parameterDomains.filter(d=>d.pieceId===parentId).map(d=>d.actionType);
  assert(parentNext.includes('move'));
  const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,head.envelope);
  await save(dir+'/summon.json',{version,roomId,scenario,definitionId:ability,sourcePiece:parentId,child:child.id,modelIds:child.models.map(m=>m.id),
    childSupply:child.currentSupply,restriction:restrictions.sourceDefinitionIds,phaseLock:child.summonActivationLock,
    paidCard:rosterCard.cardInstanceId,cardStatus:'exhausted',parentNext,actions,stateHash:head.envelope.stateHash,coldExact:true,modelCalls:0});
} catch(error) {
  await save(dir+'/stop-'+Date.now()+'.json',{stage,error:error.message,code:error.code,frames:error.stack?.split('\n').slice(0,5)});
  throw error;
} finally {room?.close();}
