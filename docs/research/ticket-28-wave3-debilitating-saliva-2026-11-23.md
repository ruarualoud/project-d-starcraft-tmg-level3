# Ticket 28 · W3-10／11 · Debilitating Saliva

## 来源、修改与影响

冻结 U83/C84/R50 + FAQ1.3 的 Vile 反应检查 8 英寸内的敌方射手并支付 1 Biomass，对该单位的远程武器施加 DEBUFF Hit (1)。在 v2.7 候选中，旧执行族有同名能力，但新发布缺少规则编译、投骰前的原生反应和减益后继，主军表因此不通过完整准入。

v2.8 用准确来源绑定复用旧反应优先权和完整底盘距离。射击方声明后，原武器、目标和语义参数保存在权威父动作中。双方反应结束后才确认并掷骰。签名反应状态由同一个远程命中计划消费。接口按原激活检查反应额度。若同一射击还涉及后续除减益或选中目标反应，运行时保留其独立时点。

修改覆盖反应来源、攻击父动作、命中状态及正式候选装配。回放仍按房间签名清单绑定原运行时。原 v2.7 描述符逐字段精确重建。

## 本轮证据

- 正式 Standard 候选工厂生成含 Goliath 与 Vile 的隔离军表，27 条选中定义均可进入原生流程。主军表 112/115，仍缺 Lunge、Zergling Reconstitution 和 Ventral Sacs。
- 签名 Room r2 声明 Autocannon，r3 射击方放弃当前反应，r4 由 Vile 支付 1 BM 使用反应。声明和支付都没有骰票。r5 继续相同的武器和目标。在正常射程，冻结 Autocannon 的 4+ 变为九颗骰全部 5+，实际命中两颗。恢复后只消费一次反应。没有改变 Vile 的命中，权威下一回合投影不再给射手减益。
- 从签名 r2 的原声明，在同一正式 Match 运行时验证双方放弃分支。回到原射手，保持原攻击批次哈希，无命中减益、无费用。该分支未写入签名房。
- 冷开后从正式回放 API 核对五条签名回执，状态哈希完全一致，无静默兼容。首次工程夹具误把合法支付选项数组长度当成本，在 r3 停止。其后从同一房间按资源费用和实际支付事件核对，保留已签名的前缀。
- 已验收本次数字远程攻击消费；并存 Restoration、模板及 Overwatch 反应的产品证据仍待覆盖，实际清理 UI 标记也没有在本次隔离片段中推进到。整体 2/16，剩 02、03、05–16。零模型调用。

下一步接 Hydralisk Lunge 的结算后移动。反应入口由攻击完成收据产生，位移使用原生合法路径与模型底盘，结束后返回原射手的剩余激活。再接复生和 Ventral Sacs，继续完整正式房和全发布对账。

- [正式候选准入和 v2.7 兼容](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-saliva-admission.public.json)
- [签名声明、反应和命中骰](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-saliva-use.public.json)
- [正式冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-saliva-cold-replay.public.json)
- [放弃反应对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-saliva-pass-branch.public.json)
