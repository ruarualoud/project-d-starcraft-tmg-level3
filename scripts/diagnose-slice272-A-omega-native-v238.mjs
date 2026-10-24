// Read-only A investigation. Reuse its saved complete formations on the same
// frozen map, but ask the opponent's conditional Movement action domain.
// No Provider, real Room, roster/Plan write, or re-execution of old paid turns.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createInterface} from 'node:readline';
import {gzipSync} from 'node:zlib';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {createOfficialStandardRoomInitialStateAuthorityV1,OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1,OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV1} from '../packages/product-composition/official-current-product-match-runtime-v1.mjs';
import {createOfficialCurrentProductMatchRuntimeV6} from '../packages/product-composition/official-current-product-match-runtime-v6.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
const [base]=process.argv.slice(2);assert.ok(base);
const directory=base+'/A/omega-native-v238';
await fs.mkdir(directory,{recursive:false,mode:0o700});
const report={startedAt:new Date().toISOString(),pid:process.pid,status:'preparing',
  providerCalls:0,sourceDraftWrites:0,liveRoomActions:0,nativeAttempts:0,nativeActions:0,
  conditionalSceneOnly:true,trainingTruth:false,operations:[]};
const write=async(name,value)=>fs.writeFile(directory+'/'+name,JSON.stringify(value,null,2),{mode:0o600});
const save=async()=>{report.updatedAt=new Date().toISOString();await write('progress.private.json',report);};
let original,filename,lab;
try{
  await save();
  const cfg=JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
  const row=cfg.rows.find(r=>r.arm==='A');filename=row.dataDirectory+'/drafts/'+row.sessionId+'.json';
  original=await fs.readFile(filename,'utf8');const draft=JSON.parse(original);
  const selected=draft.lockedRoster.lock.candidateInput;
  const old=draft.teachFramework.state.investigation.evidence.find(e=>e.challengeId==='q2-omega-worm-conditional-scene').sourceReceipt;
  report.planHash=JSON.parse(draft.planSerialized).planHash;
  report.oldScene={receiptHash:old.receiptHash,actuallyPlacedIds:old.hypotheticalPlacements.map(p=>p.pieceId),
    activeSideKey:'player1',provesWormCreation:false};
  const source=await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:cfg.fixtureRoot});
  const recipe={factionRecordKey:selected.factionRecordKey,tacticalCardRecordKeys:selected.tacticalCardRecordKeys,
    units:selected.units.map(u=>({unitInstanceId:u.unitInstanceId,recordKey:u.recordKey,
      compositionKind:u.compositionKind,upgradeNames:u.upgrades.map(v=>v.upgradeName)}))};
  const authority=createOfficialStandardRoomInitialStateAuthorityV1({dataset:source.dataset,snapshot:source.snapshot,
    serverSeatPlan:['player1','player2'].map(sideKey=>({label:sideKey,seatKey:sideKey,roleMode:'supervisor',principalType:'human'})),
    roomId:'ticket27-slice-271-roster-workspace-isolated-lab',
    recipes:{...structuredClone(OFFICIAL_STANDARD_2000_ROOM_RECIPES_V1),[selected.sideKey]:recipe},
    armySpendPolicy:OFFICIAL_STANDARD_ROOM_UNSPENT_LOST_POLICY,
    missionRecordKey:draft.teachFramework.context.setup.missionBinding.missionRecordKey,
    deploymentRecordKey:draft.teachFramework.context.setup.missionBinding.deploymentRecordKey,
    mapConfiguration:JSON.parse(await fs.readFile(cfg.mapConfigurationFile,'utf8'))});
  assert.equal(hash(authority.state),old.sourceStateHash,'Must be the exact original A frozen source');
  const runtime=createOfficialCurrentProductMatchRuntimeV6({legacyRuntime:createOfficialCurrentProductMatchRuntimeV1({dataset:source.dataset,state:structuredClone(authority.state)})});
  lab=createPregameSceneLaboratoryV1({laboratoryId:'ticket27-s271-roster-workspace-lab',sourceState:authority.state,
    sourceRoomRef:{roomId:'ticket27-slice-271-roster-workspace-isolated-lab',stateRevision:0},
    rulesRuntime:runtime,matchBinding:authority.matchBinding,
    armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:authority.state.officialUnitCompositionUpgradeDataBundle})});
  const spec={kind:'hypothetical_geometry',phase:'movement',activeSideKey:'player2',isolateToPlacedPieces:false,clearTerrain:false,
    placements:old.hypotheticalPlacements.map(p=>({pieceId:p.pieceId,xInches:p.xInches,yInches:p.yInches,modelPositions:p.modelPositions}))};
  const scene=lab.runScenarioBranch({branchId:'v238-opponent-movement-same-formations',spec});
  await write('scene.private.json',scene);
  let currentBase={kind:'branch',branchStateHash:scene.branchStateHash};
  let context=lab.describeQueryContext({base:currentBase,seatKey:'player2'});
  const saveContext=async(index)=>{
    await fs.writeFile(directory+`/context-${index}.private.json.gz`,gzipSync(JSON.stringify(context)),{mode:0o600});
    const domains=context.actionSpace.parameterDomains;
    await write('current-action-domain.private.json',{phase:context.phase,activeSideKey:context.activeSideKey,
      baseStateHash:context.baseStateHash,cardResources:context.cardResources,
      relevantDomains:domains.filter(d=>/omega|creep/i.test(d.abilityName||'')),
      domainSummary:domains.map(d=>({domainId:d.domainId,sideKey:d.sideKey,pieceId:d.pieceId,actionType:d.actionType,abilityName:d.abilityName})),
      finiteActions:context.actionSpace.finiteActions});
  };
  await saveContext(0);report.sourceStateHash=old.sourceStateHash;report.sceneStateHash=scene.branchStateHash;
  report.geometry=scene.hypotheticalPlacementAssessment;report.status='awaiting_native_parameters';await save();
  console.log(JSON.stringify({status:report.status,pid:process.pid,directory}));
  const reader=createInterface({input:process.stdin,crlfDelay:Infinity});
  for await(const line of reader){
    if(!line.trim())continue;
    const input=JSON.parse(line);if(input.command==='finish')break;
    assert.equal(input.command,'native_action');assert.ok(report.nativeAttempts<3,'MAX_THREE_EXPLICIT_NATIVE_ATTEMPTS');
    report.nativeAttempts++;report.status='executing_native';await save();
    const request={branchId:`v238-native-${report.nativeAttempts}`,base:currentBase,seatKey:'player2',spec:{kind:'native_action'},
      argumentsJson:JSON.stringify(input.arguments)};
    await write(`request-${report.nativeAttempts}.private.json`,request);
    try{
      const receipt=lab.runScenarioBranch(request);await write(`receipt-${report.nativeAttempts}.private.json`,receipt);
      report.nativeActions++;report.operations.push({receiptHash:receipt.receiptHash,resultStatus:receipt.resultStatus,
        branchStateHash:receipt.branchStateHash,nativeEvents:receipt.nativeEvents});
      currentBase={kind:'branch',branchStateHash:receipt.branchStateHash};
      context=lab.describeQueryContext({base:currentBase,seatKey:'player2'});await saveContext(report.nativeAttempts);
      report.status='awaiting_native_parameters';
    }catch(error){report.operations.push({failure:String(error.stack||error.message),code:error.code});report.status='native_parameters_rejected';}
    await save();console.log(JSON.stringify({status:report.status,nativeAttempts:report.nativeAttempts,nativeActions:report.nativeActions}));
  }
  report.status='completed';
}catch(error){report.status='stopped';report.failure=String(error.stack||error.message);process.exitCode=1;}
finally{
  if(lab)report.sourceMutationProof=lab.proveMutationZero();
  if(filename&&original)report.originalDraftUnchanged=hash(await fs.readFile(filename,'utf8'))===hash(original);
  report.finishedAt=new Date().toISOString();await save();console.log(JSON.stringify({status:report.status,failure:report.failure}));
}
