import {rosterDeliveredValueCoverageV1} from './roster-source-citation-delivery-v1.mjs';
import {projectRosterExperimentSourceFactsV1,ROSTER_RECEIPT_STRUCTURE_PROJECTION_VERSION_V1,
  ROSTER_SOURCE_FACTS_PROJECTION_VERSION_V1} from './roster-experiment-source-facts-v1.mjs';
import {collectPregameNativeActionEvidenceV1} from './pregame-native-action-evidence-v1.mjs';
import {rosterWorkflowBindingsMatchV1} from './roster-decision-workflow-v1.mjs';
import {rosterAuditedCandidateSourceV1} from './roster-workflow-candidate-source-v1.mjs';
import {rosterRejectedCandidateSourceV1} from './roster-rejected-candidate-identity-v1.mjs';
import {projectRosterMeasuredComparisonMeaningV1} from './roster-measured-comparison-v1.mjs';
import {extractRosterMissionScoreV1,ROSTER_MISSION_SCORE_METRIC_V1} from './roster-mission-score-measurement-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {createHash} from 'node:crypto';
import {projectRosterRangedActivationExperienceV1,ROSTER_RANGED_ACTIVATION_METRICS_V1} from './roster-ranged-activation-measurement-v1.mjs';
import {rosterExactReadRowsV1} from './roster-comparison-control-command-v1.mjs';
import {projectRosterBuilderAuditNumericFactsV1,compareRosterBuilderAuditNumericFactsV1} from './roster-builder-candidate-facts-v1.mjs';
import {projectRosterWorkflowStateReferenceV1} from './roster-workflow-state-reference-v1.mjs';

