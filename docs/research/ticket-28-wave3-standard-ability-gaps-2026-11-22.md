# Ticket 28 / W3-10、W3-11 · Standard 未接入能力

样例为同一候选 U83/C84/R50 的 Standard 2000 分，Terran Armed Forces 对 Kerrigan’s Swarm，任务 Fire in the Sky。正式工厂校验了军表，并在能力准入处返回 117 条定义，其中 36 条已登记、81 条尚缺正式运行适配。取数使用该次工厂的覆盖对象，只读取中间结果，准入拦截照常执行。整场产品动作链仍待验收。

清单包含选定单位的基础条目、已购买升级、势力和战术卡。部分条目已有组件实现，仍需接入这个版本的正式 Match。起始军表以外的召唤物和其他军表需要各自验收。

## 按单位或卡牌列出的 81 条

### 人族 · 20 条

| 单位或卡牌 | 数量 | 未接入条目 |
|---|---:|---|
| Barracks (Proxy) | 2 | Armed and Ready（主动 · 移动）、Go! Go! Go!（主动 · 移动） |
| Factory | 1 | Field Repair（主动 · 移动） |
| Supply Depot | 1 | Additional Supply Depots（主动 · 移动） |
| Terran Armed Forces | 1 | Terran Tenacity（主动 · 移动） |
| Goliath | 5 | Ares-Class Targeting System（被动 · 任意）、Devastating Charge（被动 · 突击）、Hellfire Missiles（武器 · 突击）、Indomitable（被动 · 突击）、Target Lock（主动 · 移动） |
| Jim Raynor | 4 | Commander（被动 · 任意）、Commando Rifle（武器 · 突击）、Freedom Fighters（被动 · 任意）、Orders（主动 · 移动） |
| Marine | 1 | Strike（武器 · 近战） |
| Medic | 5 | Life Support（反应 · 任意）、Medpack（主动 · 移动）、Optical Flare（主动 · 移动）、Restoration（反应 · 任意）、Stabilizer Medpacks（被动 · 任意） |

### 虫族 · 61 条

| 单位或卡牌 | 数量 | 未接入条目 |
|---|---:|---|
| Accelerating Creep | 3 | Creep Removal（被动 · 任意）、Living Glob of Tissue（被动 · 任意）、Speed on Creep（被动 · 任意） |
| Hatchery | 2 | Creep Spread（主动 · 移动）、Lie in Wait（主动 · 移动） |
| Hydralisk Den | 1 | Missile Attacks（主动 · 突击） |
| Kerrigan's Swarm | 3 | Omega Network（主动 · 移动）、Wild Mutation（主动 · 任意）、Zerg Creep（被动 · 任意） |
| Overlord | 2 | Excrete Creep（主动 · 突击）、Ventral Sacs（主动 · 移动） |
| Spawning Pool (Six Pool) | 2 | Feral Rage（主动 · 近战）、Timing Push（主动 · 移动） |
| Corpser (Roach) | 8 | Burrow Ambush（被动 · 移动）、Burrow（主动 · 任意）、Devastating Charge（被动 · 突击）、Glial Reconstitution（主动 · 移动）、Hydriodic Bile（被动 · 突击）、Regeneration（被动 · 突击）、Roachling Infestation（主动 · 移动）、Tunneling Claws（被动 · 任意） |
| Hydralisk | 5 | Ancillary Carapace（被动 · 任意）、Grooved Spines（被动 · 突击）、Lunge（反应 · 突击）、Lurking（被动 · 任意）、Squadron（被动 · 任意） |
| Kerrigan Swarm Raptor (Zergling) | 3 | Devastating Charge（被动 · 突击）、Raptor Strain（被动 · 任意）、Squadron（被动 · 任意） |
| Kerrigan | 4 | Crushing Grip（主动 · 移动）、Devastating Charge（被动 · 突击）、Leaping Strike（主动 · 突击）、Mutating Carapace（主动 · 移动） |
| Queen | 7 | Creep Speed（被动 · 任意）、Devastating Charge（被动 · 突击）、Domineering Presence（主动 · 移动）、Psionic Link（被动 · 任意）、Restoration（反应 · 任意）、Spawn Creep Tumor（主动 · 任意）、Transfusion（反应 · 任意） |
| Raptor (Zergling) | 5 | Adrenal Overload（主动 · 突击）、Devastating Charge（被动 · 突击）、Metabolic Boost（主动 · 突击）、Raptor Strain（被动 · 任意）、Squadron（被动 · 任意） |
| Roach | 3 | Burrow（主动 · 任意）、Devastating Charge（被动 · 突击）、Regeneration（被动 · 突击） |
| Swarmling (Zergling) | 5 | Burrow Ambush（被动 · 移动）、Devastating Charge（被动 · 突击）、Metabolic Boost（主动 · 突击）、Squadron（被动 · 任意）、Zergling Reconstitution（主动 · 移动） |
| Vile (Roach) | 8 | Burrow Ambush（被动 · 移动）、Burrow（主动 · 任意）、Debilitating Saliva（反应 · 任意）、Devastating Charge（被动 · 突击）、Glial Reconstitution（主动 · 移动）、Hydriodic Bile（被动 · 突击）、Regeneration（被动 · 突击）、Tunneling Claws（被动 · 任意） |

覆盖证据哈希 `d15cb7f23c875d6415b206287e1d41c9e869177e208129538953bc06b00fba11`。逐条定义 ID、来源、所属席位和注册状态见 [结构化清单](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/standard-pending-abilities.public.json)。
