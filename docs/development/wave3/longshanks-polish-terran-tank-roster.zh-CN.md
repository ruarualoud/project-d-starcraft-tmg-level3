# 波兰 Longshanks 人族坦克军表查证

查证日期：2026-11-27。用途：Wave3 2.99.12、5483 专用玩家实测中房主自己的军表。本文记录公开比赛事实与当前同版目录对照；房主后续已导入并提交自己的军表，未替另一位玩家操作。

## 一手记录

[Sektor CK2.0. 比赛页](https://starcraft.longshanks.org/event/39209/)记载：比赛于 2026-11-22 在波兰 Kielce 举办，4 名参赛者，Standard，2000 矿／200 气，3 轮，允许同种族两份名单。规则截止为 2026-11-18 23:59，比赛说明允许 Wave3。

[比赛公开成绩面板](https://starcraft.longshanks.org/events/detail/panel_standings.php?event=39209&section=player)记载：DESTINY（公开选手号 #73059）使用 Terran，最终第 2 名，2 胜 1 负；VPS 6、APS 8。该玩家有公开文本名单，列表号 215079。

[Terran’s Destiny 原始公开名单](https://starcraft.longshanks.org/admin/lists/pop_info.php?id=215079&event=39209)记载：名单日期 2026-11-21，Raynor's Raiders，1990／2000 矿、200 气、12 人口。该名单含一台 Siege Tank 与两台 Goliath，可作为用户所需的人族坦克表实例。尚无证据证明它就是用户记忆中的特定那份名单，也不能从总成绩推断每场具体使用了哪份名单。

比赛页由 JavaScript 加载成绩与名单。上述两个公开 PHP 地址分别来自比赛页的 `load_standings` 和官网 `pop_list` 调用；本轮通过 HTTPS 只读获取，不需要登录。普通网页提取工具未展开这两个动态面板，因此本文给出实际官网面板链接。

## 名单及当前版本对照

单位规模、模型数、升级和含升级矿价取自公开名单；当前基价与规范名称对照本树 5483 只读 `roster-planning/v1/match-setup`，请求头为 `x-starcraft-match-setup: wave3-standard-v1`。未刷新官方来源。

| 队伍 | 规模／模型数 | 当前基价 | 已购升级 | 含升级矿价 |
|---|---|---:|---|---:|
| Goliath ×2，每队相同 | Small／1 | 每队 180 | Ares-Class Targeting System 20；Scatter Missiles 30 | 每队 230 |
| Marauder | Large／4 | 290 | Veteran of Tarsonis 40；Kinetic Foam 40；Laser Targeting Systems 40 | 410 |
| Marauder | Small／2 | 160 | Veteran of Tarsonis 20；Kinetic Foam 20；Laser Targeting Systems 20 | 220 |
| Marine | Small／6 | 170 | Combat Shield 20；Slugthrower 10；Grenades - Frag 10；Bayonet 20 | 230 |
| Medic | Small／3 | 120 | Stabilizer Medpacks 20；A-13 Flash Grenade Launcher 20 | 160 |
| Siege Tank | Small／1 | 220 | Mode Transformation 20；Shaped Blast 10；Coordinated Strike 20；Smart Shells 10 | 280 |
| Raynor's Raider (Marine) | Small／6 | 230 | 原名单未列已购升级；当前目录也没有收费升级 | 230 |

战术卡为 Barracks (Proxy) ×1（40 气）、Factory ×2（共 70 气）、Orbital Command ×1（25 气）、Factory (Tech Lab) ×1（40 气）、Vanadium Plating ×1（25 气），合计 200 气。阵营卡为 Raynor's Raiders。

原名单候选任务为 Frontlines、Hold Position；候选部署为 GAUNTLET、TYPHOON。本轮已创建的实测准备房固定使用 Fire in the Sky／One Bridge Too Close，因此以下导入文本只复现单位与指挥卡，不伪称复制原比赛的任务／部署选择。

当前目录与原名单的所有已列收费升级、基价相加均吻合，八队合计 1990 矿。原网页 Small Marauder 行漏印人口数字；当前同版目录为 1，与名单声明的总人口 12 一致。此人口项是当前目录补全，不冒充原网页的完整印刷字段。

目录绑定：官方数据快照 `4412c17faaebaff04b117d1ddc666d1cdd939eca420a22f861c7c944f1179c8c`；数据集 `718057e86ac4f93a72c06b8e4d8f4d851ba33ee04c9dddea33e966eda9fe6685`；unitsVersion 83、cardsVersion 84、rulesVersion 50。

## 当前应用格式的待导入文本

规范化原网页名称：Barracks Proxy → Barracks (Proxy)；Factory Tech Lab → Factory (Tech Lab)；Raynor's Raider Marine → Raynor's Raider (Marine)。金额字段使用本树 `armyToText` 的单位**基价**，升级单独列出，避免重复计费。

本轮回归已复现并修复 `textToArmy` 在首个左括号截断战术卡名的问题。修复后正式目录上的八队、括号卡名、重复 Factory 与升级都能无损往返；浏览器保存后显示 1990 矿、200 气、12 人口，房主准备页的 Native 预校验通过。详见 [真人写表修复](player-roster-fixes-2026-11-27.zh-CN.md)。

```text
=== Terran’s Destiny · Longshanks ===
Faction: Terran
Minerals: 2000

[FC] Raynor's Raiders
[TC] Barracks (Proxy) (40gas)
[TC] Factory x2 (70gas)
[TC] Orbital Command (25gas)
[TC] Factory (Tech Lab) (40gas)
[TC] Vanadium Plating (25gas)

--- Roster ---
1. Goliath [Elite/small] 180M +upg: Ares-Class Targeting System, Scatter Missiles
2. Goliath [Elite/small] 180M +upg: Ares-Class Targeting System, Scatter Missiles
3. Marauder [Core/large] 290M +upg: Veteran of Tarsonis, Kinetic Foam, Laser Targeting Systems
4. Marauder [Core/small] 160M +upg: Veteran of Tarsonis, Kinetic Foam, Laser Targeting Systems
5. Marine [Core/small] 170M +upg: Combat Shield, Slugthrower, Grenades - Frag, Bayonet
6. Medic [Support/small] 120M +upg: Stabilizer Medpacks, A-13 Flash Grenade Launcher
7. Siege Tank [Elite/small] 220M +upg: Mode Transformation, Shaped Blast, Coordinated Strike, Smart Shells
8. Raynor's Raider (Marine) [Core/small] 230M

Total: 1990/2000M 200/200G
=== END ===
```

复核范围：查证阶段已按当前目录逐项核对名称、规模、基价、收费升级、八队矿价和战术卡气价。随后主代理已从浏览器导入并提交房主自己的军表，准备页显示双方就绪。没有替另一位玩家操作，也没有出棋。
