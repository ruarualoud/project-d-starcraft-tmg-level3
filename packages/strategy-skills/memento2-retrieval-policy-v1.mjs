// Memento2 v3 Eq.7/12/13, implemented for an explicitly scoped research retriever.
// No Rules, LLM-authored rewards or game dice are consumed here.
export const MEMENTO2_VOID_CASE_V1='__no_retrieval__';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c})};
const finite=(v,c)=>{need(Number.isFinite(v),c);return v};
function logSumExp(values){const max=Math.max(...values);need(Number.isFinite(max),'MEMENTO2_NO_FINITE_MASS');return max+Math.log(values.reduce((s,v)=>s+Math.exp(v-max),0))}
export function memento2ParzenPriorV1(query,cases,{bandwidth,voidKernel}={}){
 need(Array.isArray(query)&&query.length>0&&query.every(Number.isFinite),'MEMENTO2_FEATURES_INVALID');need(Number.isFinite(bandwidth)&&bandwidth>0&&Number.isFinite(voidKernel)&&voidKernel>0,'MEMENTO2_KERNEL_INVALID');
 const seen=new Set([MEMENTO2_VOID_CASE_V1]);const rows=cases.map(c=>{need(typeof c.id==='string'&&c.id&&!seen.has(c.id),'MEMENTO2_CASE_ID_INVALID');seen.add(c.id);need(Array.isArray(c.features)&&c.features.length===query.length&&c.features.every(Number.isFinite),'MEMENTO2_FEATURE_DIMENSION_MISMATCH');const distance=query.reduce((s,v,i)=>s+((v-c.features[i])/bandwidth)**2,0);return {id:c.id,logKernel:distance===0?0:-0.5*distance}});rows.push({id:MEMENTO2_VOID_CASE_V1,logKernel:Math.log(voidKernel)});const z=logSumExp(rows.map(r=>r.logKernel));return rows.map(r=>({...r,logPrior:r.logKernel-z,prior:Math.exp(r.logKernel-z)}));
}
export function memento2RetrievalPolicyV1(prior,q,{alpha}={}){
 need(Number.isFinite(alpha)&&alpha>0,'MEMENTO2_ALPHA_INVALID');need(prior.length>0&&prior.some(r=>r.id===MEMENTO2_VOID_CASE_V1),'MEMENTO2_VOID_REQUIRED');
 const rows=prior.map(r=>{const value=finite(q[r.id]??0,'MEMENTO2_Q_NONFINITE');const scaled=finite(value/alpha,'MEMENTO2_NUMERIC_OVERFLOW');return {...r,q:value,logWeight:r.logPrior+scaled}});const max=Math.max(...rows.map(r=>r.logWeight));need(Number.isFinite(max),'MEMENTO2_NO_FINITE_MASS');const weights=rows.map(r=>Math.exp(r.logWeight-max));const total=weights.reduce((s,v)=>s+v,0);const value=finite(alpha*(max+Math.log(total)),'MEMENTO2_VALUE_OVERFLOW');return {rows:rows.map((r,i)=>({...r,probability:weights[i]/total})),value};
}
export function memento2TdUpdateV1({prior,q,selectedId,reward,gamma,alpha,eta,terminal,nextPrior,nextQ={}}){
 need(prior.some(r=>r.id===selectedId),'MEMENTO2_SELECTED_CASE_MISSING');finite(reward,'MEMENTO2_REWARD_NONFINITE');need(Number.isFinite(gamma)&&gamma>=0&&gamma<1,'MEMENTO2_GAMMA_INVALID');need(Number.isFinite(eta)&&eta>0&&eta<=1,'MEMENTO2_ETA_INVALID');need(typeof terminal==='boolean','MEMENTO2_TERMINAL_REQUIRED');
 const before=finite(q[selectedId]??0,'MEMENTO2_Q_NONFINITE');const bootstrap=terminal?0:memento2RetrievalPolicyV1(nextPrior,nextQ,{alpha}).value;const target=finite(reward+gamma*bootstrap,'MEMENTO2_TARGET_NONFINITE');const delta=target-before;const after=finite(before+eta*delta,'MEMENTO2_UPDATE_NONFINITE');return {q:{...q,[selectedId]:after},selectedId,before,after,reward,bootstrap,target,delta,eta,terminal};
}
export function memento2RelaxPolicyV1(previous,target,eta){
 need(Number.isFinite(eta)&&eta>0&&eta<=1,'MEMENTO2_ETA_INVALID');const old=new Map(previous.map(r=>[r.id,r.probability]));need(old.size===target.rows.length&&target.rows.every(r=>old.has(r.id)),'MEMENTO2_POLICY_SUPPORT_CHANGED');need(previous.every(r=>Number.isFinite(r.probability)&&r.probability>=0)&&Math.abs(previous.reduce((s,r)=>s+r.probability,0)-1)<1e-10,'MEMENTO2_POLICY_NOT_NORMALIZED');return target.rows.map(r=>({...r,probability:old.get(r.id)+eta*(r.probability-old.get(r.id))}));
}
export function memento2SamplePolicyV1(rows,draw){need(Number.isFinite(draw)&&draw>=0&&draw<1,'MEMENTO2_RESEARCH_DRAW_INVALID');need(rows.length>0&&rows.every(r=>Number.isFinite(r.probability)&&r.probability>=0)&&Math.abs(rows.reduce((s,r)=>s+r.probability,0)-1)<1e-10,'MEMENTO2_POLICY_NOT_NORMALIZED');let cumulative=0;for(const r of rows){cumulative+=r.probability;if(draw<cumulative)return r.id}return rows.at(-1).id}
export function memento2LearningRatesV1(step,{etaExponent=0.6,rhoExponent=0.9}={}){need(Number.isSafeInteger(step)&&step>=0&&etaExponent>0.5&&etaExponent<=1&&rhoExponent>etaExponent&&rhoExponent<=1,'MEMENTO2_TIMESCALE_INVALID');return {eta:(step+1)**-etaExponent,rho:(step+1)**-rhoExponent}}
