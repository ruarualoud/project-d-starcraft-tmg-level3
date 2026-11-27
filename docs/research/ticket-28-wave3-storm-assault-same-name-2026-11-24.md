# Ticket 28 / W3-10 · Storm／Gale 突击末同名择一

## 原因与实现

冻结总规则 §10.1 规定同一单位同时受同名特殊能力影响时只应用一个实例。移动末已使用这一限制；突击末逐个标记结算，没有按目标单位保留已应用实例。同一目标可因此被两枚 Storm 分别掷骰。

新增候选 **3.216.0** 把同名规则接到既有突击末窗口，按能力和目标单位维护选择与已结算记录。在两份效果不等价时沿用本项目移动末裁定，由受影响单位所属席位先选一个实例。效果相同的两个标记共享一次掷骰，标记仍可独立作用于其余目标，异名 Gale 独立。选择动作不掷骰并签进回放。查询与实际骰批共用排除结果。冻结规则直接给出“同名不叠加”，并未明文规定突击末的实例择一细节或全局结算顺序。本版沿用项目已有的选择和顺序规则。 [冻结总规则](https://archon-studio.com/files/manuals/sc/StarCraft-TMG_EN.pdf)

## 权威房间证据

| 场景 | 结果 |
|---|---|
| 两个不等价 Storm，选择 5+ | 受影响的玩家二选择，玩家一安排标记结算，未选标记先结算时排除重复目标，Gale 独立。7 签，进入近战。 |
| 两个不等价 Storm，选择 4+ | 相同资格与时序，选择较强规则批次仍合法。7 签，进入近战。 |
| 两个等价 Storm | 无需额外选择，第二个标记对该目标没有骰子。5 签，进入近战。 |

三房共 **19 条签名**，冷回放一致；旧缺测候选和已量测 3.213.0 描述符逐字段一致。场景从具名、权威确认的中心进入突击窗口；两个真实施法后继沿用上一轮签名证据。测得的 30 mm 中心和用户确认的 127 mm 外圈绑定到候选。零模型调用。

- [两条不等价分支](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-community-marker-30mm-v1/assault-same-name-v3216/result.public.json)
- [等价分支](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-community-marker-30mm-v1/assault-same-name-v3216/equivalent/result.public.json)
- [候选发布](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-community-marker-30mm-v1/assault-same-name-v3216/manifest.json)
- [实际施法记录](ticket-28-wave3-storm-marker-community-measurement-2026-11-24.md)

W3-10 组件从 21/23 到 23/23。本次没有增加正式 Match 子项；跨能力共享顺序、计分与 Cleanup 的产品后继留在正式接线验收。
