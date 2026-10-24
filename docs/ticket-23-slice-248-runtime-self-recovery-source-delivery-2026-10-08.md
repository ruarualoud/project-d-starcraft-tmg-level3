# T23/S248 + T27/S272：运行时自修复源码交付

本文件记录此前源码阶段；原宿主已实际加载并推进至r87，fixed v8审核0 High，fresh v4仍未知。用户已改为新地图三组实验；当前恢复状态、已消耗的一次请求许可、队形补搜撤回及下一交付，以[新地图三组验收记录](ticket-23-slice-248-new-map-three-arm-acceptance-2026-10-08.md)为准。下方“未加载／r81／0新调用”仅是此前阶段的事实，不作当前状态。

## 结论

2026-10-08 架构诊断后的实现记录。此前确实有恢复层缺口，而不是每一个 High 都表示新规则错误：参数合同只包住外层 JSON、错误反馈不对应被违反的字段、计划修订可以漏掉已审核的断言、未知发送被记作未付费，都会制造重复失败。

本次已修复这些来源问题，并以保存的真实失败建立五项定点红/绿检查。**这是源码交付，不是完整人机稳定性验收。** 原宿主尚未加载本次新源码；原局停在 r81，固定表 v6 和从头表 v4 仍未准入。不能把本地替身回复或规则实例化通过当成真实模型、Apply/Replay、完整对局的证据。

使用 diagnose、codebase-design、agentic-harness-evolution-loop；只在原 integration 工作树修改。无子代理、安装、规则数据刷新、提交、旧绿复跑、全量构建或浏览器验收。本次 0 新 Provider 调用、0 原 Room mutation、0 原 workspace 写入，新增模型费为 0；历史未知费用仍未知。

## 已实现的恢复机制

| 来源问题 | 实现 | 尚未证明的边界 |
| --- | --- | --- |
| r81 Orders 目标/支付非法，反馈却只有几何字段 | 同一规则域编译模型提交合同和执行端预检；给出 field path、actual、allowed；有限组合选择 optionId，执行端还原后仍由 Rules 实例化 | 原 r81 的旧三轮历史迁移与真实同房新决策未执行 |
| 改无关付款被当成纠错进展；High 直接停止 | 按违反字段/原因记录历史；同意图纠错或回到 Planner，保留旧计划、回执、付费记录和累计轮数；不可付意图触发重规划 | 只接通已识别参数/几何拒绝；不声称全部 High 已能恢复 |
| 固定表普通修订遗漏多个旧组件断言 | fixed / agent-scheduled 共用精确 claim-path 修复；普通修订从当前审核的全部 High 提取去重路径，附 coverage；军表、进场和 schedule 不变 | 实际 v7/v5 尚未生产；语义审核→自动修订→重审的完整监管循环仍待接通 |
| 未确认发送被记 false，工作台只有停止提示 | 发送前持久记录 requestId/body/context；paidProviderCall 保留 true/false/null；已有绑定回复本地重放，证明未发可重试，未知不能盲重发；新增对账接口 | HTTP/原 workspace 持久化链尚未实际验收；旧 v4 请求没有完整请求身份，不能凭本次代码找回；无 Provider 结果查询适配器 |
| 新机制可能破坏既有几何恢复/投影身份 | 保留原几何纠错上下文；参数合同只增加在 Prompt/tool seam，不改变原 sealed Rules-domain projection | 不代表所有空间求解或整步一分钟门通过 |

### 对战动作

