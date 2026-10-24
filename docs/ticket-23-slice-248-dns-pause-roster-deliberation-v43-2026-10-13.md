# T23/S248 与 T27/S272：DNS 暂停和写表查询边界 v43

## 实验身份：只改变 Terran

权威房间的完整军表哈希实读：

| 组 | Terran | Zerg |
| --- | --- | --- |
| A | 固定2000表＋开局Plan，`800a01b40213…` | 固定2000表，`30b3de35a66c…`，无独立开局Plan |
| B | 从空表AI生成2000表＋Teach/reviewPlan，`685990db3190…` | 同A完整表与初始配置，无独立开局Plan |
| C | 同A的表、无开局Plan | 同A完整表与初始配置，无独立开局Plan |

三组runner的opponentPlannedSessionId和opponentPlannedPlanHash均为null。Zerg逐步调用战场Planner不是写表，也不保证三局采取相同动作；它须根据各局不同局面独立决策。B的写表会话为Terran。

## 实际停点与来源

v42先恢复B旧付费Action并实际完成r12部署/Replay。随后继续到Native A25/B18/C32。A于23:26:19.890Z报三次已完成推进无状态增量；独立监控23:26:20.063Z开始全停，最终23:56:58.244Z封口。

实际A r25是第一回合Assault、player1：本次drive job为completed/paused，fresh finding是`provider_dns_resolution_failed`、Medium，blocking=0。既有Web完成进度门只计revision/action数，忽略已知网络暂停，于是把快速重复的DNS失败升级成未知停滞High。不是规则阶段死锁，也不是Zerg重新写表。

三个Host已封口并退出；B/C网页清理挂起的旧PID29630/29631在PID出生时间、脚本及原房目录绑定后定点关闭。房间/骰子/记忆/付费记录未删除或回退。

## 交付一：已知DNS等待与未知停滞分开

`completed-drive-progress-v1.mjs`只在当前completed/paused job时间窗内、同revision、含新鲜DNS且无Rules/auth/High混合失败时进入5/10/20/40/60秒退避。旧DNS历史不能豁免新停滞；未知停滞仍三次停止。正常动作成功后重置退避。Web driver传入真实driveJob并等待，不忙重试。

既有cleanup gate新增仅此具体bug的`--dns-pause-only`模式，不跑已通过的地形/旧门：真实A r25捕获RED76694；唯一GREEN77365通过。包含fresh DNS、旧记录、混合Rules、认证错误、未知三次停止及成功复位；0Provider/Room写。

## 交付二：欠预算不是禁止战术查询的理由

真实B初始写表轨迹：合法1000分候选收到4个补满2000方案后，`requiredDecisionReason`把下一请求变成proposalOnlyContract，queryKinds为空。这使已接通的scene工具在补表前不可用；当前B只在锁表后的Teach使用新占点/火力查询，不能将工具接通解释为它改进了先前选表。

新建session采用modelContextVersion5：只要已有Builder合法候选，可继续查询地图、场景或战术，再决定是否换表。不是强制查询、策略排名或Host替模型选表。低于2000仍不能finish，candidate/scene绑定和最终地图/Plan审核不放宽。

旧v4及以前已付费上下文不偷偷迁移，当前ABC被冻结的军表/Plan保持不变。既有iterative gate新增具体`--budget-deliberation-only`：真实B1000分前缀RED63368；唯一GREEN75726通过。验证新session版本、schema和runtime均允许查询、实际tool-port收到当前候选、旧候选拒绝、欠预算finish拒绝、旧付费合同不变；0真实Provider/Room写。该门不等于新鲜模型写表或策略有效性认证；新v5真实生产仍待完成。

## 原房同版恢复

sourceVersion=`s248-v43-dns-pause-and-roster-deliberation-20261013`；58个运行源纳入manifest。相对v42只改Web driver、completed-drive-progress及两个iterative roster session/model源。旧formation/attacker scope修复保留，未动Skill、策略权重或冻结官方数据。

Hosts A78706/B78705/C78707（出生08:12:28本地），startup78709，从Native A25/B18/C32继续。权威控制文件：`common-v43-startup-config.private.json`、`common-v43-source-manifest.private.json`、`common-v43-live-process-handles.private.json`、`common-v43-independent-monitor-progress.private.json`、`all-stop-common-v43.private.json`。此处只记录启动；实际Web准入、下一Apply/Replay另补证，不把启动当对局完成。

T23/S248 **33/36**；T27/S272 **5/6**；主线还剩S248（完整对局）、S272（新鲜写表/比较）、S249（复盘）、S250（进化验证），共4片。正式完整对局**0/12**；20图目标未缩。累计分组费用及未知usage继续保留，无硬限，下一提醒A300/B400/C300。180动作实验保护到达前仍需统一配置，未在本次两处定点修复中偷偷扩容。

harnessLoopUsed=true；targetGames=starcraft-tmg；harnessToolsCalled=真实Native/runner/drive job读取与正常同房恢复；agentDecisionEvidence=真实B写表前缀、A r25 DNS回执；trainingTraceCandidates=0；trainingTruth=false。无子代理/K3、数据刷新、删除、提交或旧绿重跑。

## 实际Web准入与新网络停点

00:13:46.469Z完成原房Web准入，驱动A79787/B79788/C79789，独立monitor79790。A/C持续DNS暂停期间，已完成drive-0005而revision仍25/32，没有再触发三次未知停滞High，退避修复在真实链路生效。

B r18的第一条drive于00:14:26.808Z开始，最终返回`provider_transport_timeout`、High，不是新模型语义/军表错误。00:23:00.843Z Web保存失败，monitor00:23:03.649Z自动全停，00:34:28.986Z全部封口完成；没有绕过出网超时结算或把未知费用算零。最后已观察累计预估A246.828734/B311.561005/C266.988365，最终账需按封口后的ledger读取，未清零。

本轮没有新增已接受动作；保留Native A25/B18/C32和完整0/12。下一步先确认服务商网络恢复，再沿用v43原房显式恢复；不因此重写表、Skill或Plan，也不重跑两条已通过门禁。新v5真实写表生产待网络可用后执行。
