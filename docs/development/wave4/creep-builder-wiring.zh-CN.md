# W4-02：三条 Creep 建军主体修订

三条旧势力卡的 `Zerg Creep @2` 已接到 Wave4 同源 Builder、房间工厂建军审核、军表注册和双方卡资源生成。它们复用现有 `exactly_one_tactical_group` 与费用审核，新增游戏原子 **0**。本批验收限定在建军链；完整房间开局、Web 界面和新增单位／势力仍待接。

| 定义 ID | 同势力可购的 Creep／气费用 |
| --- | --- |
| `card:kerrigan_s_swarm/zerg-creep-any@2` | Accelerating 0；Malignant 10 |
| `card:zagara_s_swarm/zerg-creep-any@2` | Accelerating 0；Reactive 10 |
| `card:zerg_swarm/zerg-creep-any@2` | Accelerating 0 |

以上均是每位军表拥有者独立选择、独立支付。对方已选一张不能满足己方的必选要求。原始特征哈希与身份目录的特征哈希分别校验，逐 ID 收据保存在 [验收原件](evidence/creep-builder.public.json)。

实际消费者顺序：

1. `createOfficialArmyBuilderCatalogueV2` 从完整冻结的 U98／C88／R50 数据重新编译卡面、单位和建军约束。
2. `createOfficialArmyBuilderQueryPortV1` 枚举同版候选并生成带来源、范围与费用的回执；`resolveOfficialArmySlotAuditV1` 对当前军表执行恰好一张约束。
3. 正式 Standard 工厂的 `buildOfficialRoomArmyAuditV1` 先调用 `validateOfficialFactionRequiredTacticalCardGroupsV1`，随后重新审核同一份 Native 候选。其审核结果与 Builder 完全相同。
4. `createOfficialRoomRosterDisclosureDataBundleV1`、`resolveOfficialRosterRegistryAuditV1`、`createOfficialRoomCardResourcesV1` 用同版审核生成双方军表和各自卡资源，保留来源记录及载荷哈希。
5. 新解析器冷打开持久化 ReleaseManifest、Builder 和五组双侧军表，重新审核、注册和生成卡资源，结果逐项一致。

5 种合法 Creep 选择全部通过；16 个反例覆盖缺选、多选、重复、错势力及另一方缺选。重复同一卡在现有 Builder 中返回 `unknown / UNIQUE_CARD_SINGLE_COPY_LIMIT`，仍拒绝进入合法军表；工厂独立以必选组数量拒绝。未改变既有拒绝分类。

完整 Builder 当前仍拒绝 Stukov 的 `Ashes of the UED` 未实现建军规则。本批使用显式 [范围清单](../../../content/source-releases/wave4-20261127/creep-builder-scope-v1.json)：完整分母 119 条单位／卡记录中接入 94 条已有记录，另 25 条新增记录排除；94 条事实全部重新来自 Wave4 原始数据。数据集及原候选保持原样。范围、排除清单与完整分母进入每层目录及 Builder 回执，`fullReleaseAdmission=false`；目录内保留的其他能力也不因此获得对局准入。39 条来源阻断涉及的记录全部未进入本批候选。

可重复执行：

```sh
node scripts/compile-wave4-creep-builder.mjs
node scripts/verify-wave4-creep-builder.mjs
node scripts/verify-wave4-ability-diff.mjs
```

编译产物位于 `build/wave4-web/creep-builder/candidate`，可以注册到正式 ReleaseResolver，以 `purpose: army_building` 读取；对局用途因必要组件未齐而被正式解析器拒绝。候选 manifest 哈希固定为 `cc3c4d21a803555783667889b0ee6b90355fb1202ba157c14caaced091dc6494`。验收同时与提交 `97bc694` 的旧编译器对比相同输入，Wave3 Builder 输出字节等价；旧版来源被新目录拒绝。156 条差分门继续通过，39 条来源阻断不变。

当前 14 条旧定义修订已有对应范围内的执行证据：11 条战斗时点原生／局部 Web，以及本批三条建军主体。18 个必需新游戏原子仍实现 0，整版 Wave4 尚未准入。后续先处理 Stukov 跨种族建军和运行时转换的明确合同，再接新单位／势力及完整房间与 Web。Wave3 玩家房未读写，5483 未操作；付费模型、K3、AI 对局、复盘和生产发布继续暂停。
