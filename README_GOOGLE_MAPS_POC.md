# Google Maps POC Documentation (React Native)

## 1. Overview

This document explains the complete Google Maps POC implemented in this project, module by module, including:

- What was built
- Why it was needed
- Which files were changed
- How to test each module
- Real issues faced during development and how they were fixed

This guide is designed for anyone starting Google Maps integration in React Native (Android + iOS).

---

## 2. Project Context

- Project: `TestMapsApp`
- Framework: React Native (New Architecture/Fabric enabled)
- Language: TypeScript
- Current mapping stack:
  - `react-native-maps`
  - `react-native-geolocation-service`
  - `react-native-google-places-autocomplete`

Main implementation file:

- `App.tsx`

Native config files involved:

- `android/app/src/main/AndroidManifest.xml`
- `android/build.gradle`
- `ios/Podfile`
- `ios/TestMapsApp/AppDelegate.swift`
- `ios/TestMapsApp/Info.plist`

---

## 3. Google Cloud Setup (Required)

Before coding, the following Google Cloud steps are mandatory:

1. Create a Google Cloud project
2. Enable billing
3. Create an API key
4. Enable required APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API (for autocomplete)
   - Directions API (for route + ETA/distance)

### Important key guidance

- Do not use unrestricted keys in production.
- Restrict by package/bundle and API usage:
  - Android app restriction: package name + SHA-1
  - iOS app restriction: bundle identifier
  - API restriction: enable only required APIs

---

## 4. Module-by-Module Implementation

## Module 1 - Cloud and Key Setup

### Goal
Prepare Google services backend.

### Status
Completed.

### Outcome
Usable API key and billing-enabled cloud project.

---

## Module 2 - Install Maps Package and Native Wiring

### Goal
Install and configure `react-native-maps` for Android and iOS.

### What was done

- Added map package dependency
- Added Android API key in manifest metadata
- Added iOS API key initialization
- Added iOS Google map pod subspec

### Files updated

- `android/app/src/main/AndroidManifest.xml`
- `ios/TestMapsApp/AppDelegate.swift`
- `ios/Podfile`

### Why this matters
JS components are not enough. Native binaries must include map SDK modules.

---

## Module 3 - Show Map on Screen

### Goal
Open app, see map, pan/zoom map.

### What was built

- Full-screen `MapView`
- Initial region set (Delhi)
- Google provider enabled

### File

- `App.tsx`

### Result
Map renders and is interactive.

---

## Module 4 - Static Marker

### Goal
Render a marker on map.

### What was built

- Added marker at Delhi coordinates

### File

- `App.tsx`

### Result
Marker visible and map interactions unaffected.

---

## Module 5 - Current User Location

### Goal

- Ask permission
- Get GPS coordinates
- Move camera to user

### What was built

- Installed geolocation package
- Implemented runtime permission logic:
  - Android: `PermissionsAndroid`
  - iOS: `Geolocation.requestAuthorization('whenInUse')`
- Added location fetch and live updates (`watchPosition`)
- Added user location UI (`showsUserLocation`, `showsMyLocationButton`)
- Added on-screen debug status and coordinates

### Native permissions/config

- Android location permissions in manifest
- iOS location usage message in plist

### Files

- `App.tsx`
- `android/app/src/main/AndroidManifest.xml`
- `ios/TestMapsApp/Info.plist`

### Result
Current location flow works on device/emulator with permissions enabled.

---

## Module 6 - Search Address (Places Autocomplete)

### Goal
User types address, sees suggestions, chooses one, receives coordinates.

### What was built

- Installed `react-native-google-places-autocomplete`
- Added search input overlay
- Enabled `fetchDetails` for selected suggestion
- Extracted `lat/lng` from selected place details
- Moved map camera to selected place

### File

- `App.tsx`

### Business value
Powers pickup/drop selection, delivery address, destination search.

---

## Module 7 - Draw Route (A -> B)

### Goal
Draw route from origin to destination.

### What was built

- Called Directions API using:
  - Origin: current location
  - Destination: selected place
- Decoded encoded polyline
- Rendered route with `Polyline`
- Added source/destination markers
- Fitted map viewport to route bounds

### File

- `App.tsx`

### Result
Visual route line appears between A and B.

---

## Module 8 - ETA / Distance

### Goal
Show trip metrics like:

- Distance (example: `6.2 km`)
- ETA (example: `18 mins`)

### What was built

- Parsed first route leg from Directions API response
- Extracted:
  - `distance.text`
  - `duration.text`
