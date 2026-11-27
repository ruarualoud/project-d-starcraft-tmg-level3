import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.resolve(process.argv[2]);
assert.ok(directory.startsWith(path.join(root,'build/wave4-web')+path.sep));
const service=JSON.parse(await fs.readFile(path.join(directory,'service.private.json'),'utf8'));
assert.equal(service.origin,'http://127.0.0.1:5484');assert.equal(service.liveEnabled,false);
const api=service.origin+'/starcraft-tmg-level3/api/v1/rooms/';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const results=[];
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
async function current(item) {
  const store=openWave3EngineeringStoreV1({directory:path.join(directory,'rooms',item.kind),filename:'room.sqlite',readOnly:true});
  try{return await store.loadRoom(item.roomId);}finally{store.close();}
}
async function legal(page) {
  await page.getByRole('button',{name:'行动',exact:true}).click();
  const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/legal-space')&&r.request().method()==='POST'),
    page.getByRole('button',{name:'Load LegalSpace',exact:true}).click()]);
  const value=await response.json();assert.equal(value.result.ok,true);return value.result.legalSpace;
}
async function operate(page,item,choice,parameterized) {
  const before=await current(item);
  const title=choice.abilityName||choice.weaponName||(choice.actionType==='move'?'move · Stalker':choice.actionType);
  const card=page.getByText(new RegExp(escape(title))).first().locator('..');
  const standardMove=choice.actionType==='move';
  if(standardMove) {
    await card.getByRole('button',{name:'编辑参数',exact:true}).click();
    await page.getByRole('button',{name:'enemy-model-1',exact:true}).click();
    await page.getByLabel('战场 X 坐标，英寸',{exact:true}).fill('25');
    await page.getByLabel('战场 Y 坐标，英寸',{exact:true}).fill('10');
    await page.getByRole('button',{name:'添加路径点',exact:true}).click();
  } else if(parameterized) {
    await card.getByRole('button',{name:'设置行动',exact:true}).click();
    const form=page.getByTestId('native-action-form');
    if(choice.definitionId==='unit:stalker/blink-movement-phase@1') {
      await form.getByText('领队模型',{exact:true}).locator('..').getByRole('button').first().click();
      await form.getByRole('button',{name:'添加模型最终站位',exact:true}).click();
      await form.getByText('模型',{exact:true}).locator('..').getByRole('button').first().click();
      await form.getByLabel('横向位置（英寸）',{exact:true}).fill('25');
      await form.getByLabel('纵向位置（英寸）',{exact:true}).fill('10');
    }
    if(item.flow==='infantry-burrow'){
      await form.getByText('领队模型',{exact:true}).locator('..').getByRole('button',{name:'actor-model-1',exact:true}).click();
      await form.getByText('进场区段',{exact:true}).locator('..').getByRole('button',{name:'red-entry-1',exact:true}).click();
      for(let index=0;index<item.modelCount;index++){
        await form.getByRole('button',{name:'添加模型最终站位',exact:true}).click();
        const x=form.getByLabel('横向位置（英寸）',{exact:true}).nth(index),row=x.locator('..').locator('..');
        await row.getByText('模型',{exact:true}).locator('..').getByRole('button',{name:'actor-model-'+(index+1),exact:true}).click();
        await x.fill(String(35+index%3*1.31));
        await form.getByLabel('纵向位置（英寸）',{exact:true}).nth(index).fill(String(27+Math.floor(index/3)*1.31));
      }
    }
    if(await form.getByText('支付卡牌',{exact:true}).count()){
      const payments=form.getByText('支付卡牌',{exact:true}).locator('..');
      if(item.flow==='admiral-exchange')await payments.getByRole('button',{name:'player1-tactical-2',exact:true}).click();
      else await payments.getByRole('button').first().click();
    }
    if(choice.actionType==='choose_universal_carrier_heal')await form.getByRole('button',{name:item.healTarget,exact:true}).click();
    if(item.flow==='admiral-exchange')await form.getByText('友方单位（可跳过）',{exact:true}).locator('..').getByRole('button',{name:'marine',exact:true}).click();
    if(['admiral-exchange','trooper-restoration','stukov-spread'].includes(item.flow)&&choice.actionType==='resolve_characteristic_status_ability')
      await form.getByText('目标单位',{exact:true}).locator('..').getByRole('button',{name:'enemy',exact:true}).click();
    if(item.flow==='munitions-support'&&choice.definitionId==='unit:medic/life-support-any-phase@1'){
      const target=form.getByText('目标单位',{exact:true});
      if(await target.count())await target.locator('..').getByRole('button',{name:'enemy',exact:true}).click();
    }
    if(item.flow==='creep-place'){
      await form.getByLabel('横向位置（英寸）',{exact:true}).fill(String(item.coordinate.xMilliInches/1000));
      await form.getByLabel('纵向位置（英寸）',{exact:true}).fill(String(item.coordinate.yMilliInches/1000));
    }
    if(choice.effectKind==='infestation_transfer')await form.getByRole('button',{name:'recipient',exact:true}).click();
  }
  await page.screenshot({path:path.join(directory,item.kind+'-r'+before.stateRevision+'-form.png')});
  const [response]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/preview')&&r.request().method()==='POST'),
    standardMove?page.getByRole('button',{name:'提交权威 Preview',exact:true}).click():parameterized?page.getByTestId('native-action-form').getByRole('button',{name:'预览此行动',exact:true}).click()
      :card.getByRole('button',{name:'生成 Preview',exact:true}).click()]);
  const value=await response.json();assert.equal(value.result.ok,true,JSON.stringify(value));
  assert.equal(value.result.preview.core.confirmationPolicy.requiresExplicitHuman,true);
  assert.equal((await current(item)).envelope.stateHash,before.envelope.stateHash);
  await page.getByText('密封 Preview，等待真人确认',{exact:true}).waitFor();
  await page.screenshot({path:path.join(directory,item.kind+'-r'+before.stateRevision+'-preview.png')});
  const [apply,replay]=await Promise.all([
    page.waitForResponse(r=>r.url().endsWith('/apply')&&r.request().method()==='POST'),
    page.waitForResponse(r=>r.url().endsWith('/replay')&&r.request().method()==='GET',{timeout:60000}),
    page.getByRole('button',{name:'确认并应用',exact:true}).click()]);
  assert.equal((await apply.json()).result.ok,true);
  assert.equal((await replay.json()).result.matchesCurrent,true);
  const after=await current(item);assert.equal(after.stateRevision,before.stateRevision+1);
  await page.getByText('verified revision: '+after.stateRevision,{exact:true}).waitFor();
  return{actionType:choice.actionType,definitionId:choice.definitionId||null,sideKey:choice.sideKey,
    stateRevision:after.stateRevision,stateHash:after.envelope.stateHash};
}
try {
  for(const item of service.rooms) {
    const completedRef=path.join(directory,item.kind+'-result.public.json');
    const completed=await fs.readFile(completedRef,'utf8').then(JSON.parse).catch(error=>{if(error.code==='ENOENT')return null;throw error;});
    if(completed){assert.equal((await current(item)).envelope.stateHash,completed.trace.at(-1).stateHash);results.push(completed);continue;}
    const contexts=await Promise.all([browser.newContext({viewport:{width:1500,height:1000}}),
      browser.newContext({viewport:{width:390,height:844}})]);
    const pages={player1:await contexts[0].newPage(),player2:await contexts[1].newPage()};
    const credentials=JSON.parse(await fs.readFile(path.join(directory,'rooms',item.kind,item.roomId+'.seats.private.json'),'utf8'));
    const errors=[];const trace=[];const auth={};
    try {
      assert.equal((await current(item)).stateRevision,0,'WEB_TURRET_REQUIRES_FRESH_SIGNED_PREFIX');
      for(const side of ['player1','player2']) {
        const page=pages[side];page.on('pageerror',error=>errors.push(error.message));
        page.on('request',request=>{if(request.url().startsWith(api)&&request.headers().authorization)auth[side]=request.headers().authorization;});
        const ticket=await fetch(api+item.roomId+'/recovery-tickets',{method:'POST',
          headers:{authorization:'Bearer '+credentials[side].seatToken,'content-type':'application/json'},body:'{}'}).then(r=>r.json());
        assert.equal(ticket.result.ok,true);
        const recovering=page.waitForResponse(r=>r.url().endsWith('/recovery-exchange')&&r.request().method()==='POST');
        await page.goto(service.origin+'/room/'+item.roomId+'#recovery='+encodeURIComponent(ticket.result.recovery.recoveryToken));
        assert.equal((await(await recovering).json()).result.credential.seatKey,side);
        await page.getByTestId('battlefield-map-contract-v1').waitFor({timeout:60000});
      }
      let primaryUsed=false,shotUsed=false,restorationUsed=false;
      for(let step=0;step<12;step++) {
        const aggregate=await current(item);const state=aggregate.envelope.state;
        if(primaryUsed&&!state.pendingOfficialPlaguedMunitions&&!state.pendingOfficialUniversalCarrier&&!state.pendingOfficialReactionWindow&&!state.pendingOfficialAutoTurretOverwatch
          &&!state.pendingOfficialInfestationTransfer&&!state.pendingCurrentProductRangedCasualtyChoice&&!state.pendingOfficialAutomaticHits
          &&!state.pendingOfficialHitsPoolChoice&&!state.officialBeforeCasualtyContinuations?.length)break;
        const owner=state.activeSideKey;assert.ok(pages[owner]);
        const menu=await legal(pages[owner]);
        if(!primaryUsed&&item.id==='infected-ordinary-move'){assert.ok(!menu.parameterDomains.some(row=>['unit:stalker/blink-movement-phase@1','card:nexus/strategic-recall-any@1'].includes(row.definitionId)));}
        if(!primaryUsed&&item.id==='clean-blink')assert.ok(menu.parameterDomains.some(row=>row.definitionId==='card:nexus/strategic-recall-any@1'));
        const other=owner==='player1'?'player2':'player1';
        if(!primaryUsed&&item.definitionId) {
          const forbidden=await fetch(api+item.roomId+'/legal-space',{method:'POST',
            headers:{authorization:'Bearer '+credentials[other].seatToken,'content-type':'application/json'},body:'{}'}).then(r=>r.json());
          assert.ok(!forbidden.result.ok||!forbidden.result.legalSpace.parameterDomains.some(row=>row.definitionId===item.definitionId));
        }
        let choice;
        if(!primaryUsed)choice=menu.parameterDomains.find(row=>item.id==='infected-ordinary-move'?row.actionType==='move'&&row.pieceId==='enemy':item.id==='clean-blink'?row.definitionId==='unit:stalker/blink-movement-phase@1':item.id==='clean-recall'?row.definitionId==='card:nexus/strategic-recall-any@1':row.definitionId===item.definitionId);
        else if(item.kind==='ocular-use'&&!shotUsed)choice=menu.parameterDomains.find(row=>row.weaponName==='Firefly Missiles');
        else if((item.kind==='growing-restoration-exception'||item.flow==='carrier-restoration'||item.flow==='trooper-restoration')&&!restorationUsed)choice=menu.parameterDomains.find(row=>row.definitionId==='unit:medic/restoration-any-phase@1'||item.flow==='carrier-restoration'&&row.effectKind==='infestation_transfer');
        choice ||= menu.parameterDomains.find(row=>row.actionType==='pass_reaction_family_window')||menu.parameterDomains[0];
        const schema=choice?.sourceDomain?.parameterSchema||choice?.parameterSchema;
        let parameterized=Boolean(schema?.required?.length);
        if(!choice){choice=menu.finiteActions[0]?.action;parameterized=false;}
        assert.ok(choice,'WEB_TURRET_SUCCESSOR_MISSING:'+JSON.stringify(menu));
        trace.push(await operate(pages[owner],item,choice,parameterized));
        if(choice.definitionId===item.definitionId||['infected-ordinary-move','clean-blink','clean-recall'].includes(item.id))primaryUsed=true;
        if(choice.weaponName==='Firefly Missiles')shotUsed=true;
        if(choice.definitionId==='unit:medic/restoration-any-phase@1')restorationUsed=true;
      }
      const final=await current(item);assert.ok(primaryUsed);
      if(item.kind==='growing-restoration-exception'||item.flow==='carrier-restoration') {
        if(item.flow==='carrier-restoration'){assert.equal(final.envelope.state.pieces.find(piece=>piece.id===item.healTarget).damageMarker,0);assert.equal(final.envelope.state.officialUniversalCarrierHistory.at(-1).healResolution.effectiveHeal,1);}
        const recipient=final.envelope.state.pieces.find(piece=>piece.id==='recipient');
        assert.equal(recipient.statuses.some(status=>String(status.statusName||status).toLowerCase()==='infestation'),false);
        assert.equal(restorationUsed,true);
      } else if(item.flow==='detonation-ranged'){
        const state=final.envelope.state;assert.equal(Boolean(state.officialBeforeCasualtyContinuations?.length),false);
        assert.equal(state.rangedActionHistory.length,1);assert.equal(state.rangedActionHistory[0].resolutionHash,item.expectedOriginalResolutionHash);
        assert.ok(!state.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
      } else if(item.flow==='infantry-burrow'){
        const actor=final.envelope.state.pieces.find(p=>p.id==='actor');
        assert.equal(actor.isOnField,true);assert.equal(actor.currentModels,item.modelCount);
        assert.equal(actor.activatedPhases.movement,true);
      } else if(item.flow==='munitions-support'){
        const history=final.envelope.state.officialPlaguedMunitionsHistory;
        assert.equal(history.length,1);assert.equal(history[0].incomingNonLethalDamage,1);
        assert.ok(history[0].damagePool.appliedReduction>0);assert.equal(history[0].nonLethalResolution.casualtyModelIds.length,0);
      } else if(item.flow==='admiral-exchange'){
        const state=final.envelope.state,enemy=state.pieces.find(p=>p.id==='enemy');
        assert.equal(enemy.activatedPhases.movement,true);
        assert.ok(!enemy.statuses.some(s=>String(s.statusName||s).toLowerCase()==='infestation'));
        assert.equal(state.pieces.find(p=>p.id==='marine').activatedPhases.movement,false);
      } else if(['trooper-restoration','stukov-spread'].includes(item.flow)){
        const enemy=final.envelope.state.pieces.find(p=>p.id==='enemy');
        assert.equal(enemy.statuses.some(s=>String(s.statusName||s).toLowerCase()==='infestation'),item.flow==='stukov-spread');
        if(item.flow==='trooper-restoration')assert.equal(restorationUsed,true);
      } else if(item.flow==='creep-place'){
        const state=final.envelope.state;const token=state.board.tokens.find(t=>t.tokenKind==='creep_tumor');
        assert.ok(token);assert.equal(token.stayInPlay,true);
        assert.equal(state.officialBattlefieldAssetBindings.find(b=>b.assetId===token.tokenId).displacement,true);
        assert.ok(state.officialBattlefieldAssetFamilySourceBundle.definitionIds.includes(item.creepId));
      } else {
        const enemy=final.envelope.state.pieces.find(piece=>piece.id==='enemy');
        if(item.kind==='clean-recall')assert.equal(enemy.isInReserves,true);
        else assert.equal(enemy.models[0].xInches,25);
      }
      assert.deepEqual(errors,[]);
      for(const side of ['player1','player2']) {
        await pages[side].bringToFront();
        await pages[side].getByText('r'+final.stateRevision,{exact:true}).waitFor({timeout:20000});
        const ticket=await fetch(api+item.roomId+'/recovery-tickets',{method:'POST',
          headers:{authorization:auth[side],'content-type':'application/json'},body:'{}'}).then(r=>r.json());
        assert.equal(ticket.result.ok,true);
        await pages[side].goto('about:blank');
        await pages[side].goto(service.origin+'/room/'+item.roomId+'#recovery='+encodeURIComponent(ticket.result.recovery.recoveryToken));
        await pages[side].getByTestId('battlefield-map-contract-v1').waitFor({timeout:60000});
        const projected=await fetch(api+item.roomId,{headers:{authorization:auth[side]}}).then(r=>r.json());
        assert.equal(projected.result.projection.viewer.seatKey,side);
      }
      assert.equal((await current(item)).envelope.stateHash,final.envelope.stateHash);
      results.push({kind:item.kind,definitionId:item.definitionId,sourceRoomId:item.sourceRoomId,sourceStateHash:item.sourceStateHash,
        sourcePrefixReceipts:item.sourcePrefixReceipts,trace,signedActions:trace.length,twoSeatsVerified:true,
        explicitHumanConfirmation:true,previewReadOnly:true,replayMatchesCurrent:true,seatRecoveryReentryVerified:true,pageErrors:errors});
      await atomicWrite(completedRef,JSON.stringify(results.at(-1),null,2));
      console.log(JSON.stringify({case:item.kind,status:'passed',signedActions:trace.length}));
    } finally {await Promise.all(contexts.map(context=>context.close()));}
  }
} finally {await browser.close();}
const result={schema:'starcraft_tmg_wave4_virus_web_verification_v1',status:'passed_scoped',
  runRef:path.relative(root,directory),results,signedActions:results.reduce((sum,row)=>sum+row.signedActions,0),
  conditionalTurretGeometryInRestorationCaseOnly:service.rooms.some(item=>item.id==='growing-restoration-exception'||item.flow==='carrier-restoration'),sourceHeldDefinitions:39,
   engineeringEstimatedUnitGeometry:service.rooms.some(item=>['admiral-exchange','trooper-restoration','stukov-spread','munitions-support','infantry-burrow','detonation-ranged'].includes(item.flow)),
  fullWave4LobbyBuilderAdmission:false,fullMatchAdmission:false,wave3PlayerRoomsTouched:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(directory,'web-result.public.json'),JSON.stringify(result,null,2)+'\n');
await atomicWrite(path.join(root,'docs/development/wave4/evidence/'+(process.argv[3]||'virus-web.public.json')),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,signedActions:result.signedActions,rooms:results.length}));
