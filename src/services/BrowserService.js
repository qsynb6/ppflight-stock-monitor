/**
 * 浏览器服务类
 * 封装 puppeteer-real-browser 浏览器操作，增强 Cloudflare Turnstile 绕过与定制套餐卡片检测
 */

import { connect } from 'puppeteer-real-browser';
import fs from 'fs';
import path from 'path';

export class BrowserService {
    constructor(config) {
        this.config = config || {};
        this.browser = null;
        this.page = null;
        this.initialized = false;
    }

    /**
     * 初始化浏览器
     */
    async initialize() {
        if (this.initialized) {
            return;
        }

        // 确保持久化目录存在，避免 chrome-launcher 报 ENOENT
        if (this.config.customConfig && this.config.customConfig.userDataDir) {
            const userDataDir = path.resolve(this.config.customConfig.userDataDir);
            if (!fs.existsSync(userDataDir)) {
                fs.mkdirSync(userDataDir, { recursive: true });
            }
        }

        try {
            const connectOptions = {
                headless: this.config.headless !== undefined ? this.config.headless : false,
                turnstile: this.config.turnstile !== undefined ? this.config.turnstile : true,
                executablePath: this.config.executablePath,
                disableXvfb: this.config.disableXvfb !== undefined ? this.config.disableXvfb : false,
                customConfig: this.config.customConfig || {},
                connectOption: this.config.connectOption || { defaultViewport: null },
                ignoreAllFlags: this.config.ignoreAllFlags !== undefined ? this.config.ignoreAllFlags : false
            };

            const response = await connect(connectOptions);
            this.browser = response.browser;
            this.page = response.page;
            this.initialized = true;
        } catch (error) {
            throw new Error(`浏览器初始化失败: ${error.message}`);
        }
    }

    /**
     * 创建或复用页面
     * @returns {Promise<Page>} Puppeteer 页面对象
     */
    async createPage() {
        if (!this.initialized) {
            await this.initialize();
        }

        let page;
        // 如果初始页面未关闭且处于空白页，复用初始页面
        if (this.page && !this.page.isClosed()) {
            page = this.page;
        } else {
            page = await this.browser.newPage();
        }

        if (this.config.userAgent) {
            await page.setUserAgent(this.config.userAgent);
        }

        return page;
    }

