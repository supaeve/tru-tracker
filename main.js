// ── Token copy ───────────────────────────────────────────────
const tokenCopyBtn = document.getElementById('token-copy-btn');
const tokenCode    = document.getElementById('preview-token');
const tokenLabel   = document.getElementById('token-copy-label');

if (tokenCopyBtn) {
  tokenCopyBtn.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(tokenCode.textContent.trim()); } catch {}
    tokenCopyBtn.classList.add('is-copied');
    tokenLabel.textContent = 'Copied';
    setTimeout(() => {
      tokenCopyBtn.classList.remove('is-copied');
      tokenLabel.textContent = 'Copy';
    }, 1600);
  });
}

// ── Checkout modal ───────────────────────────────────────────
// Set to a real Stripe Payment Link URL to enable live payments.
// Leave as "" to keep the mock checkout active.
const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_14A6oH8tVad10ux3NjejK04";

(function () {
  const bg          = document.getElementById('modal-bg');
  const formState   = document.getElementById('modal-form-state');
  const successState = document.getElementById('modal-success-state');
  const form        = document.getElementById('checkout-form');
  const payBtn      = document.getElementById('pay-btn');
  const payLabel    = document.getElementById('pay-btn-label');

  const open = () => {
    formState.style.display = '';
    successState.style.display = 'none';
    payBtn.disabled = false;
    payLabel.textContent = 'Pay £14.00';
    bg.classList.add('open');
    bg.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('email')?.focus(), 200);
  };

  const close = () => {
    bg.classList.remove('open');
    bg.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('[data-buy]').forEach(b =>
    b.addEventListener('click', (e) => { e.preventDefault(); open(); })
  );
  document.querySelectorAll('[data-close]').forEach(b =>
    b.addEventListener('click', close)
  );
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && bg.classList.contains('open')) close();
  });

  // Card input formatting
  const cardEl = document.getElementById('card');
  cardEl.addEventListener('input', () => {
    let v = cardEl.value.replace(/\D/g, '').slice(0, 16);
    cardEl.value = v.replace(/(.{4})/g, '$1 ').trim();
  });

  const expEl = document.getElementById('exp');
  expEl.addEventListener('input', () => {
    let v = expEl.value.replace(/\D/g, '').slice(0, 4);
    if (v.length > 2) v = v.slice(0, 2) + ' / ' + v.slice(2);
    expEl.value = v;
  });

  const cvcEl = document.getElementById('cvc');
  cvcEl.addEventListener('input', () => {
    cvcEl.value = cvcEl.value.replace(/\D/g, '').slice(0, 4);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;

    // Live Stripe path
    if (STRIPE_PAYMENT_LINK) {
      const email = document.getElementById('email').value.trim();
      payBtn.disabled = true;
      payLabel.innerHTML = '<span class="spin"></span> Redirecting to Stripe…';
      const sep = STRIPE_PAYMENT_LINK.includes('?') ? '&' : '?';
      window.location.href = STRIPE_PAYMENT_LINK + sep + 'prefilled_email=' + encodeURIComponent(email);
      return;
    }

    // Mock path
    payBtn.disabled = true;
    payLabel.innerHTML = '<span class="spin"></span> Processing…';

    setTimeout(() => {
      const email   = document.getElementById('email').value || 'your email';
      const order   = 'TRU-2026-' + Math.floor(10000 + Math.random() * 89999);
      const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

      document.getElementById('success-email').textContent = email;
      document.getElementById('success-order').textContent = order;
      document.getElementById('success-date').textContent  = dateStr.toUpperCase();

      formState.style.display   = 'none';
      successState.style.display = '';
    }, 1400);
  });
})();
