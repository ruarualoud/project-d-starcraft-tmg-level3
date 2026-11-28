import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {loadWave4AddedCardInputs} from './compile-wave4-added-cards.mjs';
import {createWave4AddedCardScene} from './support/wave4-added-card-room-v1.mjs';
import {createOfficialRelocationFamilyAdapterV1} from '../packages/product-composition/official-relocation-family-adapter-v1.mjs';
import {createOfficialCharacteristicStatusFamilyAdapterV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';
import {refreshOfficialReleaseRosterDerivedStateV2} from '../packages/product-composition/official-release-roster-state-v2.mjs';
import {bindWave4TurretRoom} from './support/wave4-turret-room-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),inputs=await loadWave4AddedCardInputs(root),cases=[],
  read=async ref=>JSON.parse(await fs.readFile(path.join(root,ref),'utf8')),proof=await read('docs/development/wave4/evidence/added-card-active.public.json');
async function scene(kind,actorUnit){
  if(actorUnit){const s=createWave4AddedCardScene(inputs,{kind,actorUnit});s.state.phase='movement';s.state.stage='actions';
    s.state=refreshOfficialReleaseRosterDerivedStateV2({context:inputs.context,state:s.state});return s;}
  const row=proof.results.find(r=>r.kind===kind),authority=await read(row.directoryRef+'/authority.json'),scope=await read(row.directoryRef+'/scope.json'),
    bound=await bindWave4TurretRoom({inputs,state:authority.state,...scope,directory:path.join(root,row.directoryRef)}),native=bound.open({readOnly:true});
  try{await native.restoreDependencies(row.roomId,authority);const b=await native.store.loadReplayBundle(row.roomId),
    journal=b.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt),
    replay=native.engine.replay({initialEnvelope:b.initialEnvelope,journal:journal.slice(0,2)});
    assert.equal(replay.ok,true);assert.equal(replay.envelope.stateHash,journal[1].postStateHash);
    return{state:replay.envelope.state,definitionId:row.definitionId};
  }finally{native.close();}
}
function offered(scene){const state=scene.state,before=hash(state),adapter=state.officialRelocationFamilySourceBundle
  ?createOfficialRelocationFamilyAdapterV1(state.officialRelocationFamilySourceBundle)
  :createOfficialCharacteristicStatusFamilyAdapterV1(state.officialCharacteristicStatusFamilySourceBundle),
  found=adapter.legalSpace(state,{sideKey:'player1'}).parameterDomains.some(d=>d.definitionId===scene.definitionId);
  assert.equal(hash(state),before);return found;}
const heal=await scene('heal');assert.equal(offered(heal),true);cases.push('source-bound Mechanical Stalker offered Master of Robotics');
const bio=await scene('heal','zealot');assert.equal(offered(bio),false);cases.push('real Builder Biological Zealot cannot use the Mechanical heal');
const swarm=await scene('swarm');assert.equal(offered(swarm),true);cases.push('source-bound Biological Ground Zergling offered For the Swarm!');
const flying=structuredClone(swarm);flying.state.pieces.find(p=>p.id==='actor').combatTags=['biological','flying'];
assert.equal(offered(flying),false);cases.push('counterfactual tag projection: Biological Flying fails the new Ground requirement');
const mechanical=structuredClone(swarm);mechanical.state.pieces.find(p=>p.id==='actor').combatTags=['mechanical','ground'];
assert.equal(offered(mechanical),false);cases.push('counterfactual tag projection: Mechanical Ground fails the Biological requirement');
const reactor=await scene('reactor');assert.equal(offered(reactor),true);cases.push('source-bound Marine offered Reactor Go! Go! Go!');
const flyingReactor=structuredClone(reactor);flyingReactor.state.pieces.find(p=>p.id==='actor').combatTags=['biological','flying'];
assert.equal(offered(flyingReactor),true);cases.push('counterfactual tag projection: Reactor does not inherit For the Swarm! Ground restriction');
const reserve=structuredClone(swarm),p=reserve.state.pieces.find(p=>p.id==='actor');p.isOnField=false;p.isInReserves=true;
assert.equal(offered(reserve),false);cases.push('reserve unit cannot use the active extra Move');
const wrongPhase=structuredClone(swarm);wrongPhase.state.phase='assault';assert.equal(offered(wrongPhase),false);cases.push('Movement card unavailable in Assault');
await atomicWrite(path.join(root,'docs/development/wave4/evidence/added-card-boundaries.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_added_card_boundaries_v1',status:'passed_component',cases,
  scope:'family adapter query boundaries; counterfactual tags are component inputs and never Native authority',
  newSignedActions:0,newCompleteAtoms:0,implementedCumulativeAtoms:7,sourceHeldDefinitions:39,fullMatchAdmission:false,modelCalls:0,trainingTruth:false},null,2)+'\n');
console.log(JSON.stringify({status:'passed_component',cases:cases.length}));
