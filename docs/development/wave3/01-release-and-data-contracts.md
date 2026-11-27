# 01 — 发布、数据与身份合同

适用子项01～06、13；新名称均为设计职责，标为“拟新增”的文件／函数尚不存在，需02落实后更新代码索引。现有路径从工作树根解析。

## A. 来源到产品的数据流

官方原件 → SourceRevision（候选） → 规范化目录／语义差分 → 规则与能力编译 → ReleaseManifest → ReleaseResolver → Room/Builder/Query/SkillConsumers。

现有落点：

| 职责 | 实际文件／函数 | 需要调整的边界 |
|---|---|---|
| 候选导入 | packages/source-data/official-source-import-workflow-v4.mjs / createStarcraftTmgExplicitSourceImportWorkflowV4 | 保留stage/promote/rollback；补完整W3来源类型，候选不自动激活 |
| 规范化 | packages/source-data/official-command-center-adapter-v1.mjs / createOfficialCommandCenterDataset | 按记录ID＋字段语义处理；社区与官方分区 |
| 房间数据绑定 | packages/source-data/official-latest-data-binding-v1.mjs / createOfficialRoomDataBinding、resolveHistoricalRoomDataBinding | 升级为绑定完整发布上下文，不能只比较U/C/R最大值 |
| 历史固定集 | packages/source-data/official-development-tranche-source-lock-v1.mjs | 原旧契约继续可读，新增release adapter承担新数据 |
| 能力IR | packages/source-data/official-ability-effect-ir-v1.mjs / createOfficialAbilityEffectIrCatalogueV1 | 身份与来源hash解耦，保留追溯 |
| 正式写表 | packages/product-composition/roster-planning-product-module-v1.mjs / createRosterPlanningProductModuleV1 | 替换默认旧夹具绑定为显式发布依赖；旧入口保持legacy发布 |
| 房间构造 | packages/product-composition/official-standard-room-factory-v1.mjs、official-skirmish-500-room-factory-v1.mjs | 选定发布与规模必须实际传到state、runtime、geometry |
| 引擎 | packages/authoritative-engine/transition-v1.mjs / createStarcraftTmgAuthoritativeEngine | 复用options.rulesRuntime，生产新房不可落到legacy development fallback |

ReleaseResolver已实现于 packages/source-data/official-release-context-v2.mjs，持久化使用 sqlite-official-release-store-v1.mjs。当前接线证据见[02验收卡](evidence/T28-W3-02.md)。完整Wave3组件由后续子项提供。

## B. 当前发布描述与解析结果

~~~ts
interface ReleaseManifest {
  schema: 'starcraft_tmg_release_manifest_v2';
  releaseId: string;
  status: 'candidate' | 'available' | 'retired';
  source: {
    snapshotRef: string; datasetRef: string; sourceRevisionRef: string;
    snapshotHash: string; datasetHash: string; sourceRevisionHash?: string;
    versions: { unitsVersion: string; cardsVersion: string; rulesVersion: string };
    policy: object;
    references?: Record<string, { version: string; ref: string; byteHash: string; role: 'reference' }>;
  };
  components: Record<string, {
    ref: string; version: string; integrity?: { field: string; value: string };
  } | null>;
  manifestHash: string;
}
interface ResolvedRelease {
  manifest: ReleaseManifest;
  dataset: object;
  snapshot: object;
  resources: Record<string, unknown>;
}
~~~

引用由Host加载并校验，模型不填hash或stateRef。不要把整个对象反复塞进prompt，只给“本房规则版本”和语义事实；内部保存精确绑定。实际来源与组件引用由生产工厂填写，准出证据记录具体输入和后继。

**写入所有者**：来源采集器写原件；规范化器写目录；规则编译器写能力注册；发布器写manifest与选择指针；房间工厂复制不可变引用到房间；运行时只改本房状态。任一调用链不得自己下载更新或解析“最新版”改掉房间依赖。

兼容策略：

- 旧房间缺releaseId时，用其已有精确绑定查legacy release；映射唯一且材料齐全才读取。禁止默认映射到新规则。
- 原规则执行历史不改写。已存在旧数据集和代码语义保持；修工程Bug的实验另建标注来源的分支，不假称原历史在新规则执行。
- 新候选构造可在开发模式限定范围，正式W3房间只接受具备所选军表／任务／地图能力的available发布。
- 缺依赖应返回具体能力及来源，不用零数据、旧默认底座、另一武器或另一势力顶上。
- 回滚切回新房默认选择，已有新房仍绑定自己的发布；不能把新单位状态强塞进旧引擎。

## C. 差分与稳定身份

