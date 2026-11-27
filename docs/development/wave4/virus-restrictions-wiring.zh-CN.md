# W4-02：Virus 反应与放置限制

本批接入 Growing Infestation 与 Fetid Touch，新增游戏原子 2 个，累计 **5/18**。按 Wave3 的更新流程继续完成 Wave4 人人对战；这份报告只登记两项状态合同及其实际消费者，整版更新保持进行中。

| 稳定定义 ID | 新增原子 | 实际消费者 |
| --- | --- | --- |
| `card:hungering_infestation/growing-infestation-any@1` | `rule-atom:wave4/infestation-reaction-lock@1` | 特性来源编译器 → `projectOfficialInfestationRestrictionsV1` → `allowsOfficialInfestationReactionV1` → Reaction Family 合法域／复验；玩家 `unit_restrictions` 查询同源。 |
| `card:weighted_pustule/fetid-touch-any@1` | `rule-atom:wave4/infestation-placement-reserve-lock@1` | 同源特性路由 → Unit Restrictions、Relocation 的 PLACE 合法域、生命周期回收及 token／单位锚点 set 终点、回合末 set 选择；玩家查询同源。 |

编译器逐字核对冻结来源、稳定 ID、卡牌种类、Passive 与 Any Phase。运行时验证来源束和路由哈希，仅实际编入军表的 Virus 卡对其敌方感染单位生效。被动效果不因卡牌资源耗尽而停止。没有复制一套行动执行器。

Growing Infestation 按卡牌控制方判断 Enemy Reaction；感染单位作为反应施放者或实际受体都受限制，卡牌控制方自身的反应不因敌人感染而一并禁止。Restoration 保留明确例外，包括施放 Restoration 的 Medic 自己已感染的情形。

Fetid Touch 禁止相应 PLACE／set／返回后备，普通合法移动仍可执行。Strategic Recall、Omega Network 与生命周期回收读共用限制。群体 Mass Recall 排除受限单位，仍结算其他合法单位；不会因一个受限单位令整次召回失败。

## 原生与玩家查询

[六个原生分支](evidence/virus-restrictions.public.json)共 19 条签名动作：感染 Stalker 普通 Move；未感染 Stalker 的 Blink、Strategic Recall；感染目标禁止 Infantry Armor；未感染目标实际使用 Infantry Armor／TOUGH 并完成射击；感染的 Medic 仍以 Restoration 清除新转移的感染。

[混合受体 Mass Recall](evidence/virus-mass-recall.public.json)另有 1 条签名动作：感染 Stalker 留场，合法的 Zealot 单位返回后备。两侧军表均经过实际 Builder 校验；声明位置按真实底座通过连贯校验。

合计 **7 分支、20 动作**，全部幂等及冷重放通过。[当前代码复验](evidence/virus-audit.public.json)再次用完整 journal 匹配保存状态，运行时哈希一致，并通过只读玩家限制查询核对来源、被限制的控制方及 Restoration 例外。旧 Auto-Turret 另以 [4 条签名动作](evidence/overwatch-compat.public.json)完成攻击和冷重放，原 0 CP 支付未变。

## Web 双席

[四个 Web 房间](evidence/virus-web.public.json)实际完成 **7 条真人确认动作**：移动、Blink、召回，以及 Infestation 转移到 Restoration 后继。前三个房间从通过原生门的冻结初始权威状态开始；第四个从已签名的原生感染触发前缀开始。

桌面与 390px 手机宽度使用独立席位。移动路径、领队模型、Blink 站位／支付卡和感染目标均通过现有玩家表单选择；Preview 只读、显式确认、Apply、重放、双席刷新与新恢复票据重进均通过，页面错误为 0。[移动端 Blink 表单](evidence/virus-blink-mobile.png)来自该次运行。静态界面复用前批离线 Web 构建，未新增模型或生产发布。[Harness 回执](evidence/virus-harness.public.json)保留操作路径与回退条件。

## 复核与剩余范围

```sh
node scripts/verify-wave4-virus-restrictions.mjs
node scripts/verify-wave4-virus-restrictions.mjs --mass-only
node scripts/verify-wave4-virus-proof.mjs
node scripts/verify-wave4-turret-combat.mjs --legacy-control
```

Web 使用 `serve-wave4-virus-web.mjs <virus-restrictions.public.json> <build/wave4-web/...新目录> <离线Web目录>` 启动 5484，然后执行 `verify-wave4-virus-web.mjs <同一目录>`。验收后关闭服务。成功的单房 Web 断点会保存，诊断重试不重做已通过房间。

所有棋位的初始感染／位置均明确为条件，不冒充先前完整对局。涉及炮塔触发的场景继续使用 80 mm 工程估算；普通 Stalker／Zealot 操作使用既有底座事实。SET 终点拦截及回合末菜单已接，Adept／Ravager 的完整 round-end 混合对局仍需对应组合验收；其他反应所有者也在整版接线账逐项登记。

Universal Carrier 的感染损失→HEAL、三张 Virus 卡 Stukov’s Creep，以及后续新单位／势力尚待。39 条来源阻断保持隔离。整版发布选择、Builder／大厅、媒体和 500／2000 分 Web 双席为后续验收出口，见[长任务清单](../../../coordination/wave4/implementation-plan.json)。所有暂停项保持，零模型调用，`trainingTruth: false`。
