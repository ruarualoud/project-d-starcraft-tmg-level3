// Missing JSON addresses describe navigation, never unavailable game abilities.
// Suggest exact addresses in the SAME immutable source; never retarget a read.
import {parseRosterTeachEvidencePathV1} from './roster-teach-typed-evidence-v1.mjs';
import {createRosterWorkflowGraphV1} from './roster-workflow-graph-v1.mjs';
const object=v=>v!==null&&typeof v==='object';
const pointer=keys=>keys.map(k=>'/'+String(k).replaceAll('~','~0').replaceAll('/','~1')).join('');
export function projectRosterEvidencePathNavigationV1(body,requestedPointer){
  if(typeof requestedPointer!=='string'||!requestedPointer.startsWith('/'))return null;
  const parsed=parseRosterTeachEvidencePathV1(requestedPointer);
  if(!parsed||!parsed.keys.length)return null;
  let node=body,index=0,parent=null,parentKeys=[];
  while(index<parsed.keys.length&&object(node)&&Object.hasOwn(node,parsed.keys[index])){
    parent=node;parentKeys=parsed.keys.slice(0,index);node=node[parsed.keys[index++]];
  }
  if(index===parsed.keys.length)return null;
  const prefix=parsed.keys.slice(0,index),suffix=parsed.keys.slice(index),candidatePointers=[];
  // A real null/scalar is still a successful path prefix. Search only its
  // nearest containing object for sibling result envelopes; never treat null
  // as zero, replace the selected address or grant a read of a suggestion.
  const searchRoot=object(node)?node:parent,searchKeys=object(node)?prefix:parentKeys;
  const queue=[{node:searchRoot,keys:searchKeys,depth:0}];let visited=0,searchTruncated=false;
  // A local bounded address search, not a scan through the workflow/history.
  for(let cursor=0;cursor<queue.length;cursor++){
    if(visited++>=256){searchTruncated=true;break;}
    const current=queue[cursor];let value=current.node,found=true;
    for(const key of suffix){if(!object(value)||!Object.hasOwn(value,key)){found=false;break;}value=value[key];}
    if(found)candidatePointers.push(pointer([...current.keys,...suffix]));
    if(!object(current.node))continue;
    if(current.depth>=3){if(Object.values(current.node).some(object))searchTruncated=true;continue;}
    for(const [key,value] of Object.entries(current.node)){
      if(!object(value))continue;
      if(queue.length>=256){searchTruncated=true;break;}
      queue.push({node:value,keys:[...current.keys,key],depth:current.depth+1});
    }
  }
  const keys=object(node)?Object.keys(node):[];
  return {kind:'exact_source_path_navigation',version:1,nearestExistingPointer:pointer(prefix),
    searchRootPointer:pointer(searchKeys),searchRootKeys:object(searchRoot)?Object.keys(searchRoot).slice(0,64):[],
    availableKeys:keys.slice(0,64),availableKeysTruncated:keys.length>64,
    candidatePointers,searchTruncated,capabilityAbsenceProven:false,bodyRead:false,
    instruction:'Only the requested JSON address is missing. This is NOT evidence that a tool, rule, or capability is absent. Candidate pointers exist in this SAME source, but are navigation only, not completed reads or permission to execute. Explicitly read the relevant path before drawing a capability conclusion; zero suggestions is not proof of absence. Existing execution and experiment-scope restrictions remain unchanged.'};
}

// Deliver a retained failed read to its current consumer/direct result owner.
// Use declared input identity and result refs, not ID prefixes or prose search.
export async function projectRosterEvidenceReadNavigationV1({assignment,state,readArtifact}){
  const work=state.work.find(w=>w.id===(assignment.workId??assignment.id));if(!work)return null;
  const owners=new Map([[work.id,work]]),evidenceById=new Map(state.evidence.map((e,i)=>[e.id,{...e,number:i+1}]));
  // Published role evidence is a projection of result.value, not resultRef.
  // The persisted graph carries the authoritative producer/owner relation.
  for(const parent of createRosterWorkflowGraphV1(state).parents(work.id))owners.set(parent.id,parent);
  for(const input of Object.values(work.inputs??{})){
    if(input.source==='work'){
      const parent=state.work.find(w=>w.id===input.id);if(parent)owners.set(parent.id,parent);
    }else if(input.source==='evidence'){
      const source=evidenceById.get(input.id);
      if(source)for(const parent of state.work)if(parent.resultRef===source.artifactRef)owners.set(parent.id,parent);
    }
  }
  const cache=new Map(),read=ref=>{if(!cache.has(ref))cache.set(ref,readArtifact(ref));return cache.get(ref);};
  const entries=[];
  for(const owner of owners.values())for(const row of owner.operationState?.reads??[]){
    const result=await read(row.resultRef);
    if(result.status!=='path_missing'||result.reason!=='exact_path_not_found')continue;
    const source=evidenceById.get(row.evidenceId);if(!source)continue;
    const navigation=projectRosterEvidencePathNavigationV1(await read(source.artifactRef),row.pointer);
    if(!navigation)continue;
    entries.push({sourceWorkId:owner.id,originalReadResultRef:row.resultRef,evidenceId:source.id,
      evidenceNumber:source.number,pointer:row.pointer,status:result.status,navigation});
  }
  return entries.length?{version:1,entries,originalReadsUnchanged:true,conclusionAccepted:false,
    instruction:'These diagnostics concern only actual saved failed reads of this task or its directly assigned result producers. Keep their original failure records. A path_missing premise cannot establish capability_unavailable. Reassess that premise using exact source navigation; no Native observation, Plan approval or scope expansion is supplied.'}:null;
}
