# Ticket 23 / Slice 248 — A 无计划局原房续跑与传输停点

恢复的是原 v4 版本分支 `build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260926182512804-zvqoXv-84EeTL-PHj3DF`，没有重新初始化房间或重做已接受动作。Web/Room 从 22 个已接受动作推进到 23 个，当前权威状态修订 r24、第 4 回合 Movement，最新接受动作 Hydralisk `use_active_ability`；其规则 Apply/Replay 与逐动作截图在原 `actions.ndjson`、`progress.json`、`screenshots/0143-r024-player2-use_active_ability-applied.png` 等。此次行动公开计划及用途可用于后续 S249 分析，不能据此证明整局或高策略。

下一个 player2 决策在 Provider 传输阶段出现 `provider_transport_failed` High，runner 已以 exit 1 停止；`failure.json` 和 `screenshots/0149-runner-visible-failure.png` 保留现场。只读查其 provider-attempts.sqlite：最新 attempt 为 `failed`，`usage_known=0`、`provider_may_have_been_called=1`、已 dispatch/settle；因此不把这次调用计为免费，也不盲目重发或重启原房。不是规则 Apply 失败，当前无待提交动作。

A 分支此次窗口到 38 个已登记模型调用、5,815,772 reported units；分支自身保守估费 ¥7.551907，加冻结源房为 ¥80.982712，自 A 独立报告基线 ¥68.216123 起新增估费 ¥12.766589，另有一次用量未知的可能已发送失败。仍未达单线新增 ¥100 通知阈值；B/C/D/E 费用未并入 A。完整 A/B 对照与策略复盘尚未完成。

## 2026-09-30 同房显式恢复：r25–r26，仍在运行

从同一目录显式 `--resume-directory` 恢复，服务使用历史失败的类型化重试入口；先前可能出网但用量未知的记录没有清除，也没有新建 Room。原房 r24→r25：player2 Hydralisk `resolve_characteristic_status_ability` 选择免费 `Lie in Wait / Burrowed`，权威回执 `da00ae6e…c5039319`，Replay 一致，[r25 完整战桌](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260926182512804-zvqoXv-84EeTL-PHj3DF/screenshots/0155-r025-player2-resolve_characteristic_status_ability-complete-board-applied.png)。其后 r25→r26：同单位 `finish_activation`，回执 `b231be02…6ad3e8`，Replay 一致，[r26 完整战桌](../build/ticket-23-slice-248-versioned-charge-room-forks-v1/20260926182512804-zvqoXv-84EeTL-PHj3DF/screenshots/0161-r026-player2-finish_activation-complete-board-applied.png)。仍为第 4 回合 Movement、player2；runner 继续，不能宣称完整局。

截至 r26 的同一费用窗口为 **47 已登记模型调用、估费新增 ¥14.623315**，旧用量未知失败单列；未达到 A 自己的 ¥100 提醒线，B/C/D/E 独立。r25 动作本身用了 8 次调用／1,169,469 输入＋21,029 输出 units；r26 `finish_activation` 用了 5 次／690,897 输入＋21,060 输出 units。独立 Provider attempt 数据显示，在动作级 `progress.json` 超过 519 秒未更新期间，确有多轮已结算模型请求；因此不能把动作延迟全归于本地计算。一次短进程采样落在 JSON 解析，但样本不足以定量归因。保留为性能诊断候选，不在运行中删减策略信息或将有选择权的行动自动化。`trainingTruth=false`，A/B 同表完整对照仍缺。
