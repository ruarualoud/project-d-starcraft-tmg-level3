import { hashStarcraftTmgContract as hash } from '../authoritative-engine/referee-crypto-v1.mjs';

export const ROSTER_FIRST_AUTHOR_INPUT_ENCODING_V1 = 'same_request_evidence_v2';

const providerSource=request=>({promptPack:request.promptPack,promptNodes:request.promptNodes,
  userMessage:request.userMessage,responseContract:request.responseContract});

// Encoding only. No summarization, relevance judgement, field deletion or
// archive dependency. References resolve within this exact JSON document.
export function internRosterTeachPromptEvidenceV1(projected, options = {}) {
  const locations = new Map();
  const pointerKey = key => String(key).replaceAll('~', '~0').replaceAll('/', '~1');
  function intern(value, pointer) {
    if (!value || typeof value !== 'object') return value;
    const serialized = JSON.stringify(value);
    const compactToolProof = options.compactToolProofScopes && pointer.endsWith('/proofScope');
    if (serialized.length > 2048 || compactToolProof && serialized.length > 512) {
      const contentHash = hash(value);
      if (locations.has(contentHash)) return {
        kind: options.referenceKind || 'same_prompt_evidence_reference_v1',
        targetJsonPointer: locations.get(contentHash), contentHash,
        meaning: options.meaning || 'Exactly the same full value already present at this JSON Pointer in this prompt; not an archive lookup or new evidence.',
      };
      locations.set(contentHash, pointer);
    }
    return Array.isArray(value) ? value.map((v, i) => intern(v, `${pointer}/${i}`))
      : Object.fromEntries(Object.entries(value).map(([k, v]) => [k, intern(v, `${pointer}/${pointerKey(k)}`)]));
  }
  return intern(projected, '');
}

export function encodeRosterProviderInputV1(request, version = request.providerInputEncodingVersion || 'same_request_evidence_v1') {
  const source = providerSource(request);
  const original = JSON.stringify(source);
  if (version === 'verbatim_v1') return { input: original, version,
    beforeCharacters: original.length, afterCharacters: original.length };
  if (version !== 'same_request_evidence_v1' && version !== ROSTER_FIRST_AUTHOR_INPUT_ENCODING_V1)
    throw Object.assign(Error('ROSTER_REQUEST_ENCODING_UNKNOWN'),
    { code: 'ROSTER_REQUEST_ENCODING_UNKNOWN' });
  const encoded = internRosterTeachPromptEvidenceV1(source, {
    compactToolProofScopes: version === ROSTER_FIRST_AUTHOR_INPUT_ENCODING_V1,
    referenceKind: 'same_request_evidence_reference_v1',
    meaning: 'Exactly the same full value at targetJsonPointer relative to the ROOT of this request input JSON. Resolve it in this input, not in a nested content node or an external archive. All unique values are preserved.',
  });
  const input = JSON.stringify({ ...encoded, inputEncoding: { version,
    referenceKind: 'same_request_evidence_reference_v1', referenceRoot: 'this input JSON object',
    uniqueValuesOmitted: false, existingNestedReferenceScopesUnchanged: true } });
  return { input, version, beforeCharacters: original.length, afterCharacters: input.length };
}

// An exact reference copied from this request is an explicit model selection of
// an unchanged value, not a missing field to be guessed. Decode transport only;
// the caller still applies its full schema, ownership, source and Rules checks.
export function projectRosterProviderOutputReferencesV1({request,output}){
  const kind='same_request_evidence_reference_v1',handles=[];
  const visit=(value,fn)=>{if(!value||typeof value!=='object')return;
    if(value.kind===kind){fn(value);return;}for(const child of Object.values(value))visit(child,fn);};
  visit(output,handle=>handles.push(handle));
  if(!handles.length)return {output,projection:[],errors:[]};
  const encoded=JSON.parse(encodeRosterProviderInputV1(request).input),issued=new Set();
  visit(encoded,handle=>issued.add(hash(handle)));
  const source=providerSource(request),projection=[],errors=[];
  const key=value=>String(value).replaceAll('~','~0').replaceAll('/','~1');
  const expand=(value,path)=>{
    if(!value||typeof value!=='object')return value;
    if(value.kind===kind){
      let reason=issued.has(hash(value))?null:'not_issued_by_this_request',target=source;
      if(!reason){
        for(const part of value.targetJsonPointer===''?[]:value.targetJsonPointer.slice(1).split('/')){
          const name=part.replaceAll('~1','/').replaceAll('~0','~');
          if(!target||typeof target!=='object'||!Object.hasOwn(target,name)){reason='source_pointer_missing';break;}
          target=target[name];
        }
        if(!reason&&hash(target)!==value.contentHash)reason='source_content_mismatch';
      }
      if(reason){errors.push({code:'roster_request_reference_invalid',path,reason,
        targetJsonPointer:value.targetJsonPointer??null,
        instruction:'Use only an intact reference actually issued in this same request, or supply the intended full value. No cross-request lookup, inference or source approval is implied.'});return structuredClone(value);}
      projection.push({to:path,from:value.targetJsonPointer,contentHash:value.contentHash,rule:kind,
        source:'exact_original_provider_request',semanticChoiceChanged:false});
      // The pre-encoding source already owns nested values. Do not interpret its
      // historical/nested-scope references as newly issued output operations.
      return structuredClone(target);
    }
    return Array.isArray(value)?value.map((child,index)=>expand(child,`${path}/${index}`)):
      Object.fromEntries(Object.entries(value).map(([name,child])=>[name,expand(child,`${path}/${key(name)}`)]));
  };
  return {output:expand(output,''),projection,errors};
}
