# T28-W3-09 / M08　Defiler 的 Plague

2.50 的正式工厂记录了同一份 57 定义军表唯一未接入项 Plague。该能力已有冻结的 1–3 BM 支付、FAQ 模板覆盖及非致命伤害组件；正式房间此前只在 Siege Tank 武器被选中时载入爆炸模板，Defiler 的 Consume 也只接了反应支付。

将能力绑定到实际购买升级的 Defiler，复用版本清单内的模板尺寸、位置和支付规则。用卡与牺牲由正式查询报价，权威房间决定模板覆盖和伤害；检查未购升级单位、非法支付、已付款后的重复使用、下一席位及冷恢复。旧候选继续按原绑定拒绝。

## 全部新增虫族定义同表开房

同一份57定义的正式军表由工厂通过并进入第一回合；虫族40/40条新定义全部准入。2.51补入 Defiler 的 Plague；2.50补入 Reactive Creep 三条。 与上个候选逐条核对冻结来源，唯一变化是原先被拒的 Plague。 [工厂实际接受](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v251/factory.json) · [逐定义对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zerg-forty-formal-admission-v251/coverage.json)

## 后续核对旧虫族能力的范围

用冻结写表器的单位和战术卡势力字段关联继承清单的稳定 ID。252 条旧定义均找到所属来源，其中 115 条属于虫族，80 条曾被 2.18 的 Standard 军表选中。其余 35 条需要和之后的开房记录逐项比对；这个数量只表示那一份旧军表的选择范围。已有 Ravager 攻击和孵化记录应直接复用。

[旧定义逐条记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-definition-reconciliation-v1.public.json) · [冻结单位](../../build/ticket-28-wave3-assessment-20261112/army_units.json) · [冻结卡牌](../../build/ticket-28-wave3-assessment-20261112/tactical_cards.json)

## 两种支付的实际施法与恢复

两种情形使用同一开房军表和同一套声明的突击阶段棋位。5 英寸模板覆盖一个友军模型和两个敌军模型；施法结果均按非致命伤害结算。只用卡时 Defiler 自行结束激活；Consume 牺牲施法者后立即轮到人族，两房均返回有效动作菜单。冷启动重放得到原状态。每场掷骰结果仅记录本次结算。

| 支付 | BM | 各单位伤害标记 | 冷恢复回执 | 证据 |
|---|---:|---|---:|---|
| 只用卡 | 1 | ally 1、spec_ops_marauder__marauder_ 3 | 2 | [结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-plague-v251/card/result.json) |
| Consume／牺牲施法者 | 3 | ally 1、spec_ops_marauder__marauder_ 1 | 1 | [结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-plague-v251/sacrifice/result.json) |
