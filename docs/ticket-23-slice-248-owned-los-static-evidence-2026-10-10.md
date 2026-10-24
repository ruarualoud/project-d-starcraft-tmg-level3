# T23 / S248：固定LOS证据与完整查找键复用

T23仍33/36、T27仍5/6；开放248/272/249/250，12组新实验0/12。
先完成性能优化，再启动实验，不缩减地图、写表/计划、完整对局与复盘目标。

## 具体复现，而非重复旧验证

本轮使用新探针`probe-ticket-23-owned-los-static-evidence-v1.mjs`复现具体残余：
同一个私有原生LOS工厂，原C82/1804地形、9Marine对6Raptor，4射线、重复4射线、
实际移动一个模型后的1射线；全部完整结果及hash保存，不修改原Room或冻结地图。
移动射线与新建原生owner完整对照，不能假设不同位置的LOS结果一定有不同hash。

初4393/5224属于夹具失败，未证明产品bug：第一处写了不被原生读取的`x`，
修为`xInches`；另一处错误要求移动必须改变LOS哈希，改为完整新owner对照。
保留原失败，不把它们当产品故障、不重跑旧绿。修正后具体红6366 exit1：
固定地图有效尺寸证据9次构造、12字段完整查找键排序16236次。

## 来源修复与对应唯一绿

仅修改`official-elevation-effective-size-rules-kernel-v1.mjs`：

- 由原生完整地图/来源校验创建的私有context，延迟构建并深冻结固定有效尺寸证据一次；
  所有1804行、支撑链和有效尺寸继续保留，每条射线的动态遮挡/模型规则照常计算。
- 私有查找键保留全部字段和值，不再为内部查找排序。它不是规则hash或发布回执；
  实际assessment及最终结果仍使用原来的规范编码与hash。未定义字段和未来非平面值
  保留原fallback；不同字段顺序最多错过复用，不会把不同值合并。

对应绿7506 exit0仅一次：9→1固定证据构造、16236→0查找键排序；全部9射线的
完整1804评估及hash与修复前一致，实际移动模型与新owner结果一致，调用方输入不变。
含计数探针局部868.780→719.927ms，不当作完整行动性能或整机隔离A/B。

## 原C106完整查询：终态，完整结果相同

直接受影响的实际C106 marker2队形请求只执行一次当前源，8172 exit0；目录
`owned-los-static-evidence-v1/original-c106-once-v1`。原因：此次源修改正处于原查询
的完整火力LOS调用链，需要保留完整原回执验证并观察耗时；不是其它Slice门禁。
保留实际Host输入、780/28/16/4工作量、全部地形和样本，不调用模型或写原Room。
查询期间源hash保持一致，不重启、不重跑旧绿或已有付费实测。完整实际Host请求、
ENTIRE原结果及回执hash一致，780生成/28检查/16原生实例化/4选项全部保留。

历史恢复和上下文准备另列。正常行动所需Preview/Apply/Replay/记忆不得扣除。
前一源版本查询114.843s、搜索35.324s、比较78.538s；四线程火力CPU33–38s，
准入等待5ms。其结果不证明当前源带模型耗时；旧A7暖态95.877s也不是本版本实测。
当前查询101.006s（前源114.843s），搜索31.517s、四选项并行比较68.857s；
恢复11.631s、上下文4.678s单列，setup25.615s另记且不能与恢复重复相加。
这不是带模型完整动作，也不是受控因果提速；未改搜索/关系图也变快，不能将全降幅归本补丁。

|线程|关系图墙钟/CPU秒|原地火力墙钟/CPU秒|移动火力墙钟/CPU秒|
|---|---|---|---|
|0|12.214 / 9.223|48.798 / 30.209|0.203 / 0.158|
|1|13.035 / 9.579|53.039 / 34.152|0.309 / 0.159|
|2|13.009 / 9.597|49.781 / 31.147|0.190 / 0.146|
|3|13.617 / 9.687|53.297 / 33.937|0.145 / 0.131|

线程内阶段串行、四比较线程并行，不能累加四个墙钟；CPU准入等待5ms。
没有采样Profiler。性能仍开放，下一定位普通LOS完整行的通用递归规范编码成本；
已有距离粗筛、逐模型地形邻近缓存与远地形评估复用必须复用，不能重新算作新修复。

## 边界与交付

本轮1生产源、1具体bug探针、报告及任务记录。无新的策略/Skill/prompt输入，
不减候选/样本/计划/记忆，不改规则地形；0Provider/原Room写/子代理K3/提交。
费用保持A95.197314/B138.052447/C124.279803，各¥200累计，不重置未知预留。
私有目录保留初夹具失败、具体红、唯一绿、原完整baseline及原查询运行记录、
`delivery.private.json`完整原结果对账、源hash及普通线程CPU；全部本轮句柄终态。

使用[diagnose](/Users/rualoud/Downloads/codex_project/project-d/.agents/skills/diagnose/SKILL.md)
定位具体重复及唯一红绿；使用
[agentic-harness-evolution-loop](/Users/rualoud/Downloads/codex_project/project-d/.agents/skills/agentic-harness-evolution-loop/SKILL.md)
保留完整工具证据与费用/性能边界。harnessLoopUsed:true；targetGames:StarCraft TMG；
promptPackRoutes:fact_probe_prompt/harness_optimizer_prompt；harnessToolsCalled:native_los/formation/fire_estimates。
UI及新Agent决策未测，记忆未改，trainingTraceCandidates:0、trainingTruth:false。
任何完整事实/hash/原拒绝不等则撤回优化；性能未准出，不启动12组实验。
