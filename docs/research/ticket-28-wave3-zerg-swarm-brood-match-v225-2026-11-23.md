# Ticket 28 / W3-11 · Zerg Swarm 完整 Match 2.25.0

原 Zerg Swarm／Cocoon Standard 军表，以冻结 U83/C84/R50 + FAQ 1.3 的 Artefact Hunt 验收。严格开房和只读覆盖一致认定 24/24，能力菜单没有待接条目。2.25.0 为隔离候选，按军表选中 Brood Instinct 组装分阶段防御。普通射击和近战启用，该房存在爆炸模板或自动 HITS 来源时按已绑定能力组装对应消费者。

| 验收 | 实际签名 |
| --- | --- |
| 正式工厂开局 | 房间从 Start of Round 推进到 Movement，一签精确冷回放。 |
| 普通射击防御 | 同军表的条件化 Assault 场景，八签精确冷回放。先分别放弃 Vile 的既有宣告反应，再结算攻方命中、护甲和守方的 Brood Instinct。 |
| 旧版兼容 | 读取已保存 2.23.0 原房两签，以原描述符及发布绑定精确冷回放。 |

完整 Match 首次实际把外层 Vile 宣告反应和内层 Brood Instinct 连在同一攻击上。外层原来只识别护甲反应，内层进入闪避反应并移交守方时会拒绝菜单。现在校验器接受已经核对当前骰池、来源哈希和优先席位的闪避子状态。修复从原 r6 续行。守方用卡后，阈值 5+ → 4+，只签一张闪避骰票，实掷 5。原攻击、反应消费与未结算菜单均正常后继。

本轮零模型调用。24/24 针对这份原军表。模板与自动 HITS 已各自有组件签验，完整 Match 的混合军表与相应场内组合仍需证据。Cocoon 真实 Cleanup、生成 Ravager 的后继和端上双席仍待。组件累计 150/162，子项 2/16。

- [正式开房与只读覆盖](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-brood-match-v225-v1/strict-factory-and-read-only.public.json)
- [开局](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-brood-match-v225-v1/opening/result.public.json) · [正式战斗](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-brood-match-v225-v1/combat/result.public.json)
- [原 r6 问题记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-brood-match-v225-v1/stop-combat-3.public.json) · [旧版绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-zerg-swarm-brood-match-v225-v1/legacy-2.23-binding.public.json)

改动位于正式房间的能力准入、Native 装配、Match 版本签名、特征／状态路由和目标宣告校验。
