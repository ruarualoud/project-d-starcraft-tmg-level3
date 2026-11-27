import {createHash, randomBytes, randomUUID} from 'node:crypto';
import {mkdir, readFile, writeFile, rename} from 'node:fs/promises';
import path from 'node:path';

const hash = value => createHash('sha256').update(value).digest('hex');
const token = () => randomBytes(32).toString('base64url');
const reply = (status, response, headers) => ({status, response, headers});
const error = (status, reason) => reply(status, {ok:false, reason});
const cookieName = 'sc_roster_seat';

export function createHumanRosterLobby({directory, prefix, setupFor, compile, start, enter, findRoom}) {
  const base = prefix+'/lineups';
  const locks = new Map();
  const file = id => path.join(directory, id+'.json');
  async function save(state) {
    const target = file(state.id), temp = target+'.'+randomUUID()+'.pending';
    await writeFile(temp, JSON.stringify(state), {mode:0o600});
    await rename(temp, target);
  }
  function sessionCookie(id, key, secure) {
    return {'set-cookie': cookieName+'='+key+'; Path='+base+'/'+id+'; HttpOnly; SameSite=Strict'+(secure?'; Secure':'')};
  }
  const cookieKey = headers => (headers.cookie||'').split(';').map(s=>s.trim())
    .find(s=>s.startsWith(cookieName+'='))?.slice(cookieName.length+1) || '';
  function projection(s, side) {
    return {id:s.id, setupId:s.setupId, side, ready:Boolean(s.roomId),
      submitted:Boolean(s[side]), otherSubmitted:Boolean(s[side==='player1'?'player2':'player1']),
      label:s[side]?.label || null, ...(side==='player1' && !s.guestKey ? {invite:s.invite}: {})};
  }
  async function act({method,pathname,headers={},body={}}) {
    if(pathname!==base && !pathname.startsWith(base+'/')) return null;
    const from=headers.origin;
    if(method==='POST' && from && new URL(from).host!==headers.host) return error(403,'ORIGIN_MISMATCH');
    const secure=Boolean(from?.startsWith('https://'));
    if(pathname===base && method==='POST'){
      const binding=setupFor(body.setupId);
      if(!binding) return error(422,'PRODUCT_SETUP_UNKNOWN');
      const id=randomUUID(), host=token();
      const state={id, setupId:binding.id, version:binding.version, sourceHash:binding.sourceHash,
        hostKey:hash(host), invite:token(), guestKey:null, player1:null, player2:null,roomId:null};
      await mkdir(directory,{recursive:true,mode:0o700});
      await save(state);
      return reply(201,{ok:true,lineup:projection(state,'player1')},sessionCookie(id,host,secure));
    }
    const [id,op,...rest]=pathname.slice(base.length+1).split('/');
    if(!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id)||rest.length) return error(404,'LINEUP_UNKNOWN');
    // The single room host serializes each lineup, including simultaneous final submissions.
    const previous=locks.get(id) || Promise.resolve();
    const job=previous.catch(()=>{}).then(async()=>{
      let s;
      try{s=JSON.parse(await readFile(file(id),'utf8'));}catch(e){if(e.code==='ENOENT')return error(404,'LINEUP_UNKNOWN');throw e;}
      const identity=hash(cookieKey(headers)),side=identity===s.hostKey?'player1':identity===s.guestKey?'player2':null;
      if(op==='join' && method==='POST'){
        if(side==='player2') return reply(200,{ok:true,lineup:projection(s,side)});
        if(side || !s.invite || typeof body.invite!=='string' || s.invite!==body.invite) return error(403,'INVITATION_INVALID_OR_USED');
        const key=token();s.guestKey=hash(key);s.invite=null;await save(s);
        return reply(200,{ok:true,lineup:projection(s,'player2')},sessionCookie(id,key,secure));
      }
      if(!side) return error(401,'LINEUP_SEAT_REQUIRED');
      if(!s.roomId && s.player1 && s.player2) {
        s.roomId=await findRoom(s.id);
        if(s.roomId) await save(s);
      }
      if(!op && method==='GET') return reply(200,{ok:true,lineup:projection(s,side)});
      if(op==='enter' && method==='POST' && s.roomId) return reply(200,{ok:true,joinUrl:await enter(s.roomId,side)});
      if(op!=='submit'||method!=='POST') return error(409,'LINEUP_OPERATION_UNAVAILABLE');
      if(Object.keys(body).some(k=>!['army','preset'].includes(k)) || Boolean(body.army)===Boolean(body.preset)) return error(422,'SUBMIT_ONE_OWN_ROSTER');
      if(s.roomId) return reply(200,{ok:true,lineup:projection(s,side)});
      const binding=setupFor(s.setupId);
      if(!binding || binding.version!==s.version || binding.sourceHash!==s.sourceHash) return error(409,'LINEUP_RELEASE_CHANGED');
      const recipe=await compile(s.setupId,side,body);
      s[side]={recipe,label:String(body.army?.name || body.preset).slice(0,120)};
      if(s.player1 && s.player2){
        // Save both seats before opening; a retry recovers the room through its lineup ID.
        await save(s);
        const room=await start(s);
        s.roomId=room.roomId;
      }
      await save(s);
      return reply(200,{ok:true,lineup:projection(s,side)});
    });
    locks.set(id,job);
    try{return await job;}finally{if(locks.get(id)===job)locks.delete(id);}
  }
  return act;
}
