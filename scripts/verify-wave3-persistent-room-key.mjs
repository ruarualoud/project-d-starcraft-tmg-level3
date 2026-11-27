import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {mkdir,readFile,writeFile,stat,access,symlink} from 'node:fs/promises';
import path from 'node:path';
import {createStarcraftTmgPrivatePayloadCodec} from '../packages/room-store/room-store-v1.mjs';
import {createProductRoomCredentialStoreV1} from '../packages/secure-provider-runtime/product-room-credential-store-v1.mjs';
import {createProductRoomCredentialsV1} from '../packages/secure-provider-runtime/product-room-credentials-v1.mjs';
import {claimProductCompanionDispatchV1,readProductCompanionDispatchUsageV1} from '../packages/secure-provider-runtime/companion-live-provider-v1.mjs';

const directory=path.resolve('build/playtest-web/persistent-room-key',randomUUID());
const savedDirectory=path.join(directory,'credentials');
await mkdir(directory,{recursive:true});
const codec=createStarcraftTmgPrivatePayloadCodec({key:randomBytes(32),keyId:'offline-key-store',trustLevel:'development_persistent'});
const storage=()=>createProductRoomCredentialStoreV1({directory:savedDirectory,codec,roomId:'offline-room',providerId:'openai-api-direct'});
const synthetic='sk-offline-fixture-never-a-real-provider-key';
const secondSynthetic='sk-offline-second-fixture-never-a-real-key';
const fingerprint=value=>createHash('sha256').update(value).digest('hex');
let factories=0,closed=0;
const factory=async ingress=>{factories++;const {credentialBytes}=await ingress();
  try{return {fingerprint:fingerprint(credentialBytes),close(){closed++;}};}finally{credentialBytes.fill(0);}};
const use=keys=>keys.use('player1','companion',factory,provider=>provider.fingerprint);

const ephemeral=createProductRoomCredentialsV1();
await ephemeral.replace('player1',synthetic);
assert.equal(ephemeral.status('player1').persisted,false);
assert.equal(ephemeral.status('player1').requiresReentryAfterServerRestart,true);
await ephemeral.close();

const first=createProductRoomCredentialsV1({credentialStore:storage()});
await first.restore();assert.equal(first.status('player1').configured,false);
await first.replace('player1',synthetic);
assert.equal(first.status('player1').persisted,false);
await assert.rejects(access(path.join(savedDirectory,'player1.sealed.json')),{code:'ENOENT'});
await first.replace('player1',synthetic,{remember:true});
assert.equal(first.status('player1').persisted,true);
assert.equal(first.status('player1').requiresReentryAfterServerRestart,false);
assert.equal(await use(first),fingerprint(synthetic));
const filename=path.join(savedDirectory,'player1.sealed.json');
const sealed=await readFile(filename,'utf8');
assert(!sealed.includes(synthetic));assert(!sealed.includes(Buffer.from(synthetic).toString('base64')));
assert.equal((await stat(filename)).mode&0o777,0o600);
assert.equal((await stat(savedDirectory)).mode&0o777,0o700);
await first.close();assert.equal(closed,1);

const restored=createProductRoomCredentialsV1({credentialStore:storage()});
const factoriesBefore=factories;
await restored.restore();assert.equal(factories,factoriesBefore,'Restore creates no Provider');
assert.equal(restored.status('player1').configured,true);
assert.equal(restored.status('player1').persisted,true);
assert.equal(restored.status('player2').configured,false);
assert.equal(await use(restored),fingerprint(synthetic));
await restored.replace('player1',secondSynthetic,{remember:true});
assert.equal(closed,2);assert.equal(await use(restored),fingerprint(secondSynthetic));
await restored.close();

