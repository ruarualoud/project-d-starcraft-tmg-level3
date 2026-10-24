# Ticket 27 / Slice 272 — v217 显式离线恢复

## 真实结果：两次受控恢复均未得到模型正文

A/B均实际发送一次且context/body与各自原请求完全一致，600秒等待生效；没有更换模型/prompt或扩大调查额度。两项授权均已消耗，不再自动重发。收到HTTP200不等于模型成功：两者都只收到9个空白字节，非空白0。

| 组 | HTTP200响应头 | 首/末正文块 | 总时限 | 新答案/Plan | 新费用 |
| --- | --- | --- | --- | --- | --- |
| A | 2.530秒 | 62.535/542.562秒 | 600.244秒 | 无，Plan9保留 | 未知 |
| B | 3.392秒 | 63.389/543.390秒 | 600.291秒 | 无，Plan19保留 | 未知 |

A新请求`roster-teach-framework-4bfb0f31-a3f5-4007-b807-4d59e24f1fa5`，DNS242ms/TCP465ms/TLS694ms/请求写完1525ms；终态transportFailure为总deadline，非socket inactivity。A原事实问题没有被回答，B原5条修订没有被应用。

结论仅限：本次不是DNS/握手失败、不是本地JSON解析错误，服务端连接保持但未交付非空白结果。无法由此断言内部排队、模型计算、输入规模或服务异常是哪一个原因。**单纯将等待延长到10分钟并未解决问题**，不再盲目加时/重发。

### B完整诊断

B于02:47:44.899Z失败；对应一次授权已消耗，不重发。新请求
`roster-revision-bc99bf6e-3a47-4571-a659-4148eb0badd9`与原请求context/body均一致。

- DNS290ms、TCP510ms、TLS731ms、请求写完2027ms、HTTP200响应头3392ms。
- 600291ms总时限超时；收到9字节/9块，**非空白字节0**。
- 首字节63389ms、最后字节543390ms、无非空白首末时点，正文未完成。
- 因而本次不是本地JSON解析失败，也不是断在DNS/TCP/TLS；10分钟实验没有得到模型正文。空白保持连接不能证明模型已成功生成、仍在计算或最终一定会返回。
- 无usage/新Plan；Plan19与累计256calls/36,328,314units不变，新费用未知。所有旧dispatch和费用、军表和到场排期逐值保留。宿主26264已关闭。

不把本次新诊断倒推成旧v212正文状态，也不据此断言服务商内部排队、算力或输入大小是哪一种原因。

## 范围与当前状态

用户2026-10-15批准：A/B各追加一次受控恢复，仅本次离线请求最长等待10分钟；不改模型、prompt、军表、调查额度，不启动对局，不自动再重试。旧503、400、超时及未知费用全部保留。

本次不是新Teach、不是重建房间，也不是策略验证通过。T27 5/6、T23 33/36；剩余272/248/249/250共4片，完整对局验收0/12。

## 已交付

1. 共享恢复协议增加显式的单次终态请求恢复：只接受最新失败物理请求，允许ambiguous或502/503/504；不接受上下文容量、鉴权等拒绝。旧重试祖先、其已消耗授权和费用不改写；对最新失败叶子的新增授权独立记录，一次消费。
2. Teach与Plan修订共用该协议；修订以前没有把retryDispatch传给实际工厂，现在与Teach一致。两者该次运行均关闭自动网络重试。原请求context/body一致性门仍在发送前执行，不绕过。
3. 新V3离线配置600000ms，默认V2仍240000ms；模型、采样、输入输出容量、重试策略不变。配置及出口合同允许600000ms，离线宿主必须显式`--offline-recovery-600s`，同时启用对局启动会拒绝。
4. v216安全正文计数和timeoutCause由新宿主加载；无正文/空白/部分内容只能按新回执判断，不能倒推旧请求。

## 精确验证（不重跑）

`scripts/verify-slice272-explicit-leaf-recovery-v217.mjs`使用实际A/B草稿的内存副本，在真实产品服务的createForRun边界停止，0Provider/0Native/0原草稿写入。

