/**
 * 通知服务类
 * 统一抽象通知层，支持 Telegram 与 Bark (iOS) 双通道推送
 */

import { TelegramService } from './TelegramService.js';
import { BarkService } from './BarkService.js';

export class NotificationService {
    constructor(config) {
        this.config = config;
        this.services = [];
        this.initialized = false;
    }

    /**
     * 初始化通知服务
     */
    initialize() {
        // 1. 初始化 Telegram 服务
        if (this.config.telegram && this.config.telegram.botToken && this.config.telegram.chatId) {
            const telegramService = new TelegramService(this.config.telegram);
            if (telegramService.initialize()) {
                this.services.push({
                    name: 'Telegram',
                    service: telegramService
                });
            }
        }

        // 2. 初始化 Bark 服务 (iOS 推送)
        if (this.config.bark && this.config.bark.key) {
            const barkService = new BarkService(this.config.bark);
            this.services.push({
                name: 'Bark',
                service: barkService
            });
            console.log('✅ [Bark] iOS 推送服务已就绪');
        }

        if (this.services.length === 0) {
            console.warn('⚠️ [通知] 未配置任何可用通知渠道 (Telegram / Bark)，监控结果将仅在控制台显示');
        } else {
            console.log(`📢 [通知] 已激活通知通道: ${this.services.map(s => s.name).join(', ')}`);
        }

        this.initialized = true;
    }

    /**
     * 获取已启用的通知渠道名称列表
     * @returns {string[]}
     */
    getEnabledServices() {
        return this.services.map(s => s.name);
    }

    /**
     * 发送库存通知到所有已启用的渠道
     * @param {Object} product - 产品信息
     * @param {string} url - 产品页面 URL
     * @returns {Promise<boolean>} 是否至少有一个渠道发送成功
     */
    async sendStockAlert(product, url) {
        if (!this.initialized) {
            console.warn('[通知] 通知服务未初始化');
            return false;
        }

        if (this.services.length === 0) {
            return false;
        }

        const results = await Promise.allSettled(
            this.services.map(({ name, service }) =>
                service.sendStockAlert(product, url)
                    .then(success => ({ name, success }))
            )
        );

        let hasSuccess = false;
        results.forEach(res => {
            if (res.status === 'fulfilled' && res.value.success) {
                hasSuccess = true;
            } else if (res.status === 'rejected') {
                console.error(`[通知] 发送失败: ${res.reason?.message || res.reason}`);
            }
        });

        return hasSuccess;
    }

    /**
     * 发送通用消息到所有渠道
     * @param {string} message - 消息内容
     * @returns {Promise<boolean>} 是否至少有一个渠道发送成功
     */
    async sendMessage(message) {
        if (!this.initialized || this.services.length === 0) {
            return false;
        }

        const results = await Promise.allSettled(
            this.services.map(({ service }) => {
                if (typeof service.sendMessage === 'function') {
                    return service.sendMessage(message);
                }
                return Promise.resolve(false);
            })
        );

        return results.some(r => r.status === 'fulfilled' && r.value);
    }

    /**
     * 发送错误通知
     * @param {string} errorMessage - 错误信息
     * @returns {Promise<boolean>} 是否至少有一个渠道发送成功
     */
    async sendErrorAlert(errorMessage) {
        if (!this.initialized || this.services.length === 0) {
            return false;
        }

        const results = await Promise.allSettled(
            this.services.map(({ service }) => {
                if (typeof service.sendErrorAlert === 'function') {
                    return service.sendErrorAlert(errorMessage);
                }
                return Promise.resolve(false);
            })
        );

        return results.some(r => r.status === 'fulfilled' && r.value);
    }

    /**
     * 测试所有已配置的通知渠道
     */
    async testAll() {
        console.log('🧪 开始测试已启用的通知渠道...');
        for (const { name, service } of this.services) {
            console.log(`➡️ 正在测试 [${name}] ...`);
            if (typeof service.testConnection === 'function') {
                await service.testConnection();
            } else if (typeof service.sendMessage === 'function') {
                await service.sendMessage('🎉 <b>VPS 监控测试通知</b>\n通知渠道配置成功！');
            }
        }
    }
}
