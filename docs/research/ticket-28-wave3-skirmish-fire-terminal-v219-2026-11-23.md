# Ticket 28 / W3-11 · Skirmish Fire 的签名计分与提前终局

新版 U83/C84/R50 + FAQ 1.3，候选 Match 2.19.0。真实 Skirmish 工厂消费已验 500 分军表，33 项选中执行均接入。旧 r2 回执用于确认同任务的六模型布置和标记 5 的破坏等级 2。新隔离房以第二轮 Cleanup、6:0 为声明起点，由正式任务原子初始化回合及当轮 Supply。

| 后继 | 签名结果 |
| --- | --- |
| r1 控制标记 | Player 1 实际控制标记 5，6:0。 |
| r2 结算 | 等级 2 贡献 2 VP，累积为 8:0。 |
| r3 终局 | 命中 Skirmish 的 8 分领先规则，Player 1 获胜，双席动作菜单均清空。 |
| SQLite 重开 | 3 张签名重放与保存的状态、修订和日志一致。 |

初次同版工厂预检正确拒绝了继承 manifest 的旧任务资料。另两次停于条件场景的 Supply 状态及执行签名装配，均在开房前。使用正式来源编译器生成任务资料。来源清单固定任务编译，执行清单固定精确 runtimeHash，两清单共享同一冻结来源和全部非运行时组件。回放保持执行绑定。旧签名原件只读，旧条件房完整回放仍遵循原停止记录。当前签名覆盖实际控制、结算和提前终局；Web/App 正式开房仍待。模型调用 0。

- [签名与冷回放证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-skirmish-fire-terminal-v219-v1/result.public.json)
- [500 分工厂预检](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-skirmish-fire-terminal-v219-v1/factory-preflight.public.json) 与[打包校验](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-skirmish-fire-terminal-v219-v1/packaging.public.json)
- [来源清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-skirmish-fire-terminal-v219-v1/source-manifest.json)、[执行清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-skirmish-fire-terminal-v219-v1/manifest.json)
