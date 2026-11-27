# Ravager 的 Standard 房间接线

## 当前证据

Nova 对扎加拉＋蝎子＋Ravager 的军表、任务和部署与 2.40 相同。2.41 的直接入表覆盖从 42/44 升至 43/44，正式开局准确报告仍缺 Deep Tunnel。腐蚀胆汁的稳定 ID 已同时接入来源登记与原生动作构造。该覆盖计数只用于判定军表准入。[本次准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-standard-v241/direct-admission.json) · [2.40 对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/zagara-standard-admission-v239/mixed-ravager-v240/admission.json)

## 接线及影响

- 官方能力在移动阶段支付 1 Biomass，每个模型放置一枚标记。受影响单位与标记的距离在突击结束时计算，每单位每枚命中的标记独立产生 HITS 5 (1)。产品复用已有的放置、几何、自动命中及伤亡消费者。
- 旧正式房间在双方结束突击时只为追猎导弹和破坏无人机预留结算。新候选在场上有本轮胆汁时先保留突击阶段，通过已有的同时效果优先级规则确定由哪一方选择。该方可以选择自己的效果。每项的来源与伤害反应仍由对应消费者核验；全部完成后才进入近战。
- 初次用 Cocoon 军表开局时触发真实构造错误。原有蟑螂 Debilitating Saliva 在声明射击时触发，已有射击反应消费者负责。新增的自动命中运行时误要求这条反应也由它处理。修复将已实际构造的射击消费者明确交给自动命中运行时核对。[错误证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-standard-v241/cocoon-opening-stop-1.json)
- 以 2.41 候选绑定新增能力。另用已通过的 Cocoon 历史局面提供生成物身份和棋盘，冻结定义及运行时重新由新版本工厂绑定。参考局面为第四回合移动阶段 r39。[原局](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-artefact-cocoon-cleanup-v223-v1/chronological-room/result.public.json)

## 正式开局和第四回合夹具

Cocoon 军表已通过 2.41 正式工厂，返回首个公开动作 `resolve_mission_start_of_round`，同时登记未来 Ravager 的腐蚀胆汁定义。[开局回执](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-standard-v241/cocoon-opening.json)

第一次从第四回合 r39 构造独立场景后，r0 读取合法菜单失败。定点检查显示，夹具使用了孵化前的移动目录，缺少新单位的 `SELECTED_SPATIAL_ACTION_ROUTE_PROFILE_STALE` 档案。修订夹具改用正式孵化流程的 `refreshOfficialReleaseRosterDerivedStateV2`，并逐字段比对同一只 Ravager 的原局档案。首次失败房间与错误摘要保留。[原停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-standard-v241/stop-r0.json)

后续定位了两类跨来源错配：遗物持有记录绑定历史任务包；人口损失账本绑定历史任务运行时。修订后的隔离房使用原局冻结清单，并由新产品实际执行第四回合任务开始和先手选择，生成本局的人口记录。原局第四回合双方人口池各为 12，原账本此时没有损失记录。r3 已完成支付和放置，当前覆盖 Swarmling 及投放的 Ravager 自身，每个目标投影为 HITS 5 (1)。[实际投放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-standard-v241/native-round-start/placement.json) · [无权修改状态的预览](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-standard-v241/native-round-start/preview.json)

## 突击结束的产品结果

第四回合 r9 双方都已结束突击，公开菜单只提供结算腐蚀胆汁。房间分别为 Swarmling 和投放者 Ravager 处理 HITS 5 (1)，完成后移除标记。r15 已进入近战阶段并向 player1 返回合法菜单。[双方结束突击](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-standard-v241/native-round-start/order.json) · [两个目标与近战后继](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-standard-v241/native-round-start/successor.json)

关闭并重新打开房间后，从初始 Envelope 重放 15 笔已接受操作，得到与 r15 存储终态完全相同的 Envelope。[冷恢复核对](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/ravager-bile-standard-v241/native-round-start/cold.json)