const readKey=row=>JSON.stringify([row.evidenceId,row.pointer]);
// Product discovery already inspected the immutable Native source. Surface its
// saved identity, not the last experiment's successor as an implicit world.
// No new Native query or reset occurs; the ordinary scoped reader delivers the
// selected fields. Bindings and the original root identity must both agree.
export async function projectRosterWorkflowRootContextReferenceV1({directory,scope,store,includeMissionGeometry=false}){
  if(!scope?.source)return null;
  for(const entry of [...directory].reverse()){
    if(entry.kind!=='tool_receipt'||entry.validity!=='current'
      ||!/^tool:discovery:r\d+:context$/u.test(entry.id)
      ||['army','rules','map','source'].some(key=>!scope[key]||entry.bindings?.[key]!==scope[key]))continue;
    const source=await store.get(entry.artifactRef),receipt=source?.receipt;
    if(source?.operation!=='inspect'||source.status!=='completed'
      ||source.contextRef!=null||source.stateRef?.contextRef!=null
      ||source.stateRef?.sourceStateHash!==scope.source||source.stateRef?.stateHash!==scope.source
      ||receipt?.sourceStateHash!==scope.source||receipt.baseStateHash!==scope.source
      ||typeof receipt.scenarioConstruction?.firstRoundInitialization?.sourceEligible!=='boolean')continue;
    return {schema:'roster_current_root_scene_v1',version:includeMissionGeometry?3:2,
      sourceEvidenceId:entry.id,evidenceNumber:entry.number,
      sourceStateHash:scope.source,
      participantAuthority:'native_source_scene_only',provesCurrentDraftArmy:false,
      currentDraftCandidateHash:scope.army,
      reads:['/stateRef','/receipt/phase','/receipt/round','/receipt/scenarioConstruction/firstRoundInitialization',
        ...(includeMissionGeometry?['/receipt/board/widthInches','/receipt/board/heightInches','/receipt/board/missionMarkers']:[])]
        .map(pointer=>({evidenceNumber:entry.number,pointer})),
      ...(includeMissionGeometry?{geometryReference:{unit:'inches',coordinateConversion:'1000 milli-inches per inch',
        selectedMarkerStillModelOwned:true,anchorStillModelOwned:true,
        conditionalSuccessorGeometryProven:false,
        instruction:'These are exact frozen ROOT board dimensions and mission markers, provided for the missing search-anchor choice. Read the actual values; do not substitute an origin because coordinates were absent from a compact prompt. This does NOT replace your selected successor or prove its geometry, arrival, legality, control, or future score. Retain the authorized target; explicitly choose an anchor or return the remaining uncertainty to the owner.'}}:{}),
      replacesSelectedSuccessor:false,approvesArrival:false,wholeBodyRead:false,
      instruction:'This is the immutable Native laboratory ROOT already inspected by product discovery, not your last experiment successor. Its participants may be frozen reference recipes; this source identity or its army binding does NOT establish that those selections/upgrades are the current adopted draft. Use draft.candidateInput for the actual saved army (which may still be empty), or the explicitly named candidate for a candidate audit. Never assemble a current army from reference participants or all menu upgrades. The exact named fields are delivered through the normal source reader. sourceEligible describes ONLY the inspected state: false on a successor does not establish that the root or the tool is unavailable. Conversely root eligibility does not grant an action, prove an arrival, authorize a repeated experiment or replace an explicitly selected predecessor. Choose the source appropriate to the current authorized method; reuse completed matching work when it exists. Bind the chosen saved stateRef explicitly and use its real Native menu. Do not reset cards/resources, teleport units, cross the permitted round boundary or replay a successful action merely to escape an exhausted successor. Other root fields remain readable at this evidence number.'};
  }
  return null;
}
// Inspect the reply's ACTUAL request, not fetch history. An immutable parent
// covers a child only when that child's value was really present in the exact
// body. A compact projection, partial parent, or missing path grants no such
// proof. This classifies transport progress, never truth or strategy quality.
export function projectRosterReadRequestProgressV1({request,reads=[],catalogueQueries=[],directory=[],sourceReads=[]}){
  const responses=(request.promptNodes??[]).filter(node=>node.kind==='exact_read_results')
    .flatMap(rosterExactReadRowsV1);
  const delivered=responses.filter(row=>row.status==='read');
  const contains=(row,pointer)=>{
    if(row.pointer===pointer)return true;
    if(typeof pointer!=='string'||typeof row.pointer!=='string'
      ||!pointer.startsWith(row.pointer+'/'))return false;
    let value=row.value;
    for(const token of pointer.slice(row.pointer.length+1).split('/')){
      if(/~(?![01])/u.test(token))return false;
      const key=token.replaceAll('~1','/').replaceAll('~0','~');
      if(value===null||typeof value!=='object'||!Object.hasOwn(value,key))return false;
      value=value[key];
    }
    return true;
  };
  const alreadyDelivered=[],alreadyAnsweredMissing=[],notDelivered=[];
  const selected=new Map(reads.map(read=>[JSON.stringify([read.evidenceNumber,read.pointer]),read]));
  for(const read of selected.values()){
    const entry=directory.find(e=>e.number===read.evidenceNumber);
    let source=entry&&delivered.find(row=>row.evidenceId===entry.id&&contains(row,read.pointer));
    // The original fetched value supplies shape/values only; actual request
    // rows must cover every leaf. Fetch alone never grants delivered status.
    if(!source&&entry){
      const original=sourceReads.find(row=>row.status==='read'&&row.evidenceId===entry.id&&contains(row,read.pointer));
      if(original){
        let value=original.value;
        const suffix=read.pointer.slice(original.pointer.length);
        if(suffix)for(const token of suffix.slice(1).split('/'))value=value[token.replaceAll('~1','/').replaceAll('~0','~')];
        if(rosterDeliveredValueCoverageV1({rows:delivered,evidenceId:entry.id,pointer:read.pointer,value}))
          source={pointer:read.pointer,completeChildCoverage:true};
      }
    }
    // An exact missing-path response for this immutable artifact is already an
    // answer to this READ, not a delivered body or a missing strategic fact.
    // Never infer absence from a partial parent, transient failure or old call.
    const missing=!source&&entry&&responses.find(row=>row.evidenceId===entry.id
      &&row.pointer===read.pointer&&row.status==='path_missing');
    (source?alreadyDelivered:missing?alreadyAnsweredMissing:notDelivered).push({...structuredClone(read),
      ...(source?{deliveredPointer:source.pointer}:missing?{status:'path_missing'}:{})});
  }
  // Search results in this actual request were computed for its current
  // directory. The same full query/page/filter is not new preparation, even
  // when it returned zero matches. Changed queries/pages remain available.
  const searchResponses=(request.promptNodes??[]).filter(node=>node.kind==='catalogue_search_results')
    .flatMap(node=>node.results??[]);
  const alreadyDeliveredCatalogueQueries=[],notDeliveredCatalogueQueries=[];
  for(const query of catalogueQueries){
    const answered=searchResponses.some(page=>isDeepStrictEqual(page.query,query)
      &&['roster_workflow_catalogue_page_v1','roster_workflow_catalogue_page_v2'].includes(page.schema)
      &&Number.isInteger(page.totalMatches)&&Array.isArray(page.entries));
    (answered?alreadyDeliveredCatalogueQueries:notDeliveredCatalogueQueries).push(structuredClone(query));
  }
  return {version:1,alreadyDelivered,alreadyAnsweredMissing,notDelivered,
    alreadyDeliveredCatalogueQueries,notDeliveredCatalogueQueries,
    noNewInformation:selected.size+catalogueQueries.length>0&&notDelivered.length===0&&notDeliveredCatalogueQueries.length===0,
    deliveryContextHash:request.contextHash,acceptanceGranted:false};
}
// A conclusion can repeat already fulfilled read selections as annotations.
// Remove only selections whose exact bodies were present in THIS request;
// fetch history or a previous prompt never suffices. All semantic decisions,
// citations, factual objections and genuinely pending reads remain untouched.
export function projectRosterCompletedReadAnnotationsV1({request,output,decisionField,directory=[]}){
  if(!output||!['finish','conclude'].includes(output.action)||!Array.isArray(output.reads)
    ||!output.reads.length||!(Array.isArray(output[decisionField])&&output[decisionField].length
      ||output.action==='conclude'&&output.conclusion))return {output,projection:[]};
  const progress=projectRosterReadRequestProgressV1({request,reads:output.reads,directory});
  const completed=new Set(progress.alreadyDelivered.map(r=>JSON.stringify([r.evidenceNumber,r.pointer])));
  if(!completed.size)return {output,projection:[]};
  const removed=output.reads.filter(r=>completed.has(JSON.stringify([r.evidenceNumber,r.pointer])));
  return {output:{...output,reads:output.reads.filter(r=>!completed.has(JSON.stringify([r.evidenceNumber,r.pointer])))},
    projection:[{rule:'completed_read_annotations_v1',from:'/reads',original:structuredClone(removed),
      deliveryContextHash:request.contextHash,conclusionApproved:false}]};
}

