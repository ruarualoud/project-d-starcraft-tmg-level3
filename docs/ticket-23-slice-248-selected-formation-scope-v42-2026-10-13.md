# T23 / S248：已选队形与当前局面证据范围 v42

## 实验条件与实际停点

三组只改变 Terran：A 固定2000表＋开局Plan；B 从空表产生新的Terran2000表＋Teach/reviewPlan；C 与A同表、无开局Plan。完整Zerg军表和初始配置逐字段相同，均不另生成开局Plan。Zerg每步调用Planner是战场决策，不是重新写军表。身份对照见控制目录 `common-abc-zerg-roster-identity-20261013.private.json`。

v41实际复用了B的旧付费Planner，`localPlannerSemanticReplayVersion=v39`，未重新付费生成Planner。随后三次Action均被 `ACTION_SELECTION_THREAT_CLAIM_CONTRADICTS_PROJECTION` 拒绝。最后一次已经明确承认Marauder对Omega Worm的本回合威胁，却仍被同一校验拒绝。v40监控保留在v41中，22:10:36Z自动全停，22:17:07Z封口。Native最终A15/B11/C22；A/C的Web进度少记最后一个已封口动作，恢复必须沿用Native及原回执，不能回退或重做该动作。三组均R1 Movement，完整对局仍0/12。

## 真实误报

原句：`The requested-left formation option places Swarmling at minimum 23003 milli-inches from Marauder-1 and 24623 milli-inches from Marine-1, outside all current fire bands.`

已选队形回执 `d821ae78c620bd94ed63d45dff9d3edca60417101aec16c945618e0fb28a2c18` 的选项 `566bd5f5584f67d3962f9622eed0df08b35d9471c3a092de1cd35c2ad01696cb`，pieceId为player2-swarmling，对两敌方的本回合原地/移动射击键皆为空。当前图的另一条事实是Marauder→Omega Worm，10454 milli-inches、Quad K12。

来源错误有两处：当前身份绑定只读在场units、遗漏有身份但尚无当前位置的offTableUnits；Action最终校验未读已经绑定的队形回执。所以Swarmling声明被扩大为当前己方全军声明，Worm暴露被用来反驳不同单位的已解队形安全。

## 修复交付

唯一产品源 `packages/online-agent-session/live-flash-decision-port-v1.mjs`：

- 友方身份绑定统一包含units/offTableUnits；预备队没有当前位置，不代表没有身份。
- 从当前domain＋formationOptionId＋formationReceiptHash读Host绑定的原队形回执，不信任模型自造comparison。
- 明确描述所选单位已解队形位置的声明使用所选队形；独立当前位置声明、其他单位和全军声明仍用当前图。
- 已解队形的真实原地/移动射击威胁及未知LOS不隐藏；失效回执不能获得未来位置证明。
- Action最终校验传入选定动作身份；Action normalization64，Planner39、prompt49/50不变。规则执行仍独立检查完整底盘、路径、进场及支付。

未改策略权重、未重写原答、未刷新数据、未生成新军表或Plan。

## 具体bug门禁与收敛

仅在既有 `verify-ticket-23-captured-fire-claim-scope-v1.mjs` 增加 `--selected-reserve-formation-only`。真实B11三原付费动作和原图/队形为捕获材料。

RED89085复现Worm事实误拦所选Swarmling队形。第一次GREEN90545使三真实答通过，但补充“原位置与选定新位置”边界夹具漏了生产 `bindPlannerSelectedProposal` 的domain绑定；该失败不计通过。明确补齐夹具绑定后唯一最终GREEN6981通过：三真实答、在场单位新旧位置隔离、真实当前/所选队形暴露仍阻止、失效回执仍拒、原始输入未改。0Provider/Room写，未重跑旧已绿模式/全量构建。材料 `query-contract-audit-v30/selected-formation-scope-v42/`。

该门只证明威胁证据作用域，不证明完整Action、部署意图、策略收益或对局通过。

## 独立模型偏差（Medium保留，不代替模型选择）

本房冻结规则观察：Swarmling18模型的当前Supply=1，与源profile匹配；损失12、剩6时Supply变0。此处不能仅根据模型规模推断Supply，也未重新拉取官方数据。

但模型把本次部署描述为“从Worm入口部署并接近marker5”。当前deploy域只有 `blue-entry-1` 桌面bottom边，所选队形canonicalParameters也走该边；其对marker5底盘最近距12102，而不是已占点。工具返回与合法执行参数一致，模型把未来Worm用途/期望收益混入当前意图。记录为策略/说明与所选合法摆放的偏差，不能把规则合法等同高策略，不能用Host改文字或额外策略偏置掩盖它。后续复盘须对照实际入口、位置和控制结果；本次不改其已付费策略文本。

## 当前恢复入口与剩余交付

sourceVersion `s248-v42-selected-formation-threat-scope-20261013`。56产品源的唯一差异为live port；fresh-failed-progress监控沿用v40修复。同原房Native A15/B11/C22启动Hosts28936/28935/28934，startup28938；此处只是启动，不宣称Web准入、B旧Action重验或Apply/Replay成功。

权威入口：`common-v42-startup-config.private.json`、`common-v42-source-manifest.private.json`、`common-v42-live-process-handles.private.json`、`common-v42-independent-monitor-progress.private.json`、`all-stop-common-v42.private.json`。房间、骰子、记忆、军表、Plan与各组账延续，未知费用不清零。

T23/S248 33/36、T27/S272 5/6；主线余S248/S272/S249/S250共4片。S272锁表前的候选/场景比较仍待完成，20图目标未缩，完整对局0/12。180动作保护触顶前需在封口边界统一扩容。当前少量动作时间不足以证明整回合性能/40%优化晋升。

## 实际Web准入与Apply/Replay补记

23:14:37Z原房Web29629/29630/29631、独立monitor29632完成同版准入。B r11旧付费Action第三份本地重验标记 `localSemanticReplayVersion=starcraft_tmg_live_action_shape_normalization_v64`，choice已completed；没有再生成该Planner或该Action。B r12实际deploy player2-swarmling，回执 `6e01abeb9d9c862a26bc4a6bde1e68c6742b68304769da9111b32c871b595174`，`replayMatchesCurrent=true`，截图观察revision12。

实际网页棋盘截图 `query-v33-clean-B-20261013-v1/screenshots/0124-r012-player2-deploy-complete-board-applied.png` 已目视：18模型在bottom进场，Worm在较前位置，不是从Worm边缘出来。证明规则合法执行及本次误拦解除，不证明其错误入口叙事或占点收益成立。

23:17:26Z monitor三组running、无当前新High，Web已记A17/B13/C24，R1 Movement，完整仍0/12。已知累计预估A¥244.059790/B¥307.584840/C¥263.064062；各组历史可能出网而无usage的1笔未知费用继续保留、未按0计。无硬费限，后续提醒门槛A300/B400/C300。本节为实际结果，上文“启动待验证”为当时的历史记录。

harnessLoopUsed=true；targetGames=starcraft-tmg；promptPackRoutes=selfplay_agent_prompt；harnessToolsCalled=只读真实Native/choice/relationship/formation＋正常同房恢复；agentDecisionEvidence=三原付费Action、本地重验及真实Apply/Replay截图；trainingTraceCandidates=0；trainingTruth=false。无子代理/K3/数据刷新/删除/提交。
