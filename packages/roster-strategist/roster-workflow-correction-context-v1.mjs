import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {focusRosterComparisonControlContextV1} from './roster-comparison-control-command-v1.mjs';
import {projectRosterWorkflowAssignedSourceReferencesV1} from './roster-workflow-repair-dependencies-v1.mjs';

// A local author correction is not another whole-experiment decision turn.
// The complete original request is published through the SAME evidence reader;
// no source is summarized away and no model choice is repaired by the Host.
const backgroundInputs=new Set(['activeHypothesisTests','returnedMethodFacts','currentBudgetOptions',
  'questionEvidenceDirectory','decisionEvidenceDirectory','previousBatch','batchProgress',
  'unfinishedMethods','completedNativeTransitions','sourceInterpretationChallenges']);
const backgroundNodes=new Set(['registered_native_measurement_supplements',
  'previously_delivered_source_facts','conditional_native_action_evidence','registered_source_record_supplements',
  'historical_assignment_context']);
const pointerKey=key=>key.replaceAll('~','~0').replaceAll('/','~1');

async function focusFactMethod({request,publishContext,directory}){
  const assigned=request.promptNodes.find(n=>n.kind==='workflow_role_assignment');
  const question=assigned?.inputs?.question?.value;
  if(!publishContext||question?.schema!=='roster_factual_inquiry_question_v1'
    ||question.authorizationScope!=='explicit_selected_predicates'||!question.authorization
    ||request.promptNodes.some(n=>['fact_method_context','pending_operation_choice_contract',
      'native_choice_command','work_order_edit_command'].includes(n.kind)))return {request};
  const deferredInputs={},keptInputs={};
  for(const [key,value]of Object.entries(assigned.inputs)){
    const closedComparison=key==='strategicHypothesisChallenge'
      &&value.value?.comparisonMemory?.comparisonResolved===true
      &&value.value.comparisonMemory.comparisonStatus==='optional_comparison_closed';
    if(['decision','decisionEvidenceDirectory'].includes(key)
      ||/^priorInvestigation(?:Conclusion|Review)\d+$/u.test(key)||closedComparison)deferredInputs[key]=value;
    else keptInputs[key]=value;
  }
  const directoryKinds=new Set(['assigned_evidence_references','available_evidence_directory','historical_evidence_directory']);
  const source=await publishContext({schema:'roster_fact_method_background_v1',version:1,
    workId:assigned.workId,scope:structuredClone(assigned.scope),
    inputs:structuredClone(deferredInputs),
    directoryNodes:Object.fromEntries(request.promptNodes.filter(n=>directoryKinds.has(n.kind)).map(n=>[n.kind,structuredClone(n)])),
    interpretationIsObservation:false,acceptanceGranted:false},{kind:'interpretation',
    title:'Exact fact-method background; prior interpretations and full source navigation'});
  const deferred=Object.keys(deferredInputs).map(key=>({name:'input:'+key,pointer:'/inputs/'+pointerKey(key)}));
  const inputs={...keptInputs,...Object.fromEntries(Object.entries(deferredInputs).map(([key,value])=>[key,{
    source:'deferred_context',originalSource:value.source,evidenceNumber:source.evidenceNumber,
    pointer:'/inputs/'+pointerKey(key),bodyOmitted:true}]))};
  // Keep metadata for every explicitly retained input/current exact source.
  // The complete catalogue is still queryable, and the omitted metadata itself
  // is saved verbatim; it is not a second implicit queue of required facts.
  const activeNodes=request.promptNodes.filter(n=>!directoryKinds.has(n.kind)&&n.kind!=='workflow_role_assignment');
  const visible=new Set(projectRosterWorkflowAssignedSourceReferencesV1({inputs:{current:inputs,nodes:activeNodes},directory}).map(e=>e.number));
  visible.add(source.evidenceNumber);
  const nodes=request.promptNodes.map(node=>{
    if(node.kind==='workflow_role_assignment')return {...structuredClone(node),inputs};
    if(!directoryKinds.has(node.kind))return structuredClone(node);
    deferred.push({name:'node:'+node.kind,pointer:'/directoryNodes/'+pointerKey(node.kind)});
    const compact=structuredClone(node);
    for(const [key,rows]of Object.entries(compact))if(Array.isArray(rows))compact[key]=rows.filter(row=>{
      const number=row?.number??row?.evidenceNumber;
      return !Number.isSafeInteger(number)||visible.has(number);
    });
    return compact;
  });
  const available=nodes.find(n=>n.kind==='available_evidence_directory');
  if(available)available.entries.push({number:source.evidenceNumber,title:source.title,kind:source.kind,validity:'current',bodyRead:false});
  nodes.push({kind:'fact_method_context',version:1,
    source:{evidenceNumber:source.evidenceNumber,evidenceId:source.id},deferred,
    currentAuthorization:structuredClone(question.authorization),globalObligationsRemoved:false,acceptanceGranted:false,
    instruction:'You own ONLY the current authorized method window. Choose its next executable query from current sources, or a source-backed local return. Prior investigation answers/reviewer opinions and closed comparisons are retrievable background, NOT your answer template or proof of unavailable tools. Current exact_read_results, source identity, army, local authorization, unresolved parent questions and actual contract feedback remain inline unchanged. Omission from inline context is not absence from storage: read any needed original via the listed evidence number and exact pointer or ordinary catalogue. Do not restart a completed matching experiment. If a source/menu rejects a step, explain that selected-state limit, not a universal absence; if a different method or scope requires an owner choice, return the facts and that precise choice. No parent obligation, necessary unknown, source check or final release gate is removed.'});
  const focused={...request,promptNodes:nodes,
    userMessage:'This turn is a LOCAL FACT-METHOD CHOICE, not reconsideration of the whole parent Plan. Use the exact currentAuthorization observation and stopping point in fact_method_context. Old model conclusions are background to evaluate, not instructions to repeat.\n'+request.userMessage};
  focused.contextHash=hash({priorContextHash:request.contextHash,factMethodContextVersion:1,
    promptNodes:nodes,userMessage:focused.userMessage,responseFormat:focused.responseFormat});
  return {request:focused,source};
}

