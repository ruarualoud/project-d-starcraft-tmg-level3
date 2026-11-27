# Ticket 28 · W3-10／11 · Skirmish 同发布 Match 开局

在真实 Skirmish 工厂的同一个军表、任务、地图和部署输入流程导出开局装配。开局为冻结 U83/C84/R50、FAQ 1.3 的 Artefact Hunt，36×36 英寸，双方全部单位在预备队。首次对账发现候选能力路由 33/33，原生动作组件 21/33。原生组件复用同发布选定能力及射击被动消费者后，两边均 33/33。

## 签名开局及回合人口

- 由共用 Match 生命周期准备真实工厂状态。原签名房间提交任务开局 r1，双方 Supply 上限为 3，接着原生选择先手 r2。
- 原 r3 在红方入场边部署三模型 Medic。模型上场，人口占用仍显示 0。旧部署规则仅在部分入口刷新人口镜像。该现象会影响同回合读取人口与后继校验。当前 Match 在同回合权威后态重算占用。
- 按原 v2.0.0 绑定重开并回放三条回执，精确保留原问题。v2.1.0 从原 r2 的签名状态分支，只提交受影响的 Medic 部署和结束激活。部署耗用 1 Supply、剩 2，并在结束激活后交给 player2。
- 新版关闭后重开 SQLite，按冻结数据发布及签名运行时清单重新组装依赖。两条新版回执与保存后态精确一致。数据发布继续拥有任务及战场来源，单独的运行时清单绑定签名解释器。两份清单的其他组成和已签 runtime hash 均核对。

## 后续边界

此验收覆盖签名候选开局、首轮任务和先手、首队部署及激活交权。阶段 Pass、普通战斗向任务续步的有序切换、计分终局、正式工厂完整发布接线以及 Web/App 重连仍待。Standard 已有的选定能力覆盖是 102/117，待其余 15 条。虫洞部署仍在已保存的横排预检停点。Ticket 28 为 2/16，模型调用零，策略效果未测。

- [原生组件 33 条逐项核对](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-formal-skirmish-opening-native-ready-registration.public.json)
- [签名任务开局证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-formal-skirmish-opening-first-round.public.json)
- [原问题、修复后部署与冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-formal-skirmish-opening-supply-and-cold-recovery.public.json)
