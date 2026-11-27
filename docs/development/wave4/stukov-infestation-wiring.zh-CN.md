# W4-02：Stukov 感染、任务 Supply 与激活交换

本批接入五条定义，新增游戏原子 **1**：`rule-atom:wave4/infestation-activation-exchange@1`。累计 **6/18**，原生与 Web 局部门均已通过。18 是需实现的合同数，撤回 Archon 独占的另 3 个候选合同不计入这个分母。

| 稳定定义 ID | 分类 | 实际消费者 |
| --- | --- | --- |
| `unit:stukov/commander-any-phase@1` | 已有原子复用 | 精确来源 → Stukov contextual routes → 既有 Commander capability 与 Contextual Supply 投影；任务与 Disengage 为 2，Supply Pool 仍为 1。 |
| `unit:stukov/plague-warden-any-phase@1` | 已有原子新组合 | 同源投影在任务／目标语境读取敌方 INFESTATION、Stukov 在场及实际底座 6 英寸；最低 0。真实 Marker Control、计分读取该投影。 |
| `unit:stukov/spread-infestation-movement-phase@1` | 已有原子新组合 | Characteristic Status 的范围／LoS、BM 支付、持久 DEBUFF／标记 → 既有 `debuff_received` 反应优先权与 Restoration。 |
| `unit:infested_trooper/spread-infestation-any-phase@1` | 已有原子新组合 | 同一消费者，独立来源 ID；已在 Assault 阶段实际施加感染并完成 Restoration。 |
| `unit:stukov/admiral-of-the-infested-movement-phase@1` | 新增语义 | 来源约束的敌军与可选友军选择 → 新激活交换原子 → 共用 `activatedPhases` 标记、感染标记移除、阶段可激活列表及真实友军 Move。 |

Admiral 先使已感染敌军在本 Movement Phase 计为激活并消耗感染，再可选择距该敌军 8 英寸内的 Non-Unique Infested 友军解除激活标记。选择可跳过；范围、控制方、Unique、INFESTATION 和 LoS 均在 Preview／Apply 重新核对。保留其他阶段的激活状态。Web 表单新增「友方单位（可跳过）」与「跳过」文案。

## 原生与任务结算

[四个原生分支](evidence/stukov-infestation.public.json)共 **34 条签名动作**：激活交换后友军再次 Move（7）、跳过可选友军（4）、Trooper 在 Assault 感染到 Medic Restoration（3），以及从原生 Mission Start 到清理／下一回合先手的完整回合（20）。全部幂等与完整 journal 冷重放通过。使用真实 Builder 合法的 Stukov／Infested Marine／Infested Trooper 对 Terran 大编制 Marine／Medic；初始位置与友军旧激活标记为具名条件。

[任务投影审计](evidence/stukov-marker-proof.public.json)复验同一条 20 动作 journal：感染前双方在目标点各 2 Supply；原生 Marker Control 实际按 **2:1** 令 P1 获得控制并完成计分。敌方基础 Supply 仍为 2，损失账没有新条目，Disengage 仍取 2。Stukov 的 Commander 在 Disengage 取 2，供给池取 1。另有明确标记为只读假设查询的后备／最低 0 对照，不计为签名移动。

## Web 双席

[三房 Web 验收](evidence/stukov-infestation-web.public.json)共 **7 次确认动作**：Admiral 选择友军解除标记（1）、Trooper 感染到 Restoration（3）、Stukov 感染并保留状态（3）。从各自签名原生前缀开始；两个独立浏览器席位使用 1500px 桌面与 390px 手机宽度，Preview 只读、显式确认、Apply、重放匹配、双席刷新与恢复重进均通过，页面错误 0。[桌面激活交换表单](evidence/stukov-admiral-form.png)与[移动端 Restoration](evidence/stukov-restoration-mobile.png)来自本次运行。

[本批离线构建](evidence/stukov-web-build.public.json)包含新增选项文案，未安装依赖；5484 验收服务已关闭。[Harness 回执](evidence/stukov-harness.public.json)登记操作路径与失败回退。共享反应后继调整后，[既有 Virus 7 分支的当前代码冷重放／查询](evidence/virus-audit.public.json)仍通过。Commander／Warden 的原生投影和实际任务结算已验，Web 计分完整场景留在整版两种规模验收。

## 几何与产品边界

三款新单位进入独立工程候选。参考[官方 Purification 图片与产品页](https://starcraft-tmg.com/shop/pre-orders/starcraft-two-player-starter-set-purification)，暂取 Stukov 圆形 **40 mm（32–50）**，Infested Marine／Trooper 圆形 **32 mm（32–40）**。Stukov 参考同图炮塔约一半的底座宽；感染步兵为圆形步兵底座的临时选择，Trooper 暂用同套件变体。这些并非官方逐件尺寸或实测结果。原图字节、SHA256、方法、范围及低置信度随估算冻结；没有从 Size 属性推断底座。

[几何门](evidence/stukov-geometry.public.json)验证三个实例读取各自估算哈希、源图片字节匹配，正式上下文继续拒绝估算几何；39 条来源阻断的记录仍不进入 Builder 候选。炮塔 80 mm 保持原工程估算。

五条能力的原生接线不代表三个单位全部能力或整版发布完成。Stukov 的其余能力、感染步兵的 Precision／Plagued Munitions／Burrow Ambush／Detonation 与武器后继仍在后续范围。完整发布、Builder／大厅、媒体和 500／2000 分 Web 人人验收继续推进。

```sh
node scripts/verify-wave4-stukov-infestation.mjs
node scripts/verify-wave4-stukov-marker-proof.mjs
node scripts/verify-wave4-stukov-geometry.mjs
```

付费模型、K3、AI 对局、复盘和生产发布继续暂停。零模型调用，`trainingTruth: false`。
