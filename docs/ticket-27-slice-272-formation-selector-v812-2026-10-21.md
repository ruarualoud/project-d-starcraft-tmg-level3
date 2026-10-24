# T27 / S272：候选选择与字段绑定分离

P2/P3/P5，新 P0–P6 主线。T27 5/6，T23 33/36，剩余4片；正式Plan0/6、对局0/12。不把局部修复当最终策略验收。

## 已实际推进

v811同Run真实回复 `e71a0213186378b10e16593c46c65e8de603e2e0759fe42509f66e3df50548fb` 自行将空间参数移入queryArguments，保留comparisonBinding=null。当前编译器接受，Native结果 `adb4c69cf7aba5cafa38a588c5edb3315cb577731473e3e2a7b166b8a4356c56` 实际找到6个联合队形候选（11次评估，最多128；两单位一起应用）。这证明参数纠错与求解真实生效，不是模型口头说成功。

候选来自原source初始状态，而待修场景是另一分支；这一来源差异尚未解决，不能把候选存在视为目标场景已应用，更不能据此宣称攻击测量或策略改善完成。

## 本次具体失败与原因

模型先尝试从不存在的`optionIndex`字段绑定选择，然后收到通用依赖错误；通用提示要求保存来源用fromEvidenceNumber并保留空fromStepId，但formation_scene选择器实际上要求直接sourceEvidenceNumber。模型连续沿错误提示修订，第三次结果仍失败：

- 结果：`95f1f7740e4987343215f0b059e68eddb62cd68b0cb27ff78b1f4682662d4e44`
- 请求：`ab6eb21ab70f254f7092a18253febc7073b200aa92b78edb83dc973e93abaddd`
- 回复：`7a07e797c395a3b45bf585a5fc6a1345d4dabdecee9d83563eef5696c10986fe`
- 已有候选视图1174：`a7d5ad26d11acdfa931f21b6990c7796e5ea5d120c1f3d601c8fafbbc46dde6a`

目录的候选路径与选择说明本身正确；错误归属是编译诊断混淆了“选择器”与“通用字段绑定”。不能用手填坐标或改原回复绕过。

## 修复与唯一一次修后验证

`roster-workflow-laboratory-v1.mjs`在依赖解析之前统一检查选择器：保存回执号＋候选序号，或本响应前序步骤名＋候选序号，二选一。空步骤名、混合来源、对selections的重复字段绑定均返回专用错误，明确所需结构。来源提示仅复述模型已引用编号，不替模型选候选。

`roster-decision-workspace-run-v1.mjs`针对这个已证实的旧错误提供一次命名恢复`formation_selector_diagnostic_v812`；即使祖先曾有另一来源修复，也只允许本新缺陷一次。历史错误、轮次、费用不清零，正式编译／来源／Native检查不省略。

`scripts/verify-slice272-formation-selector-v812.mjs`：实际第三次失败RED；修后唯一一次GREEN，退出0、约1.1秒。验证原付费答复不修改、准确诊断、显式选择可编译、歧义拒绝、一次独立恢复。Provider0、Native0、生产写0。没有重跑v810/v811或其他旧门。

## 同Run续行

19623已安全退出于e6821/r4，running/pending均空。PID33413从同一`slice272-product-generation-v645-lqMWaS`加载v812；日志`build/slice272-v812-live-1792564023656.log`。不新建房间，不恢复旧A–F，不手改军表/Plan。下一确认实际模型选项、父场景来源一致性、原基线测量及战略负责人取舍。

## 实际纠错已被消费（e6840–6852）

1. 真实`5417491e…`补读1174，随后`6705debe…`使用直接`sourceEvidenceNumber:1174, optionIndex:0`、移除所有selections绑定；补读后`31ba5b20…`再确认。结果`be70e083b9dbeaa422c315d3f9911424076cd9bf7f7c620cc267aed8d1a5cbab`的failedWorkOrders为空，e6840实际入执行队列。并非Host修改模型答复。
2. 此次局部恢复3次Flash合计160372 units，Provider耗时18.095秒；不是端到端墙钟，也不含旧轮费用。全量原请求/回复/用量继续保留。
3. 实际应用返回`b74691b692edf8d74843bcc18ffde645f03bfb0ee8f289b9c4883d6633a9f615`：父状态预期b26eef、候选实际5984e，明确`PREGAME_LAB_FORMATION_SELECTION_SOURCE_MISMATCH`，不能冒充已应用。既有自动局部纠错已启动，真实`02a31100…`准确指出应在目标父场景重新求解；e6852继续同方法角色。未追加新代码或人工选场景。

## Harness边界

harnessLoopUsed=true；targetGames=StarCraft TMG；promptPackRoutes=method→typed input repair→Native→source review→strategy；harnessToolsCalled=现有静态队形／场景接口。agentDecisionEvidence为以上真实原件；uiTraceEvidence本次无浏览器新增；memoryTraceEvidence保留原任务与失败，不写真实对局记忆；trainingTraceCandidates=false。来源被静默改写、候选自动代选或反复授恢复均应阻止发布。最终用户可用Plan尚未通过。
