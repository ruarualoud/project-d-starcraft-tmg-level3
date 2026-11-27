# Ticket 28 · W3-10／11 · Ventral Sacs 入场后移除敌方菌毯

## 根因与修改

旧候选的普通 Deploy 在空间动作结束后调用现有菌毯消费者。Ventral Sacs 的部署从战场资产适配器返回 Match，因此漏掉该后继。同发布的 Standard 虫族镜像局真实组件复现了这一行为。Hatchery 产生敌方菌毯，Overlord 放置信标，经过计分和回合末触发，v2.11 部署已落地但菌毯仍在。

v2.12 按发布绑定启用此行为。Match 确认 Ventral Sacs 已实际提交一个预备队 Deploy，再用当前终态调用已有的菌毯移除规则。范围使用完整底盘边缘和同发布的 Accelerating Creep，移除事件随提交一起保存。沿用旧版的合法域、权威队形和 Supply 判定，未增加规则原子。以保存的 v2.11 候选重新绑定时，其描述符逐字段一致。

## 验收结果

| 场景 | 实际结果 |
|---|---|
| 近端签名房 | 三个 Vile 模型完整入场，可用 Supply 4→3，敌方菌毯移除一次，保存了来源与测量哈希。幂等重送返回原提交。 |
| 超距对照 | 同一回合末棋位和信标，改用合法的另一侧落点，三模型入场，超距敌方菌毯保留。通过产品运行时隔离执行。 |
| 放弃部署 | 同一棋位直接选择放弃，预备队与敌方菌毯保留。Cleanup 移除信标，Overlord 恢复可用。通过产品运行时隔离执行。 |
| Cleanup 与冷恢复 | 签名房 r2 清除信标并刷新原卡。关闭后重开，部署与 Cleanup 两条回执重放，终态哈希一致。 |

第一份夹具的 12 模型方形阵存在两个越出连贯圈的模型，已按实际底盘改为紧凑六角阵。第二份直接 Match 调用未传正式任务控制所需的匹配绑定，前置的两项资产动作只存在进程内。修正后用真实 Room 生成绑定，重建该隔离棋位，保存资产和回合末断点。没有重跑历史房间。新签名房从已保存、由同发布运行时生成的回合末状态开始，前缀属于组件证据。

原 v2.10 Ventral Sacs 房仍保留 r16。本轮签名验收用独立的 v2.12 Standard 场景，未覆盖其它特殊部署和底盘与菌毯重叠时的令牌位移。主 Standard 军表登记 114/115，仍缺 Lunge 完整反应与位移。完整任务／部署组合和端上验证仍待。整体 2/16，零模型调用。

- [v2.11 反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-ventral-enemy-creep-before-fix.public.json)、[近端与超距](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-ventral-enemy-creep-v212-deployed.public.json)、[放弃分支](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-ventral-enemy-creep-v212-decline.public.json)、[Cleanup](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-ventral-enemy-creep-v212-cleanup.public.json)、[签名冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-ventral-enemy-creep-v212-cold.public.json)。
- [Match 消费者](../../packages/product-composition/official-current-product-match-runtime-v1.mjs)及[普通 Deploy 证据](ticket-28-wave3-queen-native-creep-deploy-2026-11-23.md)。
