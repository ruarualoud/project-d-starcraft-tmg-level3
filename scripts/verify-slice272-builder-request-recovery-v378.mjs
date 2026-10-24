import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createRosterTeachEvidencePortV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const [base,directory,sessionFile]=process.argv.slice(2);
const paid=JSON.parse(gunzipSync(await fs.readFile(directory+'/call-131.reply.json.gz'))).output;
const request=paid.informationNeeds.find(n=>n.needId==='need-builder-comparison');
const state=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const builder=createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(state.officialUnitCompositionUpgradeDataBundle)});
const lab=createPregameSceneLaboratoryV1({sourceState:state,armyBuilderPort:builder,
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(){return {candidates:[],parameterDomains:[],searchSuggestions:[]};},
    instantiate(){throw Error('no action');},apply(){throw Error('no mutation');}}});
const evidence=createRosterTeachEvidencePortV1(lab);
const actual=await evidence.query({challengeId:request.needId,request:{kind:request.kind,toolRequest:request.toolRequest},
  mutationAuthority:false,initialFoundationHash:'b'.repeat(64),sourceHashes:[lab.labDescriptor().sourceStateHash]});
assert.equal(actual.status,'unknown','Malformed request must be correctable, never a successful comparison');
assert.equal(actual.queryRepair.originalQueryNotAnswered,true);
const valid=JSON.parse(await fs.readFile(sessionFile,'utf8')).value.currentCandidate.input;
for(const field of ['sideKey','scaleId','mineralBudget','factionRecordKey']){
  const candidate=structuredClone(valid);delete candidate[field];
  const verdict=builder.evaluateRosterCandidate(candidate);
  assert.equal(verdict.status,'invalid_candidate',field+' must return typed rejection instead of throwing');
  assert.ok(verdict.portErrorCode.startsWith('ARMY_BUILDER_CANDIDATE_'));
}
const partial={...request.toolRequest,argumentsJson:JSON.stringify({candidates:[
  {candidateRef:'original',candidateInput:valid},{candidateRef:'incomplete',candidateInput:{sideKey:'player1'}}]})};
const rejected=await evidence.query({challengeId:'partial-comparison',request:{kind:'math',toolRequest:partial},
  mutationAuthority:false,initialFoundationHash:'b'.repeat(64),sourceHashes:[lab.labDescriptor().sourceStateHash]});
assert.equal(rejected.status,'unknown');
assert.ok(rejected.queryRepair,'Native candidate error must be delivered to the existing correction loop');
assert.equal(lab.proveMutationZero().sourceStateHashUnchanged,true);
console.log(JSON.stringify({status:'passed',actualReply:131,typedCandidateFailures:4,partialComparisonNotAccepted:true,providerCalls:0}));
