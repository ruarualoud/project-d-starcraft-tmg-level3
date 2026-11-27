import {ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1} from './army-builder-query-port-v1.mjs';
import {ROSTER_BUDGET_BRANCH_BOUNDS_SCHEMA_V1} from './roster-budget-branch-query-v1.mjs';
// A private alternative uses the product's existing Builder/source/Rules
// factory. It is not a draft commit, a fabricated combat result or a new engine.
import {hashStarcraftTmgContract as hash} from '../authoritative-engine/referee-crypto-v1.mjs';
import {isDeepStrictEqual} from 'node:util';
import {assertPregameSceneProjectionInputV1,PREGAME_SCENE_PROJECTION_ARGUMENTS_V1,PREGAME_SCENE_PROJECTION_PARAMETER_SCHEMA_V1}
  from './pregame-scene-projection-v1.mjs';
const clone=v=>structuredClone(v);
// Candidate identity is the frozen source, not the tool implementation or its
// advertised capabilities. Query reuse checks implementation version elsewhere.
// Existing contextRef values remain opaque handles; do not re-sign old evidence.
function laboratorySourceIdentity(descriptor){
  return Object.fromEntries(['schema','laboratoryId','sourceStateHash','sourceRoomRef',
    'builderBundleHash','portDescriptorHash','rulesRuntimeHash'].map(key=>[key,clone(descriptor?.[key])]));
}
function sourceChanged(){
  throw Object.assign(Error('ROSTER_WORKFLOW_CANDIDATE_CONTEXT_SOURCE_CHANGED'),{code:'ROSTER_WORKFLOW_CANDIDATE_CONTEXT_SOURCE_CHANGED'});
}
const candidateText={type:'string',minLength:1};
const candidateArray=items=>({type:'array',items});
const candidateObject=(properties,required=[])=>({type:'object',additionalProperties:false,required,properties});
export function describeRosterCandidateEditSchemaV1(){
 const unit=clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1.properties.units.items);
 return candidateObject({unitIdsToRemove:candidateArray(candidateText),unitsToUpsert:candidateArray(unit),
  unitUpgradeEdits:candidateArray(candidateObject({unitInstanceId:candidateText,
   remove:candidateArray(candidateObject({upgradeName:candidateText,nominatedModelId:candidateText},['upgradeName'])),
   add:candidateArray(clone(unit.properties.upgrades.items))},['unitInstanceId'])),
  tacticalCardEdits:candidateObject({add:candidateArray(candidateText),remove:candidateArray(candidateText)})});
}
export function describeRosterBuilderQueryParameterSchemaV1(operation){
 if(!['builder_audit','builder_branches'].includes(operation))throw new TypeError('ROSTER_BUILDER_PARAMETER_OPERATION_UNKNOWN');
 return candidateObject({candidateInput:clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1),candidateEdits:describeRosterCandidateEditSchemaV1(),
  ...(operation==='builder_branches'?clone(ROSTER_BUDGET_BRANCH_BOUNDS_SCHEMA_V1.properties):{})});
}

