# Ticket 28 · W3-10／11 · 旧能力继承与 Ventral Sacs 根因核查

## 结论

本次查到三个不同层次的工程问题。实际房间使用了选定的 Wave3 冻结数据和合法军表。Standard 与 Skirmish 的新版准入共用手工登记表，旧定义的来源别名证明身份，却不会自动带入执行器及后继。旧权威目录逐项对账的 27 条定义均登记为 executable_exact。这个标记只能证明旧执行器登记，具体行为仍以消费和房间回执为准。

Ventral Sacs 旧版既有信标生产器和通用回合末预备队消费者。旧消费者用领队模型中心与标记坐标重合判断接触，也未在该分支显式调用通用部署人口池和敌方影响区校验。新版把标记作为冻结电子规则中的无实体点，以底盘边缘接触。在新版分支复用现有完整模型摆放、连续性、敌方影响区及 Supply 规则，不把点当成设定了直径的实体，也不额外赠送一次 Move。

此次已有真实签名证据：r3 对完整底盘恰好 10 英寸的放置被拒，合法点放置信标并耗尽 Overlord。r16 通过回合计分和结束触发，生成属于 player2 的部署机会。r16 的负向预览拒绝领队中心盖住信标。合法摆法的预览在 Match 的试算 Apply 处被拦。尚未正式提交预备队，弃用、Cleanup、完整冷重放仍待验。

## 四次同一停点的发现

| 次序 | 观察 | 原因与源修复 |
|---|---|---|
| 1 | `ABILITY_EFFECT_RUNTIME_EXCLUDED_ADAPTER_INVALID` | 共用 Match 将旧版专用执行器列表直接当作当前注册表。限定为当前实际注册的交集。 |
| 2 | `CURRENT_PRODUCT_MATCH_PENDING_ABILITY_DIAGNOSTIC` | 回合末读取整组来源诊断，军表未选的共享定义触发误阻断。按当前真实机会的来源过滤，保留活跃机会缺消费者的拒绝。 |
| 3 | `CURRENT_PRODUCT_MATCH_ROUND_END_CHOICE_UNAVAILABLE` | 正确部署域已公开，Match 试算只读取旧 `unitLifecyclePlan.domainId`。Ventral Sacs 的计划实际在 `battlefieldAssetPlan`。按新版冻结定义读取这个字段，并继续匹配当前合法域。 |
| 4 | `releaseMatchVersion is not defined` | 我写的补验修复引用了外层工厂局部变量。已改用当前 Match 的 `input.releaseMatchVersion`。该修正仍待定点验收，原房停 r16。 |

更早的夹具错误是将系统管理的 Cleanup 步骤当作当前 active seat，已用 firstPlayerSideKey 越过。它与上表的 Match 生产问题分开计。按既有三轮及一次定点补验边界，未再提交 r16。

## 同类影响

| 能力或边界 | 已核定事实和待查范围 |
|---|---|
| 两种规模及其他军表 | 两套工厂共用新版准入。已审计的 27 条涉及位置／时序、状态、资产、反应、近战、召唤和阵营能力。主 Standard 现在登记 114/115，Hydralisk Lunge 是这份军表唯一未登记项。数字仅是该军表的登记覆盖。 |
| Ready For Dust-off | 旧版与 Ventral Sacs 共用信标生产和部署前置。走旧消费者时共享中心重合约束和缺少专用 Supply 校验的分支。此次只接入冻结的 Overlord 定义。该卡后续按自身来源和部署规则验收。 |
| Adept Shade | 同属回合末机会，旧路线进入 Unit Lifecycle，但使用独立 `shade_round_end_place`、实体 Shade 和队形规则。Ventral 的接触问题不能直接归因给 Shade。新版含 Shade 的正式军表仍须走实际回合末选择和后继。 |
| Lunge | 旧反应组件有 10 英寸、被射击友军和后续 Move 的登记与回执结构。已检查的正式远程动作路径未找到该结算后触发的生产者。旧组件报告用 Dae’Uhl 举证，未提供 Lunge 实际从射击结算走到最短合法 Move 的证据。需对接真实远程后继和规则 §4.5 的位移约束。 |
| 其他特殊进场与资产 | Omega Worm、Pylon Warp-In、Rapid Ingress 等有自己的动作系列。先查已确认的 Omega 旧建筑距离、Roachling 生成后覆盖与联动。Ventral 的签名场景未含敌方菌毯。源码显示 Creep Removal 的标准调用在空间动作入口，Ventral 回合末 Deploy 组合还需检验移除事件。 |
| 军表统计 | Marine 的默认 C-14 射击具备原能力。先前被列入待接的是已被整队 Bayonet 替换的 Strike。两台 Goliath 的默认 Hellfire 也已被选装替换。两项从该军表的有效分母移除，其他军表保留原武器时仍计入。 |

验收保留两层证据。开房对账需核对实际装备对应的定义与消费者，生成物和延迟能力需跟到产生、合法菜单、试算、应用、后继和冷恢复。此次使用真实 Room 的签名工程场景，未开启完整 Web/App 对局。v2.9 的描述符重建与已绑定版本一致；历史房间未复跑。

## 证据

- [旧目录逐条对账](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-hydralisk-inherited-binding-audit.public.json)及[旧能力迁移范围](ticket-28-wave3-inherited-ability-admission-audit-2026-11-22.md)。
- [旧信标消费者报告](../ticket-23-slice-238-current-product-unit-lifecycle-family-closure-2026-09-14.md)、[旧反应组件证明](../ticket-23-slice-236-current-product-reaction-family-closure-2026-09-14.md)和[实际装备准入](ticket-28-wave3-effective-equipment-admission-2026-11-22.md)。
- [新候选准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-ventral-sacs-admission.public.json)、[r3 信标](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-ventral-sacs-marker.public.json)和[四次停点摘要](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-ventral-sacs-round-end-audit.public.json)。
- [Match 动作消费](../../packages/product-composition/official-current-product-match-runtime-v1.mjs)、[旧生命周期消费者](../../packages/product-composition/official-unit-lifecycle-family-adapter-v1.mjs)和[新版信标来源](../../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs)。

Ticket 28 整体 2/16。W3-10、11 仍在进行中。本次各路径模型调用为 0。
