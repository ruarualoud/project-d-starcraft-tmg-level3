# Ticket 28 / W3-10 · Khassar de Templari 组件收口

3.185.0 已有正式能力登记和移动、突击、近战三阶段公开 Room 签名。最后缺的边界是这个注册版本在磁盘恢复后完成原生近战父任务，并把激活交回施放者。

本次用 3.183.0 已保存的 r1 状态启动隔离接续房。原命中骰和待办身份随原状态读取。已通过的近战声明、移动、双靶菜单与突击声明引用既有证据。3.183.0 的运行时描述符可逐字段重建，3.185.0 的资格、移动、冲锋、射击、近战及两套骰池执行合同与该快照下的原版本一致。

- r1 生成装甲骰并关库。重新打开后原待办与完整 Envelope 一致。
- r2 从原生骰池结算。受益单位伤害 5→8，非致命反馈只出现一次，模型数和 Supply 保持原值，待办关闭并交回原激活。
- r3 经参数化域结束原激活，主动方变为 player2。重开 SQLite，三条新签名的每个前缀状态摘要一致，最终 Envelope 完全一致。

首次工装在执行前有变量重名错误。第二次把参数化结束激活误当有限动作。保留已经提交的 r1/r2，修正选择后仅从 r2 完成剩余操作。原 3.183.0 房间和证据保留。

该定义组件准出。Protoss 17/23，Wave3 组件 146/162，Ticket 28 整体 2/16。全程零模型调用。正式完整 Match、统一 MCP／Web 消费者另行验收。

- [既有 3.185.0 三阶段签名与登记](../../build/ticket-28-protoss-wave3-20261120-v1/khassar-shot/registered-ability-adapter/registered-room-proof.json)
- [原 3.183.0 持久后继](../../build/ticket-28-protoss-wave3-20261120-v1/khassar-shot/authoritative-eligibility/combat-continuation/result.json)
- [3.185.0 本次签名和磁盘回放清单](../../build/ticket-28-protoss-wave3-20261120-v1/khassar-shot/registered-ability-adapter/persisted-fight-successor-v1/result.public.json)
