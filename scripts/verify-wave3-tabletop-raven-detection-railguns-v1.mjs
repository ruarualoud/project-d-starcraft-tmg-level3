import assert from 'node:assert/strict';
import path from 'node:path';
import { arrange, poolParameters } from './verify-wave3-lethal-hologram-v1.mjs';
import { root, tabletop, sourceRef, read, save, registry, sourceContext, ravenRooms } from './support/wave3-raven-tabletop-room-v1.mjs';
import { runProductBoundaryCheck } from './lib/product-boundary-check.mjs';
import { createOfficialReleaseRosterStateV2, refreshOfficialReleaseRosterDerivedStateV2 }
  from '../packages/product-composition/official-release-roster-state-v2.mjs';
import { createOfficialCharacteristicStatusComponentRuntimeV2 }
  from '../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs';
import { createOfficialModelBaseFootprintV1, evaluateOfficialPhysicalFootprintRelationV1 }
  from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { declareWave3EngineeringCoherencyV1, commitWave3RangedBatchV1 } from './support/wave3-room-boundary-fixture-v1.mjs';

const evidence = tabletop + '/detection-railguns';
const { registerScene, openBranch, coldReplay } = ravenRooms(evidence, runtimeFor);
const detection = 'unit:raven/detection-any-phase@1';
const railguns = 'unit:raven/railguns-assault-phase@1';
const might = 'card:nerazim/might-of-the-nerazim-any@1';
const piece = (state, id) => state.pieces.find(p => p.id === id);
const hidden = state => piece(state, 'zeratul').statuses.some(status =>
  String(typeof status === 'string' ? status : status.statusName || status.name).toLowerCase() === 'hidden');

