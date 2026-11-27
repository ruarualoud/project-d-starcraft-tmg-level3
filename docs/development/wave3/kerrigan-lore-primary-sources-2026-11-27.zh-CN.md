# 凯瑞甘一手剧情资料样本（2026-11-27）

本轮只补凯瑞甘。以下是暴雪一手资料可支撑的主线事件与关系，不等于全部小说、漫画、任务对白已完整入库。共26条：18条事件、8条关系；覆盖8个时代。所有来源均已实际打开核对，未使用玩家Wiki或论坛帖子作为剧情证据。正文均为中文摘要，不复制长篇台词。

最重要的运行边界：默认rank60排除《虚空之遗》和升华结局；作者解释不是角色的第一人称记忆；“曾受主宰控制”不得变成“现在仍自愿服从主宰”。

## 核对来源

- [Kerrigan Hero Week](https://news.blizzard.com/en-us/article/15396162/kerrigan-hero-week)：StarCraft背景条目：Antiga Prime相遇、Tarsonis、Char虫茧、净化后经历、Raynor救援；Abathur权力关系。排除Heroes技能和皮肤设定。
- [StarCraft Story Primer](https://news.blizzard.com/en-us/article/23331587/starcraft-story-primer)：Part 2—Overmind/The Fall；Part 3—The Stand/The Queen of Blades；Part 5—Heart of the Swarm；Part 6—Legacy of the Void。
- [StarCraft II Creative Development Q&A - Part 1](https://news.blizzard.com/en-gb/article/10071087/starcraft-ii-creative-development-q-a-part-1)：Brian Kindregan回答：Kerrigan从未报复Mengsk，到HotS开始为何执意复仇；含身份连续性与罪责的作者解释。
- [StarCraft II Creative Development Q&A - Part 2](https://news.blizzard.com/en-us/article/7597722/starcraft-ii-creative-development-q-a-part-2)：Jim旧家庭与Sarah是否“唯一真爱”；Jim为何选择拯救Kerrigan。
- [StarCraft II Creative Development Q&A - Part 4](https://news.blizzard.com/en-us/article/7713050/starcraft-ii-creative-development-q-a-part-4)：Raynor从Brood War仇恨到WoL救援的变化；Char战役前Kerrigan分兵搜寻神器。
- [StarCraft II Creative Development Q&A - Part 11](https://news.blizzard.com/en-gb/article/10056932/starcraft-ii-creative-development-q-a-part-11)：WoL期间虫群占领世界寻找神器；Queen of Blades的自主性与残存影响。
- [Zagara Hero Week](https://news.blizzard.com/en-us/article/14525399/zagara-hero-week)：StarCraft背景：Char抵抗后归顺、Kerrigan令Abathur改进Zagara思维、Korhal临战嘱托及继位野心。排除Heroes技能和皮肤设定。
- [Heart of the Swarm Opening Cinematic Revealed](https://news.blizzard.com/en-us/article/8475170/heart-of-the-swarm-opening-cinematic-revealed)：正文开头两段：Char神器恢复人类形态、虫群分裂、Kerrigan仍保留幽灵能力。
- [StarCraft II Creative Development Q&A - Part 3](https://news.blizzard.com/en-gb/article/10032985/starcraft-ii-creative-development-q-a-part-3)：仅用于边界核对：主宰受Dark Voice约束、创造Queen意在解放虫群；不可据此假定早期Kerrigan知道幕后动机。
- [StarCraft II Creative Development Q&A - Part 12](https://news.blizzard.com/en-us/article/8441646/starcraft-ii-creative-development-q-a-part-12)：仅用于边界核对：Mengsk遗弃Kerrigan的多重私人动机；不可据此赋予早期Kerrigan对Mengsk私密证据的全知。

## 时间与证据边界

本样本的rank是时代知识上界，不能代替任务进度。特别是《虫群之心》的查尔与泽鲁斯任务顺序可变；rank60在此覆盖该战役后期结果。如果界面上的“原生女王”仅表示刚离开泽鲁斯，克哈结局等条目必须另受任务检查点约束。关系记录的有效期只限制“当时关系”，不删除已发生的历史。

《Hero Week》属于《风暴英雄》文章，但本次仅使用其明确回顾《星际争霸》的背景段落；皮肤、技能、跨世界玩笑均未当作星际正史。Creative Development Q&A署名编剧的解释已标为creator_commentary，涉及他人情绪时应说“官方编剧解释”，不可装作角色读心。

未证实细节已放入JSON的unknowns；尤其不把被抹除的刺杀记忆、蒙斯克的私人证据、主宰的幕后动机直接塞入早期角色记忆，也不把雷诺写成毫无冲突的终身伴侣。阿巴瑟仅补职责和可证实的指挥关系。

## 可机器读取的数据

下方是本文件唯一JSON代码块。其来源ID、条目ID和时代数值可直接用于生成数据模块。

```json
{
  "schemaVersion": 1,
  "scope": "Kerrigan source-limited main-story lore sample; primary Blizzard sources; not a full franchise biography.",
  "reviewedAt": "2026-11-27",
  "defaultRank": 60,
  "timelineGranularity": "era_upper_bound_not_mission_checkpoint",
  "eraRanks": [
    {
      "rank": 10,
      "id": "ghost_pre_tarsonis",
      "labelZh": "幽灵时期，塔桑尼斯前"
    },
    {
      "rank": 20,
      "id": "infested_under_overmind",
      "labelZh": "受主宰改造与控制时期"
    },
    {
      "rank": 30,
      "id": "broodwar_independent_queen",
      "labelZh": "母巢之战独立女王"
    },
    {
      "rank": 40,
      "id": "wol_pre_cleansing",
      "labelZh": "自由之翼神器战，净化前"
    },
    {
      "rank": 50,
      "id": "deinfested_pre_zerus",
      "labelZh": "净化后、泽鲁斯前"
    },
    {
      "rank": 60,
      "id": "primal_pre_lotv",
      "labelZh": "原生女王；本样本按虫群之心知识上界"
    },
    {
      "rank": 70,
      "id": "lotv_pre_ascension",
      "labelZh": "虚空之遗联盟，升华前"
    },
    {
      "rank": 80,
      "id": "xelnaga_epilogue",
      "labelZh": "萨尔那加终章"
    }
  ],
  "sources": [
    {
      "id": "kerrigan_hero_week",
      "title": "Kerrigan Hero Week",
      "url": "https://news.blizzard.com/en-us/article/15396162/kerrigan-hero-week",
      "publisher": "Blizzard Entertainment",
      "locatorNote": "StarCraft背景条目：Antiga Prime相遇、Tarsonis、Char虫茧、净化后经历、Raynor救援；Abathur权力关系。排除Heroes技能和皮肤设定。"
    },
    {
      "id": "starcraft_story_primer",
      "title": "StarCraft Story Primer",
      "url": "https://news.blizzard.com/en-us/article/23331587/starcraft-story-primer",
      "publisher": "Blizzard Entertainment",
      "locatorNote": "Part 2—Overmind/The Fall；Part 3—The Stand/The Queen of Blades；Part 5—Heart of the Swarm；Part 6—Legacy of the Void。"
    },
    {
      "id": "creative_qa_1",
      "title": "StarCraft II Creative Development Q&A - Part 1",
      "url": "https://news.blizzard.com/en-gb/article/10071087/starcraft-ii-creative-development-q-a-part-1",
      "publisher": "Blizzard Entertainment",
      "locatorNote": "Brian Kindregan回答：Kerrigan从未报复Mengsk，到HotS开始为何执意复仇；含身份连续性与罪责的作者解释。"
    },
    {
      "id": "creative_qa_2",
      "title": "StarCraft II Creative Development Q&A - Part 2",
      "url": "https://news.blizzard.com/en-us/article/7597722/starcraft-ii-creative-development-q-a-part-2",
      "publisher": "Blizzard Entertainment",
      "locatorNote": "Jim旧家庭与Sarah是否“唯一真爱”；Jim为何选择拯救Kerrigan。"
    },
    {
      "id": "creative_qa_4",
      "title": "StarCraft II Creative Development Q&A - Part 4",
      "url": "https://news.blizzard.com/en-us/article/7713050/starcraft-ii-creative-development-q-a-part-4",
      "publisher": "Blizzard Entertainment",
      "locatorNote": "Raynor从Brood War仇恨到WoL救援的变化；Char战役前Kerrigan分兵搜寻神器。"
    },
    {
      "id": "creative_qa_11",
      "title": "StarCraft II Creative Development Q&A - Part 11",
      "url": "https://news.blizzard.com/en-gb/article/10056932/starcraft-ii-creative-development-q-a-part-11",
      "publisher": "Blizzard Entertainment",
      "locatorNote": "WoL期间虫群占领世界寻找神器；Queen of Blades的自主性与残存影响。"
    },
    {
      "id": "zagara_hero_week",
      "title": "Zagara Hero Week",
      "url": "https://news.blizzard.com/en-us/article/14525399/zagara-hero-week",
      "publisher": "Blizzard Entertainment",
      "locatorNote": "StarCraft背景：Char抵抗后归顺、Kerrigan令Abathur改进Zagara思维、Korhal临战嘱托及继位野心。排除Heroes技能和皮肤设定。"
    },
    {
      "id": "hots_opening_cinematic",
      "title": "Heart of the Swarm Opening Cinematic Revealed",
      "url": "https://news.blizzard.com/en-us/article/8475170/heart-of-the-swarm-opening-cinematic-revealed",
      "publisher": "Blizzard Entertainment",
      "locatorNote": "正文开头两段：Char神器恢复人类形态、虫群分裂、Kerrigan仍保留幽灵能力。"
    },
    {
      "id": "creative_qa_3",
      "title": "StarCraft II Creative Development Q&A - Part 3",
      "url": "https://news.blizzard.com/en-gb/article/10032985/starcraft-ii-creative-development-q-a-part-3",
      "publisher": "Blizzard Entertainment",
      "locatorNote": "仅用于边界核对：主宰受Dark Voice约束、创造Queen意在解放虫群；不可据此假定早期Kerrigan知道幕后动机。"
    },
    {
      "id": "creative_qa_12",
      "title": "StarCraft II Creative Development Q&A - Part 12",
      "url": "https://news.blizzard.com/en-us/article/8441646/starcraft-ii-creative-development-q-a-part-12",
      "publisher": "Blizzard Entertainment",
      "locatorNote": "仅用于边界核对：Mengsk遗弃Kerrigan的多重私人动机；不可据此赋予早期Kerrigan对Mengsk私密证据的全知。"
    }
  ],
  "records": [
    {
      "id": "kerrigan_event_ghost_conditioning",
      "kind": "event",
      "titleZh": "被塑造成幽灵特工",
      "summaryZh": "凯瑞甘在联邦设施中接受研究、神经抑制和幽灵训练。她曾是联邦的幽灵特工，后来加入反抗联邦的队伍。",
      "keywords": [
        "凯瑞甘",
        "Sarah Kerrigan",
        "Ghost",
        "幽灵",
        "联邦",
        "Confederacy"
      ],
      "knownFromRank": 10,
      "spoilerRank": 10,
      "sourceIds": [
        "kerrigan_hero_week"
      ],
      "sourceLocator": "StarCraft背景条目：研究设施、neural inhibitors、Ghost训练及加入反叛队伍。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_antiga_meeting",
      "kind": "event",
      "titleZh": "安提加主星初遇雷诺",
      "summaryZh": "凯瑞甘在安提加主星的一次任务中认识吉姆·雷诺。主源没有提供初遇当天确立恋情或具体表白的经过。",
      "keywords": [
        "雷诺",
        "吉姆",
        "Jim Raynor",
        "安提加主星",
        "Antiga Prime",
        "初遇"
      ],
      "knownFromRank": 10,
      "spoilerRank": 10,
      "sourceIds": [
        "kerrigan_hero_week"
      ],
      "sourceLocator": "StarCraft背景条目：met James Raynor during a mission on Antiga Prime；随后一句说明后来相爱。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_tarsonis_abandonment",
      "kind": "event",
      "titleZh": "塔桑尼斯被遗弃",
      "summaryZh": "蒙斯克利用灵能发射器把虫群引向塔桑尼斯。凯瑞甘请求撤离时，他撤走部队，把她留在虫群中；这是她遭到背叛的关键事件。",
      "keywords": [
        "蒙斯克",
        "Arcturus Mengsk",
        "塔桑尼斯",
        "Tarsonis",
        "背叛",
        "遗弃",
        "灵能发射器"
      ],
      "knownFromRank": 20,
      "spoilerRank": 20,
      "sourceIds": [
        "kerrigan_hero_week"
      ],
      "sourceLocator": "StarCraft背景条目：Tarsonis、psionic emitters、evacuation请求和Mengsk撤军。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_char_infestation",
      "kind": "event",
      "titleZh": "被感染成为刀锋女王",
      "summaryZh": "凯瑞甘被虫群俘获，主宰把她置于虫茧中改变其形态，虫茧被转移至查尔。她以刀锋女王的形态重生，并成为主宰麾下的重要力量。",
      "keywords": [
        "主宰",
        "Overmind",
        "查尔",
        "Char",
        "虫茧",
        "感染",
        "Queen of Blades",
        "刀锋女王"
      ],
      "knownFromRank": 20,
      "spoilerRank": 20,
      "sourceIds": [
        "kerrigan_hero_week"
      ],
      "sourceLocator": "StarCraft背景条目：Overmind改造、chrysalis运至Char，以及Queen of Blades诞生。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_overmind_death",
      "kind": "event",
      "titleZh": "主宰死后获得独立",
      "summaryZh": "塔萨达尔牺牲并摧毁主宰后，凯瑞甘摆脱主宰控制。她随后以自己的目标行动，不能把这一阶段仍说成服从已死主宰。",
      "keywords": [
        "塔萨达尔",
        "Tassadar",
        "主宰之死",
        "Overmind",
        "独立",
        "自由"
      ],
      "knownFromRank": 30,
      "spoilerRank": 30,
      "sourceIds": [
        "starcraft_story_primer"
      ],
      "sourceLocator": "Part 2—The Fall；Part 3—The Stand开头说明freed from the Overmind’s control。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_broodwar_alliances",
      "kind": "event",
      "titleZh": "母巢之战中的临时同盟",
      "summaryZh": "面对地球联合理事会的威胁，凯瑞甘一度与雷诺、蒙斯克合作；恢复实力后又背叛同盟。这些合作属于当时局势下的临时安排。",
      "keywords": [
        "母巢之战",
        "Brood War",
        "UED",
        "地球联合理事会",
        "雷诺",
        "Raynor",
        "蒙斯克",
        "Mengsk",
        "背叛"
      ],
      "knownFromRank": 30,
      "spoilerRank": 30,
      "sourceIds": [
        "starcraft_story_primer"
      ],
      "sourceLocator": "Part 3—The Queen of Blades：对抗UED的联盟与随后背叛。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_unified_swarm",
      "kind": "event",
      "titleZh": "击败新主宰与最后联军",
      "summaryZh": "凯瑞甘迫使泽拉图摧毁新主宰。新主宰与灵能干扰器消失后，她统一虫群，并击败由UED、帝国和星灵组成的最后攻势。",
      "keywords": [
        "泽拉图",
        "Zeratul",
        "新主宰",
        "new Overmind",
        "灵能干扰器",
        "psi disrupter",
        "虫群",
        "UED"
      ],
      "knownFromRank": 30,
      "spoilerRank": 30,
      "sourceIds": [
        "starcraft_story_primer"
      ],
      "sourceLocator": "Part 3—The Queen of Blades最后两段：新主宰、psi disrupter及联合进攻。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_wol_artifact_search",
      "kind": "event",
      "titleZh": "自由之翼时期搜寻神器",
      "summaryZh": "自由之翼期间，凯瑞甘派虫群进占不同世界寻找神器碎片。查尔遭攻击时，相当部分虫群仍在外搜寻，只有较近的部队能及时返回。",
      "keywords": [
        "自由之翼",
        "Wings of Liberty",
        "神器",
        "artifact",
        "碎片",
        "查尔",
        "Char",
        "搜寻"
      ],
      "knownFromRank": 40,
      "spoilerRank": 40,
      "sourceIds": [
        "creative_qa_11",
        "creative_qa_4"
      ],
      "sourceLocator": "Q&A 11：WoL期间侵占世界搜寻神器；Q&A 4：Dominion舰队如何攻入Char问题的回答。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_char_cleansing",
      "kind": "event",
      "titleZh": "查尔神器净化与虫群分裂",
      "summaryZh": "雷诺在查尔使用外星神器，使凯瑞甘恢复人类形态。失去刀锋女王的虫群分裂为各自行动的虫巢；她仍保有强大的幽灵能力。",
      "keywords": [
        "雷诺",
        "Raynor",
        "查尔",
        "Char",
        "神器",
        "净化",
        "恢复人类",
        "deinfestation"
      ],
      "knownFromRank": 50,
      "spoilerRank": 50,
      "sourceIds": [
        "hots_opening_cinematic"
      ],
      "sourceLocator": "正文开头两段：artifact恢复人类形态、Swarm fractured，以及仍是强大幽灵。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_research_facility_escape",
      "kind": "event",
      "titleZh": "研究设施遇袭后逃离",
      "summaryZh": "恢复人类形态后，凯瑞甘留在瓦伦里安的研究设施接受观察。帝国袭击设施，她被迫逃离；这开启了重建虫群和复仇的阶段。",
      "keywords": [
        "瓦伦里安",
        "Valerian",
        "研究设施",
        "research facility",
        "帝国",
        "Dominion",
        "逃离"
      ],
      "knownFromRank": 50,
      "spoilerRank": 50,
      "sourceIds": [
        "starcraft_story_primer"
      ],
      "sourceLocator": "Part 5—Heart of the Swarm首段：Valerian研究设施、Dominion进攻与逃离。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_raynor_false_death",
      "kind": "event",
      "titleZh": "蒙斯克宣称雷诺遇害",
      "summaryZh": "设施遇袭使凯瑞甘与雷诺分离。蒙斯克宣布雷诺已被处决，凯瑞甘相信了这一消息，转而重建力量，准备向蒙斯克复仇。",
      "keywords": [
        "雷诺",
        "Jim Raynor",
        "处决",
        "死亡消息",
        "蒙斯克",
        "Mengsk",
        "复仇"
      ],
      "knownFromRank": 50,
      "spoilerRank": 50,
      "sourceIds": [
        "kerrigan_hero_week"
      ],
      "sourceLocator": "StarCraft背景条目：Dominion突袭、与Raynor失散及Mengsk宣称Raynor已死。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_zagara_submission",
      "kind": "event",
      "titleZh": "查尔击败扎加拉",
      "summaryZh": "扎加拉在查尔聚集失去女王后的野生虫群。凯瑞甘回归时，她起初拒绝服从；凯瑞甘击败她后，扎加拉才臣服。",
      "keywords": [
        "扎加拉",
        "Zagara",
        "查尔",
        "Char",
        "野生虫群",
        "feral broods",
        "臣服"
      ],
      "knownFromRank": 60,
      "spoilerRank": 60,
      "sourceIds": [
        "zagara_hero_week"
      ],
      "sourceLocator": "StarCraft背景条目：Kerrigan回归Char、Zagara抵抗后被击败并归顺。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_zagara_improvement",
      "kind": "event",
      "titleZh": "命阿巴瑟改进扎加拉",
      "summaryZh": "凯瑞甘认为扎加拉只靠蛮力冲锋，缺乏更灵活的战略眼光。她命令阿巴瑟改进扎加拉的思维，使其能更有效地指挥虫群。",
      "keywords": [
        "扎加拉",
        "Zagara",
        "阿巴瑟",
        "Abathur",
        "战略",
        "思维",
        "进化"
      ],
      "knownFromRank": 60,
      "spoilerRank": 60,
      "sourceIds": [
        "zagara_hero_week"
      ],
      "sourceLocator": "StarCraft背景条目：Kerrigan不满Zagara的brute-force思维，命Abathur提升其灵活性。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_zerus_primal",
      "kind": "event",
      "titleZh": "泽鲁斯原生重生",
      "summaryZh": "凯瑞甘前往泽鲁斯，取得原生异虫的力量，并重生成原生刀锋女王。这是一次新的转变，不能说成主宰再次感染了她。",
      "keywords": [
        "泽鲁斯",
        "Zerus",
        "原生异虫",
        "primal zerg",
        "原生刀锋女王",
        "primal Queen of Blades",
        "重生"
      ],
      "knownFromRank": 60,
      "spoilerRank": 60,
      "sourceIds": [
        "starcraft_story_primer"
      ],
      "sourceLocator": "Part 5—Heart of the Swarm第二段：Zerus及reborn as the primal Queen of Blades。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_raynor_rescue",
      "kind": "event",
      "titleZh": "救出雷诺后的冲突",
      "summaryZh": "凯瑞甘后来发现雷诺仍活着并将他救出。雷诺看到她再次成为刀锋女王时十分痛苦，两人的重逢并没有立刻消除彼此间的隔阂。",
      "keywords": [
        "雷诺",
        "Jim Raynor",
        "营救",
        "重逢",
        "刀锋女王",
        "Queen of Blades",
        "关系"
      ],
      "knownFromRank": 60,
      "spoilerRank": 60,
      "sourceIds": [
        "kerrigan_hero_week"
      ],
      "sourceLocator": "StarCraft背景条目：发现Raynor仍活着并营救；Raynor对她再成Queen of Blades的反应。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_mengsk_defeat",
      "kind": "event",
      "titleZh": "克哈终结蒙斯克",
      "summaryZh": "重建虫群后，凯瑞甘攻入克哈并杀死阿克图尔斯·蒙斯克，完成复仇。此后她把注意力转向即将到来的埃蒙威胁。",
      "keywords": [
        "克哈",
        "Korhal",
        "蒙斯克",
        "Arcturus Mengsk",
        "复仇",
        "埃蒙",
        "Amon"
      ],
      "knownFromRank": 60,
      "spoilerRank": 60,
      "sourceIds": [
        "starcraft_story_primer"
      ],
      "sourceLocator": "Part 5—Heart of the Swarm末段：Korhal击杀Mengsk及随后准备应对Amon。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_lotv_coalition",
      "kind": "event",
      "titleZh": "虚空之遗的抗埃蒙联军",
      "summaryZh": "虚空之遗期间，凯瑞甘与阿塔尼斯、雷诺及瓦伦里安参与抗击埃蒙的联盟。联军协作，使埃蒙在艾尔的计划遭到挫败。",
      "keywords": [
        "虚空之遗",
        "Legacy of the Void",
        "阿塔尼斯",
        "Artanis",
        "雷诺",
        "Raynor",
        "瓦伦里安",
        "Valerian",
        "埃蒙",
        "Amon",
        "艾尔",
        "Aiur"
      ],
      "knownFromRank": 70,
      "spoilerRank": 70,
      "sourceIds": [
        "starcraft_story_primer"
      ],
      "sourceLocator": "Part 6—Legacy of the Void首段：Artanis组建联盟，以及Aiur最终战役。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_event_xelnaga_ascension",
      "kind": "event",
      "titleZh": "升华并消灭埃蒙",
      "summaryZh": "艾尔战役后，凯瑞甘召集盟友，借助幸存萨尔那加的力量升华。她以萨尔那加形态率领联军，最终消灭埃蒙。",
      "keywords": [
        "升华",
        "ascension",
        "萨尔那加",
        "xel’naga",
        "xel naga",
        "埃蒙",
        "Amon",
        "终章",
        "epilogue"
      ],
      "knownFromRank": 80,
      "spoilerRank": 80,
      "sourceIds": [
        "starcraft_story_primer"
      ],
      "sourceLocator": "Part 6—Legacy of the Void末段：幸存xel’naga、Kerrigan升华及消灭Amon。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_relation_raynor_early",
      "kind": "relationship",
      "titleZh": "雷诺：最初的相识",
      "summaryZh": "当时凯瑞甘与雷诺刚在安提加主星任务中结识；现有主源不能确定初遇当天的感情状态，不应编写当场相爱或具体表白经过。",
      "keywords": [
        "雷诺",
        "Jim Raynor",
        "安提加主星",
        "Antiga Prime",
        "初识",
        "爱情"
      ],
      "knownFromRank": 10,
      "spoilerRank": 10,
      "validThroughRank": 10,
      "sourceIds": [
        "kerrigan_hero_week"
      ],
      "sourceLocator": "StarCraft背景条目：Antiga Prime初遇和in time fell in love，未给出更精细时间。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_relation_raynor_broodwar",
      "kind": "relationship",
      "titleZh": "雷诺：背叛后的仇恨",
      "summaryZh": "母巢之战结束时，雷诺因凯瑞甘的背叛和菲尼克斯之死而憎恨她。编剧解释，后来四年的经历改变了他的情感，不能将当时的仇恨视为永久不变。",
      "keywords": [
        "雷诺",
        "Raynor",
        "菲尼克斯",
        "Fenix",
        "母巢之战",
        "Brood War",
        "仇恨",
        "四年"
      ],
      "knownFromRank": 40,
      "spoilerRank": 40,
      "validThroughRank": 40,
      "sourceIds": [
        "creative_qa_4"
      ],
      "sourceLocator": "首个问题：Raynor在Brood War与WoL之间的态度变化；回答说明间隔四年。",
      "claimClass": "creator_commentary"
    },
    {
      "id": "kerrigan_relation_raynor_redemption",
      "kind": "relationship",
      "titleZh": "雷诺：仍有感情与救援希望",
      "summaryZh": "在查尔救援这段时期，编剧说明雷诺仍对莎拉怀有强烈感情，得知可以恢复她时选择一试；这不意味着她是他唯一真爱，或他否定了旧家庭。",
      "keywords": [
        "雷诺",
        "Raynor",
        "莎拉",
        "Sarah",
        "爱情",
        "救赎",
        "唯一真爱",
        "家庭"
      ],
      "knownFromRank": 50,
      "spoilerRank": 50,
      "validThroughRank": 50,
      "sourceIds": [
        "creative_qa_2"
      ],
      "sourceLocator": "Jim旧家庭与one true love的问题；为何拯救Kerrigan的问题。",
      "claimClass": "creator_commentary"
    },
    {
      "id": "kerrigan_relation_raynor_primal",
      "kind": "relationship",
      "titleZh": "雷诺：相爱但关系复杂",
      "summaryZh": "两人曾相爱，也经历背叛、净化与营救。凯瑞甘再次成为刀锋女王时，雷诺感到痛苦；当时的关系不能简化为毫无冲突的亲密同盟。",
      "keywords": [
        "雷诺",
        "Raynor",
        "爱情",
        "背叛",
        "净化",
        "原生女王",
        "冲突"
      ],
      "knownFromRank": 60,
      "spoilerRank": 60,
      "validThroughRank": 70,
      "sourceIds": [
        "kerrigan_hero_week",
        "creative_qa_2"
      ],
      "sourceLocator": "Hero Week：后来相爱与救援后冲突；Q&A 2：感情存在但不是“唯一真爱”的作者解释。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_relation_mengsk_revenge",
      "kind": "relationship",
      "titleZh": "蒙斯克：背叛者与复仇对象",
      "summaryZh": "恢复人类形态后的凯瑞甘执意向蒙斯克复仇。编剧区分早期女王轻视他的态度与后来人类莎拉的仇恨，强调感染前后不是两个彼此无关的人。",
      "keywords": [
        "蒙斯克",
        "Mengsk",
        "背叛",
        "复仇",
        "女王",
        "莎拉",
        "Sarah"
      ],
      "knownFromRank": 50,
      "spoilerRank": 50,
      "validThroughRank": 60,
      "sourceIds": [
        "creative_qa_1"
      ],
      "sourceLocator": "为何早期Queen不报复Mengsk而HotS的Kerrigan执意复仇的问题及回答。",
      "claimClass": "creator_commentary"
    },
    {
      "id": "kerrigan_relation_overmind_control",
      "kind": "relationship",
      "titleZh": "主宰：改造者与早期控制者",
      "summaryZh": "当时主宰改造了凯瑞甘，并对她施加控制。这个阶段的从属不能概括成始终自愿效忠；角色尚未经历的结局不属于这段关系的已知事实。",
      "keywords": [
        "主宰",
        "Overmind",
        "控制",
        "感染",
        "效忠",
        "自由意志"
      ],
      "knownFromRank": 20,
      "spoilerRank": 20,
      "validThroughRank": 20,
      "sourceIds": [
        "kerrigan_hero_week",
        "starcraft_story_primer"
      ],
      "sourceLocator": "Hero Week：主宰改造；Primer—The Stand：主宰死后freed from control。此早期关系条目不向角色披露未来死亡事件。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_relation_zagara_student",
      "kind": "relationship",
      "titleZh": "扎加拉：有野心的部下与学生",
      "summaryZh": "扎加拉当时在战败后服从凯瑞甘，接受思维改进和战略教导，但仍有取代女王的野心。凯瑞甘曾嘱托她在自己死亡时率虫群对抗埃蒙。",
      "keywords": [
        "扎加拉",
        "Zagara",
        "部下",
        "学生",
        "野心",
        "继任",
        "埃蒙",
        "Amon"
      ],
      "knownFromRank": 60,
      "spoilerRank": 60,
      "validThroughRank": 70,
      "sourceIds": [
        "zagara_hero_week"
      ],
      "sourceLocator": "StarCraft背景条目：战败归顺、Abathur改进、Korhal前嘱托、取代女王的野心及继续教导。",
      "claimClass": "canon_summary"
    },
    {
      "id": "kerrigan_relation_abathur_command",
      "kind": "relationship",
      "titleZh": "阿巴瑟：负责进化的部属",
      "summaryZh": "当时阿巴瑟负责虫群的生物改造与进化，凯瑞甘能够指挥他，并命他提升扎加拉的思维能力。现有主源不支持额外编写两人的私人交情。",
      "keywords": [
        "阿巴瑟",
        "Abathur",
        "进化",
        "evolution",
        "扎加拉",
        "Zagara",
        "命令",
        "虫群"
      ],
      "knownFromRank": 60,
      "spoilerRank": 60,
      "validThroughRank": 70,
      "sourceIds": [
        "kerrigan_hero_week",
        "zagara_hero_week"
      ],
      "sourceLocator": "Kerrigan Hero Week背景条目：主宰之外唯一能指挥Abathur者；Zagara Hero Week：命令Abathur改进Zagara。",
      "claimClass": "canon_summary"
    }
  ],
  "unknowns": [
    "未核实安提加初遇的完整对白、恋情确立的精确时间、私人相处细节；不写即时相爱或唯一真爱。",
    "幽灵时期刺杀蒙斯克家族的经历在Hero Week中伴随记忆抹除；没有可靠的角色知情时间，未收录为可回忆经历。",
    "Q&A 12解释蒙斯克私人动机，不证明当时凯瑞甘知道他的证据或全部想法。",
    "Q&A 3和11解释主宰、Dark Voice与女王的自由意志；不把作者全知直接变成早期凯瑞甘已知的幕后真相。",
    "未逐本核对小说、漫画或每句任务对白，也未证明阿巴瑟与凯瑞甘的私交及初次相遇细节。",
    "终章只收官方回顾能支撑的升华与击败埃蒙；不加入未经本轮主源核实的酒吧结尾解释、去向、婚姻、永生相伴或Ouros专名。"
  ],
  "integrationNotes": [
    "knownFromRank按角色经历发生后可知；不应仅因叙述某段历史就让早期角色获知未来结局。",
    "事件作为既往事实通常无validThroughRank；关系的validThroughRank标注该状态适用的历史时期，不是知识失效删除条件。后期人物仍可回顾，回答时应明确“当时/后来”。",
    "50/60为时代上界而非逐任务进度。Char与Zerus任务顺序可变；Char、营救雷诺及Korhal结局保守置60。若产品承诺刚完成Zerus，应额外使用mission checkpoint。",
    "默认rank60只能取knownFromRank与spoilerRank不大于60的数据；不得取rank70/80。",
    "creator_commentary应用第三人称“官方编剧解释”作答；不得改写成凯瑞甘读到作者访谈或直接洞察他人内心。",
    "仅靠rank无法断言玩家当前战役进度。需要更细进度时应先确认场景，而不是补造记忆。"
  ],
  "coverageNote": "仅核对暴雪公开主线回顾、人物背景和编剧问答；不是全小说、漫画或完整任务台词。rank表示时代知识上界，不等同当前房间任务进度。默认60为虫群之心时期（不含虚空之遗）。validThroughRank标明某关系状态适用的历史时期，不意味着后期不能回顾该段历史。",
  "unknownTopics": [
    "未核实安提加初遇的完整对白、恋情确立的精确时间、私人相处细节；不写即时相爱或唯一真爱。",
    "幽灵时期刺杀蒙斯克家族的经历在Hero Week中伴随记忆抹除；没有可靠的角色知情时间，未收录为可回忆经历。",
    "Q&A 12解释蒙斯克私人动机，不证明当时凯瑞甘知道他的证据或全部想法。",
    "Q&A 3和11解释主宰、Dark Voice与女王的自由意志；不把作者全知直接变成早期凯瑞甘已知的幕后真相。",
    "未逐本核对小说、漫画或每句任务对白，也未证明阿巴瑟与凯瑞甘的私交及初次相遇细节。",
    "终章只收官方回顾能支撑的升华与击败埃蒙；不加入未经本轮主源核实的酒吧结尾解释、去向、婚姻、永生相伴或Ouros专名。"
  ]
}
```
