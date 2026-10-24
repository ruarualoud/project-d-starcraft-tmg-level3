# T27 / S272 P2/P5：问题前提与当前观测分层（v855）

## 交付范围

仍是新 P0–P6 的同 Run `slice272-product-generation-v645-lqMWaS`，不是恢复旧 A–F。正式 r4／2000矿170气不变；T27 5/6、T23 33/36；剩余 S272/S248/S249/S250 四片，最终 Plan0/6、对局0/12。

v854 已真实恢复第七条的引用链路；本次处理随后出现的父审核／作者前提污染。它属于 P2 输入分层与 P5 正常纠错，不批准任何策略或因果结论。

## 故障追踪与原因

父请求 `c6b4eb964cf2c9378cf3047fb12eff6b448a77059ba53c91d6892134076d4978` 的实际结果 `764729c0ceacd439b14007ff7c92e5dfc4365060070b9d3795abf56a54f5e7d8` 又称当前 measurementScenes 含两个固定 false 字段。

按顺序核查的假设：旧问题当事实、当前条件漏传、局部纠错固化旧错误。

实际输入证据：

- 当前 measurementConditions 已送达（157,841 字符），三共享投影也已改为 not_assessed，不能归因没有传工具数据。
- 旧字段字样来自 question 的 necessaryQuestions、decisionRelevance、authorization.whyExistingEvidenceInsufficient；又完整复制到 acceptance_stage_contract.authorizedInquiry，并重复到 typed_question_route。
- 原局部纠错 originalOutput 也保留旧推断，这是必须保留的被拒输出，但不是当前观测。
- 后续作者实际回复 `11da54c7bcd812c44abb75f4fce854cd6063183990f8aff95ce53e7a80e4c3e7` 一面正确列出条件差异，一面仍复述已移除字段作否定依据。当前军表／Plan未放行。

结论：存在明确的输入权威分层缺口，同时模型本身未正确处理矛盾。不能保证一次输入修复就消除后者；须观察真实后续。

## 统一修复

1. `roster-inquiry-premise-boundary-v1.mjs` 保留原问题逐字内容，标为 `requested_predicates_with_unverified_premises`，不视为观测或规则来源。
2. 只有逐值完全相同的 authorizedInquiry 副本和唯一匹配的问题文本才换成指向原文的引用；不同义务和其他元数据保留。不重写、删除、降低必要问题。
3. 单独列出当前观测投影地址，要求模型区分请求的谓词与请求中声称为真的前提。允许用当前来源明确反驳旧前提；剩余真实未知照常阻塞。不注入游戏策略、不强迫肯定效果。
4. 同一输入边界用于事实方法、总体策略、Teach、审核四角色。只构造新请求；在途重试与旧回复重验仍保留原输入。
5. 历史审核阶段检查支持这个精确地址；错误地址仍判缺失，不因引用形式更新重跑已通过审核。

## 本次单步验证

- RED **78084**：正常角色构造器、实际失败请求素材，失败于缺 `inquiry_premise_boundary`；日志 `build/slice272-v855-red-1792629268175.log`。
- 唯一完整 GREEN **78996**：日志 `build/slice272-v855-green-1792629342686.log`。
- 核对原问题和 Native 逐值不变、重复项精确引用、四角色适用、非同一问题不折叠、无关请求不改、幂等、正确引用兼容旧阶段检查、错误地址不能满足检查。
- 请求在 Provider 前被明确截获；真实模型0／Native0／生产写0。它证明输入接线，不证明模型策略判断。
- 未重跑 v854、火力、地图或其他已通过门禁；未新增全量审核。

## 实际续行

68314 在 e9941 安全退出，running0／pending0。新 **79295** 从同 Run 正常恢复，守护79296；日志 `build/slice272-v855-inquiry-boundary-resume-1792629366375.log`。无 provider 重置、无新实验房间、无付费原件改写。

下一实际检查：新边界送达→作者自行区分／修订旧前提→独立来源与覆盖审核→原问题的战略责任交接。未发生前不能称收口、稳定、策略改善或最终Plan通过。

### 实际首请求 e9953

请求 `fd774865591e8fb062fe6945cdb9eeea734e95d702c97a5e353d9dfe5310045f` 已实际带四个当前观测地址和 inquiry_premise_boundary，question 的 epistemicRole 正确。回复 `ee98e4fc56704d46fd92fe2870ba799c4ad302fc82b16441384d1382e0983f30` 选择读取1410/1429的 attackEstimates 第0/1行，说明要核对操作数和采样／反应策略，没有提交新Native实验。1Flash／182,025units／5,308ms；这仅证明送达与真实补读，不证明已修正因果解释或完成Plan。原进程79295继续。

### 最终实际停点 e9981：没有收敛

| 本次请求 | 回复 | 实际行为 |
|---|---|---|
| fd774865… | ee98e4fc… | 补读四条攻击行 |
| 94ccbb3557305a538712853f3093da09f9e123e77850361031800c007d270051 | dc9f495a192c82e8c1c81ad3a7d2d2776038bb64a562ad23b7803ea011eff78c | 又补读已出现的 precision/rulesAuthority 字段 |
| 1ba60d8c60916b00984635bef878391cbfb0316af7fe139d0120ab879e6fd031 | e5eb9b55aef475166175f18df5ebab58f0ceaa8ebf1de0e59173099422dc405e | answered，但仍照抄旧false前提；被无新材料门拒绝 |
| 9bf69248a880393c7cc0493a04e71f0753f4a74aeff4c589b9fde9ff06d448df | 075692a6c8c367015df1f2ae0a49326f54fc1af06f770d24a402278c10d6d8a5 | 再次同结论，累计连续纠错3次后停止 |

本段合计 **4Flash／850,855units／Provider28,667ms**，包含前述首请求，不重复相加。0新Native实验。79295正常退出，e9981、running0／pending0、needs_repair，错误 `ROSTER_WORKFLOW_ROLE_CORRECTION_NOT_CONVERGED`；不是网络故障。正式r4和Plan0/6未变。

**结论边界**：v855的数据分层和引用接线实际生效，但模型语义纠错未成功，不能称该故障已解决。新请求明确允许据原件反驳旧审核，仍未被模型采用；现有 no-new-material 反馈只要求该角色再次决定 answered/workOrder/strategy_required，并未保证争议交给总体责任角色。这是下一步要验证的职责交接缺口，不是需要重新购买同一测量。

遵守三轮收敛规则，本循环不再追加请求。下一具体交付应为“同材料争议的明确责任转交”，保留被拒原文、原问题和必要未知，不替模型判事实、不自动放行；须先以此实际停点验证调度，再按已有定点修复授权续行。不得仅提高次数、再次重复输入提示或把这次测试通过冒充最终产物。

## 文件与边界

- 新增共享输入边界模块；read-role 派发前接线；inquiry-review-stage 支持同一原义务引用。
- 新增本具体故障的定点验证脚本；更新当前入口／任务记录。
- harnessLoopUsed=true；StarCraft TMG；公开理由和真实请求继续保存；本轮无 UI 操作、规则更改、Skill晋级或训练真值提升，trainingTruth=false。
