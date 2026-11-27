# Ticket 28 / W3-11 · Khalai 整卡与 Pylon 原生后继

候选发布 U83/C84/R50 + FAQ 1.3。以正式 Standard 工厂创建一场 Khalai 对 Dropship 的隔离 Room，军表所选定义 26/26，Pylon Warp-In、Bound by the Khala 以及生成物的 Structure、Khalai Ingenuity、Warp Conduit 都进入原生目录。测试从声明的开局棋位出发，Pylon 由本场实际卡动作生成。军表和发布资料均由产品工厂装配。

## 缺口如何产生

1. **Wave3 迁移漏接。** 旧代码已实现 Pylon 生成和生命周期，但 Wave3 正式开房另有一份按发布、能力族选择的装配逻辑。旧定义的身份对账不会自动把生产者与生成物的被动依赖装入房间。组件试验直接准备已在场的 Pylon，因此曾能验证入场，却没有触及正式军表生成及进场当轮生命周期。现在在同一发布装配五条定义，沿用旧生命周期与资产适配器。
2. **旧支付层的覆盖范围不完整。** Slice 237 的旧记录核验冻结定义、资产投影及局部能力域。曾在资产组件中直接调用 Pylon 的折扣函数，证明其可报价和入账。Blink 使用移位适配器的共有能力报价，原共有函数未查 Pylon。正式 r18 在已解锁且符合距离的棋位仍报 1 PE，确认与调用入口和状态无关。现将报价及一次性消费接到共用能力支付，记录来源和消费回执；特征、资产消费者已直接处理的 Pylon 折扣不会重复计算。新行为需要同版显式绑定的 Pylon 资产。
3. **部署的旧几何和后继。** 旧生命周期处理器检查最终棋位与 Pylon 接触。新版从 Pylon 底盘周界按普通 Deploy 校验起点、全底盘路径、队形、敌方影响区和 Supply，再完成被部署单位的激活。Warp Prism 与 Dropship 沿各自规则接共用部署后继，且已有独立签名证据。

## 影响面

| 路径 | 核对结论 |
|---|---|
| Standard / Skirmish | 同一 Wave3 装配器存在遗漏风险。Khalai 在正式 Standard 已完成签名；Skirmish 的通用工厂已有任务与版本证据，未跑本次整卡组合。 |
| Blink、Twilight Templar Warp-In、Zeratul Void Blink | 三者在移位适配器共用报价和入账。实际错误已在 Blink 复现及修复；其余两者只有代码归属证据，能否同房出现及优惠适用需按合法军表核对。 |
| 共用能力费用的其他路径 | 核对资产、特征/状态、Psionic Transfer、反应、移位、已选主动、单位生命周期七个入口，均调用同一报价／消费。对满足条件的 PE 费用统一读取显式 Pylon 绑定。Psionic Transfer 等尚无本组签名。单独的 Zerg 势力支付路径、本身零 PE／CP／Biomass 路由不由本次错误推出。 |
| 部署和自动后继 | Warp Prism 与 Dropship 已分别签名。Pylon 本次实测普通 Deploy 量距、Supply 与交替；近端/远端敌方菌毯对例以及其他资产组合没有用本场结果代替。 |
| Lunge 和其他迁移实例 | Lunge 已登记但缺旧正式射后开窗；Zealot Charge 与 Queen Psionic Link 是同类发布装配遗漏，已有各自的签名修复。继续用正式父动作到后继核验。详见[旧能力归因和影响面](ticket-28-wave3-inherited-capability-gap-audit-2026-11-23.md)。 |

## 同房签名结果

| 动作 | 实际结果 |
|---|---|
| R1 r1 · Pylon Warp-In | 在地面生成 Structure，Supply 0，阵营卡耗尽。敌方底盘距恰好 10 英寸被拒，生成当轮无入场和折扣。 |
| R1 r14 / r15 · 回合结束 / Cleanup | Pylon 先解锁，阵营卡仍耗尽；Cleanup 再刷新卡。 |
| R2 r18 · 合法菜单 | Pylon 未提供自身激活或重复生成，合法预备队入口可用。修正共用报价后 Blink 接受不交支付卡。 |
| R2 r19–21 · Blink、Bound by the Khala、第二次 Blink | 首次实际 0 PE，Pylon 账本记一次。连锁立即结束第一个 Stalker 的激活并开启第二个，连锁排除敌方及 Structure。第二次 Blink 实付 1 PE 并耗尽 Warp Prism 资源卡，折扣账本仍为一次。 |
| R2 r25 · Warp Conduit | 3 个 Zealot 从 Pylon 底盘周界起步，实走 2 英寸。可用 Supply 6→4，结束该单位激活并交给 player2。 |
| 冷回放 | 同房 25 条签名回执，状态哈希和日志头一致。旧 v2.16 描述符精确重建。 |

- [Slice 237 旧资产收口范围](../ticket-23-slice-237-current-product-battlefield-asset-family-closure-2026-09-14.md)和[原 Pylon 组件停点](ticket-28-wave3-pylon-native-entry-2026-11-23.md)。
- [正式军表准入](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-khalai-v217-opening.public.json)、[首费](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-khalai-v217-room-discounted-blink.public.json)、[后续原费](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-khalai-v217-room-full-price-blink.public.json)、[部署](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-khalai-v217-room-deploy.public.json)、[冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-khalai-v217-room-cold.public.json)。
- [发布装配](../../packages/product-composition/official-release-room-ability-admission-v2.mjs#L268)、[共用报价及消费](../../packages/product-composition/official-unit-ability-payment-modifiers-v1.mjs#L7)和[Blink 原生调用](../../packages/product-composition/official-relocation-family-adapter-v1.mjs#L685)。

本项是正式产品工厂的专项签名验收。主 Standard 样例仍为 114/115，剩 Hydralisk Lunge；W3-11 的其他任务/部署几何与端上流程仍待。模型调用 0，Ticket28 仍为 2/16。