// The bounded transport window must not repeatedly spend its entire allowance
// on old root prefixes while newly fetched sources remain unseen forever.
// This orders delivery only; it does not grant a read, rank strategy/evidence
// truth, change a value, or discard old source navigation/qualification.
function orderReadDeliveries(rows,knownDelivered){
  const completed=knownDelivered.filter(row=>row.status==='read');
  const seenSources=new Set(completed.map(row=>row.evidenceId));
  const covers=row=>completed.some(prior=>prior.evidenceId===row.evidenceId
    &&(!prior.pointer||prior.pointer===row.pointer||row.pointer.startsWith(prior.pointer+'/')));
  return rows.map((row,index)=>({row,index,
    fresh:row.status==='read'&&(!seenSources.has(row.evidenceId)||row.pointer!==''&&!covers(row)),
    characters:row.status==='read'?JSON.stringify(row.value).length:0}))
    .sort((a,b)=>Number(b.fresh)-Number(a.fresh)||(a.fresh?a.characters-b.characters:0)||a.index-b.index)
    .map(entry=>entry.row);
}
// A withheld action array must remain discoverable without guessing an index.
// Copy Native identity/phase labels only: do not infer eligibility, select a
// weapon, rank options, or manufacture a second action/phase rules table.
function nativeActionReadDirectory(value,pointer){
  const kind=pointer.endsWith('/actionSpace/actionCapabilityReference/routes')?'capability':
    pointer.endsWith('/actionSpace/actionAvailability/disabledActions')?'disabled':
    pointer.endsWith('/actionSpace/parameterDomains')?'domain':
    pointer.endsWith('/actionSpace/finiteActions')?'finite':null;
  if(!kind||!Array.isArray(value))return null;
  const units=new Map();
  for(const [index,entry]of value.entries()){
    const source=kind==='finite'?entry?.action:entry;
    if(!source||typeof source.actionType!=='string')return null;
    const pieceId=source.pieceId??null;
    if(pieceId!==null&&typeof pieceId!=='string')return null;
    const unit=units.get(pieceId)??{pieceId,actions:[]};
    unit.actions.push({index,...Object.fromEntries(['actionType','phase','weaponName','abilityName',
      ...(kind==='disabled'?['disabledReason']:[])]
      .filter(key=>typeof source[key]==='string').map(key=>[key,source[key]]))});
    units.set(pieceId,unit);
  }
  return {schema:'roster_native_action_read_directory_v1',kind,itemCount:value.length,
    itemPointerPattern:pointer+'/{zeroBasedIndex}',units:[...units.values()],
    directoryIsBodyRead:false,executionEligibilityProven:false,
    instruction:'Exact labels from the withheld Native array, grouped by unit for discovery. Replace {zeroBasedIndex} with the chosen index and read that original item. Capability phases are source-declared, not current legal domains; a matching phase does not prove engagement, range, readiness or payment. This directory neither changes the scene nor authorizes an action. Read the original entry before selecting a domain or designing its prerequisite scene.'};
}
// Transport-sized exact JSON children, never arbitrary text truncation. Large
// arrays remain addressable by their existing zero-based JSON Pointers. When
// all their values fit the remaining batch, deliver exact items now instead of
// making the model buy another read for each already-fetched option. Oversized
// arrays retain navigation; no arbitrary first-N sampling or parent-read grant.
function chunkExactReads(rows,{maximumChildCharacters=16384,maximumBatchCharacters=262144}={}){
  const exactReads=[],sourceReadNavigation=[];let used=0;
  // Breadth-first across ALL fetched sources: one large receipt's nested
  // observations must not consume the window before another receipt's small
  // outcome/identity/conditions fields. Values and pointer authority are exact;
  // this is transport order, not a strategic ranking or complete-parent read.
  const queue=[],deferredArrays=[];
  for(const row of rows){
    if(row.status!=='read')exactReads.push(row);
    else queue.push({row,value:row.value,pointer:row.pointer});
  }
  for(let cursor=0;cursor<queue.length;cursor++){
    const {row,value,pointer}=queue[cursor],characters=JSON.stringify(value).length;
    if(characters<=maximumChildCharacters&&used+characters<=maximumBatchCharacters){
      exactReads.push({...row,pointer,value:structuredClone(value),
        ...(pointer!==row.pointer?{requestedPointer:row.pointer,deliveryKind:'exact_json_child_v1'}:{})});
      used+=characters;continue;
    }
    if(Array.isArray(value)){
      // Large arrays wait until small fields across all sources are delivered.
      // Expand a fitting array atomically below, never an arbitrary first-N.
      deferredArrays.push({row,value,pointer,characters});continue;
    }
    if(value&&typeof value==='object'&&!Array.isArray(value)&&used<maximumBatchCharacters){
      for(const [key,child]of Object.entries(value))queue.push({row,value:child,pointer:pointer+'/'+key.replaceAll('~','~0').replaceAll('/','~1')});
      continue;
    }
    if(typeof value==='string'){
      exactReads.push({...row,pointer,value,deliveryKind:'exact_scalar_soft_overrun_v1'});used+=characters;continue;
    }
    sourceReadNavigation.push({evidenceId:row.evidenceId,evidenceNumber:row.evidenceNumber,pointer,
      requestedPointer:row.pointer,status:'fetched_not_delivered',characters,
      valueType:Array.isArray(value)?'array':value===null?'null':typeof value,
      ...(Array.isArray(value)?{length:value.length,itemPointerPattern:pointer+'/{zeroBasedIndex}'}:{}),
      ...(nativeActionReadDirectory(value,pointer)?{nativeActionDirectory:nativeActionReadDirectory(value,pointer)}:{}),
      read:{evidenceNumber:row.evidenceNumber,pointer},
      instruction:'The complete value is saved but NOT delivered here. Read a needed exact child pointer (array indexes are zero-based), or a smaller field. This is not a missing source, zero result, complete body read or permission to infer omitted contents.'});
  }
  const emitWhole=(row,value,pointer)=>{
    const characters=JSON.stringify(value).length;
    if(characters<=maximumChildCharacters||value===null||typeof value!=='object'){
      exactReads.push({...row,pointer,value:structuredClone(value),
        ...(pointer!==row.pointer?{requestedPointer:row.pointer,deliveryKind:'exact_json_child_v1'}:{})});return;
    }
    for(const [key,child]of Object.entries(value))emitWhole(row,child,pointer+'/'+key.replaceAll('~','~0').replaceAll('/','~1'));
  };
  for(const {row,value,pointer,characters}of deferredArrays){
    if(used+characters<=maximumBatchCharacters){emitWhole(row,value,pointer);used+=characters;continue;}
    sourceReadNavigation.push({evidenceId:row.evidenceId,evidenceNumber:row.evidenceNumber,pointer,
      requestedPointer:row.pointer,status:'fetched_not_delivered',characters,valueType:'array',length:value.length,
      itemPointerPattern:pointer+'/{zeroBasedIndex}',
      ...(nativeActionReadDirectory(value,pointer)?{nativeActionDirectory:nativeActionReadDirectory(value,pointer)}:{}),
      read:{evidenceNumber:row.evidenceNumber,pointer},
      instruction:'The complete value is saved but NOT delivered here. Read a needed exact child pointer (array indexes are zero-based), or a smaller field. This is not a missing source, zero result, complete body read or permission to infer omitted contents.'});
  }
  return {exactReads,sourceReadNavigation};
}

