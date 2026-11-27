# Ticket 28 / W3-11 · Lunge 自动队形签名验收

正式 Match 2.18 的 `complete_lunge_move` 支持省略 `move.placements`。玩家给出当前反应、付款卡、领队 ID 和路线。查询按实际底座和最近目标距离采样，按连贯范围与已知占位筛选，再用 Native 校验全队、地形、速度和领队证明。找到首个能证明的完整动作后返回。有限搜索缺证据时为未决。

| 边界 | 实测 |
| --- | --- |
| 双模型自动队形 | 复用已验证的守方反应 r2。只给领队路线和付款时，自动生成跟随落点 (12.877, 3.301) 英寸、旋转 90°，同时补齐领队比较证明。跟随底座距射手 **1.001 英寸**，满足最近合法距离证明。 |
| 查询和实际消费 | 领队沿 3.987 英寸路线到 (13.290, 6.629)。连贯性查询、正式预览和提交动作哈希一致。实际支付 1 Biomass，交回原射手，独立冷回放一张签名一致。 |
| 显式输入对照 | 提供上一轮明确摆位与证明会得到原动作哈希。双模型输入显式空摆位时，返回摆位数量不完整，执行器拒绝。 |

此范围覆盖固定领队路线的地面队形。自动选择领队路线、复杂多障碍、跨表面移动和更多模型的搜索能力仍需独立证据。票据完成 2/16，零模型调用。

- [实证汇总](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-generated-formation-v218-signed-v1/result.public.json)
- [查询证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-generated-formation-v218-signed-v1/auto-query.public.json)、[正式提交](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-generated-formation-v218-signed-v1/commit.public.json)、[冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-generated-formation-v218-signed-v1/cold.public.json)
- [显式参数兼容性](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-generated-formation-v218-signed-v1/explicit-control.public.json)
