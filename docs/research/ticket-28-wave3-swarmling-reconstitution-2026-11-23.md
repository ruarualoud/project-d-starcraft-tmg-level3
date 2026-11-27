# Ticket 28 · W3-10／11 · Swarmling Zergling Reconstitution

## 原因与实现

冻结版本的 Swarmling 复生已经有旧执行规则。Wave3 候选之前只为 Vileling 绑定同名复生数据。新版为 Swarmling 从自身冻结定义生成载体，复用权威 RESPAWN 原子、底盘接触、摆位、人口档和资源结算。生命周期源码同时包含现有虫洞、Corpser 召唤及 Queen 种菌毯绑定。正式开房用 v2.9 装配，原 v2.8 描述符按绑定逐字段重建。

菌毯加成重新用场上权威几何求值。新版 Swarmling 不会因上游残留的 ON CREEP 字段多恢复一枚。其他已发布版本保留原路径。改动涉及复生来源数据、单位生命周期适配器、原生能力编译、正式开房和回放版本选择。

## 验收

- 真实 Standard 候选工厂生成 18 枚 Swarmling 的合法军表，隔离军表 26 条义务均有原生绑定。主样例从 112/115 到 113/115，待 Lunge 与 Ventral Sacs。
- 两个签名房从明确摆位的隔离场景开始，保留 7 个存活模型。第一条无菌毯并有残留 ON CREEP 字样，预览正确拒绝 3 枚，签名提交恢复 2 枚至 9。另一条使用新版原生 Creep Tumor 资料声明在场令牌，签名恢复 3 枚至 10。
- 两条各支付 1 Biomass。复生的模型接触原有存活底盘，Supply 均保持 1。普通移动仍出现在菜单。双方实际结束激活并交给对方。原权威人口档为 1–6 枚 Supply 0、7–18 枚 Supply 1。同一正式 Match 的隔离查询证明 6 枚时不提供复生动作，防止跨档恢复到 7 枚。
- 两方 r3 各冷回放三条签名回执，状态完全一致。首个工程场景撤去过大的方阵，改为实际底盘允许的六角环；错误在进行签名前由真实队形校验拒绝。无模型、生产发布、历史对局或复盘调用。
- 尚未组合验收混合军表的所有生命周期和 Swarmling Metabolic Boost 的实际消费。单独记录了复生源数据哈希。旧组件总描述的默认作用域标签仍可误指 Rapid Ingress，下一版补准确的复生标签，保留这两间 v2.9 房的绑定。

## 剩余两项

- **Ventral Sacs**。冻结规则要求移动阶段放信标，距所有敌方模型大于 10 英寸；回合末可供一支 Ground 预备队单位接触该信标部署。已定位旧生命周期直接写摆位的路径，需把完整底盘距离和权威部署、Supply 及结束后的选择接通。
- **Lunge**。冻结主规则 §4.5 要求遇障碍走最短绕行并恢复原方向，多模型须按最短可行路线选择领队且尽量向目标收拢。旧规则只接收隔离几何证明，现有有界候选搜索无全域最短保证。应从已结算的真实射击产生后继，保留声明时范围依据，再接可验证的定向移动。能力仍在未准入清单中。

整体 2/16，剩 02、03、05–16。当前仍在补齐 Wave3 的规则和实际房间，正式人机与 Agent 材料次序不变。

- [正式开房链路与人口档](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-swarmling-respawn-admission.public.json)
- [菌毯外签名分支](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-swarmling-respawn-off-creep.public.json)
- [菌毯内签名分支](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-swarmling-respawn-on-creep.public.json)
- [两房正式冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-swarmling-respawn-cold-replay.public.json)
- [人口档否决对照](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/wave3-inherited-swarmling-respawn-supply-bracket.public.json)
