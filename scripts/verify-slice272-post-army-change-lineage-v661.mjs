// Actual editable r4 was committed, then publishing compact facts for an old
// army's Native source threw BINDINGS_INVALID. Exercise the real publisher/core.
import fs from 'node:fs/promises';import path from 'node:path';
import assert from 'node:assert/strict';import {createHash} from 'node:crypto';import {fileURLToPath} from 'node:url';
import {createRosterDecisionWorkflowV1,rosterWorkflowBindingsMatchV1}
  from '../packages/roster-strategist/roster-decision-workflow-v1.mjs';
import {publishRosterWorkflowDecisionEvidenceDirectoryV1}
  from '../packages/roster-strategist/roster-workflow-evidence-lineage-v1.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const base=path.join(root,'build/slice272-product-generation-v645-M86Cg9/workspace/decision-workflows/decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1');
const stateBytes=await fs.readFile(path.join(base,'workflow.json')),initial=JSON.parse(stateBytes);
assert.equal(initial.draftRevision,4);
const draft=JSON.parse(await fs.readFile(path.join(base,'artifacts',initial.draftRef+'.json'),'utf8'));
assert.equal(draft.history.at(-1).armyChanged,true);assert.equal(draft.history.at(-1).mineralSpent,1610);
let state=structuredClone(initial);const memory=new Map();
const store={load:async()=>structuredClone(state),save:async value=>{state=structuredClone(value);},
  get:async ref=>memory.has(ref)?structuredClone(memory.get(ref)):JSON.parse(await fs.readFile(path.join(base,'artifacts',ref+'.json'),'utf8')),
  put:async value=>{const ref=createHash('sha256').update(JSON.stringify(value)).digest('hex');memory.set(ref,structuredClone(value));return ref;}};
const workflow=await createRosterDecisionWorkflowV1({store,execute:async()=>{throw Error('NO_TOOL_OR_PROVIDER_EXECUTION');}});
const directory=await publishRosterWorkflowDecisionEvidenceDirectoryV1({workflow,store});
const historical=directory.entries.filter(e=>e.validity==='historical'&&e.operation);assert(historical.length);
assert(historical.some(e=>e.sourceFactsUnavailableReason==='historical_original_remains_exact_readable'));
for(const row of historical)assert(initial.evidence[row.evidenceNumber-1],'original historical source handle is retained');
const after=await workflow.inspect();
for(const entry of after.evidence.filter(e=>!initial.evidence.some(old=>old.id===e.id)))
  assert(rosterWorkflowBindingsMatchV1(entry.bindings,after.scope),'no old army is relabelled current');
const repeated=await publishRosterWorkflowDecisionEvidenceDirectoryV1({workflow,store});
assert.deepEqual(repeated,directory);
assert((await fs.readFile(path.join(base,'workflow.json'))).equals(stateBytes));
console.log(JSON.stringify({status:'passed',actualPostArmyChangeRevision:4,mineralSpent:1610,
  historicalNativeSourcesPreserved:historical.length,oldSourcesNotRepublishedAsCurrent:true,
  coldPublicationIdempotent:true,providerCalls:0,nativeCalls:0,productionWrites:0,realProductContinuationStillPending:true}));
