# Ticket 28 / W3-11 · Lunge 射后窗口与真实支付

从已有的 Standard 候选保存态取军表和棋盘。本次调整工程棋位，经原生模型底盘与队形校验，再按冻结 U83/C84/R50 + FAQ 1.3 编译 Lunge。未重跑此前已通过的模板两批次验收，也未修改旧签名房间。

## 改动

在反应适配器添加针对原生实际结算的开窗入口。数值射击必须已有伤亡结算事件，模板必须有武器完成事件及主目标的双结算哈希。入口核对本次转移新增的原生日志和攻击身份，保留原激活、攻击者、实际结算、伤亡、声明时的范围快照及应恢复的行动方。继续复用通用反应优先权、接战与支付校验。仅持组件来源的其他旧路径不会自动启用该入口。

冻结总规则 §4.5 明示领队按最短路线选择，目标取最近模型，遇阻须最短绕行，等长可选，余下模型尽量靠近并满足队形。旧直接移动执行器接受外部声明的候选完整性，并限定旧锁及若干底盘场景，不能从候选比较推出全局最短。下一阶段需要同普通 Move 使用完整底盘扫掠和实际地形，理清能证明的最短路线和合法队形，同时保留等长选择。

## 验证结果

| 边界 | 实际行为 |
|---|---|
| 声明至伤亡 | 用真实 Goliath Autocannon 菜单和计划攻击友方 Raptor。已挂起守方伤亡选择时，无法打开 Lunge。序列化并恢复该选择，移除 1 个 Raptor 后立即得到权威范围与双结算身份。 |
| 优先权及拒绝 | 射手方优先，过手后守方获得 Hydralisk Lunge。再次投影同一后态且没有新日志、攻击回执被改写这两种情形都不打开相应窗口。 |
| 放弃 | 守方过手关闭窗口，消费后结果无移动后继。 |
| 使用 | 真实预览给出 1 Biomass，预览不耗卡。实际提交耗用守方阵营卡。重复提交被拒绝。后继的移动者是 Hydralisk，目标是原 Goliath，按当前速度向目标移动。原 Goliath 还保留射击序列，后续须接回该序列。 |
| 首次验证偏差 | 首轮夹具只命中一次，面对 2 HP 的 Raptor 不会产生要求的伤亡。调整确定性样本后一次通过。没有改伤害规则。 |

- [实际射后窗口、过手及反例](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-numeric-resolved-window.public.json)。
- [实际支付和移交](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-lunge-numeric-payment-handoff.public.json)。
- [完成回执开窗入口](../../packages/product-composition/official-reaction-family-adapter-v1.mjs#L1254)、[旧几何原子的候选合同](../../packages/rule-atoms/official-direct-movement-displacement-executor-v1.mjs#L379)与[已有模板完成边界](ticket-28-wave3-inherited-capability-gap-audit-2026-11-23.md)。

本轮实际证据止于原生数值射击组件与反应组件。最终正式 Match 仍需把两类射击父事件和其他反应顺序一起接入，完成合法位移、激活续行、签名提交与冷重放。未更新 Agent 材料，未调用模型，主 Standard 仍 114/115。
