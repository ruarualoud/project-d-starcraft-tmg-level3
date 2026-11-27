# W4-02：Stukov 跨种族建军与运行时转换

`card:stukov_s_forces/ashes-of-the-ued-any@1` 已接入同版 Builder、Native 建军审核、棋子工厂、实际能力支付和共用状态限制。新增游戏原子 **2 个，累计 2/18**。`card:stukov_s_forces/infestation-any@1` 复用恰好一张卡组约束，绑定官方已澄清的三张 Virus 卡，新增原子 0。整版 Wave4、完整 Stukov 势力和新增单位对局仍未准入。

| 新增原子 | 实际消费者与已验证行为 |
| --- | --- |
| `rule-atom:wave4/foreign-faction-army-eligibility@1` | `createOfficialStukovArmyPolicyV1` 编译精确来源；`compileOfficialFactionArmyProfilesV2` 生成候选矩阵；`resolveOfficialFactionTagEligibilityV1` 在真实 Native 审核中授予例外；Builder 与 Standard 工厂使用同一规则。保留 Terran 原始身份、点数、卡槽、唯一性和升级审核。 |
| `rule-atom:wave4/faction-unit-runtime-conversion@1` | `createOfficialRoomPieceFromRosterUnitV1` 绑定来源政策，增加 Infested。`quoteOfficialUnitAbilityModifiersV1` 转换资源类型，特性／反应／原有能力消费者按转换后的类型选卡、结算与记录；`consumeOfficialUnitAbilityModifiersV1` 写入转换来源事件。`projectOfficialUnitRestrictionsV1` 同时供潜地菜单和 Apply 防线使用。 |

消费者文件与导出函数逐项核验，完整映射见 [当前接线进度](../../../coordination/wave4/ability-wiring-progress.json) 和 [边界原件](evidence/stukov-boundaries.public.json)。

冻结来源中，符合条件且可在建军阶段购买的进口记录只有 `army_units:goliath` 与 `army_units:siege_tank`。Auto-Turret／Sabotage Drone 的生成单位身份不因此获得购买资格；Marine 缺 Mechanical，Raven 缺 Ground，Protoss 单位不满足 Terran。Zerg 原生单位仍按各自来源审核。特别是原生 Infested Goliath／Infested Siege Tank 的 CP **不转换**，两条记录继续与其余来源阻断一起隔离。

Infestation 必选组为 Healing Pathogen（0 气）、Hungering Infestation（10 气）、Weighted Pustule（5 气）。来源依据沿用冻结官方复核 `virus-card-group`，保留其 URL 和复核哈希；费用、势力限制和“每份军表恰好一张”继续由既有审核执行。Virus 卡的其他战斗能力仍按各自合同等待接线。

本批接入了 Stukov 势力与三张 Virus 卡的建军资料，并接入三个新单位的 Builder／工厂建军审核：Stukov 240 矿、Infested Marine 160 矿、Infested Trooper 210 矿。三者的完整战斗行为和新几何尚未准入。候选明确选择 **101/119** 条单位／卡记录，排除另外 18 条；39 条来源阻断涉及的四条单位记录全部排除，实际提交这些记录也被拒绝。

[原生与建军验收](evidence/stukov-army.public.json) 已通过：

- 6 份合法军表：三种 Virus 费用，以及三个新单位的来源点数；Builder 与正式工厂建军审核逐字段一致，新解析器冷导入后仍一致。
- 8 份建军反例：错种族、缺标签、其他 Zerg 势力借用、缺／多 Virus、超出 Elite 槽、重复 Unique 单位。另 4 份来源阻断记录的实际候选全部拒绝。
- 4 个独立 Native 条件棋位、各 1 条签名动作：进口 Goliath 的 Target Lock 实付 1 BM；进口 Siege Tank 的 Mode Transformation 实付 1 BM 并产生 SIEGE MODE；普通 Terran Goliath 保持 1 CP；普通 Zerg Hydralisk 正常获得 BURROWED。
- 两个进口单位均无合法潜地选项；共用 Apply 检查使用同一限制投影。跨回合及单位技能暂时禁用的边界读取也不解除建军时获得的禁止。
- 使用对方卡支付的 Native 预览被拒绝，状态不变；合法支付确实耗竭自己的卡，另一方卡资源不变。四房均验证幂等重交、冷打开和签名重放精确一致。
- CP 0 的报价转换为 BM 0，卡牌能力的 CP 报价不被单位转换规则影响。Coordinated Strike／Shaped Blast／Smart Shells 的完整攻击后继未在本批重跑。

棋位使用同源军表和工厂实例，再声明用于能力验收的位置；只执行原生 `legalSpace → preview → confirm → apply → replay`。它们未经过完整部署及对局开局，未作 Web 界面准出。为建立同版实例，已复用载荷完全未变的已审核圆形／矩形底座，保留全部 60 条单位几何分母；新增单位及依赖额外设置的轮廓明确标缺，未推断尺寸。源文件、原始单位种族与原始 CP 文本保持不变。

可重复执行：

```sh
node scripts/compile-wave4-stukov-army.mjs
node scripts/verify-wave4-stukov-army.mjs
node scripts/verify-wave4-stukov-boundaries.mjs
node scripts/verify-wave4-creep-builder.mjs
node scripts/verify-wave4-ability-diff.mjs
```

候选在 `build/wave4-web/stukov-army/candidate`，正式 ReleaseResolver 可读取建军与单位特征；对局用途因组件未齐而拒绝。三条 Creep 既有接线回归、相同输入下 Wave3 Builder 编译字节等价及 156 条来源差分门继续通过。初始差分快照保留其当时的实现数 0，最新执行账记录累计 2 个新增原子，二者分别标明用途。

下一批先实现 Hostile Incubation 的回合内能力禁用合同，再接 Infested Missile Turret；Stukov／Infested Marine／Infested Trooper 的完整行为和几何按依赖继续。其余 16 个新合同、完整发布选择、房间开局及 Web 新军表验收仍待。Wave3 玩家房与 5483 未操作；零模型调用，付费模型、K3、AI 对局、复盘和生产发布继续暂停。
