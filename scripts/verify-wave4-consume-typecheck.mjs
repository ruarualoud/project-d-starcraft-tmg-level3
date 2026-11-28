import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import assert from 'node:assert/strict';
import ts from '../apps/starcraft-tmg-expo/node_modules/typescript/lib/typescript.js';
import {atomicWrite} from './lib/development-context.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),app=path.join(root,'apps/starcraft-tmg-expo'),configFile=path.join(app,'tsconfig.json'),
  config=ts.readConfigFile(configFile,ts.sys.readFile),parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,app),
  head=execFileSync('git',['rev-parse','7268d94^{commit}'],{cwd:root,encoding:'utf8'}).trim(),
  changed=execFileSync('git',['diff','--name-only',head],{cwd:root,encoding:'utf8'}).trim().split('\n').filter(f=>/\.(mjs|tsx?|d\.mts)$/.test(f)),overrides=new Map();
for(const file of changed){
  try{overrides.set(path.join(root,file),execFileSync('git',['show',head+':'+file],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}));}
  catch(error){if(error.status!==128||!/does not exist in|exists on disk, but not in/u.test(String(error.stderr)))throw error;overrides.set(path.join(root,file),undefined);}
}
function check(baseline){
  const host=ts.createCompilerHost(parsed.options),read=host.readFile;
  host.readFile=file=>baseline&&overrides.has(path.resolve(file))?overrides.get(path.resolve(file)):read(file);
  const program=ts.createProgram(parsed.fileNames,parsed.options,host);
  return ts.getPreEmitDiagnostics(program).map(d=>({file:d.file?path.relative(root,d.file.fileName):null,code:d.code,
    message:ts.flattenDiagnosticMessageText(d.messageText,' ')}));
}
const baseline=check(true),current=check(false),remaining=new Map();
for(const d of baseline){const key=JSON.stringify(d);remaining.set(key,(remaining.get(key)||0)+1);}
const added=[];for(const d of current){const key=JSON.stringify(d);if(remaining.get(key)>0)remaining.set(key,remaining.get(key)-1);else added.push(d);}
assert.deepEqual(added,[],'CONSUME_TYPECHECK_REGRESSION');
assert.ok(!current.some(d=>d.file?.endsWith('components/battlefield/native-action-form.tsx')),'CHANGED_NATIVE_FORM_TYPECHECK_ERRORS');
const result={schema:'starcraft_tmg_wave4_consume_typecheck_v1',status:current.length?'no_new_errors_existing_app_errors_remain':'passed',
  baselineCommit:head,baselineDiagnostics:baseline.length,currentDiagnostics:current.length,newDiagnostics:added,
  ownedNativeFormDiagnosticsResolved:true,baselineReadOnlyOverlay:true,
  currentErrors:current.map(d=>({...d,message:d.message.replaceAll(root,'<workspace>')})),modelCalls:0};
await atomicWrite(path.join(root,'docs/development/wave4/evidence/consume-typecheck.public.json'),JSON.stringify(result,null,2));
console.log(JSON.stringify({status:result.status,baselineDiagnostics:baseline.length,currentDiagnostics:current.length,newDiagnostics:added.length,ownedNativeFormDiagnosticsResolved:true}));
