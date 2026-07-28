# Selling Shirts: Shopify + Printify Setup

Goal: customers browse and build a cart on **boynt.com**, click Checkout, and
get sent to a Shopify checkout that already has their items in it. They pay,
Printify prints and ships automatically, tracking email goes out on its own.
You never touch an order.

Sunglasses stay in preview mode (Kickstarter only) — this is shirts only.

Do these in order. Steps 1–6 are yours; step 7 hands off to me.

---

## Step 1 — Create the Shopify store
1. Go to <https://shopify.com> and start a store. Take the free trial.
2. Store name: **BOYNT** (this is just the admin name, customers won't see the
   `.myshopify.com` address once we do Step 6).
3. When it asks what you sell, "clothing/apparel" is fine. You can skip most of
   the onboarding questions.

## Step 2 — Connect Printify to Shopify
1. In Printify: **My Stores → Add new store → Shopify**.
2. Approve the connection when Shopify asks.
3. That's it — the two are now linked. Orders placed on Shopify will flow into
   Printify for production automatically.

## Step 3 — Publish your shirts
1. Finish your shirt designs in Printify.
2. On each product hit **Publish** — it pushes to Shopify with the mockup
   photos, sizes, and colors already attached.
3. Give it a minute, then check **Shopify → Products** to confirm they arrived.

## Step 4 — Set prices and payments
1. In Shopify, open each product and set your retail price.
   - Printify shows its cost per item. Aim to roughly double it.
   - Reference: ~$12–14 product + ~$4–5 shipping = ~$17–19 landed cost.
     Selling at $30 nets you about $10–11 after Shopify's ~2.9% + 30¢ fee.
2. Turn on **Shopify Payments** (Settings → Payments). It's the same processor
   as Stripe underneath, and using it avoids Shopify's extra fee for outside
   gateways. You'll enter your bank details for payouts here.
3. **Shipping** (Settings → Shipping and delivery): simplest setup for a new
   store is to build shipping into the price and offer **free shipping** —
   set a single flat rate of $0. Fewer decisions for the customer, better
   conversion, and no rate math to maintain.
4. Add a payment method in **Printify** too. This is the card Printify charges
   for production when an order comes in. (You collect from the customer;
   Printify charges you; the difference is your profit.)

## Step 5 — Test with a real order
Place one order yourself, start to finish. Confirm:
- Payment goes through
- The order shows up in Printify as "in production"
- You get the confirmation and, later, tracking emails

Worth the ~$20. This is how you find problems before a customer does.

## Step 6 — (Recommended) Put checkout on your own domain
So the checkout page says `shop.boynt.com` instead of `myshopify.com`:
1. In Shopify: **Settings → Domains → Connect existing domain** → enter
   `shop.boynt.com`.
2. Shopify gives you a DNS record (a CNAME).
3. In Hostinger: **Domains → DNS / Nameservers** → add that CNAME record for
   the `shop` subdomain.
4. Wait for it to verify (usually minutes, sometimes a few hours).

Your main site at `boynt.com` is untouched and stays on Hostinger. Only the
`shop.` subdomain points at Shopify.

## Step 7 — Send me these and I'll wire up the website
1. **Your store URL** — either `something.myshopify.com` or `shop.boynt.com`
   if you did Step 6.
2. **The variant IDs.** Every size/color combo has its own number. Easiest way
   to get them all at once: open this in your browser, swapping in your store
   and the product's handle (the end of its URL):

   ```
   https://YOURSTORE.myshopify.com/products/PRODUCT-HANDLE.json
   ```

   It shows a wall of text — I just need it copy-pasted, or you can screenshot
   it. Alternatively: **Products → click the product → click a size** and the
   number at the end of the browser URL is that variant's ID.
3. **The shirt mockup images** — download them from Printify (or right-click
   save from the Shopify product page).
4. **Names, prices, sizes, and colors** for each design.

Once I have that, I'll add the shirts section to boynt.com, keep your existing
cart, and make Checkout send people to Shopify with their items pre-loaded.

---

## Notes

**Don't buy Printify Premium yet.** It's ~$29/month for a discount on product
costs. It only pays for itself at real volume — revisit once you're moving
shirts consistently.

**Don't bulk-order shirts yet either.** Print-on-demand costs more per shirt
but you risk nothing and tie up no cash. Once you see which designs and sizes
actually sell, bulk-ordering *those* is a smart move.

**Your Kickstarter founders shirt** stays exactly as it is — that's a reward
tier fulfilled through Kickstarter, not a website product. Nothing here
touches it.

**What happens to the Stripe file?** `create-checkout-session.php` on Hostinger
becomes unused for now. Leave it there — it's harmless, and it's ready if you
ever want to sell sunglasses directly from the site after the Kickstarter
delivers.
