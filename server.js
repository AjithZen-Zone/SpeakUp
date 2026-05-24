require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const Anthropic = require('@anthropic-ai/sdk');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const TRIAL_DAYS = 7;
const PRO_PRICE_PAISE = 19900; // ₹199

// ─── HEALTH ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── AI: VOCAB ───────────────────────────────────────────────
app.post('/api/vocab/generate', async (req, res) => {
  const { level = 'intermediate', theme = 'workplace communication' } = req.body;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      messages: [{ role: 'user', content: `Generate 5 English vocabulary words for a ${level} learner. Theme: ${theme}. Return ONLY valid JSON: {"words":[{"word":"","phonetic":"","type":"","meaning":"","example":"","tamil_meaning":""}]}` }]
    });
    const clean = msg.content[0].text.trim().replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) { res.status(500).json({ error: 'Failed to generate vocabulary' }); }
});

// ─── AI: WRITING FEEDBACK ────────────────────────────────────
app.post('/api/writing/feedback', async (req, res) => {
  const { text, prompt } = req.body;
  if (!text) return res.status(400).json({ error: 'No text provided' });
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      messages: [{ role: 'user', content: `You are an English communication coach. Prompt: "${prompt}". Student response: "${text}". Return ONLY valid JSON: {"clarity":85,"grammar":80,"vocabulary":75,"overall":80,"feedback":"2-3 sentence feedback","strengths":"one strength","improvement":"one specific tip"}` }]
    });
    const clean = msg.content[0].text.trim().replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) { res.status(500).json({ error: 'Failed to get feedback' }); }
});

// ─── AI: INTERVIEW FEEDBACK ──────────────────────────────────
app.post('/api/interview/feedback', async (req, res) => {
  const { question, answer, topic } = req.body;
  if (!answer) return res.status(400).json({ error: 'No answer provided' });
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 800,
      messages: [{ role: 'user', content: `You are an interview coach for Indian engineering students. Question: "${question}". Answer: "${answer}". Topic: ${topic}. Give specific feedback in 3-4 sentences. Return ONLY valid JSON: {"feedback":"","score":75,"followup_question":""}` }]
    });
    const clean = msg.content[0].text.trim().replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) { res.status(500).json({ error: 'Failed to get feedback' }); }
});

// ─── AI: DAILY TASKS ─────────────────────────────────────────
app.post('/api/tasks/daily', async (req, res) => {
  const { level = 'intermediate' } = req.body;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514', max_tokens: 1000,
      messages: [{ role: 'user', content: `Generate daily communication tasks for a ${level} English learner (Indian engineering student). Return ONLY valid JSON: {"theme":"today theme in 3 words","writing_prompt":"interesting prompt","grammar_tip":"one rule with example","accent_focus":"one sound or pattern","interview_question":"one HR question"}` }]
    });
    const clean = msg.content[0].text.trim().replace(/```json|```/g, '').trim();
    res.json(JSON.parse(clean));
  } catch (e) { res.status(500).json({ error: 'Failed to generate tasks' }); }
});

