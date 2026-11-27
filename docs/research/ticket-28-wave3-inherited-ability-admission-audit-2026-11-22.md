# Ticket 28 · Wave3 旧能力迁移缺口与 Hydralisk 候选验证

## 根因与影响

旧房间会装配完整执行族并能核对规则目录。Wave3 在两个开房工厂内先调用一个独立的候选准入器。准入器仅登记已经逐项选入的定义；旧能力别名只用来判定资格，旧目录中已有的执行归属不会自动进入新装配。用户的军表没有产生这个差异。这是 Wave3 开发中保留的迁移和整合缺口。早期的[准入报告](../../build/ticket-28-protoss-wave3-20261120-v1/formal-match-admission/REPORT.zh-CN.md)明确把数值武器之后的能力和完整 Match 留待接线。

把最初待登记的 27 项沿旧发布源特征哈希匹配到实际的旧权威能力目录，27 项均为 executable_exact。这个证据证明旧产品具有精确注册。对 Lunge 等延迟能力，仍要在新版房间验证父动作完成后真正打开并消费后继；对首次护甲等自动效果，仍要核对实际结算读取，而不能把旧目录状态当作新版实战证据。

两个正式工厂共用这一准入器。能力齐全时当前代码仍会返回 OFFICIAL_RELEASE_ROOM_FULL_RUNTIME_REQUIRED，因为候选运行时尚未交给正式房间装配、签名和恢复路径。提前移除拦截会把未绑定的消费者带入房间。新版两种规模当前停在开房，缺口未通过产品边界暴露为一个可玩的房间。

| 尚待 Wave3 接入或消费验证的旧执行族 | Standard 能力 |
|---|---|
| 位置与动作时序 · 3 | Armed and Ready、Go! Go! Go!、Timing Push |
| 特征与状态 · 7 | Field Repair、Lie in Wait、Feral Rage、Ancillary Carapace、Adrenal Overload、两种 Metabolic Boost |
| 已选能力统一执行器 · 7 | Omega Network、Wild Mutation、Zerg Creep、Terran Tenacity、Crushing Grip、Leaping Strike、Mutating Carapace |
| 战场资产 · 1 | Ventral Sacs |
| 反应及后继 · 2 | Lunge、Debilitating Saliva |
| 生成及生命周期 · 2 | Roachling Infestation、Zergling Reconstitution |
| 近战与阵营 · 2 | Marine Strike、Additional Supply Depots |

## 本次修复与证据

复用原射程、战术卡和闪避执行逻辑。修前菜单没有提供超出普通射程的合法目标或 Missile Attacks。原地图与同一军表的候选回执通过以下检查。

- Grooved Spines 让 Needle Spines 两个模型在最远底盘间距 12.638 英寸时获得射击资格，超 16 英寸时无合法目标。
- Missile Attacks 从真实菜单提交并耗尽 Hydralisk Den，无额外支付卡，第一把武器获得 PRECISION (1)。按固定工程骰流提交射击，效果被实际消费，重复用卡拒绝，后态 JSON 冷读重放一致。
- Lurking 在 Stationary 时对首个远程攻击给闪避资格；菌毯上 +1、菌毯外 +0，失去 Stationary 不触发。Goliath 的 Autocannon 实际提交后，同回合 Haywire Missiles 不再触发，冷读预览哈希一致。
- 仅扩展 Wave3 显式来源的组件范围。旧版目录、旧房间和快照未写入，旧回放没有重跑。输入摆位为受控隔离场景，未取得正式 Room 的签名或持久恢复证据。固定骰流只验证工程结算，未测策略。无模型调用。

Standard 93/117，待 24。Skirmish 25/33，待 8。16 项中仍只有 01、04 达到整个子项的通过标准。迁移按旧执行族推进，复用行为未变的消费者，同时检查 FAQ 变化、后继和冷恢复；随后接完整新版房间入口。

- [旧目录逐项对账](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-hydralisk-inherited-binding-audit.public.json)
- [射程与战术卡证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-hydralisk-ranged-and-missile.public.json)
- [Lurking 消费证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-hydralisk-lurking-consumed.public.json)
- [Standard 待接清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-hydralisk-standard-inventory.public.json)
- [Skirmish 工厂准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-hydralisk-skirmish-admission.public.json)


## 当前归因复核 · Standard 100/117 · Skirmish 32/33

### Wave3 迁移遗漏

旧房间的权威能力目录记录执行归属。Wave3 的 Standard、Skirmish 房间工厂会在装配动作执行器之前调用新版准入器。新版准入器按冻结来源别名筛出可继承定义，再按各能力族显式加入执行绑定。别名只能证明身份对应，无法自行产生规则消费。即使开局军表登记齐全，准入器仍保留完整 Match、签名和冷恢复阻断。正式工厂的原始失败回执和源码调用顺序一致，调整调用参数不能解决这个停点。