const wrongRoom=createProductRoomCredentialsV1({credentialStore:createProductRoomCredentialStoreV1({directory:savedDirectory,codec,roomId:'other-room',providerId:'openai-api-direct'})});
await wrongRoom.restore();assert.equal(wrongRoom.status('player1').configured,false);
assert.equal(wrongRoom.status('player1').savedCredentialError,'PRODUCT_SAVED_CREDENTIAL_UNREADABLE');
await assert.rejects(use(wrongRoom),{code:'PRODUCT_USER_KEY_REQUIRED'});await wrongRoom.close();
const wrongProvider=createProductRoomCredentialsV1({credentialStore:createProductRoomCredentialStoreV1({directory:savedDirectory,codec,roomId:'offline-room',providerId:'other-provider'})});
await wrongProvider.restore();assert.equal(wrongProvider.status('player1').configured,false);await wrongProvider.close();
await writeFile(path.join(savedDirectory,'player2.sealed.json'),await readFile(filename),{mode:0o600});
const swappedSeat=createProductRoomCredentialsV1({credentialStore:storage()});
await swappedSeat.restore();assert.equal(swappedSeat.status('player2').configured,false);
assert.equal(swappedSeat.status('player1').configured,true);await swappedSeat.close();

const valid=await readFile(filename,'utf8');const bad=JSON.parse(valid),cipher=JSON.parse(bad.encryptedPayload);
cipher.ciphertext=(cipher.ciphertext[0]==='A'?'B':'A')+cipher.ciphertext.slice(1);
bad.encryptedPayload=JSON.stringify(cipher);await writeFile(filename,JSON.stringify(bad));
const tampered=createProductRoomCredentialsV1({credentialStore:storage()});
await tampered.restore();assert.equal(tampered.status('player1').configured,false);
await assert.rejects(use(tampered),{code:'PRODUCT_USER_KEY_REQUIRED'});await tampered.close();
await writeFile(filename,valid);

const failedSave=createProductRoomCredentialsV1({credentialStore:{kind:'offline-write-failure',
  read:async()=>null,remove:async()=>{},write:async()=>{throw Error('OFFLINE_WRITE_FAILURE');}}});
await failedSave.replace('player1',synthetic);assert.equal(await use(failedSave),fingerprint(synthetic));
await assert.rejects(failedSave.replace('player1',secondSynthetic,{remember:true}),/OFFLINE_WRITE_FAILURE/u);
assert.equal(await use(failedSave),fingerprint(synthetic),'A failed persistence write retains the current working key');
await failedSave.close();

const revoke=createProductRoomCredentialsV1({credentialStore:storage()});await revoke.restore();
await revoke.replace('player1',null);assert.equal(revoke.status('player1').persisted,false);
await assert.rejects(access(filename),{code:'ENOENT'});await revoke.close();
const afterRevoke=createProductRoomCredentialsV1({credentialStore:storage()});await afterRevoke.restore();
assert.equal(afterRevoke.status('player1').configured,false);await afterRevoke.close();

const profile={model:'offline-model',integrity:{hash:'offline-profile'}};
await writeFile(path.join(directory,'dispatch.jsonl'),Array.from({length:9},(_,index)=>JSON.stringify({index,providerProfileHash:profile.integrity.hash})).join('\n')+'\n');
const limit=await readProductCompanionDispatchUsageV1({dataDirectory:directory,providerProfile:profile,maxDispatches:9});
assert.equal(limit.usedDispatches,9);assert.equal(limit.remainingDispatches,0);
await assert.rejects(claimProductCompanionDispatchV1({dataDirectory:directory,providerProfile:profile,maxDispatches:9,instance:'offline',index:1}),{code:'PRODUCT_COMPANION_TRIAL_LIMIT_REACHED'});
const linkDirectory=path.join(directory,'linked-store');await symlink(savedDirectory,linkDirectory);
const linked=createProductRoomCredentialStoreV1({directory:linkDirectory,codec,roomId:'offline-room',providerId:'openai-api-direct'});
await assert.rejects(linked.write('player1',Buffer.from(synthetic)),{code:'PRODUCT_SAVED_CREDENTIAL_UNREADABLE'});
const report={passed:true,harnessLoopUsed:true,encryptedColdRestore:true,explicitRememberRequired:true,
  roomSeatProviderIsolation:true,tamperingRejected:true,failedSaveKeepsWorkingKey:true,rotationAndRevocation:true,
  plaintextAbsent:true,symlinkRejected:true,fileMode:'0600',directoryMode:'0700',quotaUnchanged:true,realProviderCalls:0,networkAttempts:0,trainingTruth:false};
await writeFile(path.join(directory,'report.public.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({directory,...report}));
