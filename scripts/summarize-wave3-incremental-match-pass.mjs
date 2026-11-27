import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';

const lobby='build/ticket-28-wave3-human-lobby-v1/',dir=lobby+'incremental-pass/';
const base='build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/';
const fresh=(id)=>dir+id+'/result.public.json';
const split=[fresh('split-fight'),fresh('split-fight-wounded')],impact=fresh('impact-threshold');
const inheritance=await read(dir+'inheritance.public.json');
const twoTargets=await Promise.all(split.map(read));
assert(twoTargets.every(r=>r.coldExact&&r.attacks.length===2&&r.attacks.every(a=>a.stages.hitRolls.length===6)));
assert.equal(twoTargets[1].units.find(u=>u.id==='adept').models,3);
const threshold=await read(impact);
assert(threshold.coldExact&&threshold.before.supply===1&&threshold.after.supply===0&&threshold.after.contestingSides.length===1);
const matrix={
  warpIn:[fresh('t28-entry-skirmish'),fresh('t28-entry-standard')],
  transport:[lobby+'mission-actions/skirmish-artefact_hunt-withdrawal/result.public.json',base+'immortal-void-seeker-standard-2.83/result.json'],
  spawn:[fresh('t28-worm-skirmish'),base+'roachling-standard-v260/summon.json'],
  reserveEntry:[fresh('t28-entry-skirmish'),lobby+'zerg-definitions-288/ambush/result.public.json'],
};
for(const [family,refs] of Object.entries(matrix)) {
  for(const ref of refs){
    const r=await read(ref);assert(r.coldExact===true||r.coldReplay===true,ref);
    assert(Array.isArray(r.actions)&&r.actions.length>0,family);
  }
}
const dropRef=lobby+'mission-actions/skirmish-artefact_hunt-withdrawal/operation-f2c8d3f6be4d1ab2660bb60764c5068d7688bad9c5dad2b6db2ac7569b73f9d3.json';
assert.equal((await read(dropRef)).domain.definitionId,'card:dropship/strap-in-any@1');
const mobile=[];
for(const scale of ['skirmish','standard']){
  const webRef=lobby+scale+'.public.json',mobileRef=lobby+scale+'-mobile-outcome.public.json';
  const web=await read(webRef),compact=await read(mobileRef);
  assert(web.browserCreated&&web.guestEntered&&web.firstSeatReload&&web.coldReplay&&compact.reload);
  assert.deepEqual([web.roomId,web.terminal.stateHash,web.terminal.revision],[compact.roomId,compact.terminalHash,compact.revision]);
  mobile.push({scale,webRef,mobileRef,revision:compact.revision,round:web.terminal.round,stateHash:compact.terminalHash});
}
const same=await read(dir+'same-board.public.json');
assert.deepEqual(same.evidence.map(r=>r.query),['mission_marker_control','attack_probability']);
const redRef=dir+'raynor-menu.public.json',greenRef=dir+'raynor-menu-2.89.0.public.json';
assert((await read(redRef)).outcomes.every(x=>x.error.includes('freedom-fighters')));
assert((await read(greenRef)).outcomes.every(x=>x.passed&&x.pending.length===0&&x.actionType==='ranged_attack'));
const results={ticket:28,item:'T28-W3-11',runbook:'docs/development/wave3/match-incremental-acceptance.zh-CN.md',
  counts:inheritance.counts,inheritanceRef:dir+'inheritance.public.json',split,impact,matrix,matrixColumns:['Skirmish','Standard'],
  dropshipOperation:dropRef,mobile,sameBoard:dir+'same-board.public.json',raynor:[redRef,greenRef],
  accepted:['M12','M14'],partial:['M01','M07','M08','M09','M24','M25'],providerCalls:0};
{
  const ref=fresh('t28-personal-transport-skirmish'),r=await read(ref);
  assert(r.coldExact&&r.nextSeat==='player2'&&r.releasedSupply===r.restoredSupply&&r.actions.includes('resolve_personal_transport'));
  results.transportRedeployment=[ref,matrix.transport[1]];
}
{
  const ref=dir+'final-probability.public.json',r=await read(ref);
  assert.equal(r.probability.dataHash,same.evidence[1].dataHash);results.finalProbability=ref;
}
await save(dir+'summary.public.json',results);
console.log(results.accepted.join(', '),mobile.map(r=>r.scale+' r'+r.revision).join(', '));
