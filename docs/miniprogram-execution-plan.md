# 喵格测试 · 微信小程序开发执行文档 v1

> **本文档的读者是执行开发的 AI Agent（Claude Code / Codex）。**
> 产品决策已全部完成，本文档是唯一任务书：技术选型、接口契约、数据库设计、分期计划均已定死。
> 你的职责是按阶段实现并通过验收，**不要重新设计架构、不要更换选型、不要发明新功能**。

---

## 0. 阅读指南（执行前必读）

1. 先通读本文档，再读「§16 输入材料清单」中列出的参考源码与内容库。
2. **UI/交互/文案的唯一真源**是现有 H5 v2（`v2/` 目录）：小程序版是它的移植 + 前后端分离 + 真支付 + 真生图。页面长什么样、点什么出什么，一切以 v2 实际行为为准。
3. 遇到规则不明确的地方：在仓库根目录 `QUESTIONS.md` 记录问题，用 mock/占位继续推进，**不要猜测业务规则**（尤其是价格、解锁范围、文案）。
4. 每完成一个阶段：更新 `PROGRESS.md`（阶段号/完成项/自测结果/遗留问题）。
5. 真实资质信息（AppID、商户号等）见「§13 配置占位表」，未提供的用环境变量占位 + mock 实现，并在代码中标注 `// TODO(config)`。

---

## 1. 项目背景

- 产品：猫咪 MBTI 性格测试（档案局世界观：测试=行为观察建档，结果=《猫咪MBTI猫格证》）。
- 现状：H5 版已完整上线（https://xinyuxinsheng.github.io/cat-mbti/v2/），含全部产品功能，但为纯前端演示版——付费是模拟的、内容库全在前端、无登录无后端。
- 目标：微信小程序正式版，**一步到位全功能上线**：真实登录、真实微信支付、真实 AI 生图、付费内容服务端化、分享回流、埋点、极简 admin。
- 未来：抖音/小红书小程序（本期不做，但架构须为此收敛平台差异）。

## 2. 技术选型（已定死，不可更换）

| 层 | 选型 | 理由 |
|---|---|---|
| 小程序前端 | **Taro 4 + React 18 + TypeScript** | 跨端（未来抖音/小红书）、类型安全 |
| 后端 | **Node 20 + TypeScript + Fastify** | 轻、快、类型安全 |
| ORM / DB | **Prisma + MySQL 8** | 迁移可控 |
| 对象存储 | 腾讯云 COS（用户上传照片、生成的写真、分享图） | 与服务器同云 |
| 部署 | 腾讯云轻量服务器 + Docker Compose（server + mysql） | 用户已选自建路线 |
| 认证 | 微信 code2Session + 自签 JWT（7 天） | 无感登录 |
| 生图 | **Provider 适配器**，首个实现为 OpenAI 兼容中转 API | 见 §9 |
| 仓库结构 | pnpm monorepo | 见下 |

```
cat-mbti-app/                  ← 新建独立仓库（不动现有 H5 仓库）
├── apps/
│   ├── mini/                  # Taro 小程序
│   └── server/                # Fastify 服务端
├── packages/
│   └── shared/                # 共享：类型定义、计分逻辑、题库、免费文案、相性算法
├── docker-compose.yml
├── PROGRESS.md
└── QUESTIONS.md
```

## 3. 前后端数据切分（安全边界，本项目最重要的一张表）

| 数据/逻辑 | 位置 | 说明 |
|---|---|---|
| 24 道题库、计分算法、判型 | 前端（shared） | 移植自 `cats.js`，可公开 |
| 16 型免费文案（名称/标签/描述/语录/优缺点） | 前端（shared） | 移植自 `cats.js` |
| 16 只 SVG 猫形象 | 前端 | |
| 猫猫配对免费层（缘分值/称号/锐评算法） | 前端（shared） | 移植自 `pairing.js` |
| 人猫适配打分算法 | 前端（shared） | 移植自 v2/app.js `humanCatScore`（含 42~98 重映射） |
| 词典样章（每型前 2 条） | 前端 | 免费试阅用 |
| **深度内容库全量**（词典 12 条/红黑榜/养护） | **仅服务端** | `docs/content/deep-content.json`，按权益鉴权下发 |
| **两猫深度库**（维度块/冲突/和平） | **仅服务端** | `compare-content.json`，服务端完成拼装后下发结果 |
| **人猫深度库**（维度块/权力/雷区/讨好/名场面） | **仅服务端** | `humancat-content.json`，同上 |
| 拼装规则引擎（when 求值） | 服务端 | 移植自 v2/app.js，规则见 `assembly-rules.md` |
| 支付、订单、权益 | 仅服务端 | |
| 生图 API Key、内容安全调用、小程序码生成 | 仅服务端 | |
| 用户/档案/好友关系 | 服务端 DB（前端仅缓存） | |

