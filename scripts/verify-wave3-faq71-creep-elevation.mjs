import assert from 'node:assert/strict';
import path from 'node:path';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1, openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, createOfficialStandard2000BalancedTerrainPlanV1, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { initializeOfficialMatchRoundSupplyV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { deriveOfficialTokenSurfacePlacementV2 } from '../packages/rule-atoms/official-engagement-graph-v2.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const original = base + '/creep-footprints-v259';
const sourceId = 'creep-footprints-v259-tumor', roomId = 'wave3-faq71-ground-to-platform';
const version = '2.99.4', dir = 'build/ticket-28-wave3-faq71-creep-elevation';
const source = await read(original + '/tumor-result.json');
const store = openWave3EngineeringStoreV1({directory:path.join(root,original),filename:'room.sqlite',readOnly:true});
let prior;
try {
  prior = (await store.loadRoom(sourceId)).envelope;
  assert.equal(prior.stateHash,source.stateHash);
  assert(source.coldExact);
} finally { store.close(); }
const selection = await read(base + '/inherited-zerg-standard-2.53.0/malignant.json');
const context = await resolveWave3StandardContext(await read(selection.manifestRef),'area_ability_inputs');
const recipes = structuredClone(selection.recipes);
Object.assign(recipes.player2.units.find(u=>u.unitInstanceId==='queen'),{unitInstanceId:'hydralisk',recordKey:'army_units:hydralisk'});
const terrainPlan = createOfficialStandard2000BalancedTerrainPlanV1();
const platform = terrainPlan.terrainPieces.find(t=>t.terrainPieceId==='std-centre-large');
const scene = {sourceId,sourceHash:source.stateHash,round:3,platform:platform.footprint,
  conditions:'Isolated start of Movement, next round, same roster. The original signed friendly tumor and its source binding are carried over.',providerCalls:0};
const opening = prepareOfficialStandardReleaseOpeningV2({releaseContext:context,dataset:context.dataset,snapshot:context.snapshot,
  recipes,terrainPlan,roomId,releaseMatchVersion:version,missionRecordKey:selection.mission,deploymentRecordKey:selection.deployment,
  armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY});
assert.deepEqual(opening.pendingNativeDefinitionIds,[]);
const bound = await bindWave3StandardActionRoom({manifestRef:selection.manifestRef,initial:opening.state,dir,candidateVersion:version,scenario:scene});
const state = structuredClone(opening.state);
const actorId = 'kerrigan', card = 'card:hatchery/creep-spread-any@1';
Object.assign(state,{round:3,stage:'activation_phases',phase:'movement',activeSideKey:'player2',firstPlayerSideKey:'player2'});
state.phaseFirstActorByRound['3:movement'] = {round:3,phase:'movement',chosenFirstActorSideKey:'player2',markerHolderSideKey:'player2'};
const piece = state.pieces.find(p=>p.id===actorId);
const oldPiece = prior.state.pieces.find(p=>p.id===actorId);
assert.equal(oldPiece.models.length,piece.models.length);
for(const [i,model] of piece.models.entries()) Object.assign(model,{isOnField:true,xInches:oldPiece.models[i].xInches,yInches:oldPiece.models[i].yInches});
Object.assign(piece,{isOnField:true,isInReserves:false,deploymentStatus:'deployed',leadingModelId:piece.models[0].id,
  xInches:piece.models[0].xInches,yInches:piece.models[0].yInches});
state.reserveManifestBySide.player2.find(r=>r.pieceId===actorId).deploymentStatus='deployed';
const token = prior.state.board.tokens.find(t=>t.tokenKind==='creep_tumor');
const binding = prior.state.officialBattlefieldAssetBindings.find(b=>b.assetId===token.tokenId);
assert.equal(binding.assetHash,token.tokenHash);
assert(state.officialBattlefieldAssetFamilySourceBundle.routes.some(r=>r.definitionId===card && r.sourceFeatureHash===binding.sourceFeatureHash));
state.board.tokens.push(structuredClone(token));
state.officialBattlefieldAssetBindings = [...(state.officialBattlefieldAssetBindings??[]),structuredClone(binding)];
declareWave3EngineeringCoherencyV1(state,{planIdPrefix:roomId});
initializeOfficialMatchRoundSupplyV1(state,true);
const app = bound.open();
const waypoints = [[20,8],[24.5,11.7],[27,17.6]];
const stages = [];
let lastState = state;
let stage = 'original ground token';
try {
  assert.equal(deriveOfficialTokenSurfacePlacementV2(state,token).elevation,'ground');
  assert.deepEqual(token.coordinate,{x:16,y:4});
  const segments = state.officialDeploymentGeometryBinding.entryEdgesByPlayer.player2.segments;
  assert(segments.length && segments.every(s=>s.startCoordinate.y===0 && s.endCoordinate.y===0));
  for(const [index,[x,y]] of waypoints.entries()) {
    const last = index===waypoints.length-1;
    const phase = structuredClone(state);
    // Start each next Movement with the previous signed tokens and their unchanged source bindings.
    phase.round=3+index;
    phase.phaseFirstActorByRound[phase.round+':movement']={round:phase.round,phase:'movement',chosenFirstActorSideKey:'player2',markerHolderSideKey:'player2'};
    phase.board.tokens=structuredClone(lastState.board.tokens);
    phase.officialBattlefieldAssetBindings=structuredClone(lastState.officialBattlefieldAssetBindings);
    initializeOfficialMatchRoundSupplyV1(phase,true);
    const runId=roomId+'-'+phase.round;
    const condition={...scene,round:phase.round,priorCheckpoint:stages.at(-1)?.stateHash??source.stateHash};
    const authority=bound.authorityFor(phase,condition);
    const seats=await app.create(runId,authority);
    const seat={roomId:runId,seatToken:seats.player2.seatToken};
    const envelope=(await app.store.loadRoom(runId)).envelope;
    const params=(px,py)=>({activeUnitId:actorId,paymentCardInstanceIds:[],coordinate:{xMilliInches:Math.round(1000*px),yMilliInches:Math.round(1000*py)}});
    const existing=phase.board.tokens.filter(t=>t.tokenKind==='creep_tumor');
    const gap=(px,py)=>Math.min(...existing.map(t=>Math.hypot(px-t.coordinate.x,py-t.coordinate.y)-t.baseDiameterInches));
    assert(gap(x,y)<6 && y-token.baseDiameterInches/2>6);
    if(envelope.stateRevision===0){
      const {legalSpace}=await app.room.legalSpace(seat);
      const domain=legalSpace.parameterDomains.find(d=>d.definitionId===card && d.pieceId===actorId);
      assert(domain,'missing placement on round '+phase.round);
      if(last){
        stage='outside range';
        const outsideParams=params(27.35,18.5);
        assert(gap(27.35,18.5)>6);
        const raw=bound.runtime.enumerate(phase,{sideKey:'player2'}).parameterDomains.find(d=>d.domainId===domain.domainId);
        assert(raw);
        assert.throws(()=>bound.runtime.instantiate(phase,raw,outsideParams,{sideKey:'player2'}),/CREEP_SOURCE_RANGE_REQUIRED/);
        const refused=await app.room.previewAction({...seat,expectedStateHash:envelope.stateHash,expectedStateRevision:0,
          expectedMatchBindingHash:envelope.matchBindingHash,expectedLegalSpaceHash:legalSpace.legalSpaceHash,
          proposal:{kind:'parameterized',domainId:domain.domainId,parameters:outsideParams}});
        assert.equal(refused.ok,false);
        await save(dir+'/outside.public.json',{runId,sourceHash:envelope.stateHash,coordinate:outsideParams.coordinate,
          closestGapInches:gap(27.35,18.5),reason:'BATTLEFIELD_ASSET_CREEP_SOURCE_RANGE_REQUIRED',refused:true});
      }
      stage='place tumor round '+phase.round;
      await app.commit({roomId:runId,credential:seats.player2,operationKey:'creep-spread-'+phase.round,
        select:d=>d.domainId===domain.domainId,parameters:()=>params(x,y)});
    }
    const head=(await app.store.loadRoom(runId)).envelope;
    assert.equal(head.stateRevision,1);
    const added=head.state.board.tokens.find(t=>t.tokenKind==='creep_tumor' && !existing.some(old=>old.tokenId===t.tokenId));
    assert.deepEqual(added.coordinate,{x,y});
    const surface=deriveOfficialTokenSurfacePlacementV2(head.state,added);
    assert.equal(surface.elevation,last?'high':'ground');
    if(last)assert.deepEqual(surface.supportTerrainIds,[platform.terrainPieceId]);
    assert(head.state.officialBattlefieldAssetBindings.some(b=>b.assetId===added.tokenId && b.assetHash===added.tokenHash && b.sourceDefinitionId===card));
    const journal=await assertWave3StandardRoomColdReplayV1(bound,authority,runId,head);
    stages.push({roomId:runId,round:phase.round,sourceHash:condition.priorCheckpoint,coordinate:added.coordinate,
      closestGapInches:gap(x,y),surface,revision:head.stateRevision,stateHash:head.stateHash,journal,cold:true});
    lastState=head.state;
  }
  const outside=await read(dir+'/outside.public.json');
  await save(dir+'/result.public.json',{sourceId,sourceHash:source.stateHash,version,stages,outside,providerCalls:0,
    scope:'Unedited certified Standard layout; sequential signed tokens, each received by a conditioned next Movement. Distances are base edge to base edge.'});
} catch(error){await save(dir+'/stop-'+Date.now()+'.public.json',{stage,steps:stages.length,message:error.message});throw error;}
finally {app.close();}
