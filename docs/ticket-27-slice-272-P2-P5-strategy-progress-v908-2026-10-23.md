# T27/S272 P2/P5：保留战略与工作后继分离 v908

## 实际消费补记

A 原负责人返回 `693519c6…`，保留方案并声明 Raptor 能力阻塞；v909 用真实 Native 场景查明当前已经接战，禁用原因被快照出口漏传，不等于能力不存在。A 普通作者另实际授权并完成地图几何读取，后继来源审核仍在流程中。

B 实际返回 `a0ce009f…` 并授权 investigate，要求大编制第二 Marauder 配置；控制后继已生效，但新候选两次被 Native 拒绝 `ARMY_SLOT_CAPACITY_EXCEEDED:Core`，因此大配置实验尚未成功，不能用旧小配置概率代替。保留原件/账，后续核职责分类与来源修订。详 v909 报告，不将派发当成策略改善或正式发布。

## 问题与诊断

v907实际运行结束：A事件5823/Plan r3，B事件5334/Plan r5，两者0在途、0ready，原进程均已自然退出。没有把观察超时当进程停止，也没有重发旧付费请求。

实际B `978614bb7c90f3a934d0366f6a2cede330c0e36b7d94bc0961f39eae0dc463b8` 同时写明：大编制第二Marauder比较仍是necessary_fact、修正后的candidate_context方法可用、retain、nextInvestigation=null。A最近决策 `1d2a8142…` 同样保留必要事项但不派发，其中Raptor菜单尚未读取。

按实际代码检查，问题不是分类转换丢失：dataQuestions已正确投影成requiredData/requiredDecisions；也不是本次Native计算错。根因是控制Interface把“保持军表/Plan”与“结束本题工作”混在retain里。旧合同允许保留所有未知而不给后继，既不完成验收，也没有足够具体的停因。全局/本题待查范围还必须区分，不能强迫局部作者解决整个Plan。

## 实施的共享合同

`roster-strategy-progress-contract-v1.mjs` 统一管理正常输入、输出检查和旧合同一次恢复：

| 决策情形 | 工作流处理 | 不代表什么 |
|---|---|---|
| 本题无必要未解项 | 可以据证retain | 不自动通过来源/最终Plan审核 |
| 有必要事实，明确nextInvestigation | 走既有有界事实任务 | 不让Host代选实验或答案 |
| 有实质revision | 走既有结构化提交/后续审核 | 不删除留下的未知 |
| 确有缺能力/外部输入 | 明确workflowBlocker及原问题编号、原因；缺能力还须引用实际来源 | 声明未自动核实，不能批准事实或Plan |
| retain且本题必要工作无后继/无明确阻塞 | 回同一作者纠错，可使用结构化查询命令 | 不重复买成功工具、不强制换表 |

尚未读取来源、可纠正的参数/配置错误、旧测量选错配置、偏好不花查询费用，不应伪装成工具不可用。合同不指定何种单位/战术更优，不要求模拟整场对局。作者若认为问题不必要，仍须显式解释分类与当前主张，不能由Host删除。

新字段 `workflowBlocker` 为可空结构；普通工作用null。它与军表/Plan保留分别表达。阻塞引用并入同一确切来源读取/校验通道；授权查询命令会明确清除互斥的阻塞状态。既有作者命令和局部修订共享同一最终语义检查。

旧付费回复仍按实际送达请求判断，不追溯增加字段。旧合同修复只通知当前held-goal负责人或产品当前revision的after-Teach负责人一次，原件/费用/错误/全局未知保留；不是扫描所有历史retain并重新启动它们。held-goal owner与新任务同checkpoint更新。

## 定点可用性证据

`scripts/debug-slice272-strategy-progress-v908.mjs`：先用真实B回复通过真实角色/core复现RED，再修改生产代码，执行一次GREEN。没有重跑v907及其它已通过门。

- `build/slice272-strategy-progress-v908-red.json`：实际未完成工作被当作完成作者turn保存，符合本次具体症状。
- `build/slice272-strategy-progress-v908-green.json`：6项通过——实际停滞答复进入职责纠错；同角色命令修复/冷恢复；原清单不变；旧回复不追溯；显式阻塞/查询互斥及缺源/错编号拒绝；来源并集；产品单次原子负责人恢复。
- 全部0 Provider、0 Native、0生产写。合成后续查询和外部阻塞只是故障注入，**不是模型真实策略或真实能力缺失证据**。没有把这个门当完整P2/P5或策略优化验收。

生产恢复前的只读选择确认：A回到“先读Raptor菜单后才能做存活测量”的本题负责人；B回到“大编制第二Marauder原比较”的本题负责人。不是从头初始化，也不是强制重跑全部调查。

## 文件与剩余工作

生产：新增progress-contract；调整read-role、semantic-repair、author-command、question-source-union、既有reconsideration入口、workflow核心。验证：一个具体失败脚本。文档：本报告、CURRENT_WORK、根TASKS/PROJECT_MEMORY。未安装、删除、提交或创建代理。

仍需实际模型选择后继并形成合格结论；条件经验的最终结论聚合/适用性审核/对局advisory检索仍待，不能用观察条数代替有效Skill。T27 5/6、T23 33/36，剩余S272/S248/S249/S250四片，正式Plan 0/6、对局0/12。

## Harness记录

harnessLoopUsed:true；targetGames:StarCraft TMG；promptPackRoutes:roster_workflow_strategy_decision；工具为现有事实实验/来源读取端口，离线门不执行Native；保留原公开决策与错误。uiTraceEvidence:本轮无Web操作，不声称UI验收。trainingTruth:false，无记忆/Skill晋升。若新合同造成合理条件策略被迫改动或无根据查询，不能发布该流程为稳定/策略无损，须对明确受影响的职责修正。
