# Ticket 28 · W3-10/11 · Leaping Strike

## 修复与证据

旧军表执行器已实现 Leaping Strike 的付款与激活。Wave3 迁移前该定义未登记。把它放回旧执行器时，同一原生高地上全底盘可承托的落点被拒绝，旧代码对所有地形重叠一律拒绝。新版使用与突击 PLACE 共用的发布规则族，保留原卡文本和 1 Biomass，统一使用完整底盘、承托高度和接敌规则。

- 5 英寸处的合法高地落点已实际提交，费用为 1 Biomass。坐标为 (27,18) 英寸，规则器写入高地及 std-centre-large 承托身份。
- 6.2 英寸超距、错误承托标注、底盘伸出平台、空支付、起点已接敌均被拒绝。同一回合不能再次使用。
- 合法放置保留突击核心动作。Kerrigan 从新位置执行 Energy Blast，结束激活后交给对手。
- 地面分支从未接敌出发，合法落点进入接敌。Energy Blast 可选该接敌对手，不能跨接敌选择另一台未接敌的 Goliath。首次夹具误把普通射击在双方接敌时也应禁止，已按共用射击条件修正断言。
- 两个候选放置后态冷读重放一致，旧执行器工程夹具仍产生原动作哈希。正式房间签名、持久恢复和端上对局待验。模型调用为 0，未测策略效果。

Standard 99/117（余18），Skirmish 31/33（余2）。Ticket 28 整体仍为 2/16。

## Omega Network 余项

战术卡生成与生成后的 Omega Worm 能力有独立来源。现有军表覆盖只登记开局单位及选卡，生成态不会自动进入能力目录。旧生命周期已经有跨回合部署与回收逻辑，当前 Wave3 生命周期的显式组合只接了 Queen 的 Spawn Creep。接 Omega 时需要同时绑定生成源及单位部署、回收能力，并验证同回合禁用、复生身份和回收所需的当次动作及底盘接触。

- [旧版高地反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-leaping-strike-before.public.json)
- [几何与付款反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-leaping-strike-geometry-rejection.public.json)
- [高地、射击、后继](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-leaping-strike-placement-and-shot.public.json)
- [接敌落点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-leaping-strike-finish-engaged.public.json)
- [Standard 覆盖](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-leaping-strike-standard-inventory.public.json)
- [Skirmish 工厂](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-leaping-strike-skirmish-admission.public.json)
