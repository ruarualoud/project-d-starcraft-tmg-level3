# Ticket 28 · W3-10／11 · Additional Supply Depots

## 原因、修改与影响

旧能力目录已有该卡的专属执行器，Wave3 的开房装配仅继承了 Freedom Fighters 的被动来源。本轮把官方冻结的 Supply Depot 定义接进同一执行族。v2.7 使用来源身份、原文和发布哈希装配主动动作，执行仍走旧专属适配器，人口仍由现有权威投影计算。新房能确保使用能力后仍由同一个单位完成激活。若同一军表也包含 Freedom Fighters，两个定义归同一适配器，无需重复登记。旧版回放使用原描述符。

这项规则提高活动单位用于任务目标的 Supply。它不改变军表成本、在场人口池、脱战用 Supply 或原始单位属性。

## 已验证边界

- 真实 Standard 候选工厂建立两席隔离军表。主军表从 110/115 到 111/115。剩余 Overlord Ventral Sacs、Hydralisk Lunge、Swarmling Zergling Reconstitution 和 Vile Debilitating Saliva。主军表仍待全部能力接好后才进入完整正式对局。
- 隔离签名 Room r2 真实提交对 Goliath 用卡。控点与任务有效 Supply 2→3，人口池及脱战仍为 2。卡牌耗尽后重复选项消失，权威提交支持幂等。普通移动仍合法，结束激活实际提交 r3，交给 player2。
- 下一回合数值到期用权威只读投影核对。任务控点工具从这间房的签名后态读取五个标记，调用同一个控点计算。尚未让加成在实际 Cleanup 中产生分数，也未验普通移动之后使用卡牌。
- 冷开后通过正式回放接口核对 3 条签名回执。原 v2.6 冻结输入和运行时描述符逐字段一致。零模型调用。
- 首次卡牌验收请求把参数对象直接传给只接受参数生成函数的夹具，停在 r1，产品未提交。已按约定从原 r1 继续，未重建已通过的先手状态。

## 射击反应的下一条边界

Lunge 的旧规则实现产生射击结算后的移动意图，Wave3 需要在实际伤亡和射击序列结算后打开该窗口，并由同一合法移动消费者验证方向和队形。Debilitating Saliva 要在射击投骰前打开窗口、绑定实际射手并消费命中减益。现有射击声明组件只支持针对部分武器的主动方关键词选项，会明确拒绝通用声明触发，不能仅把两条定义加进冻结清单。应先补这两个原生停点及选择后的父动作恢复。

整体 2/16，剩 02、03、05–16。正式产品终局和 Agent 材料验收仍在后续阶段。

- [正式军表候选准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-mission-supply-admission.public.json)
- [签名提交、人口和交替激活](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-mission-supply-ability.public.json)
- [正式冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-mission-supply-cold-replay.public.json)
- [权威任务控点读取](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-mission-supply-control-projection.public.json)
