import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {collectRosterTeachSourceFactsV1} from '../packages/roster-strategist/roster-teach-source-facts-v1.mjs';
import {projectRosterTeachRolePromptV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {createRosterTeachSynthesisArchiveV1,createRosterTeachSynthesisReaderStateV1,projectRosterTeachSynthesisReaderV1} from '../packages/roster-strategist/roster-teach-synthesis-reader-v1.mjs';
const d=JSON.parse(await fs.readFile(process.argv[2],'utf8'));
const originals=new Map();
const projected=projectRosterTeachRolePromptV1('teach_framework_premise_audit',[
  {kind:'current_plan_and_context',context:d.teachFramework.context,plan:JSON.parse(d.planSerialized)},
],originals);
const archive=createRosterTeachSynthesisArchiveV1(projected,{retainedEvidence:originals});
const reader=createRosterTeachSynthesisReaderStateV1(archive);
const nav=projectRosterTeachSynthesisReaderV1(archive,reader)[0].sourceNavigation.sourceFacts;
const expected=collectRosterTeachSourceFactsV1(d.teachFramework.context);
assert.deepEqual(nav.map(f=>[f.original.path,f.citationRef]),expected.map(f=>[f.path,f.citationRef]),
  'Transport references inside a source object must not change its identity between model discovery and the actual binder');
console.log(JSON.stringify({passed:true,sourceFacts:expected.length,readerBinderIdentical:true,providerCalls:0}));
