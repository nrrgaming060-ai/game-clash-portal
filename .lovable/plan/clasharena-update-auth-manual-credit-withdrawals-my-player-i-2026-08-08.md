# ClashArena Update — Auth, Manual Credit, Withdrawals, My Player ID

Update the existing app only. No rebuild, no removal of working features. Admin keeps all current sections and gains the new ones.

## 1. Auth

- Remove the "Continue with Google" button from the sign-in page and the Google sign-in code from the auth context; disable the Google provider in the backend so it cannot be used.
- Keep email + password sign-in/sign-up exactly as it works today.
- Fix password reset: today the reset link points back to the sign-in page and there is no reset screen. Add a proper public "Set new password" page that opens from the email link and saves the new password securely.
- Email sender: no custom email domain is configured on this project yet, so reset/signup emails send from the default built-in sender. To send from your own ClashArena-branded sender, a domain you own must be connected first (setup dialog offered in chat); after that I can brand the auth email templates.

## 2. Admin → Manual Credit

- New admin page "Manual Credit": search a player by name/email, select them, enter amount + reason, apply. Matches the reference screenshot.
- Balance change happens entirely server-side via a new admin-only database routine: verifies the caller is an admin, validates the amount, credits (or deducts with a negative amount, never letting balance go below zero), and records a wallet transaction labeled "Admin Credit" with the reason.
- Normal users cannot call it — enforced in the database, not just hidden in the UI.

## 3. Withdrawals — 3 methods

- Withdraw form gets a method picker: **UPI ID**, **Google Redeem Code**, **Bank Account** — showing only the fields each method needs:
  - UPI: payout UPI ID
  - Redeem Code: no payout fields (code is delivered by admin later)
  - Bank: account holder name, account number, IFSC
- Admin withdrawal queue shows the method-specific details and gets three actions: **Approve**, **Reject**, **Mark as paid**. For Redeem Code withdrawals, the admin types the code manually when marking paid (the app never generates codes); the user then sees the code on their request in Wallet → History.
- Status flow: pending → approved (winnings deducted atomically, only if balance is sufficient) → paid. Rejection only from pending returns nothing because nothing was deducted. Row locking + status checks make double deduction impossible, server-side.

## 4. My Player ID (User Panel)

- Tournament details "Players" tab becomes "My player entry": shows only the current user's own Name, In-Game Name and In-Game ID — never other players' data.
- The database policy on joined players is tightened so users can only ever read their own entry (admins still see the full list for results).
- Onboarding and profile editing gain an "In-game name" field (today only the ID is collected); it is copied into the player's tournament entry on join.
- After a successful join the entry appears immediately (live subscription on the user's own entry), and the "No players registered yet" text never shows for a joined user. Non-joined users see no player entry.

## 5. Admin Panel additions (existing sections all kept)

Kept: Overview, Tournaments, Results, Leaderboard, Payments, Users, Notices. Added/changed:

- **Categories** — new manage page for tournament categories (Solo/Duo/Squad seeded); the tournament create/edit form uses this list.
- **Deposits** and **Withdrawals** — the current single Wallet queue split into two focused pages.
- **Transactions** — new page listing every wallet transaction across players (read-only).
- **Banners** — the existing Ads page renamed to Banners.
- **Manual Credit** — from section 2.

No Players/Home/Offers/Homepage-sections management is added.

## 6. Referral change

- Signup no longer pays the bonus; applying a code just links the friend.
- When a referred friend joins their **first match**, ₹5 is automatically credited to both the friend and the referrer, each recorded as a "Referral bonus" wallet transaction — done inside the same secure server-side join routine that debits the entry fee.

## 7. Security

- RLS stays enabled everywhere; the only policy removed is the public read on joined players (replaced with own-row/admin reads).
- All wallet changes (join fee, manual credit, withdrawal, referral, prizes) happen only inside admin/ownership-checked server-side database routines; frontend balances and IDs are never trusted.
- No secret keys in frontend code; no new permissive policies.

## 8. Verification

End-to-end checks in the browser before claiming done: email signup + login, password reset page flow, admin manual credit (and that a non-admin cannot call it), all three withdrawal methods incl. insufficient-balance and double-approve guards, wallet balances, tournament join, My Player ID display, referral bonus on first join, and the admin sections.

## Technical details

- Migration 1: `profiles.game_name` column; `joined_players.player_game_name` column; replace `joined_players` public read policy with own-row + admin policies; new `categories` table (GRANTs, RLS: public read/admin write, seeded Solo/Duo/Squad); rewrite `join_tournament` (copy IGN, first-join referral payout); rewrite `apply_referral` (link only, no credit).
- Migration 2: `money_requests` gains `payout_method`, `account_holder`, `account_number`, `ifsc`, `redeem_code`, and a `paid` status (with CHECK constraints); rework `resolve_request` into approve/reject/mark-paid with row locks; new `admin_credit` security-definer routine; revoke PUBLIC/anon execute on new routines.
- Frontend: `auth.tsx`, new `reset-password.tsx`, `AuthContext.tsx`, `wallet.tsx`, `tournaments.$id.tsx`, `onboarding.tsx`, `menu.tsx`, `admin.tsx` nav, new `admin.credit.tsx`, `admin.categories.tsx`, `admin.transactions.tsx`, split `admin.requests.tsx` into deposits/withdrawals, rename advertisements to Banners, `services/db.ts`, `lib/types.ts`.
- Update the Leaderboard in my Clash Arena app.

- Add an admin option to remove/hide any player from the leaderboard.

- Admin can select a player and remove them from the leaderboard.

- Removing a player from the leaderboard must NOT delete their account, wallet, tournaments, or transaction history.

- Only remove their leaderboard entry.

- After removal, automatically recalculate the leaderboard rankings.

- Show a confirmation before removing.

- Normal users cannot remove or edit leaderboard players.

- Keep the existing leaderboard design unchanged.

Also whenever players join the match the wallet should immediately cut the amount 

&nbsp;