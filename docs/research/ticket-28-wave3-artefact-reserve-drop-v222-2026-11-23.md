# Ticket 28 / W3-11 · Artefact 携带者撤回预备队

冻结 U83/C84/R50 + FAQ 1.3，使用同版 Standard Match 2.22.0 与隔离产品 Room。复用已验 Dropship 军表种子，由新版正式工厂重新编表。声明第二回合 Cleanup 时 Goliath 的棋位，权威执行控制判定与拾取 2 号 Artefact。撤回分支从该签名持有状态声明第二回合 Movement。两个检查点之间直接设定阶段用于验收，没有模拟完整回合。

| 验收 | 签名结果 |
| --- | --- |
| Cleanup r0 → r2 | player1 得到标记控制权，Goliath 拾取。 |
| Movement r0 → r1 | player1 使用 Dropship 的 Strap in!。卡耗竭、单位撤回预备队、可用 Supply 从 6 增至 8、同一事务开启对手摆放。 |
| r1 距离与席位 | 原 Goliath 模型底座为参照，中心 (42, 14.4) 英寸。摆放限距两寸，(50, 14.4) 英寸预览拒绝。只有 player2 看到摆放窗口。 |
| Movement r1 → r2 | player2 于 (42, 16) 英寸放回标记。清除携带记录，恢复 player2 常规菜单。 |

两房共 4 签，独立重开 SQLite，按旧状态引用精确冷回放。模型调用 0。本次未修改生产源码。首轮夹具漏取同版任务 Supply Profile，第二次误读卡牌投影，第三次已实际得到正确的超距拒绝、夹具预期错误名称。保留三次停点，最终从原 r1 仅补正例与冷恢复。

其他非撤回移除来源、Skirmish PLACE、端上入口与完整组合仍待验。

- [拾取](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/withdrawal-v222/claim/result.public.json) · [撤回与放置](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/withdrawal-v222/withdrawal/result.public.json) · [超距拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/withdrawal-v222/withdrawal/range-rejection-attempt-3.public.json)
- [夹具停点一](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/withdrawal-v222/stop-1.public.json) · [夹具停点二](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/withdrawal-v222/stop-2.public.json) · [夹具停点三](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/withdrawal-v222/stop-3.public.json)
