# Ticket 28 / W3-11 · 部署几何发布绑定与签名开局

发布解析器原先只比对档案自带的哈希字段。档案坐标或结构变更后保留旧字段，解析器仍会交付资源。正式 Match 原先校验发布清单与执行清单，仍可将旧开局几何装配到带新几何组件的发布。两处均由发布和 Match 各自的实际入口复现。

发布读取复用部署几何合同，核验整份档案摘要、冻结记录、规模和坐标。正式 Match 在发布或保存状态包含新增几何时，用同版冻结数据、任务草稿及几何档案重建权威绑定，核对保存的整个几何包与选中的部署绑定。旧存档路径沿用原装配和描述符。

隔离 Skirmish 使用同版已签的 500 分军表与原创抽象坐标。两个人工席位在真实 Room 中提交首轮任务启动，得到 r1 一条签名回执。独立进程从保存的发布文件和 SQLite 恢复原 Envelope，下一合法动作是选择先行动一方。恢复只读。篡改坐标、档案缺失、新旧几何绑定混用均被拒。旧 Skirmish 2.19.0 用旧清单重建，完整运行时描述符一致。

首个夹具使用的旧默认军表超过新版预算，第二个夹具沿用了不同发布标识的任务源。正式入口均正确拒绝。最终使用原已签军表，并通过任务源工厂生成同冻结、同发布的任务档案。保留两次停点与已通过前缀。

新增实卡启用 0 张，付费模型调用 0。已验证产品 Room 签名开局机制。实际三张部署卡、配套地形和 Web/App 选择待验。Standard 的两规模工厂旧证明仍适用，新增签名开局验收到 Skirmish。整个 Ticket 28 仍为 2/16。

- [发布与编译证据](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/release-binding-gate/result.public.json)
- [签名开局](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/release-binding-gate/signed-opening/result.public.json)
- [独立进程恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/release-binding-gate/signed-opening/fresh-process-recovery.public.json)
- [隔离房引用映射](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/release-binding-gate/signed-opening/artifact-refs.public.json)
