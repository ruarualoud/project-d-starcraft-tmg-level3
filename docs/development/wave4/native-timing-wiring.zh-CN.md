# W4-02 原生时点与 Web 接线验收

2026-11-27；`codex/wave4-web-pvp`。11 条旧卡时点修订已取得原生与 Web 局部证据；整版新数据未完成。本批为既有能力的时点说明修订，效果值沿用原合同。

**整版新数据尚未接完。** 本页仅验收 11 条旧卡时点修订：使用未变化的旧单位，绑定 Wave4 的新卡文案与 @2 身份。U98/C88/R50 原件、候选清单与逐 ID 差分已经保存；新单位、新势力、完整 Builder／大厅发布选择及 18 个新增游戏原子仍待接线。局部验证不构成整版 Wave4 准出。

## 7 条护甲反应

每条均由真实 `fight` 生产命中池，按实际护甲骰需求打开反应窗口，经两席选择、实际护甲骰、TOUGH 选择、伤害结算与后继菜单。通过原生 Room 的 LegalSpace → Preview → Confirm（如需）→ Apply，重复 Apply 幂等，关闭数据库后按签名日志精确恢复各检查点。

| 新身份（均为 @2） | 主链回执 | 同骰使用／通过对照 |
|---|---:|---|
| Vehicle Plating | 6 | TOUGH +1；伤害 3／4 |
| Infantry Armor | 6 | TOUGH +1；伤害 3／4 |
| Carapace | 6 | TOUGH +1；伤害 3／4 |
| Ground Armor | 6 | TOUGH +1；伤害 3／4 |
| Guardian Shell | 5 | DODGE 2；伤害 0／1 |
| Plasma Shields | 6 | Shielded 受体 TOUGH +1、DODGE 1；伤害 0／1 |
| Crystalline Alloy | 5 | DODGE 2；伤害 0／1 |

共 **40 条主链回执**。另保留 7 个零护甲骰的真实原生分支，各 3 条回执：命中绕过护甲时不开放此窗口、不耗卡。这 21 条负例回执不计入 40 条成功主链。

DODGE 沿用既有的骰子转移核，减少绕过护甲的转移量；没有把它实现为护甲阈值修正。定骰对照让转移回护甲池的骰子实际产生豁免，逐项检查 TOUGH 值、DODGE 值、转移量和最终伤害。完整数值、ID、时点、后继与冷恢复哈希见 [原生护甲证据](evidence/native-armour-timing.public.json)。

## 其余 4 条时点

| 修订 | 使用与通过的实际结果 | 回执 |
|---|---|---:|
| Observer / Gravitic Boosters | 原始 D6 已产生后选择；使用时上限增加 1000 milli-inch，通过时不变；两分支均完成原生成功冲锋 | 3 + 3 |
| Overseer / Pneumatized Carapace | 原始 D6 后选择；使用时另掷 D6 并取高，本例 1、3 → 3；通过不另掷；均完成冲锋 | 3 + 3 |
| Veil of Shadows | 原生 Blink 完成 PLACE 后才开放；使用将伤害标记 4 → 2，通过保留 4；回到移动后继菜单 | 3 + 3 |
| Brood Instinct | 原生近距离射击的互相交战关系给出闪避资格；实际非空 Evade 池前选择；使用阈值 5，通过阈值 6 | 5 + 5 |

共 **8 个案例、28 条回执**，全部冷回放一致。冲锋顺序按已签名事件中的「声明并掷骰 → after_charge_roll 窗口 → 冲锋完成」核对。Observer 的原生后继原先只接受 @1，现精确接受已审核的 @2；旧 @1 保留。[其余时点证据](evidence/native-other-timing.public.json)。

## Web 门

旧卡时点 Web 局部 **11/11**，共 **31 条签名回执**。两独立浏览器席位验证能力名称、只读 Preview、显式真人确认、耗卡、自动刷新、恢复重进与回放；7 条护甲及 Brood Instinct 继续到实际伤害，Observer／Overseer 到更新后的原生冲锋结算菜单，Veil 经对方让过后关闭 PLACE 后窗口。参见 [Web 局部证据](evidence/timing-web.public.json) 及 [确认策略证据](evidence/human-confirmation-policy.public.json)。

