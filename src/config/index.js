/**
 * 统一配置导出
 */

import { PRODUCTS } from './products.config.js';
import { SITE_CONFIGS } from './sites.config.js';
import { TELEGRAM_CONFIG } from './telegram.config.js';
import { BARK_CONFIG } from './bark.config.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 自动检测操作系统平台，如果在 Windows 上未设置 CHROME_PATH，则设为 undefined 让 chrome-launcher 自动定位
const defaultExecutablePath = process.env.CHROME_PATH || (process.platform === 'win32' ? undefined : '/usr/bin/google-chrome');

export const config = {
    // 产品配置
    products: PRODUCTS,
    
    // 站点配置
    sites: SITE_CONFIGS,
    
    // Telegram 配置
    telegram: TELEGRAM_CONFIG,

    // Bark 配置 (iOS 即时推送)
    bark: BARK_CONFIG,
    
    // 浏览器配置
    browser: {
        // puppeteer-real-browser 配置
        headless: process.env.HEADLESS === 'true' ? true : false,
        turnstile: true,                   // 自动处理 Cloudflare Turnstile
        executablePath: defaultExecutablePath,
        disableXvfb: process.platform === 'win32' ? true : (process.env.DISABLE_XVFB === 'true'),
        customConfig: {
            // 用户持久化目录，用于保留 cf_clearance cookie 与验证状态
            userDataDir: process.env.USER_DATA_DIR || path.join(__dirname, '../../data/chrome_profile')
        },
        connectOption: {
            defaultViewport: null
        },
        ignoreAllFlags: false
    },
    
    // 运行模式: 'once' (单次执行) 或 'daemon' (守护轮询模式)
    runMode: process.env.RUN_MODE || 'daemon',

    // 检查轮询间隔（秒，默认 60 秒）
    checkIntervalSeconds: parseInt(process.env.CHECK_INTERVAL || '60', 10),
    
    // 日志级别
    logLevel: process.env.LOG_LEVEL || 'info'
};
