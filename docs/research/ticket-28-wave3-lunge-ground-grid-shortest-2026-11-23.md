# Ticket 28 / W3-11 · Lunge 双侧最短绕行的整数路径证明

沿用已付款反应状态和上轮隔离 Raptor 阻挡摆位。Hydralisk 从 (9.6, 5.5) 到 (14, 5.5)，终点沿通往原 Goliath 的射线。直线在权威 Move 被拒。上轮合法上界 4.995 英寸，已绑定通行圆的连续下界按原生路径精度记 4.993 英寸。

## 实际验证

| 输入 | 原生结果 |
| --- | --- |
| 原阻挡状态，两侧整数折线 | 31 次候选试算、26 条通过。上下侧各有一条 4.993 英寸路线，29 个提交路径点。两条最终几何哈希和证明哈希都可由同一原生 Move 重算。 |
| 同端点直线 | 仍被 Raptor 拒绝，错误码 SELECTED_SPATIAL_PATH_MODEL_CLEARANCE_INSUFFICIENT。 |
| 4.995 英寸的另一条路径 | 在原生 Move 合法，超出已知最短长度，无法取得最短证明。 |
| 可能可达的高差入口 | 用原地形工厂构造对照，入口距起点 9.001450 英寸，在速度舍入加容差内。原 4.993 路线仍能通过原生 Move，固定地面绕行证明撤回。 |
| 原有 Lunge 产品提交闸门 | 仍以 LUNGE_MOVE_GLOBAL_PROOF_REQUIRED 拒绝这条绕行。未生成新的 Room 收据。 |

候选生成先从连续圆障路径取切向方向，在 1 mil 网格上选择符合起始与恢复方向的整数点。对解析折线的各个点，检查局部格点之间的扫掠，按累计长度选合法折线。解析种子数和格点邻域均有上限，候选最终仍走权威路径与队形校验。最短性来自合法上界等于同一计算精度的连续放宽下界。两侧是两个已验选项，更广的等长选项仍可能存在。

本次范围固定领队、起点和终点。全局终点选择、复杂队形、正式房间同一事务提交、射手后继和冷回放仍待。旧签名沿用原证据。单次隔离搜索约 7.84 秒，尚无可比较的正式房间性能。Standard 主样例 114/115。Ticket28 实施 2/16，余 02、03、05–16，模型调用 0。

[公开证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-ground-grid-shortest.public.json)、[可续验的实际棋位](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-ground-grid-shortest-checkpoint.json)、[以前的缺口归因](ticket-28-wave3-lunge-ground-clearance-detour-2026-11-23.md)和[直线签名](ticket-28-wave3-lunge-multi-direct-signed-2026-11-23.md)。
