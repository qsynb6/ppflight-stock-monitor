import dotenv from 'dotenv';
dotenv.config();

/**
 * Bark 推送通知配置 (iOS 即时推送)
 */
export const BARK_CONFIG = {
    // Bark 设备 Key (在 Bark App 首页获取，如 https://api.day.app/YOUR_KEY/)
    key: process.env.BARK_KEY || '',
    
    // Bark 服务器地址 (默认官方服务器，如自建可替换)
    server: process.env.BARK_SERVER || 'https://api.day.app',
    
    // 通知分组
    group: process.env.BARK_GROUP || 'VPS库存监控',
    
    // 提示音 (例如: minuet, bell, glass, chime 等)
    sound: process.env.BARK_SOUND || 'minuet',
    
    // 是否启用 Bark 推送
    enabled: Boolean(process.env.BARK_KEY)
};
