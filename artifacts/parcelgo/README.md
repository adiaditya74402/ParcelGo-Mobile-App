# ParcelGo

ParcelGo connects people who need a local parcel delivered with nearby couriers. It is being built in testable stages. **Stages 1 and 2 are active: account creation and sender/courier roles, plus sender parcel requests.** Courier availability, nearby matching, push, acceptance, and delivery tracking are subsequent stages.

## Supabase setup

1. Create a Supabase project.
2. In the Supabase SQL Editor, run these migrations in order:
   - [`supabase/migrations/0001_profiles.sql`](supabase/migrations/0001_profiles.sql)
   - [`supabase/migrations/0002_parcel_orders.sql`](supabase/migrations/0002_parcel_orders.sql)
3. Add these values in Replit Secrets:
   - `SUPABASE_URL` — the project URL from Supabase.
   - `SUPABASE_ANON_KEY` — the project's anon/public client key.
   - `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` — restricted Google key with Places API (New) enabled.
   - `EXPO_PUBLIC_GOOGLE_PLACES_COUNTRY_CODE` — optional two-letter country code; defaults to `in`.
4. Restart the ParcelGo Expo workflow. The start script exposes the Supabase URL, anon key, and Places settings to the Expo JavaScript bundle. The anon key is intended for client use; Row Level Security protects data. Never put a Supabase service-role key in the app.
5. Open the mobile preview or scan its QR code with Expo Go. Create a sender account, add pickup and destination places, complete parcel details, and submit a request.

Supabase email confirmation is controlled by the project's Auth settings. If confirmation is enabled, a new user must confirm the email before signing in.

## Places setup

Place search uses Google Places API (New). Before testing order creation:

1. Create a Google Cloud project and enable billing.
2. Create a key restricted to **Places API (New)** for the app's autocomplete requests. For native Maps SDK usage later, create separate Android/iOS keys.
3. Restrict keys to ParcelGo where the Google Cloud API supports application restrictions.
4. Set a billing budget alert and daily quota caps in Google Cloud Console.
5. Add the key as `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` in Replit Secrets.

Place search uses one session token per search and ends each session with Place Details limited to the location and formatted address. Search is debounced by 400 ms, starts at three characters, caches recent results in memory, and defaults to India with a configurable country filter. Current location is also available, with confirmation before reverse geocoding. Parcel photos are stored in the private `parcel-photos` Supabase Storage bucket. ParcelGo does not call the Directions API.

Google Maps and remote notifications require a native development build rather than Expo Go. The build configuration and device testing instructions will be added with the maps and push stages.

## Stages

1. **Auth and roles** — Supabase email/password, profile creation, role selection, role switching. Included.
2. **Create order** — pickup and destination Places search, current location, parcel details, private photo upload. Included.
3. **Courier availability** — online/offline and foreground location updates.
4. **Nearby requests and notifications** — 3 km PostGIS query and notifications to nearby online couriers.
5. **Atomic acceptance** — only one courier can accept a pending order.
6. **Tracking and delivery** — Realtime location, pickup/delivery updates, and OTP confirmation.

Each later database change will be added as a migration under `supabase/migrations`.