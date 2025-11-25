# Firebase Setup - REQUIRED STEPS

## Problem
You can't add drivers or make changes because **Firestore Database is not enabled yet**.

## Solution: Enable Firestore in Firebase Console

### Step 1: Go to Firebase Console
1. Open: https://console.firebase.google.com/project/avtorim-taxi/firestore
2. Sign in with your Google account (if not already)

### Step 2: Create Firestore Database
You'll see a page that says "Cloud Firestore" with a button **"Create database"**

Click: **Create database**

### Step 3: Choose Security Rules
A dialog will appear asking about security rules:

**Select:** ✅ **Start in test mode**

> Test mode allows read/write access for 30 days - perfect for development!

Click: **Next**

### Step 4: Choose Location
Select a location close to Uzbekistan:
- **Recommended:** `asia-south1` (Mumbai, India) - closest to Uzbekistan
- **Alternative:** `europe-west1` (Belgium)

Click: **Enable**

### Step 5: Wait for Setup
Firebase will create your database (takes ~30 seconds to 1 minute)

You'll see a loading screen, then your empty Firestore database!

### Step 6: Verify It's Working
1. Go back to your app: http://localhost:5173
2. Try adding a driver
3. Check the browser console (F12) - you should see:
   ```
   Checking for data to migrate from localStorage...
   No data to migrate - starting fresh!
   ```
4. Add a driver - it should work now!
5. Check Firebase Console - you should see the driver appear in the `drivers` collection!

## Quick Visual Guide

```
Firebase Console → Firestore Database → Create database
     ↓
Start in test mode → Next
     ↓
Choose location (asia-south1) → Enable
     ↓
Wait ~30 seconds
     ↓
✅ Database ready!
```

## Verification

After enabling Firestore:

1. **Your app will work** - you can add/edit/delete drivers and transactions
2. **Real-time sync works** - open 2 browser windows, changes appear in both
3. **Data persists** - refresh the page, data is still there
4. **Console shows** - "No data to migrate - starting fresh!"

## If You See Errors

If after enabling Firestore you see errors:

**Error: "Missing or insufficient permissions"**
- Go to Firebase Console → Firestore → Rules
- Make sure rules say:
  ```
  allow read, write: if true;
  ```

**Error: "Failed to get document"**
- Wait a minute, Firestore might still be initializing
- Refresh your app

## Current Status

❌ Firestore NOT enabled (that's why changes don't work)  
✅ Firebase credentials configured  
✅ Code ready to connect  

**You just need to enable the database!**

---

**Direct Link:** https://console.firebase.google.com/project/avtorim-taxi/firestore

Click that link and follow steps above! 🚀
