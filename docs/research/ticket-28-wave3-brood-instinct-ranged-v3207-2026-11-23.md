# Ticket 28 / W3-11 · Brood Instinct 的实际射击闪避

冻结 U83/C84/R50 + FAQ 1.3。组件 3.207.0 显式接入冻结 Brood Instinct 来源和普通数值射击的 Native 后继。复用签名 Rapid Burrowing 的 Vile 状态，声明第二回合 Assault 和卡牌刷新，在 Hidden 允许的四英寸底座间距内由 Marine 射击。夹具使用实际授权军表、底座连续性和冻结 Hold Position 供给。

## 规则与改动

- 可能触发时，原攻击先提交命中及 Surge，再结算护甲和可选 Tough。读取真实剩余的伤害骰数，检查目标已有闪避资格以及是否可修改。开启反应时尚未产生任何 Evade 骰。
- 反应在原攻击父状态下处理，保留攻击、目标、已签骰、行动方和回执绑定。使用时消耗来源卡，常规闪避阈值结合 +1 修正；放弃时保留原阈值。消费只发生一次。实际伤害池为零时直接续接并结算，不派发反应。
- 根级预览原先把新窗口误归给通用反应路由，已按等待中的射击父状态交给原所有者。实际从原 r2 续验，未重复命中及护甲。

## 产品证据

| 真实分支 | 准入与结算 | 签名 |
| --- | --- | --- |
| 使用 | 护甲后剩 1 骰才开窗。支出 Zerg Swarm 卡，Vile 的阈值 5+ → 4+。随后只投真实剩余的 1 骰，本次为 5，成功。 | 5 |
| 放弃 | 已有资格，护甲后 4 骰。双方放弃，Vile 仍按 5+ 判定，实投 2、1、4、4，全部失败，卡仍可用。 | 5 |
| 无资格 | 同一声明棋位去掉 Burrowed/Hidden，不满足其他资格。完整射击结算，无 Evade 窗，卡仍可用。 | 1 |
| 有资格但零骰 | 声明只剩一个 Marine 的独立场景，实际护甲后无伤害骰，未开启反应，结算动作的 Evade 真骰为 0。 | 3 |

四房共 14 签，冷回放逐房精确。两组正例用不同真实骰序，不能从伤亡差推导反应价值。既有 2.23.0 原描述符按存档绑定精确重建。模型调用 0。

## 剩余准入

普通数值射击组件通过。近战、自动 HITS 和模板分批的同一时序仍待，之后才开放原 Zerg Swarm 军表的完整 Match。此前的 23/24 准入结论保留。Morph Cleanup、生成单位后继及 Web/App 签验继续按 W3-11 路由登记。

- [使用与实际骰](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-ranged-v3207-v1/use-in-range/numeric-public-facts.json) · [放弃与实际骰](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-ranged-v3207-v1/decline/numeric-public-facts.json) · [无资格](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-ranged-v3207-v1/ineligible/result.public.json) · [合格但零骰](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-ranged-v3207-v1/empty-pool/no-evade-outcome.public.json)
- [旧版重建](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-ranged-v3207-v1/v223-binding-reconstruction.public.json) · [Supply 夹具停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-ranged-v3207-v1/stop-1.public.json) · [Hidden 射程夹具停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-ranged-v3207-v1/stop-2.public.json) · [根级反应所有权失败](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-ranged-v3207-v1/stop-3.public.json)

## 修改文件

- [official-ranged-choice-context-v1.mjs](../../packages/product-composition/official-ranged-choice-context-v1.mjs)
- [official-ranged-precision-choice-runtime-v1.mjs](../../packages/product-composition/official-ranged-precision-choice-runtime-v1.mjs)
- [official-selected-roster-ranged-action-runtime-v1.mjs](../../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs)
- [official-characteristic-status-component-runtime-v2.mjs](../../packages/product-composition/official-characteristic-status-component-runtime-v2.mjs)
- [official-reaction-family-adapter-v1.mjs](../../packages/product-composition/official-reaction-family-adapter-v1.mjs)
