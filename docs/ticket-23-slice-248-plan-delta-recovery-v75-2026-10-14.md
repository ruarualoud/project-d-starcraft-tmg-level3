# T23 / S248 — 原房输入压缩恢复与计划增量输出

后续实际结果：B同容量Planner输出1982units成功，Action/Apply/Replay到r2；随后A130资源声明两次重复引发联停，已在v76补齐事实反馈并真实恢复至r131。四组当前进度和证据见[后续v76](ticket-23-slice-248-resource-correction-v76-2026-10-14.md)，本页下文启动状态为历史记录。

范围：StarCraft TMG。T23 33/36、T27 5/6；主线仍余248/272/249/250四片，完整实验0/12。本记录不代表新定量Teach已经应用或策略效果通过。

## v74 已完成证据

- A r129 原请求拒绝的安全回执匹配 HTTP400；旧传输未保存错误正文，因此不能断言服务商的具体拒绝理由。
- 输入中重复火力结果改为可完全还原的记录表。实际查询投影从3,193,790字节降至1,475,988字节（53.79%）；8棵完整火力结果逐项恢复一致，原回执不改，不删除策略事实或概率分支。
- 原A房真实r129→r130 Move已应用并重放通过。模型请求约27.16秒，动作含网页取证约153秒；不是一分钟整步性能达标，也不是中位/长尾40%性能准入结论。
- A本段费用114.267344−113.429450≈¥0.837894，保留旧费用与未知费用。
- 截图：`build/ticket-23-slice-248-standard-2000-aa-live-v1/query-v33-clean-A-20261013-v1/screenshots/0872-r130-player2-move-complete-board-applied.png`。
- 已通过的`action-evidence-size-v74`与`http-status-receipt-v74`门本轮仅读回，不重跑。

## 四组联停的真实原因

v74四驱动于2026-10-13T16:28:37Z启动。16:29:22Z B的`LIVE_DECISION_PROVIDER_OUTPUT_TRUNCATED`触发联停，16:29:50Z确认关闭；本轮进程检查旧Host/driver/monitor均不存在，不是观察超时后盲目重启。

B停点仍是r1。检查SQLite显示恢复读到的是16:01:27Z已经付费的截断响应：planning、请求/实际输出32768units、input183861units。不是这次恢复又付费发了一条相同请求。原计划150500字节，回复在objective/currentGoal/strategicApproach等字段复写大段已有计划。原输出合同仍要求完整字段，恢复又要求增加输出容量，导致同合同无法自行向前。

其他三组的浏览器关闭/连接拒绝是联停后的现象，不混记为新的策略失败。权威最终状态采用保存房间回执而非更早progress：A130、C149、B1、D2。

## v75 本次修改

1. `live-flash-decision-port-v1.mjs`：已有计划提供明确`field_delta_v1`协议。currentGoal必须新写；未变字段null/省略保留，明确数组`[]`才表示清空；revise合并模型提交的变更，continue保留原战略。初始无计划仍需建立计划。模型保留选择、质疑、查询、改变战略的权力，不注入进攻或保守偏好。
2. 同文件：只有本次明确提交的opponentModel才构成新观察；继承的旧判断不刷新日期。新输出合同版本明确区分旧付费回复，不把半截JSON补成行动。
3. `live-prompt-repair-recovery-v1.mjs`及调用端：明确批准的恢复遇到已完成的类型化截断、且合同确已改变时，允许一次同容量协议恢复。旧attempt、费用、查询结果保留；不重置已有语义/查询轮数，重复同合同不再放行。
4. 新具体bug脚本`verify-slice248-plan-delta-truncation-v75.mjs`：直接只读B原SQLite，覆盖真实Prompt schema、增量合并、null与空数组、旧判断日期、无基准拒绝、同choice有界恢复及旧付费记录不变。

验证：初版夹具误写terminalArgumentsSchema已纠正为实际terminalShape；随后真实RED52688，产品修改后唯一GREEN53555。451字节是定点协议示例，不是实际模型响应大小或已证明的策略无损性能。0模型调用、0原房写入；没有全量或已通过门重跑。

## 当前恢复

新启动器PID58857，四Host58861/58863/58865/58867，原A130/C149/B1/D2，源码标识`s248-v75-plan-delta-truncation-recovery-20261014`。启动后48秒进程均确认存活，仍在恢复原房。使用原目录、军表/Plan绑定、费用账本；没有新建实验房。实际模型完成和动作结果需看后续记录，不由启动成功推断。

运行证据前缀：`build/ticket-23-three-arm-performance-baseline-20261010-v1/common-v75-four-arm-*`。High仍由统一监控联停。

## 未完成工作保持不变

- A/B最新定量Teach仍`proposed_not_applied`，A原Planv4、B原接受v12不静默替换。
- 合法带地形假设布局、当前动作域、能力/查询匹配、真实替代表审计及Teach落地仍需完成；空场或非法摆位不是策略不可行证据。
- A曾保存`specialTerrainLosBatchFailure: Invalid string length`的unknown视线证据，仍需源头修复，不由输入压缩冒充已解。
- 完整对局、同表有/无计划对照、两类写表/计划、复盘，以及20地图目标（首批优先、18张后扩）仍未完成。

无子代理/K3、安装、删除、官方数据刷新或提交。工作树git diff含大量历史改动，本报告只归属上述本次变化，不宣称整个diff是v75。

harnessLoopUsed=true；ctx2skillLoopUsed=true；targetGames=starcraft-tmg；roleRoutes=fact_probe/harness_optimizer；source=保存房间/公开计划/工具回执；无规则变更、Skill晋级或隐藏思维链；trainingTruth=false。
