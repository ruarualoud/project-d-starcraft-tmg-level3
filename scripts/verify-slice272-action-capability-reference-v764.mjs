// Actual failure: an Assault menu without Fight was treated as missing
// geometry/capability; the selected Native descriptor already declares Combat.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {enumerateOfficialSelectedRosterMeleeActionsV1 as enumerate,
  instantiateOfficialSelectedRosterMeleeActionV1 as instantiate} from '../packages/product-composition/official-selected-roster-melee-action-runtime-v1.mjs';
import {createStarcraftTmgSnapshotSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';

const source=process.argv[2];
assert(source,'frozen laboratory source required');
const bytes=await fs.readFile(source);
const state=JSON.parse(gunzipSync(bytes)).authority.state;
state.phase='assault';state.activeSideKey='player2';
const native=state.officialSelectedRosterMeleeRuntimeDescriptor;
const route=native.routes.find(r=>r.pieceId==='player2-kerrigan-raptor'&&r.actionType==='fight');
assert.equal(route?.phase,'combat','actual compiled source has the missing fact');
const before=hash(state);
const service=createStarcraftTmgSnapshotSceneQueryServiceV1({state,rulesRuntime:{enumerate,instantiate},
  seatKey:'player2',sceneScope:{kind:'hypothetical_branch',sourceStateHash:before,baseStateHash:before}});
const menu=service.actionSpace();
assert(!menu.parameterDomains.some(d=>d.actionType==='fight'));
const reference=menu.actionCapabilityReference;
assert(reference,'current shared action menu must distinguish unsupported from other-phase capability');
const entry=reference.routes.find(r=>r.routeId===route.routeId);
assert(entry);
for(const key of ['pieceId','actionType','phase','weaponName','routeStatus'])assert.equal(entry[key],route[key]);
assert.equal(entry.sourceDescriptor,'officialSelectedRosterMeleeRuntimeDescriptor');
assert.equal(reference.currentPhase,'assault');
assert.equal(reference.executionEligibilityProven,false);
assert.equal(reference.completeRulebook,false);
assert.equal(reference.sourceDescriptors.find(d=>d.stateField===entry.sourceDescriptor).runtimeHash,native.runtimeHash);
assert.equal(hash(state),before);
assert.deepEqual(await fs.readFile(source),bytes);
// No descriptor in a legacy/redacted view must not invent one or imply absence.
const legacy=structuredClone(state);
for(const key of Object.keys(legacy))if(key.endsWith('RuntimeDescriptor'))delete legacy[key];
const legacyHash=hash(legacy);
const old=createStarcraftTmgSnapshotSceneQueryServiceV1({state:legacy,
  rulesRuntime:{enumerate:()=>({candidates:[],parameterDomains:[]}),instantiate},seatKey:'player2',
  sceneScope:{kind:'hypothetical_branch',sourceStateHash:legacyHash,baseStateHash:legacyHash}}).actionSpace();
assert.equal(old.actionCapabilityReference,undefined);
console.log(JSON.stringify({passed:true,nativeDeclaredPhaseDelivered:true,
  noHypotheticalActionGranted:true,sameLiveAndPregameActionSpace:true,
  providerCalls:0,actionsApplied:0,productionWrites:0,sourceUnchanged:true}));
