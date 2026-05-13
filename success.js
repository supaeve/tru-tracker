// ── Receipt details ───────────────────────────────────────────
// Stripe appends ?session_id=cs_... to the redirect URL.
// Without a backend we can't fetch order data from Stripe, so we
// generate a human-friendly order ref and use today's date.
const params  = new URLSearchParams(window.location.search);
const session = params.get('session_id') || '';

// Derive a short order ref from the session ID suffix, or generate one
const orderRef = session
  ? 'TRU-' + session.replace(/^cs_test_|^cs_live_/, '').slice(-8).toUpperCase()
  : 'TRU-' + Math.floor(10000 + Math.random() * 89999);

const dateStr = new Date().toLocaleDateString('en-GB', {
  day: 'numeric', month: 'long', year: 'numeric'
}).toUpperCase();

document.getElementById('rc-order').textContent = orderRef;
document.getElementById('rc-date').textContent  = dateStr;

// ── Auto-download ─────────────────────────────────────────────
const dlBtn    = document.getElementById('dl-btn');
const dlLabel  = document.getElementById('dl-label');
const dlDot    = document.getElementById('dl-dot');
const dlStatus = document.getElementById('dl-status-text');

// Trigger the download automatically after a short delay
setTimeout(() => {
  dlBtn.click();
  dlLabel.textContent  = 'Download your tracker';
  dlDot.classList.add('ready');
  dlStatus.textContent = 'Your file is downloading. If nothing happened, click the button above.';
}, 1200);
