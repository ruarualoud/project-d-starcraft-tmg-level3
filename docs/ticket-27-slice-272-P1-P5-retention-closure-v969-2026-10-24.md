# P1/P5：停止重复调查，修复保留决定的关闭回执

2026-10-24，T27/S272。T27 5/6、T23 33/36，剩余 S272/S248/S249/S250；正式 Plan 0/6、新局 0/12。

## 当前停点与未完成部分

**后续已更新**：v970修复调查因果继承并定点通过后，同B恢复；v969真实关闭审核通过，event11257保存`optional_comparison_closed`，原件报告`b1689547412d3ffc0494aa2a1215620397e01653c1acd0856b38a90b3aa1a966`。没有新增火力实验或批准Plan。当前跟随[v970报告](ticket-27-slice-272-P2-P5-revision-inquiry-carryover-v970-2026-10-24.md)，下段是修复前停点历史，不用于重复启动。

原 B `build/slice272-product-generation-v645-8aBuEV`，workflow `decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`，**event11220 / r22**。
PID43040已退出，0在途；没有重启。军表/Plan未新增修改，仍合法2000矿/145气，尚非最终验收产物。

发现 Teach 再次要求相同到达/控点调查并重新提出可选 Goliath 比较后，立即发出一次优雅停止。当前产品操作在退出前完成了已有的两次作者调用，保存了后继 `product:after-teach:r22:subject-v1:investigation`，状态ready但未执行。不能把发停止指令时的event当作最终停点。

**不要直接恢复 runner。** 比较关闭合同已定点修复，但地图调查重复和修订理由审视仍未解决。需先使旧调查结论/停止边界进入当前责任决策，避免重新初始化同一实验；不能手删必要问题、手改模型理由或让降低VP目标代替证据。

## v968真实结果：接口已交付，语义纠错未通过

实际 Teach 请求 `63958f4afe66c3e19634a8756eb1b9cb0f2948a29fc2b7aea0a9ac7e56c5e89b` 含 `revisionReviewContext`、原作者的“measured absence”理由及非批准标记。结果 `832f69426759ecf41a30b162dece490e7b25a389e7f24534c2bdbdaa18b20794` 仍把从R2延后到R3的目标称为正确修订，未核对“未测”如何成为“测得不能到达”。它再次提出marine-1/marauder-1到达轮次与控制范围问题。

随后作者结果 `dd40f819fc2eecb546dfbb0034be8631d20d28ee538fd9660013fe1d5df0a350` 又授权同类初始化/部署/移动查证；还把已花满2000矿情况下的“剩20矿如何用”保留为待决。它没有重跑火力实验，也没有新改表；这些是后续责任/未知继承排查证据，不是策略提升。

## 本次确认并修复的来源缺陷

作者已明确申请保留方案、结束可选比较：

- 作者：`product:strategy-hypothesis:v1:3d74cf4d181443d17c20:purpose:v2:closure-reconsider:r22`。
- 结果：`402c3b814db9b50713398d1df231d786ae1b1cb727fa53b2a9bd3f7e7705e33f`。
- 原保留回执：`a0f7a16ee6eb1a3f7ce491149732d69f3f856daef2b5efc0a30d18e27c42c8bd`。

原回执生产器输出 `{applied:false,status:'retain',decision,draftUnchanged:true,inquiryDispatch}`，不带 `acceptanceGranted`；关闭消费者却要求该字段严格等于false。实际作者身份、当前依赖、请求、回复、选择内容均匹配，仍被静默判成没有关闭请求。Teach因此收到的comparisonMemory是awaiting_owner / comparisonResolved=false，而非已提交的关闭申请。

修改两个产品文件：

1. `packages/roster-strategist/roster-workflow-decision-records-v1.mjs`：非修订回执统一明确 `acceptanceGranted:false`；增加同源回执识别。历史缺字段仅在整个回执可由原已验证决策逐值重建时识别，不修改旧工件。
2. `packages/roster-strategist/roster-comparison-closure-v1.mjs`：保留分支使用该同源识别；已应用修订仍要求显式非批准与原有前后状态一致。显式true/null、不同决定、草案已变、过期依赖继续拒绝。

识别关闭申请只让它进入独立审核，不是自动关闭、不把未测结果补为事实、不批准Plan。没有增加轮次或清计数。

## 一次定点红绿验证

脚本：`scripts/verify-slice272-retention-closure-outcome-v969.mjs`。

- RED51752：真实r22原回执无法解析成关闭申请。
- GREEN52141：原历史回执和新生产器均可识别；五类损坏/伪批准回执与过期地图拒绝；实际公共Run只排入一次关闭审核，冷恢复再次请求不重复排队。原请求/回执/Plan/费用未改。
- 日志：`build/slice272-v969-red.log`、`build/slice272-v969-green.log`。
- 0Provider、0Native、0生产写。没有重跑v967/v968或无关门。

这是具体阻塞的工程证明；尚未把修复载入真实B，不能称全流程已收敛或无人干预稳定。

## 本轮真实调用记录

PID43040共三项工作、六次调用：比较关闭复核2、Teach读取/结论2、退出期间作者及其纠错2。合计 **1,079,689 units**，Provider记录延迟合计 **84.572秒**，不是整个运行耗时。全部原账及未知费用保留，不凭units猜人民币费用。没有新Native实验、房间或战斗。

## Harness记录

harnessLoopUsed=true；targetGames=starcraft_tmg；promptPackRoutes=local_teach/strategy_decision/comparison_closure_review。harnessToolsCalled=原件读取、同产品Run关闭审核排队（内存验证）。uiTraceEvidence=无新UI；agentDecisionEvidence=上述真实申请及重复调查公开理由；memoryTraceEvidence=旧原件和冷恢复保持；trainingTraceCandidates=无。rollbackOrDemotionRules=同题同证据无进展立即停，错身份/伪批准/未解释重复不得继续。userVisibleChecks=明确区分申请关闭、审核通过、事实已证、正式Plan发布。
