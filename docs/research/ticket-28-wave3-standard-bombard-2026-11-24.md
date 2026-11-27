# T28-W3-09 / M08　Bile Launcher 的 Bombard

正式 Standard 工厂沿用 2.45 的同一军表、任务、部署与冻结来源。双方共选 57 条定义。2.46 增量接入 Bombard，虫族新定义由 32/40 增至 33/40；严格开局仍返回另外七项。较小的 Zagara、Bile Launcher 和 Accelerating Creep 军表对 Nova、特战掠夺者能够正常构建。

[逐条准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v246/coverage.json) · [严格开局回执与七个待接项](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v246/factory.json) · [交战前原始棋位](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-bombard-v246/before-shot.json)

## 范围与地形

验证使用两个正式人工席位，指定初始棋位，然后从第一回合按真实菜单付费、放置和射击。发射体在 (8,8)，掠夺者在 (30,8) 和 (32.25,8)，普通射程 12 英寸。另开同源棋位让发射体放弃该次射击。

2.46 会把地形的外接矩形当作整块障碍。直径 32 mm 的标记置于两段障碍中间时，与两个实际地形格都没有内部重叠，但仍被拒绝。2.47 在放置和替换时按同一套实际地形格与棋子、标记轮廓计算。测试同时包括压在障碍上和穿过空隙的坐标。旧房使用原来的发布绑定。

[几何反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-bombard-v247/terrain-baseline.json) · [产品验收入口](../../scripts/verify-wave3-standard-bombard-v246.mjs)

## 同一棋位的两种处理

源房 r7 已支付 1 生物质，标记坐标 (28,8)。两组的来源状态哈希与标记 ID 完全相同。

| 人工选择 | 正式执行结果 | 冷恢复 |
|---|---|---|
| 用标记射击 | 以掠夺者为目标，本次固定骰序产生 6 命中、8 伤害。攻击后将原标记换成接触摆放的菌毯瘤，发射体结束激活，Terran 获得行动。 | 精确重放 11 条回执 |
| 放弃此次射击 | 标记保留到第一回合清理，同一枚标记此时才换成菌毯瘤；第二回合任务入口可执行。 | 从 r7 分支精确重放 12 条回执 |

[同源性比较](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-bombard-v246/same-position-outcomes.json) · [射击分支](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-bombard-v246/shot/result.json) · [未射分支](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-bombard-v246/unused/result.json)

## 复合地形的后续问题

第一次隔离测试在放置阶段接受了空隙、拒绝了压格；到突击阶段射击菜单时，视线检查发现测试夹具直接修改了已签名地形。保留原停点 r7，改用官方地形构造器和地形准备协议建立隔离分支。随后暴露另一处产品缺陷：远程视线投影将多格坡道转换为普通矩形，丢弃格轮廓，却复制了包含格轮廓哈希的原准备协议。高度内核校验该普通地形时返回 ELEVATION_TERRAIN_INVALID。两者的失败来源不同。

该项仍待修复。后续需让遮挡按真实物理格判定，同时保留同一地形的 ID、对模型及高地的支撑关系和合法准备协议。从已保存分支续验即可。普通地图上两条已完成路径的结果有效。

[首次夹具停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-bombard-v247/unused/stop-1795526879169.json) · [签名地形下的产品停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-bombard-v247/unused-agreed/stop-1795529293879.json) · [远程视线投影](../../packages/product-composition/official-ranged-terrain-projection-v1.mjs)
