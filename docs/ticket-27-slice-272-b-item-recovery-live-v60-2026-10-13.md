# Ticket 27 / Slice 272 — B 逐项纠错实际执行 v60

最终状态：B Plan v8 已完成当前版本源审（有效 Critical/High = 0）和真实模型 `accept_teach`。仍有 Medium，且本轮确实暴露了两个工程循环缺陷并需要修代码，因此不能宣称长期无人干预稳定。尚未连接 B/D 对局房间。

## 为什么改

遵循 [v59 工业方案调研](ticket-27-slice-272-b-recovery-industrial-design-v59-2026-10-13.md)，本次不再增加一个盲审角色。B 的真实失败是整批 7 条资格结论要求同时有效，2 条数字命题绑定错误拖住另外 5 条；同时错误的旧审核理由进入纠错输入，调用上限异常丢失已有 attempts。

## 已实现的产品改动

- `roster-final-plan-review-v1.mjs`：policy 6 按条保存 accepted / needs_evidence；完整覆盖仍检查，但失败条目不清空已通过条目。语义证据错误转入原计划的事实纠错，不重复要求整个批次重新贴标签。新的模型请求选择证据 ID，由 Host 展开原文。数字由原规则/计算器比较，未解 High 不降级。
- 同一模块的 `buildRosterReviewFactPacketV1`：最终源审、资格审核、纠错共用规则事实、按玩家/marker 组计算的得分、审计后的编制容量。历史 v5 输出仅在原 Plan/审核/事实上下文完全匹配时导入，再逐项重验，不修改已付费输出。
- `roster-strategist-runtime-v1.mjs`：去掉未证实的旧 reviewer reason 作为纠错指令；传入原始命题、已核实比较或 needs_evidence、共同事实及整份计划关联文本。局部修文不锁死后续 Teach 的改表能力。
- `roster-planning-workspace-service-v1.mjs`：每次派发前/逐项完成/任意异常都保存恢复状态；调用次数独立持久化，不能因为异常缺少 attempts 而自动重置。旧 policy 历史和未知费用保持。普通 Web 产品入口使用同一服务，不是额外修改 JSON 的实验通道。

## 唯一对应门禁

`scripts/verify-ticket-27-slice-272-item-recovery-v60.mjs` 只为复现本次 B 已保存的实际失败新增。

旧实现 RED：PID 34068，`ROSTER_FINAL_REVIEW_RECONCILIATION_OUTPUT_INVALID`；17/20 的 VP 原句绑定失败导致整批丢失。改动后的唯一 GREEN：PID 48098，`ITEM_RECOVERY_OK`。零 Provider 请求、零房间写入，未跑全量或重跑历史成功门禁。

结果：原付费数据恢复 5 条有效判断（1/6/77/89/90），17/20 单独保留 unresolved；1 是实际来源归属问题，继续 High；6/77/89/90 依已有有效反证为 Medium。因此真正待纠错仍是 1/17/20 三条。伪造“17 已通过”的决定会被拒绝；Provider 异常的 attempts/checkpoint 也能留存。

## 真实执行，不以测试替代

原工作区、军表、费用谱系不变：

- Teach：`rws-6c164d9d-406a-425a-9f83-688bbe629226`。
- 从头写表 Journey：`iterative-web-c8738603-ea4c-466e-a5c9-73cf2e77cb55`。
- 原 Plan v6：`4a2f0c16d4e26c9dc295e958ea2e8477d30c9bb5e60da2d65594e08decb47a41`。
- 起始完成调用 86 次，5,555,265 units，历史未知费用保留。
- Host 49068 使用同一 workspace，未接 Room Launch；续产进程 50337。启动脚本原先早于服务就绪退出，尚未发送任何模型请求；加入就绪等待后启动，未重复付费。

北京时间 18:28，产品 `/repair-reviewed` 接受一次已有授权的纠错周期。资格阶段 **0 次新调用**，随后模型只修三处文本。第一次真实返回得到 Plan v7：`b374c73716271c3e269cdea46d8361f3bc99426d7075b9ff6d382b336b6c9063`。

修正内容：

1. 去掉“ch-1 已证明击杀是唯一剩余手段”的错误归属，明确投影不是已发生得分，击杀只是待验证候选手段。
2. 明确 player2 的 2/4 两点为每点 1、两点合计 2 VP；player1 控制同组为每点 2、合计 4 VP，不再把单点值当组总和。
3. 同步修正该分支的预期应对文本。

本次修文只用 **1 次调用：66,347 input + 1,680 output = 68,027 units，11.355 秒 Provider 时间**。原军表/到达计划/得分目标未手工修改。当前累计 87 次、5,623,292 units；这不是完整纠错链路最终成本。随后自动进入改动项源审和当前版本 Teach 接受，最终状态见下续记。

## 完成度与后续验收

T27 5/6、T23 33/36；余 Slice 248/272/249/250 共 4；有效完整对局 0/12。当前三项机制交付已实现；真实 B 准入交付尚未完成，单个成功修文不足以声称长期错误率已经下降。

下一步观察当前源审能否保留未改项、模型是否接受实际 Plan v7、是否重新开启改表，以及重复错误/调用/耗时。D 仍后排。A/C 原房处于共同停点（A r129，C journal r144/driver143）；本轮未重建或推进，HTTP 拒绝和 R2 审计仍需处理。

## 实时证据位置

位于 `build/ticket-23-three-arm-performance-baseline-20261010-v1/query-contract-audit-v30/roster-deliberation-live-v43/`：

