# Ticket 28 / W3-08、W3-10 · Wave3 可替换的社区几何候选

**2026-11-24 更新**。Storm／Gale 外圈继续采用 127 mm。中心圆片从社区带尺照片估读约 29 mm，隔离候选采用 30 mm，并已有两房实签施放和阶段末结算证据。下表保留初版观察。 [当前尺寸及验证](ticket-28-wave3-storm-marker-community-measurement-2026-11-24.md)

Raven 的官方写表器公告已经给出 100 × 100 mm 十字外廓。公开实物侧照中，臂的实际接地边缘被其他棋子遮挡，不能用来定标两条臂宽。总规则按飞行支架的接地底面测量，所以应寻找无遮挡的带尺底面照片、可定标正投影或直接量测。 [官方规则](https://archon-studio.com/files/manuals/sc/StarCraft-TMG_EN.pdf) [社区实物照](https://www.reddit.com/r/StarCraftTMG/comments/1xhqxo0/my_loot_from_spiel_2026_the_raven/)

| 物件 | 候选参数 | 来源与边界 |
|---|---|---|
| Raven 飞行支架 | 十字外廓 100 × 100 mm，两条臂宽待补 | [官方写表器公告](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/system_changelogs/uCBa37ipCfRcBLkdfyId)和[社区讨论](https://www.reddit.com/r/StarCraftTMG/comments/1x2btav/the_raven_stand_looks_unsafe/)都给出外廓，未找到臂宽实测。 |
| Psionic Storm / Gale 外圈 | 默认圆形直径 127 mm（5″），备选 120 mm | 冻结卡文确认共用爆炸模板。社区同帖报告了两个数字，另一帖也有 5″。本候选采用 127 mm。 [风暴专帖](https://www.reddit.com/r/StarCraftTMG/comments/1y26o4g/psionic_storm_template_size/) [模板讨论](https://www.reddit.com/r/StarCraftTMG/comments/1xzvcl1/template_sizes/) |
| Psionic Storm / Gale 中心标记 | 直径待补 | 冻结卡文和[官方盒装清单](https://archon-studio.com/shop/products/starcraft-tabletop-miniatures-game/starcraft-high-templar)确认共用实物标记，未公布标记尺寸。 |

[尺寸输入](../../content/source-releases/wave3-20261122-community-geometry-settings-v1.json)支持调整当前外圈选项，也接受带来源的中心标记直径和两条 Raven 臂宽。替换时用现有编译入口从相同冻结数据生成新的 profile 和 release，保存新的版本及哈希。系统按发布绑定读取，已绑定的房间继续引用其原发布。已有官方组件几何优先。

已在真实冻结数据的风暴查询组件验证两档尺寸，并经同一底盘碰撞内核确认一枚边界模型在 127 mm 被覆盖、120 mm 不被覆盖。旧几何查询证据逐字段一致，篡改绑定被拒绝。缺测尺寸仍由几何入口明确拒绝。实际施放、阶段末伤害结算和 Raven 正式房间入场仍待验。

- [社区几何候选发布](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/community-geometry-candidate-release.json)
- [几何验证记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/community-geometry-verification.public.json)
- [Standard 81 条正式接线缺口](ticket-28-wave3-standard-ability-gaps-2026-11-22.md)
