# Wave3 正式房间的两种规模验证

2026-11-25 · Ticket28 / T28-W3-11 · M22、M23 通过。正式对战接线 5/26；M25 仍有可复现的网页入口问题。

| 人工双席开局 | 棋盘与地形 | 任务与部署 | 规则执行 |
| --- | --- | --- | --- |
| Standard，2000 分预算（本次神族军表允许未花完） | standard-d6-1，54 × 36 英寸，1,804 条地形，5 点 | Fire in the Sky，One Bridge Too Close | 双方各进场一次，签至 r6。突击阶段两模型 High Templar 合法 Run 半英寸。分差 9 继续，10 提前获胜。 |
| Skirmish，500 分 | skirmish-d3-1，36 × 36 英寸，1,031 条地形，3 点 | Gather the Resources，Power Lines | 双方各进场一次，签至 r6。突击阶段三模型 Medic 合法 Run 半英寸。分差 7 继续，8 提前获胜。 |

两场调用产品装配、权威房间和双席操作。部署选项均拒绝从对方边进入。原房从磁盘冷恢复后重放至相同状态。两张地图与既有验收地图逐条对照；房间和客户端投影的占格、轮廓、高差、阻挡属性均一致。此前验收留下的穿墙移动拒绝沿用原回执。本次两场部署后的单位相互可见，另在 Meeting Engagement 场景中实测双向视线被地形阻挡。

移动与任务分别从相同 r6 做隔离续算。实际推进第一回合后计分均为 0 比 0。为验证提前结束，在任务判定入口分别送入阈值上下两组分数；这些分差仅为实验输入。验证保留原房，没有打满两场比赛。

## Meeting Engagement

从官方写表器冻结条目下载正面原图，38,103 字节，SHA256 为 16ad148215ec99da9b7ea8f649999799aac9d8c3faf6086772bb709d96440407。按左下为原点，红方可从下边 x=18–36、右边 y=12–24 进入；蓝方可从上边 x=18–36、左边 y=12–24 进入。1 至 5 号任务点分别为 (12,24)、(42,12)、(42,24)、(12,12)、(27,18)，单位均为英寸。补充场景确实执行双方进场并冷恢复。四段边逐一检查了底盘贴线、中心再越界 0.001 英寸与阵营限制。原有两张卡保留，新增三卡来源包。 [官方卡面原件](../../content/source-releases/wave3-deployment-f1fL4RiJ2zPOF4BeDlgl.jpg) · [四条进场边的规则结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/meeting/four-edge-boundaries.public.json)

## 发现与修改

产品装配原先从来源清单读取部署几何，在绑定运行版本时却用运行清单的哈希回查来源，两个规模都会在建房前被拒绝。现分别传入来源与绑定后的运行清单，同时校验 release 身份；卡面、原始来源和其余不随运行期变化的组件仍逐项校验。

真实浏览器进入双人模式后，大厅固定显示 Standard 2000 / Hold Position / Gauntlet。向当前公开建房接口发送 500 分军表返回 HTTP 500，成功创建房间数为 0。下一步由服务端发布可选的地图、规模、任务与部署组合，大厅提交选择并复用以上两种产品装配，随后检查浏览器重新加入。 [实际大厅](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/human-lobby.png) · [接口原始结果](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/lobby-api.public.json)

## 可核对的运行证据

[地图逐项对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/terrain-comparison.public.json) · [Standard 双席部署及冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/standard/deployment-result.public.json) · [Skirmish 双席部署及冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/skirmish/deployment-result.public.json) · [Meeting Engagement 双席部署及冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/meeting/deployment-result.public.json)

[Standard 移动](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/standard/ordinary-movement.public.json) · [Skirmish 移动](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/skirmish/ordinary-movement.public.json) · [Standard 计分与胜负](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/standard/first-round-scoring.public.json) · [Skirmish 计分与胜负](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/two-scale-map-deployments-v1/skirmish/first-round-scoring.public.json)
