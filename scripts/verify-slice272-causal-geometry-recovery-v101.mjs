// Reproduce B's actual overlap routed to followUps, and its paid unchanged
// coordinates closing recovery early. No Provider, Room action or old gate.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createRosterTeachEvidencePortV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import {recoverRosterTeachQueriesV1} from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const base=process.argv[2];
const d=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json','utf8'));
const captured=d.teachFramework.state.queryRecovery.operations.find(o=>o.originalQueryId==='q-capability-demand-2-4-reach-scenario-v4');
const overlap=captured.previousResults?.find(r=>r.sourceReceipt?.hypotheticalPlacementAssessment?.units?.some(u=>u.resultStatus!=='ok')) || captured.result;
assert(overlap.sourceReceipt.hypotheticalPlacementAssessment.units.some(u=>u.unknownReason?.startsWith('MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP')));
assert.equal(captured.choices.length>=2,true);
const source=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const pieces=source.pieces.filter(p=>p.isOnField&&p.models.length===1).slice(0,2);
assert.equal(pieces.length,2);
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const lab=createPregameSceneLaboratoryV1({sourceState:source,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(source.officialUnitCompositionUpgradeDataBundle)}),
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(){return{candidates:[],parameterDomains:[],searchSuggestions:[]};},
    instantiate(){throw Error('No action');},apply(){throw Error('No mutation');}}});
const port=createRosterTeachEvidencePortV1(lab);
const scope={mutationAuthority:false,initialFoundationHash:'b'.repeat(64),sourceHashes:['c'.repeat(64)]};
const placements=pieces.map(p=>({pieceId:p.id,modelPositions:p.models.map(m=>({modelId:m.id,xInches:m.xInches,yInches:m.yInches,
  rotationDegrees:m.baseRotationDegrees,elevation:m.elevation,supportTerrainIds:m.supportTerrainIds,adjacentAccessPointIds:m.adjacentAccessPointIds}))}));
const bad=structuredClone(placements);
bad[1].modelPositions[0].xInches=bad[0].modelPositions[0].xInches;
bad[1].modelPositions[0].yInches=bad[0].modelPositions[0].yInches;
const makeRequest=ps=>({kind:'scenario',toolRequest:{spec:{kind:'hypothetical_geometry',phase:'movement',activeSideKey:'player1',
  isolateToPlacedPieces:true,clearTerrain:false,placements:ps},followUps:[{kind:'spatial',queryKind:'mission_marker_control',argumentsJson:'{}'}]}});
const request=makeRequest(bad), repaired=makeRequest(placements);
const result=await port.query({...scope,challengeId:'overlap-original',request});
const failures=[];
const check=(v,m)=>{if(!v)failures.push(m);};
assert(result.sourceReceipt.hypotheticalPlacementAssessment.units.some(u=>u.resultStatus!=='ok'));
check(result.queryRepair?.failureTargets?.some(t=>t.requestPointer.startsWith('/toolRequest/spec/placements/')),
  'native geometry failure must identify the scenario placement, not only followUps');
check(result.queryRepair?.scenarioContinuation?.requiresScenarioRebuild===true,
  'invalid scene cannot be repaired by reusing its branch and changing query arguments');
check(!/not toolRequest.spec/.test(result.queryRepair?.scenarioContinuation?.instruction||''),
  'repair must not falsely tell the model the failed spec is outside scope');
const state={agenda:{questions:[{questionId:'q',evidenceRequest:request}]},evidence:[],framework:{},
  investigation:{operations:[{queryId:'original',questionId:'q',request}],evidence:[{...result,challengeId:'original'}]},
  queryRecovery:{selection:{queryIds:['original']},operations:[]}};
let asks=0,executions=0,receivedRepeatFeedback=false;
await recoverRosterTeachQueriesV1({state,plan:{},context:{},sourceHash:'c'.repeat(64),completedBeforeRun:true,
  evidencePort:{descriptor:()=>port.descriptor(),query:async args=>{executions++;return port.query(args);}},checkpoint:async()=>{},
  ask:async(_kind,blocks)=>{
    asks++;
    if(asks===2)receivedRepeatFeedback=blocks.some(b=>b.result?.queryRepair?.unchangedRequest===true);
    return {disposition:'retry',kind:'scenario',toolRequestJson:JSON.stringify((asks===1?request:repaired).toolRequest),
      publicReason:asks===1?'Claims shifted geometry but returns unchanged coordinates, reproducing saved B':'Scripted actual coordinate correction, not a strategy choice'};
  }});
const op=state.queryRecovery.operations[0];
check(asks===2,'unchanged reply must consume its attempt and deliver feedback within the original bound, not close early');
check(receivedRepeatFeedback,'next correction needs explicit machine-checked unchanged-request feedback');
check(executions===2,'execute original diagnosis and genuinely changed query once each; never execute unchanged retry');
check(op.result?.status==='advisory','corrected minimized scene must actually query native control');
check(op.maximumAttempts===3&&op.choices.length===2,'no reset or unbounded attempts');
check(op.previousResults?.some(r=>r.unknownReasonCode==='ROSTER_TEACH_RECOVERY_REQUEST_UNCHANGED'),
  'retain failed unchanged paid choice as evidence');
assert(lab.proveMutationZero().sourceStateHashUnchanged);
assert.deepEqual(failures,[]);
console.log(JSON.stringify({status:'PASS',causalGeometryLocation:true,unchangedReplyContinuesBoundedly:true,
  nativeCorrectedScene:true,providerCalls:0,roomActions:0,fullBGeometryOrModelRepairProven:false}));
