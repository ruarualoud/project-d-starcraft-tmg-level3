import {constants} from 'node:fs';
import {mkdir,lstat,open,rename,unlink} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';

const VERSION='product_room_credential_store_v1';
const fail=()=>{throw Object.assign(new Error('PRODUCT_SAVED_CREDENTIAL_UNREADABLE'),{code:'PRODUCT_SAVED_CREDENTIAL_UNREADABLE'});};

// The product ingress owns this store. Provider workers remain memory-only;
// no credential or export handle is returned to the browser or a model.
export function createProductRoomCredentialStoreV1({directory,codec,roomId,providerId}) {
  if(!path.isAbsolute(directory)||!codec?.encode||!codec?.decode||!roomId||!providerId)
    throw new TypeError('credential store requires an explicit room/provider codec');
  const identity=seat=>`${VERSION}:${roomId}:${seat}:${providerId}`;
  const file=seat=>{
    if(!['player1','player2'].includes(seat))throw new TypeError('player seat required');
    return path.join(directory,seat+'.sealed.json');
  };
  async function guardDirectory(create=false){
    if(create)await mkdir(directory,{recursive:true,mode:0o700});
    let stat;try{stat=await lstat(directory);}catch(error){if(error.code==='ENOENT'&&!create)return false;throw error;}
    if(!stat.isDirectory()||stat.isSymbolicLink())fail();return true;
  }
  async function guardFile(filename){
    try{const stat=await lstat(filename);if(!stat.isFile()||stat.isSymbolicLink()||stat.size>64*1024)fail();return true;}
    catch(error){if(error.code==='ENOENT')return false;throw error;}
  }
  return Object.freeze({kind:'local_room_aes_256_gcm',
    async read(seat){
      const filename=file(seat);if(!await guardDirectory()||!await guardFile(filename))return null;
      let handle;
      try{
        handle=await open(filename,constants.O_RDONLY|constants.O_NOFOLLOW);
        const sealed=JSON.parse(await handle.readFile('utf8'));
        if(sealed.schemaVersion!==VERSION||typeof sealed.encryptedPayload!=='string')fail();
        const payload=codec.decode(sealed.encryptedPayload,identity(seat));
        if(payload.schemaVersion!==VERSION||payload.roomId!==roomId||payload.seatKey!==seat
          ||payload.providerId!==providerId||typeof payload.credentialBase64!=='string')fail();
        const bytes=Buffer.from(payload.credentialBase64,'base64');
        if(bytes.toString('base64')!==payload.credentialBase64||bytes.length<8||bytes.length>8192
          ||bytes.some(byte=>byte<33||byte>126)){bytes.fill(0);fail();}
        return bytes;
      }catch{fail();}finally{await handle?.close();}
    },
    async write(seat,bytes){
      const filename=file(seat);await guardDirectory(true);await guardFile(filename);
      const encryptedPayload=codec.encode({schemaVersion:VERSION,roomId,seatKey:seat,providerId,
        credentialBase64:bytes.toString('base64')},identity(seat));
      const pending=filename+'.pending-'+randomUUID();let handle;
      try{
        handle=await open(pending,'wx',0o600);
        await handle.writeFile(JSON.stringify({schemaVersion:VERSION,encryptedPayload})+'\n');
        await handle.sync();await handle.close();handle=null;
        await rename(pending,filename);
      }finally{await handle?.close();await unlink(pending).catch(error=>{if(error.code!=='ENOENT')throw error;});}
    },
    async remove(seat){
      const filename=file(seat);if(!await guardDirectory()||!await guardFile(filename))return;
      await unlink(filename);
    },
  });
}
