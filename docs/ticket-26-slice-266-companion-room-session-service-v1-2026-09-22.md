# Ticket 26 / Slice 266-E — 副官 Room 会话产品服务

日期：2026-09-22。

## 本片交付

- 新增 `createStarcraftTmgCompanionRoomSessionServiceV1`，把完整副官后端绑定到真实 `Room + seat + principal scope + MatchBinding`。每次 read/send/checkpoint/resume/close 都重新通过 RoomRuntime 验证当前 seat token；token 只在调用栈中使用，持久层只保存 `principalScopeHash`。
- 同一对话支持 1–6 名已注册副官。用户回合后按确定性 speaker order/mention queue 逐个调用 Provider；每个副官获得自己的 package/era、世界书/记忆上下文，以及同一座席可见的 Room/Workbench 投影。
- 副官没有 Preview/Confirm/Apply 权限；对手私有状态拒绝，事实/推断、Rules 外部权威和公开 rationale 约束写入系统提示。隐藏思维链不请求、不保存。
- Provider 失败后保留已经接受的用户消息和待回复 speaker，只允许显式 `continueConversation`，不自动重试可能已经发送的外部调用。
- 服务提供 open/read/send/continue/checkpoint/resume/close；公开投影含消息、speaker、哈希、Provider 计数与持久化声明，不含原始 Prompt、密钥或 seat token。

## High 修复：检查点隔离

原 CB-3 `checkpointSession` 使用 persistence 全库 checkpoint；多个会话共享 SQLite/PostgreSQL 时，恢复会话 A 会把会话 B 及其它命名空间一起回滚。现改成不可变的 `session state + 该会话 transcript` 隔离快照，恢复只覆盖目标会话及其 transcript。写入顺序为 transcript 后 state；中途崩溃可重复同一显式 restore，且不会影响其它会话。

## 聚焦验证

未新增测试文件。一次最终一体化命令通过：

- 真实形状的 Room/Character/Workbench seat-scoped Adapter；
- 两个副官完成一轮 `user → companion A → companion B`；
- 会话 A checkpoint 后继续，会话 B 独立推进；恢复 A 后 B 保持原 turnCounter；
- 错误 seat token 拒绝；Room Preview/Apply 调用为 0；
- Provider 回执先投影为无敏感字段的会话 receipt。

第一次门在双副官回复处发现回执字段 `hiddenChainOfThought: not_present` 被既有防护正确拒绝；修复为 `reasoningTrace: not_collected` 安全投影，第二轮通过。总 review/repair 2 轮，未超过 3 轮。

## 尚未完成

- 本片是服务层；真实 HTTP 路由、Client Domain、K3 浮窗按钮和浏览器截图在下一片。
- 当前并发只保证单进程、单 conversation 串行；多实例 CAS 尚未完成，metadata 明确 `multiInstanceProductionReady=false`。
- 本门使用纯内存 Provider responder，外部 Provider/BYOK、网络与付费调用均为 0。

Token/成本：DeepSeek `0 / ¥0`；K3/ImageGen 无金额遥测；官方数据未刷新；`trainingTruth=false`。
