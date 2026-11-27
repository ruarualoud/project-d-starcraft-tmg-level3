# Wave3 正式房间中的脱离接战与菌毯

Ticket28 / W3-09 M08、W3-11、W3-15。发布为 2.61.0，使用双人工工程房间。

普通进场的签名房间 r2 提供 Queen 和 Hatchery 菌毯的位置。隔离房间只追加一条场景前提，将人族预备队 Nova 摆在 (17.900, 4.055) 英寸。原生几何给出与 Queen 的底盘间隙 0.140 英寸。模型的隐身、探测以及对局策略不属于本次验收。

| 步骤 | 实际结果 |
|---|---|
| 公开菜单 | 接战的 Nova 可选 Disengage。 |
| 不指定菌毯落点 | 权威预览明确要求指定落点，房间状态不变。 |
| 查询并提交 | Nova 移动 2.232 英寸，落在 (19.425, 2.425)。同一房间查询返回菌毯接触位置 (20.764, 2.425)。 |
| 权威后继 | 依次签出脱离、菌毯位移、敌方菌毯移除。双方接战人口各 1，签名投影登记本回合禁止射击与冲锋。房间提供结束激活动作，r1 冷回放一致。 |
| 玩家预览 | 修前只读到一个终点。修后按相同行动单位与动作读签名路径、底盘与限制。Web/App 共享组件对部署和脱离的路径、底盘、双语提示与错误单位隔离共 4 项通过。 |

普通 Move、Run、Deploy、Disengage 均已有各自的签名证据。其他移动机制按其规则单独追踪。此项没有付费模型请求，也没有写入策略学习数据。

[场景和签名事件](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-disengage-v261/outcome.json) · [冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-disengage-v261/result.json) · [修前显示投影](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-disengage-v261/presentation-before.json) · [共享组件验收](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-disengage-v261/editor-result.json)

## 实际转入突击

Nova 结束激活后两席相继 Pass，先手方选择人族先行动，正式房间进入第 2 回合突击。Nova 的菜单只有 Run。射击与冲锋各自的原生消费者均明确给出因脱离而禁止的原因。r0→r5 的五步签名在重开存储后恢复至同一棋位哈希。

[实际突击菜单、原因和冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-disengage-v261/assault.json)
