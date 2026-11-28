# Detonation 接线工作台（进行中）

整版人人长任务保持活动，完整原子仍6/18。[远程接线](detonation-ranged-wiring.zh-CN.md)已推送757334c；[普通近战/HITS及嵌套](detonation-nested-wiring.zh-CN.md)本批6原生分支71动作、Web2房8确认与6房结算审计通过。政策1.0默认，1.1显式进入Root3.228；未进入正式Wave4工厂。

已完成：精确两条Detonation来源与共用BM/反应限制；将移除模型留场几何；已分配模型从后继伤亡选择排除；保留原骰与原选择；多目标每行分配（含零伤亡）；逐来源reservation见证；HITS父槽保存/恢复；两层栈；原攻击者阵亡后完成原攻击。旧30动作与政策v1远程16动作当前冷重放一致。

本批[模板与Seeker激活外](detonation-template-outside-wiring.zh-CN.md)完成：政策1.2/Root3.232，6原生分支83动作、2完整回合、Web3房16确认；当前V3五房74动作及早期五房50动作冷恢复通过。完整原子仍未登记。模板Web v1未计通过，v2修驱动后通过；伤亡hash的产品可读摘要列W4-03。Seeker完整回合已绑定来源延迟政策、保存父槽和空激活身份，当前标记持有者优先；双方全灭后的空军表菜单已修，从原签名断点续验到R2并冷恢复。

政策1.3/Root3.233本批已验，见[Overwatch与多武器](detonation-overwatch-wiring.zh-CN.md)：5原生分支46动作、Web2房6确认及5房63动作冷读；两种步兵均执行激活外Auto射击，Marine另执行多武器攻击者阵亡/存活两分支。完整原子仍6/18。

新核对：Firefly只Target Flying，不能直接射击Ground感染步兵，因此本批直接射击采用Target All的Auto-Turret；Khassar可作为敌方射击/近战的实际攻击所有者，政策1.4已验。Queen Domineering Presence只有任务Supply效果，不是攻击委托。[Auto/Ocular同房](overwatch-coexistence-wiring.zh-CN.md)现已实际复现并修复：2原生分支21动作、Web2房5确认与4房29原动作冷读通过。双方各一类炮塔。此前进口Raven同方组合待办有误：Raven无Ground，不符合Stukov准入，Builder反例已拒绝。

政策1.4/Root3.235本批[Khassar](detonation-khassar-wiring.zh-CN.md)已验：6原生分支51动作、Web2房10确认、6房结算审计与当前/前批8房71动作、旧Khassar3房9动作冷读；尚未计完整原子。Target/声明、其他HITS和直接移除继续。

政策1.5/Root3.236本批[Target与射击声明](detonation-declared-target-wiring.zh-CN.md)已验：5原生分支82动作、2完整回合、Web3房13确认、当前/前批7房99及旧2房11动作冷读通过。Head Shot死来源激活窗口回归已修，原失败run撤回通过；新run单独验收。工程发布V2重编Builder转换政策并严格重绑两张不变部署卡，进口Goliath/Tank各实付1BM。完整原子仍6/18，继续其他外部HITS和直接移除。

接下来按实际消费者推进：

0. Stukov Bio-Kill Switch及武器/冲锋四定义本批已验，见[战斗接线](stukov-combat-wiring.zh-CN.md)：全场感染敌军Damage(2)，结算后只清除实际受伤者INFESTATION。直接伤害恢复已跳过重新发动能力；Corrode Armor已验，见[攻击后接线](corrode-armour-wiring.zh-CN.md)。
1. 委托攻击先核对各父所有者：Overwatch/Khassar/Attack Target/声明替代等拥有自己的行动守卫。子HITS期间保存并暂停其父槽，原批次恢复后再恢复并发布完成事件。不能只加一个beforeCasualty栈就认为这些守卫已经适配。
2. Seeker阶段末Marine接受/拒绝及实际子HITS已验证activationId:null和FAQ1.3当前标记持有者优先权；Trooper未执行Seeker分支。其他Bile/Drone/Storm/Photon父节点继续；政策1.2对这些组合先在构造时拒绝，下一版本逐所有者接入。
3. Disengage失败模型、Defiler Consume祭献、其他直接移除。Consume须先支付/保留其他成本，子反应不能花掉承诺的费用；原施法者被反应杀死后继续封存后继。离场后备模型不能开在场反应，设置回合能力锁仍生效。
4. 覆盖无BM、每激活反应已用、严格2英寸、多目标同批双方效果队列、对应完整回合和Web入口。仅普通攻击/HITS嵌套不能计完整Detonation原子。
5. 工程发布V2已重编Builder及单位特征，进口Goliath/Tank实际BM付款与冷恢复通过；旧V1输入保留只读。FACTION_UNIT_CONVERSION_RELEASE_MISMATCH继续严格核对。部署卡仅在来源记录及官方证据字节完全不变时重绑，三类篡改反例拒绝。

