# Ticket 27 / Slice 272 — 从头写表 2000/2000 断点

状态：**合法名单和当前名单地图路线已完成，完整赛前计划未完成**。保留原会话 `iterative-standard-2000-live-v1`，revision 29，`paused`；不是 `ready_for_match`，不得当训练真值或启动带计划正式局。

## 已有实证

- 同一冻结官方 Builder 把原 1190 分候选的完整菜单做有界组合搜索；3440 个菜单路径、4 次完整 Builder 审查得到 4 个恰好 2000 分的合法备选。菜单搜索不进行策略排名，也不声称未找到时数学无解。
- Flash 在第 26 轮选择第一份备选：7 个单位（大 Marine、大 Marauder、小 Goliath、小 Medic、第二支大 Marauder、两支小 Medic），外加 Barracks (Tech Lab)、Armory、Academy、Barracks (Proxy)。权威 Builder 接受，`mineralSpent=2000`，当前候选 Hash `f16ba26a…69b99c3`。
- 第 27–28 轮模型先后提交 `finish`，但继续引用冻结地图 Hash 而非当前军表路线回执。系统按当前名单自动查询一次路线，回执 `3673d35e…ddf248`、`certified`、`unresolvedUnits=[]`。对已知冻结地图 Hash 的指针别名作显式归一化；第 29 轮只重验第 28 轮已付费原答，没有再次调用 Provider，公开计划与原文均保留。
- 第 29 轮最终审查准确保留两项阻塞：`OPENING_ARRIVAL_SCHEDULE_NOT_RULES_AUDITED`、`FULL_ROSTER_PLAN_AND_TEACH_REVIEW_NOT_COMPLETED`。逐回合进场由模型自行选择、Rules 审查；不得把模型的 `arrivalScheduleStatus=unknown` 改写成合法。另需检查现有计划的地图草地“不可站立”断言与得分、单位费用、时点等来源，不能把合法名单等同于高质量计划。
- 累计本会话 23 个已付费回复，报告用量 1,195,594 input + 56,261 output units；按当时价格估算峰时 ¥3.327042、谷时 ¥1.663521，非 Provider 发票。此轮零付费断点重验不增加模型费用。

## 对应工程改动和验证

- `roster-exact-budget-repair-search-v1.mjs` 提供 Builder 认证的精确补表选项；工具端与会话端持久化选项，重启不重复付费或重做已保存回答。
- 会话预取当前合法 2000 分名单的认证路线；只允许已知冻结地图指针别名归一化，原指针标注在决策中。完成尝试若缺逐回合进场和 Teach 则持久化 `paused + finalReview.blockingFindings`，不抛异常丢失已付费返回。
- 聚焦原会话 `--prepare-only=true`：4 个 Builder 精确候选、0 Provider；第 26 轮 Builder 合法 2000；第 29 轮保留原答重验到真实阻塞。聚焦脚本 `verify-ticket-27-slice-272-iterative-session-v1.mjs` 最终通过，旧脚本显式标为 v1 查询顺序；无 Room 变更。

## 下一交付

1. 把第 29 轮合法名单作为不可变候选，让 Agent 逐单位提出首次进场回合，Rules 校验 Standard Supply 增长和全部 7 支单位覆盖，并将计划中的进场文字同步修订。
2. 将迭代历史、完整名单、地图/任务、进场表编成正式 RosterPlan；对得分、位置、对手假设与来源做最终 Teach/一致性审查。High 修复后才可 `ready_for_match`。
3. 与固定成表的赛前计划在相同军表/冻结地图开局，正式跑有计划对局并与无计划局逐动作比较；不可把不同军表的结果冒充 A/B。

## 并行 Ticket 23 / Slice 248

无计划原房间 `20260926182512804` 第 66 动作、第 2 回合 Movement 出现 High `unsafe_provider_result`。最后一次 Provider 返回达到 32768 output units；隔离 Worker 允许 1 MiB 安全输出，外层 Supervisor 却把 JSON 包装后输出限制为 64 KiB，容量失配是已定位的高度可疑原因（原始被拒对象未保留，不能反称已经精确证明是唯一原因）。对齐上限并通过 Provider Supervisor 24/24 聚焦门；历史 High 只可在显式后续运行中忽略，新 High 仍阻断。原房间恢复后已真实推进到第 67 动作，累计 189 calls、估算 ¥26.926245、334 截图；整局仍在运行，不可称完成。
