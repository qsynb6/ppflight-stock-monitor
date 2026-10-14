# PPFlight VPS 补货监控哨兵 (PPFlight Stock Monitor)

一款专门针对 [PPFlight 云服务器套餐与价格页](https://www.ppflight.com/buy?locale=zh_CN) 进行二次开发的自动化库存监控哨兵。

基于真实浏览器引擎（Puppeteer）与智能过盾架构，能够有效穿透 **Cloudflare WAF / Turnstile** 防御，实现毫秒级捕获上架信息，并通过 **Telegram Bot** 与 **Bark (iOS 即时推送)** 第一时间通知抢购。

---

## ✨ 核心特性

- 🛡️ **Cloudflare 穿透能力**：基于真实浏览器环境与持久化 Session，突破 Cloudflare Turnstile 挑战与 SPA 动态前端拦截。
- 🎯 **指定套餐精准监控**：支持在 `products.config.js` 中指定感兴趣的具体套餐（如 `LITE-S`, `GLOBAL S`, `LIFT` 系列），无需全量扫描。
- 🔔 **双通道即时提醒**：
  - **Telegram Bot**：支持 HTML 格式排版、直达购买链接与抢购提示。
  - **Bark (iOS 即时推送)**：支持 iOS 锁屏即时通知，自定义分组、角标、声音，点击通知即可一键跳转到官网购买页。
- 🧠 **智能防重复骚扰 (StateTracker)**：记录库存历史状态，仅在“缺货 → 补货上架”的状态变更瞬间触发推送，避免持续有货时每分钟被消息轰炸。
- 🔄 **双运行模式**：
  - **常驻轮询模式 (`RUN_MODE=daemon`)**：开箱即用，自带内置定时循环（默认 60 秒轮询一次）。
  - **单次触发模式 (`RUN_MODE=once`)**：执行一次后退出，适合无缝挂载在 Linux Crontab 或 Windows 任务计划程序中。

---

## 🚀 快速开始

### 1. 安装依赖

进入项目目录并安装依赖：

```bash
cd ppflight-stock-monitor
npm install
```

> **注意 (Linux 环境)**：如果在 Linux VPS (Ubuntu/Debian) 上无桌面环境运行，请先安装 Chrome 与 Xvfb：
> ```bash
> sudo apt update && sudo apt install -y xvfb
> wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
> sudo apt install -y ./google-chrome-stable_current_amd64.deb
> ```

---

### 2. 配置环境变量

复制配置文件模板：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填入您的通知密钥：

```ini
# 运行模式: daemon (后台持续监控) 或 once (单次运行)
RUN_MODE=daemon
CHECK_INTERVAL=60

# Bark 推送配置 (推荐 iOS 用户)
# 在 Bark App 首页获取您的 Device Key
BARK_KEY=your_bark_key_here
BARK_GROUP=PPFlight监控

# Telegram Bot 推送配置
# 向 @BotFather 创建机器人获取 Token，向 @userinfobot 获取您的 Chat ID
TELEGRAM_BOT_TOKEN=your_bot_token_here
TELEGRAM_CHAT_ID=your_chat_id_here
```

---

### 3. 测试通知渠道

在正式启动监控前，可一键测试 Telegram 和 Bark 是否能正常收到消息：

```bash
npm run test:notify
```

如果手机端成功弹出测试提醒，即说明推送通道已完全联通！

---

### 4. 调整需要监控的套餐

编辑 `src/config/products.config.js`，按需增删或修改您关心的套餐系列：

```javascript
export const PRODUCTS = [
    {
        name: 'PPFlight-US-LITE-S',
        url: 'https://www.ppflight.com/buy?locale=zh_CN',
        site: 'ppflight.com',
        targetPackage: 'LITE-S', // 匹配卡片关键词
        description: 'PPFlight 美西三网优化 US LITE-S'
    },
    {
        name: 'PPFlight-GLOBAL-S',
        url: 'https://www.ppflight.com/buy?locale=zh_CN',
        site: 'ppflight.com',
        targetPackage: 'GLOBAL S',
        description: 'PPFlight 国际路由 GLOBAL S (年付特惠)'
    }
];
```

---

### 5. 启动监控

#### 方式 A：常驻守护进程模式 (推荐)
```bash
npm start
# 或明确指定
npm run daemon
```

#### 方式 B：单次执行模式 (配合系统 Crontab)
```bash
npm run once
```

若使用 Linux Crontab，可添加如下定时任务（如每 2 分钟执行一次）：
```bash
*/2 * * * * cd /path/to/ppflight-stock-monitor && npm run once >> logs/cron.log 2>&1
```

---

## 📁 目录结构

```text
ppflight-stock-monitor/
├── data/                    # 持久化存储 (Chrome profile 与 stock_state.json)
├── src/
│   ├── config/
│   │   ├── bark.config.js   # Bark 推送配置
│   │   ├── telegram.config.js # Telegram 配置
│   │   ├── products.config.js # 监控的指定套餐列表
│   │   └── sites.config.js    # 站点规则定义
│   ├── core/
│   │   ├── StateTracker.js  # 库存状态追踪与防骚扰
│   │   ├── StockChecker.js  # 监控核心协调器
│   │   ├── Task.js          # 监控任务抽象
│   │   └── TaskRunner.js    # 任务调度与状态输出
│   ├── services/
│   │   ├── BarkService.js   # iOS Bark 推送服务
│   │   ├── TelegramService.js # Telegram 推送服务
│   │   ├── NotificationService.js # 统一多通道通知管理
│   │   └── BrowserService.js# 真实浏览器自动化与过盾
│   ├── utils/               # 日志与时间格式化工具
│   ├── app.js               # 应用主控制器
│   └── index.js             # 程序入口
├── test_notify.js           # 通知连通性测试脚本
├── package.json
└── README.md
```

---

## 📄 许可证

基于 [MIT License](LICENSE) 开源发布。
