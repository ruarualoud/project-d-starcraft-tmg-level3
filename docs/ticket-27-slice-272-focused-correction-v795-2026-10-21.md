# P2/P5：局部作者纠错不再重新发送全部实验背景

## 实际失败

v794原Run恢复到e5634/w557/r3。此前混合引用问题已实际补读（e5621–5625等），作者仍在新回复`ba12cb0034758f9df773f8b549e308b60f647496f7136070d4d8504d12117f1d`中使用`author_decision`声称已经retain，并把旧候选2000分误作当前军表。

真实新请求`d897a24308a69a9161a0a23b033cc755cfa770f874516eb917e590220294cb88`已经包含当前Builder1490分/余510和完整当前表/Plan。因此不是数值漏传，也不应由Host把模型答案改正确。它仍发送185,425输入units、1,874输出units，合计187,299；Provider17.044秒，非整流程墙钟；本轮无价格回执，不猜人民币费用。原账保留。

候选解释：实际数据漏传（已排除）；局部纠错依然走整套实验上下文（已复现）；模型未能遵循已交付纠错（需修后实际验证，不能以输入变小宣称解决）。原进程85853已退出，0运行中请求。

## 改动

- 同一工作流增加只读上下文发布端口，沿用`publish_evidence`/`read_evidence`，不是新增实验引擎。
- 当前战略作者的局部纠错保留完整当前军表/Plan、当前Builder结论、问题清单、任务/比较目标、纠错原文、输出合同以及新读取结果。
- 旧实验资产、返回轨迹、预算备选与重复Native补充改为精确指针目录；整个原请求作为不可变输入快照保存，使用同一证据数字与读取入口访问。没有删除原件、总结替代、假装新证据或改变引用准入。
- 只对未使用新上下文合同的旧作者分类停点恢复一次；当前合同再次失败不自动再授权。旧回复、错误、费用保留。
- 不改规则、军表、Plan、战略选择、既有验收Schema或官方数据。此轮仅覆盖战略作者局部纠错，不能宣称其它角色也完成了同样改造。

## 唯一定点证明

`node scripts/verify-slice272-focused-correction-v795.mjs <原workflow目录>`，一次RED→一次GREEN。

实际保存素材：671,490→287,946字符，减少57.12%。这是同素材请求大小，不是实测模型Token或策略提升。13个延期资料块均从同一状态机读取入口逐值读回；当前表/Plan、requirements、scope、输出Schema相同。旧错误回复仍被拒绝。旧原文不变，生产写入0、Native0、真实Provider0。

当前代码实际入口`roster-decision-workspace-run-v1.mjs`直接转交control给共享角色执行器，未另造测试专用读取接口；新发布器位于共享调度器。

## 当前恢复

PID99312已退出，原`slice272-product-generation-v645-lqMWaS`停于e5643/r3/w557，0在途。实际回复`a8075fea…`仍错误分类及误用旧2000候选，未通过；新请求87088输入＋1851输出=88939 units，Provider9.300秒。输入减少不等于纠错或策略成功。下一已转v796显式语义修改协议，见对应报告；不再按本段旧PID恢复。

T27/S272仍5/6，T23为33/36，余S272/S248/S249/S250四片；正式Plan0/6、游戏0/12。

## Harness记录

- harnessLoopUsed: true
- targetGames: StarCraft TMG
- promptPackRoutes: roster_workflow_strategy_decision 的 local_contract_feedback
- harnessToolsCalled: 同产品工作流、publish_evidence、read_evidence；无新规则操作
- uiTraceEvidence: 无新UI操作；同Web/App后端入口，非另建实验链
- agentDecisionEvidence: 原ba12cb及新a8075fea错误均拒绝；v795未解决真实语义问题
- memoryTraceEvidence: 原件、工作单、问题、费用保留；精确背景快照不进入实战记忆
- trainingTraceCandidates: 无；trainingTruth不提升
- rollbackOrDemotionRules: 失去完整当前Plan/问题、延期原文不可读、错误通过或重复授权均禁止加载
- userVisibleChecks: 原Run恢复；局部门禁不等于最终2000分策略军表/Plan成功
