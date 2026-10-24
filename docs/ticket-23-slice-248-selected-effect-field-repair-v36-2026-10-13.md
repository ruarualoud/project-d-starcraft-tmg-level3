# T23 / S248：选中效果逐字段纠错 v36

## 已确认的原因

B 的 r6 停在 player2 对手 Action，不是 Terran 的写表/开局 Plan。选中候选和来源卡正确：Ventral Sacs / player2-tactical-4 / reserve_deploy_indicator。模型却将其指示物描述成非占点 Structure、Source of Creep、后续回合 Entry Edge；这些来自另一能力，不是选中效果。

原始三轮反馈确已进入 continuation，但只有 `intent.expectedOwnOutcome:omega_network->reserve_deploy_indicator` 内部错误码，没有错误原句和选中效果来源。第三次回复的 expectedEffects 已正确，expectedOwnOutcome 仍错误。

上游 accepted Planner 的 publicPlanSummary.calculations.1 也明确包含错误属性。原检查没有覆盖这个字段，也没有识别“选中指示物 becomes 某属性”的效果归属，导致 Action 继承错误。不是单纯请求不通、模型名记录不一致或 B 军表错误。

## 改动与边界

唯一产品源：`packages/online-agent-session/live-flash-decision-port-v1.mjs`。

- Planner 计算字段与 Action expectedEffects 数组使用已有选中能力身份检查；属性归属绑定实际选中 asset，不把保护/靠近已有虫道当作召唤。
- 所有已发现矛盾一起输出：字段路径、模型原句、错误效果、候选/来源卡及其即时/延迟 effectContract。提示需要协调整个提交对象，不是仅改一个数组。
- 已耗尽 Action 若受错误 accepted Planner 驱动，只有同权威、显式批准、合同实际升级时才可一次回到 Planner。原付费内容、查询、三轮失败史不改。
- 使用既有 prompt-repair 窗口重建实际原始 Planner 的纠错上下文；保留旧 Action 纠错历史。该来源修复窗口最多允许一次新语义失败，失败即停止，不能靠改版本无限续重试。
- 不手写模型策略，不更改规则或自动放行真实错效，不注入军表/战斗策略评分。

Action normalization v60 / Planner v38；native prompt policy v49 / JSON v50。

## 本次唯一验证

```text
node scripts/verify-ticket-23-slice-248-captured-correction-feedback-v1.mjs --selected-effect-only --run-directory=<原B目录> --report=<v36/gate.private.json>
```

真实 B r6 捕获，RED PID21898（缺少逐字段来源），修后唯一 GREEN PID23553。检验错误仍拒绝、上游计算检查、来源反馈、原支付答/查询/三轮历史保存、单次恢复限制及给下一轮 Planner 的 JSON 纠错上下文。0 Provider 调用，0真实房间写。未重跑已有 C70、来源卡例外、保护已有虫道或全量验证。

此门禁只证明具体工程修复，不证明模型生产收敛或实战策略提升。实际 Provider、Apply/Replay 与截图另行观察。

## 原房同版续跑

2026-10-12T17:39Z 启动同版正常 Hosts：A24699 / B24701 / C24700；既有 owned startup24703 等待正常房间入口后启动 Web 驱动及独立监控。原 `query-v33-clean-{A,B,C}-20261013-v1` 保留，恢复点 A8/B6/C9；未重建军表、开局 Plan、房间或旧账。

56文件运行清单相对 v35 只有上述产品源改变。版本 `s248-v36-selected-effect-field-repair-20261013`；配置/实际进程/监控以 `common-v36-*` 为准，旧 progress.running 不是存活证据。

本次启动待实际纠错与 Apply/Replay 观察；完整对局0/12，T23 33/36 / T27 5/6，主线余 S248/S272/S249/S250。180累计动作保护仍须触顶前同房扩容，不能作终局。

## B 写表因果结论（已完成只读分析）

详见 [新旧军表/计划与差异原因](ticket-27-slice-272-fresh-b-roster-plan-comparison-2026-10-13.md)。确定链路是初稿多80分升级 → 余额1080/1000 → 不同合法补满候选 → 模型选择旧2/新1。新占点/火力工具只在锁表后 Teach 调用，不能称它直接改变初始军表。最初升级偏好没有单变量隔离，仍未知；满预算工具不做策略排名。S272 的有界候选/假设场景比较机会仍待补。

