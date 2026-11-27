const response=(body,status=200)=>({status,response:body});
// Authorization is the product Host's responsibility. No anonymous fallback,
// local-path parameter, Provider credential or hidden evaluation body is exposed.
export function createPostgameLearningHttpV1({product,definitions,authorize,onError=()=>{}}) {
  if(!product||!definitions?.list||typeof authorize!=='function')throw Error('LEARNING_HTTP_PORTS_REQUIRED');
  const jobs=new Map();
  return {async handle(request) {
    const prefix='/starcraft-tmg-level3/product/v1/learning';
    if(request.pathname!==prefix&&!request.pathname.startsWith(prefix+'/'))return null;
    if(!await authorize(request))return response({ok:false,reason:'learning_not_authorized'},403);
    try {
      if(request.method==='GET'&&request.pathname===prefix)
        return response({ok:true,definitions:await definitions.list(),routes:['RW','RS','RMV','RH']});
      if(request.method==='POST'&&request.pathname===prefix) {
        const {id,definitionId,route}=request.body||{};
        const r=await product.start({id,definitionId,route});return response({ok:true,run:product.status(r)},201);
      }
      const path=request.pathname.slice(prefix.length+1).split('/');
      const id=decodeURIComponent(path[0]);
      if(path.length===1&&request.method==='GET')return response({ok:true,run:product.status(await product.read(id)),active:jobs.has(id)});
      if(path.length===2&&['step','run'].includes(path[1])&&request.method==='POST') {
        if(!jobs.has(id)) {
          // Validate before acknowledging the work, and let status polling see
          // long Native/model work without an open browser request timeout.
          await product.read(id);
          const control={stop:false};
          const job=(async()=>{
            do {
              const r=await product.advance(id);
              if(path[1]==='step'||r.status!=='running')break;
            }while(!control.stop);
          })().catch(async error=>{
            if(error.code!=='LEARNING_RUN_ALREADY_ACTIVE'){await product.recordError(id,error);await onError({id,code:error.code||error.message});}})
            .finally(()=>jobs.delete(id));jobs.set(id,job);
          job.control=control;
          // An error while persisting the stop (e.g. full disk) must also be
          // observed; it must not become an unhandled background rejection.
          void job.catch(error=>onError({id,code:error.code||error.message})).catch(()=>{});
        }
        return response({ok:true,id,status:'accepted'},202);
      }
      if(path.length===2&&path[1]==='pause'&&request.method==='POST') {
        const job=jobs.get(id);if(job)job.control.stop=true;
        return response({ok:true,id,status:job?'pausing_at_boundary':'not_running'},202);
      }
      if(path.length===2&&path[1]==='revise-wiki'&&request.method==='POST')
        return response({ok:true,run:product.status(await product.reviseWikiCandidate({id,reviewId:request.body?.reviewId}))});
      if(path.length===2&&path[1]==='resume'&&request.method==='POST')
        return response({ok:true,run:product.status(await product.resume(id))});
      if(path.length===2&&path[1]==='rollback'&&request.method==='POST')
        return response({ok:true,run:product.status(await product.rollback({id,round:request.body?.round,reason:request.body?.reason}))});
      return response({ok:false,reason:'learning_route_not_found'},404);
    }catch(error){return response({ok:false,reason:error.code||error.message},409);}
  },async close(){for(const job of jobs.values())job.control.stop=true;await Promise.allSettled([...jobs.values()]);}};
}
