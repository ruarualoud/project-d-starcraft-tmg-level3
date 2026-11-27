import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { loadWave4TurretInputs, createWave4TurretScene, createWave4LegacyOverwatchControlScene, bindWave4TurretRoom } from './support/wave4-turret-room-v1.mjs';
import { commitWave3RangedBatchV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { timingParameters } from './support/wave4-timing-room-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import { inspectOfficialAutoTurretOverwatchShotV1 } from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
import { readOfficialReviewedFireflySurgeSyntaxV1 } from '../packages/source-data/official-reviewed-firefly-syntax-v1.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputs = await loadWave4TurretInputs(root);
const parent = path.join(root, 'build/wave4-web/turret-combat');
await fs.mkdir(parent, { recursive: true });
const directory = await fs.mkdtemp(path.join(parent, 'run-'));
const runRef = path.relative(root, directory);
const results = [];
const legacyControl=process.argv.includes('--legacy-control');
const sourceRecord = inputs.dataset.recordsByKey['army_units:infested_missile_turret'];
const firefly = sourceRecord.payload.upgrades.find(feature => feature.name === 'Firefly Missiles');
const syntax = readOfficialReviewedFireflySurgeSyntaxV1(sourceRecord, firefly, 'Light. Armoured (D3)');
assert.ok(syntax);
assert.throws(() => readOfficialReviewedFireflySurgeSyntaxV1({ ...sourceRecord, payloadHash: '0'.repeat(64) }, firefly,
  'Light. Armoured (D3)'), /FIREFLY_REVIEWED_SYNTAX_SOURCE_MISMATCH/);
assert.equal(readOfficialReviewedFireflySurgeSyntaxV1({ ...sourceRecord, recordKey: 'army_units:marine' }, firefly,
  'Light. Armoured (D3)'), null);
for (const spec of [
  { id: 'auto-overwatch-control', kind: 'overwatch', use: true, autoControl: true },
  { id: 'ocular-use', kind: 'overwatch', use: true },
  { id: 'ocular-decline', kind: 'overwatch', use: false },
  { id: 'ocular-suppressed', kind: 'overwatch', use: false, suppress: true },
  { id: 'infestation-use', kind: 'infestation', use: true, restore: false },
  { id: 'infestation-supply-zero', kind: 'infestation', use: true, restore: false, zeroSupply: true },
  { id: 'infestation-restoration', kind: 'infestation', use: true, restore: true },
  { id: 'infestation-decline', kind: 'infestation', use: false },
].filter(spec=>legacyControl?spec.autoControl:!spec.autoControl)) {
  const scene = spec.autoControl?createWave4LegacyOverwatchControlScene(inputs):createWave4TurretScene(inputs, spec);
  const caseDirectory = path.join(directory,spec.id);
  const bound = await bindWave4TurretRoom({ inputs, ...scene, directory: caseDirectory });
  const { runtime, authority } = bound;
  const profile = scene.state.officialAttackProfileCatalogue.profiles.find(row => row.weaponName === 'Firefly Missiles');
  if(!spec.autoControl) {
  assert.deepEqual(profile.targetTags, ['flying']);
  assert.deepEqual(profile.surge.targetTags, ['armoured','light']);
  assert.equal(profile.surge.diceExpression,'D3');
  assert.equal(profile.rateOfAttack,8); assert.equal(profile.hitThreshold,4); assert.equal(profile.damage,1);
  assert.equal(profile.sourceSyntaxReview.reviewHash,syntax.reviewHash);
  } else assert.equal(runtime.descriptor.overwatchRuntime.runtimeVersion,'1.0.0');
  let native = bound.open();
  let expected;
  let result;
  const roomId = 'wave4-turret-' + spec.id;
  try {
    const credentials = await native.create(roomId,authority);
    const shoot = (side,piece,target,weapon,key) => commitWave3RangedBatchV1({ directory: caseDirectory,
      native,runtime,roomId,credentials,attackerSideKey: side,attackerPieceId:piece,targetPieceId:target,
      weaponName:weapon,operationKey:key,selectPoolParameters:timingParameters });
    if (spec.kind === 'overwatch') {
      const probe = inspectOfficialAutoTurretOverwatchShotV1(scene.state,{sourcePieceId:'turret',targetPieceId:'enemy'});
      assert.equal(probe.legal,!spec.suppress);
      await shoot('player2','enemy','actor','Railguns','enemy-railguns');
      await native.commit({ roomId, credential: credentials.player2, operationKey:'enemy-activation-end',
        select: row => row.actionType === 'finish_activation' && row.pieceId === 'enemy',parameters:()=>({}) });
      let after = await native.store.loadRoom(roomId);
      if (spec.suppress) assert.equal(Boolean(after.envelope.state.pendingOfficialAutoTurretOverwatch),false);
      else {
        assert.equal(after.envelope.state.pendingOfficialAutoTurretOverwatch.stage,'reaction');
        const menu = runtime.enumerate(after.envelope.state);
        const use = menu.parameterDomains.find(row => row.definitionId === (spec.autoControl?'unit:auto_turret/overwatch-assault-phase@1':'unit:infested_missile_turret/ocular-overwatch-assault-phase@1'));
        assert.ok(use,'OCULAR_REACTION_MISSING');
        assert.equal(use.constraints.resourceCostsByChoice.default.resourceType,spec.autoControl?'CP':'BM');
        assert.equal(use.constraints.resourceCostsByChoice.default.effectiveResourceCost,0);
        await native.commit({ roomId,credential:credentials.player1,operationKey:'ocular-choice',
          select: row => spec.use ? row.domainId===use.domainId : row.actionType==='pass_reaction_family_window',parameters:timingParameters });
        if (spec.use) await shoot('player1','turret','enemy',spec.autoControl?'Gauss Cannon':'Firefly Missiles','ocular-firefly');
      }
      after=await native.store.loadRoom(roomId);
      assert.equal(Boolean(after.envelope.state.pendingOfficialAutoTurretOverwatch),false);
      const shots = (after.envelope.state.rangedActionHistory||[]).filter(row=>row.pieceId==='turret');
      assert.equal(shots.length,spec.use?1:0);
      if(spec.use)assert.ok(after.envelope.state[spec.autoControl?'officialAutoTurretOverwatchHistory':'officialOcularOverwatchHistory'].some(row=>row.outcome==='ranged_attack_completed'));
      const resourceFacts=cards=>cards.map(card=>({id:card.cardInstanceId,readiness:card.readiness,
        resource:card.currentResource??card.resource,sourceRecordHash:card.sourceRecordHash}));
      assert.deepEqual(resourceFacts(after.envelope.state.cardResources.player1),resourceFacts(scene.state.cardResources.player1));
    } else {
      const ground=inspectOfficialAutoTurretOverwatchShotV1(scene.state,{sourcePieceId:'turret',targetPieceId:'recipient'});
      assert.equal(ground.legal,false);
      await shoot('player1','actor','fallen',spec.zeroSupply?'Autocannon':'Needle Spines','kill-infected-enemy');
      const casualty=await native.store.loadRoom(roomId);
      const fallen = casualty.envelope.state.pieces.find(row=>row.id==='fallen');
      assert.equal(fallen.isDestroyed,!spec.zeroSupply,'INFECTED_TRIGGER_MUST_MATCH_NATIVE_RESULT');
      assert.equal(fallen.currentSupply,0);
      const witness=casualty.envelope.state.pendingOfficialReactionWindow?.context.infestationWitness;
      assert.ok(spec.zeroSupply?witness?.supplyLossEntryHash:witness?.destroyed);
      assert.equal(casualty.envelope.state.pendingOfficialReactionWindow?.triggerKind,'infested_enemy_removed');
      let used=false, restored=false;
      for(let step=0;step<8;step++) {
        const current=await native.store.loadRoom(roomId);
        if(!current.envelope.state.pendingOfficialInfestationTransfer)break;
        const menu=runtime.enumerate(current.envelope.state);
        const choice=menu.parameterDomains.find(row=>spec.use&&!used&&row.effectKind==='infestation_transfer'
          || spec.restore&&row.definitionId==='unit:medic/restoration-any-phase@1');
        const domain=choice||menu.parameterDomains.find(row=>row.actionType==='pass_reaction_family_window');
        assert.ok(domain,'INFESTATION_SUCCESSOR_MISSING:'+JSON.stringify(menu));
        const parameters=timingParameters(domain);
        if(domain.effectKind==='infestation_transfer') {parameters.targetUnitId='recipient'; used=true;
          assert.ok(domain.parameterSchema.targetUnitId.enum.includes('recipient'));
          assert.ok(!domain.parameterSchema.targetUnitId.enum.includes('fallen'));
        }
        if(domain.definitionId==='unit:medic/restoration-any-phase@1')restored=true;
        await native.commit({ roomId,credential:credentials[current.envelope.state.activeSideKey],operationKey:'infestation-step-'+step,
          select:row=>row.domainId===domain.domainId,parameters:()=>parameters });
      }
      const after=await native.store.loadRoom(roomId);
      assert.equal(Boolean(after.envelope.state.pendingOfficialInfestationTransfer),false);
      const recipient=after.envelope.state.pieces.find(row=>row.id==='recipient');
      const infected=recipient.statuses.find(status=>String(status.statusName||status).toLowerCase()==='infestation');
      assert.equal(Boolean(infected),spec.use&&!spec.restore);
      if(infected)assert.equal(infected.statusKind,'DEBUFF');
      assert.equal(used,spec.use); assert.equal(restored,Boolean(spec.restore));
      assert.equal(after.envelope.state.activeSideKey,'player1');
    }
    expected=await native.store.loadRoom(roomId);
    result={...spec,roomId,sourceDefinitionIds:scene.sourceDefinitionIds,directoryRef:path.relative(root,caseDirectory),signedActions:expected.stateRevision,
      stateHash:expected.envelope.stateHash,runtimeHash:runtime.descriptor.runtimeHash,idempotencyVerified:true,coldReplay:false};
  } finally {native.close();}
  native=bound.open();
  try {
    await native.restoreDependencies(roomId,authority);
    const bundle=await native.store.loadReplayBundle(roomId);
    const journal=bundle.privateJournal.filter(row=>row.payload.type==='accepted_transition').map(row=>row.payload.payload.receipt);
    const replay=native.engine.replay({initialEnvelope:bundle.initialEnvelope,journal});
    assert.equal(replay.ok,true); assert.deepEqual(replay.envelope,expected.envelope);
    assert.deepEqual((await native.store.loadRoom(roomId)).envelope,expected.envelope);
    result.coldReplay=true;
  } finally {native.close();}
  results.push(result);
  console.log(JSON.stringify({case:spec.id,status:'passed',signedActions:result.signedActions}));
}
const result={schema:'starcraft_tmg_wave4_turret_combat_verification_v1',status:'passed_conditional_geometry',runRef,
  sourceDefinitionIds:legacyControl?results[0].sourceDefinitionIds:inputs.scope.definitionIds,syntaxReviewHash:syntax.reviewHash,results,
  verificationScope:legacyControl?'legacy_auto_turret_current_snapshot_control':'seven_turret_and_hostile_definitions',
  newGameAtoms:0,implementedCumulativeNewGameAtoms:3,sourceHeldDefinitions:39,estimatedRoundBaseMillimetres:80,
  officialPhysicalAuthority:false,nativeRoundTransitionVerified:false,fullMatchAdmission:false,webAcceptance:false,
  wave3PlayerRoomsTouched:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(directory,'result.json'),JSON.stringify(result,null,2)+'\n');
await atomicWrite(path.join(root,'docs/development/wave4/evidence/'+(legacyControl?'overwatch-compat':'turret-combat')+'.public.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,runRef,cases:results.length,signedActions:results.reduce((sum,row)=>sum+row.signedActions,0)}));
