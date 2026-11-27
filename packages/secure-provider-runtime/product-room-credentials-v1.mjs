// Product keys are scoped to the authenticated room seat. An explicit product
// store can remember a consented key. Providers never use a machine fallback.
// A rotation lets the one
// already-started request finish, then closes its workers before using new bytes.
const fail = code => { throw Object.assign(new Error(code), {code}); };
export function createProductRoomCredentialsV1({credentialStore=null}={}) {
  const slots = new Map();
  let closed = false;
  function slot(seat) {
    if (!['player1','player2'].includes(seat)) fail('PRODUCT_PLAYER_SEAT_REQUIRED');
    if (!slots.has(seat)) slots.set(seat, {bytes:null, epoch:0, changing:false,
      queue:Promise.resolve(), providers:new Map(),persisted:false,savedCredentialError:null});
    return slots.get(seat);
  }
  function enqueue(s, fn) {
    const next=s.queue.then(fn);
    s.queue=next.catch(()=>{});
    return next;
  }
  async function clear(s) {
    const instances=[...s.providers.values()];s.providers.clear();
    s.bytes?.fill(0);s.bytes=null;
    const results=await Promise.allSettled(instances.map(p=>p.close?.()));
    if(results.some(r=>r.status==='rejected'))fail('PRODUCT_PROVIDER_CLOSE_FAILED');
  }
  function status(seat) {
    const s=slot(seat);
    return {configured:!closed&&Boolean(s.bytes),changing:s.changing,
      persisted:s.persisted,requiresReentryAfterServerRestart:!s.persisted,
      ...(credentialStore?{canPersistCredentials:true,persistenceKind:credentialStore.kind,
        savedCredentialError:s.savedCredentialError}:{}),
      inFlightRequestMayFinish:true};
  }
  async function replace(seat, apiKey=null,{remember=false}={}) {
    if(closed)fail('PRODUCT_CREDENTIAL_SERVICE_CLOSED');
    let bytes=null;
    if(apiKey!==null) {
      if(typeof apiKey!=='string'||!/^[!-~]{8,8192}$/.test(apiKey.trim()))
        fail('PRODUCT_API_KEY_INVALID');
      bytes=Buffer.from(apiKey.trim(),'utf8');
    }
    const s=slot(seat),epoch=++s.epoch;s.changing=true;
    try {
      return await enqueue(s,async()=>{
        if(remember&&!credentialStore)fail('PRODUCT_CREDENTIAL_PERSISTENCE_UNAVAILABLE');
        if(remember&&bytes)await credentialStore.write(seat,bytes);
        else if(credentialStore)await credentialStore.remove(seat);
        await clear(s);
        if(closed||s.epoch!==epoch)fail('PRODUCT_CREDENTIAL_CHANGED');
        s.bytes=bytes;bytes=null;s.changing=false;s.persisted=Boolean(remember&&s.bytes);s.savedCredentialError=null;
        return status(seat);
      });
    } finally {bytes?.fill(0);if(s.epoch===epoch)s.changing=false;}
  }
  async function use(seat, kind, factory, operation) {
    if(closed)fail('PRODUCT_CREDENTIAL_SERVICE_CLOSED');
    const s=slot(seat),epoch=s.epoch;
    return enqueue(s,async()=>{
      if(closed)fail('PRODUCT_CREDENTIAL_SERVICE_CLOSED');
      if(s.epoch!==epoch)fail('PRODUCT_CREDENTIAL_CHANGED');
      if(!s.bytes)fail('PRODUCT_USER_KEY_REQUIRED');
      if(!s.providers.has(kind)) {
        const ingress=async()=>{
          if(!s.bytes||s.epoch!==epoch)fail('PRODUCT_CREDENTIAL_CHANGED');
          return {credentialBytes:Buffer.from(s.bytes)};
        };
        const provider=await factory(ingress);
        s.providers.set(kind,provider);
      }
      return operation(s.providers.get(kind));
    });
  }
  async function restore(){
    if(closed)fail('PRODUCT_CREDENTIAL_SERVICE_CLOSED');
    if(!credentialStore)return;
    for(const seat of ['player1','player2']){
      const s=slot(seat);
      await enqueue(s,async()=>{
        if(s.bytes)return;
        try{s.bytes=await credentialStore.read(seat);s.persisted=Boolean(s.bytes);s.savedCredentialError=null;}
        catch{s.bytes=null;s.persisted=false;s.savedCredentialError='PRODUCT_SAVED_CREDENTIAL_UNREADABLE';}
      });
    }
  }
  return {status,replace,use,restore,async close(){
    closed=true;
    for(const s of slots.values()) {++s.epoch;await enqueue(s,()=>clear(s));}
  }};
}
