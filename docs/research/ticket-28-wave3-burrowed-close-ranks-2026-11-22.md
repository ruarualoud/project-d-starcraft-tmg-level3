# Ticket 28 / W3-10、11 · Wave3 潜地单位 Close Ranks 与战斗交接

## 来源与实现

冻结总规则 Part 11 要求战斗阶段开始时已接敌的潜地单位激活。它可以完成 Close Ranks 并解除潜地后攻击，也可以结束该次激活并放弃攻击。敌方单位仍可照常攻击潜地目标。

此前保留的候选断点中，Roach 选择 decline 仍可分配 2 颗攻击骰。新版候选启用特征消费者 1.5.0。战斗菜单将保留潜地的结束激活选项交给通用激活入口。潜地单位的攻击域只开放合法 Close Ranks，预览、投骰预检和提交共用挪位后解除 Burrowed 和 Hidden 的状态。旧绑定仍可读出原动作哈希。

## 原生候选回执

| 分支 | 实际结果 |
|---|---|
| 结束激活并放弃攻击 | 从原 Combat 断点提交。Roach 标记该阶段已激活，保留 Burrowed 和 Hidden，无投骰、无攻击记录、对手无变化，席位交给 player1。重复动作消失，冷读重放一致。 |
| 合法 Close Ranks 后攻击 | 超前跳过移动的攻击申请被拒。领队移动到 27.9 英寸，先解除两种状态和棋盘标记，再结算 2 颗攻击骰。预览与只读投骰快照一致，提交、事件次序和冷读重放一致。 |
| 实际攻击后收尾 | 从已保存攻击后继加载并完成 after_action 结束激活。清除当前激活窗口，席位交给 player1。 |
| 向潜地单位攻击 | 用放弃攻击后的棋位预览 Goliath 近战，潜地 Roach 是合法目标并有 Evade 骰容量。该分支只验证了预览。 |
| 上一政策 | 1.4.0 保存的原生动作重新生成后哈希完全一致。 |

验证来源为同一冻结发布和原生候选的规则菜单、预览、提交。投骰使用确定性工程输入。实际攻击分支未开启伤亡选择或反应窗口，这两个续算边界仍待独立验证。标准军表的候选能力登记保持 90/117，Skirmish 保持 25/33。正式房间和实战外层准出仍待完成，模型调用为零。

## 回执

- [潜地结束激活](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-close-ranks-decline.public.json)
- [Close Ranks 后攻击](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-close-ranks-fight.public.json)
- [攻击后交接](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-close-ranks-fight-handoff.public.json)
- [对方攻击预览](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-close-ranks-opponent-preview.public.json)
- [旧策略动作哈希](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-close-ranks-previous-policy.public.json)
- [修前非法攻击证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-burrow-transit-close-ranks-defect.public.json)
