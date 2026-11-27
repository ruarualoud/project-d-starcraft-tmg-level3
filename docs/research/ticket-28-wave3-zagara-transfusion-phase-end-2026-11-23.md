# Ticket 28 / W3-09 · Zagara Transfusion 阶段末自动命中

U83/C84/R50 + FAQ 1.3。以已签的 Corrosive Bile r3 token 作为冻结起点，用 ArmyBuilder 验过的两方军表构造隔离的突击阶段末候选局面。双方的阶段结束条件为声明输入。使用真正的 Room LegalSpace、Preview、Apply 和 Replay 执行后续。

- 自动命中护甲池后，Defiler 承受 4 点伤害。外部反应窗口按先手席位再交防守席位，防守方 Zagara 耗费 1 Biomass，分配前减为 2。
- 续行复用同一伤害池，无重掷。原阶段末队列结算完成，token 与待处理窗口移除。SQLite 重开后 11 条签名精确回放。
- 两次预检停于夹具配置，另一次遗漏已登记的护甲池准备动作。保留两条已提交动作，从原 r2 续验。当前无需变更生产规则代码。

Transfusion 组件验收通过。完整 Match 的同版组合、端上及多来源共存仍依相应面板验收。09 组件 38/40，Wave3 累计 145/162。模型调用 0。

- [签名与冷恢复](../../build/ticket-28-zerg-wave3-20261118-v1/zagara-transfusion/phase-end-corrosive-bile/result.public.json) · [准备证据](../../build/ticket-28-zerg-wave3-20261118-v1/zagara-transfusion/phase-end-corrosive-bile/preflight.public.json)