export function describeRosterCandidateContextParameterSchemaV1(mode,projected=false){
 if(!['input','delta','choice'].includes(mode))throw new TypeError('ROSTER_CANDIDATE_PARAMETER_MODE_UNKNOWN');
 const field=mode==='choice'?'candidate':mode==='input'?'candidateInput':'candidateEdits';
 // Factor shared opponent/scene fields once. Old input/delta forms remain
 // readable, while new requests select exactly one own-candidate variant.
 const own=mode==='choice'?{anyOf:[
  candidateObject({kind:{type:'string',enum:['input']},candidateInput:clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1)},['kind','candidateInput']),
  candidateObject({kind:{type:'string',enum:['delta']},candidateEdits:describeRosterCandidateEditSchemaV1()},['kind','candidateEdits'])
 ]}:mode==='input'?clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1):describeRosterCandidateEditSchemaV1();
 return candidateObject({[field]:own,
  opponentCandidateInput:{...clone(ARMY_BUILDER_CANDIDATE_INPUT_CONTRACT_V1),description:'Optional explicit HYPOTHETICAL opponent army for unknown_roster only. Same known opponent faction/scale/budget, opposite side. This is not the actual opponent roster and never commits it. Native audits legality.'},
  ...(projected?{comparisonScene:clone(PREGAME_SCENE_PROJECTION_PARAMETER_SCHEMA_V1)}:{})},[field,...(projected===true?['comparisonScene']:[])]);
}
export const ROSTER_CANDIDATE_CONTEXT_INPUT_V1=Object.freeze({
  opponentCandidateInput:'Optional model-selected hypothetical opponent in unknown_roster mode only; same known faction/scale/budget, opposite side. Independent of the actual enemy roster. Retained in receipts and cold restoration; Native audited, not committed.',
  candidateInput:'LEGACY complete Native candidate OR candidateEdits, never both.',
  candidateEdits:{
    unitIdsToRemove:'Optional exact existing IDs.',
    unitsToUpsert:'Optional complete Native unit records. Other units remain byte-for-byte unchanged.',
    unitUpgradeEdits:'Optional [{unitInstanceId,remove:[{upgradeName,nominatedModelId?}],add:[Native upgrade selections]}]. A removal must match exactly one existing selection; specify nominatedModelId if ambiguous. No invented composition/upgrade IDs.',
    tacticalCardEdits:'Optional {add:[exact card keys],remove:[existing card keys]}. Each occurrence adds/removes ONE copy, not set membership. Native checks Unique limits, costs and slots. Unmentioned copies remain unchanged.'
  },
  comparisonScene:'Optional source-owned project_scene arguments: '+JSON.stringify(PREGAME_SCENE_PROJECTION_ARGUMENTS_V1)+'. Explicitly projects the saved reference scene into the new candidate. If absent, stateRef identifies a setup SOURCE, not a combat scene.',
  result:'Native audit plus private candidate identity. With comparisonScene, the returned stateRef selects its actual projected branch; no action/history, draft edit or strategy approval. Native differences/invalidity are returned, never silently repaired.'
});
function reject(code,detail){throw Object.assign(Error(code),{code,detail,
  queryRepair:projectRosterCandidateFailureV1({operation:'candidate_context',code,detail})??{correctable:true,
  sourceContract:'roster_candidate_context_v1',originalQueryNotAnswered:true,
  inputContract:clone(ROSTER_CANDIDATE_CONTEXT_INPUT_V1),
  instruction:'Choose an explicit candidateEdits delta of the CURRENT draft, or a complete candidateInput. Native alone checks legality; preserve unrelated choices. A new candidate alone is a setup source. Supply comparisonScene to project the selected frozen geometry, or use project_scene separately. No formal draft, automatic card choice or implied combat result.'}});}
