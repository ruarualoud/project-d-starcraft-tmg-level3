import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadWave4TurretInputs, bindWave4TurretRoom } from './support/wave4-turret-room-v1.mjs';
import { createStarcraftTmgLevel3HttpAdapter } from '../packages/http-adapter/handler-v1.mjs';
import { createRosterWorkspaceServerV1 } from './serve-ticket-27-slice-271-roster-workspace-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { loadWave4VirusEffectsInputs } from './compile-wave4-virus-effects.mjs';
import { loadWave4StukovUnitInputs } from './compile-wave4-stukov-units.mjs';
import { loadWave4StukovUnitInputsV2 } from './compile-wave4-stukov-units-v2.mjs';
import { loadWave4StukovUnitInputsV3 } from './compile-wave4-stukov-units-v3.mjs';
import { loadWave4TalDarimThresholdInputs } from './compile-wave4-tal-darim-threshold.mjs';
import { loadWave4AddedCardInputs } from './compile-wave4-added-cards.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const sourceResult=await read(path.resolve(process.argv[2]));
assert.ok(sourceResult.status==='passed_scoped'||sourceResult.schema==='starcraft_tmg_wave4_detonation_ranged_host_v1'&&sourceResult.status==='passed_scoped_ranged_host_only'
 ||sourceResult.schema==='starcraft_tmg_wave4_detonation_nested_host_v1'&&sourceResult.status==='passed_scoped_melee_hits_nested');
const directory=path.resolve(process.argv[3]);
assert.ok(directory.startsWith(path.join(root,'build/wave4-web')+path.sep));
const webRoot=process.argv[4]?path.resolve(process.argv[4]):path.join(root,'apps/starcraft-tmg-expo/dist-product');
if(process.argv[4])assert.ok(webRoot.startsWith(path.join(root,'build/wave4-web')+path.sep));
const delayedSource=['starcraft_tmg_wave4_detonation_delayed_v1','starcraft_tmg_wave4_detonation_delayed_control_web_source_v1'].includes(sourceResult.schema);
const stormPhotonSource=['starcraft_tmg_wave4_detonation_storm_v1','starcraft_tmg_wave4_detonation_photon_v1'].includes(sourceResult.schema);
const disengageSource=sourceResult.schema==='starcraft_tmg_wave4_detonation_disengage_v1';
const consumeSource=sourceResult.schema==='starcraft_tmg_wave4_consume_web_source_v1';
const talDarimSource=sourceResult.schema==='starcraft_tmg_wave4_tal_darim_threshold_v1';
const addedCardSource=['starcraft_tmg_wave4_added_card_active_v1','starcraft_tmg_wave4_added_status_reactions_v1'].includes(sourceResult.schema);
const baseInputs=addedCardSource?await loadWave4AddedCardInputs(root):talDarimSource?await loadWave4TalDarimThresholdInputs(root):stormPhotonSource||disengageSource||consumeSource?await loadWave4StukovUnitInputsV3(root):sourceResult.schema==='starcraft_tmg_wave4_detonation_target_v1'||delayedSource?await loadWave4StukovUnitInputsV2(root):['starcraft_tmg_wave4_stukov_infestation_native_v1','starcraft_tmg_wave4_plagued_munitions_v1',
   'starcraft_tmg_wave4_infested_infantry_base_wiring_v1','starcraft_tmg_wave4_detonation_ranged_host_v1','starcraft_tmg_wave4_detonation_nested_host_v1',
   'starcraft_tmg_wave4_bio_kill_switch_v1','starcraft_tmg_wave4_corrode_web_source_v1','starcraft_tmg_wave4_detonation_template_v1','starcraft_tmg_wave4_detonation_outside_v1','starcraft_tmg_wave4_detonation_overwatch_v1','starcraft_tmg_wave4_overwatch_coexistence_v1','starcraft_tmg_wave4_detonation_khassar_web_source_v1','starcraft_tmg_wave4_detonation_declaration_v1'].includes(sourceResult.schema)?await loadWave4StukovUnitInputs(root)
  :sourceResult.schema==='starcraft_tmg_wave4_virus_creep_native_v1'?await loadWave4VirusEffectsInputs(root):await loadWave4TurretInputs(root);
