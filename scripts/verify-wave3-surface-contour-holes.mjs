import assert from 'node:assert/strict';
import { savedRoom } from './support/wave3-faq-room-v1.mjs';
import { read, save } from './support/wave3-raven-tabletop-room-v1.mjs';
import { createOfficialModelBaseFootprintV1 } from '../packages/rule-atoms/official-model-base-geometry-rules-kernel-v1.mjs';
import { officialRectangleUnionCoversBasesV1 as covers } from '../packages/rule-atoms/official-footprint-rectangle-union-geometry-v1.mjs';

const dir='build/ticket-28-wave3-premade-flight-and-platform';
const {initial}=await savedRoom(dir,'wave3-flight-and-platform');
const state=initial.state, dataBundle=state.officialModelBaseGeometryDataBundle;
const raven=state.pieces.find(p=>p.id==='raven'), model=raven.models[0];
const source=await read('build/ticket-28-wave3-assessment-20261112/normalized-diff.json');
const newUnits=source.collections.army_units.added.map(u=>'army_units:'+u.id);
const profiles=new Map(dataBundle.profiles.map(profile=>[profile.recordKey,profile]));
assert.equal(profiles.size,45);
assert.equal(newUnits.length,19);
assert(newUnits.every(id=>profiles.has(id)));
assert.deepEqual(dataBundle.missingProfiles,[]);
const shapeCounts={};
for(const profile of profiles.values())shapeCounts[profile.baseShape]=(shapeCounts[profile.baseShape]??0)+1;
assert.equal(shapeCounts.measured_contour,1);

const base=(dx,dy)=>createOfficialModelBaseFootprintV1({piece:raven,model,dataBundle,
  position:{xMilliInches:10000+dx,yMilliInches:10000+dy,rotationDegrees:0}});
const cell=(x1,y1,x2,y2)=>({shape:'axis_aligned_rectangle',minXMilliInches:10000+x1,minYMilliInches:10000+y1,
  maxXMilliInches:10000+x2,maxYMilliInches:10000+y2});
// Physical surface is a square with an open 100 x 100 milli-inch hole. Test the real arms, the notch between them,
// and a sweep which crosses the hole even though the complete bases at both endpoints fit.
function withHole(x,y){
  return [cell(-4000,-4000,x,4000),cell(x+100,-4000,4000,4000),cell(x,-4000,x+100,y),cell(x,y+100,x+100,4000)];
}
const corner=withHole(700,700),arm=withHole(1000,-50),sweep=withHole(800,700);
const checks={notch:covers(corner,[base(0,0)]),arm:covers(arm,[base(0,0)]),
  start:covers(sweep,[base(0,0)]),end:covers(sweep,[base(1600,0)]),
  swept:covers(sweep,[base(0,0),base(1600,0)])};
assert.deepEqual(checks,{notch:true,arm:false,start:true,end:true,swept:false});
await save(dir+'/geometry.public.json',{sourceHash:initial.stateHash,unitGeometryHash:dataBundle.bundleHash,
  sourceNewUnits:newUnits,sourceRecords:profiles.size,shapeCounts,checks,scope:'release catalogue and declared surface cells using the signed room stand; independent of native move receipts',providerCalls:0});
