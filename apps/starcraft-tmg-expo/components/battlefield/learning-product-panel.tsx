import {useEffect,useState} from 'react';
import {Pressable,StyleSheet,Text,View} from 'react-native';

import {useLevel3ClientDomain} from '../../lib/level3/client-domain-provider';
const routes={RW:'WikiSkill 知识沉淀',RS:'SkillOpt 策略优化',RMV:'Memento2＋VISTA 探索',RH:'混合学习'};
type Route=keyof typeof routes;
type Definition={id:string;label:string;routes:Route[];learningRounds:number};
type Run={id:string;route:Route;status:string;phase:string;round:number;learningRounds:number;
  learnerSeat:string;stage:string|null;lastError?:{code:string}|null;pending?:{reason?:string}|null;
  history:Array<{round:number;seat:string;decision?:string}>};

export function LearningProductPanel({roomId,zh}:{roomId:string|null;zh:boolean}) {
  const {learningProduct}=useLevel3ClientDomain();
  async function request(suffix:string='',body?:unknown){
    const value=await learningProduct.request(body===undefined?'GET':'POST',suffix,body);
    if(!value.ok)throw Error(value.reason||'复盘服务不可用');return value;
  }
  const [definitions,setDefinitions]=useState<Definition[]>([]),[definition,setDefinition]=useState('');
  const [route,setRoute]=useState<Route>('RW'),[run,setRun]=useState<Run|null>(null);
  const [active,setActive]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);
  useEffect(()=>{let live=true;setDefinitions([]);setDefinition('');setRun(null);setActive(false);setError(null);if(!roomId)return;void request().then(value=>{if(live){setDefinitions(value.definitions);setDefinition(value.definitions[0]?.id||'');setRoute(value.definitions[0]?.routes[0]||'RW');}})
    .catch(cause=>{if(live)setError(cause.message);});return()=>{live=false;};},[roomId]);
  // IDs refer to a registered immutable study, so refresh/reopen finds the same
  // run instead of accidentally buying a second learning experiment.
  const id='learning:'+definition+':'+route;
  useEffect(()=>{setRun(null);setActive(false);setError(null);if(!definition)return;
    let live=true;const load=()=>request(encodeURIComponent(id)).then(value=>{if(live){setRun(value.run);setActive(value.active);}})
      .catch(cause=>{if(live&&!String(cause.message).includes('LEARNING_RUN_NOT_FOUND'))setError(cause.message);});
    void load();const timer=setInterval(()=>void load(),3000);return()=>{live=false;clearInterval(timer);};},[id,definition,roomId]);
  if(!definitions.length)return <View style={styles.panel} testID="learning-product-console">
    <Text style={styles.title}>{zh?'历史对局复盘':'Historical match learning'}</Text>
    <Text style={styles.note}>{!roomId?(zh?'进入房间后可选择复盘任务。':'Join a room to choose a study.'):(zh?'尚无可运行的复盘任务。完成对局并登记复盘数据后，学习方法会在这里出现。':'No registered study is available yet.')}</Text>
    {error&&<Text selectable style={styles.error}>{error}</Text>}
  </View>;
  const phaseLabel=run?.stage?(({wiki:'知识沉淀',skillopt:'策略优化',memento2:'记忆训练',vista:'场景探索'} as Record<string,string>)[run.stage]||run.stage):run?.phase==='methods'?'方法阶段完成':run?.phase==='evaluation'?'独立评价':run?.phase==='selection'?'版本选择':run?.phase==='complete'?'已完成':run?.phase;
  const statusLabel=active?'运行中':run?.status==='running'?'等待继续':run?.status==='paused'?'已暂停':run?.status==='complete'?'已完成':run?.status;
  const selected=definitions.find(d=>d.id===definition);
  async function act(operation:'start'|'run'|'pause'|'resume'){
    setBusy(true);setError(null);try{
      if(operation==='start'){const value=await request('',{id,definitionId:definition,route});setRun(value.run);}
      else {await request(encodeURIComponent(id)+'/'+operation,{});setActive(operation==='run');if(operation==='resume'){const v=await request(encodeURIComponent(id));setRun(v.run);}}
    }catch(cause){setError(cause instanceof Error?cause.message:String(cause));}finally{setBusy(false);}
  }
  return <View style={styles.panel} testID="learning-product-console">
    <Text style={styles.title}>{zh?'历史对局复盘实验':'Historical match learning'}</Text>
    <Text style={styles.note}>{zh?'选择已登记的数据集与学习方法。双方交替学习，每轮固定对手；新策略经独立对照后选择，整套版本一起保留或回滚。':'Choose a registered study and method. Seats alternate; each round freezes the opponent and evaluates the complete candidate.'}</Text>
    <View style={styles.row}>{definitions.map(d=><Pressable key={d.id} accessibilityRole="button" disabled={active||busy}
      onPress={()=>{setDefinition(d.id);setRoute(d.routes[0]);}} style={[styles.button,definition===d.id&&styles.selected]}><Text style={styles.text}>{d.label}</Text></Pressable>)}</View>
    <View style={styles.row}>{(selected?.routes||[]).map(r=><Pressable key={r} accessibilityRole="button" disabled={active||busy}
      onPress={()=>setRoute(r)} style={[styles.button,route===r&&styles.selected]}><Text style={styles.text}>{routes[r]}</Text></Pressable>)}</View>
    <View style={styles.row}>
      {!run&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void act('start')} style={styles.button}><Text style={styles.text}>{zh?'建立复盘':'Create study'}</Text></Pressable>}
      {run&&run.status==='running'&&!active&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void act('run')} style={styles.button}><Text style={styles.text}>{zh?'继续复盘':'Continue'}</Text></Pressable>}
      {run?.status==='paused'&&!active&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void act('resume')} style={styles.button}><Text style={styles.text}>{zh?'恢复原断点':'Resume checkpoint'}</Text></Pressable>}
      {active&&<Pressable accessibilityRole="button" disabled={busy} onPress={()=>void act('pause')} style={styles.button}><Text style={styles.text}>{zh?'本步完成后暂停':'Pause after this step'}</Text></Pressable>}
    </View>
    {run&&<View style={styles.status}>
      <Text selectable style={styles.text}>{`${run.round}/${run.learningRounds} · ${zh?(run.learnerSeat==='player1'?'玩家一':'玩家二'):run.learnerSeat} · ${zh?phaseLabel:(run.stage||run.phase)} · ${zh?statusLabel:run.status}`}</Text>
      {run.history.map((h,i)=><Text key={i} style={styles.note}>{`第 ${h.round+1} 轮 · ${h.seat} · ${h.decision||'整包回滚'}`}</Text>)}
      {(run.lastError?.code||run.pending?.reason)&&<Text selectable style={styles.error}>{run.lastError?.code||run.pending?.reason}</Text>}
    </View>}
    {error&&<Text selectable style={styles.error}>{error}</Text>}
  </View>;
}
const styles=StyleSheet.create({panel:{padding:18,gap:12,borderWidth:1,borderColor:'#0e7490',borderRadius:14,backgroundColor:'#071923'},
  title:{fontSize:20,fontWeight:'800',color:'#e0f2fe'},note:{fontSize:12,lineHeight:19,color:'#94a3b8'},
  row:{flexDirection:'row',flexWrap:'wrap',gap:8},button:{padding:10,borderWidth:1,borderColor:'#245366',borderRadius:8},
  selected:{backgroundColor:'#103746',borderColor:'#67c8dd'},text:{fontSize:13,color:'#d8eef5'},
  status:{gap:6,borderTopWidth:1,borderTopColor:'#284b5d',paddingTop:10},error:{fontSize:12,color:'#fca5a5'}});
