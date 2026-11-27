import assert from 'node:assert/strict';
import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import { read, root, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { bindWave3StandardActionRoom } from './support/wave3-standard-action-room-v1.mjs';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { bindCocoonRavagerBranch } from './support/wave3-cocoon-ravager-branch-v243.mjs';
import { poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';

const base = 'build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration';
const generated = process.argv.includes('--cocoon');
const parentDir = base + (generated ? '/cocoon-ravager-attack-v243' : '/ravager-plasma-v243');
const dir = base + (generated ? '/cocoon-ravager-charge-v243' : '/ravager-charge-v243');
const origin = await read(parentDir + '/result.json');
const initialMenu = await read(parentDir + (generated ? '/firing-window.json' : '/menu-r0.json'));
assert(origin.coldExact);
const parent = openWave3EngineeringStoreV1({ directory:path.join(root,parentDir),filename:'room.sqlite' });
let start, recovered;
try {
  const bundle = await parent.loadReplayBundle(origin.roomId);
  assert.equal((await parent.loadRoom(origin.roomId)).envelope.stateHash,origin.stateHash);
  if (generated) recovered = await bindCocoonRavagerBranch({ base, parentDir, dir, source: origin, bundle, checkpoint: initialMenu });
  start = recovered?.start ?? bundle.initialEnvelope;
  assert.equal(start.stateHash,initialMenu.stateHash);
} finally { parent.close(); }
const opening = await read(base + '/ravager-deep-tunnel-v242/opening.json');
const bound = recovered?.bound ?? await bindWave3StandardActionRoom({ manifestRef:opening.sourceManifest,
  initial:start.state,dir,candidateVersion:origin.version,frozenRuntimeRef:parentDir+'/runtime.json',
  scenario:{fromRoom:origin.roomId,fromRevision:start.stateRevision,fromStateHash:start.stateHash,phase:'assault'} });
const roomId = generated ? 'standard-cocoon-ravager-charge-v243' : 'standard-ravager-charge-signed-map-v243';
const actorId = generated ? initialMenu.attacker : 'ravager';
const targetId = generated ? initialMenu.target : origin.target;
const authority = recovered?.authority ?? bound.authority;
const impactId='unit:ravager/devastating-charge-assault-phase@1';
await mkdir(path.join(root,dir),{recursive:true});
const native=bound.open();
try {
  const seats=await native.create(roomId,authority);
  for (;;) {
    const { envelope,stateRevision }=await native.store.loadRoom(roomId);
    assert(stateRevision<20,'single charge continuation exceeded its scenario');
    const state=envelope.state,side=state.activeSideKey;
    const actor=state.pieces.find(p=>p.id===actorId), target=state.pieces.find(p=>p.id===targetId);
    const menu=await native.room.legalSpace({roomId,seatToken:seats[side].seatToken});
    assert(menu.ok,menu.message||menu.reason);
    const {parameterDomains:domains,finiteActions:finite}=menu.legalSpace;
    const domainFor=type=>domains.find(d=>d.actionType===type);
    const finiteFor=type=>finite.find(r=>r.action.actionType===type);
    const events=state.log.flatMap(row=>row.events||[]).filter(e=>e.pieceId===actorId);
    const rolled=events.find(e=>e.type==='charge_declared_and_rolled');
    const charge=events.find(e=>e.type==='charge_succeeded');
    const trigger=events.find(e=>e.type==='impact_triggered_after_successful_charge');
    const hit=events.find(e=>e.type==='impact_damage'&&e.targetId===targetId);
    const position=[actor.models[0].xInches, actor.models[0].yInches];
    await save(dir+'/menu-r'+stateRevision+'.json',{roomId,stateRevision,stateHash:envelope.stateHash,
      side,phase:state.phase,position,pendingStage:state.pendingAction?.stage,
      domains:domains.map(d=>({type:d.actionType,pieceId:d.pieceId,required:d.parameterSchema.required})),
      finite:finite.map(r=>r.action.actionType)});
    if (hit && side===target.sideKey && !state.pendingOfficialReactionWindow && !state.pendingAction) {
      assert(rolled && charge && trigger);
      assert.deepEqual(charge.declaredTargetUnitIds,[targetId]);
      assert.deepEqual(trigger.targetUnitIds,[targetId]);
      assert.equal(trigger.impactDice,2);
      assert.equal(hit.stages.hitRolls.length,2);
      assert.equal(hit.stages.hitThreshold,4);
      assert(domains.some(d=>d.pieceId===targetId)||finiteFor('pass'));
      assert(!domainFor('resolve_impact'));
      assert.notDeepEqual(position,[start.state.pieces.find(p=>p.id===actorId).models[0].xInches,
        start.state.pieces.find(p=>p.id===actorId).models[0].yInches]);
      const proof={roomId,version:origin.version,parentStateHash:start.stateHash,revision:stateRevision,
        stateHash:envelope.stateHash,actorId,targetId,definitionId:impactId,chargeRolls:rolled.chargeRolls,
        maxDistanceMilliInches:rolled.maxDistanceMilliInches,position,impactDice:trigger.impactDice,
        hitRolls:hit.stages.hitRolls,threshold:hit.stages.hitThreshold,damage:hit.stages.totalDamage,
        casualties:hit.casualtyModelIds,nextSide:side,nextTypes:domains.map(d=>d.actionType),modelCalls:0};
      await save(dir+'/impact.json',proof);
      const cold=bound.open();
      try {
        await cold.restoreDependencies(roomId,authority);
        const replay=await cold.store.loadReplayBundle(roomId);
        const receipts=replay.privateJournal.filter(e=>e.payload.type==='accepted_transition').map(e=>e.payload.payload.receipt);
        const rebuilt=cold.engine.replay({initialEnvelope:replay.initialEnvelope,journal:receipts});
        assert(rebuilt.ok,rebuilt.reason);assert.deepEqual(rebuilt.envelope,envelope);
        assert.equal(receipts.length,stateRevision);
        await save(dir+'/result.json',{...proof,receipts:receipts.length,coldExact:true});
      } finally {cold.close();}
      break;
    }

    let domain,candidate,parameters;
    if (stateRevision===0) {
      domain=domains.find(d=>d.pieceId===actorId&&d.actionType==='charge');
      assert(domain,'charge absent from original Assault choice');
      parameters={leadingModelId:actor.models[0].id,targets:[{unitId:targetId,modelId:target.models[0].id}]};
    } else if (state.pendingOfficialReactionWindow && (domain=domainFor('pass_reaction_family_window'))) {
      parameters={};
    } else if ((candidate=finiteFor('roll_declared_charge'))) {
      // Actual declaration roll, using this Room's chance ticket.
    } else if ((domain=domainFor('resolve_charge'))) {
      const leading=actor.models[0], foe=target.models[0];
      assert.equal(leading.xInches,foe.xInches);
      const approach = Math.sign(foe.yInches-leading.yInches);
      const radii = Math.round(foe.baseDepthInches*500)+Math.round(leading.baseDepthInches*500);
      const y = Math.round(foe.yInches*1000) - approach*radii;
      assert(rolled && Math.abs(y-Math.round(leading.yInches*1000))<=rolled.maxDistanceMilliInches);
      parameters={outcome:'success',path:[{xMilliInches:Math.round(foe.xInches*1000),
        yMilliInches:y,elevation:'ground',supportTerrainIds:[]}],placements:[]};
    } else if ((domain=domains.find(d=>d.actionType==='resolve_impact'&&d.parameterSchema.required.includes('allocations')))) {
      assert.equal(state.pendingAction.sourceDefinitionId,impactId);
      assert.equal(state.pendingAction.impactDice,2);
      assert.equal(state.pendingAction.baseHitThreshold,4);
      assert(!domainFor('finish_activation'));
      assert(!finiteFor('pass'));
      parameters={allocations:domain.parameterSchema.eligibleModels.map(m=>{
        assert(m.eligibleTargetUnitIds.includes(targetId));
        return {modelId:m.modelId,targetUnitId:targetId,dice:m.impactDice};
      })};
    } else if (hit && (domain=domains.find(d=>d.pieceId===actorId&&d.actionType==='finish_activation'))) {
      parameters={};
    } else if (domains.length===1) {
      [domain]=domains;parameters=poolParameters(domain);
    } else {
      assert.equal(domains.length,0);assert.equal(finite.length,1);[candidate]=finite;
    }
    const choice=domain?{select:r=>r.domainId===domain.domainId,parameters:()=>parameters}:
      {kind:'finite',select:r=>r.actionKey===candidate.actionKey};
    await native.commit({roomId,credential:seats[side],operationKey:'charge-r'+stateRevision,...choice});
  }
} catch (error) {
  await save(dir+'/stop-'+Date.now()+'.json',{roomId,message:error.message,
    frames:error.stack?.split('\n').slice(0,5)});
  throw error;
} finally {native.close();}
