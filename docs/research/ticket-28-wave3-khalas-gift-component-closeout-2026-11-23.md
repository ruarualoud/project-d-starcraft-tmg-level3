# Ticket 28／W3-10 · Khala’s Gift 组件准出

冻结 Tassadar 赠礼在真实房间以 0 PE 给友方已购 Farsight 的高阶圣堂。赠礼后，Tassadar 结束激活。受赠者用 Feedback 标记合法敌方机械单位，报价由 1 PE 降到 0。预览保留赠礼，实际结算消耗它一次。之后 Farsight 的费用为 1 PE，原生收据确认耗卡并应用闪避资格。实际支付序列 0、1 PE，4 签冷回放一致。

独立 Cleanup 房从已签的未用赠礼 r1 编译，移除原效果及其绑定，1 条签名冷回放一致。原 3.151.0 五条兼容回执及 3.152.0 修复前付款停点均保留。签名支持来自已有 CP/BM/PE 统一源合同，未擅填资源。

两次新夹具诊断分别定位同侧双英雄槽位非法和普通 Adept 缺已登记的 Psionic Transfer（现有来源仅覆盖 Watchers）。后者只停在受赠后，没有为普通 Adept 补写非法动作。第二次实扣后，验收脚本误用 Farsight 效果短名，直接从原 r4 核对正式标识，不重复提交。

本轮将核心组件验收标为通过。反应和位移的实际赠礼扣费、跨正式 Match 入口及普通 Adept 的继承来源编排，仍由对应集成手续核验。零模型调用。

- [正常付款与冷恢复](../../build/ticket-28-protoss-wave3-20261120-v1/khalas-gift/feedback-first-native/result.public.json)
- [未用赠礼到期与冷恢复](../../build/ticket-28-protoss-wave3-20261120-v1/khalas-gift/unused-gift-cleanup/result.public.json)
- [失败和原停点](../../build/ticket-28-protoss-wave3-20261120-v1/khalas-gift/feedback-first-native/verification-stops.public.json)
