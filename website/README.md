# BOYNT website

- **`index.html`**: the finished site, all in one file (photos built in). This is the file you upload to Hostinger, the same way as before.
- **`source/`**: the same page in readable form, with the photos as separate files in `source/images/`.

## Making changes

1. Edit `source/index.html`. The settings you'll change most are at the top of the main `<script>`:
   - `CAMPAIGN`: the GoFundMe link, plus `goal`, `raised` and `backers`. Fill in `goal` and `raised` to show the progress bar. It stays hidden while either one is `null`.
   - `FOUNDERS`: names for the Founding Backers Wall, in the order people backed. Add `legend: true` to give someone the gold plaque.
   - `ALT_WAYS`: the "other ways to chip in" tiles (Venmo, Instagram, email, phone).
   - `PRODUCTS`: sunglasses names, colors and launch prices.
2. Run `python3 source/build.py`. This rebuilds `index.html` with the photos embedded.

To swap a photo, replace the file in `source/images/` (or add a new one and point the `IMAGES` list at it), then rebuild.

## Links that open pages directly

- `boynt.com/#support` opens the GoFundMe support page.
- `boynt.com/#founders` opens the Founding Backers Wall.
- `boynt.com/#launch` scrolls to the "Help put BOYNT on the water" section.