**红线：`deep-content.json`、`compare-content.json`、`humancat-content.json` 的付费部分不得以任何形式进入小程序包或前端可达的静态资源。** 交付前跑检查脚本 grep 小程序构建产物确认。

## 4. SKU 与解锁规则

| SKU | 价格（分） | 范围 | 内容 |
|---|---|---|---|
| `deep_file` | 990 | **按猫**（绑定 cat_id） | 深度档案（词典12+红黑榜+养护）+ 写真棚资格（含 1 次免费重拍） |
| `compare_unlimited` | 990 | 全局（按用户） | 两猫深度对比，无限次 |
| `humancat` | 1990 | 全局（按用户） | 人猫适配完整解析，任意组合 |
| `photo_retake` | 390 | 按猫 | 写真额外重拍一次（免费重拍用完后） |

划线价统一 ¥39.9（`humancat` 划线 ¥79）。所有金额存储用**分**（int）。
**iOS 规避**：`wx.getSystemInfo` 判 iOS 时隐藏所有价格与支付按钮，付费区显示「iOS 暂不支持解锁，请在安卓设备或联系客服」占位文案（文案后续可调，入口开关做成服务端下发的配置项 `iosPayEnabled`）。

## 5. 数据库设计（Prisma schema 的语义版）

```
users        id PK · openid UNIQUE · share_code UNIQUE(8位短码) · created_at · last_seen_at
cats         id PK · user_id FK · name · breed · mbti CHAR(4) · scores JSON · file_no ·
             photo_status ENUM(none|making|done) · photo_url · created_at
entitlements id PK · user_id FK · sku · cat_id NULLABLE · order_id FK · created_at
             UNIQUE(user_id, sku, cat_id)
orders       id PK · out_trade_no UNIQUE · user_id FK · sku · cat_id NULLABLE ·
             amount_fen INT · status ENUM(pending|paid|closed|refunded) ·
             transaction_id · prepay_id · created_at · paid_at
friends      id PK · user_id FK(接收方) · from_user_id FK(分享方) ·
             cat_name · cat_mbti CHAR(4) · created_at
             UNIQUE(user_id, from_user_id, cat_name)
photo_jobs   id PK · user_id FK · cat_id FK · status ENUM(queued|running|done|failed) ·
             is_retake BOOL · input_keys JSON(COS keys) · output_keys JSON ·
             provider · error · created_at · finished_at
events       id PK · user_id NULLABLE · event VARCHAR(64) · params JSON · created_at
             INDEX(event, created_at)
```

类型占比：从 `cats` 表按 mbti 聚合（`GET /api/stats/types`），总量 < 500 时前端继续用预置 RARITY 表，≥500 切真实数据（阈值做成配置）。

## 6. API 契约（全量，实现不得增删改语义）

鉴权：除 `login`、`pay/notify`、`admin` 外全部要求 `Authorization: Bearer <JWT>`。响应统一 `{code:0, data} | {code:非0, message}`。

