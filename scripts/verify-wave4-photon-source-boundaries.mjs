import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {identifyPhotonReserveEntryV1,createPhotonOverchargeEntryV1,PHOTON_OVERCHARGE_ID} from '../packages/product-composition/official-photon-overcharge-entry-v1.mjs';
import {OFFICIAL_FAQ_REACTION_POLICY_V13 as faq} from '../packages/rule-atoms/official-faq-reaction-policy-v13.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),historicalRoot=path.resolve(root,'../../..','starcraft-tmg-level3/.worktrees/ticket-27-slice-271-codex-integration'),
 faqRef='build/ticket-28-wave3-assessment-20261112/faq-v1.3.pdf',bytes=await fs.readFile(path.join(historicalRoot,faqRef)),sha=createHash('sha256').update(bytes).digest('hex');
assert.equal(sha,faq.sourceByteHash);
const before={pieces:[{id:'actor',sideKey:'player1',isOnField:false},{id:'edge',sideKey:'player1',isOnField:true}],
 reserveManifestBySide:{player1:[{pieceId:'actor'}]}},after={...before,pieces:before.pieces.map(p=>p.id==='actor'?{...p,isOnField:true}:p)},cases=[];
for(const definitionId of ['unit:omega_worm/omega-network-any-phase@1','unit:pylon/warp-conduit-movement-phase@1','unit:zagara/infested-drop-movement-phase@1']){
 const events=[{type:'unit_deploy_resolved',pieceId:'actor',entrySource:{definitionId,sourceRouteHash:'a'.repeat(64),sourcePieceId:'edge',sourceFootprintHash:'b'.repeat(64)}}],result={state:after,events};
 assert.ok(identifyPhotonReserveEntryV1(before,result,{}));
 assert.equal(identifyPhotonReserveEntryV1(before,result,{},{friendlyEntryEdgesImmune:true}),null);
 cases.push({case:definitionId,scope:'entry-observer component only',legacyDefaultPreserved:true,ownEntryEdgeImmune:true});
}
for(const effectKind of ['ventral_sacs_reserve_landing','reserve_beacon_landing']){
 assert.ok(identifyPhotonReserveEntryV1(before,{state:after,events:[{type:'reserve_deployed_via_special_entry',pieceId:'actor',effectKind,sourceAssetId:'beacon'}]}, {},{friendlyEntryEdgesImmune:true}));
 cases.push({case:effectKind,scope:'entry-observer component only',temporaryTransportRecognized:true});
}
for(const result of [{state:after,events:[{type:'unit_deploy_resolved',pieceId:'actor'}]},
 {state:after,events:[{type:'relocation_ability_resolved',pieceId:'actor',deploymentResolved:true,effectKind:'entry_edge_place'}]}]){
 assert.equal(identifyPhotonReserveEntryV1(before,result,{},{friendlyEntryEdgesImmune:true}),null);
}
const route={definitionId:PHOTON_OVERCHARGE_ID,routeHash:'c'.repeat(64)};
assert.throws(()=>createPhotonOverchargeEntryV1({},route,{}, {includeSealedCompletion:true,faqSourceByteHash:'0'.repeat(64)}),/PHOTON_ENTRY_FAQ_SOURCE_REQUIRED/);
const legacy=createPhotonOverchargeEntryV1({},route,{});assert.equal(legacy.afterSealedHits,undefined);assert.equal(legacy.sourceAuthority.reactionContextFor,undefined);
const current=createPhotonOverchargeEntryV1({},route,{}, {includeSealedCompletion:true,faqSourceByteHash:sha});assert.equal(typeof current.afterSealedHits,'function');
const result={schema:'starcraft_tmg_wave4_photon_source_boundaries_v1',status:'passed_component',scope:'source qualification and entry observer; no Native Room admission',
 officialFaq:{version:'1.3',date:'2026-11-11',url:'https://starcraft-tmg.com/files/downloads/StarCraft-TMG-FAQ_EN.pdf',frozenRef:faqRef,sha256:sha,actualFrozenBytesVerified:true},
 cases,ownTableEdgeAndBurrowAmbushExcluded:true,wrongFaqHashRejected:true,legacyDefaultPreserved:true,
 nativeActions:0,modelCalls:0,sourceHeldDefinitions:39,fullMatchAdmission:false,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/photon-source-boundaries.public.json'),JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,observerCases:cases.length,sourceHeldDefinitions:39}));
