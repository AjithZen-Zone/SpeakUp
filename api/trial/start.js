import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const { user_id } = req.body || {};
  try {
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', user_id).single();
    if (profile?.trial_start_date) return res.json({ success: false, message: 'Trial already used' });
    const trialStart = new Date();
    const trialEnd = new Date(); trialEnd.setDate(trialEnd.getDate() + 7);
    await supabase.from('profiles').update({
      plan: 'trial', trial_start_date: trialStart.toISOString(), trial_end_date: trialEnd.toISOString()
    }).eq('id', user_id);
    res.json({ success: true, trial_end: trialEnd.toISOString(), days: 7 });
  } catch(e) { res.status(500).json({ error: e.message }); }
}
