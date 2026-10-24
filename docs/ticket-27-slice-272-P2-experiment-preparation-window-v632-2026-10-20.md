# P2：事实实验规划的准备窗口补齐

T27 / S272 / P2，2026-10-20。只处理新流程中真实出现的阶段接线漏口，不恢复历史调查。

## 失败证据与原因

同一主 Run 的地图事实角色在实际 1229、1232、1235 连续三次读取保存资料。普通总体策略和局部 Teach 已有有限准备窗口，但 `roster_workflow_experiment_planner` 被遗漏。用这三条真实读取的产品断点构造下一请求，仍允许 `read/catalogue/finish/conclude`，没有必须选择方法／回交的阶段。

诊断区分三项：角色漏接窗口、实际工具能力缺失、上下文投影省略。此次定点请求构造已直接复现第一项；它不证明另外两项在所有场景均不存在。

## 修改

仅修改 `packages/roster-strategist/roster-workflow-read-role-v1.mjs`：

- 事实实验规划也使用有限资料准备窗口；目录检索与正文读取均计数，默认三批，可配置。
- 窗口后只允许提交必要可执行 `workOrders`，或提交有来源的结论／控制回交；不能继续同一准备阶段。
- `answered` 仍要求必要事实已回答；具体能力缺失用 `blocked`，新调查／战略取舍用 `strategy_required` 并保留未知。
- 实验方法准备窗口、已完成工具批次后的总体决策窗口、纠错次数是三种不同状态。没有新增整个任务的查询上限，没有窗口到期自动通过。
- 新获授权的方法仍可读新资料；旧请求的精确传输重试不因新合同改写。
- 综合阶段不再同时提示模型去执行被本阶段禁止的目录查询。

## 定点验证，未重跑旧门

`scripts/verify-slice272-experiment-preparation-window-v632.mjs`：

1. RED：真实三轮断点仍提供 `read/catalogue`。
2. 修复后仅运行一次 GREEN：请求只允许 `finish/conclude`；原任务和必要问题逐值保留；前两轮正常读取、窗口配置为五轮、新授权方法及旧精确请求重试均保留。

真实输出：

```json
{"passed":true,"actualReadCalls":[1229,1232,1235],"experimentPreparationReturnsToChoice":true,"necessaryQuestionsPreserved":true,"normalAndConfiguredPreparationPreserved":true,"exactPendingTransportPreserved":true,"newProviderCalls":0,"newNativeCalls":0,"productionWrites":0}
```

此门验证产品请求构造接缝，不证明模型一定选出好实验、工具全部成功或完整问题必定收敛。

## 原 Run 安全续接

85913 收到定点安全退出请求后完成 1238／1239／1240 及当前 advance，终态 `requested_observation_boundary`；r8、机械阻塞 0、语义项 15、活动工作 3。没有中断 Provider 请求，没有重置纠错／费用。

99957 使用原产品客户端、原 Run、无额外检查标志加载本修复。恢复时没有未对账的活动 Provider 请求，军表／Plan／私有后继均未重建。

旧版本退出前，地图与计划延续的工作单已进入产品自己的类型化参数纠错：一项误把 inspect 当作含 evidenceNumber，另一项绑定的 domainId 被工作单检查要求明确参数。它们不是已通过实验，不因本准备窗口门禁通过而清除。新进程继续这些原生纠错和战斗事实工作；若出现实际停点再按原故障归属处理。

P2 的真实同素材 Token／耗时对照见 [v631报告](ticket-27-slice-272-P2-planning-catalogue-live-comparison-v631-2026-10-20.md)。本次不重跑它。

正式 Plan 0/6，对局 0/12；T27 5/6，T23 33/36；相关剩余 S272／S248／S249／S250 共 4 片。策略改善、完整 Teach 闭环及 P6 最终产物仍待验收。
