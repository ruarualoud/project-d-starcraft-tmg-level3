# Hatchery 菌毯与收拢队形、跃击

Ticket28 / W3-09 M08、W3-11、W3-15。隔离 Standard 房间使用冻结 U83/C84/R50、FAQ 1.3 和正式 Match 候选 2.62.0。普通部署、移动、Run、脱离接战与冲锋此前已有签名。以下两例只验其余两种移动方式与同一来源菌毯的交互。

| 场景 | 使用的棋位 | 验收条件 |
|---|---|---|
| Nova 收拢队形后攻击 Queen | 从双方已接战、底盘尚未接触的第 2 回合棋位开始，使用本来的单位位置、Hatchery 标记与军表，通过双方真实 Pass 交替进入战斗。 | 同一动作域的查询和预览同意落点。先推开标记，保留待结算的原攻击；重开房间后接同一次近战，不重复推标记。 |
| Kerrigan 跃击到己方菌毯 | 从 Queen 已实际进场、Kerrigan 位于 (12, 4) 的第 2 回合 r2 开始。双方从公开菜单进入突击，虫族先行动。 | 使用冻结的 Leaping Strike 和房间允许的 1 Biomass 支付，从规则查询取到标记落点。核对技能落位、标记位置、扣费、结束激活后的对方席位和冷回放。 |

两个房间分别继承已有棋位，只替换候选版本对应的位移查询策略。原始棋位的哈希及标记身份随各自结果保留。两例均为双人工工程场景。

[战斗房间验收入口](../../scripts/verify-wave3-creep-close-ranks-room-v262.mjs) · [跃击房间验收入口](../../scripts/verify-wave3-creep-leaping-strike-room-v262.mjs) · [同一查询版本的冲锋与旧版证明](ticket-28-wave3-creep-charge-and-combat-preview-2026-11-25.md)

跃击在原修订 r4 已签名。首次后继断言把卡面提供的 1 BM 当作可递减余额，错误期待 1 → 0。支付原子要求翻为耗竭。原回执只有一笔 BM 1，耗竭的就是玩家选择的势力卡；已按卡的 ready → exhausted、支付事件和保持不变的面值核对。续验直接打开已签 r4。

## 已签名的中间边界

收拢时，Nova 从 (17.900, 4.055) 英寸沿路径到 (18.363, 2.425)，Hatchery 菌毯移到 (19.702, 2.425)。r7 的签名事件只有队形收拢和标记位移，原攻击仍归 Nova。已对这个尚待攻击的状态完成七签冷回放。r8 消费该父动作，权威骰池产生 melee_hit_pool_rolled。

[落点查询](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-close-ranks-v262/choice.json) · [收拢后冷恢复](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-close-ranks-v262/movement.json) · [原攻击签名](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-close-ranks-v262/r7-fight.json)

原攻击 r8 的完整冷回放已经通过，下一合法动作是 roll_melee_attack_armour_pool。追加结算从同一个 r8 保存原生签名检查点，再交给规则器处理护甲、伤亡和激活后继。

[原攻击的正式后继与八签回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-close-ranks-v262/result.json)

## 收拢的完整后继与首次 Pass 缺陷

Nova 的 Combat Knife 命中三次，Queen 的三次护甲均成功，伤害为 0，人口仍为 1。原攻击只结算一次，Hatchery 标记只移动一次。r11 行动权交给虫族；从 r8 的签名检查点重开并回放护甲、闪避与结束激活，状态完全一致。[正式结算记录](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-close-ranks-v262/fight-settled.json)

Kerrigan 原 2.62 房 r4 的跃击与支付已签名。r5 结束激活时，两个人族单位均在预备队，人族还没有在突击阶段 Pass，Queen 仍可行动。旧版直接把行动权留给虫族。冻结主规则 §8.2.1 要求没有合格单位的玩家 Pass；突击阶段第一个 Pass 决定下一阶段先手标记。缺陷源于部分结束激活路径按“是否有单位可动”选下一席，绕开了已有的强制 Pass 结算器。2.63 候选的通用交替、近战和射击收尾改为按本阶段是否已经 Pass 交权，正在从原 r4 核对真实后继。[原 r5 回执索引](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-leaping-strike-v262/r4-finish_activation.json)

## 新版与旧版的同一步对照

用 2.62 的签名记录还原跃击已支付的 r4。2.63 正式开局工厂使用相同军表、任务和部署，隔离修订房只引入本版本的阶段交权规则。结束激活后改由人族行动；人族两队都在预备队，实际提交的是 mandatory Pass。虫族随后依然能激活 Queen，本次为验证阶段交替，由虫族选择 optional Pass。进入战斗后，人族可从公开菜单决定哪方先动。此例人族原先就持有先手标记，本次证明其突击阶段首次 Pass 得到登记，并保有下一阶段选择权。三条新回执在重新打开的独立引擎和存储连接精确回放，原卡与菌毯位置未改变。

另从已还原的 r4 只重放旧版结束激活，完整旧 r5 仍与原件相同。第一次对照误向回放接口传入普通 Envelope，签名校验正确拒绝；改用原引擎创建的签名检查点后通过。此对照不发布候选，也不修改原房。

[原棋位和支付](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-leaping-strike-pass-v263/source.json) · [强制 Pass、阶段先手与冷回放](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-leaping-strike-pass-v263/result.json) · [2.62 的单步兼容](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-leaping-strike-pass-v263/legacy-finish.json) · [三阶段交替分支检查](../../build/ticket-28-wave3-mission-source-20261121-v1/release-room-integration/creep-leaping-strike-pass-v263/handoff-cases.json)
