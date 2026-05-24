// ============================================
// SPEAKUP PAYWALL + SUBSCRIPTION LOGIC
// Include this in index.html before closing </body>
// ============================================

const RAZORPAY_KEY = window.RAZORPAY_KEY_ID || 'rzp_test_xxxxxxxxxx';
const PRO_MODULES = ['writing', 'interview', 'accent']; // these need pro/trial
const FREE_VOCAB_LIMIT = 3; // free users only see 3 words

// Check if user has access
function hasAccess(module) {
  if (!userProfile) return false;
  const plan = userProfile.plan || 'free';
  if (plan === 'pro') return true;
  if (plan === 'trial') {
    const end = new Date(userProfile.trial_end_date);
    return new Date() < end;
  }
  return !PRO_MODULES.includes(module);
}

function getDaysLeft(plan) {
  if (plan === 'pro' && userProfile?.subscription_end_date) {
    const d = Math.ceil((new Date(userProfile.subscription_end_date) - new Date()) / (1000*60*60*24));
    return Math.max(0, d);
  }
  if (plan === 'trial' && userProfile?.trial_end_date) {
    const d = Math.ceil((new Date(userProfile.trial_end_date) - new Date()) / (1000*60*60*24));
    return Math.max(0, d);
  }
  return 0;
}

function hasUsedTrial() {
  return !!userProfile?.trial_start_date;
}

// Show paywall modal
function showPaywall(module) {
  const used = hasUsedTrial();
  document.getElementById('paywall-modal').style.display = 'flex';
  document.getElementById('paywall-module').textContent = module.charAt(0).toUpperCase() + module.slice(1);
  document.getElementById('trial-btn').style.display = used ? 'none' : 'flex';
  document.getElementById('trial-used-msg').style.display = used ? 'block' : 'none';
}
function hidePaywall() { document.getElementById('paywall-modal').style.display = 'none'; }

// Start free trial
async function startFreeTrial() {
  if (!currentUser) return;
  const btn = document.getElementById('trial-btn');
  btn.disabled = true; btn.textContent = 'Starting trial...';
  try {
    const r = await fetch('/api/trial/start', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ user_id: currentUser.id })
    });
    const data = await r.json();
    if (data.success) {
      userProfile.plan = 'trial';
      userProfile.trial_start_date = new Date().toISOString();
      userProfile.trial_end_date = data.trial_end;
      hidePaywall();
      showNotif('🎉', `7-day free trial started! Enjoy all features.`, 3500);
      updatePlanBadge();
    } else {
      showNotif('⚠️', data.message || 'Could not start trial.');
    }
  } catch(e) { showNotif('⚠️', 'Error starting trial.'); }
  btn.disabled = false; btn.textContent = '🎁 Start 7-Day Free Trial';
}

// Pay with Razorpay
async function startPayment() {
  if (!currentUser) return;
  const btn = document.getElementById('pay-btn');
  btn.disabled = true; btn.textContent = 'Creating order...';
  try {
    const r = await fetch('/api/payment/create-order', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: currentUser.user_metadata?.full_name || 'User'
      })
    });
    const order = await r.json();
    if (order.error) throw new Error(order.error);
    const options = {
      key: order.key,
      amount: order.amount,
      currency: 'INR',
      name: 'SpeakUp',
      description: 'Pro Plan — 1 Month',
      image: '',
      order_id: order.order_id,
      prefill: { email: currentUser.email, name: currentUser.user_metadata?.full_name || '' },
      theme: { color: '#5B5BD6' },
      handler: async function(response) {
        btn.textContent = 'Verifying payment...';
        const verify = await fetch('/api/payment/verify', {
          method: 'POST', headers: {'Content-Type':'application/json'},
          body: JSON.stringify({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            user_id: currentUser.id,
            user_email: currentUser.email,
            user_name: currentUser.user_metadata?.full_name || 'User'
          })
        });
        const vData = await verify.json();
        if (vData.success) {
          userProfile.plan = 'pro';
          userProfile.subscription_end_date = vData.subscription_end;
          hidePaywall();
          showNotif('🎉', 'Payment successful! You are now Pro! 🚀', 4000);
          updatePlanBadge();
        } else {
          showNotif('⚠️', 'Payment verification failed. Contact support.');
        }
      }
    };
    const rzp = new window.Razorpay(options);
    rzp.open();
    rzp.on('payment.failed', () => showNotif('❌', 'Payment failed. Please try again.'));
  } catch(e) { showNotif('⚠️', 'Could not create order. Check server.'); }
  btn.disabled = false; btn.textContent = '💳 Pay ₹199/month';
}

function updatePlanBadge() {
  const plan = userProfile?.plan || 'free';
  const existing = document.getElementById('plan-badge');
  if (existing) existing.remove();
  const badge = document.createElement('div');
  badge.id = 'plan-badge';
  badge.style.cssText = 'display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:700;margin-left:8px;';
  if (plan === 'pro') { badge.textContent = '⭐ PRO'; badge.style.background = 'rgba(91,91,214,.1)'; badge.style.color = '#5B5BD6'; }
  else if (plan === 'trial') {
    const d = getDaysLeft('trial');
    badge.textContent = `🕐 TRIAL (${d}d left)`; badge.style.background = 'rgba(217,119,6,.1)'; badge.style.color = '#D97706';
  } else { badge.textContent = '🆓 FREE'; badge.style.background = 'rgba(0,0,0,.06)'; badge.style.color = '#6B7080'; }
  const nameEl = document.getElementById('user-display-name');
  if (nameEl) nameEl.parentNode.insertBefore(badge, nameEl.nextSibling);
}

// Intercept page navigation for paywalled modules
const originalShowPage = window.showPage;
window.showPage = function(id) {
  if (PRO_MODULES.includes(id) && !hasAccess(id)) {
    showPaywall(id);
    return;
  }
  if (typeof originalShowPage === 'function') originalShowPage(id);
};
