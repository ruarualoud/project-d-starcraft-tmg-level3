# T27 / S272：从实际停点恢复完整产品流程

## 当前结论

不是手工修改模型字段、军表或 Plan 后放行。只改产品的工具错误反馈、场景状态恢复、审核输出纠错和付费请求恢复接线。真实 A/B 完整准出尚未完成，不宣称产品已稳定，不启动对局。

范围与计数：T27 5/6，T23 33/36；主线剩 S272/S248/S249/S250 共4片，完整实验验收0/12。旧 v249禁止恢复；当前仍为 fresh-v264，同冻结地图/任务/规则/Skills，既有费用不清零。

## 1. 核对记录，避免读错旧摘要

用户指出“初步策略/920分”是早期摘要，已重新按文件更新时间、实际会话ID、请求和进程表交叉检查。最新目录确实是 `build/ticket-23-three-arm-performance-baseline-20261010-v1/{A,B}/fresh-generation-v264`。

- A：`rws-5c8ed89c-06a0-4c29-910d-f33d17421516`。10月15日22:26北京时间停于Plan4来源审核；请求32 HTTP200但正文0、最终ETIMEDOUT，原费用未知。不是仅“初步策略返回”。
- B：`iterative-web-94c1b8fa-7e87-482b-8a1d-408e1eca095d`。10月15日21:48北京时间第16请求已完成，本地delta失败。那时r2临时920分，确实不是最终表。
- 两原进程4855/4856都已退出。未重建房间、未恢复旧v249、未导入旧Plan。

## 2. 产品修复与实际发现

### v265：纠错不得悄悄换题；Run接通来源审核恢复

B模型对缺失domainId使用replace，通用适配层原来抛异常。现在只将“已有父对象下缺失叶子的replace”记录为add，值完全来自模型；不创造父对象、不选择domain、不改变数组规则。原始回复保留，归一化单独记账。任意其他delta参数错误进入原有局部有界工具对话，保留unknown和具体反馈，不让一次参数错误中断整段Teach。

原模型同时把Raptor改成Swarmling，现有语义范围门仍拒绝并说明：另一个目标的成功查询不能回答原问题。错误请求不执行；Host不替模型挑目标。完整实跑仍出现错误修补，但被记录为未解并继续后续调查，而非冒充修好。

A普通产品Run原来仅转交Teach中断，漏接final_plan_review。新增按实际阶段转交已有来源审核恢复服务，保持原请求/Plan身份、一次性授权和未知费用。

### v266：恢复成功与失败混合布局的完整派生状态

完整续跑暴露B `PREGAME_LAB_RETAINED_GEOMETRY_STATE_CHANGED`。原场景Marine/Medic布局成功，Goliath固定锚点求解失败；恢复器只还原坐标，漏掉成功评估写入的 `inCoherency/coherencyStatus`。

修复恢复器从同一已保存评估恢复这些派生字段，不重新求解，不改变坐标，不把失败Goliath变为合法；完整状态hash仍必须相同。此前全失败场景测试无法覆盖这一混合状态缺陷。

### v267：来源审核缺字段由模型自己补正

A网络恢复后自动完成Plan4/5核对和定点修订，进入Plan6。请求62返回22项findings，但漏 `reviewedClaimPaths`、`hasUnreportedMaterialFindings`。旧入口直接抛 `ROSTER_FINAL_PLAN_REVIEW_OUTPUT_INVALID`。

新增通用审核schema反馈：原冻结证据、有效findings、具体schema问题一起交还模型，要求模型给完整结构。Host不填覆盖范围、不假定没有遗漏。最多原回答加2次格式纠错；稳定派生context让已付费纠错能从存储复用，重启不重置循环。网络异常不进入格式纠错。后续来源/覆盖/语义审核照常执行。

### v268：已恢复请求不再被历史未知费用重复阻塞

A实际请求32已有同body/context的成功retry，但原ambiguous费用记录正确保留。Run错误地把所有历史ambiguous都当未处理请求，导致新Plan审核409。

共享判定沿精确retry lineage查找已完成结果：session、Plan、round、context、body必须一致。仅解除执行阻塞，原记录和未知费用不改；不同body的所谓retry仍阻塞。

### v269：草案Teach接入安全网络恢复

B越过场景恢复后，模型从r2临时920分自动写成r3合法2000分并同步Plan，再进入新Teach。其新agenda请求28发生EPIPE，已写请求但无响应，费用未知。

草案Teach现在使用现有安全Provider的 `retryDispatch/recoverNetworkDispatch` 接口：原场景/Plan/请求不变，授权在发送前持久化，reserved事件就消费授权，重启不得重复发。每个原始终结网络故障最多一次精确恢复，重试叶子不自动无限重试；暂停检查优先。HTTP拒绝、模型错误和规则错误不伪装成网络重试。原未知费用保持。

## 3. 定点回归（不是完整验收）

只为真实bug添加以下脚本，无全量验证、无旧绿重跑：

