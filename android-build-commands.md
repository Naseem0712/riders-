# Android App Build Commands

## Prerequisites
1. Install Node.js (already done)
2. Install Android Studio
3. Install Java JDK 11+

## Step 1: Install Capacitor
```bash
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
npm install @capacitor/splash-screen @capacitor/status-bar
npm install @capacitor/push-notifications @capacitor/geolocation
```

## Step 2: Initialize Capacitor
```bash
npx cap init "Riders Luxury" "com.riders.luxury"
```

## Step 3: Add Android Platform
```bash
npx cap add android
```

## Step 4: Copy Web Assets
```bash
npx cap copy android
```

## Step 5: Sync Project
```bash
npx cap sync android
```

## Step 6: Open in Android Studio
```bash
npx cap open android
```

## Step 7: Build APK
In Android Studio:
1. Build → Generate Signed Bundle/APK
2. Choose APK
3. Create new keystore or use existing
4. Build APK

## Alternative: Command Line Build
```bash
cd android
./gradlew assembleDebug
# APK will be in: android/app/build/outputs/apk/debug/
```

## Production Build
```bash
./gradlew assembleRelease
# APK will be in: android/app/build/outputs/apk/release/
```

## Google Play Console Upload
1. Create Google Play Developer Account ($25 one-time)
2. Create new app
3. Upload APK or AAB (Android App Bundle)
4. Fill app details, screenshots, descriptions
5. Submit for review