使用本分支导出的现有 Expo 产品战桌、现有 Client Domain 与 Room HTTP adapter，服务仅在 `127.0.0.1:5484`，验收完成后已关闭。每间 Web 棋位的初始状态来自上述原生房间的已签名前缀重放，原房只读，来源房 ID、前缀回执数及状态／绑定哈希另行记录。

已修复的消费端问题：动作列表保留权威域的能力名称，避免多个卡牌只显示同一个通用动作类型。新增的 `createOfficialHumanConfirmedRuntimeV1` 将语义选择域映射为公开 Room 合同支持的 `explicit_human`，使用独立运行时哈希，逐次重建原始域后才交给原执行器；不改变规则效果，也不放宽客户端密封校验。旧房继续使用原运行时。TOUGH 选择显示为可读的护甲骰序号。逐 ID 的实际原生／Web 消费者导出与验收范围见 [接线映射](../../../coordination/wave4/ability-wiring-progress.json)。

[Brood Instinct 的旧单位定点菜单与密封 Preview](evidence/timing-web-brood-preview.png)。截图仅展示此局部消费者。

## 范围与隔离

这是条件棋位的完整原生行为及 Web 消费端验收。单位、装备、模型底盘和卡牌事实取自实际工厂；未改单位的载荷已在 Wave3／Wave4 间逐项核对。棋位显式声明位置和一块远离交战区域的工厂地形；混合势力卡的定点测试不作为合法军表证据。

护甲全链当前覆盖近战生产者；不把它扩记为射击、HITS、IMPACT 或完整 Wave4 混编军表的全部门均已完成。Web 从已签名前缀接续；完整 Wave4 大厅、Builder、新单位、媒体及 500／2000 分双席新军表建房仍属后续门。

39 条来源阻断维持原清单，未进入所选运行时。18 个新增游戏原子合同仍待实现，本轮新增游戏原子 **0**；真人确认适配是交互协议接线。旧版 500／2000 分的 W4-01 隔离兼容房已重新冷读，原状态、绑定、回放及元数据字节相同，新增动作 0，见 [旧版兼容复核](evidence/ability-wave3-cold-read.public.json)。5483 的 Wave3 玩家服务未操作。

付费模型、K3、AI 对局、复盘业务、生产发布持续暂停；模型调用 0，所有证据 `trainingTruth: false`，没有生产晋级。

## 复验

工程输入沿用本分支 W4-01 和首批组件工厂产物。首次需要先执行 `node scripts/verify-wave4-armour-reaction-components.mjs` 产生 500／2000 分工厂种子。

```sh
node scripts/verify-wave4-native-armour-timing.mjs
node scripts/verify-wave4-native-other-timing.mjs
node scripts/verify-wave4-ability-diff.mjs
node scripts/verify-wave4-wave3-cold-read.mjs build/wave4-web/host/run-qI3May
```

原生脚本打印各自的 `run-…` 目录。传入该目录可续读已签名案例；原 authority 与 runtime 文件不可覆盖成不同输入。构建 Web 使用已安装依赖，从 `apps/starcraft-tmg-expo` 执行：

```sh
CI=1 EXPO_OFFLINE=1 EXPO_NO_TELEMETRY=1 PROJECT_D_LOCAL_WEB_EXPORT=1 EXPO_PUBLIC_STARCRAFT_TMG_LOCAL_WEB_EXPORT=1 node node_modules/expo/bin/cli export --platform web --output-dir dist-product
```

回到 Level-3 根目录，将下列路径替换为本次实际输出目录；仅使用未占用的 5484，保留 5483：

```sh
node scripts/serve-wave4-timing-web.mjs --armour-run=build/wave4-web/native-armour-timing/run-FkYCgn --other-run=build/wave4-web/native-other-timing/run-YnQ8yC --data-directory=build/wave4-web/timing-web/run-3
node scripts/verify-wave4-timing-web.mjs build/wave4-web/timing-web/run-3
node scripts/verify-wave4-human-confirmation-policy.mjs build/wave4-web/timing-web/run-3
```

服务不会注册生产 setup，也不提供模型服务。公开证据不含席位令牌、恢复链接或私有日志。任何来源哈希、确认策略、回执或恢复门失败，撤下本轮局部绑定，保留旧版发布和玩家房。