```
POST /api/login              {code}                    → {token, user:{id, shareCode}}
GET  /api/me                                           → {user, cats:[...摘要], entitlements:[{sku,catId}]}

POST /api/cats               {name, breed, mbti, scores} → {cat}   # 计分在前端完成，服务端校验 mbti 与 scores 一致性
GET  /api/cats                                          → {cats:[...]}
GET  /api/cats/:id                                      → {cat}

GET  /api/content/deep/:catId                           → 需 deep_file(catId) 权益
       → {dictionary:[12], red:[4], black:[4], care:[6]}
GET  /api/content/compare?a=MBTI&b=MBTI                 → 需 compare_unlimited
       → {blocks:[{kind:'dim|conflict|peace', title, text, science?, ref?}]}   # 服务端按 assembly-rules 拼装
GET  /api/content/humancat?h=MBTI&c=MBTI                → 需 humancat
       → {blocks:[{kind:'dim|power|mines|please|weekly', ...}]}

POST /api/orders             {sku, catId?}              → {orderId, payParams:{timeStamp,nonceStr,package,signType,paySign}}
POST /api/pay/notify         (微信支付回调，验签+解密)     → 更新订单、写入 entitlement（幂等）
GET  /api/orders/:id                                    → {status}   # 前端支付后轮询

POST /api/photo/upload       (wx.uploadFile, ≤3张≤5MB)  → {keys:[...]}   # 服务端转存 COS + 逐张内容安全检测
POST /api/photo/jobs         {catId, keys:[1..3]}       → 需 deep_file 权益；扣重拍次数 → {jobId}
GET  /api/photo/jobs/:id                                → {status, outputUrls?}

POST /api/friends/bind       {shareCode, catName, catMbti} → 绑定分享者与我；双向各写一条 friends
GET  /api/friends                                       → {friends:[...]}

POST /api/events/batch       [{event, params, ts}]      → 200   # 埋点批量上报，失败静默
GET  /api/stats/types                                   → {total, dist:{ESTJ:n,...}}

POST /api/share/image        {catId, kind:'cert|photo'} → {url}  # 服务端 sharp 合成分享图 + 带参小程序码(scene=s:<shareCode>)

GET  /admin/*                Basic Auth(ADMIN_USER/PASSWORD)，见 §12
```

## 7. 核心时序（实现按此走，不要自创流程）

**登录**：小程序启动 → `wx.login` 拿 code → `POST /api/login` → 服务端 code2Session（appid+secret+code）→ upsert user（生成 shareCode）→ 签 JWT 返回 → 前端存 storage，所有请求带上；401 时静默重登。全程无用户可见弹窗。

**支付**：点解锁 → `POST /api/orders` → 服务端调微信支付 V3「JSAPI 下单」（openid 从 JWT 取）→ 返回前端 `wx.requestPayment(payParams)` → 用户完成支付 → 微信回调 `POST /api/pay/notify`（验签、解密、**幂等**处理：orders.status pending→paid，写 entitlement）→ 前端 `requestPayment` success 后轮询 `GET /api/orders/:id` 至 paid → 刷新解锁区。超时 5 分钟未支付订单由定时任务关单。

**生图**：写真棚上传 1~3 张 → `photo/upload`（服务端每张先过 `mediaCheckAsync` 内容安全，违规拒收）→ `photo/jobs` 创建任务（校验权益+重拍次数）→ worker 调 Provider（§9）生成 → 结果存 COS → 更新 job/cat.photo_status → 前端 3s 轮询 job 状态（沿用 v2 冲印进度条交互）。

**分享回流绑定**：结果页/猫友圈点分享 → `onShareAppMessage` 返回 `path: 'pages/index/index?s=<shareCode>&n=<猫名>&m=<MBTI>'` + 分享图；分享图由 `POST /api/share/image` 合成（版式复刻 v2 的 drawShareCard/drawPhotoShare，Node 端用 sharp/canvas 实现，右下角小程序码 scene 带 shareCode）→ 好友打开小程序 onLoad 解析参数 → 登录完成后 `POST /api/friends/bind` → 好友的猫友圈出现分享者的猫（toast 提示，交互同 v2）。扫分享图上的小程序码走 `onLoad(options.scene)` 同样解析。

## 8. 页面清单（1:1 移植 v2，Taro 页面结构）

