# Ticket 28 · W3-10/11 · Kerrigan 指向能力

## 根因和修正

Wave3 漏登记旧版 Crushing Grip 与 Mutating Carapace。把这两项放回原执行器后还可复现旧目标缺陷。旧分支只比较底盘间距，没有检查视线，隔着此前已验收的闭合高墙也会给出合法目标。冻结总规则 10.1 要求目标同时满足距离与视线，卡面未给豁免。

新版沿冻结身份登记两项。指向能力发布策略同时记录特征规则族与所选军表规则族的实际定义。两族用同一底盘范围和地形视线判定核对同一对模型。Wave3 的合法菜单、预览和提交共用目标；缺策略或从可见状态沿用到隔墙状态的旧动作域均遭拒绝。无新版范围的原执行器仍能从同一工程夹具生成先前保存的完全相同动作哈希。

## 结算证据

- **Crushing Grip** 的 12 英寸、**Mutating Carapace** 的 18 英寸均拒绝同一堵高墙后和超距的敌方单位。同一棋盘只移除墙体时，范围内的 Medic 恢复为合法目标。预览不允许用已失效的动作域越过墙体，也不允许把域外目标直接写入参数。
- **Crushing Grip** 以 1 Biomass 完成提交，付款卡耗尽，Medic 获得本阶段激活标记。Kerrigan 结束激活后对手接手，Medic 已从移动激活列表排除。规则器后态冷读重放一致。
- **Mutating Carapace** 支付 1 Biomass，经真实 Pass 和突击先手交接后，只有选定的 Goliath 触发 +2 Evade。第二台 Goliath 无该增益。用固定骰流使指定 Goliath 实际命中 1 次，Kerrigan 以 4+ 闪避成功，实际伤害为 0。Cleanup 移除效果。
- Standard 候选绑定 98/117，余 19。Skirmish 30/33，余 3。规则器和冷读取证通过。正式签名 Room 与持久恢复仍待装配；未运行端上对局或模型，策略效果未评价。两条前置遮挡夹具初用可站立地形，权威判定为可见。最终采用已保存的高墙，保留原地形与对照。

- [隔墙修前反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-kerrigan-targeted-missing-before.public.json)
- [Crushing Grip](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-kerrigan-targeted-crushing-grip.public.json)
- [Mutating Carapace](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-kerrigan-targeted-carapace.public.json)
- [实际闪避骰](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-kerrigan-targeted-carapace-actual-evade.public.json)
- [Standard 剩余覆盖](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-kerrigan-targeted-standard-inventory.public.json)
- [Skirmish 工厂准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-kerrigan-targeted-skirmish-admission.public.json)
