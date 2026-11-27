# Stukov：Bio-Kill Switch 与武器/冲锋

本批补齐 Stukov 四条来源的实际接线，新增完整游戏原子 **0**，累计仍 **6/18**。Bio-Kill Switch 复用直接伤害、伤亡选择、反应减伤、INFESTATION 清除与 Detonation 中断；两把武器为数据变化，Devastating Charge 复用既有 IMPACT。Stukov 当前8/9条定义有具名原生证据，Corrode Armor 继续接线；整版人人对战尚未完成。

| 来源 ID | 差分分类 | 实际消费者 |
|---|---|---|
| `unit:stukov/bio-kill-switch-assault-phase@1` | 已有原子新组合 | Characteristic Family 的 0 BM Active、全场感染敌军快照、共用 direct damage 批次、Detonation 封存/恢复、全部后继结束后的状态清除 |
| `unit:stukov/corrosive-blast-assault-phase@1` | 数据变化 | AttackProfile V2 → Ranged Weapon Component → Native 攻击/Surge/防御/伤亡 |
| `unit:stukov/infested-arm-combat-phase@1` | 数据变化 | Melee Weapon Component → Native 近战/Surge/防御/伤亡 |
| `unit:stukov/devastating-charge-assault-phase@1` | 原子复用 | Melee Modifier Component → 成功冲锋 → 每模型6颗 IMPACT，4+、伤害1 |

官方冻结原文明确：Bio-Kill Switch 使**在场、带 INFESTATION 的每个敌军单位受到 Damage(2)**，然后移除**实际受伤单位**的 INFESTATION。它不选择目标、不要求距离或视线，不伤友军、后备或未感染单位。先前工作台把它排入直接移除类的描述已据此修正。

Root 运行时3.229.0、HITS3.10.0仅在选择新来源时启用。直接伤害原批次从封存恢复时跳过再次发动能力的入口；即使反向 Detonation 消灭 Stukov，原伤害批次仍只完成一次。状态清除等待伤亡、反应与其他已拥有后继，不用施法者存活作为恢复条件。

| 原生分支 | 签名动作 | 结果 |
|---|---:|---|
| 没有在场感染敌军 | 1 | 0 BM 支付，空受影响集合，能力正常结束 |
| Bio-Kill Switch，拒绝 Detonation | 4 | 完成6模型的伤亡选择和感染清除 |
| Bio-Kill Switch，反向 Detonation | 6 | Stukov实际阵亡，原能力伤害和清除仍仅一次 |
| 远处且 Hidden 的感染敌军 | 4 | 超出普通目标距离仍受伤；友军与后备继续排除 |
| Queen Transfusion | 3 | 总伤害2被全部减免，单位无伤亡、标记0、感染保留 |
| Corrosive Blast 对 Light | 4 | 3骰、伤害1、Light SURGE实际结算 |
| Corrosive Blast 对 Armoured | 1 | Armoured SURGE实际结算 |
| Infested Arm 对 Armoured | 3 | 3骰、3+、伤害2、SURGE实际掷骰 |
| Devastating Charge | 8 | 实际冲锋→6骰IMPACT→伤亡前窗口→恢复 |

合计9分支34次签名动作，均核对幂等重提与关闭/重开后的完整冷重放。友军感染、后备感染和未感染敌军对照保持；减免分支使用合法 Queen/Hatchery 建军组合。另9项只读边界覆盖文本、0 BM费用、激活类型、阶段、记录与购买费用漂移拒绝，以及全场受影响集合。上述初始站位、状态与伤害标记为具名工程条件，底座仍是已登记估算，不计正式物理准入。

Web 一房从初始签名状态操作 Bio-Kill Switch，实际选择6个伤亡模型、逐席接受/拒绝 Detonation 并完成 HITS，共6次真人确认。1500/390宽两独立浏览器、只读预览、刷新、席位恢复及重放一致，无页面错误；5484已关闭。仅复验本次能力与后继，未计大厅整军表流程，也未声称两把武器已各做Web新分支。

另冷重放既有政策v1远程房6动作和政策v2近战/HITS嵌套房13动作，当前描述符和Envelope完全一致。未引入新付费模型调用。

复验脚本：`verify-wave4-bio-kill-switch.mjs`、其 `--reduction-only` 模式、`verify-wave4-stukov-combat.mjs`、`verify-wave4-bio-compat.mjs`。实际消费者与证据索引见 `evidence/stukov-combat-consumers.public.json`。

接下来补 Corrode Armor 的攻击后反应、实际 Armour 后继与清除；继续 Detonation 的委托/激活外和直接移除入口，再推进其他新单位、整版发布/Builder/大厅/媒体及500/2000分Web双席。39条来源阻断继续隔离，所有估算与暂停项保持，模型调用0。
