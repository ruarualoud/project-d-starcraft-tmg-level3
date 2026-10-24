# T23 / S248：本轮一次计时后冻结性能基线，启动三组

## 用户路线变更与范围

2026-10-10用户明确：本次修改完再测一轮时间，随后以该版本为性能基线启动三组，
分别统计单回合耗时。取代继续优化到一分钟或等待所有优化方案完成的启动条件。
性能未达一分钟不再独立阻止实验；Critical/High规则/工程问题仍按原约定处理。
原12组矩阵与地图/2000军表/Plan/终局/复盘目标不缩小，这里启动第一条件ABC三组。
旧局、已付结果、未知费用与旧地图均保留；不把原未终局三局冒充新受控三局。

T23仍33/36、T27 5/6，余248/272/249/250；新12组已启动2/12、完成0/12。
A赛前来源审核停止，B实际Web执行中，C已执行7动作后停止，均不冒充整局完成。
A固定2000表+地图绑定Plan；B从头写2000表+地图绑定Plan；C与A同表、无开局Plan。
共同对手使用相同表/Skills/模型/Harness/记忆能力，不注入额外赛前Plan，保留局内
Planner/长期记忆的正常建立。地图、任务、部署与规则源冻结一致，房间/记忆隔离。

## 本轮具体修改与归因假设

不是再实现空间索引或改变搜索。沿已有观察回调补三处正式来源：

1. `legal-formation-search-v1.mjs`：搜索进度可记录当前线程CPU；比较转发既有
   私有射击prepare诊断，事件仅进入worker diagnostics，不进入Rules结果/prompt。
2. `official-selected-roster-ranged-action-runtime-v1.mjs`：在已注册的私有context
   观察口增加构建、底盘LOS geometry、攻击plan的起止边界，保留缓存及原完整计算。
3. `combat-estimation-runtime-v1.mjs`：按实际estimate汇总preview、chance准备、
   dice pool、casualty domain、strategic casualty/control与reaction耗时/调用数。
   每类仅汇总一条诊断，不把每个216样本都写日志；无观察者保留原resolver路径。
   观察者异常不改Rules事实；线程CPU不可用时保留null，不伪造零。

假设依次是重复几何准备、概率/伤亡后果热点、调度/等待放大；本轮旨在区分它们，
不预先判定硬件或补丁因果。不修改Skill/prompt/Plan/几何精度/规则版本、候选、
样本、对手覆盖或正常Apply/Replay。没有新增测试或重跑旧绿。

## 直接相关唯一完整测量：完成，采用基线

原实际C106 marker2请求，仅此请求直接经过本轮三处修改。原回复和完整Host请求
已留存，用已有`replay-ticket-23-real-performance-cases-v1.mjs`完整入口测一次。
native43803，2026-10-10T11:43:40.447Z开始，11:46:17.874Z终态exit0；期间不改生产源。
目录：`build/ticket-23-three-arm-official-standard1-20261008-v1/lossless-next-four-batch-20261010-v1/native-query-timing-baseline-v1/original-c106-once-v1/`。
0Provider/0原Room写，不重建原房间。历史恢复/setup另记，不重复相加；完整正常
行动Replay依然计入后续对局行动时延。核对整个请求/结果/hash与780/28/16/4。

完整原请求与整个实际结果深相等；结果hash为
`c4133488cc6f9615aa49a7b2d9b4e03c72a4e51aff7df403cdc5595f32c24f99`。
780 generated / 28 examined / 16 instantiated / 4 retained保持，四源SHA保持。
查询95.092s：搜索31.424s（线程CPU29.815s），四选项并行比较62.905s。
每个worker图12.937–13.204s/CPU9.269–9.625s，火力43.691–47.642s/
CPU29.665–32.932s。火力准备29.648–30.605s/CPU20.501–21.147s；
伤亡后控制影响8.971–12.574s/CPU5.851–8.566s；骰池1.163–1.439s。
这是一条原完整无模型查询，不是带模型行动/单回合时间，也不是所有case准出。
setup29.423s包含历史恢复11.591s，上下文5.130s另列，不重复相加。
此前140.599s与本次95.092s非整机隔离对照，不能归因于只加观察的改动。
按用户指令采用当前基线，不再追加性能测量或因超过60s阻止实验。

### 冻结基线源SHA

- formation：0be4cd77283c08365fe85a09b41d205b775099f00ffea89c739267039b15c10a
- combat：75e867b702bcce1d9fe20e39ce2be3eea9025a51f648bf9b67f6469c3168b98d
- ranged：e7b40b594ec0b423acb0874b7f940f9c6e7a4364446cc65f03a139edd8df32bf
- ordinaryLOS：c2aa661c88e4d246fa5d7619cbb4dae4da11e8daca0b9b7c2df2ad47275b8ae0

## 三组计时和费用口径

