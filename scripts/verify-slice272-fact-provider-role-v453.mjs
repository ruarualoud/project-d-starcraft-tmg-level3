// Actual277 got precise new evidence but still repeated the old strategic
// handoff. Check the real transport instruction selector, not only promptNodes.
import fs from 'node:fs/promises';
import zlib from 'node:zlib';
import assert from 'node:assert/strict';
import {projectRosterProviderInstructionsV1 as instructions} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
const request=JSON.parse(zlib.gunzipSync(await fs.readFile(`${process.argv[2]}/call-277.product-request.json.gz`)));
assert.equal(request.promptPack,'roster_teach_fact_probe_v3');
const before=JSON.stringify(request),actual=instructions({request,runKind:'teach_framework'});
assert(actual.includes('Native fact investigator'),'Actual fact request still uses the strategic review system role');
assert(!actual.includes('Keep the supplied candidate unchanged during a single evidence-bound'));
assert(actual.includes('semantic correction, not merely JSON formatting'));
assert(actual.includes('not yet executed is work remaining'));
assert(actual.includes('Never mutate the real room'));
assert.equal(JSON.stringify(request),before);
const legacy=instructions({request,version:'legacy_v1'});
assert(legacy.includes('Roster Strategist'));
assert(legacy.includes('Keep the supplied candidate unchanged during a single evidence-bound'));
const ordinary=instructions({request:{roundKind:'final_plan_review'}});
assert(ordinary.includes('Roster Strategist'));
const selection=instructions({request:{},runKind:'iterative_roster_step',phaseAuthority:{kind:'roster_plan_selection_v1'}});
assert(selection.includes('This is the selecting phase'));
assert(!selection.includes('Native fact investigator'));
console.log(JSON.stringify({ok:true,actualRequest:277,realTransportRoleSeparated:true,semanticCorrectionExplicit:true,otherRolesUnchanged:true,paidRequestsUnchanged:true,providerCalls:0}));