- 新 `action-parameter-contract-v1.mjs` 导出编译、检查、有限选项还原、恢复规划/应用五个入口。来源仍是当前 Rules 域，不复制游戏规则。
- r81 的原目标 enum Marine 1/2 与实际支付组合进入模型侧与执行侧。`[]` 表示没有可用付款组合，只有 `[[]]` 明确许可空付款；不能把没有付款手段的移除标记意图自动改成另一个 Orders 效果。
- 64 只限制有限组合的物化大小：超过或存在连续坐标时保留原参数/求解器，不截断策略空间，不拒绝动作，不变成固定队形模板。
- 原合同能完整列举的动作采用模型选择 optionId；目标/效果依然由模型选择。预检不等于规则证明，所有动作仍须原 Preview→Apply→Replay。
- 恢复记录区分 kind、scope、severity、action。已识别字段拒绝先纠错；不可付意图或重复原因返回 Planner。原因签名不把无关付款变化当成进展。最多三轮，重规划不清累计失败/用量，不静默 Pass。
- 原 r69 几何拒绝仍可用原 leading model/base/path/coherency 上下文修正；未知引擎异常、损坏权威、缺少证据不能假装是普通参数错误。
- 重新实例化成功时记录 `rules_instantiated_decision_only`，同时明确 `applyAndReplayStillRequired=true`。不能以这个局部恢复状态宣称实际执行已经成功。
- Planner 重规划收到先前目标、公开计划摘要和恢复原因；不输出或采集隐藏思维链。没有在 Prompt 中新增策略加减分或偏好。

### 军表与计划

精确 claim 修复现在支持两类 schema。普通修订发现已完成审核的 High 时，以同一 verified-plan-facts 和精确输出合同请求全部去重 High 路径及 publicSummaryText。返回 coverage 保留请求/替换/未请求 High 路径，未覆盖不是通过。修复不更换军表、首次进场回合、targetVpSchedule 或不相关目的文本。

本次实际 fixed v6 捕获有 8 条 High、5 个唯一路径，加 summary 请求 6 路；另一个保存的 fresh 审核捕获有 2 个唯一路径，加 summary 请求 3 路。仅用复制的原会话和本地替身公开回复检查代码行为；原会话字节不改，旧审核和原付费结果保留。

### 请求持久化与对账

factory 在实际 send 前先 await 持久化 reserved→sending；同一 requestId 传给 worker。落盘失败不得发送。返回、公开输出和 usage 走原保存边界。未知发送不是确定零费用。

纯恢复模块只接受 requestId、round、context、output-contract 和输出内容绑定的保存回复。确定未发送才允许新发送；断线、超时或未知发送本身不提供重发许可。工作台新增 `POST /sessions/:id/reconcile-dispatch`，保留旧失败/计费与对账历史，原 ambiguous-review 门先尝试本地对账。

这不是无限自动重试，也不是自动修改规则源码。权威损坏、无合法决策、额度/凭据问题或无法对账的已发请求仍须安全停止并告知。当前 live port 的既有 durable observer 恢复保留，本次尚未把它迁移到新的纯模块；不能宣称所有 Provider 已统一接通。

## 五项唯一验证

每项先在具体 bug 上失败，源码修复后只跑一次对应成功检查。没有复跑已通过的检查。

1. **r81 参数合同**：原三条错误反馈缺少字段信息，红 exit1；绿 exit0。证明预检不调用 Rules、模型与执行使用同一组合、旧非法目标不被替换、连续参数保留、累计恢复不清零、损坏权威不被重新分类。正向 Rules 是受控替身，非真实合法动作证书。
2. **两类审核 claim 覆盖**：原普通修订省略 High 路径，红 exit1；绿 exit0。两份原会话复制件覆盖对应路径，军表/进场/schedule/未改组件和原文件字节保持，0 Provider。
3. **未知发送台账**：原异常分支将未知 paid 状态写 false，红 exit1；绿 exit0。验证发送前持久化屏障、单次 worker.send、未知费用、精确保存回复重放、外来回复拒绝及落盘失败不发送。
4. **原几何恢复兼容**：新分类器把原 r69 可纠错几何拒绝提前停掉，红 exit1；补齐类型识别后绿 exit0。使用原已保存 Rules 拒绝码，不把 capture-only 标记当规则结论；修正→重规划→三轮停止，真实实现异常仍停止。
5. **原域投影身份**：新增 metadata 改变原 sealed domain，红 exit1；把合同移至 Prompt/tool seam 后绿 exit0。实际 r81 保存域逐项相等，不复跑第1项或原空间门。

报告位于 `build/slice248-daybreak-resume-web-JgsoAG/`：

- `r81-parameter-contract-{red,green}.json`
- `s272-claim-coverage-{red,green}.json`
- `s272-unknown-dispatch-ledger-{red,green}.json`
- `r69-geometry-recovery-compatibility-{red,green}.json`
- `r81-parameter-projection-identity-{red,green}.json`
- 汇总 `runtime-recovery-source-delivery-20261008.json`

