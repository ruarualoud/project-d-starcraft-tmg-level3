# Detonation 接线工作台（进行中）

整版人人长任务保持活动，完整原子仍6/18。[远程接线](detonation-ranged-wiring.zh-CN.md)已推送757334c；[普通近战/HITS及嵌套](detonation-nested-wiring.zh-CN.md)本批6原生分支71动作、Web2房8确认与6房结算审计通过。政策1.0默认，1.1显式进入Root3.228；未进入正式Wave4工厂。

已完成：精确两条Detonation来源与共用BM/反应限制；将移除模型留场几何；已分配模型从后继伤亡选择排除；保留原骰与原选择；多目标每行分配（含零伤亡）；逐来源reservation见证；HITS父槽保存/恢复；两层栈；原攻击者阵亡后完成原攻击。旧30动作与政策v1远程16动作当前冷重放一致。

接下来按实际消费者推进：

0. Stukov Bio-Kill Switch及武器/冲锋四定义本批已验，见[战斗接线](stukov-combat-wiring.zh-CN.md)：全场感染敌军Damage(2)，结算后只清除实际受伤者INFESTATION。直接伤害恢复已跳过重新发动能力；Corrode Armor继续。
1. 委托攻击先核对各父所有者：Overwatch/Khassar/Attack Target/声明替代等拥有自己的行动守卫。子HITS期间保存并暂停其父槽，原批次恢复后再恢复并发布完成事件。不能只加一个beforeCasualty栈就认为这些守卫已经适配。
2. 激活外HITS/直接伤害显式保留activationId:null和FAQ1.3的标记持有者优先权；现HITS阶段的Detonation子来源仍只证明普通激活内，后续应版本化扩展，不覆盖已冻结v1/v2房绑定。
3. Disengage失败模型、Defiler Consume祭献、其他直接移除。Consume须先支付/保留其他成本，子反应不能花掉承诺的费用；原施法者被反应杀死后继续封存后继。离场后备模型不能开在场反应，设置回合能力锁仍生效。
4. 覆盖无BM、每激活反应已用、严格2英寸、多目标同批双方效果队列、对应完整回合和Web入口。仅普通攻击/HITS嵌套不能计完整Detonation原子。
5. 工程发布切换releaseId后，进口Terran的转换政策还引用原Builder发布；需在新的工程发布中重编建军组件并独立验收。保留旧工程输入供历史冷重放，不能放宽FACTION_UNIT_CONVERSION_RELEASE_MISMATCH。本批零伤亡行用合法Queen+Hatchery，Goliath转换问题仍列为后续整版接线事项。

每个原损伤批次真正恢复后才发布其完成/伤亡/Supply事件；子HITS本身的实际伤亡仍走Carrier、Infestation、Friendly Loss等正常后继。逐房核对原结算哈希/伤亡顺序、Supply只记实际移除、无悬挂槽；原生签名+幂等+关闭重开冷恢复，再做双席真人确认。

39来源阻断与估算几何保持；付费模型、K3、AI对局、复盘和生产发布继续暂停，模型调用0。
