import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {resolveStarcraftTmgBattlefieldUnitMediaV1 as resolve} from '../packages/client-domain/battlefield-media-catalog-v1.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const proof=JSON.parse(await readFile(path.join(root,'content/client/wave3-battlefield-media-sources-v1.json')));
const release=JSON.parse(await readFile(path.join(root,'content/source-releases/wave3-20261126-human-match-v2.json')));
const dataset=JSON.parse(await readFile(path.join(root,release.source.datasetRef)));
const files=new Map();
async function bytes(ref) {
  assert(ref.startsWith('/assets/client/'));
  if(!files.has(ref))files.set(ref,await readFile(path.join(root,ref)));
  return files.get(ref);
}
const sha=b=>createHash('sha256').update(b).digest('hex');
function frames(b) {
  assert.equal(b.toString('ascii',0,4),'RIFF');
  assert.equal(b.toString('ascii',8,12),'WEBP');
  assert.equal(b.readUInt32LE(4)+8,b.length);
  let count=0;
  for(let offset=12;offset+8<=b.length;){
    if(b.toString('ascii',offset,offset+4)==='ANMF')count++;
    const size=b.readUInt32LE(offset+4);
    offset+=8+size+(size%2);
  }
  return count;
}
const ids=Object.keys(proof.units);
const keys=new Set(JSON.stringify(dataset).match(/army_units:[a-z0-9_]+/g));
assert.deepEqual(new Set(ids.map(id=>'army_units:'+id)),keys);
const artHashes=new Set();
for(const [id,record] of Object.entries(proof.units)){
  const m=resolve('army_units:'+id,{releaseChannel:'development_internal'});
  assert.equal(m.unitKey,id);
  assert.equal(sha(await bytes(m.unitCardPath)),record.cardSha256);
  assert.equal(sha(await bytes(m.identityPortraitPath)),record.portraitSha256);
  artHashes.add(record.portraitSha256);
  const clip=await bytes(m.activePortraitPath);
  assert.equal(sha(clip),proof.animations[m.communicationChannel].sha256);
  assert.equal(frames(clip),proof.animations[m.communicationChannel].frames);
  assert(frames(clip)>1);
  assert(m.voice?.selected.length>0);
  for(const ref of Object.values(m.voice).flat()){
    const audio=await bytes(ref);
    assert.equal(audio.toString('ascii',0,4),'OggS');
    if(ref.includes('/wave3/'))assert.equal(sha(audio),proof.audio[path.basename(ref)].sha256);
  }
  assert.equal(resolve(id+'x',{releaseChannel:'development_internal'}),null);
  assert.equal(resolve(id)?.identityPortraitPath??null,null);
}
assert.equal(artHashes.size,ids.length);
console.log(JSON.stringify({units:ids.length,distinctUnitArt:artHashes.size,communications:Object.keys(proof.animations).length,checkedFiles:files.size}));
