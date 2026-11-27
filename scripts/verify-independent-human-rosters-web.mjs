// Verify real, privately saved rosters from two independent browser profiles.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
const hostDir=path.resolve(process.argv[2]), service=JSON.parse(await readFile(path.join(hostDir,'service.json')));
assert.equal(service.liveEnabled,false);
const origin=new URL(service.url).origin, prefix='/starcraft-tmg-level3/product/v1';
const setupId='wave3-standard-v1';
const {recipes}=JSON.parse(await readFile(process.argv[3] || 'build/ticket-28-wave3-mixed-support-opening/sentry/opening.json'));
const browser=await chromium.launch({headless:true,...(process.env.CHROME_BIN?{executablePath:process.env.CHROME_BIN}:{})});
const steps=[]; const step=s=>{steps.push(s);console.log(s)};
try {
  const contexts=await Promise.all([browser.newContext(),browser.newContext()]);
  const [host,guest]=await Promise.all(contexts.map(c=>c.newPage()));
  for(const p of [host,guest]){p.on('pageerror',e=>console.error('browser',e.message));p.on('response',r=>{const u=new URL(r.url());if(u.pathname.includes('/lineups')||u.pathname.endsWith('/match-setup'))console.log('api',r.status(),u.pathname.split('/').at(-1));});}
  await host.goto(service.url);await host.getByTestId('product-setup-'+setupId).click();
  await host.getByTestId('product-create-lineup').click();
  const invite=await host.getByTestId('lineup-invite-link').innerText();
  const [id,claim]=new URLSearchParams(new URL(invite).hash.slice(1)).get('rosterJoin').split('.'),base=origin+prefix+'/lineups/'+id;
  await guest.goto(invite);await guest.getByTestId('lineup-edit').filter({visible:true}).waitFor();
  const outsider=await browser.newContext();assert.equal((await outsider.request.post(base+'/join',{data:{invite:claim}})).status(),403);await outsider.close();
  step('invited two isolated browser seats; invitation is single use');
  async function ownRoster(page,side,name) {
    await page.bringToFront();await page.getByTestId('lineup-edit').filter({visible:true}).click();
    await page.getByTestId('army-return-to-lineup').filter({visible:true}).waitFor();
    const {catalogue,setup}=await (await page.request.get(origin+'/starcraft-tmg-level3/roster-planning/v1/match-setup',{headers:{'x-starcraft-match-setup':setupId}})).json();
    assert.equal(setup.id,setupId);
    const r=recipes[side],card=k=>catalogue.cards.find(c=>k==='tactical_cards:'+c.id),f=card(r.factionRecordKey);
    const lines=['=== '+name+' ===','Faction: '+f.faction,'Minerals: 2000','[FC] '+f.name,
      ...r.tacticalCardRecordKeys.map(k=>'[TC] '+card(k).name+' ('+card(k).cost+'gas)'),
      ...r.units.map((u,i)=>{const c=catalogue.units.find(c=>'army_units:'+c.id===u.recordKey),size=u.compositionKind;
        return (i+1)+'. '+c.name+' ['+c.unitType+'/'+size+'] '+c[size+'Profile'].cost+'M'+(u.upgradeNames.length?' +upg: '+u.upgradeNames.join(', '):'');}),'=== END ==='];
    const imp=page.getByText(/^(Import Army|导入军表)$/i);await imp.click();await page.locator('textarea').fill(lines.join('\n'));await imp.last().click();
    await page.getByTestId('army-return-to-lineup').filter({visible:true}).click();
    const mine=page.getByRole('button',{name,exact:true});await mine.click();await page.getByTestId('lineup-submit').filter({visible:true}).click();
    await page.getByTestId('lineup-status').filter({visible:true}).filter({hasText:name}).waitFor({timeout:90000});
  }
  await ownRoster(host,'player1','Independent Daelaam');assert.equal(await host.getByTestId('lineup-enter').filter({visible:true}).count(),0);
  let guestState=(await (await guest.request.get(base)).json()).lineup;
  assert.equal(guestState.otherSubmitted,true);assert.equal(guestState.submitted,false);assert(!JSON.stringify(guestState).includes('Independent Daelaam'));
  const invalid=await guest.request.post(base+'/submit',{data:{army:{name:'malformed',mineralsLimit:2000,officialDatasetHash:'wrong'}}});assert.equal(invalid.status(),422);
  const impersonate=await guest.request.post(base+'/submit',{data:{side:'player1',preset:'example'}});assert.equal(impersonate.status(),422);
  step('first player submitted own custom army; no room before guest; opponent contents private; wrong release and seat override rejected');
  await ownRoster(guest,'player2','Independent Zagara');
  await host.getByTestId('lineup-refresh').filter({visible:true}).click();
  await guest.reload();await guest.getByTestId('lineup-enter').filter({visible:true}).waitFor();
  const seats=[];
  for(const [page,side] of [[host,'player1'],[guest,'player2']]){
    const res=page.waitForResponse(r=>r.url().endsWith('/recovery-exchange') && r.request().method()==='POST');
    await page.getByTestId('lineup-enter').filter({visible:true}).click();
    const {result}=await (await res).json();assert.equal(result.credential.seatKey,side);
    await page.getByTestId('battlefield-map-contract-v1').waitFor({timeout:90000});
    seats.push({side,roomId:result.room.roomId});
  }
  assert.equal(seats[0].roomId,seats[1].roomId);
  const record=JSON.parse(await readFile(path.join(hostDir,'rooms',seats[0].roomId,'room.private.json')));
  for(const side of ['player1','player2']){const got=record.recipes[side];assert.equal(got.factionRecordKey,recipes[side].factionRecordKey);
    assert.deepEqual(got.tacticalCardRecordKeys,recipes[side].tacticalCardRecordKeys);
    assert.deepEqual(got.units.map(({recordKey,compositionKind,upgradeNames})=>[recordKey,compositionKind,upgradeNames]),recipes[side].units.map(({recordKey,compositionKind,upgradeNames})=>[recordKey,compositionKind,upgradeNames]));}
  const again=await guest.request.post(base+'/submit',{data:{preset:'ignored-after-lock'}});assert((await again.json()).lineup.ready);
  assert.equal((await guest.request.post(origin+prefix+'/rooms/'+record.roomId+'/open',{data:{}})).status(),403);
  step('both frozen rosters match each private submission; same board, distinct seats; reload and repeat submission checked');
  await writeFile(path.join(hostDir,'lineup-web-proof.public.json'),JSON.stringify({seats,setupId,steps,providers:0},null,2)+'\n');
} finally {await browser.close();}