- `item-recovery-red-v60.private.json`、`item-recovery-green-v60.private.json`。
- `B-v60-item-recovery-progress.private.json`、对应续产脚本与 stdout/stderr。
- `workspace/drafts/rws-6c164d9d-406a-425a-9f83-688bbe629226.json`：原付费输出、v6/v7 谱系、逐项恢复、最新源审。

上述 private 运行材料不是对外凭据文件；报告不复制任何 API key、seat token 或完整私有请求头。未安装依赖、启动代理、刷新规则、删除历史或提交 Git。

## 最终实际结果与本轮新增问题

第一轮 v7 审核意外扩大为 12 片，原因是派生 `sourcePlanHash` 被当作独立非文本依赖；它随任何修文改变，导致实际单位/规则/地图都未变也重审全部。真实 v6→v7 三处修改 RED58153，修复后唯一 GREEN59020，改为比较实际依赖而非派生摘要。两份 Plan 完整合同仍验证，未关闭规则检查。

第二轮产生 Plan v8 `27c3ed17f7278942bc1903ba0e14c87c82cf3cf85b8cd5e2b204a0850801965f`，实际只审核 4 处、复用 87 处。军表和到达安排与 v6 完全相同。源审仍将派系编制说明中的“数值未知”列为 Medium；该文字并未完全修好，记录而不隐瞒。其他 Medium 也未作为已解决项。

随后又发现旧逻辑把增量审核继承的 3 条已验证决定再送审核。它们的有效 High 原本为 0，三次新返回漏填 counterEvidence 后却被重新变成 High。已针对真实输出做两条各一次 RED/GREEN：

- 完全覆盖且依赖不变的继承结论不再触发付费资格审核；存在新未解 High 则仍审核。
- 若重复审核已经发生，只有能复原**完全相同**的旧 reviewHash、依赖/文本/反证均未变、且没有新增已验证矛盾证据，才恢复原已验证结论。失败新输出仍留在历史中，不手工改计划，不按 finding ID 豁免。

加载修复后，产品自动纠错 job 完成，恢复阶段 **0 次模型请求**。随后正常 Journey 用真实模型接受当前 v8：

- decision：`accept_teach`，revision 6。
- requestKey：`fd00a54d8b1d28261dc86b65a100ff6f76deba638427adfd9f1e85b33b7e2f27`。
- modelReceiptHash：`4000ca45ca34af5c9761945091ee50681ab8efe663250e0ef7a4ec6056247620`。
- `teachFeedback.taughtPlan.planHash` 和当前 v8 一致；不是仅修改接受记录的版本号。
- 最终有效级别：Critical 0、High 0、Medium 81、Low 28。Medium 包含措辞和未量化假设，也包含尚未修好的编制事实说明，不能当作全局内容质量满分。
- 当前源审 reviewHash：`205e4d280ee5701316d80b94b287d1a945f24933297fccc6912d51c8be5bd842`。

离线 Journey 的 `canEnterRoom` 是固定 false、要求另接正式房间的产品阶段标志。实验续产器此前误把正常 `source_review_completed_clean` 当成失败；已补此正常终态识别，旧 blocked 日志原样保留。最终事实应以源审、当前 Plan 接受回执和本节为准，不是把 `canEnterRoom` 改成 true。当前 Host67293、origin 见 `workspace-host-v60r3-B-recovery.stdout.private.log`，未附 Room Launch；续产67294已退出。

## 本轮调用、频繁错误与差异摘要

本轮共 **21 次真实调用**：2 次定点修文、13 次源审（包括上述不应发生的 12 片重审）、5 次资格审核、1 次当前版本接受。工作区新增 1,536,112 units，接受回执另计 788,692 units，合计 **2,324,804 units**（input 2,267,166 / output 57,638）。按项目现有历史保守口径 input ¥3/M、output ¥9/M、不计缓存优惠，约 **¥7.32**；这是冻结估算口径，不是当期服务商账单，旧未知费用继续单列。工作区累计106次/7,091,377units不包含独立 iterative 接受账，不能漏算这一次788,692units。

实际回答“是否仍频繁出错”：**模型仍会错，不能说错误率已稳定下降。** 本轮资格返回仍出现数字原句作用域错误、数值字段塞入布尔事实、漏反证，以及“理由说正确却标 High”的旧式源审问题。它们现在不会自动被当作事实改坏计划；已通过项和真实 High 分开保存。也不能宣称本轮全程自愈，因为增量依赖/继承结论的两个工程缺陷确实需要本次代码修正。新流程已把当前 B 推进到真实当前版本接受，下一批独立生产和实战才是稳定率样本。

新增性能项：最终接受请求 input **787,658 units**，有明显上下文膨胀，后续需要按事实、挑战、变更和旧历史引用去重，不能直接截断策略上下文。本轮先不再修改已验收版本。

代码差异范围：3 个产品源（逐项恢复/共同事实、纠错输入、工作区持久化）与2个具体 bug 复现脚本；另外两条继承恢复问题使用本轮真实内存快照做定点红绿，未写额外无关测试。无全量、无历史已通过门禁重跑；无手工军表/Plan/分数修改。TASKS、PROJECT_MEMORY、CURRENT_WORK 和本报告同步。

下一交付仍为 B 进入正式同版对局前准备、A/C 原停点恢复与 R2 记分/路线审计，D 在 B 后；主线 Slice 248/272/249/250 四片、T27 5/6、T23 33/36、有效完整对局0/12不变。
