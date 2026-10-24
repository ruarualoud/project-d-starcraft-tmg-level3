import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {hashStarcraftTmgContract} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {createPregameSceneLaboratoryV1} from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createRosterTeachEvidencePortV1} from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const [requestPath, replyPath, sourceDirectory] = process.argv.slice(2);
const readGz = async p => JSON.parse(gunzipSync(await fs.readFile(p)));
const request = await readGz(requestPath), reply = await readGz(replyPath);
const selected = reply.output.queries.find(q => q.kind === 'math');
const wire = JSON.parse(selected.toolRequestJson), original = structuredClone(wire);
const sourceHash = request.promptNodes.find(n => n.kind === 'canonical_current_query_context').context.sourceStateHash;
let source;
for (const file of await fs.readdir(sourceDirectory)) {
  if (!file.endsWith('.json.gz')) continue;
  const state = (await readGz(`${sourceDirectory}/${file}`)).authority?.state;
  if (state && hashStarcraftTmgContract(state) === sourceHash) { source = state; break; }
}
assert.ok(source, 'use this actual request frozen source, not a different experiment');
const freeze = value => { if (value && typeof value === 'object' && !Object.isFrozen(value)) {
  Object.values(value).forEach(freeze); Object.freeze(value); } return value; };
const builder = createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(source.officialUnitCompositionUpgradeDataBundle)});
const lab = createPregameSceneLaboratoryV1({sourceState:source, armyBuilderPort:builder,
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)}, enumerate:()=>({candidates:[],parameterDomains:[]}),
    instantiate:()=>{throw Error('NO_ACTION');},apply:()=>{throw Error('NO_APPLY');}}});
const port = createRosterTeachEvidencePortV1(lab);
const query = toolRequest => port.query({mutationAuthority:false,initialFoundationHash:'b'.repeat(64),sourceHashes:[sourceHash],
  challengeId:selected.queryId,request:{kind:'math',toolRequest}});
const actual = await query(wire);
assert.equal(actual.status,'advisory', `Actual372 complete typed candidates must reach Native, not fail an extra JSON wrapper: ${actual.unknownReasonCode}`);
console.log(JSON.stringify({checkpoint:'actual372_typed_query_reached_native'}));
const direct = lab.compareCandidatesSameState({comparisonId:'native-reference',candidates:wire.candidates});
assert.deepEqual(actual.sourceReceipt.candidates,direct.candidates);
assert.equal(actual.sourceReceipt.candidates[0].mineralSpent,2000);
assert.notEqual(actual.sourceReceipt.candidates[1].legalityStatus,'legal','extra Goliath must not become a legal alternative');
assert.equal(actual.sourceReceipt.ranking,null);
assert.equal(actual.sourceReceipt.requestNormalization.semanticValuesChanged,false);
const legacy = await query({mathKind:wire.mathKind,argumentsJson:JSON.stringify({candidates:wire.candidates})});
assert.equal(legacy.status,'advisory');
assert.deepEqual(legacy.sourceReceipt.candidates,actual.sourceReceipt.candidates);
const identical = await query({...wire,argumentsJson:JSON.stringify({candidates:wire.candidates})});
assert.equal(identical.status,'advisory');
for (const bad of [
  {...wire,argumentsJson:JSON.stringify({candidates:wire.candidates.toReversed()})},
  {...wire,argumentsJson:'{'},
  {...wire,argumentsJson:'{}'},
  {...wire,expectedMineralSpent:0},
  {...wire,candidates:wire.candidates.slice(0,1)},
]) {
  const receipt = await query(bad);
  assert.equal(receipt.status,'unknown');
  assert.equal(receipt.queryRepair.correctable,true);
  assert.ok(receipt.queryRepair.failureTargets[0].expectedSchema.requestShape.candidates);
}
assert.deepEqual(wire,original,'transport must not change the paid model candidate inputs');
assert.ok(lab.describeQueryContext().capabilities.builderCandidateComparison.requestShape.candidates);
assert.ok(lab.proveMutationZero().sourceStateHashUnchanged);
console.log(JSON.stringify({pass:true,actual372:true,typedAndLegacySameNativeVerdicts:true,
  overBudgetNotAccepted:true,conflictsRejected:true,providerCalls:0,nativeActions:0,sourceDraftWrites:0}));
