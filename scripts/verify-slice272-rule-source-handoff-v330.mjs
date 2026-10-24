// Actual v326 calls 011–015 mistook absence in Movement for missing card rules.
import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { createPregameSceneLaboratoryV1 } from '../packages/roster-strategist/pregame-scene-laboratory-v1.mjs';
import { createOfficialArmyBuilderQueryPortV1 } from '../packages/roster-strategist/army-builder-query-port-v1.mjs';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const [sourceFile, outputFile] = process.argv.slice(2);
const report = {providerCalls:0, checks:[]};
try {
 const state = JSON.parse(gunzipSync(await fs.readFile(sourceFile))).authority.state;
 const before = hash(state);
 const freeze = v => {if(v && typeof v==='object' && !Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
 const lab = createPregameSceneLaboratoryV1({sourceState:state,
  armyBuilderPort:createOfficialArmyBuilderQueryPortV1({unitCompositionUpgradeDataBundle:freeze(state.officialUnitCompositionUpgradeDataBundle)}),
  rulesRuntime:{descriptor:{runtimeHash:'a'.repeat(64)},enumerate:()=>({candidates:[],parameterDomains:[],searchSuggestions:[]}),
   instantiate:()=>{throw Error('NO_ACTION')},apply:()=>{throw Error('NO_ACTION')}}});
 const context=lab.describeQueryContext();
 assert(context.nativeAbilityReference?.records?.length,'Fact investigation receives current action domains but no selected-card ability source text');
 for(const [recordKey, abilityName] of [['tactical_cards:engineering_bay','Infantry Weapons'],['tactical_cards:armory','Vehicle Weapons'],['tactical_cards:barracks__tech_lab_',"Let's Have a Blast!"]]){
  const entry=context.nativeAbilityReference.records.find(x=>x.recordKey===recordKey);
  const source=state.officialCharacteristicStatusFamilySourceBundle.routes.find(x=>x.recordKey===recordKey && x.abilityName===abilityName);
  const rule=entry.definitions.find(x=>x.abilityName===abilityName && x.sourceText===source.sourceText);
  assert(rule);assert.equal(rule.phase,'assault');assert.equal(rule.sourceFeatureHash,source.sourceFeatureHash);
  assert.equal(rule.resourceCost,source.resourceCost);assert(entry.cardInstanceIds.length);
 }
 report.checks.push('three_actual_missing_cards_deliver_verbatim_frozen_rules_and_phase_without_inventing_domains');
 const marine=context.nativeAbilityReference.records.find(x=>x.recordKey==='army_units:marine');
 assert(marine.unitIds.includes('marine-1'));
 assert(marine.selectedUpgradeNames.includes('Combat Shield'));
 assert(marine.definitions.some(x=>x.abilityName==='Stimpack'));
 assert.equal(context.nativeAbilityReference.executionEligibilityProven,false);
 assert.equal(hash(state),before);assert(lab.proveMutationZero().sourceStateHashUnchanged);
 report.checks.push('unit_upgrade_identity_preserved_reference_is_not_action_eligibility_and_source_is_unchanged');
 report.ok=true;
}catch(error){report.ok=false;report.failure=error.message;report.stack=error.stack;process.exitCode=1;}
await fs.writeFile(outputFile,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
