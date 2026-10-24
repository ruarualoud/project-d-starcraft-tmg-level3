# T23 / S248：A实际开局、工具续轮容量修复及性能

## 已交付和当前边界

用户要求A开局、阅读原计划、检查性能及遗留工作优先级。
[A军表与计划中文阅读版、三组定义与优先级](ticket-23-A-v6-roster-plan-readable-and-priorities-2026-10-09.md)。
原计划v6/024168283b…原样使用，不重新生成或重跑已通过的审核。

A通过普通产品Host和Web启动，房间
`ticket23-slice248-aa-official-standard1-A-fixed-opening-plan-20261009-v1`。
同B/C冻结官方standard-d6-1/54×36/双方2000、相同Zerg军表、Flash及legacy_v1运行变体。
地图真实编译1804个地形片，30个地形实例；不是无地形演示房。
PID92118原Host、94932原Web。真实r0→r1任务回合初始化Receipt
`05e06b15e258d7dc7a66aaa499c7d724b3510f73fb2d071024050e2bb5853031`，Replaytrue。
首动作是确定性规则继续，不当作模型策略验证。首图0005已目视。

随后模型首决策停止。Web在三次completed-without-progress后exit1；
原Hostdrive0004 completed/paused，停在r1。**不能因为房间创建成功就报A还在正常对局。**
原返回、停止证据及截图0017全部保留。

## 本轮两个实际来源修复

### 1. 同房续跑被预算参数误判为重新规划

原C Web86756将`--per-room-budget-cny=200`放入转发参数后，直接用数组非空
判断pregame模式，触发`SLICE272_PREGAME_MODE_CANNOT_RESUME_OR_FORK`，0新Provider。
只改`run-ticket-23-slice-248-agent-agent-web-v1.mjs`的模式判定：预算仍转发给Host，
但单独预算不构成pregame配置；真实赛前参数和resume/fork仍互斥。
修后一次普通Web91753接同Host81004/原SQLite，无动作数停点，实际103→104，
Receipt `cde14e8b5f103caca088745a3830266044c93d32c516de7be0df295aecfdc875`，Replaytrue。
这是本次修复的真实验证，不另跑旧门或全量测试。

### 2. A工具回复与传输单字段容量合同不一致

原模型完成一次`query_spatial_rules/space.inspect_relationships`查询，Host保留完整回执。
模型侧已列式编码的tool消息仍有293128字节；原始回执1277439字节、1804地形行。
续轮完整Prompt约782136字节，但传输层tool.content额外限制256KiB，
因此四个续轮本地拒绝，`provider_failed_not_sent`，usage=null。
这是**工程合同拒绝，不是模型拒绝读计划、格式幻觉或整体2MiB超限**。

用实际保留续轮消息建立唯一具体回归脚本
`verify-ticket-23-slice-248-captured-tool-reply-capacity-v1.mjs`：

- RED2519：实际293128字节，DNS边界0次，原合同拒绝，原消息完整不变。
- 仅改生产`provider-egress-transport-v1.mjs`工具消息容量采用现有全载荷上限；
  serialized whole request仍在DNS/dispatch前检查，证据不裁剪。
- GREEN3311一次通过：原消息通过本地合同，到达明确的假DNS边界1次；
  超过总载荷的同类请求仍被拒绝，真实Provider/网络0次。旧绿色门均未重跑。

本地绿门不等于已加载到原Host的驻留Worker。原A必须自然停点/0inflight、
完整初/现envelope及全部五调用保存后，同SQLite正常重载，才可继续。
完整snapshot约24.7MB，以独立进程读取，避免在交互诊断内累计整史。
4个failed调用也完整保留，不用“all completed”掩盖它们；它们明确未发送。

