# T27/S272 P5：无进展停止后的来源与责任交接（v993）

## 当前结论

定点交接验证已通过并实际消费，随后发现责任返回环，再次停止：PID55600退出0，原B r23/event12180、0在途。v992两次成功战略回复未重新购买。正式Plan0/6、对局0/12，T27 5/6、T23 33/36，剩余S272/S248/S249/S250四片。

这是P5停止／恢复合同修复，不是新的实验或策略验收。不能把“停止重复方法”解释成“原事实已查明”。

## 失败与整条交接边

真实来源都在，但旧 `frontierResponse` 只按字段名前缀选择事实；新的 `originalObservation/repeatedObservation` 因此丢失。结算器只认识模型 `strategy_required`，不认识明确保存的工程停止交接；已完成的作者决定没有后继。若只解开调查hold，旧needs_repair又会挡住它。

修改一条完整路径：

`保存的重复证明 → 核对源身份与绑定 → 已完成的作者决定 → 原问题只读核对 → 独立来源／覆盖审核`

- 共享图按持久停止证明、原/重复workId及resultRef、当前规则/军表绑定找实际来源，不按任意字段名授予事实资格。
- 共享结算器承认显式控制返回；作者没有授权新调查时，只传回其实际决定、原问题和原证据，不批准事实。
- 入队验证重新推导同一返回权限。仅被这次已完成责任接手的旧停止标为 `returned_to_owner`，仍保留noProgressStop、旧失败、原结果和回交记录；不全局清错或重置计数。
- 返回角色只允许read/catalogue/conclude，workOrders为空。不能通过“核对结论”重新执行刚停止的方法；未回答的必要事实仍须保留。未知到达轮次不能被包装成已测结果。

涉及四个产品模块：`roster-workflow-graph-v1.mjs`、`roster-workflow-frontier-settlement-v1.mjs`、`roster-decision-workflow-v1.mjs`、`roster-workflow-read-role-v1.mjs`。

## 定点验证记录

脚本 `scripts/verify-slice272-control-return-sources-v993.mjs` 只读实际r23停点，所有状态/产物写入内存，真实Provider0、Native0、生产写0。异常模型出口使用注入，不伪称真实生成。

- PID49043 RED：实际两份来源丢失、实际保留决定没有后继。
- PID51948修后：来源交付、控制回交、精确消费旧停止且保留历史、错误回执反例四项通过；真实角色请求出口未触达（注入调用0），此项失败。
- 已通过的四项不再跑。剩余出口增加实际run结果诊断，PID53214仅 `--remaining`：明确失败于注册器拒绝合法的maxItems=0，并非模型/网络或旧证据丢失。
- 修正 `output-contract-registry-v1.mjs` 的最大项数下界1→0，保留非负整数、min/max一致性和实际非空拒绝。依据用户“具体修复后可追加一次”的授权，PID54424只补剩余出口，一次GREEN/exit0：实际角色请求到达注入边界、没有finish权限、workOrders最大0、[]合法而非空仍拒绝。
- 最终注入调用1，真实Provider0、Native0、生产写0；v991/v992及本轮已过四门均未重复。新增合同在首次测试暴露了注册器假设，未让生产付费试错。

原始日志：`build/slice272-v993-return-gate-1792795916448.log`、`build/slice272-v993-return-remaining-1792796055730.log`、`build/slice272-v993-return-final-1792796177186.log`。

## 未完成与回退条件

出口已通过且同产品真实消费，随后发现下述返回环，生产再次停止。不得直接resume同一授权，不能根据接线或停止门通过声称生产完成。

### 实际消费与 v994 立即停止

上述续接已执行。实际请求trace `19a2e224-e067-4f3a-be19-99ac5c1a8a00` 确实使用closed-method合同：action仅read/catalogue/conclude、workOrders最大0。回复 `4fa227fe-8dca-484d-8d5f-dc32caf9a29d`（原件a4eb8898）没有新实验，并纠正作者的误分类：**到达轮次仍未测得，不能作为已答事实**。

但它又要求刚拒绝同一授权的负责人重新作决定。发现后立即SIGTERM停止；当时已开始的来源确认排空并保存第二回复 `ea598503-4a38-46df-93e3-1cc67bd7ca8c`（原件68a5eaf9），没有启动下一负责人调用。两次真实调用共509313units、Provider21.493秒；原始费用继续记账。没有Native重演、Plan/军表修改或事实批准。

最终角色结果 `943852ba66adeed33d3b05efbb5c385917f4c2ab1e6e24234e6bbc79dc1ac647` 为strategy_required；event12180已把下一负责人入队。这正是“作者拒绝→事实角色仍缺证据→再问同一作者”的控制环，不是已收敛。

v994从来源修停止边：

- 当前角色若处在明确的closedNoProgressMethod且未获重新授权，返回strategy_required时直接持久停止，早于下一来源确认／纠错；不把未解项清空或认成通过。
- 派发器还核对已保存旧版结论及其原作者身份，拦住已经排队的同类重复负责人；不改原回复，不迁移或手写生产结果。
- 非关闭的方法、真正answered返回不套用此停止条件；这不是所有语义循环的完备识别器。

复现脚本：`scripts/verify-slice272-closed-owner-loop-v994.mjs`。最初夹具选中被hold旧节点，第二次诊断又漏optional访问，均不能当有效复现；修夹具后实际排队边RED：执行器被调用1次、没有noProgressStop，错误为UNEXPECTED_OWNER_DISPATCH，真实Provider/Native/生产写均0。具体修复后PID61688一次GREEN/exit0：实际已排队边在执行器前停止（0调用）、冷恢复拒绝、原已完成角色逐值不变；实际原回复命中共享判定，非关闭方法及answered反例不误判。日志 `build/slice272-v994-owner-edge-green-1792796912700.log`。v993已过门未重复。首次回复早停已接同一判定，但本次没有再付费调用证明该新分支。

最终diff摘要：v993修四个职责交接模块及注册器maxItems零边界；v994新增共享控制进展判定并接角色出口／核心派发入口。两份定点复现脚本只覆盖这两处实际失败；当前入口、TASKS及durable memory同步。没有新对局、数据更新、提交或删除。

原未解的到达事实与“作者拒绝该方法”之间的职责冲突仍须解决，不能直接恢复下一负责人，不能把本保护门当作完整Plan发布或策略优化。

若后续再出现相同条件、相同请求、无新证据的循环，立即持久停止并修复，不自动加轮次。必要事实与策略取舍仍需真正完成；来源接线测试不等于Teach收敛或策略改善。原始模型请求／回复、公开理由、费用及未知费用均保留。

Harness：`harnessLoopUsed=true`；路由为停止控制→战略作者→原事实负责人；没有UI/对局动作，没有训练晋级。成功标准是实际角色能消费同源原件并正确交还责任，而不只是字段存在。
