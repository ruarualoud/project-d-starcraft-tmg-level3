// Product keys are ephemeral, scoped to the authenticated room seat. Provider
// instances never fall back to a machine credential. A rotation lets the one
// already-started request finish, then closes its workers before using new bytes.
const fail = code => { throw Object.assign(new Error(code), {code}); };
export function createProductRoomCredentialsV1() {
  const slots = new Map();
  let closed = false;
  function slot(seat) {
    if (!['player1','player2'].includes(seat)) fail('PRODUCT_PLAYER_SEAT_REQUIRED');
    if (!slots.has(seat)) slots.set(seat, {bytes:null, epoch:0, changing:false,
      queue:Promise.resolve(), providers:new Map()});
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
      persisted:false,requiresReentryAfterServerRestart:true,
      inFlightRequestMayFinish:true};
  }
  async function replace(seat, apiKey=null) {
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
        await clear(s);
        if(closed||s.epoch!==epoch)fail('PRODUCT_CREDENTIAL_CHANGED');
        s.bytes=bytes;bytes=null;s.changing=false;
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
  return {status,replace,use,async close(){
    closed=true;
    for(const s of slots.values()) {++s.epoch;await enqueue(s,()=>clear(s));}
  }};
}
