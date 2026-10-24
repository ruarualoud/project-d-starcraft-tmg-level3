// Lossless semantic blocks, not a shortened Plan. Top-level sections and each
// named array member remain independently retrievable. An index can reconstruct
// the complete original object; local roles do not fetch 120KB by default.
export function splitRosterWorkflowPlanBlocksV1(plan,prefix='plan') {
  const blocks=[],structure={};
  const pointer=key=>'/'+String(key).replaceAll('~','~0').replaceAll('/','~1');
  for(const [key,value] of Object.entries(plan)){
    if(Array.isArray(value)){
      structure[key]=value.map((row,index)=>{
        const id=`${prefix}:${key}:${index}`,label=row?.instanceId||row?.hypothesisId||row?.responseId||row?.triggerId||index;
        blocks.push({id,title:`Plan /${key}/${index} (${label}); proposed strategy, not verified Rules truth`,pointer:pointer(key)+pointer(index),value:structuredClone(row)});
        return {evidenceId:id};
      });
    }else if(value&&typeof value==='object'||key==='publicSummaryText'){
      const id=`${prefix}:${key}`;
      blocks.push({id,title:`Plan /${key}; proposed strategy, not verified Rules truth`,pointer:pointer(key),value:structuredClone(value)});
      structure[key]={evidenceId:id};
    }else structure[key]={literal:structuredClone(value)};
  }
  return {structure,blocks};
}
export async function publishRosterWorkflowPlanBlocksV1(workflow,{plan,bindings,prefix='plan'}) {
  const split=splitRosterWorkflowPlanBlocksV1(plan,prefix);
  const entries=split.blocks.map(block=>({id:block.id,title:block.title,
    kind:'proposal',bindings,conditions:[`Exact original Plan section ${block.pointer}; model proposal, not a replacement for source tool receipts`],value:block.value}));
  entries.push({id:`${prefix}:structure`,title:'Complete Plan structure and exact block references; all sections remain available',
    kind:'proposal',bindings,conditions:['Structural index only; not evidence of strategy validity'],value:split.structure});
  await workflow.dispatch({type:'publish_evidence_batch',entries});
  return split;
}
// The exact CURRENT proposal is the subject of Teach, not Rules evidence.
// A draft summary carries roster/completeness metadata, not its Plan text.
export function projectRosterWorkflowTeachSubjectV1({draftEvidenceId,directory}){
  if(!/^draft:r\d+:summary$/u.test(draftEvidenceId??''))return null;
  const prefix=draftEvidenceId.replace(/:summary$/u,':plan:');
  const entries=directory.filter(e=>e.id.startsWith(prefix));
  if(!entries.length)return null;
  return {kind:'current_plan_teach_subject',version:1,draftEvidenceId,
    blocks:entries.filter(e=>e.id!==prefix+'structure').map(e=>({evidenceNumber:e.number,
      claimPath:'/'+e.id.slice(prefix.length).split(':').join('/'),readPointer:'',title:e.title})),
    structureEvidenceNumber:entries.find(e=>e.id===prefix+'structure')?.number??null,
    instruction:'These are the exact current Plan sections being reviewed, NOT Rules truth. A draft summary or earlier Teach does not contain these bodies. Read the sections your claimPaths judge before retaining/challenging them or asserting they are absent. If a finish proposal names unread subjects, the product retrieves them and returns your proposal for author confirmation; retrieval alone never accepts it. Read relevant Rules/measurement sources separately.'};
}
export function rosterWorkflowUnreadTeachSubjectsV1({subject,proposals,isRead}){
  if(!subject)return [];
  const missing=new Map();
  for(const proposal of proposals)for(const raw of proposal.claimPaths??[]){
    const path='/'+raw.replace(/^\/?plan[./]/u,'').replace(/^\//u,'').replace(/\./gu,'/');
    const blocks=subject.blocks.filter(b=>path===b.claimPath||path.startsWith(b.claimPath+'/')||b.claimPath.startsWith(path+'/'));
    // Empty array sections have no member blocks; their exact structure records
    // the empty value. It is not a substitute for existing nonempty bodies.
    const targets=blocks.length?blocks:[{evidenceNumber:subject.structureEvidenceNumber,claimPath:path}];
    for(const block of targets){
      if(!block.evidenceNumber)continue;
      const pointer=path.startsWith(block.claimPath+'/')?path.slice(block.claimPath.length):'';
      if(isRead(block.evidenceNumber,pointer))continue;
      const key=JSON.stringify([block.evidenceNumber,pointer]);
      missing.set(key,{code:'evidence_not_read',number:block.evidenceNumber,requiredPointer:pointer,
        reason:'current_plan_teach_subject_not_delivered',claimPath:path,
        instruction:'Review the exact current Plan text, not an assumed/earlier Plan or roster summary. This source is the subject being judged, not Rules authority. Confirm or revise the proposed Teach after its actual delivery.'});
    }
  }
  return [...missing.values()];
}
