import assert from 'node:assert/strict';
import { createStarcraftTmgLevel3HttpAdapter, STARCRAFT_TMG_LEVEL3_API_PREFIX } from '../../packages/http-adapter/handler-v1.mjs';
import { evaluateNativeSpecialTerrainLosEntriesV1 } from '../../packages/rule-atoms/official-special-terrain-rules-kernel-v1.mjs';
import { OFFICIAL_MISSION_ACTION_TYPES, OFFICIAL_MISSION_SABOTAGE_ACTION_V1 } from '../../packages/rule-atoms/official-standard-mission-runtime-v1.mjs';

const rejectedTranslation = new Set([
  'SELECTED_SPATIAL_PATH_EXCEEDS_SPEED', 'SELECTED_SPATIAL_PATH_MODEL_COLLISION',
  'SELECTED_SPATIAL_PATH_MODEL_CLEARANCE_INSUFFICIENT', 'SELECTED_SPATIAL_TERRAIN_PATH_BLOCKED',
  'SELECTED_SPATIAL_TERRAIN_ENDPOINT_UNSUPPORTED', 'SELECTED_SPATIAL_TERRAIN_SUPPORT_DECLARATION_MISMATCH',
  'SELECTED_SPATIAL_TERRAIN_ELEVATION_MISMATCH',
]);

// Human-seat acceptance only. Prefer an unobserved scenario when its public
// menu offers it. The game's legal menu and preview still decide eligibility.
export function selectWave3FunctionalAction({legalSpace, state, runtime, binding, steps}) {
  const window = state.selectedRosterActivationWindow;
  if (window?.stage === 'after_action') {
    const finish = legalSpace.parameterDomains.find(d => d.actionType === 'finish_activation' && d.pieceId === window.pieceId);
    if (finish) return {action:'finish_activation', proposal:{kind:'parameterized', domainId:finish.domainId, parameters:{}}};
  }
  const seen = new Set(steps.map(row => row.action));
  for (const action of [OFFICIAL_MISSION_ACTION_TYPES.GATHER, OFFICIAL_MISSION_SABOTAGE_ACTION_V1]) {
    const choice = legalSpace.finiteActions.find(row => row.action.actionType === action);
    if (choice && !seen.has(action)) return {action, proposal:{kind:'finite', actionKey:choice.actionKey}};
  }
  for (const d of legalSpace.parameterDomains) {
    if (!['move', 'run'].includes(d.actionType) || seen.has(d.actionType)) continue;
    const piece = state.pieces.find(p => p.id === d.pieceId);
    const living = piece.models.filter(m => m.isOnField !== false && !m.isDestroyed);
    const leader = living.find(m => m.id === piece.leadingModelId) ?? living[0];
    for (const [dx,dy] of [[0,0.5],[0,-0.5],[0.5,0],[-0.5,0]]) {
      const point = model => ({xMilliInches:Math.round((model.xInches+dx)*1000),
        yMilliInches:Math.round((model.yInches+dy)*1000), elevation:model.elevation ?? 'ground',
        supportTerrainIds:model.supportTerrainIds ?? [], rotationDegrees:model.baseRotationDegrees ?? 0});
      const parameters = {leadingModelId:leader.id, path:[point(leader)],
        placements:living.filter(m => m.id !== leader.id).map(m => ({modelId:m.id, ...point(m)}))};
      let native;
      try { native = runtime.instantiate(state, d, parameters, {matchBinding:binding}); }
      catch (error) {
        if (!rejectedTranslation.has(error.message.split(':',1)[0])) throw error;
        continue;
      }
      // The public form accepts the declared inputs. The receipt also includes
      // derived empty gap lists that belong to the native action.
      return {action:d.actionType, proposal:{kind:'parameterized',domainId:d.domainId,parameters},
        canonicalParameters:native.canonicalParameters};
    }
  }
  return null;
}

export function wave3EntryPlacement(domain, edge, fraction) {
  const {modelProfiles: models, battlefieldWidthMilliInches: width, battlefieldHeightMilliInches: height} = domain.constraints;
  const along = Math.round(1000 * (edge.startInches + fraction * (edge.endInches - edge.startInches)));
  const horizontal = edge.side === 'top' || edge.side === 'bottom';
  const x = horizontal ? along : edge.side === 'left' ? 3000 : width - 3000;
  const y = !horizontal ? along : edge.side === 'bottom' ? 3000 : height - 3000;
  const step = Math.ceil(Math.max(...models.flatMap(m => [m.baseWidthMilliInches, m.baseDepthMilliInches]))) + 150;
  const point = (xMilliInches, yMilliInches) => ({xMilliInches, yMilliInches, elevation:'ground',supportTerrainIds:[],rotationDegrees:0});
  const slots = [[-1,0],[1,0],[0,1],[-1,1],[1,1],[0,-1],[-1,-1],[1,-1]];
  const placements = models.slice(1).map((model,i) => {
    const [dx,dy] = slots[i];
    return {modelId:model.modelId, ...point(x+step*dx,y+step*dy)};
  });
  return {leadingModelId:models[0].modelId, entrySegmentId:edge.segmentId, entryAlongEdgeMilliInches:along,
    path:[point(x,y)],placements};
}