const rooms=new Map();
let droneInputs;
const service={liveEnabled:false,scope:'Wave4 source-bound Native successors; scoped local Web acceptance',rooms:[]};
const specs=process.argv[5]?await read(path.resolve(process.argv[5])):[
  {id:'infected-ordinary-move',initial:true},
  {id:'clean-blink',initial:true},
  {id:'clean-recall',initial:true},
  {id:'growing-restoration-exception',definitionId:'unit:infested_missile_turret/infestation-any-phase@1'},
];
assert.ok(Array.isArray(specs)&&specs.length&&specs.every(spec=>typeof spec.id==='string'&&(spec.initial||typeof spec.definitionId==='string')));
for(const spec of specs) {  const proof=sourceResult.results.find(row=>row.id===(spec.sourceCaseId||spec.id)||row.definitionId==='card:'+spec.id+'/stukov-s-creep-any@1');
  assert.ok(proof?.coldReplay);
  const inputs=delayedSource&&proof.kind==='drone'
    ?(droneInputs ||= await loadWave4StukovUnitInputsV3(root)):baseInputs;
  const sourceDirectory=path.join(root,proof.directoryRef||proof.runRef);
  assert.ok(sourceDirectory.startsWith(path.join(root,'build/wave4-web')+path.sep));
  const sourceAuthority=await read(path.join(sourceDirectory,'authority.json'));
  const scope=await read(path.join(sourceDirectory,'scope.json'));
  const source=await bindWave4TurretRoom({inputs,state:sourceAuthority.state,...scope,
    directory:path.join(directory,'source-bindings',spec.id)});
  const nativeSource=source.open({readOnly:true,directory:sourceDirectory});
  let prefix,prefixReceipts,sourceDisengagePlan,sourceConsumeParameters,sourceParameters,sourceStandardMoveParameters;
  try {
    await nativeSource.restoreDependencies(proof.roomId,sourceAuthority);
    const bundle=await nativeSource.store.loadReplayBundle(proof.roomId);
    const journal=bundle.privateJournal.filter(row=>row.payload.type==='accepted_transition').map(row=>row.payload.payload.receipt);
    if(addedCardSource){
      const unwrap=action=>{while(action.sourceAction||action.attackAction)action=action.sourceAction||action.attackAction;return action;},
        actions=journal.map(r=>unwrap(r.action)),producer=actions.find(a=>a.definitionId===spec.definitionId);
      sourceParameters=producer?.characteristicStatusPlan?.canonicalParameters||producer?.relocationPlan?.canonicalParameters||producer?.battlefieldAssetPlan?.canonicalParameters||producer?.reactionPlan?.canonicalParameters;
      sourceStandardMoveParameters=actions.find(a=>a.actionType==='move'&&a.pieceId==='actor')?.spatialPlan?.canonicalParameters;
      assert.ok(sourceParameters&&sourceStandardMoveParameters,'ADDED_CARD_SIGNED_INTENT_PARAMETERS_REQUIRED');
    }
    if(spec.flow==='detonation-disengage-initiation'){let a=journal.find(r=>r.action.actionType==='disengage')?.action;while(a&&!a.spatialPlan)a=a.sourceAction;sourceDisengagePlan=a?.spatialPlan;assert.equal(sourceDisengagePlan?.spatialPlanHash,proof.originalPlanHash);}
    if(['consume-plague-initiation','consume-dark-swarm-initiation'].includes(spec.flow)){
      let a=journal.find(r=>r.action.actionType===(spec.flow==='consume-plague-initiation'?'cast_plague':'resolve_reaction_family_ability')
        &&JSON.stringify(r.action).includes(spec.definitionId))?.action;
      while(a&&!a.plaguePlan&&!a.reactionPlan)a=a.sourceAction;
      sourceConsumeParameters=a?.plaguePlan?.canonicalParameters||a?.reactionPlan?.canonicalParameters;assert.ok(sourceConsumeParameters?.sacrificeModelId);
    }
    const hintedPrefix=spec.minimumSourceRevision??(spec.minimumContinuationDepth?proof.trace?.find(row=>row.stackDepth>=spec.minimumContinuationDepth)?.revision-1:0);
    for(let count=Number.isSafeInteger(hintedPrefix)?hintedPrefix:0;count<=journal.length;count++) {
      const replay=nativeSource.engine.replay({initialEnvelope:bundle.initialEnvelope,journal:journal.slice(0,count)});
      assert.equal(replay.ok,true);
      if((!spec.minimumContinuationDepth||(replay.envelope.state.officialBeforeCasualtyContinuations?.length||0)>=spec.minimumContinuationDepth)
       &&(spec.initial || (spec.requiredPendingKey?Boolean(replay.envelope.state[spec.requiredPendingKey]):
        source.runtime.enumerate(replay.envelope.state,{matchBinding:replay.envelope.matchBinding}).parameterDomains.some(row=>row.definitionId===spec.definitionId)))) {
        prefix=replay.envelope;prefixReceipts=count;break;
      }
    }
  } finally {nativeSource.close();}
  assert.ok(prefix,'SIGNED_VIRUS_PREFIX_REQUIRED:'+spec.id);
  const roomDirectory=path.join(directory,'rooms',spec.id);
  const generatedPrefix=scope.roundControl&&prefix.state.pieces.some(p=>!sourceAuthority.state.pieces.some(prior=>prior.id===p.id));
  const bound=await bindWave4TurretRoom({inputs,state:prefix.state,...scope,directory:roomDirectory,humanConfirmed:true,
    ...(consumeSource||addedCardSource?{humanParameterConstraints:true}:{}),
    ...(generatedPrefix?{runtimeInitialState:sourceAuthority.state,expectedNativeRuntimeHash:source.runtime.descriptor.runtimeHash}:{}),
    scenario:{...scope.scenario,kind:'web_from_signed_native_virus_prefix',sourceRoomId:proof.roomId,
      sourceStateHash:prefix.stateHash,sourceBindingHash:prefix.matchBindingHash,sourcePrefixReceipts:prefixReceipts}});
  const native=bound.open();
  const roomId='product-wave4-web-'+spec.id;
  const credentials=await native.create(roomId,bound.authority);
  const adapter=createStarcraftTmgLevel3HttpAdapter({roomRuntime:native.room,assetRoot:root});
  rooms.set(roomId,{native,adapter});
  const links={};
  for(const side of ['player1','player2']) {
    const issued=await native.room.issueSeatRecovery({roomId,seatToken:credentials[side].seatToken});
    assert.equal(issued.ok,true);links[side]='/room/'+roomId+'#recovery='+encodeURIComponent(issued.recovery.recoveryToken);
  }
  const originalResolutionHash=proof.originalResolutionHash||(['detonation-overwatch','detonation-khassar','detonation-declaration','detonation-template','detonation-target','detonation-delayed','detonation-storm-photon'].includes(spec.flow)?proof.frames?.[0]?.rows?.[0]?.attackResolutionHash:null);
  service.rooms.push({...spec,kind:spec.id,roomId,links,sourcePrefixReceipts:prefixReceipts,
    ...(addedCardSource?{sourceParameters,sourceStandardMoveParameters}:{}),
    ...(sourceConsumeParameters?{expectedConsumeParameters:sourceConsumeParameters,expectedCasterId:'defiler',expectedAttackTargetId:'victim',
      expectedCastTargetId:spec.flow==='consume-plague-initiation'?'target':null}:{}),
    ...(spec.flow==='detonation-delayed'?{delayedKind:proof.kind,originalSourceId:proof.sourceId}:{}),
    ...(['detonation-disengage','detonation-disengage-initiation'].includes(spec.flow)?{disengageKind:proof.kind,expectedOriginalPlanHash:proof.originalPlanHash,
      expectedCasualtyModelIds:proof.frames[0].rows[0].casualty.casualtyModelIds,expectedSurvivorModelIds:proof.frames[0].rows[0].casualty.remainingModelIds,
      ...(sourceDisengagePlan?{expectedDisengageParameters:sourceDisengagePlan.canonicalParameters}:{}),
      expectedActorLocations:prefix.state.pieces.find(p=>p.id==='actor').models.map(m=>{const target=sourceDisengagePlan?.finalModelPositions.find(p=>p.modelId===m.id);return{id:m.id,xInches:target?target.xMilliInches/1000:m.xInches,yInches:target?target.yMilliInches/1000:m.yInches};})}:{}),
    ...(spec.flow==='detonation-storm-photon'?{continuationKind:proof.kind,originalSourceId:proof.kind==='storm'?'actor':null,counterTargetId:'defender',expectedOriginalSourcePlanHash:proof.originalSourcePlanHash}:{}),
    ...(originalResolutionHash?{expectedOriginalResolutionHash:originalResolutionHash}:{}),
    sourceRoomId:proof.roomId,sourceStateHash:prefix.stateHash,sourceBindingHash:prefix.matchBindingHash});
}
const reply=(response,status=200)=>({status,headers:{'content-type':'application/json'},response});
const server=await createRosterWorkspaceServerV1({root,webRoot,
  dataDirectory:directory,lazyWorkspace:true,liveEnabled:false,port:5484,
  productHandler:async request=>{
    const roomId=request.pathname.match(/\/rooms\/([^/]+)/)?.[1];
    const item=rooms.get(roomId);
    if(request.pathname.endsWith('/product/v1/catalogue'))return reply({ok:true,presets:[],setups:[],modes:['human_vs_human'],map:{}});
    if(request.pathname.endsWith('/product/v1/rooms'))return reply({ok:true,rooms:[]});
    if(!item)return request.pathname.startsWith('/starcraft-tmg-level3/')||request.pathname.startsWith('/__')
      ?reply({ok:false,reason:'OFFLINE_VIRUS_SCOPE_ONLY'},404):null;
    if(request.pathname.endsWith('/revision')) {
      const current=await item.native.store.loadRoom(roomId);
      return reply({ok:true,roomId,stateRevision:current.stateRevision,stateHash:current.envelope.stateHash});
    }
    if(request.pathname.endsWith('/provider-key'))return request.method==='GET'
      ?reply({ok:true,provider:{configured:false,usedFor:[],liveEnabled:false}}):reply({ok:false,reason:'LIVE_PROVIDER_DISABLED'},409);
    if(request.pathname.startsWith('/starcraft-tmg-level3/api/v1/'))return item.adapter.handle(request);
    return reply({ok:false,reason:'OFFLINE_VIRUS_SCOPE_ONLY'},404);
  }});
service.origin=server.origin;
await atomicWrite(path.join(directory,'service.private.json'),JSON.stringify(service,null,2)+'\n');
console.log(JSON.stringify({status:'ready',origin:server.origin,rooms:service.rooms.length,liveEnabled:false}));
const shutdown=()=>{for(const item of rooms.values())item.native.close();server.close?.();process.exit(0);};
process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
