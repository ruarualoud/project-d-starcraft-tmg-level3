# W4-02：感染步兵与独立激活计数

本批接好 Infested Marine／Infested Trooper 的 **15 条定义**：7 条武器数据、4 条已有原子复用、4 条已有原子新组合。**新增游戏原子 0，累计仍为 6/18**。两条 Detonation 尚未接入；Trooper 的 Spread Infestation 已在上一批验证。逐 ID、分类、实际消费者及对应证据见[15 条映射](evidence/infantry-consumers.public.json)。

| 定义组 | 数量 | 实际消费者与结果 |
| --- | --- | --- |
| Live for the Swarm! | 2 | 精确来源编译 → Characteristic 条件投影 → 原生步枪和全部近战 Precision 选择。读取受体 INFESTATION，或其与任一 Creep Source／Tumor 的实际底座 6 英寸测距；不限制受体种族、飞行或菌毯控制方。其他远程武器不获加成。 |
| Burrow Ambush | 2 | 既有 Relocation 入口边 PLACE(18)、完整编队、Supply、敌军严格大于 10 英寸及结束激活。Marine 实际购买 20 分升级；Trooper 免费。两者 Native 与 Web 均实际进场。 |
| Devastating Charge | 2 | 既有近战来源 → 原生 Charge／IMPACT 分配与防御选择。实际成功冲锋分别产生 Marine 12 骰、Trooper 6 骰，每个合格模型 2 骰、4+。具名冲锋棋位启用既有 FAQ IMPACT 分配政策。 |
| 四条远程武器 | 4 | 既有武器 Profile、选装、模型负载、远程批次和骰池消费者。两款导弹发射器各只由实际指定的 SPECIALIST 模型使用；连续两批攻击均未获得 Live 的 Precision。 |
| 三条近战武器 | 3 | 既有武器组件路由与近战骰池。Wild Mutation、Strike、Bayonet 均完成实际攻击；感染目标使三者的 `activePrecisionValue` 为 2。 |
| Plagued Munitions | 2 | 原生 C-14 Rifle 造成正伤害的完成事件 → 被动后继 → 既有 Damage Received 反应、总伤害池减伤与 NON-LETHAL 内核。Marine 需购买 10 分升级，Trooper 免费。保持原激活、反应窗口和后继。 |

Plagued Munitions 追加 1 点非致命伤害，完整累计伤害标记，不自行移除模型。实际 Marine 与 Trooper 分支均从标记 1 累计到 HP 2，未产生额外伤亡。Medic 可以在追加伤害分配前使用 Life Support；实测总池由 2 减为 0。原生普通攻击的减伤窗口先完成，被动后继再开自己的窗口，随后恢复原主动方及原后继。新军表同时绑定已有的「后续正普通伤害才移除非致命伤亡」政策。

Stukov Admiral 的解除激活标记还需更新激活身份。本批以来源约束的可选政策修正：同一单位实际完成第一次 Move、经 Spread／Admiral 后再次 Move，两次使用不同激活 ID。护甲序数及 Damage Received／Restoration 的反应身份读取同一计数；回合清理移除当前身份标记。未启用新政策的旧绑定保持原行为。这属于已计入的 Admiral 合同，不新增游戏原子。

本批共有 **16 个原生分支、62 条签名动作**，全部幂等和完整 journal 冷重放通过：

- [基础条件与伏击](evidence/infested-infantry-base.public.json)：5 分支、12 动作。
- [武器与近战](evidence/infantry-weapons.public.json)：4 分支、16 动作。
- [成功冲锋与 IMPACT](evidence/infantry-charge.public.json)：2 分支、12 动作。
- [Plagued Munitions](evidence/plagued-munitions.public.json)：4 分支、12 动作，含未购买反例及 Medic 减伤。
- [同单位两次实际移动](evidence/admiral-repeat-activation.public.json)：1 分支、10 动作。

[24 项只读边界检查](evidence/infantry-boundaries.public.json)覆盖精确来源漂移、受体种族／飞行／控制方、移走菌毯来源、设置回合来源禁用、未购买伏击、超过 18 英寸、入口区段、恰好 10 英寸和 Supply 不足；其中明确区分假设查询与上述签名动作。Creep Tumor 与感染源的完整组合回合留给整版验收，当前实际 Precision 正例使用 INFESTATION 和 Source of Creep。

Web 共 **3 房 4 次显式确认动作**：[Marine／Trooper 伏击部署](evidence/infantry-burrow-web.public.json)各一次，[Medic 处理追加非致命伤害](evidence/infantry-munitions-web.public.json)两次。实际填写 6／3 个模型最终站位；1500px／390px 两个独立人类席位完成只读 Preview、确认、Apply、重放、刷新和恢复重进，页面错误 0。复用已验证的 `015a8d3…` Web 构建，规则运行时由各房精确绑定。[伏击预览](evidence/infantry-burrow-preview.png)、[手机 Life Support](evidence/infantry-munitions-mobile.png)与[Harness 回执](evidence/infantry-harness.public.json)一并保存。5484 已关闭。

步兵 32 mm、Stukov 40 mm、炮塔 80 mm 均继续只作独立工程估算；未取得官方逐件实测权威。39 条来源阻断不变。完整 Wave4 发布、Builder／大厅、媒体及 500／2000 分 Web 全流程尚待，长任务继续；本批证据不代替整版准入。

付费模型、K3、AI 对局、复盘与生产发布继续暂停，零模型调用，`trainingTruth: false`。
