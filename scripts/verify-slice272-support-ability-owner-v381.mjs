import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {loadOfficialDevelopmentTrancheSourceLockFixtureV1} from './support/official-development-tranche-source-lock-fixture-v1.mjs';
import {validateRosterSelectionJustificationV1, rosterSelectionSupportRulesV1,
  rosterSelectionPromptEvidenceV1} from '../packages/roster-strategist/roster-selection-justification-v1.mjs';
const [directory, formalFile, fixtureRoot] = process.argv.slice(2);
const read = async (n, kind) => JSON.parse(gunzipSync(await fs.readFile(`${directory}/call-${n}.${kind}.json.gz`)));
const request = await read('136', 'product-request');
const paid = (await read('136', 'reply')).output;
const original = JSON.stringify(paid);
const saved = JSON.parse(await fs.readFile(formalFile, 'utf8'));
const source = request.promptNodes.find(n => n.nodeType === 'selection-argument-requirements').content;
const dataset = (await loadOfficialDevelopmentTrancheSourceLockFixtureV1({root:fixtureRoot})).dataset;
const supportRules = rosterSelectionSupportRulesV1(dataset);
const candidate = saved.lockedRoster.lock.candidate;
const validate = (justification, army=candidate) => validateRosterSelectionJustificationV1({
  justification, candidate:army, unitRules:source.unitRules, supportRules,
  evidenceRefs:[...source.toolReferences.map(r=>r.referenceId), ...source.skillReferences.map(r=>r.referenceId),
    ...rosterSelectionPromptEvidenceV1(request.promptNodes).map(r=>r.referenceId)]});
let rejection;
try { validate(paid.selectionJustification); } catch(error) { rejection=error; }
assert(rejection?.details?.findings?.length, 'Original paid reply lacks exact support citations');
assert(!rejection.details.findings.some(f=>f.reason==='ability_not_in_frozen_unit_record'),
  'Actual136: four selected tactical-card abilities are falsely treated as nonexistent unit abilities');
assert.equal(rejection.details.findings.filter(f=>f.reason==='ability_source_rule_reference_required').length,4);
const corrected = structuredClone(paid.selectionJustification);
const sources = [[0,2,'engineering_bay'],[2,1,'armory'],[3,2,'academy'],[5,0,'barracks__proxy_']];
for(const [i,j,key] of sources) corrected.unitDecisions[i].abilityApplications[j].evidenceRefs.push(`support-rule:tactical_cards:${key}`);
assert.equal(validate(corrected).coverageComplete,true);
const wrongPhase=structuredClone(corrected);
wrongPhase.unitDecisions[0].abilityApplications[2].phase='Movement Phase';
assert.throws(()=>validate(wrongPhase),e=>e.details.findings.some(f=>f.reason==='phase_disagrees_with_frozen_ability'));
const missingCard=structuredClone(candidate);
missingCard.tacticalCardRecordKeys=missingCard.tacticalCardRecordKeys.filter(k=>k!=='tactical_cards:armory');
assert.throws(()=>validate(corrected,missingCard),e=>e.details.findings.some(f=>f.reason==='ability_not_in_frozen_unit_record'));
const wrongOwner=structuredClone(corrected);
wrongOwner.unitDecisions[0].abilityApplications[2].abilityName='Infantry Weapons (Armory)';
assert.throws(()=>validate(wrongOwner),e=>e.details.findings.some(f=>f.reason==='ability_not_in_frozen_unit_record'));
assert.equal(JSON.stringify(paid),original);
console.log(JSON.stringify({passed:true,actualPaidReply:136,selectedSupportOwners:4,
  missingCitationRepairIsTyped:true,unselectedCardAndWrongOwnerAndPhaseRejected:true,
  originalOutputUnchanged:true,providerCalls:0}));
