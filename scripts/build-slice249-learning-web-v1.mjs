import fs from 'node:fs/promises';import path from 'node:path';import {spawn} from 'node:child_process';
const out=path.resolve(process.argv[2]);await fs.mkdir(out,{recursive:true});const app=path.resolve('apps/starcraft-tmg-expo');
const run=(args,env)=>new Promise((resolve,reject)=>{const p=spawn(process.execPath,args,{cwd:app,env:{...process.env,...env},stdio:'inherit'});p.once('error',reject);p.once('exit',code=>code===0?resolve():reject(Error('BUILD_EXIT_'+code)));});
const css=path.join(out,'generated/static-web.css');await fs.mkdir(path.dirname(css),{recursive:true});
try{await run(['node_modules/tailwindcss/lib/cli.js','-i','global.css','-o',css,'--minify'],{BROWSERSLIST_ENV:'native'});
await run(['node_modules/expo/bin/cli','export','--platform','web','--output-dir',path.join(out,'web'),'--max-workers','1'],{
CI:'1',EXPO_OFFLINE:'1',NODE_ENV:'production',PROJECT_D_STATIC_WEB_CSS_INPUT:css,
PROJECT_D_LOCAL_WEB_EXPORT:'1',EXPO_PUBLIC_STARCRAFT_TMG_LOCAL_WEB_EXPORT:'1',EXPO_PUBLIC_STARCRAFT_TMG_WEB_ORIGIN:'',EXPO_PUBLIC_STARCRAFT_TMG_API_ORIGIN:'',EXPO_PUBLIC_STARCRAFT_TMG_MEDIA_RELEASE_CHANNEL:'development_internal'});
await fs.writeFile(out+'/build-result.json',JSON.stringify({status:'passed',at:new Date().toISOString(),output:path.join(out,'web')}));
}catch(e){await fs.writeFile(out+'/build-result.json',JSON.stringify({status:'failed',error:e.message}));process.exitCode=1;}
