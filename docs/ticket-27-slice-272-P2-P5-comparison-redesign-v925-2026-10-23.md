# T27 / S272 — 作者改实验方案的显式交接 v925

## 结论与边界

修复的是新 P2/P5 产品流程的一处控制合同缺口：战略作者可改军表/Plan、查证或保留，但没有明确的操作将“修改实验范围”送回已有实验设计角色。自然语言宣称改题后，实际只提交了 Plan，原冻结问题仍要求回答，导致重复回交。

本轮接通结构化请求 → 原设计角色 → 原预审路径，**不根据旧回复的措辞替模型改题**，不跳过原独立来源/策略审核。定点门和真实产品 Run 的内存入口验证已过；尚无新真实模型消费证据，不能称已收敛。

当前：T27 5/6，T23 33/36；剩 S272/S248/S249/S250 共4片；正式 Plan 0/6，新对局0/12。

## 证据与诊断

B 实际作者结果 `8c0584a26e65c4c93203daca69aa2817539becb1521c51da32f7cb79fcca4ac3`：

- 理由称拒绝为原大规模 Marauder 方案腾预算，转为比较已经测过的小规模配置。
- 实际 mutation 只改 `goliath-1` 用途，军表没有变化，实验 purpose 也没有变化。
- Plan 中 `2.5833 − 2.0556 = +0.5278` 已写对，但同一回复的若干理由仍写成负值/阈值未达成。不能把回复内部矛盾当成通过；这与“工具值被传错”不是同一结论。
- 原 purpose `564d549fc1d5921a25bf5ef32d988513ff7c81c4428110cd080946efcc9783d3` 仍是原范围。Plan-only return 按其设计继续要求原实验，故作者的“改题”没有消费者。

判断：新增缺口是**操作能力和状态转换不对齐**，不只是格式错误。新入口允许模型显式提出设计修订；不能保证它会选对范围，也不能抹掉差值解释矛盾或把未测大规模配置判为劣势。

## 实施合同

1. `comparisonDesignRequest` 为独立控制操作，含原因、拟改内容、要支持的决策及已读取证据编号。
2. 只允许在当前比较上下文提出，使用 retain、无军表/Plan mutation；不能同时请求调查、宣称外部阻塞或提交战略修改。
3. Host 从**该请求实际交付的合同**生成交接，绑定原 purpose、cycle、请求/回复；模型不填回执身份。
4. 产品调度与 Run 入口共享同一校验：当前身份、未在途、明确保存的作者结果/处置、原设计版本、一事一次。旧 prose、过期或错目的请求不能转换成授权。
5. 交已有设计角色，带原设计与作者请求；新设计仍走原独立预审。只有替代设计预审通过并建立实验任务后，才按既有替代链退休旧方法任务；保留全部历史证据和账目。
6. 交接不解决原事实，不批准 Plan，不产生“收益为零”或“策略更好”的结论，不改官方规则。

## 验证

只验证本次缺口，无模型调用、Native 执行或生产断点写入。

- `build/slice272-comparison-redesign-v925-red.json`：实际 B 记录复现“缺少改题操作”。
- `build/slice272-comparison-redesign-v925-green.json`：一次 GREEN；覆盖共享调度、无 Plan 修改、重复/过期/在途/错目的/合同未交付拒绝、混合操作和未引用证据拒绝、历史回复不追认。
- `build/slice272-comparison-redesign-product-v925.json`：额外的实际 Run 入口首次验证失败，原因是内存夹具误触发全量旧 Native 场景恢复，stub 无恢复方法，**不是新产品交接失败**。
- `build/slice272-comparison-redesign-product-v925-corrected.json`：只修夹具内存中的恢复事件触发，未删生产记录；补验一次通过。真实 Run/Core 接受精确来源，拒绝错 purpose，设计角色收到原方案及作者请求，Plan/军表/旧原件不变。
- 已通过旧门均未重跑；未做无关构建或新模型实验。

## 条件性经验的实际状态

现有观察归档保存：声明条件与真实请求/配置分别记录，原始工具结果、指标、对照方向、范围限制、来源引用及状态绑定。查询接口可读取，不能把它们直接当有效 Skill。

目前 A **111**、B **17** 条观察候选，**已审条件性结论0**。已有结论归档会记录目的、条件/失效条件、来源审核、作者处置和比较审核，但本次实际实验尚未满足其准出条件。后续对局的 Skill 适用性筛选、验证与发布仍待完成；未发布、不改对局事实。

## 新运行阻塞：磁盘写满

原进程 A58000/B58029 均已退出，日志明确为 `ENOSPC`，不是推断的网络问题。

- A：`build/slice272-product-generation-v645-hsxEYu`，workflow `decision-798e1135-347b-4fd7-a44d-c989b466c6a2`，event6809/r4；最后持久化调用 `e719b391…` 请求与 `9faaddca…` 回复都在；下一操作仍标 running、pending=null。
- B：`build/slice272-product-generation-v645-8aBuEV`，workflow `decision-7f410254-23ff-42dd-8470-e63d4e2c3dac`，event7309/r11；当前 Plan-return 刚 dispatch，无持久化 call，pending=null。
- 不能仅凭无 pending 推断服务端没有任何未落盘费用；恢复需沿产品机制检查原回执，不手改状态或盲重发。
- 后续只读检查空闲约462 MiB，仍不足以放心续产；未重启、未删除文件。
- 已向用户请求清理约269 MiB：两目录 `observations.jsonl` 共约171.45 MiB，以及 build 下 `slice272-v9xx-*.log` 共约97.21 MiB。等待确认；先保存起止/异常摘要，原请求/回复/工具证据/费用/断点/报告/截图不删。

## 后续顺序

1. 获准清理后恢复可用空间，确认实际断点完整；不得直接重发未知请求。
2. 同版原目录继续，让模型自己决定是否使用新交接；证明请求真实送达、原目的确实版本化，而非再次只改 Plan 文本。
3. 完成 A 候选应用和原局部实验，B 原始比较/明确的新版本比较及来源审核。仍需处理回复内部事实解释矛盾；不能假报策略更优。
4. 有实际已审结论后，验证条件性经验到 Skill 检索的适用性与失效处理，再继续 P0–P6 准出。全链路合同审查仍未全部完成。

## 本轮 diff 摘要

- 新增 `packages/roster-strategist/roster-comparison-redesign-v1.mjs`：共享操作合同、角色校验和来源解析。
- 修改 `roster-workflow-read-role-v1.mjs`：1.14 输出合同、实际请求合同及 Host 交接；旧付费请求按原合同读取。
- 修改 `roster-strategy-progress-contract-v1.mjs`、`roster-workflow-frontier-settlement-v1.mjs`：区分改题请求与事实完成。
- 修改 `packages/roster-planning-workspace/roster-hypothesis-cycle-v1.mjs`、`roster-decision-workspace-run-v1.mjs`：同产品调度和再次校验的设计入口。
- 新增两个定点 debug 脚本及本报告；更新 CURRENT_WORK、根 TASKS、PROJECT_MEMORY。未提交。

Harness 记录：fallback_used=false；本轮新增上下文为有类型的改题操作/原方案引用，不含战术偏好；paused_operations=A/B生成（磁盘异常），running_operations=none；hard_gates=未修改；active_scope=T27/S272 P2/P5；new_paid_calls=0。