| 页面 | 对应 v2 | 备注 |
|---|---|---|
| pages/index（建档大厅） | view-landing | 走马灯保留前端构造数据；计数器=预置公式（后续切 stats 接口） |
| pages/test（行为观察） | view-test | 自动翻题、盖章动效、Tab 隐藏 |
| pages/result（档案核发） | view-result | 猫格证/悬浮双按钮/机密档案样章/解锁态 |
| pages/cabinet（档案柜） | view-archive | 三分区 + 写真状态条；数据源改服务端 |
| pages/mine（我的） | view-mine | 科学依据文献清单照搬 |
| pages/photo（写真棚） | view-photo | 上传/要素表/冲印状态机 |
| 分享图 | Canvas 逻辑上移服务端 | 前端只展示+保存（保存需 writePhotosAlbum 授权） |

视觉规范：档案馆风 design token（色板/字体/贴纸卡片样式）从 `v2/styles.css` 头部 `:root` 变量原样抄录；字体 ZCOOL QingKe HuangYou / Ma Shan Zheng 小程序不能在线加载 Google Fonts，改用 `wx.loadFontFace` 加载自托管字体文件（放 COS，subset 后 <2MB）或降级方案（衬线+加粗），在 P1 阶段先降级、P7 前定稿。

## 9. 生图 Provider 适配器（接口先行，Key 后配）

```ts
interface ImageGenProvider {
  generate(req: {
    inputImages: Buffer[];          // 用户照片 1~3 张
    prompt: string;                  // 由模板生成，见下
    n: number;                       // 默认 2
  }): Promise<{ images: Buffer[]; costHint?: number }>;
}
```
- 首个实现 `OpenAICompatProvider`：读 env `IMAGE_API_BASE / IMAGE_API_KEY / IMAGE_MODEL`（用户使用 OpenAI 兼容中转服务，参数上线前提供；开发期实现 `MockProvider` 返回占位图走通全链路）。
- Prompt 模板（可在 admin 配置表调整）：写实电影风三视图特摄，注入档案要素——猫名/MBTI 类型服装道具（16 型各一段服饰描述，从 v2 类型人设提炼）/品种花色/性格关键词。
- 产出图右下角合成水印「喵格研究所 · AI 生成」（合规：AI 生成内容标识）。
- 生成结果入库前过一次图片内容安全。
- 成本护栏：单 job 生成数固定 2 张；用户级日生成上限 5 次（env 可调）。

## 10. 微信平台接入清单

| 能力 | 接口/位置 | 状态 |
|---|---|---|
| 登录 | code2Session | 开发期用测试号可通 |
| 支付 | 微信支付 V3 JSAPI + 回调验签（商户证书/APIv3 密钥） | **商户号申请中，先 mock**：`PayProvider` 接口 + `MockPay`（下单即回调成功），真参数到位后切 `WxPay` 实现 |
| 内容安全 | msgSecCheck（猫名/昵称文本）、mediaCheckAsync（上传图片） | **必选**，P2 起接入 |
| 小程序码 | getUnlimitedQRCode(scene) | 服务端 access_token 管理（中控缓存，7000s 刷新） |
| 分享 | onShareAppMessage / onShareTimeline | |
| 隐私 | wx.requirePrivacyAuthorize + 后台《隐私保护指引》配置 | 收集：昵称(猫名不算个人信息但照片算)、相册（写真上传/保存）、设备信息 |
| 订阅消息 | 一个模板：写真生成完成通知 | P4，模板 ID 占位 |
| 类目 | 建议「工具>测评」+（若审核要求）「宠物」相关类目 | 提审时按驳回意见调整 |

## 11. 埋点事件表（⚠️ 本表需产品负责人确认后方可实现）

| 事件 | 触发 | 参数 | 用途 |
|---|---|---|---|
| app_launch | 小程序冷启动 | scene, share_from(shareCode?) | 渠道/回流分析 |
| test_start | 点开始建档 | breed | 漏斗起点 |
| test_quit | 答题中途退出 | question_index | 找流失题目 |
| test_complete | 出结果 | mbti | 完测率 |
| result_view | 结果页曝光 | mbti | |
| share_open | 打开分享面板/弹窗 | kind(cert/photo/invite) | 分享意愿 |
| share_done | onShareAppMessage 触发 | kind, channel | 裂变分母 |
| share_save | 保存分享图 | kind | |
| friend_bind | 好友绑定成功 | | 裂变分子（回流系数） |
| paywall_view | 付费区曝光 | sku | 转化漏斗 |
| paywall_click | 点解锁按钮 | sku | |
| pay_success | 支付成功 | sku, amount_fen | 收入 |
| pay_fail | 支付失败/取消 | sku, reason | |
| photo_enter / photo_upload / photo_generate / photo_done | 写真棚各步 | catId | 写真漏斗 |
| compare_run | 执行两猫对比 | | 功能使用率 |
| humancat_run | 执行人猫适配 | | |
| cabinet_view / mine_view | Tab 曝光 | | |

