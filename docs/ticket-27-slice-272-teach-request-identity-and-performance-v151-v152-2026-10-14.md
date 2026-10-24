# Ticket 27 / Slice 272 — Teach 恢复身份与性能观察 v151–v152

## 状态和范围

2026-10-14。T27 **5/6**，T23 **33/36**；主线余 **248/272/249/250 四片**，完整对局验收 **0/12**。
本轮只修原离线写表工作台的工程错误，不改军表、当前 Plan、规则或 Skill，不启动比赛。
顺序仍是：真实 Teach 问题闭环 → 最终 Plan 验收 → 所有受影响工具消费者及性能检查 → 四组同版新局。
用户新增的性能检查属于后续准出条件；不能把工具门通过或进程活着称为 Teach 完成。

## 三个真实问题和修复

### v151：网络故障缺少阶段证据

结构化请求的错误此前只有泛化错误，不能分辨连接失败、发出后断开、响应超时。
复用已有 transport-progress 合同，记录 DNS/TCP/TLS/写出/响应头/完成阶段；仅保留允许的网络错误码。
不记录密钥/正文/任意异常内容，不把可能付费的断连改成免费，也不自动重发。
超时先记录根因再销毁连接，避免销毁事件覆盖真正的超时。

具体 bug 门：`verify-slice272-structured-transport-progress-v151.mjs`。
保存的 RED/GREEN 分别为 `common-v151-structured-progress-{red,green}.private.json`。
四种假连接场景；0 Provider/Room。已通过，**不重跑**。

### v151：观察器把上一次终态当成本次终态

A 的 POST 观察超时后读到旧失败，观察器退出，但原 host55048 仍执行此次请求。
修复为仅接受此次运行的终态；增加 observe-only 重挂原 host 的入口，禁止重发 POST/重启 host。
原误报冻结在 `common-v151-A-stale-observer-original.private.json`，新观察器61783继续同一工作。

具体 bug 门：`verify-slice272-teach-observer-stale-terminal-v151.mjs`，
`common-v151-observer-{red,green}.private.json`。0 Provider/host restart。已通过，**不重跑**。

### v152：成功恢复后，下一次不同调查被误判成重复重试

两组 v151 的网络恢复都已成功返回。随后 A06:12:20Z、B06:10:26Z 均发生
`ROSTER_WORKSPACE_RETRY_AUTHORIZATION_CONSUMED`，下一次请求在发送前被拦，`paidProviderCall:false`。

根因：安全端口用 `roundKind + roundIndex` 判断重试授权已消费；Teach 不同调查/纠错会重用这些阶段编号。
共享端口现按相同阶段、**contextHash 和实际 requestBodyHash** 识别已消费的同一请求。
原请求重复发送仍拒绝；不同证据产生的新请求正常独立计费，不继承 `retryOfRequestId` 或旧授权。
不清零历史、不擦除原未知费用、不靠提高轮次掩盖问题。

具体 bug 门：`verify-slice272-retry-request-identity-v152.mjs`。
真实安全工厂+假 Worker，RED70872 → 唯一 GREEN71193；
`common-v152-retry-identity-{red,green}.private.json`。
验证：精确恢复一次；同请求再发被拒；同 kind/index 的新 context/body 可发送且不是旧请求重试。
0 实际 Provider/Native/Room/原 draft 写入。已通过，**不重跑**。

## 真实工作台结果与恢复

v151 已知新增：

| 组 | 模型返回 | 新 units | 端口记录 latency | 累计 calls / units |
|---|---|---:|---:|---:|
| A | 聚焦查询纠错 | 16,062 | 88.568秒 | 109 / 20,495,765 |
| B | 调查 | 355,581 | 48.725秒 | 201 / 22,932,967 |

B 调查的8次场景查询7次 advisory、1次队形未找到；另保留旧计分算术请求错误。
advisory 不是全部战略问题已证实。A 的原未解查询也未被清除。两组 Plan9/19 未改。
原断连请求的未知费用继续保留，以上只有已返回的已知用量，不代表完整账单。

v152 在确认两组已停止、下一请求未发送、没有未核对的付费请求之后，
通过已有 Teach 服务从原状态续行；完成的模型回复/调查不重发，恢复初始化单列。

- A observer72697 / host73039。
- B observer72698 / host72900。
- 实时真值：`common-v152-{A,B}-teach-fix-resume-progress.private.json`，并核对对应真实进程。
- 06:22Z 两组 observer/host 四个句柄均核实存活；06:23Z 两组均
  `running/read_only_queries`、failure=null，Plan 不变，尚无新增付费返回。
  这证明已恢复原工作台执行，不是 Teach 已通过；继续观察同一进程，不再初始化。

## 性能观察：目前不能证明无劣化

保存 `common-v152-early-performance-observation.private.json`，不重新运行旧 case。

- A 调查三次：50.322 / 49.142 / 46.864秒，输出完全相同但请求和上下文不同。
  不能据此称同 case 提速；第三次上下文扩大，且重复答案无新增结论。
- A 本次聚焦纠错仅16,062units，却耗88.568秒；这是需追踪的长尾，不可用 tokens 少推断一定快。
- B 调查48.725秒；和 A 的不同工作内容不可直接作性能 A/B。
- v149 已记录轮间98.145 / 85.713 / 72.786秒未归因的本地间隔。
- draft A146,402,275→147,787,900字节；B54,190,059→58,600,698字节。
  大状态反复序列化/恢复是疑点，不是已证实的唯一根因。观察器本身读取成本也应计入实验扰动。
- 此端口的 latency 包含发送前持久化边界，并非纯服务商网络时间；不能把它全部归因于模型。

后续统一检查须保留可比较基线，分开报告：

1. 同类型/同状态的模型往返、工具计算、纠错、上下文处理/持久化、热路径总耗时。
2. 冷启动/断点恢复单列；工具新增必要工作与无进展重复工作分开。
3. 中位、长尾、units、已知/未知费用；三/四组并行下 CPU 争用。
4. 输出证据/工具语义/合法性/可兑现策略材料不减；不以删策略信息换速度。
5. 无可比较样本时明确“尚未证明”，不宣布无劣化；只做涉及本次改动的未通过门。

## Teach 后的统一消费者检查（用户要求，未完成）

写表和初始 Plan → 实战 Planner → Action/Native 执行 → Plan 修订及记忆 → 复盘/Skill 演化。
逐一确认共享工具路由、参数/状态/规则版本、输出作用域、unknown 语义和查询/执行一致性。
工具调用成功不等于到场/控点/战略判断成功；旧 Plan 不因新工具门通过自动获准。

## 改动摘要

- 产品：结构化传输增加安全阶段诊断；安全工厂保留诊断并修复重试身份。
- 运行观察：既有 launcher 增加版本号、仅观察重挂、未发送工程失败续行；新增本次终态判定 helper。
- 三条新脚本均仅复现已发生具体 bug，按 RED→GREEN，未运行旧绿/无关测试。
- 文档、CURRENT_WORK、根 TASKS/PROJECT_MEMORY 记录真实状态和后续顺序。
- 没有新代理/K3、安装、源更新、删除、提交或比赛动作。

## Harness / Offline 边界

`harnessLoopUsed:true`；game StarCraft TMG；routes Teach investigation/query recovery。
观测包含实际工具回执、Provider dispatch 和工作台检查点；本轮无 UI验收/决策技能晋升。
所有候选 `trainingTruth:false`。若身份隔离/账本/输出语义回归，停止新请求并保留原证据；
不能把本报告的工程门当作角色扮演、对局战略或离线 Skill promotion 通过。
