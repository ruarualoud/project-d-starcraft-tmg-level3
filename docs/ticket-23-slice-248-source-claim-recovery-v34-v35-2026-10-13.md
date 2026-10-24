# T23 / S248：C 修复、B 语义校验修复与最新停点

## 当前结论

C 原 r5 阻塞已修复：规则没有改、没有放行真实资源错误。本地重验原付费 Planner 后，正常 Action/Preview/Apply/Replay 完成 r6；截图和回执已保存。之后 C 又推进到 Native r9。

B 房间 r6 的 Planner 身份误判也已修复并复用原付费回复。随后 player2 的 Action 出现真实 Ventral Sacs/Omega Network 效果混用，三轮纠错未收敛。监控同步停止三组，最终 Native A8/B6/C9，全部仍第 1 回合 Movement；不是完整对局。

## C 原阻塞：否定范围绑定错

实际付费原句：`Omega Network costs zero Biomass and does not exhaust any resource card beyond the faction card.`

当前 Rules 候选明确：sourceInstanceId=`faction:player2`，sourceCardExhaustedOnCommit=true。原句说“不消耗势力卡之外的卡”，并未说“不消耗势力卡”。旧校验只抓否定词，就错误产生 `source_card:not_exhausted->exhausted`；两次模型纠错也不能消除这条工程误判。

修复：否定必须绑定选中动作、实际卡对象和例外范围；beyond/except/other than/apart from/中文除…以外，以及 other/additional card 与来源卡分开。每个子句独立检查，仍拒绝明确声称来源卡不耗、错误例外卡等真实矛盾。该语义检查不是完整自然语言证明。

只修改产品文件 `packages/online-agent-session/live-flash-decision-port-v1.mjs`，既有资源门禁新增仅针对本例的入口。

- RED PID66363，实际原记录复现。
- GREEN PID68137，28 项，仅跑一次，0 Provider/0 Room writes；没有重跑历史已通过模式。
- 回执目录：`build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/source-card-exception-v34/`。
- v34 source：`s248-v34-source-card-exception-scope-20261013`，归一化 Action v58 / Planner v36。

正常产品恢复后，原 choice 的 Planner 出现 `LOCAL_PLANNER_OUTPUT_REVALIDATION`，未重生成 Planner；只新调用一次 Action。实际 r6 `use_active_ability` / Omega Network，receipt `30ac8377068766ec54122ada3047f28f31ef5175b593281f3189640410207847`，replayMatchesCurrent=true，旧 High 已标 resolved。

实际网页棋盘证据：

![C r6 完整棋盘](../build/ticket-23-slice-248-standard-2000-aa-live-v1/query-v33-clean-C-20261013-v1/screenshots/0041-r006-player2-use_active_ability-complete-board-applied.png)

截图仅证明本次执行与可视回执，不代表虫道后续策略有效或已经完成完整对局。

## B Planner 新阻塞：提到已有虫道≠召唤虫道

模型正确选择 Ventral Sacs / reserve_deploy_indicator。当前目标为放置 Faction Indicator，同时 `while keeping Kerrigan and the Omega Worm safe`。旧效果词校验把 establish…keeping…Omega Worm 整段当作生成虫道。

修复在同一个产品源：结果动词与效果对象之间如果已转为 keep/protect/preserve/defend 等保护语义，不能把已有对象当作本次产物；后续真实 place/create/summon 及被动生成语句仍独立拒绝。中文保护/保留等同样处理。没有修改模型原句、策略偏好或候选 ID。

- 既有身份门禁只增加 `--existing-asset-reference-only`。
- RED PID84845，实际 B r6 原句复现。
- GREEN PID85817，26 项，唯一一次，0 Provider/0 Room writes；不跑已通过的 C 门或历史身份模式。
- 回执目录：`query-contract-audit-v30/existing-asset-reference-v35/`。
- v35 source：`s248-v35-existing-asset-reference-scope-20261013`，Action v59 / Planner v37；56 生产源清单只这一产品源发生变化。

v35 初次启动时我误用了不存在的环境变量名，A 无法读取已有 Plan session。启动观察器自动收尾；没有发出新写表/计划生成。纠正为宿主支持的 `STARCRAFT_TMG_ROSTER_PLAN_DATA_DIRECTORY` / `TICKET27_S271_FIXTURE_ROOT` 后启动成功；失败记录和修正记录均保留，没有重置房间。

