# SAMTOB P&C — Deployment & Operations Guide

## 1. Architecture Overview
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS v4 (`src/`)
- **Backend Server**: Express (`server.ts`, port `3000`) providing Vite middleware in dev, static SPA serving in production, and server-side Cloudinary signing/migration endpoints (`/api/cloudinary/*`).
- **Database & Auth**: Firebase Authentication (Google Sign-In) + Cloud Firestore (`firebase-applet-config.json`, `firestore.rules`).
- **Media Storage**: Cloudinary (`samtobpc/products`, `samtobpc/receipts`, `samtobpc/banners`).

## 2. Environment Variables
Configure in `.env` or your hosting Secrets manager (see `.env.example`):
- `VITE_CLOUDINARY_CLOUD_NAME` — Cloudinary cloud name for client uploads
- `VITE_CLOUDINARY_UPLOAD_PRESET` — Unsigned Cloudinary upload preset (optional if server signed credentials are provided)
- `CLOUDINARY_CLOUD_NAME` — Server Cloudinary cloud name
- `CLOUDINARY_API_KEY` — Server Cloudinary API key
- `CLOUDINARY_API_SECRET` — Server Cloudinary API secret (never exposed to browser)

You can also configure Cloudinary Cloud Name and Upload Preset directly in **Admin Dashboard → Website & Payment Settings**.

## 3. Firebase Setup & Rules
- Security rules live in `firestore.rules` (validated against `firebase-blueprint.json`).
- Bootstrapped Admin email: `samtobeng@gmail.com`.
- Additional admins can be added in `/admins/{uid}` by an existing admin.

## 4. Seeding & Image Migration
1. Sign in with the admin Google account (`samtobeng@gmail.com`) at `/account/login`.
2. Opening the site or `/admin` automatically seeds the 77 original SAMTOB P&C products, 3 categories, and site settings into Firestore (or trigger manually under **Admin → Migration & Backup**).
3. To move all legacy external product images into your Cloudinary account, configure Cloudinary credentials and click **Migrate Products to Cloudinary** inside **Admin → Migration & Backup**.

## 5. Build & Run
```bash
npm install
npm run build
npm start
```
