import assert from 'node:assert/strict';
import {readFile, mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';
import {loadWave3HumanMatchSetupsV1, wave3HumanMapConfiguration} from '../packages/product-composition/wave3-human-match-v1.mjs';
import {armyToText, textToArmy, computeArmyState, createEmptyArmy, createRosterUnit} from '../apps/starcraft-tmg-expo/lib/army-calc.ts';
import {createOfficialAbilityEffectIrCatalogueV1,createOfficialAbilitySourcePhasePolicyV1} from '../packages/source-data/official-ability-effect-ir-v1.mjs';
import {createOfficialBattlefieldAssetFamilySourceBundleV2,createOfficialCreepCardComponentAdapterV2} from '../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const steps=[];
if(!process.argv.includes('--import-only')&&!process.argv.includes('--native-only')) {
  const read=async ref=>JSON.parse(await readFile(path.join(root,ref),'utf8'));
  const manifest=await read('content/source-releases/wave3-20261126-human-match-v2.json');
  const dataset=await read(manifest.source.datasetRef),identityCatalogue=await read(manifest.components.abilityIdentities.ref);
  const catalogue=createOfficialAbilityEffectIrCatalogueV1({dataset,identityCatalogue,
    sourcePhasePolicy:createOfficialAbilitySourcePhasePolicyV1({dataset,includeInlineCardPhases:true})});
  const bundle=createOfficialBattlefieldAssetFamilySourceBundleV2({catalogue,definitionIds:[
    'unit:marauder/veteran-of-tarsonis-any-phase@1','card:hatchery/creep-spread-any@1']});
  assert.deepEqual(bundle.routes.map(r=>r.effectKind).sort(),['creep_token_place','marker_armour']);
  const adapter=createOfficialCreepCardComponentAdapterV2(bundle);
  assert.equal(adapter.definitionBindings.length,2);
  steps.push('Source-verified active Creep and Veteran of Tarsonis modifier coexist in one component adapter');
  if(process.argv.includes('--assets-only')) {console.log(JSON.stringify({passed:true,steps}));process.exit(0);}
}
const directory=path.join(root,'build/player-roster-regression',new Date().toISOString().replaceAll(':','-'));
const setup=(await loadWave3HumanMatchSetupsV1(root)).find(s=>s.id==='wave3-standard-v1');
const server=await createStarcraftProductServerV1({dataDirectory:directory,fixtureRoot:root,
  webRoot:path.join(root,'build/playtest-web/web'),mapConfiguration:wave3HumanMapConfiguration(setup),
  offlineWave3MatchVersion:'2.99.12',liveEnabled:false,port:0});
let tankArmy;
try {
  const api=async(route,body,cookie)=>{
    const response=await fetch(server.origin+'/starcraft-tmg-level3/product/v1'+route,{
      method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',...(cookie?{cookie}:{})},
      ...(body===undefined?{}:{body:JSON.stringify(body)})});
    return {status:response.status,data:await response.json(),cookie:response.headers.get('set-cookie')?.split(';')[0]};
  };
  const {catalogue}=await (await fetch(server.origin+'/starcraft-tmg-level3/roster-planning/v1/match-setup',
    {headers:{'x-starcraft-match-setup':setup.id}})).json();
  if(!process.argv.includes('--native-only')) {
    const note=await readFile(path.join(root,'docs/development/wave3/longshanks-polish-terran-tank-roster.zh-CN.md'),'utf8');
    const text=note.match(/```text\n([\s\S]*?)```/)[1];
    const army=textToArmy(text,catalogue.cards,catalogue.units);
    assert(army);
    tankArmy={...army,officialDatasetHash:catalogue.source.officialDatasetHash};
    const cardNames=army.tacticalCardIds.map(id=>catalogue.cards.find(c=>c.id===id).name);
    assert.deepEqual(cardNames,['Barracks (Proxy)','Factory','Factory','Orbital Command','Factory (Tech Lab)','Vanadium Plating']);
    assert.equal(army.roster.length,8);
    const totals=computeArmyState(army,catalogue.cards);
    assert.equal(totals.mineralsUsed,1990);assert.equal(totals.gasUsed,200);assert.equal(totals.supplyUsed,12);
    const roundtrip=textToArmy(armyToText(army,catalogue.cards,catalogue.units),catalogue.cards,catalogue.units);
    assert.deepEqual(roundtrip.tacticalCardIds,army.tacticalCardIds);
    assert.deepEqual(roundtrip.roster,army.roster);
    steps.push('Longshanks tank roster imports without truncating parenthesized cards; exact 1990M/200G/12 supply roundtrip');
  }
  if(!process.argv.includes('--import-only')) {
    const created=await api('/lineups',{setupId:setup.id});assert.equal(created.status,201);
    const base='/lineups/'+created.data.lineup.id,cookie=created.cookie;
    const army={...createEmptyArmy('Zerg','Creep validation regression'),mineralsLimit:2000,
      officialDatasetHash:catalogue.source.officialDatasetHash,factionCardId:'zagara_s_swarm',
      roster:[createRosterUnit(catalogue.units.find(u=>u.id==='swarmling__zergling_'),'small')]};
    const bad=await api(base+'/submit',{army},cookie);
    assert.equal(bad.status,422,'illegal rosters must be a validation response, not a server failure');
    assert.equal(bad.data.reason,'FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID:tactical_cards:zagara_s_swarm:Creep:0');
    const invalid=await api(base+'/validate',{army},cookie);assert.equal(invalid.status,422);
    const valid={...army,tacticalCardIds:['reactive_creep']};
    assert.equal((await api(base+'/validate',{army:valid},cookie)).status,200);
    assert.equal((await api(base,undefined,cookie)).data.lineup.submitted,false,'preview must never submit a seat');
    assert.equal((await api(base+'/validate',{army:{...army,tacticalCardIds:['reactive_creep','accelerating_creep']}},cookie)).status,422);
    assert.equal((await api(base+'/validate',{army:valid,side:'player2'},cookie)).status,422);
    assert.equal((await api(base+'/validate',{army:valid})).status,401);
    const submit=await api(base+'/submit',{army:valid},cookie);
    assert.equal(submit.status,200);assert.equal(submit.data.lineup.submitted,true);assert.equal(submit.data.lineup.ready,false);
    steps.push('Native Creep count 0/1/2; dry-run validation preserves seat; illegal submit 422; valid Zagara submits; other seat and credentials required');
    if(tankArmy) {
      const mixed=await api('/lineups',{setupId:setup.id}),mixedBase='/lineups/'+mixed.data.lineup.id;
      assert.equal((await api(mixedBase+'/submit',{army:tankArmy},mixed.cookie)).status,200);
      const guest=await api(mixedBase+'/join',{invite:mixed.data.lineup.invite});assert.equal(guest.status,200);
      const opened=await api(mixedBase+'/submit',{army:{...valid,tacticalCardIds:['reactive_creep','hatchery']}},guest.cookie);
      assert.equal(opened.status,200,JSON.stringify(opened.data));assert.equal(opened.data.lineup.ready,true);
      assert.equal((await api(mixedBase,undefined,mixed.cookie)).data.lineup.ready,true);
      steps.push('Real two-seat admission: Longshanks Terran tank/Veteran of Tarsonis plus Zagara/Reactive Creep/Hatchery create the same ready room without model calls or gameplay actions');
      // Reproduce a first-start failure before any credentials/envelope were created.
      // This is isolated QA data; no live player room or credentials are read.
      const original=JSON.parse(await readFile(path.join(directory,'lineups',mixed.data.lineup.id+'.json'),'utf8'));
      const template=JSON.parse(await readFile(path.join(directory,'rooms',original.roomId,'room.private.json'),'utf8'));
      const recovery=await api('/lineups',{setupId:setup.id}),recoveryFile=path.join(directory,'lineups',recovery.data.lineup.id+'.json');
      const pending=JSON.parse(await readFile(recoveryFile,'utf8'));
      pending.player1=original.player1;pending.player2=original.player2;
      await writeFile(recoveryFile,JSON.stringify(pending),{mode:0o600});
      const recoveryRoomId='product-'+randomUUID(),recoveryDirectory=path.join(directory,'rooms',recoveryRoomId);
      await mkdir(recoveryDirectory,{recursive:true});
      await writeFile(path.join(recoveryDirectory,'room.private.json'),JSON.stringify({...template,
        roomId:recoveryRoomId,lineupId:pending.id,credentials:null,admissionStatus:'preparing',setupError:'first-start-repro'}),{mode:0o600});
      assert.equal((await api('/lineups/'+pending.id,undefined,recovery.cookie)).data.lineup.ready,true);
      const recovered=JSON.parse(await readFile(recoveryFile,'utf8'));
      assert.equal(recovered.roomId,recoveryRoomId,'recovery must reuse the preparing room');
      const record=JSON.parse(await readFile(path.join(recoveryDirectory,'room.private.json'),'utf8'));
      assert.equal(record.admissionStatus,'ready');assert.equal(record.setupError,undefined);assert(record.credentials);
      steps.push('Preparing room with null credentials recovers the same room ID and both submitted rosters');
    }
  }
  await mkdir(directory,{recursive:true});
  await writeFile(path.join(directory,'result.public.json'),JSON.stringify({passed:true,version:'2.99.12',steps,providers:0},null,2)+'\n');
  console.log(JSON.stringify({passed:true,steps,evidence:path.relative(root,directory)}));
} finally {await server.close();}
