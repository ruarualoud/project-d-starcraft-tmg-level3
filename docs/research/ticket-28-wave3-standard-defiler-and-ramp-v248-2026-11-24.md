# T28-W3-09 / M08　复合坡道与 Defiler 副武器

## 地形在两个入口的差异

2.47 的正式房间停在第一回合。突击射击菜单以及稍后的任务控制点结算，分别把多格坡道改画成普通矩形，同时沿用原有分块签名。高度检查因此拒绝该地形。现共用同一视线投影，核验原轮廓，按实际物理格查遮挡和支撑，并保留坡道原 ID。

实测通过两条射线：从 (15,14) 到 (15,20) 沿空隙，没有地形格横断；从 (12,17) 到 (18,17) 横穿实体格，识别到了遮挡。Nova 站在 (14.1,17) 能获得该坡道的 1 级支撑，移到 (15,17) 空隙后支撑请求被拒。修改单格但沿用旧签名也被拒绝。2.46 的旧版绑定保留原处理。这里的射线检查衡量地形遮挡，实际射击还受单位体型和掩体影响。

[定点几何及其对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-bombard-v247/sight-support.json) · [保留的上轮工厂记录](../../docs/research/ticket-28-wave3-zerg-40-formal-v245-2026-11-24.md)

## Cancerous Bite

同一组 57 条所选定义、同一对阵、任务和部署下，2.48 将购买的 Cancerous Bite 接入已有近战副武器流程。预检查识别 34/40，比 2.46 多这一项。准入表与严格工厂曾不一致，因为工厂过滤选项时忽略了新增开关。已修正工厂默认选项，严格入口有单独回执。

双席场景从标准军表开局，只声明单位的初始棋位。首版测试军表试图购买两只 Defiler，超过一个支援位，正式写表器正确拒绝；测试军表加入实际提供额外支援位的 Hatchery 卡。比较同一局内花 20 矿购买副武器的 Defiler 与未购买的 Defiler。

[逐项准入与缺口](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v248/coverage.json) · [支援位拒绝和调整](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-bite-v248/initial-fixture-rejection.json)

## 正式房间的后继

复合坡道原房通过任务点结算与回合清理。未射出的酸液标记在清理阶段移除并换成菌毯，第二回合出现任务开始动作。关闭房间服务后从初态重放 12 条已提交回执，所得房间状态与保存状态逐字段一致。

[第二回合和冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-bombard-v247/unused-agreed/result.json) · [副武器的真实菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-bite-v248/both/menu-r8.json)

首批实际攻击已在 r11 结算：已购 Cancerous Bite 对 Spec Ops Marauder 投 2 枚命中骰、造成 2 点伤害；同状态菜单同时提供 Claws 和主动结束。两条后继分别从已保存的 r11 验证。 [r11 菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-bite-v248/both/menu-r11.json)

## 双批近战的冷回放

同一名 Defiler 对 Spec Ops Marauder 先用 Cancerous Bite 投 2 枚命中骰，造成 2 点伤害；再用 Claws 投 4 枚，造成 1 点伤害。对方随后获得 Strike，15 条回执从初态冷回放得到完整一致的房间状态。[正式双席结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-bite-v248/both/result.json)

## 在相同棋位主动结束

从主房 r11 同一状态分出另一条选择。主动结束后只保留 Cancerous Bite 的 2 点伤害，Claws 没有执行。对方获得 Strike，两条新回执精确冷恢复。首次验收在 r1 写入时与另一测试进程争用 SQLite；保留原记录，在同库另一个进程结束后从 r1 继续。2.49 的两种卡牌用法分别使用各自的临时库。 [主动结束和冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-bite-v248/stop/result.json)
