# Ticket 28 / W3-11 · Brood Instinct 自动 HITS 正骰及伤亡

冻结 U83/C84/R50 + FAQ 1.3。Nerazim 的 Zeratul 对 Zerg Swarm 的 Zergling 执行 Shadow Strike。Zergling 的 Burrowed／Hidden 由隔离产品 Room 在合法 Movement 产生并冷回放一签。有资格的目标在 Combat 吃到 4 次自动命中，护甲后剩余 4 枚闪避骰。旧 3.209.0 原房签名到 r6，保留全部前缀。

当伤亡需要守方选择时，旧候选先签伤亡父状态，再消费闪避反应。消费改变父状态哈希引用的反应历史，伤亡菜单和继续操作因此被拒绝。3.210.0 在正式伤亡或后续反应绑定前消费已结算的防御反应。池驱动只保留一次消费。拒绝记录保留。旧版描述符和原房六签按旧绑定精确重建与冷回放。

| 从签名断点分支 | 冷回放 | 产品证据 |
| --- | --- | --- |
| 守方使用 | 2 签 | 复用 r5 的已付款反应与四骰请求。闪避阈值 4+ → 3+，守方按合法选择哈希提交两模型伤亡。 |
| 守方放弃 | 4 签 | 复用 r3 已结算的护甲。双方让权时骰票为零，最终阈值 4+，守方以有序模型 ID 提交三模型伤亡。 |

两房均实际验到伤亡后恢复原行动方，未重新掷护甲。不同房间的最终闪避骰序独立，二者伤亡差不作为策略效果证明。模型调用 0。接续模板，之后才启用完整 Match。

- [守方使用](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-hits-v3210-v1/use/result.public.json)
- [守方放弃](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-hits-v3210-v1/decline/result.public.json)
- [旧签名问题停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-hits-v3209-v1/positive-zergling-v1/stop-r6.public.json)
- [Rapid Burrowing 来源](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-hits-v3209-v1/positive-zergling-v1/burrowing/result.public.json)
- [旧版绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-hits-v3210-v1/legacy-3209.public.json)