## Harness 留痕

harnessLoopUsed=true；targetGames=starcraft-tmg；promptPackRoutes=selfplay_agent_prompt。本轮检查 Rules 候选、模型公开决定、纠错 continuation、同房恢复工具。没有隐藏思维链、训练推广、规则数据刷新、子代理/K3、新开局或提交。trainingTruth=false；若错误效果仍未纠正或 Native Apply/Replay 不一致，监控同版三组全停，保留权威恢复点，不能把门禁通过当作对局通过。

## v36 实际结果与 v37 动作归属修复

v36 实际发出一次新的 Planner，已经纠正菌毯源/后续入口混用，明确选中效果为 Faction Indicator 及回合结束进场。但恢复器随后重放了新 Planner 之前的旧失败 Action，使它占用新的纠错窗口；这不是新模型又生成了相同错误。三组同步停止，权威停点 A9/B6/C10。

v37 在同一产品源中将 Action 本地重验绑定到当前已接受 Planner 的实际 attemptKey；新 Planner 之前的旧 Action 不得当作当前回答重放。只允许一次清除这个错误重放占用的窗口，保留所有原付费回复、查询和错误历史；真正的新 Action 错误仍按窗口计数。Action normalization v61，Planner v38，提示策略仍 v49/native 与 v50/JSON。

既有门禁增加 `--superseded-action-only` 捕获模式，读取真实 v36 停点。RED PID31402 → 唯一 GREEN PID33241：旧 Action 不可重放、新 Action 可重放、同权威/一次修复、付费答与反馈保留。0 Provider 调用、0 房间写；没有重跑已经通过的 v36 门禁或其他旧绿。证据位于 `query-contract-audit-v30/superseded-action-replay-v37/`。

2026-10-12T17:49:17.849Z 原三房同版续跑，版本 `s248-v37-current-planner-action-replay-20261013`。B 保留已纠正的付费 Planner，实际发出一条新 Action；其公开效果句正确描述 Ventral Sacs：指示物须离敌方模型超过 10 寸，回合结束一个 Ground reserve 单位可与其底盘接触进场。

新 Action 随后触发另一条 High：`ACTION_OPPONENT_PREDICTION_LIFECYCLE_CONTRADICTED`，Marine 1 的预测射击目标不在本回合火力带内。尚未确认这是预测合同误拦还是模型真实误判，不能盲重试或宣称 B 已执行成功。当前修复证明选中效果已经在真实回答中纠正，但 B 仍没有 Apply/Replay 通过。

## 当前权威恢复状态（替代上文启动时观察）

- 三组已于 2026-10-12T17:50:11Z 同步停；17:53:15.225Z 确认关闭。权威 Native 停点 A10/B6/C11，均第 1 回合 Movement，原房/军表/Plan/骰子/历史/费用不变。
- 两个驱动在 SIGTERM 清理后仍挂住；只核对精确 PID、启动时刻及完整命令后停止本次 A35418/C35420，没有删文件、改房间或关闭其他任务。记录 `common-v37-lingering-driver-close.private.json`。
- 最终已结算的当前房间用量：A23次/4,490,237 units/估 ¥5.630231；B26次/4,693,898/估 ¥5.896017；C40次/7,991,967/估 ¥9.822888。含历史累计分别 ¥238.771437 / ¥301.415704 / ¥256.589901，旧账不清零，无硬上限。证据 `common-v37-final-settled-usage.private.json`。
- 下一交付：定位这条预测 High 的实际原句、场景与查询结论，确定具体来源后只做对应修复/门禁；随后三组同版原房恢复，不重新生成军表或开局 Plan。
- ABC 的 Zerg 完整军表和配置已实际证明完全一致、均无独立开局 Plan；B 的当前问题是对手单步行动，不是 Zerg 写表。详见 [实验变量核对](ticket-27-slice-272-fresh-b-roster-plan-comparison-2026-10-13.md#abc-的变量是-terran不是-zerg)。
- T23 33/36、T27 5/6，主线余 S248/S272/S249/S250，完整对局仍 0/12。全 20 图目标仍未关闭，无提交/删除/数据刷新/子代理/K3。
