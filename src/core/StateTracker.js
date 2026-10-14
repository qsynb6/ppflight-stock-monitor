/**
 * 状态追踪器
 * 负责记录上一次检查的库存状态，防止在持续有货时每分钟重复轰炸通知
 */

import fs from 'fs';
import path from 'path';

export class StateTracker {
    constructor(stateFilePath) {
        this.stateFilePath = stateFilePath || path.resolve('data/stock_state.json');
        this.state = {};
        this.load();
    }

    /**
     * 读取状态文件
     */
    load() {
        try {
            const dir = path.dirname(this.stateFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }

            if (fs.existsSync(this.stateFilePath)) {
                const data = fs.readFileSync(this.stateFilePath, 'utf8');
                this.state = JSON.parse(data);
            } else {
                this.state = {};
            }
        } catch (error) {
            console.warn(`[StateTracker] 读取状态文件异常: ${error.message}，使用空状态`);
            this.state = {};
        }
    }

    /**
     * 保存状态文件
     */
    save() {
        try {
            const dir = path.dirname(this.stateFilePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2), 'utf8');
        } catch (error) {
            console.error(`[StateTracker] 写入状态文件失败: ${error.message}`);
        }
    }

    /**
     * 判断是否需要发送补货通知
     * 规则：
     * 1. 如果当前无货或发生错误：更新状态为无货，不发送
     * 2. 如果当前有货且上次记录也是有货：跳过（防止重复骚扰）
     * 3. 如果当前有货且（上次无货 或 首次检测）：标记需要发送通知！
     * 
     * @param {Object} product - 产品信息
     * @param {Object} checkResult - 检查结果 { inStock: boolean, error?: boolean }
     * @returns {boolean} 是否需要触发通知
     */
    shouldNotify(product, checkResult) {
        const key = `${product.site}_${product.targetPackage || product.name}`;
        const previous = this.state[key];

        if (checkResult.error) {
            // 出错时不修改旧有状态，避免波动
            return false;
        }

        if (!checkResult.inStock) {
            // 记录为无货
            this.state[key] = {
                inStock: false,
                lastChecked: new Date().toISOString()
            };
            this.save();
            return false;
        }

        // 当前有货 (inStock === true)
        const wasInStock = previous && previous.inStock === true;

        this.state[key] = {
            inStock: true,
            lastChecked: new Date().toISOString(),
            lastNotified: wasInStock ? previous.lastNotified : new Date().toISOString()
        };
        this.save();

        if (wasInStock) {
            // 已经是持续有货状态，不再重复骚扰
            return false;
        }

        // 状态转变为有货，触发补货通知！
        return true;
    }
}
