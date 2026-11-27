# Ticket 28 · W3-11 · Standard Fire 终局与新增部署前置

## 原房终局

保持已签 U83/C84/R50 + FAQ 1.3、Match v2.3.0 和同一房间。打开数据库后与保存的 r76 棋位及绑定逐项核对，生成该位置的权威签名检查点。两个人工席位从真实合法菜单作出预设的选择和 Pass。

| 签名位置 | 权威后态 |
|---|---|
| r76 | 第四轮计分结束，0:3，既有 5 号点达到等级 2。 |
| r77–r80 | 完成第四轮终局检查、回合末效果及 Cleanup，推进第五轮并确定先手。 |
| r81 | 第五轮 Mission 初始化完成，规则记录 Supply 不限。 |
| r91–r92 | 第五轮重新计算任务控制，任务计分增加 2 VP，累计 0:5。 |
| r93 | 五轮上限结束，player2 获胜。双方有限动作与参数动作列表均为空。 |

冷开后以 r76 权威检查点开始，只消费新增的 17 条签名回执。终态哈希、匹配绑定和日志头全部与保存状态一致。前 76 步沿用既有证据。对局双方由工程脚本选择 Pass，本证据范围为第五轮、终局和冷恢复。模型调用零。

## 三张部署的来源与准入

| 冻结卡 | 规模 | 工厂结果 |
|---|---|---|
| POWER LINES | Skirmish | 正式开房工厂拒绝缺几何的选择。 |
| MEETING ENGAGMENT | Standard | 正式开房工厂拒绝缺几何的选择。 |
| ONE BRIDGE TOO CLOSE | Standard | 正式开房工厂拒绝缺几何的选择。 |

这三条官方记录的原文身份和正面引用已冻结。保存的原始记录没有进场边段、影响区或任务点的尺寸字段，已检查的旧 P2P 文本未列出它们。冻结集同名的社区 Meeting Engagement 属于另一记录，验收按官方记录 ID 和摘要。三组真实工厂均以原拒绝码返回所选记录，未生成任何替代地图或房间。

Skirmish 的首轮夹具用了不满 500 的配方，先被军表核验拒绝。补验恢复已签 Skirmish 棋位的阵营、战术卡、单位和升级选择，并继续保留 500 分工厂约束。三张部署仍需各自原卡正面及可核对尺寸后才能形成权威几何。

- [签名终局](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-terminal-tail.public.json)、[17 条冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-terminal-tail-cold.public.json)及[先前高地计分](ticket-28-wave3-standard-fire-high-ground-scoring-2026-11-22.md)。
- [缺几何准入证据](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-missing-geometry-factory.public.json)及[同发布任务与部署原件范围](../../build/ticket-28-wave3-mission-source-20261121-v1/REPORT.zh-CN.md)。
