// P0 reproduced SYSTEM-role contamination: an evidence/decision role inherited
// the generic "keep the candidate unchanged" review instructions.
import assert from 'node:assert/strict';
import {projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
const checks=[];
for (const [kind,label] of [
  ['teach_framework_revision_work_order','revision work coordinator'],
  ['roster_workflow_fact_summary','evidence interpreter'],
  ['roster_workflow_local_teach','local strategy challenger'],
  ['roster_workflow_strategy_decision','strategic decision maker'],
]) {
  const text=projectRosterProviderInstructionsV1({request:{roundKind:kind,promptNodes:[]},runKind:'teach-framework'});
  checks.push({kind,rolePresent:text.includes(label),genericSnapshotAbsent:!text.includes('Keep the supplied candidate unchanged')});
}
console.log(JSON.stringify({checks,providerCalls:0},null,2));
assert.ok(checks.every(c=>c.rolePresent&&c.genericSnapshotAbsent),'scoped role must replace generic review SYSTEM instructions');
