# T27/S272 P5/P6：停止后回交进入同一产品链路（v992）

## 已完成与边界

v991 核心回交的离线门未重跑。本轮修复它到实际 Web/App 产品任务之间的两个缺口，已经通过原产品 HTTP 入口在 B 原断点完成真实回交。没有重建房间、改写模型回复、重演 Native 或重置费用。

仍不能宣称 Teach 已收敛或正式 Plan 通过。真实战略消费已观察，后继工程合同缺口已使生产停止；T27 5/6、T23 33/36、正式0/6、新局0/12，剩余4片。

## 具体失败与修改

- 新 Run 控制方法未挂到产品 HTTP：实际请求返回404。新增 `POST /workflows/:id/handoff-no-progress`，经过同一产品 Journey 的单写者锁、明确授权记录和共享 Run 方法。
- 核心已允许新负责人运行，但产品后台按“任何 needs_repair”停止，会被已明确移交且 hold 的旧失败再次阻塞。统一到责任图 `isBlockingFailure`；只排除有精确回交记录且旧调查仍 hold 的停止项，不删除失败，不放过其它错误。
- 原产品客户端新增显式 `--handoff-no-progress <workId> <ownerResultRef>`，随后仍走原 `/run`。普通重启不会执行交接；没有另做实验生成引擎。

涉及：`roster-workflow-graph-v1.mjs`、`roster-decision-workflow-v1.mjs`、`roster-decision-product-journey-v1.mjs`、`roster-planning-workspace-http-v1.mjs` 及原产品客户端。

## 定点验证

`scripts/verify-slice272-product-no-progress-return-v992.mjs` 使用真实 HTTP adapter 与后台产品循环、最小 Run 替身。它验证接线，不替代 v991 核心或真实策略验收。

- PID42180 RED：HTTP404；新负责人第一步后后台停止（advanceCount1，预期2）。另一个空授权检查仅因404而拒绝，不能据此声称完整新端点授权验收。
- PID42785 `--remaining` 一次 GREEN：仅补两条失败门；HTTP202正确传入同一 Run、无自动启动、持久控制记录；后台可越过已移交的旧失败继续第二步，暂停仍有效。
- 真实 Provider0、Native0、生产写0。夹具仅存于 `build/slice272-product-no-progress-v992-xZ1IZW`（失败）及 `build/slice272-product-no-progress-v992-zzEqF9`（通过）；未删除。

## 真实执行

PID43050；日志 `build/slice272-v992-owner-handoff-1792794987653.log`。
同一 B `build/slice272-product-generation-v645-8aBuEV`，起点r23/event12103，无在途。

实际产品回交结果：

- decisionId：原 `…:method:48db98425cf42c95:strategy-frontier`。
- reportRef：`0e127fe4d0c980ff89c50e5c8c1a2a19953df9a0a7fbb06a3c290b71f7eaa065`。
- 原重复汇总保持停止，原检查与必要未知保留，`planApproved=false`。
- 回交时军表/Plan仍r23、9支单位；该控制操作没有新策略结论。

### 两次真实回复与停止边界

新负责人实际收到原检查、重复检查、停止边界和原问题。第一次回复保留军表/Plan、不再授权旧实验；17份引用经已有读取器补读后，第二次确认原决定。没有新 Native 实验。

- 首请求 `8d0fb18744962c18549a3b0756391411211374f681edbffe00cdd4850383d89e`，回复 `b22242fc6b36684f6a840b0785de7d8dc31f69e751d1f8bd0214953aefb9555d`：377943 units，Provider18.299秒。
- 来源确认请求 trace `64d5c75b-f759-4ec7-b56e-2128be975c9c`，回复 trace `abc22a56-6940-4742-b781-0fc26f6a9731`：526343 units，Provider14.605秒。
- 合计904286 units、Provider32.904秒，整段约6分钟；不等于性能达标，费用沿原账保留。
- 最终角色结果 `5482c2be0514e0e3b7fba0193b1fa265bf2637ce5146b1e52b205a99b21478d5`；非修改结果 `60c1ffdeed164df47a0f85b3a5dbb95df2bbdb50da3c52b91b0598c1319c513f`。

但后继选择器按字段名前缀找来源，漏掉两份实际回交原件（facts=[]）；结算器也只识别模型提出的strategy_required，不识别明确的工程停止回交。发现后立即停止，PID43050退出0，r23/event12137、0在途。v993修这条完整交接边；不得重买已成功的两次回复。

模型把“到达仍未知”归为answered_fact，不因此获得事实验收：下一原问题角色须依据原件核对，必要未知与独立来源/覆盖审核继续保留。没有修改军表/Plan，不能称战略提升或发布成功。

## Harness 使用

`harnessLoopUsed=true`；游戏 StarCraft TMG；路由为事实方法控制返回→总体战略决策；本轮没有对局/UI操作或训练晋级。原工具证据与公开模型记录仍在原工作区，回交不是条件经验验收、规则真值或策略改善证明。若真实请求不能使用这些证据，本轮仅能保留接线证明，不能勾选P5/P6整体完成。
