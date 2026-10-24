# T23 / S248：合同检查、纠错修复与三组统一暂停

## 当前状态

T23 33/36（91.7%），T27 5/6；开放 Slice 248、272、249、250。
新12组已启动2/12、终局0/12。代码修复不等于完整对局或策略验收完成。
用户要求先暂停全部实验，修好后共同用新代码，不再让旧进程和新进程混跑。
B/C房间服务均优雅退出0；A/B写表工作台亦退出0。B浏览器驱动先SIGTERM，
房间收尾完成后仍未退出，最后仅停止这个自有驱动；没有硬杀Provider所在房间服务。
没有重建已有房间、重发未知付费请求、重跑旧绿、性能测试、全量构建或创建代理。

| 组 | 实际停点 | 续跑注意事项 |
| --- | --- | --- |
| A 固定2000+Plan | 尚未开局；三次来源审核后剩2High | 原付费计划未改；仍需真实模型修订和当前版本复审，不清零三轮记录 |
| B 从头2000+Plan | 第1回合Movement，权威revision8，8次提交 | Web只记到r7；第8步在优雅暂停期间完成，先补录截图/动作，不重做动作 |
| C A同表、无开局Plan | 第1回合Movement，revision7，7次提交 | 新版校验器先本地重验已付Planner草稿，再按原房继续 |

B实际r8状态hash为`bcea45ea02094127933e478f612b71b9b076eeb99a9102db4761c010b056e2ef`。
房间SQLite公共accepted_transition与后续Replay/record_outcome观察独立确认r8；
Web进度停在r7不能作为回滚依据。既有驱动会按未记录Receipt补录，不是重新Apply。
最终补录仍需新代码续跑时实际观察，不冒充已取得第8步截图。

费用以持久Provider账本为准：B本次对局3.096164，而旧Web进度只报2.459751。
累计A96.904048/B144.798322/C127.640253，各¥200分别累计；未知历史预留保留。
本次三类bug定点检查、模块加载、合同分析均0实际Provider调用/0原Room写。
恢复时保持房间原已打开预算上限和账本，不把“剩余额度”再减一次已记费用。

## 校验器是什么，不是什么

1. **结构合同，代码负责**：字段/类型/枚举、候选ID、参数归属、来源/当前状态绑定、
   计划版本与修订路径。模型生成的数据不因格式看起来合理就成为Rules事实。
2. **动作合法性，规则器负责**：Army Builder、进场Supply/时机、几何、攻击与机会事件；
   最终仍走LegalSpace→Preview→Apply→Receipt→Replay。模型审核不能绕过这个链。
3. **公开计划语义，模型审核辅助**：引用原句、来源事实、覆盖所有声明的审核分片；
   代码验证覆盖与绑定，但“所有声明送审”不证明“模型对所有声明判断正确”。
4. **文本误用保护，当前还有程序匹配**：此层不是规则器，也不是完整语义证明器。
   共有属性不能当成专属身份；本次C误拦正发生在这一层。

因此不能承诺自然语言校验数学意义上的完备性。保证的是非法动作不越过Rules/
Referee、修复任务不静默丢失、未知证据不伪装成确定事实、已付输出不盲目重发。
具体策略质量和长期语义效果仍要通过实际对局/复盘观察。

## 检查范围与结果

本次沿军表/Plan生成→来源审核→纠错→在线Planner/Action→工具→房间准入→恢复
检查合同接缝；不是1101个源文件逐个审计，也不是重做所有原子规则全量验收。

| 接缝 | 发现/结论 | 证据与状态 |
| --- | --- | --- |
| 结构输出→当前候选/路径 | 有既有封闭Schema、ID绑定和参数投影；修复只返回请求路径 | 静态检查，不重跑旧Schema绿门 |
| 查询协议→Host执行 | Medium：JSON把合法延后查询说成unsupported，而原生通道返回deferred | 实际C两条警告；同一故障红后修复，两通道绿；0求解器调用 |
| Planner效果→选中能力 | High：把entry edge+Ground reserves当成Omega专属效果 | 原C已付原句红；去掉共有属性身份推断，绿；真正“放Omega Worm”仍拒绝 |
| schedule创建→claim纠错 | High：首次调度阶段延期，后一次只取新High列表，遗漏原Medic欠账 | 原A真实历史/实际产品service红→绿；请求13条→14条，包含延期项 |
| 修订→关闭纠错项 | 不能因某轮审核没提到就丢弃未改原句 | 新队列由现有持久历史推导；改文且当前覆盖复审干净才关闭；不是新签名数据库 |
| 当前审核→Room准入 | 固定表和Agent表均需保留欠账；当前干净审核不自动覆盖旧欠账 | service准入标记/Agent准入挂接；实际新增准入行为留待后续真实续跑；模块加载一次0 |
| 显式来源仲裁→欠账 | 有效的既有反证仲裁允许解除对应原句；仅审核遗漏不允许 | 复用原仲裁验证器，非手工改付费审核；本次无实际仲裁请求 |
| 失败→已有输出重验 | 原生持久回复按归一化语义版本本地重验，未知付费派发仍需对账 | Planner归一化v31→v32；尚未重启C，所以不称实际恢复通过 |
| 暂停→Web记录 | Room与Provider账本可比Web记录领先一个已发动作 | B在途r8完成，保留真实停点和费用，补录不重做；不能信旧progress |

