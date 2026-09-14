# Ticket 18 / Slice 174：当前版本取证审查与真实校准

最新续篇：[总规则策略八维生成完成](ticket-18-slice-174-general-strategy-eight-axis-generation-2026-09-07.md)。
本篇的2/8是生成前检查点；最新正文与模型审查为8/8，独立来源/Case/整局验收仍未完成。

本轮目标：修复“当前策略已经修好，审查仍复制历史否定意见”的问题，然后复用付费产物继续生产。
固定 StarCraft TMG 工作目录、冻结官方数据和FAQ、原Shared SQLite账本；没有启用Codex子agent。

## 实际结果（本步完成，不代表Slice或Ticket完成）

- 新审查路径真实校准14/14项正确：当前版本7项均无该缺陷；只重植两处真实错误的对照版本中，2项被检出、其余5项保持无该缺陷。
- 校准是同一策略的2个版本、14项判定，不是14个棋局或完整对战测试。
- `objective_plan`完整11字段新审查完成；生产pilot零付费复用该维后，真实七角色生成了`activation_tempo`，其11字段新审查也完成。两维均为模型未报告当前缺陷，独立来源、Case和整局策略验收仍未完成。
- 总规则策略正文及模型审查2/8维；剩余6维：移动站位、威胁与交换、资源时机、不确定性处理、对手回应、复盘调整。这些是一个总规则Skill内部的维度，不是新增8个Skill。
- 本步新本地检查：取证协议/生命周期/结构化路径7组、容量迁移5组、生产与反思接线6组、真实历史隔离与只读重启4组，共22组通过，均零付费。最后历史修复后重跑5+6+4组；原7组是首次真实校准所绑定的历史回执，未覆写。
- 校准及首维完整审查：9个实际请求，2,043,271 tokens，估算¥2.190576。第二维生产pilot：10个请求，2,274,358 tokens，估算¥0.372952，未超过其¥3子预算。
- 本步合计19个请求、4,317,629 tokens、估算¥2.563528；全历史累计114,276,295 tokens / ¥81.219641。无在途请求、无402，未达到¥100提醒阈值；仍扣同一原生产预算及共享账本。

可直接阅读[两维策略候选](../build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/evidence-production-pilot-v1/strategy-candidates.md)。
产物已有选择条件、备选方案、对手回应、风险与改计划条件，不再只是规则摘抄；但这不是策略优越性的实战证明。

## 已证实的原因与设计修改

旧审查请求已经携带正确的currentPolicy，真实wire与Host实际应用候选hash完全一致。
因此不是把修正漏发给模型，而是审查继续重复历史的“没有区分第一回合”“没有第三对手分支”等意见。

新入口保留完整workspace（冻结来源、FAQ、规则参考、开发Case）和完整历史，不通过删历史来变绿。
输入最后明确放置`authoritativeCurrentSnapshot`：精确当前候选、逐字段/叶片段表和本批目标。
历史独立归档为不具权威的旧意见；新审查每次必须重新核对当前文本。

输出不要求模型抄哈希或长来源ID，而是选择Host提供的当前正文片段ID和来源片段ID。
Host根据精确表还原实际内容、来源ref及哈希，并检查覆盖、重复、字段和来源绑定。
这些检查只保证引用确实存在，不冒充理解正确；模型语义通过上述对照校准单独检验。

意见按版本追加事件：`alleged_open_needs_confirmation`、`unresolved`、`model_reports_no_current_defect`。
旧意见不删；换候选后不得继承“已解决”。模型意见不能直接生成修改字段，疑点先进入独立处置。
程序只把明确批准的字段补丁应用到父版本，其他字段保留不变；来源意见不是编辑命令。

## 容量合同的实际修正

完整字段审查首次返回7段真实来源，被V1每项最多4段的容量门拒绝。保留的完整响应与rejected-candidate允许本地恢复，
不需要再让模型生成一次，也不能删掉3段来源来凑数。

V1冻结，V2只改两项：当前片段最多8→128、来源片段最多4→128。128是已有schema子集的数组安全上限；
每批仍最多4项、单次输出仍4096 tokens，来源存在性、字段绑定、mapper、语义验证器不变。
机器比较精确schema增量；14项旧实际校准在V2下重新物化出的证据hash逐项相同。
失败响应全部原值、7段来源及账单保留；新合同另做真实探针，旧合同凭据不冒用。

真实校准报告：`6fc2a2801f653c262419cd047309d3732d41d87a38a5749cf96a38c59fba7699`。
容量迁移证明：`8ed73f93b8d73e79ee9f861b817c1365f4f151eeba2e40cf96b3c419814b2f11`。

## 共用生产与反思接线

