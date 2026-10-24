# T23 / S248：普通LOS完整记录编码复用

T23仍33/36、T27仍5/6；开放248/272/249/250，新12组实验0/12。
性能优化仍在实验初始化前；地图、写表/计划、完整对照和复盘目标不缩减。

## 具体故障复现

新探针`probe-ticket-23-native-los-flat-encoding-v1.mjs`只复现普通LOS编码残余，
不重跑旧绿或其它Slice门禁。输入原C82，保留1804地形的生产普通几何投影；
9Marine/6Raptor、4真实射线、重复4射线、实际移动后的1射线。
只在探针期间计数原生assessment字段排序及通用`normalizeCanonical`调用，随后恢复hook。
红17283 exit1：已有记录缓存之后，仍有5306完整行递归规范化及5306相同布局排序。
完整原结果、实际规范字节、哈希、移动坐标的新owner对照及外部异常先保存。

## 来源修复与唯一对应验证

只改`official-terrain-los-rules-kernel-v1.mjs`的私有编码：
完整字段名逐行读取，与私有context上一次布局逐一比较；额外/缺失/重排字段重建
整个排序布局，不用字段白名单或丢未知字段。原生平面标量/字符串数组直接按原
排序写入完整对象再JSON编码，避免每个叶子再进入通用递归；未定义字段仍按原语义
省略，非平面/异常值回原完整通用规范器和诊断。通用哈希及公共外部记录路径不变。

唯一绿18517 exit0：递归行5306→0、字段排序5306→1；所有9完整1804行结果相同，
全部规范字节与通用参考相同、所有原生seal与完整通用hash相同；实际移动查询与新
owner一致，输入不变。外部嵌套新字段和Infinity诊断仍保持原完整路径。
含计数局部658.162→311.712ms，不当作完整查询/带模型行动提速或机器隔离A/B。

## 直接受影响的原完整查询：已结束，性能未准出

原实际C106 marker2请求只测一次当前源，19683；目录
`native-los-flat-encoding-v1/original-c106-once-v1`。理由：此处编码在原查询完整
射击LOS/关系图/火力评估路径内，需要保留全部原回执并观察是否减少真实耗时。
候选780/检查28/原生实例化16/选项4、地形和概率样本不裁剪，不调用模型或写原Room。
19683 exit0；期间未改生产源、重启或重复已绿/付费实测。源hash保持，整个实际
Host请求、整个原回执与responseHash均相同；780/28/16/4保留、worker恢复0。
完整查询140.599s，对前源101.006s增加39.593s，不作为性能优化成功。

| 阶段 | 前源秒 | 当前秒 | 增加秒 |
| --- | ---: | ---: | ---: |
| 候选搜索 | 31.517 | 48.177 | 16.660 |
| 四选项并行比较 | 68.857 | 91.724 | 22.867 |
| 完整查询 | 101.006 | 140.599 | 39.593 |

四worker关系图墙钟12.214–13.617→23.184–24.024s，线程CPU9.223–9.687→
10.652–10.965s；火力墙钟48.798–53.297→58.457–63.886s，线程CPU30.209–34.152→
31.332–35.128s。火力CPU不是完全不变，单worker增加0.082–1.123s；关系图增加
1.278–1.429s，均明显少于相应墙钟增加。准入6ms不是主要耗时；没有搜索CPU分项
或整机隔离对照，不能把差额全归硬件争用/GC，也不能确定本补丁导致全部退化。
最慢worker三个已测连续阶段合计87.810s；batch91.724s的剩余3.914s只是包络差额，
不是纯worker启动/复制成本，更不能靠省启动解决全部慢耗时。

恢复16.154s、上下文6.445s另记，setup37.005s已含恢复，均不计正常行动耗时。
本轮只有无模型工程查询；正常行动所需Replay仍计入性能。局部计数改善不能充当
全查询/线程CPU/带模型行动提速。完整终态与delivery.private.json已留存。

调研下一步见[空间查询性能调研](ticket-23-slice-248-spatial-query-performance-research-2026-10-10.md)。
旧A7暖态95.877s不能充当当前版本带模型实测；本轮未重跑它。

## 交付与边界

1生产文件、1具体bug探针及文档/任务记录；0Provider/原Room写/新游戏/代理K3/提交，
不改Skill、prompt、计划、记忆或冻结地形。A95.197314/B138.052447/C124.279803
各¥200累计保持，未知费用预留不重置；UI及新决策没有本轮实测。
私有目录保留完整baseline、具体红、唯一绿、运行记录及源hash。

使用[diagnose](/Users/rualoud/Downloads/codex_project/project-d/.agents/skills/diagnose/SKILL.md)
的具体复现→来源修复→唯一绿；使用
[agentic-harness-evolution-loop](/Users/rualoud/Downloads/codex_project/project-d/.agents/skills/agentic-harness-evolution-loop/SKILL.md)
保留全工具事实/来源/计时与费用分离。harnessLoopUsed:true；targetGames:StarCraft TMG；
promptPackRoutes:fact_probe_prompt/harness_optimizer_prompt；harnessToolsCalled:native_los/formation/fire_estimates；
uiTraceEvidence:not_measured；agentDecisionEvidence:original_complete_tool_output_only；
memoryTraceEvidence:untouched；trainingTraceCandidates:0、trainingTruth:false。
任何完整事实/原规范字节/hash/异常不等则撤回优化；不以单点墙钟宣称整体性能准出。