### 为什么曾经“延期”，合理边界是什么

刚Teach完的固定表计划尚未选定合法进场时间；先由模型选schedule并由Rules核验，
再修依赖schedule的战略文字，是合理的依赖顺序。**合理的是先决事实未完成，
不是无限延期纠错。** 原代码标明第一次只创建schedule、原句延期，但后来丢了
这条欠账，属于实现错误，不属于合理设计。

新版状态分为`repair_required`和`source_review_required`。修订保留原Army、
schedule、VP数值和未请求字段；修文后仍要来源复审。A原计划及原三次付费记录
保持不变，不能把零Provider假回复的工程绿当成正式计划已经修正。

## 最终代码变更摘要

- `roster-claim-repair-backlog-v1.mjs`：共享欠账推导，绑定历史来源、当前文本、显式
  来源仲裁；无新存储迁移、无新加密或签名门。
- `roster-planning-workspace-service-v1.mjs`：API修订合并保留路径、补齐段落范围、
  公开欠账状态；未闭合欠账影响准入，不只显示在日志里。
- `roster-strategist-runtime-v1.mjs`：当前审阅和旧欠账分别保留来源；仅接受绑定
  当前同一文本的保留挑战，不伪造新的当前审核结果；允许同次完成所有请求路径。
- `agent-selected-roster-journey-v1.mjs`：自动纠错/阶段显示/三轮停止看欠账，
  不因最新High列表为空就宣布完成；不清零旧审核轮数。
- `roster-planning-product-module-v1.mjs`：Agent表的预启动及实际Room准入接欠账合同，
  保持固定表/从头表同一来源语义；直接外部Plan仍先验证原修订链和来源。
- `live-flash-decision-port-v1.mjs`：共有入口能力不误认成Omega专属效果；JSON和
  原生延后查询共用typed deferred处理；Planner旧付费回复允许v32本地重验。
- 三个具体bug复现脚本：只覆盖实际A/C这三种故障，无新常规或全量测试。

三组固定性能/规则/几何/Skill代码未因本次合同修复改变。冻结源版本
`s248-contract-recovery-v1-20261010`：1099个packages生产模块+2个正式Web运行脚本，
清单合计1101；源清单SHA为
`a459d579001b3848d57b17c0564f109faae6e648943c98eb32eb4e91d28b4da2`。
这是下一次共同启动的来源记录，不是每动作重验所有hash或卡旧产物的兼容规则。
目前新版本正式实验启动0次；旧房间/记忆/地图冻结不变。

## 验证与剩余风险

- C共有属性误判：一次RED exit1，修复后一次GREEN exit0；原句通过，真错误
  Omega资产仍拒绝。没有再次运行已绿用例。
- A欠账丢失：真实历史+真实产品service，一次RED exit1→一次GREEN exit0，
  全军表/schedule/VP目标不变、原workspace字节未变；修复文字是本地假回复，
  不声明模型策略正确。后续兼容/准入挂接做静态审查及一次当前模块加载，
  没有把旧绿重跑当成全链验收。
- JSON延后查询：一次RED exit1→一次GREEN exit0；两通道deferred、无Rules/
  mutation authority、0空间求解器调用。
- 最终改动6个生产模块一次原生导入exit0；不重跑性能、全量构建和无关验证。

Medium跟踪但不阻止：自然语言模式仍不能穷尽所有语义歧义；一般query接收层的
回执完整权威检查分散在消费方（接收先验hash外观，实际Host port和消费方负责
source/current-state，宜以后统一，但本次未发现实际陈旧回执）；历史外部deliberation
便捷适配器和真实HTTP自动流程不能混称同一自动纠错证明。

## 下一步（尚未执行）

1. A用已修合同让模型修正2条真实公开声明，来源复审最终Plan。原三轮已用完，
   不在这里擅自追加第四次或清空历史；若用户允许追加一次最终验收，单独记账。
2. C先本地重验已付Planner草稿；发现其它High则独立报告，不因“这次修过”强放行。
3. 同一个冻结源工作树重启A/B/C；B从r8补录后继续，C从r7继续，A合法开局。
   相同地图/任务/模型/Skill/共同对手，不重新初始化已有房间，不重复第8步。
4. 继续完整对局、分回合计时/截图、工程纠错；策略弱项进入复盘，不注入偏好分数。

私有证据位于`build/ticket-23-three-arm-performance-baseline-20261010-v1/`：
`pause-for-common-code.private.json`、`contract-bug-validation.private.json`、
`common-code-contract-recovery-v1.private.json`。不给报告复制凭证或隐藏思维链。

Harness记录：harnessLoopUsed=true；targetGames=StarCraft TMG；routes=fact_probe_prompt/
harness_optimizer_prompt；tools=retained source reviews/real workspace repair boundary/
typed defer/selected-effect checks/durable Room+Provider observations；UI新验证=未执行；
decision evidence=实际A/C已付公开文本；memory=不改；trainingTruth=false；
回退条件=军表/schedule/VP/Rules事实或真实选中效果被改变；新完局证明=无。