// Called ONLY after an actual Provider reply (valid or malformed). A rejected
// input/pending dispatch must never grant delivery merely because Host fetched it.
export async function recordRosterWorkflowReadDeliveryV1({request,operation,store,previousDeliveredReads=[]}){
  const records=new Map((operation.deliveredReads??[]).map(row=>[readKey(row),row]));
  for(const row of previousDeliveredReads)if(!records.has(readKey(row)))records.set(readKey(row),{
    evidenceId:row.evidenceId,pointer:row.pointer,resultRef:await store.put(row),legacyCompletedDelivery:true});
  for(const node of request.promptNodes??[])if(node.kind==='exact_read_results')for(const row of rosterExactReadRowsV1(node)){
    if(row.status!=='read')continue;
    records.set(readKey(row),{evidenceId:row.evidenceId,pointer:row.pointer,resultRef:await store.put(row),
      completedContextHash:request.contextHash});
  }
  operation.deliveredReads=[...records.values()];
}

// An archived experience cites a work-result envelope. Model reads address the
// registered Native evidence body. Bind an address only after matching both.
async function rangedExperienceSourceNavigation({record,entry,directory,store}){
  const observation=record?.actualObservation,source=observation?.source;
  if(record?.schema!=='roster_conditional_experience_observation_v1'||!observation?.rangedActivation
    ||entry.kind!=='hypothesis'||!source?.workId||!source?.resultRef
    ||entry.id!==`conditional-experience:${source.workId}:${source.resultRef}`||source.evidenceId!==`tool:${source.workId}`)return null;
  const original=directory.find(row=>row.id===source.evidenceId);
  if(original?.kind!=='tool_receipt'||!original.artifactRef||!Number.isSafeInteger(original.number)
    ||original.number<1||[original.access,original.availability].some(status=>status==='missing'||status==='unsupported'))return null;
  const result=await store.get(source.resultRef).catch(()=>null),value=result?.value;
  if(result?.kind!=='tool_receipt'||result.continuation===true||value?.status!=='completed'
    ||value.experimentOrigin?.sourceWorkId!==source.workId
    ||createHash('sha256').update(JSON.stringify(value)).digest('hex')!==original.artifactRef)return null;
  const projected=projectRosterRangedActivationExperienceV1(value);
  if(!projected||!isDeepStrictEqual(projected.participants,observation.participants)
    ||!isDeepStrictEqual(projected.metricValues,observation.metricValues)
    ||!isDeepStrictEqual(projected.rangedActivation,observation.rangedActivation))return null;
  const base='/receipt/queryReceipt/result';
  const read=pointer=>({evidenceNumber:original.number,pointer:base+pointer});
  return {sourceEvidenceId:original.id,sourceArtifactRef:original.artifactRef,validity:original.validity,
    metricReads:Object.fromEntries(Object.keys(projected.metricValues).map(id=>[id,
      read('/estimates/'+ROSTER_RANGED_ACTIVATION_METRICS_V1[id].field+'/mean')])),
    declaredPolicyRead:read('/policy'),scopeRead:projected.rangedActivation.scope?read('/scope'):null,
    sourceReadGranted:false,strategyApprovalGranted:false,
    instruction:'Read a selected address in this workflow. These addresses resolve to the original conditional observation; a catalogue entry does not approve the choice or make a historical source current.'};
}

