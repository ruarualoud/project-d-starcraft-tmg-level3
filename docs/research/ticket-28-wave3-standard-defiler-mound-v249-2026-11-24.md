# T28-W3-09 / M08　Defiler Mound 正式军表

2.48 的同一份合法军表有 57 条所选定义，正式工厂明确拒绝其中六条，包含这张卡的两条定义。组件已有返回预备队和非致命伤害的实现。2.49 需要按购买卡牌和签名来源启用两者，并使任务房间等待突击末结算。

验收先核对每条所选定义的来源和变化，再用双席正式房间从同一初态分别使用卡的两种能力。检查卡耗尽、可用对象、伤害条件、移入预备队后的棋位与后续动作，并在冷恢复时核对房间。旧候选的准入及回放独立保留。

## 同一军表的准入结果

2.48 与 2.49 选中同一组 57 条定义，逐条来源散列一致。仅这两条的注册状态发生变化，Wave3 虫族正式准入 34→36/40。完整军表仍因 Reactive Creep 的三条定义和 Defiler 的 Plague 被拒。

[逐定义和来源对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v249/coverage.json) · [正式工厂的原始拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v249/factory.json)

## 双席军表与卡牌来源

首次隔离场景加卡时替换掉了扎加拉要求的菌毯卡，正式写表器在开房前拒绝。修正为保留原有效军表，只添加 Defiler Mound。两种能力共用原卡的就绪状态。Tunnel Network 使用正式接战关系检查目标资格，退回时同步单位、模型、预备队清单和当前人口。Poisonous Essence 的阶段检查使用原结算器同样的签名标记与已结算历史。 [测试军表的拒绝记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-mound-v249/opening-fixture-rejection.json)

## 第一回合移动阶段

正式房间在 r2 开放卡牌。两只在场 Defiler 都可使用 Poisonous Essence；仅未接战的那只获得 Tunnel Network 选项。接战图在这组实测棋位中仅连通 Defiler 和 Spec Ops Marauder。相同 r2 的状态签名用于两个分支，分别有独立数据库。 [真实菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-mound-v249/mark/menu-r2.json)

## 下一个正式军表缺口

Reactive Creep 三条定义在冻结卡中分别对应菌毯上的 DODGE (1)、菌毯瘤持续与位移、敌方指定移动在 1 英寸内结束时移除。现有组件识别三条，但动作／被动混合适配器的准入表遗漏 on_creep_dodge，另一处将标记消费者与 Bombard 同时设为依赖。下一项应覆盖有发射体和无发射体两种合法军表，并复用原有战场资产、接战与伤害规则。 [战场资产适配器](../../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs) · [组合规则入口](../../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs)

## 双方结束突击后的实际交接

r3 卡牌已耗尽，两种用法均从菜单消失。双方在突击阶段结束行动后，r9 将控制权交给标记的控制者，并提供一次 Poisonous Essence 结算。只读查询列出的目标为正在与 Defiler 接战的 Spec Ops Marauder，数值 2。执行后在 r10 进入近战阶段。 [用卡后菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-mound-v249/mark/menu-r3.json) · [突击末查询](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-mound-v249/mark/phase-end-query.json) · [下一阶段](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-mound-v249/mark/menu-r10.json)

## 产品验收结果

两名人工席位从同一个 r2 棋位分开验证。标记分支中，受影响的 Spec Ops Marauder 单位受到 2 点非致命伤害，结算后仍有 2 个模型；房间在 r10 进入近战阶段，冷恢复逐条复现 10 条回执。隧道分支中，接战的 Defiler 无法使用隧道，未接战的那只成功返回预备队，预备队清单记录为 in_reserves。行动权转交 player1；独立房间冷恢复精确复现本分支 1 条回执。两个分支合计零模型调用。

工程夹具另修正了初始摆位时修改已冻结对象、复用已有房间描述时未创建隧道分支输出目录两处。各次停止记录留存在验收目录。

[标记结算与冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-mound-v249/mark/result.json) · [隧道、预备队与冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-defiler-mound-v249/tunnel/result.json)