export function projectRosterCandidateFailureV1(value){
  if(value?.operation!=='candidate_context')return null;
  // Exact saved failures from the product facade before it exposed Native's
  // existing projection methods. Not a candidate Rules rejection or a general
  // TypeError retry. The original paid proposal and failed receipt stay intact.
  if(value.detail?.candidateReceipt?.audit?.status==='legal'
    &&['reference.captureSceneLayout is not a function',
      'target.runProjectedScenarioBranch is not a function'].includes(value.code)){
    return {correctable:true,controlReturn:true,sourceContract:'roster_candidate_scene_facade_v1',
      failureClass:'product_adapter',preserveCandidateExactly:true,originalQueryNotAnswered:true,
      rulesQuestionAnswered:true,combatQuestionAnswered:false,
      instruction:'Native already accepted this candidate army. The product facade failed before copying the selected reference scene; it now exposes the same Native capture/project/restore methods. Reissue the saved candidate edits and explicit comparisonScene under the existing bounded repair cycle. Do not change units, upgrades, cards, hypothesis or reference identity to evade an adapter error. This grants no combat conclusion or Plan acceptance. Any further Native parameter/geometry rejection remains its own explicit result; if the adapter error persists, return blocked for engineering, not a different strategy.'};
  }
  const audit=value.detail?.nativeAudit;
  if(audit){
    const addressing=audit.status==='invalid_candidate'&&audit.rejectionKind==='candidate_addressing',
      illegal=audit.status==='illegal';
    return {correctable:true,controlReturn:!addressing,
      sourceContract:'roster_candidate_outcome_v2',
      failureClass:addressing?'input_addressing':illegal?'rules_rejection':'capability_or_execution',
      rulesQuestionAnswered:illegal,combatQuestionAnswered:false,originalQueryNotAnswered:true,
      nativeRejection:clone(audit),inputContract:clone(ROSTER_CANDIDATE_CONTEXT_INPUT_V1),
      instruction:addressing
        ?'Correct only the Native-reported addressing fields using its candidateInputContract. No legality or combat result exists yet; do not guess profiles or rewrite unrelated selections.'
        :illegal
          ?'Native has answered that this exact candidate is ILLEGAL. This is a negative Rules observation, not a JSON/field error. Changing kind to profile ID cannot repair slot capacity. Keep the exact rejection. Within the authorized comparison, explicitly propose a genuinely different Rules-legal candidate with reasons, or conclude strategy_required/blocked and return the failed arm to its strategic owner. Do not repeatedly serialize the same illegal army, change formal Plan, expand participants or simulate a whole match. No combat result has been measured.'
          :'The candidate legality query did not resolve; unknown is neither illegal nor legal. Return the concrete capability/execution gap to the owner. Do not alter the army or invent a result to hide a service or Rules failure.'};
  }
  const deckRule=value.detail?.causeCode;
  if(value.code==='ROSTER_WORKFLOW_CANDIDATE_CONSTRUCTION_FAILED'
    &&typeof deckRule==='string'&&deckRule.startsWith('FACTION_REQUIRED_TACTICAL_GROUP_CARDINALITY_INVALID:')){
    return {correctable:true,controlReturn:true,sourceContract:'roster_candidate_outcome_v2',
      failureClass:'rules_rejection',nativeRuleRejection:deckRule,originalQueryNotAnswered:true,
      rulesQuestionAnswered:true,combatQuestionAnswered:false,
      instruction:'The exact candidate violates the Native faction tactical-card requirement. Do not reissue it unchanged. Use the frozen public faction/card catalogue to correct only the explicit hypothetical card selection when permitted; otherwise return the exact rule rejection to the design owner. Keep all units, upgrades, scope and the actual opponent information boundary. No combat result exists.'};
  }
  if(value.code==='ROSTER_WORKFLOW_CANDIDATE_CONSTRUCTION_FAILED'
    ||/^STANDARD_ROOM_(UNIT_COMPOSITION_UNKNOWN|UPGRADE_UNKNOWN):/.test(value.code??'')){
    return {correctable:true,controlReturn:true,sourceContract:'roster_candidate_native_room_transport_v2',
      failureClass:'candidate_construction',preserveCandidateExactly:true,
      originalQueryNotAnswered:true,rulesQuestionAnswered:false,combatQuestionAnswered:false,
      instruction:'This failed at the candidate-to-scene construction boundary, not a combat calculation or a request to redesign the army. The current product preserves full Native candidate inputs, including profile/model/upgrade identities. Reissue the SAME saved candidate and explicit scene parameters once under the existing repair limit; do not change composition, cards, upgrades, model IDs or hypotheses merely to avoid the adapter error. If it still fails, conclude blocked with the actual construction failure for engineering. Never infer combat or strategy from creation.'};
  }
  return null;
}
function list(value,field){if(value===undefined)return [];
  if(!Array.isArray(value))reject('ROSTER_WORKFLOW_CANDIDATE_EDIT_LIST_REQUIRED',field);return value;}
