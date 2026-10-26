# BOYNT website

- **`index.html`**: the finished site, all in one file (photos built in). This is the file you upload to Hostinger, the same way as before.
- **`source/`**: the same page in readable form, with the photos as separate files in `source/images/`.

## Making changes

1. Edit `source/index.html`. The settings you'll change most are at the top of the main `<script>`:
   - `CAMPAIGN`: the GoFundMe link, plus `goal`, `raised` and `backers`. Fill in `goal` and `raised` to show the progress bar. It stays hidden while either one is `null`.
   - `FOUNDERS`: names for the Founding Backers Wall, in the order people backed. Add `legend: true` to give someone the gold plaque.
   - `ALT_WAYS`: the "other ways to chip in" tiles (Venmo, Instagram, email, phone).
   - `PRODUCTS`: sunglasses names, colors and launch prices.
   - `MERCH_CONFIG`: controls how the merch shop shows the shirt with the logo on the back (see below).
2. Run `python3 source/build.py`. This rebuilds `index.html` with the photos embedded.

## Merch: the shirt with the logo on the back

Merch loads live from Shopify. Two shirts are both called "Logo T-shirt"; the $50 one also has the logo printed on the back. The site:

- keeps them as two separate listings, and adds "— Front & Back" to the $50 one's name
- features the $50 shirt at the top of the merch section, with the back and the front shown side by side under a gold "Logo on the back" badge, and opens it on the back
- fades every merch card to a second picture when you hover:
  - the $50 shirt (if it's shown as a card) fades to its back
  - the other shirt fades to a contrasting colour (the one with the opposite text colour)
  - the hat fades to another colour
- on phones, where there's no hover, switches the cards back and forth by themselves every few seconds

It finds the back-print shirt from the setting `backPrint: ['$50']`, meaning any product with a $50 price. **If you change that shirt's price, change this setting too**, or swap it for words from its Shopify title or its handle. The site also works it out by itself from any of these:

- a title containing "Front & Back"
- a `back-print` tag
- image alt text containing "Back"
- a same-named shirt that costs more and has a back photo for every colour

To check what the site detected, add `?shopdebug` to the end of the site address. A report then appears in the merch section, with one line per product (title, handle and price) and per colour.

Other `MERCH_CONFIG` settings in `source/index.html`:

- `noBackPrint: ['hat']`: switches the back-print look off for a product.
- `backImages: ['abc123']`: any piece of a back mockup's image address. Use this if the wrong image is shown as the back.
- `frontFirst: true`: opens the featured shirt on the front instead of the back.
- `spotlight: false`: no big featured product; all merch shows as equal cards with the hover fade. You can also give it title words to feature a different product.
- `backLabel`: the wording on the gold badge (default "Logo on the back").

To make the back image certain without touching code: in the Shopify admin, open the $50 shirt, click its back mockup image and set its alt text to "Back". Do this for each colour.

To swap a photo, replace the file in `source/images/` (or add a new one and point the `IMAGES` list at it), then rebuild.

## Links that open pages directly

- `boynt.com/#support` opens the GoFundMe support page.
- `boynt.com/#founders` opens the Founding Backers Wall.
- `boynt.com/#launch` scrolls to the "Help put BOYNT on the water" section.
- `boynt.com/#merch` scrolls to the merch shop.
