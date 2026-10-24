// Actual v152 B sends a complete control schedule in inputs, not argumentsJson.
// Exercise shared Teach/direct/roster adapters, frozen mission, no model/actions.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import { canonicalRosterStrategistToolRequestV1 } from '../packages/roster-strategist/roster-strategist-runtime-v1.mjs';
const [base, reportPath] = process.argv.slice(2);
const cfg = JSON.parse(await fs.readFile(base+'/common-v79-plan-recovery-config.private.json','utf8'));
const row = cfg.rows.find(r=>r.arm==='B');
const draft = JSON.parse(await fs.readFile(row.dataDirectory+'/drafts/'+row.sessionId+'.json','utf8'));
const request = draft.teachFramework.state.investigation.operations
  .find(o=>o.queryId==='q1-math-baseline-schedule').request;
assert.equal(request.toolRequest.mathKind, 'mission_marker_schedule');
assert.equal(request.toolRequest.argumentsJson, undefined);
assert(Array.isArray(request.toolRequest.inputs.windows));
const state = JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
function freeze(v) { if(v&&typeof v==='object'&&!Object.isFrozen(v)){
  Object.values(v).forEach(freeze);Object.freeze(v); } return v; }
let nativeCalls=0;
const never=()=>{nativeCalls++;throw Error('NO_NATIVE_ACTIONS_ALLOWED');};
const lab=createPregameSceneLaboratoryV1({sourceState:state,
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate:never,instantiate:never,apply:never},
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({
    unitCompositionUpgradeDataBundle:freeze(state.officialUnitCompositionUpgradeDataBundle)})});
// Failure diagnostics normally enumerate spatial domains; this arithmetic-only
// reproduction does not test those domains. Keep the real queryMath/authority
// and evidence adapter, replacing only unrelated error-context discovery.
const port=createRosterTeachEvidencePortV1({...lab,
  describeQueryContext:()=>({arithmeticOnlyDiagnosticFixture:true})});
const scope={initialFoundationHash:'b'.repeat(64),sourceHashes:['c'.repeat(64)],mutationAuthority:false};
const checks=[],started=performance.now();
try{
  const original=structuredClone(request.toolRequest.inputs);
  if(!process.argv.includes('--remaining-feedback-only')){
  const teach=await port.query({...scope,challengeId:'v153-actual-B',request});
  assert.equal(teach.status,'advisory',teach.unknownReasonCode);
  checks.push('actual_B_complete_control_hypothesis_reaches_rules_calculator');
  const direct=lab.queryMath({queryId:'v153-direct',mathKind:'mission_marker_schedule',
    argumentsJson:JSON.stringify(original)});
  assert.deepEqual(teach.sourceReceipt.result,direct.result);
  assert.deepEqual(teach.sourceReceipt.requestNormalization,{kind:'typed_inputs_to_arguments_json_v1',
    sourceField:'inputs',semanticsChanged:false});
  assert.deepEqual(request.toolRequest.inputs,original);
  const normalized=canonicalRosterStrategistToolRequestV1(request);
  const roster=lab.queryMath({...normalized,queryId:'v153-roster'});
  assert.deepEqual(roster.result,direct.result);
  assert.equal(roster.result.provesFeasibleControlOrActualScore,false);
  assert.equal(roster.scoringPremisesVerified,false);
  checks.push('Teach_and_roster_match_canonical_query_without_strategy_change');
  const both=lab.queryMath({queryId:'v153-both',...request.toolRequest,
    argumentsJson:JSON.stringify(original)});
  assert.deepEqual(both.result,direct.result);
  }
  const conflict=await port.query({...scope,challengeId:'v153-conflict',request:{kind:'math',
    toolRequest:{...request.toolRequest,argumentsJson:JSON.stringify({...original,sideKey:'player2'})}}});
  assert.equal(conflict.status,'unknown');
  assert.equal(conflict.unknownReasonCode,'PREGAME_LAB_CONTROL_SCHEDULE_ARGUMENTS_CONFLICT');
  assert.equal(conflict.queryRepair.correctable,true);
  assert.throws(()=>lab.queryMath({queryId:'v153-invalid-json',...request.toolRequest,
    argumentsJson:'{broken'}),{code:'PREGAME_LAB_CONTROL_SCHEDULE_JSON_INVALID'});
  checks.push('conflicting_or_malformed_explicit_arguments_never_silently_replaced');
  const missing={...original,windows:original.windows.filter(w=>w.round!==2)};
  const missingResult=lab.queryMath({queryId:'v153-missing',mathKind:'mission_marker_schedule',inputs:missing});
  assert.equal(missingResult.result.rows.find(r=>r.round===2).markerVpByActor.player1,null);
  const invalid=structuredClone(original);invalid.windows[0].controlledMarkersBySide.player2.push(1);
  const invalidResult=lab.queryMath({queryId:'v153-conflicting-control',mathKind:'mission_marker_schedule',inputs:invalid});
  assert.equal(invalidResult.resultStatus,'unknown');
  assert.equal(nativeCalls,0);
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  checks.push('unknown_windows_and_conflicting_control_not_promoted_to_strategy_truth');
  await fs.writeFile(reportPath,JSON.stringify({ok:true,checks,elapsedMs:performance.now()-started,
    providerCalls:0,nativeCalls,roomActions:0,originalWorkspaceWrites:0},null,2),{mode:0o600});
  console.log('CONTROL_SCHEDULE_TRANSPORT_V153_PASS',JSON.stringify(checks));
}catch(error){await fs.writeFile(reportPath,JSON.stringify({ok:false,checks,failure:error.message,
  elapsedMs:performance.now()-started,providerCalls:0,nativeCalls},null,2),{mode:0o600});throw error;}