// ─── STREAK UPDATE ───────────────────────────────────────────
app.post('/api/streak/update', async (req, res) => {
  const { user_id, date } = req.body;
  try {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user_id).single();
    const lastDate = profile?.last_completed_date;
    const today = new Date(date);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    let newStreak = 1;
    if (lastDate) {
      const last = new Date(lastDate);
      if (last.toDateString() === yesterday.toDateString()) newStreak = (profile.streak || 0) + 1;
      else if (last.toDateString() === today.toDateString()) newStreak = profile.streak || 1;
    }
    await supabase.from('profiles').upsert({
      id: user_id, streak: newStreak, last_completed_date: date,
      best_streak: Math.max(newStreak, profile?.best_streak || 0),
      total_days_completed: (profile?.total_days_completed || 0) + (lastDate !== date ? 1 : 0),
      updated_at: new Date()
    });
    res.json({ streak: newStreak });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── TRIAL: START FREE TRIAL ─────────────────────────────────
app.post('/api/trial/start', async (req, res) => {
  const { user_id } = req.body;
  try {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user_id).single();
    if (profile?.trial_start_date) return res.json({ success: false, message: 'Trial already used' });
    const trialStart = new Date();
    const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate() + TRIAL_DAYS);
    await supabase.from('profiles').update({
      plan: 'trial',
      trial_start_date: trialStart.toISOString(),
      trial_end_date: trialEnd.toISOString()
    }).eq('id', user_id);
    res.json({ success: true, trial_end: trialEnd.toISOString(), days: TRIAL_DAYS });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PAYMENT: CREATE RAZORPAY ORDER ──────────────────────────
app.post('/api/payment/create-order', async (req, res) => {
  const { user_id, user_email, user_name } = req.body;
  try {
    const Razorpay = require('razorpay');
    const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    const order = await rzp.orders.create({
      amount: PRO_PRICE_PAISE,
      currency: 'INR',
      receipt: `speakup_${user_id.slice(0,8)}_${Date.now()}`,
      notes: { user_id, user_email, user_name }
    });
    res.json({ order_id: order.id, amount: PRO_PRICE_PAISE, key: RAZORPAY_KEY_ID });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PAYMENT: VERIFY & ACTIVATE ──────────────────────────────
app.post('/api/payment/verify', async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, user_id, user_email, user_name } = req.body;
  try {
    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSig = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expectedSig !== razorpay_signature) return res.status(400).json({ error: 'Invalid payment signature' });

    // Set subscription dates
    const subStart = new Date();
    const subEnd = new Date(); subEnd.setMonth(subEnd.getMonth() + 1);

    // Update user plan
    await supabase.from('profiles').update({
      plan: 'pro',
      subscription_start_date: subStart.toISOString(),
      subscription_end_date: subEnd.toISOString()
    }).eq('id', user_id);

    // Record payment
    await supabase.from('payments').insert({
      user_id, user_email, user_name,
      razorpay_payment_id, razorpay_order_id,
      amount: PRO_PRICE_PAISE,
      status: 'captured',
      plan: 'pro',
      billing_period_start: subStart.toISOString(),
      billing_period_end: subEnd.toISOString()
    });

    res.json({ success: true, subscription_end: subEnd.toISOString() });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── AUTO-EXPIRE: CHECK & CANCEL EXPIRED SUBSCRIPTIONS ───────
app.post('/api/subscriptions/check-expired', async (req, res) => {
  // This runs daily via a cron job or Vercel cron
  try {
    const now = new Date().toISOString();
    // Expire pro subscriptions
    const { data: expiredPro } = await supabase.from('profiles')
      .select('id, plan, subscription_end_date')
      .eq('plan', 'pro')
      .lt('subscription_end_date', now);
    if (expiredPro?.length) {
      const ids = expiredPro.map(u => u.id);
      await supabase.from('profiles').update({ plan: 'free' }).in('id', ids);
    }
    // Expire trials
    const { data: expiredTrials } = await supabase.from('profiles')
      .select('id, plan, trial_end_date')
      .eq('plan', 'trial')
      .lt('trial_end_date', now);
    if (expiredTrials?.length) {
      const ids = expiredTrials.map(u => u.id);
      await supabase.from('profiles').update({ plan: 'free' }).in('id', ids);
    }
    res.json({
      expired_pro: expiredPro?.length || 0,
      expired_trials: expiredTrials?.length || 0
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── OWNER DASHBOARD DATA ────────────────────────────────────
app.get('/api/owner/stats', async (req, res) => {
  const ownerKey = req.headers['x-owner-key'];
  if (ownerKey !== process.env.OWNER_SECRET_KEY) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data: profiles } = await supabase.from('profiles').select('*');
    const { data: payments } = await supabase.from('payments').select('*').eq('status', 'captured').order('created_at', { ascending: false });
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const totalRevenue = payments?.reduce((s, p) => s + p.amount, 0) || 0;
    const monthRevenue = payments?.filter(p => new Date(p.created_at) >= monthStart).reduce((s, p) => s + p.amount, 0) || 0;
    // Get all users with emails from auth
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    const emailMap = {};
    authUsers?.users?.forEach(u => { emailMap[u.id] = u.email; });
    const usersWithEmail = (profiles||[]).map(p => ({...p, email: emailMap[p.id] || p.username || '—'}));

    res.json({
      users: {
        total: profiles?.length || 0,
        pro: profiles?.filter(p => p.plan === 'pro').length || 0,
        trial: profiles?.filter(p => p.plan === 'trial').length || 0,
        free: profiles?.filter(p => p.plan === 'free').length || 0
      },
      revenue: {
        total_inr: totalRevenue / 100,
        this_month_inr: monthRevenue / 100,
        total_payments: payments?.length || 0
      },
      recent_payments: payments?.slice(0, 10) || [],
      all_users: usersWithEmail || []
    });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── PROGRESS SAVE ───────────────────────────────────────────
app.post('/api/progress/save', async (req, res) => {
  const { user_id, date, module, completed, score, xp } = req.body;
  try {
    const { error } = await supabase.from('progress').upsert(
      { user_id, date, module, completed, score, xp, updated_at: new Date() },
      { onConflict: 'user_id,date,module' }
    );
    if (error) throw error;
    res.json({ success: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ─── SERVE FRONTEND ──────────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ SpeakUp running on http://localhost:${PORT}`));
