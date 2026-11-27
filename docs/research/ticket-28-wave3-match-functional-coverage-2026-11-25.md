# Wave3 正式 Match 功能验收

Ticket 28 / T28-W3-11 · 2026-11-25 · 产品执行器 2.84.0

正式 Match 从 7/26 推进到 **13/26**。本次通过 M15–M19 和 M26。Wave3 整体 2/16，组件 162/162。

## 两间原房实际完成了什么

| Web 双人原房 | 最后一步 | 两席结算 | 网页复查 |
| --- | --- | --- | --- |
| [Skirmish 500](../../build/ticket-28-wave3-human-lobby-v1/skirmish.public.json) | 第 5 回合，r81 | 0–0 平局 | [桌面](../../build/ticket-28-wave3-human-lobby-v1/wave3-skirmish-v1-outcome.png) · [手机网页](../../build/ticket-28-wave3-human-lobby-v1/skirmish-mobile-outcome.png) |
| [Standard 2000](../../build/ticket-28-wave3-human-lobby-v1/standard.public.json) | 第 5 回合，r81 | 0–0 平局 | [桌面](../../build/ticket-28-wave3-human-lobby-v1/wave3-standard-v1-outcome.png) · [手机网页](../../build/ticket-28-wave3-human-lobby-v1/standard-mobile-outcome.png) |

两间房都从已有双人工开局续行到回合上限，关库后从持久化记录回放，终局散列吻合。手机网页以 390×844 验收，刷新回到大厅，点原房能看到相同结果。脚本主动选择了多次放弃，平局验证的是回合交替和终局显示。旧版隔离另有 11 月 9 日原房三步精确回放记录。[旧房证据](../../build/ticket-28-wave3-human-lobby-v1/existing-product-room/result.public.json)

## 实际做过哪些任务动作

场景从正式工厂开局，以声明的站位、回合及初始比分单独验证规则。通过原生菜单签下动作，检查后续合法操作、双方计分、终局及重开回放。条件场景没有从部署走到指定格的行动历史。掉落分支单独从携带者有移动机会的局面开始。两间原房的 0–0 和下表任务分数分开记录。

| 任务 | 500 分 | 2000 分 |
| --- | --- | --- |
| Artefact Hunt | Medic 控制中立目标、取得遗物携带权，第 5 回合结算为 1–1。[拾取与终局](../../build/ticket-28-wave3-human-lobby-v1/mission-actions/skirmish-artefact_hunt/result.public.json) | Adept 取得遗物，第 5 回合结算为 4–4。[拾取与终局](../../build/ticket-28-wave3-human-lobby-v1/mission-actions/standard-artefact_hunt/result.public.json) |
| Fire in the Sky | 第二回合从 6 分开始，破坏后达成 8–0，任务提前结束。[动作与回放](../../build/ticket-28-wave3-human-lobby-v1/mission-actions/skirmish-fire_in_the_sky/result.public.json) | 第二回合从 8 分开始，破坏后达成 10–0。在同一个高地目标上，地面单位未取得控制，高台上的凯瑞甘成功控制并可破坏。[高度对照及终局](../../build/ticket-28-wave3-human-lobby-v1/mission-actions/standard-fire_in_the_sky-balanced-high/result.public.json) |
| Gather the Resources | Medic 从已控制目标收集，7→8 分，立即结束，双方行动菜单关闭，冷回放一致。[动作与回放](../../build/ticket-28-wave3-human-lobby-v1/mission-actions/skirmish-gather_the_resources/result.public.json) | 本项清单只要求 Skirmish。 |

