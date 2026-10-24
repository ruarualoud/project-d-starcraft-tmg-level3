# Ticket 23 / Slice 248 — 电脑重启后的原房恢复

## 已交付与尚未完成

沿用共享合同版本 `s248-unified-contract-v2-20261010`，不重新初始化实验，不重跑已通过门禁。官方九张地图的**选定配置**保留 9/9 历史验收，不能解读为所有任务、规模或经典图集全部通过。

| 实验 | 本次已完成 | 当前未完成 |
| --- | --- | --- |
| A：固定 2000 分军表 + 地图计划 | 原会话真实模型定点修正，Plan v4 → v5；两条遗留 High 原句均替换，待修文本欠账为 0 | v5 来源终审；原三轮审核上限保留，未擅自开启第四轮，未创建 A 房间 |
| B：从头 2000 分军表 + 地图计划 | 同代码恢复原房；权威 r8、8 个已接受回执，状态 hash 与停点一致；实际网页驱动已启动 | 补录停机前第 8 动作截图/记录后继续原房；不能重复 Apply |
| C：与 A 同军表、无开局计划 | 同代码恢复原房；权威 r7、7 个已接受回执，状态 hash 与停点一致；实际网页驱动已启动 | 已付 Planner 草稿本地重验与下一合法动作；不能盲目重新付费生成 |

本页记录驱动启动，不把启动当成完整对局、回合或恢复后的动作验收。后续结果追加在下文。

### 恢复后的实际进展（15:05:45 UTC 观察快照）

- B 已推进至权威 r12，第 1 回合 Movement；当时 Web 记录 11 条/11 个唯一回执，正在补录最新已提交动作。停机前 r8 回执已补录且仅出现一次，`0049-r008-…-complete-board-applied.png` 已人工视看：完整战桌、任务点、官方地形轮廓及棋子可见。不是再次执行 r8。
- C 已推进至权威 r12，第 1 回合 Movement；Web 12 条/12 个唯一回执、78 张截图。原 r7 后的 Ventral Sacs 决策已通过真实 Preview/Apply/Replay，之后继续结束激活与部署；原非收敛停点已越过。旧 `failure.json` 的时间是 12:12 UTC，不能因文件还在就误报本轮又失败。
- 两组最新异步动作均未返回新的 High；B/C 并行网页驱动继续运行，尚无完整回合或完整终局结论。不要在后续恢复时重新启动一套 driver；先查私有进程记录及当前 Room drive job。
- 此快照累计估算 A ¥96.932027、B ¥147.253304、C ¥129.491639，各 ¥200。模型请求在后台继续，后续以实时账本更新；快照不是结算金额。
- 策略观察留待统一复盘：B 历史 r8 的公开解释将 Creep Spread 与未来 Entry Edge 关联；C 多个动作仍写“无 prior plan”。这是待对照当前 Rules 来源、完整输入与记忆的语义观察，不据一句叙述就判定新工程故障或改提示词。现阶段不改同版代码、不中断其余合法动作。

完整机器快照：`build/ticket-23-three-arm-performance-baseline-20261010-v1/post-reboot-original-room-progress.private.json`。截图、公开决策、Plan 修订、查询引用及真实骰子结果仍在各原房目录，未存隐藏思维链。

## 重启恢复与启动故障说明

1. 用户实际重启后，重新只读定位本项目进程，原 PID 不再作为恢复依据。保留原 SQLite 房间、席位存储、付费结果和地图冻结。
2. 更新共享 Viewer 合同后，旧网页包确实过期；因此只构建受影响的 Web 包一次，而不是重跑全量测试或地图验收。
3. 重启前导出包装器的 `node --eval` 参数被 Metro 子进程继承，导致重复导出启动。已清空 `process.execArgv` 后启动正确包装器，`--max-workers=2`；重启后的唯一构建成功、exit 0，14 个网页路由落盘。未用旧包改时间戳冒充新包。
4. 新 Web 包位于 `build/ticket-23-three-arm-performance-baseline-20261010-v1/web-export-unified-contract-v2`；B/C 都加载这一包及同一工作树生产代码。版本清单仅作来源记录，不新增每动作哈希门。
5. A 修正 POST 的观察调用超时，**未重发**。原持久化文件和服务 GET 均证实请求完成、真实模型回执存在。
6. 观察接口重置使新 B/C 空闲主机的临时入口句柄丢失。确认无运行中的付费动作后，仅优雅关闭这两个新空闲主机，再恢复**同一原房**；不删除、回滚或重放动作。之后把主机/驱动 stdout、stderr 直接写入私有文件，入口不再仅依赖观察会话内存。

