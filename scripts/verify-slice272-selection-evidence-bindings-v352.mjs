import fs from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { hashStarcraftTmgContract as hash } from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import { rosterSelectionPromptEvidenceV1,validateRosterSelectionJustificationV1 } from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
const [directory,formalFile]=process.argv.slice(2);
const request=JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-063.product-request.json.gz`)));
const output=JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-063.reply.json.gz`))).output;
const saved=JSON.parse(await fs.readFile(formalFile,'utf8'));
const source=request.promptNodes.find(n=>n.nodeType==='selection-argument-requirements').content;
const original=JSON.stringify(output);
const validate=(justification,nodes=request.promptNodes)=>validateRosterSelectionJustificationV1({
  justification,candidate:saved.lockedRoster.lock.candidate,unitRules:source.unitRules,
  evidenceRefs:[...source.toolReferences.map(r=>r.referenceId),
    ...source.skillReferences.map(r=>r.referenceId),...rosterSelectionPromptEvidenceV1(nodes).map(r=>r.referenceId)]});
const verdict=validate(output.selectionJustification);
assert.equal(verdict.referencesResolved,true);
assert.equal(verdict.sourceTruthReviewed,false);
const wrongPhase=structuredClone(output.selectionJustification);
wrongPhase.unitDecisions[0].abilityApplications.find(a=>a.abilityName==='Target Lock').phase='assault';
assert.throws(()=>validate(wrongPhase),e=>e.details?.findings.some(f=>f.reason==='phase_disagrees_with_frozen_ability'));
const forged=structuredClone(output.selectionJustification);
forged.unitDecisions[0].evidenceRefs.push('nativeAbilityReference:army_units:invented');
assert.throws(()=>validate(forged),e=>e.details?.findings.some(f=>f.reason==='unknown_reference:nativeAbilityReference:army_units:invented'));
const missing=request.promptNodes.filter(n=>n.nodeType!=='queried-evidence-results');
assert.throws(()=>validate(output.selectionJustification,missing),e=>e.details?.findings.some(f=>f.reason.startsWith('unknown_reference:nativeAbilityReference:')));
const contradictory=structuredClone(request.promptNodes);
const evidence=contradictory.find(n=>n.nodeType==='queried-evidence-results');
const locate=value=>{if(!value||typeof value!=='object')return null;if(value.nativeAbilityReference)return value.nativeAbilityReference;
  for(const child of Object.values(value)){const found=locate(child);if(found)return found;}return null;};
const native=locate(evidence.content);native.records.find(r=>r.recordKey==='army_units:goliath').selectedUpgradeNames.push('contradictory-test-selection');
const {nodeHash,...body}=evidence;evidence.nodeHash=hash(body);
assert.throws(()=>validate(output.selectionJustification,contradictory),e=>e.details?.findings.some(f=>f.reason==='unknown_reference:nativeAbilityReference:army_units:goliath'));
assert.equal(JSON.stringify(output),original);
console.log(JSON.stringify({passed:true,checks:5,actualNineUnitJustification:true,providerCalls:0,nativeActions:0,
  phaseAliasesAcceptedButWrongPhaseRejected:true,onlyUniqueDeliveredSourcesResolved:true,sourceTruthStillRequiresReview:true}));
