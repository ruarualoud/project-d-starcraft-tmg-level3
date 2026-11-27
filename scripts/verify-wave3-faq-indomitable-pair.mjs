import assert from 'node:assert/strict';
import {read,save} from './support/wave3-raven-tabletop-room-v1.mjs';
import {restoreOrPreparePositionedStandardOpening} from './support/wave3-standard-action-room-v1.mjs';
import {base,output,manifestRef} from './support/wave3-faq-room-v1.mjs';
import {deriveOfficialEngagementGraphV2} from '../packages/rule-atoms/official-engagement-graph-v2.mjs';
import {enumerateOfficialSelectedRosterRangedActionsV1,inspectOfficialSelectedRosterRangedTargetGeometryV1} from '../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs';
const dir=output+'/indomitable-pair',reference=await read(base+'/khassar-supply-standard-2.84.0/coverage.json');
function recipe(label){
  return {factionRecordKey:'tactical_cards:khalai',tacticalCardRecordKeys:[],units:['immortal','zealot'].map(unit=>({
    unitInstanceId:unit+label,recordKey:'army_units:'+unit,compositionKind:'small',upgradeNames:[]}))};
}
const scene={positions:{immortalA:[7,4],immortalB:[18,4],zealotA:[19,8],zealotB:[8,8]}};
const state=await restoreOrPreparePositionedStandardOpening({roomId:'faq78',dir,candidateVersion:'2.99.5',
  reference:{...reference,manifestRef,recipes:{player1:recipe('A'),player2:recipe('B')},compareReadOnlyAdmission:true},scene});
state.stage='activation_phases';state.phase='assault';
state.phaseFirstActorByRound[state.round+':assault']={round:state.round,phase:'assault',chosenFirstActorSideKey:'player1',markerHolderSideKey:'player1'};
const samples=[];
for(const separatedEngagements of [false,true]){
  const s=structuredClone(state);
  if(separatedEngagements){
    for(const suffix of ['A','B']){
      const guard=s.pieces.find(p=>p.id==='zealot'+suffix);
      const foe=s.pieces.find(p=>p.id==='immortal'+(suffix==='A'?'B':'A'));
      const dx=foe.models[0].xInches-guard.models[0].xInches;
      const dy=foe.models[0].yInches+(foe.models[0].baseWidthInches+guard.models[0].baseWidthInches)/2+0.3-guard.models[0].yInches;
      guard.xInches+=dx;guard.yInches+=dy;
      for(const m of guard.models){m.xInches+=dx;m.yInches+=dy;}
    }
  }
  for(const suffix of ['A','B']){
    const pieceId='immortal'+suffix,targetUnitId='immortal'+(suffix==='A'?'B':'A');
    s.activeSideKey=s.pieces.find(p=>p.id===pieceId).sideKey;
    const graph=deriveOfficialEngagementGraphV2(s);
    for(const id of [pieceId,targetUnitId])assert.equal(graph.engagedUnitIds.includes(id),separatedEngagements);
    const profile=s.officialAttackProfileCatalogueV2.profiles.find(p=>p.profileKey.startsWith('army_units:immortal::assault::'));
    const ask=()=>inspectOfficialSelectedRosterRangedTargetGeometryV1({state:s,pieceId,targetUnitId,profileKey:profile.profileKey});
    const domains=enumerateOfficialSelectedRosterRangedActionsV1(s,{sideKey:s.activeSideKey}).parameterDomains;
    const offered=domains.some(d=>d.pieceId===pieceId&&d.parameterSchema.targetUnitId.enum.includes(targetUnitId));
    assert.equal(offered,!separatedEngagements);
    if(separatedEngagements) assert.throws(ask,/ENGAGEMENT_TARGET_PROHIBITED/); else assert(ask());
    samples.push({pieceId,targetUnitId,engaged:graph.engagedUnitIds,offered,profile:profile.profileKey});
  }
}
await save(dir+'/result.public.json',{faq:78,release:'2.99.5',samples,priorSignedControls:'build/ticket-28-wave2-capabilities-20261113-v1/immortal-indomitable',scope:'Standard product roster, target query and legal menu in both directions',providerCalls:0});
