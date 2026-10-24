# T23 / S248 — 来源卡资源纠错反馈与原房恢复 v76

当前 T23 33/36、T27 5/6；主线余248/272/249/250四片、完整对局0/12。
本次修复不等于新定量Teach已经应用，也不是性能准出。

## 实际故障与根因

A原房r130/player2连续两次选择Wild Mutation，并写出“无资源费用且不横置卡”。原生能力执行器对该零资源card_feature在提交时横置来源势力卡，故拒绝这句正确；不是现在已横置与未来横置的误判。

资源检查器已经掌握来源faction:player2、有效费用0、提交后横置，但Planner/Action抛错时没有转交这些事实或原句。真实反馈只有`assessment.evidenceFor:source_card:not_exhausted->exhausted`；两次模型重复同句并联停。另有恢复不一致：运行在重复错误2次时停止，旧修复入口却只认累计3次（或输出截断）。

## 产品修改

1. `live-flash-decision-port-v1.mjs`：资源结果附候选、动作/能力名、来源卡、逐选择资源费用、on_commit作用域和全部矛盾原句；Planner与Action共用。区别资源点与横置，不给战略推荐，不改规则支付和原Plan。Prompt合同v55/v56。
2. `live-prompt-repair-recovery-v1.mjs`：实际合同变化且明确批准时，允许重复失败停点恢复一次；此次保留已用2轮、查询数、付费输出与历史，不清零增加轮数。
3. `verify-slice248-resource-correction-v76.mjs`：只使用A真实r130保存回复和生产归一化/恢复路径，原房只读、0Provider调用。

## 聚焦验证记录

- RED进程69880：真实恢复缺少原句/typed资源事实，断言失败。
- 修改后70810：真实反馈重建、原计划/付费输出保留、计数保留、同合同不恢复、未授权不恢复和一次恢复边界均已通过；仅末尾夹具失败——它只改assessment中的句子，没有改公开摘要另外两处同义错误。
- 定点修夹具后71892，`--remaining-claims-only`唯一运行通过：三处原句全部更正后判定一致，Action共享事实正常，原记录未改。已通过前缀未重跑；不把70810写成整条通过。
- 详细原始stdout/stderr：`build/ticket-23-three-arm-performance-baseline-20261010-v1/A/resource-correction-v76-verification.private.json`。

## v75补记与当前运行

B此前32768输出units截断在v75同容量修复后，实际Planner1982输出units完成，随后Action2244输出units及Apply/Replay完成，权威r1→2。该事实不是全链路性能或战略优越性证明。

v75联停所有拥有进程已退出（ps核验）。原权威断点为A130/C150/B2/D3，不能以稍滞后的progress截图计数代替。v76使用既有Host/Web驱动与联停监控，四组均已完成至少一个新动作：A131/C151/B3/D4，全部replayMatchesCurrent=true。

### 真实自纠错结果

A同一r130选择恢复时保留原2次付费失败和已用2轮。新Planner一次返回，明确“Wild Mutation无资源点费用，但会横置faction:player2，属于可接受的机会成本”，并在evidenceAgainst指出该来源卡使用机会被占用。仍选择同一能力，未由Host代选或手改Plan。Action随后通过，use_active_ability正式Apply到r131并重放一致。

新增2calls：253732输入、4054输出、257786units；房间估算费用114.623965→114.947904，增量¥0.323939。Planner15.761秒、Action模型18.773秒；Host整步17:08:30.236Z→17:11:17.643Z为167.407秒，仍不满足此前性能目标，不能把模型耗时当整步耗时。其余开销本次未作阶段归因。

截图：`../build/ticket-23-slice-248-standard-2000-aa-live-v1/query-v33-clean-A-20261013-v1/screenshots/0884-r131-player2-use_active_ability-complete-board-applied.png`。已打开查看。完整所选回执：`build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v76-first-actions-evidence.private.json`。

观察时四组Host72782/72784/72786/72788、Web驱动74951/74952/74953/74954及监控74955均运行；后续必须重新核对进程/实际回执，不能只依据本段文字。3秒HTTP观察超时不判停，也不因此重启。

A/B最新Teach仍`proposed_not_applied`。场景构建、动作域取数、非攻击能力工具、替代军表审计与证据进入正式Plan尚未完成；这些问题不会因运行恢复而自动消失。

## 边界与后续

保留四组原房后台推进；任何新High四组同步停。下一工程交付为合法假设局面和依赖查询，使新Teach能实际支撑Plan。已定位applyPlacement默认三列向右/向上铺开；这会使选定锚点的紧密布局撞墙，但不证明该地区无合法队形。应复用真实几何/队形能力，返回模型所声明意图下的可选合法布局，明确“假设快照”不是“合法历史进场”。同时暴露正确动作域/非攻击能力边界、接入真实候选军表审计，再由模型论证保留/修改并通过现有Plan审核。不能手改计划制造策略改进。

未跑旧绿或全量测试；无子代理、安装、删除、官方源刷新或提交。harnessLoopUsed=true；targetGames=starcraft-tmg；promptPackRoutes=harness_optimizer/fact_probe/selfplay_agent；trainingTruth=false。验证保留公开决策，不采集隐藏思维链。
