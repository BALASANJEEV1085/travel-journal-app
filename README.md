# Travel Journal

A React Native (Expo) mobile app for capturing travel memories. Each entry combines:

- A photo taken with the device camera (or picked from the gallery)
- GPS coordinates + reverse-geocoded place name
- A title and free-form notes
- Cloud backup of the image to **Cloudinary**
- Local persistence of the entry list via `AsyncStorage`

## Stack

- [Expo](https://expo.dev/) SDK 54 (managed workflow) + React Native 0.81 + TypeScript
- `expo-camera`, `expo-location`, `expo-image-picker`
- `@react-native-async-storage/async-storage`
- `@react-navigation/native` + native-stack

## Prerequisites

- Node.js 20+
- A Cloudinary account (free tier is fine)
- Expo Go on your iOS or Android device, **or** Android Studio / Xcode for a native build

## 1. Configure Cloudinary (important — read this)

> :warning: **Never ship a Cloudinary API secret inside a mobile app.**
> Anything bundled into the JS or native binary can be extracted by a
> determined user. This app uses an **unsigned upload preset**, which is the
> recommended approach for client-side uploads.

1. Log in to the [Cloudinary Console](https://console.cloudinary.com/).
2. Go to **Settings → Upload → Upload presets → Add upload preset**.
3. Set:
   - **Preset name**: `travel_journal` (must match `CLOUDINARY_UPLOAD_PRESET` in `src/config.ts`)
   - **Signing Mode**: `Unsigned`
   - **Folder** (optional): `travel-journal`
4. Save the preset.

The `cloud name` is already configured in `src/config.ts` (`dbafya383`). Update
it there if you fork this app for another account.

If you previously shared your API secret publicly, rotate it via
**Settings → Access Keys → Regenerate**.

## 2. Install & run

```bash
npm install
npx expo start
```

Scan the QR code with Expo Go, or run `npm run android` / `npm run ios`.

## Features

### Capture screen
- Live camera preview via `expo-camera` with permission handling
- Fallback: pick an existing photo from the gallery
- Fetches the current GPS fix on mount and shows a reverse-geocoded place label
- Title + notes fields
- On save: uploads the image to Cloudinary (unsigned), then stores the entry
  locally. If the upload fails (e.g. offline) the entry is still saved
  locally with the device URI.

### Home screen
- List of saved entries sorted newest-first
- Pull-to-refresh
- Tap an entry to view details

### Entry detail screen
- Full-size image (Cloudinary URL when available, local URI otherwise)
- Coordinates + place label, with a "Open in Google Maps" shortcut
- Delete action

## Project layout

```
App.tsx                        # Navigator (Home / Capture / EntryDetail)
app.json                       # Expo config + platform permissions + plugins
src/
  config.ts                    # Cloudinary cloud name + upload preset
  types.ts                     # JournalEntry type
  screens/
    HomeScreen.tsx
    CaptureScreen.tsx
    EntryDetailScreen.tsx
  services/
    cloudinary.ts              # Unsigned Cloudinary upload
    location.ts                # GPS + reverse geocoding helpers
    storage.ts                 # AsyncStorage CRUD for entries
```

## Permissions

Configured in `app.json`:

- **iOS**: `NSCameraUsageDescription`, `NSLocationWhenInUseUsageDescription`,
  `NSPhotoLibraryUsageDescription`, `NSPhotoLibraryAddUsageDescription`
- **Android**: `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`,
  `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE`

The Expo config plugins for `expo-camera`, `expo-location`, and
`expo-image-picker` also inject their own permission strings at prebuild time.

## Building a standalone binary

```bash
npx expo prebuild
eas build -p android    # or -p ios
```

You'll need an [EAS](https://expo.dev/eas) account for cloud builds. Local
builds work too via `npx expo run:android` / `npx expo run:ios`.

## Troubleshooting

- **"Upload preset not found"**: the preset name in `src/config.ts` must
  exactly match the preset you created in Cloudinary, and the preset must be
  set to `Unsigned`.
- **Location always null**: make sure location services are enabled on the
  device and you granted the "While Using" permission. On Android emulators,
  open the Extended Controls → Location panel and push a fake location.
- **Camera preview is black on Android emulator**: the default emulator camera
  is fine for development, but switch to `Virtual Scene` in AVD settings if
  you see issues.
