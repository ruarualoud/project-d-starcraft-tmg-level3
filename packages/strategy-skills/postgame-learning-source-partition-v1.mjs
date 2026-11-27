import path from 'node:path';
const need=(v,c)=>{if(!v)throw Object.assign(new Error(c),{code:c});};
const seats=['player1','player2'];
const aliases=s=>[s.ancestryGroup&&'group:'+s.ancestryGroup,s.ref&&'ref:'+s.ref,
 s.stateHash&&'state:'+s.stateHash,s.directory&&'room:'+path.resolve(s.directory)].filter(Boolean);
function sources(value,out=[]){
 if(Array.isArray(value)){for(const v of value)sources(v,out);return out;}
 if(!value||typeof value!=='object')return out;
 if(value.ancestryGroup||value.ref&&value.stateHash)out.push(value);
 for(const [k,v] of Object.entries(value))if(!['controls','mapTaskDomain','sourceDomain','pregamePlansBySeat','predecessorEvidence'].includes(k))sources(v,out);
 return out;
}
// Only registered Host input participates. Model text never chooses a split.
export function assertPostgameLearningSourcePartitionV1(definition,stages){
 const training=[];
 for(const seat of seats)for(const stage of stages){
  const cfg=definition.training[seat][stage];sources(cfg,training);
  if(stage==='vista'){
   need(cfg.development?.length&&cfg.evaluation?.cases?.length,'LEARNING_VISTA_SOURCE_PARTITION_REQUIRED');
   const development=cfg.development.flatMap(d=>[d,cfg.sources?.[d.handle]?.experiment?.source].filter(Boolean));
   const developmentAliases=new Set(development.flatMap(aliases));
   need(cfg.evaluation.cases.every(c=>c.source?.ancestryGroup&&!aliases(c.source).some(a=>developmentAliases.has(a))),
    'LEARNING_VISTA_DEVELOPMENT_SELECTION_LEAK');
  }
  if(stage==='wiki')for(const episode of cfg.episodes||[]){
   const binding=cfg.episodeSources?.[episode.episodeId];
   need(binding?.episodeHash===episode.hash&&binding.ancestryGroup&&binding.ref,'LEARNING_WIKI_SOURCE_BINDING_REQUIRED');
   training.push(binding);
  }
 }
 for(const f of definition.learningContext?.developmentFeedback||[])training.push(f.source);
 for(const g of definition.learningContext?.wholeGames||[]){training.push(g.source,...(g.lineageSources||[]));}
 for(const seat of seats)for(const c of definition.developmentCycles?.[seat]?.cases||[])training.push(c.source);
 const seen=new Set(training.flatMap(aliases));
 for(const seat of seats){
  const cases=definition.evaluation[seat]?.cases;
  need(cases?.length,'LEARNING_FINAL_EVALUATION_REQUIRED');
  for(const task of cases){
   need(task.source?.ancestryGroup&&task.source?.stateHash&&task.source?.ref,'LEARNING_EVALUATION_SOURCE_REQUIRED');
   need(!aliases(task.source).some(a=>seen.has(a)),'LEARNING_TRAIN_FINAL_SOURCE_LEAK');
  }
 }
 const discoveryGroups=[...new Set(training.map(s=>s.ancestryGroup).filter(Boolean))];
 need(discoveryGroups.length,'LEARNING_DISCOVERY_SOURCE_REQUIRED');
 return {discoveryGroups};
}
export function assertPostgameSourceDomainV1(source,domain){
 if(!domain)return;
 need(domain.sources?.some(s=>s.ref===source.ref&&s.stateHash===source.stateHash&&s.ancestryGroup===source.ancestryGroup),'LEARNING_SOURCE_OUTSIDE_REGISTERED_DOMAIN');
}
