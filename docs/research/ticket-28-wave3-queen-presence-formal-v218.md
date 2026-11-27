# Ticket 28 / W3-11 · Queen 正式 Match 付款、占点与到期

冻结 U83/C84/R50 与 FAQ 1.3。两个席位使用正式 Match 2.18 和原生 Room 签名。初始棋位沿用原 16 单位军表和 Fire in the Sky 的正式任务目录。Queen 和六枚 Raptor 的受控站位由既有连贯性入口核验，使用原 4 号标记。

| 边界 | 实测 |
| --- | --- |
| 付费与效力 | r1 有 0 和 1 Biomass 两个合法域。本次提交 1 Biomass，支付卡从 ready 变为 exhausted。Raptor 的争点和任务 Supply 都由 1 增为 2，增援和撤离仍为 1。 |
| 实际占点 | r11 的任务标记控制签名记录显示 4 号标记虫族 Supply 为 2，与 r1 的权威同状态预估一致。前缀 11 条签名独立冷回放一致。 |
| 跨轮到期 | Cleanup 隔离分支从第一回合加成 2 开始，实际提交计分、终局检查、回合末效果、刷新、先手和下一轮任务启动。进入第二回合移动时，4 号标记虫族 Supply 与任务加成均回到 1。分支 6 条签名独立冷回放一致。 |

原棋位是移动阶段夹具，缺少回合一任务启动记录，r11 后正确拒绝给出计分入口。保留原房 r11，只在隔离分支用同版任务引擎补出首轮初始化。该任务在第一轮无需激活额外标记。两房的签名和冷回放分别计算。初次读取夹具时也纠正了快照封装与查询参数名，未更改业务代码。

## 旧能力全目录对账

用旧快照源特征哈希与稳定 ID 匹配，252 个旧能力全部在 Wave3 的 414 项源定义中找到，映射到 12 个旧执行器。12 项在比较字段中存在差异。115 个继承定义属于已验 Standard 主军表，其余 137 个在该样例外，按各自的正式目录和后继另行对账。身份匹配不推断执行兼容性。

Ticket 28 整体 2/16。Lunge 共享路线查询、复杂几何、其余发布消费者和端上验收仍待。模型调用 0。

- [实证汇总](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-queen-presence-formal-v218.public.json)
- [付款与占点冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-queen-presence-v218-signed-v1/payment-and-control-cold.public.json)
- [第二回合到期](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-queen-presence-v218-signed-v1-cleanup/expired.public.json)和[分支冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-queen-presence-v218-signed-v1-cleanup/round-cold.public.json)
- [252 项旧定义对账](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-definition-reconciliation-v1.public.json)
