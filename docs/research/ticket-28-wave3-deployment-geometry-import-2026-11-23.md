# Ticket 28 / W3-11 · 新部署来源核对与几何导入

## 已冻结来源

冻结的 Terran Wave3 P2P 第 8 页、Protoss 第 4 页、Zerg 第 6 页都含 Power Lines 与 One Bridge Too Close。三份 PDF 已逐个重算 SHA-256 并与冻结来源索引比对。正向卡面可读到规模、两个颜色进场边及编号标记。已查的三册中未发现 Meeting Engagement，写表器仍提供该卡的冻结记录与正面引用。

## 导入合同

候选发布可通过 `components.deploymentCardGeometry` 引用版本 1.0.0 档案并固定 `bundleHash`。档案包含 `sourceSnapshotHash`、`normalizedDatasetHash`、`cards` 和 `trainingTruth: false`。每条卡核对冻结记录 ID、数据摘要、正面引用、规模和来源摘要。几何由棋盘宽高、红蓝进场边区间和带编号坐标组成。桌面原点为左下，单位为英寸。标记号、坐标、区域越界及组件摘要均从正式数据入口校验。

## 验证与缺口

以隔离原创测试布局验证 Standard、Skirmish 工厂。各工厂消费匹配的地形计划并生成冻结任务初态，分别读到 5 枚和 3 枚标记。原十张部署的草稿数据和几何数据摘要逐字一致。错误规模、边长越界、重复编号、来源摘要不符、缺几何档案均被拒。首次测试误用了现成垂直射线与自定义进场边，工厂正确拒绝；改为与测试进场边匹配的地形计划后通过。

实卡候选发布接入、正式开房及端上验收待做。资料核对覆盖两张尺寸卡面，测试成功覆盖输入合同和真实工厂边界。实际启用的新增实卡仍为 0，模型调用为 0。换部署时需要通过与所选进场边一致的地形认证。

- [冻结来源核对](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/frozen-card-source-review.public.json)
- [两规模工厂与反例](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/importer-verification.public.json)、[不匹配地形的拒绝证据](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/first-factory-boundary.public.json)

## 冻结实卡坐标已转录

复核 Terran Wave3 印刷册第 8 页原 PDF 的冻结 SHA-256，并用卡面标注距离、中心线和外边线转录。坐标采用左下为原点，单位英寸。左侧及上边左半为蓝方，右侧及上边右半为红方。六寸阴影为入场边向内的影响区。底边没有入场线。

| 卡牌 | 棋盘 | 任务点编号及坐标 |
| --- | --- | --- |
| Power Lines | 36 × 36 | 1 (24, 21)，2 (12, 21)，5 (18, 6) |
| One Bridge Too Close | 54 × 36 | 1 (36, 21)，2 (18, 21)，3 (42, 6)，4 (12, 6)，5 (27, 6) |

真实发布解析器校验档案和冻结记录，已经把两个配置编入同版部署几何目录。目录从 10 增至 12。Meeting Engagement 仍缺可核对的正面输入。本轮模型调用为 0。

- [两张实卡几何档案](../../content/source-releases/wave3-20261123-reviewed-deployment-cards-v1.json)
- [候选清单](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-candidate-manifest.json) · [发布编译回执](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-compilation.public.json)

## 两种规模的真实签名开局

原 Skirmish 默认地形的纵向射线被正确拒绝。Standard 首次诊断使用了错误的夹具余额参数，修正为产品导出的常量。两张实卡保留已有地形摆放，改用 y=10 和 y=26 的两条六英寸宽横向射线，端点各自落在对向进场边。正式平衡地形认证通过。已选军表的能力覆盖为 Skirmish 33/33、Standard 115/115。

两个人工席位分别在真实 Skirmish 和 Standard 隔离房提交首轮任务启动。两房均签至 r1，关闭数据库后重建运行时并冷回放一致。权威绑定分别登记了 3、5 个任务点，且两方进场边与转录一致。旧签名场景保留为兼容证据。下一边界为第三张卡的资料、端上选择和实际部署动作验证。

- [默认地形诊断](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-default-terrain-diagnostic.public.json) · [适配后工厂覆盖](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-matched-terrain-diagnostic.public.json) · [实卡绑定对照](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-actual-binding.public.json)
- [Power Lines 签名与冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-signed/power-lines/result.public.json) · [One Bridge Too Close 签名与冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-signed/one-bridge-too-close/result.public.json)

## 两张实卡的双方 Deploy

从原两房的 r1 签名检查点继续。两房均选择红方先行动，双方各部署一个单位并结束激活，最后把控制交回红方。均推进到 r6。从原 r1 冷回放每房新增的 5 条回执，终态和棋位哈希一致。

| 部署 | 红方走上边红半区 | 蓝方走左侧边 | 预览拒绝 |
| --- | --- | --- | --- |
| Power Lines | Medic 三模型落地，可用 Supply 3 → 2 | Kerrigan 落地，3 → 2 | 敌方进场段两次，无入场线的底边两次，跨上边分界的底座一次 |
| One Bridge Too Close | Goliath 落地，5 → 3 | Queen 落地，5 → 4 | 同样五次，另有一个 Queen 超速候选被拒 |

两房复现了共享 `legal_full_path_movement` 在原生实例化后误报不支持。正式 Match 的原生 spatial 动作有一层额外包装，共享投影只读了第一层。修复统一投影识别已知 spatial 包装，复用权威计划，不修改签名运行时或棋盘规则。四次共享查询的动作哈希均与 Room 预览和提交一致，路径及完整摆位由 Native 验证。各次非法预览保持原棋位。供模型使用的真调用、Web/App 控件和第三张实卡仍待。模型调用 0。

- [Power Lines r1 → r6](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-signed/power-lines/deployment-continuation.public.json) · [红方拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-signed/power-lines/deployment-red-wrong-edge.public.json) · [蓝方查询](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-signed/power-lines/deployment-blue-native-path-query.public.json)
- [One Bridge Too Close r1 → r6](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-signed/one-bridge-too-close/deployment-continuation.public.json) · [共享投影修前停点](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-signed/one-bridge-too-close/deployment-red-path-stop.public.json) · [Queen 超速拒绝](../../build/ticket-28-wave3-mission-source-20261121-v1/deployment-card-source-review/reviewed-two-card-signed/one-bridge-too-close/deployment-blue-path-stop.public.json)
