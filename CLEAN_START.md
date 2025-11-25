# Clean Start Guide

Your app is now configured to start completely fresh! Here's what changed:

## What Was Removed ❌

- ✅ All mock drivers (Sardor, Jamshid, Malika, Azizbek)
- ✅ All mock transactions
- ✅ Picsum.photos placeholder images
- ✅ Default admin profile with placeholder data

## How to Start Fresh

### 1. Clear Your Browser Data

Open your browser console (F12) and run:
```javascript
localStorage.clear()
location.reload()
```

This will:
- Clear the migration flag
- Remove any cached mock data
- Give you a completely clean slate

### 2. Add Your First Driver

1. Log in to the app
2. Go to **Haydovchilar** (Drivers) tab
3. Click the **+ Add** button
4. Fill in real information:
   - Name
   - License plate
   - Car model
   - Phone number
   - Telegram username
   - Upload a real photo (or leave empty for now)

### 3. Add Your First Transaction

1. Go to **Dashboard** or **Moliya** (Finance) tab
2. Click **+ Yangi Transfer** (New Transaction)
3. Select the driver you just added
4. Enter amount and description

### 4. Test Real-time Sync! 🎉

1. Open the app in **two different browser windows**
2. In Window 1: Add a driver or transaction
3. In Window 2: **Watch it appear automatically!**

## Avatar Images

Since we removed placeholder images:
- Drivers without avatars will show empty/default state
- You can add real profile photos via URL
- Or leave empty and add a file upload feature later

## Starting Completely Fresh

If you want to wipe everything and start over:

```javascript
// In browser console
localStorage.clear()
// Then manually delete all data in Firebase Console
```

**To delete Firebase data:**
1. Go to [Firebase Console](https://console.firebase.google.com/project/avtorim-taxi/firestore)
2. Select **Firestore Database**
3. Delete the `drivers`, `transactions`, and `admin` collections
4. Reload your app

Now you're ready to build your real taxi dispatch database! 🚕
