// Actual539 received reuse metadata but the generic experiment SYSTEM and
// previousBatch proposal still primed the SAME already-measured query.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {rosterDecisionRoleInstructionsV1} from '../packages/roster-strategist/roster-decision-role-instructions-v1.mjs';
import * as progress from '../packages/roster-strategist/roster-experiment-progress-v1.mjs';
const root=process.cwd(),run=root+'/build/slice272-projection-owner-v565-inlKbk';
const saved=JSON.parse(await fs.readFile(run+'/539.request.json','utf8'));
const original=structuredClone(saved.request),before=JSON.stringify(original);
assert.equal(original.promptNodes[0].inputs.observationProgress.value.repeated[0].newObservation,false);
const instructions=rosterDecisionRoleInstructionsV1(original);
assert.match(instructions,/experiment progress-recovery owner/u,'a repeated successful query needs its own recovery assignment, not the generic planner prompt');
assert.doesNotMatch(instructions,/select sourceWorkId and formationOptionId/u,'SYSTEM must not prescribe the superseded selector');
const oldInputs=original.promptNodes[0].inputs;
const projected=progress.projectRosterExperimentProgressInputsV1({inputs:oldInputs,progress:oldInputs.observationProgress.value});
assert.equal(projected.task.value.stage,'reconcile_repeated_observation');
assert.deepEqual(projected.question,oldInputs.question,'original goal, proof semantics and closure remain exact');
assert.deepEqual(projected.review,oldInputs.review,'required facts cannot be waived');
assert.deepEqual(projected.batchToolSource0,oldInputs.batchToolSource0);
assert.equal(projected.previousBatch.value.publicReason,undefined,'stale self-proposed next query is not re-injected as current intent');
assert.equal(projected.previousBatch.value.sourceEvidenceId,oldInputs.previousBatch.value.sourceEvidenceId);
assert.equal(JSON.stringify(original),before,'immutable input remains untouched');
const normal={roundKind:'roster_workflow_experiment_planner',promptNodes:[]};
assert.match(rosterDecisionRoleInstructionsV1(normal),/sourceEvidenceNumber/u);
assert.doesNotMatch(rosterDecisionRoleInstructionsV1(normal),/experiment progress-recovery owner/u);
console.log(JSON.stringify({passed:true,concreteRequest:539,stage:'reconcile_repeated_observation',
  questionAndSourcesPreserved:true,staleProposalNotReinjected:true,sourceInputUnchanged:true,
  providerCalls:0,productionWrites:0,proves:'SYSTEM/input routing only; actual model convergence remains to observe'}));
