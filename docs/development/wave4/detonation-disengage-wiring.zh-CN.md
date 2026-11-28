# Disengage直接移除与Web发起

本批局部接线通过，整版Wave4人人长任务继续。政策1.8／Root3.241显式接入感染步兵的Disengage移除；新增完整原子0，累计6/18。旧核心规则、几何、伤亡和Supply写入均复用；新增组合是规则证明后的直接移除与Detonation伤亡前反应。Detonation仍待Consume和新单位组合，不能登记完整原子。

| 实际消费者 | Trooper使用／拒绝 | Marine使用／拒绝 |
|---|---:|---:|
| Leading Model无法脱离：整队不移动、移除领队、结束激活 | 38／36 | 39／38 |
| 领队实际移动、其他模型无法合法摆位 | 27／21 | 27／21 |
| 最后模型移除、整单位销毁 | 23／21 | 23／20 |

[原生12房](evidence/detonation-disengage.public.json)共334个签名动作，全部从真实R1任务开始到R2 Movement，含必要的真实Fight、护甲／Evade／伤亡、计分及清理；均幂等并关闭重开冷重放。Marine场景明确声明先前伤亡，末模型Trooper同样声明由3模型减至1；工程棋位不是从Builder新开完整对局的证明。

终点证明读取Native真实底座。它放宽地形／路径限制形成必要终点的超集，只有超集为空才允许移除；同时读取平铺／地形协议的Access Points和当前生效的语义高地证书；存在候选终点或换层尚未解决则拒绝判死，不以一次路径搜索失败代替无路。适用消费者为圆底座Ground感染步兵。普通模型按声明顺序，复用原移动、底座、地形与完整摆位校验；私有几何投影隐藏失败候选时，仍保留原声明的Engagement及Supply限制。

伤亡前继续保留待移除模型的位置和身份，子HITS结束后从封存计划完成原移除，不重新声明Disengage。原Supply写入采用与Native伤害相同的任务运行时身份，避免跨层身份混用。[结算只读审计](evidence/disengage-settlement.public.json)核对12份原签名日志：原移除只发布一次，4个正Supply扣减分支共损失4；4个末模型分支均销毁并清理单位。Marine末模型扣1Supply，Trooper末模型为0Supply，仍执行销毁。沿用已有Disengage未裁定归因，不伪造对手击杀来源或额外计分步骤。

[双席Web](evidence/detonation-disengage-web.public.json)从原签名任务／首行动选择的第2步进入，实际在界面发起Disengage，再执行Detonation、子HITS、原移除及必要的结束激活。Trooper领队失败9次确认，Marine普通模型失败10次，共19次；独立1500px／390px席位、只读预览、恢复重入、回放和原移除一致。Marine行动席为390px，已核看[实际发起表单](evidence/disengage-producer-web-390.png)。本门仍不包含Builder／大厅开局。

带原生证明合同的Disengage现路由到NativeActionForm。玩家只选择领队、路径、每个模型摆位或请求移除；规则器负责证明合法性。表单不提交调用方证明，领队失败时清空路径与站位，普通失败模型清除隐藏旧坐标。首轮仍被旧手势编辑器接走、未提交动作；修正路由后的[离线Web V4](evidence/disengage-web-build.public.json)通过上述实际流程。原成功摆位合同和旧政策保持版本边界。

[七个边界组件](evidence/disengage-boundaries.public.json)核对注入证明、篡改计划、仍有终点、未解决换层和旧政策；[两个真实前缀的表单组件](evidence/disengage-form.public.json)核对编译结果与原签名行动完全一致、隐藏旧坐标清除及必填字段。组件新增动作0，不重复计入12房。

独立重建冷验分[十房](evidence/detonation-disengage-current-cold.public.json)和[末模型四房](evidence/detonation-disengage-last-cold.public.json)，共14房396个原动作、原描述符及最终状态一致，新增动作0；包含前批Storm／Photon使用房。[逐ID消费者映射](evidence/detonation-disengage-consumers.public.json)列出两条Detonation各6个Native消费者与实际Web分支；[工具闭环](evidence/detonation-disengage-harness.public.json)明确剩余范围。集中验收入口：verify-wave4-disengage-closure.mjs。

继续Consume费用保留／原效果封存、新Firebat／Scarab组合、其余13个已审核记录与完整发布／Builder／大厅／媒体及500／2000分Web双席。39条来源阻断保持隔离；80mm等底座保持工程估算，未解除正式几何准入限制。付费模型、K3、AI对局、复盘与生产发布继续暂停，外部模型调用0。
