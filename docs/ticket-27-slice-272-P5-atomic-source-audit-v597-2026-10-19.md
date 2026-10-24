# P5：原子主张审核可行性与产品接线

所属 T27/S272，新P0–P6主线。最终Plan0/6、对局0/12、剩余4片；本文不替代最终军表／Plan和中文逐步报告。

## 真实试验：不能只报成功

材料为保存的616回复、1168逐攻击者回执、1151 Marauder2回执、31 Medic官方材料。均只读，主Run断点哈希前后相同。使用现有安全Flash Adapter、Provider边界、精确读取器与角色执行器；无新规则器／Native动作。

### 1. 段落级小块仍失败

[试验报告](../build/slice272-claim-audit-v597-XciGcj/report.json)，[完整聚合项prompt](../build/slice272-claim-audit-v597-XciGcj/2.request.json)，[实际回复](../build/slice272-claim-audit-v597-XciGcj/2.reply.json)。

同一段同时包含“三单位合计10.056”和“per-attacker、非合并齐射”。模型仍把Marauder1行误称Combined row，并判supported。不能接入这种段落审核作为通过证据。正确的Marauder2单攻击者数值对照通过；技能项请求正常精确读取后，本轮原型没有继续该交接，不能称完整结束。3次调用／28,947 Tokens。

### 2. 原子句隔离了错误归属

[原子试验报告](../build/slice272-claim-atoms-v597-H4QBQ5/report.json)，[聚合断言prompt](../build/slice272-claim-atoms-v597-H4QBQ5/2.request.json)，[实际拒绝](../build/slice272-claim-atoms-v597-H4QBQ5/2.reply.json)。

仅给真实第一句正面断言和原生逐攻击者数据，不交后面的免责声明。模型准确指出10.056/61.11%属于u_marauder_1，而非三者合计，判requires_revision。正确对照未重复付费重跑。技能项经过正常continue_work完成读取，但仍宽松理解“反应／主动”的混合措辞，严格技能用词检出不能计为已证明。3次调用／20,510 Tokens。

结论：原子句可以解决这条已知数值归属错误；不是所有语言幻觉已消除，也不是策略优越性／稳定生产证明。

## 接入产品的Interface

`roster-workflow-source-claims-v1.mjs`提供创建与评估两个入口，隐藏分句、来源绑定、复用、依赖与汇总的实现。

1. 对原回答做句子分段，保留每个字符、起止位置和章节标题；正面断言与后续免责声明分开。
2. 每条主张只承担source_fidelity；按原引用交测量索引，其他引用按需精确读取。无外加战略偏好。
3. 问题覆盖另设父审核，依赖全部子检查；Host汇合真实子结果。任一来源失败不能被覆盖通过豁免。
4. 失败原件直接交回原作者；军表／Plan仍由后续联合决策工具修改，审核不代写。
5. 同文本、问题、来源与绑定且已有完成检查时复用原结果；改变主张不得复用旧通过／拒绝。旧事实、回复、次数和费用不改。
6. 旧版本审核保持原样。只对当前已知错误回答追加`atomic-fidelity-v598`定点复核；未决时旧绿色不作准入。

## 定点门与能力发现修复

- `verify-slice272-atomic-source-review-v598.mjs`：实际616/619先RED（没有独立主张检查），修后一次GREEN；18条、全文覆盖、错误单条阻止准入、失败反馈到作者、未变检查复用。0Provider／生产写，不重跑旧门。
- 地图调查576/588反复phase=movement却保留Supply0。首轮Native初始化早已在inspect支持，但统一场景调用合同没有披露其步骤。v599将同一合同同时交统一目录与inspect：start_of_round准备只开放真实mission-start有限动作，随后仍由模型选Native任务／先手动作，Native算Supply。没有补资源、换轮次或自动选动作。
- `verify-slice272-initialization-discovery-v599.mjs`：具体遗漏RED，修后一次GREEN，统一合同与保存inspect的version/request/purpose一致；0Provider／Native／生产写，不重新验证已过规则。
- v596目录兼容修复一并加载：来源审核v4继续使用按需目录，不恢复全局历史。

## 实际运行边界

PID68636通过`--recheck-component-atomic-claims`继续同一`inlKbk/projection-owner`，日志`build/slice272-live-p5-v599.log`；没有重建军表、Plan或房间。真实排入18条，父审核waiting_dependency；初始观察已对“同几何”与“Marauder1+2合并数值”两处给出requires_revision，仍待完整审核→作者修订→再验及地图域收口。不能凭18条数量或门禁GREEN宣布P5完成。

harnessLoopUsed:true；promptRoutes:原子source-review→coverage→原作者source-revision；uiTraceEvidence:无，本轮不扩Web。memoryTraceEvidence:真实旧断点／全部原件保留；trainingTruth:false，无新训练准入。发现任一错误主张则不放行；正确主张保持，原生规则不受叙述影响。
