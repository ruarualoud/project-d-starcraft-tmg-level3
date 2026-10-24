# T23 / S248：私有LOS批次模型准备复用

T23仍33/36、T27仍5/6；开放248/272/249/250，新12实验0/12。
性能仍未准出；地图/军表与计划/完整对照/复盘目标不缩减。

## 具体失败与来源修复

原生射击几何已共享距离与地形准备，不重复做这项旧优化。
真正的残余重复来自`finishElevatedLineOfSight`：每条射线重新调用整支
攻击/目标单位的`canonicalModel`，判断完整单位高地等状态。

具体探针`probe-ticket-23-owned-los-model-preparation-v1.mjs`读取原C82，
保留1804条地形，使用生产`terrainAsOrdinaryForLos`的相同草地几何投影；
9模型Marine3对6模型Kerrigan Raptor，四条真实物理射线。
这不是修改原地图、原Room或把四射线当作完整对局。

红80986 exit1：`OWNED_LOS_REPREPARES_THE_SAME_COMPLETE_UNIT_MODELS_FOR_EVERY_RAY`。
15模型的原生底盘准备实际执行68次，四个被选模型各6次，其余各4次。
完整每射线1804评估及hash、实际来源/支撑拒绝原因先行保存。

生产修改只在`official-elevation-effective-size-rules-kernel-v1.mjs`：
工厂对自己复制的查询做deep freeze，按**实际piece对象＋modelId**保存
已验证模型。后续调用复制新对象；同名/同ID外部对象、改来源、移动、
损伤或支撑不会沿用上一调用结论。普通scalar和动态伤亡尺寸路径不缓存。
不提前校验整单位，不改变未选模型错误的原校验顺序。

唯一绿82458 exit0：模型准备68→15，每个实际模型一次；四条完整结果
及全部地形评估/hash相同，同ID坏来源、未选模型坏支撑仍按原原因拒绝，
调用方输入不变。局部含计数instrumentation的墙钟813.932→981.427ms，
未证明局部提速，不能用计数减少冒充完整性能成功。

## 非采样线程CPU观测

`formation-comparison-worker-v1.mjs`在普通阶段事件记录累计
`threadCpuElapsedMs`，读取平台自己的线程时钟，不打开Profiler、不创建
额外线程/模型调用。它只进独立diagnostics，既不进Agent prompt，也不进
规则回执或策略权重。平台不支持时保留原事件而不报错。
正常墙钟和线程CPU分别报告；不能把差值全部猜成硬件/等待某一种原因。

## 直接受影响原查询：已结束，性能未准出

原C106 marker2只运行一次本源版本的完整查询/回执比较，进程86243。
输出`owned-los-model-preparation-v1/original-c106-once-v1`；保留完整原请求，
不减候选/概率样本/Skill/计划，不调用模型或写原Room。
86243 exit0，完整原请求、全部回执事实和hash相同，780生成/28检查/16精确/4选项不变。
查询114.843s，恢复12.051s、上下文4.669s分别记录；搜索35.324s，四选项并行比较78.538s。
此前101.957s，本次更慢；没有整机隔离A/B，不能由准备次数减少宣称提速或性能准出。

|比较线程|关系图墙钟/CPU秒|原地火力墙钟/CPU秒|移动火力墙钟/CPU秒|
|---|---|---|---|
|0|15.814 / 10.509|55.897 / 33.337|0.222 / 0.191|
|1|15.806 / 10.771|61.357 / 38.034|0.173 / 0.168|
|2|15.967 / 10.728|58.180 / 34.803|0.199 / 0.169|
|3|15.995 / 10.815|59.623 / 36.514|0.156 / 0.146|

线程内阶段串行、四线程并行，不累加四个墙钟。CPU准入等待仅5ms，不能解释主要火力耗时；
墙钟与线程CPU的差值也不能全归某一种等待/硬件原因。下一查固定LOS证据和完整缓存键重复构造，
不削减枚举、候选、地形评估或概率样本。

上一源版本原请求查询101.957s，搜索35.812s、四选项并行比较65.553s；
原记录中合法选项在30.280/31.835/33.738/35.808秒产生。第一个就绪至
搜索结束最多5.532秒，不能宣称流水改造会省掉整个35.8秒搜索。
先定位完整火力准备，避免为一个小重叠盲目增加CPU/生命周期复杂度。

历史恢复与上下文准备单列；本次没有模型调用，不能称为带模型完整行动。
旧A7暖态95.877s属于较早源版本，不重复付款或冒充当前代码实测。
费用新增0，累计A95.197314/B138.052447/C124.279803，各¥200不清零。

## 最终交付边界

本轮两处源（模型准备、低开销线程CPU记录）、一个具体bug探针及本报告。
CURRENT_WORK/TASKS同步，不提交、不建代理/K3、不更新官方数据或碰其它项目。
私有证据目录：`build/ticket-23-three-arm-official-standard1-20261008-v1/`
`lossless-next-four-batch-20261010-v1/owned-los-model-preparation-v1/`。
保留baseline、red/green完整evidence及run、完整查询source hashes与运行记录。

使用[diagnose](/Users/rualoud/Downloads/codex_project/project-d/.agents/skills/diagnose/SKILL.md)
的具体红→来源修复→唯一对应绿，以及
[agentic-harness-evolution-loop](/Users/rualoud/Downloads/codex_project/project-d/.agents/skills/agentic-harness-evolution-loop/SKILL.md)
的完整回执/来源分离。harnessLoopUsed:true；targetGames:StarCraft TMG；
promptPackRoutes:fact_probe_prompt/harness_optimizer_prompt；
harnessToolsCalled:formation/native_los/fire_estimates。
UI与新决策未测，Skill/计划/记忆未改，trainingTruth:false。
任何完整结果或原拒绝差异撤回优化，性能未确认不启动12实验。
