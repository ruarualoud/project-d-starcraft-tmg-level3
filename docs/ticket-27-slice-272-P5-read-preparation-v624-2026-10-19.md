# P5：重复只读请求转决策阶段，追加重验额度不泄漏

T27/S272，新P0–P6。正式Plan0/6、对局0/12、剩余4片；不是最终P6报告。

## 实际根因，不是资料丢失

v623的目录标签修正已真实生效：对手域原3条检索经已付费回复重验执行，然后模型读到了r6的hypothesis/counterResponses（1807/1808/1809），status均为read，内容完整。

下一次回复明确说“已经读到”，却再次请求相同指针确认。旧代码将其当READS_NOT_CONVERGED错误；更糟的是，前一次工程恢复将correctionLimit设为1后从未在成功后归还正常值，因此一次正常重复读取就导致产品停下。

## 统一修正

- 仅重复已交付的immutable read/catalogue响应，不作为新的工具/规则错误或事实通过。阶段改为`read_preparation_return`：当前角色须用已有证据给下一实验、结论或明确战略回交；不能无限重复准备。
- 只限制这一证据准备阶段。后续新方法/明确授权的新调查可以读取新细节，不是禁止整个任务继续查询。
- 实验角色该阶段合同只允许finish/conclude；其他角色按职责finish。缺失/错误路径仍是缺失，必要未知不能因阶段结束而消失。
- 一次追加恢复仍只有一次修复验证；验证无效继续停。验证成功后归还正常独立纠错周期，并保存completedCorrectionRecoveries及旧failureHistory。调用、费用、原错误记录不清零。
- 已完成的重复读停点可通过现有revalidateRoleReply重验原回复，不购买一次“请别再读”的模型请求。活动未知网络请求仍不在此通道。

## 定点产品接缝验证

`node scripts/verify-slice272-idempotent-read-phase-v624.mjs build/slice272-projection-owner-v565-inlKbk`

实际保存停点RED：产品不允许重验completed_no_progress原回复。修改后一次GREEN，真实workflow.dispatch→read-role（隔离内存Adapter）：原回复不变、0Provider/Native/生产写、11次原调用保留、转needs_model_choice而非停/通过、下一请求仅finish/conclude、追加额度成功后恢复3、历史保留。没有重跑旧门。

这证明具体恢复/控制合同，不证明正式Plan或全部未来模型输出都能收敛。

## 真实P3部署进展（v623停止前已发生）

`review-resolution:r6:plan_continuity:method:1889d0e146a2bacc:order0:deploy-goliath:input-repair:order0:deploy-goliath`实际Native结果completed/ok：

- 父`7f8f2e566107837a062363e6b77759feb74bdd13d553e403b2d7e1c43f7a4ed1`→后继`14c77e62ec5e874841487ffc0bd3e1c2db136c416646a935836e907a6b6fc485`。
- Goliath单模型位置(27,33)in，currentSupply2，deployed/onField，Movement after_action。
- 真实入口red-entry-1，路径4.575in≤7in；完整底盘边界、扫掠路径、完整编队及地形/高差/入口均由原生执行器检查。
- 原失败逻辑节点的resolvedByWorkId指向此成功来源，不是第二次部署。这里是私有条件实验，不是真实对局史、不证明全部9单位/到其他点的到达，也不宣称该点最优。

## 当前续行与账目

73495已terminal product_needs_repair，完成1090；仍r6、机械阻塞空、语义16、活动32。新PID85838在同Run加载v624，日志`build/slice272-live-product-review-v624.log`，通过`--revalidate-read-only review-resolution:r6:opponent_and_counters`走原产品入口。实际阶段切换、后续收口及全表Plan仍待观察。

截至1090本Run已知47,545,219Tokens、可计价估USD9.089258430，项目已知154,161,142Tokens。767与955共295843Tokens仍因reportedModel缺失未计价，942/旧未知费用保留；1091+未计入。重验不重复计算旧使用量，不臆测汇率/服务商实际账单。
