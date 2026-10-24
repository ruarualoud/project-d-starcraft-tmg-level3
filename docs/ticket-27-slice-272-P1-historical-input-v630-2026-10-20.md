# T27/S272 · P1：历史只读输入与当前执行依赖分离

## 原生执行前暴露的缺口

v629真实P4检查任务`p4-fact-recording-v629:r7`入队后立即`superseded`，没有inputRef、模型回复或费用。其自身绑定与当前r7完全一致，但显式引用r6军表／Plan摘要和此前决定作新旧对照。调度器把所有`source:evidence`都当成必须匹配当前版本的执行依赖，因旧Plan绑定而取消。

这不是模型效果、网络或重试失败。新旧策略比较、Teach、复盘本来就要读旧版本；原合同没有表达这种用途。不能把所有旧材料重新绑定为当前、删掉版本身份，或重放旧请求来解决。

## 明确的输入用途

- 默认仍是当前依赖，原版本失效规则不放松。
- `source:evidence, scopeUsage:historical_reference`仅供五类只读模型角色：总体决策、局部Teach、最终审核、事实汇总和实验规划。任务自身仍须绑定当前版本。
- 历史读取交付原正文、真实validity、originalBindings、currentApplicability=not_assessed；模型输入另有统一历史引用说明，不能当作当前规则／Plan／Native执行依赖。
- Native工具角色不能使用历史引用模式；未知scopeUsage直接拒绝。没有隐式按字段名猜“previous就是历史”，也不自动修改旧已取消任务。
- 原精确历史读取仍走产品`read_evidence`，不是复制内容造新回执。原件／旧版本／费用／失败记录不改。

## 定点门禁

`verify-slice272-historical-reference-input-v630.mjs <同一Run>`实际缺陷RED→修改后一次GREEN，未重跑v629等已通过门：

1. 显式历史比较任务可以正常派发并收到原r6正文及原绑定。
2. 同一个来源未声明历史用途时仍失效；任务自己的错误Plan绑定仍被拒绝。
3. Native角色历史模式、未知用途均拒绝。
4. 原材料不变，旧取消工作不重放；0 Provider／0 Native／0生产状态写。

修改`roster-decision-workflow-v1.mjs`、`roster-workflow-read-role-v1.mjs`及当前观察客户端的显式输入声明。这里只证明输入合同，不是P4真实模型选择或最终Plan验收。

## 实际续行点

57336已安全完成1190/current advance退出：r7，mechanicalBlockers空，semanticIssues13，activeWork3。

64264以同一Run、同一产品`requestDecision`入口执行`p4-fact-recording-v630:r7`；原v629检查未派发，不重试／不重买。日志`build/slice272-live-product-review-v630.log`。实际模型选择、独立事实记录及Plan版本不变的证据仍待观察。

军表仍为2000矿／120气／9单位／29模型。旧r7增加Native注记不是战略更优证明。

### 实际1191：输入／模型／保存的完整小闭环

- 正确声明历史用途的任务已实际派发，不再被取消。真实Flash使用总体决策合同1.2.0，返回`record_facts`、`mutation=null`、`strategicChanges=[]`，明确区分私有Native观察与战略改变，并拒绝为了记日志再次改Plan。
- 产品保存`draftOutcomeRef=881750d685dfa80eb43ed16921623bf1e0f5a57fc56cfc329a9d3490d80c9ee0`，`applied=false/status=retain/evidenceRecorded=true/draftUnchanged=true`。
- 可查询记录`decision-evidence-record:p4-fact-recording-v630:r7`已实际发布，原工作／原绑定在正文保留，导航入口bindings为空且currentApplicability=not_assessed。Plan仍r7，没有r8，无军表改变。
- 本条分类检查没有新增requiredData；原requirements中的11条全局待审问题仍保留，不表示整个Plan无未知。记录不授予来源／最终Plan批准。
- 真实用量339,581 Tokens，Provider延迟14,870ms。输入编码后1,175,751字符，仍偏大；这是带历史对照和整份观察的能力检查，不能把模型回复正确宣称为P2整体性能达标，精确输入分块仍须继续评估。

至1195主Run已知57,312,594 Tokens，可计价部分估USD10.228876542；项目已知163,928,517 Tokens。新增1180（65,339 Tokens）及1181（294,125 Tokens）缺reportedModel，连同767/955累计655,307 Tokens仍未计价；942／更早未知费用保留。该计费元数据缺口按Medium记录，不阻塞生产，不杜撰模型或价格。1196及后续未计。

主线继续原Run的r7事实／复审，不能把这个小闭环当正式完整军表／Plan或策略优越性验收。

正式Plan0/6、对局0/12；T27 5/6、T23 33/36，相关剩余4片。六项能力、P0–P6及正式中文报告范围不缩减。
