# Ticket 28 / W3-10 · 移动末同名效果选择

冻结规则 10.1 将只应用一个同名实例的义务赋予受影响单位。第 11 部分 CONTROLLING PLAYER 规定该玩家替自己的单位作决定。3.214.0 据此把移动末不等价 Storm 的选择交给受影响单位的控制者。本项系由两条总规则联读得出，FAQ 没有单独给 Storm 选择实例举例。 [冻结规则数据](../../build/ticket-28-wave3-source-candidate-20261112-v1/compiled/dataset.json)

两次原生 Pass 后，房间在签名窗口中只给目标侧选择，任何选择之前均无伤害或掷骰。签名选择锁定实例后，优先席才提交伤害。一个 Storm 批次与一个独立 Gale 批次分别结算，弃置实例不产生伤害批次，随后进入突击。

- 两个隔离房分别选中 4+ 和 5+ 的 Storm，实际结算各 5 枚 Storm 骰，选项里的覆盖和阈值与所签伤害一致。每房 4 条签名，冷回放逐字段一致。 [两房结果](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-controller-choice-v3214/result.public.json)
- 对侧菜单不暴露决定动作。选择签名不含 ChanceTicket。旧 3.206.0 和 3.212.0 描述符逐字段一致。 [目标侧 4+ 选择](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-controller-choice-v3214/stronger/choice.public.json) [目标侧 5+ 选择](../../build/ticket-28-protoss-wave3-20261120-v1/psionic-storm/phase-end-controller-choice-v3214/weaker/choice.public.json)

该候选从已确认的工程中心开始，用已通过的 127 mm 外圈。仍需实际小标记直径、Storm（已购升级）与 Gale 真实几何施放、突击重叠时序、完整 Match 接线与端上验证。W3-10 21/23、Wave3 组件 151/162、Match 3/26、整票 2/16。零模型调用。
