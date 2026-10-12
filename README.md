# TRUUW — 11+ Grammar Schools Tracker

A static sales site for a paid, downloadable HTML tracker. There is no backend and no build step. GitHub Pages serves the files as they are.

## Pages

| File | Purpose |
|---|---|
| `index.html` | Sales page (site root). Share this link. `buy.html` redirects here. |
| `success.html` | Where Stripe sends buyers after they pay. Starts the download automatically. |
| `preview.html` | Free preview behind a token (8 Kent schools). |
| `downloads/tru-2027-a7qpvkps.html` | The paid file (self-contained, works offline). |
| `tracker-source.html` + `app.jsx` + `data.js` | Tracker source (not indexed by search engines). Rebundle into `downloads/` after changes. Don't share. |

## Payment flow

1. Buyer clicks **Buy — £14** on the sales page, then enters their email.
2. `main.js` sends them to the Stripe Payment Link with the email filled in.
3. Stripe takes the payment and emails the receipt.
4. Stripe redirects to `success.html?session_id=…`.
5. `success.js` shows the receipt and downloads the tracker.

## Stripe setup

**Payment Link URL:** set in `main.js`:

```js
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/...";
```

The current link is **live** (real payments). To recreate or rotate it:

1. In the Stripe Dashboard, switch off **Test mode**.
2. Create the Payment Link again: product "TRUUW 11+ Tracker — 2027 Entry", £14.00 GBP, one-time, collect email ON.
3. Under **After payment**, choose **Redirect** and enter:
   `https://YOUR-USERNAME.github.io/REPO-NAME/success.html?session_id={CHECKOUT_SESSION_ID}`
4. Paste the live URL into `main.js`, then commit and push.

Test card (test mode only): `4242 4242 4242 4242`, any future expiry, any CVC.

## Deploy (GitHub Pages)

1. Push to `main`.
2. Go to **Settings → Pages → Deploy from a branch → `main` / `(root)`**.
3. The site is live at `https://YOUR-USERNAME.github.io/REPO-NAME/` about a minute later.
4. Every push after that redeploys automatically.

**Custom domain:** go to Settings → Pages → Custom domain. Add a CNAME record at your registrar pointing to `YOUR-USERNAME.github.io`.

## Preview tokens

Valid tokens are listed in the `VALID_TOKENS` array near the top of `preview.html`. Add or rotate them there. The token shown on the sales page is in the `#preview-token` element.

## Known limitations

- **Anyone with the URL can open the download.** Anyone who has `downloads/tru-2027-a7qpvkps.html` can get the file without paying. The file has a hard-to-guess name for this reason; keep it out of anything you share. For download links that only work per buyer, switch to Gumroad or Lemon Squeezy.
- **Preview tokens only check in the browser.** They discourage casual access but are not real security.
- **Order refs come from the Stripe session ID.** Stripe is the record of truth for orders.

## Updating the tracker data

The data is fixed at the time of download. The file never fetches anything online, so buyers keep the version they bought. New data only reaches people who buy after you replace the file.

1. Edit `data.js`.
2. Rebundle `tracker-source.html` into one self-contained file.
3. Replace `downloads/tru-2027-a7qpvkps.html`.
4. Commit and push.

## Contact

TutorsAreUs Ltd. · info@tutorsareus.co.uk
