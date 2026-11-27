# Ticket28 / W3-08 · Nova 势力与特战劫掠者正式接线

本次使用冻结写表器中的两份 Nova 军表，在 Fire in the Sky 的 Standard 产品入口核对能力、开局与行动。基础对手为 Zerg Swarm 的一队 Zergling，携带 Accelerating Creep。另加 Queen 作为同房多来源对照。各房使用工程席位，模型调用为零。

## 军表结果

| 人族选择 | 上版正式覆盖 | 本轮正式覆盖 | 开局结果 |
|---|---:|---:|---|
| Nova 隐形模式＋特战劫掠者 | 14/27 | 20/27 | 正确拦截 7 项形态能力 |
| Nova 突击模式＋特战劫掠者 | 14/26 | 20/26 | 正确拦截 6 项形态能力 |
| 只有特战劫掠者 | — | 18/18 | 2.30 首动为首回合任务结算 |
| 只有特战劫掠者，对方增加虫后 | — | 26/26 | 2.31 首动为首回合任务结算 |

对带英雄的两张表，逐个核对新增和剩余 ID。两张势力卡分别是 Griffin Support、Mark for Death。特战劫掠者提供 Commando Stimpack、Spec Ops Armour、Suppression Shells、Magrail Munitions。四组覆盖数的分母均取自各自实际军表。

## 正式房间单步

用 18/18 的正式工厂初态在隔离房间声明第一回合的站位和阶段。六个分支均通过房间菜单、预览、提交及冷恢复。下表的回执数来自各房实际日志。

| 分支 | 观察结果 | 回执 |
|---|---|---:|
| Griffin Support | 摆放查询与房间新增同一架破坏无人机，3 血、0 人口，势力卡耗竭。突击阶段末计算 3 英寸范围；本场只有无人机自身入围，因建筑有额外 5 次命中。首批伤害已摧毁它，后续对已移除目标的命中被跳过，随后进入战斗阶段 | 13 |
| Mark for Death | 被标记的 Zergling 得到对应的首件武器 CRITICAL HIT (1)、PRECISION (1) 效果，结束激活后轮到虫族 | 2 |
| Commando Stimpack | 同一实际支付后态查询 Quad K12 远程和 Strike 近战，精准值均为 2，结束激活后交给虫族 | 2 |
| Spec Ops Armour | 实际获得 hidden，状态的失效条件为执行下一动作，结束本次激活后交给虫族 | 2 |
| Suppression Shells | 虫族声明冲锋，守方响应后减速 3。实际掷骰后进入确认冲锋，距离预算按减速后速度和骰果计算 | 3 |
| Magrail Munitions | Quad K12 对轻甲 Zergling 用 6 骰开火，守方选伤亡后，首次攻击次数从 1 变为 0 | 2 |

六个分支共 24 份签名回执均精确重放。无人机此次在突击阶段已毁，存活无人机的回合末移除没有在本轮房间重演。磁轨本轮使用轻甲目标，没有据此断言已实测对装甲的额外伤害。

## 运行中发现并修复的工程问题

1. **守方未分配射击伤亡时还能选冲锋。** 原生菜单对移动和结束激活做了拦截，近战菜单仍参与合并。2.31 让待结算射击先走所属菜单，并在实例化和应用时拒绝旧冲锋动作。取 2.30 原房第一份签名回执恢复到射击后，建立隔离的 2.31 房间。守方只有伤亡选择，原冲锋参数和动作均被拒绝；伤亡成功应用，射击结算完成，新的 1 份回执冷重放一致。没有重掷射击。
2. **虫后与格里芬单独可用，放在同一房间时编译失败。** 生命周期编译器只登记了格里芬的单来源组合。已把其冻结来源、生成单位和移除来源接入共享注册。产品工厂用同一间房装载“格里芬＋虫后产菌毯瘤”，26/26 通过。这个对照验证到正式开局，未另打一场。

2.29 的冻结渡鸦运行描述重建结果与原哈希相同。2.30 实际射击前缀在新版修复后仍用旧绑定重放。测试夹具曾读错 hidden 的大小写和无人机预览返回的身份层级，两项均从原 r1 修订继续，旧失败留档。

## 下一步

两种形态共需 Battle Preparation、Ghost Visor、Super Stimpack、Holo Decoy。隐形模式另有 Head Shot、Operational Efficiency、Tactical Stealth Suit，突击模式另有 Devastating Charge、Phase Reactor Suit。优先接四种共有能力的真实消费者和后继，再查各形态独有项。维持组件 162/162、Match 3/26、Ticket28 2/16。

[隐形军表](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-shared-standard-v230/nova_stealth_mode/verified.json) · [突击军表](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-shared-standard-v230/nova_assault_mode/verified.json) · [带虫后的开局](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-shared-standard-v230/mixed-queen.json) · [无人机行动](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-shared-standard-v230/griffin/trace.json) · [伤亡修复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-shared-standard-v230/magrail/casualty-fork-v231/result.json) · [旧版核对](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/nova-shared-standard-v230/previous-runtime.json)