差分类别：display_only、cost_or_eligibility、existing_effect_parameters、new_composition、new_semantics、removed_or_conflicting。分类输出附源字段、旧／新值、下游影响；不由LLM猜正式价格／Supply。

能力ID采用显式目录键（例如 unit:raven/deploy-auto-turret）＋语义版本；产品名称只是显示。相同名字在不同阶段保留独立键，例如Queen的两个Talons条目按各自原文阶段/用途区分。源数组index仅可定位本次原件，不是跨版本身份。第一次建立映射由源码与原文对账，后续别名表可复用；歧义映射留待核实，不能按小写名称强行合并。

hash三类用途：

1. 原件校验与去重：记录字节hash／规范化hash，证明读了什么。
2. 内容语义版本：影响哪一事实／能力／章节；费用变化不改无关战斗算法身份。
3. 状态一致性与幂等：preview绑定房间revision，Apply和异步结果只作用一次。

旧签名历史保留；不为新源删除真实性保护，也不因全文件hash改变让所有算法／Skill重新生成。兼容证明由工程登记“哪段事实和行为没变”，不伪造旧签名。

## D. 统一事实合同

| 事实 | 必须明确的语义 | 主消费者 |
|---|---|---|
| 编军预算 | 目标／上限／已花／可用、矿与气分开、提供槽位与占用槽位分开 | 人工Builder、AI Builder、Teach、创建房间 |
| 单位状态 | 资料模型数、当前存活模型数、当前伤害、状态、升级与模式、在场／预备队 | UI、概率、Supply、动作 |
| Supply | 上下文分别为人口占用、任务控制、目标完成、脱离；来源修正与范围条件 | 同名工具、计分、Plan、复盘 |
| 几何 | mm→milli-inch统一转换；圆直径／半径显式，矩形真实尺寸与朝向；底盘边缘距离 | 地图、队形、射程、碰撞 |
| 支付 | 购卡气费与使用资源分开；卡ready/exhausted、产生／需要／溢出规则 | 能力菜单、价格比较、Apply |
| 能力 | 时机、行动/激活区别、触发、次数、选择、被动消费、到期、来源死亡行为 | 动作、反应、阶段循环 |
| 任务 | 控制资格／控制状态／条件预计分／实际授予分分别命名 | query、Plan、cleanup、战报 |

2026-11-12用户确认单位、卡牌、价格、槽位和资格以官方写表器实际使用的冻结API为主。PDF提供规则原文、FAQ与尺寸参考。编军字段的冲突保留双方来源和写表器值，按字段记录参考差异。FAQ行为语义和物理几何的疑点由04/06逐项核实，结论绑定本次发布。

## E. 查询事实、决策和控制的传递

事实：Rules/冻结资料/数学返回；决策：玩家或模型选目标、支付方案、路线意图和公开理由；控制：Host任务ID、状态引用、重试、下一角色。三通道使用已有工程规范，不混成一段文本再让模型重建。

只允许确定且不改语义的工程归一化。若模型缺少目标或两值冲突，要求补那一个选择；不能替模型选单位或重新生成整个Plan。事实错误纠正具体事实；“选择不够强”由策略评价处理。

写表与Plan过程沿现有 product-module → product-journey → workspace-run → workflow/store：初稿、局部Teach、查询、修改、保存、恢复都携带同一release与当前军表版本。查询结果附适用候选，改表后仅相关测量变为待重验，历史实验仍可读。

## F. 新版缓存与异步并行

按release/房间revision/场景修订/查询语义/相关规则版本/几何版本形成缓存键，集中在一处。不包含API key，不让模型提供。数据升级不能命中旧价、旧Supply、旧几何结果；纯显示变化可通过精确兼容映射复用事实缓存。

worker读取不可变快照，回传与请求同一身份；消费前核当前revision。过期结果不能变成当前合法动作，可保留为历史条件性结果。共享Worker预算继续沿既有CPU调度，不为每个新token开独立线程。

一次动作的评估与Apply：确定性准备计划复用同一规则实现；随机结果由正式骰子机制产生。概率查询可以精确枚举或有界采样，但必须标方法、误差／样本和策略假设；不能为省时悄悄剪掉一种有效能力。

## G. 产品与长期资产迁移

旧军表在新发布下产生副本，重新审计购买资格和总价；计划作者决定替换。既有预制表、AI保存表、房间导入三入口都处理。Skill／条件经验按依赖失效章节，详05；战报与MuZero导出带release和工程有效范围，旧观察不重标签为新规则事实。

本次不迁移原暂停房间／学习数据库。新增字段通过新候选库和可回滚发布指针验证；若必须对生产数据库做DDL，先给出具体迁移/回滚/磁盘预算并遵守用户迁移授权。
