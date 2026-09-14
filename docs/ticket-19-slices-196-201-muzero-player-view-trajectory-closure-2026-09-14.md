# Ticket 19 · MuZero 玩家视角轨迹关闭记录

日期：2026-09-14  
状态：完成（6/6）  
项目进度：19/22 Tickets

## 已交付

- `player-view-trajectory-v1` 从 RoomStore 初始 Envelope 与全部已接受 Transition
  Receipt 逐步确定性重放，在每一步重新生成当时行动席位的 Viewer V3 与
  LegalSpace。内容哈希只作身份和谱系；数据、规则、动作空间三类版本独立管理，
  不允许静默升级，旧版本缺依赖时隔离并保留旧规则展示。
- Reward Vector 只从权威前后状态、事件与终局事实计算；不可得事实为 `null`，
  不伪装成 0。标量化权重有版本；value 从每一步 `toPlay` 视角计算；机会结果只在
  动作后目标侧出现。
- 有限动作完整列出；参数化动作保留 Domain、约束、规范实参与路径。Sampled-
  MuZero 明确“未采样参数动作不等于非法”，未知行为概率保持 unknown，行为策略与
  搜索策略分离。
- 循环状态同时绑定上一全局 Step、上一次本席决策、同席公开日志增量，以及
  Continuity/TurnPlan/ActionIntent 哈希；不加入全知 Critic 状态。
- Governance 扫描 API Key/Seat credential、对手私有状态、未来目标与越界历史；
  仅 Critical/High 阻止集成。技术资格与独立人工训练批准分离；五个 family 轴阻止
  train/validation/test 穿越。Reanalysis 只能新建 policy/value 目标版本，不能改写
  观察、动作、规则、机会或历史轨迹。
- NDJSON、Sampled-MuZero、RLDS 三种格式均保留 lossless 原 Step 并回到同一规范
  哈希。Parquet Adapter 仅在真实 PyArrow 可用时开放；当前环境没有 PyArrow，
  所以没有 JSON 冒充的 `.parquet`。

## 最终实际轨迹

最终证据来自 Ticket 20 同一有界 Marine vs Zergling A-A Harness 家族：

- 第 8 个动作在原子边界暂停，player2 Seat 重连后同局续跑；
- 80 个权威动作终局，player1 50、player2 30，最终 4:4；
- 80/80 Step 绑定三份精确版本 Skill，4 个 Step 使用权威机会回执；
- 78 个 Step 绑定此前同席决策，最终 Replay 与当前 Room 一致；
- 泄漏发现 0；技术资格通过；自动晋升 false；模型/Provider 调用 0；
- 唯一资格缺口是独立训练批准，因此该轨迹只是开发候选，不是训练真值。

产物目录：
`build/ticket-19-slice-201-actual-terminal-trajectory-v1/`，包含原轨迹、NDJSON、
MuZero、RLDS、泄漏审计、资格评估、Split Manifest 与聚合报告。

## 验证收据

- Slice 196：`build/ticket-19-slice-196-player-view-trajectory-v1/report.json`
- Slice 197：`build/ticket-19-slice-197-reward-targets-v1/report.json`
- Slice 198：`build/ticket-19-slice-198-sampled-action-recurrent-v1/report.json`
- Slice 199：`build/ticket-19-slice-199-training-governance-v1/report.json`
- Slice 200：`build/ticket-19-slice-200-training-export-v1/report.json`
- Slice 201：`build/ticket-19-slice-201-actual-terminal-trajectory-v1/report.json`

## 不作出的声明

本 Ticket 没有训练 MuZero、没有证明任意军表策略强度、没有把开发局自动发布为
数据集，也没有因为技术门通过而自行授予训练资格。
