# 潜行 Nova 的正式房间射击

Ticket28 / W3-08 / M01、M07。两项能力在独立组件已有执行器。本次检查同一正式房间里的支付、选目标和射击结算。全程使用冻结 Wave3 和本地双席。

| 军表与绑定 | 正式工厂 | 证据 |
|---|---|---|
| 原潜行军表，2.34 | 25/27，拒绝建房，列出 Head Shot 与 Operational Efficiency | [旧版结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-stealth-standard-v235/legacy-v234/admission.json) |
| 相同军表，2.35 | 27/27，可建房，首个菜单为任务回合开始 | [新版结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-stealth-standard-v235/nova_stealth_mode/admission.json) |
| 潜行军表加一张非唯一 Factory，2.35 | 28/28，可建房 | [工厂回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-stealth-standard-v235/stealth-factory/admission.json) |

修正原因：Nova 的射击声明与 Griffin Support 产生的自动伤害可以同场。原自动伤害消费者拒绝已归属射击声明执行器的触发类型，导致登记显示齐全但建房报错。运行时现在按实际消费者区分两者。

验收另用含 Factory 战术卡的潜行军表。Factory 是能支付 1 CP 的非唯一卡，可作为 Operational Efficiency 的刷新选项。场景预置静止的 Nova 和仅余一个模型的虫群单位，射击使用权威房间骰子，最终结论取自实际回执。

支付后 r1 的正式菜单只有潜行 Nova 的 ranged_attack，参数为 targetUnitId，可执行的有限动作数为零。房间状态中 Factory 已耗竭，Head Shot 的关键词给出伤害 3、移除上限 1。 [r1 菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-stealth-standard-v235/paid-shot/menu-r1.json)

## 正式射击结果

r2 的 C-20A 狙击步枪实际移除了虫群最后一个存活模型。刷新窗口只接受控制方的卡牌选择，允许放弃。玩家选择已耗竭的 Factory；r3 该卡恢复就绪，公开菜单交还 Nova 结束激活。此次记录是满足“摧毁目标”的正例；人口下降、主动放弃和无人口损失的组件对照见既有报告。

[正式射击结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-stealth-standard-v235/paid-shot/result.json) · [r3 后继](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-stealth-standard-v235/paid-shot/menu-r3.json) · [组件对照](../../build/ticket-28-terran-wave3-20261117-v1/nova-operational-efficiency/REPORT.zh-CN.md)

重新打开数据库，三个原生动作精确恢复到相同的最终状态与签名信封。[冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-stealth-standard-v235/paid-shot/cold.json)

## 突击 Nova 的相位反应服与冲击

同版正式房间中，Nova 花费 1 CP 从横坐标 10 移至 12 英寸，仍可声明普通冲锋。成功接战后按自己的能力分配 4 颗冲击骰，实际掷出 1、4、3、4，造成 2 点伤害。防守方选择伤亡后，Nova 获得结束激活的菜单。第七步的验收脚本一度把防守方伤亡误认成攻击方分配，修正后从同一 r7 继续。

[实际结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-assault-reactor-impact-v235/result.json) · [r8 菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-assault-reactor-impact-v235/menu-r8.json)

8 份冲击场景回执精确重建原房的最终信封。[冷恢复结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-assault-reactor-impact-v235/cold.json)
