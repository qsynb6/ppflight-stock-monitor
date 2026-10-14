#!/usr/bin/env node

/**
 * PPFlight / VPS 补货监控哨兵
 * 入口文件
 */

import { CostinelApp } from './app.js';
import { config } from './config/index.js';

async function main() {
    try {
        const runMode = (process.env.RUN_MODE || config.runMode || 'once').toLowerCase();
        
        if (runMode === 'daemon') {
            await CostinelApp.runDaemon();
        } else {
            await CostinelApp.runOnce();
            process.exit(0);
        }
    } catch (error) {
        console.error('\n💥 程序执行出错:', error.message);
        process.exit(1);
    }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
    console.error('\n💥 未捕获的异常:', error.message);
    process.exit(1);
});

// 处理未处理的 Promise 拒绝
process.on('unhandledRejection', (reason, promise) => {
    console.error('\n💥 未处理的 Promise 拒绝:', reason);
    process.exit(1);
});

// 执行主函数
main();
