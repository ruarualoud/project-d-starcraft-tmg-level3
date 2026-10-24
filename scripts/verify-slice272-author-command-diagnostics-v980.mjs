// Real v979 mixed unread-source/owner diagnostics disabled the author command
// even though the original decision is schema-valid and owner authority exists.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {prepareRosterAuthorCommandV1,projectRosterAuthorCommandV1} from '../packages/roster-strategist/roster-workflow-author-command-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
const request=JSON.parse(await fs.readFile(process.argv[2]+'/artifacts/67c581b69173f02bdb44e10040c8cd644749c2147ed1cb23bfbe7543cd84738b.json','utf8'));
const before=hash(request),copy=structuredClone;
const prepared=prepareRosterAuthorCommandV1(request);
assert(prepared,'Normal citation diagnostics must not disable an otherwise valid owner command');
assert(prepared.promptNodes.some(n=>n.kind==='strategy_semantic_repair'&&n.version===3));
assert.deepEqual(prepared.strategyRepairState.originalOutput,request.promptNodes.find(n=>n.kind==='local_contract_feedback').originalOutput);
const read={action:'read',publicReason:'Read the exact current interface before choosing the next operation.',
  reads:[{evidenceNumber:2202,pointer:''}],catalogueQueries:[],questionUpdates:[],newQuestions:[],decision:null};
const projected=projectRosterAuthorCommandV1({request:prepared,output:read});
assert.deepEqual(projected.errors,[]);assert.equal(projected.output.action,'read');
assert.deepEqual(projected.output.reads,read.reads);assert.deepEqual(projected.output.decisions,[]);
const otherSemantic=copy(request);
otherSemantic.promptNodes.find(n=>n.kind==='local_contract_feedback').errors.push({code:'additional_semantic_diagnostic'});
assert(prepareRosterAuthorCommandV1(otherSemantic),'Semantic error names do not choose the transport protocol');
const malformed=copy(request);
delete malformed.promptNodes.find(n=>n.kind==='local_contract_feedback').originalOutput.decisions[0].nextInvestigation;
assert.equal(prepareRosterAuthorCommandV1(malformed),null,'Malformed old decision still needs wire/schema repair');
const notOwner=copy(request);notOwner.promptNodes=notOwner.promptNodes.filter(n=>n.kind!=='strategy_owner_assignment');
assert.equal(prepareRosterAuthorCommandV1(notOwner),null,'Do not grant strategic authority through an error');
assert.equal(hash(request),before);
console.log(JSON.stringify({ok:true,checks:['actual_mixed_diagnostics_keep_author_command',
  'read_command_has_no_decision','semantic_diagnostics_do_not_change_protocol','malformed_and_nonowner_not_promoted'],
  providerCalls:0,nativeCalls:0,productionWrites:0,originalReplyPreserved:true}));
