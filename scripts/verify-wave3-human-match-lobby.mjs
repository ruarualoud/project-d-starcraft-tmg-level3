import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {selectWave3FunctionalAction, wave3EntryPlacement} from './support/wave3-two-scale-entries.mjs';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';

const root=process.cwd(), dir=path.join(root,'build/ticket-28-wave3-human-lobby-v1');
const dataDirectory=path.join(dir,'rooms-'+process.argv[2]);
const setupId='wave3-'+process.argv[2]+'-v1';
const options={root,fixtureRoot:root,dataDirectory,webRoot:path.join(dir,'web-contract'),port:0,
  mapConfiguration:{seedId:'standard-d6-1'},liveEnabled:false,autoDrive:false};
const evidenceFile=path.join(dir,process.argv[2]+'.public.json');
const secretFile=path.join(dataDirectory,'validation-seats.private.json');
const evidence=await fs.readFile(evidenceFile,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {setupId,steps:[]};});
const save=async()=>{await fs.writeFile(evidenceFile+'.pending',JSON.stringify(evidence,null,2));await fs.rename(evidenceFile+'.pending',evidenceFile);};
let server=await createStarcraftProductServerV1(options),browser;
let roomId=evidence.roomId;
const pages=[];const diagnostics=[];
async function request(address,body,token) {
  const response=await fetch(server.origin+address,{method:body===undefined?'GET':'POST',
    headers:{'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
    ...(body===undefined?{}:{body:JSON.stringify(body)})});
  const data=await response.json();
  if(!response.ok||!data.ok)throw Error([response.status,data.error||data.reason,JSON.stringify(data.result?.details??'')].join(' '));
  return data.result||data;
}
const product='/starcraft-tmg-level3/product/v1';
const api=(op,body,token)=>request('/starcraft-tmg-level3/api/v1/rooms/'+roomId+(op==='projection'?'':'/'+op),body,token);
async function pageFor() {
  const page=await browser.newPage({viewport:{width:1340,height:960},locale:'zh-CN'});
  pages.push(page);
  page.on('pageerror',e=>diagnostics.push(['page',e.message.slice(0,600)]));
  page.on('response',r=>{const url=new URL(r.url());if(r.status()>=400||/recovery-exchange|workbench|legal-space/.test(url.pathname))diagnostics.push([url.pathname,r.status()]);});
  await page.route('**/*',route=>{const u=new URL(route.request().url());return u.origin===server.origin||['data:','blob:'].includes(u.protocol)?route.continue():route.abort();});
  return page;
}

// Cleanup can have no active unit side. The seat-scoped menu owns eligibility.
async function readActionMenu(seats, state, revision) {
  const sides = Object.keys(seats);
  if(sides.includes(state.activeSideKey)){
    sides.splice(sides.indexOf(state.activeSideKey),1);
    sides.unshift(state.activeSideKey);
  }
  for(const side of sides){
    const token=seats[side].seatToken;
    const {legalSpace}=await api('legal-space',{},token);
    assert.equal(legalSpace.stateRevision,revision);
    assert.equal(legalSpace.sideKey,side);
    if(legalSpace.finiteActions.length || legalSpace.parameterDomains.length){
      return {side,token,legalSpace};
    }
  }
  throw Error('Both authenticated seats have empty menus at r'+revision+' / '+state.phase);
}

async function play(seats) {
  const item=await server.host.get(roomId);
  for(let step=0;step<160;step++){
    const {envelope,stateRevision:rev}=await item.roomStore.loadRoom(roomId);
    const state=envelope.state;
    if(state.terminal||state.gameOver){
      evidence.terminal={revision:rev,round:state.round,scores:state.scores,winner:state.winner,reason:state.terminalReason,
        stateHash:envelope.stateHash,bindingHash:envelope.matchBindingHash};await save();return;
    }
    const {side,token,legalSpace}=await readActionMenu(seats,state,rev);
    const enabled=legalSpace.finiteActions;
    const first=enabled.find(x=>x.action.actionType==='choose_first_actor'&&x.action.chosenFirstActorSideKey==='player1');
    const pass=enabled.find(x=>x.action.actionType==='pass');
    const next=first||pass||enabled.find(x=>!['choose_first_actor','fight','attack','charge'].includes(x.action.actionType));
    let proposal=next?{kind:'finite',actionKey:next.actionKey}:null;
    let action=next?.action.actionType;
    if(rev===2||rev===4){
      proposal=null;
      for(const d of legalSpace.parameterDomains.filter(d=>d.actionType==='deploy'&&d.constraints.modelProfiles.length<=9)
          .sort((a,b)=>a.constraints.modelProfiles.length-b.constraints.modelProfiles.length)){
        for(const edge of d.constraints.entrySegments){
          for(const t of [0.5,0.25,0.75,0.125,0.875]){
            const parameters=wave3EntryPlacement(d,edge,t);
            try {item.fixture.rulesRuntime.instantiate(state,d,parameters,{matchBinding:envelope.matchBinding});}
            catch {continue;}
            proposal={kind:'parameterized',domainId:d.domainId,parameters};action='deploy';break;
          }
          if(proposal)break;
        }
        if(proposal)break;
      }
    }else if(rev===3||rev===5){
      const d=legalSpace.parameterDomains.find(d=>d.actionType==='finish_activation');
      assert(d);proposal={kind:'parameterized',domainId:d.domainId,parameters:{}};action='finish_activation';
    }else if(rev>=6 && !first){
      const functional=selectWave3FunctionalAction({legalSpace,state,runtime:item.fixture.rulesRuntime,
        binding:envelope.matchBinding,steps:evidence.steps});
      if(functional){proposal=functional.proposal;action=functional.action;}
    }
    if(!proposal)throw Error('No scripted lifecycle action at r'+rev+'; finite: '+enabled.map(x=>x.action.actionType)+'; domains: '+legalSpace.parameterDomains.map(x=>x.actionType));
    const pre=await api('preview',{proposal},token);
    const pv=pre.preview;
    const confirmed=pre.confirmationRequired?await api('confirm',{previewId:pv.previewId,previewToken:pv.previewToken,
      previewContentHash:pv.previewSeal.contentHash},token):null;
    const {controlLease}=await api('control-lease',{sessionId:'lobby-lifecycle-'+side},token);
    const result=await api('apply',{previewId:pv.previewId,confirmationId:confirmed?.confirmation.confirmationId,
      leaseId:controlLease.leaseId,leaseFence:controlLease.leaseFence,expectedStateRevision:rev,idempotencyKey:'lifecycle-r'+rev},token);
    assert.equal(result.room.stateRevision,rev+1);
    evidence.steps.push({r:rev+1,round:state.round,phase:state.phase,side,action,activeSide:state.activeSideKey,stateHash:result.room.stateHash});
    await save();
  }
  throw Error('Round limit was not reached in 160 signed actions');
}

try {
  if(evidence.stop){
    (evidence.previousStops??=[]).push(evidence.stop);
    if(evidence.visibleError||evidence.diagnostics)(evidence.previousDiagnostics??=[]).push({stop:evidence.stop,visibleError:evidence.visibleError,diagnostics:evidence.diagnostics});
    delete evidence.stop;delete evidence.visibleError;delete evidence.diagnostics;await save();
  }
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const setups=await request(product+'/catalogue');
  const profile=setups.setups.find(s=>s.id===setupId);
  assert(profile);
  if(roomId) await server.host.get(roomId);
  let seats=await fs.readFile(secretFile,'utf8').then(JSON.parse).catch(e=>{if(e.code!=='ENOENT')throw e;return {};});
  const first=await pageFor();
  first.on('response',async res=>{if(res.url().includes('/recovery-exchange')&&res.ok()){const body=await res.json().catch(()=>null);if(body?.result?.credential) seats.player1=body.result.credential;}});
  if(!roomId){
    await first.goto(server.origin+'/match');
    await first.getByTestId('product-mode-human_vs_human').click();
    await first.getByTestId('product-setup-'+setupId).click();
    await first.getByTestId('product-match-lobby').screenshot({path:path.join(dir,setupId+'-lobby.png')});
    const created=first.waitForResponse(r=>r.url().endsWith(product+'/rooms')&&r.request().method()==='POST',{timeout:720000});
    const recovered=first.waitForResponse(r=>r.url().includes('/recovery-exchange'),{timeout:720000}).then(r=>r.json()).catch(()=>null);
    await first.getByTestId('product-start-match').click();
    const value=await (await created).json();assert(value.ok,value.error||value.reason);
    roomId=value.match.roomId;evidence.roomId=roomId;await save();
    seats.player1=(await recovered)?.result?.credential;
    assert(seats.player1);await fs.writeFile(secretFile,JSON.stringify(seats),{mode:0o600});
  }
  if(!evidence.firstSeatReload){
    if(first.url()==='about:blank') {
      await first.goto(server.origin+'/match');await first.getByTestId('product-resume-'+roomId).click({timeout:60000});
    }
    await first.getByTestId('battlefield-map-contract-v1').waitFor({timeout:180000});evidence.browserCreated=true;await save();
    await first.reload();
    // After a hard refresh a clean client may require the local owner's explicit reopen.
    const resume=first.getByTestId('product-match-lobby').getByText(/继续已有对局|Continue a match/);
    const table=first.getByTestId('battlefield-map-contract-v1');
    await Promise.race([resume.waitFor({timeout:90000}),table.waitFor({timeout:90000})]);
    if(!await table.isVisible()){
      await first.getByTestId('product-resume-'+roomId).click();
      evidence.reloadMode='explicit local room reopen';
    } else evidence.reloadMode='automatic';
    await first.getByTestId('battlefield-map-contract-v1').waitFor({timeout:90000});evidence.firstSeatReload=true;
    const binding=(await api('projection',undefined,seats.player1.seatToken)).projection;
    evidence.opening={size:profile.scale,mission:profile.mission,deployment:profile.deployment,
      terrain:binding.state.board.terrain.length,seat:binding.viewer.seatKey};
    assert.equal(evidence.opening.seat,'player1');assert.equal(evidence.opening.terrain,profile.minerals===500?1031:1804);await save();
  }
  if(!evidence.guestEntered){
    const second=await pageFor();
    const recovering=Boolean(seats.player2);
    const {invite,recovery}=recovering
      ? await api('recovery-tickets',{},seats.player2.seatToken)
      : await api('invites',{},seats.player1.seatToken);
    const accessKind=recovering?'recovery':'invite';
    const accessToken=recovering?recovery.recoveryToken:invite.inviteToken;
    const exchange=second.waitForResponse(r=>r.url().endsWith('/'+accessKind+'-exchange'),{timeout:90000}).then(r=>r.json());
    await second.goto(server.origin+'/room/'+roomId+'#'+accessKind+'='+encodeURIComponent(accessToken));
    const receipt=await exchange;
    assert(receipt.result?.ok,receipt.result?.reason);
    seats.player2=receipt.result.credential;
    await fs.writeFile(secretFile,JSON.stringify(seats),{mode:0o600});
    await second.getByTestId('battlefield-map-contract-v1').waitFor({timeout:90000});
    const proj=(await api('projection',undefined,seats.player2.seatToken)).projection;
    assert.equal(proj.viewer.seatKey,'player2');evidence.guestEntered=true;await save();await second.close();
  }
  await first.close();
  await play(seats);
  await server.close();server=await createStarcraftProductServerV1(options);
  const p=(await api('projection',undefined,seats.player2.seatToken)).projection;
  assert.equal(p.room.stateHash,evidence.terminal.stateHash);assert.equal(p.room.matchBindingHash,evidence.terminal.bindingHash);
  const replay=await api('replay',undefined,seats.player1.seatToken);
  assert(replay.ok&&replay.matchesCurrent);evidence.coldReplay=true;
  const page=await pageFor();
  const {match}=await request(product+'/rooms/'+roomId+'/open',{});
  await page.goto(match.joinUrl);
  await page.getByTestId('product-match-outcome').waitFor({timeout:90000});
  evidence.resultText=await page.getByTestId('product-match-outcome').innerText();
  const {scores,winner}=evidence.terminal;
  assert(evidence.resultText.includes(scores.player1+' – '+scores.player2));
  const winnerText=winner==='player1'?/玩家一获胜|Player 1 wins/:winner==='player2'?/玩家二获胜|Player 2 wins/:/平局|Draw/;
  assert.match(evidence.resultText,winnerText);
  await page.getByTestId('product-match-outcome').screenshot({path:path.join(dir,setupId+'-outcome.png')});
  delete evidence.stop;await save();console.log(JSON.stringify({roomId,terminal:evidence.terminal,coldReplay:true}));
 } catch(error){
  evidence.stop=error.message;
  evidence.diagnostics=diagnostics.slice(-30);
  for(const page of pages.filter(p=>!p.isClosed())){
    const body=(await page.locator('body').innerText({timeout:5000}).catch(()=>''))||'';
    evidence.visibleError=body.replace(/[A-Za-z0-9_-]{32,}/g,'[redacted]').slice(-1800);
    await page.screenshot({path:path.join(dir,setupId+'-stopped.png'),timeout:12000}).catch(()=>{});
  }
  await save();throw error;
}
finally {await browser?.close();await server.close();}
