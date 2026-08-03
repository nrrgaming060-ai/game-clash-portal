# ClashArena — Esports Tournament Platform

A full-stack tournament app with a player-facing panel and a protected admin panel, built on Firebase (Auth, Firestore, Storage) with a premium dark gaming theme.

## Two things to flag before we start

1. **Firebase needs your project keys.** I can't create a Firebase project for you. You'll need to create one at console.firebase.google.com, enable Google + Email/Password sign-in, create a Firestore database and a Storage bucket, and paste the web config. I'll also write the `firestore.rules` and `storage.rules` files into the repo, but **you must publish them from the Firebase console** — I have no way to deploy rules for you. Until you do, your database is wide open.
2. **Real money + entry fees.** Paid-entry esports tournaments sit close to gambling in most payment providers' acceptable-use policies and are frequently rejected. Because of that, and because Lovable's built-in payments work with Lovable Cloud rather than Firebase, I'll build the money layer as a **wallet with deposit/withdrawal requests plus an admin approval queue** (exactly like your screenshots), with a clean seam where a gateway plugs in later. Once the app exists we can run the payment eligibility check and wire a real gateway into that seam.

Everything else in your prompt gets built in this pass.

## Design direction

Deep black `#0A0A0E` base, neon blue `#00A8FF` primary, trophy gold `#FFD700` accents. Glassmorphic cards with glowing borders, Material 3 spacing and elevation, smooth page and card transitions, shimmer skeletons everywhere data loads. Mobile-first — the layout in your screenshots is a phone app, so bottom navigation on mobile and a rail/sidebar on desktop.

## User panel

- **Landing + onboarding** — animated hero, feature slides, then auth.
- **Auth** — Google Sign-In and Email/Password. First-time users are forced through a profile completion step capturing name, phone and in-game UID before they can reach the app.
- **Home** — featured tournament hero carousel, filter chips by game (BGMI, Free Fire, Valorant, COD) and category (Solo/Duo/Squad), instant-filter search, tournament cards with prize pool, entry fee and slot progress bars.
- **Tournament detail** — banner, countdown timer, map, rules list, prize breakdown, joined vs total slots. Join button runs a transaction that blocks duplicate joins, checks wallet balance, debits the entry fee, increments `joinedSlots`, and rejects when full.
- **Room credentials card** — locked with a countdown until either 15 minutes before start or admin manual unlock, and only ever visible to a joined player. Enforced in the security rules too, not just in the UI.
- **My Tournaments** — Upcoming / Live / Completed tabs.
- **Leaderboard** — ranked by points then kills, top three in gold/silver/bronze treatments.
- **Wallet** — total, deposit and winnings balances split; deposit request and withdrawal request forms with quick-amount chips; full transaction history.
- **Refer & Earn** — personal referral code, coin bonus on referred player's first paid match, share to WhatsApp/Telegram/Facebook.
- **Profile & settings** — edit name, game UID, avatar upload to Storage, notification preferences.
- **Notifications** — inbox of admin broadcasts.

## Admin panel (`/admin`)

- Role-gated route; non-admins are redirected. Admin status lives in a Firestore role document, never in client storage.
- **Dashboard** — total users, active users, live tournaments, revenue, matches completed, pending deposits, pending withdrawals.
- **Tournaments** — create with banner upload, edit, cancel, delete; full field set including rules array and start timestamp.
- **Room credentials** — set room ID and password per tournament, instant unlock button, or scheduled auto-unlock 15 minutes before start.
- **Requests** — deposit and withdrawal approval queues that credit or debit wallets on approval.
- **Users** — list, search, view game UIDs, ban/unban.
- **Results & leaderboard** — enter kills, placement and points post-match; updates player stats.
- **Announcements** — broadcast to all users or to a specific tournament's participants.

## Technical notes

- React + TanStack Start routing, Tailwind v4 tokens in `src/styles.css` (no hardcoded colors), shadcn components restyled to the gaming theme.
- Firebase Web SDK v10 initialised from `VITE_FIREBASE_*` env values; `src/services/` wraps Firestore access, `src/hooks/` wraps live subscriptions, `src/contexts/` holds auth and profile state.
- Real-time listeners on tournaments, slots, wallet and leaderboard so counts update live.
- Joins, wallet debits and slot increments use Firestore `runTransaction` for atomicity.
- `firestore.rules` shipped in-repo: users read/write only their own doc; tournaments world-readable, admin-writable; `rooms` readable only by a user with a matching `joined_players` record and only when unlocked; wallets and transactions writable server-side/admin only.
- Zod validation on every form, error boundaries, empty states, and shimmer skeletons on all async surfaces.

## What I need from you when we start

The Firebase web config values (apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId). I'll ask for them as secure values once the app shell is in place.