// A completed request is delivery evidence; a selected/fetched read alone is
// not. New results remain full once. Only repeat Native root context is compacted,
// using the same deterministic projection as source review and discovery.
async function projectMissionAwardOperandReads(meaning,directory,get){
  const query=meaning?.evaluatedQuery;
  if(meaning?.status!=='observed'||query?.metric!==ROSTER_MISSION_SCORE_METRIC_V1)return [];
  const reads=[];
  for(const [key,operand] of [['reference',query.reference],['candidate',query.subject]]){
    const entries=directory.filter(row=>row.id===operand.sourceEvidenceId&&row.artifactRef===operand.sourceResultRef);
    if(entries.length!==1)continue;
    const [entry]=entries;
    if(entry.kind!=='tool_receipt'||entry.availability!=='available'
      ||!Number.isSafeInteger(entry.number)||entry.number<1
      ||entry.calculationInvalidation||['missing','unsupported','forbidden','unavailable'].includes(entry.access))continue;
    const value=await get(entry).catch(()=>null);
    const award=extractRosterMissionScoreV1({value},operand);
    if(award.status!=='observed'||award.value!==operand.value||award.round!==operand.round
      ||award.nativeReceiptHash!==operand.nativeReceiptHash||award.parentStateHash!==operand.parentStateHash
      ||award.stateHash!==operand.stateHash||award.pointer!==operand.sourcePointer)continue;
    const read=pointer=>({evidenceNumber:entry.number,pointer});
    reads.push({operand:key,sourceEvidenceId:entry.id,sourceArtifactRef:entry.artifactRef,
      round:award.round,seatKey:award.seatKey,validity:entry.validity,awardRead:read(award.pointer),
      objectiveVpRead:read(award.pointer+'/breakdowns/'+award.seatKey+'/objectiveVp')});
  }
  return reads;
}