- Displayed values in a trip summary card overlay

### File

- `App.tsx`

### Business value
Directly useful for delivery fee, fare estimation, and assignment logic.

---

## 5. Key Challenges Faced and Resolutions

## Challenge A: iOS module not found (`RNMapsAirModule`)

### Symptom
Map module missing at runtime on iOS.

### Root cause
iOS binary had default map pod but Google provider was used in JS.

### Fix
Added Google pod subspec in `ios/Podfile` and reinstalled pods.

### Commands

```bash
cd ios && pod install && cd ..
```

### Lesson
When using Google provider in `react-native-maps` on iOS, ensure Google subspec is linked.

---

## Challenge B: Android app crash (`IncompatibleClassChangeError`)

### Symptom
App kept stopping after geolocation integration.

### Root cause
Google Play Services location API version mismatch between runtime and geolocation library expectation.

### Fix
Pinned `playServicesLocationVersion` in root gradle ext.

### File

- `android/build.gradle`

### Added value

```gradle
playServicesLocationVersion = "21.3.0"
```

### Commands

```bash
cd android && ./gradlew clean && cd ..
npx react-native run-android
```

### Lesson
If geolocation crashes with class/interface mismatch, align Play Services location versions explicitly.

---

## Challenge C: Wrong emulator location

### Symptom
Location fetched did not match real user location.

### Root cause
Emulator/simulator uses mock location unless manually set.

### Fix
Set emulator/simulator location manually.

#### Android emulator

- Extended Controls -> Location -> set coordinates
- Or CLI:

```bash
adb emu geo fix <longitude> <latitude>
```

#### iOS simulator

- Features -> Location -> Custom Location

### Lesson
Always validate final location logic on a physical device before production assumptions.

---

## Challenge D: React hooks order error during Fast Refresh

### Symptom
`React has detected a change in the order of Hooks called by App`.

### Root cause
Hook layout changed across refresh cycles while state shape evolved.

### Fix
Refactored state to avoid introducing unstable hook sequence and then performed clean reload.

### Commands

```bash
npx react-native start --reset-cache
npx react-native run-ios
```

### Lesson
After structural hook changes, do a clean restart to avoid stale Fast Refresh hook state.

---

## 6. Current Architecture (High Level)

1. App boot
   - Request location permission
   - Get current GPS coordinate
   - Keep live position updates

2. Search flow
   - User types address
   - Places autocomplete returns suggestions
   - Selected place provides destination coordinates

3. Routing flow
   - Directions API called with origin + destination
   - Polyline decoded and drawn
   - Distance + ETA shown in trip summary card

---

## 7. Run and Validate

## Install dependencies

```bash
npm install
cd ios && pod install && cd ..
```

## Start app

```bash
npx react-native start
npx react-native run-android
# or
npx react-native run-ios
```

## Module validation checklist

1. Map renders and pans/zooms
2. Marker visible
3. Permission prompt appears (or settings flow handled)
4. Current location updates and camera recenter works
5. Address suggestions appear while typing
6. Selecting suggestion moves map and marker
7. Route polyline appears
8. Distance + ETA appear in trip summary card

---

## 8. Operational Troubleshooting Quick Guide

## If autocomplete suggestions do not appear

- Verify Places API enabled in Google Cloud
- Verify billing enabled
- Check API key restrictions for Places API

## If route does not draw

- Verify Directions API enabled
- Check response status from Directions API
- Ensure both origin and destination coordinates exist

## If location permission prompt never appears

- Permission may already be denied permanently
- Open app settings and manually enable location permission

## If map tiles are blank

- Recheck API key placement in native files
- Confirm Maps SDK APIs enabled for both platforms

---

## 9. Security and Production Notes

1. Avoid hardcoding API keys in source for production.
2. Use environment/config management and CI secrets.
3. Restrict key by platform and API scope.
4. Add backend proxy/signing for sensitive routing/fare workflows if needed.

---

## 10. Recommended Next Steps

1. Split search into separate Pickup and Drop fields.
2. Recompute route on either endpoint change.
3. Add fare calculation formula from distance + ETA.
4. Add route alternatives and traffic-aware durations.
5. Add error telemetry and retry strategy for Google API failures.
6. Add integration tests around permission and routing flow.

---

## 11. What This POC Already Proves

This implementation proves the core capability chain for real mobility/logistics apps:

- Location acquisition
- Place search and geocoding
- Route computation
- Visual path rendering
- ETA and distance extraction

That is enough foundation to evolve into taxi, delivery, nearby-service, and dispatch experiences.
