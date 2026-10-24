# P2／P4：正常产品的假设阶段与短审核句柄

2026-10-20，T27／S272，新P0–P6。以下不是最终生产报告，也不是策略优势验收。

## 实际缺口

两路v645正常HTTP产品：editable r5登记61个工具工作单、fixed r12登记30个，全部`hypothesisTest=null`，两份Plan的`comparisons=[]`。普通查询确有用，但不能据此声称完成策略对照。已有专用假设Teach／总体决策helper没有被正常product journey调用。

## P4 v667

基础军表／Plan、必要事实与通用Teach就绪后，同一产品安排：独立Teach挑选重要取舍，提出假设、可信备选、控制条件、支持／反驳观察和决策后果；总体角色使用已有充分证据或授权有边界的局部实验；实验角色沿已有`hypothesisTest`及条件结论／独立来源审核回交；总体角色实际改表／Plan或有来源地保留。之后仍需受影响与最终审核。

不指定战术、不强迫改表／无必要实验、不模拟整场。`record_facts`不能代替本职责的战略取舍，误用进入原局部纠错。阶段键只标识army/rules/map/source及编辑模式，不随Plan文字增长重复派单。真实提交后旧工作即使`superseded`，实际applied回执仍可证明回交，不重买实验。

产品状态／发布判断包含`strategyCycle`，核心审核green不能绕过未回交的策略阶段。`strategyImprovementProven=false`保留：作者返回不等于策略更优，也不能由Host打分证明。

定点门`verify-slice272-product-hypothesis-stage-v667.mjs`：真实固定r12冻结草案、受控Run的发布前接缝。RED96491实际未排专用Teach；仅一次GREEN98074，验证Teach＋依赖决策、禁止提前发布、记账不算回交、允许有依据保留、断点幂等、Plan-only不重复、applied历史可追溯。Provider0／Native0／生产写0。**受控调度不是模型策略证明。**

## P2／P5 v668

真实fixed `final-review:r12:plan_continuity`三轮停于`review_obligation_coverage`：返回21项，但两条最长343字符的嵌套因果ID被重复抄写，真正另两项漏掉。不能用数量相同冒充覆盖，也不应让模型维护这种地址。

共同角色输入改用完整原问题＋`q1…q21`短句柄，Host保留原ID并回映。反馈列明缺项／重复；不按相似文本猜答案，不把旧重复结论搬给漏题。精确pending重试保留原请求，只有新纠正请求采用新句柄。原21项义务、证据、付费原文和账不变；只有此来源修复追加一次反馈v3纠正，已带v3不能再续同修复。

定点门`verify-slice272-review-obligation-handles-v668.mjs`：RED99987无可用恢复；仅一次GREEN1277，实际角色执行器回映21个原ID，问题逐值相同，受控回复全部`needs_evidence`且必要未知保留，原付费字节不改。Provider0／Native0／生产写0；**不是实际模型已纠正成功。**

## 生产恢复与剩余

- 原fixed工作流`decision-959c1d9c-d6e0-43b4-8196-faef5b42fc34`：85447终态且日志finished后，由1578载v668，日志`build/slice272-product-generation-v668-fixed.log`。已观察原r12审核恢复ready；新实际回复／策略实验待。
- 原editable工作流`decision-58c2b2f9-e4cf-4b5d-9ac3-4c8c36bbb0e1`：87726收到当前操作后退出请求，未确认终态前不并开writer；终态后原工作流载同版。
- 预算空页拒绝诊断正单独核查，尚不宣称修复或全局无解。

T27 5/6、T23 33/36；正式Plan0/6、游戏0/12、相关余4片。策略改善证明、真实完整生产、P6发布桥和最终中文逐步报告仍待。

## v668实际采用／v669预算证据

固定组实际Flash纠正完成：r12 `plan_continuity` 已 `evidence_ready`，21项／21唯一原ID、21条短句柄回映，failure=null。之后实际进入`review-resolution:r12:combat_and_losses`。这证明该局部自动纠正，不证明战略比较或全体验收。

现写组空预算页查到共享源端缺口：`queryRosterBudgetBranchesV1` 对非合法verdict直接continue，丢失了完整Builder拒绝证据。真实原page3 offset48首候选被同一冻结Builder判为`ARMY_SLOT_CAPACITY_EXCEEDED:Hero`，不是网络／模型幻觉，也不意味着不存在别的合法表。

v669增加`rejectedBranches`保留原变更步骤、候选身份和完整`builderVerdict`，`rejectionSummary`按真实原因汇总。合法branches、分页计数／排序和完整Rules审核不变，不替模型修表／打策略分。旧回执不改；后续新查询才带新诊断。

定点`verify-slice272-budget-rejection-evidence-v669.mjs`：首次夹具错误选offset0，那里未复现拒绝，明确未当RED；改用原空page3的offset48后，PID4581观察到实际Hero拒绝而返回无诊断，真实RED。源端修后仅一次GREEN5804，原Builder拒绝逐值保留、原草案不变、Provider0／Native0／生产写0，单候选查询11.164秒。不是完整页性能或模型已会改表的证明。

