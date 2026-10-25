# BOYNT website

- **`index.html`**: the finished site, all in one file (photos built in). This is the file you upload to Hostinger, the same way as before.
- **`source/`**: the same page in readable form, with the photos as separate files in `source/images/`.

## Making changes

1. Edit `source/index.html`. The settings you'll change most are at the top of the main `<script>`:
   - `CAMPAIGN`: the GoFundMe link, plus `goal`, `raised` and `backers`. Fill in `goal` and `raised` to show the progress bar. It stays hidden while either one is `null`.
   - `FOUNDERS`: names for the Founding Backers Wall, in the order people backed. Add `legend: true` to give someone the gold plaque.
   - `ALT_WAYS`: the "other ways to chip in" tiles (Venmo, Instagram, email, phone).
   - `PRODUCTS`: sunglasses names, colors and launch prices.
   - `MERCH_CONFIG`: controls how the merch shop shows the tee with the photo on the back (see below).
2. Run `python3 source/build.py`. This rebuilds `index.html` with the photos embedded.

## Merch: the tee with the photo on the back

Merch loads live from Shopify. The site works out which product has a back print by itself. It looks for any of these:

- a Shopify title containing "Front & Back"
- a `back-print` product tag
- image alt text containing "Back"

That product is featured at the top of the merch section, with the back and the front shown side by side. It opens on the back.

To check what the site detected, add `?shopdebug` to the end of the site address. A report then appears in the merch section, with one line per product and colour.

If it guesses wrong, edit `MERCH_CONFIG` in `source/index.html`:

- `backPrint: ['photo tee']`: forces the photo-on-the-back look for a product whose title contains these words.
- `noBackPrint: ['logo tee']`: switches it off for a product.
- `backImages: ['abc123']`: any piece of a back mockup's image address. Use this if the wrong image is shown as the back.
- `frontFirst: true`: shows the front first instead of the back.
- `spotlight: false`: turns off the featured product, or give it title words to feature a different product.
- `backLabel`: the wording on the gold badge (default "Photo on the back").

To make detection certain without touching code: in the Shopify admin, open the tee, click its back mockup image and set its alt text to "Back". Do this for each colour.

To swap a photo, replace the file in `source/images/` (or add a new one and point the `IMAGES` list at it), then rebuild.

## Links that open pages directly

- `boynt.com/#support` opens the GoFundMe support page.
- `boynt.com/#founders` opens the Founding Backers Wall.
- `boynt.com/#launch` scrolls to the "Help put BOYNT on the water" section.
- `boynt.com/#merch` scrolls to the merch shop.
