// Exercise the exported client against a running local human-play release. Both browser profiles are isolated.
import assert from 'node:assert/strict';
import {mkdir,readFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {atomicWrite} from './lib/development-context.mjs';
import {wave3EntryPlacement} from './support/wave3-two-scale-entries.mjs';

const dir=path.resolve('build/ticket-28-wave3-web-human-staging'),qa=path.join(dir,'qa','release-2.99.12');
await mkdir(qa,{recursive:true,mode:0o700});
const json=async f=>JSON.parse(await readFile(f,'utf8'));
const service=await json(path.join(dir,'host/service.json'));
assert.equal(service.liveEnabled,false);
const origin=new URL(service.url).origin;
assert.equal(new URL(origin).hostname,'127.0.0.1');
const product='/starcraft-tmg-level3/product/v1';
const resultFile=path.join(qa,'result.public.json'), secretsFile=path.join(qa,'exchange.private.json');
const load=async(file,empty)=>json(file).catch(e=>{if(e.code==='ENOENT')return empty;throw e;});
const record=await load(resultFile,{version:'2.99.12',steps:[],setup:'wave3-standard-v1',models:0});
const seats=await load(secretsFile,{});
const save=()=>atomicWrite(resultFile,JSON.stringify(record,null,2)+'\n');
const done=async step=>{if(!record.steps.includes(step))record.steps.push(step);await save();console.log(step);};
const contexts=[],pages={};
let stage='open',activePage;
async function request(url,body,side) {
  const res=await fetch(origin+url,{method:body===undefined?'GET':'POST',headers:{'content-type':'application/json',connection:'close',
    ...(side?{authorization:'Bearer '+seats[side].seatToken}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await res.json();assert(res.ok && data.ok!==false,[res.status,data.reason,data.error].join(' '));return data.result??data;
}
const api=(op,body,side)=>request('/starcraft-tmg-level3/api/v1/rooms/'+record.roomId+(op?'/'+op:''),body,side);
async function pageFor(side) {
  const ctx=await chromium.launchPersistentContext(path.join(qa,side+'-profile'),{headless:true,
    executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    viewport:{width:1380,height:1000},locale:'en-US'});contexts.push(ctx);
  const page=ctx.pages()[0]??await ctx.newPage();pages[side]=page;page.setDefaultTimeout(45000);
  await ctx.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===origin||['data:','blob:'].includes(u.protocol)?route.continue():route.abort();});
  return page;
}
const board=p=>p.getByTestId('battlefield-map-contract-v1');
const locateArmy=async(page,name)=>page.evaluate(n=>JSON.parse(localStorage.getItem('@project-d/starcraft-tmg/product/v1/army-lists')??'[]').find(a=>a.name===n),name);
async function importArmy(page,name,recipe,cards,units) {
  const faction=cards.find(c=>'tactical_cards:'+c.id===recipe.factionRecordKey);
  const lines=['=== '+name+' ===','Faction: '+faction.faction,'Minerals: 2000','[FC] '+faction.name];
  for(const key of recipe.tacticalCardRecordKeys){const card=cards.find(c=>'tactical_cards:'+c.id===key);lines.push('[TC] '+card.name+' ('+card.cost+'gas)');}
  recipe.units.forEach((u,i)=>{const unit=units.find(x=>'army_units:'+x.id===u.recordKey);
    lines.push((i+1)+'. '+unit.name+' ['+unit.unitType+'/small] '+unit.smallProfile.cost+'M'+(u.upgradeNames.length?' +upg: '+u.upgradeNames.join(', '):''));});
  assert.equal(lines.length,4+recipe.tacticalCardRecordKeys.length+recipe.units.length);
  if(!await locateArmy(page,name)) {
    const button=page.getByText(/^(Import Army|导入军表)$/i);
    await button.click();
    await page.locator('textarea').fill([...lines,'=== END ==='].join('\n'));
    await button.last().click();
    await page.getByTestId('army-new-'+faction.faction).waitFor();
  }
  const army=await locateArmy(page,name);assert(army);assert.equal(army.factionCardId,faction.id);
  assert.deepEqual(army.tacticalCardIds,recipe.tacticalCardRecordKeys.map(k=>k.split(':')[1]));
  assert.deepEqual(army.roster.map(u=>({id:u.unitId,names:u.activeUpgrades.map(i=>u.availableUpgrades[i].name).sort()})),
    recipe.units.map(u=>({id:u.recordKey.split(':')[1],names:[...u.upgradeNames].sort()})));
  return army;
}
async function seatExchange(page,side,kind,go) {
  const wait=page.waitForResponse(r=>r.url().endsWith('/'+kind+'-exchange') && r.request().method()==='POST',{timeout:240000});
  await go();const data=await (await wait).json();
  assert(data.result?.credential,data.result?.reason);seats[side]=data.result.credential;
  await atomicWrite(secretsFile,JSON.stringify(seats));
  await board(page).waitFor({timeout:240000});
}
async function reopen(page,side) {
  if(side==='player1'){await page.goto(service.url);await seatExchange(page,side,'recovery',()=>page.getByTestId('product-resume-'+record.roomId).click());}
  else {const {recovery}=await api('recovery-tickets',{},side);await seatExchange(page,side,'recovery',()=>page.goto(origin+'/room/'+record.roomId+'#recovery='+encodeURIComponent(recovery.recoveryToken)));}
}
async function signed(side,proposal,revision) {
  const {preview,confirmationRequired}=await api('preview',{proposal},side);
  const conf=confirmationRequired?await api('confirm',{previewId:preview.previewId,previewToken:preview.previewToken,previewContentHash:preview.previewSeal.contentHash},side):null;
  const {controlLease}=await api('control-lease',{sessionId:'staging-user-'+side},side);
  const applied=await api('apply',{previewId:preview.previewId,confirmationId:conf?.confirmation.confirmationId,leaseId:controlLease.leaseId,
    leaseFence:controlLease.leaseFence,expectedStateRevision:revision,idempotencyKey:'web-staging-r'+revision},side);
  assert.equal(applied.room.stateRevision,revision+1);return applied.room;
}
async function refresh(page,side) {
  await page.reload();
  const resume=page.getByTestId('product-resume-'+record.roomId);
  await Promise.race([board(page).waitFor({timeout:90000}),resume.waitFor({timeout:90000})]);
  if(!await board(page).isVisible())await reopen(page,side);
  await board(page).waitFor();
}
async function captureTable(page,side) {
  const field=page.getByLabel(/^(战场；点按|Battlefield; tap)/i);
  await field.waitFor();
  const unit=field.locator('svg text').filter({hasText:/Defiler/i}).first();
  await unit.waitFor();
  const dimensions=await field.boundingBox();assert(dimensions.width>300 && dimensions.height>200);
  await field.screenshot({path:path.join(qa,side+'-table.png')});
  return {side,visibleUnit:await unit.textContent(),width:dimensions.width,height:dimensions.height};
}
async function verify() {
  if(process.argv.includes('--board-image')) {
    assert.equal(record.status,'passed');record.rendered=[];
    for(const side of ['player1','player2']) {
      const page=await pageFor(side);await reopen(page,side);
      const projection=(await api('',undefined,side)).projection;
      assert.equal(projection.room.stateHash,record.reconnect.stateHash);
      record.rendered.push(await captureTable(page,side));
    }
    await done('board-images-show-deployed-unit');return;
  }
  const setups=(await request(product+'/catalogue')).setups;
  for(const id of [record.setup,'wave3-skirmish-v1'])assert.equal(setups.find(s=>s.id===id).version,record.version);
  const first=await pageFor('player1');activePage=first;
  if(!record.roomId){
    stage='edit-and-save';await first.goto(service.url);
    await first.getByTestId('product-mode-human_vs_human').click();await first.getByTestId('product-setup-'+record.setup).click();
    const [reply]=await Promise.all([first.waitForResponse(r=>r.url().endsWith('/match-setup'),{timeout:180000}),
      first.getByTestId('product-edit-roster').click()]);
    const {catalogue,setup,error}=await reply.json();assert(reply.ok(),error);
    assert.equal(setup.id,record.setup);
    const {recipes}=await json('build/ticket-28-wave3-mixed-support-opening/sentry/opening.json');
    const own=await importArmy(first,'W3 Daelaam',recipes.player1,catalogue.cards,catalogue.units);
    const foe=await importArmy(first,'W3 Zagara',recipes.player2,catalogue.cards,catalogue.units);
    assert.equal(own.officialDatasetHash,catalogue.source.officialDatasetHash);
    assert.equal(foe.officialDatasetHash,own.officialDatasetHash);
    record.armies=[own,foe].map(a=>({name:a.name,faction:a.factionCardId,units:a.roster.map(u=>({unit:u.unitId,upgrades:u.activeUpgrades.map(i=>u.availableUpgrades[i].name)}))}));
    await done('manual-rosters-saved');
    stage='open-mixed-room';await first.goto(service.url);await first.getByTestId('product-mode-human_vs_human').click();
    await first.getByTestId('product-setup-'+record.setup).click();await first.getByTestId('product-roster-'+own.id).click();
    await first.getByText(foe.name,{exact:true}).last().click();
    const created=first.waitForResponse(r=>r.url().endsWith(product+'/rooms')&&r.request().method()==='POST',{timeout:240000});
    await seatExchange(first,'player1','recovery',async()=>{await first.getByTestId('product-start-match').click();const res=await created;
      const data=await res.json();assert(data.ok,data.reason??data.error);record.roomId=data.match.roomId;await save();});
    await done('mixed-rosters-admitted');
  }else await reopen(first,'player1');
  const guest=await pageFor('player2');activePage=guest;stage='guest-join';
  if(!seats.player2){
    await first.getByRole('button',{name:/^(房间与规则|Room & rules)$/i}).click();
    await first.getByRole('button',{name:/^(生成邀请|Issue invite)$/i}).click();
    const share=first.getByText(new RegExp('^'+origin+'/room/'+record.roomId+'#invite='));
    await share.waitFor();const url=await share.innerText();
    await seatExchange(guest,'player2','invite',()=>guest.goto(url));
    await first.getByRole('button',{name:/^(战桌|Battlefield)$/i}).click();
    await done('guest-joined-from-displayed-invite');
  }
  else await reopen(guest,'player2');
  const getProjection=async side=>(await api('',undefined,side)).projection;
  for(const side of ['player1','player2']){const p=await getProjection(side);assert.equal(p.viewer.seatKey,side);}
  await done('two-browser-seats');
  record.actions??=[];
  for(;;) {
    const p=await getProjection('player1'),rev=p.room.stateRevision;
    if(rev>=4)break;
    stage='seat-action-r'+rev;
    const both=await Promise.all(['player1','player2'].map(async side=>({side,menu:(await api('legal-space',{},side)).legalSpace})));
    const side=rev<2?'player1':'player2';
    for(const entry of both) {
      for(const action of entry.menu.finiteActions) assert.equal(action.action.sideKey,entry.side,'foreign finite action');
      for(const domain of entry.menu.parameterDomains) assert.equal(domain.sideKey,entry.side,'foreign parameter domain');
    }
    const {menu}=both.find(entry=>entry.side===side);
    if(rev===3) {
      record.activationMenus=both.map(({side,menu})=>({side,finishActors:menu.parameterDomains
        .filter(domain=>domain.actionType==='finish_activation').map(domain=>domain.pieceId)}));
      assert.deepEqual(record.activationMenus.map(row=>row.finishActors),[[],['player2-unit-2']]);
    }
    const page=pages[side];activePage=page;
    let action,after;
    if(rev===0){
      const row=menu.finiteActions.find(f=>f.action.actionType==='resolve_mission_start_of_round');assert(row);
      await page.getByRole('button',{name:/^(行动|Actions)$/i}).click();
      const loadLegal=page.getByRole('button',{name:'Load LegalSpace'});if(await loadLegal.isEnabled())await loadLegal.click();
      const previewButton=page.getByRole('button',{name:/^(生成 Preview|Preview)$/i}).first();
      await previewButton.click();
      const applied=page.waitForResponse(r=>r.url().endsWith('/apply')&&r.request().method()==='POST');
      await page.getByRole('button',{name:/^(确认并应用|Confirm and apply)$/i}).click();
      const body=await (await applied).json();assert(body.ok,body.reason);after=(body.result??body).room;action=row.action.actionType;
    }else if(rev===1){
      const row=menu.finiteActions.find(f=>f.action.chosenFirstActorSideKey==='player2');assert(row);
      after=await signed(side,{kind:'finite',actionKey:row.actionKey},rev);action=row.action.actionType;
    }else if(rev===2){
      const unit=p.state.pieces.find(u=>(u.recordKey==='army_units:defiler'||/defiler/i.test(u.unitName??u.name??'')) && u.sideKey==='player2');
      assert(unit,'missing imported Defiler');
      const row=menu.parameterDomains.find(d=>d.actionType==='deploy'&&d.pieceId===unit.id);assert(row,'no Defiler entry');
      const edge=row.constraints.entrySegments[0];
      after=await signed(side,{kind:'parameterized',domainId:row.domainId,parameters:wave3EntryPlacement(row,edge,0.5)},rev);action='deploy Defiler';
    }else{
      const row=menu.parameterDomains.find(d=>d.actionType==='finish_activation');assert(row);
      await reopen(page,side);
      await page.getByRole('button',{name:/^(行动|Actions)$/i}).click();
      const loaded=page.waitForResponse(r=>r.url().endsWith('/legal-space')&&r.request().method()==='POST');
      await page.getByRole('button',{name:'Load LegalSpace'}).click();await loaded;
      const previewButton=page.getByRole('button',{name:/^(生成 Preview|Preview)$/i});
      await previewButton.first().waitFor();assert.equal(await previewButton.count(),1);
      const [preview]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/preview')&&r.request().method()==='POST'),previewButton.click()]);
      assert.equal(preview.request().postDataJSON().proposal.domainId,row.domainId);
      const [applied]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/apply')&&r.request().method()==='POST'),
        page.getByRole('button',{name:/^(确认并应用|Confirm and apply)$/i}).click()]);
      const body=await applied.json();assert(body.ok,body.reason);after=(body.result??body).room;action='finish_activation';
    }
    assert.equal(after.stateRevision,rev+1);record.actions.push({side,action,revision:after.stateRevision,stateHash:after.stateHash});await save();
  }
  stage='reconnect';
  const before=await getProjection('player1');
  assert.equal(before.state.activeSideKey,'player1');
  assert.equal(before.matchBinding.rulesRuntimeBinding.runtimeVersion,record.version);
  assert.equal(before.matchBinding.releaseBinding.runtimeHash,before.matchBinding.rulesRuntimeBinding.runtimeHash);
  record.runtimeHash=before.matchBinding.rulesRuntimeBinding.runtimeHash;
  assert.equal(record.actions.at(-1)?.side,'player2');
  const deployed=before.state.pieces.find(u=>/defiler/i.test(u.recordKey??u.unitName??u.name??'') && u.isOnField);
  assert(deployed,'deployed unit absent from public board');
  await refresh(first,'player1'); await refresh(guest,'player2');
  for(const side of ['player1','player2']) {const p=await getProjection(side);assert.equal(p.room.stateRevision,before.room.stateRevision);assert.deepEqual(p.matchBinding,before.matchBinding);assert.equal(p.room.stateHash,before.room.stateHash);assert.equal(p.viewer.seatKey,side);}
  record.rendered=[await captureTable(first,'player1'),await captureTable(guest,'player2')];
  record.reconnect={revision:before.room.stateRevision,stateHash:before.room.stateHash,activeSide:before.state.activeSideKey,deployedUnit:deployed.id};
  await done('same-position-after-refresh');
  if(!record.skirmish){
    const setup=setups.find(s=>s.id==='wave3-skirmish-v1');
    const {match}=await request(product+'/rooms',{matchMode:'human_vs_human',setupId:setup.id,
      ownPreset:setup.presets[0].id,opponentPreset:setup.presets[1].id});
    const saved=await json(path.join(dir,'host','rooms',match.roomId,'room.private.json'));
    assert.equal(saved.releaseSetup.version,record.version);assert.equal(saved.releaseSetup.scale,'Skirmish');
    record.skirmish={roomId:match.roomId,release:record.version,scale:saved.releaseSetup.scale,sourceHash:saved.releaseSetup.sourceHash};
  }
  await done('skirmish-room-admitted');record.status='passed';await save();
}
try {await verify();} catch(error){
  record.status='incomplete';record.stops??=[];record.stops.push({stage,message:error.message.split('\n')[0].slice(0,300)});await save();
  if(activePage)console.error('visible controls:',(await activePage.getByRole('button').allTextContents()).slice(-35).join(' | ').slice(0,750));
  throw error;
}finally{for(const ctx of contexts)await ctx.close();}