实际恢复已完成：4518正常关闭旧Host且确认PID消失；新Host6077同SQLite/r1/v6。
before/closed/ready三份完整初始envelope、当前envelope及ALL5尝试行严格相同，
连续性8489 exit0一次通过，恢复本身0Provider、0房间重建。
ONE新Web8743于05:02:14Z接原房连续续行，无动作数停点。
后续是否产生模型动作必须看新Receipt/Replay；这里不提前认证修复后策略效果。
续行后只读GET确认A drive0001状态running（05:02:40Z提交），不是仅进程存在。
C随后已到106/R2Assault，238尝试/估¥85.877498，仍连续运行。
共享build的`AC-source-recovery-current-running-status-20261009.json`保留交付时状态。

## C共享查询源码的实际加载与第一结果

此前39986只加载目标合同，未加载后来查询源码。现在81004同SQLite已加载查询源码。
before/closed/ready完整初现态及ALL232调用行相同，连续性84535一次通过。
C新源r103记录：action_specific_threat/exact/6281ms，
attack_probability/advisory_estimate/14748ms；原r102相应概率是unknown。
这是实际运行的接线结果，不能凭status就认证所有骰型/概率/策略正确。
新r104为Goliath继续射击，原Receipt/Replay/截图已保存。

## 性能：仍不达一分钟

不重新运行旧用例，只读真实阶段及drive时间。

- 原C103：Agent147427ms、Preview109970ms、Apply150165ms、Replay464321ms。
- 新C103→104 drive：04:43:36.105→04:47:55.052，258947ms。
  本轮空间关系查询约2469/27638/1312ms，威胁6281ms，攻击概率14748ms。
  后续manifest25490ms、网页refresh21217ms、截图3778ms。
- A初始规则动作drive约71362ms，即使0模型调用也未达一分钟；
  Preview确认6145ms、Apply13941ms、Replay13827ms。

这些是不同局面，**不能把464秒对比259秒当作受控策略AB或性能修复结论**。
本机同时运行A/C也可能影响耗时，需要把纯Host CPU、空间计算、Provider等待和Web读回分账。
优先处理确定的本地重复计算/整史Replay及读回成本，不通过删策略资料或限制决策次数达标。

## 成本、尚未完成的修复与队列

在A首次停止时：工作台44次/1589373units/估¥5.054991；游戏有5条尝试，
仅1条完成且有usage（159638units/估¥0.192135），4条未发送且usage=null。
界面`providerCalls=5`是尝试数，不能叫五次已付费请求；合计当前价估¥5.247126。
C r104：235尝试/64405145units/估¥84.916612，旧¥83.961711不清零，新增估¥0.954901。
B仍r119传输恢复待办、264次/估¥92.590496及一笔未知usage，不报正在运行。
各组预算¥200；以服务商账单为准，估费不替代账单。

既有当前修复：A源码恢复、B传输/预算恢复、选定军表实验室绑定、
射击/冲锋查询种类区分、真实性能定位。随后处理用户新要求的计划执行闭环、
有证据Teach补计划及模型/检查器协议一致性。对局持续收集错误并定点修，不重建旧房。

需要纠正之前宽泛的branch归因：Foundation的`executeInformationNeed`已经维护
branchByNeedId并解析branchIdRef。另一个Teach证据包装器固定source且忽略该字段，
不代表Foundation也忽略；必须分入口复现，不能改掉原本正确的Foundation解析器。

T23仍33/36，T27仍5/6；248/249/250/272四片开放，完整对局0/3。
全地图任务及后置18经典图不删范围。0代理/K3/安装/删除/数据刷新/全量门/构建/提交。

harnessLoopUsed=true；targetGames=starcraft_tmg；routes=harness_optimizer_prompt/selfplay_agent_prompt。
工具为原始Provider/动作SQLite只读、真实Host/Web、阶段日志、当前查询回执、原计划。
保留公开理由和记忆，不存隐藏思维链。ctx2skillLoopUsed用于现有计划证据诊断，
skillsGenerated=0/promotions=0/trainingTruth=false。丢旧原文/修改已接受历史/绕过规则，均否决恢复。
