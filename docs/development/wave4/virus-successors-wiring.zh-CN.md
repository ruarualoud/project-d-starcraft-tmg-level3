# W4-02：Virus HEAL 与菌毯后继

本批补齐 Universal Carrier 与三张 Virus 卡的 Stukov’s Creep。四条定义均为**已有原子的新组合**，本批新增游戏原子 **0**，累计仍为 **5/18**。当前证明覆盖这些实际消费者；整版 Wave4 人人对战继续进行，39 条规则来源阻断保持隔离。

| 稳定定义 ID | 实际消费者与复用 |
| --- | --- |
| `card:healing_pathogen/universal-carrier-any@1` | 精确来源编译 → `createOfficialUniversalCarrierRuntimeV1` 观察原生 Supply loss ledger／阵亡及最后在场底座 → 控制方选择 Biological 友军 → 既有 `createOfficialHealResolutionKernelV1` → 恢复原攻击／反应后继。 |
| `card:healing_pathogen/stukov-s-creep-any@1` | Battlefield Asset Family 的组合被动路由 → Side Capability → Creep Spread 原生 token 的 STAY IN PLAY／DISPLACEMENT → 既有 token 位移、行动末移除及回合清理所有者。 |
| `card:weighted_pustule/stukov-s-creep-any@1` | 同一组消费者，以实际 Weighted Pustule 卡、独立稳定 ID／来源特征哈希绑定。 |
| `card:hungering_infestation/stukov-s-creep-any@1` | 同一组消费者，以实际 Hungering Infestation 卡、独立稳定 ID／来源特征哈希绑定。 |

Universal Carrier 同时覆盖正 Supply 减少和已为 0 Supply 的感染敌军阵亡；同次损失／阵亡只产生一次机会。被动选择先于暂停的反应后继，不占反应额度，不扣卡牌资源。目标以最后在场底座测量 12 英寸，并遵守核心 10.1 的 LoS。HEAL 使用既有伤害恢复内核：只移除实际累积伤害，溢出丢弃，不返还模型或 SHIELDED。

Stukov’s Creep 每个 ID 编译成一条组合路由，不拆造重复定义。只有实际军表的卡产生能力；原生 Creep Spread 仍负责 token 设置、几何及来源绑定。位移由玩家选择坐标，规则查询只给证明；敌方 Move／Deploy／Run／Charge／Disengage 结束后，以 token 与单位的实际底座测量 1 英寸。友方行动和 PLACE 不属于这项移除触发。

新候选资产配置保留既有 Creep Tumor **28 mm、用户已确认**依据。扩展的装配参考仅在相关能力载荷与冻结 Wave3 来源逐项相同时重新绑定到 Wave4 数据哈希；未推断新增单位尺寸。炮塔 80 mm 继续仅作工程估算，整版正式准入保持关闭。

## 可复核证据

- [Universal Carrier 原生证明](evidence/universal-carrier.public.json)：4 分支、14 条签名动作，覆盖存活时减 Supply、0 Supply 阵亡、未感染和无范围内受体；实际恢复 1、丢弃 1，并完成 Infestation／Restoration 后继。全部幂等与冷重放通过。
- [Creep 原生证明](evidence/virus-creep.public.json)：3 个实际 Virus 卡房间、26 条签名动作；一个完整回合含任务计分、清理与下一回合先手，token 留场；三张卡分别通过敌方移动末移除和来源／精确测量回执。全部幂等与冷重放通过。
- [Creep 位移证明](evidence/virus-creep-displacement.public.json)：原生设置 → 交接 → 只读精确位移查询 → 玩家提供坐标的签名移动 → 位移后行动末移除。查询不写状态，完整 journal 冷重放通过。
- [Carrier Web](evidence/universal-carrier-web.public.json)：1 房、5 次显式确认动作，从签名原生损失前缀进入 HEAL／感染／Restoration 后继。
- [三张 Virus Web](evidence/virus-creep-web.public.json)：3 房、3 次实际表单设置，逐卡核对原生 token 的 STAY IN PLAY 与位移来源绑定。

[Harness 回执](evidence/virus-successors-harness.public.json)保留操作路径和失败回退条件。Web 使用两个独立浏览器席位、1500px 桌面与 390px 手机宽度；Preview 只读、显式确认、Apply、重放匹配、双席刷新与恢复票据重进均通过，页面错误为 0。沿用现有离线 Web 构建，无前端代码变化。5484 本地验收服务已关闭。

位移查询暴露了奇数毫英寸地形矩形的旧中心换算问题。本批改为复用模型几何内核的地形单元足迹转换，避免向整数坐标合同传入半毫英寸中心；实际候选地图的该地形已进入位移查询证明。工程回合仅在实际 Virus 路由和位移政策具备时开放共用只读查询入口。

```sh
node scripts/verify-wave4-universal-carrier.mjs
node scripts/verify-wave4-virus-creep.mjs
node scripts/verify-wave4-virus-creep-displacement.mjs
```

Web 运行方式沿用 `serve-wave4-virus-web.mjs`／`verify-wave4-virus-web.mjs`，附加 `coordination/wave4/universal-carrier-web-cases.json` 或 `virus-creep-web-cases.json`。原生 Creep 验证器可传入保存的 run 目录，仅在当前代码完整重放匹配 checkpoint 后保留已通过分支。

尚待：Stukov、Infested Marine／Trooper 与其他新增单位／势力的完整行为、剩余语义合同、整版发布／Builder／大厅／媒体及 500／2000 分 Web 双席。[长任务清单](../../../coordination/wave4/implementation-plan.json)保持进行中。付费模型、K3、AI 对局、复盘和生产发布继续暂停；本批零模型调用，`trainingTruth: false`。
