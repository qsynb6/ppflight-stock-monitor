/**
 * 产品配置
 * 定义需要监控的 VPS 产品列表
 * 
 * 字段说明：
 * - name: 套餐唯一名称/标识（用于日志和通知标题）
 * - url: 购买页面地址
 * - site: 站点标识（与 sites.config.js 中的域名对应）
 * - targetPackage: （针对 PPFlight 等聚合页面）要匹配的卡片/套餐关键词，例如 'LITE-S', 'GLOBAL S', 'LIFT'
 * - description: 套餐说明备注（通知中展示）
 */
export const PRODUCTS = [
    {
        name: 'PPFlight-US-LITE-S',
        url: 'https://www.ppflight.com/buy?locale=zh_CN',
        site: 'ppflight.com',
        targetPackage: 'LITE-S',
        description: 'PPFlight 美西三网优化 US LITE-S'
    },
    {
        name: 'PPFlight-GLOBAL-S',
        url: 'https://www.ppflight.com/buy?locale=zh_CN',
        site: 'ppflight.com',
        targetPackage: 'GLOBAL S',
        description: 'PPFlight 国际路由 GLOBAL S (年付特惠)'
    },
    {
        name: 'PPFlight-LIFT-S1',
        url: 'https://www.ppflight.com/buy?locale=zh_CN',
        site: 'ppflight.com',
        targetPackage: 'LIFT S1',
        description: 'PPFlight 美西精品三网直连 LIFT S1'
    }
];