# Ticket 28 · W3-11 · Standard Fire 中立高地与等级计分

在冻结 U83/C84/R50 + FAQ 1.3 的 Standard v2.3 原房续行。r31 为上轮已经保存、复核过的交权后态。两席由脚本提交预设动作，Provider 调用为零。

| 签名 revision | 权威判定 |
|---|---|
| r32、r39 | 凯瑞甘 Run 至 (23.1, 16.2)，仍在地面。5 号点无控制方，其排除原因为缺少同高程、三英寸内且视线可通的模型。 |
| r46、r47 | 未声明梯子的登高预览返回拒绝，状态哈希保持。相同坐标加地图真实梯子 access-std-centre 后提交，凯瑞甘位于 (27, 18) 的高地，权威后态确认支撑地形 std-centre-large。前一拒绝探针未保存具体 API 错误码。 |
| r57、r58 | 第三回合凯瑞甘控制中立 5 号点。1 级实得 1 VP，累计 0:1。 |
| r68、r69 | 第四回合执行 Sabotage，5 号点 1→2。提交幂等，激活结束后交权。 |
| r76 | 第四回合第二次结算，该点 2 级实得 2 VP，累计 0:3。人族持有本方 3 号点，两回合均未因此得分。 |

关闭同房数据库后，仅从签名 r31 重放新增 45 条回执至 r76。完全状态、stateHash 以及 matchBindingHash 与保存后态一致。

## Standard 主军表准入

实际旧候选准入返回待接总数 15，详情却列出已选的 117 条。来源登记字段为 registrationStatus，旧详情读了 status。修复 [准入错误详情](../../packages/product-composition/official-release-room-ability-admission-v2.mjs)，缺件数与缺件 ID 取自同一份登记状态。用原 Standard 主军表绑定重新触发真实准入后，读到 15 个 ID，准入仍阻断。

这 15 个报告项中，Strike 有独立的口径缺口。复用军表的权威装备投影对账了三队共 27 枚 Marine。其装备均为 Bayonet，Strike 在每枚模型上已被替换。当前准入仍以卡面默认加已购买项计入 Strike。后续须按可恢复的发布合同复用实际装备投影，并验证“完全替换、部分替换、原武器仍装备”三个场景。登记统计仍为 102/117，修复并证明该口径前不调整分母。

- [高地控制和两轮任务计分](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-high-scoring.public.json)
- [r31 至 r76 冷重放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-fire-sabotage-high-scoring-cold.public.json)
- [准入修复和 Bayonet 逐模型对账](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-missing-registration-diagnostic.public.json)

Ticket 28 仍为 2/16。Standard Fire 保存于第四回合清理 r76。正式产品入口、Artefact 原生 PLACE 和 Standard 剩余能力待验。
