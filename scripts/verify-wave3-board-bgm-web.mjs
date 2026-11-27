import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs/promises';
import {chromium} from 'playwright';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root=process.cwd();
const dataDirectory=path.resolve('build/ticket-28-wave3-lobby-mission-selection');
const webRoot=path.resolve('build/ticket-28-wave3-geometry-web/web');
const track=path.resolve('assets/client/battlefield/voice/development-internal/goliath/TerranGoliathWhat01SC1.ogg');
const {results}=JSON.parse(await fs.readFile(path.join(dataDirectory,'result.public.json'),'utf8'));
const roomId=results[0].roomId;
const output=path.resolve('build/ticket-28-wave3-board-bgm');
await fs.mkdir(output,{recursive:true});
const server=await createStarcraftProductServerV1({root,fixtureRoot:root,dataDirectory,webRoot,port:0,liveEnabled:false,autoDrive:false});
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:980}});
  await page.route('**/*',route=>new URL(route.request().url()).origin===server.origin?route.continue():route.abort());
  // Observe the actual element allocated by Expo Audio. All playback uses the browser implementation.
  await page.addInitScript(()=>{
    const original=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(...args){
      if(this.src.startsWith('blob:')){
        window.bgmElement=this;
        this.addEventListener('seeked',()=>{window.bgmSeeks=(window.bgmSeeks??0)+1;});
      }
      return Reflect.apply(original,this,args);
    };
  });
  const res=await fetch(server.origin+'/starcraft-tmg-level3/product/v1/rooms/'+roomId+'/open',{method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  assert(res.ok);const open=await res.json();
  await page.goto((open.result??open).match.joinUrl);
  const choose=page.getByText(/^(选择 BGM|Choose BGM)$/);
  await choose.waitFor({timeout:120000});
  const [picker]=await Promise.all([page.waitForEvent('filechooser'),choose.click()]);
  await picker.setFiles(track);
  await page.getByText(/^(播放 BGM|Play BGM)$/).click();
  await page.waitForFunction(()=>window.bgmElement?.currentTime>0&&window.bgmElement?.loop);
  const state=()=>page.evaluate(()=>{
    const a=window.bgmElement;
    return {paused:a.paused,volume:a.volume,loop:a.loop,time:a.currentTime,duration:a.duration,readyState:a.readyState,loopSeeks:window.bgmSeeks??0};
  });
  const playing=await state();
  await page.getByText('Vol +',{exact:true}).click();
  await page.waitForFunction(()=>window.bgmElement.volume>0.54);
  await page.waitForFunction(()=>window.bgmSeeks>0,null,{timeout:15000});
  const looped=await state();
  await page.getByText(/^(暂停 BGM|Pause BGM)$/).click();
  await page.waitForFunction(()=>window.bgmElement.paused);
  const paused=await state();
  assert(Math.abs(playing.volume-0.45)<0.001&&Math.abs(paused.volume-0.55)<0.001);
  await page.getByText(/BGM 已暂停|BGM paused/i).first().waitFor();
  await choose.screenshot({path:path.join(output,'choose.png')});
  await atomicWrite(path.join(output,'result.public.json'),JSON.stringify({roomId,track:path.basename(track),purpose:'user-selected local audio fixture',playing,looped,paused,providerCalls:0},null,2)+'\n');
  console.log(JSON.stringify({playing,looped,paused}));
}finally{await browser?.close();await server.close();}
