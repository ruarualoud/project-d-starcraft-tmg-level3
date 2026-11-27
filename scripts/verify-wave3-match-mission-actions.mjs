import assert from 'node:assert/strict';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom, resolveWave3StandardContext, assertWave3StandardRoomColdReplayV1 } from './support/wave3-standard-action-room-v1.mjs';
import { declareWave3EngineeringCoherencyV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { prepareOfficialStandardReleaseOpeningV2, OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY } from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import { prepareOfficialSkirmish500ReleaseOpeningV2 } from '../packages/product-composition/official-skirmish-500-room-factory-v1.mjs';
import { wave3HumanMapConfiguration } from '../packages/product-composition/wave3-human-match-v1.mjs';
import { initializeOfficialMatchRoundSupplyV1 } from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import { OFFICIAL_MISSION_ACTION_TYPES as mission, OFFICIAL_MISSION_SABOTAGE_ACTION_V1 as sabotage } from '../packages/rule-atoms/official-standard-mission-runtime-v1.mjs';
import { OFFICIAL_ARTEFACT_CLAIM_ACTION_TYPE as claim } from '../packages/product-composition/official-artefact-hunt-drop-continuation-v1.mjs';

const [scale, family, variant] = process.argv.slice(2);
const high = variant === 'balanced-high';
const withdrawal = variant === 'withdrawal' || variant === 'withdrawal-control';
assert(!variant || (high && scale==='standard' && family==='fire_in_the_sky') || (withdrawal && family==='artefact_hunt'));
const setup = (await read('content/wave3-human-match-setups-v1.json')).find(s => s.scale.toLowerCase() === scale);
assert(setup && ['gather_the_resources','fire_in_the_sky','artefact_hunt'].includes(family));
const caseId = [scale,family,variant].filter(Boolean).join('-');
const path = 'build/ticket-28-wave3-human-lobby-v1/mission-actions/' + caseId;
const roomId = 't28-functional-' + caseId;
const control = 'determine_current_product_mission_marker_control';
const side = 'player1';
const fire = family === 'fire_in_the_sky', artefact = family === 'artefact_hunt';
let stage = 'opening';
function positionAtObjective(sample, unit, marker, heading=0) {
  const spacing = unit.models[0].baseWidthInches + 0.12;
  const failures = [];
  assert(unit.models.length<=7,'formation samples cover one leader and six neighbours');
  for (const offset of [1.5, 0, 2.25, 3]) {
    for (const angle of [0,90,180,270,45,135,225,315]) {
      const theta = (angle+heading)*Math.PI/180;
      for (const [i,model] of unit.models.entries()) {
        const orbit=(i-1)*Math.PI/3;
        const dx=i===0 ? 0 : spacing*Math.cos(orbit);
        const dy=offset+(i===0 ? 0 : spacing*Math.sin(orbit));
        Object.assign(model,{isOnField:true,
          xInches:Math.round(1000*(marker.xInches+dx*Math.cos(theta)-dy*Math.sin(theta)))/1000,
          yInches:Math.round(1000*(marker.yInches+dx*Math.sin(theta)+dy*Math.cos(theta)))/1000});
      }
      Object.assign(unit,{isInReserves:false,isOnField:true,deploymentStatus:'deployed',leadingModelId:unit.models[0].id,
        xInches:unit.models[0].xInches,yInches:unit.models[0].yInches});
      try {
        declareWave3EngineeringCoherencyV1(sample,{planIdPrefix:roomId});
        return;
      } catch (error) {
        if(!['MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP','MODEL_BASE_GEOMETRY_COHERENCY_LINK_INVALID','ENGINEERING_SCENE_OUT_OF_COHERENCY'].includes(error.code)) throw error;
        failures.push(error.cause?.message??error.message);
      }
    }
  }
  throw Error('No legal formation in the sampled positions: '+[...new Set(failures)].join(', '));
}
function options(runtime, state) {
  return runtime.enumerate(state, {sideKey:side}).candidates.filter(a => a.isEnabled);
}
function applyPrefix(runtime, state, type) {
  const rows = options(runtime,state);
  const action = rows.find(a => a.actionType === type);
  assert(action, type + ' not offered in ' + rows.map(a=>a.actionType));
  return structuredClone(runtime.apply(state,action,{sideKey:side}).state);
}
function setPhase(state, phase) {
  state.phase = phase;
  state.stage = 'activation_phases';
  state.activeSideKey = state.firstPlayerSideKey = side;
  delete state.currentProductMatchLifecycle;
  if (phase === 'assault') {
    state.phaseFirstActorByRound ??= {};
    state.phaseFirstActorByRound[state.round + ':assault'] = {round:state.round, phase, chosenFirstActorSideKey:side, markerHolderSideKey:side};
  }
}
async function run() {
  const manifest = await read(setup.releaseRef);
  assert.equal(manifest.manifestHash, setup.sourceHash);
  const context = await resolveWave3StandardContext(manifest, 'area_ability_inputs');
  const card = (await read(manifest.components.missionSource.ref)).missions.find(m=>m.family===family && m.profile.engagementScale===setup.scale);
  const threshold = card.rules.terminal.immediateLeadThresholdVp;
  const recipes = Object.fromEntries(setup.presets.map((p,i)=>['player'+(i+1),p.recipe]));
  if(withdrawal) {
    const terran=(await read('content/wave3-human-match-setups-v1.json')).find(s=>s.scale==='Skirmish').presets[0].recipe;
    recipes.player1={...terran,tacticalCardRecordKeys:[...terran.tacticalCardRecordKeys,'tactical_cards:dropship']};
    if(variant==='withdrawal-control') {
      const prior=await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/withdrawal-v222/claim/authority.json');
      Object.assign(recipes,prior.state.armyBuildingConfigurationBySide);
    }
  }
  if(high) {
    const historical=await read('build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-high-control-checkpoint.json');
    const prior=historical.envelope.state.armyBuildingConfigurationBySide;
    recipes.player1=prior.player2;
    recipes.player2=prior.player1;
  }
  const standard = scale === 'standard';
  const factory = standard ? prepareOfficialStandardReleaseOpeningV2 : prepareOfficialSkirmish500ReleaseOpeningV2;
  await save(path+'/setup.public.json',{version:setup.version,source:setup.sourceHash,recipes,mission:card.profile.recordKey});
  const opening = factory({releaseContext:context, releaseMatchVersion:setup.version, dataset:context.dataset, snapshot:context.snapshot,
    roomId, recipes, missionRecordKey:card.profile.recordKey,
    ...(!high ? {deploymentRecordKey:setup.deploymentRecordKey,mapConfiguration:wave3HumanMapConfiguration(setup)} : {}),
    ...(standard ? {armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} : {})});
  assert.deepEqual(opening.pendingNativeDefinitionIds, []);
  assert.equal(opening.state.selectedMission.profile.recordKey,card.profile.recordKey);
  const basis={release:setup.version, source:setup.sourceHash, mission:card.profile.recordKey, deployment:opening.state.officialDeploymentGeometryBinding.deploymentRecordKey,
    size:setup.scale, seed:high?'Standard factory balanced terrain':setup.seedId,terrain:opening.state.board.terrain.length};
  await save(path+'/opening.public.json',basis);
  stage = 'bound scenario';
  const bound = await bindWave3StandardActionRoom({manifestRef:setup.releaseRef,initial:opening.state,dir:path,candidateVersion:setup.version,
    scenario:'official two-seat setup before functional fixture'});
  let sample = structuredClone(opening.state);
  sample.round = withdrawal ? 2 : artefact ? card.rules.terminal.roundLimit : 1;
  sample = applyPrefix(bound.runtime,sample,mission.START_ROUND);
  const marker = sample.board.missionMarkers.find(m=>m.number===5);
  const unit = high ? sample.pieces.find(p=>p.sideKey===side && p.officialUnitRecordKey==='army_units:kerrigan') ??
    sample.pieces.find(p=>p.sideKey===side && p.id.endsWith('-kerrigan')) :
    sample.pieces.find(p=>p.id===(variant==='withdrawal-control'?'player1-goliath':standard&&!withdrawal?'adept':'player1-medic'));
  assert(marker.isActivated && unit);
  if(high) {
    assert.equal(marker.elevation,'high_ground');
    const support=sample.board.terrain.find(t=>t.id===marker.supportTerrainPieceId);
    assert(support?.standableHorizontalSurface && support.heightTier==='high_ground');
    assert.equal(unit.models.length,1);
    Object.assign(unit,{isInReserves:false,isOnField:true,deploymentStatus:'deployed',leadingModelId:unit.models[0].id,
      xInches:marker.xInches,yInches:marker.yInches});
    Object.assign(unit.models[0],{isOnField:true,xInches:marker.xInches,yInches:marker.yInches,elevation:'high',supportTerrainIds:[support.id]});
    declareWave3EngineeringCoherencyV1(sample,{planIdPrefix:roomId});
  } else positionAtObjective(sample,unit,marker);
  sample.reserveManifestBySide[side].find(p=>p.pieceId===unit.id).deploymentStatus='deployed';
  initializeOfficialMatchRoundSupplyV1(sample,true);
  setPhase(sample,'cleanup');
  const declared={side, unit:unit.id, marker:marker.id, coordinates:unit.models.map(m=>[m.xInches,m.yInches]),
    assumptions:'Conditioned formation at neutral marker, sole unit on table. No deployment history claimed.'};
  async function signedControl(state,suffix) {
    const prefix=bound.open();
    try {
      const id=roomId+'-'+suffix;
      const head=await exercise(prefix,id,bound.authorityFor(state,{...declared,condition:suffix}),[control]);
      return {hash:head.stateHash,state:structuredClone(head.state)};
    } finally {prefix.close();}
  }
  if (!artefact) {
    if(high) {
      const lower=structuredClone(sample);
      const piece=lower.pieces.find(p=>p.id===unit.id);
      piece.yInches=marker.yInches+2.5;
      Object.assign(piece.models[0],{yInches:piece.yInches,elevation:'ground',supportTerrainIds:[]});
      declareWave3EngineeringCoherencyV1(lower,{planIdPrefix:roomId+'-lower'});
      const judged=await signedControl(lower,'lower');
      assert.equal(judged.state.board.missionMarkers.find(m=>m.id===marker.id).controlSideKey,null);
      declared.lowerControl={model:[piece.xInches,piece.yInches],marker:[marker.xInches,marker.yInches],result:null,hash:judged.hash};
      declared.supportTerrainId=marker.supportTerrainPieceId;
    }
    const prior=await signedControl(sample,'control');
    declared.controlHash=prior.hash;
    sample=prior.state;
    assert.equal(sample.board.missionMarkers.find(m=>m.id===marker.id).controlSideKey,side);
    sample.round=2;
    setPhase(sample,'start_of_round');
    sample=applyPrefix(bound.runtime,sample,mission.START_ROUND);
    setPhase(sample,'assault');
    sample.scores.player1=threshold-(fire?2:1);
    declared.assumptions+=' Round 1 control is native; round 2 assault and starting score are conditional inputs.';
  }
  const authority = bound.authorityFor(sample,declared);
  const engineRoom = bound.open();
  const steps = withdrawal ? [control,claim] : artefact ? [control,claim,mission.SCORE,mission.END_GAME] : fire ? [sabotage,'finish_activation'] : [mission.GATHER];
  async function spend(native, credentials, id, action, index) {
    const attempt={roomId:id,credential:credentials.player1,operationKey:'step-'+index+'-'+action};
    if(action==='resolve_unit_lifecycle_ability') return native.commit({...attempt,
      select:d=>d.definitionId==='card:dropship/strap-in-any@1' && d.pieceId===unit.id,
      parameters:d=>({activeUnitId:d.parameterSchema.activeUnitId.const,paymentCardInstanceIds:d.parameterSchema.paymentCardInstanceIds.enum[0]})});
    if(action==='place_artefact_hunt_marker') return native.commit({...attempt,credential:credentials.player2,
      select:d=>d.actionType===action && d.constraints.markerId===marker.id,
      parameters:()=>({xMilliInches:Math.round(marker.xInches*1000),yMilliInches:Math.round(marker.yInches*1000)})});
    if(action==='finish_activation') return native.commit({...attempt,select:d=>d.actionType===action && d.pieceId===unit.id,parameters:()=>({})});
    return native.commit({...attempt,kind:'finite',select:r=>r.action.actionType===action &&
      (action!==sabotage || (r.action.sourceAction.payload.markerId===marker.id && r.action.sourceAction.payload.nextLevel===2))});
  }
  async function exercise(native,id,auth,actions) {
    const seats = await native.create(id,auth);
    let head = (await native.store.loadRoom(id)).envelope;
    for(let i=head.stateRevision;i<actions.length;i++){
      stage=id+' '+actions[i];
      await spend(native,seats,id,actions[i],i);
      head=(await native.store.loadRoom(id)).envelope;
      await save(path+'/'+id+'-r'+head.stateRevision+'.public.json',{action:actions[i],revision:head.stateRevision,hash:head.stateHash,
        score:head.state.scores, controlled:head.state.board.missionMarkers.find(m=>m.id===marker.id)?.controlSideKey,
        carried:head.state.officialArtefactHuntCustody?.byMarkerId?.[marker.id]??null,terminal:!!head.state.terminal});
    }
    return head;
  }
  let end, scoreEnd, scoreAuthority;
  try {
    if(withdrawal) {
      const contested=structuredClone(sample);
      const opponent=contested.pieces.find(p=>p.sideKey==='player2' && p.currentSupply>0 && p.models.length<=7);
      assert(opponent,'missing opposing unit to contest');
      positionAtObjective(contested,opponent,marker,180);
      contested.reserveManifestBySide.player2.find(p=>p.pieceId===opponent.id).deploymentStatus='deployed';
      initializeOfficialMatchRoundSupplyV1(contested,true);
      const tie=await signedControl(contested,'contested');
      const last=tie.state.log.flatMap(row=>row.events||[]).filter(e=>e.type==='mission_marker_control_determined').at(-1);
      const outcome=last?.resolution?.markerResults?.find(row=>row.markerId===marker.id) ??
        last?.markerResults?.find(row=>row.markerId===marker.id);
      assert(outcome?.supplyTotals.player1>0 && outcome.supplyTotals.player2>0,'two distinct units must actually contest');
      await save(path+'/contest.public.json',{hash:tie.hash,marker:marker.id,units:[unit.id,opponent.id],outcome});
    }
    end=await exercise(engineRoom,roomId,authority,steps);
    if(withdrawal) {
      assert.equal(end.state.officialArtefactHuntCustody.byMarkerId[marker.id].carrierUnitId,unit.id);
      const next=structuredClone(end.state);
      setPhase(next,'movement');
      next.phaseFirstActorByRound??={};
      next.phaseFirstActorByRound[next.round+':movement']={round:next.round,phase:'movement',chosenFirstActorSideKey:side,markerHolderSideKey:side};
      scoreAuthority=bound.authorityFor(next,{...declared,assumptions:'Movement opportunity with signed carrier, ready Dropship and original formation.',parentStateHash:end.stateHash});
      scoreEnd=await exercise(engineRoom,roomId+'-drop',scoreAuthority,['resolve_unit_lifecycle_ability','place_artefact_hunt_marker']);
      const returned=scoreEnd.state.pieces.find(p=>p.id===unit.id);
      assert(returned.isInReserves && !returned.isOnField);
      const restored=scoreEnd.state.board.missionMarkers.find(m=>m.id===marker.id);
      assert(!restored.isRemoved && restored.xInches===marker.xInches && restored.yInches===marker.yInches);
      assert(!scoreEnd.state.officialArtefactHuntCustody.byMarkerId[marker.id]?.carrierUnitId);
    } else if (fire) {
      assert.equal(end.state.board.missionMarkers.find(m=>m.id===marker.id).sabotageLevel,2);
      const next=structuredClone(end.state);
      setPhase(next,'cleanup');
      scoreAuthority=bound.authorityFor(next,{...declared,assumptions:'Only time advanced from signed sabotage to the same round cleanup. Score, objective and units retained.', parentStateHash:end.stateHash});
      scoreEnd=await exercise(engineRoom,roomId+'-score',scoreAuthority,[control,mission.SCORE,mission.END_GAME]);
      assert.equal(scoreEnd.state.scores.player1,threshold);
    } else if(artefact) {
      assert.equal(end.state.officialArtefactHuntCustody.byMarkerId[marker.id]?.carrierUnitId,unit.id);
      assert(end.state.board.missionMarkers.find(m=>m.id===marker.id).isRemoved);
    } else assert.equal(end.state.scores.player1,threshold);
    const terminal=(scoreEnd??end).state;
    if(!withdrawal) assert(terminal.gameOver || terminal.terminal,'Expected terminal');
    if(!artefact) assert.equal(terminal.winner,side);
    for(const actor of withdrawal?[]:['player1','player2']){
      const candidates=bound.runtime.enumerate(terminal,{sideKey:actor});
      assert(!candidates.candidates.some(a=>a.isEnabled) && !candidates.parameterDomains.length);
    }
  } finally {engineRoom.close();}
  stage='cold replay';
  const actions=await assertWave3StandardRoomColdReplayV1(bound,authority,roomId,end);
  if(fire) actions.push(...await assertWave3StandardRoomColdReplayV1(bound,scoreAuthority,roomId+'-score',scoreEnd));
  if(withdrawal) actions.push(...await assertWave3StandardRoomColdReplayV1(bound,scoreAuthority,roomId+'-drop',scoreEnd));
  const outcome=(scoreEnd??end);
  await save(path+'/result.public.json',{...basis,...declared,actions,coldReplay:true,terminal:outcome.state.terminalReason,
    winner:outcome.state.winner,scores:outcome.state.scores,terminalHash:outcome.stateHash,
    terrainRole:'official board, core control and score consumed; no path to the conditioned formation asserted',providerCalls:0});
  console.log(scale,family,actions,outcome.state.scores);
}
const saved = await read(path + '/result.public.json').catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
if (saved) {
  assert(saved.release === setup.version && saved.source === setup.sourceHash && saved.coldReplay,
    'Existing evidence does not match the requested release or lacks cold replay');
} else {
  try {
    await run();
  } catch (error) {
    await save(path + '/stop-' + Date.now() + '.public.json', {
      stage, message: error.message, cause: error.cause?.message, detail: error.detail,
      stack: error.stack?.split('\n').slice(1, 4),
    });
    throw error;
  }
}
