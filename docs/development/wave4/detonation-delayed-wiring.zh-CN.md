# Detonation 与 Bile／Drone 延迟伤害

本批局部消费者已通过原生、Web和兼容门，整版人人长任务继续。完整原子仍 **6/18**。政策1.6／Root3.237只增加Corrosive Bile和Sabotage Drone两个外部HITS父节点；Storm／Photon和直接移除仍保持未接隔离。

原生消费者从实际回合开始推进：Ravager在Movement真实支付BM并放Bile token；Nova Covert Ops通过Griffin Support真实设置Sabotage Drone。随后双方真实Pass，阶段末效果走原生HITS、伤亡选择、Detonation子反应、原父恢复和阶段结束。完整回合继续任务控制、计分、清理、先手和R2 Movement，不能以条件摆放的阶段末状态代替真实前继。

Bile使用／拒绝已保存两支27／25签名动作，共52，均完整回合且冷重放；使用分支实际由Marine Detonation移除Ravager，原Bile骰子和伤亡顺序保留，token按后继移除。Drone使用／拒绝各31／29签名动作，使用确由Trooper Detonation移除无人机。四个分支共112动作、四个完整回合、幂等与冷重放全部通过；两种拒绝分支均实际出现伤亡前反应窗口。

无人机原先已分配自身伤亡的房间保留作对照，不计“Detonation实际移除来源”通过。Vehicle Plating不适用于Structure；第二目标的护甲池已正常进入before-armour检查，原先拟用Armory保护无人机的方案不成立，含该输入的房间只证明拒绝边界，没有修改Structure规则。

严格使用分支采用开发夹具身份选择：先在内存执行11个不掷骰的原生设置动作，选择固定matchId，再创建持久房间。6个候选身份中首个满足自身5HITS仅造成2点伤害的身份，其实际签名骰为`[1,6,6,3,6]`。随后照常结算感染步兵伤亡、Detonation和原父节点；未修改HMAC、骰子算法、钥匙或已有房间，冷重放核对实际骰与预测一致。这是开发分支覆盖，不能当作生产随机公平性验收。

另一个实际失败来自Web签名前缀中新增的Drone：恢复工厂把三枚在场棋子当成两枚原始购买棋子，导致购买审计拒绝。工程恢复入口现保留原始Native初始化状态，并核对签名前缀状态、来源绑定、五组数据包、军表审计及原运行时哈希。错误状态、生成单位包或运行时绑定均拒绝，正式Match入口不放宽。[生成前缀只读审计](evidence/generated-prefix.public.json)和[双席对照房](evidence/detonation-delayed-control-web.public.json)已通过，后者5次显式确认、冷重放和席位恢复；不替代严格来源阵亡主门。

## 实现范围

保存`pendingCorrosiveBileResolution`和`pendingSabotageDronePhaseEnd`，与原自动命中槽一同暂停。子HITS不能推进这些父队列；原批次恢复后，原生所有者继续完成自己的工作队列。父来源阵亡不重新查询或重新发动其能力。各已分配模型仍留场，且不可再次分配给子HITS。

共享工程回合入口显式核对Bile／Drone的来源政策和实际Native消费者，按contract1.2绑定；Drone阶段末完成后使用共享阶段完成内核，解除延迟后才进入Combat。既有政策及未声明这两种时点的工程回合保持原描述符。

逐ID范围：Marine接Bile，Trooper接Drone；Bile、Have a Nice Day与Griffin复用既有原子，属于新组合。新增完整原子0，Detonation仍待Storm／Photon／Disengage／Consume及后续新单位组合，不能计完整。

## 发布依赖与兼容

Drone原生工厂要求冻结FAQ1.3的来源引用。旧工程V2只有core引用，保留V2供原房间绑定，在工程V3加入FAQ1.3，并核对原官方PDF的实际SHA256 `65cb2399c44e29b45d65faddbade7c72a46726e7b9c812e2c4af57c1704cc213`。Builder与单位特征按新release重编；V3进口Goliath／Tank各实付1BM、幂等和冷恢复已验，见[发布消费者](evidence/engineering-release-v3.public.json)。102/119的记录选择、39条来源隔离未扩张。

[旧Bile冷验](evidence/bile-legacy-cold.public.json)读取仓库内原`room.sqlite.gz`，只在本批build目录解压并以只读方式打开。Root3.28、5个原签名动作的描述符和Envelope保持一致，原压缩字节再核对不变，新动作0。没有把缺失原SQLite的旧Drone快照重建为原生数据库。

[消费者映射](evidence/detonation-delayed-consumers.public.json)和[工具闭环](evidence/detonation-delayed-harness.public.json)已生成：两个主Web房共9次显式确认，两个原来源均实际被Detonation移除，双席预览只读、重新进入和回放通过。[当前冷验](evidence/detonation-delayed-current-cold.public.json)覆盖本批四房及前批声明／Target两房，共148个原动作，描述符与Envelope完全一致，新动作0。12个来源已被原HITS预定移除的对照房共374动作单列，不计主门通过数，也未声称全部冷验。整版发布／Builder／大厅／媒体及500／2000分Web仍继续。80mm炮塔底座和感染步兵几何仍是工程估算；付费模型、K3、AI对局、复盘与生产发布保持暂停，模型调用0。

已核看390px手机证据：[Bile确认](evidence/detonation-bile-web-390.png)、[Drone反应](evidence/detonation-drone-web-390.png)。本批Web从已验证的签名Native前缀接续，不代替W4-04从Builder／大厅开始的500／2000分整场验收。5484本批服务已关闭。
