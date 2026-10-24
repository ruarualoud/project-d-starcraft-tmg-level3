# P5：磁盘回收与原子写入失败清理

## 本轮交付与边界

Ticket 27 / Slice 272 / P5。用户批准扩大清理后恢复开发。本轮没有重启旧 A–F、对局或新生成 Run，没有手改模型原文或已付费回复。

1. 精确清理176项，实测可用空间从1,215,848,448增加到3,267,653,632字节，增加2,051,805,184字节（1.91GiB）。统计时其他进程也可能改变磁盘；删除文件独占块估计2,051,190,784字节，与实测接近。
2. 132个旧状态日志、7个历史Run轮询文件、20个未提交原子写入残片、1份旧网页导出、5份旧单测副本、11个旧地图测试数据库。完整路径及原因见[清理清单](ticket-27-slice-272-disk-cleanup-2026-10-21.json)。硬链接不重复计可释放容量。
3. 原始模型请求/回复、费用、正式状态、报告、截图、地图源配置均保留。当前workflow、正式draft、任务输入和待重验reply四个关键文件SHA256前后一致。正式九图与最新Daybreak/LostTemple验收库保留；正在被网页服务使用的export-r2未删。当前Run未提交checkpoint临时文件暂保留，未混作恢复点。
4. 被删旧日志与临时状态不能保证逐字节恢复。导出和测试可重新生成，但不承诺旧随机密钥、签名或时间戳相同。重现旧地图测试前应重新生成对应测试数据库，不能照旧恢复指针声称原数据库仍在。

## 来源修复

实际ENOSPC留下27,206,755字节checkpoint临时文件，正式workflow仍可读。当前store的save/put在writeFile或rename失败后缺少清理。

候选原因：异常清理缺失；仅rename失败；正式checkpoint损坏。当前代码与四种最小故障复现支持第一项，正式checkpoint读取正常。修改同一原子发布助手：写入和rename失败时仅尝试移除该次临时路径，保留原错误，绝不删正式checkpoint或不可变原件；exclusive create的EEXIST不获得临时文件所有权。清理自身失败时仍报告原始故障，不承诺磁盘不可写时自动成功。

仅修改`packages/roster-planning-workspace/roster-decision-workflow-store-v1.mjs`。没有改历史iterative存储器、提示词、模型、军表、策略或规则。

## 唯一定点验证

`node scripts/verify-slice272-storage-failure-v794.mjs`

- 一次RED：checkpoint写入、checkpoint重命名、payload写入、payload重命名四项均留下一个临时文件。
- 修改后一次GREEN：4/4；原错误对象、旧checkpoint、付费原件保留，只清理本次临时文件。
- 独立子进程内存文件系统注入；真实磁盘写入0，Provider0，生产状态写入0。没有重跑v792/v793或其他已通过门。
- 这证明存储故障处理，不证明Plan完成或全流程策略收敛。

## 实际恢复

恢复点原`slice272-product-generation-v645-lqMWaS`，`decision-fb3dd470-df44-4789-9fa7-d30ff4678c6c`，r3/e5614/w557；恢复前0running/0pending。已有mixed_citation_read_handoff授权保存，不再追加授权，不重买已成功回复。

PID85853，`build/slice272-product-generation-v794-storage-recovery.log`。启动已确认存活，`roomReinitialized:false`；后续实际消费与最终发布需要继续观察，不用启动日志代替成功。正式军表1490分、余510；最终Plan0/6，游戏0/12，T27 5/6、T23 33/36，剩余S272/S248/S249/S250四片。

## Harness观察边界

- harnessLoopUsed: true
- targetGames: StarCraft TMG
- promptPackRoutes: 原roster_workflow_strategy_decision，不修改
- harnessToolsCalled: 同产品workflow/run和workflow状态接口；存储save/put/get/load
- uiTraceEvidence: 本轮无新浏览器验收；正在服务的旧导出保留
- agentDecisionEvidence: 原回复重验待继续观察，不人工代写结论
- memoryTraceEvidence: workflow和引用原件指纹不变，历史账保留
- trainingTraceCandidates: 无新增正式训练批准
- rollbackOrDemotionRules: 正式断点/付费原件有变或失败错误被吞则不得加载；本轮定点门已通过
- userVisibleChecks: 清理后空间恢复，原运行可以启动；完整军表Plan仍待验收