function runtimeFor(context, state) {
  return createOfficialCharacteristicStatusComponentRuntimeV2({ context, spatialState: state,
    definitionIds: state.officialCharacteristicStatusFamilySourceBundle.definitionIds, weaponDefinitionIds: [railguns],
    includeRanged: true, includeMelee: true, includeArmourChoices: true, includePrecisionChoices: true });
}
async function createMovementState(context) {
  const candidatesBySide = await read('build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/seeker-storm-shared-order-v1-registered-passive/candidate-input.public.json');
  candidatesBySide.player1.units.find(u => u.unitInstanceId === 'raven').upgrades = [];
  candidatesBySide.player2 = {sideKey: 'player2', scaleId: 'Standard', mineralBudget: 2000,
    factionRecordKey: 'tactical_cards:nerazim', tacticalCardRecordKeys: ['tactical_cards:robotics_facility'],
    units: ['zeratul','stalker'].map(id => ({ unitInstanceId:id, recordKey:'army_units:'+id, compositionKind:'small', upgrades:[] }))};
  const old = (await read('build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/annotated-assembly-contour-v1/ground-base-fit-v1/classified-wall/authority.json')).state;
  const { state } = createOfficialReleaseRosterStateV2({ context, candidatesBySide,
    legacyDisclosurePolicy: (await read('build/ticket-28-wave3-release-context-20261112-v1/native-authority.json')).state.officialRosterDisclosureDataBundle,
    includeAbilitySourcePhases:true, characteristicDefinitionIds:[detection,'unit:zeratul/one-with-the-shadows-any-phase@1'],
    canonicalResourceTypes:true, reactionDefinitionIds:[might], includeCharacteristicConsumers:true,
    includeMelee:true, includeHiddenRangedAndEvade:true, includeDetectionHiddenLoss:true, includeActionPerformedStatusLifecycle:true });
  for (const key of ['board','officialDeploymentGeometryBinding','engagementScale','armyBuildingEngagementScale',
    'officialMissionRuntimeDescriptor','supplyLossLedger','officialModelGapTransitPolicy','officialMissionSupplyProfile',
    'phase','round','activeSideKey','firstPlayerSideKey','phaseFirstActorByRound','log']) state[key]=structuredClone(old[key]);
  arrange(piece(state,'raven'),10,10); arrange(piece(state,'zeratul'),22,15.7);
  declareWave3EngineeringCoherencyV1(state,{planIdPrefix:'tabletop-detection-'});
  return refreshOfficialReleaseRosterDerivedStateV2({context,state});
}
function edgeGap(state,x) {
  function footprint(id) {
    const p=piece(state,id),model={...p.models[0]};
    if (id==='raven') model.xInches=x/1000;
    return createOfficialModelBaseFootprintV1({piece:p,model,dataBundle:state.officialModelBaseGeometryDataBundle});
  }
  return evaluateOfficialPhysicalFootprintRelationV1({left:footprint('raven'),right:footprint('zeratul')}).minimumSeparationMilliInches;
}
// Along this approach the separation decreases monotonically to the 6-inch boundary.
function firstXAtGap(state,gap) {
  let lo=10000, hi=21000;
  assert(edgeGap(state,lo)>gap && edgeGap(state,hi)<=gap);
  while(hi-lo>1){ const mid=Math.floor((hi+lo)/2); if(edgeGap(state,mid)<=gap)hi=mid;else lo=mid; }
  return hi;
}
function projection(runtime,state,x) {
  const copy=structuredClone(state);piece(copy,'raven').models[0].xInches=x/1000;
  return runtime.query(copy,{queryKind:'characteristic_status_projection',pieceId:'zeratul'}).result.hiddenSuppressedByDetection;
}
async function runMovement(product) {
  const {native,roomId,runtime,authority,prefix}=await openBranch(product,'detection');
  try {
    const seats=await native.create(roomId,authority);
    const commit=(side,key,action,parameters)=>native.commit({roomId,credential:seats[side],operationKey:key,choice:action,parameters:()=>parameters});
    const move=(id,x,y)=>({leadingModelId:id+'-model-1',path:[{xMilliInches:x,yMilliInches:y}],placements:[]});
    const first=await commit('player2','zeratul-move',{actionType:'move',pieceId:'zeratul'},move('zeratul',21000,15700));
    assert(first.preview.core.result.events.some(e=>e.type==='unit_move_resolved'));
    await commit('player2','zeratul-end',{actionType:'finish_activation',pieceId:'zeratul'},{});
    const journal=await native.store.loadReplayBundle(roomId);
    const receipts=journal.privateJournal.filter(x=>x.payload.type==='accepted_transition').map(x=>x.payload.payload.receipt);
    const prefixState=native.engine.replay({initialEnvelope:journal.initialEnvelope,journal:receipts.slice(0,2)});
    assert(prefixState.ok); const state=prefixState.envelope.state;assert(hidden(state));
    const threshold=runtime.bundle.routes.find(r=>r.definitionId===detection).rangeMilliInches;assert.equal(threshold,6000);
    const samples=[threshold+3,threshold,threshold-3].map(gap=>{
      const x=firstXAtGap(state,gap), actualGap=edgeGap(state,x), detected=projection(runtime,state,x);
      assert.equal(actualGap,gap);assert.equal(detected,gap<=threshold);
      return {x,gap:actualGap,detected};
    });
    await commit('player1','raven-move',{actionType:'move',pieceId:'raven'},move('raven',samples[1].x,10000));
    await commit('player1','pass-reaction',{actionType:'pass_reaction_family_window'},{});
    await commit('player2','nerazim-reaction',{actionType:'resolve_reaction_family_ability'},{paymentCardInstanceIds:[]});
    await commit('player1','raven-end',{actionType:'finish_activation',pieceId:'raven'},{});
    const final=await native.store.loadRoom(roomId),end=final.envelope.state;
    assert.equal(hidden(end),false);assert.equal(end.activeSideKey,'player2');
    assert.equal(end.officialDetectionHiddenLossHistory.length,1);
    assert(end.officialDetectionHiddenLossHistory[0].detectingSources.some(r=>r.definitionId===detection));
    assert.equal(end.officialReactionHistory.filter(r=>r.definitionId===might).length,1);
    const ref=await save(prefix+'/result.json',{definition:detection,samples,hiddenBefore:true,hiddenAfter:false,
      reaction:might,revision:final.stateRevision,successor:end.activeSideKey,stateHash:final.envelope.stateHash});
    return {evidenceRef:ref,checkpointRef:ref};
  }finally{native.close();}
}
async function runShot(product) {
  const movement=await openBranch(product,'detection');
  try {
    const last=await movement.native.store.loadRoom(movement.roomId);const state=structuredClone(last.envelope.state);
    state.phase='assault';state.activeSideKey='player1';state.firstPlayerSideKey='player1';delete state.selectedRosterActivationWindow;
    state.phaseFirstActorByRound['1:assault']={round:1,phase:'assault',chosenFirstActorSideKey:'player1'};
    await registerScene(product,movement.context,'railguns',refreshOfficialReleaseRosterDerivedStateV2({context:movement.context,state}),
      {declaredAssaultPhase:true,sourceRevision:last.stateRevision,sourceStateHash:last.envelope.stateHash,fullMatch:false});
  }finally{movement.native.close();}
  const {native,runtime,roomId,authority,directory,prefix}=await openBranch(product,'railguns');
  try{
    const seats=await native.create(roomId,authority);
    const shot=await commitWave3RangedBatchV1({directory,native,runtime,roomId,credentials:seats,attackerSideKey:'player1',
      attackerPieceId:'raven',targetPieceId:'zeratul',weaponName:'Railguns',operationKey:'shot',selectPoolParameters:poolParameters});
    assert.equal(shot.event.stages.hit.dice,4);assert.deepEqual(shot.event.stages.hit.thresholdByDieIndex,[3,3,3,3]);
    assert.equal(shot.event.stages.damage.damagePerDie,1);
    if(shot.after.envelope.state.pendingCurrentProductRangedSequence)
      await native.commit({roomId,credential:seats.player1,operationKey:'finish-sequence',kind:'finite',choice:{actionType:'finish_ranged_attack_sequence'}});
    await native.commit({roomId,credential:seats.player1,operationKey:'end-shot',choice:{actionType:'finish_activation',pieceId:'raven'},parameters:()=>({})});
    const end=await native.store.loadRoom(roomId);assert.equal(end.envelope.state.activeSideKey,'player2');
    const ref=await save(prefix+'/result.json',{definition:railguns,phaseDeclared:true,queryEqualsRoomPreview:true,
      target:shot.event.targetId,distanceInches:shot.event.stages.declaration.distanceInches,
      hit:shot.event.stages.hit,damage:shot.event.stages.damage,revision:end.stateRevision,successor:end.envelope.state.activeSideKey,
      stateHash:end.envelope.stateHash});return {evidenceRef:ref,checkpointRef:ref};
  }finally{native.close();}
}
const repairRef=process.argv.find(a=>a.startsWith('--repair-ref='))?.slice(13);
await runProductBoundaryCheck({directory:path.join(root,evidence,'verification'),
  identity:{factoryModule:'packages/product-composition/official-release-roster-state-v2.mjs',
    factoryExport:'createOfficialReleaseRosterStateV2',sourceRef,contractVersion:'tabletop-detection-railguns-v1'},
  steps:[{name:'compile',repairRef,openProduct:registry,check:async product=>{
    const context=await sourceContext(product), state=await createMovementState(context);
    const geom=state.officialModelBaseGeometryDataBundle.profiles.find(p=>p.recordKey==='army_units:raven');
    assert.equal(geom.ravenOutlineSource.kind,'annotated_assembly_estimate');assert.equal(geom.localVerticesMilliInches.length,28);
    const ref=await registerScene(product,context,'detection',state,{declaredMovementPositions:true,fullMatch:false});
    return {evidenceRef:ref,checkpointRef:ref};}},
    {name:'consume',repairRef,openProduct:registry,check:runMovement},
    {name:'successor',repairRef,openProduct:registry,check:runShot},
    {name:'coldRecovery',repairRef,openProduct:registry,check:product=>coldReplay(product,['detection','railguns'])}]});
