// Representation Adapter, not a formation planner or second Rules validator.
// One explicitly supplied objective/region can represent a one-item list;
// static Native uses lists. Canonicalize the collection, then use its SAME
// source validator. Never replace intent, weight, targets, anchors or extra keys.
import {normalizeExplicitStaticFormationObjectivesV1} from '../online-agent-session/formation-intent-contract-v1.mjs';
import {prepareStaticFormationAnchorSpaceV1} from '../online-agent-session/static-formation-anchor-space-v1.mjs';
export const ROSTER_STATIC_INTENT_COLLECTION_INPUT_V1=Object.freeze({
  queryKind:'space.solve_static_formation',acceptedForms:['single_object','array_of_objects'],
  canonicalNativeForm:'array_of_objects',fields:['formationObjectives','jointUnits[].formationObjectives','anchorRegions','jointUnits[].anchorRegions'],
  orderedGroup:'Alternatively omit top-level unitId/placement/intent fields and provide the complete ordered jointUnits list. Its first entry becomes the Native primary unit, the rest remain additional units in the same order. Budgets and every explicit unit field are preserved; no host-selected primary, position or intent.',
  instruction:'A single objective or anchor-region object is preserved as a one-element list. Native kind/weight/target/region validation is unchanged. No intent ranking, unsupported-kind fallback, changed region bounds/step/preferredAnchor or additional strategy is applied.'});
const unitFields=['unitId','anchors','anchorRegions','formationObjectives','modelSpreadInches'];
export function projectRosterJointFormationEnvelopeV1(input){
  if(!input||Object.hasOwn(input,'unitId')||!Array.isArray(input.jointUnits)||!input.jointUnits.length)
    return {input,normalizations:[]};
  const first=input.jointUnits[0];
  if(!first||typeof first!=='object'||Array.isArray(first)||typeof first.unitId!=='string'||!first.unitId.trim()
    ||Object.keys(first).some(key=>!unitFields.includes(key))
    ||unitFields.slice(1).some(key=>Object.hasOwn(input,key)))
    throw Object.assign(Error('ROSTER_JOINT_FORMATION_ENVELOPE_AMBIGUOUS'),{
      code:'ROSTER_JOINT_FORMATION_ENVELOPE_AMBIGUOUS',
      detail:{instruction:'Use either an explicit primary unit and additional jointUnits, or one complete ordered jointUnits list without competing top-level placement/intent fields. No fields have been dropped or choices inferred.'}});
  const canonical={...structuredClone(input),...structuredClone(first),
    jointUnits:structuredClone(input.jointUnits.slice(1))};
  return {input:canonical,normalizations:[{pointer:'/jointUnits',priorValue:structuredClone(input.jointUnits),
    value:{primary:structuredClone(first),additional:structuredClone(canonical.jointUnits)},
    rule:'ordered_joint_group_envelope_v1'}]};
}
export function normalizeRosterFormationQueryInputV1(args){
  if(args.queryKind!=='space.solve_static_formation'||typeof args.argumentsJson!=='string')return {args,normalizations:[]};
  let input;try{input=JSON.parse(args.argumentsJson);}catch{return {args,normalizations:[]};}
  if(!input||typeof input!=='object'||Array.isArray(input))return {args,normalizations:[]};
  const group=projectRosterJointFormationEnvelopeV1(input);
  input=group.input;
  const normalizations=[...group.normalizations];
  const normalize=(unit,prefix)=>{
    if(!unit||typeof unit!=='object')return;
    const collection=(field,validate)=>{
      if(!Object.hasOwn(unit,field))return;
      const value=unit[field],pointer=prefix+'/'+field;
      if(value&&typeof value==='object'&&!Array.isArray(value)){
        unit[field]=[value];normalizations.push({pointer,priorValue:structuredClone(value),value:structuredClone([value]),
          rule:'singleton_collection_v1'});
      }
      // Validate but do not copy defaults/deduplication into submitted data.
      // Neither collection syntax nor this Adapter creates a new choice.
      try{validate();}
      catch(error){error.detail={pointer,message:error.message,input:structuredClone(unit[field])};throw error;}
    };
    collection('formationObjectives',()=>normalizeExplicitStaticFormationObjectivesV1(unit.formationObjectives));
    collection('anchorRegions',()=>prepareStaticFormationAnchorSpaceV1(unit));
  };
  normalize(input,'');
  if(Array.isArray(input.jointUnits))input.jointUnits.forEach((unit,index)=>normalize(unit,`/jointUnits/${index}`));
  return {args:normalizations.length?{...args,argumentsJson:JSON.stringify(input)}:args,normalizations};
}
