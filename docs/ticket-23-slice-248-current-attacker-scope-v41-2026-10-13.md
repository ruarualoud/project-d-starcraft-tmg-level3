# T23 / S248：当前图攻击者声明范围 v41

最新续接：[已选队形范围v42](ticket-23-slice-248-selected-formation-scope-v42-2026-10-13.md)。v41旧Planner本地重验实际成功；随后三付费Action因将Swarmling已选队形混成当前Worm位置而遭误拦。22:10:36Z自动全停、22:17:07Z封口；Native A15/B11/C22。下文启动记录不代表v41对局通过。

## 当前实验条件不变

A=固定Terran2000表＋Plan；B=空表AI Terran2000表＋Teach/reviewPlan；C=同A表无Plan。三完整Zerg军表/初始配置相同、均无独立开局Plan，但每局依据自身局面独立决策。单步Zerg Planner不是写表。地图/规则冻结/Flash/Skills/执行链路同版，不重开房间或生成新军表计划。

## 真实High与来源

v40继续后Native A14/B11/C21，R1 Movement。B r11三份付费Planner回复写：`Opponent's Marine remains out of current fire bands against Kerrigan and the Omega Worm.` 同份回复另外明确承认Marauder-1对Omega Worm的本回合原地射击带。

三种排查方向：声明攻击者漏滤；查询身份/方向错误；模型实际否认全场威胁。捕获同一权威r11回执，Marine→两目标当前射击键为空，Marauder→Omega Worm非空（Quad K12，底盘距10454）。当前声明明确限定Marine；原校验只按友方目标过滤，未限定攻击者。因此Marauder证据被用于反驳Marine声明，造成同一误报三次，不是模型缺少纠错事实。

v40监控于21:41:05Z按fresh失败记录自动封口；Host全部结束后才关闭挂起Web驱动，21:47:07Z全停。旧答、三错、查询、记忆、回执、骰子、账保留。

## 具体修复与唯一门禁

唯一产品源 `packages/online-agent-session/live-flash-decision-port-v1.mjs`：当前关系图复用既有formation攻击者身份/编号别名范围逻辑，先按攻击者、再按友方目标过滤。没有硬编码Marine/Marauder，当前图与求解队形不再用不同的敌方范围定义。`no/zero enemy fire`等全局否认保留全敌作用域，即使附带提到Marine也不能隐藏Marauder。真实选中威胁不删、不注入策略权重或替模型改句。

Action normalization v63/Planner v39，提示策略v49/v50保持。正常显式恢复会本地重验旧付费Planner答；不改原答或清三轮历史。完整Planner/Apply是否通过仍以实际恢复结果为准。

复用已有 `verify-ticket-23-captured-fire-claim-scope-v1.mjs`，只加具体bug的 `--current-attacker-only <capture> <gate>`。真实RED72114恰好失败于Marine声明被Marauder反驳；唯一GREEN74976通过。三原付费完整回复通过这一范围接缝、真实Marauder否认和全场否认仍拒绝、观察到的完整实例ID限定仍支持、原答/回执不改。0Provider/Room写，旧门禁/旧绿未重跑，也不把这个接缝门当完整规则/策略验收。材料 `query-contract-audit-v30/current-attacker-scope-v41/`。

## 同房恢复

sourceVersion `s248-v41-current-threat-attacker-scope-20261013`；56产品源码只上述live port与v40不同。继续使用v40已验证并已实际触发的fresh-progress监控。原A14/B11/C21 Hosts76343/76344/76345与startup76347于22:08:14Z启动。实际Web准入、旧Planner本地重验和新动作另记；不把启动当完成对局。

当前权威文件 `common-v41-startup-config.private.json`、`common-v41-source-manifest.private.json`、`common-v41-live-process-handles.private.json`、`common-v41-independent-monitor-progress.private.json`、`all-stop-common-v41.private.json`。累计成本继续分组记，无硬限，已知usage与可能出网未知费用分开保留。

## 待补与边界

T23/S248 33/36、T27/S272 5/6，主线余 S248/S272/S249/S250、完整0/12。S272锁表前有界候选场景比较尚待；20图长目标未缩。180动作保护触顶前需封口同房扩容。模型文案提及Swarmling Supply与进场边缘的实际依据须随正常接线/选择证据继续核对，不能用语句门通过代表全事实正确；当前尚未新增该规则修复或称其违法。近期运行49–109秒只是少量动作观察，未达完整回合性能/40%晋升结论。

harnessLoopUsed=true；targetGames=starcraft-tmg；promptPackRoutes=selfplay_agent_prompt；harnessToolsCalled=只读正式choice/relationship graph/正常恢复；agentDecisionEvidence=三份真实付费声明及具体来源；trainingTraceCandidates=0；trainingTruth=false。无数据刷新/子代理K3/删除/提交。
