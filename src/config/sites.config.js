/**
 * 站点配置
 * 定义不同 VPS 商家的库存检测规则
 */
export const SITE_CONFIGS = {
    'ppflight.com': {
        name: 'PPFlight',
        type: 'ppflight',
        waitTime: 5000,
        // 缺货关键词特征
        outOfStockKeywords: ['缺货', '售罄', '已售罄', 'Out of Stock', '无货', '暂时缺货', '补货中'],
        // 有货/购买按钮关键词特征
        inStockKeywords: ['立即购买', '购买', '订购', 'Order', 'Buy Now', '立即选购', '选择配置']
    },
    'bandwagonhost.com': {
        name: 'BandwagonHost',
        stockSelector: '#order-web20cart .errorbox',
        outOfStockText: 'Out of Stock',
        waitTime: 3000
    },
    'app.vmiss.com': {
        name: 'VMISS',
        stockSelector: 'h2',
        outOfStockText: 'Out of Stock',
        waitTime: 3000
    },
    'dmit.io': {
        name: 'DMIT',
        stockSelector: '#order-boxes h1',
        outOfStockText: 'Out of Stock',
        waitTime: 3000
    }
};
