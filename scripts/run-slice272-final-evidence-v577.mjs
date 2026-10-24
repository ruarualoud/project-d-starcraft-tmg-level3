// P5 client of the same product Run: separate fact owners, source reviews,
// then one joint strategy decision. It does not edit model outputs or Plans.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRosterPlanningProductModuleV1} from '../packages/product-composition/roster-planning-product-module-v1.mjs';
import {createRosterPlanningSecureDeliberationFactoryV1,projectRosterProviderInstructionsV1} from '../packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs';
import {encodeRosterProviderInputV1} from '../packages/roster-strategist/roster-prompt-evidence-encoding-v1.mjs';
import {createRosterExperimentSourceReviewV1,assessRosterExperimentConclusionV1} from '../packages/roster-strategist/roster-workflow-experiment-owner-v1.mjs';
import {createRosterCoverageClarificationV1} from '../packages/roster-strategist/roster-review-data-questions-v1.mjs';
const root=process.cwd(),dir=path.resolve(process.argv[2]),base=path.join(dir,'workspace/decision-workflows/projection-owner');
if(!dir.startsWith(path.join(root,'build/slice272-projection-owner-v565-')))throw Error('CURRENT_NEW_RUN_REQUIRED');
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const initial=await read(path.join(base,'workflow.json')),draft=await read(path.join(base,'artifacts',initial.draftRef+'.json'));
const revision=draft.revision,group=`p5-current-obligations-v577:r${revision}`;
const config=await read(path.join(root,'build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v79-plan-recovery-config.private.json'));
const save=(name,value)=>fs.writeFile(path.join(dir,name),JSON.stringify(value,null,2),{flag:'wx'});
let adapter,sequence=Math.max(0,...(await fs.readdir(dir)).filter(n=>/^\d+\.request\.json$/.test(n)).map(n=>parseInt(n)));
const numbers=new Map(),calls=[],ids=['map_and_arrival','component_choices'].map(d=>group+':'+d);
// Signals request an observation-boundary stop; never abort a paid request or
// Native operation. The final snapshot and adapter close run normally.
let stopRequested=false;
const requestStop=()=>{stopRequested=true;console.log(JSON.stringify({stage:'stop-requested',afterCurrentAdvance:true}));};
process.on('SIGTERM',requestStop);process.on('SIGINT',requestStop);
console.log(JSON.stringify({stage:'initializing',dir,revision,ids}));
try{
  adapter=await createRosterPlanningSecureDeliberationFactoryV1();
  const product=await createRosterPlanningProductModuleV1({root,fixtureRoot:config.fixtureRoot,dataDirectory:path.join(dir,'workspace'),
    mapConfiguration:await read(config.mapConfigurationFile),deliberationFactory:adapter.factory});
  const run=await product.openDecisionWorkflow({runId:'projection-owner',candidateInput:draft.candidateInput,
    setup:{sideKey:draft.candidateInput.sideKey,missionBinding:draft.provenance.missionBinding},
    onEvent:e=>fs.appendFile(path.join(dir,'provider-events.jsonl'),JSON.stringify(e)+'\n'),
    onRequest:async request=>{const number=++sequence;numbers.set(request.contextHash,number);const encoded=encodeRosterProviderInputV1(request,'same_request_evidence_v1');
      await save(number+'.request.json',{request,providerInstructions:projectRosterProviderInstructionsV1({request,runKind:'teach-framework'}),encodedProviderInput:encoded.input,isExactPromptContent:true});
      console.log(JSON.stringify({stage:'dispatching',number,role:request.roundKind,inputCharacters:encoded.afterCharacters}));},
    onReply:async reply=>{const number=numbers.get(reply.receipt.contextHash);if(!number)throw Error('UNBOUND_REPLY');await save(number+'.reply.json',reply);
      calls.push({number,usage:reply.receipt.usage,latencyMs:reply.receipt.latencyMs});console.log(JSON.stringify({stage:'returned',...calls.at(-1)}));},
    onTool:value=>fs.appendFile(path.join(dir,'tools.jsonl'),JSON.stringify(value)+'\n')});
  const accepted=await run.experimentOutcomes();
  for(const id of ['p3-observed-menu-arrival-proof-v573','p3-native-arrival-supply-proof-v576'])
    if(!accepted.some(o=>o.goalId===id&&o.acceptedForStrategy))throw Error('P3_REAL_ARRIVAL_AND_SUPPLY_PROOF_REQUIRED:'+id);
  const state=await run.inspect(),reviews=new Map();
  for(const work of state.work.filter(w=>w.role==='roster_workflow_final_review'&&w.draftRevision===revision&&ids.some(id=>id.endsWith(':'+w.reviewDomain)))){
    if(!reviews.has(work.reviewDomain)||(work.reviewRound??1)>(reviews.get(work.reviewDomain).reviewRound??1))reviews.set(work.reviewDomain,work);
  }
  const mapRefs=state.work.filter(w=>w.role==='roster_workflow_tool'&&w.status==='evidence_ready'&&w.bindings.source===state.scope.source
    &&['map_summary','map_route','map_access','roster_route'].includes(w.inputs.request.value.operation))
    .map(w=>({sourceEvidenceId:'tool-view:'+w.id,operation:w.inputs.request.value.operation}));
  for(const [index,domain] of ['map_and_arrival','component_choices'].entries()){
    if(state.work.some(w=>w.id===ids[index]))continue;
    const review=reviews.get(domain);if(!review)throw Error('EXACT_CURRENT_DOMAIN_REVIEW_REQUIRED:'+domain);
    const inputs={review:{source:'evidence',id:'role:'+review.id,pointer:''},
      draft:{source:'evidence',id:`draft:r${revision}:summary`,pointer:''},
      existingMapReferences:{source:'literal',value:mapRefs},
      alreadyValidated:{source:'literal',value:accepted.filter(o=>['projection-comparison-interpretation','p3-observed-menu-arrival-proof-v573','p3-native-arrival-supply-proof-v576'].includes(o.goalId))
        .map(o=>({sourceEvidenceId:'role:'+o.ownerWorkId,sourceReviewEvidenceId:'role:'+o.reviewId,scope:o.conclusion}))}};
    const sections=domain==='map_and_arrival'?['deploymentConcept','scoreRoute']:['componentPurposes','lossResourceBudget'];
    for(const [i,e]of state.evidence.filter(e=>sections.some(s=>e.id===`draft:r${revision}:plan:${s}`||e.id.startsWith(`draft:r${revision}:plan:${s}:`))).entries())
      inputs['claim'+i]={source:'evidence',id:e.id,pointer:''};
    await run.requestExperiment({id:ids[index],inputs,question:{
      goal:domain==='map_and_arrival'
        ?'完成当前Plan的地图与部署证据：核对实际地图/任务、底盘通行、部署进场与Supply时序、目标位置的真实控制条件。围绕当前计划所需的关键部署和路径提出并执行条件实验；覆盖计划中的单位角色及预备队安排。单单位成功不能冒充全表成功。'
        :'完成当前Plan的组件取舍证据：针对现有三Medic、Raynor、小Marauder和第二队Marine，提出合理备选和明确场景，查明实际能力/支付/范围，量化边际贡献或代价。模型自主选场景、备选与假设，不要求强行换表或证明全局最优。复用已核对的Marauder4对2局部数据，不能扩成Medic收益。',
      method:'只负责本域事实与条件比较，不改军表/Plan、不重复全球Teach。先查已有原件与Skill；缺必要事实再按分块工作单调查。未知未来菜单交回模型选择，已读菜单优先用match精确指明actionType/pieceId，参数仍由模型决定。不可为满足错误序号换掉原问题的单位。真实失败按来源纠正，保持问题目标。',
      proofSemantics:'Native私有分支回执的provenArrivalHistory=false表示没有正式对局历史，不否定在明确父态/假设下已实际执行的合法Native transition。静态队形不能证明进场；条件Native动作的canonical path/base/coherency检查及后继可以证明该条件下合法。不要要求实验回执把正式历史标志改true。控点仍须独立的当前Native eligibility/底盘范围/对手Supply比较。',
      closure:'最终以中文给出核对过的事实、定量差异、条件、可支持或反驳的计划主张及对应原件，交独立来源/问题覆盖审核。必要事实缺口不能通过清空列表或改称条件来放行；未来对手选择可以保留明确假设。已有审核主张也可用原件反驳，不把审核意见当新规则。'} });
  }
  // These explicit domain owners replace the original review investigations,
  // not their immutable sources. Re-entry must not wake the exhausted old tree.
  for(const [index,domain]of ['map_and_arrival','component_choices'].entries()){
    const current=await run.inspect(),goalId=`review-resolution:r${revision}:${domain}`;
    if(current.work.some(w=>w.id===goalId&&w.experimentGoalId===goalId))
      console.log(JSON.stringify({stage:'prior-domain-goal-superseded',...await run.supersedeExperiment({goalId,
        replacementGoalId:ids[index],reason:'The explicit current P5 domain owner replaces this earlier same-draft review investigation. Retain every original source, reply, fee and counter; do not execute the earlier stopped methods or approve its claims.'})}));
  }
  if(process.argv.includes('--resume-typed-scene-query')){
    const current=await run.inspect();
    const failed=current.work.findLast(w=>w.id.startsWith(group+':map_and_arrival:owner:')
      &&w.role==='roster_workflow_tool'&&w.repairGeneration===3&&w.status==='needs_model_choice'
      &&w.inputs.request.value.operation==='spatial');
    if(!failed)throw Error('EXACT_TYPED_SCENE_QUERY_STOP_REQUIRED');
    const value=(await run.readArtifact(failed.resultRef)).value;
    if(value.receipt?.unknownReason!=='SCENE_QUERY_ARGUMENTS_JSON_INVALID')throw Error('CONCRETE_JSON_SOURCE_FAILURE_REQUIRED');
    if(!current.work.some(w=>w.id===failed.id+':input-repair'))await run.resumeToolRepair({workId:failed.id,
      reason:'v585 actual nested-JSON source overwrite reproduced and the typed query seam passed once. Use spatial {queryKind,selection:{sourceEvidenceNumber,kind:"domain",match:{actionType:"deploy",pieceId:"u_marine_2"}},queryArguments:{preferredAnchor,formationObjectives,maximumOptions}}. Host binds parent/seat/domain from the actual inspect and serializes Native arguments once. Preserve your original requested anchor/objectives; read and choose whole Native legal candidates before any deploy. Never bind a scalar domainId over the entire argumentsJson. One standing-authorized continuation after this exact source-contract fix; no counter reset or successful replay.'});
  }
  if(process.argv.includes('--resume-native-option-method')){
    const current=await run.inspect();
    const failed=current.work.findLast(w=>w.id.startsWith(group+':map_and_arrival:owner:')
      &&w.role==='roster_workflow_tool'&&w.repairGeneration===3&&w.status==='needs_model_choice'
      &&w.inputs.request.value.operation==='formation_scene');
    if(!failed)throw Error('EXACT_NATIVE_VS_STATIC_METHOD_STOP_REQUIRED');
    const value=(await run.readArtifact(failed.resultRef)).value;
    if(value.code!=='ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID'||value.detail!=='source is not a static-formation receipt')
      throw Error('CONCRETE_NATIVE_OPTION_METHOD_FAILURE_REQUIRED');
    if(!current.work.some(w=>w.id===failed.id+':input-repair'))await run.resumeToolRepair({workId:failed.id,
      reason:'v586 passed the saved real six-option selector gate. The source is a Native space.solve_formation candidate, NOT static geometry. Correct the experiment method with native_action {selection:{sourceEvidenceNumber,kind:"formation",index OR match:{formationOptionId}}}; keep YOUR chosen option (do not default to the first). Host copies exact canonicalParameters and source parent/seat; do not retype coordinates, apply formation_scene first, or deploy twice. Read the Native successor. Since this changes the incorrect method rather than making static formation into a Native action, conclude with the actual scoped facts so branch return hands them to the original question owner. No fabricated replacement receipt, no old successful replay, one standing-authorized recovery.'});
  }
  if(process.argv.includes('--resume-component-source-selection')){
    const current=await run.inspect();
    const failed=current.work.find(w=>w.id.startsWith(group+':component_choices:owner:owner:owner:owner:')
      &&w.id.endsWith(':apply-joint')&&w.role==='roster_workflow_tool'&&w.repairGeneration===3&&w.status==='needs_model_choice');
    if(!failed)throw Error('EXACT_COMPONENT_ZERO_SOURCE_STOP_REQUIRED');
    const value=(await run.readArtifact(failed.resultRef)).value;
    if(value.code!=='ROSTER_WORKFLOW_FORMATION_SELECTION_INPUT_INVALID'||value.detail?.evidenceNumber!==0)
      throw Error('CONCRETE_COMPONENT_ZERO_SOURCE_FAILURE_REQUIRED');
    if(!current.work.some(w=>w.id===failed.id+':input-repair'))await run.resumeToolRepair({workId:failed.id,
      reason:'v587 actual three-zero source selection reproduced and rejected before dispatch. Normal and controlled repairs now receive the original completed causal prefix of their SAME batch, including the three successful static solvers with real saved numbers. Keep your chosen units/options; replace sourceEvidenceNumber:0 with those actual receipts, not a global-latest result. Do not rerun successful solvers or retype positions. Distinguish Native action candidates (native_action kind formation) from static geometry (formation_scene). One standing-authorized recovery after this exact source-handoff fix; old counters/costs stay.'});
  }
  if(process.argv.includes('--resume-joint-static-geometry')){
    // One recovery per current domain after the concrete joint-geometry fix.
    // Never revive an older stopped ancestor or overwrite a saved result.
    for(const domain of ['map_and_arrival','component_choices']){
      const current=await run.inspect();
      if(current.work.some(w=>w.id.startsWith(group+':'+domain+':owner:')
        &&(w.controlledRecovery?.engineeringChangeId==='joint-static-geometry-v588'
          ||w.controlledRecovery?.reason?.startsWith('v588 reproduced the saved independent-unit overlap'))))continue;
      const failed=current.work.findLast(w=>w.id.startsWith(group+':'+domain+':owner:')
        &&w.role==='roster_workflow_tool'&&w.status==='needs_model_choice'
        &&['spatial','threat_exchange'].includes(w.inputs.request.value.operation)
        &&!current.work.some(child=>child.id===w.id+':input-repair'));
      // A prior startup may already have enqueued the exact map recovery before
      // discovering the older API accepted only generation3. Do not enqueue an
      // ancestor or replay that saved ready work on the corrected startup.
      if(!failed)throw Error('CURRENT_JOINT_GEOMETRY_STOP_REQUIRED:'+domain);
      const value=(await run.readArtifact(failed.resultRef)).value;
      if(!value.receipt?.unknownReason?.startsWith('MODEL_BASE_GEOMETRY_PLACEMENT_OVERLAP:'))
        throw Error('SAVED_NATIVE_OVERLAP_REQUIRED:'+domain);
      await run.resumeToolRepair({workId:failed.id,engineeringChangeId:'joint-static-geometry-v588',expectedGeneration:failed.repairGeneration,
        reason:'v588 reproduced the saved independent-unit overlap and passed the SAME Native static solver → whole-group application → original marker query gate once. The shared space.solve_static_formation tool now accepts jointUnits:[{unitId,anchors,formationObjectives?,modelSpreadInches?}] in addition to the primary unitId/anchors. Choose the units that need mutual repacking and YOUR explicit alternative anchors/intents; only their old footprints are withdrawn. Each returned formationOptions entry contains the complete jointly checked canonicalPlacements group. Read and choose ONE whole option via formation_scene, then query its actual successor for the ORIGINAL question. Do not combine independently solved conflicting units, manually copy coordinates or treat static fit as movement/arrival. Unlisted participants/map/resources remain unchanged. Search truncation is not impossibility. This is one standing-authorized recovery after a specific tool-capability fix, not a counter reset, strategic conclusion or old successful replay.'});
    }
  }
  if(process.argv.includes('--resume-static-search-budgets')){
    const current=await run.inspect();
    const failed=current.work.findLast(w=>w.id.startsWith(group+':map_and_arrival:')
      &&w.role==='roster_workflow_tool'&&w.status==='needs_model_choice'&&w.repairGeneration>=3
      &&w.inputs.request.value.operation==='spatial'&&w.inputs.request.value.args.queryKind==='space.solve_static_formation');
    if(!failed)throw Error('EXACT_STATIC_SEARCH_BUDGET_STOP_REQUIRED');
    const saved=(await run.readArtifact(failed.resultRef)).value,args=JSON.parse(saved.request.argumentsJson);
    if(saved.receipt?.unknownReason!=='STATIC_FORMATION_ARGUMENTS_INVALID'||!Array.isArray(args.formationObjectives)
      ||!Number.isSafeInteger(args.maximumJointOptions)||!Number.isSafeInteger(args.maximumJointEvaluations))
      throw Error('ACTUAL_CANONICAL_INTENT_WITH_ADVERTISED_BUDGETS_REQUIRED');
    if(!current.work.some(w=>w.id===failed.id+':input-repair'))await run.resumeToolRepair({workId:failed.id,
      expectedGeneration:failed.repairGeneration,engineeringChangeId:'single-static-search-budgets-v609',
      reason:'Actual v608 normalization reached Native as a valid objective ARRAY but static single-unit rejected its PUBLIC maximumJointOptions/maximumJointEvaluations. Native now derives allowed top-level fields from the SAME public contract and honors those explicit budgets in single-unit search; legacy omitted-budget witness order is unchanged. A real frozen private Native lab RED→GREEN compared to the saved successful legacy baseline, checked bounded search and concrete Adapter validation errors, with0Provider/source mutation. Reuse the exact retained parent, unit, anchors and intent; do not drop budgets to bypass the contract, replay successes or reset history/fees. One standing-authorized continuation after this distinct concrete Native contract fix; a bounded no-option result is not impossibility.'});
  }
  if(process.argv.includes('--resume-static-intent-collection')){
    const current=await run.inspect();
    const failed=current.work.findLast(w=>w.id.startsWith(group+':map_and_arrival:')
      &&w.role==='roster_workflow_tool'&&w.status==='needs_model_choice'&&w.repairGeneration===3
      &&w.inputs.request.value.operation==='spatial'&&w.inputs.request.value.args.queryKind==='space.solve_static_formation');
    if(!failed)throw Error('EXACT_STATIC_INTENT_COLLECTION_STOP_REQUIRED');
    const saved=(await run.readArtifact(failed.resultRef)).value,objective=saved.submittedArguments?.queryArguments?.formationObjectives;
    if(saved.receipt?.unknownReason!=='STATIC_FORMATION_ARGUMENTS_INVALID'||!objective||Array.isArray(objective)||!objective.kind)
      throw Error('ACTUAL_SINGLETON_STATIC_INTENT_FAILURE_REQUIRED');
    if(!current.work.some(w=>w.id===failed.id+':input-repair'))await run.resumeToolRepair({workId:failed.id,
      expectedGeneration:3,engineeringChangeId:'static-intent-collection-v608',
      reason:'Actual808 single-object intent reached an unchanged Native static validator requiring an array, while the current-action vocabulary accepts both. The product Adapter now losslessly canonicalizes primary and jointUnit objective objects into one-element arrays, preserving raw submittedArguments and an inputBindings normalization trace; it uses the SAME Native validator and does not change kind/weight/targets/anchors or Rules. One concrete executor RED→GREEN passed; unsupported intent still fails before dispatch. Keep the original same-parent unit/anchors/intent, reuse all successful sources, choose actual returned options, and resume this method once. Do not replay successful queries, reset history/fees, demand impossible arrival flags, or claim a bounded miss is global impossibility.'});
  }
  const recheckTag=process.argv.includes('--recheck-component-ability-fields')?'ability-fields-v601':
    process.argv.includes('--recheck-component-claim-scope')?'claim-scope-v600':
    process.argv.includes('--recheck-component-atomic-claims')?'atomic-fidelity-v598':
    process.argv.includes('--recheck-component-comparison-scope')?'causal-comparison-scope-v594':null;
  if(recheckTag){
    const current=await run.inspect();
    const owner=current.work.findLast(w=>w.experimentGoalId===group+':component_choices'&&w.status==='evidence_ready');
    if(!owner?.resultRef)throw Error('EXACT_CURRENT_COMPONENT_ANSWER_REQUIRED');
    const reviewId=owner.id+':source-recheck:'+recheckTag;
    if(!current.work.some(w=>w.id===reviewId)){
      const assessment=await assessRosterExperimentConclusionV1({state:current,owner,store:{get:run.readArtifact}});
      const previousReview=current.work.find(w=>w.id===assessment.reviewId);
      if(!assessment.acceptedForStrategy&&!(recheckTag==='claim-scope-v600'
        &&previousReview?.sourceFidelityMode==='atomic_claims_v1'&&previousReview.materialClaimContractVersion===1))
        throw Error('EXACT_OLD_ACCEPTED_COMPARISON_REQUIRED');
      const review=await createRosterExperimentSourceReviewV1({state:current,owner,
        result:await run.readArtifact(owner.resultRef),store:{get:run.readArtifact},reviewId});
      if(!review)throw Error('NEW_SCOPED_SOURCE_REVIEW_REQUIRED');
      const {sourceProjections,claimReviews=[],ruleFieldReviews=[],...job}=review;
      for(const projection of sourceProjections)if(!current.evidence.some(e=>e.id===projection.id))await run.publishEvidence(projection);
      await run.enqueue([...claimReviews,...ruleFieldReviews,{...job,sourceReviewRecheckOf:assessment.reviewId,
        ...(recheckTag==='claim-scope-v600'?{supersedeUnissuedReview:true}:{}),
        controlledRecovery:{engineeringChangeId:recheckTag,historyReset:false,
          ...(recheckTag==='ability-fields-v601'?{sourceRevisionAllowance:{ownerWorkId:owner.id,
            priorRound:owner.experimentReviewRound??0,additionalRevisions:1}}:{}),
          reason:recheckTag==='ability-fields-v601'
            ?'Actual675 and its passed atomic ability check conflated distinct structured phase/activation/trigger/target fields. The source was delivered, so stronger whole-sentence wording is not sufficient. A separate source-derived per-ability field matrix is required and Host composes every result. Reuse all unchanged atomic checks; only this concrete affected source matrix and its dependent coverage are new. One standing-authorized author continuation after this engineering fix, with incremented historical round, no counter or fee reset.'
            :recheckTag==='claim-scope-v600'
            ?'Actual atomic14 judged a bare newline as a missing fact; actual4/9 audited an unrelated heading/global experiment instead of their exact statement. Preserve all formatting in segments but issue only substantive assertion jobs. Narrow failed checks to source scope, retain unchanged passed results with explicit old bindings, and supersede only the idle old coverage request. No pending Provider request, old reply, review counter, army, Plan or fee is reset.'
            :recheckTag==='atomic-fidelity-v598'
            ?'Concrete616/619 and the paragraph prototype let one single-attacker value be called a group total because a later disclaimer was used to waive it. The atomic597 trial rejected that exact assertion while retaining a correct per-attacker control. Recheck each unchanged original assertion independently; Host requires all source checks before coverage can approve. Reuse exact unchanged completed checks and deliver failed claims to the original author; no army/Plan/counter/fee rewrite.'
            :'Concrete590/596/599 copied sampled differences into Medic marginal benefit and per-attacker values into combined volleys. Native explicitly excludes optional reaction effects. Recheck only this answer under the repaired source projection/causal contract; preserve all old facts, replies, rounds and fees. No Plan approval or unrelated review replay.'}}]);
      console.log(JSON.stringify({stage:'source-recheck-enqueued',reviewId,oldReviewId:assessment.reviewId,historyReset:false}));
    }
  }
  if(process.argv.includes('--classify-component-followups')){
    const current=await run.inspect(),owner=current.work.findLast(w=>w.experimentGoalId===group+':component_choices'&&w.status==='evidence_ready');
    const assessment=await assessRosterExperimentConclusionV1({state:current,owner,store:{get:run.readArtifact}});
    const prior=current.work.find(w=>w.id===assessment.reviewId);
    if(prior?.sourceFidelityMode==='classified_coverage_v1'){
      console.log(JSON.stringify({stage:'existing-coverage-classification-preserved',id:prior.id,status:prior.status}));
    }else{
      const coverage=(await run.readArtifact(prior.resultRef)).value.checks.find(c=>c.checkId==='question_coverage');
      const clarification=createRosterCoverageClarificationV1({state:current,owner,review:prior,assessment,coverage});
      if(clarification)await run.enqueue([clarification]);
      console.log(JSON.stringify({stage:'typed-coverage-classification-enqueued',originalReviewId:prior.id,historyReset:false,sourceAuditReplayed:false}));
    }
  }
  if(process.argv.includes('--return-current-map-to-strategy')){
    console.log(JSON.stringify({stage:'current-investigation-returned',...await run.returnInvestigation({goalId:ids[0],
      reason:'v614 actual865–882 showed the same question repeatedly re-opened despite saved negative inspections and real prior Native arrivals. Return this current frontier, including unfinished methods and necessary unknowns, to joint army/Plan strategy. No fact/source/fee/counter is reset and no Plan is approved.'})}));
  }
  for(let tick=0;tick<96;tick++){
    if(stopRequested)break;
    const outcomes=await run.experimentOutcomes(),facts=ids.map(id=>outcomes.find(o=>o.goalId===id));
    if(facts.every(o=>o?.acceptedForStrategy)){
      const decisionId=group+':joint-decision',current=await run.inspect();
      if(!current.work.some(w=>w.id===decisionId))await run.requestDecision({id:decisionId,
        inputs:Object.fromEntries(facts.flatMap((o,i)=>[[`facts${i}`,{source:'evidence',id:'role:'+o.ownerWorkId,pointer:''}],
          [`sourceCheck${i}`,{source:'evidence',id:'role:'+o.reviewId,pointer:''}]])),
        question:{goal:'两域事实已完成来源核对。总体策略负责人综合证据，正式修订或有依据保留当前军表，Plan同步反映地图/Supply/进场/控点与组件比较。允许改表和Plan，不强迫为了演示而换单位。',
          delivery:'通过结构化修改接口形成完整当前军表与Plan，说明采纳和拒绝的取舍、量化依据、反制和触发重规划条件。只改受影响部分，保存真实工具引用；缺新的必要事实则明确调查。旧停止调查不重启、不重置次数。最终仍需Teach和发布审核，不宣称已完成对局。'}});
    }
    const step=await run.advance({concurrency:2});
    console.log(JSON.stringify({stage:'advance',tick,revision:step.state.draftRevision,work:step.ran.map(w=>({id:w.id,status:w.status}))}));
    if(step.state.draftRevision>revision||step.state.work.some(w=>w.status==='needs_repair')||!step.ran.length
      ||facts.some(o=>o?.status==='blocked'))break;
  }
  await save('p5-v577-result-'+Date.now()+'.json',{calls,startingRevision:revision,currentDraft:await run.currentDraft(),
    outcomes:(await run.experimentOutcomes()).filter(o=>ids.includes(o.goalId)),readiness:await run.readiness(),
    formalPlanAccepted:false,gameStarted:false,mutationProof:run.mutationProof()});
}catch(error){await save('p5-v577-failure-'+Date.now()+'.json',{code:error.code||error.message,calls});console.error(error);process.exitCode=1;}
finally{await adapter?.close();process.off('SIGTERM',requestStop);process.off('SIGINT',requestStop);}
