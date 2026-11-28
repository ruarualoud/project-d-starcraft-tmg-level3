import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { openWave3EngineeringStoreV1 } from './support/wave3-room-boundary-fixture-v1.mjs';
import { atomicWrite } from './lib/development-context.mjs';
import {inspectOfficialMultiModelCasualtySelectionV1} from '../packages/rule-atoms/official-multi-model-casualty-resolution-kernel-v1.mjs';
import {resolveOfficialEffectiveCombatProfileV1} from '../packages/product-composition/official-characteristic-status-family-adapter-v1.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.resolve(process.argv[2]);
assert.ok(directory.startsWith(path.join(root,'build/wave4-web')+path.sep));
const service=JSON.parse(await fs.readFile(path.join(directory,'service.private.json'),'utf8'));
const resumeConfirmed=process.argv.includes('--resume-confirmed');
assert.equal(service.origin,'http://127.0.0.1:5484');assert.equal(service.liveEnabled,false);
const api=service.origin+'/starcraft-tmg-level3/api/v1/rooms/';
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const results=[],readableCasualtyChecks=[];
const escape=text=>text.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
async function current(item) {
  const store=openWave3EngineeringStoreV1({directory:path.join(directory,'rooms',item.kind),filename:'room.sqlite',readOnly:true});
  try{return await store.loadRoom(item.roomId);}finally{store.close();}
}
async function signedEvents(item) {
  const store=openWave3EngineeringStoreV1({directory:path.join(directory,'rooms',item.kind),filename:'room.sqlite',readOnly:true});
  try {const bundle=await store.loadReplayBundle(item.roomId);
    return bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').flatMap(r=>r.payload.payload.receipt.events);
  } finally {store.close();}
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
    const parameterSchema=choice.sourceDomain?.parameterSchema||choice.parameterSchema;
    if(item.flow==='detonation-disengage-initiation'&&choice.actionType==='disengage'){
      const params=item.expectedDisengageParameters;let raw=choice;while(raw.sourceDomain)raw=raw.sourceDomain;
      const ids=raw.constraints.modelProfiles.map(m=>m.modelId);
      await form.getByText('领队模型',{exact:true}).locator('..').getByRole('button').nth(ids.indexOf(params.leadingModelId)).click();
      await form.getByText('领队结果',{exact:true}).locator('..').getByRole('button',{name:params.leadingOutcome==='casualty'?'无法摆位（交规则验证）':'摆位',exact:true}).click();
      if(params.leadingOutcome==='placed'){
        assert.equal(params.path.length,1);await form.getByRole('button',{name:'添加领队路径',exact:true}).click();
        await form.getByLabel('横向位置（英寸）',{exact:true}).fill(String(params.path[0].xMilliInches/1000));
        await form.getByLabel('纵向位置（英寸）',{exact:true}).fill(String(params.path[0].yMilliInches/1000));
        for(const [i,p]of params.placements.entries()){
          assert.equal(p.outcome,'casualty');await form.getByRole('button',{name:'添加模型最终站位',exact:true}).click();
          const block=form.getByText(/^模型最终站位 ·/).locator('..'),row=block.getByText('第 '+(i+1)+' 项',{exact:true}).locator('..');
          await row.getByText('模型',{exact:true}).locator('..').getByRole('button').nth(ids.indexOf(p.modelId)).click();
          await row.getByText('摆位结果',{exact:true}).locator('..').getByRole('button',{name:'无法摆位（交规则验证）',exact:true}).click();
        }
      }
    }
    if(item.flow==='coexisting-ocular'&&choice.weaponName==='Firefly Missiles')
      await form.getByText('目标单位',{exact:true}).locator('..').getByRole('button',{name:'creator',exact:true}).click();
    if(parameterSchema?.required.includes('casualtySelectionHash')){
      const readable=form.getByTestId('native-choice-casualtySelectionHash-0');
      if(process.argv.includes('--readable-casualties')){assert.ok(await readable.count());const label=await readable.innerText();assert.match(label,/方案 1.*剩余/);assert.ok(!label.includes(parameterSchema.casualtySelectionHash.enum[0]));
        const dimensions=await form.evaluate(el=>({clientWidth:el.clientWidth,scrollWidth:el.scrollWidth}));assert.ok(dimensions.scrollWidth<=dimensions.clientWidth+1,'CASUALTY_FORM_HORIZONTAL_OVERFLOW');
        readableCasualtyChecks.push({kind:item.kind,revision:before.stateRevision,selectionHash:parameterSchema.casualtySelectionHash.enum[0],label,viewportWidth:page.viewportSize().width,...dimensions});}
      if(await readable.count())await readable.click();else await form.getByRole('button',{name:parameterSchema.casualtySelectionHash.enum[0],exact:true}).click();
    }
    if(parameterSchema?.required.includes('casualtyModelIds')){
      const s=before.envelope.state,pending=s.pendingAction?.casualtyDomain?s.pendingAction:s.pendingOfficialAutomaticHits
       ||{targetPieceId:s.pendingOfficialBlastTemplateAttack?.currentAction.targetId,casualtyDomain:s.pendingOfficialBlastTemplateAttack?.currentChance.casualtyDomain};
      const contract=pending.casualtyDomain.selectionContract,ids=[];
      while(ids.length<contract.casualtyCount){
        const guidance=inspectOfficialMultiModelCasualtySelectionV1({targetPieceId:pending.targetPieceId,selectionContract:contract,casualtyModelIds:ids,complete:false});
        assert.equal(guidance.valid,true);assert.ok(guidance.legalNextModelIds.length);ids.push(guidance.legalNextModelIds[0]);
      }
      for(const [index,id]of ids.entries()){
        await form.getByRole('button',{name:'添加移除模型（按顺序）',exact:true}).click();
        const row=form.getByText('第 '+(index+1)+' 项',{exact:true}).locator('..');
        const modelIndex=parameterSchema.casualtyModelIds.items.enum.indexOf(id);assert.ok(modelIndex>=0);
        await row.getByText('模型',{exact:true}).locator('..').getByRole('button').nth(modelIndex).click();
      }
    }
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
    if(completed){assert.equal((await current(item)).envelope.stateHash,completed.trace.at(-1).stateHash);if(process.argv.includes('--readable-casualties')){assert.ok(Array.isArray(completed.readableCasualtyChecks),'READABLE_CASUALTY_CHECKS_REQUIRED');readableCasualtyChecks.push(...completed.readableCasualtyChecks);}results.push(completed);continue;}
    const contexts=await Promise.all([browser.newContext({viewport:item.phoneSide==='player1'?{width:390,height:844}:{width:1500,height:1000}}),
      browser.newContext({viewport:item.phoneSide==='player1'?{width:1500,height:1000}:{width:390,height:844}})]);
    const pages={player1:await contexts[0].newPage(),player2:await contexts[1].newPage()};
    const credentials=JSON.parse(await fs.readFile(path.join(directory,'rooms',item.kind,item.roomId+'.seats.private.json'),'utf8'));
    const errors=[];const trace=[];const auth={};let originalSourceDeathVerified,originalRemovalVerified;
    try {
      const head=await current(item);
      if(resumeConfirmed&&head.stateRevision>0){
        const store=openWave3EngineeringStoreV1({directory:path.join(directory,'rooms',item.kind),filename:'room.sqlite',readOnly:true});
        try{const bundle=await store.loadReplayBundle(item.roomId),receipts=bundle.privateJournal.filter(r=>r.payload.type==='accepted_transition').map(r=>r.payload.payload.receipt);
          const definition=action=>action&&(action.definitionId||definition(action.sourceAction));
          assert.equal(receipts.length,head.stateRevision);
          trace.push(...receipts.map(r=>({actionType:r.action.actionType,definitionId:definition(r.action)||null,sideKey:r.action.sideKey,
            stateRevision:r.postStateRevision,stateHash:r.postStateHash,restoredFromSignedJournal:true})));
        }finally{store.close();}
      }else assert.equal(head.stateRevision,0,'WEB_TURRET_REQUIRES_FRESH_SIGNED_PREFIX');
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
      let primaryUsed=trace.some(t=>t.definitionId===item.definitionId),producerUsed=trace.some(t=>t.actionType==='disengage'),shotUsed=false,restorationUsed=false;
       for(let step=0;step<32;step++) {
        const aggregate=await current(item);const state=aggregate.envelope.state;
        if(primaryUsed&&!state.pendingOfficialPlaguedMunitions&&!state.pendingOfficialUniversalCarrier&&!state.pendingOfficialReactionWindow&&!state.pendingOfficialAutoTurretOverwatch
          &&!state.pendingOfficialInfestationTransfer&&!state.pendingCurrentProductRangedCasualtyChoice&&!state.pendingOfficialAutomaticHits
           &&!state.pendingOfficialHitsPoolChoice&&!state.officialBeforeCasualtyContinuations?.length
           &&!state.pendingOfficialBlastTemplateAttack&&!state.pendingOfficialRavenSeekerPhaseEnd
          &&!state.pendingCorrosiveBileResolution&&!state.pendingSabotageDronePhaseEnd
          &&!state.pendingOfficialPsionicStormAssaultOrder&&!state.pendingOfficialPsionicStormMovementEnd&&!state.pendingOfficialPhotonOvercharge
          &&!state.pendingOfficialAttackTargetReaction&&!state.pendingOfficialRangedAttackDeclaration
          &&(!['detonation-khassar','detonation-declaration','detonation-target','detonation-delayed','detonation-storm-photon','detonation-disengage','detonation-disengage-initiation'].includes(item.flow)&&!item.declarationDefinitionId||!state.selectedRosterActivationWindow))break;
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
        if(item.flow==='detonation-disengage-initiation'&&!producerUsed)choice=menu.parameterDomains.find(row=>row.actionType==='disengage'&&row.pieceId==='actor');
        else if(!primaryUsed)choice=menu.parameterDomains.find(row=>item.id==='infected-ordinary-move'?row.actionType==='move'&&row.pieceId==='enemy':item.id==='clean-blink'?row.definitionId==='unit:stalker/blink-movement-phase@1':item.id==='clean-recall'?row.definitionId==='card:nexus/strategic-recall-any@1':row.definitionId===item.definitionId);
        else if(['detonation-nested','bio-kill-switch','detonation-template','detonation-outside','detonation-overwatch','detonation-khassar','detonation-declaration','detonation-target','detonation-delayed','detonation-storm-photon','detonation-disengage','detonation-disengage-initiation'].includes(item.flow))choice=menu.parameterDomains.find(row=>row.effectKind==='before_casualty_detonation');
        else if(item.flow==='corrode-restoration'&&!restorationUsed)choice=menu.parameterDomains.find(row=>row.definitionId==='unit:medic/restoration-any-phase@1');
        else if((item.kind==='ocular-use'||item.flow==='coexisting-ocular')&&!shotUsed)choice=menu.parameterDomains.find(row=>row.weaponName==='Firefly Missiles');
        else if((item.kind==='growing-restoration-exception'||item.flow==='carrier-restoration'||item.flow==='trooper-restoration')&&!restorationUsed)choice=menu.parameterDomains.find(row=>row.definitionId==='unit:medic/restoration-any-phase@1'||item.flow==='carrier-restoration'&&row.effectKind==='infestation_transfer');
        choice ||= menu.parameterDomains.find(row=>row.actionType==='pass_reaction_family_window')
          ||menu.parameterDomains.find(row=>row.actionType==='finish_activation')||menu.parameterDomains[0];
        const schema=choice?.sourceDomain?.parameterSchema||choice?.parameterSchema;
        let parameterized=Boolean(schema?.required?.length);
        if(!choice){choice=menu.finiteActions[0]?.action;parameterized=false;}
        assert.ok(choice,'WEB_TURRET_SUCCESSOR_MISSING:'+JSON.stringify(menu));
        trace.push(await operate(pages[owner],item,choice,parameterized));
        if(choice.actionType==='disengage')producerUsed=true;
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
      } else if(['corrode-armour','corrode-restoration'].includes(item.flow)){
        const state=final.envelope.state,target=state.pieces.find(p=>p.id==='infected');
        assert.equal(resolveOfficialEffectiveCombatProfileV1(state,target).armourThreshold,item.flow==='corrode-restoration'?4:5);
        assert.equal(target.statuses.some(s=>s.sourceDefinitionId===item.definitionId),item.flow==='corrode-armour');
        assert.ok(!state.pendingOfficialRangedLungeReaction&&!state.pendingOfficialCorrodeRestoration&&!state.pendingOfficialReactionWindow);
        if(item.flow==='corrode-restoration')assert.equal(restorationUsed,true);
      } else if(item.flow==='bio-kill-switch'){
        const state=final.envelope.state;assert.equal(state.officialInfestationDamageCleanupHistory.length,1);
        assert.deepEqual(state.officialInfestationDamageCleanupHistory[0].unitsThatSufferedDamage,['infected']);
        assert.ok(!state.pieces.find(p=>p.id==='infected').statuses.some(s=>String(typeof s==='string'?s:s.statusName).toLowerCase()==='infestation'));
        assert.equal(state.log.flatMap(l=>l.events||[]).filter(e=>e.type==='ability_direct_damage').length,1);
        assert.ok(!state.pendingOfficialInfestationDamageCleanup);
      } else if(item.flow==='detonation-khassar'){
        const state=final.envelope.state,events=state.log.flatMap(l=>l.events||[]),parentKey=item.khassarKind==='shot'?'pendingOfficialKhassarShot':'pendingOfficialKhassarFight';
        assert.ok(!state[parentKey]&&!state.selectedRosterActivationWindow&&!state.officialBeforeCasualtyContinuations?.length&&!state.pendingOfficialAutomaticHits);
        const completed=events.filter(e=>e.type==='khassar_non_lethal_damage_after_'+item.khassarKind);assert.equal(completed.length,1);
        assert.equal(state.cardResources.player1.find(c=>c.cardKind==='faction').readiness,'exhausted');
        assert.equal(state.activeAbilityUseHistory.filter(h=>h.pieceId==='actor'&&h.routeId==='card:templar_caste/khassar-de-templari-any@1').length,1);
        const original=events.filter(e=>['ranged_attack','close_combat_attack'].includes(e.type)&&(e.attackResolutionHash||e.resolutionHash)===item.expectedOriginalResolutionHash);assert.equal(original.length,1);
        assert.equal(completed[0].damage.reason==='recipient_destroyed',state.pieces.find(p=>p.id==='recipient').isDestroyed);
      } else if(['detonation-disengage','detonation-disengage-initiation'].includes(item.flow)){
        const state=final.envelope.state,events=await signedEvents(item),actor=state.pieces.find(p=>p.id==='actor');
        assert.ok(!state.pendingOfficialAutomaticHits&&!state.pendingOfficialReactionWindow&&!state.officialBeforeCasualtyContinuations?.length&&!state.selectedRosterActivationWindow);
        const original=events.filter(e=>e.type==='unit_disengage_resolved'&&e.spatialPlanHash===item.expectedOriginalPlanHash);assert.equal(original.length,1);
        assert.deepEqual(original[0].casualtyModelIds,item.expectedCasualtyModelIds);assert.equal(original[0].leadingFailure,item.disengageKind==='leading');
        assert.deepEqual(actor.models.filter(m=>!m.isDestroyed&&m.isOnField!==false).map(m=>m.id).sort(),[...item.expectedSurvivorModelIds].sort());
        assert.ok(item.expectedCasualtyModelIds.every(id=>actor.models.find(m=>m.id===id).isDestroyed));
        assert.deepEqual(actor.models.map(m=>({id:m.id,xInches:m.xInches,yInches:m.yInches})),item.expectedActorLocations);originalRemovalVerified=true;
      } else if(item.flow==='detonation-storm-photon'){
        const state=final.envelope.state,events=await signedEvents(item);
        assert.ok(!state.pendingOfficialPsionicStormAssaultOrder&&!state.pendingOfficialPsionicStormMovementEnd&&!state.pendingOfficialPhotonOvercharge&&!state.pendingOfficialAutomaticHits&&!state.officialBeforeCasualtyContinuations?.length);
        assert.equal(events.filter(e=>['ability_direct_damage','automatic_hits_damage'].includes(e.type)&&e.stages.resolutionHash===item.expectedOriginalResolutionHash).length,1);
        const victim=item.continuationKind==='storm'?item.originalSourceId:item.counterTargetId;
        originalSourceDeathVerified=events.some(e=>e.type==='automatic_hits_damage'&&e.targetId===victim&&e.sourceDefinitionId===item.definitionId&&e.casualtyModelIds.length>0);
        assert.equal(originalSourceDeathVerified,true);
        if(item.continuationKind==='photon')assert.equal(events.filter(e=>e.type==='automatic_hits_complete'&&e.sourcePlanHash===item.expectedOriginalSourcePlanHash).length,1);
      } else if(item.flow==='detonation-delayed'){
        const state=final.envelope.state,events=await signedEvents(item);
        originalSourceDeathVerified=events.some(e=>e.type==='automatic_hits_damage'&&e.targetId===item.originalSourceId&&e.sourceDefinitionId===item.definitionId&&e.casualtyModelIds.length>0);
        if(item.requireOriginalSourceDeath)assert.equal(originalSourceDeathVerified,true);
        assert.ok(!state.pendingCorrosiveBileResolution&&!state.pendingSabotageDronePhaseEnd&&!state.officialBeforeCasualtyContinuations?.length&&!state.pendingOfficialAutomaticHits);
        assert.equal(events.filter(e=>e.type==='automatic_hits_damage'&&e.stages.resolutionHash===item.expectedOriginalResolutionHash).length,1);
        if(item.delayedKind==='bile'){assert.equal(state.resolvedCorrosiveBileEffects.length,1);assert.ok(!state.board.tokens.some(t=>t.tokenKind==='corrosive_bile'));}
        else assert.equal(events.filter(e=>e.type==='sabotage_drone_source_effect_completed').length,1);
      } else if(['detonation-declaration','detonation-target'].includes(item.flow)){
        const state=final.envelope.state,events=await signedEvents(item);
        assert.ok(!state.pendingOfficialAttackTargetReaction&&!state.pendingOfficialRangedAttackDeclaration
          &&!state.selectedRosterActivationWindow&&!state.officialBeforeCasualtyContinuations?.length&&!state.pendingOfficialAutomaticHits);
        assert.equal(events.filter(e=>e.type==='ranged_attack'&&e.attackResolutionHash===item.expectedOriginalResolutionHash).length,1);
        if(item.flow==='detonation-target')assert.equal(events.filter(e=>e.type==='attack_target_reaction_consumed').length,1);
        else assert.equal(events.filter(e=>e.type==='ranged_declaration_completed').length,1);
      } else if(item.flow==='coexisting-ocular'){
        const state=final.envelope.state;assert.ok(!state.pendingOfficialAutoTurretOverwatch&&!state.pendingOfficialReactionWindow);
        assert.equal(state.officialOcularOverwatchHistory.length,1);assert.equal(state.officialOcularOverwatchHistory[0].outcome,'ranged_attack_completed');
        assert.equal(state.rangedActionHistory.filter(r=>r.pieceId==='ocular'&&r.targetId==='creator').length,1);
        assert.equal(state.activeSideKey,'player1');assert.ok(!state.officialAutoTurretOverwatchHistory?.length);
      } else if(item.flow==='detonation-overwatch'){
        const state=final.envelope.state;assert.ok(!state.pendingOfficialAutoTurretOverwatch&&!state.officialBeforeCasualtyContinuations?.length&&!state.pendingOfficialAutomaticHits);
        assert.equal(state.officialAutoTurretOverwatchHistory.length,1);assert.equal(state.officialAutoTurretOverwatchHistory[0].outcome,'ranged_attack_completed');
        const shots=state.rangedActionHistory.filter(r=>r.pieceId==='turret');assert.equal(shots.length,1);assert.equal(shots[0].resolutionHash,item.expectedOriginalResolutionHash);
        assert.equal(state.activeSideKey,item.expectedResumeSideKey||'player2');assert.ok(!state.selectedRosterActivationWindow&&!state.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
      } else if(['detonation-template','detonation-outside'].includes(item.flow)){
        const state=final.envelope.state,events=state.log.flatMap(l=>l.events||[]);
        assert.ok(!state.officialBeforeCasualtyContinuations?.length&&!state.pendingOfficialAutomaticHits&&!state.pendingOfficialBlastTemplateAttack&&!state.pendingOfficialRavenSeekerPhaseEnd);
        assert.ok(!state.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
        assert.equal(events.filter(e=>e.type===(item.flow==='detonation-template'?'ranged_weapon_completed':'raven_seeker_missile_complete')).length,1);
        if(item.flow==='detonation-outside')assert.equal(state.officialRavenSeekerPhaseEndHistory.length,1);
        if(item.declarationDefinitionId){
          assert.ok(!state.pendingOfficialRangedAttackDeclaration&&!state.selectedRosterActivationWindow);
          assert.equal((await signedEvents(item)).filter(e=>e.type==='ranged_declaration_completed').length,1);
          assert.equal(state.officialReactionHistory.filter(h=>h.definitionId===item.declarationDefinitionId).length,1);
        }
      } else if(item.flow==='detonation-nested'){
        const state=final.envelope.state;assert.equal(Boolean(state.officialBeforeCasualtyContinuations?.length),false);
        assert.equal(state.fightActionHistory.length,1);assert.ok(state.pieces.every(p=>p.isDestroyed));
        assert.ok(!state.pieces.some(p=>p.officialBeforeCasualtyReservations?.length));
        assert.equal(state.log.flatMap(l=>l.events||[]).filter(e=>e.type==='close_combat_attack').length,1);
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
        sourcePrefixReceipts:item.sourcePrefixReceipts,...(['detonation-disengage','detonation-disengage-initiation'].includes(item.flow)?{originalRemovalVerified,disengageKind:item.disengageKind}:{}),...(['detonation-delayed','detonation-storm-photon'].includes(item.flow)?{originalSourceDeathVerified}:{}),trace,signedActions:trace.length,twoSeatsVerified:true,
        explicitHumanConfirmation:true,previewReadOnly:true,replayMatchesCurrent:true,seatRecoveryReentryVerified:true,pageErrors:errors,
        ...(process.argv.includes('--readable-casualties')?{readableCasualtyChecks:readableCasualtyChecks.filter(r=>r.kind===item.kind)}:{})});
      await atomicWrite(completedRef,JSON.stringify(results.at(-1),null,2));
      console.log(JSON.stringify({case:item.kind,status:'passed',signedActions:trace.length}));
    } finally {await Promise.all(contexts.map(context=>context.close()));}
  }
} finally {await browser.close();}
if(process.argv.includes('--readable-casualties'))assert.ok(readableCasualtyChecks.some(r=>r.viewportWidth===390),'READABLE_MOBILE_CASUALTY_REQUIRED');
const result={schema:'starcraft_tmg_wave4_virus_web_verification_v1',status:'passed_scoped',
  runRef:path.relative(root,directory),results,...(process.argv.includes('--readable-casualties')?{readableCasualtyChecks}:{}),signedActions:results.reduce((sum,row)=>sum+row.signedActions,0),
  conditionalTurretGeometryInRestorationCaseOnly:service.rooms.some(item=>item.id==='growing-restoration-exception'||item.flow==='carrier-restoration'),sourceHeldDefinitions:39,
   engineeringEstimatedUnitGeometry:service.rooms.some(item=>['admiral-exchange','trooper-restoration','stukov-spread','munitions-support','infantry-burrow','detonation-ranged','detonation-nested','bio-kill-switch','corrode-armour','corrode-restoration','detonation-template','detonation-outside','detonation-overwatch','coexisting-ocular','detonation-khassar','detonation-declaration','detonation-target','detonation-delayed','detonation-storm-photon','detonation-disengage','detonation-disengage-initiation'].includes(item.flow)),
  fullWave4LobbyBuilderAdmission:false,fullMatchAdmission:false,wave3PlayerRoomsTouched:false,modelCalls:0,trainingTruth:false};
await atomicWrite(path.join(directory,'web-result.public.json'),JSON.stringify(result,null,2)+'\n');
await atomicWrite(path.join(root,'docs/development/wave4/evidence/'+(process.argv[3]||'virus-web.public.json')),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({status:result.status,signedActions:result.signedActions,rooms:results.length}));
