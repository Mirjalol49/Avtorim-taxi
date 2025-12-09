const { Telegraf } = require('telegraf');

const token = '8003294766:AAGuNAQ844L1-fHHBVvuckjxgm9bXXRumig';
const bot = new Telegraf(token);

console.log('Testing Bot Launch...');

bot.start((ctx) => ctx.reply('Hello'));

bot.launch()
    .then(() => console.log('✅ Bot launched successfully!'))
    .catch((err) => console.error('❌ Bot failed:', err));

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
