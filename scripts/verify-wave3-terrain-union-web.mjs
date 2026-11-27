import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';
import {createStarcraftProductServerV1} from './serve-starcraft-product-v1.mjs';
import {projectStarcraftTmgViewerStateShapeV3} from '../packages/client-domain/viewer-projection-v3.mjs';
import {projectStarcraftTmgBattlefieldPresentationV1} from '../packages/client-domain/battlefield-presentation-v1.mjs';
import {atomicWrite} from './lib/development-context.mjs';

const root=process.cwd(), read=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const cases='build/ticket-28-wave3-geometry-20261112-v1/official-map-matrix';
const dir='build/ticket-28-wave3-geometry-web';
const maps=[];
let historic;
for(const name of ['skirmish-d3-3','standard-d6-5','standard-d6-6']) {
  const {state,receiptHash}=await read(path.join(cases,name,'authority.json'));
  const publicState=projectStarcraftTmgViewerStateShapeV3(state);
  const scene=projectStarcraftTmgBattlefieldPresentationV1({roomProjection:{state:publicState}});
  const ramps=state.board.terrain.filter(t=>t.footprintCells);
  assert(ramps.length && scene.models.length);
  for(const ramp of ramps) {
    const draw=scene.terrain.find(t=>t.id===ramp.id);
    assert(draw.geometryRenderable);
    assert.deepEqual(draw.footprintCells,ramp.footprintCells.map(({shape,...bounds})=>bounds));
  }
  for(const model of scene.models) {
    const unit=state.pieces.find(piece=>piece.id===model.pieceId);
    assert(unit.officialUnitRecordKey && model.officialUnitRecordKey===unit.officialUnitRecordKey);
  }
  maps.push({name,receiptHash,ramps:ramps.map(t=>({id:t.id,cells:t.footprintCells.length})),onBoardModels:scene.models.length});
  if(name==='standard-d6-5') historic={publicState,ramps};
}
const dataDirectory=path.resolve('build/ticket-28-wave3-lobby-mission-selection');
const {results}=await read(path.join(dataDirectory,'result.public.json'));
const {roomId}=results[0];
const server=await createStarcraftProductServerV1({root,fixtureRoot:root,dataDirectory,
  webRoot:path.resolve(dir,'web'),port:0,liveEnabled:false,autoDrive:false});
let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_BIN||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'});
  const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'zh-CN'});
  let replayed=0;
  // Read-only rendering check. Supply recorded public terrain and pieces at the HTTP viewer boundary.
  await page.route('**/*',async route=>{
    const url=new URL(route.request().url());
    if(url.origin!==server.origin) return route.abort();
    if(!url.pathname.endsWith('/api/v1/rooms/'+roomId)||route.request().method()!=='GET') return route.continue();
    const response=await route.fetch();
    const body=await response.json();
    const state=body.result.projection.state;
    state.board=historic.publicState.board;state.pieces=historic.publicState.pieces;
    replayed++;
    return route.fulfill({response,json:body});
  });
  const open=await fetch(server.origin+'/starcraft-tmg-level3/product/v1/rooms/'+roomId+'/open',{method:'POST',
    headers:{'content-type':'application/json'},body:'{}'});
  assert(open.ok);
  const result=await open.json();
  await page.goto((result.result??result).match.joinUrl);
  const button=page.getByText(/^(规则地形|Rules terrain) \d+$/);
  await button.waitFor({timeout:120000});
  const target=page.locator('[id="battlefield-terrain-'+historic.ramps[0].id+'"]');
  if(!await target.count()) await button.click();
  await target.waitFor({state:'attached',timeout:15000});
  const witnesses=[];
  for(const ramp of historic.ramps) {
    const node=page.locator('[id="battlefield-terrain-'+ramp.id+'"]');
    const sample=await node.evaluate((node,ramp)=>{
      const {minXMilliInches:x,minYMilliInches:y,maxXMilliInches:right,maxYMilliInches:top}=ramp.footprint;
      const cells=ramp.footprintCells;
      const xs=[...new Set([x,right,...cells.flatMap(c=>[c.minXMilliInches,c.maxXMilliInches])])].sort((a,b)=>a-b);
      const ys=[...new Set([y,top,...cells.flatMap(c=>[c.minYMilliInches,c.maxYMilliInches])])].sort((a,b)=>a-b);
      let checked=0,clear=0,occupied=0;
      for(let i=1;i<xs.length;i++) for(let j=1;j<ys.length;j++){
        const point=new DOMPoint((xs[i-1]+xs[i])/2,(ys[j-1]+ys[j])/2);
        const physical=cells.some(c=>point.x>c.minXMilliInches&&point.x<c.maxXMilliInches&&point.y>c.minYMilliInches&&point.y<c.maxYMilliInches);
        if(node.isPointInFill(point)!==physical)throw Error('SVG_RULES_OCCUPANCY_DIFF');
        checked++;if(physical)occupied++;else clear++;
      }
      return {checked,clear,occupied,element:node.tagName};
    },ramp);
    assert(sample.clear>0&&sample.occupied>0&&sample.element==='path');
    witnesses.push({id:ramp.id,...sample});
  }
  assert(replayed);
  const svg=target.locator('xpath=ancestor::*[local-name()="svg"][1]');
  await svg.screenshot({path:path.join(dir,'standard-d6-5.png')});
  const resultDoc={maps,browserMap:'standard-d6-5',witnesses,mode:'historical public projection; read-only browser rendering',externalModelCalls:0};
  await atomicWrite(path.join(dir,'result.public.json'),JSON.stringify(resultDoc,null,2)+'\n');
  console.log(JSON.stringify(resultDoc));
} finally {await browser?.close();await server.close();}