87726已终态且finished／paused确认，原editable工作流PID6378载v669，日志`build/slice272-product-generation-v669-editable.log`。fixed1578请求当前操作后退出，下一精确确认终态再原workflow载同版；不并开writer，不丢当前付费请求。

随后1578终态／finished确认，原fixed由PID7408载同v669，日志`build/slice272-product-generation-v669-fixed.log`。最近精确`ps`确认6378运行2分23秒、7408运行1分03秒，均CPU执行中。editable仍r5／1610矿8单位，正在原预算page9；fixed仍r12／2000矿9单位，继续已保存的局部战损场景。此时两组尚未排出新的hypothesis工作；不能把接线门通过写成模型已经完成策略实验。下一只观察这两精确进程与原workflow，不因观察边界重建。

## 两路新流程用量截点

仅统计这两个v645新workflow，从各自创建开始去重实际reply trace；**不是本轮新增费用，也不与旧项目总账再相加**。按本两路固定Flash配置与冻结价格接口估算：

| 流程 | 已记录回复 | Tokens | 估算USD | 截点UTC |
|---|---:|---:|---:|---|
| editable | 201 | 14,327,069 | 1.749203694 | 2026-10-19 22:58:47.384 |
| fixed | 462 | 37,968,203 | 4.712095818 | 2026-10-19 22:58:33.168 |

每条使用原请求时间、缓存命中／未命中与输出量计价，非账单；旧未知传输费用仍保留且不含在表中，截点后的新调用继续累计。没有重置费用，也没有新增费用硬上限。

## P4 v670–671：纠正本轮初次接线的时序与正文缺口

v667把专用假设阶段放在mechanicalReady后，导致当前1610/2000的现写表在反复预算调查时仍进不了它。这是接线顺序不完整，不能称已解决。

v670现在于已有初步军表＋Plan后就排**只读假设Teach**，允许与事实查询重叠；不提前创建第二个军表写入者。同一Run的正常总体／调查frontier角色会收到已经完成、属于同army/rules/map/source的独立提案，因而可以在写表过程中权衡、授权局部对照或有依据拒绝，而不是等到满分后才思考。提案仍不是事实，Plan版本变化时需重新判断相关性；不同事实绑定不注入。最终专用owner回交与受影响审核仍保留。

`verify-slice272-early-hypothesis-teach-v670.mjs`用真实r5部分表的受控产品接缝：RED11836（未派），一次GREEN12410（未满分即派只读Teach，0提前并发写入；提案投影逐值保留，跨army排除）。Provider0／Native0／生产写0；正常角色实际采用仍待。这是v667时序的后续修正，不能用v667旧调度门宣称最新时序已实战完成。

逐步检查又发现旧假设helper未交`inputs.draft`，使既有`current_plan_teach_subject`正文读取／作者确认机制不生效。v671仅补真实当前`draft:rN:summary`入口，复用原机制，不手写Plan或结论。`verify-slice272-hypothesis-plan-subject-v671.mjs`：RED13363→一次GREEN13543，真实r5的27个正文块可索引；Provider0／Native0／生产写0。真实模型读取仍待观察。

v669预算page9已实际返回24个拒绝：Elite槽超限10、Hero槽超限14；总体角色的真实输入确实包含`rejectionSummary`与原规则错误，不应把后续继续分页误称诊断仍未送达。模型当时仍选择下一页，尚未收敛或补齐390矿。

6378／7408均已请求当前操作后退出。7408终态／finished确认后，原fixed由13848载v671，日志`build/slice272-product-generation-v671-fixed.log`；editable6378仍在原预算计算，先确认其终态才可起原workflow新writer。没有因CPU忙／观察等待重建。正式0/6、游戏0/12、余4不变。

### v671实际采用截点

6378随后已精确终态／finished／paused确认，原editable由15268载同v671，日志`build/slice272-product-generation-v671-editable.log`。最近精确ps：fixed13848运行2:03，editable15268运行0:25，均CPU执行中；不可把初始化/长计算当进程已死再开writer。

fixed真实新工作`product:strategy-hypothesis:v1:3621f50797e05ed31755:teach`已经执行3条实际付费回复，累计27条来源读取，status=`needs_model_choice`、failure=null、无pending。最后公开理由要求先读当前componentPurposes和真实能力／卡牌来源，再选最有决策价值的协同取舍；其`proposals=[]`，尚未提交最终假设。因此仅证明当前Plan读取与真实角色已运行，**不证明已选出假设、做了对照或提升策略**。下一继续同角色和原实验，不另写一个演示结论。

## 规范影响

Harness规范使本轮以真实派单／工具／回执／采纳区分进展，不以字段代替行为；离线进化规范保留实验与真实记忆／Skill晋级的隔离；深模块设计将修改放在共同产品／角色接缝，脚本不编排第二条链路。
