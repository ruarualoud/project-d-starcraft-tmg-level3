// Actual v326 request012 called 50mm a Goliath route (official frozen:80mm).
// Bind the read to a unit, not model-authored size conversion. No model calls.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createPregameMapEvidencePortV1 } from '../packages/roster-strategist/pregame-map-evidence-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { createRosterTeachEvidencePortV1 } from '../packages/roster-strategist/roster-teach-evidence-port-v1.mjs';
const [sourceFile, outputFile] = process.argv.slice(2);
const report = { providerCalls:0, sourceFile, checks:[] };
try {
  const source = JSON.parse(gunzipSync(await fs.readFile(sourceFile))).authority.state;
  const before = hash(source), port = createPregameMapEvidencePortV1({ sourceState:source });
  const query = { queryId:'actual-route-target',unitId:'goliath-1',targetId:'mission-marker-2' };
  const bound = port.routeToObjective(query);
  assert.equal(bound.baseId,'round_80mm','Unit route must derive the actual frozen base, not require an LLM guessed baseId');
  assert.equal(bound.sideId,'player1');
  const native = port.routeToObjective({queryId:'profile-control',sideId:'player1',baseId:'round_80mm',targetId:query.targetId});
  assert.equal(bound.resultStatus,native.resultStatus);
  assert.deepEqual(bound.witness,native.witness);
  assert.equal(bound.unitBinding.recordKey,'army_units:goliath');
  assert.equal(bound.exactMoveOrDeploymentLegality,false);
  report.checks.push('unit_query_uses_official_80mm_same_frozen_route_and_keeps_advisory_scope');
  const wrong = port.routeToObjective({...query,baseId:'round_50mm'});
  assert.equal(wrong.resultStatus,'unknown');
  assert.equal(wrong.unknownReason,'unit_base_identity_conflict');
  assert.equal(wrong.witness,null);
  const wrongSide = port.routeToObjective({...query,sideId:'player2'});
  assert.equal(wrongSide.unknownReason,'unit_side_identity_conflict');
  const missing = port.routeToObjective({...query,unitId:'invented-unit'});
  assert.equal(missing.unknownReason,'unit_identity_unknown');
  report.checks.push('conflicting_base_side_and_unknown_unit_never_fall_back_to_a_different_route');
  const legacy = port.routeToObjective({queryId:'legacy-50mm',sideId:'player1',baseId:'round_50mm',targetId:query.targetId});
  assert(!legacy.applicableUnitIds.includes('goliath-1'));
  assert(legacy.applicableUnitIds.includes('marauder-1'));
  const roster = port.evaluateRosterRoute({queryId:'roster',sideId:'player1',candidateInput:{sideKey:'player1',units:[
    {unitInstanceId:'goliath-1',recordKey:'army_units:goliath',compositionKind:'small'},
    {unitInstanceId:'marauder-1',recordKey:'army_units:marauder',compositionKind:'large'}]}});
  assert.deepEqual(roster.units.map(u=>u.baseId),['round_80mm','round_50mm']);
  assert.equal(hash(source),before);
  report.checks.push('legacy_base_read_labels_applicable_units_and_roster_audit_uses_same_binding');
  const freeze = value => { if(value && typeof value==='object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);Object.freeze(value); } return value; };
  const lab = createPregameSceneLaboratoryV1({sourceState:source,
    armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(source.officialUnitCompositionUpgradeDataBundle)}),
    rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate:()=>({candidates:[],parameterDomains:[],searchSuggestions:[]}),
      instantiate:()=>{throw Error('NO_ACTION')},apply:()=>{throw Error('NO_ACTION')}}});
  const context = lab.describeQueryContext();
  assert.equal(context.availableUnits.find(u=>u.unitId==='goliath-1').mapRouteBinding.baseId,'round_80mm');
  assert(context.queryContracts['map.route_access'].arguments.preferred.unitId);
  const result = await createRosterTeachEvidencePortV1(lab).query({mutationAuthority:false,
    initialFoundationHash:'b'.repeat(64),sourceHashes:['c'.repeat(64)],challengeId:'unit-route-native',
    request:{kind:'map_route',toolRequest:{branchIdRef:'',queryKind:'map.route_access',argumentsJson:JSON.stringify({unitId:'goliath-1',targetId:query.targetId})}}});
  assert.equal(result.sourceReceipt.queryReceipt.result.baseId,'round_80mm');
  assert.equal(result.sourceReceipt.queryReceipt.result.unitBinding.recordKey,'army_units:goliath');
  assert(lab.proveMutationZero().sourceStateHashUnchanged);
  report.checks.push('teach_tool_and_live_spatial_adapter_preserve_unit_selector_and_deliver_official_binding');
  report.ok=true;
} catch(error) {report.ok=false;report.failure=error.message;report.stack=error.stack;process.exitCode=1;}
await fs.writeFile(outputFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
