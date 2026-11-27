# Ticket 28 / W3-10、11 · Wave3 Roach 潜地、再生与动作状态

## 原因与方案

以冻结 U83/C84/R50 原件核对 Corpser、Roach、Vile。三个单位的 Burrow 和 Regeneration 各自与旧来源拥有相同稳定行为身份。候选新增六条来源绑定，复用原有付费、潜地切换、状态标记和治疗，不增加规则原子。新版候选声明独立消费者版本，旧房间保持原有绑定。

突击阶段首次激活先判断入场状态并结算 Regeneration，再执行相应动作。移动路径提交后由同一状态适配器解除 Burrowed 和 Hidden。射击与冲锋的菜单、实例化和提交共用各自原有前置校验。已买 Tunneling Claws 的 Move／Run 有状态保留分支，穿越路径及该升级的完整注册另验。

## 单步验收

| 场景 | 动作与结论 |
|---|---|
| 三种 Roach | 从正式 Standard 军表生成的候选聚合菜单定位 Burrow。少付被拒，原生扣除 2 Biomass，写入 Burrowed、Hidden，重复动作被挡。三种后继分别冷读，菜单逐字段相同。 |
| Roach 的 Regeneration | 实际 Move → Burrow → 结束激活 → 双方 Pass → 先手选择 → Run。3 点伤害在突击激活先减至 1，随后 Run 结算并解除两种状态及棋盘标记。从保存的突击窗口重新构造，执行回执逐字段相同。 |
| Corpser Hold | 从已保存的潜地激活窗口结束激活，原生判为 Hold，两种状态保留。 |
| Roach 攻击限制 | 同一棋位对照，有 Burrowed 时射击与冲锋返回明确禁止码，移除状态的对照均有合法域。 |
| 版本和规模 | 实际 Skirmish 工厂查询 24/33，Wave1 V6 重新构造的描述符逐字段等于保存原件。Standard 候选注册 85/117，剩 32 项，其中人族 6、虫族 26。 |

首次验证推进到突击阶段后，夹具遗漏先手查询的显式席位参数。补齐后保存先手前与 Run 前两个断点。模型调用为零。

本轮证据覆盖候选能力运行时、已有激活窗口与普通动作组成的后继。待补完整近战 Close Ranks、穿越底盘、回合起始规则、独立激活入口与正式房间持久恢复。整体 Ticket 28 为 2/16。当前下一项为 Tunneling Claws 与 Burrow Ambush，含空间、近战及阶段组合的产品后继。

## 证据

- [潜地使用与资源](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-core-status-burrow-activation.public.json)
- [跨阶段再生与 Run](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-core-status-run-result.public.json)
- [Hold](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-core-status-hold.public.json)
- [射击与冲锋拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-core-status-attack-reasons.public.json)
- [Skirmish 与旧版描述符](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-core-status-compatibility.public.json)
- [Standard 覆盖](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-core-status-standard-inventory.public.json)