## A 实际修正

原会话：`rws-09092083-98b5-4f52-b9b1-1cd1cb759112`。

生产端 `POST /sessions/:id/revise` 只要求修正两条欠账，并保留 Rules 审核过的军表、任务/地图绑定、入场表和得分计划。不改策略奖励、不追加来源审查。

- `deploymentConcept.threatTradeText`：删除“只读查询证据为空”的错误句，明确存在认证地图路径审计，但没有火力交换/攻击估算，伤亡和交换结果仍未知。
- `componentPurposes.player1-medic-upgrade-1`：将“保证 Marine 存活且下一回合控点”改为有条件的支援意图；没有治疗、战斗和控制算术时不能保证结果。

真实输出节选：

> This is a conditional planning intent, not a guarantee that the Marine survives or still controls the marker next round.

生产修正回执：两个请求路径均在 `replacedClaimPaths`，`unchangedRequestedClaimPaths`、`highClaimPathsNotRequested` 均为空；`rosterAndScheduleUnchanged=true`，`semanticReviewStillRequired=true`。完整军表、入场表、preset binding 与 v4 原样相同。

Plan v5 hash：`45d7093148c370c1e3d27b284fbdc2583a1b37cfb1a739b37e3c0ba0425c7811`。来源审核仍是三轮，旧审核变为 stale；**文本已修不等于新版已终审通过**。

私有证据：`build/ticket-23-three-arm-performance-baseline-20261010-v1/A/plan-v5-reboot-repair-result.private.json`。不向公开报告复制入口凭证、密钥或房间私有数据。

## 费用与性能口径

本次 A 新增 1 次 Flash 调用：输入 19,676、输出 910、合计 20,586 units；模型回执延迟 16.674 秒，新增保守估算 ¥0.027979。A 累计约 ¥96.932027；B/C 启动前累计 ¥144.798322 / ¥127.640253，各组预算 ¥200，旧未知费用预留不清零。

B/C 已打开房间的预算上限仍为 ¥58.297842 / ¥75.720196，不再次减去已消费费用。恢复时 Provider 账本分别为 18 次 / ¥3.096164、19 次 / ¥3.360450；启动与重绑定没有新模型调用。

网页构建、冷恢复、观察接口恢复均是本次维护耗时，不能冒充正常单动作耗时。后续记录真实 Planner/查询/Preview/Apply/Replay 及单回合时间，沿用已采用的性能基线，不重跑旧性能 case。

## 剩余交付物

1. S248：B 第 8 动作补录、C 已付草稿实际重验、A 新版终审授权；随后同代码三组完整对局及逐动作截图/回执。
2. S272：固定表/从头表的两类计划与无计划对照，军表分数、地图理解及运行时计划延续的综合结果。
3. S249：统一分析真实决策与工程缺陷，明确证据、来源和纠错结果。
4. S250：复盘实验及 Skill 修改前后策略效果证明。

计数保持：T23 **33/36**、T27 **5/6**；上述 4 片未收口。新 12 实验已启动 2/12、完整终局 0/12；旧完整对局 0/3。不把合同修复、计划修正或驱动启动加成完局。

## Harness 记录

- harnessLoopUsed: true；targetGames: StarCraft TMG。
- promptPackRoutes: roster revision / selfplay agent；修正依据来自 retained source-claim backlog，不注入策略评分。
- harnessToolsCalled: 原计划 revise/read、原 Room manifest、实际网页续跑；后续驱动经过原 LegalSpace/Preview/Apply/Replay。
- uiTraceEvidence: 使用新版真实网页；逐动作证据保存在原房 `screenshots` 和 `actions.ndjson`，启动不能当截图已验收。
- agentDecisionEvidence: A 真实付费修正回执；B/C 保留原公共 Plan/意图/预测/骰子轨迹。
- memoryTraceEvidence: 原房和席位记忆存储保留，不重建或混用实验组。
- trainingTraceCandidates: trainingTruth=false；未将修正产物或未完局轨迹升级为训练数据。
- rollbackOrDemotionRules: 新 Critical/High 独立停机、保留现场和未知费用；不回滚已接受动作、不重复付款；Medium 记录继续。
- userVisibleChecks: 房间身份、原停点、真实动作与截图；不以状态字段齐全冒充完整可玩。
