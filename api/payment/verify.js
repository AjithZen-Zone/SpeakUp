import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, user_id, user_email, user_name } = req.body || {};
  try {
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');
    if (expected !== razorpay_signature) return res.status(400).json({ error: 'Invalid signature' });
    const subStart = new Date();
    const subEnd = new Date(); subEnd.setMonth(subEnd.getMonth() + 1);
    await supabase.from('profiles').update({
      plan: 'pro', subscription_start_date: subStart.toISOString(), subscription_end_date: subEnd.toISOString()
    }).eq('id', user_id);
    await supabase.from('payments').insert({
      user_id, user_email, user_name, razorpay_payment_id, razorpay_order_id,
      amount: 19900, status: 'captured', plan: 'pro',
      billing_period_start: subStart.toISOString(), billing_period_end: subEnd.toISOString()
    });
    res.json({ success: true, subscription_end: subEnd.toISOString() });
  } catch(e) { res.status(500).json({ error: e.message }); }
}