三组同代码/冻结地图/人机机器端工程链路。记录每步实际elapsed与回合、phase、
revision、行动类型；汇总每回合首个正常动作到结束的实际墙钟，以及行动耗时总和、
模型/查询/Preview/Apply/Replay分项。人工/审批/故障暂停和初始化另列，未完成回合
仅标进行中，不将进程启动至当前的时间冒充单回合成绩。并行线程和nested query
诊断不重复加入行动总耗时。不能用历史恢复后的推导和当作新鲜带模型实测。

分别记账，原A95.197314/B138.052447/C124.279803各¥200累计不清零；旧未知
预留保留。新12局费用范围未扩为12×200；第一ABC仍各原账。使用已授权真实Flash。
尚未启动的请求不计作已消费，也不盲重发未知已派发请求。

## Harness / 交付边界

harnessLoopUsed:true；targetGames:StarCraft TMG；promptPackRoutes:fact_probe_prompt/
harness_optimizer_prompt；harnessToolsCalled:native formation/ranged/probability preparation；
uiTraceEvidence:not_yet_measured；agentDecisionEvidence:full original tool result comparison；
memoryTraceEvidence:untouched；trainingTraceCandidates:0；trainingTruth:false。
rollbackOrDemotionRules:完整事实、规范hash、输入不变、缓存/未知/异常语义变化即撤回
对应观察改动，不取消规则检查。userVisibleChecks:当前只读计时，尚未证明三局终局。
未关Slice、不提交、不安装/清理/创建代理K3/运行无关验证，其它项目改动保留。

## 三组实际执行与独立停止报告

原最新Web导出位于旧实验根的`web-export`，不是默认`apps/.../dist`。
首次C启动选错默认旧导出，被新鲜度检查拒绝，0Provider/0房间写；改用已有新鲜
导出后正常启动，没有重建旧局、重跑构建或绕过检查。A/B正式写表工作台隔离启动，
POST异步入口有两次20s观察超时，随后以持久记录/GET确认已运行，没有重复POST。

- A：新固定2000表计划生成并走现有来源修订入口；三轮审核后仍2 High，按约定
  停止，尚未开局。不是增加性能时间阈值的问题，也不是旧planHash复审。
- B：从头多轮写表得到Rules合法2000表；完成进场审计、locked Teach、晋升与
  来源审核，High为0。正式房间`performance-baseline-B-20261010-v1`，host72679、
  Web driver76649，实际Web触发，第1回合开始；对手没有额外赛前Plan。
- C：固定A原军表、无开局Plan，host60265、Web driver62553；第1回合Movement
  revision7、7个已Apply/Replay动作，逐步截图已保存。第8个请求返回
  `LIVE_DECISION_PLANNER_DID_NOT_CONVERGE` High，driver exit1停止；未提交新动作，
  原房、已付输出与revision7停点保留，不盲重发，也不改规则结果放行。

独立证据根：`build/ticket-23-three-arm-performance-baseline-20261010-v1/`。
`experiment-control.private.json`记录共同源/地图/军表Plan/预算，
`independent-stops.private.json`独立记录A/C停机及根因；各组
`round-timing.private.json`记录已完成动作计时和进行中回合，不声明完整回合成绩。
C首7动作decision→已提交且Replay/记忆完成合计385.770s，首至末覆盖479.985s，
仍是进行中回合；初始化及UI截图开销不混入动作合计。B第一确定性回合初始化动作
同口径18.571s、0模型费，不把它当作普通模型策略行动性能。

本轮新增费用：A计划/修订/复审保守估算1.706734；B写表7个实际付费回执
1,839,410 units/2.238921，加Teach/来源审核1,037,376 units/1.410790，合计3.649711；
C已报告3.360450。累计A96.904048/B141.702158（后续动作另加）/C127.640253，
各200不清零；未知旧预留保持。B正式Host可用预算58.297842，不重新给200。

### A纠错为什么未收敛：已经核对实际前后计划

本轮没有修改A审核/纠错生产代码；修改的是性能观察。第一修订先创建Rules检查过
的进场schedule，coverage明确`deferredClaimPaths=[medic-upgrade-1]`和
`initialScheduleIsNotClaimRepairCompletion=true`，并未修正医疗升级保证存活原句。
新增进场事实又让旧计划的若干早到单位说法不成立，第二审核检出这些矛盾。
第二修订实际替换13个请求路径，并非修订没执行；但调度仅取最近一次High路径，
没有合并第一轮延期未修的医疗句。威胁段“证据列表为空”也不在那13条中。
第三审核又检出这两句；医疗句在三个版本中完全相同，威胁句在后两个版本中相同。
所以不是“同一句修了多次仍不改”，而是未完成修复欠账没有可靠延续，审核结果还
有轮间差异。应保留未修High/延期路径到真正替换并复审确认；事实版本变化后显式
重新对齐相关计划。额外一轮可能解决最后两句，但单纯放大轮数不能补这个闭环。
已到三轮，未擅自开启第四轮或手改模型Plan；B仍后台执行。
