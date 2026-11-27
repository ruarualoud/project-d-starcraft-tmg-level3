# Ticket 28 / W3-11 · 3.195 单模型绕行签名房间

继续冻结 U83/C84/R50 + FAQ 1.3。依据已有 Standard 军表和权威工厂，新建隔离的 3.195.0 能力候选房。场景声明使用单模型 Hydralisk 与 Raptor，来源和完整底盘由原生内核核验。Goliath 与 Raptor 保持上轮路线证明所用位置。受击者换成另一友军 Queen，让受击结算与绕行阻挡独立。原签名档仅作为输入来源。

| 边界 | 实际结果 |
| --- | --- |
| r0 开房 | 签名绑定 3.195.0，提供 Goliath Autocannon。新版棋位产生自己的远程运行时哈希，Lunge 组件绑定一致。 |
| r1 射击、r2 窗口 | Goliath 对 Queen 的实际远程攻击结算，射手放弃其反应优先权后，守方取得 Lunge 合法域。 |
| r2 预览 | 下侧 4.697 英寸合法，证明哈希与终点均按当前房间重算。原 4.993 英寸候选被产品以 PROPOSAL_INVALID / LUNGE_MOVE_GLOBAL_PROOF_REQUIRED 拒绝。两次预览后的状态哈希、修订号与付款卡可用状态一致。 |
| r3 同一签名动作 | 上侧 4.697 英寸。一次提交支付 1 Biomass，军表卡被耗尽，Hydralisk 移到 (14.000, 6.629)，位移事件保存证明哈希。重复提交返回原操作结果。原射击序列逐字段一致，回到 Goliath。 |
| r4、r5 原射手后继 | 射手先结束武器序列，再结束激活，交给 player2。 |
| 冷回放 | 关闭并重开签名房间，按同一冻结绑定精确回放 5 张收据。状态、日志和绑定哈希一致。 |

夹具修正包括本地模块 URL、场景相关的运行时哈希和付款候选选择。合法菜单按每个付款来源给不同域，验收由实际合法域选卡，并用结算事件检查规范化的 BM 支付。全部失败记录保留，已通过的射击、反应优先与位移阶段没有重跑。

本验收证明已绑定隔离房内的单模型支付、位置、同一阻挡两侧的候选、原射手后继和持久恢复。正式 Match 默认准入、复杂或多模型绕行、Web/App 和共享工具的候选查询仍待。旧 3.194 描述符兼容复用此前实证。零模型，Standard 主样例 114/115。Wave3 2/16，余 02、03、05–16。

[签名证据索引](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-forward-detour-signed/result.public.json)、[动作回放结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-forward-detour-signed/cold.public.json)和[前一阶段的原生证明](ticket-28-wave3-lunge-ground-forward-2026-11-23.md)。
