# Turning on Checkout (Stripe) — plain-English guide

Your site now has a **real cart**. The "Checkout" button is wired up and ready;
it just needs a Stripe account connected. This takes about 15 minutes and costs
nothing until you make a sale (Stripe takes ~2.9% + 30¢ per order).

You do **not** need to be technical. Follow these steps in order.

---

## Step 1 — Create a Stripe account
1. Go to <https://stripe.com> and sign up.
2. You can explore in **Test mode** first (toggle at the top right of the Stripe
   dashboard). Test mode lets you place fake orders with test cards before going live.

## Step 2 — Get your Secret Key
1. In the Stripe dashboard, click **Developers → API keys**.
2. You'll see a **Secret key**. It starts with `sk_test_...` (test mode) or
   `sk_live_...` (live mode). Click **Reveal** and copy it.
   - ⚠️ The secret key is like a password. Never paste it into the website's
     HTML or share it. It only ever goes in `create-checkout-session.php`.

## Step 3 — Put your key in the PHP file
1. Open `create-checkout-session.php`.
2. Find this line near the top:
   ```php
   $STRIPE_SECRET_KEY = 'sk_test_REPLACE_WITH_YOUR_SECRET_KEY';
   ```
3. Replace the placeholder with your real secret key.
4. Update the two URLs just below it to your real domain, e.g.:
   ```php
   $SUCCESS_URL = 'https://boynt.com/?checkout=success';
   $CANCEL_URL  = 'https://boynt.com/?checkout=cancel';
   ```

## Step 4 — Upload both files to Hostinger
Using Hostinger's **File Manager** (hPanel → Files → File Manager), upload into
the **same folder** that already holds your site (usually `public_html`):
- `index.html`  (the updated site)
- `create-checkout-session.php`

They must sit **side by side** in the same folder — that's how the cart finds
the checkout endpoint.

## Step 5 — Test it
1. Open your site, add a pair of sunglasses to the cart, click **Checkout**.
2. You should land on a Stripe payment page.
3. In test mode, pay with card number `4242 4242 4242 4242`, any future expiry,
   any CVC, any ZIP. A successful payment redirects back to your success URL.

## Step 6 — Go live
1. In Stripe, switch from **Test** to **Live** mode and complete account
   activation (business details + bank account for payouts).
2. Copy your **live** secret key (`sk_live_...`) into `create-checkout-session.php`
   and re-upload it.
3. Place one real order yourself to confirm, then you're open for business. 🎉

---

## Keeping prices correct
Prices live in **two** places and must match:
- On the page (what shoppers see) — in `index.html`.
- In `create-checkout-session.php` — the `$PRICES` list. This server-side list
  is what customers are actually charged, so it's the one that matters for money.

If you change a price, update **both**.

## Free shipping note
The cart shows "free shipping over $50." Set up the actual shipping rates in
**Stripe → Settings → Shipping**, or tell me your shipping rules and I'll wire
them into the checkout.

## Troubleshooting
- **"Checkout isn't live yet" message** → the PHP file isn't uploaded yet, isn't
  in the same folder as `index.html`, or the key is still the placeholder.
- **Stripe error about a key** → make sure you copied the *Secret* key
  (`sk_...`), not the *Publishable* key (`pk_...`).
- Still stuck? Send me the exact message and I'll sort it.
