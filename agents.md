# Pocket Frame — AI Agent Guide

This document provides context, architectural decisions, conventions, and instructions for AI agents working on the **Pocket Frame** repository.

---

## 1. Project Overview

**Pocket Frame** is a self-hosted, lightweight photo and video slideshow application designed for smart displays, tablets, and home servers. It integrates natively with [Immich](https://immich.app/) shared albums, and supports fallback photo albums from Amazon Photos and Google Photos.

---

## 2. Tech Stack

- **Backend**: [PocketBase](https://pocketbase.io/) (Go + SQLite embedded database).
  - Handles authentication, user management, and collection storage (`flame_settings`, `flame_albums`, `users`).
  - Extensible via server-side JavaScript hooks in `pb_hooks/` running in the Goja JSVM.
- **Frontend**: [Vue.js 3](https://vuejs.org/) (Single File Components, `<script setup>`, Composition API) bundled with [Vite](https://vitejs.dev/).
- **Routing**: [Vue Router 4](https://router.vuejs.org/) (HTML5 History mode with PocketBase SPA fallback).
- **State Management**: [Pinia 3](https://pinia.vuejs.org/) stores for authentication, settings/themes, and toast notifications.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) + [DaisyUI 4](https://daisyui.com/) with 33+ themes (default dark theme: `yellowdark`, default light theme: `bumblebee`) and dynamic runtime CSS branding variables (`--color-primary`, `--color-accent`, `--color-background`).
- **Client SDK**: Official `pocketbase` JavaScript SDK.

---

## 3. Directory Layout

```
pocket-frame/
├── index.html                 # Vite HTML entry point (fonts, metadata, root mount)
├── vite.config.js             # Vite configuration (proxies /api to 8090, outputs to pb_public/)
├── tailwind.config.js         # Tailwind & DaisyUI theme configuration
├── postcss.config.cjs         # PostCSS configuration (Tailwind & Autoprefixer)
├── package.json               # Dependencies and npm scripts
├── public/                    # Static assets copied into pb_public/ on build
│   ├── favicon.ico
│   ├── og-image.webp
│   └── sw.js
├── src/                       # Vue 3 SPA source code
│   ├── App.vue                # Root shell (layout, theme initialization, header, toast)
│   ├── main.js                # App bootstrap (Vue, Pinia, Router)
│   ├── assets/
│   │   └── main.css           # Global Tailwind directives, fonts, scrollbar hiding
│   ├── components/
│   │   ├── Header.vue         # Navbar with theme toggle, settings link, user avatar menu
│   │   └── Toast.vue          # Global notification alerts
│   ├── lib/
│   │   └── pocketbase.js      # PocketBase client instance & cookie synchronization
│   ├── router/
│   │   └── index.js           # Route definitions and authentication navigation guards
│   ├── stores/
│   │   ├── auth.js            # User state, login, register, Google OAuth2, logout
│   │   ├── settings.js        # Theme toggling, CSS variable injection, albums management
│   │   └── toast.js           # Toast alerts stack
│   └── views/
│       ├── SlideshowView.vue  # Fullscreen slideshow dashboard (kiosk mode, touch, video looping)
│       ├── SettingsView.vue   # Admin settings (album CRUD & reordering, colors, intervals, cache)
│       ├── ProfileView.vue    # User profile view
│       ├── ProfileEditView.vue# Profile editing with avatar upload
│       ├── LoginView.vue      # Split-screen login (Google OAuth + email/password)
│       ├── RegisterView.vue   # Split-screen registration
│       └── OAuthRedirectView.vue # Google OAuth callback handler
├── pb_hooks/                  # PocketBase server-side JSVM hooks
│   ├── slideshow_api.pb.js    # Custom endpoints: /api/custom/slideshow & /api/custom/settings
│   ├── cache_control.pb.js    # Sets HTTP Cache-Control headers for static assets
│   └── lib/
│       ├── slideshow_helpers.js # Immich/Amazon/Google album fetchers, CORS bypass, caching
│       └── common.js          # Shared utility functions
├── pb_migrations/             # PocketBase schema migrations
├── pb_data/                   # Local database files (data.db, auxiliary.db, storage/)
└── scripts/
    ├── push.mjs               # Deployment script using Phio
    └── typegen.mjs            # PocketBase TypeScript type generation
```

---

## 4. Development & Build Commands

- **Start Development**:
  ```bash
  npm run dev
  ```
  Runs Vite dev server (with HMR) and PocketBase (`--dev`) in parallel.
  - Frontend accessible on `http://localhost:5173`.
  - API requests to `/api` are automatically proxied to `http://127.0.0.1:8090`.

- **Build Production Assets**:
  ```bash
  npm run build
  ```
  Compiles the Vue SPA into `pb_public/`. Always run this before committing or deploying.

- **Serve Production Build**:
  ```bash
  npm run serve
  ```
  Runs PocketBase standalone serving the SPA directly from `pb_public/` on `http://localhost:8090`.

- **Deploy**:
  ```bash
  npm run push
  ```
  Deploys the application (`pb_hooks`, `pb_migrations`, `pb_public`) using Phio. It automatically snapshots any schema changes into `pb_migrations/` via `pocketbase migrate collections` and runs `npm run build` prior to uploading.
  > [!NOTE]
  > A patch for `phio` (`patches/phio+0.4.0.patch`) is managed by `patch-package` to fix a known SFTP bug where non-recursive `rmdir` failed on non-empty directories (`code: 4, custom: true, Error: rmdir: Failure`). The patch ensures `rmdir(folderPath, true)` is called recursively.

---

## 5. Architectural Guidelines & Conventions

### 5.1 Backend Hooks (`pb_hooks/`)
- In PocketBase's Goja runtime, hook files run in prewarmed JSVM pools.
- **Always use CommonJS modules (`require(__hooks + '/lib/...')`)** inside route callbacks (`routerAdd`) rather than relying on file-scope closures across handler invocations.
- Custom routes:
  - `GET /api/custom/slideshow`: Authenticates the user, loads active album and settings, fetches Immich timeline buckets or fallback albums (Amazon/Google), manages caching in `$app.store()`, and returns processed slide assets.
  - `GET /api/custom/settings`: Returns current user settings and album list.
  - `POST /api/custom/settings`: Executes atomic album/settings actions (`save_settings`, `create_album`, `update_album`, `delete_album`, `swap_albums`, `set_active_album`).

### 5.2 Frontend Components & Stores
- **Authentication**: Checked via `pb.authStore.isValid`. All private views (`/`, `/settings`, `/profile`, `/profile/edit`) require authentication; guests are redirected to `/login`.
- **CSS Branding Variables**: Handled in `src/stores/settings.js`. The user's chosen hex colors for primary, accent, and background are applied as `--color-primary`, `--color-accent`, and `--color-background` directly onto `document.body.style`.
- **Memory & Performance Optimizations (Constant O(1) Memory)**:
  - **Instant Slide Cut (Single Active Slide)**: In `SlideshowView.vue`, photos switch with an instant cut (zero sliding animation). Only the single active slide is rendered in the DOM, keeping GPU compositing overhead and memory usage at an absolute minimum while preloading the next image in memory for seamless, flash-free transitions.
  - **Video Decoder Cleanup**: Inactive `<video>` elements pause, remove `src`, and call `load()` on slide transition to release hardware-accelerated video decoder buffers from VRAM.
  - **Lean Payloads**: Slideshow API responses and client image arrays retain only `{ url, type, duration }`, stripping duplicate thumbnail and blur URLs.
  - **Reduced Prewarmed Hooks Pool**: PocketBase runs with `--hooksPool=2` instead of the default 15, cutting resident Goja JavaScript engine RAM by >80%.
  - Controls auto-hide after 3.5 seconds of user inactivity.
  - Short videos loop according to `video_repeat_threshold` and `video_repeat_count` before auto-advancing. A watchdog timer prevents video stalls.
