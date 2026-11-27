# 扎加拉与蝎子的正式军表准入

Ticket28 / W3-09 / M01、M08。固定双方分别为潜行 Nova 与特战劫掠者、扎加拉与蝎子。沿用同一冻结任务、部署、菌毯卡和配装。

| 版本 | 可执行定义 | 数据 |
|---|---:|---|
| 2.35 | 25/38 | [工厂拒绝及完整缺项](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v235/admission.json) |
| 2.36 | 28/38 | [逐项登记检查](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v236/coverage.json) |
| 2.37 | 29/38 | [菌毯项登记](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v237/coverage.json) |

新增登记为扎加拉和蝎子各自的 Devastating Charge、扎加拉的 Indomitable。两种冲击分别绑定各自冻结卡面的骰数和来源，由现有近战消费者执行。

2.37 将扎加拉势力卡的 Zerg Creep 绑定到现有写表消费者。以相同军表验证，0 张与 2 张都被拒绝；加速菌毯合法并消耗 0 气，反应菌毯合法并消耗 10 气。一次夹具错用凯瑞甘专属的恶性菌毯，原生势力标签校验正确拒绝，拒绝记录保留。冲击与装甲的整表房间行动仍待其他缺项接齐后验证。

[正式军表预算检查](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v237/creep-army-audit.json) · [跨势力拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v237/creep-selection-fixture-stop.json)

2.37 当时余下 9 项：

- `card:zagara_s_swarm/instinctive-reaction-any@1`
- `card:zagara_s_swarm/scourge-queen-any@1`
- `unit:defiler/consume-any-phase@1`
- `unit:defiler/dark-swarm-assault-phase@1`
- `unit:defiler/gestate-dark-swarm-movement-phase@1`
- `unit:zagara/broodmother-movement-phase@1`
- `unit:zagara/infested-drop-movement-phase@1`
- `unit:zagara/psionic-link-any-phase@1`
- `unit:zagara/transfusion-any-phase@1`

同一正式工厂核对上述九项并拒绝开局。[最终准入回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v237/admission.json)

## 2.38 正式军表

同一军表已有 33/38 项可执行定义。Infested Drop 提供扎加拉底盘入场边界，每回合共用 1 Supply。Broodmother 按体型对全军生效，Scourge Queen 比较接战模型数，Psionic Link 绑定每回合支付折扣。其余五项为 Instinctive Reaction、Transfusion、Consume、Dark Swarm 及 Gestate Dark Swarm。准入工厂返回的五项与覆盖查询一致。[工厂回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v238/admission.json)

## 2.39 正式开局、部署与全军效果

同一份军表从 33/38 到 38/38，Standard 工厂接受，首菜单为回合开始任务。五个新增覆盖为 Instinctive Reaction、Transfusion、Consume、Dark Swarm、Gestate Dark Swarm。来源修正涉及卡面内标注的阶段、Holo 读取新版目录及清理时对已选 Hidden 反应的检查。[准入回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/admission.json)

- Infested Drop 以扎加拉底盘为入口，蝎子部署到 (14.744, 10)，消耗 1 Supply。重叠被拒绝；下一菜单允许收尾或放置黑蜂。[实际行动](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/drop/result.json) · [冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/drop/cold.json)
- Broodmother 支付 1 生物质，15 英寸外的 Size 2 蝎子得到近战及射击暴击，扎加拉自己没有获得。下一回合选项依据签署使用历史作只读投影，只剩 Impact 与 Tough。[实际行动与投影](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/brood/result.json) · [冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/brood/cold.json)

- 蝎子在 (29, 10) 放置直径 32 mm 的黑蜂，保持当前激活，未支付卡牌。它随后移入原位置，标记依权威位移查询移至 (31.205, 10)，达到底盘接触。错误动作域被拒绝，移动后可收尾，两次提交均精确回放。验收曾把英寸与千分之一英寸直接作对象比较；保留失败并从原 r2 收尾。[放置](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/swarm/placement.json) · [移位](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/swarm/result.json) · [冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/swarm/cold.json)

## 黑蜂清除与第二回合入口

复用正式房间已签署的黑蜂移动结果与任务开局结果，建立回合末工程局面。经控点、任务计分、终局判定、回合末效果、清理刷新和先手结算，黑蜂及其绑定被移除。双方 0 比 0，第二回合由 player1 先行，公开菜单提供回合开始任务。任务开局的 1 份回执和回合末的 6 份回执均在关闭再打开房间后精确回放。本项覆盖阶段交接，未执行其间完整一回合。[清除回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/cleanup/cleanup.json) · [次轮菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/cleanup/round2.json) · [冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/cleanup/zagara-standard-swarm-end-cold.json)

## 共享标记位移查询

旧适配器在正式黑蜂 r1 返回此发布不支持标记位移。修复后，房间对外查询与已提交的移动使用同一规则实例，返回 (31.205, 10) 英寸，与实际移动的几何结果哈希一致。重复选择同一枚标记被拒绝，两次查询均未改动房间。对旧版 2.22 孵化场，查询结果逐字段与原件相同。[修前](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/shared-query-dark-swarm/blocked-before-fix.json) · [修后](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/shared-query-dark-swarm/result.json) · [旧版对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/shared-query-legacy-creep/result.json)

## 诺娃射击与黑蜂防御

诺娃声明 Head Shot，选蝎子为目标。虫方使用势力卡支付黑蜂，之后由诺娃的 C-20A 结算，伤害池是 2 × 3，下一步为收尾。双方反应历史指向同一次诺娃激活，虫方已用黑蜂，本次无第二次输血反应。五次提交关闭再打开房间后精确回放。待分开验证保留虫方反应给输血的合法分支。夹具此前错误选择了牺牲支付却仅提交卡牌，原拒绝已留档。[射击](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/numeric-shot/shot.json) · [反应记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/numeric-shot/reaction-limit.json) · [冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/numeric-shot/cold.json)

## 保留防御反应后的输血与混编军表

从诺娃射击原房 r3 的同一签名局面建立隔离分支。虫方在选定射击目标时放弃黑蜂，伤害出现后用势力卡支付 1 BM，使用扎加拉的输血。该次射击造成 9 点，先减 2，再分配 7 点，蝎子剩 1 个模型、7 点伤害标记。伤害确定前后的各段骰子结果哈希一致。此分支和此前黑蜂分支分别掷骰，两者的总伤害不能直接用来比较反应强弱。隔离分支的 4 份已签署回执在关闭再打开房间后逐步回放，最终状态哈希与 r4 相同。[输血分支冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/transfusion/cold.json)[起点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/transfusion/origin.json) · [分配前](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/transfusion/pre-allocation.json) · [结算与下一动作](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/transfusion/result.json)

使用相同任务、部署、诺娃部队和基础扎加拉部队增加不同单位。2.39 同时增编 Swarmling 与 Vileling，50/50 条定义可执行，Standard 开局返回任务首动作。改为单增 Ravager 时为 41/44。2.40 复用已有近战冲击规则接入 Devastating Charge，达 42/44；工厂仍明确报告 Corrosive Bile 与 Deep Tunnel 两个缺口。当前证据覆盖 Ravager 的能力登记；实际冲锋与孵化出的实例仍待验。[两队混编开局](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/mixed-pair/admission.json) · [2.39 拒绝原因](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/mixed-ravager/stop-formal-opening.json) · [2.40 逐条对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/mixed-ravager-v240/admission.json)
