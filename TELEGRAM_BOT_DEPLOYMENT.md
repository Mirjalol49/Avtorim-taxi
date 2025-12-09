# Telegram Bot Deployment Guide (Firebase Functions)

## Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Logged into Firebase: `firebase login`

## Step-by-Step Deployment

### 1. Install Function Dependencies
```bash
cd functions
npm install
cd ..
```

### 2. Set Telegram Bot Token
```bash
firebase functions:config:set telegram.token="YOUR_BOT_TOKEN_HERE"
```

Replace `YOUR_BOT_TOKEN_HERE` with your actual bot token from @BotFather.

### 3. Deploy Functions
```bash
firebase deploy --only functions
```

After deployment, you'll see output like:
```
Function URL (telegramBot): https://us-central1-YOUR-PROJECT.cloudfunctions.net/telegramBot
```

### 4. Set Webhook with Telegram
Run this command (replace the URL with your actual function URL):

```bash
curl -X POST "https://api.telegram.org/botYOUR_BOT_TOKEN/setWebhook?url=https://us-central1-YOUR-PROJECT.cloudfunctions.net/telegramBot"
```

You should see: `{"ok":true,"result":true,"description":"Webhook was set"}`

### 5. Update Your App's Notification URL
In `App.tsx`, update the salary notification endpoint:
```javascript
const apiUrl = 'https://us-central1-YOUR-PROJECT.cloudfunctions.net/sendSalaryNotification';
```

## Verification
1. Message your bot on Telegram - it should respond instantly
2. Pay a driver's salary in the app - they should receive a notification

## Troubleshooting
- View logs: `firebase functions:log`
- Check webhook status: `curl https://api.telegram.org/botYOUR_TOKEN/getWebhookInfo`

## Cost
Firebase free tier includes:
- 2 million function invocations/month
- 400,000 GB-seconds/month

This is MORE than enough for a taxi fleet bot.
