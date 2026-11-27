// Migrate an explicitly inventoried batch of cold StarCraft engineering evidence.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {atomicWrite} from './lib/development-context.mjs';

const build = fileURLToPath(new URL('../build/', import.meta.url)).replace(/\/$/, '');
const volume = '/Volumes/Lenovo/ProjectD-StarCraft';
function contained(rel) {
  return typeof rel==='string' && !path.isAbsolute(rel) &&
    rel.split('/').every(part=>part && part!=='.' && part!=='..');
}
function eligible(rel) {
  return contained(rel) &&
    /^ticket-28-(wave2-capabilities-|zerg-wave3-|terran-wave3-|protoss-wave3-|wave3-geometry-|wave3-mission-source-)/.test(rel) &&
    /\/(checkpoint-r\d+\.json|[^/]+\.sqlite\.gz)$/.test(rel);
}
async function passed(dir) {
  for (const [name, key, expected] of [['cold.json','exact',true],['verification/boundary.json','status','passed']]) {
    try {
      const result=JSON.parse(await fs.readFile(path.join(dir,name),'utf8'));
      if (result[key]===expected) return name;
    } catch(error) { if(error.code!=='ENOENT') throw error; }
  }
  return null;
}
async function prepareBatch(scopes) {
  if (!scopes.length || (await fs.stat(volume)).dev===(await fs.stat(build)).dev) throw Error('Name a closed verification directory and mount the archive volume');
  const files=new Map(), proofs=[];
  for (const scope of scopes) {
    if (!contained(scope) || scope.split('/').length<2 || !eligible(scope+'/checkpoint-r0.json')) throw Error('Expected a named Wave3 verification directory');
    const dir=path.join(build,scope);
    if (await fs.realpath(dir)!==dir) throw Error('Verification scope must be local');
    const proof=await passed(dir);
    if (!proof) throw Error('No completed cold replay or passed product boundary in '+scope);
    proofs.push(path.join(scope,proof));
    const dirs=[dir];
    while(dirs.length) {
      const parent=dirs.pop();
      for (const child of await fs.readdir(parent,{withFileTypes:true})) {
        const file=path.join(parent,child.name),rel=path.relative(build,file);
        if(child.isDirectory()){dirs.push(file);continue;}
        if(!child.isFile()||!eligible(rel))continue;
        const st=await fs.lstat(file);
        if(st.size>=1024**2 && st.nlink===1) files.set(rel,{rel,size:st.size,alloc:st.blocks*512,ino:st.ino,mtime:st.mtimeMs});
      }
    }
  }
  if (!files.size) { console.log('No eligible cold files in the selected scopes'); return; }
  const batch='cold-wave3-evidence-'+new Date().toISOString().replace(/[-:.]/g,'');
  const folder=path.join(build,'storage-migrations',batch),externalRoot=path.join(volume,batch);
  await fs.mkdir(path.dirname(folder),{recursive:true});
  await fs.mkdir(folder); await fs.mkdir(externalRoot);
  const body=JSON.stringify({sourceBuild:build,externalRoot,proofs,files:[...files.values()]},null,2)+'\n';
  await Promise.all([folder,externalRoot].map(dir=>fs.writeFile(path.join(dir,'inventory.json'),body,{flag:'wx'})));
  console.log(JSON.stringify({batch,count:files.size,bytes:[...files.values()].reduce((n,item)=>n+item.size,0)}));
}
if (process.argv[2]==='--prepare') {
  await prepareBatch(process.argv.slice(3));
  process.exit(0);
}
const id = process.argv[2];
if (!/^cold-wave3-evidence-[0-9TZ]+$/.test(id ?? '')) throw Error('Expected a saved migration batch ID');
const audit = path.join(build, 'storage-migrations', id);
const inventory = JSON.parse(await fs.readFile(path.join(audit, 'inventory.json'), 'utf8'));
const destination = path.join(volume, id);
if (inventory.sourceBuild !== build || inventory.externalRoot !== destination
    || await fs.realpath(destination) !== destination || (await fs.stat(volume)).dev === (await fs.stat(build)).dev) {
  throw Error('Archive volume or source does not match the inventory');
}
const archiveDevice = (await fs.stat(destination)).dev;
const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const receiptFile = path.join(audit,'copies.jsonl');
const previous = new Map();
try {
  for (const line of (await fs.readFile(receiptFile, 'utf8')).trim().split('\n').filter(Boolean)) {
    const row = JSON.parse(line);
    previous.set(row.rel,row.sha256);
  }
} catch (error) { if (error.code !== 'ENOENT') throw error; }
if (process.argv[3]==='--restore') {
  const wanted=process.argv[4];
  if (!eligible(wanted)||!inventory.files.some(entry=>entry.rel===wanted)||!previous.has(wanted)) throw Error('No verified entry for this path');
  const local=path.join(build,wanted),remote=path.join(destination,'build',wanted);
  if (await fs.realpath(path.dirname(local))!==path.dirname(local) || !(await fs.lstat(local)).isSymbolicLink() || await fs.readlink(local)!==remote) {
    throw Error('Local path is no longer the archive link');
  }
  if(await fs.realpath(remote)!==remote) throw Error('Archive path changed');
  const bytes=await fs.readFile(remote),hash=previous.get(wanted);
  if (digest(bytes)!==hash) throw Error('Archive hash differs from the receipt');
  const tmp=local+'.restore-'+randomUUID();
  const handle=await fs.open(tmp,'wx',0o600);
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  if(digest(await fs.readFile(tmp))!==hash || await fs.readlink(local)!==remote) throw Error('Local restoration verification failed');
  await fs.rename(tmp,local);
  console.log(JSON.stringify({restored:wanted,sha256:hash}));
  process.exit(0);
}
const journal = await fs.open(receiptFile, 'a', 0o600);
const stats = {count:0, logicalBytes:0, originalAllocatedBytes:0, skipped:[], failed:[]};
const free = async dir => { const stat = await fs.statfs(dir); return stat.bavail * stat.bsize; };
const verifyOriginal = (stat, item) => stat.isFile() && stat.nlink === 1 && stat.ino === item.ino
  && stat.size === item.size && stat.mtimeMs === item.mtime;