B 正常恢复记录证明原 Planner 已本地重验通过，准备了 8 个合法素材放置选项，进入 Action；不是重复付费重生成 Planner。

## 最新真实阻塞：B 对手 Action 的效果仍写错

player2 选 Ventral Sacs，但最终 Action `intent.expectedOwnOutcome` 仍声称 Faction Indicator 是 Source of Creep，且在以后回合变成 Ground reserves 的 Entry Edge。选中合同的真实内容是：放置势力指示物；在 End of Round 可让一支 Ground reserve Unit 与指示物底盘接触部署。它不是 Omega Network 的永久虫道效果。

这不是候选 ID 串线、网络错误或旧模型名记录问题。实际反馈三次均为：`ACTION_SELECTED_ACTION_IDENTITY_CONTRADICTED:intent.expectedOwnOutcome:omega_network->reserve_deploy_indicator`。最后回复的 expectedEffects 数组已出现正确 End-of-Round 部署描述，但 expectedOwnOutcome 仍保留错误叙述：局部纠错没有在这些同义字段间闭环。

校验这一次应当拒绝，不能把新误判修复变成真实效果错误的豁免。Action 三轮后没有盲目加轮，保留停点；下一交付应从纠错消息与跨字段来源绑定修复，而非再增加相同的泛化重试。该停点发生在 B 房间的 Zerg 对手，不能据此断言 B 的 Terran 开局 Plan 生成失败。

## 恢复点、费用和剩余工作

全部保留原 query-v33-clean 房间、军表、开局 Plan、记忆、骰子及账单；没有从头重跑。v34/v35 为同房正确性恢复，不是新性能版本准入。

最新 sealed Native（观察器 progress 可能落后一动作）：

| 组 | Native revision | 开局条件 | 当前状态 |
|---|---|---|---|
| A | 8 | 固定表 + 新审核 Plan c5eead06… | 同步工程停止 |
| B | 6 | 从零新表 + 新审核 Plan a6204f7c… | player2 Action 真实效果混用，三轮未收敛 |
| C | 9 | 与 A 完全相同固定表，无开局 Plan | 原问题已修复，随 B 同步工程停止 |

原房在 `build/ticket-23-slice-248-standard-2000-aa-live-v1/query-v33-clean-{A,B,C}-20261013-v1`；最后停点观察在控制目录 `common-v35-sealed-stop-observation.private.json`。当时 Host88396/88397/88398 与网页驱动/monitor均已停止，不能用残留 progress.running 推断仍在运行。

最后独立 monitor 费用快照（估算，非最终服务商账单，停机期间可能有额外在途结算）：A累计¥237.575444、B¥300.870452、C¥252.794917；B跨¥300提醒已向用户报告。没有费用硬上限。生产账本确认 A 为25次/3,113,575units/估¥4.193948，纠正了旧 v33 文档的两项人工计数；新 B 生产19次/3,212,046units/估¥4.048010，未因本次比较重新生成。

交付与顺序：

1. 已完成 C 来源卡语义修复、聚焦 RED/GREEN 与正常网页 r6 执行证据。
2. 已完成 B Planner 的已有对象误判修复、聚焦 RED/GREEN 与正常本地付费回复复用。
3. 已完成新旧 B 军表/计划/原因比较，见 [对比报告](ticket-27-slice-272-fresh-b-roster-plan-comparison-2026-10-13.md)。
4. 未完成：B 对手 Action 跨字段效果纠错闭环，修复后才能同版同房续跑。
5. 仍需在累计180动作之前修复实验动作保护上限，不能把该保护耗尽当作终局。
6. 完整对局、两类计划策略效果、其余实验矩阵与复盘未完成；T23 33/36、T27 5/6，剩 S248/S272/S249/S250，完整0/12，地图全20目标仍打开。

最终 diff 范围：1 个产品源、2 个既有验证脚本的定点入口、2 份报告、旧 v33 计数纠正、CURRENT_WORK 与根 TASKS/PROJECT_MEMORY 的窄幅记录。无子代理/K3、安装、官方数据刷新、磁盘删除、提交或全量测试。