export async function exerciseBothEntries({native,runtime,seats,roomId,saveEvidence}) {
  const transport = createStarcraftTmgLevel3HttpAdapter({roomRuntime:native.room});
  for (;;) {
    const {stateRevision:rev,envelope} = await native.store.loadRoom(roomId);
    if (rev >= 6) break;
    assert(rev >= 1);
    const state = envelope.state;
    const side = state.activeSideKey;
    const credential = seats[side];
    const menu = await transport.handle({method:'POST',pathname:STARCRAFT_TMG_LEVEL3_API_PREFIX+'/rooms/'+roomId+'/legal-space',
      headers:{authorization:'Bearer '+credential.seatToken}});
    assert.equal(menu.status,200,menu.response.error);
    const {finiteActions,parameterDomains} = menu.response.result.legalSpace;
    const request = {roomId,credential,operationKey:'entry-r'+rev};
    if (rev === 1) {
      await native.commit({...request,kind:'finite',select:row=>row.action.actionType==='choose_first_actor' && row.action.chosenFirstActorSideKey==='player1'});
    } else if (rev === 3 || rev === 5) {
      assert(parameterDomains.some(d=>d.actionType==='finish_activation'));
      await native.commit({...request, select:d=>d.actionType==='finish_activation',parameters:()=>({})});
    } else {
      const domains = parameterDomains.filter(d=>d.actionType==='deploy' && d.constraints.modelProfiles.length <= 9)
        .sort((a,b)=>a.constraints.modelProfiles.length-b.constraints.modelProfiles.length);
      assert(domains.length, 'reserve deployment menu missing at r'+rev+': '+finiteActions.map(row=>row.action.actionType));
      let legal;
      const rejected = new Set();
      for (const domain of domains) {
        for (const edge of domain.constraints.entrySegments) {
          for (const fraction of [0.5,0.25,0.75,0.125,0.875]) {
            const params = wave3EntryPlacement(domain,edge,fraction);
            let result;
            try { result = runtime.instantiate(state,domain,params); }
            catch(error) { rejected.add(error.message); continue; }
            legal = {domain,params,result};
            break;
          }
          if (legal) break;
        }
        if (legal) break;
      }
      assert(legal, 'finite sample lacked accepted deployment: '+Array.from(rejected).slice(0,8).join(','));
      const {domain,params,result} = legal;
      const enemyEdge = state.officialDeploymentGeometryBinding.entryEdgesByPlayer[side==='player1'?'player2':'player1'].segments[0];
      assert.throws(()=>runtime.instantiate(state,domain,{...params,entrySegmentId:enemyEdge.segmentId}),/ENTRY|SEGMENT/);
      const applied = await native.commit({...request,select:d=>d.domainId===domain.domainId,parameters:()=>params});
      assert.deepEqual(applied.preview.core.action,result.action);
      const after = (await native.store.loadRoom(roomId)).envelope.state;
      const unit = after.pieces.find(p=>p.id===domain.pieceId);
      assert(unit.isOnField && !unit.isInReserves);
      await saveEvidence('deployment-'+side+'.public.json',{side,revision:rev+1,pieceId:unit.id,edge:params.entrySegmentId,
        models:unit.models.map(m=>[m.id,m.xInches,m.yInches]),rejectedOpposingEdge:enemyEdge.segmentId,queryEqualsApplied:true});
    }
  }
  const {envelope} = await native.store.loadRoom(roomId);
  const state = envelope.state;
  const pieces = ['player1','player2'].map(side=>state.pieces.find(p=>p.sideKey===side && p.isOnField && !p.isInReserves));
  assert(pieces.every(Boolean));
  const queries = pieces.map((actor,i)=>({queryId:'entry-los-'+i,actorUnitId:actor.id,attackerModelId:actor.models[0].id,
    targetUnitId:pieces[1-i].id,targetModelId:pieces[1-i].models[0].id}));
  const sight = evaluateNativeSpecialTerrainLosEntriesV1({state,dataBundle:state.officialTerrainLosDataBundle,queries})
    .map(({queryId,result})=>({queryId,visible:result.visible,blockingTerrainIds:result.blockingTerrainIds,resultHash:result.resultHash}));
  assert.equal(typeof sight[0].visible,'boolean');
  assert.equal(sight[0].visible,sight[1].visible);
  assert.deepEqual(sight[0].blockingTerrainIds,sight[1].blockingTerrainIds);
  await saveEvidence('deployed-models-los.public.json',{queries,sight});
  return envelope;
}

