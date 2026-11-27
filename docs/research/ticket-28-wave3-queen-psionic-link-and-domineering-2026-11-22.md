# Ticket 28 / W3-10、11 · Wave3 Queen 支援

冻结军表的两条 Queen 能力复用旧版模型距离、资源支付和任务 Supply。新版接线把减费选项绑定到同一个 Queen 使用记录。Domineering Presence 的临时加成进入既有任务和占点原子。新增规则原子为零。

| 验收点 | 结果 |
| --- | --- |
| Psionic Link 门槛 | 6 英寸内 6 个友方模型只能付原价。7 个模型时，合法菜单同时提供 1 BM 原价和 0 BM 减费。 |
| 一次减费跨能力 | Domineering Presence 选减费后，本回合 Spawn Creep Tumor 恢复 1 BM。另一个分支先按原价施放，保存后重新读取，能用减费版 Spawn Creep Tumor 实际放置菌毯。下一回合重新可用。 |
| Domineering Presence | 另一友方单位的争点和任务判定 Supply 从 1 到 2。单位基础 Supply、增援池和撤离判定保持 1。独立棋位用正式占点计算得到同一点的虫族总量 1→2，下一回合加成失效。 |
| 兼容性 | 同时核对旧 Wave1 V6 描述符逐字段一致。 |

占点对照首轮因隔离棋位的 Queen 仍带预备役连贯性标记被规则器拒绝。补验沿用已保存的施放和支付结果，用已有规则函数生成连贯性结果。Standard 77/117，Skirmish 22/33，Ticket28 完成 2/16。

- [支付、菌毯与冷读](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-queen-support-payment.public.json)
- [任务点及 Supply 接口](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-queen-support-supply.public.json)
- [Skirmish 与旧版兼容](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-queen-support-compatibility.public.json)
