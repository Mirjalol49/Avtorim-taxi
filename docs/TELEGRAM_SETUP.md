# Telegram Bot Setup Guide

## 📱 Quick Start

### 1. Create Your Telegram Bot

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Choose a name: `Avtorim Taxi Driver Bot`
4. Choose a username: `avtorim_taxi_bot` (must end with "bot")
5. **Copy the API token** (looks like: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Configure the Server

**Option A: Environment Variable**
```bash
cd server
export TELEGRAM_BOT_TOKEN="your-token-here"
node server.js
```

**Option B: .env file** (recommended)
```bash
# Create .env file in server directory
echo "TELEGRAM_BOT_TOKEN=your-token-here" > server/.env

# Install dotenv
npm install dotenv

# Add to server.js (at the top):
require('dotenv').config();
```

### 3. Start the Server

```bash
cd server
node server.js
```

You should see:
```
✅ Telegram Bot is ACTIVE
📍 OwnTracks webhook: POST /api/owntracks/location
🤖 Telegram registration: POST /api/telegram/register
```

## 👤 Driver Setup

### Step 1: Driver Gets Their Telegram ID

1. Driver opens Telegram
2. Searches for your bot (e.g., `@avtorim_taxi_bot`)
3. Sends `/start` command
4. Bot responds with their **Telegram ID** (e.g., `123456789`)
5. Driver shares this ID with the administrator

### Step 2: Admin Registers the Driver

**Method 1: API Request**
```bash
curl -X POST http://localhost:3000/api/telegram/register \
  -H "Content-Type: application/json" \
  -d '{
    "driver_id": "driver123",
    "telegram_user_id": 123456789
  }'
```

**Method 2: Add Admin UI** (recommended - see below)

### Step 3: Driver Shares Live Location

1. Driver opens the bot chat
2. Clicks the **📎 attachment** icon
3. Selects **"Location"**
4. Chooses **"Share Live Location"**
5. Sets duration (1 hour recommended, max 8 hours)
6. Clicks **Send**

✅ Location now updates automatically on the admin dashboard!

## 🔧 Testing

### Test the Bot
```bash
# Check registered drivers
curl http://localhost:3000/api/telegram/drivers

# Check all locations
curl http://localhost:3000/api/drivers
```

### Driver Tests
1. Send `/status` to bot - should show registration status
2. Share live location - should save to database
3. Check admin dashboard - marker should appear on map

## 🎨 Admin UI for Driver Registration

Add this to your Admin dashboard:

```typescript
// In your admin panel component
const [telegramId, setTelegramId] = useState('');
const [selectedDriver, setSelectedDriver] = useState('');

const registerTelegramDriver = async () => {
  const response = await fetch('http://localhost:3000/api/telegram/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      driver_id: selectedDriver,
      telegram_user_id: parseInt(telegramId)
    })
  });
  
  if (response.ok) {
    alert('Driver registered successfully!');
  }
};

// UI
<div>
  <h3>Register Driver with Telegram</h3>
  <select onChange={(e) => setSelectedDriver(e.target.value)}>
    {drivers.map(d => <option value={d.id}>{d.name}</option>)}
  </select>
  <input 
    type="number" 
    placeholder="Telegram User ID"
    value={telegramId}
    onChange={(e) => setTelegramId(e.target.value)}
  />
  <button onClick={registerTelegramDriver}>Register</button>
</div>
```

## 📊 How It Works

```
[Driver's Phone] 
    ↓ Shares Live Location
[Telegram Servers]
    ↓ Sends updates (every few seconds)
[Your Bot via Polling]
    ↓ Processes location
[Your Database]
    ↓ Frontend fetches
[Admin Dashboard Map]
    ↓ Updates marker
✅ Real-time tracking!
```

## 🔐 Security Notes

- Store bot token in environment variables, never commit to Git
- Add `.env` to `.gitignore`
- Only trusted admins should register drivers
- Consider adding authentication to registration endpoint

## 🐛 Troubleshooting

**Bot not responding?**
- Check token is correct
- Ensure server is running
- Look for errors in console

**Location not saving?**
- Check driver is registered (`/status` command)
- Verify database schema updated
- Check server logs for errors

**Map not updating?**
- Check `is_live` field is 1 in database
- Verify frontend is fetching from correct endpoint
- Look at browser console for errors

## 🚀 Next Steps

1. ✅ Create bot with BotFather
2. ✅ Add token to server
3. ✅ Register first driver
4. ✅ Test location sharing
5. 🎯 Add admin UI for easy registration
6. 🎯 Update frontend to show "live" indicator
7. 🎯 Add proximity alerts (optional)