每个原损伤批次真正恢复后才发布其完成/伤亡/Supply事件；子HITS本身的实际伤亡仍走Carrier、Infestation、Friendly Loss等正常后继。逐房核对原结算哈希/伤亡顺序、Supply只记实际移除、无悬挂槽；原生签名+幂等+关闭重开冷恢复，再做双席真人确认。

39来源阻断与估算几何保持；付费模型、K3、AI对局、复盘和生产发布继续暂停，模型调用0。

政策1.6／Root3.237本批[Bile与Drone](detonation-delayed-wiring.zh-CN.md)已通过：4原生分支112签名动作、4完整回合、Web2房9确认、当前/前批6房148及旧Bile5原动作冷验。两个使用分支均实际由Detonation移除原来源。12个自然结果对照房共374动作单列；Structure不可用Vehicle Plating的拒绝边界保持。严格Drone使用分支在持久建房前固定开发夹具身份，11个无骰设置动作、6个身份候选、实际签名骰核对和冷重放均有记录，不改变产品随机性。

工程V3冻结FAQ1.3实际字节，进口Goliath/Tank各实付1BM；V2不改。Web生成Drone前缀按原购买初态恢复运行时，签名前缀/五数据包/军表审计/原运行时哈希均核对，三类反例拒绝。另1对照Web房5确认与只读冷验单列。完整原子仍6/18；Storm/Photon、Disengage/Consume、后续新单位组合与整版人人产品继续。


政策1.7／Root3.238–3.240本批[Storm／Photon](detonation-storm-photon-wiring.zh-CN.md)通过：4完整原生回合119动作、Web2房10确认及当前／前批6房177原动作冷读一致。Storm使用实际炸死原High Templar；Photon由合法Stukov+Overlord真实Ventral Sacs入场，原卡牌HITS完成。护甲政策1.1保留阶段外null激活身份和回合池计数；旧1.0默认不变。己方Omega／Pylon／Zagara边线免Photon，Burrow Ambush非正例。原生晚发生Supply损失不插入第二次计分。完整原子仍6/18；继续Disengage／Consume、新单位组合和整版人人出口。

政策1.8／Root3.241本批[Disengage](detonation-disengage-wiring.zh-CN.md)通过：两种感染步兵各领队失败、其他模型失败、末模型销毁的使用／拒绝共12房334动作，全部到R2并冷重放；Web实际发起2房19确认（含390px行动席），独立14房396原动作冷读。原移除正Supply4分支共4、末模型4分支和旧归因计分已审计；组件7边界／2表单均0新动作。完整原子6/18，继续Consume、新单位和整版人人出口；39来源／估算／暂停保持。

2026-11-28 Consume未提交：政策1.9／Root3.242已接费用卡牌保留、原移除与付款后瘟疫；Dark Swarm三完整回合73动作及旧4房14原动作冷验通过。Supply派生投影需保留严格父事实，五项边界和六项实际表单等价组件通过。Web1.0因Native参数域缺少constraints被客户端正确拒绝（0动作）；改用显式真人确认1.1只补空容器，旧1.0与原Native动作保留，Web V6／双席v2继续。完整原子仍6/18，整版出口未完。

政策1.9／Root3.242本批[Consume](detonation-consume-wiring.zh-CN.md)收口：9完整原生回合215动作、Web2房17确认、独立19房311原动作冷验；费用先保留，两个原生Plague来源实际死亡后继续，Dark Swarm费用受原反应额度约束。Human1.1只补空constraints投影，旧Human1.0冷验通过。V7注释类型修正后原房只读重入0新动作；全应用尚有37既存其他类型错误。累计62原生1150动作、24主线Web房121确认，完整原子仍6/18；接新单位。