`strategy-evidence-production-v1.mjs`组合已有七角色生成器、共用结构化运行时和新取证审查器，不另建Rules或在线DSH运行时。
新增验证证明：七角色之后审查全部11字段；重复启动精确复用；疑点保留并等待独立处置，不进入盲目重写循环。
实际已付费Host修正可直接接回，无需重做七角色。

反思使用已有开发反馈构造器的绑定输入，限定字段修正后走同一新审查器，重建完整策略层并保留其他维度；
旧接受标记全部失效，heldout反馈不能直接进入教学或修正。此处的反思验证是注入测试，不是实际对战复盘已完成。
这条入口面向新共用条件策略格式；旧大段族Skill脚本保持冻结，不宣称旧脚本已经全部自动迁移。

## 真实生产与重启收口

生产pilot实际复用首维及其全部字段审查，再用七角色生成第二维，分三批检查全部11字段；新增10次真实请求，没有自动重试。
配方hash：`472bd910e52fd1152490a7c13969ae9acbd07859d46bfedad757d5dae8ee2394`。
终态报告hash：`a8097ef7bd7479fcb314ea89f9b7bca80745a2fa01cbf9aee35f9520c32522ce`。

收口发现新的跨阶段漂移：校准夹具动态读取同一run全部历史，因此后来加入第二维会改变已经完成的首维实验输入。
先以真实数据复现哈希变化，再改为读取首次真实校准已冻结的完整历史快照，并逐项验证原artifact仍存在于SQLite；
没有删掉该实验当时的上下文，也没有把后来生成的不同维度塞回旧实验。全新夹具的回退范围限于原`objective_plan`。

只读重启检查禁止所有DB写入、预算预留/结算、DSH和Provider调用，以实际库复用14个检查点并重现两维候选hash。
14个包括7个生成角色、5个已存审查批次和2个候选产物；另一个首维审查批次来自显式容量导入，不伪造为新调用。
历史隔离回执：`d37ec0936b7862d274b1570f4457b88819b4034e1c14502d6db3c838ca6414a8`。
最终pilot预检再次得到相同配方hash，零API。此修复只针对新夹具的实验身份，不重编译Case、不刷新数据。

## 尚未完成与下一步

先独立核对第二维的措辞边界：Turn/Round/单次激活是否混用、一次Reaction与反应触发窗口是否混淆、
首个Pass获得先手标记及标记持有者选择先行动者的条件是否写清。这些是待审项，不能被模型11字段无问题自动消除。
随后以新的有界续跑配方从`movement_position`开始完成剩余6维，保持旧产物、预算和来源谱系；当前pilot固定只生产一维，重复执行不会新增其他维度。
现有冻结组件Case仅覆盖3/8通用维度、共5个合成Case/13分支，仍需补齐覆盖和独立决策消费证据。
新总规则策略验收之后，才完成两个种族与双向对抗的策略生成/检验，并验证实际对战复盘升级。

## 入口与证据

- 首次协议验证历史入口：`node scripts/verify-ticket-18-strategy-evidence-review-v1.mjs`；其原回执被已完成校准绑定，不为重启旧流程覆写。
- 容量迁移验证：`node scripts/verify-ticket-18-review-capacity-v2.mjs`
- 生产/反思接线验证：`node scripts/verify-ticket-18-evidence-production-v1.mjs`
- 真实只读重启验证：`node scripts/verify-ticket-18-review-history-isolation-v1.mjs`
- 已完成、冻结的历史校准控制器：`scripts/run-ticket-18-evidence-review-calibration-v1.mjs`和`v2.mjs`。历史夹具修复后以新隔离回执证明增量，不把旧控制器作为当前续跑入口。
- 已验证当前预检：`node scripts/run-ticket-18-evidence-production-pilot-v1.mjs --preflight`；该pilot的`--live`已完成，重启仅复用这两维，不用于生产剩余六维。

证据根目录：`build/ticket-18-general-strategy-live-v1/general-strategy-3705e4aa46ecd74a7826207a67b5b096/`。
新增目录`evidence-review-calibration-v1/`、`evidence-review-calibration-v2/`、`evidence-production-pilot-v1/`。
本地readiness回执位于上一层`build/ticket-18-general-strategy-live-v1/`。
原始无凭据请求/响应和完整证据以0600权限保留；Keychain秘密只进入隔离Provider worker。
本轮费用含保守失败估价，不等同Provider最终账单；不通过降低历史估算隐藏预算消耗。

按离线Skill/ctx2skill/harness技能要求，source review、Case选择和整局有效性分别验收，promotions为空，trainingTruth=false。
Ticket18仍2/8、Slice174 active、项目16/22、正式五件套0/5。原总规则参考书不等于新通用策略验收。
