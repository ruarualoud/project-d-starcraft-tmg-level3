import assert from 'node:assert/strict';
import { backup, DatabaseSync } from 'node:sqlite';
import { chmod, copyFile, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createStarcraftProductServerV1 } from './serve-starcraft-product-v1.mjs';
import { createStarcraftTmgClientDomain } from '../packages/client-domain/client-domain-v1.mjs';
import { createHttpStarcraftTmgAuthoritativeTransportAdapter } from '../packages/client-domain/authoritative-transport-adapters-v1.mjs';
import { createInMemoryStarcraftTmgLifecycleAdapter } from '../packages/client-domain/lifecycle-adapters-v1.mjs';
import { createInMemoryStarcraftTmgProjectionStoreAdapter } from '../packages/client-domain/projection-store-adapters-v1.mjs';
import { createSqliteStarcraftTmgRoomStore } from '../packages/room-store/sqlite-room-store-v1.mjs';
import { createStarcraftTmgPrivatePayloadCodec } from '../packages/room-store/room-store-v1.mjs';

const root = process.cwd();
const original = path.join(root, 'build/starcraft-product-integration-20261109');
const out = path.join(root, 'build/ticket-28-wave3-human-lobby-v1/existing-product-room');
const json = async file => JSON.parse(await readFile(file, 'utf8'));
const historical = await json(path.join(original, 'ui-revision-sync-result.json'));
const roomId = new URL(historical.url).pathname.split('/').at(-1);
const sourceDir = path.join(original, 'offline/rooms', roomId);
const sourceFile = path.join(sourceDir, 'room.sqlite');
const recordFile = path.join(sourceDir, 'room.private.json');
const record = await json(recordFile);
const config = await json(path.join(root, 'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'));
const dataDirectory = path.join(out,'isolation');
const cloneDir = path.join(dataDirectory, 'rooms', roomId);
const resultFile = path.join(out, 'result.public.json');
const prior = await json(resultFile).catch(error => {
  if (error.code !== 'ENOENT') throw error;
  return null;
});
const previousStops = [...(prior?.previousStops || [])];
if (prior?.status === 'stopped') previousStops.push({
  reason: prior.reason, message: prior.message, dependencyKind: prior.dependencyKind, checks: prior.checks,
});
const evidence = { roomId, historicalRevision: historical.serverAfter, modelCalls: 0, previousStops, checks: {} };
async function save() {
  await writeFile(resultFile+'.new', JSON.stringify(evidence,null,2)+'\n');
  await rename(resultFile+'.new', resultFile);
}
function loadIdentity(aggregate) {
  const {envelope} = aggregate;
  return {revision: aggregate.stateRevision, bindingHash: envelope.matchBinding.bindingHash,
    runtimeHash: envelope.matchBinding.rulesRuntimeBinding.runtimeHash, stateHash: envelope.stateHash,
    journalHeadHash: envelope.journalHeadHash, hasRelease: Boolean(envelope.matchBinding.releaseBinding)};
}
assert.equal(record.roomId, roomId);assert.equal(record.matchMode,'human_vs_human');assert(!record.releaseSetup);
await mkdir(cloneDir,{mode:0o700,recursive:true});
const source = new DatabaseSync(sourceFile,{readOnly:true});
const originalStore = createSqliteStarcraftTmgRoomStore({database:source, privatePayloadCodec:createStarcraftTmgPrivatePayloadCodec({
  key:record.storeKey,keyId:roomId+'-store',trustLevel:'development_persistent'})});
let server;
try {
  const expected = loadIdentity(await originalStore.loadRoom(roomId));
  assert.equal(expected.revision,historical.serverAfter);assert.equal(expected.hasRelease,false);
  evidence.original = expected;
  const cloneFile=path.join(cloneDir,'room.sqlite');
  const exists=await readFile(path.join(cloneDir,'room.private.json'),'utf8').then(()=>true,e=>{if(e.code==='ENOENT')return false;throw e;});
  if(!exists){
    await backup(source,cloneFile);
    await copyFile(recordFile,path.join(cloneDir,'room.private.json'));
    await chmod(path.join(cloneDir,'room.private.json'),0o600);
  }
  evidence.checks.sourceCopied=true;await save();
  server=await createStarcraftProductServerV1({root,dataDirectory,fixtureRoot:config.fixtureRoot,
    mapConfiguration:record.mapConfiguration,webRoot:path.join(out,'../web-contract'),port:0,liveEnabled:false,autoDrive:false});
  await server.host.get(roomId);
  const opened=await fetch(server.origin+'/starcraft-tmg-level3/product/v1/rooms/'+roomId+'/open',{
    method:'POST',headers:{'content-type':'application/json'},body:'{}'});
  const response=await opened.json();assert(response.ok,response.error||response.reason);
  const token=new URLSearchParams(new URL(response.match.joinUrl).hash.slice(1)).get('recovery');
  assert(token);evidence.checks.productReopened=true;await save();
  const transport=createHttpStarcraftTmgAuthoritativeTransportAdapter({baseUrl:server.origin,timeoutMs:120000});
  const domain=createStarcraftTmgClientDomain({transport, lifecycle:createInMemoryStarcraftTmgLifecycleAdapter(),
    projectionStore:createInMemoryStarcraftTmgProjectionStoreAdapter()});
  const entered=await domain.bootstrap({route:{roomId},principal:{access:{kind:'recovery',token}},surface:'expo_web'});
  assert(entered.ok,entered.rejection?.code);const publicRoom=domain.read().roomProjection;
  assert.equal(publicRoom.viewer.seatKey,'player1');
  assert.equal(publicRoom.room.stateRevision,expected.revision);assert.equal(publicRoom.room.stateHash,expected.stateHash);
  assert.equal(publicRoom.matchBinding.bindingHash,expected.bindingHash);
  assert.equal(publicRoom.matchBinding.rulesRuntimeBinding.runtimeHash,expected.runtimeHash);
  assert.equal(Object.hasOwn(publicRoom.matchBinding,'releaseBinding'),false);
  evidence.checks.clientRejoinedOriginalSeat=true;await save();
  const replay=await domain.dispatch({type:'read_replay'});assert(replay.ok,replay.rejection?.code);
  const room=(await server.host.get(roomId)).roomStore;
  const recovered=loadIdentity(await room.loadRoom(roomId));
  assert.deepEqual(recovered,expected);
  assert.deepEqual(loadIdentity(await originalStore.loadRoom(roomId)),expected);
  evidence.checks.clientValidatedReplay=true;evidence.checks.originalUnchanged=true;
  evidence.recovered=recovered;evidence.status='passed';await save();console.log(evidence.status,roomId,expected.revision);
} catch(error) {
  evidence.status='stopped'; evidence.reason=error.code || error.name; evidence.message=String(error.message).slice(0,350);
  if(error.details?.kind) evidence.dependencyKind=error.details.kind;
  await save();throw error;
} finally {await server?.close();originalStore.close();}