在同一个中立遗物旁放入双方单位后，Skirmish 的有效人口是 1 对 1，控制权维持中立；Standard 是 2 对 1，由第一方取得控制。两种规模随后各自检验了持有者随 Dropship 撤入预备队、对手在合法位置放回标记、携带权清空。Standard 的撤离使用另一对获准入的军表，含 Medic 的原失败组合单列在下方。[500 分争夺](../../build/ticket-28-wave3-human-lobby-v1/mission-actions/skirmish-artefact_hunt-withdrawal/contest.public.json) · [2000 分争夺](../../build/ticket-28-wave3-human-lobby-v1/mission-actions/standard-artefact_hunt-withdrawal-control/contest.public.json) · [500 分撤离](../../build/ticket-28-wave3-human-lobby-v1/mission-actions/skirmish-artefact_hunt-withdrawal/result.public.json) · [2000 分撤离、对手放回标记和冷回放](../../build/ticket-28-wave3-human-lobby-v1/mission-actions/standard-artefact_hunt-withdrawal-control/result.public.json)

## 哪些军表能进入第一回合

对冻结数据的十张势力卡安排了五对具体军表，同版 Standard 工厂有四对实际结算第一回合开始并进入移动阶段，两个席位均有供给。通过的配对包括 Terran Armed Forces × Kerrigan’s Swarm、Nova × Zagara、Nerazim × Khalai、Raynor × Daelaam。这是五组抽样，可以定位组合问题；无法据此推出所有合法军表之间均可开局。[逐组合结果](../../build/ticket-28-wave3-human-lobby-v1/standard-faction-openings/result.public.json)

| 阻塞位置 | 实际被拒的组合 | 下一个有判别力的检查 |
| --- | --- | --- |
| Standard 建房，Khassar 委派攻击 | Templar Caste × Zerg Swarm。工厂报告 Overseer 的 Pneumatized Carapace 在冲锋掷骰后、Brood Instinct 在闪避掷骰前、Hydralisk 的 Lunge 在远程攻击结算后，三种反应的归属尚未全部接通。 | 按反应发生方区分可独立处理和需返回委派攻击的窗口，实签使用及放弃后，核对行动方、待结算骰与后继。[失败原件](../../build/ticket-28-wave3-human-lobby-v1/standard-faction-openings/templar_caste-zerg_swarm.public.json) |
| Standard 建房，自动命中造成伤害 | 含 Medic 和 Dropship 的 Terran 对含 Twilight Templar 的圣堂军表，在组装执行器时拒绝 Medic 的 Life Support。需要在伤害分配前给符合距离的友方生物提供支付和减伤的机会。 | 验证自动命中→普通伤害窗口→使用或放弃 Life Support→原伤害分配与回放。更换军表能单测遗物撤离，两组合的通过与失败分别保留。[该组合的记录](../../build/ticket-28-wave3-human-lobby-v1/mission-actions/standard-artefact_hunt-withdrawal) |

两处工厂拒绝现在都报告具体能力和触发时机。登记的是实际构造失败，组件单项通过仍然有效。M24 的 MCP、写表、Teach、决策及端上多消费者一致性，M25 的原生客户端，以及战斗中嵌套反应的使用/放弃仍按各自产品入口核验。本轮未调用模型，策略强弱没有测量。

## 剩余验收的范围

| 编号 | 剩余工作 |
| --- | --- |
| M01、M02、M10 | 两个被拒的混合军表，分别追踪到委派攻击和自动命中的反应处理。 |
| M05、M06 | 多地形和多模型移动、冲锋实际落点，以及支付后技能和反应的剩余组合。两规模 Run 的查询和实际五个底座落点已吻合，可复用签名。 |
| M07、M08、M09 | 正式军表的种族组合，包括 Nova 去隐、虫洞额外部署、Khassar 委派人口和不朽者攻防。Nova 与虫洞已有原 r0 验证边界。 |
| M12、M13、M14 | 多目标近战伤亡、同阶段模板/持续效果顺序、两种规模的运输和特殊入场的未覆盖组合。 |
| M24、M25 | MCP、写表、Plan、Teach、实战决策、UI 对同一状态的消费；原生 App 的双席及终局恢复。网页与原生 App 分开记账。 |

这些项目的已签动作仍可复用。产品触发顺序、实际付款或行动后继缺证时，按对应局面执行；只在验真实时序时保留连续房间历史。
