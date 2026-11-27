import {createHash} from 'node:crypto';
const EVENTS=new Set(['request_error','response_error','response_aborted','response_close_before_end','request_create_error','request_write_error','total_deadline','socket_inactivity','caller_abort']);
const CODES=new Set(['ECONNRESET','ECONNREFUSED','ETIMEDOUT','EPIPE','ENETUNREACH','EHOSTUNREACH','ENOTFOUND','EAI_AGAIN','ECONNABORTED','ABORT_ERR','ERR_STREAM_PREMATURE_CLOSE','ERR_STREAM_DESTROYED','ERR_SOCKET_CLOSED','ERR_SSL_SSLV3_ALERT_BAD_RECORD_MAC','ERR_TLS_CERT_ALTNAME_INVALID','CERT_HAS_EXPIRED','UNABLE_TO_VERIFY_LEAF_SIGNATURE','UNCLASSIFIED_NETWORK_ERROR']);
const FIELDS=['event','networkErrorCode','causeCodes','declaredResponseBytes','httpMessageComplete','responseAborted','socketDestroyed','socketBytesRead','socketBytesWritten','configuredTimeoutMs','idleSinceLastBodyByteMs','providerRequestIdHash'];
const number=v=>Number.isSafeInteger(v)&&v>=0?v:null;
const code=v=>v===undefined||v===null?null:CODES.has(v)?v:'UNCLASSIFIED_NETWORK_ERROR';
export function assertProviderTransportDiagnosticsV1(v){
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==FIELDS.length||Object.keys(v).some(k=>!FIELDS.includes(k)))throw new TypeError('Invalid transport diagnostic fields');
 if(v.event!==null&&!EVENTS.has(v.event)||v.networkErrorCode!==null&&!CODES.has(v.networkErrorCode)||!Array.isArray(v.causeCodes)||v.causeCodes.length>3||v.causeCodes.some(c=>!CODES.has(c)))throw new TypeError('Invalid transport diagnostic event/code');
 for(const k of ['declaredResponseBytes','socketBytesRead','socketBytesWritten','configuredTimeoutMs','idleSinceLastBodyByteMs'])if(v[k]!==null&&number(v[k])===null)throw new TypeError('Invalid transport diagnostic numeric field');
 for(const k of ['httpMessageComplete','responseAborted','socketDestroyed'])if(v[k]!==null&&typeof v[k]!=='boolean')throw new TypeError('Invalid transport diagnostic boolean');
 if(v.providerRequestIdHash!==null&&!/^[a-f0-9]{64}$/.test(v.providerRequestIdHash))throw new TypeError('Invalid transport request id hash');
 return structuredClone(v);
}
export function createProviderTransportDiagnosticsV1({elapsedMs,timeoutMs}){
 let response=null,socket=null,event=null,networkErrorCode=null,causeCodes=[];
 const body={receivedBytes:0,nonWhitespaceBytes:0,chunkCount:0,firstByteMs:null,lastByteMs:null,lastNonWhitespaceByteMs:null};
 return {
  response:v=>{response=v;},socket:v=>{socket=v;},
  note:(e,error)=>{event=e;networkErrorCode=code(error?.code);causeCodes=[];let cause=error?.cause;for(let i=0;cause&&i<3;i++,cause=cause.cause){const c=code(cause.code);if(c)causeCodes.push(c);}},
  data:buffer=>{if(!buffer.length)return;const at=elapsedMs();body.receivedBytes+=buffer.length;body.chunkCount++;body.firstByteMs??=at;body.lastByteMs=at;let n=0;for(const b of buffer)if(b!==32&&b!==9&&b!==10&&b!==13)n++;body.nonWhitespaceBytes+=n;if(n)body.lastNonWhitespaceByteMs=at;},
  snapshot:()=>{
   const rawLength=response?.headers?.['content-length'];const declared=typeof rawLength==='string'&&/^\d+$/.test(rawLength)?number(Number(rawLength)):null;
   const requestId=response?.headers?.['x-request-id'];
   return {responseBody:{...body},diagnostics:assertProviderTransportDiagnosticsV1({event,networkErrorCode,causeCodes,
    declaredResponseBytes:declared,httpMessageComplete:typeof response?.complete==='boolean'?response.complete:null,
    responseAborted:typeof response?.aborted==='boolean'?response.aborted:null,socketDestroyed:typeof socket?.destroyed==='boolean'?socket.destroyed:null,
    socketBytesRead:number(socket?.bytesRead),socketBytesWritten:number(socket?.bytesWritten),configuredTimeoutMs:number(timeoutMs),
    idleSinceLastBodyByteMs:body.lastByteMs===null?null:Math.max(0,elapsedMs()-body.lastByteMs),
    providerRequestIdHash:typeof requestId==='string'&&requestId.length<=512?createHash('sha256').update(requestId).digest('hex'):null})};
  }
 };
}
