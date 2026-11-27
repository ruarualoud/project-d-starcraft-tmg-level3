# Ticket 28 / W3-10、11 · 直接 Hits 与 Hydriodic Bile

Zeratul 的 Shadow Strike 接入冻结发布，复用已有护甲选择、伤害反应及分伤执行器。含 Zeratul 的合法 500 矿军表经过 Skirmish 工厂，再从隔离近战棋位实际支付 1 PE。原生流程只掷护甲骰，保存收到 4 点伤害的停点。在相同骰子下，Medic 支付 1 CP 使用带稳定器的 Life Support，减免 4 点，陆战队保留 6 个模型。放弃分支减免 0 点，防守方实际选择伤亡，保留 4 个模型。两条分支都将操作权和激活交回 Zeratul。

工程验证发现反应关闭时活动席位仍是防守方，导致 Hits 检查点被拒。修正将操作席位从已保存的反应窗口取回给原行动方，并仅从伤害停点补验。此项证据覆盖 Shadow Strike 的 HITS，其他直接伤害来源仍各自需要实际发布接线。

Corpser 与 Vile 选购 Hydriodic Bile 后，Acid Saliva 攻击 Light 目标确实采用 D3+1。两例 Surge 骰面 6 均转成 4 点护甲绕过，并在保存后继续防守方分伤。未购升级的普通 Roach 对照无 Surge，固定成功护甲骰下伤害为 0。已选升级的两个能力计入基准军表覆盖，Shadow Strike 计入专项军表。新增规则原子为零。

Standard 79/117，Skirmish 22/33，Ticket28 完成 2/16。旧 Wave1 V6 描述符逐字段相同。付费模型调用为零。

- [Shadow Strike 与 Life Support 回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-direct-hits-release-proof.public.json)
- [三条 Acid Saliva 实战回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-roach-hydriodic-proof.public.json)
- [Skirmish 和旧版兼容](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-direct-hits-release-compatibility.public.json)
