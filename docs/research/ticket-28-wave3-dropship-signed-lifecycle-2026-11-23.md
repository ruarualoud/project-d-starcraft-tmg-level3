# Ticket 28 / W3-11 · Dropship 收回与回合末部署

冻结 U83/C84/R50 与 FAQ 1.3。Dropship 的 Ready For Dust-off、Strap in! 都有旧版同源身份。此前 Wave3 的候选没有加入这两条执行绑定。旧信标分支的领队中心重合要求会阻碍底盘边缘接触，旧回收资格也未在通用能力窗口中特别区分行动前后。

候选 Match v2.16 增量复用既有信标、落地和预备队执行器。信标要求距离所有敌方活模型底盘严格大于 10 英寸。回合末落地使用完整底盘接触、队形、敌方影响区和 Supply 校验。Strap in! 在实际阶段动作前检查 Ground 与当前接战图，耗尽同一张卡，更新预备队和 Supply 后结束该单位的激活。两项均受同一张牌的就绪状态约束。

| 工程边界 | 实际结果 |
|---|---|
| 正式 Standard 工厂 | Fire in the Sky／Gauntlet。使用允许未花资源作废的隔离军表政策，两项均由冻结来源编译，所选 29 条定义全部进入 Native。旧 v2.15 候选的运行时描述符精确重建。 |
| 信标 r1 | 10 英寸整的权威几何预览拒绝。合法信标 (19, 25) 英寸实际提交并耗尽 Dropship，收回动作随即从菜单撤下。 |
| 收回 r1 | 另一签名分支将一台 Goliath 收回预备队，站位清除，可用 Supply 从 3 增至 5，行动权交给对手。已 Move 或接战的合法菜单均排除该动作。 |
| 信标房 r14–15 | 同一签名房从移动推进至回合末。底盘中心压住标记的预览被拒绝，放弃对照保留预备队和 Supply。实际选择将 6 名 Marine 完整放入场，领队底盘边缘到信标距离为 0，可用 Supply 从 3 降至 2。 |
| 信标房 r16 与冷恢复 | Cleanup 刷新 Dropship 并进入下一轮先手步骤。关闭重开 SQLite 后，两房分别重放 16 条和 1 条签名回执，终态及日志头一致。 |

验收从正式工厂生成的军表和受控棋位开始。回合开始及首个先手由权威运行时生成，正式签名从移动阶段开始。工具中间修正了候选清单的参数、将 Move 写成 Hold 的对照，以及 Cleanup 使用当前 active seat 的错误。真实房在信标后要求先结束 Goliath 激活，补齐该步骤后从原 r1 续走；已签 r10 后用先手席位续跑 Cleanup。

本轮覆盖同版 Standard 的两条能力及正反边界。Dropship 与敌方菌毯的叠加仍待具体对照，Skirmish 专项组合和 Web/App 双席验收仍待。主 Standard 样例 114/115 的唯一待登记仍是 Lunge。T28-W3-11 进行中，Ticket28 整体 2/16。模型调用为 0。

- [工厂与旧绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-dropship-v216-opening.public.json)、[信标 r1](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-dropship-v216-marker.public.json)及[回收 r1](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-dropship-v216-return.public.json)。
- [接触和放弃对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-dropship-v216-drop-ready.public.json)、[部署 r15](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-dropship-v216-drop-applied.public.json)、[刷新 r16](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-dropship-v216-cleanup.public.json)及[签名冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-dropship-v216-cold.public.json)。
