import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createStarcraftProductRoomHostV1} from './support/starcraft-product-room-host-v1.mjs';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createStarcraftTmgSceneQueryServiceV1} from '../packages/online-agent-session/scene-query-service-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root=process.cwd(),dir=path.resolve('build/ticket-28-wave3-release-wide-phases');
const output=path.join(dir,'faction-queries');
await fs.mkdir(output,{recursive:true});
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const inventory=(await read('coordination/wave3/new-definition-inventory.json')).entries;
const provenance=new Map((await read('coordination/wave3/match-increment-facts.json')).rows.filter(r=>r.wave3).map(r=>[r.id,r]));
const targets=inventory.filter(r=>['T28-W3-07','T28-W3-08','T28-W3-10'].includes(r.plannedItemId));
assert.equal(targets.length,122);
const {roomId}=await read(path.join(dir,'room.public.json'));
const host=await createStarcraftProductRoomHostV1({root,dataDirectory:dir,liveEnabled:false,mapConfiguration:{seedId:'standard-d6-1'},offlineWave3MatchVersion:'2.99.2'});
try{
  const room=await host.get(roomId),{envelope}=await room.roomStore.loadRoom(roomId);
  const seat={roomId,seatToken:room.record.credentials.human.seatToken};
  const roomApi=room.fixture.roomRuntime,side='player1';
  const [{projection},{legalSpace}]=await Promise.all([roomApi.readRoom(seat),roomApi.legalSpace(seat)]);
  const scene=createStarcraftTmgSceneQueryServiceV1({roomStore:room.roomStore,rulesRuntime:room.fixture.rulesRuntime,seatKey:side});
  const board=await createRosterPlanningProductModuleV1({root,roomId,...host.planningInputsForSetup(room.record.releaseSetup.id),operation:'board_queries'});
  const catalogue=board.readBuilderCatalogue();
  const rows=[];
  for(const key of new Set(targets.map(r=>r.normalizedSourceRef.recordKey))){
    const file=path.join(output,key.replace(':','-')+'.public.json');
    let row;try{row=await read(file);}catch(e){if(e.code!=='ENOENT')throw e;}
    if(row){assert.equal(row.stateHash,envelope.stateHash);assert.equal(row.dataset,catalogue.source.officialDatasetHash);}
    else{
      const [type,id]=key.split(':');
      const cards=type==='army_units'?catalogue.units:catalogue.cards;
      const card=cards.find(c=>c.id===id);
      const builder=(card.upgrades??card.boosts).map(f=>f.ruleTiming);
      const request={queryKind:'ability.timing',arguments:{recordKey:key}};
      const actual=await scene.query({roomProjection:projection,legalSpace,request});
      assert.equal(actual.status,'exact',key+' '+actual.reason);
      assert.deepEqual(actual.result.definitions,builder,key);
      const teach=await board.teachEvidencePort.query({challengeId:'faction-public-source-'+id,mutationAuthority:false,
        initialFoundationHash:envelope.stateHash,sourceHashes:[catalogue.source.officialDatasetHash],request:{kind:'spatial',
          toolRequest:{queryKind:'ability.timing',argumentsJson:JSON.stringify(request.arguments),seatKey:side}}});
      const returned=teach.sourceReceipt?.queryReceipt;
      assert.deepEqual(returned?.result,actual.result,key+' '+teach.unknownReasonCode);
      const covered=targets.filter(r=>r.normalizedSourceRef.recordKey===key).map(t=>{
        const fact=builder[t.normalizedSourceRef.index],expected=provenance.get(fact.definitionId);
        assert.equal(fact.definitionId,t.semanticId+'@'+t.semanticVersion);
        assert.equal(expected.wave3.sourceFeatureHash,fact.sourceFeatureHash);
        assert.equal(expected.wave3.recordKey,key);
        const admission=expected.openingEvidence.filter(open=>open.rosterAdmitted);
        return {id:fact.definitionId,item:t.plannedItemId,source:fact.sourceFeatureHash,phase:fact.phase,
          component:t.componentVerification?.mainGate??null,admitted:admission.length>0};
      });
      row={key,stateHash:envelope.stateHash,dataset:catalogue.source.officialDatasetHash,roomReceipt:actual.queryReceiptHash,
        teachReceipt:returned.queryReceiptHash,covered};
      await atomicWrite(file,JSON.stringify(row,null,2)+'\n');
    }
    rows.push(row);
  }
  const facts=rows.flatMap(row=>row.covered),counts={};
  for(const f of facts)counts[f.item]=(counts[f.item]??0)+1;
  assert.deepEqual(counts,{'T28-W3-07':55,'T28-W3-08':44,'T28-W3-10':23});
  assert.equal(new Set(facts.map(f=>f.id)).size,122);
  await atomicWrite(path.join(output,'result.public.json'),JSON.stringify({counts,records:rows.length,rows,
    notIndividuallyAdmitted:facts.filter(f=>!f.admitted).map(f=>f.id),providerCalls:0},null,2)+'\n');
  console.log(JSON.stringify(counts));
}finally{await host.close();}