    /**
     * 等待 Cloudflare 验证通过
     * @param {Page} page 
     * @param {number} maxWaitMs 最长等待毫秒数
     */
    async waitForCloudflarePass(page, maxWaitMs = 30000) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            await new Promise(r => setTimeout(r, 1500));
            try {
                const title = await page.title();
                // 如果标题不包含常见验证提示，视为验证通过已进入原网页
                if (title && 
                    !title.includes('请稍候') && 
                    !title.includes('Just a moment') && 
                    !title.includes('Security') && 
                    !title.includes('安全验证') && 
                    !title.includes('Cloudflare')) {
                    return true;
                }
            } catch (err) {
                // 页面跳转时抛出的 Execution context was destroyed 属于正常跳转过程
            }
        }
        return false;
    }

    /**
     * 检查产品库存状态
     * @param {Object} product - 产品信息
     * @param {Object} siteConfig - 站点配置
     * @returns {Promise<Object>} 检查结果 { inStock: boolean, message: string, url: string, error?: boolean }
     */
    async checkStock(product, siteConfig) {
        const page = await this.createPage();

        try {
            // 打开产品页面
            await page.goto(product.url, { 
                waitUntil: 'domcontentloaded', 
                timeout: 60000 
            });

            // 等待可能的 Cloudflare 验证通过
            await this.waitForCloudflarePass(page, 30000);

            // 额外缓冲等待 SPA/前端组件渲染
            const waitTime = siteConfig.waitTime || 5000;
            await new Promise(resolve => setTimeout(resolve, waitTime));

            const currentUrl = page.url();

            // 再次确认是否被阻拦在 Cloudflare 验证页
            const finalTitle = await page.title();
            if (finalTitle.includes('请稍候') || finalTitle.includes('Just a moment') || finalTitle.includes('安全验证')) {
                return {
                    inStock: false,
                    message: 'Cloudflare 验证未通过(需人工过盾或等待冷却)',
                    url: currentUrl,
                    error: true
                };
            }

            // 分流处理：针对 PPFlight 聚合购买页与常规单品购买页
            if (siteConfig.type === 'ppflight') {
                return await this.checkPPFlightStock(page, product, siteConfig, currentUrl);
            } else {
                return await this.checkStandardStock(page, product, siteConfig, currentUrl);
            }

        } catch (error) {
            return {
                inStock: false,
                message: `检查失败: ${error.message.substring(0, 80)}`,
                url: product.url,
                error: true
            };
        } finally {
            // 保留页面或关闭多余页面
            if (page !== this.page) {
                await page.close().catch(() => {});
            }
        }
    }

    /**
     * PPFlight 专用套餐库存解析
     */
    async checkPPFlightStock(page, product, siteConfig, currentUrl) {
        const targetKeyword = (product.targetPackage || product.name || '').trim();
        const outOfStockKeywords = siteConfig.outOfStockKeywords || ['缺货', '售罄', '已售罄', 'Out of Stock', '无货'];
        const inStockKeywords = siteConfig.inStockKeywords || ['立即购买', '购买', '订购', 'Order', 'Buy Now', '立即选购'];

        const result = await page.evaluate(({ targetKeyword, outOfStockKeywords, inStockKeywords }) => {
            // 递归在页面中定位包含目标关键词的最贴近卡片/容器节点
            const allElements = Array.from(document.querySelectorAll('*'));
            const targetUpper = targetKeyword.toUpperCase();

            // 找出直接包含目标关键词的文本节点所在的元素
            const matchedLeafs = allElements.filter(el => {
                if (!el.children || el.children.length === 0) {
                    const text = (el.textContent || '').trim().toUpperCase();
                    return text.includes(targetUpper);
                }
                return false;
            });

            if (matchedLeafs.length === 0) {
                // 降级：检查所有可能包含文本的标签
                const matchedContainers = allElements.filter(el => {
                    const text = (el.innerText || '').toUpperCase();
                    return text.includes(targetUpper) && (el.className || '').toString().match(/card|item|plan|box|row|col/i);
                });
                if (matchedContainers.length > 0) {
                    matchedLeafs.push(matchedContainers[0]);
                }
            }

            if (matchedLeafs.length === 0) {
                return {
                    found: false,
                    message: `页面中未找到匹配的套餐卡片: [${targetKeyword}]`
                };
            }

            // 从匹配到的节点向上寻找卡片容器（通常距离叶子节点 2-6 层）
            let card = matchedLeafs[0];
            let current = matchedLeafs[0];
            let depth = 0;
            while (current && current !== document.body && depth < 7) {
                // 如果发现该父节点包含购买/缺货按钮，则该节点为卡片
                const buttons = current.querySelectorAll('button, a, .btn, [role="button"]');
                if (buttons.length > 0) {
                    card = current;
                    break;
                }
                current = current.parentElement;
                depth++;
            }

            const cardText = (card.innerText || '').trim();
            const buttons = Array.from(card.querySelectorAll('button, a, .btn, [role="button"], input[type="submit"]'));

            // 1. 检查是否存在明确的“缺货/售罄”标识或按钮
            const hasOutOfStockText = outOfStockKeywords.some(kw => cardText.includes(kw));
            
            // 2. 检查按钮状态
            let hasEnabledBuyButton = false;
            let buttonTextFound = '';

            for (const btn of buttons) {
                const btnText = (btn.innerText || btn.value || '').trim();
                const isDisabled = btn.disabled || 
                    btn.classList.contains('disabled') || 
                    btn.getAttribute('aria-disabled') === 'true' ||
                    (btn.getAttribute('style') || '').includes('pointer-events: none');

                if (inStockKeywords.some(kw => btnText.includes(kw))) {
                    buttonTextFound = btnText;
                    if (!isDisabled && !outOfStockKeywords.some(kw => btnText.includes(kw))) {
                        hasEnabledBuyButton = true;
                    }
                }
            }

            // 最终综合判定
            if (hasOutOfStockText || (!hasEnabledBuyButton && buttonTextFound)) {
                return {
                    found: true,
                    inStock: false,
                    message: '[无货/缺货]',
                    cardTextSnippet: cardText.substring(0, 100)
                };
            }

            if (hasEnabledBuyButton) {
                return {
                    found: true,
                    inStock: true,
                    message: '√ 有货',
                    cardTextSnippet: cardText.substring(0, 100)
                };
            }

            // 若既无明确缺货也无明确购买按钮，返回卡片文本特征
            return {
                found: true,
                inStock: !hasOutOfStockText,
                message: !hasOutOfStockText ? '√ 可能有货(按钮未明确标识缺货)' : '[无货]',
                cardTextSnippet: cardText.substring(0, 100)
            };

        }, { targetKeyword, outOfStockKeywords, inStockKeywords });

        if (!result.found) {
            return {
                inStock: false,
                message: result.message,
                url: currentUrl,
                error: true
            };
        }

        return {
            inStock: result.inStock,
            message: result.message,
            url: currentUrl,
            error: false
        };
    }

    /**
     * 标准单品页面库存解析 (WHMCS等通用规则)
     */
    async checkStandardStock(page, product, siteConfig, currentUrl) {
        if (!siteConfig.stockSelector) {
            return {
                inStock: false,
                message: '缺少 stockSelector 配置',
                url: currentUrl,
                error: true
            };
        }

        const elementText = await page.evaluate((selector) => {
            const element = document.querySelector(selector);
            return element ? element.innerText : null;
        }, siteConfig.stockSelector);

        if (!elementText) {
            return {
                inStock: false,
                message: `未找到元素: ${siteConfig.stockSelector}`,
                url: currentUrl,
                error: true
            };
        }

        const outOfStock = elementText.includes(siteConfig.outOfStockText);
        const inStock = !outOfStock;

        return {
            inStock,
            message: inStock ? '√ 有货' : '[无货]',
            url: currentUrl,
            error: false
        };
    }

    /**
     * 关闭浏览器
     */
    async close() {
        if (this.browser) {
            try {
                const pages = await this.browser.pages();
                for (const page of pages) {
                    await page.close().catch(() => {});
                }
                await this.browser.close().catch(() => {});
            } catch (error) {
                console.error('关闭浏览器时出错:', error.message);
            } finally {
                this.browser = null;
                this.page = null;
                this.initialized = false;
            }
        }
    }

    isInitialized() {
        return this.initialized;
    }
}
