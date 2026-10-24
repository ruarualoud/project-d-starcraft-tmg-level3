import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
import {inspectRosterTeachReaderCitationsV1} from '../packages/roster-strategist/roster-teach-framework-v1.mjs';
const reply=JSON.parse(gunzipSync(await fs.readFile(process.argv[2])).toString()).output;
const answers=reply.answers.filter(a=>a.disposition!=='unresolved'&&!a.evidenceRefs.length);
assert(answers.length>0,'Use the actual200 missing-binding answers');
const original=JSON.stringify(answers);
const feedback=inspectRosterTeachReaderCitationsV1({answers,evidence:[],sourceEvidence:[]});
assert.equal(feedback.correctableFailures.filter(f=>f.code==='ROSTER_TEACH_EVIDENCE_BINDING_MISSING').length,answers.length,
  'Actual200 retain/revise answers with no citations are silently downgraded to unknown but never offered reference-only correction');
assert.equal(JSON.stringify(answers),original);
const unresolved=inspectRosterTeachReaderCitationsV1({answers:answers.map(a=>({...a,disposition:'unresolved'})),evidence:[],sourceEvidence:[]});
assert.equal(unresolved.correctableFailures.length,0,'A declared real gap must not be forced to fabricate a reference');
console.log(JSON.stringify({passed:true,actualReply:200,missingBindings:answers.length,unknownNotFabricated:true,providerCalls:0}));
