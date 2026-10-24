// Actual r4/v2 design relabelled old observation604 as the all-three baseline;
// its preflight approved the current roster but never checked the cited origins.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import * as origins from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
import {assessRosterProductHypothesisCycleV1,progressRosterProductComparisonV1} from '../packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs';
import {createRosterComparisonPreflightWorkV1} from '../packages/roster-planning-workspace/roster-decision-workspace-run-v1.mjs';
const root=process.argv[2],get=async ref=>JSON.parse(await fs.readFile(root+'/artifacts/'+ref+'.json','utf8'));
const state=JSON.parse(await fs.readFile(root+'/workflow.json','utf8'));
const id='product:strategy-hypothesis:v1:3f2b13756bb2d2dfc2fa:purpose:v2:preflight:v1';
const work=state.work.find(w=>w.id===id),assignment=await get(work.inputRef),original=JSON.stringify(await get(work.resultRef));
const input=await origins.projectRosterWorkflowRoleSourceInputsV1({assignment,state,readArtifact:get});
assert.ok(input.comparisonObservationSources?.value,'explicit original observation identities must accompany the declared design');
const rows=input.comparisonObservationSources.value.entries;
const baseline=rows.find(row=>row.evidenceNumber===604);
assert.ok(baseline);assert.equal(baseline.sameCommittedArmy,false);
assert.match(baseline.originalComparison.armDescription,/Hellfire retained/u);
assert.ok(!baseline.observedWeapons.includes('Haywire Missiles'));
assert.deepEqual(baseline.originBindings,state.evidence[603].bindings);
const rejected=(await get(work.resultRef)).value.checks;
const missing=origins.rosterComparisonObservationCoverageErrorsV1({inputs:input,checks:rejected});
assert.equal(missing[0]?.code,'comparison_observation_origin_not_assessed');
assert.ok(missing[0].missingEvidenceNumbers.includes(604));
const honest=structuredClone(rejected);honest.find(c=>c.checkId==='army_baseline').verdict='requires_revision';
assert.deepEqual(origins.rosterComparisonObservationCoverageErrorsV1({inputs:input,checks:honest}),[]);
// The gate requires explicit provenance/applicability assessment, not an extra
// experiment or a host-selected winner. Each cited source can remain historical.
const assessed=structuredClone(rejected),check=assessed.find(c=>c.checkId==='army_baseline');
for(const row of rows){check.evidenceNumbers.push(row.evidenceNumber);
  check.dataQuestions.push({question:`Use of source ${row.evidenceNumber}`,classification:'answered_fact',
    publicReason:'Fixture: historical context only, not a measured current arm.',evidenceNumbers:[row.evidenceNumber]});}
assert.deepEqual(origins.rosterComparisonObservationCoverageErrorsV1({inputs:input,checks:assessed}),[]);
const draft=await get(state.draftRef),cycle=await assessRosterProductHypothesisCycleV1({state,draft,readArtifact:get});
assert.equal(cycle.comparisonPreflightAccepted,false);
assert.equal(cycle.comparisonPreflightContractRepair?.engineeringChangeId,'comparison-measurement-origin-v808');
const scheduled=[];await progressRosterProductComparisonV1({state,draft,cycle,
  run:{requestStrategicComparisonDesignReview:async args=>scheduled.push(args)}});
assert.equal(scheduled.length,1);assert.equal(scheduled[0].purposeWorkId,work.inputs.proposedDesign.id.slice(5));
const next=createRosterComparisonPreflightWorkV1({current:state,...scheduled[0],toolDescriptor:work.inputs.tools.value});
assert.equal(next.inputs.review.value.measurementOriginContractVersion,1);
assert.equal(next.designReviewRound,work.designReviewRound);
assert.equal(JSON.stringify(await get(work.resultRef)),original);
console.log(JSON.stringify({pass:true,actualR4V2:true,oldArmIdentityExposed:true,unassessedReuseRejected:true,
  historicalUseAllowed:true,samePurposeReReview:true,realProviderCalls:0,nativeCalls:0,productionWrites:0}));