| 脚本 | 结果与边界 |
|---|---|
| verify-slice272-query-delta-v265.mjs | 实际B付费回复RED→一次GREEN；缺叶归一化、换目标不执行、其他坏patch返回局部unknown；0模型/Native |
| verify-slice272-review-resume-v265.mjs | 实际A停点HTTP409 RED；修复后夹具漏模拟Teach应用，补夹具一次GREEN；是协调器接线，不是真模型接受 |
| verify-slice272-mixed-branch-restore-v266.mjs | Native成功/失败混合布局RED→一次GREEN；完整状态相同、失败不升格、源状态不变 |
| verify-slice272-review-feedback-v267.mjs | 实际A请求62/输出RED→一次GREEN；反馈要求模型补覆盖字段，findings不变；0真实模型 |
| verify-slice272-settled-dispatch-v268.mjs | 实际已完成retry仍409 RED；修复后正例已过，负例因夹具复用未清理job失败；仅新隔离负例补验通过，正例未重跑 |
| verify-slice272-draft-network-recovery-v269.mjs | 实际B EPIPE恢复接线缺失RED→一次GREEN；原body/context、一项持久授权、发送前消费、不改军表Plan；0模型 |

这些门用于防止同一工程bug回归。最终验收必须继续真实Run→模型查询/修订→当前Plan/Teach/source全部准出，不能以本表替代。

## 4. 当前实际续跑点（必须读实时progress再操作）

- 最新同版进程：A **20182**，B **20183**。观察日志分别为 `resume-v269-20261016.log`。
- A Plan6：原网络恢复已真实返回；原62输出的schema反馈路径继续来源审核，当前请求67在途。累计已知65调用/4,490,008units。
- B r3合法2000分：原早期Teach已结束并返回写表，第二份Teach正在请求29精确恢复原28；原EPIPE未知费保留。累计已知27调用/4,502,132units。
- 上述为观察时快照，不是长期活跃保证。禁止另起重复进程；先核对progress、请求及ps。
- 后续仍使用 `node scripts/run-slice272-fresh-generation-v240.mjs <base> A|B --resume-product --generation=264`，仅有真实未处理网络请求才使用对应受控恢复。不得fresh重建来掩盖断点缺陷。

## 5. 本轮文件差异与后续交付

产品：query-delta、query-recovery、preset-journey、pregame-scene-laboratory、final-plan-review、新review-output-recovery、provider-dispatch-recovery、iterative-roster-draft-teach。另6个具体故障回归脚本和本报告/入口/任务记账。未改业务军表、Plan、官方规则数据、地图、策略Skills；未提交Git。

剩余交付：①A/B真实自动准出和策略人工可读报告；②同工具链的UI/Room/首动作验收；③恢复计划内对局比较；④复盘与Skill演化。未准出不得启动新对局。

harnessLoopUsed=true；targetGames=[starcraft-tmg]；promptPackRoutes=[roster_strategist,teach_framework,fact_probe,final_plan_review]；harnessToolsCalled=[product_run,query_repair,saved_scene_restore,structured_plan_revision,dispatch_recovery]；uiTraceEvidence=本轮产品Run及落盘回执，无新浏览器截图；agentDecisionEvidence=B r3原始2000分提案/Plan、A原来源修订记录；memoryTraceEvidence=原会话workflow与付费记录；trainingTraceCandidates=[]；trainingTruth=false；userVisibleChecks=完整真实准出待完成；rollbackOrDemotionRules=错误参数/换题/未知证据不得转成通过。

## 6. v270完整流程继续暴露的批次隔离缺陷

v269真实续跑：A完成来源审核并进入Teach；B请求29精确恢复原28成功，进入2000分第二Teach调查。这两项是实际模型链路证据，不仅是夹具。

A后续请求77–79的调查输出7条查询中6条JSON有效，Builder比较的一条嵌套JSON字符串在4037字符末尾缺结束；原校验反复要求整批重写，三次后整体Teach停止。不是网络错误。

v270将格式正确的外层批次与每条工具参数分开：绑定ID不因单条坏JSON中止；执行处将坏参数保存为不可执行的原始字符串，返回具体JSON错误/未回答状态；有效同批查询继续原生工具执行。下轮调查负责纠正该问题，最终未解项接受门不改变。未自动补JSON、未修改军表/Plan、未把unknown当false。

`verify-slice272-query-batch-isolation-v270.mjs`读取A实际保存回复：RED→一次GREEN，6有效+1隔离、原付费内容不变、0模型/Native。此局部门不替代真实续跑。B已请求安全暂停，等待在途回复落盘，随后A/B同版恢复；恢复前核对真实进程，勿重复发请求。

07:05Z更新：B原37完成落盘后进程退出、暂停标记归档，A/B同版v270原会话续跑，PID53744/53745。A80已返回并执行工具，B38在途；B仍为合法2000/r3。实际产品Run日志resume-v270-20261016.log。两组未最终准出，无新房。最近已报A78调用5,640,148units、B36调用9,407,940units（随后调用继续累计）；原未知费用额外保留。
