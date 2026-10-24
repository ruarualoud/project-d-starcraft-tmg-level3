// Actual306 accepted a coverage gap because it treated the chosen schedule as fixed.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {projectRosterTeachDecisionScopeV1 as scopeFor} from '../packages/roster-strategist/roster-teach-capability-guide-v1.mjs';
import {createRosterTeachSynthesisArchiveV1 as archiveFor,
  createRosterTeachSynthesisReaderStateV1 as stateFor,
  projectRosterTeachSynthesisReaderV1 as project} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const read = async name => JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/${name}`)));
const actualInput = await read('call-306.product-request.json.gz');
const actualReply = await read('call-306.reply.json.gz');
const formal = JSON.parse(await fs.readFile(process.argv[3], 'utf8'));
assert.equal(actualInput.promptNodes[0].planningDecisionScope, undefined);
assert(actualReply.output.answers.some(a => a.tradeoff.includes('not permitted within the frozen schedule')));
const context = formal.teachFramework.context;
assert.equal(context.rosterEditAuthority, 'agent_may_reselect_after_evidence');
for (const authority of ['agent_may_reselect_after_evidence', 'preset_immutable']) {
  const scope = scopeFor({...context, rosterEditAuthority: authority});
  const precedence = {kind:'evidence_precedence', instruction:'Old failures do not override later results; scope must still match.'};
  const nodes = [scope, precedence,
    {kind:'current_plan_and_context', plan:{planVersion:3}, context:{rosterEditAuthority:authority}},
    {kind:'question_evidence_reconciliation', questions:[]}];
  const original = JSON.stringify(nodes);
  const archive = archiveFor(nodes);
  const projected = project(archive, stateFor(archive))[0];
  assert.deepEqual(projected.planningDecisionScope, scope,
    'Pagination must deliver the same decision authority, not just its unread directory address');
  assert.deepEqual(projected.evidencePrecedence, precedence);
  assert.equal(projected.planningDecisionScope.planChangesAllowed, true);
  assert.equal(projected.planningDecisionScope.arrivalScheduleChangesAllowed, true);
  assert.equal(projected.planningDecisionScope.rosterChangesAllowed, authority !== 'preset_immutable');
  assert.equal(projected.planningDecisionScope.autoResolveUnknown, false);
  assert.equal(JSON.stringify(nodes), original);
}
console.log(JSON.stringify({pass:true,actualReply:306,sameAuthorityBeforeAndAfterPagination:true,
  presetRosterStillLocked:true,scheduleIsRevisableProposal:true,providerCalls:0,nativeCalls:0,originalWrites:0}));
