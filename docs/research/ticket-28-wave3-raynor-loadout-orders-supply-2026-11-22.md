# Ticket 28 / W3-10、11 Wave3 Jim Raynor

冻结军表器的 C-14 Rifle 是 Part 12 的零费替换选项。原射击装填把零费档案都视为装备，导致默认 Commando Rifle 被误换。Wave3 的射击与近战列表共用按实际选择装填的规则。Orders 接入既有支付和激活窗口。Freedom Fighters 用现有任务、占点的上下文 Supply 原子读取同一条来源。

| 边界 | 实际证据 |
|---|---|
| 零费换装 | 两份原生军表审核通过。默认装 Commando Rifle，选 C-14 后互斥替换。分别用合法 Assault 菜单实际射击并冷读。样本射击骰数为 3 和 9，后者含射程内 Burst Fire。 |
| Orders | 三个选项的支付依次为 1、1、2 CP，欠付拒绝，排除自己与非生物单位，有剩余费用时可重复。第一件实际用的 AGG-12 得到 Critical Hit 2，执行后耗尽且冷读一致。已支付撤离许可的 Marine 实际 Disengage 后保留射击和冲锋权限；未支付对照会禁止。2 CP 清除现存 Movement 激活标记。 |
| Freedom Fighters | 同一只剩一模型的 Marine，基础 Supply 为 0。Raynor 在 8 英寸内时，任务、争点有效值均为 1，撤离和增援池仍为 0。实际占点计算从红方 1 比蓝方 0 变成 1 比 1，出现同分不移交；Raynor 移出范围后红方取得控制。 |

撤离、武器和争点采用各自隔离但来源一致的棋位。模型调用为零。旧 V6 描述符与档案逐字段相同。Standard 注册 68/117（待49），Skirmish 17/33（待16），Ticket 28 完成 2/16。正式整局仍待 Wave3 能力补齐，最终应用要另做房间验证。

- [两种装备的权威射击](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-raynor-free-replacement.public.json)
- [三种 Orders 支付、撤离和标记](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-raynor-orders.public.json)
- [首件武器效果耗尽](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-raynor-orders-critical-consume.public.json)
- [任务和争点 Supply 对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-raynor-freedom-fighters.public.json)
- [发布与旧合同指纹](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-raynor-admission.public.json)
- [Standard 剩余定义](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-pending-abilities-after-raynor.public.json)
