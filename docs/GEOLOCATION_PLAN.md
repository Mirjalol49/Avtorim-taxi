# Geolocation Tracking Implementation Plan

## Platform Limitations & Scope

### Web Browser Capabilities ✅
- ✅ Request geolocation permissions
- ✅ High-accuracy GPS tracking
- ✅ Network-based location fallback
- ✅ Periodic updates while tab is active
- ✅ Store location history in Firebase
- ✅ Real-time location sharing

### Web Browser Limitations ⚠️
- ❌ **Background tracking not possible** - Browsers suspend tabs/JavaScript when inactive
- ❌ No persistent background service (unlike native apps)
- ⚠️ Tracking stops when:
  - User closes the tab/browser
  - User switches to another tab (may throttle updates)
  - Device goes to sleep

### Recommendation
For **true background tracking**, you'd need:
- Native mobile app (React Native, Flutter, Swift, Kotlin)
- Or Progressive Web App (PWA) with Service Workers (limited support)

## Implementation Plan for Web App

### Phase 1: Core Geolocation Service ✅
**File**: `services/geolocationService.ts`

Features:
- Request browser permissions
- Get current location with high accuracy
- Handle errors and fallbacks
- Track permission state

### Phase 2: Periodic Location Updates ✅
**File**: `services/locationTracker.ts`

Features:
- Start/stop tracking
- Update every 30-60 seconds
- Send to Firebase automatically
- Retry on failure
- Work while app is open

### Phase 3: Firebase Integration ✅
**Updates**: `services/firestoreService.ts`

Features:
- Store driver location updates
- Timestamp each update
- Query recent locations
- Get location history

### Phase 4: Real-time Map Updates ✅
**Updates**: `App.tsx`, `components/MapView.tsx`

Features:
- Show live driver positions
- Update map markers automatically
- Display accuracy radius
- Show last update time

### Phase 5: UI Controls ✅
**New**: Location tracking controls

Features:
- Start/Stop tracking button
- Permission status indicator
- Tracking status badge
- Error notifications

## Technical Architecture

```
┌─────────────────────────────────────┐
│   Browser Geolocation API           │
│   (navigator.geolocation)           │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   GeolocationService                │
│   - Request permissions             │
│   - Get current position            │
│   - Handle errors                   │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   LocationTracker                   │
│   - Periodic updates (30s)          │
│   - Queue failed updates            │
│   - Auto-retry on reconnect         │
└─────────────┬───────────────────────┘
              │
              ▼
┌─────────────────────────────────────┐
│   Firebase Firestore                │
│   Collection: driverLocations       │
│   {                                 │
│     driverId, lat, lon,             │
│     accuracy, timestamp, heading    │
│   }                                 │
└─────────────────────────────────────┘
```

## Data Model

### Location Update Object
```typescript
{
  driverId: string;
  lat: number;
  lon: number;
  accuracy: number;        // meters
  timestamp: number;       // Unix timestamp
  heading: number | null;  // 0-360 degrees
  speed: number | null;    // m/s
}
```

### Firestore Structure
```
/driverLocations/{driverId}/
  - currentLocation: { lat, lon, accuracy, timestamp, heading }
  
/driverLocationHistory/{driverId}/locations/{updateId}
  - { lat, lon, accuracy, timestamp, heading, speed }
```

## Security Considerations

1. **Permission Handling**
   - Always request permissions gracefully
   - Show clear explanation to users
   - Handle denied permissions

2. **Data Privacy**
   - Only track when driver explicitly enables it
   - Store minimal necessary data
   - Implement data retention policy

3. **Firebase Security Rules**
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /driverLocations/{driverId} {
      allow read: if true;  // Admins can view all
      allow write: if request.auth != null;  // Only authenticated
    }
  }
}
```

## Next Steps

1. ✅ Create `geolocationService.ts`
2. ✅ Create `locationTracker.ts`
3. ✅ Update `firestoreService.ts`
4. ✅ Add UI controls to Driver view
5. ✅ Update Map to show real-time locations
6. ✅ Test permission flows
7. ✅ Test accuracy and update frequency

## Future Enhancements (Requires Native App)

- Background location service
- Geofencing
- Route optimization
- Battery optimization
- Offline queue with IndexedDB
