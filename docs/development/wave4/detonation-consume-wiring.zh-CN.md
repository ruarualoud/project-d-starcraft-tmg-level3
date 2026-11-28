# Consume 费用、Detonation 与原效果后继

本批通过具名工程消费者验收：9 个完整原生回合、215 个签名动作；双席 Web 两房 17 次人工确认；独立冷重建 19 房、311 个原动作，新增动作 0。政策 1.9.0、Root 3.242.0、Human 表单封装 1.1.0 显式进入，旧版本保留。整版 Wave4 人人出口仍进行中，完整原子仍 6/18。

## 能力差分与实际消费者

两条新增定义为 `unit:infested_marine/detonation-any-phase@1`、`unit:infested_trooper/detonation-any-phase@1`，均继续登记为 before-casualty Detonation 新语义的部分消费者。Defiler 的 Consume、Plague、Dark Swarm 是既有定义，本批没有将它们计作 Wave4 新卡。

复用已有模型移除、单位销毁、BM 卡费用、NON-LETHAL DAMAGE、模板覆盖、反应时点及 Supply 归属。新组合是 Consume 原费用移除与 Wave4 伤亡前 Detonation。新增接线语义是先承诺全部费用，再开放子反应，最后从封存原件完成同一次付费效果。新增完整原子数为 0；Firebat、Scarab 等新单位组合和整版准入尚未完成。

实际消费者及函数逐项列于 [消费者映射](evidence/consume-consumers.public.json)：Consume stage/resume、封存费用结算器、Plague、Dark Swarm 反应适配器、Target 供给投影同步、工程回合与 Root、Human 1.1、Native 表单编译/费用摘要和战桌。映射同时绑定两种感染步兵的原生用例与来源定义，不以导出函数存在代替执行证据。

## 原生链与结算

- [Plague 六分支](evidence/detonation-consume.public.json)：两种步兵各费用 2 的接受/拒绝、费用 3。费用卡先耗尽；费用 3 分支没有剩余 BM，不开放 Detonation。两次费用 2 接受分支真实反炸杀死原 Defiler，随后仍完成已付费的 Plague、未来骰、模板伤害和回合。合计 142 动作。
- [Dark Swarm 三分支](evidence/consume-dark-swarm.public.json)：先真实 Gestate，再支付 Marine、Trooper 或施法者自身。原 Dark Swarm 已占用同一反应额度，因此费用移除不能再开 Detonation。施法者自身销毁后，原目标仍获得该次攻击的 Evade，原枪组与激活正常收尾。合计 73 动作。
- [结算审计](evidence/consume-settlement.public.json)：9 次原费用移除恰好一次；5 次正 Supply 损失合计 5，未给对手击杀分；4 次零 Supply 末模型仍正常销毁。BM 费用不重复、不银行化，每房只执行一次对应回合计分。

Plague 初始选择不提前取未来骰。费用与祭献模型由 Native 参数域固定，付款后发布 `resolve_paid_plague`，按当前存活目标与已封存施法几何取骰和结算。原来源死亡不能再次扣费或要求重新发动能力。当前工程位置按真实 Defiler 80 mm 圆底座与模型边缘距离生成，并明确声明既有损耗；不是 Builder/大厅开局证据。自然护甲对照一房 11 动作单列，不计主线 9/215。

匹配层支付后会刷新派生 Supply 缓存。新增同步器只接受 Native 刷新器算出的 `officialRoundSupplyState` 差异，并重封 Target 父事实；移动、卡牌变化或伪造缓存均拒绝。[五项边界](evidence/consume-supply-boundary.public.json) 与 [六项表单检查](evidence/consume-form.public.json) 均为组件证据、0 新动作。

## Web、兼容与边界

[实际双席 Web](evidence/consume-web.public.json) 从原动作前缀发起 Plague（13 次确认）和 Dark Swarm 自身费用（4 次确认）；两席独立身份、只读预览、显式确认、重连及签名恢复一致。两次实际付款表单均在 390 px 视口验证，内容宽 298 px，无横向溢出。原武器序列与激活均已结束。Dark Swarm 自身费用来源真实死亡；Web Plague 施法者在实际护甲骰后存活，不能用此房声称 Web 原来源死亡已验，后者只由两个原生分支证明。

初版 Human 1.0 缺失参数域 constraints，严格客户端正确拒绝，未执行动作。显式 Human 1.1 只为缺省 constraints 投影空对象，保留 Native domain ID、原参数与实例化器，不改变规则或放松客户端检查。早期 Web 驱动在 Dark Swarm 两次确认后错误停止，报告已撤回通过；在同一原房补完两次确认后才登记最终四次，未改骰或重置状态。

独立冷验：[当前 11 房/261 原动作](evidence/consume-current-cold.public.json)、[旧 Consume/Plague 四房/14](evidence/consume-legacy-cold.public.json)、[新旧 Human Web 四房/36](evidence/consume-web-cold.public.json)，共 19/311，全部零新动作，原描述器和恢复结果一致。

功能浏览使用 V6 导出。之后仅加 JSDoc 修正表单 API 类型；V7 重新导出成功，并对原两房、四席做[最新包只读重入](evidence/consume-latest-bundle-reentry.public.json)，保留原 17 次动作、零新动作。两份 bundle 字节不同，分别记录于[构建来源](evidence/consume-web-build.public.json)。[类型检查差分](evidence/consume-typecheck.public.json)修复 7 项相关错误、无新增错误；全应用仍有 37 项既存其他模块错误，不能声称全应用 typecheck 通过。

付款卡目前显示只读卡 ID；公开投影已有卡名，列入 W4-03 可读名称补齐，不属于缺失规则数据。截图：[Plague](evidence/consume-plague-producer-390.png)、[Dark Swarm](evidence/consume-dark-swarm-producer-390.png)。总收口：[harness](evidence/consume-harness.public.json)。

累计 Detonation 主线为 62 原生用例、1150 签名动作，24 个 Web 房、121 次确认；不含重复 UI 回归和自然结果对照。39 条来源阻断仍隔离；Builder 102/119、完整原子 6/18 均未增加。80 mm 炮塔仍只作工程估算。下一步接 Firebat 与其余新单位，再汇入整版发布、Builder/大厅、媒体及 500/2000 分双席验收。付费模型、K3、AI 对局、复盘和生产发布保持暂停，模型调用 0。
