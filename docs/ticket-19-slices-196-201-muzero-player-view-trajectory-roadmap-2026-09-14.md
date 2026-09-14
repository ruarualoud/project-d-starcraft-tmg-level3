# Ticket 19 · Slices 196–201 · MuZero 玩家视角轨迹路线图

日期：2026-09-14  
状态：完成（6/6）  
前置：Ticket 11 权威规则器、Ticket 18 正式基础 Skill、Ticket 20 完整 A-A 终局均已具备。

## 目标

把权威 Room 的初始 Envelope 与按序接受的 Transition Receipt 编译为可重放、
玩家视角、无未来信息泄漏的 Step/Episode；保留离散与参数化动作、规则事实奖励、
机会结果和循环状态，并提供无损 NDJSON、Sampled-MuZero 与 RLDS 兼容导出。
本 Ticket 不训练模型，也不自行赋予任何轨迹 `trainingTruth`。

## 设计边界

- 事实源只有权威初始状态、已签名 Transition Receipt 及确定性重放结果；Agent
  解释、对局后总结和 LLM 评分不能生成奖励或改写历史动作。
- 每个 Step 的 Actor Input 只包含该动作发生前、该席位当时可见的 Viewer V3
  投影、公开历史前缀、LegalSpace 和可选的已绑定同局计划/记忆引用。
- 内容哈希只用于身份、去重和谱系证明，不作为“代码一变就拒绝旧轨迹”的兼容门。
  兼容性由数据版本、规则版本和动作空间版本三类显式合同决定。
- 参数化动作保留完整 Domain 与实参；没有被采样的参数化动作不能被标记为非法。
- 技术可用、数据集划分、人工训练批准互相独立；所有本 Ticket 产物默认
  `eligibleForTraining=false`、`trainingTruth=false`。

## 六个交付切片

| Slice | 具体交付物 | 单次对应验证 |
| --- | --- | --- |
| 196 | `player-view-trajectory-v1` 深模块：Room replay source → 玩家视角 Step/Episode；绑定三类版本与重放谱系 | 多步双席轨迹可由原始权威日志重建，观察与动作严格按 revision 对齐 |
| 197 | 规则事实 Reward Vector、标量化策略、terminal value/discount/chance lineage | 非终局、终局胜负、无可得事实为 null、机会回执绑定 |
| 198 | 有限/参数 Domain/Sampled-MuZero 动作编码与 recurrent state | 参数动作无损重建、未知行为概率保持 unknown、循环前缀可恢复 |
| 199 | 私有/未来泄漏审计、技术资格和按 run/seed/mirror/roster/opponent 分组切分 | 故意泄漏被拒绝，跨集合 family 泄漏被拒绝，独立批准仍缺失 |
| 200 | NDJSON、MuZero、RLDS 无损导出/导入；Parquet 只在真实 PyArrow 可用时开放 | 三种必需格式回读到同一轨迹身份，伪 Parquet 不存在 |
| 201 | 由 Ticket 20 已闭合 A-A 终局实际生产开发轨迹，聚合验收报告 | 完整终局、双席、80 个权威动作、导出回读、泄漏/资格报告与训练边界 |

## 完成定义

六片均完成后 Ticket 19 才关闭。Slice 201 的实际开发轨迹仍只是候选数据：必须在
未来独立训练审批、数据集版本发布和保留集审查后，才可进入学习器。

## 关闭结果

2026-09-14，Slices 196–201 全部完成。最终 A-A 开发对局在第 8 个动作暂停并恢复
player2 Seat，随后以 80 个权威动作、4:4 终局；最终 Room Replay 与当前状态一致。
轨迹 `cea6696b…794a` 有 80 个玩家视角 Step、每步三份带版本策略 Skill、4 个机会
步骤、78 个重复席位循环前缀；私有/未来/凭证泄漏发现为 0。NDJSON、
Sampled-MuZero、RLDS 均无损回读；PyArrow 不可用，故没有生成伪 Parquet。
技术资格通过，但独立训练批准缺失，`eligibleForTraining=false`。

聚合收据：
`build/ticket-19-slice-201-actual-terminal-trajectory-v1/report.json`。