实现：前端 SDK 批量缓冲（10 条或 5s flush）→ `POST /api/events/batch`；同时保留微信自带「小程序数据分析」不冲突。

## 12. Admin 极简后台（服务端出一组只读页面，Basic Auth）

- `/admin`：今日/昨日/7日——新增用户、DAU（按 events 去重）、完测数、完测率、分享数、绑定数、各 SKU 付费单数与金额、写真生成数
- `/admin/funnel`：launch→test_start→test_complete→paywall_view→paywall_click→pay_success 漏斗
- `/admin/types`：16 型分布（即占比数据源）
- `/admin/orders`：订单列表（含退款状态，只读）
- 技术：服务端渲染简单 HTML 表格即可，不引前端框架。

## 13. 配置占位表（用户后续提供，全部走 env / .env.example 建齐）

| 变量 | 说明 | 状态 |
|---|---|---|
| WX_APPID / WX_SECRET | 小程序（企业主体，注册中） | ⏳ 用户提供 |
| WX_MCH_ID / WX_PAY_SERIAL / WX_PAY_PRIVATE_KEY / WX_PAY_APIV3_KEY | 微信支付商户（申请中） | ⏳ 用户提供 |
| PAY_NOTIFY_URL | https://<备案域名>/api/pay/notify | ⏳ 域名备案中 |
| IMAGE_API_BASE / IMAGE_API_KEY / IMAGE_MODEL | OpenAI 兼容中转 | ⏳ 用户提供 |
| COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION | 对象存储 | ⏳ 用户提供 |
| DATABASE_URL / JWT_SECRET / ADMIN_USER / ADMIN_PASSWORD | 服务端自身 | 执行期生成 |
| IOS_PAY_ENABLED / DAILY_PHOTO_LIMIT / TYPE_STATS_THRESHOLD | 业务开关 | 默认 false / 5 / 500 |

## 14. 分期执行计划（串行，每阶段有验收；勾完才进下一阶段）

**P0 脚手架（0.5 天）**：monorepo 建立、Taro 空应用可在微信开发者工具预览、Fastify healthz、Prisma 首个迁移、docker-compose 起 MySQL、`.env.example`、lint+tsc 通过。
✅ 验收：`pnpm dev:mini` 与 `pnpm dev:server` 均可启动；PROGRESS.md 建立。

**P1 前端全量移植（3~4 天）**：六个页面 + 组件 + 档案馆样式 token + 全部免费功能，数据走 `packages/shared` 内 mock service（接口签名 = §6 契约）。计分/配对/人猫算法从 H5 源码逐函数移植并**用对照测试保证一致**（同一输入，H5 与小程序输出一致，含 42~98 重映射、平局判温和侧）。
✅ 验收：开发者工具中走通「建档→24题→猫格证→样章→档案柜→对比→人猫→写真棚(mock)」全流程并逐页截图存 `PROGRESS.md`；构建产物 grep 确认无深度内容库字符串。

**P2 后端基础 + 登录 + 档案（2~3 天）**：users/cats/content 三组接口 + JWT + code2Session（无 appid 时 MockAuth：code 直接当 openid）+ 内容库入服务端 + 拼装引擎移植（when 求值器对 136+256 组合跑穷举测试，最少块数须 ≥ H5 版结论）。前端由 mock 切真接口。
✅ 验收：穷举测试通过；真机（或工具）建档后档案存服务端，重进小程序档案仍在。

**P3 支付 + 权益（2 天）**：orders/notify/entitlements、Mock→WxPay 双实现、iOS 隐藏逻辑、关单任务、`content/*` 接口鉴权生效。
✅ 验收：MockPay 下全流程解锁三种 SKU；notify 幂等测试（同一回调重放 3 次只解锁一次）；无权益调 content 接口返回 403。

