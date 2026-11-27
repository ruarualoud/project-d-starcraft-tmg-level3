# Ticket28 · Wave3 正式对战的六项验收

11 月 26 日，M08 达到虫族正式对战的准出条件。正式对战累计 21/26，Wave3 组件 162/162，Wave3 大项 2/16。本次使用冻结数据、正式产品工厂、权威动作和保存回执，共调用外部模型 0 次。

| 项目 | 实际执行与结果 | 剩余工作 |
| --- | --- | --- |
| M08 虫族 | 第 2 回合原房中，一队两只刺蛇经同一虫洞进场，消耗本地 2 人口额度，全局仍余 5。再次指定该虫洞进场被拒，普通边缘仍可使用。三条已签动作冷恢复一致。独立的第 2 回合条件棋位中，Nova 底盘到虫洞的距离从 6.750 英寸变为 5.999 英寸，失去隐形。侦测事件明确指向该虫洞，r1 冷恢复一致。 | 已通过。召唤当回合在 6 英寸处不会产生该侦测。 |
| M01 正式建房 | 实际选购升级的劫掠者军表在 2.89 有 5 个选中定义未接入。2.90 只读与正式工厂逐条一致，14/14 均获准，房间交给任务开局。 | 雷诺游骑兵仍有两项移动能力。神族两张具名军表仍有未注册来源。 |
| M07 人族 | 普通 Concussive Shells 实际触发，速度从 4 降至 2，掷出 5，权威上限 7 英寸，公开后继为 resolve_charge。r3 冷恢复一致。 | 雷诺游骑兵已达到 10/12。补 Raiders Roll! 和 Rapid Reinforcements 的实际消费者。 |
| M09 神族 | 从使徒已支付投影的 r4 构造回合末棋位，四个模型实际换位，投影被清除，公开后继为下一回合先手，r8 冷恢复一致。 | 阿塔尼斯剩 Commander、Hierarch’s Stand、Lightning Dash、Phase Prism。Praetor Guard 剩 Charge、Leg Enhancements、Precognition、Shield Overcharge、Titan Killers。 |
| M24 跨入口事实 | 正式 Teach 证据接口和实战读取同一 r7 棋位。五个任务点的裁定、近战伤害概率的完整分布分别一致。概率值是预估，任务点裁定是确定结果。 | 正式赛前规划入口对本次 2.88 发布列出缺少的 roomFactory、missions、strategySkills。仍须通过该入口并对齐其余查询。 |
| M25 双人工席 | 已有移动 Web 两种尺寸的结局和重连证据。本轮检查设备时，iOS 模拟器工具不可用，Android 设备列表为空。 | 原生 App 实机或模拟器操作待验。 |

### 证据范围

虫族清单按冻结的稳定 ID 和源哈希去重。109 个继承定义有正式军表准入证据，另 6 个继承定义来自虫洞和小蟑螂的实际消费者，51 个新增定义与已有产品证据逐一匹配。第 2 回合和回合末的条件场景仅验证相应动作、后继与恢复。策略效果尚待实验。

侦测规则的名义范围为 6 英寸。共享几何计算有 0.001 英寸容差，因此保存的第 2 回合边界探针在 6.001 英寸判定圈内，在 6.002 英寸判定圈外。实际签名移动从 6.750 到 5.999 英寸，两端都在容差带以外。

- [虫族 166 项逐定义对照](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/zerg-coverage.public.json)
- [虫洞进场、额度及冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-network-deployment-v261/result.json)
- [Nova 入圈、侦测来源及冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/omega-detection-v258/result.json)
- [具名军表的建房结果](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/openings)
- [普通劫掠者的实际减速与后继](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/standard-marauder-concussive-unengaged/result.public.json)
- [使徒四模型换位与清除](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/adept-round-end-place/result.public.json)
- [Teach 与对战事实对照](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/teach-board.public.json)
- [规划入口的发布缺件](../../build/ticket-28-wave3-human-lobby-v1/remaining-six/planning-release-gate.public.json)
