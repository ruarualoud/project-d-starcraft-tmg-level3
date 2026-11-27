# Ticket 28 · W3-11 · Warp Prism 信标与特殊部署后继

## 改动

冻结 U83/C84/R50 中 Warp Prism 有两个独立效果。Phase 复用长度 3 英寸的 PLACE。Warp Conduit 的信标距离和回合末地面预备队部署文字与 Ventral Sacs 相同，复用完整底盘接触、权威部署几何、Supply、放弃和生命周期结算。信标保留各自的来源定义、功能哈希和使用记录。

Match v2.13 用实际提交的特殊部署事件触发已有菌毯消费者。普通空间动作、拒绝、放弃、PLACE 和 SET 各自沿其动作路径。版本条件保持旧 Ventral 签名路径的定义及执行语义。Rapid Ingress 的冻结文字是 SET Point Defence Drone，不能通过名称归入部署。本次未启用 Dropship 和 Pylon 的新来源。

## 验收与恢复边界

- 来源层通过。两条 Warp Prism 定义按冻结文本分别编译，和 Ventral Sacs 信标共同通过源适配器验证。Phase 编译为 3000 milli-inch 的直接 PLACE。旧 v2.11 精确重建运行时描述符，未重跑旧房。
- 产品层仍停在正式候选工厂。前次场景两支 Elite 超位。后两次通过 REPL 直接构造停在草案面朝上行校验，改用此前已验证的原生 Node Worker 后越过了该层。原生根门要求所选军表定义齐全，返回 OFFICIAL_RELEASE_ROOM_ABILITY_COVERAGE_PENDING。本次只保留了错误码和栈，未获取错误 detail 中的待接 ID，具体缺项留待在取得定点继续边界后读取。
- 三轮加一次定点尝试均记录。没有签名新房。后续需单步取正式工厂缺项，完成卡牌耗尽和后继、回合末合法落地、近远菌毯正反例及冷恢复。Dropship 等其余部署来源依自身伴随能力处理。

工程实现和产品接线均部分完成。真实模型产出和策略效果未执行。Wave3 2/16，余 02、03、05–16。零模型调用。

- [来源编译和旧绑定](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-warp-prism-v213-component-and-legacy.public.json)。
- [原生开房停点及保留的四次记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-warp-prism-v213-opening-stop.public.json)。
- [Match v2.13 接线](../../packages/product-composition/official-current-product-match-runtime-v1.mjs)、[信标规则消费](../../packages/product-composition/official-battlefield-asset-family-adapter-v1.mjs)和[Phase](../../packages/product-composition/official-relocation-family-adapter-v1.mjs)。
