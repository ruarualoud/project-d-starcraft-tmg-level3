import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {openWave3EngineeringStoreV1} from './support/wave3-room-boundary-fixture-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),directory=path.resolve(process.argv[2]),
  service=JSON.parse(await fs.readFile(path.join(directory,'service.private.json'),'utf8')),
  resume=process.argv.includes('--resume-confirmed'),choiceOnly=process.argv.includes('--choice-only'),results=[];
assert.ok(directory.startsWith(path.join(root,'build/wave4-web/tal-darim')+path.sep));
assert.equal(service.origin,'http://127.0.0.1:5484');assert.equal(service.liveEnabled,false);
const api=service.origin+'/starcraft-tmg-level3/api/v1/rooms/',
  browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const raw=d=>{while(d.sourceDomain)d=d.sourceDomain;return d;},action=a=>{while(a.sourceAction||a.attackAction)a=a.sourceAction||a.attackAction;return a;};
async function readRoom(item,fn){const store=openWave3EngineeringStoreV1({directory:path.join(directory,'rooms',item.kind),filename:'room.sqlite',readOnly:true});
  try{return await fn(store);}finally{store.close();}}
const current=item=>readRoom(item,s=>s.loadRoom(item.roomId));
const journal=item=>readRoom(item,async s=>(await s.loadReplayBundle(item.roomId)).privateJournal
  .filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt));
async function legal(page){await page.getByRole('button',{name:'行动',exact:true}).click();
  const [r]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/legal-space')&&r.request().method()==='POST'),
    page.getByRole('button',{name:'Load LegalSpace',exact:true}).click()]);
  const value=await r.json();assert.equal(value.result.ok,true);return value.result.legalSpace;}
