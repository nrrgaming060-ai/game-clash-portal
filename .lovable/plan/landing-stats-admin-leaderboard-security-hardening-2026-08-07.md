# Landing stats, admin leaderboard, security hardening

## 1. Landing page stats

Remove the fake "50K+ Matches hosted" and "₹1.2Cr Prizes paid" figures from the hero on the landing page. Replace the three-stat strip with a polished trust row that makes no unverifiable claims:

- "Solo / Duo / Squad" — Every bracket
- "15 min" — Room ID unlock before start
- "24/7" — Player support

Keep the same glass-card styling but refine it: larger gold gradient value, tighter label, subtle hover glow so it still looks premium.

## 2. Leaderboard in the admin panel

Add a "Leaderboard" entry to the admin navigation and a new admin page showing top players:

- Ranked table: rank, player name, matches played, wins, total kills, total points.
- Top three highlighted with podium accents (gold / silver / bronze), matching the player-facing leaderboard style.
- Search box to filter by player name, and a sort toggle between points, kills and wins.
- Live updates using the existing leaderboard subscription; empty state when no results are published yet.

Read-only view — results are still entered on the Results page.

## 3. Security fixes

- **Wallet balance edits (critical, already mitigated):** the database trigger that blocks players from editing their own balances, ban flag and referral fields is in place. Confirm and close this finding.
- **Unbounded deposit/withdrawal amounts:** enforce on the server that a request amount is a positive whole number within the configured deposit limits, and that the request type is one of deposit/withdrawal. Also re-validate inside the approval routine so a bad row can never be approved into a balance change.
- **First-user-becomes-admin bootstrap:** replace the "roles table is empty" check with a one-time bootstrap guard so admin can never be auto-granted again if the roles table is later emptied, and so two simultaneous signups cannot both become admin.
- **SECURITY DEFINER functions callable by anyone:** revoke execute from public/anon on the privileged routines, leaving only the calls the app legitimately needs from signed-in users; each of those already checks the caller's role internally.
- Re-run the security scan afterwards and report anything remaining.

## Technical notes

- Landing edits: `src/routes/index.tsx` only.
- New route `src/routes/admin.leaderboard.tsx`, nav entry in `src/routes/admin.tsx`, reusing `watchLeaderboard` from `src/services/db.ts`. No schema change needed for the leaderboard view.
- Security work needs one migration: `CHECK` constraints/validation trigger on `money_requests`, hardened `resolve_request`, rewritten `ensure_profile` bootstrap using an advisory lock plus a sentinel, and `REVOKE EXECUTE ... FROM public, anon` on the definer functions.
