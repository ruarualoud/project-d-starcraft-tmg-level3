import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV3} from './compile-wave4-stukov-units-v3.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {createOfficialStandardRoomInitialStateAuthorityV1} from '../packages/product-composition/official-standard-room-factory-v1.mjs';
import {createOfficialSkirmish500RoomInitialStateAuthorityV1} from '../packages/product-composition/official-skirmish-500-room-factory-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputsV3(root),
 port=createOfficialArmyBuilderQueryPortV1({releaseContext:inputs.context,unitCompositionUpgradeDataBundle:inputs.artifacts.armyBuilder}),results=[];
for(const [key,faction,cards]of [['archon','templar_caste',[]],['alarak','tal_darim',[]],['infested_goliath','stukov_s_forces',['healing_pathogen']],['infested_siege_tank','stukov_s_forces',['healing_pathogen']]]){
 const r=port.evaluateRosterCandidate({sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:'+faction,
  tacticalCardRecordKeys:cards.map(c=>'tactical_cards:'+c),units:[{unitInstanceId:'held',recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]}]});
 assert.notEqual(r.status,'legal');assert.ok(!inputs.artifacts.armyBuilder.catalogueSelection.selectedRecordKeys.includes('army_units:'+key));
 results.push({recordKey:'army_units:'+key,status:r.status,rulesErrorCode:r.rulesErrorCode});
}
assert.equal(inputs.inventory.definitions.filter(d=>d.sourceHolds.length).length,39);assert.equal(inputs.artifacts.armyBuilder.catalogueSelection.selectedRecordKeys.length,102);
assert.throws(()=>createOfficialStandardRoomInitialStateAuthorityV1({releaseContext:inputs.context}),/STANDARD_ROOM_ESTIMATED_GEOMETRY_FORBIDDEN/);
assert.throws(()=>createOfficialSkirmish500RoomInitialStateAuthorityV1({releaseContext:inputs.context}),/SKIRMISH_ROOM_ESTIMATED_GEOMETRY_FORBIDDEN/);
const result={schema:'starcraft_tmg_wave4_engineering_v3_boundaries_v1',status:'passed_scoped',releaseId:inputs.context.manifest.releaseId,
 sourceHeldDefinitions:39,selectedRecords:102,heldResults:results,standardAndSkirmishRejectEstimates:true,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/engineering-v3-boundaries.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