async function operate(page,item,choice,isDomain){
  const before=await current(item),schema=isDomain?raw(choice).parameterSchema:null,
    parameterized=Boolean(schema?.required?.length),card=isDomain?page.getByTestId('native-domain-'+choice.domainId)
      :page.getByText(choice.abilityName||choice.weaponName||choice.actionType,{exact:false}).first().locator('..');
  if(parameterized){await card.getByRole('button',{name:'设置行动',exact:true}).click();const form=page.getByTestId('native-action-form');
    if(choice.actionType==='ranged_attack'){
      const index=schema.targetUnitId.enum.indexOf('enemy');assert.ok(index>=0);
      await form.getByTestId('native-choice-targetUnitId-'+index).click();
    }
    if(schema.required.includes('casualtySelectionHash'))await form.getByTestId('native-choice-casualtySelectionHash-0').click();
    if(schema.required.includes('convertedFailedHitDieIndices')){
      assert.ok(schema.convertedFailedHitDieIndices.items.enum.length);
      await form.getByRole('button',{name:'添加用 PRECISION 转为命中的骰',exact:true}).click();
      await form.getByTestId('native-choice-convertedFailedHitDieIndices-0').click();
    }
    const unsupported=schema.required.filter(k=>!Object.hasOwn(schema.properties?.[k]||schema[k],'const')
      &&!['targetUnitId','casualtySelectionHash','convertedFailedHitDieIndices'].includes(k));
    assert.deepEqual(unsupported,[],'WEB_THRESHOLD_NATIVE_FORM_SELECTION_REQUIRED');
    const size=await form.evaluate(el=>({clientWidth:el.clientWidth,scrollWidth:el.scrollWidth}));
    assert.ok(size.scrollWidth<=size.clientWidth+1,'THRESHOLD_FORM_HORIZONTAL_OVERFLOW');
  }
  const capture=before.stateRevision===0||choice.actionType==='choose_ranged_precision_hits';
  if(capture){await page.getByTestId('native-action-form').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(directory,item.kind+'-attack-form.png')});}
  const [preview]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/preview')&&r.request().method()==='POST'),
    parameterized?page.getByTestId('native-action-form').getByRole('button',{name:'预览此行动',exact:true}).click()
      :card.getByRole('button',{name:'生成 Preview',exact:true}).click()]);
  const value=await preview.json();assert.equal(value.result.ok,true,JSON.stringify(value));
  await fs.writeFile(path.join(directory,item.kind+'-latest-preview.private.json'),JSON.stringify({preview:value.result.preview,choice}));
  assert.equal(value.result.preview.core.confirmationPolicy.requiresExplicitHuman,true);
  assert.equal((await current(item)).envelope.stateHash,before.envelope.stateHash);
  try{await page.getByText('密封 Preview，等待真人确认',{exact:true}).waitFor();}
  catch(error){await page.screenshot({path:path.join(directory,item.kind+'-preview-failure.png')});
    console.log(JSON.stringify({id:item.id,revision:before.stateRevision,visibleStatus:(await page.locator('body').innerText()).slice(-7000)}));throw error;}
  if(capture){await page.getByText('密封 Preview，等待真人确认',{exact:true}).scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(directory,item.kind+'-attack-preview.png')});}
  const [apply,replay]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/apply')&&r.request().method()==='POST'),
    page.waitForResponse(r=>r.url().endsWith('/replay')&&r.request().method()==='GET',{timeout:60000}),
    page.getByRole('button',{name:'确认并应用',exact:true}).click()]);
  assert.equal((await apply.json()).result.ok,true);assert.equal((await replay.json()).result.matchesCurrent,true);
  const after=await current(item);assert.equal(after.stateRevision,before.stateRevision+1);
  await page.getByText('verified revision: '+after.stateRevision,{exact:true}).waitFor();
  return{actionType:choice.actionType,sideKey:choice.sideKey,stateRevision:after.stateRevision,stateHash:after.envelope.stateHash};
}
try{for(const item of service.rooms){
  const phonePlayer1=item.id==='ranged-6'||item.phoneSide==='player1',
    contexts=await Promise.all([browser.newContext({viewport:phonePlayer1?{width:390,height:844}:{width:1500,height:1000}}),
    browser.newContext({viewport:phonePlayer1?{width:1500,height:1000}:{width:390,height:844}})]),
    pages={player1:await contexts[0].newPage(),player2:await contexts[1].newPage()},auth={},errors=[],trace=[];
  try{
    const credentials=JSON.parse(await fs.readFile(path.join(directory,'rooms',item.kind,item.roomId+'.seats.private.json'),'utf8')),
      head=await current(item);
    assert.ok(resume||head.stateRevision===0,'FRESH_WEB_THRESHOLD_ROOM_REQUIRED');
    if(resume)trace.push(...(await journal(item)).map(r=>({actionType:r.action.actionType,sideKey:r.action.sideKey,
      stateRevision:r.postStateRevision,stateHash:r.postStateHash,restoredFromSignedJournal:true})));
    for(const side of ['player1','player2']){const page=pages[side];page.on('pageerror',e=>errors.push(e.message));
      page.on('request',r=>{if(r.url().startsWith(api)&&r.headers().authorization)auth[side]=r.headers().authorization;});
      const ticket=await fetch(api+item.roomId+'/recovery-tickets',{method:'POST',headers:{authorization:'Bearer '+credentials[side].seatToken,'content-type':'application/json'},body:'{}'}).then(r=>r.json());
      assert.equal(ticket.result.ok,true);const exchange=page.waitForResponse(r=>r.url().endsWith('/recovery-exchange')&&r.request().method()==='POST');
      await page.goto(service.origin+'/room/'+item.roomId+'#recovery='+encodeURIComponent(ticket.result.recovery.recoveryToken));
      assert.equal((await(await exchange).json()).result.credential.seatKey,side);await page.getByTestId('battlefield-map-contract-v1').waitFor({timeout:60000});
    }
    const initial=await readRoom(item,s=>s.loadReplayBundle(item.roomId)),sourceShot=initial.initialEnvelope.state.pendingOfficialRangedPrecisionChoice?.attackAction;
    let attacked=!!sourceShot||(await journal(item)).some(r=>action(r.action).actionType==='ranged_attack'&&action(r.action).pieceId==='actor'),
      precisionChoiceCommitted=(await journal(item)).some(r=>action(r.action).actionType==='choose_ranged_precision_hits');
    for(let step=0;step<50;step++){
      const state=(await current(item)).envelope.state;if(state.round===2&&state.phase==='movement')break;
      if(item.precisionChoiceOnly&&precisionChoiceCommitted&&!state.pendingOfficialRangedPrecisionChoice
        &&!state.pendingAction&&!state.pendingCurrentProductRangedSequence&&!state.selectedRosterActivationWindow)break;
      const owner=state.activeSideKey||state.firstPlayerSideKey,menu=await legal(pages[owner]);let choice,isDomain=true;
      if(!attacked)choice=menu.parameterDomains.find(d=>d.pieceId==='actor'&&d.actionType==='ranged_attack');
      choice ||= menu.parameterDomains.find(d=>d.parameterKind?.includes('casualty'));
      if(!choice){choice=menu.finiteActions.find(r=>r.action.actionType==='finish_ranged_attack_sequence')?.action;isDomain=false;}
      if(!choice){choice=menu.parameterDomains.find(d=>d.actionType==='finish_activation');isDomain=true;}
      if(!choice){choice=menu.finiteActions.find(r=>/pass/.test(r.action.actionType))?.action||menu.finiteActions[0]?.action;isDomain=false;}
      if(!choice){choice=menu.parameterDomains[0];isDomain=true;}assert.ok(choice);
      trace.push(await operate(pages[owner],item,choice,isDomain));
      if(choice.actionType==='ranged_attack'&&choice.pieceId==='actor')attacked=true;
      if(choice.actionType==='choose_ranged_precision_hits')precisionChoiceCommitted=true;
      console.log(JSON.stringify({id:item.id,...trace.at(-1)}));
    }
    const final=await current(item),state=final.envelope.state,receipts=await journal(item),
      shot=receipts.map(r=>action(r.action)).find(a=>a.actionType==='ranged_attack'&&a.pieceId==='actor')||sourceShot;
    assert.ok(attacked&&shot);assert.equal(shot.rangedPlan.activePrecisionValue,1);
    assert.equal(shot.rangedPlan.activeCriticalHitValue,item.expectedCriticalHit??(item.id==='ranged-6'?1:0));
    assert.equal(state.pieces.find(p=>p.id==='actor').officialTalDarimFirstWeapon.weaponName,'particle disruptors');
    if(!item.precisionChoiceOnly){assert.equal(state.round,2);assert.equal(state.phase,'movement');assert.equal(state.officialMissionRuntimeState.scoringHistory.length,1);}
    else assert.ok(precisionChoiceCommitted&&receipts.some(r=>action(r.action).canonicalParameters?.convertedFailedHitDieIndices?.length===1));
    assert.ok(!state.pendingAction&&!state.pendingCurrentProductRangedSequence&&!state.selectedRosterActivationWindow);assert.deepEqual(errors,[]);
    for(const side of ['player1','player2']){const page=pages[side];await page.bringToFront();
      await page.getByText('r'+final.stateRevision,{exact:true}).waitFor({timeout:20000});
      const ticket=await fetch(api+item.roomId+'/recovery-tickets',{method:'POST',headers:{authorization:auth[side],'content-type':'application/json'},body:'{}'}).then(r=>r.json());
      assert.equal(ticket.result.ok,true);await page.goto('about:blank');
      await page.goto(service.origin+'/room/'+item.roomId+'#recovery='+encodeURIComponent(ticket.result.recovery.recoveryToken));
      await page.getByTestId('battlefield-map-contract-v1').waitFor({timeout:60000});
      const projection=await fetch(api+item.roomId,{headers:{authorization:auth[side]}}).then(r=>r.json());assert.equal(projection.result.projection.viewer.seatKey,side);
    }
    assert.equal((await current(item)).envelope.stateHash,final.envelope.stateHash);
    await pages.player1.screenshot({path:path.join(directory,item.kind+'-next-round.png')});
    const result={id:item.id,kind:item.kind,roomId:item.roomId,sourceRoomId:item.sourceRoomId,sourcePrefixReceipts:item.sourcePrefixReceipts,
      sourceStateHash:item.sourceStateHash,trace,signedActions:trace.length,stateHash:final.envelope.stateHash,
      actualPrecision:shot.rangedPlan.activePrecisionValue,actualCriticalHit:shot.rangedPlan.activeCriticalHitValue,
      fullNativeRound:!item.precisionChoiceOnly,webFromSignedPrefix:true,fullRoundViaWebAlone:false,actualProducerViaWeb:!sourceShot,
      precisionChoiceCommitted,twoSeatsVerified:true,explicitHumanConfirmation:true,previewReadOnly:true,replayMatchesCurrent:true,
      seatRecoveryReentryVerified:true,pageErrors:errors};
    results.push(result);await atomicWrite(path.join(directory,item.kind+'-result.public.json'),JSON.stringify(result,null,2)+'\n');
  }finally{await Promise.all(contexts.map(c=>c.close()));}
}}finally{await browser.close();}
assert.equal(results.length,choiceOnly?1:2);
const result={schema:'starcraft_tmg_wave4_tal_darim_threshold_web_v1',status:'passed_scoped',runRef:path.relative(root,directory),results,
  signedActions:results.reduce((n,r)=>n+r.signedActions,0),sourceHeldDefinitions:39,fullFactionAdmission:false,fullMatchAdmission:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/tal-darim-threshold'+(choiceOnly?'-choice':'')+'-web.public.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,rooms:results.length,signedActions:result.signedActions}));
