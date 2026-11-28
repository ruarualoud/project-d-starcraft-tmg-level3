import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4StukovUnitInputsV2} from './compile-wave4-stukov-units-v2.mjs';
import {createOfficialArmyBuilderQueryPortV1} from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4StukovUnitInputsV2(root),port=createOfficialArmyBuilderQueryPortV1({
 releaseContext:inputs.context,unitCompositionUpgradeDataBundle:inputs.artifacts.armyBuilder});
const evaluate=key=>port.evaluateRosterCandidate({sideKey:'player1',scaleId:'Standard',mineralBudget:2000,factionRecordKey:'tactical_cards:stukov_s_forces',
 tacticalCardRecordKeys:['tactical_cards:healing_pathogen'],units:[{unitInstanceId:'actor',recordKey:'army_units:'+key,compositionKind:'small',upgrades:[]}]});
const candidates=['goliath','siege_tank','raven'].map(key=>({recordKey:'army_units:'+key,...evaluate(key)}));
assert.ok(candidates.slice(0,2).every(r=>r.status==='legal'));assert.notEqual(candidates[2].status,'legal');
const policy=inputs.artifacts.armyBuilder.armyResourceBudgetDataBundle.factionArmyEligibilityDataBundle.foreignArmyPolicy;
assert.deepEqual(policy.importedUnits.map(r=>r.recordKey),['army_units:goliath','army_units:siege_tank']);
const raven=inputs.dataset.recordsByKey['army_units:raven'];assert.ok(/flying/i.test(raven.payload.tags));assert.ok(!/ground/i.test(raven.payload.tags));
const result={schema:'starcraft_tmg_wave4_stukov_import_scope_v1',status:'passed_scoped',releaseId:inputs.context.manifest.releaseId,
 importedRecords:policy.importedUnits.map(r=>r.recordKey),ravenTags:raven.payload.tags,
 results:candidates.map(r=>({recordKey:r.recordKey,status:r.status,rulesErrorCode:r.rulesErrorCode||null})),
 correction:'Stukov imported Raven is not a legal roster consumer; do not list that hypothetical same-side dual turret combination as a pending implementation gate',
 modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/stukov-import-scope.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