- RED一次：A错误选择消耗过的祖先而拒绝；B没有交接retryDispatch；原配置不存在600秒版本。命令观察超时后只读结果，没有重跑。
- GREEN一次：实际A/B最新请求正确交接、hash及旧历史保留、禁自动重发、已消耗授权拒绝；600秒通过真实配置注册器，默认240秒和模型参数不变。
- 宿主/恢复脚本语法各一次；无旧门、全量测试或构建。
- A首次恢复在发起Provider之前发现历史空闲宿主8700，保留失败preflightHistory；只增加未发送预检恢复分支，不另开计费轮次。该旧宿主内存Plan4、无activeRound/Teach；确认关闭不会回写草稿后SIGTERM。权威磁盘Plan9不变。

证据均在`build/ticket-23-three-arm-performance-baseline-20261010-v1/`：

- `common-v217-explicit-recovery-red.private.json`
- `common-v217-explicit-recovery-green.private.json`
- `common-v217-A-offline-recovery-progress.private.json`
- `common-v217-B-offline-recovery-progress.private.json`

## 恢复与账本

恢复脚本`run-slice272-explicit-offline-recovery-v217.mjs`以exclusive进度文件防止重复发起；HTTP观察超时仅继续观察，不重发；成功或失败终态关闭本次宿主。

| 组 | 目标 | 起始Plan | 已结算历史 | 当前宿主/观察进程 |
| --- | --- | --- | --- | --- |
| A | 原Omega独立事实调查，原最多3批额度不重置 | 9 | 165calls / 29,776,463units | 31953 / 31715（终态关闭） |
| B | 原保存证据Plan修订，不重新调查 | 19 | 256calls / 36,328,314units | 26264 / 25995（终态关闭） |

A绑定旧失败请求`7049a529-ab8d-4642-8407-09c570410db6`，B绑定`d4b34333-db84-4147-8b1c-279e507a2064`。新结果与新增usage以对应进度文件为准；“未返回usage”不等于免费。脚本不自动启动审核或对局。

## 剩余交付

1. 已完成本次恢复和诊断；不新增相同付费尝试。下一步如继续真实隔离实验，需要明确新的试验范围，不能复用本次已消耗授权。
2. A仍需事实答案；B仍需新Plan及语义验收。传输恢复本身不算Teach收口。
3. Teach收口后统一检查计划/决策/重规划工具消费者，再继续同代码实验；本次不启动四局。

### B 返回后的五项对照（仅复用旧证据，非新模型调用）

已读取原Teach的3retain/5revise；5项分别为：

1. 对手分支：条件摆放证明可占2/4，不等于真实对手必去；触发应基于可观察部署，保留反证与切换。
2. 能力需求：把Marauder/Hydralisk、Goliath/Raptor比较落到具体目标和原假设；原35/36、33/36为advisory，不能写成保证战果。
3. 减员：Marine被移除后的静态场景不是“原先拥有三点，必然掉成两点”的完整历史；marker1前后控制均null，no_contest_sticky_control不能省掉初始条件。
4. 配合时序：Orders的Movement窗口、可支付卡、1CP选择、Raynor第五轮到场与目标动作顺序需要一致；不得外推所有阶段或所有卡状态。
5. 替代计划：根据观测控制权/累计分差重算后再决定缩减或争点，不把条件损失场景写成无条件退出路线。

此清单用于检查实际修订是否消费已有证据，不注入新战术，也不把Teach本身当规则权威。原Teach第3/5项表述仍有过度推断风险，原修订prompt已明确要求核对该点；本轮未再改变prompt。

## Harness记录

- harnessLoopUsed: true
- targetGames: starcraft_tmg
- promptPackRoutes: 原fact_probe与原Plan revision，不改路由或策略
- harnessToolsCalled: 原离线workspace teach-framework/revise；无Room动作
- uiTraceEvidence: 本次传输恢复不涉及UI验收；无新截图
- agentDecisionEvidence: 本次没有非空白正文/新策略/Plan；原证据和公开理由保留
- memoryTraceEvidence: 原草稿/Teach历史/未知费用和消费授权均保留
- trainingTraceCandidates: 无，trainingTruth=false
- rollbackOrDemotionRules: V3仅显式离线选择，默认V2不变；新失败不自动重试
- userVisibleChecks: A/B实际结果、原请求身份、军表/到场排期不变、无对局启动
