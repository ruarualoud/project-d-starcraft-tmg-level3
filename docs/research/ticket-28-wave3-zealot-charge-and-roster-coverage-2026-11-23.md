# Ticket 28 · W3-11 · Zealot Charge 与正式列单覆盖

原 Warp Prism 开房停在所选军表能力覆盖。只读诊断复用两种正式工厂和同一能力装配选项，在准入前返回同版覆盖及稳定定义 ID。它不生成房间或签名回执。原停点和四次开房记录均保留。

同一 Standard 军表 25 个定义。v2.13 两个 Warp Prism 定义都已登记，唯一遗漏是 Zealot 的 Charge。旧目录有该定义的同源别名，已有特征适配器处理 Charge／Metabolic Boost 的双骰取高，Wave3 所选军表装配没有继承 Zealot 来源。v2.14 只对同源定义启用绑定，单独确保使用规范 PE。旧运行时按保存版本重建。

| 边界 | 结果 |
|---|---|
| 原 Warp Prism Standard 军表只读诊断 | 24/25 → 25/25，缺项消除，原样例未重复开房。 |
| Skirmish 已有合法军表对照 | 33/33，无待接定义。 |
| 冻结规则 | Charge 支付 1 点灵能。距离骰从 1D6 变为 2D6 取高，加到速度。 |
| 新来源的隔离签名 Room | 复用真实 Standard 工厂，使用受控突击局面。r2 实际支付 1 PE 并耗尽一张卡。r3 掷出 1、3，采用 3。后继菜单提供 resolve_charge，棋子实际接触和 Impact 结算属于其后续动作。 |
| 冷恢复和旧绑定 | 第一次冷检查在尚未调用实际 API 时误用了方法名。保留已签名 r3，仅补查正确的 replayRoom。三条签名回执与当前状态哈希一致；旧 v2.6 Raptor 冲锋描述符逐字段重建一致。 |

工程及产品接线只覆盖本次军表注册和独立 Zealot 冲锋边界。Warp Prism 的回合末签名部署与冷恢复、Lunge、其他特殊入场与任务部署几何尚待。未进入端上双席验收。零模型调用，策略效果未测。Ticket28 仍为 2/16，剩 02、03、05–16。

- [原 Standard 缺项](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-warp-prism-v213-coverage-diagnostic.public.json)、[修复后同军表](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-warp-prism-v214-coverage-fixed.public.json)及 [Skirmish 只读对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-warp-prism-v214-skirmish-coverage-control.public.json)。
- [签名支付与双骰证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-warp-prism-v214-zealot-charge.public.json)和 [旧绑定对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-warp-prism-v214-legacy-charge-compat.public.json)。
- [同一装配的只读诊断](../../packages/product-composition/official-release-room-native-actions-v2.mjs)、[旧规则来源迁入](../../packages/product-composition/official-release-room-ability-admission-v2.mjs)及 [版本绑定](../../packages/product-composition/official-current-product-match-runtime-v1.mjs)。