// Two conditional scoring checks share the real, deployed board and all
// native first-round transitions. Only the score immediately before the
// end-game check is supplied as an explicit scenario input.
export function compareLeadAtFirstScoring({runtime,envelope,leadThreshold}) {
  let state = envelope.state;
  const actions = [];
  for (let i=0;i<16;i++) {
    const options = {sideKey:state.activeSideKey,matchBinding:envelope.matchBinding,postRevision:envelope.stateRevision+i+1};
    const menu = runtime.enumerate(state,options);
    const enabled = menu.candidates.filter(action=>action.isEnabled);
    if (enabled.some(action=>action.actionType==='check_mission_end_game')) {
      assert(actions.includes('score_mission'), 'must reach scoring through native actions');
      const outcomes = [leadThreshold-1,leadThreshold].map(lead=>{
        const sample = {...state,scores:{player1:lead,player2:0}};
        const action = runtime.enumerate(sample,options).candidates
          .find(row=>row.isEnabled && row.actionType==='check_mission_end_game');
        assert(action);
        const after = runtime.apply(sample,action,options).state;
        const terminal = after.gameOver===true || after.terminal===true;
        assert.equal(terminal,lead===leadThreshold);
        if (terminal) assert.equal(after.winner,'player1');
        return {lead,terminal,winner:after.winner ?? null,reason:after.terminalReason ?? null};
      });
      return {signedSourceRevision:envelope.stateRevision,signedSourceHash:envelope.stateHash,round:state.round,
        actions,scoreBeforeCondition:state.scores,leadThreshold,outcomes,scope:'isolated score inputs; original room retains its signed score'};
    }
    const next = ['choose_first_actor','pass','determine_current_product_mission_marker_control','score_mission']
      .map(type=>enabled.find(row=>row.actionType===type && (type!=='choose_first_actor'||row.chosenFirstActorSideKey==='player1')))
      .find(Boolean);
    assert(next,'Unexpected native phase menu: '+enabled.map(row=>row.actionType).join(','));
    state = runtime.apply(state,next,options).state;
    actions.push(next.actionType);
  }
  throw Error('First scoring window not reached within one round');
}

export function exerciseOrdinaryMovement(runtime,envelope) {
  let state = envelope.state;
  const preceding = [];
  for (let step=0;step<6;step++) {
    const options = {sideKey:state.activeSideKey,matchBinding:envelope.matchBinding,postRevision:envelope.stateRevision+step+1};
    const menu = runtime.enumerate(state,options);
    const domains = menu.parameterDomains.filter(row=>['run','move'].includes(row.actionType));
    for (const domain of domains) {
      const piece = state.pieces.find(p=>p.id===domain.pieceId);
      const living = piece.models.filter(m=>m.isOnField!==false && !m.isDestroyed);
      const leader = living.find(m=>m.id===piece.leadingModelId) || living[0];
      for (const [dx,dy] of [[0,0.5],[0,-0.5],[0.5,0],[-0.5,0]]) {
        const destination = model=>({xMilliInches:Math.round((model.xInches+dx)*1000),yMilliInches:Math.round((model.yInches+dy)*1000),
          elevation:model.elevation||'ground',supportTerrainIds:model.supportTerrainIds||[],rotationDegrees:model.baseRotationDegrees||0});
        const params = {leadingModelId:leader.id,path:[destination(leader)],
          placements:living.filter(m=>m.id!==leader.id).map(m=>({modelId:m.id,...destination(m)}))};
        let candidate;
        try { candidate=runtime.instantiate(state,domain,params,options); }
        catch { continue; }
        const after = runtime.apply(state,candidate.action,options).state;
        const end = after.pieces.find(p=>p.id===piece.id).models.find(m=>m.id===leader.id);
        assert.equal(Math.round(end.xInches*1000),params.path[0].xMilliInches);
        assert.equal(Math.round(end.yInches*1000),params.path[0].yMilliInches);
        return {sourceRevision:envelope.stateRevision,sourceHash:envelope.stateHash,preceding,action:domain.actionType,pieceId:piece.id,
          phase:state.phase,unitModelCount:living.length,from:[leader.xInches,leader.yInches],to:[end.xInches,end.yInches],
          scope:'isolated Rules continuation from signed r6; original room unchanged'};
      }
    }
    const next = ['choose_first_actor','pass'].map(type=>menu.candidates.find(a=>a.isEnabled && a.actionType===type
      && (type!=='choose_first_actor'||a.chosenFirstActorSideKey==='player1'))).find(Boolean);
    assert(next,'no ordinary movement witness in the bounded phase window');
    state = runtime.apply(state,next,options).state;
    preceding.push(next.actionType);
  }
  throw Error('no accepted translation in the finite sample');
}
