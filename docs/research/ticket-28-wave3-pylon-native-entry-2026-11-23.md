# Ticket 28 / W3-11 · Pylon 底盘入场与原生部署

冻结 U83/C84/R50 与 FAQ 1.3 中，Pylon 的 Warp Conduit 允许控制方在移动阶段每轮一次以该 Pylon 的底盘为 Entry Edge 部署一支预备队 Ground 单位，并结束该单位的激活。旧候选的生命周期分支只验最终底盘接触。此次明确按原文复用与 Omega Worm 共用的底盘周界起点、权威路径、队形、敌方影响区和 Supply 校验，再复用普通激活收尾。每轮使用次数按已提交 Deploy 的来源记录计算。

从已经签名的 Standard 开局 r1 取得军表与地图。工程棋位调用冻结数据的生成单位工厂构造 Pylon，单独声明它在场的坐标和可用状态。编译同一发布的 Structure、Warp Conduit 和 Khalai Ingenuity，验证 Structure 查询给出禁止激活、Supply 0 和禁止控点。新 Pylon 线路仅由显式冻结源启用。旧 v2.15 描述符精确重建。

| 边界 | 结果 |
|---|---|
| 起点、路径和 Supply | Pylon 中心 (10, 10) 英寸，Stalker 从底盘接触起点 (13.150, 10) 实际移动至 (15.150, 10)。穿过 Pylon 的路径在权威预览被拒。合法部署使可用 Supply 从 5 降至 4。 |
| 部署后继 | 实际事件包括 Deploy 及激活结束。该单位没有留在可用的激活窗口，行动权交给对方。标记为生成当轮禁用时没有入口。同轮提交后不能再用这座 Pylon。以下一轮投影检查时入口重新出现。 |
| PE 折扣 | 同一在场棋位的权威支付报价确认 4 英寸内首笔 1 PE 降至 0。消费该封存使用账本后，同轮再次报价为 1 PE。 |
| Room 签名和恢复 | 使用同一已保存组件棋位，真实 Room 的 LegalSpace、预览和提交推进到 r1。重复提交幂等。关闭重开后签名回执、状态哈希和日志头一致。 |

组件验收先发现装配测试更换资产包后保留了旧菌毯位移绑定，随后发现夹具按错误层级读结构查询结果。已用生产构造器重建位移绑定并按实际回执接口读取。正式签名使用原生组件 3.188.0 并从部署前棋位开始。Khalai 整卡的 Pylon Warp-In 生产、Bound by the Khala、真实 Cleanup 解锁、PE 能力实际付款及同版完整 Match 准入仍各有后续门。本轮不提高主 Standard 114/115 或整体 2/16 的计数，模型调用 0。

- [组件查询、部署和对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-pylon-native-entry-component.public.json)。
- [真实 Room 的签名提交](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-pylon-native-entry-signed-receipt.public.json)和[冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-pylon-native-entry-signed-cold.public.json)。
