/**
 * 任务运行器类
 * 负责管理和执行任务队列，结合 StateTracker 防止重复通知
 */

import { Task } from './Task.js';
import { STOCK_STATUS } from '../constants/index.js';
import { StateTracker } from './StateTracker.js';

export class TaskRunner {
    constructor(browserService, notificationService, logger, stateTracker = null) {
        this.browserService = browserService;
        this.notificationService = notificationService;
        this.logger = logger;
        this.stateTracker = stateTracker || new StateTracker();
        this.tasks = [];
    }

    /**
     * 添加任务
     * @param {Object} product - 产品信息
     */
    addTask(product) {
        const task = new Task(product);
        this.tasks.push(task);
        return task;
    }

    /**
     * 执行所有任务
     * @param {Object} siteConfigs - 站点配置
     */
    async runAll(siteConfigs) {
        const headers = ['套餐名称', '检查状态', 'URL', '库存状态'];
        this.logger.printHeader(headers);

        for (let i = 0; i < this.tasks.length; i++) {
            const task = this.tasks[i];
            await this.runTask(task, siteConfigs);

            // 打印任务结果
            this.printTaskResult(task);

            // 如果不是最后一行，打印分隔线
            if (i < this.tasks.length - 1) {
                this.logger.printSeparator();
            }
        }
    }

    /**
     * 执行单个任务
     * @param {Task} task - 任务对象
     * @param {Object} siteConfigs - 站点配置
     */
    async runTask(task, siteConfigs) {
        task.start();

        try {
            const product = task.product;
            
            // 获取站点配置
            const siteConfig = this.getSiteConfig(product.site, siteConfigs);
            
            if (!siteConfig) {
                task.complete({
                    inStock: false,
                    message: STOCK_STATUS.CONFIG_ERROR,
                    url: product.url,
                    error: true
                });
                return;
            }

            // 执行库存检查
            const result = await this.browserService.checkStock(product, siteConfig);
            task.complete(result);

            // 通过状态追踪器判断是否需要触发通知（防止无休止重复骚扰）
            if (result.inStock && !result.error) {
                const needNotify = this.stateTracker.shouldNotify(product, result);
                if (needNotify) {
                    console.log(`\n🔔 [发现补货] 触发推送: ${product.name}`);
                    await this.notificationService.sendStockAlert(product, result.url);
                } else {
                    console.log(`ℹ️ [状态保持] ${product.name} 持续有货中，跳过重复通知`);
                }
            } else {
                // 记录缺货状态
                this.stateTracker.shouldNotify(product, result);
            }

        } catch (error) {
            task.fail(error);
            this.logger.printError(`任务执行失败: ${task.getProductName()}`, error);
        }
    }

    /**
     * 获取站点配置
     * @param {string} site - 站点域名
     * @param {Object} siteConfigs - 所有站点配置
     * @returns {Object|null}
     */
    getSiteConfig(site, siteConfigs) {
        // 尝试直接匹配
        if (siteConfigs[site]) {
            return siteConfigs[site];
        }

        // 尝试匹配带 app. 前缀的域名
        const appSite = `app.${site}`;
        if (siteConfigs[appSite]) {
            return siteConfigs[appSite];
        }

        // 尝试模糊匹配域名中的主域部分
        for (const [key, val] of Object.entries(siteConfigs)) {
            if (site.includes(key) || key.includes(site)) {
                return val;
            }
        }

        return null;
    }

    /**
     * 打印任务结果
     * @param {Task} task - 任务对象
     */
    printTaskResult(task) {
        const product = task.product;
        const result = task.result;

        let stockStatus = STOCK_STATUS.ERROR;
        if (result) {
            stockStatus = result.message;
        } else if (task.error) {
            stockStatus = `${STOCK_STATUS.ERROR}: ${task.error.message}`;
        }

        const row = [
            product.name,
            STOCK_STATUS.COMPLETED,
            result?.url || product.url,
            stockStatus
        ];

        this.logger.printRow(row);
    }

    getTasks() {
        return this.tasks;
    }

    getSuccessCount() {
        return this.tasks.filter(task => task.isSuccess()).length;
    }

    getFailureCount() {
        return this.tasks.filter(task => task.status === 'failed').length;
    }

    getInStockCount() {
        return this.tasks.filter(task =>
            task.result && task.result.inStock && !task.result.error
        ).length;
    }

    clear() {
        this.tasks = [];
    }
}
