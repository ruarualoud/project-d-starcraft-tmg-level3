import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {matchesStarcraftTmgParameterizedPreviewActionV1 as matches} from '../packages/client-domain/staged-ranged-preview-v1.mjs';
import {hashStarcraftTmgContract as hash} from '../packages/authoritative-engine/referee-crypto-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),proof=JSON.parse(await fs.readFile(path.join(root,'docs/development/wave4/evidence/tal-darim-threshold.public.json'),'utf8')),
  row=proof.results.find(r=>r.id==='ranged-6'),directory=path.join(root,row.directoryRef);let fixture;
for(const file of(await fs.readdir(directory)).filter(f=>f.startsWith('operation-'))){
  const value=JSON.parse(await fs.readFile(path.join(directory,file),'utf8'));
  if(value.domain?.actionType==='ranged_attack'&&value.preview.core.action.actionType==='roll_ranged_attack_hit_pool'){fixture=value;break;}
}
assert.ok(fixture);const action=fixture.preview.core.action,entry=fixture.domain,parameters=fixture.preview.core.proposal.parameters,cases=[];
const check=(name,fn)=>{fn();cases.push(name);};
function staged(a,edit){if(a.sourceAction){staged(a.sourceAction,edit);a.sourceActionHash=hash(a.sourceAction);}else edit(a);}
check('real Native precision hit-pool Preview matches its selected target/weapon/plan',()=>assert.equal(matches(action,entry,parameters),true));
check('existing direct action type remains accepted',()=>assert.equal(matches({actionType:'pass'},{actionType:'pass'},{}),true));
check('unregistered staged action name rejected',()=>assert.equal(matches({...action,actionType:'roll_arbitrary_pool'},entry,parameters),false));
check('changed source wrapper without matching seal rejected',()=>{const a=structuredClone(action);a.sourceAction.pieceId='other';assert.equal(matches(a,entry,parameters),false);});
check('changed selected target rejected',()=>assert.equal(matches(action,entry,{...parameters,targetUnitId:'other'}),false));
check('different weapon domain rejected',()=>assert.equal(matches(action,{...entry,weaponName:'Stomp'},parameters),false));
check('resealed forged parent target rejected',()=>{const a=structuredClone(action);staged(a,s=>{s.attackAction.targetId='other';s.attackActionHash=hash(s.attackAction);});assert.equal(matches(a,entry,parameters),false);});
check('resealed changed attack plan rejected',()=>{const a=structuredClone(action);staged(a,s=>{s.attackAction.rangedPlan.attackPlanHash=hash('other');s.attackActionHash=hash(s.attackAction);});assert.equal(matches(a,entry,parameters),false);});
check('zero-Precision staged plan rejected',()=>{const a=structuredClone(action);staged(a,s=>{s.precisionValue=0;});assert.equal(matches(a,entry,parameters),false);});
await atomicWrite(path.join(root,'docs/development/wave4/evidence/tal-darim-staged-preview.public.json'),JSON.stringify({
  schema:'starcraft_tmg_wave4_staged_ranged_preview_v1',status:'passed_component',cases,sourceRoomId:row.roomId,
  nativeRulesChanged:false,newSignedActions:0,modelCalls:0,trainingTruth:false},null,2)+'\n');
console.log(JSON.stringify({status:'passed_component',cases:cases.length}));
