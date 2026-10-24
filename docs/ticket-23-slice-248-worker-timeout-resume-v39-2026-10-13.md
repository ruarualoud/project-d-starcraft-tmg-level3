# T23 / S248：历史 Worker 超时恢复分类 v39

## 范围与已完成交付

正式 ABC 仍只改变 Terran：A 固定2000表＋开局计划，B 空表开始的 AI2000表＋Teach/review计划，C 与A完全同表、无开局计划。三组完整 Zerg 军表／配置相同，2000分、8条目、52开局模型、14升级，均无独立开局计划。Zerg 的单次 Planner 是对局决策，不是重新写表。权威初始 Envelope 证据保存在 `common-abc-zerg-roster-identity-20261013.private.json`。

v38 已实际修正 B r6 的预测来源反馈，B r7 Apply/Replay 匹配并有截图；随后真实网络失败全部停止。v38r1 网络恢复尝试在调用模型前，被 B 原 r7 的历史 worker-result-timeout 阻挡。不是新的策略失败，也不是重新初始化实验。

## 根因与来源修复

排查假设：共享恢复分类漏项；请求尚未结束；旧/新错误时间判定错。实际 B choice 的最后请求已结算，`provider_failed_after_possible_egress`、safeOutput缺失、usage未知；bot无inflight。19:39:21Z的旧High早于20:20:23Z的新运行，时间方向正确。

来源链：`provider-egress-worker-port-v1.mjs` 超过 result deadline → `PROVIDER_WORKER_RESULT_TIMEOUT` → gateway规范化为 `provider_worker_result_timeout` → driver共享 `isStarcraftTmgHistoricalResumeFindingV1` 漏此类型。唯一产品改动是 `packages/online-agent-session/decision-recovery-policy-v1.mjs` 的共享类型列表；该列表同时用于显式恢复准入与实际 Apply 后的历史问题闭环。不把未知错误一概放行，不清旧 finding，不跳过请求结算/授权/规则检查；本轮新 High仍阻塞。

## 仅本次定点门禁

复用已有门禁，只加具体 bug 模式：

```text
node scripts/verify-ticket-23-captured-stream-failure-resume-policy-v1.mjs --worker-timeout-only <actual-B-r7-capture> <gate>
```

真实 RED36812 在历史恢复分类断言失败；唯一 GREEN37203 通过。捕获材料位于 `build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/worker-timeout-resume-v39/`。覆盖真实已结算停点、来源类型、原 usage未知、显式后续运行允许、未授权/本轮新失败/已解决问题/Rules/身份/commit未知不豁免。0 Provider调用、0房间写；已通过 stream、v36/v37/v38 等门禁未重跑，无全量测试。

## 同版原房恢复

sourceVersion=`s248-v39-historical-worker-timeout-recovery-20261013`，56运行源中仅 recovery-policy 与v38不同。恢复原 A10/B7/C11；相同原房、军表、Plan、骰子、回执、查询、记忆和账保留。Hosts A38450/B38451/C38452，startup38454，于2026-10-12T20:51:58Z启动；实际 Web/monitor 准入与后续动作另记，启动不等于通过完整对局。

当前权威文件：`common-v39-source-manifest.private.json`、`common-v39-startup-config.private.json`、`common-v39-live-process-handles.private.json` 和 `common-v39-independent-monitor-progress.private.json`；最终以真实进程身份、Native状态、封口停止文件及Apply/Replay为准，不用旧progress.running声称在线。

实际20:52:49Z三组Web驱动 A39322/B39323/C39324和独立监控39325启动，原房身份准入成功；20:53:50Z三组 drive-0001均 running、无新High，B已越过此前历史Worker超时入口阻塞。当前仍 A10/B7/C11、R1 Movement；新请求开始不等于已经完成下一动作。

### 费用

### v39 执行后补记／当前 v40

v39真实恢复后 B r8、r9及 C r12至r16已 Apply/Replay；最终封口 Native A10/B9/C16。A连续明确未发送的DNS失败后，Web驱动记录 `SLICE248_COMPLETED_DRIVES_WITHOUT_PROGRESS` High于20:55:33Z；进程失败清理挂起，独立监控仅在PID退出时才检查 failure.json，因此未及时把A的失败扩展到三组全停。任务运行状态与进程存活不能等同。

操作者按出生时间/原房脚本验证后，只向A Host发封口信号，让已有监控停止其余Host并等待当前请求结束；最后两个已封口的挂起Web驱动定点关闭。全部停止21:30:45Z，没有删文件/终止仍在付费执行的worker。来源修复及当前v40恢复见 [失败记录监控修复](ticket-23-slice-248-live-failed-progress-monitor-v40-2026-10-13.md)。

恢复前已知累计估算：A ¥239.928296（5,355,025 units）；B ¥302.227846（5,265,332）；C ¥257.837181（8,922,321）。这些累计费用含更早阶段，units是当前原房已报告usage。各组另有1个可能已出网但无usage的请求，不包含在已知估算中；B另有5个明确未发送请求。分别累计，无硬费用限制、不清账。下一通知 A300／B400／C300。

## 余量与验收边界

T23/S248 33/36，T27/S272 5/6，主线剩 S248/S272/S249/S250，完整有效对局0/12。S272锁表前候选/场景比较仍未交付；20图长目标保持开放。180累计动作保护需触顶前封口同房扩容，不能计为终局。Web SIGTERM挂起是已记录的独立运行债务，本次没有修改它。

harnessLoopUsed=true；targetGames=starcraft-tmg；promptPackRoutes=selfplay_agent_prompt；harnessToolsCalled=原房只读记录/共享恢复分类/正式Web drive；uiTraceEvidence=B r7截图；agentDecisionEvidence=真实预测来源纠正；memoryTraceEvidence=原房记忆保留；trainingTraceCandidates=0；trainingTruth=false。没有刷新官方数据、子代理/K3、删除、提交或重生军表计划。