export async function projectRosterWorkflowReadContextV1({collected,operation,directory,store,assignmentInputs={},assignmentScope={}}){
  const previousCall=operation.calls.at(-1);
  const previous=previousCall?await store.get(previousCall.requestRef):null;
  const key=(id,pointer)=>JSON.stringify([id,pointer]);
  const delivered=new Set();
  for(const node of previous?.promptNodes??[]){
    if(node.kind==='exact_read_results')for(const row of rosterExactReadRowsV1(node))
      if(row.status==='read')delivered.add(key(row.evidenceId,row.pointer));
    if(node.kind==='previously_delivered_source_facts')for(const row of node.sources??[])
      delivered.add(key(row.evidenceId,row.originalPointer));
  }
  const exactReads=[],previousSourceFacts=[],knownDelivered=[];
  for(const row of operation.deliveredReads??[])knownDelivered.push(await store.get(row.resultRef));
  // Read-only migration of old completed calls; never include pending requests.
  if(!operation.deliveredReads)for(const node of previous?.promptNodes??[]){
    if(node.kind==='exact_read_results')knownDelivered.push(...rosterExactReadRowsV1(node).filter(row=>row.status==='read'));
    if(node.kind==='previously_delivered_source_facts')for(const source of node.sources??[]){
      const original=collected.find(row=>row.evidenceId===source.evidenceId&&row.pointer===source.originalPointer);
      if(original)knownDelivered.push(original);
    }
  }
  for(const row of collected){
    const body=row.value?.value??row.value;
    const evidence=directory.find(e=>e.id===row.evidenceId);
    if(row.status!=='read'||row.pointer!==''||!body?.operation||!body.receipt||!evidence
      ||!delivered.has(key(row.evidenceId,row.pointer))||JSON.stringify(body).length<=16384){
      exactReads.push(row);continue;
    }
    previousSourceFacts.push({evidenceId:row.evidenceId,evidenceNumber:row.evidenceNumber,
      originalPointer:row.pointer,validity:row.validity,conditions:row.conditions,
      priorCompletedRequestRef:previousCall.requestRef,
      projection:projectRosterExperimentSourceFactsV1({evidence,value:body})});
  }
  const chunked=chunkExactReads(orderReadDeliveries(exactReads,knownDelivered));
  const deliveredReads=[...new Map([...knownDelivered,...chunked.exactReads.filter(row=>row.status==='read')]
    .map(row=>[readKey(row),row])).values()];
  // Old immutable views/v2 projections remain valid navigation. Supply the
  // omitted Native scope from their REGISTERED original, without rewriting them
  // or pretending an alias/section read delivered the complete original body.
  const nativeSources=new Map(),nativeMeasurements=new Map(),missionAwardOperands=new Map(),sourceRecords=new Map(),cache=new Map(),sourceIdentities=new Map();
  const auditedCandidateApplicability=new Map();
  const builderAuditFacts=new Map();
  const rejectedCandidateFacts=new Map();
  const get=async entry=>{
    if(!cache.has(entry.id))cache.set(entry.id,await store.get(entry.artifactRef));
    return cache.get(entry.id);
  };
  const supplement=async(readViaEvidenceId,body,fullOriginalBodyDelivered=false)=>{
    let sourceId=readViaEvidenceId,source=body?.value??body;
    const visited=new Set();let needsSourceRecord=false,needsNativeMeasurements=false;
    while(source&&typeof source==='object'){
      const alias=source.schema==='roster_workflow_receipt_view_v1'?source.evidenceId:
        source.schema==='roster_experiment_source_facts_v1'?source.sourceEvidenceId:null;
      if(!alias)break;
      if(!Object.hasOwn(source,'sourceRecord'))needsSourceRecord=true;
      if(source.structureProjectionVersion!==ROSTER_RECEIPT_STRUCTURE_PROJECTION_VERSION_V1
        ||!Object.hasOwn(source,'receiptStructures')
        ||source.schema==='roster_experiment_source_facts_v1'
          &&source.projectionVersion!==ROSTER_SOURCE_FACTS_PROJECTION_VERSION_V1)needsNativeMeasurements=true;
      if(visited.has(alias))return;visited.add(alias);
      const original=directory.find(e=>e.id===alias);if(!original)return;
      sourceId=alias;source=await get(original);source=source?.value??source;
      fullOriginalBodyDelivered=false;
    }
    const entry=directory.find(e=>e.id===sourceId);
    if(!entry||!source||typeof source!=='object')return;
    const stateRef=projectRosterWorkflowStateReferenceV1(source);
    if(stateRef){
      const identity={stateRef,sourceEvidenceId:sourceId,sourceArtifactRef:entry.artifactRef,
        originalArtifactUnchanged:true,fullSourceReadGranted:false,
        instruction:'Every selected field belongs to THIS exact scene/candidate. A task title or a different saved scene cannot change its identity. Current evidence validity does not mean it describes the pending action scene.'};
      sourceIdentities.set(sourceId,identity);
      if(readViaEvidenceId)sourceIdentities.set(readViaEvidenceId,identity);
    }
    // One typed, deterministic view for all role kinds, including direct draft
    // audits and legacy aliases. Reading a subsection does not grant the whole
    // original body; every operand below still carries its registered source.
    const numericFacts=projectRosterBuilderAuditNumericFactsV1({value:source,evidence:entry});
    if(numericFacts)builderAuditFacts.set(sourceId,numericFacts);
    const rejected=rosterRejectedCandidateSourceV1(source);
    if(rejected)rejectedCandidateFacts.set(sourceId,{
      sourceEvidenceId:sourceId,sourceEvidenceNumber:entry.number,sourceArtifactRef:entry.artifactRef,
      rulesHash:entry.bindings?.rules,candidatePointer:rejected.candidatePointer,
      audit:structuredClone(rejected.audit)});
    const audited=rosterAuditedCandidateSourceV1(source);
    if(audited&&assignmentScope.army){
      const audit=audited.historicalAudit,prior=auditedCandidateApplicability.get(sourceId);
      auditedCandidateApplicability.set(sourceId,{
        sourceEvidenceId:sourceId,sourceEvidenceNumber:entry.number,
        sourceArtifactRef:entry.artifactRef,
        readViaEvidenceIds:[...new Set([...(prior?.readViaEvidenceIds??[]),readViaEvidenceId])],
        auditedCandidateHash:audit.candidateHash,
        currentDraftCandidateHash:assignmentScope.army,
        applicability:audit.candidateHash===assignmentScope.army
          ?'same_candidate_identity_not_fresh_audit':'different_audited_candidate',
        auditSummary:structuredClone(audit.summary),
        originalViewUnchanged:true,acceptanceGranted:false,
        instruction:'Exact Native candidate identity comparison only, not a strategy verdict or fresh audit. The saved draft may still be empty. A different audited candidate does not prove the draft spent that budget, has those upgrades, or adopted it. But a query explicitly about that candidate can be answered from its own audit; identity difference is NOT a requirement to audit the old draft before considering the candidate. Adoption belongs to the strategic author and later validation. Both original sources remain readable; never replace draft facts with another candidate’s totals.',
      });
    }
    if(needsSourceRecord&&(!source.operation||!source.receipt)){
      const prior=sourceRecords.get(sourceId);
      sourceRecords.set(sourceId,{sourceEvidenceId:sourceId,sourceEvidenceNumber:entry.number,
        sourceArtifactRef:entry.artifactRef,validity:entry.validity,conditions:entry.conditions??[],
        readViaEvidenceIds:[...new Set([...(prior?.readViaEvidenceIds??[]),readViaEvidenceId])],
        projection:projectRosterExperimentSourceFactsV1({evidence:entry,value:source}),
        originalViewUnchanged:true,acceptanceGranted:false});
    }
    if(!source.receipt)return;
    // A capability-only read must carry its SAME saved state's menu scope.
    // The shared projector joins exact Native identities without executing or
    // granting a complete source read. It never picks another state's menu.
    if(source.operation==='inspect'&&source.receipt.actionSpace)needsNativeMeasurements=true;
    // A leaf onTable/count read must carry its input-state identity too.
    // Source-wide metadata does not grant a full body read or a successor fact.
    if(source.participantConfigurationCheck)needsNativeMeasurements=true;
    // Reading an old ORIGINAL must not lose a contract upgrade that an alias
    // reader receives. A predicate-only read also needs its named operands,
    // without granting a full-original read. Use the SAME arithmetic projector,
    // never rewrite a paid result, reverse its sides, or infer a strategy winner.
    // Current aliases already contain this projection and are not duplicated.
    const comparisonMeaning=projectRosterMeasuredComparisonMeaningV1(source.receipt);
    if(source.operation==='compare_observations'&&!missionAwardOperands.has(sourceId)){
      const operands=await projectMissionAwardOperandReads(comparisonMeaning,directory,get);
      if(operands.length)missionAwardOperands.set(sourceId,{comparisonEvidenceId:sourceId,comparisonEvidenceNumber:entry.number,
        comparisonArtifactRef:entry.artifactRef,operands,sourceReadGranted:false,strategyApprovalGranted:false});
    }
    if(!visited.size&&comparisonMeaning&&(!fullOriginalBodyDelivered
      ||!isDeepStrictEqual(source.receipt.comparisonMeaning,comparisonMeaning)))needsNativeMeasurements=true;
    // A partial original read has no alias-version flag. It still needs the
    // same loss-child navigation as an alias reader, not a false whole-body
    // grant or a claim that unshown movement/weapon/control detail is absent.
    if(!fullOriginalBodyDelivered&&(Array.isArray(source.receipt.estimate?.outcomes?.lossStateDistribution)
      ||source.receipt.exchange?.attackEstimates?.some(e=>Array.isArray(e.outcomes?.lossStateDistribution))))
      needsNativeMeasurements=true;
    if(needsNativeMeasurements&&typeof source.operation==='string'){
      const prior=nativeMeasurements.get(sourceId);
      nativeMeasurements.set(sourceId,{sourceEvidenceId:sourceId,sourceEvidenceNumber:entry.number,
        sourceArtifactRef:entry.artifactRef,validity:entry.validity,conditions:entry.conditions??[],
        readViaEvidenceIds:[...new Set([...(prior?.readViaEvidenceIds??[]),readViaEvidenceId])],
        projection:projectRosterExperimentSourceFactsV1({evidence:entry,value:source}),
        originalViewUnchanged:true,acceptanceGranted:false});
    }
    const evidence=collectPregameNativeActionEvidenceV1(source.receipt);
    if(!evidence.length)return;
    const prior=nativeSources.get(sourceId);
    nativeSources.set(sourceId,{sourceEvidenceId:sourceId,sourceEvidenceNumber:entry.number,
      sourceArtifactRef:entry.artifactRef,validity:entry.validity,conditions:entry.conditions??[],
      readViaEvidenceIds:[...new Set([...(prior?.readViaEvidenceIds??[]),readViaEvidenceId])],
      fullOriginalBodyDelivered:fullOriginalBodyDelivered||prior?.fullOriginalBodyDelivered===true,
      evidence,acceptanceGranted:false});
  };
  for(const row of deliveredReads){
    if(row.status!=='read')continue;
    const entry=directory.find(e=>e.id===row.evidenceId);if(!entry)continue;
    await supplement(row.evidenceId,row.pointer===''?row.value:await get(entry),row.pointer==='');
  }
  for(const input of Object.values(assignmentInputs)){
    if(input.source==='evidence'&&input.status==='read'){
      // Assignment projections and explicit reads use one source-resolution
      // rule. A participant/configuration subsection is not the receipt root.
      const entry=directory.find(e=>e.id===input.evidenceId);
      if(entry)await supplement(input.evidenceId,input.pointer===''?input.value:await get(entry),input.pointer==='');
    }
    else if(input.source==='literal'&&['roster_experiment_source_facts_v1','roster_workflow_receipt_view_v1'].includes(input.value?.schema))
      await supplement(null,input.value,false);
  }
  const builderAudits=[...builderAuditFacts.values()];
  const currentBuilderAudit=builderAudits.find(row=>row.candidateHash===assignmentScope.army&&row.source.validity==='current');
  const builderComparisons=currentBuilderAudit?builderAudits.filter(row=>row.source.validity==='current')
    .map(row=>compareRosterBuilderAuditNumericFactsV1(currentBuilderAudit,row)).filter(Boolean):[];
  const withIdentity=row=>sourceIdentities.has(row.evidenceId)?{...row,sourceStateIdentity:structuredClone(sourceIdentities.get(row.evidenceId))}:row;
  const exactReadsWithNavigation=[];
  for(const row of chunked.exactReads){
    let navigation=null;
    if(row.status==='read'&&row.evidenceId.startsWith('conditional-experience:')
      &&(row.pointer===''||row.pointer==='/actualObservation'||row.pointer.startsWith('/actualObservation/'))){
      const entry=directory.find(e=>e.id===row.evidenceId);
      if(entry)navigation=await rangedExperienceSourceNavigation({
        record:row.pointer===''?row.value:await get(entry),entry,directory,store});
    }
    exactReadsWithNavigation.push(navigation?{...withIdentity(row),conditionalExperienceSourceNavigation:navigation}:withIdentity(row));
  }
  return {exactReads:exactReadsWithNavigation,sourceReadNavigation:chunked.sourceReadNavigation,deliveredReads:deliveredReads.map(withIdentity),previousDeliveredReads:knownDelivered.map(withIdentity),
    sourceStateIdentities:[...sourceIdentities].map(([readViaEvidenceId,identity])=>({readViaEvidenceId,...identity})),
    previousSourceFacts,nativeSources:[...nativeSources.values()],
    nativeMeasurements:[...nativeMeasurements.values()],missionAwardOperands:[...missionAwardOperands.values()],sourceRecords:[...sourceRecords.values()],
    auditedCandidateApplicability:[...auditedCandidateApplicability.values()],
    builderAudits,builderComparisons,
    rejectedCandidateFacts:[...rejectedCandidateFacts.values()]};
}

