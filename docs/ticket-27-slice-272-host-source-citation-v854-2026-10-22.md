# T27 / S272：系统说明的可引用来源（v854）

## 当前交付

P1/P2/P5 的统一资料接口修复。同一新流程 Run `slice272-product-generation-v645-lqMWaS`，不恢复旧 A–F、不新建房间、不重测原生攻击、不手改模型回复。

正式 r4 仍为合法 2000 矿／170 气；T27 5/6、T23 33/36，剩余 S272/S248/S249/S250 四片。最终 Plan 0/6、对局 0/12，六能力整体验收仍未完成。

## 实际故障

v853 六项审核里 claim7 核对的是“系统投影说明写了什么”。当前说明在 `workflow_role_assignment.inputs.measurementScenes`，属于内联 Host 文字，不是原生规则回执，也没有自己的资料编号。

实际出现以下往返：

1. 请求 `9a6c43b1e355de6d3cb3354eccffe9a08b240157935ff46577b32e1cd0086d01`，回复 `a9c169a2237c000d35eebc3516fc2a03a7fdc23524de56b5471c08cd289fc05e`：引用被审提案 1469，正确触发 `review_subject_is_not_evidence`。
2. 请求 `1541de18844cb7400dd07b48e528c65105b18fe1d0c0d2f704ba7fdcee8f83e7`，回复 `0a18898b48c24bb66da0d9d86e0344eceff754dbdcd77dbc58dc46a6f1cc9607`：解释自己引用的是内联说明、清空编号，触发 `supported_review_requires_evidence`。
3. 回复 `d6caa7ffe0c754b1e426941f715cacc2b3aad5cacd8661b3754b072e5fde7c4f` 又引用 1469，达到三轮纠错上限。53783 正常退出，e9906，running0／pending0；不是网络失败。

主因是交付合同不闭合：要求审核系统说明，却只支持引用已登记资料。原校验防自证是必要的，不应删除。另有模型把未交付的历史 reviewer 说明当作可由当前说明支持的倾向；本次不替它放行该历史归属。

## 源头修复

- 新增 `roster-host-projection-context-v1.mjs`：只识别三个共享 Host 投影的正式 schema，抽取其版本、assessmentScope 和 instruction；不复制攻击数值／完整大场景，不登记任意模型文本。
- 通过已有 `publishContext`→`publish_evidence` 原子路径保存不可变说明源，返回同一权威资料目录和实际编号，沿用原读接口。
- 三个输入附带 sourceContext 指针，角色获得已交付 `hostProjectionSource`；校验、可见目录和读取使用同一来源。
- `proofScope` 明确：只证明该系统说明的文字，不证明规则、伤害、因果、另一个作者／审核的历史表述或策略优越性。
- 不新增模型输出字段、不放宽“通过须有来源”、不删除自证检查。
- 未发出请求才登记；已在途请求和原回复重验不改输入。
- 正常恢复只识别“旧请求有这些说明但没有可引用来源，且错误为自证／缺来源、理由明确引用说明”的具体缺口；追加一次，原费用／次数／回复保留，已带新来源的请求不能续领。

## 验证与异常处理

| 验证 | 结果 |
|---|---|
| 64932，`build/slice272-v854-red-1792628236189.log` | 在正常工作流→角色请求接缝复现缺可引用编号 |
| 66552，`build/slice272-v854-green-1792628369492.log` | 原子发布、三种说明逐值读取、合法引用、可见目录、独立自证拦截、无关内容不登记等通过；随后恢复断言失败 |
| 定位第二处工程问题 | 旧通用早退把所有 semantic repair 请求排除，新来源修复分支因此不可达；只对已证实的本缺口开放，其他旧恢复保护仍保留 |
| 67938，`build/slice272-v854-recovery-1792628485330.log` | 仅补验剩余恢复部分：一次追加、已修输入不可重复领取、在途和其他角色不领取，产品恢复模块加载成功；前面通过部分未重跑 |

测试以实际请求和断点为素材，正常状态机／资料发布／读取／引用门执行于内存副本，模型返回为明确标注的“系统说明引用”脚本回复。1 次模拟 Provider 返回，真实计费 0、Native 查询 0、生产写 0；不证明实际作者已经收口或策略变好。

## 实际续行和待验

68314 从 e9906 同 Run 加载，守护 68315，日志：
`build/slice272-v854-host-source-resume-1792628515139.log`。

后续检查：正常有界恢复→实际新编号送达→模型自行给出合法引用或准确未决／修订判定→来源审核回交作者→事实／战略交接。必要的历史引用缺失不能用本说明源冒充，因果解释也不能因引用合法就自动批准。

## 本轮 diff 与边界

### 真实续行 e9906 → e9941

- 实际请求 `29d03226691adc3419578744e0fea8e823fcc0fb0be4b8fd46b5969b5f00ed51` 收到 Host 源 **1486**，原件 `216017472523b510af4a1edd719e7761be7e093f598cd1df51291db270fdcdfb`；citation_access、三投影 sourceContext 与目录一致。
- 第七条核对返回 `5c081ae174f9ddacf79369d236cc48531b72a9ebdf79428bfbaf0b40a42ce986`，通过原引用门，保存 `76dc38cac67e13c8b0ac2c37a1c6c613b570c151018cdb3e48bf5cf2d01c1b13`，不再空引用／自证往返。但其公开理由仍把当前说明当历史 reviewer 说明，不能称历史归属已证。
- 父覆盖审核实际完成，结果 `dfb1ada20e0d1ae9b3d651e96c60bf420a613712d1227de13c08aca8d318f0ce`，仍引用旧问题中的 false 字段作当前事实，并回交作者；不是最终放行。
- 作者 `3098c9110bc4d87257d1230b8b53eda2337f95e9a7d9adbcca4df37a27f37b12` → `11da54c7bcd812c44abb75f4fce854cd6063183990f8aff95ce53e7a80e4c3e7` 虽读取完整条件，仍继承旧前提。现由 v855 修输入分层，未手改结果。
- 该段 **5 次 Flash／643,712 units／Provider 33,644 ms**，不与 v853 的13次重复累计；无新 Native 测量。68314 已安全退出，e9941／0在途，正式 r4、Plan0/6 不变。

- `roster-host-projection-context-v1.mjs`：系统说明来源及具体恢复缺口识别。
- `roster-workflow-read-role-v1.mjs`：派发前统一登记，来源修复的有界恢复判定。
- `roster-decision-workflow-v1.mjs`：已有发布控制器支持明确资料标题／类型／条件和当前目录返回，原默认行为保留。
- `roster-decision-product-journey-v1.mjs`：实际恢复理由与证明范围。
- `verify-slice272-host-source-citation-v854.mjs`：本具体故障、正常接线和异常分支验证；无其他旧门重跑。

harnessLoopUsed=true；目标 StarCraft TMG；路由仍是分角色事实／Teach／审核，不混入规则真值。UI 本轮未操作；原 Run trace 和公开理由保留，trainingTruth=false，无 Skill 或记忆晋级。若说明源被当 Native 结果，需修其消费边界，不能据来源存在宣称策略正确。
