// Concrete B recovery: a follow-up argument error was attributed to the
// successful scenario, then the paid correction supplied scenario without spec.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createRosterTeachEvidencePortV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import {recoverRosterTeachQueriesV1} from '../packages/roster-strategist/roster-teach-query-recovery-v1.mjs';
const base=process.argv[2];
const d=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/roster-deliberation-live-v43/workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json','utf8'));
const captured=d.teachFramework.state.queryRecovery.operations.find(o=>o.originalQueryId==='q-opponent-branch-h1-placement-v4');
assert.equal(captured.result.unknownReasonCode,'PREGAME_LAB_BRANCH_SPEC_INVALID');
assert.equal(captured.currentFailure.unknownReasonCode,'SCENE_QUERY_OUTER_ARGUMENTS_UNBOUND');
assert.equal(captured.currentFailure.queryRepair.failedFollowUpIndices[0],0);
const source=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const piece=source.pieces.find(p=>p.isOnField&&p.models.length===1),model=piece.models[0];
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const lab=createPregameSceneLaboratoryV1({sourceState:source,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(source.officialUnitCompositionUpgradeDataBundle)}),
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(){return{candidates:[],parameterDomains:[],searchSuggestions:[]};},
    instantiate(){throw Error('No action');},apply(){throw Error('No mutation');}}});
const port=createRosterTeachEvidencePortV1(lab);
const scope={mutationAuthority:false,initialFoundationHash:'b'.repeat(64),sourceHashes:['c'.repeat(64)]};
const spec={kind:'hypothetical_geometry',phase:'movement',activeSideKey:'player1',isolateToPlacedPieces:true,clearTerrain:false,
  placements:[{pieceId:piece.id,modelPositions:[{modelId:model.id,xInches:model.xInches,yInches:model.yInches,
    rotationDegrees:model.baseRotationDegrees,elevation:model.elevation,supportTerrainIds:model.supportTerrainIds,
    adjacentAccessPointIds:model.adjacentAccessPointIds}]}]};
const request={kind:'scenario',toolRequest:{spec,followUps:captured.originalRequest.toolRequest.followUps}};
const original=JSON.stringify(request);
const result=await port.query({...scope,challengeId:'captured-followup-location',request});
const failures=[];
const check=(condition,message)=>{if(!condition)failures.push(message);};
check(result.queryRepair?.failureTargets?.[0]?.requestPointer==='/toolRequest/followUps/0','failed child needs its exact request pointer');
check(result.queryRepair?.unboundArgumentFields?.includes('targetIds'),'child unbound fields must not be read from parent scenario');
check(result.queryRepair?.requiredArgumentContainerAppliesAt==='/toolRequest/followUps/0','argumentsJson contract must be scoped to the child');
check(result.queryRepair?.scenarioContinuation?.branchIdRef==='captured-followup-location','successful parent branch handle must remain usable');
assert.equal(JSON.stringify(request),original);
const malformed=await port.query({...scope,challengeId:'paid-missing-spec',request:captured.request});
check(malformed.unknownReasonCode==='PREGAME_LAB_BRANCH_SPEC_INVALID'&&malformed.queryRepair?.correctable===true,
  'actual malformed paid correction must offer typed scenario-spec correction');
const repaired={kind:'scenario',toolRequest:{spec,followUps:request.toolRequest.followUps.map(f=>({kind:'spatial',
  queryKind:f.queryKind,argumentsJson:JSON.stringify({targetIds:f.targetIds})}))}};
// Same defect's recovery seam: a saved paid malformed request re-evaluated under
// the fixed contract must continue within its existing bound, not close again.
// Keep the paid malformed request SHAPE while binding its selectors to the
// minimized single-model scene, so scope preservation tests the same objects.
const minimizedBad={kind:'scenario',toolRequest:{queryKind:'space.inspect_relationships',argumentsJson:JSON.stringify({
  subjectUnitIds:[piece.id],targetIds:request.toolRequest.followUps[0].targetIds})}};
const oldChoice={...captured.choice,kind:minimizedBad.kind,toolRequestJson:JSON.stringify(minimizedBad.toolRequest)};
const op={...structuredClone(captured),originalQueryId:'original-child',questionId:'question',queryId:'saved-correction',
  request:minimizedBad,choice:oldChoice,choices:[oldChoice],
  originalRequest:request,originalResult:result,result:{...captured.result,evidencePortDescriptorHash:'d'.repeat(64)}};
const state={agenda:{questions:[{questionId:'question',evidenceRequest:request}]},evidence:[],
  investigation:{operations:[{queryId:'original-child',questionId:'question',request}],evidence:[{...result,challengeId:'original-child'}]},
  queryRecovery:{selection:{queryIds:['original-child'],reexecuteSavedQuery:true},operations:[op]}};
let asks=0;
await recoverRosterTeachQueriesV1({state,plan:{},context:{},sourceHash:'c'.repeat(64),evidencePort:port,completedBeforeRun:true,
  checkpoint:async()=>{},ask:async()=>{asks++;return{disposition:'retry',kind:'scenario',toolRequestJson:JSON.stringify(repaired.toolRequest),publicReason:'Scripted correction of actual failed child only'};}});
check(asks===1,'reclassified saved paid failure must continue once rather than return completed');
check(op.choices.length===2&&op.maximumAttempts===3,'retain paid attempt and original maximum');
check(op.result.status==='advisory','corrected child query must actually execute');
assert(lab.proveMutationZero().sourceStateHashUnchanged);
assert.deepEqual(failures,[]);
console.log(JSON.stringify({status:'PASS',actualNestedFailureLocated:true,scenarioNotReinterpretedAsNativeArgs:true,
  malformedPaidReplyCorrectable:true,retainedPaidFailureContinues:true,originalAttemptsRetained:true,
  providerCalls:0,roomActions:0,actualFullBGeometryOrModelSuccessProven:false}));
