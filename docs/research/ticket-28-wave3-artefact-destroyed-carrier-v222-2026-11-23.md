# Ticket 28 / W3-11 · Artefact 携带者阵亡

复用 Standard Artefact 已保存的 1 号标记携带状态。隔离验收声明突击阶段、双方站位和凯瑞甘剩余 1 点生命，使用冻结军表以及 U83/C84/R50 + FAQ 1.3 的任务和几何。原生签名记录覆盖从合法射击到标记落回棋盘。

| 签名 | 权威结果 |
| --- | --- |
| r1 | Goliath 的 Autocannon 完成真实掷骰并移除凯瑞甘的唯一模型。触发原因是 `destroyed`，掉落参照为射击回执所列模型在 (44, 3) 英寸的实际底座。 |
| r2 | 对手 player1 独占摆放域，在 (44, 4.9) 英寸放回 1 号标记。清除携带记录并恢复正常行动菜单。 |

从原清单重建 2.22.0 Match，重新打开 SQLite，逐条回放两张新签名，终态完全一致。首次只读准备缺少已冻结任务资源，第二次声明棋位漏写先手标记持有人。修正夹具后合法域可读，两次均发生在开房前。零模型调用。

本证据覆盖单模型持有者阵亡。多模型全灭时的最后移除顺序、当前 Supply 降低、撤回预备队、其他移除来源及 Skirmish 的 PLACE 时序仍待各自签名验证。

- [真实射击与掉落签名](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/destruction-v222/result.public.json) · [掉落窗口及底座参照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/destruction-v222/drop.public.json)
- [验收前的两条诊断](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-artefact-terminal-v219-v1/destruction-v222/preflight-stops.public.json)
