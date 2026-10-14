/**
 * PPFlight / VPS 补货监控应用主类
 * 应用程序的主要入口和控制器
 */

import { StockChecker } from './core/StockChecker.js';
import { config } from './config/index.js';

export class CostinelApp {
    constructor(customConfig = null) {
        this.config = customConfig || config;
        this.checker = null;
    }

    /**
     * 启动应用（执行一次检测）
     */
    async start() {
        try {
            console.log('🚀 PPFlight VPS 补货监控哨兵启动中...\n');
            
            // 创建库存检查器
            this.checker = new StockChecker(this.config);
            
            // 初始化
            await this.checker.initialize();
            
            // 执行检查
            await this.checker.run();
            
        } catch (error) {
            console.error('❌ 应用启动失败:', error.message);
            if (process.env.DEBUG) {
                console.error(error.stack);
            }
            throw error;
        }
    }

    /**
     * 停止应用并清理资源
     */
    async stop() {
        if (this.checker) {
            await this.checker.cleanup();
        }
        console.log('\n👋 监控程序已退出');
    }

    /**
     * 运行一次检查（单次任务模式，适合 Crontab 调用）
     */
    static async runOnce(customConfig = null) {
        const app = new CostinelApp(customConfig);
        try {
            await app.start();
        } finally {
            await app.stop();
        }
    }

    /**
     * 启动守护监控轮询模式（常驻后台运行）
     */
    static async runDaemon(customConfig = null) {
        const app = new CostinelApp(customConfig);
        const intervalSec = app.config.checkIntervalSeconds || 60;
        console.log(`⏱️ 启动常驻轮询模式，检测间隔: ${intervalSec} 秒 (按 Ctrl+C 退出)\n`);
        
        let isRunning = true;
        const shutdown = async () => {
            if (!isRunning) return;
            isRunning = false;
            console.log('\n🛑 收到退出信号，正在释放资源并关闭...');
            await app.stop();
            process.exit(0);
        };

        process.on('SIGINT', shutdown);
        process.on('SIGTERM', shutdown);

        try {
            await app.start();

            while (isRunning) {
                console.log(`\n⏳ 等待 ${intervalSec} 秒后进行下一轮检测...`);
                await new Promise(resolve => setTimeout(resolve, intervalSec * 1000));
                if (!isRunning) break;

                try {
                    if (app.checker) {
                        await app.checker.run();
                    }
                } catch (err) {
                    console.error('⚠️ 本轮检测出现异常，将等待下一周期重试:', err.message);
                }
            }
        } finally {
            await app.stop();
        }
    }
}