async function move(item) {
  const rel = item.rel;
  if (!eligible(rel)) throw Error('Unexpected file in inventory');
  const local = path.join(build,rel);
  const remote = path.join(destination,'build',rel);
  const original = await fs.lstat(local);
  if (original.isSymbolicLink()) {
    if (await fs.readlink(local)!==remote || !previous.has(rel) || (await fs.stat(remote)).size!==item.size
      || digest(await fs.readFile(remote))!==previous.get(rel)) throw Error('Existing link failed verification');
    return;
  }
  if (!verifyOriginal(original,item) || await fs.realpath(local)!==local) throw Error('Original changed');
  const bytes = await fs.readFile(local);
  if (rel.endsWith('.json') && /"(seatToken|apiKey|accessToken|refreshToken|privateKey|authorization|cookie)"\s*:\s*"[^"]+"/i.test(bytes.toString('utf8'))) {
    stats.skipped.push({rel,reason:'credential field'});return false;
  }
  const sha256 = digest(bytes);
  await fs.mkdir(path.dirname(remote),{recursive:true});
  if (await fs.realpath(path.dirname(remote))!==path.dirname(remote) || (await fs.stat(path.dirname(remote))).dev!==archiveDevice) throw Error('Archive path changed');
  let handle;
  try { handle=await fs.open(remote,'wx',0o600); }
  catch(error) { if (error.code!=='EEXIST') throw error; }
  if (handle) { try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); } }
  const copy = await fs.lstat(remote);
  if (!copy.isFile() || copy.dev!==archiveDevice || copy.size!==item.size || digest(await fs.readFile(remote))!==sha256) throw Error('Archive copy differs');
  await journal.appendFile(JSON.stringify({rel,size:item.size,sha256})+'\n');
  await journal.sync();
  if (!verifyOriginal(await fs.lstat(local),item)) throw Error('Original changed during verification');
  const link = local+'.archive-link-'+randomUUID();
  await fs.symlink(remote,link);
  await fs.rename(link,local);
  if (await fs.realpath(local)!==remote) throw Error('Original path failed link verification');
}
try {
  for (const item of inventory.files) {
    try {
      if (await move(item)===false) continue;
      stats.count++;stats.logicalBytes+=item.size;stats.originalAllocatedBytes+=item.alloc;
      if(stats.count%100===0) console.log('verified',stats.count,'/',inventory.files.length);
    } catch(error) {
      stats.failed.push({rel:item.rel,error:error.message});
      break;
    }
  }
} finally {
  await journal.close();
  stats.finishedAt=new Date().toISOString();
  stats.internalAvailableAfter=await free(build);
  await atomicWrite(path.join(audit,'result.json'),JSON.stringify(stats,null,2)+'\n');
  if ((await fs.stat(destination)).dev===archiveDevice) {
    await fs.copyFile(receiptFile,path.join(destination,'copies.jsonl'));
    await fs.copyFile(path.join(audit,'result.json'),path.join(destination,'result.json'));
  }
}
console.log(JSON.stringify({verified:stats.count,skipped:stats.skipped.length,failed:stats.failed}));
if (stats.failed.length) process.exitCode=1;
