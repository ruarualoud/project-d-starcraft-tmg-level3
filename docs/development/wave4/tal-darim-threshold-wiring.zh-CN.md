# Tal’darim 累积 Supply 损失与首武器

本批新增 1 个已实现原子，累计 7/18。7 个完整原生回合、155 个签名动作，Web 3 房33次真人确认，以及15房310个原动作独立冷重建通过。整版人人更新继续；主 Builder 仍102/119，Tal’darim整卡的Proxy Pylon仍待接。

| 定义ID | 新语义与实际消费者 |
| --- | --- |
| `card:tal_darim/chain-of-ascension-any@1` | 军表创建时绑定初始Supply，随后计算全部己方单位的损失，包含后备与已毁单位；真实伤亡触发3→4、5→6 |
| `card:tal_darim/4-or-more-any@1` | 同一损失投影达到4时，首件武器取得既有PRECISION(1)，由原生远程和近战计划消费 |
| `card:tal_darim/6-or-more-any@1` | 达到6时，同一首件武器取得既有CRITICAL HIT(1)，由原生远程和近战绕过护甲计划消费 |

三条定义共用一个新增原子`rule-atom:wave4/friendly-lost-supply-threshold@1`。既有单位Supply、PRECISION、CRITICAL HIT、首武器绑定、伤亡、激活、计分与回放消费者均复用；没有把两个门槛或两种攻击各算一个新原子。[实际导出与消费者映射](evidence/tal-darim-threshold-consumers.public.json)列出具体接线位置。

初始值绑定来源记录、载荷、军组和单位身份；不能在伤亡后重建一个较低基线。任务Supply、VP及击杀归属不参加计算。当前已准入的零Supply生成单位不制造损失；未知正Supply生成单位需要独立注册来源基线，当前拒绝推断。[九项边界](evidence/tal-darim-threshold-contract.public.json)还验证敌方损失不能提高己方门槛，Passive不依赖卡牌Ready状态，缺少实际持卡来源时不授予关键词。

每轮首件实际使用的武器沿用既有首武器合同记录；即使当时尚未到门槛也记录。后续真实伤亡达到门槛，同一武器可取得新加成，另一件武器当轮不取得；下一轮旧绑定失效。新组合由显式政策1.0和Root3.244.0绑定，旧版本分支保持。

两个门槛子句没有独立的Passive标签。本批核对它们紧接明确的Chain of Ascension Passive／Any Phase父标题，记录精确正文和连续位置后，只在新候选identity view继承分类。全部556个定义ID与来源特征哈希不变；没有改旧身份包或来源字节，也没有解除既有39条阻断。候选军表实际支付两张非Unique Gateway，取得6 Core容量后才通过建军；不能把单张Gateway的不足容量绕过。

[原生七房](evidence/tal-darim-threshold.public.json)覆盖损失3／4／5／6的远程、6的近战、实际敌方射击造成的3→4和5→6。全部走到R2 Movement，计分恰好一次，伤亡、防御和激活后继完成；动态分支保留原首武器并核对另一件武器与跨轮投影。既有损耗与站位明确属于工程场景，初始基线在损耗前捕获；这些场景不等于整版从部署开始的完整对局。

[主Web双席](evidence/tal-darim-threshold-web.public.json)从原生第5步签名前缀进入，分别在4和6门槛下由页面实际发起射击，各15次确认，完成后继、计分、清理与双席恢复。两房自然没有失败命中骰，没有重掷。另从原生已有第6步签名前缀[补手机手选](evidence/tal-darim-threshold-choice-web.public.json)：保留原命中骰，在390px界面选择第2颗失败骰，用3次确认完成转换、防御和激活；此房是选择后继验收，不计为第三个Web完整回合或新发起攻击。

Web实际发现客户端拒绝合法的分段射击Preview：菜单是`ranged_attack`，Native先执行`roll_ranged_attack_hit_pool`。修复仅允许该明确后继，并逐层校验父动作哈希、席位、单位、阶段、目标、武器和选定攻击计划；[九项回归](evidence/tal-darim-staged-preview.public.json)验证篡改拒绝。Native规则与签名动作未改写。手机转换骰名称直接来自Native枚举，客户端不补算规则；[实际表单](evidence/tal-darim-precision-choice-390.png)与[确认画面](evidence/tal-darim-precision-preview-390.png)已目视核对。

[原生7房155动作冷读](evidence/tal-darim-threshold-native-cold.public.json)、[Web3房33动作冷读](evidence/tal-darim-threshold-cold.public.json)和[上一批Firebat5房122动作](evidence/firebat-current-cold.public.json)均独立重建到原状态，描述符不变，0新动作。[本地Web包](evidence/tal-darim-web-build.public.json)冻结实际验收字节；[类型检查](evidence/tal-darim-typecheck.public.json)无新增诊断，既存35条文件诊断保留，未宣称全应用类型检查通过。[本批闭环](evidence/tal-darim-threshold-harness.public.json)限定在这些实际消费者。

下一步继续新增卡牌、Firebat模板／Fire Wall、Reaver／Scarabs／Slayer及Tal’darim Pylon，再完成整版发布选择、Builder／房间／媒体和500／2000分人人验收。39条来源阻断保持隔离；80mm炮塔仍仅工程估算，FT尺寸问题保持待答。付费模型、K3、AI对局、复盘及生产发布继续暂停，模型调用0。