export function projectRosterCandidateEditsV1(current,edits){
  if(!edits||typeof edits!=='object'||Array.isArray(edits)
    ||Object.keys(edits).some(k=>!['unitIdsToRemove','unitsToUpsert','unitUpgradeEdits','tacticalCardEdits'].includes(k)))
    reject('ROSTER_WORKFLOW_CANDIDATE_EDITS_INVALID');
  const candidate=clone(current),units=new Map(candidate.units.map(u=>[u.unitInstanceId,u])),touched=new Set();
  const touch=id=>{if(typeof id!=='string'||!id||touched.has(id))
    reject('ROSTER_WORKFLOW_CANDIDATE_UNIT_EDIT_CONFLICT',id);touched.add(id);};
  for(const id of list(edits.unitIdsToRemove,'unitIdsToRemove')){
    touch(id);if(!units.delete(id))reject('ROSTER_WORKFLOW_CANDIDATE_UNIT_NOT_FOUND',id);
  }
  for(const unit of list(edits.unitsToUpsert,'unitsToUpsert')){
    touch(unit?.unitInstanceId);units.set(unit.unitInstanceId,clone(unit));
  }
  for(const patch of list(edits.unitUpgradeEdits,'unitUpgradeEdits')){
    if(!patch||Object.keys(patch).some(k=>!['unitInstanceId','add','remove'].includes(k)))
      reject('ROSTER_WORKFLOW_CANDIDATE_UPGRADE_EDIT_INVALID');
    touch(patch.unitInstanceId);const unit=units.get(patch.unitInstanceId);
    if(!unit)reject('ROSTER_WORKFLOW_CANDIDATE_UNIT_NOT_FOUND',patch.unitInstanceId);
    for(const selection of list(patch.remove,'upgrade.remove')){
      if(!selection||typeof selection.upgradeName!=='string'
        ||Object.keys(selection).some(k=>!['upgradeName','nominatedModelId'].includes(k)))
        reject('ROSTER_WORKFLOW_CANDIDATE_UPGRADE_SELECTION_INVALID',selection);
      const matches=unit.upgrades.map((u,i)=>({u,i})).filter(({u})=>u.upgradeName===selection.upgradeName
        &&(!Object.hasOwn(selection,'nominatedModelId')||u.nominatedModelId===selection.nominatedModelId));
      if(matches.length!==1)reject('ROSTER_WORKFLOW_CANDIDATE_UPGRADE_SELECTION_NOT_UNIQUE',{
        unitInstanceId:unit.unitInstanceId,selection,matchingSelections:matches.map(({u})=>u)});
      unit.upgrades.splice(matches[0].i,1);
    }
    unit.upgrades.push(...clone(list(patch.add,'upgrade.add')));
  }
  candidate.units=[...units.values()];
  if(edits.tacticalCardEdits!==undefined){
    const cards=edits.tacticalCardEdits;
    if(!cards||Object.keys(cards).some(k=>!['add','remove'].includes(k)))
      reject('ROSTER_WORKFLOW_CANDIDATE_CARD_EDITS_INVALID');
    for(const key of list(cards.remove,'cards.remove')){
      const i=candidate.tacticalCardRecordKeys.indexOf(key);
      if(typeof key!=='string'||!key||i<0)reject('ROSTER_WORKFLOW_CANDIDATE_CARD_REMOVE_INVALID',key);
      candidate.tacticalCardRecordKeys.splice(i,1);
    }
    for(const key of list(cards.add,'cards.add')){
      if(typeof key!=='string'||!key)
        reject('ROSTER_WORKFLOW_CANDIDATE_CARD_ADD_INVALID',key);
      candidate.tacticalCardRecordKeys.push(key);
    }
  }
  return candidate;
}
// A pre-Native adapter rejection is not a Rules verdict. Qualify only the exact
// saved, unexecuted request whose explicit card multiplicity is now representable.
// The existing product repair lane preserves old failures and limits continuation.
export function projectRosterCandidateMultiplicityRecoveryV1({work,failedResult,savedInput}){
  const failure=failedResult?.value,selected=savedInput?.inputs?.request?.value;
  if(work?.repairGeneration!==3||work.status!=='needs_model_choice'
    ||savedInput?.workId!==work.id||failure?.executed!==false||failure.nativeSuccess!==false
    ||!['builder_audit','builder_branches'].includes(failure.operation)
    ||!['ROSTER_WORKFLOW_CANDIDATE_CARD_ADD_INVALID','ROSTER_WORKFLOW_CANDIDATE_CARD_REMOVE_INVALID'].includes(failure.code)
    ||failure.queryRepair?.sourceContract!=='builder_candidate_delta_v1'
    ||selected?.operation!==failure.operation
    ||!isDeepStrictEqual(selected.args?.candidateEdits,failure.request?.candidateEdits))return null;
  const binding=selected.bindings?.find(b=>b.pointer==='/candidateInput');
  const source=binding?savedInput.inputs[binding.name]:null;
  const baseline=binding&&source?.status==='read'&&source.validity==='current'?source.value:selected.args?.candidateInput;
  if(!baseline||!isDeepStrictEqual(baseline,failure.request?.candidateInput))return null;
  try{projectRosterCandidateEditsV1(baseline,failure.request.candidateEdits);}catch{return null;}
  return {engineeringChangeId:'candidate_card_multiplicity_v1',
    reason:'The candidate-delta adapter incorrectly treated tactical cards as a unique set. Native and the formal Builder count each selected copy and alone enforce Unique limits/costs/slots. The exact saved baseline and author edits now project without altering any selection. Allow one continuation of this unexecuted audit only; keep all old failures, attempts and fees. No legality, strategy or Plan approval is implied.'};
}
export function createRosterWorkflowCandidateContextsV1({laboratory,builderPort,getCandidateInput,createCandidateLaboratory,projectCandidateScene}){
  const entries=new Map(),candidateRefs=new Map(),parent=laboratory.labDescriptor(),opponentKnowledge=laboratory.opponentKnowledge?.();
  const candidateKey=candidateInputHash=>hash({parent: laboratorySourceIdentity(parent),candidateInputHash});
  const available=typeof createCandidateLaboratory==='function'&&!!builderPort&&!!getCandidateInput;
  function get(ref){
    if(ref===null||ref===undefined||ref==='')return laboratory;
    const entry=typeof ref==='string'&&entries.get(ref);
    if(!entry)reject('ROSTER_WORKFLOW_CANDIDATE_CONTEXT_UNKNOWN',{contextRef:ref});
    return entry.laboratory;
  }
  async function create(args){
    if(!available)reject('ROSTER_WORKFLOW_CANDIDATE_CONTEXT_UNAVAILABLE');
    if(Object.keys(args).some(k=>!['candidateInput','candidateEdits','opponentCandidateInput','comparisonScene','branchId','executionScope'].includes(k))
      ||Object.hasOwn(args,'candidateInput')===Object.hasOwn(args,'candidateEdits'))
      reject('ROSTER_WORKFLOW_CANDIDATE_CONTEXT_INPUT_INVALID');
    if(args.comparisonScene&&(typeof projectCandidateScene!=='function'||!args.branchId||!args.executionScope
      ||Object.keys(args.comparisonScene).some(k=>!Object.hasOwn(PREGAME_SCENE_PROJECTION_ARGUMENTS_V1,k))))
      reject('ROSTER_WORKFLOW_CANDIDATE_SCENE_INPUT_INVALID');
    if(!args.comparisonScene&&(args.branchId!==undefined||args.executionScope!==undefined))
      reject('ROSTER_WORKFLOW_CANDIDATE_SCENE_INPUT_INVALID');
    if(args.comparisonScene)assertPregameSceneProjectionInputV1(args.comparisonScene);
    const current=await getCandidateInput(),candidate=Object.hasOwn(args,'candidateEdits')
      ?projectRosterCandidateEditsV1(current,args.candidateEdits):clone(args.candidateInput);
    if(!candidate||typeof candidate!=='object')reject('ROSTER_WORKFLOW_CANDIDATE_CONTEXT_INPUT_INVALID');
    const mismatch=['sideKey','factionRecordKey','scaleId','mineralBudget'].filter(k=>candidate[k]!==current[k]);
    if(mismatch.length)reject('ROSTER_WORKFLOW_CANDIDATE_CONTEXT_SCOPE_MISMATCH',{fields:mismatch});
    const audit=await builderPort.evaluateRosterCandidate(candidate);
    if(audit.schema!=='starcraft_tmg_army_builder_roster_verdict_v1'||audit.status!=='legal')
      reject('ROSTER_WORKFLOW_CANDIDATE_CONTEXT_NOT_LEGAL',{nativeAudit:audit});
    const opponentCandidateInput=args.opponentCandidateInput==null?null:clone(args.opponentCandidateInput);
    if(opponentCandidateInput){
      const knowledge=opponentKnowledge;
      if(!knowledge||knowledge.actualRosterKnown!==false)reject('ROSTER_KNOWN_OPPONENT_HYPOTHESIS_NOT_AUTHORIZED');
      if(opponentCandidateInput.sideKey==candidate.sideKey||!['player1','player2'].includes(opponentCandidateInput.sideKey)
        ||opponentCandidateInput.factionRecordKey!==knowledge.knownFactionRecordKey
        ||opponentCandidateInput.scaleId!==candidate.scaleId||opponentCandidateInput.mineralBudget!==candidate.mineralBudget)
        reject('ROSTER_OPPONENT_HYPOTHESIS_SCOPE_MISMATCH');
      const opponentAudit=await builderPort.evaluateRosterCandidate(opponentCandidateInput);
      if(opponentAudit.status!=='legal')reject('ROSTER_OPPONENT_HYPOTHESIS_ILLEGAL',{nativeAudit:opponentAudit});
    }
    const candidateInputHash=hash(candidate),key=candidateKey(opponentCandidateInput?hash({candidateInputHash,opponentCandidateInput}):candidateInputHash);
    const contextRef=candidateRefs.get(key)??'candidate:'+key;
    let entry=entries.get(contextRef);
    if(!entry){
      let alternative;
      try{alternative=await createCandidateLaboratory(candidate,{...(opponentCandidateInput?{opponentCandidateInput}:{})});}
      catch(error){
        const failure={operation:'candidate_context',code:'ROSTER_WORKFLOW_CANDIDATE_CONSTRUCTION_FAILED',
          detail:{stage:'candidate_source_construction',causeCode:error.code??error.message,
            acceptedAudit:audit,candidateInput:candidate}};
        throw Object.assign(Error(failure.code),{...failure,queryRepair:projectRosterCandidateFailureV1(failure)});
      }
      const receipt={schema:'roster_candidate_context_v1',resultStatus:'ok',contextRef,candidateInputHash,
        parentSourceStateHash:parent.sourceStateHash,candidateInput:candidate,audit,
        ...(opponentCandidateInput?{opponentCandidateInput,opponentCandidateInputHash:hash(opponentCandidateInput)}:{}),
        laboratory:alternative.labDescriptor(),mutatesFormalDraft:false,trainingTruth:false,
        evidenceScope:opponentKnowledge
          ?'Private own candidate with a hypothetical opponent. Actual enemy list remains UNKNOWN; no chosen scenario proves likely enemy composition, combat superiority, arrival or an accepted Plan.'
          :'Private model-selected roster source; same frozen product opponent/map/mission. Legality and source identity only, NOT combat superiority, arrival or an accepted Plan.'};
      entry={laboratory:alternative,receipt:clone(receipt)};entries.set(contextRef,entry);
      candidateRefs.set(key,contextRef);
    }
    const receipt=clone(entry.receipt);
    if(args.candidateEdits)receipt.candidateConstruction={kind:'explicit_current_draft_delta',
      sourceCandidateHash:hash(current),edits:clone(args.candidateEdits),hostSelectedChoices:false};
    if(args.comparisonScene)try{
      receipt.sceneProjectionReceipt=await projectCandidateScene({laboratory:entry.laboratory,contextRef,
        args:{...clone(args.comparisonScene),branchId:args.branchId,executionScope:clone(args.executionScope)}});
      receipt.evidenceScope+=' Explicit reference geometry projection attached; inspect its actual validity and limits. No combat or arrival is implied.';
    }catch(error){
      error.detail={...(error.detail&&typeof error.detail==='object'?error.detail:{reason:error.detail??null}),
        candidateReceipt:receipt};
      throw error;
    }
    return receipt;
  }
  async function restore(receipt){
    // Reconstruct the saved initial source, never replay a game action.
    if(!/^candidate:[a-f0-9]{64}$/u.test(receipt?.contextRef??'')
      ||receipt.parentSourceStateHash!==parent.sourceStateHash
      ||receipt.candidateInputHash!==hash(receipt.candidateInput))sourceChanged();
    if(receipt.opponentCandidateInput&&receipt.opponentCandidateInputHash!==hash(receipt.opponentCandidateInput))sourceChanged();
    const rebuilt=await create({candidateInput:receipt.candidateInput,...(receipt.opponentCandidateInput?{opponentCandidateInput:receipt.opponentCandidateInput}:{})});
    if(hash(laboratorySourceIdentity(rebuilt.laboratory))!==hash(laboratorySourceIdentity(receipt.laboratory)))
      sourceChanged();
    // Bind the saved handle to the same reconstructed source using the CURRENT
    // implementation. The old stored receipt is unchanged and still describes
    // its old version; a new create/query returns the current descriptor.
    entries.set(receipt.contextRef,{laboratory:get(rebuilt.contextRef),
      receipt:{...clone(rebuilt),contextRef:receipt.contextRef}});
    candidateRefs.set(candidateKey(receipt.opponentCandidateInput?hash({candidateInputHash:receipt.candidateInputHash,opponentCandidateInput:receipt.opponentCandidateInput}):receipt.candidateInputHash),receipt.contextRef);
    if(receipt.sceneProjectionReceipt)await get(receipt.contextRef).restoreProjectedScenarioBranch({
      receipt:receipt.sceneProjectionReceipt,base:{kind:'source'}});
  }
  async function candidateInput(ref){
    if(ref===null||ref===undefined||ref==='')return getCandidateInput?clone(await getCandidateInput()):null;
    get(ref);return clone(entries.get(ref).receipt.candidateInput);
  }
  return {available,get,create,restore,candidateInput};
}
