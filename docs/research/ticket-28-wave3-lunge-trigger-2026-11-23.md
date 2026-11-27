# Ticket 28 · W3-10／11 · Lunge 来源与射击资格

冻结 U83/C84/R50 数据将 Lunge 定义为 Assault Phase 反应，费用 1 Biomass。另一友军在 10 英寸内成为远程攻击目标时，效果等待该攻击完整结算，再检查 Hydralisk 是否未接战。总规则 §4.5 对最短绕行、领队选择及其余模型的队形另有约束。

接入点复用原反应适配器与数值远程结算。新版来源编译器核对打印文本、阶段与资源。原生结算在移除模型前测量底盘，并将有资格的 Hydralisk、射手、实际目标和攻击计划哈希放进 ranged_attack 事件。采用该来源的反应窗口仍需检查当前存活与接战状态。此时暂未将 Lunge 声明为正式房可用。没有该新版来源的旧绑定不产生这个字段。

## 实际检查

读取已保存的 Standard Hydralisk 场景，隔离调整 Goliath 与 Hydralisk 的摆位，并用 Rules 校验完整底盘及队形。Goliath 的 Autocannon 从原生远程菜单实例化获合法攻击计划，10 英寸内的 Hydralisk 被选中，超距源被排除，缺新版来源时没有回执。随后组件可为工程伤亡状态打开窗口。未核对守方菜单实际出现 Lunge。

连续失败依次为精英槽位夹具不足、正式工厂正确拦截未完成 Lunge、1.575 英寸宽的矩形底盘夹具将间距写成 1.40 英寸，以及我在补验脚本用错反应适配器方法。第三项已经更正，场景底盘检查及原生远程资格验证均已越过。反应菜单需要用 legalSpace，这次测试额度已用完，保留全部失败和事实记录。未执行正式签名 Apply、伤亡选择或冷恢复。

## 剩余产品边界

- 在真实数值及模板远程的完整结算后消费前置几何事实。检查直接结算、伤亡选择及支付类反应后的恢复，确保相同批次只开一次窗口。
- 在原生位移入口证明最短合法绕行和最短路线领队，处理齐长路径选择、速度与其余模型队形。在证明不全的场景保留未决，不把样本搜索当精确规则。随后验证采纳／放弃、交回原射手和冷回放。
- Ventral Sacs 维持上次原 r16。主 Standard 登记 114/115，整体 2/16。此次没有调用模型。

- [冻结目录和定点验证证据](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-lunge-target-designation.public.json)。
- [反应来源与资格](../../packages/product-composition/official-reaction-family-adapter-v1.mjs)、[远程结算事件](../../packages/product-composition/official-selected-roster-ranged-action-runtime-v1.mjs)、[前一轮根因与停点](ticket-28-wave3-ventral-sacs-2026-11-23.md)。
