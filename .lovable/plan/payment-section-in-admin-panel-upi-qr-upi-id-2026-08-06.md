# Payment section in admin panel (UPI QR + UPI ID)

## What you get

**Admin → Payments tab**
- Set the UPI ID that players pay to (your FamPay UPI ID).
- Upload a UPI QR code image (stored in the existing media storage).
- Set payee name, min/max deposit amount, and an optional payment note shown to users.
- Toggle deposits on/off (useful when you can't verify payments for a while).
- Live preview of exactly what players will see.

**User → Wallet → Add money**
- Shows your QR code, UPI ID with a one-tap copy button, and a "Pay via UPI app" button that opens GPay/PhonePe/Paytm with the amount pre-filled (UPI deep link).
- After paying, the player enters the 12-digit UTR / transaction reference and optionally uploads a payment screenshot, then submits the deposit request.
- Duplicate UTRs are rejected so the same payment can't be claimed twice.

**Admin → Wallet requests**
- Each pending deposit now shows the UTR and the screenshot thumbnail next to Approve/Reject, so verification is one glance instead of guesswork.

## About "fully automated"

FamPay is a personal UPI handle, not a payment gateway — it has no API or webhook, so nothing can automatically tell your app that money arrived. Real auto-credit needs a gateway (Razorpay/Cashfree), which requires a business account and KYC, and at 16 you can't sign up for one yet.

So this plan makes it as close to automatic as possible: the player pays in one tap, the app captures the UTR and proof, and you approve with a single tap — the wallet credit itself is already automatic once approved. If you later get a gateway (or an adult guardian's business account), the deposit flow can be switched over without changing the rest of the app.

## Technical notes

- New `payment_settings` table (single row): `upi_id`, `payee_name`, `qr_url`, `note`, `min_deposit`, `max_deposit`, `deposits_enabled`, timestamps. Public read, admin-only write.
- `money_requests` gains `utr` and `proof_url` columns, plus a unique index on `utr` for deposits.
- New service helpers in `src/services/db.ts`: `watchPaymentSettings`, `savePaymentSettings`; QR/proof uploads reuse `uploadFile` in `src/services/storage.ts`.
- New route `src/routes/admin.payments.tsx`, added to the `NAV` array in `src/routes/admin.tsx`.
- Wallet "Add money" tab in `src/routes/wallet.tsx` reworked: settings card, UPI deep link `upi://pay?pa=…&pn=…&am=…&cu=INR`, UTR + screenshot fields, validation before submit.
- `src/routes/admin.requests.tsx` renders UTR and proof link for deposit requests.
