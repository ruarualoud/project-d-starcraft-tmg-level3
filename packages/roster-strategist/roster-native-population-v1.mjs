// Read-only aggregation of an exhaustively observed Native chance tree. No
// movement formula, solver, dice choice, synthetic failure or action replay.
import {isDeepStrictEqual} from 'node:util';
import {verifyPregameLabScenarioBranchReceiptV1} from './pregame-scene-laboratory-v1.mjs';
import {extractRosterNativeOutcomeMeasurementV1} from './roster-native-outcome-measurement-v1.mjs';
const copy=structuredClone;
const text=v=>typeof v==='string'&&v.trim().length>0;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const hashText=v=>typeof v==='string'&&/^[a-f0-9]{64}$/u.test(v);
export const ROSTER_NATIVE_POPULATION_METRICS_V1=Object.freeze({chargeSuccessProbability:{
  valueType:'number',unit:'probability',aggregation:'exhaustive_native_charge_policy',
  sourceOperations:['summarize_native_outcomes'],supportedInference:'difference_of_exhaustive_native_probabilities',
  observationDomain:{id:'single_target_charge_resolution',terminalBranches:['charge_succeeded','charge_failed'],
    description:'A complete finite Native chance tree from before the charge roll to one resolved single-target charge.'},
  endpoint:'Probability of Native charge_succeeded, conditional on the exact initial state and one declared action policy, with all fair independent fixed_roll_sequence outcomes covered.',
  availability:{requires:'Complete, connected Native receipt population, one selected action per parent state and one charge declaration/resolution on every path',
    absentMeans:'incomplete is unmeasured, never zero; no global route or policy optimality proof'},
}});
function invalid(detail){throw Object.assign(Error('ROSTER_NATIVE_POPULATION_ARGUMENT_INVALID'),{
  code:'ROSTER_NATIVE_POPULATION_ARGUMENT_INVALID',detail,dispatchOutcome:'not_dispatched',queryRepair:{
    correctable:true,originalQueryNotAnswered:true,sourceContract:'roster_native_population_v1',
    instruction:'Select saved Native receipts and their exact pre-roll root. Do not supply probabilities, weights, outcomes or invented branches. Missing outcomes require actual Native evidence; never fill them with failures.'}});}
export function validateRosterNativePopulationV1(spec){
  const fields=['rootStateHash','attackerUnitId','targetUnitId','sources'];
  if(!object(spec)||Object.keys(spec).some(k=>!fields.includes(k))||!hashText(spec.rootStateHash)
    ||!text(spec.attackerUnitId)||!text(spec.targetUnitId)||!Array.isArray(spec.sources)||!spec.sources.length)
    invalid({required:fields});
  for(const source of spec.sources){
    if(!object(source)||Object.keys(source).some(k=>!['fromEvidenceNumber','fromStepId'].includes(k))
      ||source.fromEvidenceNumber!==undefined&&(!Number.isSafeInteger(source.fromEvidenceNumber)||source.fromEvidenceNumber<0)
      ||source.fromStepId!==undefined&&typeof source.fromStepId!=='string'
      ||Number(source.fromEvidenceNumber>0)+Number(text(source.fromStepId))!==1)invalid({source});
  }
  return copy(spec);
}
export function describeRosterNativePopulationV1(){return {
  schema:'roster_native_population_v1',argumentsShape:{rootStateHash:'Exact saved pre-roll parent hash',
    attackerUnitId:'The charging unit',targetUnitId:'The single declared target unit',
    sources:'Array of {fromEvidenceNumber OR fromStepId}, selecting every Native transition from root through charge resolution'},
  hostOwned:['branch connectivity','dice coverage','probability weights','terminal measurements'],
  instruction:'Read-only: gather actual native_action receipts, including failures and reactions, for one bounded charge policy. At each random parent use the same selected action for every ordered die outcome; at a deterministic parent select one action. Native decides each legal successor. Stop each branch at charge resolution. All sources must share the actual source/runtime/army/context and form one connected acyclic tree (merged identical states are allowed). No filtering to successful charges, hand-written success flags, unknown-as-failure or renormalization of incomplete samples. No new Native actions, best-policy search, IMPACT expectation or strategy approval is performed here. For large trees report a capability/cost limitation instead of fabricating completeness.'};}