// A concrete delivery-source repair permits ONE ordinary author-confirmation
// continuation. It never revalidates/approves an old reply against facts that
// its author had not received, or retries a pending Provider request.
export async function projectRosterWorkflowReadDeliveryRecoveryV1({state,work,store}){
  const operation=work?.operationState,errors=operation?.correction?.errors;
  if(work?.status!=='needs_repair'||work.failure?.code!=='ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED'
    ||work.failure.dispatchOutcome!=='completed_invalid'||operation?.pending
    ||!rosterWorkflowBindingsMatchV1(work.bindings,state.scope)
    ||!errors?.length||errors.some(error=>error.code!=='evidence_not_read'))return null;
  const originalReplyRef=operation.correction.originalReplyRef;
  const call=operation.calls.findLast(row=>row.replyRef===originalReplyRef);if(!call)return null;
  const request=await store.get(call.requestRef);
  const oldReadNumbers=new Set(request.promptNodes?.find(node=>node.kind==='citation_access')?.directlyReadEvidenceNumbers??[]);
  const directory=state.evidence.map((entry,index)=>({number:index+1,...entry}));
  const affectedEvidenceNumbers=[...new Set(errors.map(error=>error.number))];
  if(affectedEvidenceNumbers.some(number=>!directory[number-1]||oldReadNumbers.has(number)))return null;
  const collected=await Promise.all(operation.reads.map(async row=>({
    ...await store.get(row.resultRef),evidenceNumber:directory.find(entry=>entry.id===row.evidenceId)?.number})));
  if(affectedEvidenceNumbers.some(number=>!collected.some(row=>row.status==='read'
    &&row.evidenceId===directory[number-1].id)))return null;
  const current=await projectRosterWorkflowReadContextV1({collected,operation,directory,store});
  if(affectedEvidenceNumbers.some(number=>!current.exactReads.some(row=>row.status==='read'
    &&row.evidenceId===directory[number-1].id)))return null;
  return {repairKind:'read_delivery_starvation',
    recoveryKey:'fresh_read_delivery_v706:'+work.id,workId:work.id,originalReplyRef,
    originalContextHash:request.contextHash,affectedEvidenceNumbers,
    requiresAuthorConfirmation:true,maximumAdditionalInvalidResults:1,
    historyReset:false,acceptanceGranted:false};
}

