# Ticket 28 / W3-11 · Skirmish Artefact 的 PLACE 时序

使用 U83/C84/R50 + FAQ 1.3 的冻结任务、原有合法 500 分军表与同版 Match 2.22.0。隔离正式 Room 先在声明的第二回合 Cleanup 棋位执行实际控制与拾取。突击分支复用已签持有状态并直接设定阶段用于验收。

| 提交 | 权威结果 |
| --- | --- |
| Cleanup r0 → r2 | player1 提交控制判定，player2 的 Kerrigan 在 (6, 8.4) 英寸取得 1 号标记。 |
| Assault r0 → r1 | Kerrigan 为 Leaping Strike 支付 1 Biomass 后移到 (11.5, 8.4) 英寸。同一回执先记录位移结算，再开启掉落。 |
| r1 放置窗口 | 只给 player1 放置。以位移后底座为参照，旧底座中心 (6, 8.4) 英寸的预览因超出两寸被拒。 |
| Assault r1 → r2 | player1 在 (12.9, 8.4) 英寸放回标记，清除携带记录，player2 恢复后续动作菜单。 |

Skirmish 的任务卡要求在 PLACE 结算时掉落。本次位移、付费及新底座均有回执。Standard 卡片要求在 PLACE 结算前处理掉落，沿用已经签验的 Standard 证据。

两房共 4 签，均关闭 SQLite 后以原绑定完整冷回放。本次未修改生产源码，模型调用 0。其他不属于撤回或阵亡的移除来源、端上选择及整体发布准入仍待。

- [签名拾取](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-skirmish-artefact-place-v222-v1/claim/result.public.json) · [付费位移、对手摆放和冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-skirmish-artefact-place-v222-v1/leaping-strike/result.public.json) · [原棋位拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-skirmish-artefact-place-v222-v1/leaping-strike/origin-rejection.public.json)

## 非撤回移除的正式准入

复用 Wave2 已成组件的 Cocoon、Vile 军表，新版 Standard Artefact 工厂选中 24 条定义，19 条可执行。严格入口拒绝 5 条待注册。缺项为 Cocoon 的 Ravager Morph、Spawn Larva，以及 Zerg Swarm 的 Brood Instinct、Rapid Burrowing、Zerg Creep。

读取原存档确认，末模型 Morph 的真实回执标记敌方击杀为 0。源 Vile 被移除，现有单位状态仍用 `isDestroyed: true` 表示无剩余模型。Artefact 目前先检查该布尔值。等正式接线时，必须依据移除回执识别 Morph，验证引用原棋位、不计给敌方阵亡分，并保留正常伤亡与撤回的既有路径。此处只复用已签组件证据并对账新版开房门，未执行 Morph 对局组合。

- [正式开房预检与旧签名状态](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-morph-admission-v222-v1/result.public.json) · [五条待注册 ID](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-morph-admission-v222-v1/admission-detail.public.json)
