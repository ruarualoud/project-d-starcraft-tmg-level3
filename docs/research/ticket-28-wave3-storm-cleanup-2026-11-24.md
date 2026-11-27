# Ticket 28 / W3-10 · Gale Token 回合清理

从 3.213.0 原签名 Gale 房 r9 读取 Token、中心、回合状态和移动末／突击末记录。隔离房显式声明完成计分后的 Cleanup 入口。原 r9 的近战结束和计分没有在本次隔离房执行。这里沿用 r9 的工程假设尺寸。 [原 r9 到近战记录](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-cast-v3213/gale/lifecycle-result.public.json)

同一 r9 派生的旧版实际 Cleanup 签名成功后，Gale Token 与中心仍留在棋盘。原因是组件的激活清理只清效果和支付标记，普通 Storm Token 还未接通 8.9.5 的生命周期。旧 3.213.0 房与复现记录均保留。 [旧版失败证据](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-cast-v3213/cleanup-v3215/original-cleanup-gap.public.json)

3.215.0 在 Cleanup 的现有最终提交中复用共用 Token 内核。规则器校验 Token 的创建单位、坐标、回合与签名中心，按普通 Token 的到期声明移除 Token 和对应中心，保留已完成的两阶段伤害及回合历史。

修正版隔离房额外放入明确标记的持久 Token 作对照。实际 Cleanup 移除了 Gale，持久 Token 逐字段不变。随后原生先手结算进入第 2 回合，合计四条签名完整冷回放。三次先手动作包含两个平局回执。 [签名结果](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-cast-v3213/cleanup-v3215/result.public.json)

已完成组件的施放后两阶段、隔离 Cleanup 与次轮进场。仍需实物中心直径、购买 Storm 与两种能力的真实几何施放，以及从实际近战和计分连续进入清理的产品验收。W3-10 21/23，Wave3 151/162，正式 Match 3/26，Ticket 28 2/16。零模型。
