// Concrete lookup gap: actual old control539 is discoverable by its local
// consumer but absent from the parent comparison's per-arm measurement index.
// New binding below is CONTROLLED fixture metadata, not relabelled production
// evidence or proof of a real A/B comparison.
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {projectRosterWorkflowExperimentAssetsV1} from '../packages/roster-strategist/roster-workflow-experiment-assets-v1.mjs';
const root=path.resolve(process.argv[2]);
const state=JSON.parse(await fs.readFile(path.join(root,'workflow.json'),'utf8'));
const read=async ref=>JSON.parse(await fs.readFile(path.join(root,'artifacts',ref+'.json'),'utf8'));
const source=state.evidence[538],purposeSource=state.evidence[172],raw=await read(source.artifactRef);
const purpose=(await read(purposeSource.artifactRef)).proposals[0].comparisonPurpose;
const parent=state.work.find(w=>w.experimentGoalId===w.id&&w.inputs?.comparisonPurpose?.id===purposeSource.id);
assert(parent);
const controlled=structuredClone(raw);
controlled.experimentOrigin.comparisonBinding={comparisonId:purposeSource.id,
  role:'observation_candidate',arm:'alternative',stage:'baseline',
  measurements:[{number:1,description:purpose.measurements[0]}],
  endpointReached:null,sourceApproved:false};
const readControlled=ref=>ref===source.artifactRef?controlled:read(ref);
const parentAssets=await projectRosterWorkflowExperimentAssetsV1({state,workId:parent.id,readArtifact:readControlled});
const coverage=parentAssets.catalogue.comparisonCoverage;
assert(coverage,'comparison owner needs an exact candidate directory across its completed methods');
const candidate=coverage.measurements[0].candidates.find(c=>c.sourceEvidenceNumber===539);
assert(candidate,'completed local observation remains findable from the parent');
assert.equal(candidate.arm,'alternative');
assert.equal(candidate.stage,'baseline');
assert.equal(candidate.endpointReached,null);
assert.equal(candidate.sourceApproved,false);
assert.equal(coverage.strategyImprovementProven,false);
const paid=await read('3809e516dca520f326d0bf620011a50f4b7a86c22ba94b2a93a1aef9f8f3ca9a');
const child=paid.promptNodes.find(node=>node.kind==='workflow_role_assignment').workId;
const childAssets=await projectRosterWorkflowExperimentAssetsV1({state,workId:child,readArtifact:readControlled});
assert.equal(childAssets.catalogue.comparisonCoverage??null,null,
  'a fact-method does not receive all parent measurement obligations');
assert.equal(JSON.stringify(await read(source.artifactRef)),JSON.stringify(raw));
console.log(JSON.stringify({passed:true,parentCanFind539:true,childScopeNotExpanded:true,
  baselineNotEndpoint:true,controlledBindingNotProductionFact:true,providerCalls:0,nativeCalls:0,productionWrites:0}));
