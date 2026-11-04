# klaody

A fast, self-hosted file storage app. **klaody** is the web and Android client: browse folders, upload large files, preview almost anything, search your images by what they show, and share files with expiring links.

[![Build Android APK](https://github.com/Ilo06/Klaody-front/actions/workflows/android.yml/badge.svg)](https://github.com/Ilo06/Klaody-front/actions/workflows/android.yml)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)

## Features

**Files and folders**
- Nested folders with breadcrumb navigation
- Rename, move (folder picker), and delete (to trash)
- Multi-select with bulk delete and bulk restore
- Filter by type, sort by name, size, or upload date

**Upload and download**
- Drag and drop on desktop, native picker on mobile
- Files over 200 MB use a resumable chunked upload (parallel chunks, automatic retries, resume after interruption)
- Per-file upload progress with cancel
- Android: downloads with a live progress bar, saved straight to the public Downloads folder

**Preview**
- Images, video, audio, text and JSON, and PDF
- Mobile-friendly PDF rendering with pdf.js
- Images load as reduced-size server-side previews; the original is only fetched on download
- Browse with arrow keys or swipe, with a position counter
- Image details panel (press `i`): camera, lens, ISO, aperture, shutter, focal length, date taken, and GPS location with an OpenStreetMap link

**Search**
- Search by file name
- Search by image content: describe what you are looking for (for example "car") and get the best matches across all folders, shown in a bento grid
- Indexing status shown on images that are not searchable yet

**Sharing and trash**
- Public share links with an expiry (never, 1 hour, 1 day, 7 days, 30 days)
- Trash with restore, restore all, and permanent empty

**Storage and admin**
- Disk usage indicator with a breakdown by file type
- Admin-only user creation

**Experience**
- Light and dark themes (follows the system, can be overridden)
- Responsive layout with a dedicated mobile drawer, action sheets, and floating action button
- Native Android app via Capacitor: splash screen, edge-to-edge system bars, hardware back button support

## Tech stack

| Area | Tools |
|---|---|
| Framework | React 19, TypeScript, Vite |
| Styling | Tailwind CSS 4, framer-motion, lucide-react |
| Data | TanStack Query, axios |
| Forms | react-hook-form, zod |
| Routing | react-router-dom 7 |
| Files | react-dropzone, pdfjs-dist, date-fns |
| Mobile | Capacitor 8 (app, filesystem, file-transfer, share) and a custom `DownloadsPlugin` in Java |

## Getting started

### Prerequisites

- Node.js 22 or later
- A running klaody backend API (default `http://localhost:3000`)

### Install and run

```bash
git clone https://github.com/Ilo06/Klaody-front.git
cd Klaody-front
npm ci
```

Create a `.env` file at the project root:

```bash
VITE_API_BASE_URL=http://localhost:3000
```

Then start the dev server:

```bash
npm run dev
```

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

## Configuration

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `http://localhost:3000` | Base URL of the klaody backend. Read at build time, so it is baked into the bundle. |

## Backend API

The client expects a REST API that exposes these routes (all except `/auth/login` require a Bearer token):

| Area | Endpoints |
|---|---|
| Auth | `POST /auth/login`, `GET /auth/me`, `POST /auth/register` (admin) |
| Files | `GET /files`, `POST /files`, `GET /files/:id`, `GET /files/:id/preview`, `GET /files/:id/details`, `PATCH /files/:id/rename`, `PATCH /files/:id/move`, `DELETE /files/:id`, `POST /files/:id/share` |
| Search | `GET /files/search?q=` |
| Chunked upload | `POST /files/uploads`, `GET /files/uploads/:id`, `PUT /files/uploads/:id/chunks/:index`, `POST /files/uploads/:id/complete`, `DELETE /files/uploads/:id` |
| Folders | `GET /folders`, `POST /folders`, `PATCH /folders/:id/rename`, `PATCH /folders/:id/move`, `DELETE /folders/:id` |
| Trash | `GET /trash`, `POST /trash`, `DELETE /trash`, `POST /trash/restore`, `POST /trash/restore-all`, `POST /trash/files/:id/restore`, `POST /trash/folders/:id/restore` |
| Storage | `GET /storage`, `GET /storage/breakdown` |
| Public | `GET /share/:token` |

## Android app

The Android project lives in `android/` and is managed by Capacitor.

### Build locally

Requires JDK 21 and the Android SDK.

```bash
npm run build
npx capacitor-assets generate --android   # icons and splash from assets/
npx cap sync android
cd android
./gradlew assembleDebug
```

The APK is generated in `android/app/build/outputs/apk/debug/`.

### CI

Two GitHub Actions workflows build the app:

- **`android.yml`**: builds a debug APK on every push to `main` and uploads it as an artifact.
- **`release.yml`**: builds a signed APK and AAB when you push a tag starting with `v`, and publishes them to a GitHub Release.

### Releasing

1. Create a keystore once and keep it safe (never commit it):
   ```bash
   keytool -genkeypair -v -keystore klaody-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias klaody
   ```
2. Add these repository **secrets** (Settings, Secrets and variables, Actions):

   | Secret | Value |
   |---|---|
   | `ANDROID_KEYSTORE_BASE64` | Base64 of `klaody-release.jks` |
   | `ANDROID_KEYSTORE_PASSWORD` | Keystore password |
   | `ANDROID_KEY_ALIAS` | `klaody` |
   | `ANDROID_KEY_PASSWORD` | Key password |

3. Add the repository **variable** `VITE_API_BASE_URL` pointing to your production backend.
4. Tag and push:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

`versionName` comes from the tag and `versionCode` from the workflow run number, so each release is installable over the previous one.

## Project structure

```
.
├── android/                 Capacitor Android project (incl. DownloadsPlugin.java)
├── assets/                  Source icons for capacitor-assets
├── public/                  Static files (favicon)
├── src/
│   ├── components/          UI: browser table, preview, modals, sidebar, storage...
│   ├── context/             Auth and theme providers
│   ├── hooks/               TanStack Query hooks (files, folders, trash, users)
│   ├── lib/                 API client, formatting, EXIF helpers, bento layout
│   ├── pages/               LoginPage, FilesPage, TrashPage
│   ├── App.tsx              Routes and Android back-button handling
│   └── main.tsx             App entry and providers
├── capacitor.config.ts
└── vite.config.ts
```

## Author

Built by [Ilo](https://github.com/Ilo06).
