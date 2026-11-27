// step.kind is a Host transport discriminator. The model owns operation and
// every semantic field; only an exact, unique schema match may derive the tag.
import {validateStarcraftTmgHostJsonSchemaValueV1 as validate} from '../structured-generation/output-contract-registry-v1.mjs';
const clone=structuredClone;
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const isStep=s=>s?.type==='object'&&(s.properties?.stepId||s.properties?.parameters||s.properties?.argumentsJson||s.properties?.nativeSelection||s.properties?.contextSource||s.properties?.sceneSource)&&Array.isArray(s.properties?.operation?.enum)
  &&s.properties?.kind?.enum?.length===1;
const matchesSchema=(schema,value)=>schema.type==='null'?value===null:validate({type:'object',additionalProperties:false,properties:{value:schema},required:['value']},{value}).ok;
const withoutKind=s=>{const copy=clone(s);delete copy.properties.kind;copy.required=copy.required.filter(k=>k!=='kind');return copy;};
// In a generated semantic-parameter schema nullable members represent omitted
// optional source fields. Do not fill required selections or outer step fields.
function optionalParameterPlaceholders(schema,value){
  if(schema.anyOf){
    const variants=schema.anyOf.filter(s=>{
      if(s.type==='object')return object(value)&&Object.entries(s.properties??{}).every(([k,p])=>
        !p.enum||!s.required?.includes(k)||p.enum.includes(value[k]));
      if(s.type==='array')return Array.isArray(value);
      return s.type==='null'?value===null:s.type===typeof value;
    });
    return variants.length===1?optionalParameterPlaceholders(variants[0],value):clone(value);
  }
  if(schema.type==='array'&&Array.isArray(value))return value.map(v=>optionalParameterPlaceholders(schema.items,v));
  if(schema.type!=='object'||!object(value))return clone(value);
  const next=clone(value);
  for(const [key,field]of Object.entries(schema.properties??{})){
    if(Object.hasOwn(next,key))next[key]=optionalParameterPlaceholders(field,next[key]);
    else if(field.anyOf?.some(s=>s.type==='null'))next[key]=null;
  }
  return next;
}
export function rosterHostStepKindWireSchemaV1(schema){
  if(Array.isArray(schema))return schema.map(rosterHostStepKindWireSchemaV1);
  if(!object(schema))return schema;
  const source=isStep(schema)?withoutKind(schema):schema;
  return Object.fromEntries(Object.entries(source).map(([k,v])=>[k,rosterHostStepKindWireSchemaV1(v)]));
}
export function projectRosterHostStepKindsV1(schema,output){
  const projection=[],errors=[];
  function visit(s,value,path){
    if(value===null||value===undefined||!s)return clone(value);
    const variants=s.anyOf??[s],steps=variants.filter(isStep);
    if(steps.length&&object(value)){
      let bare=clone(value);delete bare.kind;
      // No-argument operations have no parameters slot. An explicitly empty
      // object is inert only when its removal yields one complete valid variant.
      // Never drop nonempty/unknown values or required semantic parameters.
      if(object(bare.parameters)&&Object.keys(bare.parameters).length===0){
        const next=clone(bare);delete next.parameters;
        const candidates=steps.filter(s=>s.properties.operation.enum.includes(value.operation)
          &&!Object.hasOwn(s.properties,'parameters')&&matchesSchema(withoutKind(s),next));
        if(candidates.length===1){bare=next;
          projection.push({rule:'inactive_operation_parameters_v1',path:path+'/parameters',operation:value.operation,
            semanticFieldsChanged:false,nativeExecuted:false});}
      }
      // Old transport occasionally wraps NEW semantic fields in a JSON string.
      // Accept only an exact unique source-schema match; Native left/right JSON,
      // nonempty bindings, conflicting parameter channels and unknown fields are
      // not guessed, dropped or translated here.
      if(!Object.hasOwn(bare,'parameters')&&typeof bare.argumentsJson==='string'
        &&(!Object.hasOwn(bare,'bindings')||Array.isArray(bare.bindings)&&bare.bindings.length===0)){
        let parsed;try{parsed=JSON.parse(bare.argumentsJson);}catch{}
        if(object(parsed)){
          const candidates=steps.filter(s=>s.properties.operation.enum.includes(value.operation)&&s.properties.parameters)
            .map(s=>{const next=clone(bare);delete next.argumentsJson;delete next.bindings;
              next.parameters=optionalParameterPlaceholders(s.properties.parameters,parsed);
              return {schema:s,value:next};}).filter(c=>matchesSchema(withoutKind(c.schema),c.value));
          if(candidates.length===1){bare=candidates[0].value;
            projection.push({rule:'source_semantic_parameters_unwrapped_v1',path,operation:value.operation,
              semanticFieldsChanged:false,nativeExecuted:false});}
        }
      }
      // Empty legacy transport fields do not compete with explicit semantic
      // values. Remove them only if one COMPLETE source variant then matches.
      if(object(bare.parameters)&&(!Object.hasOwn(bare,'argumentsJson')||bare.argumentsJson==='')
        &&(!Object.hasOwn(bare,'bindings')||Array.isArray(bare.bindings)&&bare.bindings.length===0)){
        const candidates=steps.filter(s=>s.properties.operation.enum.includes(value.operation)&&s.properties.parameters)
          .map(s=>{const next=clone(bare);delete next.argumentsJson;delete next.bindings;next.parameters=optionalParameterPlaceholders(s.properties.parameters,bare.parameters);return {schema:s,value:next};})
          .filter(c=>matchesSchema(withoutKind(c.schema),c.value));
        if(candidates.length===1&&(Object.hasOwn(bare,'argumentsJson')||Object.hasOwn(bare,'bindings'))){bare=candidates[0].value;projection.push({rule:'empty_legacy_transport_beside_semantic_parameters_v1',path,operation:value.operation,semanticFieldsChanged:false,nativeExecuted:false});}
      }
      // Typed semantic input and an old JSON wrapper use the same optional
      // source-field policy. Missing nullable placeholders carry no choice.
      // Accept only a complete, unique variant; never fill a required selection.
      if(object(bare.parameters)){
        const candidates=steps.filter(s=>s.properties.operation.enum.includes(value.operation)&&s.properties.parameters)
          .map(s=>({schema:s,value:{...clone(bare),parameters:optionalParameterPlaceholders(s.properties.parameters,bare.parameters)}}))
          .filter(c=>matchesSchema(withoutKind(c.schema),c.value));
        if(candidates.length===1&&JSON.stringify(candidates[0].value.parameters)!==JSON.stringify(bare.parameters)){
          bare=candidates[0].value;
          projection.push({rule:'source_optional_parameter_placeholders_v1',path:path+'/parameters',operation:value.operation,
            semanticFieldsChanged:false,nativeExecuted:false});
        }
      }
      const matches=steps.filter(v=>v.properties.operation.enum.includes(value.operation)&&matchesSchema(withoutKind(v),bare));
      if(matches.length!==1){
        const candidates=steps.filter(v=>v.properties.operation.enum.includes(value.operation));
        if(candidates.length)errors.push({code:'operation_step_parameters_invalid',path,operation:value.operation,
          alternatives:candidates.map(v=>{const shape=withoutKind(v),checked=validate({type:'object',additionalProperties:false,properties:{value:shape},required:['value']},{value:bare});
            return {required:shape.required,fields:Object.keys(shape.properties),issues:checked.issues.map(i=>({...i,path:i.path.replace(/^\$\.value/u,path)}))};}),
          instruction:'Host owns step.kind; do not supply an internal tag. Use the operation source-defined parameters and select its actual sceneSource. Read an existing source if its identity is not offered. Correct only the failing step; preserved method/successful sources are not to be regenerated.'});
        return clone(value);
      }
      const kind=matches[0].properties.kind.enum[0];
      if(value.kind!==kind)projection.push({rule:'host_step_kind_from_unique_schema_v1',path:path+'/kind',
        original:value.kind??null,value:kind,operation:value.operation,semanticFieldsChanged:false,nativeExecuted:false});
      return {...bare,kind};
    }
    if(s.anyOf){
      let candidates=s.anyOf.filter(v=>v.properties?.kind?.enum?.includes(value?.kind));
      if(candidates.length!==1)candidates=s.anyOf.filter(v=>matchesSchema(v,value));
      if(candidates.length!==1)candidates=s.anyOf.filter(v=>v.type===(Array.isArray(value)?'array':object(value)?'object':typeof value));
      return candidates.length===1?visit(candidates[0],value,path):clone(value);
    }
    if(s.type==='array'&&Array.isArray(value))return value.map((v,i)=>visit(s.items,v,path+'/'+i));
    if(s.type==='object'&&object(value))return Object.fromEntries(Object.entries(value)
      .map(([k,v])=>[k,s.properties?.[k]?visit(s.properties[k],v,path+'/'+k):clone(v)]));
    return clone(value);
  }
  const projected=visit(schema,output,'');return {output:projected,projection,errors};
}
export function rosterHostStepKindInstructionV1(instruction){
  return instruction
    .replace(/Each step has a wire kind: .*?For native_selection return nativeSelection instead of argumentsJson\/bindings\./,
      'For operation=native_action return nativeSelection instead of argumentsJson/bindings.')
    .replace(' The step kind is only a wire discriminator, not part of tool arguments.','')
    .replace(/Use kind="spatial_query" for spatial, "scene_inspection" for inspect, "scene_tool" for the other listed operations\./g,'')
    .replace('For unmigrated queries use their legacy step kind. For migrated operations choose the *_parameters kind in this response schema and provide semantic parameters; Host handles the transport fields.',
      'Select operation and its source-defined semantic parameters; Host handles transport fields.')
    .replace('select the corresponding *_parameters step kind and fill parameters directly with semantic values from its schema.',
      'fill parameters directly with semantic values from the operation schema.')
    +' Omit step.kind: Host derives that internal discriminator from your explicit operation and the exact parameter shape. command.kind, selection.kind and other semantic choices remain yours. Unknown or conflicting parameters are not removed, inferred or legalized.';
}
