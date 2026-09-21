# Ticket 26 / Slice 266-D — 副官持久层同构适配器

日期：2026-09-22。

## 交付

- `createSqliteCompanionPersistenceAdapter`：本地/Web 服务开发与单机 M1 使用文件型 SQLite，启用 WAL、`synchronous=FULL`，保存加密后的命名空间 KV 与完整 checkpoint。
- `createPostgresCompanionPersistenceAdapter`：生产环境使用注入的 PostgreSQL pool，方法与 SQLite 完全相同；checkpoint/restore 在 serializable transaction 内完成。
- 两者都实现既有 `companion_persistence_port_v1`：`get/put/delete/list/checkpoint/restore/exportSnapshot/close`，因此 worldbook、分层记忆、多副官会话、分支和恢复逻辑不需要按数据库分叉。
- 两者都使用既有 AES-256-GCM 私有载荷 codec；文件 SQLite 和 PostgreSQL 不允许缺失托管 codec/32-byte key 后静默生成临时密钥。
- durable 边界会在建库前验证注入 codec 的 `encode/decode` 能力，并验证密钥精确为 32 bytes；底层 codec 对错误密钥的临时回退不能穿过该边界。
- SQLite 不允许 `:memory:` 冒充 durable；注入数据库必须显式声明 `databaseDurable=true`。
- 数据库只持久化副官会话/记忆合同，不获得 Rules、房间 Apply、对手私有状态或训练真值权限。

## 版本和迁移边界

本轮只增加 v1 表并使用 `CREATE TABLE IF NOT EXISTS`；没有修改既有 RoomStore 表，也没有静默读取旧结构。后续 schema 变化必须新增明确版本/迁移步骤；不通过内容哈希或签名把主动启动的正常恢复流程卡死。

## 聚焦验证

本轮不新增测试文件。验证使用既有端口断言和一次临时 SQLite 文件往返：端口符合、`put/get/list`、checkpoint 后修改、restore 回到 checkpoint、关闭后拒绝访问；另验证 PostgreSQL 工厂在缺 pool 或托管密钥时 fail closed。未连接真实 PostgreSQL，生产 pool 的 SQL 集成仍需部署环境验收。

Provider 调用、网络、官方数据刷新、训练推广：`0 / 0 / false / false`。
