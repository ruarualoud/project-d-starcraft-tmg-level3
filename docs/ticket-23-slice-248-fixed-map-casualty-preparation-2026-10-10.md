# T23 / S248：伤亡分支固定地图准备复用

T23仍33/36、T27仍5/6；开放248/272/249/250，新12实验0/12。
性能未准出；完整地图/两类军表计划/对照及复盘目标不缩减。

## 具体失败与修复

原C82真实地图有1804规则行。生产`createCasualtyStrategyBatchFromOwnedState`
已在同一不可变快照内复用`createOfficialMissionMarkerControlUnitBatchV2`，
但每个损失结果仍调用单次有效尺寸批次，重复复制、校验全部固定地形。

新的具体探针63349先真实失败：
`OWNED_CASUALTY_REVALIDATES_THE_UNCHANGED_COMPLETE_MAP`，1804不等于0。
原整张地图复制也实际发生1次。修复前完整结果和拒绝原因已独立保存。
未重跑之前的LOS门或完整模型实验。

两个生产文件变更：

- `official-elevation-effective-size-rules-kernel-v1.mjs`：增加只持有私有、
  不可变地图/来源的有效尺寸操作。固定输入校验一次；每次复制实际单位、
  subject，并原样执行`canonicalModel`的来源、存活、底盘、支撑与高差检查。
  不返回可由外部注入的准备上下文，不复用旧模型结论。
- `official-mission-marker-control-kernel-v1.mjs`：只有已有固定地图owner
  使用新操作；普通单次入口保持原行为，空战场仍不提前执行尺寸校验。
  Supply、状态、连续性、LOS、每个标记的控制与完整结果hash保持原计算。

具体bug探针为`probe-ticket-23-fixed-map-casualty-preparation-v1.mjs`。
唯一绿64897 exit0；模块由这次实际导入/调用解析，不另跑重复语法/全量门。

| 同一owner内的输入 | 地形顶层校验次数旧→新 | 整图复制旧→新 | 局部观测毫秒旧→新 |
| --- | ---: | ---: | ---: |
| 初次实际单位 | 4024→4024 | 2→2 | 732.947→895.441 |
| 一模型伤亡 | 1804→0 | 1→0 | 122.157→29.691 |
| 空战场 | 0→0 | 0→0 | 1.167→1.007 |
| 模型位置改变 | 1804→0 | 1→0 | 130.977→10.154 |
| 恢复原实际单位 | 1804→0 | 1→0 | 114.457→8.437 |

五条**完整**控制结果及hash全部等于修复前；错误单位来源/支撑/地形保留
原拒绝原因；输入未修改，owner不受随后外部地图修改影响。
本表是单次局部观测、有计数instrumentation，非统计或完整行动性能。
初次准备没有变快，不用它或局部差值宣称端到端达标。

## 受影响原查询：一次完成，性能仍开放

只追加原C106 marker2完整队形查询一次，因为其生产火力/伤亡分析直接
调用本次修改；不调用模型、不写原房、不换地图、不减候选/样本/Skill。
进程65514自然exit0，输出`fixed-map-casualty-preparation-v1/original-c106-once-v1`。
完整输出与原回执deepStrictEqual，原请求也与前一批完全相同；不是只比hash。
响应hash仍`c4133488cc6f9615aa49a7b2d9b4e03c72a4e51aff7df403cdc5595f32c24f99`。
780生成/28检查/16实际实例化/4完整选项保持；不重复本次绿或已完成查询。

| 这次实际阶段 | 秒 | 包含关系 |
| --- | ---: | --- |
| 原C106完整查询 | 101.957 | 真实查询端到端，未带模型 |
| 候选搜索/合法性 | 35.812 | 查询内；全部候选范围保留 |
| 四队形比较batch | 65.553 | 查询内，四worker并行，不把四份相加 |
| 单worker图计算 | 13.960–14.699 | 比较batch内 |
| 单worker静止火力阶段 | 44.759–50.049 | 从累计事件差得出，比较batch内 |
| 单worker走打段 | 0.139–0.173 | 比较batch内 |
| 历史恢复 | 15.848 | 查询外，单列 |
| 查询上下文准备 | 6.091 | 查询外，单列 |

前一源版本同请求231.373秒，这次101.957秒；不是整机隔离的受控A/B。
未直接修改的搜索/图计算阶段也明显变快，因此不能把总降幅全部归因于
伤亡准备复用；本轮确定消除的是实际计数复现的重复复制/校验工作。
本次未带模型，不可称为真实模型完整行动102秒；一分钟目标仍不满足。

旧完整查询231.373秒仅为前一源版本的实测；历史恢复和上下文准备另记。
暖态A7行动95.877秒/4Flash891006units属于上一源版本，不重跑或冒充本轮
实测。当前新增费用0，累计A95.197314/B138.052447/C124.279803各¥200不清零。

下一步按真实残余热点继续：静止火力44.8–50.0秒的完整枚举/尺寸/LOS准备，
以及搜索35.8秒与后续比较65.6秒的依赖是否能重叠。先定位实际重复工作，
不通过删枚举/样本/模型信息或换简图取巧。12实验仍未启动。

## 最终diff范围

两处生产源：新增私有固定地图有效尺寸操作、接入已有控制owner。
一个新探针仅复现此具体bug；一份本报告，CURRENT_WORK/TASKS/PROJECT_MEMORY
更新现状与可持续知识。无其它功能改动，无新通用测试，无提交。
红63349/绿64897/原查询65514全部已终态。

## 证据与保留边界

私有目录：`build/ticket-23-three-arm-official-standard1-20261008-v1/`
`lossless-next-four-batch-20261010-v1/fixed-map-casualty-preparation-v1/`。
保留baseline、red/green完整evidence、运行记录及原请求的一次执行结果。
原房/历史receipt/官方源/地图几何/付款数据均不改，无代理/K3/提交。

本轮使用[diagnose](/Users/rualoud/Downloads/codex_project/project-d/.agents/skills/diagnose/SKILL.md)
的具体失败→来源修复→唯一对应验收，以及
[agentic-harness-evolution-loop](/Users/rualoud/Downloads/codex_project/project-d/.agents/skills/agentic-harness-evolution-loop/SKILL.md)
的完整工具结果/来源隔离。
`harnessLoopUsed:true; targetGames:StarCraft TMG; promptPackRoutes:fact_probe_prompt,
harness_optimizer_prompt; harnessToolsCalled:formation/casualty/mission_control;`
UI/新Agent决策未测，既有Skill/计划/记忆未改，trainingTruth:false。
任何完整结果或原拒绝差异都撤回优化；性能门不通过不启动12实验。
