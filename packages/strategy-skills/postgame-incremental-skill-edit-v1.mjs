import { clone, fail, freeze, hash } from '../skill-production/common.mjs';

export const POSTGAME_INCREMENTAL_EDIT_V1 = 'semantic_section_patches_v1';
export const POSTGAME_INCREMENTAL_EDIT_V2 = 'semantic_value_patches_v2';

function texts(sectionHandle, value) {
 const rows=[];
 function visit(node,path,label){
  if(typeof node==='string')rows.push({handle:sectionHandle+':text-'+(rows.length+1),path,label,text:node});
  else if(Array.isArray(node))node.forEach((v,i)=>visit(v,[...path,i],label+'['+i+']'));
  else if(node&&typeof node==='object')for(const [k,v]of Object.entries(node))visit(v,[...path,k],label+'.'+k);
 }
 visit(value,[],sectionHandle);return rows;
}

const reject = (suffix, details) => fail('POSTGAME_WIKI_CHOICE_PATCH_' + suffix, details);

// Handles select existing advisory arrays; they are never caller-supplied paths.
// Traversal order is stable for the exact frozen Skill used by this request.
function arrays(sectionHandle, value) {
  const rows = [];
  function visit(node, path, label) {
    if (Array.isArray(node)) {
      rows.push({ handle: sectionHandle + ':array-' + (rows.length + 1), label, path });
      node.forEach((item, index) => visit(item, [...path, index], label + '[' + index + ']'));
    } else if (node && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) visit(child, [...path, key], label + '.' + key);
    }
  }
  visit(value, [], sectionHandle);
  return rows;
}

export function describePostgameIncrementalTargetsV1(material) {
  return material.editableSections.map(section => ({
    sectionHandle: section.handle,
    textTargets: texts(section.handle, material.content[section.handle] ?? []).map(({handle,label,text})=>({handle,label,text})),
    appendTargets: arrays(section.handle, material.content[section.handle] ?? [])
      .map(({ handle, label }) => ({ handle, label })),
  }));
}

function matches(value, target) {
  const found = [];
  function visit(node, path) {
    if (typeof node === 'string') {
      for (let from = 0; from <= node.length;) {
        const at = node.indexOf(target, from);
        if (at < 0) break;
        found.push({ path, at, text: node });
        from = at + 1; // Overlapping matches are ambiguous too.
      }
    } else if (Array.isArray(node)) node.forEach((child, i) => visit(child, [...path, i]));
    else if (node && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) visit(child, [...path, key]);
    }
  }
  visit(value, []);
  return found;
}

export function compilePostgameIncrementalEditV1({ material, edit, editMode }) {
  const section = material.editableSections.find(s => s.handle === edit.sectionHandle);
  if (!section) reject('SECTION_UNKNOWN', { sectionHandle: edit.sectionHandle });
  const hasValue = Object.hasOwn(edit, 'value');
  const hasPatches = Object.hasOwn(edit, 'patches');
  if (hasValue && hasPatches) reject('CONFLICTING_FORMATS');
  if (!hasPatches) {
    // Only old saved requests can accept a whole section from the model.
    if ([POSTGAME_INCREMENTAL_EDIT_V1, POSTGAME_INCREMENTAL_EDIT_V2].includes(editMode)) reject('INCREMENTAL_REQUIRED');
    if (!Array.isArray(edit.value)) reject('VALUE_INVALID');
    return { value: clone(edit.value) };
  }
  if (!Array.isArray(edit.patches) || !edit.patches.length) reject('OPERATIONS_REQUIRED');
  const original = material.content[section.handle] ?? [];
  if (!Array.isArray(original)) reject('SECTION_NOT_ARRAY');
  const value = clone(original);
  const destinations = new Map(arrays(section.handle, original).map(a => [a.handle, a]));
  const textDestinations = new Map(texts(section.handle, original).map(t => [t.handle,t]));
  const applied = [];
  for (const [index, patch] of edit.patches.entries()) {
    if (!patch || typeof patch !== 'object') reject('OPERATION_INVALID', { index });
    if (patch.op === 'replace_value' && editMode === POSTGAME_INCREMENTAL_EDIT_V2) {
      const destination=textDestinations.get(patch.textHandle);
      if(!destination)reject('TEXT_HANDLE_UNKNOWN',{index,textHandle:patch.textHandle});
      if(typeof patch.content!=='string'||Object.hasOwn(patch,'target')||Object.hasOwn(patch,'arrayHandle'))reject('OPERATION_INVALID',{index});
      let parent=value;for(const key of destination.path.slice(0,-1))parent=parent[key];
      parent[destination.path.at(-1)]=patch.content;
      applied.push({index,op:patch.op,destination:destination.label});continue;
    }
    if (patch.op === 'append') {
      const destination = destinations.get(patch.arrayHandle);
      if (!destination) reject('ARRAY_UNKNOWN', { index, arrayHandle: patch.arrayHandle });
      if (!Array.isArray(patch.content) || !patch.content.length || Object.hasOwn(patch, 'target')) {
        reject('APPEND_CONTENT_INVALID', { index });
      }
      let array = value;
      for (const key of destination.path) array = array[key];
      array.push(...clone(patch.content));
      applied.push({ index, op: patch.op, destination: destination.label });
      continue;
    }
    if (!['replace', 'insert_after'].includes(patch.op)
      || typeof patch.target !== 'string' || !patch.target.length
      || typeof patch.content !== 'string' || Object.hasOwn(patch, 'arrayHandle')) {
      reject('OPERATION_INVALID', { index });
    }
    const hits = matches(value, patch.target);
    if (hits.length !== 1) reject(hits.length ? 'TARGET_AMBIGUOUS' : 'TARGET_NOT_FOUND',
      { index, sectionHandle: section.handle, target: patch.target, matchCount: hits.length });
    const hit = hits[0];
    let parent = value;
    for (const key of hit.path.slice(0, -1)) parent = parent[key];
    const start = hit.at + (patch.op === 'insert_after' ? patch.target.length : 0);
    const end = hit.at + patch.target.length;
    parent[hit.path.at(-1)] = hit.text.slice(0, start) + patch.content + hit.text.slice(end);
    applied.push({ index, op: patch.op, destination: [section.handle, ...hit.path].join('.') });
  }
  return freeze({ value, incrementalEdit: {
    version: editMode === POSTGAME_INCREMENTAL_EDIT_V2 ? POSTGAME_INCREMENTAL_EDIT_V2 : POSTGAME_INCREMENTAL_EDIT_V1, patches: clone(edit.patches), applied,
    beforeHash: hash(original), afterHash: hash(value),
  } });
}
