import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {gunzipSync} from 'node:zlib';
import {rosterTeachFrameworkContractV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
import {validateStarcraftTmgProviderJsonSchemaValueV1 as validate} from '../packages/structured-generation/output-contract-registry-v1.mjs';
const reply=JSON.parse(gunzipSync(await fs.readFile(path.join(process.argv[2],'call-165.reply.json.gz'))));
const original=JSON.stringify(reply);
const old=rosterTeachFrameworkContractV1('teach_framework_agenda');
assert.equal(validate(old.providerSchema,reply.output).ok,true);
const contract=rosterTeachFrameworkContractV1('teach_framework_questions');
const questions=reply.output.questions.map(({evidenceRequest,...q})=>({...q,
  evidencePlan:'Read the delivered frozen source first; select the exact native query in investigation only if additional evidence is needed.'}));
const output={...reply.output,roundKind:'teach_framework_questions',questions};
assert.equal(validate(contract.providerSchema,output).ok,true,
  'a rules/arithmetic question must not require an unrelated initial native query');
assert.ok(questions.some(q=>q.questionId==='q-timing-round4-committed'));
assert.equal(questions.some(q=>'evidenceRequest' in q),false);
assert.equal(JSON.stringify(reply),original);
const source=await fs.readFile(new URL('../packages/roster-strategist/roster-teach-framework-v1.mjs',import.meta.url),'utf8');
assert.ok(source.includes('if (!question.evidenceRequest) continue;'));
assert.ok(source.includes("ask('teach_framework_questions'"));
console.log(JSON.stringify({passed:true,legacyPaidReplyUnchanged:true,questions:questions.length,
  initialQueriesRequired:false,investigationStillRequired:true}));