const gcd=(a,b)=>{while(b){[a,b]=[b,a%b];}return a;};
const fraction=(n,d=1n)=>{const g=gcd(n,d);return {n:n/g,d:d/g};};
const add=(a,b)=>fraction(a.n*b.d+b.n*a.d,a.d*b.d);
const divide=(a,n)=>fraction(a.n,a.d*n);
const encode=a=>({numerator:String(a.n),denominator:String(a.d)});
export function summarizeRosterNativePopulationV1({spec,sources,binding=null}){
  validateRosterNativePopulationV1(spec);
  const base={schema:'roster_native_population_receipt_v1',version:1,specification:copy(spec),
    trainingTruth:false,realMatchHistory:false,nativeTransitionsExecuted:0,providerCalls:0,
    strategyApprovalGranted:false,controlledCausality:'not_assessed',
    probabilityScope:'conditional_on_exact_root_and_selected_policy_not_global_success_or_optimality',
    randomLaw:'independent_uniform_faces_from_native_fixed_roll_sequence'};
  const unresolved=(reason,diagnostic={})=>({...base,resultStatus:'unknown',unknownReason:reason,
    measurement:null,diagnostic:copy(diagnostic)});
  const stop=(reason,diagnostic={})=>{throw {populationDiagnostic:true,reason,diagnostic};};
  try{
    if(!Array.isArray(sources)||sources.length!==spec.sources.length)stop('native_population_source_count_mismatch');
    const rows=[],seen=new Set(),byParent=new Map();let identity=null;
    for(const [index,source]of sources.entries()){
      const body=source?.value,receipt=body?.receipt;
      if(body?.operation!=='native_action'||body.status!=='completed'||receipt?.resultStatus!=='ok'
        ||receipt.branchKind!=='native_action'||receipt.nativeTransitionsApplied!==1)
        stop('native_population_source_not_completed',{index});
      try{verifyPregameLabScenarioBranchReceiptV1(receipt);}catch{stop('native_population_receipt_invalid',{index});}
      if(receipt.parentStateHash!==receipt.baseStateHash||!Array.isArray(receipt.nativeEvents)
        ||!Array.isArray(receipt.stateChanges))stop('native_population_transition_invalid',{index});
      if(seen.has(receipt.receiptHash))stop('native_population_duplicate_source',{index});
      seen.add(receipt.receiptHash);
      const id={source:receipt.sourceStateHash,rules:receipt.rulesRuntimeHash,builder:receipt.builderBundleHash,
        context:body.contextRef??null};
      if(identity&&!isDeepStrictEqual(identity,id))stop('native_population_source_identity_mismatch',{index});
      identity??=id;
      if(binding){const origin=body.experimentOrigin?.comparisonBinding;
        if(origin?.purposeSource?.artifactRef!==binding.purposeSource?.artifactRef
          ||![binding.arm,'shared'].includes(origin?.arm))stop('native_population_design_or_arm_mismatch',{index});}
      const row={receipt,index,sourceRef:source.resultRef??source.artifactRef??null};rows.push(row);
      const list=byParent.get(receipt.parentStateHash)??[];list.push(row);byParent.set(receipt.parentStateHash,list);
    }
    const used=new Set(),memo=new Map(),visiting=new Set(),chanceNodes=[],terminalRows=[];
    // Evaluate the DAG once per state/declaration count; shared successors keep
    // their separate probability mass without treating states as equiprobable.
    function visit(state,declarations){
      const key=state+':'+declarations;
      if(visiting.has(state))stop('native_population_cycle',{state});
      if(memo.has(key))return memo.get(key);
      const edges=byParent.get(state);
      if(!edges?.length)stop('native_population_unresolved_leaf',{state});
      visiting.add(state);
      const first=edges[0].receipt,action=first.nativeAction,chance=first.nativeChanceContract??null;
      if(!action)stop('native_population_action_missing',{state});
      for(const {receipt}of edges){
        if(!isDeepStrictEqual(receipt.nativeAction,action)
          ||!isDeepStrictEqual(receipt.nativeChanceContract??null,chance))
          stop('native_population_policy_ambiguous',{state});
        if(!isDeepStrictEqual(receipt.nativeAction.chance??null,chance))stop('native_population_chance_contract_mismatch',{state});
      }
      let denominator=1n;
      if(chance){
        if(chance.kind!=='fixed_roll_sequence'||!Number.isSafeInteger(chance.faces)||chance.faces<2
          ||!Number.isSafeInteger(chance.count)||chance.count<1)stop('native_population_random_law_unsupported',{state,chance});
        // Avoid allocating faces^count strings, especially for large volleys.
        // Cardinality + range + uniqueness proves the finite Cartesian cover.
        let possible=1n;
        for(let i=0;i<chance.count;i++){possible*=BigInt(chance.faces);
          if(possible>BigInt(edges.length)&&i<chance.count-1)
            stop('native_population_incomplete_chance_coverage',{state,observedOutcomeCount:edges.length,
              expectedOutcomeCountExpression:`${chance.faces}^${chance.count}`,expectedOutcomeCountAtLeast:String(possible)});
        }
        denominator=possible;const outcomes=new Set();let choicePremise;
        for(const {receipt}of edges){
          const assumption=receipt.nativeOutcomeAssumption,dice=assumption?.chanceReveals;
          if(receipt.conditionalOnOutcome!==true||!Array.isArray(dice)||dice.length!==chance.count)
            stop('native_population_dice_missing',{state});
          const values=dice.map(d=>typeof d==='number'?d:d?.faces===chance.faces?d.outcome:null);
          if(values.some(n=>!Number.isSafeInteger(n)||n<1||n>chance.faces))stop('native_population_dice_invalid',{state});
          const outcome=values.join(',');if(outcomes.has(outcome))stop('native_population_duplicate_outcome',{state,outcome});
          outcomes.add(outcome);
          const {chanceReveals,...choice}=assumption;
          if(choicePremise&&!isDeepStrictEqual(choicePremise,choice))stop('native_population_nonchance_choice_changed',{state});
          choicePremise??=choice;
        }
        if(BigInt(outcomes.size)!==denominator)stop('native_population_incomplete_chance_coverage',{
          state,expectedOutcomeCount:String(denominator),observedOutcomeCount:outcomes.size});
        chanceNodes.push({state,faces:chance.faces,count:chance.count,outcomeCount:String(denominator)});
      }else if(edges.length!==1||first.nativeOutcomeAssumption!==undefined)
        stop('native_population_deterministic_policy_ambiguous',{state});
      let total=fraction(0n);
      for(const {receipt,index,sourceRef}of edges){
        used.add(index);
        const events=receipt.nativeEvents;
        const declared=events.filter(e=>e.type==='charge_declared_and_rolled');
        if(declared.some(e=>e.pieceId!==spec.attackerUnitId)||declared.length>1)
          stop('native_population_unrelated_charge',{index});
        const count=declarations+declared.length;
        if(count>1)stop('native_population_repeated_charge',{index});
        const terminals=events.filter(e=>['charge_succeeded','charge_failed'].includes(e.type));
        let probability;
        if(terminals.length){
          if(count!==1||terminals.length!==1)stop('native_population_missing_or_ambiguous_declaration',{index});
          const observed=extractRosterNativeOutcomeMeasurementV1({receipt,selector:spec,metric:'chargeSucceeded'});
          if(observed.status!=='observed')stop('native_population_terminal_invalid',{index,observation:observed});
          if(byParent.has(receipt.branchStateHash))stop('native_population_work_after_endpoint',{index});
          terminalRows.push({sourceIndex:index,sourceRef,receiptHash:receipt.receiptHash,
            parentStateHash:receipt.parentStateHash,branchStateHash:receipt.branchStateHash,
            chargeSucceeded:observed.value,pointer:observed.pointer});
          probability=fraction(observed.value?1n:0n);
        }else probability=visit(receipt.branchStateHash,count);
        total=add(total,divide(probability,denominator));
      }
      visiting.delete(state);memo.set(key,total);return total;
    }
    const result=visit(spec.rootStateHash,0);
    if(used.size!==rows.length)stop('native_population_disconnected_sources',{
      unusedIndices:rows.filter(r=>!used.has(r.index)).map(r=>r.index)});
    if(!chanceNodes.length)stop('native_population_charge_randomness_not_covered');
    // Exact rational is authoritative; the double is only for existing metric
    // comparisons. Refuse unrepresentable conversions rather than publish NaN.
    const value=Number(result.n)/Number(result.d);
    if(!Number.isFinite(value)||value<0||value>1)stop('native_population_numeric_capacity');
    return {...base,resultStatus:'ok',unknownReason:null,rootStateHash:spec.rootStateHash,sourceIdentity:identity,
      complete:true,sourceCount:rows.length,chanceNodes,terminalObservations:terminalRows,
      measurement:{id:'chargeSuccessProbability',value,exactFraction:encode(result),unit:'probability',
        attackerUnitId:spec.attackerUnitId,targetUnitId:spec.targetUnitId,weaponName:null},
      actionPolicyVerified:'one_native_action_per_saved_parent_not_strategic_optimality',
      sourceRefs:rows.map(r=>({index:r.index,ref:r.sourceRef,receiptHash:r.receipt.receiptHash}))};
  }catch(error){if(error.populationDiagnostic)return unresolved(error.reason,error.diagnostic);throw error;}
}