// Refresh only delivery diagnostics against the request being sent now. Saved
// corrections, model proposals, source validity and semantic obligations stay.
export function refreshRosterReadDeliveryFeedbackV1({request,sourceReads=[],directory=request.roleCommunication?.evidenceNumbers??[]}){
  const nodes=request.promptNodes??[],feedback=nodes.find(n=>n.kind==='local_contract_feedback');
  const reads=(feedback?.errors??[]).filter(e=>e.code==='evidence_not_read'&&Number.isSafeInteger(e.number)
    &&typeof(e.requiredPointer??e.pointer)==='string').map(e=>({evidenceNumber:e.number,pointer:e.requiredPointer??e.pointer}));
  const progress=projectRosterReadRequestProgressV1({request,reads,directory,sourceReads});
  const resolved=(feedback?.errors??[]).filter(e=>e.code==='evidence_not_read'&&progress.alreadyDelivered.some(r=>
    r.evidenceNumber===e.number&&r.pointer===(e.requiredPointer??e.pointer)));
  return {...request,promptNodes:nodes.map(node=>{
    if(node===feedback&&resolved.length)return {...node,
      errors:node.errors.filter(e=>!resolved.includes(e)),
      resolvedDeliveryErrors:[...(node.resolvedDeliveryErrors??[]),...structuredClone(resolved)],
      readDeliveryProjection:{version:1,source:'complete_actual_request_body',factApproved:false,originalReplyPreserved:true},
      instruction:node.instruction+' 已列在resolvedDeliveryErrors的读取诊断，现在已由实际送达的完整值/分片解决。请用已送达内容继续当前方法选择或修正解释，不重复请求同一正文；这不批准原结论、所选场景或任何规则事实。其他错误仍需处理。'};
    if(node.kind==='immutable_read_progress'){
      const prior=[...(node.alreadyDelivered??[]),...(node.alreadyAnsweredMissing??[]),...(node.notDelivered??[])];
      const refreshed=projectRosterReadRequestProgressV1({request,reads:prior,
        catalogueQueries:[...(node.alreadyDeliveredCatalogueQueries??[]),...(node.notDeliveredCatalogueQueries??[])],directory,sourceReads});
      return {...node,...refreshed,projectionVersion:2,originalReplyRef:node.originalReplyRef};
    }
    return node;
  })};
}
