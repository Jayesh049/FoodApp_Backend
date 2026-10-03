# Payments (Razorpay)

## Flow
1. Authenticated user `POST /api/v1/booking/` with cart items (plan id and quantity). The server ignores any client `price`. It reads each plan from Mongo and charges `price * quantity` minus the stored discount, the same formula as the cart.
2. The server stores that Razorpay order id with exactly those booking ids, then creates a Razorpay order for that paise amount.
3. Browser opens Razorpay Checkout with `order_id` and public `KEY_ID` (`GET /api/getkey`).
4. On success, FE `POST /api/v1/booking/verification` with the Razorpay signature. The server confirms only the bookings linked to that order and owned by `req.userId`.
5. `POST /api/v1/booking/webhook` accepts `payment.captured` with a raw-body HMAC using `WEBHOOK_SECRET`. It uses the same confirm function.

## Signature verify (server)

Checkout:

```text
digest = HMAC_SHA256(KEY_SECRET, `${orderCreationId}|${razorpayPaymentId}`)
```

Webhook:

```text
digest = HMAC_SHA256(WEBHOOK_SECRET, rawBody)
header = X-Razorpay-Signature
```

A mismatch is 400 and a `rejected` payment event. Confirm and booking update run in one Mongo transaction when the server is a replica set. A duplicate payment id returns success and does not confirm again.

## Ownership
Foreign booking ids or another user's order return **403**. Confirmation updates only linked bookings still in `pending`.

## If the browser closes
Admin `POST /api/v1/booking/reconcile`, or `node scripts/reconcile-payments.js`, loads pending checkouts older than 15 minutes. Paid Razorpay orders confirm. The rest are marked `failed`.

Payment events (`captured`, `duplicate`, `rejected`) are admin-only at `GET /api/v1/booking/events`.

## Test keys
Use Razorpay **test** `KEY_ID` / `KEY_SECRET` / `WEBHOOK_SECRET` in local `.env`. Never commit live keys.
