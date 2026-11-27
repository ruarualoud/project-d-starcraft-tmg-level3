# Ticket 28 / W3-11 · Standard Artefact 的终局及掉落后继

使用 U83/C84/R50 + FAQ 1.3 的真实 Standard 工厂和已验军表。第二轮控制从实际工厂棋位生成，凯瑞甘以底座边缘 0.682 英寸的合法距离拾取对方 1 号标记。第五轮场景从这个持有状态声明位置。其间回合不重新执行。

| 第五轮场景 | 结果 |
| --- | --- |
| 凯瑞甘完整进入友方影响区 | 签名控制、计分和五轮终局为 2:8，player2 获胜。3 条签名冷回放一致。 |
| 中心在影响区内，底座跨出边界 | 只读权威内核对照为 2:4，完整入区的 4 分不会发放。 |
| 敌方 Goliath 接敌，Current Supply 2 对 1 | 签名动作触发对手掉落窗口。双方均无计分项，只有对手能摆放。超出 2 英寸被拒，合法坐标 (44, 4.9) 英寸实际摆回。修复后的计分与五轮终局为 4:4。 |

v2.19.0 在原掉落分支 r2 拒绝计分。其规则要求所有标记保留同一轮控制回执，而已提交摆放会删除该标记旧位置回执。v2.20.0 需要当轮控制之后的实际放置事件引用旧控制摘要，同时核对现坐标、标记已恢复和无持有状态。其余标记仍逐项验证控制回执。篡改引用、改坐标、删另一标记回执均拒绝。

只读读取原权威 r1 与 r2，两条旧签名的回放和绑定摘要精确一致。新版从原 r1 的已触发掉落状态建立隔离房间，只走改变的摆放、计分和终局。3 条新签名重开 SQLite 后完全一致。2.20.0 由候选清单显式选用，零模型调用。

- [声明棋位与跨边界对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/checkpoint.public.json)
- [完整入区签名与恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/inside-result.public.json)
- [原 r2 拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/drop-r2-stop.public.json)、[原签名校验](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/drop-continuation-v220/migration-checkpoint.public.json)
- [新版掉落分支签名与恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/drop-continuation-v220/drop-result.public.json)、[版本化反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/drop-continuation-v220/regression-controls.public.json)
