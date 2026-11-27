# T28-W3-09 / M08　Reactive Creep 正式房间

2.49 的严格工厂拒绝该卡的三条冻结定义。组件已能结算菌毯上的 DODGE (1)、菌毯瘤持续及位移、敌方指定移动后的移除。当前正式军表组合未选入这三条，且原组件场景把 Bombard 的移除策略当成所有军表的前提。

2.50 只在实际选择该卡的军表上绑定这些定义。按生产者分别检查 Hatchery、Overlord、Queen 与 Bombard 的真实消费者；没有发射体的军表可正常使用其他来源。验证同军表逐项来源、原候选拒绝、带及不带发射体的正式开房，再用正式席位验证攻防／标记的行动后继与冷恢复。

## 正式军表准入

同一份57定义军表，虫族正式准入36→39/40；Reactive Creep 三条已登记，严格工厂仅拒绝 Defiler 的 Plague。 新旧 57 条所选定义集合相同，40 条虫族定义逐项核对了来源散列。开房仍按预期对唯一未接入的 Plague 返回带该定义 ID 的拒绝。

[逐条对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v250/coverage.json) · [严格工厂结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v250/factory.json)

## 两份军表实际开房

双方法定军表均由标准开房工厂进入第一回合。两支扎加拉军均选同一 Reactive Creep 与 Hatchery，卡文来源和三条定义散列一致；带 Bile Launcher 的房间还登记 Bombard 的移除流程，另一房依靠实际的 Hatchery 生产标记。 [两份开房来源与绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-reactive-creep-v250/admitted-openings.json)

## 从攻防记录怎样判断闪避

正式房间使用人族 Spec Ops Marauder 的 Quad K12 和 Strike 攻击同一只 Defiler。对照只移动 Bile Launcher 光环源，记录实际攻击事件里的 DODGE 和转池骰数。菌毯内这次 Quad K12 实射登记 DODGE (1)，原有待转骰数为 0，实际减骰为 0。之前组件的正向案例仍可核对：Bile Bomb 转池 1→0、Blades 转池 2→1、模板攻击 1→0。

[正式房间实射](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-reactive-creep-v250/shoot-on/result.json) · [Bile Bomb](../../build/ticket-28-zerg-wave3-20261118-v1/reactive-tissue/ranged/result.json) · [Blades](../../build/ticket-28-zerg-wave3-20261118-v1/reactive-tissue/melee/result.json) · [模板](../../build/ticket-28-zerg-wave3-20261118-v1/reactive-tissue/template/result.json)

## 五个双人工场景的实际后继与恢复

Hatchery 放置菌毯瘤后，敌方 Nova 移至距其底盘 0.8 英寸处，移动结算移除标记；友方 Defiler 随即失去该菌毯效果。射击与近战分别验证菌毯内 DODGE (1)、菌毯外 DODGE (0)。两次菌毯内攻击均无待转移伤害骰，因此这两次没有产生实际减伤。五个场景分别恢复 5、1、1、6、6 条正式回执，与原状态逐项一致。

[tumor](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-reactive-creep-v250/tumor/result.json) · [shoot-on](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-reactive-creep-v250/shoot-on/result.json) · [shoot-off](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-reactive-creep-v250/shoot-off/result.json) · [fight-on](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-reactive-creep-v250/fight-on/result.json) · [fight-off](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-reactive-creep-v250/fight-off/result.json)
