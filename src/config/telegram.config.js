/**
 * Telegram 配置
 */

import dotenv from 'dotenv';
dotenv.config();

export const TELEGRAM_CONFIG = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    chatId: process.env.TELEGRAM_CHAT_ID || '',
    parseMode: 'HTML',
    disableWebPagePreview: false,
    enabled: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID)
};
