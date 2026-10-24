import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createRosterTeachEvidencePortV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
import {projectRosterTeachCapabilityGuideV1} from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
const [base,directory]=process.argv.slice(2);
const paid=JSON.parse(gunzipSync(await fs.readFile(directory+'/call-121.reply.json.gz'))).output;
assert(paid.answers.find(a=>a.questionId==='q-post-loss-healer-screen').publicReason.includes('without medic-1'));
const state=JSON.parse(await fs.readFile(base+'/query-contract-audit-v30/native-movement-fixture.private.json','utf8')).state;
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const lab=createPregameSceneLaboratoryV1({sourceState:state,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(state.officialUnitCompositionUpgradeDataBundle)}),
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate(){return {candidates:[],parameterDomains:[],searchSuggestions:[]};},
    instantiate(){throw Error('no action');},apply(){throw Error('no mutation');}}});
const context=createRosterTeachEvidencePortV1(lab).describeQueryContext();
const participants=context.scenarioConstruction.participantSelection;
assert(participants,'Existing isolateToPlacedPieces option must be discoverable before inventing focus-as-removal');
assert.equal(participants.field,'spec.isolateToPlacedPieces');
assert.equal(participants.removesUnlistedFromPrivateBattlefield,true);
assert.equal(participants.provesDestroyedOrAwardedVictoryPoints,false);
const guide=projectRosterTeachCapabilityGuideV1(context);
assert.deepEqual(guide.toolSurfaceCatalog.scenario.participantSelection,participants);
assert.equal(lab.proveMutationZero().sourceStateHashUnchanged,true);
console.log(JSON.stringify({pass:true,sameLabAndTeachContract:true,providerCalls:0,roomActions:0}));