现在剩余的 17 条 Standard 定义逐项匹配旧发布目录。17 条均为 `executable_exact`。Marine 的 C-14 射击等已覆盖条目无需随 Strike 重做。以下是旧执行归属和新版尚须验证的产品边界。

| 旧执行族 | 待接数 | 受影响能力与消费边界 |
|---|---:|---|
| 特征与状态 | 7 | Factory Field Repair、Hatchery Lie in Wait、Six Pool Feral Rage、Hydralisk Ancillary Carapace、Raptor Adrenal Overload、Raptor 与 Swarmling 的 Metabolic Boost。查声明、结算和有效期。 |
| 位置与时序 | 3 | Barracks (Proxy) Armed and Ready、Go! Go! Go!、Six Pool Timing Push。查动作资格、移动与回合后继。 |
| 单位生命周期 | 2 | Corpser Roachling Infestation、Swarmling Zergling Reconstitution。分别走召唤与复生规则。 |
| 反应 | 2 | Hydralisk Lunge、Vile Debilitating Saliva。查父事件、弹出窗口和消费。 |
| 近战 | 1 | Marine Strike。复用近战执行器，核对同版武器档与实际结算。 |
| 战场资产 | 1 | Overlord Ventral Sacs。查生成入口与资产后继。 |
| 人族专属 | 1 | Supply Depot Additional Supply Depots。查部署支付与生成单位后继。 |

### 规则分支和覆盖统计的缺口

- **Omega Network 旧版落点缺陷已复现。** 落点距离复用了可激活单位的过滤器，因此跳过了敌方 Structure。同一权威夹具显示旧路径接受敌方虫洞十英寸内的落点。Wave3 落点已走全敌方活模型与完整底盘校验，拒绝该点。Pylon Warp-In、Rapid Ingress、Griffin Support 和 Auto-Turret 的距离检查位于另一个生命周期适配器，其筛选条件包含已上场的存活建筑。本次按调用路径核对，建筑边界产品回归待验。禁止激活或特定能力不能选建筑的过滤有各自用途。
- **Roachling 专用动作存在旧执行分支缺口。** 旧专用分支检查模型数量、母体接触和摆位，却没有调用已有的通用 SUMMON 人口池、对手影响区和完整激活处理。旧专用提交给召唤物写入母体和阶段，缺少新版联动消费者识别的召唤来源字段。冻结数据已有 Roachling，编制为 1–3 模型、Supply 0。严禁把这个缺口解释为 Roachling 要消耗额外人口，或者推定旧对局曾超人口。Wave3 现有 Holo 路径将母体和召唤物均限定为单模型，直接复用该输入合同会拒绝多模型场景。应复用现有规则核，给多模型摆位补权威母体接触、召唤来源和 activation lock，随后验证母体结束后的联动。Zergling Reconstitution 虽属同生命周期适配器，实际另走 RESPAWN 规则。
- **生成物缺少同一覆盖分母。** 开局统计只遍历已选单位、升级和卡。Omega Network 卡曾通过候选消费，随后真实召出的 Omega Worm 仍在另一执行缺口。虫洞现在已有原生回收，部署只到横排队形预检，Detection 与 Structure 的正式消费者仍待验。Roachling 也须核对生成后的 Claws、禁止获得 Burrowed 和联动激活。后续应从每个生产动作追踪实际生成物、合法后继、自动规则和恢复证据。
- **虫洞部署验证另有场景错误。** 该门首轮揭示生产 Ground 类型过滤引用错误，已定点修正。二维摆位后续失败源于夹具复用旧圆底尺寸，以及加大纵向间距后越出队形一致性圈。横排两底盘预检已经通过，须继续实际提交与配额核验。细节见[虫洞生命周期停点](ticket-28-wave3-omega-network-lifecycle-2026-11-22.md)。

### 收敛及交付判定

按旧执行族归并接线。冻结身份、行为与前置条件相同的能力复用原消费者。有旧执行缺陷或新版语义差异时，修对应来源和消费边界。开局定义逐条覆盖之外，用正式产品工厂验证生成物、续步和自动规则，再核两种规模的签名、冷恢复和客户端动作链。当前证据只含源码对账及已有回执。未重跑旧对局，没有启动模型，Ticket 28 仍为 2/16。

- [当前待接定义与注册计数](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-network-standard-inventory.public.json)
- [旧建筑落点反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-network-producer-before.public.json)
- [生成单位覆盖反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-omega-network-generated-consumer-gap.public.json)
- [正式 Standard 工厂](../../packages/product-composition/official-standard-room-factory-v1.mjs#L1095)
- [正式 Skirmish 工厂](../../packages/product-composition/official-skirmish-500-room-factory-v1.mjs#L844)
- [Wave3 准入器](../../packages/product-composition/official-release-room-ability-admission-v2.mjs#L493)
- [旧 Roachling 专用分支](../../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs#L1458)
- [通用 SUMMON](../../packages/rule-atoms/official-summon-rules-kernel-v1.mjs#L285)
