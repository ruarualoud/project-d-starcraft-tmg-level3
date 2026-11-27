# Ravager 的 Devastating Charge

Ticket28 / T28-W3-09 / M08。正式房间使用 2.43.0 候选规则、同一张签名地图和同一份军表。

用此前射击验证的 r0 状态建立独立分支。Ravager 在 (18, 18)，最近的掠夺者在 (18, 23)。两个分支的初态哈希均为 `c58120728037ea7e5ec931b8fd4fe2cd7e04f6d3c53549fb4e4da03713cd9781`。

| 环节 | 实际记录 |
|---|---|
| 宣告 | 玩家二通过公开菜单指定掠夺者为目标。对方放弃本次反应。 |
| 冲锋 | 冲锋骰为 5，最大可移动 13 英寸。Ravager 前进 2.44 英寸到 (18, 20.44)，两底盘接触。 |
| 冲击 | 结算绑定冻结定义 `unit:ravager/devastating-charge-assault-phase@1`。必须完成两骰、4+ 的冲击结算才可结束激活。实际掷出 3、1，伤害及移除数均为 0。 |
| 后继 | 玩家一重新取得行动权，公开菜单含掠夺者的射击。重开存储后按 8 条正式回执重放，完整状态与 r8 一致。 |

本例使用直接编入军表的 Ravager。其射击分支另有 1 点伤害记录。Combat 阶段的 Claws 以及孵化生成模型的攻击另列验证。M08 仍在进行，未调用模型。

[房间结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-charge-v243/result.json) · [工程入口](../../scripts/verify-wave3-standard-ravager-charge-v243.mjs) · [射击分支](ticket-28-wave3-ravager-bile-board-v243-2026-11-24.md)
