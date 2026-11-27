# Ticket 28 / W3-10 · Storm／Gale 社区中心尺寸

## 量测决定

Archon Studio 的 High Templar 盒装清单分别列出 Psi Storm 中心标记与爆炸模板。装配册第 10 页确认两者为分开的零件，40 mm 是 High Templar 底座。社区实物照片在同一料架上拍到了中心圆片、外圈和毫米尺。 [官方盒装清单](https://archon-studio.com/shop/products/starcraft-tabletop-miniatures-game/starcraft-high-templar) [带尺原始帖子](https://www.reddit.com/r/StarCraftTMG/comments/1y26o4g/comment/19szjnjuyxgv9/)

取照片上 80–120 mm 刻度，纵向跨度约 235.5 px。中心圆片避开浇口估读约 171 px，换算 29.0 mm。考虑图片透视与圆片边缘识别，工程候选采用 **30 mm**，估读范围 28–32 mm。该参数来自照片估读，可由后续社区实测替换。外圈沿用项目已确认的 **127 mm**，半径 63.5 mm。本次用尺校准中心，不用外圈换算中心。 [量测数据](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-community-marker-30mm-v1/measurement.public.json) [版本化输入](../../content/source-releases/wave3-20261124-storm-marker-community-geometry-settings-v2.json)

## 已验边界

新版 profile 由 U83/C84/R50 冻结数据编译。旧绑定仍能生成完全相同的描述符，旧候选的中心字段仍为待测。本次候选使用原 Army Builder 审计两边军表，给 High Templar 正式购买 Psionic Storm；Twilight Templar 使用固有 Psionic Gale。两个房间都从无风暴标记开始，正式菜单→查询→预览→提交，实付 2 Psionic Energy，落下 30 mm 标记并保存同坐标结算锚，两个 r1 签名冷回放一致。首次验收夹具读错嵌套动作，修复后从同一 r0 继续，保留停止记录。零模型调用。 [候选发布](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-community-marker-30mm-v1/manifest.json) [双房施法证据](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-community-marker-30mm-v1/result.public.json)

两个候选房延续施法后的原 r1。Storm 到 r10，Gale 到 r9；移动末和突击末均结算，并交回近战，共 17 条新增签名。两房各自的原施法断点和阶段后继均冷回放一致。仍需同名 Storm／Gale 在突击末重叠的独立验收，以及正式 Match 接线。 [同房阶段后继](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-community-marker-30mm-v1/lifecycle-result.public.json)

## 续行顺序

此前把外圈和中心打包成一个缺件，并在当前子项未解决时改走别的线路。台账现在将 127 mm 已验、30 mm 社区量测候选及实际结算后继分开记录。W3-10 的 30 mm 历史候选已完成 23/23。同名重叠也已签名验证。正式 Match 另有验收。当前子项是 W3-08 Raven，单独追踪其接地轮廓。 [同名结算验收](ticket-28-wave3-storm-assault-same-name-2026-11-24.md) [Wave3 手册](../development/wave3/README.md)

## 官方尺寸补录

冻结的 Command Center 版本公告在 Wave 3 Bases 段明确列出 Psi Storm Token **32 mm**、Psi Blast Template **5 英寸（127 mm，半径 63.5 mm）**。此前 30 mm 是社区照片估值，官方 32 mm 位于当时估读区间的上界。新的独立配置使用 32 mm 和同一个 127 mm 外圈，按真实冻结发布编译通过。旧 30 mm 版可重建同一个 profileHash，外圈几何及 Raven 参数逐字段一致。新配置尚未进入正式房间，也未补验标记实体几何的影响。 [官方公告原件](../../build/ticket-28-terran-wave3-20261117-v1/raven-detection-railguns/official-geometry-lookup-20261117/wave3-bases-official-news.json) [官方值配置](../../content/source-releases/wave3-20261124-storm-marker-official-geometry-settings-v3.json) [来源及编译凭据](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-official-marker-32mm-v3/source-checkpoint.public.json)

## 32 mm 发布与产品只读预览

使用已冻结的 Command Center 原件与既有双席军表及场景，生成隔离 3.216.0 组件发布。Storm 和 Gale 均可从各自席位的实际 Room 合法菜单选择，两者的规则查询与 Room 预览动作完全一致，标记均为 32 mm。覆盖模板仍为 5 英寸，几何与旧候选完全一致。两个候选预览后均维持 r0。旧 30 mm 回放继续绑定原候选。正式 Match 及 32 mm 实际提交、后继与冷回放尚待。 [32 mm 候选证明](../../build/ticket-28-wave3-mission-source-20261121-v1/geometry-measurement-intake-20261124/storm-official-marker-32mm-v3/cast-preview.public.json)
