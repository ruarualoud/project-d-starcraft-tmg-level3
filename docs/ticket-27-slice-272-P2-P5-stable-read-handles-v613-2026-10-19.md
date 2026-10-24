# T27/S272 P2/P5：给模型稳定的资料读取句柄（v613）

新P0–P6的具体Interface修复，不是最终军表／Plan报告。T27 5/6、T23 33/36、相关余4片；正式Plan0/6、对局0/12。

## 实际问题不是“Native没返回”

857实际选择已保存的联合队形1509，原生应用成9单位假设场景e8ecdb7a…，随后mission_marker_control成功。857收到区域搜索新版descriptor，但没有新发区域查询；这条成功属于已有固定点候选，不能归功于v612。

858–862汇总角色一直说“需要读queryReceipt和hypotheticalPlacementAssessment”，实际却请求不同的`/sections/N/value`：

| 资料 | 真正目标位置 | 模型请求实例 | 实际收到 |
|---|---|---|---|
| 1515控点视图 | 第18节，`/receipt/queryReceipt` | 第13/14/16/17节 | baseStateHash／seatKey／resultStatus／unknownReason等 |
| 1513场景视图 | 第24节，`/receipt/hypotheticalPlacementAssessment` | 第15/13/12/17节 | resultStatus／baseStateHash／trainingTruth／branchKind等 |

原件、编码后实际prompt及读取回执逐步对照：数组没有被删改、数据没有丢失，reader也如实返回了被选择的字段。模型数错索引，又把“没读目标字段”解释成“目标内容仍未交付”。后几次换了新错误地址，所以并非同一地址的三轮重复拦截，也没有重置纠错次数。

## 同一reader的改进

- 为所有旧／新不可变receipt view的大节，机械生成可直接提交的`read:{evidenceNumber,pointer}`，例如1515＋`/receipt/queryReceipt`。模型无需数数组。
- 仍支持原来的数组路径；若选第13节，就返回原本hash，另明确`selectedSectionPointer`及实际类型，并提供现有大节的稳定句柄。
- 不猜测模型本意、不把错误地址重定向为另一节、不自动取所有大节，也不把提供句柄当作已经读过内容。
- 导航在read-time投影，明确hostNavigationOnly／originalArtifactUnchanged；原件、Native receipt、旧prompt和费用记录都不改。

## 一次定点验证

`verify-slice272-receipt-read-handles-v613.mjs`直接用实际1513/1515旧视图、真实核心reader与内存checkpoint：

1. RED复现旧视图没有稳定读取句柄。
2. 修后首次验证到完整payload对照时，夹具误把evidence原件当作work-result多包一层；确认实际原件层级后，只修该夹具。
3. 一次GREEN：稳定句柄读取完整5个标记结果和9单位几何，逐值等于原始Native节；错误索引仍返回原hash，不产生目标节已读记录；旧原件不变。Provider=0、Native=0、生产写=0，不重跑无关门。

## 实际续行及边界

20771完成862当前advance安全exit0；29274无恢复旗标继续同一inlKbk/projection-owner，`build/slice272-live-p5-v613.log`。计费／原文／轮数保留，未启动Web、旧对局或新代理。

后续必须观察真实模型是否选择正确语义句柄、完成来源解释，再关闭地图必要问题与执行联合军表／Plan修改；本门通过不等于整个流程收敛或策略更优。

- [858实际prompt](../build/slice272-projection-owner-v565-inlKbk/858.request.json)／[错读回复](../build/slice272-projection-owner-v565-inlKbk/858.reply.json)
- [860换错地址](../build/slice272-projection-owner-v565-inlKbk/860.reply.json)
- [862实际prompt](../build/slice272-projection-owner-v565-inlKbk/862.request.json)／[回复](../build/slice272-projection-owner-v565-inlKbk/862.reply.json)

harnessLoopUsed:true；targetGames:starcraft_tmg；promptPackRoutes:事实汇总／同源reader；harnessToolsCalled:只读原件，无新Native；uiTraceEvidence:无Web生成；agentDecisionEvidence:858–862原件，修后实际待观察；memoryTraceEvidence:旧记录／次数不改；trainingTraceCandidates:无；rollbackOrDemotionRules:未读取的目标节不得当作已读或通过；userVisibleChecks:最终产物未准出。
