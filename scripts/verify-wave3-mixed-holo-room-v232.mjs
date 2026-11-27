import assert from 'node:assert/strict';
import { registry, read, save, ravenRooms } from './support/wave3-raven-tabletop-room-v1.mjs';
import { sceneFor, runtimeFor, moveParameters, summonParameters } from './verify-wave3-nova-holo-decoy-v1.mjs';
const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const output=base+'/nova-modes-standard-v232/holo-mixed';
const product=registry(), rooms=ravenRooms(output, runtimeFor);
const mode=process.argv.at(-1);
const branch='mixed-'+mode;
const use=mode==='stealth';
const side=use?'player2':'player1';
const decoyId='unit:nova_'+mode+'_mode/holo-decoy-movement-phase@1';
const griffinId='card:nova_covert_ops/griffin-support-any@1';
async function scenario() {
  const manifest=await read(base+'/tabletop-raven-m01-v1/manifest.json');
  product.resolver.register(manifest);
  const context=await product.resolver.resolve({releaseId:manifest.releaseId,purpose:'area_ability_inputs'});
  const scene=await sceneFor(context,{mode,side},[decoyId,griffinId]);
  const sources=scene.state.officialUnitLifecycleFamilySourceBundle;
  assert.deepEqual(sources.definitionIds,[griffinId,decoyId]);
  assert.deepEqual([...sources.generatedUnitRecordKeys].sort(),['army_units:holo_decoy','army_units:sabotage_drone']);
  assert.deepEqual(scene.state.officialSummonDataBundle.currentDeploymentDefinitions.map(row=>row.sourceDefinitionId),[decoyId]);
  await rooms.registerScene(product,context,branch,scene.state,scene.scenario);
}
try {
  if (mode==='replay') {
    await rooms.coldReplay(product,['mixed-stealth','mixed-assault']);
  } else {
    assert(['stealth','assault'].includes(mode));
    await scenario();
    const {native,roomId,runtime,authority}=await rooms.openBranch(product,branch);
    try {
      const seats=await native.create(roomId,authority);
      const room=()=>native.store.loadRoom(roomId);
      const commit=(key,select,parameters,kind='parameterized')=>native.commit({roomId,credential:seats[side],operationKey:key,select,parameters,kind});
      let current=await room();
      if (current.stateRevision===0) {
        const state=current.envelope.state;
        const menu=runtime.enumerate(state);
        const domain=menu.parameterDomains.find(row=>row.definitionId===decoyId);
        assert(domain && menu.parameterDomains.some(row=>row.definitionId===griffinId));
        const parameters=summonParameters(state,domain);
        const request={queryKind:'unit_lifecycle_placement_preview',pieceId:'nova',parameters};
        assert.throws(()=>runtime.query(state,request),/QUERY_DEFINITION_REQUIRED/);
        assert.throws(()=>runtime.query(state,{...request,definitionId:'not-in-menu'}),/DOMAIN_UNAVAILABLE/);
        const quoted=runtime.query(state,{...request,definitionId:decoyId});
        assert.deepEqual(quoted.result.action,runtime.instantiate(state,domain,parameters).action);
        await commit('summon',row=>row.domainId===domain.domainId,()=>parameters);
      }
      current=await room();
      const decoy=state=>state.pieces.find(row=>row.officialUnitRecordKey==='army_units:holo_decoy');
      if (current.stateRevision===1) {
        const state=current.envelope.state, child=decoy(state);
        assert.equal(child.summonParentPieceId,'nova');
        assert.equal(state.pendingOfficialSummonedAction.purpose,'immediate_move');
        assert(runtime.enumerate(state).parameterDomains.every(row=>row.pieceId===child.id));
        if (use) await commit('move-child',row=>row.sourceRuntimeKind==='summoned_action',()=>moveParameters(child,0,7000));
        else await commit('decline-child',row=>row.action.actionType==='decline_summoned_move',undefined,'finite');
      }
      current=await room();
      if (current.stateRevision===2) {
        const state=current.envelope.state;
        assert.equal(state.pendingOfficialSummonedAction,undefined);
        assert.equal(state.selectedRosterActivationWindow.pieceId,'nova');
        assert.equal(state.selectedRosterActivationWindow.stage,'before_action');
        assert.equal(decoy(state).models[0].yInches,use?17:10);
        await commit('nova-move',row=>row.actionType==='move'&&row.pieceId==='nova',()=>moveParameters(state.pieces.find(p=>p.id==='nova'),-1000,0));
      }
      current=await room();
      if (current.stateRevision===3) await commit('finish-nova',row=>row.actionType==='finish_activation'&&row.pieceId==='nova',()=>({}));
      current=await room();
      assert.equal(current.stateRevision,4);
      assert.equal(current.envelope.state.activeSideKey,side==='player1'?'player2':'player1');
      assert.equal(current.envelope.state.pieces.find(p=>p.id==='nova').models[0].xInches,9);
      await save(output+'/'+branch+'/result.json',{stateHash:current.envelope.stateHash,revision:current.stateRevision,
        mode,childMoved:use,parentCompleted:true,childSupply:decoy(current.envelope.state).currentSupply});
    } finally {native.close();}
  }
} finally {product.close();}
