import dotenv from 'dotenv';
dotenv.config();

import { NotificationService } from './src/services/NotificationService.js';
import { config } from './src/config/index.js';

async function testNotify() {
    console.log('🔔 ====== 测试通知渠道联通性 ======');
    console.log(`Telegram 配置状态: ${config.telegram.botToken ? '已配置 Token' : '未配置'}`);
    console.log(`Bark 配置状态: ${config.bark.key ? '已配置 Key' : '未配置'}`);
    console.log('====================================\n');

    const notifier = new NotificationService(config);
    notifier.initialize();

    const mockProduct = {
        name: 'PPFlight-US-LITE-S [联通性测试]',
        site: 'ppflight.com',
        description: '用于验证通知通道是否正常工作的测试消息',
        url: 'https://www.ppflight.com/buy?locale=zh_CN'
    };

    console.log('\n🚀 正在发送测试补货消息...');
    const result = await notifier.sendStockAlert(mockProduct, mockProduct.url);

    if (result) {
        console.log('\n🎉 测试消息已成功发出！请检查您的 Telegram 客户端或 iOS Bark App。');
    } else {
        console.log('\n⚠️ 测试未成功发出，请检查 .env 文件中的 TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID 或 BARK_KEY 配置。');
    }
}

testNotify();
