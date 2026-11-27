# Ticket28 / W3-08 · 渡鸦追猎导弹的正式对局验收

雷诺游骑兵带 Marine 和装备 Corvid Reactor、Seeker Missile 的 Raven，对阵携带 Accelerating Creep 的 Zerg Swarm。Standard 军表沿用上一版，任务为 Fire in the Sky。旧版本 20/21，缺追猎导弹。2.29 的只读开局检查和正式房间工厂均为 21/21，首动为 resolve_mission_start_of_round。

## 卡文与产品改动

冻结写表器的 army_units:raven 升级要求在移动阶段选定 12 英寸内的一个敌方单位。突击阶段末，对同一目标按当时状态重新测距。目标静止或者仍在 8 英寸内，产生 4 次自动命中，每次 2 伤害，禁止 Surge。卡文另授予接战目标闪避资格。之前续行记录误写了弹体放置及碰撞，此处已按卡文纠正。

组件已有锁定、支付、命中及伤亡处理。正式房间此前未按军表装备挂上这些消费者，通用阶段结束也可能先进入战斗。2.29 在正式工厂装载所选升级，使突击阶段结束先消费已支付的声明。查询和执行读取同一份声明和当前目标。处理完命中、防御及伤亡，再推进阶段。

## 隔离房间的实际结果

各房间从同一份正式开局状态派生，指定了首回合移动阶段的合法阵形和先手。相同目标有 12 个模型。距离按权威底盘测量。三个场景分别设置位置和静止状态，未执行目标从近处移动到远处的动作。

| 突击阶段末的目标 | 距离 | 实付 | 规则器结果 | 存活模型 | 冷回放 |
|---|---:|---:|---|---:|---:|
| 近处，未静止 | 6.845 英寸 | 0 CP，使用反应堆折扣 | 4 次自动命中，完成防御及伤亡选择 | 12 → 6 | 12/12 |
| 远处，未静止 | 10.733 英寸 | 1 CP | 条件不满足，进入战斗 | 12 → 12 | 8/8 |
| 同一远处位置，静止 | 10.733 英寸 | 1 CP | 4 次自动命中，完成防御及伤亡选择 | 12 → 4 | 12/12 |

三个房间各只进入一次战斗阶段。表内伤亡取自本次实际骰果。同距离对照验证静止条件，命中数与单次伤害读取原生查询。另设一间超出 12 英寸的场景，房间未向渡鸦提供该目标，修订保持 r0。旧 2.28 房间用原发布绑定重建，完整运行描述和原哈希一致。

两条命中分支第一次在守方公开选择处停下，夹具只识别伤亡组合哈希，产品实际给出逐模型选择。修正夹具后，从两间原房的 r11 提交选择。旧版兼容夹具曾把相同发布 ID 的两个绑定登记到同一个注册表，产品拒绝；改用独立注册表后核对通过。保留这三份原始诊断。

本次三个房间通过双方 pass 触发阶段末，目标均未接战。最后一个单位激活自然收尾及接战目标专属闪避未在这些房间单独验证。此次验收只覆盖房间规则链，付费模型调用为零。

## 下一批军表

沿同一正式准入入口分别检查 Nova 隐形模式、突击模式，两组均带一支 Spec Ops Marauder。前者 14/27，后者 14/26。两个配装共缺 Griffin Support、Mark for Death 和劫掠者的四项能力。先接共用能力，然后按形态处理剩余项。各门仅对所列军表有效。

[冻结军表准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-seeker-standard-v229/admission.json) · [近处冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-seeker-standard-v229/near/cold.json) · [远处冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-seeker-standard-v229/far/cold.json) · [静止冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-seeker-standard-v229/stationary/cold.json) · [超距菜单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-seeker-standard-v229/outside/excluded-target.json) · [旧版绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-seeker-standard-v229/previous-binding.json) · [Nova 逐项缺口](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-seeker-standard-v229/nova-rosters.json)
