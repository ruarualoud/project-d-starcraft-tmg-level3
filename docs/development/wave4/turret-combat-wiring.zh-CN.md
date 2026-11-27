# W4-02：Firefly、Infestation 与 Ocular Overwatch

炮塔及 Hostile Incubation 的七条定义现已完成显式执行绑定。本批新增游戏原子 **0 个，累计仍为 3/18**：Firefly 复用数值射击合同，两个反应是已有合同的新组合。已通过七个原生分支、两个完整原生回合，以及三个 Web 后继流程。所有空间结论仍以炮塔 **80 mm 工程估算**为条件，未取得正式物理尺寸或整版 Wave4 准入。

## 来源解析

只读核对[官方 Command Center 的炮塔记录](https://firestore.googleapis.com/v1/projects/starcrafttmgbeta/databases/starcrafttmgbeta/documents/army_units/infested_missile_turret)，三个特性的描述与冻结原件一致，Firefly 仍写作 `SURGE: Light. Armoured (D3)`。[审阅记录](../../../content/source-releases/wave4-20261127/review/firefly-syntax.json)保留了 URL、观察时间、原始响应字节哈希和本次解释。

`readOfficialReviewedFireflySurgeSyntaxV1` 只对已登记记录哈希、载荷哈希、武器名、阶段及精确字段值，显式将句点读为两个既有 Surge 目标标签的分隔符。通用解析器仍不接受任意句点；源文本及其哈希不改写。适配审阅进入武器 profile 的哈希。它是工程适配决定，**没有宣称官方发布了逗号勘误**。

结果为 RANGE 14"、TARGET Flying、RoA 8、HIT 4+、DMG 1、Surge 对 Light／Armoured 使用 D3、ANTI-EVADE (1)。来源改变或套用其他记录时，特例不再生效；持久来源门还验证了 7 项来源／字段边界。

## 逐 ID 与实际消费者

单位 ID 前缀均为 `unit:infested_missile_turret/`，完整 ID 与导出函数见[执行账](../../../coordination/wave4/ability-wiring-progress.json)。

| ID | 分类与新增原子数 | 实际消费者及已验证范围 |
| --- | --- | --- |
| `card:stukov_s_forces/hostile-incubation-any@1` | 新增语义，沿用前批 1 原子 | 生命周期 SET 工厂与共享回合锁。原生完整回合中实际设置，R1 禁用、R2 解锁，保留 Structure；没有 SUMMON 语义。 |
| `detection-any-phase@1` | 已有原子新组合，0 | 特性投影与 HIDDEN 移除消费者使用来源 8"；沿用前批范围查询证据。 |
| `source-of-creep-any-phase@1` | 已有原子，0 | Battlefield Asset 来源束与 `isOfficialCurrentProductUnitOnCreepV1`，复用 6" 光环及共享禁用检查。 |
| `structure-any-phase@1` | 已有原子，0 | Structure 来源／Adapter 保留 Supply 0、不可激活／普通行动、不可控点／争夺及能力目标限制。 |
| `firefly-missiles-assault-phase@1` | 武器数据变化，0 | 精确语法适配 → AttackProfile V3 → Ranged 来源束 → 共用射击、护甲、伤害、伤亡后继；新菜单显示武器名。 |
| `infestation-any-phase@1` | 已有合同新组合，0 | `createOfficialInfestationTransferRuntimeV1` 观察原生 Supply ledger 与阵亡前后状态；facts 模块保存原位置、测量 8"；Reaction Family 负责玩家目标、0 BM、限次和优先权；应用 INFESTATION 后可进入 Restoration 窗口，再恢复原所有权。 |
| `ocular-overwatch-assault-phase@1` | 已有合同新组合，0 | Reaction Family 绑定 Flying／14"／0 BM；共享 Overwatch grant、数值射击和后继所有者消费实际 Firefly profile。攻击结束后恢复原席位和激活标记。 |

Infestation 没有把原“友军 Supply 损失”的条件套给敌方事件。实际绑定复用的是 ledger、阵亡比较、完整底座 Within、反应支付／优先权及 DEBUFF 合同。单位从正 Supply 降到 0 时，以新 ledger 条目为证；已是 0 Supply 的单位阵亡时也触发，不能只等待新的 Supply delta。两者均使用事件前最后的在场底座位置，目标必须是另一个合法敌方单位。未加入来源没有规定的额外回合到期。

Ocular 继续受共享设置回合锁、反应限次和阶段限制约束。Structure 的射击例外只能由已解析反应签发的精确 grant 授予，不能开放普通攻击、任意目标或其他武器。旧 Auto-Turret 的 Gauss Cannon／0 CP 对照也经过原生攻击、幂等与冷重放；旧来源保持原支付类型。

## 原生分支与完整回合

[七分支验收](evidence/turret-combat.public.json)有 **28 条签名动作**，每房均验证幂等和冷重放：

- Ocular 使用并完成 Firefly 射击、拒绝使用、设置回合中不提供该反应。
- 一个仍存活的感染 Marine 单位因原生伤亡由 Supply 1 降到 0，成功转移感染。
- 一个已是 Supply 0 的感染单位原生阵亡，仍能转移；也可拒绝转移。
- 转移被当作 DEBUFF，Medic 的 Restoration 实际支付 1 CP 并移除它；窗口关闭后回到原行动所有权。

初始位置、炮塔此前的设置和两个感染／受伤单位条件均明确登记为工程条件，不冒充此前完整对局。源种族、武器、HP、底座和模型数均来自工厂；声明伤亡后的 Marine Supply 按来源档位保留。

[实际 Firefly 攻击](evidence/firefly-attack.public.json)掷出 8 颗攻击骰、4 命中，D3 Surge 为 3，绕过 3 颗护甲，剩余 1 颗护甲骰，造成 4 点伤害。ANTI-EVADE 的修正已进入武器合同；该 Raven 场景没有闪避资格，因此没有宣称本次实际应用了闪避修正。

[完整回合验收](evidence/turret-round.public.json)共 **41 条签名动作**：从同源任务开局开始，原生设置炮塔，经过两轮 Movement／Assault／Combat、任务控点、计分、回合结束、清理和先手，停在第 3 回合开始。R1 禁用、R2 解锁及 Ocular 攻击完成均由实际后继验证。没有在测试中手改阶段或回合号。

工程入口复用现有 Match Runtime 的阶段、任务及清理所有者；仅显式注入已绑定的组件，不调用正式房间工厂来绕过估算准入。激活结束引出反应时，只给相应原单位派发生命周期通知，反应及射击仍由原生选择继续。控点查询使用该房间真实 match binding。已有签名检查点用于续验，最终完整 journal 冷重放与当前 envelope 精确一致。

本入口登记焦点定义 7／原始分母 556，其余 549 不凭该入口宣布覆盖；这不是还需新增开发 549 条规则的计数。完整军表的其他能力、两种 Overwatch 来源同时注册的组合和正式开局，仍属于后续整版准入。

## Web 验收

[三个 Web 房间](evidence/turret-web.public.json)从已验证原生 journal 的真实前缀创建，完成 **10 条 Web 签名动作**：Ocular → Firefly、感染转移后保留状态、感染转移后 Restoration。桌面与 390px 浏览器使用独立双席，通过真实行动表单、显式目标选择、密封 Preview、真人确认、Apply 和重放。Preview 不改状态，对方不能代选，另一席刷新到相同 revision，使用新的一次性恢复票据重进后状态不变；页面错误为 0。

菜单现在显示武器名，便于选择 Firefly；裸参数域缺少 `sourceDomain` 时也能安全显示。展示模块已有七项兼容测试。静态 Web 仅在 `build/wave4-web/turret-combat` 离线导出，[构建回执](evidence/turret-web-build.public.json)保留字节哈希；没有覆盖 Wave3 构建或发布生产。Web 门是这些原生前缀之后的流程，**不是 Web 从大厅建军并点完两个回合的验收**。

桌面 Firefly 目标表单与移动端 Restoration 画面分别保留在[桌面截图](evidence/turret-firefly-desktop.png)、[移动端截图](evidence/turret-restoration-mobile.png)；操作链、证据引用和回退条件见[Harness 回执](evidence/turret-harness.public.json)。

## 复核与边界

```sh
node scripts/verify-wave4-hostile-incubation.mjs
node scripts/verify-wave4-turret-combat.mjs
node scripts/verify-wave4-turret-combat.mjs --legacy-control
node scripts/verify-wave4-turret-round.mjs
node scripts/verify-wave4-stukov-army.mjs
node scripts/verify-wave4-stukov-boundaries.mjs
node scripts/verify-wave4-ability-diff.mjs
```

Web 使用 `serve-wave4-turret-web.mjs <turret-combat.public.json> <build/wave4-web/...新目录> <离线Web构建目录>` 启动 5484，再运行 `verify-wave4-turret-web.mjs <同一新目录>`。新目录保证从未推进的前缀开始；失败诊断目录保留。测试结束后关闭 5484。

102／119 建军资料范围及 39 条来源阻断保持；原始输入、分母、来源审阅和暂停状态不因本门变更。炮塔 80 mm（60–100 mm）仍仅工程估算，Raven 沿用已有 100 mm 装配图估算轮廓；没有新实测。普通候选仍拒绝未确认的炮塔底座，正式 Standard／Skirmish 工厂继续拒绝估算几何。

Stukov／Infested Marine／Infested Trooper 的完整行为与几何、其余 15 个新增合同、完整发布选择、正式 Builder／大厅与全军表 Web 仍待。Wave3 玩家房／5483 未操作；付费模型、K3、AI 对局、复盘与生产发布继续暂停。所有证据 `trainingTruth: false`，零模型调用。
