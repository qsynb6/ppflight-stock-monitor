/**
 * Bark 推送服务类 (iOS 即时推送)
 * 封装向 Bark App 发送通知的逻辑
 */

export class BarkService {
    constructor(config) {
        this.config = config;
        this.server = (config.server || 'https://api.day.app').replace(/\/+$/, '');
        this.key = config.key || '';
        this.group = config.group || 'VPS库存监控';
        this.sound = config.sound || 'minuet';
        this.enabled = Boolean(config.key);
    }

    /**
     * 发送补货通知
     * @param {Object} product - 产品信息
     * @param {string} url - 购买链接
     * @returns {Promise<boolean>}
     */
    async sendStockAlert(product, url) {
        if (!this.enabled) {
            return false;
        }

        const title = `🚨 [补货提醒] ${product.name} 有货啦！`;
        const body = `商家/站点: ${product.site}\n套餐说明: ${product.description || product.name}\n检测时间: ${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`;
        const targetUrl = url || product.url;

        return this.sendPush({
            title,
            body,
            url: targetUrl,
            group: this.group,
            sound: this.sound,
            icon: 'https://www.ppflight.com/favicon.ico'
        });
    }

    /**
     * 底层推送接口 (调用 Bark HTTP API)
     * @param {Object} params - 推送参数
     * @returns {Promise<boolean>}
     */
    async sendPush({ title, body, url, group, sound, icon }) {
        if (!this.key) {
            console.warn('⚠️ [Bark] 未配置 BARK_KEY，跳过 Bark 推送');
            return false;
        }

        const endpoint = `${this.server}/push`;
        const payload = {
            device_key: this.key,
            title,
            body,
            url,
            group: group || this.group,
            sound: sound || this.sound,
            icon: icon || undefined
        };

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (response.ok && data.code === 200) {
                console.log(`✅ [Bark] 补货通知发送成功: ${title}`);
                return true;
            } else {
                console.error(`❌ [Bark] 推送返回错误:`, data);
                return false;
            }
        } catch (error) {
            console.error(`❌ [Bark] 发送推送请求异常: ${error.message}`);
            return false;
        }
    }

    /**
     * 测试 Bark 连通性
     */
    async testConnection() {
        if (!this.enabled) {
            console.log('ℹ️ [Bark] 未设置 BARK_KEY，跳过测试');
            return false;
        }
        return this.sendPush({
            title: '🎉 VPS 监控测试通知',
            body: '恭喜！Bark 推送服务配置成功，监控就绪。',
            url: 'https://www.ppflight.com/buy?locale=zh_CN'
        });
    }
}
