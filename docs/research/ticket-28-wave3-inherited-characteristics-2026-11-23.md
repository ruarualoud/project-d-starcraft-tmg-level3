# Ticket 28 · W3-10／11 · 旧能力接线根因和行为验证

## 缺口是怎么产生的

旧产品装配器按执行族装配冻结规则目录。Wave3 为保持版本隔离、同一发布的来源校验和旧存档恢复，建立了显式候选装配。它通过来源别名确认旧定义能否继承，再由各个执行族从单独的清单选出实际要登记的消费者。旧定义身份已迁移，执行归属尚未随身份迁移。开房门禁发现缺失后按预期阻止启动。Standard 与 Skirmish 共用该装配器，换测试入口或修改军表参数不会补登记。

旧目录的对账匹配了当时跨两种规模的 27 个唯一待接定义，全部已有精确执行归属。它证明旧发布已登记，不能证明旧版每条行为都正确。此前产品级迁移验证按单一军表和组件收口，缺少发布范围内对旧归属及其消费入口的对账。这是开发整合遗漏。当前查到的问题分三类。

| 类别 | 已查到的影响 |
|---|---|
| 迁移漏接 | 三张位移卡此前因同样的显式选择漏接，已补。v2.6 增量继承 Field Repair、Ancillary Carapace、Raptor Adrenal Overload，以及 Raptor、Swarmling 的 Metabolic Boost。Ancillary Carapace 还需在新房间启用既有护甲掷骰历史，否则无法区分首掷与后续掷骰。 |
| 旧执行缺陷 | Omega Network 旧落点过滤曾跳过敌方 Structure。Roachling 旧专用分支绕过部分通用 SUMMON 校验，且生成后缺正式联动识别的来源字段。两处有旧路径证据，不与迁移遗漏合计。 |
| 分母与验收范围 | Marine Strike 与 Goliath Hellfire Missiles 在主样例全被换装时仍曾列入义务，现按实际模型装备核算。开局军表统计仍须另外追踪生成物，例如 Omega Worm 的入口与检测。单份 115 条清单只覆盖该样例。 |

[旧目录对账与旧问题证据](ticket-28-wave3-inherited-ability-admission-audit-2026-11-22.md) · [装备分母反例](ticket-28-wave3-effective-equipment-admission-2026-11-22.md)

## 主 Standard 样例仍缺的五条

| 条目 | 原归属与新版后继验收 |
|---|---|
| Hydralisk · Lunge | 旧反应执行族。验证友军被射击后，攻击结算结束时才出现反应，以及合法向攻击者移动。补齐后才能在同一完整 Hydra 军表验证护甲首掷。 |
| Vile · Debilitating Saliva | 同一反应执行族，触发点为射击声明。验证 Debuff Hit 实际进入射击池及有效期。 |
| Swarmling · Zergling Reconstitution | 旧单位生命周期执行族。有通用 RESPAWN 分支，新编译器的同类定向接线仅覆盖 Vileling，不能把该单位的合法输入照搬到 Swarmling。验证 2／3 个、菌毯及合法摆位，再核 Swarmling 的 Metabolic Boost 实际激活。 |
| Overlord · Ventral Sacs | 旧战场资产执行族。验证临时预备队入口、原生部署与回合结束失效。 |
| Supply Depot · Additional Supply Depots | 旧人族专属执行族。验证主动能力及记分／争夺／任务中生效的 Supply +1，和回合结束失效。 |

## v2.6 本次行为证据

- Field Repair 在隔离签名 Room r2 将 Goliath 伤害标记 2→0、生命 8→10，Factory 耗尽，生物单位不在合法菜单中，普通 Move 仍合法。首次验收请求漏传 `activeUnitId`，产品正确拒绝。补齐参数后从原 r1 继续。
- Raptor 两项能力各实际支付 1 BM。签名房 r4 的 Charge 从 1 骰变为 2 骰取大，原生掷出 5、4，采用 5。当前冲锋待办保留 Impact 命中修正 +1，实际接敌与 Impact 结算留在后继边界。
- Ancillary Carapace 已启用同一护甲序号规则。权威逻辑检查首掷 TOUGH 1、空骰池不消耗、同激活第二次 0、下一攻击者激活恢复 1。尚未在完整 Hydralisk 军表提交真实攻击。
- SQLite 冷开后走正式回放 API，维修两条和冲锋四条签名回执与各自当前房间一致。回放夹具曾错误读取日志字段，最终使用产品回放接口。旧 v2.5 装配描述符和哈希精确重建。零模型调用。

主 Standard 105/115→110/115，五条待接。隔离 Standard 军表 27/27，满足该隔离房的原生动作接线。完整正式 Match 仍待验。整体 2/16，剩 14 项，即 02、03、05–16。

## 防止再次漏接

按冻结定义身份把旧发布的执行归属与新版实际消费对象逐项对账，记录每一项是继承、新语义、换装后取消义务，还是明确待接。准入继续拒绝未归入的有效定义。正式产品验收并行核对主动动作、反应的父事件、自动结算和生成物后继，每类保留签名与冷恢复证据。该全发布对账尚待实现，本次对账覆盖主样例和已有旧目录证据。

- [开局覆盖](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-characteristics-opening.public.json)
- [维修实际提交](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-characteristics-repair.public.json)
- [冲锋实际提交](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-characteristics-charge.public.json)
- [护甲与旧绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-characteristics-armour-projection-and-legacy.public.json)
- [正式冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-characteristics-cold-replay.public.json)
- [主军表剩余定义](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-characteristics-main-standard.public.json)