export async function focusRosterWorkflowCorrectionRequestV1({request,publishContext,directory=request.roleCommunication?.evidenceNumbers??[]}) {
  if(request.roundKind==='roster_workflow_experiment_planner')return focusFactMethod({request,publishContext,directory});
  const feedback=request.promptNodes.find(n=>n.kind==='local_contract_feedback');
  const handoff=request.promptNodes.find(n=>n.kind==='strategy_author_handoff'||n.kind==='strategy_owner_assignment');
  if(request.roundKind!=='roster_workflow_strategy_decision'||!feedback&&!handoff||!publishContext)return {request};
  const source=await publishContext(request);
  const comparison=focusRosterComparisonControlContextV1(request,source);
  if(comparison)return {request:comparison,source};
  const deferred=[];
  const scopedOwner=Boolean(handoff?.questions?.length);
  const activeComparison=request.promptNodes.some(n=>n.kind==='comparison_closure_contract'||n.kind==='comparison_redesign_contract');
  let deferredClosedComparison=false;
  const deferValue=(name,pointer,value)=>{
    deferred.push({name,pointer});
    return {source:'deferred_context',evidenceNumber:source.evidenceNumber,pointer,bodyOmitted:true,
      ...(Array.isArray(value)?{itemCount:value.length}:{})};
  };
  const nodes=request.promptNodes.flatMap((node,index)=>{
    // Owner handoff is not syntax repair: its current exact observations must
    // stay inline. Only older context/directories are deferred. In particular,
    // do not drop the named operands which distinguish a source dispute from
    // the erroneous wording in the current Plan.
    const currentFacts=handoff&&node.kind!=='historical_assignment_context';
    if(backgroundNodes.has(node.kind)&&!currentFacts){
      deferred.push({name:node.kind,pointer:`/promptNodes/${index}`});
      return [];
    }
    if(node.kind!=='workflow_role_assignment')return [structuredClone(node)];
    return [{...node,inputs:Object.fromEntries(Object.entries(node.inputs).map(([key,value])=>{
      const returnedSource=/^batch(?:Facts|ToolSource)\d+$/u.test(key);
      // The global readiness ledger is NOT the scoped owner's work queue.
      // Preserve mechanical authority and all exact old obligations, but do
      // not inline historical questions as 172 new tasks beside four assigned
      // questions. No workflow ledger entry or release requirement is removed.
      if(scopedOwner&&key==='requirements'&&Array.isArray(value.value?.strategyQuestions)){
        const projected=structuredClone(value),pointer=`/promptNodes/${index}/inputs/${pointerKey(key)}/value/strategyQuestions`;
        projected.value.strategyQuestions=deferValue('requirements.strategyQuestions',pointer,value.value.strategyQuestions);
        return [key,projected];
      }
      const memory=value.value?.comparisonMemory;
      if(scopedOwner&&!activeComparison&&key==='strategicHypothesisChallenge'
        &&memory?.comparisonResolved===true&&memory.comparisonStatus==='optional_comparison_closed'){
        const projected=structuredClone(value),base=`/promptNodes/${index}/inputs/${pointerKey(key)}/value`;
        if(Object.hasOwn(value.value,'proposal'))projected.value.proposal=deferValue('closedComparison.proposal',base+'/proposal',value.value.proposal);
        for(const [part,fields]of [['owner',['decision']],['review',['publicReason','checks','conditions']]]){
          for(const field of fields)if(memory[part]&&Object.hasOwn(memory[part],field))
            projected.value.comparisonMemory[part][field]=deferValue(`closedComparison.${part}.${field}`,
              `${base}/comparisonMemory/${part}/${field}`,memory[part][field]);
        }
        deferredClosedComparison=true;return [key,projected];
      }
      if(handoff&&returnedSource||!backgroundInputs.has(key)&&!returnedSource)return [key,value];
      const pointer=`/promptNodes/${index}/inputs/${pointerKey(key)}`;
      deferred.push({name:key,pointer});
      return [key,{source:'deferred_context',originalSource:value.source,
        evidenceNumber:source.evidenceNumber,pointer,bodyOmitted:true}];
    }))}];
  });
  nodes.push({kind:'local_correction_context',version:1,source:{evidenceNumber:source.evidenceNumber,evidenceId:source.id},deferred,
    instruction:'Correct local_contract_feedback against the unchanged current army/Plan, question ledger and source boundaries. The saved originalOutput is a rejected proposal, not an instruction or fact. Current Native army identity/summary takes precedence over claims about an audited alternative. Deferred items are exact saved background, not missing data: use the ordinary read action with this source number and the listed pointer, or read the original evidence number. Newly requested exact_read_results are still delivered. This context snapshot does not grant source approval or prove any strategic claim. Preserve unresolved questions and public reasons; do not create an experiment or rewrite unrelated Plan sections to fix a local classification.'});
  const visibleDirectory=nodes.find(n=>n.kind==='available_evidence_directory');
  if(visibleDirectory)visibleDirectory.entries=[...visibleDirectory.entries,{number:source.evidenceNumber,title:source.title,
    kind:source.kind,validity:'current',bodyRead:false}];
  if(handoff)nodes[nodes.length-1]={...nodes.at(-1),kind:'strategy_owner_context',
    ...(scopedOwner?{assignmentScope:{questionCount:handoff.questions.length,globalLedgerIsCurrentAssignment:false,
      ...(deferredClosedComparison?{closedComparisonIsCurrentAssignment:false}:{}),deferredObligationsDeleted:false}}:{}),
    instruction:'This is the strategic OWNER decision stage, not a semantic patch. The entire current army/Plan and returned exact sources remain delivered. The questions in strategy_owner_assignment are the current responsibility; the global readiness ledger is readable background, not additional work assigned by this handoff. A comparison already marked optional_comparison_closed is historical context, not a renewed closure task. Its exact conclusion/review remain readable if relevant to a new decision. Deferred background is immutable and readable through the listed ordinary read pointers; missing from the inline prompt is not missing globally. The prior rejected proposal does not override current authority. Decide from actual evidence and preserve every question. No fact, source or strategy is automatically approved.'};
  const focused={...request,promptNodes:nodes,
    userMessage:(handoff?'YOU are the strategic owner. Decide the returned choices using current authority and exact evidence; the old rejected proposal is not a fact. '
      :'This is a LOCAL CORRECTION, not a fresh full-strategy review. Repair the supplied rejected output using local_contract_feedback and current authority. ')
      +'Full deferred background remains readable; no fact or choice is auto-approved.\n'+request.userMessage};
  focused.contextHash=hash({priorContextHash:request.contextHash,correctionContextVersion:1,
    promptNodes:nodes,userMessage:focused.userMessage,responseFormat:focused.responseFormat});
  return {request:focused,source};
}