四个具体 bug 脚本分别在 `scripts/verify-ticket-23-slice-248-parameter-recovery-contract-v1.mjs`、`verify-ticket-23-slice-248-geometry-recovery-compatibility-v1.mjs`、`verify-ticket-27-slice-272-reviewed-claim-coverage-v1.mjs`、`verify-ticket-27-slice-272-unknown-dispatch-ledger-v1.mjs`；参数脚本的 projection-only 模式不执行已经通过的参数主体门。

## 本次 diff 摘要

生产源码 8 文件：

- 新增 `packages/online-agent-session/action-parameter-contract-v1.mjs`。
- 修改 `packages/online-agent-session/room-backed-spatial-rules-query-adapter-v1.mjs`：当前合同字段预检与反馈。
- 修改 `packages/online-agent-session/live-flash-decision-port-v1.mjs`：模型选项提交、参数恢复/重规划和公开恢复上下文。
- 修改 `packages/roster-strategist/roster-strategist-runtime-v1.mjs`：fixed/fresh 精确审核路径修复和 coverage。
- 修改 `packages/roster-planning-workspace/roster-planning-workspace-service-v1.mjs`：coverage、持久 dispatch 事件和对账恢复入口。
- 新增 `packages/secure-provider-runtime/provider-dispatch-recovery-v1.mjs`。
- 修改 `packages/roster-planning-workspace/roster-planning-secure-deliberation-factory-v1.mjs`：发送前持久化屏障、请求身份和未知费用。
- 修改 `packages/roster-planning-workspace/roster-planning-workspace-http-v1.mjs`：对账路由。

另有4个上述具体 bug 脚本、本记录和任务/记忆交接更新。`spatial-action-query-runtime-v1.mjs` 的本次新增 metadata 已撤回，最终无本次净修改；其此前改动保持。不能把 dirty 工作树的全部 git diff 行数归为本次交付。

## 后续具体交付物与顺序

1. **原房恢复接入记录**：加载新源码仍使用原 Room/SQLite；保留 r81 三次失败和所有费用，不清计数、不买第四次旧错误；建立有新合同证据的恢复/重规划迁移，再用真实模型给出合法新决策，保存 Apply/Replay 与截图。
2. **工作台端到端恢复记录**：实际演示新对账入口/持久化与保存回复恢复；旧 fresh v4 无请求身份不能本地对账的状态单独保留、报告，不冒称已修复或费用0。
3. **两类新计划及自动修订记录**：生成 fixed v7/fresh 新修订，检查所有受影响 claim；接通审核→精确修订→新版本审核的监管闭环，同原因三轮停止，旧计划不被未通过新版本替代。
4. **完整同链路对局与性能/报告**：完成原无计划局，再同表同图带计划对照；全步骤截图/Apply/Replay、恢复成功/重复失败/重复执行与计费/策略降级、整步 P50/P95 实测后才声称产品稳定。当前未证明一分钟或无人干预完整局。

这是同一架构恢复工作，仍计入 S248/S272，不另包装成新 Ticket。

## 原状态保留

T23 **33/36**，余 S248（本次恢复/原完整局与整步性能）、S249（同表同图带计划对照）、S250（截图/PDF/复盘）；T27 **5/6**，余 S272（两类2000分地图绑定计划准入）。合计余 **4 Slice**，完整实验链 **0/3**。

原局 r81 / 第2回合 Movement / player1 / 0–0 / 81接受动作 / 非终局；原宿主41291、54477，驱动61465已 exit1，非后台续跑。原累计216 records / 47,014,840 reported units / 约¥69.836819，只是既有成本估算。工作台64615、57909，fixed v6 仍8High、fresh v4审核发送不明。PID/HTTP是前次已确认状态，本次未重启或重新声称持续可用。

选定9官方+2经典配置保留，18其余经典地图最后扩展。harnessLoopUsed=true；targetGame=starcraft-tmg；UI新验证=无；memoryTrace=原存储保留/恢复公开上下文源码新增；trainingTraceCandidates=0，所有本次替身和源检查均非训练真值。
