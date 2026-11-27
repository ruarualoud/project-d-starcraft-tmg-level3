# Ticket28 / W3-08 · 渡鸦进入正式 Standard 对局

地图任务为 Fire in the Sky。雷诺游骑兵带 Marine、Raven，对手是 Zerg Swarm 的 Zergling。本轮从冻结 Wave3 军表正式开局。结束渡鸦激活后，两边选择 pass，以最短路径验证占点和炮塔寿命。模型调用为零。

| 房间修订 | 实际动作及结果 |
|---|---|
| r0–r2 | 同一军表在 2.27 注册 16/21，本次只读准入与正式工厂均为 21/21。执行首回合任务，选人族先动。 |
| r3 | 使用 Internal Tech Module 从左侧中立边入场，完整底盘及扫过路径通过。 |
| r4–r5 | 在 (9, 10) 英寸放下 0 人口 Auto-Turret，阵营卡耗竭。结束渡鸦激活后交给虫族。五步独立冷回放一致。 |
| r6–r16 | 经过移动、突击与战斗阶段。五个任务点均将飞行渡鸦和建筑炮塔排除出争夺。完成计分与终局检查。 |
| r17–r20 | 回合末先给炮塔拥有者寿命结算。r18 移除炮塔，对手击杀记账为零。随后刷新并进入第二回合。完整 20 份回执冷回放与保存状态逐字段一致。 |

## 修复与覆盖

- 正式工厂接入侦测、反装甲导弹、部署炮塔、爆炸弹片和内部科技模块，并登记生成物的武器和回合末来源。移除独立组件在正式 Match 中重复申请的清理入口。本局实际使用了内部科技模块与部署炮塔。其余三项本次验证到军表准入，独立执行证据见组件验收。
- r13 首次申请任务控制报 MISSION_MARKER_MODEL_BASE_SCOPE_UNSUPPORTED。裁定器只接受圆形和矩形。修正后复用部署所用的来源校验与实测底盘轮廓。既有圆形和矩形继续沿用原回执格式。
- r16 原预览直接进入刷新，炮塔仍在场。正式 Match 现在将强制寿命与可选资产按控制方排序，复用原生移除和记录。从同一 r16 验证后继。当前 2.27 房间描述符按旧绑定重建后逐字段一致。
- 更换为 Corvid Reactor＋Seeker Missile 后，正式预检为 20/21，缺 Seeker Missile。总体组件 162/162，正式 Match 3/26，Ticket28 2/16。

[正式开局](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-standard-v228/admission.json) · [入场与交接](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-standard-v228/action-trace.json) · [任务点资格](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-standard-v228/marker-control.json) · [修前寿命缺口](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-standard-v228/timed-life-before-fix.json) · [20 步回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-standard-v228/round-end-cold.json) · [另一配装](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-standard-v228/optional-loadout.json) · [旧版绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/raven-standard-v228/previous-binding.json)
