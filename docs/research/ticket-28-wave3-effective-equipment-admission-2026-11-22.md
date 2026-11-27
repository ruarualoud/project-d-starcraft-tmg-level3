# Ticket 28 · W3-10／11 · 按起始装备进行准入

## 根因和实现

旧准入把默认卡面武器和已购买升级都纳入分母，无法表达逐模型换装。新版查阅组表和披露共用的权威装备结果。可辨认的物理武器按购买档或默认装备来源 ID 核对，仍有任何一枚模型持有即保留。无对应物理装备身份的效果沿原定义处理。非武器职责、卡牌和战场生成物仍按自己的规则装配。

Match v2.4 使用这份结果创建与核对原生动作。测试又复现了原生近战登记之前依赖 Roachling 路线的问题。新版传递完整的有效近战清单。另修复参数化准备入口的拒绝分支丢失 context，使用原主军表的正式准入直接验证缺件报告。

## 结果

| 实际工厂军表 | 验收结果 |
|---|---|
| 全队 Bayonet | 六枚 Marine 的近战武器均为 Bayonet，覆盖不列 Strike。 |
| 两队混合 | 一队 Bayonet、另一队保留 Strike。Strike 归属只包含原装队。 |
| 单模型 AGG-12 | 一枚更换，另外五枚保留 C-14，武器双方均登记。 |
| 原装 Marine | Strike 与 C-14 都在，Bayonet 和 AGG-12 不在。 |

混合军表在隔离签名房间完成选择先手和原生 Fight 合法菜单、预览。Bayonet 队只得到 Bayonet，RoA 2，预览 4 颗攻击骰。Strike 队只得到 Strike，RoA 1，预览 2 颗。两道预览均通过且未改变权威状态。该快照使用规则器校验的声明接敌摆位，战斗结算未执行。

主 Standard 军表的旧 117 条配置义务变化为 115 条实际装备口径的义务。完全被替换的两条是 Marine Strike 与 Goliath Hellfire Missiles，后者在两台 Goliath 的权威投影里被 Haywire／Scatter 取代。新准入 101/115，14 项仍待接，亦即从分母移除了一个已接武器与一个原本列缺的武器，没有减少已实现执行器。

对原 Fire v2.3 和 Skirmish v2.2 的签名清单执行只读重建，两份运行时描述符及 hash 逐字段一致。历史回执复用已有证据。模型调用零。Wave3 整体 2/16。

- [实际军表配置、主军表准入、原生菜单与旧绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-blink-release-equipment-assembly.public.json)
- [两条武器义务逐模型差分](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-blink-release-equipment-obligation-diff.public.json)
- [近战合法菜单与预览](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-standard-blink-release-equipment-room-preview.public.json)

源码包括 [official-selected-roster-ability-coverage-v2.mjs](../../packages/product-composition/official-selected-roster-ability-coverage-v2.mjs)、[official-release-room-ability-admission-v2.mjs](../../packages/product-composition/official-release-room-ability-admission-v2.mjs)、[official-release-room-native-actions-v2.mjs](../../packages/product-composition/official-release-room-native-actions-v2.mjs)、[official-current-product-match-runtime-v1.mjs](../../packages/product-composition/official-current-product-match-runtime-v1.mjs)。
