# P3 v643：当前 Native 攻击的伤害反应接线

2026-10-20。Ticket27／Slice272。具体能力修复记录，不是最终军表／Plan生成报告。

## 复现与原因

使用当前 Run 保存的冻结 authority、同源官方缓存、真实 Standard V6(V1) 运行时，在隔离实验室建立 Queen／Marine／Medic 局部场景。底座、连续性与原生静态几何全部通过；合法射程来自当前 Talons domain，不手写攻击池或减伤。

真实 RED：`scripts/verify-slice272-native-damage-reaction-v643.mjs` 首次有效执行退出1。原生反应适配器在该状态列出15条可支付的 Life Support 选择（包含来源／支付组合，不是15次可叠加使用）；相同攻击却直接返回 `ranged_attack_roll_resolved_pending_defender_casualty`、伤害8，没有 `pendingOfficialReactionWindow`。

这是当前共享 ranged Apply 跳过伤害反应、Match 未在伤亡前分派反应的接线缺口。不能仅以旧原子／Optical Flare 专项通过推断当前主链已接。交互 REPL 的 Bundle 校验假失败通过正常 Node 进程排除，没有据其修改生产校验。

## 实际改动

- `official-total-damage-reaction-kernel-v1.mjs`：共享的单位总伤害池减免；单模型旧接口继续复用同一算术。处理已有伤害标记、最低伤害和真实减免来源，不在写表器另造 Medic 公式。
- `official-selected-roster-ranged-action-runtime-v1.mjs`：1.8.0→1.9.0。有真实可选伤害反应时，保存原攻击／骰子／上下文断点，双方原生优先权选择后消费实际支付和效果，再建立伤亡域。伤亡断点保留已结算结果，后续选择不重掷、不重付、不重开反应。
- `official-current-product-match-runtime-v1.mjs`：1.0.1→1.1.0。反应窗口只分派原生反应菜单，当前执行席位跟随优先权；反应关闭后自动恢复共享 ranged 结算。
- 新增的唯一门禁就是上述真实 bug 的复现脚本，没有运行旧通过门或新增无关泛化测试。

## 修后一次定点 GREEN

同一命令修后只跑一次，PID57248，退出0。两支均通过真实实例化／Apply／伤亡选择，并在反应之间经过 JSON 冷保存恢复：

| 项目 | 双方放弃反应 | player1 选择 Life Support |
|---|---|---|
| Queen 原生骰子合同 | hit4／surge1／armour4／evade0 | 完全相同 |
| 显式条件骰子 | 6,6,6,6,6,1,1,1,1 | 完全相同 |
| 本次攻击伤害 | 8 | 8 |
| 原生减免 | 0 | 3个4寸内 Medic 模型减免3 |
| 分配前总伤害 | 8 | 5 |
| Marine 移除／剩余 | 4／2 | 2／4 |
| faction:player1 卡 | ready | 支付1CP后 exhausted |
| 后续伤亡选择 | 不重新开窗 | 不重新开窗、不重复支付 |

实际事件链为 `reaction_window_opened → reaction_priority_passed → reaction_priority_advanced → reaction_resource_paid / reaction_ability_resolved（支援支）→ reaction_window_closed → ranged_damage_reaction_resumed → ranged_attack_roll_resolved_pending_defender_casualty → ranged_defender_casualty_selection_resolved → ranged_attack`。

门禁记录的冻结输入不变、实验室源不变均为true；Provider0、真实房间修改0。原始冻结输入在构造运行时前独立复制：首次 RED 的 `sourceUnchanged:false` 比较跨越了运行时构造，而构造会附加其能力组合；夹具已改为分别核对原冻结输入及构造完成后的实验室源，没有删除或改写首次失败。

## 证明范围与下一交付物

本次证明一个当前 Native 正向支援反例及其真实支付／恢复／伤亡链，**不是概率期望、三支 Medic 购买数量最优、全部反应时点覆盖或完整对局认证**。此前1395的两支同状态／零攻击实验仍无效，未改写为通过。

下一 P3 交付物是同一查询工具支持模型显式选择反应／pass后的期望损失和资源代价，复用上述适配器与伤害内核，保留同随机样本／同几何并向模型返回可解释的对照。随后实际总体规划作取舍，再完成新鲜产品生成和 P6 中文流程报告。

## 权威恢复状态

- 25979已确认终止，v641日志保存至1431，`requested_observation_boundary`，r8、candidateReady=false、mechanicalBlockers=[]、semanticIssues15、activeWork12。
- v642旧视图消费者修复在磁盘且定点门已通过，未据此声称旧任务已真实消费。
- **本次 Native 结算版本变化，不能把新 runtimeHash 静默套到旧 r8 的冻结回执或恢复其原生分支。** 旧 Run 作为新流程已有证据保留；P3 查询接线完成后由正常产品建立新版本冻结上下文并从头验证，不重新初始化旧真实房间、不恢复 A–F。
- 本次新增 Provider0。此前计费小计仍只到1408；1409–1431尚待汇总，不以0覆盖旧费用。
- T27 5/6、T23 33/36；相关剩余S272/S248/S249/S250共4片；正式Plan0/6、对局0/12。长期目标继续，未完成、未暂停。
