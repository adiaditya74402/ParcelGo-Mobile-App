# ParcelGo

ParcelGo connects people who need a local parcel delivered with nearby couriers. This project is being built in testable stages. **Stage 1 is account creation, sign-in, and sender/courier roles.** Order creation, maps, courier availability, push, acceptance, and delivery tracking are subsequent stages and are not active yet.

## Stage 1 setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run [`supabase/migrations/0001_profiles.sql`](supabase/migrations/0001_profiles.sql).
3. Add these values in Replit Secrets:
   - `SUPABASE_URL` — the project URL from Supabase.
   - `SUPABASE_ANON_KEY` — the project's anon/public client key.
   - `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` — reserved for the maps milestone.
4. Restart the ParcelGo Expo workflow. The start script exposes the Supabase URL and anon key to the Expo JavaScript bundle. The anon key is intended for client use; Row Level Security protects profile rows. Never put a Supabase service-role key in the app.
5. Open the mobile preview or scan its QR code with Expo Go. Create a sender account on one device and a courier account on another to verify signup, sign-in, persisted sessions, role switching, and sign-out.

Supabase email confirmation is controlled by the project's Auth settings. If confirmation is enabled, a new user must confirm the email before signing in.

## Google Maps preparation

Maps are not part of stage 1. Before stage 2:

1. Create a Google Cloud project and enable billing.
2. Create separate Android and iOS API keys where possible.
3. Restrict each key to the app: Android package name and signing-certificate SHA-1; iOS bundle identifier.
4. Enable only **Maps SDK for Android**, **Maps SDK for iOS**, and **Places API (New)** for these keys.
5. Set a billing budget alert and daily quota caps in Google Cloud Console.
6. Add the restricted key as `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in Replit Secrets.

The planned place search will use one session token per search and end each session with Place Details limited to the location and formatted address. Search will be debounced by 400 ms, start at three characters, cache recent results in memory, and default to India with a configurable country filter. A map pin and current location will also be available; reverse geocoding will happen only after a pin is confirmed. ParcelGo will not call the Directions API; navigation will open Google Maps with a deep link.

Google Maps and remote notifications require a native development build rather than Expo Go. The build configuration and device testing instructions will be added with the maps and push stages.

## Stages

1. **Auth and roles** — Supabase email/password, profile creation, role selection, role switching. Included now.
2. **Create order** — pickup and destination search or pin drop, parcel details, photo upload.
3. **Courier availability** — online/offline and foreground location updates.
4. **Nearby requests and notifications** — 3 km PostGIS query and notifications to nearby online couriers.
5. **Atomic acceptance** — only one courier can accept a pending order.
6. **Tracking and delivery** — Realtime location, pickup/delivery updates, and OTP confirmation.

Each later database change will be added as a migration under `supabase/migrations`.