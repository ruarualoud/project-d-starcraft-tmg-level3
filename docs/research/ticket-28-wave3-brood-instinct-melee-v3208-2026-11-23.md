# Ticket 28 / W3-11 · Brood Instinct 近战闪避

冻结 U83/C84/R50 + FAQ 1.3。候选组件 3.208.0 从同一签名 Rapid Burrowing 来源派生回合二 Combat 场景，由 Marine 使用 Strike 攻击 Vile。声明的相对位置和近战攻击骰来自底座几何与正式 LegalSpace。两边均为隔离人工席位。

| 分支 | 实际经过 | 冷回放 |
| --- | --- | --- |
| 护甲全部挡住 | 3 个攻击骰命中 1，护甲挡住。Vile 有闪避资格，但剩余 0 骰。没有反应窗口，也没有闪避骰。 | 3 签 |
| Vile 使用 Brood Instinct | 5 个攻击骰命中 2，护甲后仍有 2 骰。r2 打开目标专属反应，r3 攻击方让优先权，r4 守方用卡。r3／r4 均无骰票，r5 才生成 2 张闪避骰票，阈值从 5+ 降至 4+，实掷 2、1。目标记录同一窗口只消费一次，后继菜单可读。 | 5 签 |
| 守方放弃 | 从用卡分支已签 r2 的相同命中与护甲结果独立开房。双方放弃均无骰票，最后仍投 2 枚，阈值维持 5+，本场实掷 5、2。卡资源保持原样，无损消费原窗口。 | 3 签 |

近战逐目标沿用保存的命中、护甲与 Tough 选择，精确计算剩余闪避骰。3.207.0 普通射击组件描述符与已保存配置精确一致。三房共十一签冷回放。模型调用为零。

测试初建时漏用发布绑定器，权威房间拒绝。后续在已提交的 r5 读错骰票字段，已直接从保存的房间和预览核对 `chanceTicket.spec.count`，未重掷。放弃分支沿用已签 r2，保留原用卡房。自动 HITS 入口已有候选接线，实际房间验证待补。模板分批、完整 Match 启用、Morph 计分及生成物后继待办。

- [使用](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-melee-v3208-v1/flank-use/result.public.json)
- [放弃](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-melee-v3208-v1/decline-from-signed-r2/result.public.json)
- [有资格但零骰](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-melee-v3208-v1/use/result.public.json)
- [骰票读取停点](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-brood-instinct-melee-v3208-v1/flank-stop-2.public.json)
