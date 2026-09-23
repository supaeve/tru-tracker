# TRUUW — 11+ Grammar Schools Tracker

A static sales site for a paid, downloadable HTML tracker. There is no backend and no build step. GitHub Pages serves the files as they are.

## Pages

| File | Purpose |
|---|---|
| `buy.html` | Sales page. Share this link. |
| `success.html` | Where Stripe sends buyers after they pay. Starts the download automatically. |
| `preview.html` | Free preview behind a token (8 Kent schools). |
| `downloads/TRU-11-Plus-Tracker-2027.html` | The paid file (self-contained, works offline). |
| `index.html` + `app.jsx` + `data.js` | Source for the tracker. Rebundle into `downloads/` after changes. |

## Payment flow

1. Buyer clicks **Buy — £14** on `buy.html`, then enters their email.
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
3. The site is live at `https://YOUR-USERNAME.github.io/REPO-NAME/buy.html` about a minute later.
4. Every push after that redeploys automatically.

**Custom domain:** go to Settings → Pages → Custom domain. Add a CNAME record at your registrar pointing to `YOUR-USERNAME.github.io`.

## Preview tokens

Valid tokens are listed in the `VALID_TOKENS` array near the top of `preview.html`. Add or rotate them there. The token shown on `buy.html` is in the `#preview-token` element.

## Known limitations

- **Anyone with the URL can open the download.** Anyone who has `downloads/TRU-11-Plus-Tracker-2027.html` can get the file without paying. To make this harder, give the file a hard-to-guess name and update the two links in `success.html`. For download links that only work per buyer, switch to Gumroad or Lemon Squeezy.
- **Preview tokens only check in the browser.** They discourage casual access but are not real security.
- **Order refs come from the Stripe session ID.** Stripe is the record of truth for orders.

## Updating the tracker data

The data is fixed at the time of download. The file never fetches anything online, so buyers keep the version they bought. New data only reaches people who buy after you replace the file.

1. Edit `data.js`.
2. Rebundle `index.html` into one self-contained file.
3. Replace `downloads/TRU-11-Plus-Tracker-2027.html`.
4. Commit and push.

## Contact

TutorsAreUs Ltd. · hello@truuw.co
