# Ticket28／W3-10、11 菌毯位移接线

## 原因与方案

新版 Queen、Hatchery、Overlord 已能生成绑定原始单位或卡牌的菌毯，但位移生产器此前只识别 Bombard、Dark Swarm 和 Psionic Transfer。Wave3 候选构造器现在通过新版来源合同传递这三种菌毯。原有几何查询和位移执行直接消费绑定；读取时核对路线、归属、原始组件、底盘和当前令牌哈希。Accelerating Creep 产生的留场条件继续由已有产品能力查询决定。

## 验收

- 读取已保存的 Wave3 Standard 状态，识别 Queen、Hatchery、Overlord 三种来源；改变原生实例后拒绝异常绑定。
- Queen 的第一处候选终点因底盘碰到既有地形被拒绝。沿用同一状态，改走合法终点 (26.600, 6.800) 英寸，位移查询返回菌毯落点 (28.726, 6.800)。省略玩家选点时执行被拒。采用查询结果后实际执行 Move，回执记录领队及令牌旧、新哈希。序列化后重新构造运行时，读取到更新后的绑定。
- 显式版本门生效。历史 Bombard r0 加载原 1.0.0 合同，来源合同逐字段相同并读取一个待位移令牌；r2 保持该令牌已被消耗。使用发布候选重新执行同一 Queen 步骤，回执相同。
- 影响范围是候选的原生来源和普通空间位移。Hatchery、Overlord 实际位移及敌方结束移除的组合、正式 Room 路由和其余位移种类仍需验证。正式 Standard 52/117、Skirmish 16/33，Ticket28 2/16。模型调用为零。

## 证据

- [位移查询与实际动作回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-displacement-sources.public.json)
- [动作后继与冷读检查点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/queen-creep-displacement-checkpoint.json)
- [历史 Bombard 兼容结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-displacement-legacy-control.public.json)
