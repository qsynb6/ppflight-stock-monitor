/**
 * Telegram 服务类
 * 负责处理 Telegram 消息发送
 */

import TelegramBot from 'node-telegram-bot-api';
import { TimeHelper } from '../utils/TimeHelper.js';

export class TelegramService {
    constructor(config) {
        this.config = config || {};
        this.bot = null;
        this.initialized = false;
        this.enabled = Boolean(this.config.botToken && this.config.chatId);
    }

    /**
     * 初始化 Telegram Bot
     */
    initialize() {
        if (!this.enabled) {
            console.log('ℹ️ [Telegram] 未配置 BOT_TOKEN 或 CHAT_ID，跳过 Telegram 推送');
            return false;
        }

        try {
            this.bot = new TelegramBot(this.config.botToken, { polling: false });
            this.initialized = true;
            return true;
        } catch (error) {
            console.error('[Telegram] 初始化失败:', error.message);
            this.initialized = false;
            return false;
        }
    }

    /**
     * 发送消息
     * @param {string} message - 消息内容
     * @returns {Promise<boolean>} 是否发送成功
     */
    async sendMessage(message) {
        if (!this.initialized || !this.bot) {
            return false;
        }

        try {
            await this.bot.sendMessage(this.config.chatId, message, {
                parse_mode: this.config.parseMode || 'HTML',
                disable_web_page_preview: this.config.disableWebPagePreview || false
            });
            console.log('✅ [Telegram] 补货消息发送成功');
            return true;
        } catch (error) {
            console.error('[Telegram] 发送消息失败:', error.message);
            return false;
        }
    }

    /**
     * 发送库存通知
     * @param {Object} product - 产品信息
     * @param {string} url - 产品页面 URL
     * @returns {Promise<boolean>} 是否发送成功
     */
    async sendStockAlert(product, url) {
        if (!this.initialized) return false;
        const message = `
🎉 <b>${product.site}</b> 补货上架！

📦 <b>套餐名称:</b> ${product.name}
📝 <b>配置说明:</b> ${product.description || '无'}
🔗 <b>购买链接:</b> ${url || product.url}
⏰ <b>检测时间:</b> ${TimeHelper.getChinaTime()}

⚡ 速度前往抢购！
`;
        return await this.sendMessage(message);
    }

    /**
     * 发送错误通知（可选）
     * @param {string} errorMessage - 错误信息
     * @returns {Promise<boolean>} 是否发送成功
     */
    async sendErrorAlert(errorMessage) {
        if (!this.initialized) return false;
        const message = `
⚠️ <b>VPS 监控异常</b>

错误信息: ${errorMessage}
发生时间: ${TimeHelper.getChinaTime()}
`;
        return await this.sendMessage(message);
    }
}
