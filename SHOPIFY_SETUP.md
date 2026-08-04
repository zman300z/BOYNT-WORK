# Selling Shirts: Shopify + Printify Setup

**The goal:** customers browse shirts on **boynt.com**, add to the cart that's
already there, click Checkout, and land on a Shopify checkout with their items
pre-loaded. They pay, Printify prints and ships automatically, tracking email
goes out on its own. You never touch an order.

**How the site gets the shirts:** boynt.com asks Shopify what you're selling
each time the page loads. So prices, colors, sizes, and sold-out status stay
correct by themselves — and **new shirts appear on the site automatically**
once you publish them. No uploads, no code changes.

Sunglasses stay in preview mode (Kickstarter only). This is shirts only.

**Order matters: build the shop first.** The website reads from Shopify, so
Shopify has to exist before the site can be wired up.

---

## Step 1 — Create the Shopify store
1. Go to <https://shopify.com> and start a store. The free trial is fine for
   ALL the setup below.
   - ⚠️ Know going in: the trial lets you **build** everything, but Shopify
     won't take real customer orders until you choose a paid plan (**Basic**).
     You'll do that in Step 6 — usually there's a cheap first-months promo.
2. Name it **BOYNT**. (Customers won't see the `.myshopify.com` address if you
   do the optional subdomain step at the end.)
3. "Clothing/apparel" is fine when it asks what you sell. Skip most of the
   onboarding questions.

## Step 2 — Connect Printify to Shopify
1. In Printify: **My Stores → Add new store → Shopify**.
2. Approve the connection when Shopify asks.

Do this **before** building products, so publishing works on the first try.

## Step 3 — Build the shirt products in Printify

Two products, because the artwork differs:
- **BOYNT Tee — Dark Colors** (white text, your 5 dark garment colors)
- **BOYNT Tee — Light Colors** (dark text, your 5 light garment colors)

Keep the names similar like that — the website pairs them into **one shirt
card with all 10 color swatches**, so shoppers see a single product.

For each one, enable all the sizes you want to offer. S–2XL is standard.
Bigger sizes usually cost you more; that's fine — the site shows correct
per-size pricing automatically.

## Step 4 — Publish both products
Hit **Publish** on each. They land in Shopify with mockup photos, colors, and
sizes already attached. Confirm in **Shopify → Products** that both arrived.

## Step 5 — Set prices, payments, shipping, tax
1. **Prices** — Printify shows its cost per item. Roughly double it.
   Reference: ~$12–14 product + ~$4–5 shipping = ~$17–19 landed. Selling at
   $30 nets about $10–11 after Shopify's ~2.9% + 30¢ fee.
2. **Shopify Payments** (Settings → Payments) — turn it on and enter your
   details and bank account. It's Stripe underneath and avoids Shopify's
   surcharge for outside processors.
3. **Shipping** (Settings → Shipping and delivery) — simplest for a new store:
   price shipping into the product and offer **free shipping** (one flat rate
   of $0). Fewer decisions for the buyer, better conversion, no rate math.
4. **Taxes** (Settings → Taxes and duties) — make sure US tax collection is on
   for your home state. Shopify calculates and collects it at checkout for you.
5. **Printify payment method** — in Printify, add the card they'll charge to
   produce each order.

### How the money actually moves
Two separate transactions. Shopify and Printify never pay each other.

| | |
|---|---|
| Customer pays you | $30 → Shopify fee ~$1.20 → **~$28.80 to your bank** |
| Printify charges you | **~$18** on your card (shirt + printing + shipping) |
| **You keep** | **~$11** |

## Step 6 — Unlock the store (the two go-live switches)
These two are what make checkout actually work for the public:

1. **Pick the Basic plan** (Settings → Plan). Until a plan is active, Shopify
   refuses real orders.
2. **Turn OFF password protection**: **Online Store → Preferences →
   Password protection** → untick "Restrict access…" → Save.
   - New stores ship with a password page. Your customers never browse the
     Shopify store, but the **checkout link counts as part of it** — with the
     password on, everyone we send to pay hits a password screen instead of
     a payment screen. One checkbox, easy to miss, looks like a total outage
     if you don't know about it.

## Step 7 — Place a test order
Order one shirt yourself on the real checkout, start to finish. Confirm:
- Payment goes through
- The order appears in Printify as "in production"
- Confirmation and (later) tracking emails arrive

Worth the ~$20. This is how you catch a problem before a customer does —
and you get a shirt.

## Step 8 — Create the site's read-access token (~6 clicks)
This is how boynt.com is allowed to read your product list. It's Shopify's
official method for exactly this.

1. Shopify admin → **Settings → Apps and sales channels → Develop apps**
2. Click **Allow custom app development** if it asks, then **Create an app**
3. Name it `BOYNT Site` → **Create app**
4. **Configuration → Storefront API integration → Configure** → check the
   product-related boxes (anything like "unauthenticated_read_product_listings")
   → **Save**
5. **Install app** (top right)
6. Under **API credentials**, copy the **Storefront API access token**

✅ **This token is safe to send me in chat.** It's the *public* kind, designed
to be embedded in websites — it can only read your public product list.
(Totally different from the Stripe secret key, which stays off the record.)

## Step 9 — Send me three things
1. **Your store address** — e.g. `boynt-shop.myshopify.com`
2. **The Storefront API access token** from Step 8
3. **Confirmation both shirt products are published**

Then I'll send back one updated `index.html` with the Merch section (live
from Shopify), the shirt cart, the checkout handoff, and the sunglasses
switched to "Coming Soon — Funding on Kickstarter."

## Step 10 — (Optional, recommended) Checkout on your own domain
So the checkout page reads `shop.boynt.com` instead of `myshopify.com`:
1. Shopify: **Settings → Domains → Connect existing domain** → `shop.boynt.com`
2. Shopify gives you a CNAME record.
3. Hostinger: **Domains → DNS / Nameservers** → add that CNAME for the `shop`
   subdomain.
4. Wait for it to verify (usually minutes).

`boynt.com` is untouched and stays on Hostinger. Only the `shop.` subdomain
points at Shopify. If you do this, tell me in Step 9 so I use it.

---

## Notes

**Don't buy Printify Premium yet.** ~$29/month for cheaper product costs. It
only pays off at real volume — revisit once shirts are moving steadily.

**Don't bulk-order shirts yet.** Print-on-demand costs more per shirt but
risks nothing and ties up no cash. Once you see which colors and sizes
actually sell, bulk-ordering *those* is the smart move.

**Your Kickstarter founders shirt** is unaffected — that's a reward tier
fulfilled through Kickstarter, not a website product.

**The Stripe file** (`create-checkout-session.php`) goes dormant. Leave it on
Hostinger; it's harmless and ready if you ever want to sell sunglasses
directly from the site after the Kickstarter delivers.