**P4 生图链路（2 天）**：upload→COS→job→MockProvider→轮询→写真展示与重拍计数；OpenAICompatProvider 实现完毕但用 env 开关待激活；订阅消息占位。
✅ 验收：MockProvider 全链路真机跑通；重拍次数扣减正确；日限额生效。

**P5 分享与回流（1~2 天）**：服务端分享图合成（sharp，版式对照 v2 两张分享卡）、小程序码、onShare 双通道、shareCode 绑定、猫友圈接服务端。
✅ 验收：A 分享 → B 打开 → B 猫友圈出现 A 的猫且 A 侧也可见；分享图含可扫小程序码（无 appid 期间用占位图+TODO）。

**P6 埋点 + Admin（1 天）**：§11 事件表全埋 + admin 四页。
✅ 验收：手动走一遍全流程后 /admin/funnel 数字正确。

**P7 合规与提审准备（1 天 + 等待期）**：内容安全全覆盖复查、隐私弹窗与《隐私保护指引》文案、AI 生成标识、iOS 开关默认关、审核材料清单（类目/截图/测试账号说明）、真实配置替换 checklist。
✅ 验收：跑 `docs/launch-checklist.md`（执行期生成）全绿。

总工期估计：**10~14 个工作日**（不含资质等待与审核周期）。

## 15. 执行军规

1. 契约即法律：改 §6 任何接口先改本文档并在 PROGRESS.md 说明理由。
2. 内容库三个 JSON 是只读资产：不修改、不重排、不进前端包。
3. 密钥零硬编码：提交前 `git grep -iE "(sk-|APIv3|SECRET.*=.{8,})"` 自查。
4. 金额一律用分；订单号 out_trade_no 用 `MEOW+时间戳+随机`；回调幂等。
5. 每个阶段验收标准未全绿不得进入下一阶段；被阻塞（缺配置）时用 Mock 推进并记录 QUESTIONS.md。
6. UI 不确定时打开 H5 v2 对照，不要自由发挥；文案一字不改地从 v2 抄。
7. 单测最低要求：计分/判型、pairing、humanCatScore、when 求值器、支付回调幂等——这五处必须有测试。

## 16. 输入材料清单（执行模型需要访问的一切）

**参考仓库（只读）：https://github.com/xinyuxinsheng/cat-mbti**

| 材料 | 路径 | 用途 |
|---|---|---|
| H5 v2 全部源码 | `v2/`（index.html / app.js / styles.css / content.js） | UI/交互/文案/算法真源 |
| 题库+16型数据+计分 | `cats.js` | 移植到 shared |
| 猫猫配对算法 | `pairing.js` | 移植到 shared |
| 深度内容库 | `docs/content/deep-content.json` | 服务端资产 |
| 两猫/人猫内容库 | `docs/content/compare-content.json`、`humancat-content.json` | 服务端资产 |
| 拼装规则 | `docs/content/assembly-rules.md` | 服务端拼装引擎实现依据 |
| 人猫算法说明 | `docs/人猫匹配算法说明.md` | 移植校验依据 |
| 产品框架 | `docs/产品框架v3.md` | 背景理解（以本文档为准处从本文档） |
| 本执行文档 | `docs/miniprogram-execution-plan.md` | 任务书 |

**用户后续注入**：§13 配置占位表全部 ⏳ 项；生图中转服务的 base/key/model；备案完成的域名。

## 17. 用户侧并行待办（非开发任务，与开发同时推进）

1. 腾讯云：购买域名 → 企业实名 → 购买轻量服务器 → 提交 ICP 备案（**今天启动，2~3 周**）
2. 小程序注册完成后：获取 AppID/Secret；后台配置服务器域名（request/uploadFile 合法域名 = 备案域名）；配置《隐私保护指引》
3. 微信支付商户号下来后：关联小程序 AppID、下载证书、设置 APIv3 密钥
4. 确认 §11 埋点表（回复"确认"或改动项）
5. 提供生图中转服务的三个参数
6. 准备腾讯云 COS 桶
